import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

export interface EventToSign {
  readonly created_at: number;
  readonly kind: number;
  readonly tags: string[][];
  readonly content: string;
}

export interface EventToBind {
  readonly pubkey: string;
  readonly created_at: number;
  readonly kind: number;
  tags: string[][];
  readonly content: string;
}

export interface SignedEvent {
  readonly id: string;
  readonly pubkey: string;
  readonly created_at: number;
  readonly kind: number;
  readonly tags: string[][];
  readonly content: string;
  readonly sig: string;
}

export type PreFinalizedEvent = Omit<SignedEvent, 'sig' | 'id'>;

export function isValidSignedEvent(obj: any): obj is SignedEvent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.pubkey === 'string' &&
    typeof obj.created_at === 'number' &&
    typeof obj.kind === 'number' &&
    Array.isArray(obj.tags) &&
    obj.tags.every((tag: any) => Array.isArray(tag) && tag.every((t: any) => typeof t === 'string')) &&
    typeof obj.content === 'string' &&
    typeof obj.sig === 'string'
  );
}

export function isValidPreFinalizedEvent(obj: any): obj is PreFinalizedEvent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.pubkey === 'string' &&
    typeof obj.created_at === 'number' &&
    typeof obj.kind === 'number' &&
    Array.isArray(obj.tags) &&
    obj.tags.every((tag: any) => Array.isArray(tag) && tag.every((t: any) => typeof t === 'string')) &&
    typeof obj.content === 'string'
  );
}

export function parseSignedEvent(jsonString: string): SignedEvent | null {
  try {
    const obj = JSON.parse(jsonString);
    if (isValidSignedEvent(obj)) {
      return obj;
    } else {
      console.error('Invalid SignedEvent format');
      return null;
    }
  } catch (e) {
    console.error('Invalid JSON string', e);
    return null;
  }
}

export function serializeEvent(event: PreFinalizedEvent): string {
  if (!isValidPreFinalizedEvent(event)) throw new Error('invalid event');
  return JSON.stringify([0, event.pubkey, event.created_at, event.kind, event.tags, event.content]);
}

export function calcEventId(event: PreFinalizedEvent): string {
  const utf8Encoder = new TextEncoder();
  const eventHash = sha256(utf8Encoder.encode(serializeEvent(event)));
  return bytesToHex(eventHash);
}
