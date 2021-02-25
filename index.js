import { config as dotenvConfig } from "dotenv";

import { Listr } from "listr2";
import QRCode from "qrcode-terminal";

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

const davConnection = connectToDAVServer({ server, credentials });

// this is working around Listr to be able to return a value
// from one task to the next

let whatsAppConnection = null;
let whatsAppContacts = null;
let whatsAppContactsWithProfilePictures = null;
let matchesWithUpdatedProfilePictures = null;

const fetchRessourcesTasks = [
  {
    title: "Connect to WhatsApp",
    task: async (_, task) => {
      whatsAppConnection = connectToWhatsApp((code) => {
        QRCode.generate(code, { small: true }, (qrCode) => {
          task.output = qrCode;
        });
      });

      await whatsAppConnection;
    },
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
];

const tasks = new Listr([
  {
    title: "Fetch ressources",
    task: () => new Listr(fetchRessourcesTasks, { concurrent: true }),
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
        task.output = `Completed ${++completed}/${promises.length}`;
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
    title: "Sync updated profile pictures to the server",
    task: async (context, task) => {
      const { client } = await davConnection;
      const promises = matchesWithUpdatedProfilePictures.map(({ card }) =>
        updateCardOnServer({ client, card })
      );

      let completed = 0;
      promises.map(async (p) => {
        await p;
        task.output = `Completed ${++completed}/${promises.length}`;
      });

      return Promise.all(promises);
    },
  },
]);

tasks
  .run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
  });
