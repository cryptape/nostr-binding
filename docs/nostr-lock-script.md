# Nostr Lock Script Specification

## Introduction

The Nostr lock script is designed for interoperability with
[Nostr](https://nostr.com/). It includes built-in support for verifying
transaction signing methods used by Nostr. Additionally, it can support
proof-of-work mechanics from Nostr to ensure a fair launch.


## Lock Script
A nostr lock script has the following structure:
```
Code hash: nostr lock script code hash
Hash type: nostr lock script hash type
Args: <schnorr pubkey, 32 bytes> <PoW difficulty, 1 byte>
```

When the PoW difficulty is zero, the Schnorr pubkey is used to unlock. When the
PoW difficulty is non-zero, the Schnorr pubkey is not used and should be all
zero, and another unlock method is used. More details will be explained below.


## Witness
When unlocking an nostr lock script, the corresponding witness must be a proper
`WitnessArgs` data structure in molecule format. In the lock field of the
WitnessArgs, an `event` from
[NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md) structure
must be present in JSON format encoded in UTF-8.

Hexadecimal strings are frequently used in `event` in JSON format. Only
lowercase letters can be used in hexadecimal strings. For example, "00" and
"ffee" are valid hexadecimal strings, while "FFEE" and "hello world" are not
valid. This convention is applied throughout this specification.


## Unlocking
There are 2 methods to unlock nostr lock script: by key(PoW difficulty is zero)
or by PoW difficulty(PoW difficulty is non-zero).

A 32-byte `sighash_all` message can be calculated via [blake2b hash
function](https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0022-transaction-structure/0022-transaction-structure.md#crypto-primitives)
function with following data:

* Transaction hash
* Witness length and content in same script group covered by inputs, excluding lock field
* Other witness length and content that not covered by inputs

A reference implementation in C can be found [here](https://github.com/nervosnetwork/ckb-system-scripts/blob/a7b7c75662ed950c9bd024e15f83ce702a54996e/c/secp256k1_blake160_sighash_all.c#L219).

The `event` in witness has following format:
```text
{
  "id": <32-bytes lowercase hex-encoded sha256 of the serialized event data>,
  "pubkey": <32-bytes lowercase hex-encoded public key of the event creator>,
  "created_at": <unix timestamp in seconds>,
  "kind": <integer between 0 and 65535>,
  "tags": [
    [<arbitrary string>...],
    // ...
  ],
  "content": <arbitrary string>,
  "sig": <64-bytes lowercase hex of the signature of the sha256 hash of the serialized event data, which is the same as the "id" field>
}
```

Each tag is an array of one or more strings, with some conventions around them.
The first element of the tag array is referred to as the tag name or key and the
second as the tag value.

**Rule 1**: A tag key with "ckb_sighash_all" must be present. Its corresponding
tag value must be equal to `sighash_all` in hexadecimal format.

Here is an example of such tag:
```json
["ckb_sighash_all", "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"]
```

**Rule 2**: The `id` in the `event` is calculated based on
[NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md#events-and-signatures).

**Rule 3**: The `kind` in the `event` should be equal to 23334. The `content` in
the `event` should be identical to following fixed string:
"Signing a CKB transaction\n\nIMPORTANT: Please verify the integrity and authenticity of connected Nostr client before signing this message\n"

These 3 rules(1,2,3) should be followed by both of the two unlocking methods
described below.

### Unlocking by PoW
When PoW difficulty is non-zero, this unlocking method is used. It follows
[NIP-13](https://github.com/nostr-protocol/nips/blob/master/13.md). 

**Rule 4**: A tag key with `nonce` must be present. Its corresponding tag value
can be any string.

**Rule 5**: The third entry to the `nonce` tag should contain the PoW
difficulty in decimal string described in script args.

**Rule 6**: The `id` in `event` should has a difficulty no less than PoW
difficulty specified in script args.

**Rule 7**: The `pubkey` in script args should be all zeros.

When the rules above(1,2,3,4,5,6,7) are met, the validation is successful.

The `sighash_all` is affected by the length of the `event` in the witness. It is
suggested to reserve the `nonce` tag value as a very long string, like the
example below:
```json
["nonce", "000000000000000000000000000000000000", "24"]
```
For each mining attempt, only mutate the long string while keeping the length unchanged.


### Unlocking by Key
When PoW difficulty is zero, this unlocking method is used. 

**Rule 8**: The `pubkey` field in `event` should be equal to pubkey in script args in hexadecimal string.

**Rule 9**: The `sig` field, along with the `pubkey` and `id` fields in the
`event`, can be validated via Schnorr verification.

When the rules above(1,2,3,8,9) are met, the validation is successful.

## Examples

### Unlocking by PoW


```yaml
CellDeps:
    <vec> Nostr lock script cell
Inputs:
    <vec> Cell
        Data: <...>
        Type: <...>
        Lock:
            code_hash: <nostr lock script code hash>
            args: <schnorr pubkey, 0000...00><PoW difficulty, 24>
Outputs:
    <vec> Any cell
Witnesses:
    WitnessArgs structure:
      Lock: >
        {
            "id": "000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
            "pubkey": "0000...00",
            "created_at": <unix timestamp in seconds>,
            "kind": <integer between 0 and 65535>,
            "tags": [
                 ["nonce", "quick brown fox", "24"],
                 ["ckb_sighash_all", "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"]
            ],
            "content": <arbitrary string>,
            "sig": "0000...00"
        }
      <...>
```

The `pubkey` and `sig` can be filled with arbitrary 32-byte lowercase
hex-encoded public key and 64-byte lowercase hex-encoded signature values to
meet the deserialization requirement defined in NIP-01. A value with all zeros
is a suitable choice.


### Unlocking by Key
```yaml
CellDeps:
    <vec> Nostr lock script cell
Inputs:
    <vec> Cell
        Data: <...>
        Type: <...>
        Lock:
            code_hash: <nostr lock script code hash>
            args: <schnorr pubkey, dead...beef><PoW difficulty, 0>
Outputs:
    <vec> Any cell
Witnesses:
    WitnessArgs structure:
      Lock: >
        {
            "id": "0011...eeff",
            "pubkey": <schnorr pubkey, "dead...beef">,
            "created_at": <unix timestamp in seconds>,
            "kind": <integer between 0 and 65535>,
            "tags": [
                ["ckb_sighash_all", "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"]
            ],
            "content": <arbitrary string>,
            "sig": <schnorr signature, "ffee...0000">
        }
      <...>
```


## Notes

An [implementation](TODO) of the nostr lock script spec above has been deployed to CKB mainnet and testnet:

- Mirana

| parameter   | value                                                                |
| ----------- | -------------------------------------------------------------------- |
| `code_hash` | TODO   |
| `hash_type` | `type`                                                               |
| `tx_hash`   | TODO   |
| `index`     | `0x0`                                                                |
| `dep_type`  | `code`                                                               |

- Pudge

| parameter   | value                                                                |
| ----------- | -------------------------------------------------------------------- |
| `code_hash` | TODO   |
| `hash_type` | `type`                                                               |
| `tx_hash`   | TODO   |
| `index`     | `0x0`                                                                |
| `dep_type`  | `code`                                                               |

Reproducible build is supported to verify the deploy script. To build the deployed the script above, one can use the following steps:

```bash
TODO
```
