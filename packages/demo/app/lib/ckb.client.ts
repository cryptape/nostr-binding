import offCKB from "offckb.config";
import { Timestamp } from "@rust-nostr/nostr-sdk";
import { sdk } from "./sdk.client";
import { EventToBind } from "@nostr-binding/sdk";
import { ccc } from "@ckb-ccc/ccc";

offCKB.initializeLumosConfig();

export async function buildUnlockCKBTransaction(
  signer: ccc.Signer,
  toLock: ccc.ScriptLike,
  type: ccc.ScriptLike | undefined | null,
) {
  const collectedInputs = await collectTypeCell(signer, type, 1);

  const tx = ccc.Transaction.from({
    inputs: collectedInputs.map(({ outPoint, cellOutput }) => ({
      previousOutput: outPoint,
      cellOutput,
    })),
    outputs: [
      {
        lock: toLock,
        type,
      },
    ],
  });
  tx.addCellDeps(await sdk.lock.buildCellDeps());

  return tx;
}

export async function buildMintTransaction(signer: ccc.SignerNostr) {
  const lock = (await signer.getRecommendedAddressObj()).script;

  const tx = ccc.Transaction.from({
    outputs: [
      {
        lock,
        type: sdk.binding.buildScript("00".repeat(32), "00".repeat(32)),
      },
    ],
    outputsData: ["0x00"],
  });
  await tx.completeInputsByCapacity(signer);

  // === Prepare output type ===
  const globalUniqueId = ccc.hashTypeId(tx.inputs[0], 0).slice(2);
  const eventToBind: EventToBind = {
    pubkey: (await signer.getNostrPublicKey()).slice(2),
    kind: 1,
    content:
      "This is a kind-1 short note, it is also a Non Fungible Token on CKB blockchain.",
    tags: [],
    created_at: Timestamp.now().asSecs(),
  };
  const mintEvent = sdk.binding.finalizeEventToBind(
    globalUniqueId,
    eventToBind,
  );
  tx.outputs[0].type = ccc.Script.from(
    sdk.binding.buildScript(mintEvent.id, globalUniqueId),
  );
  // ======

  // === Sign binding event ===
  const signedEvent = await signer.signNostrEvent(mintEvent);

  const witnessArgs = tx.getWitnessArgsAt(0) ?? ccc.WitnessArgs.from({});
  witnessArgs.outputType = ccc.hexFrom(
    ccc.bytesFrom(JSON.stringify(signedEvent), "utf8"),
  );
  tx.setWitnessArgsAt(0, witnessArgs);
  // ======

  tx.addCellDeps(
    await sdk.binding.buildCellDeps(),
    await sdk.lock.buildCellDeps(),
  );

  await tx.completeFeeBy(signer, 1000);
  return { tx, signedEvent };
}

export async function collectTypeCell(
  signer: ccc.Signer,
  type: ccc.ScriptLike | null | undefined,
  total: number,
) {
  const collected: ccc.Cell[] = [];

  for await (const cell of signer.client.findCellsByLock(
    (await signer.getRecommendedAddressObj()).script,
    type,
  )) {
    collected.push(cell);
    if (collected.length >= total) break;
  }

  if (collected.length < total) {
    throw new Error(`Not enough type cells, ${collected.length} < ${total}`);
  }

  return collected;
}

export async function listTypeCells(
  signer: ccc.Signer,
  type: ccc.ScriptLike | undefined | null,
  maxTotal: number,
) {
  const collected: ccc.Cell[] = [];
  for await (const cell of signer.client.findCellsByLock(
    (await signer.getRecommendedAddressObj()).script,
    type,
  )) {
    collected.push(cell);
    if (collected.length >= maxTotal) break;
  }

  return collected;
}

export async function getWitnessByOutpoint(
  client: ccc.Client,
  outpoint: ccc.OutPoint,
) {
  const index = Number(outpoint.index);
  const tx = await client.getTransaction(outpoint.txHash);
  if (tx) {
    return tx.transaction.getWitnessArgsAt(index);
  }
  return null;
}
