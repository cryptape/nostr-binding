import { ccc, CellDepInfoLike, KnownScript, Script } from "@ckb-ccc/ccc";
import offCKBConfig, { Network } from "offckb.config";

export function buildCccClient(network: Network) {
  if (network === "devnet") {
    const DEVNET_SCRIPTS: Record<
      string,
      Pick<Script, "codeHash" | "hashType"> & { cellDeps: CellDepInfoLike[] }
    > = {
      [KnownScript.Secp256k1Blake160]:
        offCKBConfig.systemScripts.secp256k1_blake160_sighash_all!.script,
      [KnownScript.Secp256k1Multisig]:
        offCKBConfig.systemScripts.secp256k1_blake160_multisig_all!.script,
      [KnownScript.AnyoneCanPay]:
        offCKBConfig.systemScripts.anyone_can_pay!.script,
      [KnownScript.OmniLock]: offCKBConfig.systemScripts.omnilock!.script,
      [KnownScript.TypeId]: {
        codeHash:
          "0x00000000000000000000000000000000000000000000000000545950455f4944",
        hashType: "type",
        cellDeps: [],
      },
      [KnownScript.XUdt]: offCKBConfig.systemScripts.xudt!.script,
      [KnownScript.NostrLock]: offCKBConfig.myScripts["nostr-lock"]!,
    };
    return new ccc.ClientPublicTestnet(
      offCKBConfig.rpcUrl,
      undefined,
      DEVNET_SCRIPTS,
    );
  }

  if (network === "testnet") {
    return new ccc.ClientPublicTestnet();
  }

  if (network === "mainnet") {
    return new ccc.ClientPublicMainnet();
  }

  throw new Error("invalid network");
}
