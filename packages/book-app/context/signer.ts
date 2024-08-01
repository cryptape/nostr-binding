import { CellDep, Script, Transaction } from "@ckb-lumos/lumos";
import { NostrSigner } from "@rust-nostr/nostr-sdk";
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
