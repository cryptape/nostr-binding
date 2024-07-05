import {
  NostrBindingConfig,
  NostrBindingSDK,
  TESTNET_CONFIGS,
} from "@nostr-binding/sdk";
import offCKBConfig, { readEnvNetwork } from "offckb.config";

export const DEVNET_CONFIGS: NostrBindingConfig = {
  prefix: offCKBConfig.lumosConfig.PREFIX as "ckt" | "ckb",
  NOSTR_LOCK: offCKBConfig.lumosConfig.SCRIPTS["NOSTR_LOCK"]!,
  NOSTR_BINDING: offCKBConfig.lumosConfig.SCRIPTS["NOSTR_BINDING"]!,
};

const network = readEnvNetwork();

export const sdk = new NostrBindingSDK(
  network === "devnet" ? DEVNET_CONFIGS : TESTNET_CONFIGS,
);
