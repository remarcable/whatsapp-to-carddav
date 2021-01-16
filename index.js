import { config as dotenvConfig } from "dotenv";

import vCard from "vcf";
import connectToWhatsApp from "./src/connectToWhatsApp.js";
import getContactsWithProfilePictures from "./src/getContactsWithProfilePictures.js";
import connectToDAVServer from "./src/connectToDAVServer.js";
import {
  contactHasNewPhoto,
  matchWhatsAppProfilesWithVCards,
} from "./src/helpers.js";

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

    const cardDAVAccount = await cardDAVConnection;
    const cardDAVContacts = cardDAVAccount.addressBooks[0].objects.map(
      (contact) => new vCard().parse(contact.addressData)
    );

    const matches = matchWhatsAppProfilesWithVCards(
      whatsAppContactsWithProfilePictures,
      cardDAVContacts
    );

    global.matches = matches;
    console.log("Has matches");

    const filterMatches = matches.filter(contactHasNewPhoto);

    global.filterMatches = filterMatches;
    console.log("Has filtered matches");
  });
} catch (error) {
  console.log("unexpected error:", error);
}
