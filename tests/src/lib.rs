use ckb_testtool::{
    ckb_error::Error, ckb_hash::{Blake2b, Blake2bBuilder}, ckb_types::{
        bytes::Bytes,
        core::{Cycle, TransactionView},
    }, context::Context
};
use nostr::key::Keys;
use std::env;
use std::fs;
use std::path::PathBuf;
use std::str::FromStr;
mod tests;
const MAX_CYCLES: u64 = 70_000_000;

pub const SIGHASH_ALL_TAG_NAME: &str = "ckb_sighash_all";
pub const NOSTR_LOCK_KIND: u16 = 23334;
pub const SCRIPT_ARGS_LEN: usize = 33;
pub const NOSTR_LOCK_CONTENT: &str = "Signing a CKB transaction\n\nIMPORTANT: Please verify the integrity and authenticity of connected Nostr client before signing this message\n";
pub const NONCE: &str = "nonce";

fn sign_nostr_lock_script(key: Keys, timestamp: u64, witness_index: usize, tx: TransactionView) -> TransactionView {
    // when unix timestamp is 9999999999, the time is Sat Nov 20 2286 17:46:39
    // current time, the unix timestamp is around 1719160000
    tx
}

fn new_blake2b() -> Blake2b {
    Blake2bBuilder::new(32).personal(b"ckb-default-hash").build()
}
