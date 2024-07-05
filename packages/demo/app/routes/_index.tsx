import type { MetaFunction } from "@remix-run/node";
import { Event } from "@rust-nostr/nostr-sdk";
import { ReactNode, useState } from "react";
import { AssetButton } from "~/conmponents/asset-button";
import { ConnectNostr } from "~/conmponents/connect-nostr";
import { MintButton } from "~/conmponents/mint-button";
import { UnlockButton } from "~/conmponents/unlock-button";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  const [result, setResult] = useState<ReactNode | string>();
  const [assetEvent, setAssetEvent] = useState<Event>();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <div className="text-4xl font-bold my-6">Nostr Binding Protocol Demo</div>
      <div className="text-sm text-gray-400 my-4">
        Checkout source code on{" "}
        <a
          href="https://github.com/cryptape/nostr-binding"
          target="_blank"
          rel="noreferrer"
          className="text-purple-500 hover:text-purple-700 underline hover:no-underline"
        >
          Github
        </a>
      </div>
      <div className="flex py-2">
        <ConnectNostr />
      </div>

      <div className="flex gap-4">
        <MintButton setAssetEvent={setAssetEvent} setResult={setResult} />
        {assetEvent && (
          <UnlockButton assetEvent={assetEvent} setResult={setResult} />
        )}

        <AssetButton setResult={setResult} />
      </div>

      <hr />
      <div className="mt-10 overflow-x-scroll">{result}</div>
    </div>
  );
}
