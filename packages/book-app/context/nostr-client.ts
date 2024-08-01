import { Client } from "@rust-nostr/nostr-sdk";
import { createContext } from "react";

export interface NostrClientContextType {
  nostrReadClient: Client | null | undefined;
  setNostrReadClient: (readClient: Client | undefined) => void;
  nostrWriteClient: Client | null | undefined;
  setNostrWriteClient: (writeClient: Client | undefined) => void;
}

export const defaultContext = {
  nostrReadClient: null,
  setNostrReadClient: () => {},
  nostrWriteClient: null,
  setNostrWriteClient: () => {},
};

export const NostrClientContext =
  createContext<NostrClientContextType>(defaultContext);
