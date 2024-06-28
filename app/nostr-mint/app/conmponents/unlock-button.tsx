import { Script } from "@ckb-lumos/lumos";
import { useContext } from "react";
import { SingerContext } from "~/context/signer";
import offCKB from "offckb.config";
import { Unlock } from "~/protocol/event/unlock.client";
import {
  buildAlwaysSuccessLock,
} from "~/protocol/ckb-helper.client";
import { Event, EventBuilder } from "@rust-nostr/nostr-sdk";
import { NostrBinding } from "~/protocol/script/nostr-binding.client";
import offCKBConfig from "offckb.config";
import { TagName } from "~/protocol/tag";

export interface UnlockButtonProp {
  assetEvent: Event | undefined;
  setResult: (res: string) => void;
}

export function UnlockButton({ setResult, assetEvent }: UnlockButtonProp) {
  const context = useContext(SingerContext);
  const nostrSigner = context.nostrSigner!;

  const onUnlock = async () => {
    if(assetEvent == null)return;

    const eventId = assetEvent.id.toHex();
    const uniqueIdTag = assetEvent.tags.find(
      (t) => t.asVec()[0] === TagName.ckbGlobalUniqueId 
    );
    if (!uniqueIdTag) {
      return alert("invalid asset event!");
    }
    const globalUniqueId = uniqueIdTag.asVec()[1];
    const type = NostrBinding.buildScript(eventId, globalUniqueId);
    return await unlock(type);
  };

  const unlock = async (type: Script) => {
    const nostrPubkey = await nostrSigner.publicKey();
    const newLock = buildAlwaysSuccessLock();
    let txSkeleton = await Unlock.buildCKBTransaction(
      nostrPubkey,
      newLock,
      type
    );

    const lumosConfig = offCKBConfig.lumosConfig;
    txSkeleton = txSkeleton.update("cellDeps", (cellDeps) =>
      cellDeps.push({
        outPoint: {
          txHash: lumosConfig.SCRIPTS.NOSTR_BINDING!.TX_HASH,
          index: lumosConfig.SCRIPTS.NOSTR_BINDING!.INDEX,
        },
        depType: lumosConfig.SCRIPTS.NOSTR_BINDING!.DEP_TYPE,
      }) 
    );

    const signer = async (event: EventBuilder) => {
      const pubkey = await nostrSigner.publicKey();
      const unsignedEvent = event.toUnsignedEvent(pubkey);
      return await nostrSigner.signEvent(unsignedEvent);
    }
    const signedTx = await Unlock.signTx(txSkeleton, [0], signer);
    const txHash = await offCKB.rpc.sendTransaction(
      signedTx,
      "passthrough"
    );
    setResult("transfer tx: " + txHash);
  };

  const unlockNostrLock = async () => {    
    const nostrPubkey = await nostrSigner.publicKey();
    const newLock = buildAlwaysSuccessLock();
    let txSkeleton = await Unlock.buildCKBTransaction(
      nostrPubkey,
      newLock,
      undefined 
    );

    const lumosConfig = offCKBConfig.lumosConfig;
    txSkeleton = txSkeleton.update("cellDeps", (cellDeps) =>
      cellDeps.push({
        outPoint: {
          txHash: lumosConfig.SCRIPTS.NOSTR_BINDING!.TX_HASH,
          index: lumosConfig.SCRIPTS.NOSTR_BINDING!.INDEX,
        },
        depType: lumosConfig.SCRIPTS.NOSTR_BINDING!.DEP_TYPE,
      }) 
    );

    const signer = async (event: EventBuilder) => {
      const pubkey = await nostrSigner.publicKey();
      const unsignedEvent = event.toUnsignedEvent(pubkey);
      return await nostrSigner.signEvent(unsignedEvent);
    }
    const signedTx = await Unlock.signTx(txSkeleton, [0], signer);
    const txHash = await offCKB.rpc.sendTransaction(
      signedTx,
      "passthrough"
    );
    setResult("unlock Nostr lock tx: " + txHash);
  };

  return (
    <div>
      <button onClick={onUnlock}>Transfer</button>
      <br />
      <button onClick={unlockNostrLock}>unlock NostrLock</button>
    </div>
  );
}
