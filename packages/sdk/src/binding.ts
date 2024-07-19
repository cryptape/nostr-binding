import { Cell, CellDep, HexNumber, HexString, Input, Script, WitnessArgs, utils } from '@ckb-lumos/base';
import { bytesToJsonString } from './util';
import { bytes } from '@ckb-lumos/codec';
import { NostrScriptConfig, TESTNET_CONFIGS } from './config';
import { TagName } from './tag';
import { calcEventId, EventToBind, parseSignedEvent } from './event';
import { minimalCellCapacity } from '@ckb-lumos/helpers';
import { RPC } from '@ckb-lumos/rpc';

export class NostrBinding {
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

  isBindingType(type: Script | undefined) {
    if (type == null) return false;
    return type.codeHash === this.scriptConfig.CODE_HASH && type.hashType === this.scriptConfig.HASH_TYPE;
  }

  parseBindingEventFromWitnessArgs(args: WitnessArgs) {
    const outputType = args.outputType;
    if (outputType) {
      const eventBytes = bytes.bytify(outputType);
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

  buildScript(eventId: HexString, ckbGlobalUniqueId: HexString): Script {
    const bindingArgs = `0x${eventId}${ckbGlobalUniqueId}`;
    return {
      codeHash: this.scriptConfig.CODE_HASH,
      hashType: this.scriptConfig.HASH_TYPE,
      args: bindingArgs,
    };
  }

  finalizeEventToBind(ckbGlobalUniqueId: string, event: EventToBind) {
    const tags = event.tags;
    tags.push([TagName.ckbGlobalUniqueId, ckbGlobalUniqueId]);
    const eventId = calcEventId({
      kind: event.kind,
      pubkey: event.pubkey,
      created_at: event.created_at,
      content: event.content,
      tags: tags,
    });
    const finalizedEvent = { ...event, ...{ id: eventId, tags } };
    console.debug('finalizedEventToBind: ', finalizedEvent);
    return finalizedEvent;
  }

  buildBindingCell(eventId: HexString, ckbGlobalUniqueId: HexString, lock: Script) {
    const type = this.buildScript(eventId, ckbGlobalUniqueId);
    const bindingOutput: Cell = {
      cellOutput: {
        capacity: '0x0',
        lock,
        type,
      },
      data: '0x00',
    };
    const capacity = minimalCellCapacity(bindingOutput);
    bindingOutput.cellOutput.capacity = '0x' + capacity.toString(16);
    return bindingOutput;
  }

  buildGlobalUniqueId(inputCell: Cell, index: HexNumber) {
    if (!inputCell.outPoint) throw new Error('input Cell has no outpoint!');

    const input: Input = {
      previousOutput: inputCell.outPoint!,
      since: '0x0',
    };
    const typeId = utils.generateTypeIdScript(input, index).args.slice(2);
    return typeId;
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
}
