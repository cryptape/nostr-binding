const {
  Keys,
  Client,
  NostrSigner,
  EventBuilder,
  loadWasmAsync,
  Tag,
} = require("@rust-nostr/nostr-sdk");
const path = require("path");
const { readMarkdown } = require("./read-md");

async function main() {
  await loadWasmAsync();

  // Generate random keys
  let keys = Keys.parse(
    "nsec1ufnus6pju578ste3v90xd5m2decpuzpql2295m3sknqcjzyys9ls0qlc85"
  );

  // Hex keys
  console.log("Public key (hex): ", keys.publicKey.toHex());
  console.log("Secret key (hex): ", keys.secretKey.toHex());

  let signer = NostrSigner.keys(keys);
  let client = new Client(signer);
  await client.addRelay("wss://relay.nostr.band");
  await client.connect();

  // Example usage
  const filePath = path.join(__dirname, "13.md");
  const result = readMarkdown(filePath);

  if (result) {
    console.log("Title:", result.title);
    // console.log("Content:", result.content);

    let builder = new EventBuilder(30041, result.content, [
      Tag.identifier(result.title),
      Tag.parse(["title", result.title]),
    ]);
    const event_id = await client.sendEventBuilder(builder);
    console.log("sent event_id: ", event_id.toHex());
    process.exit(0);
  }
}

main();
