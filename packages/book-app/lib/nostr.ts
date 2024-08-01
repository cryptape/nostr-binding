import { TagName } from "@nostr-binding/sdk";
import {
  Client,
  ClientBuilder,
  Duration,
  Event,
  Filter,
  HandleNotification,
  NostrSigner,
  RelayMessage,
} from "@rust-nostr/nostr-sdk";

export interface Book {
  eventId: string;
  title: string;
  author?: string;
  image?: string;
  summary?: string;
  ckbGlobalUniqueId?: string;
  eventIds: string[];
}

export interface BookChapter {
  eventId: string;
  title: string;
  author?: string;
  image?: string;
  summary?: string;
  content: string;
}

export function isValidBookEvent(e: Event) {
  return (
    e.kind.valueOf() === 30040 &&
    e.tags.find((tag) => tag.asVec()[0] === "title")
  );
}

export function isValidBookChapterEvent(e: Event) {
  return (
    e.kind.valueOf() === 30041 &&
    e.tags.find((tag) => tag.asVec()[0] === "title")
  );
}

export function parseBookFromEvent(e: Event): Book | null{
  if (!isValidBookEvent(e)) return null;

  return {
    eventId: e.id.toHex(),
    title: e.tags.find((tag) => tag.asVec()[0] === "title")!.asVec()[1],
    author: e.tags.find((tag) => tag.asVec()[0] === "author")?.asVec()[1],
    image: e.tags.find((tag) => tag.asVec()[0] === "image")?.asVec()[1],
    summary: e.tags.find((tag) => tag.asVec()[0] === "summary")?.asVec()[1],
    ckbGlobalUniqueId: e.tags
      .find((tag) => tag.asVec()[0] === TagName.ckbGlobalUniqueId)
      ?.asVec()[1],
    eventIds: e.tags
      .map((tag) => {
        if (tag.asVec()[0] === "e") {
          return tag.asVec()[1];
        }
      })
      .filter((e) => e != undefined),
  };
}

export function parseBookChapterFromEvent(e: Event): BookChapter | null{
  if (!isValidBookChapterEvent(e)) return null;

  return {
    eventId: e.id.toHex(),
    title: e.tags.find((tag) => tag.asVec()[0] === "title")!.asVec()[1],
    author: e.tags.find((tag) => tag.asVec()[0] === "author")?.asVec()[1],
    image: e.tags.find((tag) => tag.asVec()[0] === "image")?.asVec()[1],
    summary: e.tags.find((tag) => tag.asVec()[0] === "summary")?.asVec()[1],
    content: e.content,
  };
}

export async function subscribeEvents({
  nostrSigner,
  filters,
  relays,
  _handleEvent,
  _handleMessage,
}: {
  nostrSigner: NostrSigner;
  filters: Filter[];
  relays?: string[];
  _handleEvent?: (event: Event) => Promise<boolean>;
  _handleMessage?: (message: RelayMessage) => Promise<boolean>;
}) {
  let client = new ClientBuilder().signer(nostrSigner).build();
  if (relays) {
    for (const relay of relays) {
      await client.addRelay(relay);
    }
  } else {
    await client.addRelay("wss://relay.nostr.band");
  }
  await client.connect();

  await client.subscribe(filters);

  const handle: HandleNotification = {
    handleEvent: async (_relayUrl, _subscriptionId, event: Event) => {
      if (_handleEvent) {
        return _handleEvent(event);
      }
      return false;
    },
    handleMsg: async (_relayUrl: string, message) => {
      if (_handleMessage) {
        return _handleMessage(message);
      }
      return false;
    },
  };
  client.handleNotifications(handle);
}

export async function getEvents(readClient: Client, filters: Filter[]) {
  await readClient.connect();
  let events = await readClient.getEventsOf(filters, Duration.fromSecs(10));
  return events;
}

export async function publishEvent(writeClient: Client, event: Event) {
  await writeClient.connect();
  return await writeClient.sendEvent(event);
}

export function buildTruncateNpub(npub: string) {
  return npub.slice(0, 8) + ".." + npub.slice(-8);
}

export function isValidEventId(id: any){
  return typeof id === "string" && id.length === 64 && /^#[0-9A-F]{6}[0-9a-f]{0,2}$/i.test(id);
}
