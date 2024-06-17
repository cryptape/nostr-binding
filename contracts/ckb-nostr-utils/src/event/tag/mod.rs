use core::{cmp::Ordering, hash::Hash, hash::Hasher};

use alloc::{string::String, vec::Vec};
use serde::ser::SerializeSeq;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

/// Tag
#[derive(Debug, Clone)]
pub struct Tag {
    buf: Vec<String>,
}

impl PartialEq for Tag {
    fn eq(&self, other: &Self) -> bool {
        self.buf == other.buf
    }
}

impl Eq for Tag {}

impl PartialOrd for Tag {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Tag {
    fn cmp(&self, other: &Self) -> Ordering {
        self.buf.cmp(&other.buf)
    }
}

impl Hash for Tag {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.buf.hash(state);
    }
}

impl Tag {
    #[inline]
    pub fn new(buf: Vec<String>) -> Self {
        Self { buf }
    }
    /// Return the **first** tag value (index `1`), if exists.
    #[inline]
    pub fn content(&self) -> Option<&str> {
        self.buf.get(1).map(|s| s.as_str())
    }

    /// Get reference of array of strings
    #[inline]
    pub fn as_vec(&self) -> &[String] {
        &self.buf
    }

    /// Consume tag and return array of strings
    #[inline]
    pub fn to_vec(self) -> Vec<String> {
        self.buf
    }
    /// Get tag kind
    #[inline]
    pub fn kind(&self) -> String {
        // SAFETY: `buf` must not be empty, checked during parsing.
        self.buf[0].clone()
    }
}

impl Serialize for Tag {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut seq = serializer.serialize_seq(Some(self.buf.len()))?;
        for element in self.buf.iter() {
            seq.serialize_element(&element)?;
        }
        seq.end()
    }
}

impl<'de> Deserialize<'de> for Tag {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        type Data = Vec<String>;
        let buf: Vec<String> = Data::deserialize(deserializer)?;
        Ok(Tag { buf })
    }
}
