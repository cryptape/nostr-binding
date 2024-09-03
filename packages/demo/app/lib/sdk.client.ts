import {
  MAINNET_CONFIGS,
  NostrBindingSDK,
  SDKConfig,
  TESTNET_CONFIGS,
} from "@nostr-binding/sdk";
import offCKBConfig, { readEnvNetwork } from "offckb.config";

export const DEVNET_CONFIGS: SDKConfig = {
  prefix: offCKBConfig.addressPrefix,
  rpcUrl: offCKBConfig.rpcUrl,
  NOSTR_LOCK: {
    CODE_HASH: offCKBConfig.myScripts["nostr-lock"]!.codeHash,
    HASH_TYPE: offCKBConfig.myScripts["nostr-lock"]!.hashType,
    TX_HASH:
      offCKBConfig.myScripts["nostr-lock"]!.cellDeps[0].cellDep.outPoint.txHash,
    INDEX:
      "0x" +
      offCKBConfig.myScripts[
        "nostr-lock"
      ]!.cellDeps[0].cellDep.outPoint.index.toString(16),
    DEP_TYPE:
      offCKBConfig.myScripts["nostr-lock"]!.cellDeps[0].cellDep.depType ===
      "code"
        ? "code"
        : "depGroup",
  },
  NOSTR_BINDING: {
    CODE_HASH: offCKBConfig.myScripts["nostr-binding"]!.codeHash,
    HASH_TYPE: offCKBConfig.myScripts["nostr-binding"]!.hashType,
    TX_HASH:
      offCKBConfig.myScripts["nostr-binding"]!.cellDeps[0].cellDep.outPoint
        .txHash,
    INDEX:
      "0x" +
      offCKBConfig.myScripts[
        "nostr-binding"
      ]!.cellDeps[0].cellDep.outPoint.index.toString(16),
    DEP_TYPE:
      offCKBConfig.myScripts["nostr-binding"]!.cellDeps[0].cellDep.depType ===
      "code"
        ? "code"
        : "depGroup",
  },
};

const network = readEnvNetwork();

export const sdk = new NostrBindingSDK(
  network === "devnet"
    ? DEVNET_CONFIGS
    : network === "testnet"
      ? TESTNET_CONFIGS
      : MAINNET_CONFIGS
);
