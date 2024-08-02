# A Workshop Book App

This is a simple workshop book app to demonstrate the Nostr binding protocol. Using the `30040` and `30041` events to build [books](https://next.nostrudel.ninja/#/wiki/topic/nkbip-01?pubkey=dd664d5e4016433a8cd69f005ae1480804351789b59de5af06276de65633d319) on the Nostr protocol, the books also become a digital object(NFT) on the CKB blockchain.

Once you have the Book as an on-chain NFT, there are a lot of possibilities around such an asset. You can sell your book just like sell an NFT of course, another way to tokenize the book is to take the book cell to issue fungible tokens with a limited total supply. In that way, a stock-like trading marketplace is created for the book.

Live demo at https://nostr-workshop-book-app.vercel.app

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Targeting on Different CKB Networks

edit `.env` file:

```bash
NEXT_PUBLIC_NETWORK=devnet # devnet, testnet or mainnet
```
