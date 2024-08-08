# Nostr binding on CKB

> [!WARNING]
> This repository is still in the proof-of-concept stage.

This repository contains the scripts and toolchains for the Nostr binding protocol on CKB. Any Nostr event with a special tag can be binding on a corresponding unique Cell on the CKB blockchain, making the Nostr event ownable and a digital asset.

We also build a very simple POC demo of the Nostr binding protocol in the `/packages/demo` directory. Check out the [README.md](/packages/demo/app/README.md) to see how to run it.

## Structure

```bash
│── contracts # scripts source code
│   ├── ckb-nostr-utils
│   ├── nostr-binding
│   └── nostr-lock
├── deployment # script deploy info
│   ├── mainnet
│   └── testnet
│── packages
│   ├── book-app # a simple workshop app
│   ├── demo # a simple demo using sdk
│   └── sdk # javascript sdk for nostr-binding protocol
```

## Docs

A short presentation for the Bitcoin hackathon to explain the idea of the Nostr binding protocol

- [Nostr Binding Protocol.pdf](/assets/nostr-binding-presentation.pdf)

Light paper to describe the Nostr binding protocol

- [docs/lightpaper.md](/docs/lightpaper.md)
- [docs/lightpaper-zh.md](/docs/lightpaper-zh.md)(中文版)

Spec for implementation

- [docs/nostr-binding-type-script.md](/docs/nostr-binding-type-script.md)
- [docs/nostr-lock-script.md](/docs/nostr-lock-script.md)

## Run Demo

### On Testnet

Just start the dApp:

```sh
cd packages/demo
pnpm i && NETWORK=testnet pnpm run dev 
```

Or visit: [nostr-binding.vercel.app](https://nostr-binding.vercel.app/)

### On Local Devnet

### 1. Start Devnet

```sh
offckb node
```

*Required [offckb](https://github.com/RetricSu/offckb) version >= 0.2.2*

### 2. Prepare Scripts

The following dependencies are required for building the Scripts:

* `git`, `make`, `sed`, `bash`, `sha256sum` and others Unix utilities. Refer to the documentation for your operating systems for how to install them. Chances are your system might already have them.
* `Rust`: Rust 1.75 installed via [rustup](https://rustup.rs/) should work. Make sure you have `riscv64` target installed via: `rustup target add riscv64imac-unknown-none-elf`
* `Clang`: make sure you have clang 16+(18 is recommended) installed, sample installation steps for selected platforms are:
    + Debian / Ubuntu: `wget https://apt.llvm.org/llvm.sh && chmod +x llvm.sh && sudo ./llvm.sh 18 && rm llvm.sh`
    + Fedora 39+: `sudo dnf -y install clang`
    + Archlinux: `sudo pacman --noconfirm -Syu clang`
    + macOS: `brew install llvm@18`
    + Windows(with [Scoop](scoop install llvm yasm)): `scoop install llvm yasm`

Run the following commands to build the Scripts:

```sh
make build
```

The script binaries are located in `build/release`

```sh
cd build/release && ls -hl && cd ../..

> total 704
> -rwxr-xr-x  1 staff   170K Jun 28 11:32 nostr-binding
> -rwxr-xr-x  1 staff   176K Jun 28 11:32 nostr-lock
```

Reproducible build via docker:
```sh
bash scripts/reproducible_build_docker
```
Deploy reproducible binaries on testnet and mainnet.


### 3. Deploy Scripts

```sh
cd packages/demo
offckb deploy --network devnet
```
The deployed script info is auto-updated in the `offckb.config.ts` file in the app so you can use it directly.

### 4. Start the DApp

```sh
cd packages/demo
pnpm i && NETWORK=devnet pnpm run dev 
```

### 5. Deposit CKB to Nostr Account

```sh
offckb deposit --network devnet <Your-nostr-account-corresponding-address> <AmountInShannon>
```

*This workspace was bootstrapped with [ckb-script-templates].*

[ckb-script-templates]: https://github.com/cryptape/ckb-script-templates
