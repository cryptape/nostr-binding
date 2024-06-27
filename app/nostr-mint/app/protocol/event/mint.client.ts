import {
  Event,
  EventBuilder,
  EventId,
  PublicKey,
  Tag,
} from "@rust-nostr/nostr-sdk";
import { TagName } from "../tag";
import { BI, helpers } from "@ckb-lumos/lumos";

import { collectCell } from "../ckb-helper.client";
import { NostrLock } from "../script/nostr-lock.client";
import { NostrBinding } from "../script/nostr-binding.client";
import { ProtocolKind } from "../kind";
import { mergeArraysAndRemoveDuplicates } from "../util";
import { blockchain } from "@ckb-lumos/base";
import { bytes, number } from "@ckb-lumos/codec";
import { jsonStringToBytes } from "../serialize";

export class Mint {
  public static kind = ProtocolKind.mint;
  public static mintDifficulty = 10;

  static buildEvent(globalUniqueId: string, content = "") {
    const tags = [
      Tag.parse([TagName.ckbGlobalUniqueId, globalUniqueId]),
    ];
    const builder = new EventBuilder(this.kind, content, tags);
    return builder;
  }

  static async buildTransaction(nostrPublicKey: PublicKey, ckbAddress: string) {
    let txSkeleton = helpers.TransactionSkeleton({});
    const collectedInputs = await collectCell(ckbAddress, BI.from(16000000000));
    const globalUniqueId = NostrBinding.buildGlobalUniqueId(collectedInputs[0], "0x0");

    const mintEvent = this.buildEvent(
      globalUniqueId,
      "This is the content of the Test-NFT"
    ).toUnsignedPowEvent(nostrPublicKey, this.mintDifficulty);
    
    const lock = NostrLock.buildScript(nostrPublicKey);
    const bindingCell = NostrBinding.buildBindingCell(
      mintEvent.id.toHex(),
      globalUniqueId,
      lock
    );
    // todo: add changeCell and fee rate

    const txCellDeps = mergeArraysAndRemoveDuplicates(
      NostrBinding.buildCellDeps(),
      NostrLock.buildCellDeps()
    );

    txSkeleton = txSkeleton.update("inputs", (inputs) =>
      inputs.push(...collectedInputs)
    );
    txSkeleton = txSkeleton.update("outputs", (outputs) =>
      outputs.push(bindingCell)
    );
    txSkeleton = txSkeleton.update("cellDeps", (cellDeps) =>
      cellDeps.concat(txCellDeps)
    );
    return { txSkeleton, mintEvent };
  }
}
