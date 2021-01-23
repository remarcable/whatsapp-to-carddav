import { config as dotenvConfig } from "dotenv";

import Listr from "listr";

import connectToWhatsApp, {
  getWhatsAppContacts,
} from "./src/connectToWhatsApp.js";
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

// this is working around Listr to be able to return a value
// from one task to the next
const whatsAppConnection = connectToWhatsApp();
const davConnection = connectToDAVServer({ server, credentials });
let whatsAppContacts = null;
let whatsAppContactsWithProfilePictures = null;
let matchesWithUpdatedProfilePictures = null;

const tasks = new Listr([
  {
    title: "Fetch ressources",
    task: () => {
      return new Listr(
        [
          {
            title: "Connect to WhatsApp",
            task: () => whatsAppConnection,
          },
          {
            title: "Get WhatsApp contacts",
            task: async () => {
              const connection = await whatsAppConnection;
              whatsAppContacts = await getWhatsAppContacts(connection);
            },
          },
          {
            title: "Connect to DAV Server",
            task: () => davConnection,
          },
        ],
        { concurrent: true }
      );
    },
  },
  {
    title: "Get profile pictures of WhatsApp contacts",
    task: async (context, task) => {
      const promises = await getContactsWithProfilePictures(
        whatsAppContacts,
        whatsAppConnection
      );

      let completed = 0;
      promises.map(async (p) => {
        await p;
        task.title = `Get profile pictures of WhatsApp contacts – ${++completed}/${
          promises.length
        }`;
      });

      whatsAppContactsWithProfilePictures = (
        await Promise.all(promises)
      ).filter((c) => c.image !== null);
    },
  },
  {
    title: "Match WhatsApp profiles to contacts",
    task: async (context, task) => {
      const { account: cardDAVAccount } = await davConnection;

      const cardDAVContacts = cardDAVAccount.addressBooks[0].objects;

      const matches = matchWhatsAppProfilesWithVCards(
        whatsAppContactsWithProfilePictures,
        cardDAVContacts
      );
      const filteredMatches = matches.filter(contactHasNewPhoto);

      task.title = `Match WhatsApp profiles to contacts – ${filteredMatches.length} contacts with updated photo`;

      matchesWithUpdatedProfilePictures = filteredMatches.map((match) => {
        const { card, profile } = match;
        card.addressData = updateImageInVCardString(
          card.addressData,
          profile.image
        );
        return { card, profile };
      });
    },
  },
  {
    title: "Sync update profile pictures to the server",
    task: async (context, task) => {
      const { client } = await davConnection;
      const promises = matchesWithUpdatedProfilePictures.map(({ card }) =>
        updateCardOnServer({ client, card })
      );

      let complete = 0;
      promises.map(async (p) => {
        await p;
        task.title = `Sync updates profile pictures to the server – ${++complete}/${
          promises.length
        }`;
      });

      return Promise.all(promises);
    },
  },
]);

tasks.run().catch((err) => {
  console.error(err);
});
