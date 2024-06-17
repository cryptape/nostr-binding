# ckb-nostr-utils

The Nostr library has a dedicated [SDK](https://github.com/rust-nostr/nostr)
that supports `no_std`. However, the compiled binary is quite large, often
exceeding 500KB. To address this issue, we have developed a simplified version
Nostr library. This library includes only the essential functions required for
lock scripts and type scripts.

