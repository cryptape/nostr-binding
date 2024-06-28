import { ReactNode, useContext } from "react";
import { SingerContext } from "~/context/signer";
import { listTypeCells } from "~/protocol/ckb-helper.client";
import { NostrBinding } from "~/protocol/script/nostr-binding.client";

export interface AssetButtonProp {
  setResult: (res: string | ReactNode) => void;
}

export function AssetButton({ setResult }: AssetButtonProp) {
  const context = useContext(SingerContext);

  const onClick = async () => {
    const ckbAddress = context.ckbSigner?.ckbAddress;
    if (ckbAddress) {
      const cells = await listTypeCells(ckbAddress, undefined, 20);
      if (cells.length > 0) {
        return setResult(
          <div className="flex flex-row gap-2">
            {cells.map((cell) => (
              <div>
                {(
                  <div className="border text-center py-2 px-4 rounded">
                    <div>
                    {(BigInt(cell.cellOutput.capacity) / 100000000n).toString()} CKB
                    </div>
                    <div className="text-gray-500 text-sm">
                    {NostrBinding.isBindingType(cell.cellOutput.type) && "Nostr Binding Asset"}
                    {cell.cellOutput.type == null && "Native CKB"}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      } else {
        setResult("Not found");
      }
    }
  };

  return (
    <div className="my-1">
      <button
        className="border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-bold py-2 px-4 rounded"
        onClick={onClick}
      >
        List My Asset
      </button>
    </div>
  );
}
