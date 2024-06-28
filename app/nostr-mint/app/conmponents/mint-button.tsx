import { bytes } from "@ckb-lumos/codec";
import { blockchain } from "@ckb-lumos/base";
import { ReactNode, useContext } from "react";
import { SingerContext } from "~/context/signer";
import { Mint } from "~/protocol/event/mint.client";
import { jsonStringToBytes } from "~/protocol/util";
import offCKB from "offckb.config";
import { Event, EventBuilder } from "@rust-nostr/nostr-sdk";
import { Unlock } from "~/protocol/event/unlock.client";

export interface MintButtonProp {
  setResult: (res: string | ReactNode) => void;
  setAssetEvent: (event: Event) => void;
}

export function MintButton({ setResult, setAssetEvent }: MintButtonProp) {
  const context = useContext(SingerContext);
  const nostrSigner = context.nostrSigner!;
  const ckbSigner = context.ckbSigner!;

  const mint = async () => {
    const signerNostrPublicKey = await nostrSigner.publicKey();
    let { txSkeleton, mintEvent } = await Mint.buildTransaction(
      signerNostrPublicKey,
      ckbSigner.ckbAddress
    );

    const signedMintEvent = await nostrSigner.signEvent(mintEvent);
    setAssetEvent(signedMintEvent);

    const mintEventWitness = bytes.hexify(
      jsonStringToBytes(signedMintEvent.asJson())
    );
    const witness = bytes.hexify(
      blockchain.WitnessArgs.pack({
        outputType: mintEventWitness,
      })
    );
    txSkeleton = txSkeleton.update(
      "witnesses",
      (witnesses: Immutable.List<string>) => witnesses.set(0, witness)
    );
    const signer = async (event: EventBuilder) => {
      const pubkey = await nostrSigner.publicKey();
      const unsignedEvent = event.toUnsignedEvent(pubkey);
      return await nostrSigner.signEvent(unsignedEvent);
    };
    const signedTx = await Unlock.signTx(txSkeleton, [0], signer);
    const txHash = await offCKB.rpc.sendTransaction(signedTx, "passthrough");

    setResult(
      <div className="overflow-x-scroll">
        <div>Mint token tx: {txHash}</div>
        <code className="whitespace-pre">
          {JSON.stringify(signedTx, null, 2)}
        </code>
      </div>
    );
  };

  return (
    <div>
      <button onClick={mint}>Mint</button>
    </div>
  );
}
