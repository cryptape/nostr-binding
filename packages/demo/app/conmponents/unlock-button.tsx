import { Script } from "@ckb-lumos/lumos";
import { useContext } from "react";
import { SingerContext } from "~/context/signer";
import offCKB from "offckb.config";
import { buildUnlockCKBTransaction, buildDeadLock } from "~/lib/ckb.client";
import { Event } from "@rust-nostr/nostr-sdk";
import { TagName } from "@nostr-binding/sdk";
import { sdk } from "~/lib/sdk.client";
import { createTransactionFromSkeleton } from "@ckb-lumos/lumos/helpers";

export interface UnlockButtonProp {
  assetEvent: Event | undefined;
  setResult: (res: string) => void;
}

export function UnlockButton({ setResult, assetEvent }: UnlockButtonProp) {
  const context = useContext(SingerContext);
  const nostrSigner = context.nostrSigner!;
  const ckbSigner = context.ckbSigner!;

  const onUnlock = async () => {
    if (assetEvent == null) return;

    const eventId = assetEvent.id.toHex();
    const uniqueIdTag = assetEvent.tags.find(
      (t) => t.asVec()[0] === TagName.ckbGlobalUniqueId,
    );
    if (!uniqueIdTag) {
      return alert("invalid asset event!");
    }
    const globalUniqueId = uniqueIdTag.asVec()[1];
    const type = sdk.binding.buildScript(eventId, globalUniqueId);
    return await unlock(type);
  };

  const unlock = async (bindingType: Script) => {
    const nostrPubkey = await nostrSigner.publicKey();
    const newLock = buildDeadLock();
    let txSkeleton = await buildUnlockCKBTransaction(
      nostrPubkey,
      newLock,
      bindingType,
    );

    const cellDep = await sdk.binding.buildCellDeps();
    txSkeleton = txSkeleton.update("cellDeps", (cellDeps) =>
      cellDeps.push(...cellDep),
    );
    const tx = createTransactionFromSkeleton(txSkeleton);
    const { transaction, lockIndexes } = await ckbSigner.prepareTransaction(tx);
    const signedTx = await ckbSigner.signPreparedTransaction(
      transaction,
      lockIndexes,
    );
    const txHash = await offCKB.rpc.sendTransaction(signedTx, "passthrough");
    setResult("transfer tx: " + txHash);
  };

  return (
    <div className="my-1">
      <button
        className="border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-bold py-2 px-4 rounded"
        onClick={onUnlock}
      >
        Transfer The Minted Asset
      </button>
    </div>
  );
}
