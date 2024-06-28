import {
  BI,
  Cell,
  HexString,
  Script,
  WitnessArgs,
  helpers,
  utils,
} from "@ckb-lumos/lumos";
import {
  Tag,
  EventBuilder,
  PublicKey,
  Keys,
  Event,
} from "@rust-nostr/nostr-sdk";
import { TagName } from "../tag";
import { collectTypeCell } from "../ckb-helper.client";
import { NostrLock } from "../script/nostr-lock.client";
import { ProtocolKind } from "../kind";
import { Content } from "../content";
import { jsonStringToBytes } from "../util";
import { blockchain } from "@ckb-lumos/base";
import { bytes, number } from "@ckb-lumos/codec";

const { Uint64 } = number;

export class Unlock {
  public static kind = ProtocolKind.unlock;
  public static unlockDifficulty = 10;
  public static dummyCkbSigHashAll = "0x" + "00".repeat(32);

  static async signTx(
    txSkeleton: helpers.TransactionSkeletonType,
    lockIndexes: Array<number>,
    signer: (event: EventBuilder) => Promise<Event>
  ) {
    if (lockIndexes.length === 0) {
      throw new Error("lockIndexes length is 0");
    }

    //todo: remove the following
    const keys = Keys.generate();
    const dummyEvent = this.buildDummyEvent().toEvent(keys).asJson();
    const dummyLength = jsonStringToBytes(dummyEvent).length;
    console.log("dummyEvent and length: ", dummyEvent, dummyLength);

    const witnessIndex = lockIndexes[0];
    const dummyLock = "0x" + "00".repeat(dummyLength);
    const newWitnessArgs: WitnessArgs = {
      lock: dummyLock,
    };

    while (witnessIndex >= txSkeleton.get("witnesses").size) {
      txSkeleton = txSkeleton.update("witnesses", (witnesses) =>
        witnesses.push("0x")
      );
    }

    let witness: string = txSkeleton.get("witnesses").get(witnessIndex)!;

    if (witness !== "0x") {
      const witnessArgs = blockchain.WitnessArgs.unpack(bytes.bytify(witness));
      const lock = witnessArgs.lock;
      if (
        !!lock &&
        !!newWitnessArgs.lock &&
        !bytes.equal(lock, newWitnessArgs.lock)
      ) {
        throw new Error(
          "Lock field in first witness is set aside for signature!"
        );
      }
      const inputType = witnessArgs.inputType;
      if (!!inputType) {
        newWitnessArgs.inputType = inputType;
      }
      const outputType = witnessArgs.outputType;
      if (!!outputType) {
        newWitnessArgs.outputType = outputType;
      }
    }
    witness = bytes.hexify(blockchain.WitnessArgs.pack(newWitnessArgs));
    txSkeleton = txSkeleton.update("witnesses", (witnesses) =>
      witnesses.set(witnessIndex, witness)
    );

    const sigHashAll = this.buildSigHashAll(txSkeleton, lockIndexes);
    console.log("sighash_all = ", sigHashAll);

    const event = this.buildEvent(sigHashAll);

    const signedEvent = await signer(event);
    // const invalidSig = "a9e5f16529cbe055c1f7b6d928b980a2ee0cc0a1f07a8444b85b72b3f1d5c6baa9e5f16529cbe055c1f7b6d928b980a2ee0cc0a1f07a8444b85b72b3f1d5c6ba";
    // const e = JSON.parse(signedEvent.asJson());
    // e.sig = invalidSig;
    // const eventJson = jsonStringToBytes(JSON.stringify(e));
    const eventJson = jsonStringToBytes(signedEvent.asJson());
    console.log(
      "eventJson.byteLength: ",
      eventJson.byteLength,
      signedEvent.asJson()
    );

    // put signed event into witness
    {
      let witness: string = txSkeleton.get("witnesses").get(witnessIndex)!;
      if (witness !== "0x") {
        let witnessArgs = blockchain.WitnessArgs.unpack(bytes.bytify(witness));
        witnessArgs.lock = bytes.hexify(eventJson);
        witness = bytes.hexify(blockchain.WitnessArgs.pack(witnessArgs));
        txSkeleton = txSkeleton.update("witnesses", (witnesses) =>
          witnesses.set(witnessIndex, witness)
        );
      }
    }

    return helpers.createTransactionFromSkeleton(txSkeleton);
  }

