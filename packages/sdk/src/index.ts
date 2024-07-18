import { NostrBinding } from './binding';
import { NostrLock } from './lock';
import { SDKConfig } from './config';

export * from './lock';
export * from './binding';
export * from './config';
export * from './tag';
export * from './util';
export * from './event';

export class NostrBindingSDK {
  binding: NostrBinding;
  lock: NostrLock;

  constructor(config?: SDKConfig) {
    if (config) {
      this.binding = new NostrBinding(config.NOSTR_BINDING, config.prefix);
      this.lock = new NostrLock(config.NOSTR_LOCK, config.prefix);
    } else {
      this.binding = new NostrBinding();
      this.lock = new NostrLock();
    }
  }
}
