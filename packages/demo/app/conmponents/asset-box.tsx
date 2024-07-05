import { Cell } from "@ckb-lumos/lumos";
import { blockchain } from "@ckb-lumos/base";
import { bytes } from "@ckb-lumos/codec";
import { getWitnessByOutpoint } from "~/lib/ckb.client";
import { useEffect, useState } from "react";
import { Event } from "@rust-nostr/nostr-sdk";
import ExpandableDiv from "./expandable";
import { sdk } from "~/lib/sdk.client";

export interface AssetBoxProp {
  cell: Cell;
}
export const AssetBox: React.FC<AssetBoxProp> = ({ cell }) => {
  const [event, setEvent] = useState<Event | null | undefined>();

  const getBindingEvent = async (cell: Cell) => {
    const outpoint = cell.outPoint;
    if (outpoint && sdk.binding.isBindingType(cell.cellOutput.type)) {
      const witness = await getWitnessByOutpoint(outpoint);
      if (witness) {
        const witnessArgs = blockchain.WitnessArgs.unpack(
          bytes.bytify(witness),
        );
        const event = sdk.binding.parseBindingEventFromWitnessArgs(witnessArgs);
        return event;
      }
    }
    return null;
  };

  useEffect(() => {
    getBindingEvent(cell).then((event) => setEvent(event));
  }, [cell]);

  return (
    <div>
      {
        <div className="border text-center py-2 px-4 rounded w-full">
          <div>
            {(BigInt(cell.cellOutput.capacity) / 100000000n).toString()} CKB
          </div>
          <div className="text-gray-500 text-sm w-full">
            {sdk.binding.isBindingType(cell.cellOutput.type) && (
              <div>
                {"Nostr Binding Asset"}
                {event && (
                  <ExpandableDiv
                    buttonText="Show Event"
                    expandedContent={
                      <div className="text-left">
                        <p>
                          Id: {event.id.toHex().slice(0, 6)}..
                          {event.id.toHex().slice(26)}
                        </p>
                        <p>Kind: {event.kind}</p>
                        <p>
                          Author: {event.author.toBech32().slice(0, 6)}..
                          {event.author.toBech32().slice(26)}
                        </p>
                        <p>Content: </p>
                        <div className="border border-gray-400 p-2 rounded-lg">
                          {event.content}
                        </div>
                      </div>
                    }
                  />
                )}
              </div>
            )}
            {cell.cellOutput.type == null && "Native CKB"}
          </div>
        </div>
      }
    </div>
  );
};
