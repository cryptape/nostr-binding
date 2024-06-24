use super::*;
use ckb_testtool::{
    builtin::ALWAYS_SUCCESS,
    ckb_hash::Blake2bBuilder,
    ckb_types::{bytes::Bytes, core::TransactionBuilder, packed::{self, *}, prelude::*},
    context::Context,
};
use nostr::prelude::*;

extern crate hex;
use hex::encode;
use lazy_static::lazy_static;


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
    let nostr_lock_out_point = context.deploy_cell(NOSTR_LOCK_BIN.clone());
    // prepare cell deps
    let nostr_lock_dep = CellDep::new_builder()
        .out_point(nostr_lock_out_point.clone())
        .build();
    let cell_deps = vec![
        nostr_lock_dep
    ]
    .pack();

    let pubkey = KEY.public_key().to_bytes().to_vec();
    let lock_script = context
        .build_script(&nostr_lock_out_point, pubkey.into())
        .expect("lock script");

    // prepare input cells
    let input_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000u64.pack())
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );
    let input = CellInput::new_builder()
        .previous_output(input_out_point.clone())
        .build();

    let outputs = vec![
        CellOutput::new_builder()
            .capacity(500u64.pack())
            .lock(lock_script.clone())
            .build(),
        CellOutput::new_builder()
            .capacity(500u64.pack())
            .lock(lock_script.clone())
            .build(),
    ];

    // prepare output data
    let outputs_data = vec![Bytes::new(), Bytes::new()];

    // build transaction
    let tx = TransactionBuilder::default()
        .cell_deps(cell_deps)
        .input(input)
        .outputs(outputs)
        .outputs_data(outputs_data.pack())
        .build();

    // build nostr unlock event
    let cell_tx_hash_tag = tx.hash().as_bytes().to_vec();
    let tags = [
        Tag::Generic(TagKind::from("ckb_tx_hash"), vec![encode(cell_tx_hash_tag)]),
        Tag::event(EventId::from_slice(&asset_meta_event_id.to_vec()).unwrap()),
    ];
    let event: Event = EventBuilder::new(Kind::from(ASSET_UNLOCK_KIND as u64), "", tags)
        .to_event(&KEY)
        .unwrap();

    // sign and add witness
    let tx = tx
        .as_advanced_builder()
        .witness(witness.as_bytes().pack())
        .build();

    // run
    let cycles = context
        .verify_tx(&tx, MAX_CYCLES)
        .expect("pass verification");
    println!("consume cycles: {}", cycles);
}
