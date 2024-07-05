import { bytes } from "@ckb-lumos/codec";
import { blockchain } from "@ckb-lumos/base";
import { ReactNode, useContext } from "react";
import { SingerContext } from "~/context/signer";
import offCKB from "offckb.config";
import { Event } from "@rust-nostr/nostr-sdk";
import { jsonStringToBytes } from "@nostr-binding/sdk";
import { buildMintTransaction } from "~/lib/ckb.client";
import { helpers } from "@ckb-lumos/lumos";

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
    const result = await buildMintTransaction(
      signerNostrPublicKey,
      ckbSigner.ckbAddress,
    );
    let txSkeleton = result.txSkeleton;
    const mintEvent = result.mintEvent;

    const signedMintEvent = await nostrSigner.signEvent(mintEvent);
    setAssetEvent(signedMintEvent);

    const mintEventWitness = bytes.hexify(
      jsonStringToBytes(signedMintEvent.asJson()),
    );
    const witness = bytes.hexify(
      blockchain.WitnessArgs.pack({
        outputType: mintEventWitness,
      }),
    );
    txSkeleton = txSkeleton.update(
      "witnesses",
      (witnesses: Immutable.List<string>) => witnesses.set(0, witness),
    );
    txSkeleton = await ckbSigner.signTransaction(txSkeleton);
    const signedTx = helpers.createTransactionFromSkeleton(txSkeleton);
    const txHash = await offCKB.rpc.sendTransaction(signedTx, "passthrough");

    setResult(
      <div className="overflow-x-scroll">
        <div>Mint token tx: {txHash}</div>
        <code className="whitespace-pre">
          {JSON.stringify(signedTx, null, 2)}
        </code>
      </div>,
    );
  };

  return (
    <div className="my-1">
      <button
        className="border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-bold py-2 px-4 rounded"
        onClick={mint}
      >
        Mint a Asset
      </button>
    </div>
  );
}
