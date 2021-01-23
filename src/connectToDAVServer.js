import * as dav from "dav";

export default async function connectToDAVServer({ server, credentials }) {
  const xhr = new dav.transport.Basic(new dav.Credentials(credentials));
  const client = new dav.Client(xhr);
  const account = await client.createAccount({
    server,
    accountType: "carddav",
    loadObjects: true,
  });

  return { account, client };
}
