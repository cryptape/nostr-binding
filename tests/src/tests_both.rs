extern crate hex;
use crate::{new_both_template, sign_lock_script, TestConfig, TestSchema, MAX_CYCLES};

#[test]
fn test_both() {
    let (context, tx, _script) = new_both_template(TestSchema::Normal);
    let tx = sign_lock_script(TestConfig::default(), vec![0], 1, tx, TestSchema::Normal);
    let cycles = context
        .verify_tx(&tx, MAX_CYCLES)
        .expect("pass verification");
    println!("consume cycles: {}", cycles);
}
