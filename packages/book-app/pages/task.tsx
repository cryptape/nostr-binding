import React from "react";
import { Keys } from "@rust-nostr/nostr-sdk";
import { loadWasmAsync } from "@rust-nostr/nostr-sdk";
import {
  EventToBind,
  EventToSign,
  jsonStringToBytes,
  NostrBindingSDK,
  SignedEvent,
  TESTNET_CONFIGS,
} from "@nostr-binding/sdk";
import { BI, Cell, config, helpers, Indexer, RPC } from "@ckb-lumos/lumos";
import { createTransactionFromSkeleton } from "@ckb-lumos/lumos/helpers";
import { NostrSigner } from "@rust-nostr/nostr-sdk";
import { EventBuilder } from "@rust-nostr/nostr-sdk";
import { Tag } from "@rust-nostr/nostr-sdk";
import { Timestamp } from "@rust-nostr/nostr-sdk";
import { buildMintTransaction } from "../lib/ckb";
import { UnsignedEvent } from "@rust-nostr/nostr-sdk";
import { blockchain, bytes } from "@ckb-lumos/lumos/codec";

const Task: React.FC = () => {
  const getBalance = async () => {
    await loadWasmAsync();

    let keys = Keys.parse(
      "e267c86832e53c782f31615e66d36a6e701e0820fa945a6e30b4c18908848171",
    );
    console.log("Public key (hex): ", keys.publicKey.toHex());
    console.log("Public key (Npub): ", keys.publicKey.toBech32());

    // get ckbAddress
    const sdk = new NostrBindingSDK();
    const ckbAddress = sdk.lock.encodeToCKBAddress(
      "0x" + keys.publicKey.toHex(),
    );
    console.log("ckbAddress: ", ckbAddress);

    // get balance
    config.initializeConfig(config.TESTNET);

    const indexer = new Indexer("https://testnet.ckb.dev/rpc");
    const collector = indexer.collector({
      lock: sdk.lock.buildScript("0x" + keys.publicKey.toHex()),
      type: "empty",
    });
    let balance = BI.from(0);
    const collected: Cell[] = [];
    for await (const cell of collector.collect()) {
      balance = balance.add(cell.cellOutput.capacity);
      collected.push(cell);
    }
    console.log("balance: ", balance.toString());
  };

  const transfer = async () => {
    await loadWasmAsync();

    let keys = Keys.parse(
      "e267c86832e53c782f31615e66d36a6e701e0820fa945a6e30b4c18908848171",
    );
    console.log("Public key (hex): ", keys.publicKey.toHex());
    console.log("Public key (Npub): ", keys.publicKey.toBech32());

    // get ckbAddress
    const sdk = new NostrBindingSDK();
    const ckbAddress = sdk.lock.encodeToCKBAddress(
      "0x" + keys.publicKey.toHex(),
    );
    console.log("ckbAddress: ", ckbAddress);

    // get balance
    const indexer = new Indexer("https://testnet.ckb.dev/rpc");
    const rpc = new RPC("https://testnet.ckb.dev/rpc");
    config.initializeConfig(config.TESTNET);

    const collector = indexer.collector({
      lock: sdk.lock.buildScript("0x" + keys.publicKey.toHex()),
      type: "empty",
    });
    let balance = BI.from(0);
    const collected: Cell[] = [];
    for await (const cell of collector.collect()) {
      balance = balance.add(cell.cellOutput.capacity);
      collected.push(cell);
    }
    console.log("balance: ", balance.toString(), collected);

    // transfer from nostr-lock
    let txSkeleton = helpers.TransactionSkeleton({ cellProvider: indexer });
    const neededCapacity = BI.from(balance).sub(BI.from(3000));
    const fromLock = helpers.parseAddress(ckbAddress);
    txSkeleton = txSkeleton.update("inputs", (inputs) =>
      inputs.push(...collected),
    );
    const output: Cell = {
      cellOutput: {
        capacity: neededCapacity.toHexString(),
        lock: fromLock,
      },
      data: "0x00",
    };
    txSkeleton = txSkeleton.update("outputs", (outputs) =>
      outputs.push(output),
    );
    const lockDep = await sdk.lock.buildCellDeps();
    txSkeleton = txSkeleton.update("cellDeps", (cellDeps) =>
      cellDeps.concat(lockDep),
    );
    const tx = createTransactionFromSkeleton(txSkeleton);

    let nostrSigner = NostrSigner.keys(keys);
    const signer = async (event: EventToSign) => {
      const eventBuilder = new EventBuilder(
        event.kind,
        event.content,
        event.tags.map((tag) => Tag.parse(tag)),
      ).customCreatedAt(Timestamp.fromSecs(event.created_at));
      const nostrSignedEvent = await nostrSigner.signEventBuilder(eventBuilder);
      const signedEvent: SignedEvent = JSON.parse(nostrSignedEvent.asJson());
      return signedEvent;
    };
    const signedTx = await sdk.lock.signTx(tx, signer);
    const txHash = await rpc.sendTransaction(signedTx, "passthrough");
    console.log("send tx: ", txHash, signedTx);
  };

  const testNostrBindingTypeScript = async () => {
    await loadWasmAsync();
    const rpc = new RPC("https://testnet.ckb.dev/rpc");
    config.initializeConfig(config.TESTNET);

    let keys = Keys.parse(
      "e267c86832e53c782f31615e66d36a6e701e0820fa945a6e30b4c18908848171",
    );
    console.log("Public key (hex): ", keys.publicKey.toHex());
    console.log("Public key (Npub): ", keys.publicKey.toBech32());

    // get ckbAddress
    const sdk = new NostrBindingSDK(TESTNET_CONFIGS);
    const ckbAddress = sdk.lock.encodeToCKBAddress(
      "0x" + keys.publicKey.toHex(),
    );
    console.log("ckbAddress: ", ckbAddress);

    // get 30040 Book Event
    const eventToBind: EventToBind = {
      pubkey: keys.publicKey.toHex(),
      kind: 30040,
      content: "",
      tags: [
        ["d", "a-test-title"],
        ["title", "this is a test title"],
        ["author", "test author"],
        //["image", ""],
        ["summary", "this is a test summary"],
        // add this tag to clarify the blockchain
        ["ckb_network", "testnet"],

        // chapter event ids in order
        [
          "e",
          "bd7917bc8e43b4dced4f720c553f4cce6e76a2e3d39c30127d27959e4ff67bbf",
        ],
        [
          "e",
          "6bc9de97231f35749534438d94fc4d06fecc7d16e9f4bc1032bc84398edc536e",
        ],
      ],
      created_at: Timestamp.now().asSecs(),
    };

    // build mint transaction
    const result = await buildMintTransaction(
      keys.publicKey,
      ckbAddress,
      eventToBind,
    );
    let txSkeleton = result.txSkeleton;
    const mintEvent = result.mintEvent;

    let nostrSigner = NostrSigner.keys(keys);
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

    const signer = async (event: EventToSign) => {
      const eventBuilder = new EventBuilder(
        event.kind,
        event.content,
        event.tags.map((tag) => Tag.parse(tag)),
      ).customCreatedAt(Timestamp.fromSecs(event.created_at));
      const nostrSignedEvent = await nostrSigner.signEventBuilder(eventBuilder);
      const signedEvent: SignedEvent = JSON.parse(nostrSignedEvent.asJson());
      return signedEvent;
    };
    const signedTx = await sdk.lock.signTx(tx, signer);
    const txHash = await rpc.sendTransaction(signedTx, "passthrough");
    console.log("send tx: ", txHash, signedTx);
  };

  return (
    <div className="w-1/3 mx-auto space-y-4">
      <div className="text-2xl font-bold">Workshop Task</div>
      <div>
        <div className="text-2xl font-bold">Nostr Lock</div>
        <button
          className="mr-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition duration-200"
          onClick={getBalance}
        >
          balance
        </button>
        <button
          className="mr-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition duration-200"
          onClick={transfer}
        >
          transfer
        </button>
      </div>

      <div>
        <div className="text-2xl font-bold">Nostr Binding Type</div>
        <button
          className="mr-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition duration-200"
          onClick={testNostrBindingTypeScript}
        >
          Mint a Book
        </button>
      </div>
    </div>
  );
};

export default Task;
