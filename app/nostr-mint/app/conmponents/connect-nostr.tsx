import {
  Nip07Signer,
  NostrSigner,
  PublicKey,
  UnsignedEvent,
} from "@rust-nostr/nostr-sdk";
import { useContext, useMemo, useState } from "react";
import { commons, helpers } from "@ckb-lumos/lumos";
import { CKBSigner, SingerContext } from "~/context/signer";
import {
  capacityOf,
  computeTransactionHash,
} from "~/protocol/ckb-helper.client";
import { blockchain } from "@ckb-lumos/base";
import { bytes } from "@ckb-lumos/codec";
import { NostrLock } from "~/protocol/script/nostr-lock.client";
import { Unlock } from "~/protocol/event/unlock.client";
import { readEnvNetwork } from "offckb.config";
import ExpandableDiv from "./expandable";

export function ConnectNostr() {
  const [nostrPubkey, setNostrPubkey] = useState<string>();
  const [ckbAddress, setCKBAddress] = useState<string>();
  const [balance, setBalance] = useState<string>();
  const { nostrSigner, setNostrSigner, ckbSigner, setCKBSigner } =
    useContext(SingerContext)!;

  const connect = async () => {
    if (!nostrSigner) {
      const nip07_signer = new Nip07Signer();
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
    nostrSigner: NostrSigner
  ) => {
    // update ckb signer context
    const signMessage = async (message: string) => {
      const unsignedEvent = UnsignedEvent.fromJson(message);
      const signedMessage = await nostrSigner.signEvent(unsignedEvent);

      return signedMessage.asJson();
    };

    const buildWitnessPlaceholder = (eventWitness: Uint8Array) => {
      const SECP_SIGNATURE_PLACEHOLDER = bytes.hexify(
        new Uint8Array(
          commons.omnilock.OmnilockWitnessLock.pack({
            signature: new Uint8Array(65).buffer,
          }).byteLength
        )
      );

      const witness = bytes.hexify(
        blockchain.WitnessArgs.pack({
          lock: SECP_SIGNATURE_PLACEHOLDER,
          outputType: bytes.hexify(eventWitness),
        })
      );

      return witness;
    };

    const buildSigningEntries = (txSkeleton: any, eventWitness: Uint8Array) => {
      const witness = buildWitnessPlaceholder(eventWitness);
      // fill txSkeleton's witness with placeholder
      for (let i = 0; i < txSkeleton.inputs.toArray().length; i++) {
        txSkeleton = txSkeleton.update(
          "witnesses",
          (witnesses: Immutable.List<string>) => witnesses.push(witness)
        );
      }

      // todo: we assume every input use the same nostr lock
      // this should be update for more real use case
      const tx = helpers.createTransactionFromSkeleton(txSkeleton);
      const txHash = computeTransactionHash(tx).slice(2);
      let rawEvent = Unlock.buildEvent(txHash);
      let signingEntries = txSkeleton.get("signingEntries") || [];
      const signingEntry = {
        type: "witness_args_lock",
        index: 0,
        message: rawEvent.toUnsignedEvent(publicKey).asJson(),
      };
      signingEntries = signingEntries.push(signingEntry);

      txSkeleton = txSkeleton.set("signingEntries", signingEntries);

      return txSkeleton;
    };

    const lockScript = NostrLock.buildScript(publicKey);
    const ckbAddress = helpers.encodeToAddress(lockScript);

    const ckbSigner: CKBSigner = {
      buildSigningEntries,
      ckbAddress,
      originAddress: publicKey.toBech32(),
      lockScript,
      signMessage,
      cellDeps: NostrLock.buildCellDeps(),
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
              { readEnvNetwork() === "testnet" && <>Get some CKBs From <a href="https://faucet-api.nervos.org/" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:text-purple-700 underline hover:no-underline">Faucet</a> or</> } Use{" "}
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
