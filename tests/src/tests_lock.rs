extern crate hex;
use crate::{
    assert_script_error, get_witness, new_lock_pow_template, new_lock_template, sign_lock_script,
    sign_pow_lock_script, unix_time_now, update_witness, TestConfig, TestSchema, KEY, MAX_CYCLES,
};
use ckb_testtool::ckb_types::{
    bytes::Bytes,
    packed::{self},
    prelude::*,
};

#[test]
fn test_unlock_lock() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let tx = sign_lock_script(TestConfig::default(), vec![0], 1, tx, TestSchema::Normal);
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
    let tx = sign_lock_script(TestConfig::default(), vec![0], 1, tx, TestSchema::Normal);
    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 26);
}

#[test]
fn test_unlock_lock_signature_failed() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let tx = sign_lock_script(
        TestConfig::default(),
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

    let tx = sign_lock_script(TestConfig::default(), vec![0, 1], 2, tx, TestSchema::Normal);
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

    let tx = sign_lock_script(TestConfig::default(), vec![0, 1], 2, tx, TestSchema::Normal);
    let cycles = context
        .verify_tx(&tx, MAX_CYCLES)
        .expect("pass verification");
    println!("consume cycles: {}", cycles);
}

#[test]
fn test_unlock_failed_json() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let tx = sign_lock_script(TestConfig::default(), vec![0], 1, tx, TestSchema::Normal);

    let tx = update_witness(
        tx,
        0,
        packed::WitnessArgs::default()
            .as_builder()
            .lock(Some(Bytes::from("Test".as_bytes())).pack())
            .build()
            .as_bytes(),
    );

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 21);
}

#[test]
fn test_unlock_no_tags() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let tx = sign_lock_script(TestConfig::default(), vec![0], 1, tx, TestSchema::Normal);

    let witness = packed::WitnessArgs::from_slice(&get_witness(&tx, 0))
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

    let tx = update_witness(tx, 0, witness);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 21);
}

#[test]
fn test_unlock_failed_tag_info() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let tx = sign_lock_script(TestConfig::default(), vec![0], 1, tx, TestSchema::Normal);

    let witness = packed::WitnessArgs::from_slice(&get_witness(&tx, 0))
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

    let tx = update_witness(tx, 0, witness);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 11); // SighashAllMismatched
}

#[test]
fn test_unlock_failed_event_id() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let tx = sign_lock_script(TestConfig::default(), vec![0], 1, tx, TestSchema::Normal);

    let witness = packed::WitnessArgs::from_slice(&get_witness(&tx, 0))
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

    let tx = update_witness(tx, 0, witness);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 17); // InvalidEventId
}

#[test]
fn test_unlock_failed_kind() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let mut event = TestConfig::default();
    event.kind += 1;
    let tx = sign_lock_script(event, vec![0], 1, tx, TestSchema::Normal);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 12); // KindMismatched
}

#[test]
fn test_unlock_failed_content() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let mut event = TestConfig::default();
    event.lock_content = "Test a CKB transaction\n\nIMPORTANT: Please verify the integrity and authenticity of connected Nostr client before signing this message\n".to_string();
    let tx = sign_lock_script(event, vec![0], 1, tx, TestSchema::Normal);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 13); // ContentMismatched
}

#[test]
fn test_unlock_failed_args_len() {
    let (context, tx, _) = new_lock_template(TestSchema::WrongArgsLen);

    let event = TestConfig::default();
    let tx = sign_lock_script(event, vec![0], 1, tx, TestSchema::Normal);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 15); // InvalidScriptArgs
}

#[test]
fn test_unlock_empty_witness() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let tx = sign_lock_script(TestConfig::default(), vec![0], 1, tx, TestSchema::Normal);

    let witness = packed::WitnessArgs::default()
        .as_builder()
        .lock(Some(Bytes::new()).pack())
        .build()
        .as_bytes();

    let tx = update_witness(tx, 0, witness);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 21);
}

#[test]
fn test_unlock_empty_witnesses() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let tx = sign_lock_script(TestConfig::default(), vec![0], 1, tx, TestSchema::Normal);
    let tx = tx.as_advanced_builder().set_witnesses(Vec::new()).build();

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 1);
}

#[test]
fn test_unlock_failed_sign_format() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let tx = sign_lock_script(TestConfig::default(), vec![0], 1, tx, TestSchema::Normal);

    let witness = packed::WitnessArgs::from_slice(&get_witness(&tx, 0))
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

    let tx = update_witness(tx, 0, witness);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 19); // InvalidSignatureFormat
}

#[test]
fn test_unlock_failed_sign_format2() {
    let (context, tx, _) = new_lock_template(TestSchema::Normal);
    let event = TestConfig::default();
    let tx = sign_lock_script(event, vec![0], 1, tx, TestSchema::WrongSignLen);

    let witness = packed::WitnessArgs::from_slice(&get_witness(&tx, 0))
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

    let tx = update_witness(tx, 0, witness);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 19); // InvalidSignatureFormat
}
