extern crate hex;
use crate::{blake160, sign_nostr_lock_script, unix_time_now, MAX_CYCLES};
use ckb_testtool::{
    ckb_types::{bytes::Bytes, core::TransactionBuilder, packed, prelude::*},
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

#[test]
fn test_unlock_nostr_lock() {
    // deploy contract
    let mut context = Context::default();
    context.set_capture_debug(false);
    let lock_out_point = context.deploy_cell(NOSTR_LOCK_BIN.clone());
    let pubkey = KEY.public_key().to_bytes().to_vec();
    let mut args = [0u8; 21];
    let pubkey_hash = blake160(&pubkey);
    (&mut args[1..21]).copy_from_slice(&pubkey_hash);

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

    let created_at = unix_time_now();
    let tx = sign_nostr_lock_script(&KEY, created_at, vec![0], 1, tx);
    let cycles = context
        .verify_tx(&tx, MAX_CYCLES)
        .expect("pass verification");
    println!("consume cycles: {}", cycles);
}
