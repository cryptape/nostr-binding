import { getWitnessByOutpoint } from "~/lib/ckb.client";
import { ReactNode, useEffect, useState } from "react";
import { Event } from "@rust-nostr/nostr-sdk";
import ExpandableDiv from "./expandable";
import { sdk } from "~/lib/sdk.client";
import { UnlockButton } from "./unlock-button";
import { ccc } from "@ckb-ccc/ccc";

export interface AssetBoxProp {
  client: ccc.Client;
  cell: ccc.Cell;
  setResult: (res: string | ReactNode) => void;
}
export const AssetBox: React.FC<AssetBoxProp> = ({
  client,
  cell,
  setResult,
}) => {
  const [event, setEvent] = useState<Event | null | undefined>();

  useEffect(() => {
    const getBindingEvent = async (cell: ccc.Cell) => {
      const outpoint = cell.outPoint;
      if (outpoint && sdk.binding.isBindingType(cell.cellOutput.type)) {
        const witness = await getWitnessByOutpoint(client, outpoint);
        if (witness) {
          const event = sdk.binding.parseBindingEventFromWitnessArgs(witness);
          return event;
        }
      }
      return null;
    };

    getBindingEvent(cell).then((event) => {
      if (event) {
        setEvent(Event.fromJson(JSON.stringify(event)));
      }
    });
  }, [cell, client]);

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
                        <div>
                          <UnlockButton
                            assetEvent={event}
                            setResult={setResult}
                          />
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
