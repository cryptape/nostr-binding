extern crate hex;
use crate::{
    assert_script_error, get_witness, new_type_mint_template, update_witness, TestSchema,
    MAX_CYCLES,
};
use ckb_testtool::ckb_types::{bytes::Bytes, packed, prelude::*};

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
fn test_mint_failed_args_len() {
    let (context, tx, _script) = new_type_mint_template(TestSchema::WrongArgsLen);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 52); // WrongArgsLength
}

#[test]
fn test_mint_failed_too_many_type_id_cell() {
    let (context, tx, _script) = new_type_mint_template(TestSchema::WrongMultiTypeCell);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 59); // WrongArgsLength
}

#[test]
fn test_mint_failed_witness_utf8() {
    let (context, tx, _script) = new_type_mint_template(TestSchema::Normal);

    let mut w = get_witness(&tx, 0);
    w.resize(w.len(), 0);

    let witness = packed::WitnessArgs::default()
        .as_builder()
        .output_type(Some(Bytes::from(w)).pack())
        .build()
        .as_bytes();
    let tx = update_witness(tx, 0, witness);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 57); // Json
}

#[test]
fn test_mint_failed_witness_json() {
    let (context, tx, _script) = new_type_mint_template(TestSchema::Normal);

    let witness = packed::WitnessArgs::default()
        .as_builder()
        .output_type(Some(Bytes::from("Hello".as_bytes())).pack())
        .build()
        .as_bytes();
    let tx = update_witness(tx, 0, witness);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 57); // Json
}

#[test]
fn test_mint_failed_empty_witness() {
    let (context, tx, _script) = new_type_mint_template(TestSchema::Normal);

    let witness = packed::WitnessArgs::default()
        .as_builder()
        .output_type(Some(Bytes::new()).pack())
        .build()
        .as_bytes();
    let tx = update_witness(tx, 0, witness);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 57); // Json
}

#[test]
fn test_mint_failed_empty_witnesses() {
    let (context, tx, _script) = new_type_mint_template(TestSchema::Normal);

    let tx = tx.as_advanced_builder().set_witnesses(Vec::new()).build();

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 1);
}

#[test]
fn test_mint_failed_verify_id() {
    let (context, tx, _script) = new_type_mint_template(TestSchema::Normal);

    let w = packed::WitnessArgs::from_slice(&get_witness(&tx, 0))
        .unwrap()
        .output_type()
        .to_opt()
        .unwrap()
        .as_slice()[4..]
        .to_vec();

    let mut w: serde_json::Value = serde_json::from_slice(&w).expect("parse utf8");
    if let Some(obj) = w.as_object_mut() {
        obj.insert(
            "id".to_string(),
            serde_json::json!("00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"),
        );
    }
    let witness = serde_json::to_string(&w).unwrap().as_bytes().to_vec();

    let witness = packed::WitnessArgs::default()
        .as_builder()
        .output_type(Some(Bytes::from(witness)).pack())
        .build()
        .as_bytes();
    let tx = update_witness(tx, 0, witness);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 54); // InvalidEventId
}

#[test]
fn test_mint_failed_no_tags() {
    let (context, tx, _script) = new_type_mint_template(TestSchema::Normal);

    let w = packed::WitnessArgs::from_slice(&get_witness(&tx, 0))
        .unwrap()
        .output_type()
        .to_opt()
        .unwrap()
        .as_slice()[4..]
        .to_vec();

    let w = String::from_utf8(w).expect("parse utf8");
    let w = w.replace("tags", "test").as_bytes().to_vec();

    let witness = packed::WitnessArgs::default()
        .as_builder()
        .output_type(Some(Bytes::from(w)).pack())
        .build()
        .as_bytes();
    let tx = update_witness(tx, 0, witness);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 57);
}

#[test]
fn test_mint_failed_sig() {
    let (context, tx, _script) = new_type_mint_template(TestSchema::Normal);

    let w = packed::WitnessArgs::from_slice(&get_witness(&tx, 0))
        .unwrap()
        .output_type()
        .to_opt()
        .unwrap()
        .as_slice()[4..]
        .to_vec();

    let mut w: serde_json::Value = serde_json::from_slice(&w).expect("parse utf8");
    if let Some(obj) = w.as_object_mut() {
        obj.insert(
            "sig".to_string(),
            serde_json::json!("69007ef8db77572548f47c84eec396f9c288e361023573e28190861949fc47ec4356e665f341f39ef714a071560ce003e51872b952548c9b5173db899906e92a"),
        );
    }
    let witness = serde_json::to_string(&w).unwrap().as_bytes().to_vec();

    let witness = packed::WitnessArgs::default()
        .as_builder()
        .output_type(Some(Bytes::from(witness)).pack())
        .build()
        .as_bytes();
    let tx = update_witness(tx, 0, witness);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 50); // ValidationFail
}

#[test]
fn test_mint_failed_sig_fmt() {
    let (context, tx, _script) = new_type_mint_template(TestSchema::Normal);

    let w = packed::WitnessArgs::from_slice(&get_witness(&tx, 0))
        .unwrap()
        .output_type()
        .to_opt()
        .unwrap()
        .as_slice()[4..]
        .to_vec();

    let mut w: serde_json::Value = serde_json::from_slice(&w).expect("parse utf8");
    if let Some(obj) = w.as_object_mut() {
        obj.insert(
            "sig".to_string(),
            serde_json::json!("xx007ef8db77572548f47c84eec396f9c288e361023573e28190861949fc47ec4356e665f341f39ef714a071560ce003e51872b952548c9b5173db899906e92a"),
        );
    }
    let witness = serde_json::to_string(&w).unwrap().as_bytes().to_vec();

    let witness = packed::WitnessArgs::default()
        .as_builder()
        .output_type(Some(Bytes::from(witness)).pack())
        .build()
        .as_bytes();
    let tx = update_witness(tx, 0, witness);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 55); // InvalidSignatureFormat
}

#[test]
fn test_mint_failed_sig_fmt2() {
    let (context, tx, _script) = new_type_mint_template(TestSchema::Normal);

    let w = packed::WitnessArgs::from_slice(&get_witness(&tx, 0))
        .unwrap()
        .output_type()
        .to_opt()
        .unwrap()
        .as_slice()[4..]
        .to_vec();

    let mut w: serde_json::Value = serde_json::from_slice(&w).expect("parse utf8");
    if let Some(obj) = w.as_object_mut() {
        obj.insert(
            "sig".to_string(),
            serde_json::json!("007ef8db77572548f47c84eec396f9c288e361023573e28190861949fc47ec4356e665f341f39ef714a071560ce003e51872b952548c9b5173db899906e92a"),
        );
    }
    let witness = serde_json::to_string(&w).unwrap().as_bytes().to_vec();

    let witness = packed::WitnessArgs::default()
        .as_builder()
        .output_type(Some(Bytes::from(witness)).pack())
        .build()
        .as_bytes();
    let tx = update_witness(tx, 0, witness);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 55); // InvalidSignatureFormat
}
