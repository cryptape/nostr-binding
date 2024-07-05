/**
 * By default, Remix will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.client
 */

import { RemixBrowser } from "@remix-run/react";
import { loadWasmSync } from "@rust-nostr/nostr-sdk";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { initConfig } from "@joyid/nostr";
import { readEnvNetwork } from "offckb.config";

startTransition(() => {
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

  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>,
  );
});
