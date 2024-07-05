import { ReactNode, useContext } from "react";
import { SingerContext } from "~/context/signer";
import { listTypeCells } from "~/lib/ckb.client";
import { AssetBox } from "./asset-box";

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
          <div className="flex flex-row gap-2 max-w-full">
            {cells.map((cell, id) => (
              <AssetBox key={id} cell={cell} />
            ))}
          </div>,
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
