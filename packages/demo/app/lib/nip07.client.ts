import {
  nostr,
  getConnectedPubkey,
  UnsignedEvent as JoyUnsignedEvent,
} from "@joyid/nostr";
import { Event, Nip07Signer, PublicKey } from "@rust-nostr/nostr-sdk";

export class joyIdNip07Signer extends Nip07Signer {
  constructor() {
    // @ts-expect-error inject nostr instance on windows from JoyId
    window.nostr = {
      async getPublicKey(): Promise<string> {
        const connectedPubkeyStr = await getConnectedPubkey();
        console.debug("connectedPubkeyStr: ", connectedPubkeyStr);
        if (connectedPubkeyStr) {
          return connectedPubkeyStr;
        }

        return await nostr.getPublicKey(false);
      },

      async signEvent(unsigned: JoyUnsignedEvent) {
        return await nostr.signEvent(unsigned);
      },
    };
    super();
  }

  free(): void {
    throw new Error("Method not implemented.");
  }

  async getPublicKey(): Promise<PublicKey> {
    const connectedPubkeyStr = await getConnectedPubkey();
    console.debug("connectedPubkeyStr: ", connectedPubkeyStr);
    if (connectedPubkeyStr) {
      return PublicKey.fromHex(connectedPubkeyStr);
    }

    const pubkeyStr = await nostr.getPublicKey(false);
    return PublicKey.fromHex(pubkeyStr);
  }

  async signEvent(unsigned: UnsignedEvent): Promise<Event> {
    const e = await nostr.signEvent(JSON.parse(unsigned.asJson()));
    return Event.fromJson(JSON.stringify(e));
  }

  nip04Encrypt(_publicKey: PublicKey, _plaintext: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
  nip04Decrypt(_publicKey: PublicKey, _ciphertext: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
  nip44Encrypt(_publicKey: PublicKey, _plaintext: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
  nip44Decrypt(_publicKey: PublicKey, _ciphertext: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
}
