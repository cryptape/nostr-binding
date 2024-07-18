import { Script } from '@ckb-lumos/base';
import { ScriptConfig } from '@ckb-lumos/config-manager';

export interface NostrScriptConfig extends ScriptConfig {
  TYPE_SCRIPT?: Script;
}

export interface SDKConfig {
  prefix: 'ckt' | 'ckb';
  rpcUrl: string;
  NOSTR_BINDING: NostrScriptConfig;
  NOSTR_LOCK: NostrScriptConfig;
}

export const TESTNET_CONFIGS: SDKConfig = {
  prefix: 'ckt',
  rpcUrl: 'https://testnet.ckbapp.dev/rpc',
  NOSTR_LOCK: {
    CODE_HASH: '0x6ae5ee0cb887b2df5a9a18137315b9bdc55be8d52637b2de0624092d5f0c91d5',
    HASH_TYPE: 'type',
    TX_HASH: '0xa2a434dcdbe280b9ed75bb7d6c7d68186a842456aba0fc506657dc5ed7c01d68',
    INDEX: '0x0',
    DEP_TYPE: 'code',
    TYPE_SCRIPT: {
      codeHash: '0x00000000000000000000000000000000000000000000000000545950455f4944',
      hashType: 'type',
      args: '0x8dc56c6f35f0c535e23ded1629b1f20535477a1b43e59f14617d11e32c50e0aa',
    },
  },
  NOSTR_BINDING: {
    CODE_HASH: '0x4105801324b70b3a1508ded8958aba66a6faf68cab26f863b4902b50dfb8b9ab',
    HASH_TYPE: 'type',
    TX_HASH: '0x0e3949fa8afbbdf6d4abdda0d12ac1206c8d05dd51ec490b7341586291db85a6',
    INDEX: '0x0',
    DEP_TYPE: 'code',
    TYPE_SCRIPT: {
      codeHash: '0x00000000000000000000000000000000000000000000000000545950455f4944',
      hashType: 'type',
      args: '0x8f8ef331361e061eccf629b30586969340ba6c9fac051bacf2f811369af49f51',
    },
  },
};

export const MAINNET_CONFIGS: SDKConfig = {
  prefix: 'ckt',
  rpcUrl: 'https://mainnet.ckbapp.dev/rpc',
  NOSTR_LOCK: {
    CODE_HASH: '0x641a89ad2f77721b803cd50d01351c1f308444072d5fa20088567196c0574c68',
    HASH_TYPE: 'type',
    TX_HASH: '0x1911208b136957d5f7c1708a8835edfe8ae1d02700d5cb2c3a6aacf4d5906306',
    INDEX: '0x0',
    DEP_TYPE: 'code',
    TYPE_SCRIPT: {
      codeHash: '0x00000000000000000000000000000000000000000000000000545950455f4944',
      hashType: 'type',
      args: '0xfad8cb75eb0bb01718e2336002064568bc05887af107f74ed5dd501829e192f8',
    },
  },
  NOSTR_BINDING: {
    CODE_HASH: '0xb56ea08c4b10b454ed3389bb0e504ecfc57dcfe3089a5030654525a2def2108e',
    HASH_TYPE: 'type',
    TX_HASH: '0xb56ea08c4b10b454ed3389bb0e504ecfc57dcfe3089a5030654525a2def2108',
    INDEX: '0x0',
    DEP_TYPE: 'code',
    TYPE_SCRIPT: {
      codeHash: '0x00000000000000000000000000000000000000000000000000545950455f4944',
      hashType: 'type',
      args: '0x1f2c9ac4a2a340fb13ff7e9b8511a35e448e4db54e42c44c14f358b4de2dc197',
    },
  },
};
