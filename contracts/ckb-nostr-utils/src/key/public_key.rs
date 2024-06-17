use crate::Error;
use alloc::string::String;
use core::str::FromStr;
use core::{fmt, ops::Deref};
use serde::{Deserialize, Deserializer, Serialize};

/// Public Key
#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct PublicKey {
    inner: [u8; 32],
}

impl fmt::Debug for PublicKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_tuple("PublicKey").field(&self.to_bytes()).finish()
    }
}

impl Deref for PublicKey {
    type Target = [u8; 32];

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl PublicKey {
    pub fn parse<S>(public_key: S) -> Result<Self, Error>
    where
        S: AsRef<str>,
    {
        let public_key: &str = public_key.as_ref();

        // Try from hex
        if let Ok(public_key) = Self::from_hex(public_key) {
            return Ok(public_key);
        }

        Err(Error::InvalidPublicKey)
    }

    /// Parse [PublicKey] from `bytes`
    pub fn from_slice(slice: &[u8]) -> Result<Self, Error> {
        Ok(Self {
            inner: slice.try_into().map_err(|_| Error::InvalidPublicKey)?,
        })
    }

    /// Parse [PublicKey] from `hex` string
    pub fn from_hex<S>(hex: S) -> Result<Self, Error>
    where
        S: AsRef<str>,
    {
        let hash = hex::decode(hex.as_ref()).map_err(|_| Error::InvalidPublicKey)?;
        Ok(Self {
            inner: hash.try_into().map_err(|_| Error::InvalidPublicKey)?,
        })
    }

    /// Get public key as `hex` string
    pub fn to_hex(&self) -> String {
        hex::encode(&self.inner)
    }

    /// Get public key as `bytes`
    pub fn to_bytes(&self) -> [u8; 32] {
        self.inner
    }

    pub fn as_slice(&self) -> &[u8; 32] {
        &self.inner
    }
}

impl FromStr for PublicKey {
    type Err = Error;

    /// Try to parse [PublicKey] from `hex`, `bech32` or [NIP21](https://github.com/nostr-protocol/nips/blob/master/21.md) uri
    #[inline]
    fn from_str(public_key: &str) -> Result<Self, Self::Err> {
        Self::parse(public_key)
    }
}

// Required to keep clean the methods of `Filter` struct
impl From<PublicKey> for String {
    fn from(public_key: PublicKey) -> Self {
        public_key.to_hex()
    }
}

impl Serialize for PublicKey {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_hex())
    }
}

impl<'de> Deserialize<'de> for PublicKey {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let public_key: String = String::deserialize(deserializer)?;
        Self::parse(public_key)
            .map_err(|_| serde::de::Error::custom(String::from("PublicKey::deserialize")))
    }
}
