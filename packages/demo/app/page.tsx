"use client";

import offckb, { readEnvNetwork } from "@/offckb.config";
import { initConfig } from "@joyid/nostr";
import { loadWasmSync, Event, NostrSigner } from "@rust-nostr/nostr-sdk";
import { ReactNode, useState } from "react";
import { ConnectNostr } from "./conmponents/connect-nostr";
import { MintButton } from "./conmponents/mint-button";
import { UnlockButton } from "./conmponents/unlock-button";
import { AssetButton } from "./conmponents/asset-button";
import { CKBSigner, SingerContext } from "./context/signer";

offckb.initializeLumosConfig();

// init wasm nostr sdk
loadWasmSync();

// init joyId
const network = readEnvNetwork();
if (network !== "devnet") {
  // joyId is not available in devnet
  const joyidAppURL =
    network === "testnet"
      ? "https://testnet.joyid.dev"
      : "https://mainnet.joyid.dev";
  initConfig({
    name: "Nostr Binding",
    logo: "https://fav.farm/🆔",
    joyidAppURL,
  });
}

export default function Home() {
  const [nostrSigner, setNostrSigner] = useState<NostrSigner | null>(null);
  const [ckbSigner, setCKBSigner] = useState<CKBSigner | null>(null);

  const value = { nostrSigner, setNostrSigner, ckbSigner, setCKBSigner };

  const [result, setResult] = useState<ReactNode | string>();
  const [assetEvent, setAssetEvent] = useState<Event>();

  return (
    <SingerContext.Provider value={value}>
      <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
        <div className="text-4xl font-bold my-6">
          Nostr Binding Protocol Demo
        </div>
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
    </SingerContext.Provider>
  );
}
