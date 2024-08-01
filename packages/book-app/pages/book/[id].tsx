import BookCard from "@/components/book/book-card";
import Layout from "@/components/layout";
import { Chapters } from "@/components/read/chapters";
import { Book, getEvents, parseBookFromEvent } from "@/lib/nostr";
import { sdk } from "@/lib/sdk";
import offCKBConfig from "@/offckb.config";
import { encodeToAddress } from "@ckb-lumos/lumos/helpers";
import { Client, EventId, Filter } from "@rust-nostr/nostr-sdk";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const BookPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [book, setBook] = useState<Book | null>(null);
  const [ownerAddress, setOwnerAddress] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      // Fetch the book data by ID (replace with actual data fetching)
      const fetchBook = async () => {
        try {
          setLoading(true);
          setError(null);

          const filter = new Filter()
            .id(EventId.fromHex(id as string))
            .limit(1);

          let client = new Client();
          await client.addRelay("wss://relay.nostr.band");
          await client.connect();
          console.log(filter.asJson());
          const events = await getEvents(client, [filter]);
          if (events.length === 1) {
            const book = parseBookFromEvent(events[0]);
            setBook(book);
          }
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      fetchBook();
    }
  }, [id]);

  useEffect(()=>{
    const getOwner = async () => {
      if(!book || !book.ckbGlobalUniqueId)return; 
      const typeScript = sdk.binding.buildScript(book.eventId, book.ckbGlobalUniqueId)
      const cells = await offCKBConfig.rpc.getCells(
        { script: typeScript, scriptType: 'type' },
        'desc',
        BigInt(1),
      );
      if(cells.objects.length === 1){
        const cell = cells.objects[0];
        const ckbAddress = encodeToAddress(cell.output.lock);
        setOwnerAddress(ckbAddress);
      }
    }

    getOwner();
  }, [book])

  if (loading) {
    return <Layout>Loading...</Layout>;
  }

  if (error) {
    return <Layout>Error: {error}</Layout>;
  }

  if (!book) {
    return <Layout>Book not found</Layout>;
  }

  return (
    <Layout>
      <div className="flex justify-start">
        <BookCard
          key={book.eventId}
          eventId={book.eventId}
          title={book.title}
          author={book.author!}
          description={book.summary!}
          imageUrl={book.image!}
        />
        <div>
          <div className="font-bold text-2xl mb-4">{book.title}</div>
          <p className="text-gray-500">{book.summary}</p>
          <p>by {book.author}</p>
          <p>owner: <a href={"https://pudge.explorer.nervos.org/address/" + ownerAddress} target="_blank" rel="noopener noreferrer">{ownerAddress?.slice(0,12)}..</a></p>
        </div>
      </div>

      <hr />

      <Chapters eventIds={book.eventIds}/>
    </Layout>
  );
};

export default BookPage;
