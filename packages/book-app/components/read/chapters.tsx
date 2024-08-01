import { NostrClientContext } from "@/context/nostr-client";
import { BookChapter, getEvents, parseBookChapterFromEvent } from "@/lib/nostr";
import { Event, EventId, Filter } from "@rust-nostr/nostr-sdk";
import { useContext, useEffect, useState } from "react";
import Markdown from "marked-react";
import "github-markdown-css/github-markdown-light.css";

export interface ChaptersProp {
  eventIds: string[];
}

export const Chapters: React.FC<ChaptersProp> = ({ eventIds }) => {
  const { nostrReadClient } = useContext(NostrClientContext);

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<BookChapter>();

  const fetchChapters = async () => {
    if (!nostrReadClient) return;

    const filter = new Filter()
      .ids(eventIds.map((id) => EventId.fromHex(id)))
      .limit(eventIds.length);
    const events = await getEvents(nostrReadClient, [filter]);
    setSelectedChapter(parseBookChapterFromEvent(events[0])!);
    setEvents(events);
  };

  useEffect(() => {
    fetchChapters();
  }, [nostrReadClient, eventIds]);

  return (
    <div className="flex h-screen mt-4">
      <div className="w-1/4 bg-gray-200 py-4 px-1 overflow-y-auto">
        <ul>
          {events.map((event) => {
            const chapter = parseBookChapterFromEvent(event)!;
            return (
              <li
                key={chapter?.eventId}
                className={`cursor-pointer p-2 rounded text-sm ${
                  selectedChapter?.eventId === chapter?.eventId
                    ? "bg-gray-500 text-white"
                    : "hover:bg-gray-200"
                }`}
                onClick={() => setSelectedChapter(chapter)}
              >
                {chapter?.title}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="w-3/4 p-4 overflow-y-auto">
        <div className="markdown-body">
          <Markdown>{selectedChapter?.content}</Markdown>
        </div>
      </div>
    </div>
  );
};
