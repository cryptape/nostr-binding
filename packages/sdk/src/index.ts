import { loadWasmSync } from '@rust-nostr/nostr-sdk';
import { NostrBinding } from './binding';
import { NostrLock } from './lock';
import { NostrBindingConfig } from './config';

export * from './lock';
export * from './binding';
export * from './config';
export * from './signer';
export * from './tag';
export * from './util';

export function init() {
  loadWasmSync();
}

export class NostrBindingSDK {
  binding: NostrBinding;
  lock: NostrLock;

  constructor(config?: NostrBindingConfig) {
    init();

    if (config) {
      this.binding = new NostrBinding(config.NOSTR_BINDING, config.prefix);
      this.lock = new NostrLock(config.NOSTR_LOCK, config.prefix);
    } else {
      this.binding = new NostrBinding();
      this.lock = new NostrLock();
    }
  }
}
