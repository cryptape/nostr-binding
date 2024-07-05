import {
  EventBuilder,
  Nip07Signer,
  NostrSigner,
  PublicKey,
  Tag,
  Timestamp,
  UnsignedEvent,
} from "@rust-nostr/nostr-sdk";
import { useContext, useMemo, useState } from "react";
import { helpers } from "@ckb-lumos/lumos";
import { CKBSigner, SingerContext } from "~/context/signer";
import { capacityOf } from "~/lib/ckb.client";
import { readEnvNetwork } from "offckb.config";
import ExpandableDiv from "./expandable";
import { EventToSign, SignedEvent, joyIdNip07Signer } from "@nostr-binding/sdk";
import { sdk } from "~/lib/sdk.client";

export function ConnectNostr() {
  const [nostrPubkey, setNostrPubkey] = useState<string>();
  const [ckbAddress, setCKBAddress] = useState<string>();
  const [balance, setBalance] = useState<string>();
  const { nostrSigner, setNostrSigner, ckbSigner, setCKBSigner } =
    useContext(SingerContext)!;

  const connect = async () => {
    if (!nostrSigner) {
      const nip07_signer =
        "nostr" in window
          ? new Nip07Signer()
          : readEnvNetwork() !== "devnet"
            ? new joyIdNip07Signer()
            : null;
      if (nip07_signer == null)
        return alert(
          "signer not found, please install Nip07 Extension or JoyId Wallet.",
        );

      const signer = NostrSigner.nip07(nip07_signer);
      setNostrSigner(signer);

      const pubkey = await signer.publicKey();
      setNostrPubkey(pubkey.toBech32());

      if (!ckbSigner) {
        const ckbSigner = buildNostrCKBSigner(pubkey, signer);
        setCKBSigner(ckbSigner);

        const ckbAddress = ckbSigner.ckbAddress;
        setCKBAddress(ckbAddress);
      }
    }
  };

  const buildNostrCKBSigner = (
    publicKey: PublicKey,
    nostrSigner: NostrSigner,
  ) => {
    // update ckb signer context
    const signMessage = async (message: string) => {
      const unsignedEvent = UnsignedEvent.fromJson(message);
      const signedMessage = await nostrSigner.signEvent(unsignedEvent);

      return signedMessage.asJson();
    };

    const signTransaction = async (
      txSkeleton: helpers.TransactionSkeletonType,
    ) => {
      const signer = async (event: EventToSign) => {
        const eventBuilder = new EventBuilder(
          event.kind,
          event.content,
          event.tags.map((tag) => Tag.parse(tag)),
        ).customCreatedAt(Timestamp.fromSecs(event.created_at));
        const nostrSignedEvent =
          await nostrSigner.signEventBuilder(eventBuilder);
        const signedEvent: SignedEvent = JSON.parse(nostrSignedEvent.asJson());
        return signedEvent;
      };
      txSkeleton = await sdk.lock.signTx(txSkeleton, signer);
      return txSkeleton;
    };

    const lockScript = sdk.lock.buildScript("0x" + publicKey.toHex());
    const ckbAddress = helpers.encodeToAddress(lockScript);

    const ckbSigner: CKBSigner = {
      ckbAddress,
      originAddress: publicKey.toBech32(),
      lockScript,
      signMessage,
      signTransaction,
      cellDeps: sdk.lock.buildCellDeps(),
    };
    return ckbSigner;
  };

  useMemo(() => {
    if (!ckbAddress) return;

    capacityOf(ckbAddress).then((bal) =>
      setBalance(bal.div(100000000).toString()),
    );
  }, [ckbAddress]);

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
