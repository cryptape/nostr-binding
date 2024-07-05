# SDK for Nostr binding protocol

## Install

```bash
npm install @nostr-binding/sdk
```

## Usage

```ts
import { NostrBindingSDK, TESTNET_CONFIGS } from '@nostr-binding/sdk';
const sdk = new NostrBindingSDK(TESTNET_CONFIGS);
const nostrPublicKey = '0x45c41f21e1cf715fa6d9ca20b8e002a574db7bb49e96ee89834c66dac5446b7a';
const nostrLockScript = sdk.lock.buildScript(nostrPublicKey);
const ckbAddress = sdk.lock.encodeToCKBAddress(nostrPublicKey);

// signed a nostr-lock input transaction
const signer = async (event: EventToSign) => {
  //...nostr signing event code
  const signedEvent: SignedEvent = //...
  return signedEvent;
};
txSkeleton = await sdk.lock.signTx(txSkeleton, signer);
// witness is auto-filled with signedEvent
```
