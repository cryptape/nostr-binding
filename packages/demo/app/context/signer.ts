import { createContext } from "react";
import { ccc } from "@ckb-ccc/ccc";

export interface SingerContextType {
  signer: ccc.SignerNostr | null;
  setSigner: (signer: ccc.SignerNostr) => void;
}

export const defaultSingerContext = {
  signer: null,
  setSigner: () => {},
};

export const SingerContext =
  createContext<SingerContextType>(defaultSingerContext);
