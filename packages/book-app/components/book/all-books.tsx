import { Event, Filter } from "@rust-nostr/nostr-sdk";
import BookCard from "./book-card";
import { useCallback, useContext, useEffect, useState } from "react";
import { isValidBookEvent, getEvents, parseBookFromEvent } from "../../lib/nostr";
import { NostrClientContext } from "../../context/nostr-client";

export function AllBooks() {
  
  const { nostrReadClient } =
    useContext(NostrClientContext);

    const [events, setEvents] = useState<Event[]>([]);

  const getBookEvents = useCallback(async () => {
    if (!nostrReadClient)return;

    const filter = new Filter().kind(30040).limit(10);
      const events = await getEvents(nostrReadClient, [filter]);
      setEvents((pre) => [...pre, ...events.filter(e => isValidBookEvent(e))]);
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
          imageUrl={book.image!}
        />
      )})}
    </div>
  );
}
