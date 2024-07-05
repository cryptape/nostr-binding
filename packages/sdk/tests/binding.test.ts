import { NostrBindingSDK, TESTNET_CONFIGS } from '../src/index';

describe('Nostr Binding', () => {
  test('Build Type Script', () => {
    const sdk = new NostrBindingSDK(TESTNET_CONFIGS);
    const eventId = '0xadd6ba499ba1db706bc14a3bf180b26e44b641b3f657d92e5c35d18a3a219093';
    const ckbGlobalUniqueId = '0xadd6ba499ba1db706bc14a3bf180b26e44b641b3f657d92e5c35d18a3a219093';
    const nostrBindingScript = sdk.binding.buildScript(eventId, ckbGlobalUniqueId);
    expect(sdk.binding.isBindingType(nostrBindingScript)).toBe(true);
  });
});
