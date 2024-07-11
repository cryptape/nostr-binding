import { NostrBindingSDK, TESTNET_CONFIGS } from '../src/index';
import { blockchain } from '@ckb-lumos/base';
import { bytes } from '@ckb-lumos/codec';
import { Transaction, WitnessArgs } from '@ckb-lumos/base';

describe('Nostr Lock', () => {
  test('Build Lock Script', () => {
    const sdk = new NostrBindingSDK(TESTNET_CONFIGS);
    const nostrPublicKey = '0xadd6ba499ba1db706bc14a3bf180b26e44b641b3f657d92e5c35d18a3a219093';
    const nostrLockScript = sdk.lock.buildScript(nostrPublicKey);
    expect(sdk.lock.isNostrLock(nostrLockScript)).toBe(true);
  });

  test('Build CKB Address', () => {
    const sdk = new NostrBindingSDK(TESTNET_CONFIGS);
    const nostrPublicKey = '0x45c41f21e1cf715fa6d9ca20b8e002a574db7bb49e96ee89834c66dac5446b7a';
    const ckbAddress = sdk.lock.encodeToCKBAddress(nostrPublicKey);
    expect(ckbAddress).toEqual(
      'ckt1qp4wtmsvhzrm9h66ngvpxuc4hx7u2klg65nr0vk7qcjqjt2lpjga2qgqszfcwyycsu3g4dj4qyuwyedz8fru3w5m56t770',
    );
  });

  test('Parse CKB Address', () => {
    const sdk = new NostrBindingSDK(TESTNET_CONFIGS);
    const ckbAddress =
      'ckt1qp4wtmsvhzrm9h66ngvpxuc4hx7u2klg65nr0vk7qcjqjt2lpjga2qgqszfcwyycsu3g4dj4qyuwyedz8fru3w5m56t770';
    const nostrPublicKey = '0x45c41f21e1cf715fa6d9ca20b8e002a574db7bb49e96ee89834c66dac5446b7a';
    const pubkeyHash = sdk.lock.parseCBKAddressToNostrPubkeyHash(ckbAddress);
    expect(pubkeyHash).toEqual(sdk.lock.buildPubkeyScriptArgs(nostrPublicKey).slice(4));
  });

  test('Parse WitnessArgs', () => {
    const sdk = new NostrBindingSDK(TESTNET_CONFIGS);
    const witness =
      '0x6a0400001000000050020000500200003c0200007b226964223a2236613263313866666661353338643432313234323937396435373037303564316464336266626435613766623535353937336465386139303633363936663333222c227075626b6579223a2234356334316632316531636637313566613664396361323062386530303261353734646237626234396539366565383938333463363664616335343436623761222c22637265617465645f6174223a313731393538373834312c226b696e64223a32333333342c2274616773223a5b5b22636b625f736967686173685f616c6c222c2262383539333861323430643264323134333536613536666134393666646362323262613733373464313163346166326462373939393562343864356631386364225d5d2c22636f6e74656e74223a225369676e696e67206120434b42207472616e73616374696f6e5c6e5c6e494d504f5254414e543a20506c65617365207665726966792074686520696e7465677269747920616e642061757468656e746963697479206f6620636f6e6e6563746564204e6f73747220636c69656e74206265666f7265207369676e696e672074686973206d6573736167655c6e222c22736967223a223634616566646631653765313831656432626630343435666362313336363038613139666238383961613061666165333165356336333264343539356166396531303337613461646561383138363630633165663262636630666462643637663331303064636338383731376634313838643734356632303436343761656530227d160200007b226964223a2230303263393862306433353164366263366666643231323430396232333865643963303631303630323265303431633335316661343332366266643133316663222c227075626b6579223a2234356334316632316531636637313566613664396361323062386530303261353734646237626234396539366565383938333463363664616335343436623761222c22637265617465645f6174223a313731393538373833382c226b696e64223a312c2274616773223a5b5b22636b625f676c6f62616c5f756e697175655f6964222c2238316130356563393033653866613230333932653766633138313566653036633137643135346532393066623562333339646232336562336531373164376431225d2c5b226e6f6e6365222c2231303435222c223130225d5d2c22636f6e74656e74223a22546869732069732061206b696e642d312073686f7274206e6f74652c20697420697320616c736f2061204e6f6e2046756e6769626c6520546f6b656e206f6e20434b4220626c6f636b636861696e2e222c22736967223a223762343130363766613031333230316139376137366335656338313861343638636439633332323133346362613432363832313837383430656334373933323935633965356463373932623231306439326438643236316137666362383063653535376434303231663535343966626638313462646165343439303137663865227d';
    const witnessArgs = blockchain.WitnessArgs.unpack(bytes.bytify(witness));
    const event = sdk.lock.parseUnlockEventFromWitnessArgs(witnessArgs);
    expect(event?.id).toBe('6a2c18fffa538d421242979d570705d1dd3bfbd5a7fb555973de8a9063696f33');
  });

  test('Build 2-inputs SighashAll', () => {
    const sdk = new NostrBindingSDK(TESTNET_CONFIGS);
    const dummyLock = '0x' + '00'.repeat(572);
    const newWitnessArgs: WitnessArgs = {
      lock: dummyLock,
    };
    const tx: Transaction = {
      version: '0x0',
      cellDeps: [
        {
          outPoint: {
            txHash: '0xbf6fb538763efec2a70a6a3dcb7242787087e1030c4e7d86585bc63a9d337f5f',
            index: '0x0',
          },
          depType: 'code',
        },
        {
          outPoint: {
            txHash: '0xa2a434dcdbe280b9ed75bb7d6c7d68186a842456aba0fc506657dc5ed7c01d68',
            index: '0x0',
          },
          depType: 'code',
        },
      ],
      headerDeps: [],
      inputs: [
        {
          previousOutput: {
            txHash: '0xf6cd8c036f0924f89a4ba9ed4e8bdd20ef356fd5ef014994214f041c0625a975',
            index: '0x0',
          },
          since: '0x0',
        },
        {
          previousOutput: {
            txHash: '0x1f1da9a4c6cc17fb7a9a238ab4b783ca428293b1d28fe384097dd52a35283136',
            index: '0x1',
          },
          since: '0x0',
        },
      ],
      outputs: [
        {
          lock: {
            codeHash: '0x6ae5ee0cb887b2df5a9a18137315b9bdc55be8d52637b2de0624092d5f0c91d5',
            hashType: 'type',
            args: '0x003f4ce62974e70f74e98ecc59f0c2f00067cb8879',
          },
          type: {
            codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
            hashType: 'type',
            args: '0x8cb223d3e2a07e60179bc9e95106b0a99c4bd859c2902338714dd736474dffe9',
          },
          capacity: '0x35458af00',
        },
        {
          lock: {
            codeHash: '0x6ae5ee0cb887b2df5a9a18137315b9bdc55be8d52637b2de0624092d5f0c91d5',
            hashType: 'type',
            args: '0x004f1ae79592b8a82df8d1ef93361160966d718015',
          },
          type: {
            codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
            hashType: 'type',
            args: '0x8cb223d3e2a07e60179bc9e95106b0a99c4bd859c2902338714dd736474dffe9',
          },
          capacity: '0x35458af00',
        },
        {
          lock: {
            codeHash: '0x6ae5ee0cb887b2df5a9a18137315b9bdc55be8d52637b2de0624092d5f0c91d5',
            hashType: 'type',
            args: '0x004f1ae79592b8a82df8d1ef93361160966d718015',
          },
          capacity: '0xd9dc10d6b4',
        },
      ],
      outputsData: ['0x20a10700000000000000000000000000', '0x20a10700000000000000000000000000', '0x'],
      witnesses: [bytes.hexify(blockchain.WitnessArgs.pack(newWitnessArgs)), '0x'],
    };
    const sigHashAll = sdk.lock.buildSigHashAll(tx, [0, 1]).slice(2);
    expect(sigHashAll).toBe('abbd1be2fe6b710eeeec8aa6c84930d4eeb8680698840f95f8c58c4a40ad40db');
  });
});
