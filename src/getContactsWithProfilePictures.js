import fetch from "node-fetch";

export default async function getContactsWithProfilePictures(
  contacts,
  connection
) {
  return Promise.all(
    contacts.map(
      (contact) =>
        new Promise(async (resolve, reject) => {
          try {
            const imgUrl = await connection.profilePictureUrl(
              contact.id,
              "image"
            );
            const image = await getBase64ImageStringFromUrl(imgUrl);
            return resolve({ ...contact, imgUrl, image });
          } catch (error) {
            if ([401, 404].includes(error.data)) {
              return resolve({ ...contact, imgUrl: null, image: null });
            } else {
              return reject(error);
            }
          }
        })
    )
  );
}

async function getBase64ImageStringFromUrl(url) {
  return fetch(url)
    .then((res) => res.arrayBuffer())
    .then((data) => Buffer.from(data, "binary").toString("base64"));
}
