import { ReactNode, useContext } from "react";
import { SingerContext } from "~/context/signer";
import { Event } from "@rust-nostr/nostr-sdk";
import { buildMintTransaction } from "~/lib/ckb.client";

export interface MintButtonProp {
  setResult: (res: string | ReactNode) => void;
  setAssetEvent: (event: Event) => void;
}

export function MintButton({ setResult, setAssetEvent }: MintButtonProp) {
  const { signer } = useContext(SingerContext);

  const mint = async () => {
    if (!signer) {
      throw Error("Not connected");
    }

    const { tx, signedEvent } = await buildMintTransaction(signer);
    setAssetEvent(Event.fromJson(JSON.stringify(signedEvent)));

    const signedTx = await signer.signTransaction(tx);
    const txHash = await signer.client.sendTransaction(signedTx);

    setResult(
      <div className="overflow-x-scroll">
        <div>Mint token tx: {txHash}</div>
        <code className="whitespace-pre">
          {JSON.stringify(JSON.parse(signedTx.stringify()), null, 2)}
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
