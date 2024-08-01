import { ClientBuilder, Nip07Signer, NostrSigner } from "@rust-nostr/nostr-sdk";
import { useContext, useEffect, useState } from "react";
import { buildNostrCKBSigner, SingerContext } from "@/context/signer";
import { buildTruncateCkbAddress, capacityOf } from "@/lib/ckb";
import offckb from "@/offckb.config";
import { NostrClientContext } from "../../context/nostr-client";
import { buildTruncateNpub } from "@/lib/nostr";
import { relayUrl } from "@/lib/relay";

export function ConnectNostr() {
  const { setNostrSigner, ckbSigner, setCKBSigner } = useContext(SingerContext);
  const { setNostrWriteClient } = useContext(NostrClientContext);

  const [showPopup, setShowPopup] = useState(false);

  const handleOpenPopup = () => {
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  const connect = async () => {
    const nip07Signer = "nostr" in window ? new Nip07Signer() : null;
    if (nip07Signer == null) {
      return alert("signer not found, please install Nip07 Extension.");
    }

    const nostrSigner = NostrSigner.nip07(nip07Signer);
    const pubkey = await nostrSigner.publicKey();
    const ckbSigner = await buildNostrCKBSigner(pubkey, nostrSigner);
    let client = new ClientBuilder().signer(nostrSigner).build();
    client.addRelay(relayUrl).then(() => {
      client.connect();
    });

    setNostrSigner(nostrSigner);
    setCKBSigner(ckbSigner);
    setNostrWriteClient(client);
  };

  const disconnect = async () => {
    setNostrSigner(undefined);
    setCKBSigner(undefined);
    setNostrWriteClient(undefined);

    handleClosePopup();
  };

  return (
    <div className="mb-4">
      <div>
        {ckbSigner ? (
          <button
            onClick={handleOpenPopup}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            {buildTruncateNpub(ckbSigner.originAddress)}
          </button>
        ) : (
          <button
            onClick={connect}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Connect Nostr
          </button>
        )}
      </div>
      <Popup
        show={showPopup}
        onClose={handleClosePopup}
        onDisconnect={disconnect}
        ckbAddress={ckbSigner?.ckbAddress}
      />
    </div>
  );
}

interface PopupProps {
  show: boolean;
  onClose: () => void;
  onDisconnect: () => void;
  ckbAddress?: string;
}

const Popup: React.FC<PopupProps> = ({
  show,
  onClose,
  onDisconnect,
  ckbAddress,
}) => {
  const [balance, setBalance] = useState<string>();
  useEffect(() => {
    if (!ckbAddress) return;

    capacityOf(ckbAddress).then((bal) =>
      setBalance(bal.div(100000000).toString())
    );
  }, [ckbAddress]);

  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-4 rounded-2xl shadow-lg w-1/3 items-center align-middle text-center">
        <div className="w-full text-right mb-4 cursor-pointer">
          <span className="text-xl font-bold" onClick={onClose}>
            x
          </span>
        </div>

        <div>
          <div className="mt-4 text-lg text-gray-500 capitalize">
            CKB {offckb.currentNetwork}
          </div>
        </div>

        <div className="text-2xl font-bold my-2">
          {buildTruncateCkbAddress(ckbAddress || "CKB Address Not Found")}
        </div>

        <div className="text-lg mt-4 mb-6">{balance} CKB</div>

        <div>
          <button
            className="mt-4 px-6 py-4 bg-gray-500 text-white rounded-xl w-full"
            onClick={onDisconnect}
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
};
