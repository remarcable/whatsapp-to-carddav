import { config as dotenvConfig } from "dotenv";

import connectToWhatsApp from "./src/connectToWhatsApp.js";
import getContactsWithProfilePictures from "./src/getContactsWithProfilePictures.js";
import connectToDAVServer from "./src/connectToDAVServer.js";
import {
  contactHasNewPhoto,
  matchWhatsAppProfilesWithVCards,
  updateImageInVCardString,
} from "./src/helpers.js";
import updateCardOnServer from "./src/updateCard.js";

dotenvConfig();

const server = process.env.SERVER;
const credentials = {
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
};

try {
  const whatsAppConnection = await connectToWhatsApp();
  console.log("Connected to WhatsApp");

  const cardDAVConnection = connectToDAVServer({ server, credentials }); // promise that is not awaited

  whatsAppConnection.once("contacts-received", async () => {
    console.log("Received Contacts");

    const whatsAppContactsWithProfilePictures = (
      await getContactsWithProfilePictures(whatsAppConnection)
    ).filter((c) => c.image !== null);

    const {
      account: cardDAVAccount,
      client: cardDAVClient,
    } = await cardDAVConnection;
    const cardDAVContacts = cardDAVAccount.addressBooks[0].objects;

    const matches = matchWhatsAppProfilesWithVCards(
      whatsAppContactsWithProfilePictures,
      cardDAVContacts
    );

    global.matches = matches;
    console.log("Has matches");

    const filteredMatches = matches.filter(contactHasNewPhoto);
    console.log("Has filtered matches");

    const matchesWithUpdatedProfilePictures = filteredMatches.map((match) => {
      const { card, profile } = match;
      card.addressData = updateImageInVCardString(
        card.addressData,
        profile.image
      );
      return card;
    });

    // sync cards to server
    const updates = Promise.all(
      matchesWithUpdatedProfilePictures.map((davVCard, i) => {
        const promise = updateCardOnServer({
          client: cardDAVClient,
          card: davVCard,
        });
        promise.then(() => console.log("Updated", i));
        return promise;
      })
    );

    await updates;
    console.log("Done");
  });
} catch (error) {
  console.log("unexpected error:", error);
}
