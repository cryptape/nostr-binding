#[cfg(test)]
mod tests;

use ::hex;
use ckb_testtool::{
    ckb_hash::{Blake2b, Blake2bBuilder},
    ckb_types::{bytes::Bytes, core::TransactionView, packed, prelude::*},
};
use nostr::prelude::*;
use std::time::{SystemTime, UNIX_EPOCH};

pub const MAX_CYCLES: u64 = 70_000_000;
pub const SIGHASH_ALL_TAG_NAME: &str = "ckb_sighash_all";
pub const NOSTR_LOCK_KIND: u16 = 23334;
pub const SCRIPT_ARGS_LEN: usize = 33;
pub const NOSTR_LOCK_CONTENT: &str = "Signing a CKB transaction\n\nIMPORTANT: Please verify the integrity and authenticity of connected Nostr client before signing this message\n";
pub const NONCE: &str = "nonce";

///
/// sign a transaction for a nostr lock script, with key, timestamp and witness index
///
pub fn sign_nostr_lock_script(
    key: &Keys,
    created_at: u64,
    lock_indexes: Vec<usize>,
    input_len: usize,
    tx: TransactionView,
) -> TransactionView {
    assert!(lock_indexes.len() > 0);
    let dummy_sighash_all = [0u8; 32];
    let tags = [Tag::custom(
        TagKind::from(SIGHASH_ALL_TAG_NAME),
        vec![hex::encode(dummy_sighash_all)],
    )];
    // when unix timestamp is 9999999999, the time is Sat Nov 20 2286 17:46:39.
    // So in the coming 200 years, the length of created_at is a static value.
    // current time, the unix timestamp is around 1719160000
    let created_at_str = format!("{}", created_at);
    assert_eq!(created_at_str.len(), 10);
    let dummy_event: Event =
        EventBuilder::new(Kind::from(NOSTR_LOCK_KIND), NOSTR_LOCK_CONTENT, tags)
            .custom_created_at(created_at.into())
            .to_event(key)
            .unwrap();
    let dummy_json = dummy_event.as_json();
    println!("dummy_json = {}", dummy_json);
    let dummy_length = dummy_json.len();
    println!("dummy_length = {}", dummy_length);
    let witness_index = lock_indexes[0];
    // make a dummy witness to generate correct sighash_all
    let dummy_witness: Vec<packed::Bytes> = tx
        .witnesses()
        .into_iter()
        .enumerate()
        .map(|(index, witness)| {
            if index == witness_index {
                let witness: Bytes = witness.unpack();
                let witness_args = if witness.len() == 0 {
                    packed::WitnessArgs::default()
                } else {
                    packed::WitnessArgs::new_unchecked(witness)
                };
                let dummy_lock: Bytes = vec![0u8; dummy_length].into();
                let witness_args = witness_args
                    .as_builder()
                    .lock(Some(dummy_lock).pack())
                    .build();
                witness_args.as_bytes().pack()
            } else {
                witness
            }
        })
        .collect();
    let tx = tx
        .as_advanced_builder()
        .set_witnesses(dummy_witness)
        .build();
    let sighash_all = generate_sighash_all(&tx, lock_indexes, input_len);
    println!("sighash_all = {}", hex::encode(&sighash_all));
    let tags = [Tag::custom(
        TagKind::from(SIGHASH_ALL_TAG_NAME),
        vec![hex::encode(sighash_all)],
    )];
    let event: Event = EventBuilder::new(Kind::from(NOSTR_LOCK_KIND), NOSTR_LOCK_CONTENT, tags)
        .custom_created_at(created_at.into())
        .to_event(key)
        .unwrap();
    let event_json = event.as_json();
    println!("event = {}", event_json);
    println!("event_length = {}", event_json.len());
    let signed_witness: Vec<packed::Bytes> = tx
        .witnesses()
        .into_iter()
        .enumerate()
        .map(|(index, witness)| {
            if index == witness_index {
                let lock: Bytes = Bytes::copy_from_slice(event_json.as_bytes());
                let witness: Bytes = witness.unpack();
                let witness_args = packed::WitnessArgs::new_unchecked(witness);
                assert_eq!(witness_args.lock().to_opt().unwrap().len(), lock.len());
                let witness_args = witness_args.as_builder().lock(Some(lock).pack()).build();
                witness_args.as_bytes().pack()
            } else {
                witness
            }
        })
        .collect();
    let tx = tx
        .as_advanced_builder()
        .set_witnesses(signed_witness)
        .build();
    tx
}

pub fn new_blake2b() -> Blake2b {
    Blake2bBuilder::new(32)
        .personal(b"ckb-default-hash")
        .build()
}

pub fn blake160(data: &[u8]) -> [u8; 20] {
    let mut blake2b = new_blake2b();
    let mut hash = [0u8; 32];
    blake2b.update(data);
    blake2b.finalize(&mut hash);
    let mut ret = [0u8; 20];
    (&mut ret).copy_from_slice(&hash[0..20]);
    ret
}

/// generate sighash_all. The witnesses should be filled with placeholders.
pub fn generate_sighash_all(
    tx: &TransactionView,
    lock_indexes: Vec<usize>,
    input_len: usize,
) -> [u8; 32] {
    let mut count = 0;
    if lock_indexes.is_empty() {
        panic!("not get lock index");
    }

    let witness = tx.witnesses().get(lock_indexes[0]).unwrap();
    let witness: Bytes = witness.unpack();

    let mut blake2b = new_blake2b();
    let mut message = [0u8; 32];

    let tx_hash = tx.data().calc_tx_hash();
    blake2b.update(&tx_hash.raw_data());
    count += 32;
    let witness_data = witness;
    blake2b.update(&(witness_data.len() as u64).to_le_bytes());
    count += 8;
    blake2b.update(&witness_data);
    count += witness_data.len();

    // group
    if lock_indexes.len() > 1 {
        for i in 1..lock_indexes.len() {
            let witness = tx.witnesses().get(lock_indexes[i]).unwrap();

            blake2b.update(&(witness.len() as u64).to_le_bytes());
            count += 8;
            blake2b.update(&witness.raw_data());
            count += witness.raw_data().len();
        }
    }
    let witness_len = tx.witnesses().len();
    if input_len < witness_len {
        for i in input_len..witness_len {
            let witness = tx.witnesses().get(i).unwrap();

            blake2b.update(&(witness.len() as u64).to_le_bytes());
            count += 8;
            blake2b.update(&witness.raw_data());
            count += witness.raw_data().len();
        }
    }
    println!("Hashed {} bytes in sighash_all", count);
    blake2b.finalize(&mut message);
    message
}

pub fn unix_time_now() -> u64 {
    let start = SystemTime::now();
    match start.duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_secs(),
        _ => {
            panic!("duration_since")
        }
    }
}
