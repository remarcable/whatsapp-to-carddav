import connectToWhatsApp from "./src/connectToWhatsApp.js";
import getContactsWithProfilePictures from "./src/getContactsWithProfilePictures.js";

try {
  const connection = await connectToWhatsApp();

  console.log("Connected to WhatsApp");
  connection.on("contacts-received", async () => {
    console.log("Received Contacts");

    const contactsWithProfilePictures = (
      await getContactsWithProfilePictures(connection)
    ).filter((c) => c.image !== null);

    console.log(JSON.stringify(contactsWithProfilePictures[0], null, 4));
  });
} catch (error) {
  console.log("unexpected error:", error);
}
