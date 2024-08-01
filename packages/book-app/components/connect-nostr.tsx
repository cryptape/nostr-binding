import {
  ClientBuilder,
  EventBuilder,
  Nip07Signer,
  NostrSigner,
  PublicKey,
  Tag,
  Timestamp,
  UnsignedEvent,
} from "@rust-nostr/nostr-sdk";
import { useContext, useMemo, useState } from "react";
import { helpers, Transaction } from "@ckb-lumos/lumos";
import { CKBSigner, SingerContext } from "@/context/signer";
import { capacityOf } from "@/lib/ckb";
import { EventToSign, SignedEvent } from "@nostr-binding/sdk";
import { sdk } from "@/lib/sdk";
import offckb from "@/offckb.config";
import { NostrClientContext } from "../context/nostr-client";

export function ConnectNostr() {
  const [showPopup, setShowPopup] = useState(false);
  const [nostrPubkey, setNostrPubkey] = useState<string>();
  const [ckbAddress, setCKBAddress] = useState<string>();
  const [balance, setBalance] = useState<string>();
  const { nostrSigner, setNostrSigner, ckbSigner, setCKBSigner } =
    useContext(SingerContext)!;

  const { nostrWriteClient, setNostrWriteClient } =
    useContext(NostrClientContext);

  const handleOpenPopup = () => {
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  const connect = async () => {
    if (!nostrSigner) {
      const nip07_signer = "nostr" in window ? new Nip07Signer() : null;
      if (nip07_signer == null)
        return alert(
          "signer not found, please install Nip07 Extension or JoyId Wallet."
        );

      const signer = NostrSigner.nip07(nip07_signer);
      setNostrSigner(signer);

      const pubkey = await signer.publicKey();
      setNostrPubkey(pubkey.toBech32());

      const ckbSigner = await buildNostrCKBSigner(pubkey, signer);
      setCKBSigner(ckbSigner);

      const ckbAddress = ckbSigner.ckbAddress;
      setCKBAddress(ckbAddress);

      let client = new ClientBuilder().signer(signer).build();
      client.addRelay("wss://relay.nostr.band").then(() => {
        client.connect();
      });
      setNostrWriteClient(client);
    }
  };

  const disconnect = async () => {
    setNostrSigner(undefined);
    setCKBSigner(undefined);

    setNostrPubkey(undefined);
    setCKBAddress(undefined);

    handleClosePopup();
  };

  const buildNostrCKBSigner = async (
    publicKey: PublicKey,
    nostrSigner: NostrSigner
  ) => {
    // update ckb signer context
    const signMessage = async (message: string) => {
      const unsignedEvent = UnsignedEvent.fromJson(message);
      const signedMessage = await nostrSigner.signEvent(unsignedEvent);

      return signedMessage.asJson();
    };

    const signTransaction = async (tx: Transaction) => {
      const signer = async (event: EventToSign) => {
        const eventBuilder = new EventBuilder(
          event.kind,
          event.content,
          event.tags.map((tag) => Tag.parse(tag))
        ).customCreatedAt(Timestamp.fromSecs(event.created_at));
        const nostrSignedEvent =
          await nostrSigner.signEventBuilder(eventBuilder);
        const signedEvent: SignedEvent = JSON.parse(nostrSignedEvent.asJson());
        return signedEvent;
      };
      return await sdk.lock.signTx(tx, signer);
    };

    const signPreparedTransaction = async (
      tx: Transaction,
      lockIndexes: Array<number>
    ) => {
      const signer = async (event: EventToSign) => {
        const eventBuilder = new EventBuilder(
          event.kind,
          event.content,
          event.tags.map((tag) => Tag.parse(tag))
        ).customCreatedAt(Timestamp.fromSecs(event.created_at));
        const nostrSignedEvent =
          await nostrSigner.signEventBuilder(eventBuilder);
        const signedEvent: SignedEvent = JSON.parse(nostrSignedEvent.asJson());
        return signedEvent;
      };
      return await sdk.lock.signPreparedTx(tx, lockIndexes, signer);
    };

    const prepareTransaction = async (tx: Transaction) => {
      return await sdk.lock.prepareTx(tx);
    };

    const lockScript = sdk.lock.buildScript("0x" + publicKey.toHex());
    const ckbAddress = helpers.encodeToAddress(lockScript);

    const cellDeps = await sdk.lock.buildCellDeps();
    const ckbSigner: CKBSigner = {
      ckbAddress,
      originAddress: publicKey.toBech32(),
      lockScript,
      signMessage,
      signTransaction,
      signPreparedTransaction,
      prepareTransaction,
      cellDeps,
    };
    return ckbSigner;
  };

  useMemo(() => {
    if (!ckbAddress) return;

    capacityOf(ckbAddress).then((bal) =>
      setBalance(bal.div(100000000).toString())
    );
  }, [ckbAddress]);

  return (
    <div className="mb-4">
      <div>
        {nostrPubkey ? (
          <button
            onClick={handleOpenPopup}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            {nostrPubkey.slice(0, 6)}..{nostrPubkey.slice(-6)}
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
        ckbAddress={ckbAddress}
        balance={balance}
      />
    </div>
  );
}

interface PopupProps {
  show: boolean;
  onClose: () => void;
  onDisconnect: () => void;
  ckbAddress?: string;
  balance?: string;
}

const Popup: React.FC<PopupProps> = ({
  show,
  onClose,
  onDisconnect,
  ckbAddress,
  balance,
}) => {
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
          {ckbAddress?.slice(0, 10)}..{ckbAddress?.slice(-10)}
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
