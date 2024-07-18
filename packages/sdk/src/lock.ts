import { NostrScriptConfig, TESTNET_CONFIGS } from './config';
import { TagName } from './tag';
import { bytesToJsonString, getTimestampNowSecs, jsonStringToBytes } from './util';
import { CellDep, HexString, utils, WitnessArgs, Script, blockchain, Transaction } from '@ckb-lumos/base';
import { bytes, number } from '@ckb-lumos/codec';
import { EventToSign, parseSignedEvent, SignedEvent } from './event';
import { RPC } from '@ckb-lumos/rpc';
import { encodeToAddress, parseAddress } from '@ckb-lumos/helpers';

const { Uint64 } = number;

export class NostrLock {
  readonly kind = 23334;
  readonly content =
    'Signing a CKB transaction\n\nIMPORTANT: Please verify the integrity and authenticity of connected Nostr client before signing this message\n';
  readonly dummyCkbSigHashAll = '0x' + '00'.repeat(32);

  readonly prefix: 'ckt' | 'ckb';
  readonly scriptConfig: NostrScriptConfig;
  rpc: RPC;

  constructor(
    scriptConfig = TESTNET_CONFIGS.NOSTR_LOCK,
    prefix: 'ckt' | 'ckb' = 'ckt',
    rpcUrl = TESTNET_CONFIGS.rpcUrl,
  ) {
    this.prefix = prefix;
    this.scriptConfig = scriptConfig;
    this.rpc = new RPC(rpcUrl);
  }

  isNostrLock(lock: Script | undefined) {
    if (lock == null) return false;
    return lock.codeHash === this.scriptConfig.CODE_HASH && lock.hashType === this.scriptConfig.HASH_TYPE;
  }

  parseUnlockEventFromWitnessArgs(args: WitnessArgs) {
    const lock = args.lock;
    if (lock) {
      const eventBytes = bytes.bytify(lock);
      const eventJsonString = bytesToJsonString(eventBytes);
      try {
        return parseSignedEvent(eventJsonString);
      } catch (error: unknown) {
        console.debug(error);
        return null;
      }
    }
    return null;
  }

  // 20 bytes of pubkey hash
  buildPubkeyHash(ownerPubkey: HexString) {
    const hasher = new utils.CKBHasher();
    hasher.update(bytes.bytify(ownerPubkey));
    return hasher.digestHex().slice(0, 42);
  }

  buildPubkeyScriptArgs(ownerPubkey: HexString) {
    const pubkeyHash = this.buildPubkeyHash(ownerPubkey);
    const lockArgs = '0x00' + pubkeyHash.slice(2);
    return lockArgs;
  }

  buildPowScriptArgs(pow: number) {
    if (pow > 255) {
      throw new Error('max pow value is 255');
    }

    const dummyPubkeyHash = '00'.repeat(20);
    const lockArgs = '0x' + pow.toString(16) + dummyPubkeyHash;
    return lockArgs;
  }

  buildScript(ownerPubkey: HexString) {
    const lockArgs = this.buildPubkeyScriptArgs(ownerPubkey);
    return {
      codeHash: this.scriptConfig.CODE_HASH,
      hashType: this.scriptConfig.HASH_TYPE,
      args: lockArgs,
    };
  }

  // PowLockScript only checks if the witness event is matching specific difficulties instead of a pubkey hash
  buildPowScript(pow: number) {
    const lockArgs = this.buildPowScriptArgs(pow);
    return {
      codeHash: this.scriptConfig.CODE_HASH,
      hashType: this.scriptConfig.HASH_TYPE,
      args: lockArgs,
    };
  }

  encodeToCKBAddress(ownerPubkey: HexString) {
    const lockScript = this.buildScript(ownerPubkey);
    const address = encodeToAddress(lockScript, { config: { PREFIX: this.prefix, SCRIPTS: {} } });
    return address;
  }

  parseCBKAddressToNostrPubkeyHash(ckbAddress: string) {
    const script = parseAddress(ckbAddress, { config: { PREFIX: this.prefix, SCRIPTS: {} } });
    if (script.codeHash !== this.scriptConfig.CODE_HASH || script.hashType !== this.scriptConfig.HASH_TYPE) {
      throw new Error('nostr-lock contract script info not match!');
    }

    // 20 bytes hash
    return script.args.slice(4);
  }

