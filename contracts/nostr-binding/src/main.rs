#![no_std]
#![no_main]

mod config;
mod error;
mod type_id;

use ckb_nostr_utils::event::Event;
use ckb_std::default_alloc;
ckb_std::entry!(program_entry);
default_alloc!(4 * 1024, 1024 * 1024, 64);

use ckb_std::syscalls::current_cycles;
use ckb_std::{
    ckb_constants::Source,
    debug,
    high_level::{load_script, load_witness_args},
};

use config::GLOBAL_UNIQUE_ID_TAG_NAME;
use error::Error;
use type_id::{has_type_id_cell, validate_type_id};

pub fn program_entry() -> i8 {
    match entry() {
        Ok(_) => 0,
        Err(err) => err as i8,
    }
}

fn entry() -> Result<(), Error> {
    let script = load_script()?;
    let args = script.as_reader().args();
    if args.len() != 64 {
        return Err(Error::WrongArgsLength);
    }
    let mut event_id = [0; 32];
    event_id.copy_from_slice(&args.raw_data()[0..32]);
    let mut global_unique_id = [0; 32];
    global_unique_id.copy_from_slice(&args.raw_data()[32..]);

    validate_type_id(global_unique_id)?;

    if !has_type_id_cell(0, Source::GroupInput) {
        // mint a new binding cell
        let witness_args = load_witness_args(0, Source::GroupOutput)?;
        let witness = witness_args
            .output_type()
            .to_opt()
            .ok_or(Error::WitnessNotExisting)?
            .raw_data();
        let event = Event::from_json(witness.as_ref())?;
        event.verify_id()?;
        if &event_id != event.id().as_bytes() {
            return Err(Error::InvalidEventId);
        }
        let global_unique_id_hex = hex::encode(global_unique_id);
        let found = event.tags().into_iter().any(|e| {
            let e = e.as_vec();
            e.len() == 2 && e[0] == GLOBAL_UNIQUE_ID_TAG_NAME && e[1] == global_unique_id_hex
        });
        if !found {
            return Err(Error::GlobalUniqueIdNotFound);
        }
        let start = current_cycles();
        event.verify_signature()?;
        debug!(
            "verify_signature costs {} k cycles",
            (current_cycles() - start) / 1024
        );
    }

    Ok(())
}
