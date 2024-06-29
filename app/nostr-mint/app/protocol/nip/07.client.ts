import { nostr } from "@joyid/nostr";
import {
  Event,
  Nip07Signer,
  PublicKey,
  UnsignedEvent,
} from "@rust-nostr/nostr-sdk";

export class joyIdNip07Signer extends Nip07Signer {
  constructor() {
    // @ts-ignore
    window.nostr = nostr;
    super();
  }

  free(): void {
    throw new Error("Method not implemented.");
  }

  async getPublicKey(): Promise<PublicKey> {
    const pubkeyStr = await nostr.getPublicKey();
    return PublicKey.fromHex(pubkeyStr);
  }

  async signEvent(unsigned: UnsignedEvent): Promise<Event> {
    const e = await nostr.signEvent(JSON.parse(unsigned.asJson()));
    return Event.fromJson(JSON.stringify(e));
  }

  nip04Encrypt(public_key: PublicKey, plaintext: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
  nip04Decrypt(public_key: PublicKey, ciphertext: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
  nip44Encrypt(public_key: PublicKey, plaintext: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
  nip44Decrypt(public_key: PublicKey, ciphertext: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
}
