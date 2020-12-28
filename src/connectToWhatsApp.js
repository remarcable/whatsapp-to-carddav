import * as fs from "fs";
import { WAConnection } from "@adiwajshing/baileys";

const AUTH_INFO_FILE_URL = ".auth_info"; // path is relative to index.js
export default async function connectToWhatsApp() {
  const connection = new WAConnection();
  connection.logger.level = "error";
  connection.setMaxListeners(50);

  if (fs.existsSync(AUTH_INFO_FILE_URL)) {
    connection.loadAuthInfo(AUTH_INFO_FILE_URL);
  }

  connection.on("credentials-updated", () => {
    const authInfo = connection.base64EncodedAuthInfo();
    fs.writeFileSync(AUTH_INFO_FILE_URL, JSON.stringify(authInfo, null, "\t"));
  });

  await connection.connect();

  return connection;
}
