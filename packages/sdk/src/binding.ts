import { BI, Cell, CellDep, HexNumber, HexString, Input, Script, WitnessArgs, helpers, utils } from '@ckb-lumos/lumos';
import { bytesToJsonString } from './util';
import { bytes } from '@ckb-lumos/codec';
import { TESTNET_CONFIGS } from './config';
import { ScriptConfig } from '@ckb-lumos/lumos/config';
import { Event, EventId, Tag, PublicKey, Timestamp, UnsignedEvent } from '@rust-nostr/nostr-sdk';
import { TagName } from './tag';

export interface EventToBind {
  readonly pubkey: string;
  readonly created_at: number;
  readonly kind: number;
  tags: string[][];
  readonly content: string;
}

export class NostrBinding {
  readonly prefix: 'ckt' | 'ckb';
  readonly scriptConfig: ScriptConfig;

  constructor(scriptConfig = TESTNET_CONFIGS.NOSTR_BINDING, prefix: 'ckt' | 'ckb' = 'ckt') {
    this.prefix = prefix;
    this.scriptConfig = scriptConfig;
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
        return Event.fromJson(eventJsonString);
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

  finalizeEventToBind(ckbGlobalUniqueId: string, event: EventToBind): UnsignedEvent {
    const tags = event.tags;
    tags.push([TagName.ckbGlobalUniqueId, ckbGlobalUniqueId]);
    const eventId = new EventId(
      PublicKey.fromHex(event.pubkey),
      Timestamp.fromSecs(event.created_at),
      event.kind,
      tags.map((tag) => Tag.parse(tag)),
      event.content,
    );
    const finalizedEvent = { ...event, ...{ id: eventId.toHex(), tags } };
    console.debug('finalizedEventToBind: ', finalizedEvent);
    return UnsignedEvent.fromJson(JSON.stringify(finalizedEvent));
  }

  buildBindingCell(eventId: HexString, ckbGlobalUniqueId: HexString, lock: Script) {
    const type = this.buildScript(eventId, ckbGlobalUniqueId);
    const bindingOutput: Cell = {
      cellOutput: {
        capacity: BI.from(0).toHexString(),
        lock,
        type,
      },
      data: '0x00',
    };
    const capacity = helpers.minimalCellCapacity(bindingOutput);
    bindingOutput.cellOutput.capacity = BI.from(capacity).toHexString();
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

  buildCellDeps() {
    const cellDeps: CellDep[] = [];
    cellDeps.push({
      outPoint: {
        txHash: this.scriptConfig.TX_HASH,
        index: this.scriptConfig.INDEX,
      },
      depType: this.scriptConfig.DEP_TYPE,
    });
    return cellDeps;
  }
}
