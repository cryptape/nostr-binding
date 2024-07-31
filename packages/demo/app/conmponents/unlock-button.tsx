import { useContext } from "react";
import { SingerContext } from "~/context/signer";
import { buildUnlockCKBTransaction } from "~/lib/ckb.client";
import { Event } from "@rust-nostr/nostr-sdk";
import { TagName } from "@nostr-binding/sdk";
import { sdk } from "~/lib/sdk.client";
import { ccc } from "@ckb-ccc/ccc";

export interface UnlockButtonProp {
  assetEvent: Event | undefined;
  setResult: (res: string) => void;
}

export function UnlockButton({ setResult, assetEvent }: UnlockButtonProp) {
  const { signer } = useContext(SingerContext);

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

  const unlock = async (bindingType: ccc.ScriptLike) => {
    if (!signer) {
      throw new Error("Not connected");
    }

    const deadLock = await ccc.Script.fromKnownScript(
      signer.client,
      ccc.KnownScript.Secp256k1Blake160,
      "00".repeat(20),
    );
    const tx = await buildUnlockCKBTransaction(signer, deadLock, bindingType);
    tx.addCellDeps(await sdk.binding.buildCellDeps());

    await tx.completeFeeChangeToOutput(signer, 0, 1000);

    const txHash = await signer.sendTransaction(tx);
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
