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
  const whatsAppConnection = await connectToWhatsApp();
  console.log("Connected to WhatsApp");

  // promise is not awaited to parallelize getting whatsapp contacts with syncing
  // DAV contacts
  const cardDAVConnection = connectToDAVServer({
    server: process.env.SERVER,
    credentials: {
      username: process.env.USERNAME,
      password: process.env.PASSWORD,
    },
  });

  const whatsAppContacts = await getWhatsAppContacts(whatsAppConnection);
  console.log("Received Contacts");

  const whatsAppContactsWithProfilePictures = (
    await getContactsWithProfilePictures(whatsAppContacts, whatsAppConnection)
  ).filter((c) => c.image !== null);

  console.log("Received Profile Pictures");

  whatsAppConnection.end();

  const {
    account: cardDAVAccount,
    client: cardDAVClient,
  } = await cardDAVConnection;
  const cardDAVContacts = cardDAVAccount.addressBooks[0].objects;

  const matches = matchWhatsAppProfilesWithVCards(
    whatsAppContactsWithProfilePictures,
    cardDAVContacts
  );

  console.log("Has matches");

  const filteredMatches = matches.filter(contactHasNewPhoto);
  console.log(
    "Has filtered matches",
    filteredMatches.map(({ profile: { notify, id } }) => `${notify}-${id}`)
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
  const updates = Promise.all(
    matchesWithUpdatedProfilePictures.map((davVCard) =>
      updateCardOnServer({
        client: cardDAVClient,
        card: davVCard,
      })
    )
  );

  await updates;
  console.log("Done");
} catch (error) {
  console.log("unexpected error:", error);
}
