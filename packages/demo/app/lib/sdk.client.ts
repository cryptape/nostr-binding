import {
  MAINNET_CONFIGS,
  NostrBindingSDK,
  SDKConfig,
  TESTNET_CONFIGS,
} from "@nostr-binding/sdk";
import offCKBConfig, { readEnvNetwork } from "offckb.config";

export const DEVNET_CONFIGS: SDKConfig = {
  prefix: offCKBConfig.lumosConfig.PREFIX as "ckt" | "ckb",
  rpcUrl: offCKBConfig.indexer.ckbIndexerUrl,
  NOSTR_LOCK: offCKBConfig.lumosConfig.SCRIPTS["NOSTR_LOCK"]!,
  NOSTR_BINDING: offCKBConfig.lumosConfig.SCRIPTS["NOSTR_BINDING"]!,
};

const network = readEnvNetwork();

export const sdk = new NostrBindingSDK(
  network === "devnet"
    ? DEVNET_CONFIGS
    : network === "testnet"
      ? TESTNET_CONFIGS
      : MAINNET_CONFIGS,
);
