import defaultMakeWASocket, {
  useSingleFileAuthState,
} from "@adiwajshing/baileys";
import * as fs from "fs";
import uniqueBy from "unique-by";

const { state, saveState } = useSingleFileAuthState("./auth_info_multi.json");

const makeWASocket = defaultMakeWASocket.default;

// start a connection
export default async function connectToWhatsApp() {
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
  });

  sock.ev.on("creds.update", saveState);

  getWhatsAppContacts(sock);

  return sock;
}

const WHATSAPP_CONTACTS_URL = "whatsapp_contacts.json";
export function getWhatsAppContacts(connection) {
  if (!fs.existsSync(WHATSAPP_CONTACTS_URL)) {
    fs.writeFileSync(WHATSAPP_CONTACTS_URL, JSON.stringify([], null, "\t"));
  }

  return new Promise((resolve) => {
    connection.ev.on("contacts.upsert", (contacts) => {
      const state = JSON.parse(
        fs.readFileSync(WHATSAPP_CONTACTS_URL).toString()
      );
      const newState = uniqueBy([...state, ...contacts], (obj) => obj.id);

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
    });

    setTimeout(() => {
      const state = JSON.parse(
        fs.readFileSync(WHATSAPP_CONTACTS_URL).toString()
      );
      resolve(state);
    }, 30 * 1000);
  });
}
