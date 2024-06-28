import { EventBuilder, PublicKey, Tag } from "@rust-nostr/nostr-sdk";
import { TagName } from "../tag";
import { BI, Cell, helpers } from "@ckb-lumos/lumos";

import { collectCell } from "../ckb-helper.client";
import { NostrLock } from "../script/nostr-lock.client";
import { NostrBinding } from "../script/nostr-binding.client";
import { mergeArraysAndRemoveDuplicates } from "../util";

export class Mint {
  public static mintDifficulty = 10;

  // todo: change to pass custom event
  static buildEvent(globalUniqueId: string, kind = 1, content = "") {
    const tags = [Tag.parse([TagName.ckbGlobalUniqueId, globalUniqueId])];
    const builder = new EventBuilder(kind, content, tags);
    return builder;
  }

  static async buildTransaction(nostrPublicKey: PublicKey, ckbAddress: string) {
    let txSkeleton = helpers.TransactionSkeleton({});
    const neededCapacity = BI.from(16000000000);
    const txFee = BI.from(2000);
    const fromLock = helpers.parseAddress(ckbAddress);
    const collectedInputs = await collectCell(ckbAddress, neededCapacity);
    const globalUniqueId = NostrBinding.buildGlobalUniqueId(
      collectedInputs[0],
      "0x0"
    );

    const mintEvent = this.buildEvent(
      globalUniqueId,
      1,
      "This is a kind-1 short note, it is also a Non Fungible Token on CKB blockchain."
    ).toUnsignedPowEvent(nostrPublicKey, this.mintDifficulty);

    const lock = NostrLock.buildScript(nostrPublicKey);
    const bindingCell = NostrBinding.buildBindingCell(
      mintEvent.id.toHex(),
      globalUniqueId,
      lock
    );

    txSkeleton = txSkeleton.update("outputs", (outputs) =>
      outputs.push(bindingCell)
    );

    let collectedSum = BI.from(0);
    for (const cell of collectedInputs) {
      collectedSum = collectedSum.add(cell.cellOutput.capacity);
    }

    const changeAmount = collectedSum.sub(neededCapacity).sub(txFee);
    if (changeAmount.gt(BI.from(6200000000))) {
      const changeOutput: Cell = {
        cellOutput: {
          capacity: changeAmount.toHexString(),
          lock: fromLock,
        },
        data: "0x",
      };
      txSkeleton = txSkeleton.update("outputs", (outputs) =>
        outputs.push(changeOutput)
      );
    }

    const txCellDeps = mergeArraysAndRemoveDuplicates(
      NostrBinding.buildCellDeps(),
      NostrLock.buildCellDeps()
    );

    txSkeleton = txSkeleton.update("inputs", (inputs) =>
      inputs.push(...collectedInputs)
    );
    txSkeleton = txSkeleton.update("cellDeps", (cellDeps) =>
      cellDeps.concat(txCellDeps)
    );
    return { txSkeleton, mintEvent };
  }
}
