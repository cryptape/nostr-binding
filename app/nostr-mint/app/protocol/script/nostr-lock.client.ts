import { CellDep, helpers, utils } from "@ckb-lumos/lumos";
import { PublicKey } from "@rust-nostr/nostr-sdk";
import offCKBConfig from "offckb.config";
import { bytes } from "@ckb-lumos/codec";

const lumosConfig = offCKBConfig.lumosConfig;

export class NostrLock {
  public static isScriptExist() {
    return lumosConfig.SCRIPTS.NOSTR_LOCK != null;
  }

  public static buildScript(ownerPubkey: PublicKey) {
    if (!this.isScriptExist()) {
      throw new Error("nostr lock script not found. have you deploy it?");
    }

    const hasher = new utils.CKBHasher();
    hasher.update(bytes.bytify("0x" + ownerPubkey.toHex()));
    const lockArgs =  "0x00" + hasher.digestHex().slice(2, 42);
    return {
      codeHash: lumosConfig.SCRIPTS.NOSTR_LOCK!.CODE_HASH,
      hashType: lumosConfig.SCRIPTS.NOSTR_LOCK!.HASH_TYPE,
      args: lockArgs,
    };
  }

  public static encodeToCKBAddress(ownerPubkey: PublicKey) {
    const lockScript = this.buildScript(ownerPubkey);
    const address = helpers.encodeToAddress(lockScript);
    return address;
  }

  public static parseCBKAddressToNostrPubkey(ckbAddress: string) {
    if (!this.isScriptExist()) {
      throw new Error("nostr lock script not found. have you deploy it?");
    }

    const script = helpers.parseAddress(ckbAddress);
    if (
      script.codeHash !== lumosConfig.SCRIPTS.NOSTR_LOCK!.CODE_HASH ||
      script.hashType !== lumosConfig.SCRIPTS.NOSTR_LOCK!.HASH_TYPE
    ) {
      throw new Error("nostr-lock contract script info not match!");
    }

    return script.args;
  }

  public static buildCellDeps() {
    if (!this.isScriptExist()) {
      throw new Error("nostr lock script not found. have you deploy it?");
    }

    const cellDeps: CellDep[] = [
      {
        outPoint: {
          txHash: lumosConfig.SCRIPTS.NOSTR_LOCK!.TX_HASH,
          index: lumosConfig.SCRIPTS.NOSTR_LOCK!.INDEX,
        },
        depType: lumosConfig.SCRIPTS.NOSTR_LOCK!.DEP_TYPE,
      }
    ];
    return cellDeps;
  }
}
