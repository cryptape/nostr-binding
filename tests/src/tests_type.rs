extern crate hex;
use crate::{assert_script_error, new_type_mint_template, TestSchema, MAX_CYCLES};

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
