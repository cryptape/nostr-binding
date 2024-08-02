import { sdk } from "@/lib/sdk";
import { CellDep, helpers, Script, Transaction } from "@ckb-lumos/lumos";
import { EventToSign, SignedEvent } from "@nostr-binding/sdk";
import {
  EventBuilder,
  NostrSigner,
  PublicKey,
  Tag,
  Timestamp,
  UnsignedEvent,
} from "@rust-nostr/nostr-sdk";
import { createContext } from "react";

export interface CKBSigner {
  ckbAddress: string;
  lockScript: Script;
  originAddress: string;
  signMessage: (message: string) => Promise<string>;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  signPreparedTransaction: (
    tx: Transaction,
    lockIndexes: Array<number>,
  ) => Promise<Transaction>;
  prepareTransaction: (
    tx: Transaction,
  ) => Promise<{ transaction: Transaction; lockIndexes: Array<number> }>;
  cellDeps: CellDep[];
}

export interface SingerContextType {
  nostrSigner: NostrSigner | null | undefined;
  setNostrSigner: (signer: NostrSigner | undefined) => void;
  ckbSigner: CKBSigner | null | undefined;
  setCKBSigner: (signer: CKBSigner | undefined) => void;
}

export const defaultSingerContext = {
  nostrSigner: null,
  setNostrSigner: () => {},
  ckbSigner: null,
  setCKBSigner: () => {},
};

export const SingerContext =
  createContext<SingerContextType>(defaultSingerContext);

export const buildNostrCKBSigner = async (
  publicKey: PublicKey,
  nostrSigner: NostrSigner,
) => {
  // update ckb signer context
  const signMessage = async (message: string) => {
    const unsignedEvent = UnsignedEvent.fromJson(message);
    const signedMessage = await nostrSigner.signEvent(unsignedEvent);

    return signedMessage.asJson();
  };

  const signTransaction = async (tx: Transaction) => {
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
    return await sdk.lock.signTx(tx, signer);
  };

  const signPreparedTransaction = async (
    tx: Transaction,
    lockIndexes: Array<number>,
  ) => {
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
    return await sdk.lock.signPreparedTx(tx, lockIndexes, signer);
  };

  const prepareTransaction = async (tx: Transaction) => {
    return await sdk.lock.prepareTx(tx);
  };

  const lockScript = sdk.lock.buildScript("0x" + publicKey.toHex());
  const ckbAddress = helpers.encodeToAddress(lockScript);

  const cellDeps = await sdk.lock.buildCellDeps();
  const ckbSigner: CKBSigner = {
    ckbAddress,
    originAddress: publicKey.toBech32(),
    lockScript,
    signMessage,
    signTransaction,
    signPreparedTransaction,
    prepareTransaction,
    cellDeps,
  };
  return ckbSigner;
};