  async buildCellDeps() {
    if (this.scriptConfig.HASH_TYPE === 'type' && this.scriptConfig.TYPE_SCRIPT) {
      // fetch newest info for type script
      const cells = await this.rpc.getCells(
        { script: this.scriptConfig.TYPE_SCRIPT, scriptType: 'type' },
        'desc',
        BigInt(1),
      );
      if (cells.objects.length === 0) throw new Error('cells not found');

      const cell = cells.objects[0];
      const cellDeps: CellDep[] = [
        {
          outPoint: {
            txHash: cell.outPoint.txHash,
            index: cell.outPoint.index,
          },
          depType: this.scriptConfig.DEP_TYPE,
        },
      ];
      return cellDeps;
    }

    const cellDeps: CellDep[] = [
      {
        outPoint: {
          txHash: this.scriptConfig.TX_HASH,
          index: this.scriptConfig.INDEX,
        },
        depType: this.scriptConfig.DEP_TYPE,
      },
    ];
    return cellDeps;
  }

  // signTx will overwrite the witness lock with dummyLock and then generate sigHashAll,
  // sign it and return signed transaction. It is a easy way to do nostr lock signing if
  // transaction fee estimation is not a problem to you
  async signTx(transaction: Transaction, signer: (_event: EventToSign) => Promise<SignedEvent>) {
    const lockIndexes: Array<number> = await this.getLockIndexes(transaction);

    if (lockIndexes.length === 0) {
      throw new Error('there is no nostr lock input.');
    }

    const witnessIndex = lockIndexes[0];
    while (witnessIndex >= transaction.witnesses.length) {
      transaction.witnesses.push('0x');
    }

    let witness: string = transaction.witnesses[witnessIndex]!;
    witness = this.fillInDummyLockWitness(witness);
    transaction.witnesses[witnessIndex] = witness;
    const sigHashAll = this.buildSigHashAll(transaction, lockIndexes);
    console.debug('sighash_all = ', sigHashAll);

    const event = this.buildUnlockEvent(sigHashAll);

    const signedEvent = await signer(event);
    const eventJson = jsonStringToBytes(JSON.stringify(signedEvent));
    console.debug('eventJson.byteLength: ', eventJson.byteLength, signedEvent);

    // put signed event into witness
    {
      let witness: string = transaction.witnesses[witnessIndex]!;
      if (witness !== '0x') {
        const witnessArgs = blockchain.WitnessArgs.unpack(bytes.bytify(witness));
        witnessArgs.lock = bytes.hexify(eventJson);
        witness = bytes.hexify(blockchain.WitnessArgs.pack(witnessArgs));
        transaction.witnesses[witnessIndex] = witness;
      }
    }

    return transaction;
  }

  // signPreparedTx will checks if the transaction is placed with correct Nostr-lock dummyLock
  // and then directly generate sigHashAll from the giving transaction, sign it and return
  // signed transaction. You need to call prepareTx before this function.
  async signPreparedTx(
    transaction: Transaction,
    lockIndexes: Array<number>,
    signer: (_event: EventToSign) => Promise<SignedEvent>,
  ) {
    if (lockIndexes.length === 0) {
      throw new Error('there is no nostr lock input.');
    }

    const witnessIndex = lockIndexes[0];
    // check if witness placeholder is correct
    {
      const witness = transaction.witnesses[witnessIndex];
      if (witness == null) {
        throw new Error('Lock field in first witness is not set!');
      }
      const witnessArgs = blockchain.WitnessArgs.unpack(bytes.bytify(witness));
      const lock = witnessArgs.lock;
      if (lock && !bytes.equal(lock, this.buildDummyLock())) {
        throw new Error('Lock field in first witness is a invalid dummy lock!');
      }
    }

    const sigHashAll = this.buildSigHashAll(transaction, lockIndexes);
    console.debug('sighash_all = ', sigHashAll);

    const event = this.buildUnlockEvent(sigHashAll);

    const signedEvent = await signer(event);
    const eventJson = jsonStringToBytes(JSON.stringify(signedEvent));
    console.debug('eventJson.byteLength: ', eventJson.byteLength, signedEvent);

    // put signed event into witness
    {
      let witness: string = transaction.witnesses[witnessIndex]!;
      if (witness !== '0x') {
        const witnessArgs = blockchain.WitnessArgs.unpack(bytes.bytify(witness));
        witnessArgs.lock = bytes.hexify(eventJson);
        witness = bytes.hexify(blockchain.WitnessArgs.pack(witnessArgs));
        transaction.witnesses[witnessIndex] = witness;
      }
    }

    return transaction;
  }

