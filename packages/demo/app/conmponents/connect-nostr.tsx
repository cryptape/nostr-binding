import { useContext, useMemo, useState } from "react";
import { SingerContext } from "~/context/signer";
import { readEnvNetwork } from "offckb.config";
import ExpandableDiv from "./expandable";
import { ccc } from "@ckb-ccc/ccc";
import { cccA } from "@ckb-ccc/ccc/advanced";

export function ConnectNostr() {
  const [nostrPubkey, setNostrPubkey] = useState<string>();
  const [ckbAddress, setCKBAddress] = useState<string>();
  const [balance, setBalance] = useState<string>();
  const { signer, setSigner } = useContext(SingerContext)!;

  const connect = async () => {
    if (signer) {
      return;
    }

    const network = readEnvNetwork();
    const client =
      network === "mainnet"
        ? new ccc.ClientPublicMainnet()
        : new ccc.ClientPublicTestnet();

    const nostrSigner =
      "nostr" in window
        ? new ccc.Nip07.Signer(client, window.nostr as cccA.Nip07A.Provider)
        : network !== "devnet"
          ? new ccc.JoyId.NostrSigner(
              client,
              "Nostr Binding",
              "https://fav.farm/🆔",
            )
          : null;

    if (nostrSigner == null)
      return alert(
        "signer not found, please install Nip07 Extension or JoyId Wallet.",
      );

    setSigner(nostrSigner);

    const pubkey = await nostrSigner.getInternalAddress();
    setNostrPubkey(pubkey);

    const ckbAddress = await nostrSigner.getRecommendedAddress();
    setCKBAddress(ckbAddress);
  };

  useMemo(() => {
    if (!signer) return;

    signer.getBalance().then((bal) => setBalance(ccc.fixedPointToString(bal)));
  }, [signer]);

  return (
    <div className="mb-4 w-full">
      <div>
        {nostrPubkey ? (
          `${nostrPubkey}`
        ) : (
          <button
            onClick={connect}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Connect Nostr
          </button>
        )}
      </div>
      {ckbAddress && <div>{ckbAddress}</div>}
      {ckbAddress && <div>Balance: {balance} CKB </div>}
      {ckbAddress && (
        <ExpandableDiv
          buttonText="How to Deposit CKB"
          expandedContent={
            <div className="w-full">
              <div className="text-gray-500">
                {readEnvNetwork() === "testnet" && (
                  <>
                    Get some CKBs From{" "}
                    <a
                      href="https://faucet-api.nervos.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-500 hover:text-purple-700 underline hover:no-underline"
                    >
                      Faucet
                    </a>{" "}
                    or
                  </>
                )}{" "}
                Use{" "}
                <a
                  href="https://github.com/RetricSu/offckb?tab=readme-ov-file#usage"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-500 hover:text-purple-700 underline hover:no-underline"
                >
                  offckb
                </a>{" "}
                to deposit some CKBs
              </div>
              <pre className="bg-gray-800 text-white p-4 rounded-md shadow-md overflow-x-auto w-full">
                <code className="text-yellow-400">
                  offckb deposit {ckbAddress} 100000000000 --network{" "}
                  {readEnvNetwork()}
                </code>
              </pre>
            </div>
          }
        />
      )}
    </div>
  );
}
