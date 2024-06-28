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
      <div className="flex py-2">
      <ConnectNostr />
      </div>

      <ul>
        <li>
          <MintButton setAssetEvent={setAssetEvent} setResult={setResult} />
          <UnlockButton assetEvent={assetEvent} setResult={setResult} />
        </li>
        <li>
          <AssetButton assetEvent={assetEvent} setResult={setResult} />
        </li>
      </ul>
      <hr />
      <div className="mt-10 overflow-x-scroll">{result}</div>
    </div>
  );
}