  static buildSigHashAll(
    txSkeleton: helpers.TransactionSkeletonType,
    lockIndexes: Array<number>
  ) {
    const tx = helpers.createTransactionFromSkeleton(txSkeleton);
    const txHash = utils.ckbHash(blockchain.RawTransaction.pack(tx));
    const inputs = txSkeleton.get("inputs");
    const witness = txSkeleton.witnesses.get(lockIndexes[0]);
    if (witness == null) throw new Error("not get lock index!");

    let count = 0;

    const hasher = new utils.CKBHasher();
    hasher.update(txHash);
    count += 32;

    const witnessLength = bytes.bytify(witness).length;
    hasher.update(bytes.hexify(Uint64.pack(witnessLength)));
    count += 8;
    hasher.update(witness);
    count += witnessLength;

    // group
    if (lockIndexes.length > 1) {
      for (const index of lockIndexes) {
        const witness = txSkeleton.witnesses.get(lockIndexes[index]);
        if (witness == null) throw new Error("not get lock index!");
        const witnessLength = bytes.bytify(witness).length;
        hasher.update(bytes.hexify(Uint64.pack(witnessLength)));
        count += 8;
        hasher.update(witness);
        count += witnessLength;
      }
    }

    const witnessSize = txSkeleton.witnesses.size;

    if (inputs.size < witnessSize) {
      for (let j = inputs.size; j < witnessSize; j++) {
        const witness = txSkeleton.witnesses.get(j);
        if (witness == null) throw new Error("not get lock index!");
        const witnessLength = bytes.bytify(witness).length;
        hasher.update(bytes.hexify(Uint64.pack(witnessLength)));
        count += 8;
        hasher.update(witness);
        count += witnessLength;
      }
    }

    const message = hasher.digestHex();
    console.log("Hashed {} bytes in sighash_all", count, message.length);
    return message;
  }

  static buildDummyEvent() {
    const tags = [
      Tag.parse([TagName.ckbSigHashAll, this.dummyCkbSigHashAll.slice(2)]),
    ];
    const builder = new EventBuilder(this.kind, Content.lock, tags);
    return builder;
  }

  static buildEvent(ckbSigHashAll: HexString) {
    const tags = [Tag.parse([TagName.ckbSigHashAll, ckbSigHashAll.slice(2)])];
    const builder = new EventBuilder(this.kind, Content.lock, tags);
    return builder;
  }

  static async buildCKBTransaction(
    nostrPublicKey: PublicKey,
    newLock: Script,
    type: Script | undefined
  ) {
    const ckbAddress = NostrLock.encodeToCKBAddress(nostrPublicKey);

    let txSkeleton = helpers.TransactionSkeleton({});
    const collectedInputs = await collectTypeCell(ckbAddress, type, 1);

    const output: Cell = {
      cellOutput: {
        capacity: BI.from(0).toHexString(),
        lock: newLock,
        type,
      },
      data: "0x00",
    };
    const capacity = helpers.minimalCellCapacity(output);
    output.cellOutput.capacity = BI.from(capacity).toHexString();

    const txCellDeps = NostrLock.buildCellDeps();

    txSkeleton = txSkeleton.update("inputs", (inputs) =>
      inputs.push(...collectedInputs)
    );
    txSkeleton = txSkeleton.update("outputs", (outputs) =>
      outputs.push(output)
    );
    txSkeleton = txSkeleton.update("cellDeps", (cellDeps) =>
      cellDeps.concat(txCellDeps)
    );

    return txSkeleton;
  }
}