  // fill-in the witness of nostr-lock with corresponding dummyLock
  async prepareTx(transaction: Transaction) {
    const lockIndexes: Array<number> = await this.getLockIndexes(transaction);

    if (lockIndexes.length === 0) {
      throw new Error('there is no nostr lock input.');
    }

    const witnessIndex = lockIndexes[0];
    while (witnessIndex >= transaction.witnesses.length) {
      transaction.witnesses.push('0x');
    }

    let witness: string = transaction.witnesses[witnessIndex]!;
    witness = this.fillInDummyLockWitness(witness);
    transaction.witnesses[witnessIndex] = witness;

    return { transaction, lockIndexes };
  }

  // get live cell of the tx's input and see if there is nostr-lock input
  async getLockIndexes(transaction: Transaction) {
    const lockIndexes: Array<number> = [];

    const inputCellsPromises = transaction.inputs.map(async (cell, index) => {
      const inputCell = await this.rpc.getLiveCell(cell.previousOutput, false);
      if (inputCell.status !== 'live') {
        throw new Error(`input cell is not live, outpoint: ${JSON.stringify(cell.previousOutput, null, 2)}`);
      }
      return { inputCell, index };
    });
    const inputCells = await Promise.all(inputCellsPromises);

    for (const { inputCell, index } of inputCells) {
      if (this.isNostrLock(inputCell.cell!.output.lock)) {
        lockIndexes.push(index);
      }
    }

    return lockIndexes;
  }

  buildSigHashAll(tx: Transaction, lockIndexes: Array<number>): HexString {
    const txHash = utils.ckbHash(blockchain.RawTransaction.pack(tx));
    const inputs = tx.inputs;
    const witness = tx.witnesses[lockIndexes[0]];
    if (witness == null) throw new Error('not get lock index!');

    let count = 0;

    const hasher = new utils.CKBHasher();
    hasher.update(txHash);
    count += 32;

    const witnessLength = bytes.bytify(witness).byteLength;
    hasher.update(bytes.hexify(Uint64.pack(witnessLength)));
    count += 8;
    hasher.update(witness);
    count += witnessLength;

    // group
    if (lockIndexes.length > 1) {
      for (let i = 1; i < lockIndexes.length; i++) {
        const witness = tx.witnesses[lockIndexes[i]];
        if (witness == null) throw new Error('not get lock index!');
        const witnessLength = bytes.bytify(witness).byteLength;
        hasher.update(bytes.hexify(Uint64.pack(witnessLength)));
        count += 8;
        hasher.update(witness);
        count += witnessLength;
      }
    }

    const witnessSize = tx.witnesses.length;

    if (inputs.length < witnessSize) {
      for (let j = inputs.length; j < witnessSize; j++) {
        const witness = tx.witnesses[j];
        if (witness == null) throw new Error('not get lock index!');
        const witnessLength = bytes.bytify(witness).byteLength;
        hasher.update(bytes.hexify(Uint64.pack(witnessLength)));
        count += 8;
        hasher.update(witness);
        count += witnessLength;
      }
    }

    const message = hasher.digestHex();
    console.debug(`Hashed ${count} bytes in sighash_all: `, message);
    return message;
  }

  fillInDummyLockWitness(witness: string) {
    const newWitnessArgs: WitnessArgs = {
      lock: this.buildDummyLock(),
    };

    if (witness !== '0x') {
      const witnessArgs = blockchain.WitnessArgs.unpack(bytes.bytify(witness));
      const inputType = witnessArgs.inputType;
      if (inputType) {
        newWitnessArgs.inputType = inputType;
      }
      const outputType = witnessArgs.outputType;
      if (outputType) {
        newWitnessArgs.outputType = outputType;
      }
    }
    return bytes.hexify(blockchain.WitnessArgs.pack(newWitnessArgs));
  }

  buildDummyLock() {
    const dummyEvent = this.buildDummyEvent();
    const dummyLength = jsonStringToBytes(dummyEvent).length;
    console.debug('dummyEvent and length: ', dummyEvent, dummyLength);

    const dummyLock = '0x' + '00'.repeat(dummyLength);
    return dummyLock;
  }

  buildDummyEvent() {
    const tags = [[TagName.ckbSigHashAll, this.dummyCkbSigHashAll.slice(2)]];
    const event = {
      id: '00'.repeat(32),
      pubkey: '00'.repeat(32),
      tags,
      created_at: getTimestampNowSecs(),
      kind: this.kind,
      content: this.content,
      sig: '00'.repeat(64),
    };

    return JSON.stringify(event);
  }

  buildUnlockEvent(ckbSigHashAll: HexString): EventToSign {
    const unlockEvent: EventToSign = {
      tags: [[TagName.ckbSigHashAll, ckbSigHashAll.slice(2)]],
      created_at: getTimestampNowSecs(),
      kind: this.kind,
      content: this.content,
    };
    return unlockEvent;
  }
}
