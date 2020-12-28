import fetch from "node-fetch";
import chunk from "lodash.chunk";

const CHUNK_SIZE = 25;
const INTERVAL_MS = 500;

export default async function getContactsWithProfilePictures(connection) {
  console.log("Getting profile picture urls");

  return new Promise((resolve) => {
    const contacts = Object.values(connection.contacts).filter(
      (c) => !!c.name && !!c.index
    );

    let index = 0;
    let result = [];
    const chunks = chunk(contacts, CHUNK_SIZE);

    const intervalHandle = setInterval(async () => {
      if (chunks[index] === undefined) {
        clearInterval(intervalHandle);
        return resolve(await Promise.all(result));
      }

      result = [
        ...result,
        ...chunks[index].map(
          (c) =>
            new Promise(async (resolve, reject) => {
              try {
                const imgUrl = await connection.getProfilePicture(c.jid);
                const image = await getBase64ImageStringFromUrl(imgUrl);

                return resolve({
                  ...c,
                  imgUrl,
                  image,
                });
              } catch (error) {
                if ([401, 404].includes(error.status)) {
                  return resolve({ ...c, imgUrl: null, image: null });
                } else {
                  console.log(
                    `Could not get profile picture url for ${c.name}`,
                    error
                  );
                  return reject(error);
                }
              }
            })
        ),
      ];

      index += 1;
    }, INTERVAL_MS);
  });
}

async function getBase64ImageStringFromUrl(url) {
  return fetch(url)
    .then((res) => res.arrayBuffer())
    .then((data) => Buffer.from(data, "binary").toString("base64"));
}
