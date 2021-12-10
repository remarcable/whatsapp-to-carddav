import defaultMakeWASocket, {
  useSingleFileAuthState,
  DisconnectReason,
} from "@adiwajshing/baileys-md";
import * as fs from "fs";

const { state, saveState } = useSingleFileAuthState("./auth_info_multi.json");

const makeWASocket = defaultMakeWASocket.default;

// start a connection
export default async function connectToWhatsApp() {
  let sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    // if (connection === "close") {
    //   // reconnect if not logged out
    //   if (
    //     lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut
    //   ) {
    //     sock = connectToWhatsApp();
    //   } else {
    //     console.log("connection closed");
    //   }
    // }
  });

  sock.ev.on("creds.update", saveState);

  getWhatsAppContacts(sock);

  return sock;
}

const WHATSAPP_CONTACTS_URL = "whatsapp_contacts.json";
export function getWhatsAppContacts(connection) {
  return new Promise((resolve, reject) => {
    connection.ev.on("contacts.upsert", (contacts) => {
      console.log("contacts.upsert", contacts);
      if (!fs.existsSync(WHATSAPP_CONTACTS_URL)) {
        fs.writeFileSync(WHATSAPP_CONTACTS_URL, JSON.stringify([], null, "\t"));
      }

      const state = JSON.parse(
        fs.readFileSync(WHATSAPP_CONTACTS_URL).toString()
      );
      const newState = [...state, ...contacts];
      fs.writeFileSync(
        WHATSAPP_CONTACTS_URL,
        JSON.stringify(newState, null, "\t")
      );
    });

    connection.ev.on("contacts.update", (contacts) => {
      console.log("contacts.update", contacts);
      let state = JSON.parse(fs.readFileSync(WHATSAPP_CONTACTS_URL).toString());

      contacts.forEach((contact) => {
        const currentContactIndex = state.findIndex((c) => c.id === contact.id);

        if (currentContactIndex === -1) {
          return;
        }

        const newState = [
          ...state.slice(0, currentContactIndex),
          {
            ...state[currentContactIndex],
            ...contact,
          },
          ...state.slice(currentContactIndex + 1),
        ];

        state = newState;
      });

      fs.writeFileSync(
        WHATSAPP_CONTACTS_URL,
        JSON.stringify(state, null, "\t")
      );

      // heuristic to get a relatively up-to-date version of
      // our contacts. Also resolve after a timeout
      resolve(state);
    });

    setTimeout(() => {
      const state = JSON.parse(
        fs.readFileSync(WHATSAPP_CONTACTS_URL).toString()
      );
      resolve(state);
    }, 2 * 1000);
  });
}
