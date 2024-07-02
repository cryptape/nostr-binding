extern crate hex;
use crate::{
    assert_script_error, blake160, new_blake2b, sign_lock_script, sign_pow_lock_script,
    type_script_mint, unix_time_now, TestEvent, TestSchema, MAX_CYCLES,
};
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
use lazy_static::lazy_static;
use nostr::prelude::*;

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
fn new_type_mint_template(schema: TestSchema) -> (Context, TransactionView, Script) {
    let mut context = Context::default();
    context.set_capture_debug(false);
    let type_out_point = context.deploy_cell(NOSTR_BINDING_BIN.clone());
    let always_success_out_point = context.deploy_cell(ALWAYS_SUCCESS.clone());
    let always_success_script = context
        .build_script(&always_success_out_point, Bytes::new())
        .unwrap();
    // prepare input cell. This cell will be consumed to generated the global
    // unique id.
    let input_out_point = context.create_cell(
        packed::CellOutput::new_builder()
            .capacity(1000u64.pack())
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

    let type_script = context
        .build_script(&type_out_point, Bytes::from(args))
        .unwrap();

    let outputs = vec![packed::CellOutput::new_builder()
        .capacity(1000u64.pack())
        .lock(always_success_script)
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

//
// generate a template transaction:
// 1 input cell locked by nostr lock script
// 2 output cells
//
fn new_lock_template(schema: TestSchema) -> (Context, TransactionView, Script) {
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
fn new_lock_pow_template(_schema: TestSchema) -> (Context, TransactionView, u8) {
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

#[test]
fn test_unlock_lock() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let tx = sign_lock_script(TestEvent::new(&KEY), vec![0], 1, tx, TestSchema::Normal);
    let cycles = context
        .verify_tx(&tx, MAX_CYCLES)
        .expect("pass verification");
    println!("consume cycles: {}", cycles);
}

#[test]
fn test_unlock_lock_pow() {
    let (context, tx, pow_difficulty) = new_lock_pow_template(TestSchema::Normal);
    let created_at = unix_time_now();
    let tx = sign_pow_lock_script(
        &KEY,
        created_at,
        vec![0],
        1,
        pow_difficulty,
        tx,
        TestSchema::Normal,
    );
    let cycles = context
        .verify_tx(&tx, MAX_CYCLES)
        .expect("pass verification");
    println!("consume cycles: {}", cycles);
}

#[test]
fn test_unlock_lock_pow_failed_difficulty() {
    let (context, tx, pow_difficulty) = new_lock_pow_template(TestSchema::Normal);
    let created_at = unix_time_now();
    let tx = sign_pow_lock_script(
        &KEY,
        created_at,
        vec![0],
        1,
        pow_difficulty - 1,
        tx,
        TestSchema::Normal,
    );
    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 23);
}

#[test]
fn test_unlock_lock_pubkey_failed() {
    let (context, tx, _) = new_lock_template(TestSchema::WrongPubkey);
    let tx = sign_lock_script(TestEvent::new(&KEY), vec![0], 1, tx, TestSchema::Normal);
    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 26);
}

#[test]
fn test_unlock_lock_signature_failed() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let tx = sign_lock_script(
        TestEvent::new(&KEY),
        vec![0],
        1,
        tx,
        TestSchema::WrongSignature,
    );
    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 18);
}

#[test]
fn test_unlock_2_lock() {
    let (mut context, tx, lock_script) = new_lock_template(TestSchema::Normal);
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

    // append one cell to input
    let tx = tx.as_advanced_builder().input(input).build();

    let tx = sign_lock_script(TestEvent::new(&KEY), vec![0, 1], 2, tx, TestSchema::Normal);
    let cycles = context
        .verify_tx(&tx, MAX_CYCLES)
        .expect("pass verification");
    println!("consume cycles: {}", cycles);
}

#[test]
fn test_unlock_lock_extra_witness() {
    let (mut context, tx, lock_script) = new_lock_template(TestSchema::Normal);
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

    // append one cell to input
    // append extra large witness
    let tx = tx
        .as_advanced_builder()
        .input(input)
        .witnesses(vec![Bytes::new(), Bytes::from(vec![0u8; 600_000])].pack())
        .build();

    let tx = sign_lock_script(TestEvent::new(&KEY), vec![0, 1], 2, tx, TestSchema::Normal);
    let cycles = context
        .verify_tx(&tx, MAX_CYCLES)
        .expect("pass verification");
    println!("consume cycles: {}", cycles);
}

#[test]
fn test_mint() {
    let (context, tx, _script) = new_type_mint_template(TestSchema::Normal);
    let cycles = context
        .verify_tx(&tx, MAX_CYCLES)
        .expect("pass verification");
    println!("consume cycles: {}", cycles);
}

