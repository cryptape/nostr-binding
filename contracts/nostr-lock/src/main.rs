#![no_std]
#![cfg_attr(not(test), no_main)]

#[cfg(test)]
extern crate alloc;

mod config;
mod error;
mod util;

use alloc::vec::Vec;
use ckb_std::debug;
#[cfg(not(test))]
use ckb_std::default_alloc;
#[cfg(not(test))]
ckb_std::entry!(program_entry);
#[cfg(not(test))]
default_alloc!();

use ckb_std::high_level::load_tx_hash;
use ckb_std::{
    ckb_constants::Source,
    ckb_types::{bytes::Bytes, prelude::Unpack},
    high_level::{load_script, load_witness_args},
};
use hex::encode;

use ckb_nostr_utils::event::Event;
use error::Error;

use crate::config::ASSET_UNLOCK_KIND;
use crate::util::get_event_ckb_tx_hash;

include!(concat!(env!("OUT_DIR"), "/auth_code_hash.rs"));

pub fn program_entry() -> i8 {
    match auth() {
        Ok(_) => 0,
        Err(err) => err as i8,
    }
}

fn auth() -> Result<(), Error> {
    // read nostr event from witness
    let witness_args = load_witness_args(0, Source::GroupInput)?;
    let witness = witness_args
        .lock()
        .to_opt()
        .ok_or(Error::WitnessReadFail)?
        .raw_data();
    let events_bytes = witness.to_vec();
    let events = decode_events(events_bytes);

    for event in events {
        validate_event(event)?;
    }

    Ok(())
}

pub fn validate_event(event: Event) -> Result<(), Error> {
    let kind = event.clone().kind;
    if kind != ASSET_UNLOCK_KIND {
        return Err(Error::InvalidUnlockEventKind);
    }
    // todo: check pow
    // check tx hash tag
    let tx_hash = load_tx_hash()?;
    let tx_hash_in_event = get_event_ckb_tx_hash(event.clone())?;
    if encode(tx_hash) != tx_hash_in_event {
        return Err(Error::UnlockEventInvalidTxHashTag);
    }

    // check script args owner
    let pubkey = event.pubkey.to_bytes();
    let public_key = load_nostr_pubkey_from_script_args()?;
    if !public_key.eq(&pubkey) {
        return Err(Error::PublicKeyNotMatched);
    }
    event.verify_id().map_err(|_| Error::WrongEventId)?;
    let result = event.verify_signature();
    debug!("verify_signature returns {:?}", result);
    result.map_err(|_| Error::ValidationFail)
}

pub fn load_nostr_pubkey_from_script_args() -> Result<[u8; 32], Error> {
    let mut nostr_public_key = [0u8; 32];
    let script = load_script()?;
    let args: Bytes = script.args().unpack();
    nostr_public_key.copy_from_slice(&args[0..32]);
    Ok(nostr_public_key)
}

// witness format:
//      total_event_count(1 byte, le) + first_event_length(8 bytes, le) + first_event_content + second_event_length(8 bytes, le)....
pub fn decode_events(data: Vec<u8>) -> Vec<Event> {
    // Ensure we have at least 1 byte for the total number of events
    if data.is_empty() {
        debug!("Not enough data to decode events.");
        panic!("Not enough data to decode events.");
    }

    let mut cursor = 1; // Start after the first byte (total number of events)
    let mut events = Vec::new();

    // Get the total number of events
    let total_events = data[0] as usize;

    // Iterate over each event
    for _ in 0..total_events {
        // Ensure we have enough bytes to read the event length
        if data.len() < cursor + 8 {
            debug!("Not enough data to decode event length.");
            panic!("Not enough data to decode events.");
        }

        // Get the length of the current event
        let event_length_bytes: [u8; 8] = data[cursor..cursor + 8].try_into().unwrap();
        let event_length = u64::from_le_bytes(event_length_bytes) as usize;

        cursor += 8; // Move the cursor to the start of the event data

        // Ensure we have enough bytes to read the event data
        if data.len() < cursor + event_length {
            debug!("Not enough data to decode event.");
            panic!("Not enough data to decode events.");
        }

        // Extract the event data
        let event_data = &data[cursor..cursor + event_length].to_vec();
        let event = Event::from_json(event_data).unwrap();
        events.push(event);

        cursor += event_length; // Move the cursor to the next event length
    }

    events
}
