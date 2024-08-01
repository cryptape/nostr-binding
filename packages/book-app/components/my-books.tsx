import { Client, ClientBuilder, Filter, HandleNotification, Event } from "@rust-nostr/nostr-sdk";
import { useCallback, useContext, useEffect, useState } from "react";
import { SingerContext } from "../context/signer";
import AddBookCard from "./add-book-card";
import BookCard from "./book-card";
import { NostrClientContext } from "@/context/nostr-client";
import { getEvents, isValidBookEvent, parseBookFromEvent } from "@/lib/nostr";

export function MyBook() {
  const [events, setEvents] = useState<Event[]>([]);
  const { nostrReadClient, setNostrReadClient } =
    useContext(NostrClientContext);

    const {nostrSigner} = useContext(SingerContext);

  const getBookEvents = useCallback(async () => {
    if (nostrReadClient && nostrSigner) {
      const pubkey =await nostrSigner.publicKey();
      const filter = new Filter().author(pubkey).kind(30040).limit(10);
      const filters = [filter];
      const events = await getEvents(nostrReadClient, filters);
      setEvents((pre) => [...pre, ...events.filter(e => isValidBookEvent(e))]);
      return events;
    }
    return [];
  }, [nostrReadClient, nostrSigner]);

  useEffect(() => {
    if (!nostrReadClient) {
      let client = new Client();
      client.addRelay("wss://relay.nostr.band").then(() => {
        client.connect();
      });
      setNostrReadClient(client);
    }
  }, [nostrReadClient]);

  useEffect(() => {
    getBookEvents();
  }, [getBookEvents]);

  return (
    <div className="flex flex-wrap bg-gray-50 p-4">
      {events.map((event) => {
        const book = parseBookFromEvent(event)!;
        return (
        <BookCard
          key={event.id.toHex()}
          eventId={event.id.toHex()}
          title={book.title}
          author={book.author!}
          description={book.summary!}
          rating={2}
          imageUrl={book.image!}
        />
      )})}
      <AddBookCard />
    </div>
  );
}
