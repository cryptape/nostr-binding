import { Client, Event, Filter } from "@rust-nostr/nostr-sdk";
import BookCard from "./book-card";
import { useCallback, useContext, useEffect, useState } from "react";
import { isValidBookEvent, getEvents, parseBookFromEvent } from "../lib/nostr";
import { NostrClientContext } from "../context/nostr-client";

export function AllBooks() {
  const [events, setEvents] = useState<Event[]>([]);
  const { nostrReadClient, setNostrReadClient } =
    useContext(NostrClientContext);

  const getBookEvents = useCallback(async () => {
    if (nostrReadClient) {
      const filter = new Filter().kind(30040).limit(10);
      const filters = [filter];
      const events = await getEvents(nostrReadClient, filters);
      setEvents((pre) => [...pre, ...events.filter(e => isValidBookEvent(e))]);
      return events;
    }
    return [];
  }, [nostrReadClient]);

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
    </div>
  );
}
