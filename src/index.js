import connectToWhatsApp, { getWhatsAppContacts } from "./connectToWhatsApp.js";
import getContactsWithProfilePictures from "./getContactsWithProfilePictures.js";
import connectToDAVServer from "./connectToDAVServer.js";
import {
  contactHasNewPhoto,
  matchWhatsAppProfilesWithVCards,
  updateImageInVCardString,
} from "./helpers.js";
import updateCardOnServer from "./updateCard.js";

try {
  // promise is not awaited to parallelize getting whatsapp contacts with syncing
  // DAV contacts
  const cardDAVConnection = connectToDAVServer({
    server: process.env.SERVER,
    credentials: {
      username: process.env.USERNAME,
      password: process.env.PASSWORD,
    },
  });

  const whatsAppConnection = await connectToWhatsApp();
  console.log("Connected to WhatsApp");

  const whatsAppContacts = await getWhatsAppContacts(whatsAppConnection);
  console.log("Received Contacts");

  const whatsAppContactsWithProfilePictures = (
    await getContactsWithProfilePictures(whatsAppContacts, whatsAppConnection)
  ).filter((c) => c.image !== null);

  console.log("Received Profile Pictures");

  const { account: cardDAVAccount, client: cardDAVClient } =
    await cardDAVConnection;

  console.log("Connected to DAV Server");

  for (let ab of cardDAVAccount.addressBooks) {
    const cardDAVContacts = ab.objects;

    const matches = matchWhatsAppProfilesWithVCards(
      whatsAppContactsWithProfilePictures,
      cardDAVContacts
    );

    console.log("Has", matches.length, "matches");

    const filteredMatches = matches.filter(contactHasNewPhoto);
    console.log(
      "Has filtered matches",
      filteredMatches.map(({ profile: { name, id } }) => `${name}-${id}`)
    );

    const matchesWithUpdatedProfilePictures = filteredMatches.map((match) => {
      const { card, profile } = match;
      card.addressData = updateImageInVCardString(
        card.addressData,
        profile.image
      );
      return card;
    });

    // sync cards to server
    await Promise.all(
      matchesWithUpdatedProfilePictures.map((davVCard) =>
        updateCardOnServer({
          client: cardDAVClient,
          card: davVCard,
        })
      )
    );
  }

  whatsAppConnection.end();
  console.log("Done");
  process.exit(0);
} catch (error) {
  console.log("Unexpected error:", error);
}
