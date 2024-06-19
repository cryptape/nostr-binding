use crate::Error;
use alloc::string::{String, ToString};
use ckb_nostr_utils::event::Event;
use ckb_std::debug;

use crate::config::CKB_TX_HASH_TAG_NAME;

pub fn get_event_ckb_tx_hash(event: Event) -> Result<String, Error> {
    get_first_custom_tag_value(event, CKB_TX_HASH_TAG_NAME.to_string())
}

pub fn get_first_custom_tag_value(event: Event, tag_name: String) -> Result<String, Error> {
    let tags = event.tags();
    for tag in tags.iter() {
        let tag_vec = tag.as_vec();
        if tag_vec.len() > 1 {
            let name = tag_vec.first().unwrap();
            if name == &tag_name {
                let value = &tag_vec[1];
                return Ok(value.to_string());
            }
        }
    }
    debug!("first custom tag not found, {:?}", tag_name);
    Err(Error::TagNotFound)
}
