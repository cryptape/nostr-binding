#[cfg(test)]
mod tests_lock;

#[cfg(test)]
mod tests_type;

#[cfg(test)]
mod tests_both;

use ::hex;
use ckb_testtool::{
    builtin::ALWAYS_SUCCESS,
    ckb_types::{
        bytes::Bytes,
        core::{TransactionBuilder, TransactionView},
        packed::{self, Script, WitnessArgsBuilder},
        prelude::*,
    },
    context::Context,
};
use ckb_testtool::{
    ckb_error::Error as CkbError,
    ckb_hash::{Blake2b, Blake2bBuilder},
};
use lazy_static::lazy_static;
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
    WrongMultiTypeCell,
    Normal,
}

pub struct TestConfig {
    pub key: Keys,
    pub created_at: u64,
    pub kind: u16,
    pub lock_content: String,
}

impl TestConfig {
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

impl Default for TestConfig {
    fn default() -> Self {
        Self::new(&KEY)
    }
}

///
/// sign a transaction for a nostr lock script, with key, timestamp and witness index
///
pub fn sign_lock_script(
    test_event: TestConfig,
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

lazy_static! {
    static ref NOSTR_LOCK_BIN: Bytes = {
        let bin = include_bytes!("../../build/release/nostr-lock");
        bin.to_vec().into()
    };
    static ref NOSTR_BINDING_BIN: Bytes = {
        let bin = include_bytes!("../../build/release/nostr-binding");
        bin.to_vec().into()
    };
    static ref KEY: Keys = {
        Keys::parse("a9e5f16529cbe055c1f7b6d928b980a2ee0cc0a1f07a8444b85b72b3f1d5c6ba").unwrap()
    };
}

///
/// a nostr type binding mint transaction template
/// 1 input cell with always success lock script
/// 1 output cell with nostr type binding type script
///
pub fn new_type_mint_template(schema: TestSchema) -> (Context, TransactionView, Script) {
    let mut context = Context::default();
    context.set_capture_debug(false);
    let type_out_point = context.deploy_cell(NOSTR_BINDING_BIN.clone());
    let always_success_out_point = context.deploy_cell(ALWAYS_SUCCESS.clone());
    let always_success_script = context
        .build_script(&always_success_out_point, Bytes::new())
        .unwrap();
    // prepare input cell. This cell will be consumed to generated the global
    // unique id.
    let count: u64 = if schema == TestSchema::WrongMultiTypeCell {
        2
    } else {
        1
    };
    const CAPACITY: u64 = 1000;

    let input_out_point = context.create_cell(
        packed::CellOutput::new_builder()
            .capacity((CAPACITY * count).pack())
            .lock(always_success_script.clone())
            .build(),
        Bytes::new(),
    );
    let input = packed::CellInput::new_builder()
        .previous_output(input_out_point.clone())
        .build();

    let mut blake2b = new_blake2b();
    blake2b.update(input.as_slice());
    blake2b.update(&0u64.to_le_bytes());
    let mut global_unique_id = [0u8; 32];
    blake2b.finalize(&mut global_unique_id);

    if schema == TestSchema::WrongGlobalUniqueId2 {
        global_unique_id[0] ^= 1;
    }
    let (json, mut id) = type_script_mint(
        &KEY,
        unix_time_now(),
        "hello,world".into(),
        global_unique_id,
    );
    // reset it to correct value
    if schema == TestSchema::WrongGlobalUniqueId2 {
        global_unique_id[0] ^= 1;
    }
    if schema == TestSchema::WrongId {
        id[0] ^= 1;
    }
    if schema == TestSchema::WrongGlobalUniqueId {
        global_unique_id[0] ^= 1;
    }
    let mut args = vec![];
    args.extend(&id);
    args.extend(&global_unique_id);
    assert_eq!(args.len(), 64);

    if schema == TestSchema::WrongArgsLen {
        args.extend([0u8; 1]);
    }

    let type_script = context
        .build_script(&type_out_point, Bytes::from(args))
        .unwrap();

    let mut outputs = vec![packed::CellOutput::new_builder()
        .capacity(CAPACITY.pack())
        .lock(always_success_script.clone())
        .type_(Some(type_script.clone()).pack())
        .build()];
    let mut outputs_data = vec![Bytes::new()];
    if schema == TestSchema::WrongMultiTypeCell {
        outputs.push(
            packed::CellOutput::new_builder()
                .capacity(CAPACITY.pack())
                .lock(always_success_script)
                .type_(Some(type_script.clone()).pack())
                .build(),
        );
        outputs_data.push(Bytes::new());
    }

    let witness = WitnessArgsBuilder::default()
        .output_type(Some(json).pack())
        .build();
    let witness = witness.as_bytes();
    let tx = TransactionBuilder::default()
        .input(input)
        .outputs(outputs)
        .outputs_data(outputs_data.pack())
        .witness(witness.pack())
        .build();
    let tx = context.complete_tx(tx);
    (context, tx, type_script)
}

//
// generate a template transaction:
// 1 input cell locked by nostr lock script
// 2 output cells
//
pub fn new_lock_template(schema: TestSchema) -> (Context, TransactionView, Script) {
    let mut context = Context::default();
    context.set_capture_debug(false);
    let lock_out_point = context.deploy_cell(NOSTR_LOCK_BIN.clone());
    let pubkey = KEY.public_key().to_bytes().to_vec();
    let mut args = [0u8; 21];
    let pubkey_hash = blake160(&pubkey);
    (&mut args[1..21]).copy_from_slice(&pubkey_hash);
    if schema == TestSchema::WrongPubkey {
        args[1] ^= 1;
    }

    let args = if schema == TestSchema::WrongArgsLen {
        Bytes::copy_from_slice(&vec![args.to_vec(), vec![00u8]].concat())
    } else {
        Bytes::copy_from_slice(&args)
    };
    let lock_script = context
        .build_script(&lock_out_point, args.into())
        .expect("lock script");

    // prepare input cells
    let input_out_point = context.create_cell(
        packed::CellOutput::new_builder()
            .capacity(1000u64.pack())
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );
    let input = packed::CellInput::new_builder()
        .previous_output(input_out_point.clone())
        .build();

    let outputs = vec![
        packed::CellOutput::new_builder()
            .capacity(500u64.pack())
            .lock(lock_script.clone())
            .build(),
        packed::CellOutput::new_builder()
            .capacity(500u64.pack())
            .lock(lock_script.clone())
            .build(),
    ];

    let outputs_data = vec![Bytes::new(), Bytes::new()];

    let tx = TransactionBuilder::default()
        .input(input)
        .outputs(outputs)
        .outputs_data(outputs_data.pack())
        .witness(Bytes::new().pack())
        .build();
    let tx = context.complete_tx(tx);
    (context, tx, lock_script)
}

//
// generate a template transaction:
// 1 input cell locked by nostr lock script. Unlocked by PoW method.
// 2 output cells
//
pub fn new_lock_pow_template(_schema: TestSchema) -> (Context, TransactionView, u8) {
    let pow_difficult = 3;
    let mut context = Context::default();
    context.set_capture_debug(false);
    let lock_out_point = context.deploy_cell(NOSTR_LOCK_BIN.clone());
    let mut args = [0u8; 21];
    // Set PoW difficulty
    args[0] = pow_difficult;

    let args = Bytes::copy_from_slice(&args);
    let lock_script = context
        .build_script(&lock_out_point, args.into())
        .expect("lock script");

    // prepare input cells
    let input_out_point = context.create_cell(
        packed::CellOutput::new_builder()
            .capacity(1000u64.pack())
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );
    let input = packed::CellInput::new_builder()
        .previous_output(input_out_point.clone())
        .build();

    let outputs = vec![
        packed::CellOutput::new_builder()
            .capacity(500u64.pack())
            .lock(lock_script.clone())
            .build(),
        packed::CellOutput::new_builder()
            .capacity(500u64.pack())
            .lock(lock_script.clone())
            .build(),
    ];

    let outputs_data = vec![Bytes::new(), Bytes::new()];

    let tx = TransactionBuilder::default()
        .input(input)
        .outputs(outputs)
        .outputs_data(outputs_data.pack())
        .witness(Bytes::new().pack())
        .build();
    let tx = context.complete_tx(tx);
    (context, tx, pow_difficult)
}

pub fn new_both_template(schema: TestSchema) -> (Context, TransactionView, Script) {
    let mut context = Context::default();
    context.set_capture_debug(false);
    let type_out_point = context.deploy_cell(NOSTR_BINDING_BIN.clone());
    let lock_out_point = context.deploy_cell(NOSTR_LOCK_BIN.clone());
    let pubkey = KEY.public_key().to_bytes().to_vec();
    let pubkey_hash = blake160(&pubkey);
    let mut args = [0u8; 21];
    (&mut args[1..21]).copy_from_slice(&pubkey_hash);
    let lock_script = context
        .build_script(&lock_out_point, Bytes::copy_from_slice(&args))
        .expect("lock script");

    // prepare input cell. This cell will be consumed to generated the global
    // unique id.
    let input_out_point = context.create_cell(
        packed::CellOutput::new_builder()
            .capacity(1000u64.pack())
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );
    let input = packed::CellInput::new_builder()
        .previous_output(input_out_point.clone())
        .build();

    let mut blake2b = new_blake2b();
    blake2b.update(input.as_slice());
    blake2b.update(&0u64.to_le_bytes());
    let mut global_unique_id = [0u8; 32];
    blake2b.finalize(&mut global_unique_id);

    if schema == TestSchema::WrongGlobalUniqueId2 {
        global_unique_id[0] ^= 1;
    }
    let (json, mut id) = type_script_mint(
        &KEY,
        unix_time_now(),
        "hello,world".into(),
        global_unique_id,
    );
    // reset it to correct value
    if schema == TestSchema::WrongGlobalUniqueId2 {
        global_unique_id[0] ^= 1;
    }
    if schema == TestSchema::WrongId {
        id[0] ^= 1;
    }
    if schema == TestSchema::WrongGlobalUniqueId {
        global_unique_id[0] ^= 1;
    }
    let mut args = vec![];
    args.extend(&id);
    args.extend(&global_unique_id);
    assert_eq!(args.len(), 64);

    let type_script = context
        .build_script(&type_out_point, Bytes::from(args))
        .unwrap();

    let outputs = vec![packed::CellOutput::new_builder()
        .capacity(1000u64.pack())
        .lock(lock_script)
        .type_(Some(type_script.clone()).pack())
        .build()];
    let outputs_data = vec![Bytes::new()];

    let witness = WitnessArgsBuilder::default()
        .output_type(Some(json).pack())
        .build();
    let witness = witness.as_bytes();
    let tx = TransactionBuilder::default()
        .input(input)
        .outputs(outputs)
        .outputs_data(outputs_data.pack())
        .witness(witness.pack())
        .build();
    let tx = context.complete_tx(tx);
    (context, tx, type_script)
}

pub fn get_witness(tx: &TransactionView, index: usize) -> Vec<u8> {
    let ws: Vec<Bytes> = tx.witnesses().into_iter().map(|f| f.as_bytes()).collect();
    let w = ws.get(index).unwrap();
    w.to_vec()[4..].to_vec()
}

pub fn update_witness(tx: TransactionView, index: usize, w: Bytes) -> TransactionView {
    let mut ws: Vec<packed::Bytes> = tx.witnesses().into_iter().map(|f| f.into()).collect();
    ws[index] = w.pack();
    tx.as_advanced_builder().set_witnesses(ws).build()
}
