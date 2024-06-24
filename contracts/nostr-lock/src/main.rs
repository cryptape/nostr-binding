#![no_std]
#![no_main]

mod blake2b;
mod config;
mod error;
mod util;

use alloc::format;
use ckb_nostr_utils::event::Event;
use ckb_std::ckb_constants::Source;
use ckb_std::ckb_types::bytes::Bytes;
use ckb_std::ckb_types::prelude::Unpack;
use ckb_std::default_alloc;
use ckb_std::high_level::{load_script, load_witness_args};
use config::NONCE;
use config::NOSTR_LOCK_CONTENT;
use config::NOSTR_LOCK_KIND;
use config::{SCRIPT_ARGS_LEN, SIGHASH_ALL_TAG_NAME};
use error::Error;
use util::generate_sighash_all;

ckb_std::entry!(program_entry);
default_alloc!(4 * 1024, 1024 * 1024, 64);

pub fn program_entry() -> i8 {
    match entry() {
        Ok(_) => 0,
        Err(e) => e as i8,
    }
}

pub fn entry() -> Result<(), Error> {
    let script = load_script()?;
    let args: Bytes = script.args().unpack();
    if args.len() != SCRIPT_ARGS_LEN {
        return Err(Error::InvalidScriptArgs);
    }

    let sighash_all = generate_sighash_all()?;
    let sighash_all_hex = hex::encode(&sighash_all);

    let witness_args = load_witness_args(0, Source::GroupInput)?;
    let lock: Bytes = witness_args.lock().to_opt().unwrap().unpack();
    let event = Event::from_json(lock.as_ref())?;

    // rule 1
    let found = event.tags().into_iter().any(|e| {
        let e = e.as_vec();
        e.len() == 2 && e[0] == SIGHASH_ALL_TAG_NAME && e[1] == sighash_all_hex
    });
    if !found {
        return Err(Error::SighashAllMismatched);
    }
    // rule 2
    event.verify_id()?;

    // rule 3
    if event.kind() != NOSTR_LOCK_KIND {
        return Err(Error::KindMismatched);
    }
    if event.content() != NOSTR_LOCK_CONTENT {
        return Err(Error::ContentMismatched);
    }

    let schnorr_pubkey: [u8; 32] = args[0..32].try_into().unwrap();
    let pow_difficulty = args[32];
    if pow_difficulty == 0 {
        verify_key(&event, schnorr_pubkey)
    } else {
        verify_pow(&event, pow_difficulty, schnorr_pubkey)
    }
}

fn verify_pow(event: &Event, pow_difficulty: u8, schnorr_pubkey: [u8; 32]) -> Result<(), Error> {
    let pow_difficulty_str = format!("{}", pow_difficulty);

    let mut validated = false;
    for tag in event.tags() {
        let entries = tag.clone().to_vec();
        // rule 4
        if entries.len() == 3 && entries[0] == NONCE {
            // rule 5
            if entries[2] != pow_difficulty_str {
                return Err(Error::WrongTargetDifficulty);
            } else {
                // rule 6
                if event.id().check_pow(pow_difficulty) {
                    validated = true;
                } else {
                    return Err(Error::PoWDifficulty);
                }
            }
        }
    }
    // rule 7
    if schnorr_pubkey != [0u8; 32] {
        return Err(Error::PubkeyNotEmpty);
    }
    if validated {
        Ok(())
    } else {
        Err(Error::NonceNotFound)
    }
}

fn verify_key(event: &Event, schnorr_pubkey: [u8; 32]) -> Result<(), Error> {
    let schnorr_pubkey_hex = hex::encode(&schnorr_pubkey);
    // rule 8
    if event.author().to_hex() != schnorr_pubkey_hex {
        return Err(Error::PubkeyNotFound);
    }
    // rule 9
    event.verify_signature()?;
    Ok(())
}
