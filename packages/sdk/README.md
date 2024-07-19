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

//**** Signed a nostr-lock input transaction ****//

// construct a nostr signer first
const signer = async (event: EventToSign) => {
  //...nostr signing event code
  const signedEvent: SignedEvent = //...
  return signedEvent;
};
// sdk.lock.signTx will overwrite the witness lock with dummyLock and then generate sigHashAll,
// sign it and return signed transaction. It is a easy way to do nostr lock signing if
// transaction fee estimation is not a problem to you. After calling this function, witness
// is auto-filled with signedEvent.
tx = await sdk.lock.signTx(tx, signer);

// or prepare your transaction first
import { createTransactionFromSkeleton } from "@ckb-lumos/lumos/helpers";
const tx = createTransactionFromSkeleton(txSkeleton);
// fill-in the witness of nostr-lock with corresponding dummyLock
const {transaction, lockIndexes} = await sdk.lock.prepareTx(transaction: Transaction);
// sdk.lock.signPreparedTx will checks if the transaction is placed with correct Nostr-lock dummyLock
// and then directly generate sigHashAll from the giving transaction, sign it and return
// signed transaction. You need to call prepareTx before this function.
const signedTx = await sdk.lock.signPreparedTx(transaction, lockIndexes, signer);


//**** Get Nostr Scripts CellDeps ****//
const lockCellDeps = await sdk.lock.buildCellDeps();
const bindingCellDeps = await sdk.binding.buildCellDeps();
```
