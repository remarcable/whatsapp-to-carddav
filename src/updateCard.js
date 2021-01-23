import * as dav from "dav";

export default async function updateCardOnServer({ client, card }) {
  return client.updateCard(card);
}
