import {
  helpers,
  BI,
  Cell,
  Script,
  HashType,
  utils,
  Transaction,
  OutPoint,
} from "@ckb-lumos/lumos";
import offCKB from "@/offckb.config";
import { blockchain } from "@ckb-lumos/lumos/codec";
import { bytes } from "@ckb-lumos/lumos/codec";
import { PublicKey } from "@rust-nostr/nostr-sdk";
import { sdk } from "./sdk";
import { EventToBind } from "@nostr-binding/sdk";

offCKB.initializeLumosConfig();

const lumosConfig = offCKB.lumosConfig;
const indexer = offCKB.indexer;

export async function buildUnlockCKBTransaction(
  nostrPublicKey: PublicKey,
  newLock: Script,
  type: Script | undefined,
) {
  const ckbAddress = sdk.lock.encodeToCKBAddress("0x" + nostrPublicKey.toHex());

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

  const txCellDeps = await sdk.lock.buildCellDeps();

  txSkeleton = txSkeleton.update("inputs", (inputs) =>
    inputs.push(...collectedInputs),
  );
  txSkeleton = txSkeleton.update("outputs", (outputs) => outputs.push(output));
  txSkeleton = txSkeleton.update("cellDeps", (cellDeps) =>
    cellDeps.concat(txCellDeps),
  );

  return txSkeleton;
}

export async function buildMintTransaction(
  receiverNostrPublicKey: PublicKey,
  minerCKBAddress: string,
  eventToBind: EventToBind,
) {
  let txSkeleton = helpers.TransactionSkeleton({});
  const neededCapacity = BI.from(16000000000);
  const txFee = BI.from(3000);
  const fromLock = helpers.parseAddress(minerCKBAddress);
  const collectedInputs = await collectCell(minerCKBAddress, neededCapacity);
  const globalUniqueId = sdk.binding.buildGlobalUniqueId(
    collectedInputs[0],
    "0x0",
  );

  const mintEvent = sdk.binding.finalizeEventToBind(
    globalUniqueId,
    eventToBind,
  );

  const lock = sdk.lock.buildScript("0x" + receiverNostrPublicKey.toHex());
  const bindingCell = sdk.binding.buildBindingCell(
    mintEvent.id!,
    globalUniqueId,
    lock,
  );

  txSkeleton = txSkeleton.update("outputs", (outputs) =>
    outputs.push(bindingCell),
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
      outputs.push(changeOutput),
    );
  }
  txSkeleton = txSkeleton.update("inputs", (inputs) =>
    inputs.push(...collectedInputs),
  );

  const bindingDep = await sdk.binding.buildCellDeps();
  const lockDep = await sdk.lock.buildCellDeps();
  txSkeleton = txSkeleton.update("cellDeps", (cellDeps) =>
    cellDeps.concat(lockDep, bindingDep),
  );
  return { txSkeleton, mintEvent };
}

export async function collectCell(ckbAddress: string, neededCapacity: BI) {
  const fromScript = helpers.parseAddress(ckbAddress, {
    config: lumosConfig,
  });

  let collectedSum = BI.from(0);
  const collected: Cell[] = [];
  const collector = indexer.collector({ lock: fromScript, type: "empty" });
  for await (const cell of collector.collect()) {
    collectedSum = collectedSum.add(cell.cellOutput.capacity);
    collected.push(cell);
    if (collectedSum >= neededCapacity) break;
  }

  if (collectedSum.lt(neededCapacity)) {
    throw new Error(`Not enough CKB, ${collectedSum} < ${neededCapacity}`);
  }

  return collected;
}

export async function collectTypeCell(
  ckbAddress: string,
  type: Script | undefined,
  total: number,
) {
  const fromScript = helpers.parseAddress(ckbAddress, {
    config: lumosConfig,
  });

  const collected: Cell[] = [];
  const collector = indexer.collector({ lock: fromScript, type });
  for await (const cell of collector.collect()) {
    collected.push(cell);
    if (collected.length >= total) break;
  }

  if (collected.length < total) {
    throw new Error(`Not enough type cells, ${collected.length} < ${total}`);
  }

  return collected;
}

export async function listTypeCells(
  ckbAddress: string,
  type: Script | undefined,
  maxTotal: number,
) {
  const fromScript = helpers.parseAddress(ckbAddress, {
    config: lumosConfig,
  });

  const collected: Cell[] = [];
  const options =
    type != null ? { lock: fromScript, type } : { lock: fromScript };
  const collector = indexer.collector(options);
  for await (const cell of collector.collect()) {
    collected.push(cell);
    if (collected.length >= maxTotal) break;
  }

  return collected;
}

export async function capacityOf(address: string): Promise<BI> {
  const collector = indexer.collector({
    lock: helpers.parseAddress(address),
  });

  let balance = BI.from(0);
  for await (const cell of collector.collect()) {
    balance = balance.add(cell.cellOutput.capacity);
  }

  return balance;
}

export function buildAlwaysSuccessLock(): Script {
  return {
    codeHash: lumosConfig.SCRIPTS["ALWAYS_SUCCESS"]!.CODE_HASH,
    hashType: lumosConfig.SCRIPTS["ALWAYS_SUCCESS"]!.HASH_TYPE as HashType,
    args: "0x",
  };
}

export function buildDeadLock(): Script {
  return {
    codeHash: lumosConfig.SCRIPTS["SECP256K1_BLAKE160"]!.CODE_HASH,
    hashType: lumosConfig.SCRIPTS["SECP256K1_BLAKE160"]!.HASH_TYPE as HashType,
    args: "0x" + "00".repeat(20),
  };
}

export function computeTransactionHash(rawTransaction: Transaction) {
  const transactionSerialized = bytes.hexify(
    blockchain.RawTransaction.pack(rawTransaction),
  );
  const rawTXHash = utils.ckbHash(transactionSerialized);
  return rawTXHash;
}

export async function getWitnessByOutpoint(outpoint: OutPoint) {
  const txHash = outpoint.txHash;
  const index = +outpoint.index;
  const tx = await offCKB.rpc.getTransaction(txHash);
  if (tx) {
    return tx.transaction.witnesses[index];
  }
  return null;
}

export function buildTruncateCkbAddress(ckbAddress: string) {
  return ckbAddress.slice(0, 10) + ".." + ckbAddress.slice(-10);
}
