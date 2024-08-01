import { NostrClientContext } from "@/context/nostr-client";
import { SingerContext } from "@/context/signer";
import { buildMintTransaction } from "@/lib/ckb";
import { blockchain, bytes } from "@ckb-lumos/lumos/codec";
import { createTransactionFromSkeleton } from "@ckb-lumos/lumos/helpers";
import { EventToBind, jsonStringToBytes } from "@nostr-binding/sdk";
import { Timestamp, UnsignedEvent } from "@rust-nostr/nostr-sdk";
import offCKB, { readEnvNetwork } from "@/offckb.config";
import React, { useContext, useState } from "react";

const AddBookCard: React.FC = () => {
  const { nostrWriteClient } = useContext(NostrClientContext);
  const { nostrSigner, ckbSigner } = useContext(SingerContext);

  const [showPopup, setShowPopup] = useState(false);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // for convenient we just hardcode some 30041 events
  const eventIds = [
    "bd7917bc8e43b4dced4f720c553f4cce6e76a2e3d39c30127d27959e4ff67bbf",
    "6bc9de97231f35749534438d94fc4d06fecc7d16e9f4bc1032bc84398edc536e",
    "ef488ab9cf957a15c514f23f63f89e5c1b17987c49b8eeb7d8a7ca9ac25db517",
    "1c61d6daac89e159702845dae77133f1e1e7e334a459c057925df5ee31a5c600",
  ];

  const handleAddBookClick = () => {
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  const handleSubmit = async () => {
    console.log(nostrWriteClient, nostrSigner, ckbSigner)
    if ( !nostrWriteClient || !nostrSigner || !ckbSigner) {
      throw new Error("no signer/client found!");
    }
    // Handle the submit logic here
    console.log("Title:", title);
    console.log("Image URL:", imageUrl);
    console.log("eventIds", eventIds);

    const pubkey = await nostrSigner.publicKey();

    const eventToBind: EventToBind = {
      pubkey: pubkey.toHex(),
      kind: 30040,
      content: "",
      tags: [
        ["d", title],
        ["title", title],
        ["author", authorName],
        ["image", imageUrl],
        ["summary", summary],
        // add this tag to clarify the blockchain
        ['ckb_network', readEnvNetwork()],
        ...eventIds.map((id) => ["e", id]),
      ],
      created_at: Timestamp.now().asSecs(),
    };

    const result = await buildMintTransaction(
      pubkey,
      ckbSigner.ckbAddress,
      eventToBind
    );
    const txHash = await mint(result);

    setShowPopup(false);
  };

  const mint = async (result: Awaited<ReturnType<typeof buildMintTransaction>>) => {
    if ( !nostrWriteClient || !nostrSigner || !ckbSigner) {
      throw new Error("no signer/client found!");
    }
    let txSkeleton = result.txSkeleton;
    const mintEvent = result.mintEvent;
    
    const signedMintEvent = await nostrSigner.signEvent(
      UnsignedEvent.fromJson(JSON.stringify(mintEvent)),
    );
    const mintEventWitness = bytes.hexify(
      jsonStringToBytes(signedMintEvent.asJson()),
    );
    const witness = bytes.hexify(
      blockchain.WitnessArgs.pack({
        outputType: mintEventWitness,
      }),
    );
    txSkeleton = txSkeleton.update(
      "witnesses",
      (witnesses: Immutable.List<string>) => witnesses.set(0, witness),
    );
    const tx = createTransactionFromSkeleton(txSkeleton);
    const signedTx = await ckbSigner.signTransaction(tx);
    const txHash = await offCKB.rpc.sendTransaction(signedTx, "passthrough");

    const eventId = await nostrWriteClient.sendEvent(signedMintEvent);
    console.log(eventId, txHash);
    return txHash;
  };

  return (
    <>
      <div
        onClick={handleAddBookClick}
        className="w-48 bg-white rounded-lg border border-gray-200 shadow-md hover:bg-gray-100 hover:shadow-lg transition duration-200 flex items-center justify-center cursor-pointer"
      >
        <div className="flex items-center justify-center w-full h-48 rounded-t-lg">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
      </div>
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Add Book</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 p-2 w-full border border-gray-300 rounded-md"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Summary
              </label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="mt-1 p-2 w-full border border-gray-300 rounded-md"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Cover Image
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="mt-1 p-2 w-full border border-gray-300 rounded-md"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Author Name
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="mt-1 p-2 w-full border border-gray-300 rounded-md"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {"Pages(Event_IDs)"}
              </label>
              <div className="my-2">
                {eventIds.map((eventId) => (
                  <div
                    className="text-sm overflow-x-scroll text-gray-500 my-1"
                    key={eventId}
                  >
                    {eventId}
                  </div>
                ))}
              </div>
              <input
                type="text"
                disabled
                placeholder="This should allow users to add new article event id to the book"
                className="mt-1 p-2 w-full border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleClosePopup}
                className="mr-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-200"
              >
                Add Book
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddBookCard;
