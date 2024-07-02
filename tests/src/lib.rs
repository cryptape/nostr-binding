#[cfg(test)]
mod tests;

use ::hex;
use ckb_testtool::{
    ckb_error::Error as CkbError,
    ckb_hash::{Blake2b, Blake2bBuilder},
    ckb_types::{bytes::Bytes, core::TransactionView, packed, prelude::*},
};
use nostr::prelude::*;
use std::{
    str::FromStr,
    time::{SystemTime, UNIX_EPOCH},
};

pub const MAX_CYCLES: u64 = 70_000_000;
pub const SIGHASH_ALL_TAG_NAME: &str = "ckb_sighash_all";
pub const NOSTR_LOCK_KIND: u16 = 23334;
pub const SCRIPT_ARGS_LEN: usize = 33;
pub const NOSTR_LOCK_CONTENT: &str = "Signing a CKB transaction\n\nIMPORTANT: Please verify the integrity and authenticity of connected Nostr client before signing this message\n";
pub const NONCE: &str = "nonce";
pub const GLOBAL_UNIQUE_ID_TAG_NAME: &str = "ckb_global_unique_id";

#[derive(Clone, PartialEq)]
pub enum TestSchema {
    WrongPubkey,
    WrongSignature,
    WrongSignatureFormat,
    WrongId,
    WrongGlobalUniqueId,
    WrongGlobalUniqueId2,
    WrongArgsLen,
    WrongSignLen,
    Normal,
}

pub struct TestEvent {
    pub key: Keys,
    pub created_at: u64,
    pub kind: u16,
    pub lock_content: String,
}

impl TestEvent {
    pub fn new(key: &Keys) -> Self {
        Self {
            key: key.clone(),
            created_at: unix_time_now(),
            kind: NOSTR_LOCK_KIND,
            lock_content: NOSTR_LOCK_CONTENT.to_string(),
        }
    }

    pub fn get_event(&self, sighash_all: [u8; 32]) -> Event {
        let tags = [Tag::custom(
            TagKind::from(SIGHASH_ALL_TAG_NAME),
            vec![hex::encode(sighash_all)],
        )];
        EventBuilder::new(Kind::from(self.kind), &self.lock_content, tags)
            .custom_created_at(self.created_at.into())
            .to_event(&self.key)
            .unwrap()
    }
}

///
/// sign a transaction for a nostr lock script, with key, timestamp and witness index
///
pub fn sign_lock_script(
    test_event: TestEvent,
    lock_indexes: Vec<usize>,
    input_len: usize,
    tx: TransactionView,
    schema: TestSchema,
) -> TransactionView {
    assert!(lock_indexes.len() > 0);
    let dummy_event = test_event.get_event([0u8; 32]);

    let dummy_json = dummy_event.as_json();
    println!("dummy_json = {}", dummy_json);
    let mut dummy_length = dummy_json.len();
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
                if schema == TestSchema::WrongSignLen {
                    dummy_length -= 2;
                }

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
    let event = test_event.get_event(sighash_all);
    let event = if schema == TestSchema::WrongSignature {
        Event::new(
            event.id(),
            event.author(),
            event.created_at(),
            event.kind(),
            event.clone().into_iter_tags(),
            event.content(),
            // an invalid signature
            Signature::from_str("a9e5f16529cbe055c1f7b6d928b980a2ee0cc0a1f07a8444b85b72b3f1d5c6baa9e5f16529cbe055c1f7b6d928b980a2ee0cc0a1f07a8444b85b72b3f1d5c6ba").unwrap()
        )
    } else {
        event
    };
    let event_json = event.as_json();
    println!("event = {}", event_json);
    println!("event_length = {}", event_json.len());
    let signed_witness: Vec<packed::Bytes> = tx
        .witnesses()
        .into_iter()
        .enumerate()
        .map(|(index, witness)| {
            if index == witness_index {
                let lock: Bytes = event_json.clone().into();
                let witness: Bytes = witness.unpack();
                let witness_args = packed::WitnessArgs::new_unchecked(witness);
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

///
/// sign a transaction for a nostr lock script with PoW
///
pub fn sign_pow_lock_script(
    key: &Keys,
    created_at: u64,
    lock_indexes: Vec<usize>,
    input_len: usize,
    pow_difficult: u8,
    tx: TransactionView,
    _schema: TestSchema,
) -> TransactionView {
    // reserve nonce to a fixed length string(length = 10)
    let tags = [
        Tag::custom(
            TagKind::from(SIGHASH_ALL_TAG_NAME),
            vec![hex::encode([0u8; 32])],
        ),
        Tag::custom(
            TagKind::from("nonce"),
            vec![String::from("0000000000"), format!("{}", pow_difficult)],
        ),
    ];
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

    let event_json: String;
    let mut nonce = 0;
    // mining
    loop {
        let tags = [
            Tag::custom(
                TagKind::from(SIGHASH_ALL_TAG_NAME),
                vec![hex::encode(sighash_all)],
            ),
            Tag::custom(
                TagKind::from("nonce"),
                vec![format!("{:010}", nonce), format!("{}", pow_difficult)],
            ),
        ];
        let event: Event = EventBuilder::new(Kind::from(NOSTR_LOCK_KIND), NOSTR_LOCK_CONTENT, tags)
            .custom_created_at(created_at.into())
            .to_event(key)
            .unwrap();
        if event.id().check_pow(pow_difficult) {
            event_json = event.as_json();
            break;
        }
        nonce += 1;
        if nonce % 10000 == 0 {
            println!("mining progress {}", nonce);
        }
    }
    println!("event = {}", event_json);
    println!("event_length = {}", event_json.len());
    let signed_witness: Vec<packed::Bytes> = tx
        .witnesses()
        .into_iter()
        .enumerate()
        .map(|(index, witness)| {
            if index == witness_index {
                let lock: Bytes = event_json.clone().into();
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
///
/// while minting, an valid `event` must be provided
///
pub fn type_script_mint(
    key: &Keys,
    created_at: u64,
    content: String,
    global_unique_id: [u8; 32],
) -> (Bytes, [u8; 32]) {
    let tags = [Tag::custom(
        TagKind::from(GLOBAL_UNIQUE_ID_TAG_NAME),
        vec![hex::encode(global_unique_id)],
    )];
    let event: Event = EventBuilder::new(Kind::from(0), content, tags)
        .custom_created_at(created_at.into())
        .to_event(key)
        .unwrap();
    (event.as_json().into(), event.id().to_bytes())
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

/// generate sighash_all. The witnesses should be filled with placeholders before calling.
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
            if let Some(witness) = tx.witnesses().get(lock_indexes[i]) {
                blake2b.update(&(witness.len() as u64).to_le_bytes());
                count += 8;
                blake2b.update(&witness.raw_data());
                count += witness.raw_data().len();
            }
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

pub fn assert_script_error(err: CkbError, err_code: i8) {
    let error_string = err.to_string();
    assert!(
        error_string.contains(format!("error code {} ", err_code).as_str()),
        "error_string: {}, expected_error_code: {}",
        error_string,
        err_code
    );
}
