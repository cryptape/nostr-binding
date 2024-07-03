# Nostr Binding Type Script Specification

## Introduction

The Nostr binding type script enables the binding between a Nostr Note and a CKB cell. <TODO>

## `ckbhash`
CKB uses blake2b as the default hash algorithm. We use `ckbhash` to denote the
blake2b hash function with following configuration:

output digest size: 32
personalization: ckb-default-hash

## Type ID
[Type ID](https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0022-transaction-structure/0022-transaction-structure.md#type-id) is a mechanic widely used in CKB. Upon creation, it follows this rule:
> Create a transaction which uses any out point as tx.inputs[0] and has a output
> cell whose type script is Type ID. The output cell's type script args is the
> hash of tx.inputs[0] and its output index. Because any out point can only be
> used once as an input, tx.inputs[0] and thus the new type id must be different
> in each creation transaction.

The hash of `tx.inputs[0]` and its output index via `ckbhash` can be referred to
as the global unique ID.

## Script
A nostr binding type script has the following structure:
```
Code hash: nostr binding type script code hash
Hash type: nostr binding type script hash type
Args: <nostr event id for binding, 32 bytes> <global unique ID, 32 bytes>
```

The global unique ID follows rules defined in [Type ID](https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0022-transaction-structure/0022-transaction-structure.md#type-id) RFC.

## Witness
Hexadecimal strings are frequently used in `event` in JSON format. Only
lowercase letters can be used in hexadecimal strings. For example, "00" and
"ffee" are valid hexadecimal strings, while "FFEE" and "hello world" are not
valid. This convention is applied throughout this specification.

When there is the same type script in input cells(transfer, burn), the witness
is ignored.

When there is no same type script in input cells(mint), the corresponding
witness must be a proper `WitnessArgs` data structure in molecule format. In
`output_type` field of the WitnessArgs, an `event` from
[NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md) structure
must be present in JSON format encoded in UTF-8. The `id` of `event` should be
verified according to NIP-01 and be equal to nostr event id for binding on
script `args`. In this `event`, there must be a tag key with name
"ckb_global_unique_id" and its corresponding tag value is equal to global unique
ID on script `args` in hexadecimal string. Finally, the `sig` field, along with
the `pubkey` and `id` fields in the `event`, can be validated via Schnorr
verification.


## Examples


### Mint
```yaml
CellDeps:
    <vec> Nostr binding type script cell
Inputs:
    <vec> normal cell (consumed to generated global unique ID)
Outputs:
    <vec> Nostr binding cell
        Data: <...>
        Lock: <...>
        Type:
            code_hash: <nostr binding type script code hash>
            args: <event id, 0011...eeff><global unique ID, aabb...0011>
Witnesses:
    <vec> WitnessArgs
        lock: <...>
        input_type: <...>
        output_type: >
            {
                "id": "0011...eeff",
                "pubkey": <schnorr pubkey, "dead...beef">,
                "created_at": <unix timestamp in seconds>,
                "kind": <0~65535>,
                "tags": [
                    ["ckb_global_unique_id", "aabb...0011"]
                ],
                "content": <arbitrary string>,
                "sig": <schnorr signature, "ffee...0000">
            }
```


### Transfer
```yaml
CellDeps:
    <vec> Nostr binding type script cell
Inputs:
    <vec> Nostr binding cell
        Data: <...>
        Lock: <...>
        Type:
            code_hash: <nostr binding type script code hash>
            args: <event id, 0011...eeff><global unique ID, aabb...0011>
Outputs:
    <vec> Nostr binding cell
        Data: <...>
        Lock: <...>
        Type:
            code_hash: <nostr binding type script code hash>
            args: <event id, 0011...eeff><global unique ID, aabb...0011>
Witnesses:
    <...>
```

### Burn
```yaml
CellDeps:
    <vec> Nostr binding type script cell
Inputs:
    <vec> Nostr binding cell
        Data: <...>
        Lock: <...>
        Type:
            code_hash: <nostr binding type script code hash>
            args: <event id, 0011...eeff><global unique ID, aabb...0011>
Outputs:
    <vec> Other cells
Witnesses:
    <...>
```


## Notes

An implementation of the nostr lock script spec above has been deployed to CKB mainnet and testnet:

- mainnet

| parameter   | value                                                                |
| ----------- | -------------------------------------------------------------------- |
| `code_hash` | TODO   |
| `hash_type` | `type`                                                               |
| `tx_hash`   | TODO   |
| `index`     | `0x0`                                                                |
| `dep_type`  | `code`                                                               |

- testnet

| parameter   | value                                                                |
| ----------- | -------------------------------------------------------------------- |
| `code_hash` | 0x4105801324b70b3a1508ded8958aba66a6faf68cab26f863b4902b50dfb8b9ab   |
| `hash_type` | `type`                                                               |
| `tx_hash`   | 0x10b5f9f005a7d8004e4b47bb5e05da8aa6de57922105e238cb2b0b2ec20a0a72   |
| `index`     | `0x0`                                                                |
| `dep_type`  | `code`                                                               |

Reproducible build is supported to verify the deploy script. To build the deployed the script above, one can use the following steps:

```bash
git clone https://github.com/cryptape/nostr-binding.git
cd nostr-binding
bash scripts/reproducible_build_docker
```
