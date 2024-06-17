extern crate alloc;

use alloc::string::{String, ToString};
use alloc::vec;
use core::fmt;
use core::str::FromStr;
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::{json, Value};

pub use super::tag::Tag;
use crate::key::public_key::PublicKey;
use crate::Error;
use hex;
use sha2::{digest::Digest, Sha256};

/// Event ID size
pub const EVENT_ID_SIZE: usize = 32;

/// Event ID
///
/// 32-bytes lowercase hex-encoded sha256 of the serialized event data
///
/// <https://github.com/nostr-protocol/nips/blob/master/01.md>
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct EventId([u8; EVENT_ID_SIZE]);

impl EventId {
    /// Generate [`EventId`]
    pub fn new(
        public_key: &PublicKey,
        created_at: &u64,
        kind: &u16,
        tags: &[Tag],
        content: &str,
    ) -> Self {
        let json: Value = json!([0, public_key, created_at, kind, tags, content]);
        let event_str: String = json.to_string();
        let mut hasher = Sha256::default();
        hasher.update(event_str.as_bytes());
        let hash = hasher.finalize();
        let hash: [u8; 32] = (&hash).clone().try_into().unwrap();
        Self::owned(hash)
    }

    /// Construct event ID
    pub fn owned(bytes: [u8; EVENT_ID_SIZE]) -> Self {
        Self(bytes)
    }

    /// Try to parse [EventId] from `hex`, `bech32` or [NIP21](https://github.com/nostr-protocol/nips/blob/master/21.md) uri
    pub fn parse<S>(id: S) -> Result<Self, Error>
    where
        S: AsRef<str>,
    {
        let id: &str = id.as_ref();

        // Try from hex
        if let Ok(id) = Self::from_hex(id) {
            return Ok(id);
        }

        Err(Error::InvalidEventId)
    }

    /// Parse from hex string
    pub fn from_hex<S>(hex: S) -> Result<Self, Error>
    where
        S: AsRef<[u8]>,
    {
        let hex_value = hex::decode(hex).map_err(|_| Error::InvalidEventId)?;
        let hex_value: [u8; EVENT_ID_SIZE] =
            hex_value.try_into().map_err(|_| Error::InvalidEventId)?;
        Ok(Self::owned(hex_value))
    }

    /// Parse from bytes
    pub fn from_slice(slice: &[u8]) -> Result<Self, Error> {
        // Check len
        if slice.len() != EVENT_ID_SIZE {
            return Err(Error::InvalidEventId);
        }

        // Copy bytes
        let mut bytes: [u8; EVENT_ID_SIZE] = [0u8; EVENT_ID_SIZE];
        bytes.copy_from_slice(slice);

        // Construct owned
        Ok(Self::owned(bytes))
    }

    /// All zeros
    pub fn all_zeros() -> Self {
        Self::owned([0u8; EVENT_ID_SIZE])
    }

    /// Get as bytes
    pub fn as_bytes(&self) -> &[u8; EVENT_ID_SIZE] {
        &self.0
    }

    pub fn as_slice(&self) -> &[u8] {
        &self.0
    }

    /// Consume and get bytes
    pub fn to_bytes(self) -> [u8; 32] {
        self.0
    }

    /// Get as hex string
    pub fn to_hex(&self) -> String {
        hex::encode(self.as_bytes())
    }

    /// Check POW
    ///
    /// <https://github.com/nostr-protocol/nips/blob/master/13.md>
    pub fn check_pow(&self, difficulty: u8) -> bool {
        get_leading_zero_bits(self.as_bytes()) >= difficulty
    }
}

/// Gets the number of leading zero bits. Result is between 0 and 255.
pub fn get_leading_zero_bits<T>(h: T) -> u8
where
    T: AsRef<[u8]>,
{
    let mut res: u8 = 0_u8;
    for b in h.as_ref().iter() {
        if *b == 0 {
            res += 8;
        } else {
            res += b.leading_zeros() as u8;
            return res;
        }
    }
    res
}

impl FromStr for EventId {
    type Err = Error;

    /// Try to parse [EventId] from `hex`
    fn from_str(id: &str) -> Result<Self, Self::Err> {
        Self::parse(id)
    }
}

impl AsRef<[u8]> for EventId {
    fn as_ref(&self) -> &[u8] {
        self.as_bytes()
    }
}

impl AsRef<[u8; EVENT_ID_SIZE]> for EventId {
    fn as_ref(&self) -> &[u8; EVENT_ID_SIZE] {
        self.as_bytes()
    }
}

impl fmt::LowerHex for EventId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.to_hex())
    }
}

impl fmt::Display for EventId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        fmt::LowerHex::fmt(self, f)
    }
}

// Required to keep clean the methods of `Filter` struct
impl From<EventId> for String {
    fn from(event_id: EventId) -> Self {
        event_id.to_hex()
    }
}

impl Serialize for EventId {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_hex())
    }
}

impl<'de> Deserialize<'de> for EventId {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let id: String = String::deserialize(deserializer)?;
        Self::parse(id).map_err(|_| serde::de::Error::custom(String::from("EventId::deserialize")))
    }
}
