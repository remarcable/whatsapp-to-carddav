import fetch from "node-fetch";

export default async function getContactsWithProfilePictures(
  contacts,
  whatsAppConnection
) {
  const connection = await whatsAppConnection;

  return contacts.map(
    (contact) =>
      new Promise(async (resolve, reject) => {
        try {
          const imgUrl = await connection.getProfilePicture(contact.jid);
          const image = await getBase64ImageStringFromUrl(imgUrl);
          return resolve({ ...contact, imgUrl, image });
        } catch (error) {
          if ([401, 404].includes(error.status)) {
            return resolve({ ...contact, imgUrl: null, image: null });
          } else {
            return reject(error);
          }
        }
      })
  );
}

async function getBase64ImageStringFromUrl(url) {
  return fetch(url)
    .then((res) => res.arrayBuffer())
    .then((data) => Buffer.from(data, "binary").toString("base64"));
}