#[test]
fn test_mint_failed_wrong_id() {
    let (context, tx, _script) = new_type_mint_template(TestSchema::WrongId);
    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 54);
}

#[test]
fn test_mint_failed_wrong_global_unique_id() {
    let (context, tx, _script) = new_type_mint_template(TestSchema::WrongGlobalUniqueId);
    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 60);
}

#[test]
fn test_mint_failed_wrong_global_unique_id2() {
    let (context, tx, _script) = new_type_mint_template(TestSchema::WrongGlobalUniqueId2);
    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 58);
}

#[test]
fn test_unlock_failed_json() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let tx = sign_lock_script(TestEvent::new(&KEY), vec![0], 1, tx, TestSchema::Normal);

    let witnesses = tx.witnesses();
    let mut witnesses: Vec<Bytes> = witnesses.into_iter().map(|f| f.as_bytes()).collect();

    let witness = packed::WitnessArgs::default()
        .as_builder()
        .lock(Some(Bytes::from("Test".as_bytes())).pack())
        .build()
        .as_bytes();

    witnesses[0] = witness;

    let tx = tx
        .as_advanced_builder()
        .set_witnesses(witnesses.iter().map(|f| f.pack()).collect())
        .build();

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 21);
}

#[test]
fn test_unlock_no_tags() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let tx = sign_lock_script(TestEvent::new(&KEY), vec![0], 1, tx, TestSchema::Normal);

    let witnesses = tx.witnesses();
    let mut witnesses: Vec<Bytes> = witnesses.into_iter().map(|f| f.as_bytes()).collect();

    let witness = packed::WitnessArgs::from_slice(&witnesses[0].to_vec()[4..])
        .unwrap()
        .lock()
        .to_opt()
        .unwrap()
        .as_slice()[4..]
        .to_vec();

    let witness = String::from_utf8(witness).unwrap();
    let witness = witness.replace("tags", "test").as_bytes().to_vec();

    let witness = packed::WitnessArgs::default()
        .as_builder()
        .lock(Some(Bytes::from(witness)).pack())
        .build()
        .as_bytes();

    witnesses[0] = witness;

    let tx = tx
        .as_advanced_builder()
        .set_witnesses(witnesses.iter().map(|f| f.pack()).collect())
        .build();

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 21);
}

#[test]
fn test_unlock_failed_tag_info() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let tx = sign_lock_script(TestEvent::new(&KEY), vec![0], 1, tx, TestSchema::Normal);

    let witnesses = tx.witnesses();
    let mut witnesses: Vec<Bytes> = witnesses.into_iter().map(|f| f.as_bytes()).collect();

    let witness = packed::WitnessArgs::from_slice(&witnesses[0].to_vec()[4..])
        .unwrap()
        .lock()
        .to_opt()
        .unwrap()
        .as_slice()[4..]
        .to_vec();

    let witness = String::from_utf8(witness).unwrap();
    let witness = witness
        .replace("ckb_sighash_all", "ckb_sighash_lll")
        .as_bytes()
        .to_vec();

    let witness = packed::WitnessArgs::default()
        .as_builder()
        .lock(Some(Bytes::from(witness)).pack())
        .build()
        .as_bytes();

    witnesses[0] = witness;

    let tx = tx
        .as_advanced_builder()
        .set_witnesses(witnesses.iter().map(|f| f.pack()).collect())
        .build();

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 11); // SighashAllMismatched
}

#[test]
fn test_unlock_failed_event_id() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let tx = sign_lock_script(TestEvent::new(&KEY), vec![0], 1, tx, TestSchema::Normal);

    let witnesses = tx.witnesses();
    let mut witnesses: Vec<Bytes> = witnesses.into_iter().map(|f| f.as_bytes()).collect();

    let witness = packed::WitnessArgs::from_slice(&witnesses[0].to_vec()[4..])
        .unwrap()
        .lock()
        .to_opt()
        .unwrap()
        .as_slice()[4..]
        .to_vec();

    let witness = String::from_utf8(witness).unwrap();

    let mut v = serde_json::from_str::<serde_json::Value>(&witness).unwrap();

    if let Some(obj) = v.as_object_mut() {
        obj.insert(
            "id".to_string(),
            serde_json::json!("00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"),
        );
    }

    let witness = serde_json::to_string(&v).unwrap().as_bytes().to_vec();

    let witness = packed::WitnessArgs::default()
        .as_builder()
        .lock(Some(Bytes::from(witness)).pack())
        .build()
        .as_bytes();

    witnesses[0] = witness;

    let tx = tx
        .as_advanced_builder()
        .set_witnesses(witnesses.iter().map(|f| f.pack()).collect())
        .build();

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 17); // InvalidEventId
}

#[test]
fn test_unlock_failed_kind() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let mut event = TestEvent::new(&KEY);
    event.kind += 1;
    let tx = sign_lock_script(event, vec![0], 1, tx, TestSchema::Normal);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 12); // KindMismatched
}

