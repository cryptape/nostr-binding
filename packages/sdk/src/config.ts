import { ScriptConfig } from '@ckb-lumos/lumos/config';

export interface NostrBindingConfig {
  prefix: 'ckt' | 'ckb';
  NOSTR_BINDING: ScriptConfig;
  NOSTR_LOCK: ScriptConfig;
}

export const TESTNET_CONFIGS: NostrBindingConfig = {
  prefix: 'ckt',
  NOSTR_LOCK: {
    CODE_HASH: '0x6ae5ee0cb887b2df5a9a18137315b9bdc55be8d52637b2de0624092d5f0c91d5',
    HASH_TYPE: 'type',
    TX_HASH: '0xa2a434dcdbe280b9ed75bb7d6c7d68186a842456aba0fc506657dc5ed7c01d68',
    INDEX: '0x0',
    DEP_TYPE: 'code',
  },
  NOSTR_BINDING: {
    CODE_HASH: '0x4105801324b70b3a1508ded8958aba66a6faf68cab26f863b4902b50dfb8b9ab',
    HASH_TYPE: 'type',
    TX_HASH: '0x0e3949fa8afbbdf6d4abdda0d12ac1206c8d05dd51ec490b7341586291db85a6',
    INDEX: '0x0',
    DEP_TYPE: 'code',
  },
};

/**
// todo: update
export const MAINNET_CONFIGS: NostrBindingConfig = {
  prefix: 'ckt',
  NOSTR_LOCK: {
    CODE_HASH: '0x0a82c98ccd9fe5d1d8e07789664b3bd5f6c9e79885846b2e718f5954edb4776a',
    HASH_TYPE: 'type',
    TX_HASH: '0xac9071e7a25564c1bfab7884885547e1d9fd5505b5653adcaf2bf77f926fd6e3',
    INDEX: '0x0',
    DEP_TYPE: 'code',
  },
  NOSTR_BINDING: {
    CODE_HASH: '0x09f2f1ceef2d59a368dc0b2be38494c8e11b0ec459f62cf7db74a645fbeabeee',
    HASH_TYPE: 'type',
    TX_HASH: '0x6be8a9b73326a9694f12d6670c74535463b3a508038cd5ddaa4ba7450fcad305',
    INDEX: '0x0',
    DEP_TYPE: 'code',
  },
};
 */
