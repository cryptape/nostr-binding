extern crate hex;
use crate::{
    assert_script_error, new_both_template, sign_lock_script, TestConfig, TestSchema, MAX_CYCLES,
};

#[test]
fn test_both() {
    let (context, tx, _script) = new_both_template(TestSchema::Normal);
    let tx = sign_lock_script(TestConfig::default(), vec![0], 1, tx, TestSchema::Normal);
    let cycles = context
        .verify_tx(&tx, MAX_CYCLES)
        .expect("pass verification");
    println!("consume cycles: {}", cycles);
}

#[test]
fn test_both_failed_lock_sig() {
    let (context, tx, _script) = new_both_template(TestSchema::Normal);
    let tx = sign_lock_script(
        TestConfig::default(),
        vec![0],
        1,
        tx,
        TestSchema::WrongSignature,
    );

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 18); // ValidationFail
}

#[test]
fn test_both_failed_mint_sig() {
    let (context, tx, _script) = new_both_template(TestSchema::WrongGlobalUniqueId);
    let tx = sign_lock_script(TestConfig::default(), vec![0], 1, tx, TestSchema::Normal);

    let result = context.verify_tx(&tx, MAX_CYCLES);
    assert_script_error(result.err().unwrap(), 60); // TypeIdNotMatch
}