#[test]
fn test_unlock_failed_content() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let mut event = TestEvent::new(&KEY);
    event.lock_content = "Test a CKB transaction\n\nIMPORTANT: Please verify the integrity and authenticity of connected Nostr client before signing this message\n".to_string();
    let tx = sign_lock_script(event, vec![0], 1, tx, TestSchema::Normal);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 13); // ContentMismatched
}

#[test]
fn test_unlock_failed_args_len() {
    let (context, tx, _) = new_lock_template(TestSchema::WrongArgsLen);

    let event = TestEvent::new(&KEY);
    let tx = sign_lock_script(event, vec![0], 1, tx, TestSchema::Normal);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 15); // InvalidScriptArgs
}

#[test]
fn test_unlock_empty_witness() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let tx = sign_lock_script(TestEvent::new(&KEY), vec![0], 1, tx, TestSchema::Normal);

    let witnesses = tx.witnesses();
    let mut witnesses: Vec<Bytes> = witnesses.into_iter().map(|f| f.as_bytes()).collect();

    let witness = packed::WitnessArgs::default()
        .as_builder()
        .lock(Some(Bytes::new()).pack())
        .build()
        .as_bytes();

    witnesses[0] = witness;

    let tx = tx
        .as_advanced_builder()
        .set_witnesses(witnesses.iter().map(|f| f.pack()).collect())
        .build();

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 21);
}

#[test]
fn test_unlock_empty_witnesses() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let tx = sign_lock_script(TestEvent::new(&KEY), vec![0], 1, tx, TestSchema::Normal);
    let tx = tx.as_advanced_builder().set_witnesses(Vec::new()).build();

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 1);
}

#[test]
fn test_unlock_failed_sign_format() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let tx = sign_lock_script(TestEvent::new(&KEY), vec![0], 1, tx, TestSchema::Normal);

    let mut witnesses: Vec<Bytes> = tx.witnesses().into_iter().map(|f| f.as_bytes()).collect();
    let witness = packed::WitnessArgs::from_slice(&witnesses[0].to_vec()[4..])
        .unwrap()
        .lock()
        .to_opt()
        .unwrap()
        .as_slice()[4..]
        .to_vec();

    let mut witness =
        serde_json::from_str::<serde_json::Value>(&String::from_utf8(witness).unwrap()).unwrap();

    // let sig = witness.get("sig").unwrap().as_str().unwrap();
    if let Some(obj) = witness.as_object_mut() {
        obj.insert(
            "sig".to_string(),
            serde_json::json!("yy112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"),
        );
    }

    let witness = serde_json::to_string(&witness).unwrap().as_bytes().to_vec();

    let witness = packed::WitnessArgs::default()
        .as_builder()
        .lock(Some(Bytes::from(witness)).pack())
        .build()
        .as_bytes();

    witnesses[0] = witness;

    let tx = tx
        .as_advanced_builder()
        .set_witnesses(witnesses.iter().map(|f| f.pack()).collect())
        .build();

    let tx = tx
        .as_advanced_builder()
        .set_witnesses(witnesses.iter().map(|f| f.pack()).collect())
        .build();

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 19); // InvalidSignatureFormat
}

#[test]
fn test_unlock_failed_sign_format2() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let event = TestEvent::new(&KEY);
    let tx = sign_lock_script(event, vec![0], 1, tx, TestSchema::WrongSignLen);

    let mut witnesses: Vec<Bytes> = tx.witnesses().into_iter().map(|f| f.as_bytes()).collect();
    let witness = packed::WitnessArgs::from_slice(&witnesses[0].to_vec()[4..])
        .unwrap()
        .lock()
        .to_opt()
        .unwrap()
        .as_slice()[4..]
        .to_vec();

    let mut witness =
        serde_json::from_str::<serde_json::Value>(&String::from_utf8(witness).unwrap()).unwrap();

    // let sig = witness.get("sig").unwrap().as_str().unwrap();
    if let Some(obj) = witness.as_object_mut() {
        obj.insert(
            "sig".to_string(),
            serde_json::json!("112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"),
        );
    }

    let witness = serde_json::to_string(&witness).unwrap();
    println!("==== witness: {}", witness);

    let witness = witness.as_bytes().to_vec();

    let witness = packed::WitnessArgs::default()
        .as_builder()
        .lock(Some(Bytes::from(witness)).pack())
        .build()
        .as_bytes();

    witnesses[0] = witness;

    let tx = tx
        .as_advanced_builder()
        .set_witnesses(witnesses.iter().map(|f| f.pack()).collect())
        .build();

    let tx = tx
        .as_advanced_builder()
        .set_witnesses(witnesses.iter().map(|f| f.pack()).collect())
        .build();

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 19); // InvalidSignatureFormat
}
