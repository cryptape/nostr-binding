extern crate alloc;

pub mod id;
pub mod tag;

use alloc::string::{String, ToString};
use alloc::vec::Vec;
use core::cmp::Ordering;
use core::fmt;
use core::hash::{Hash, Hasher};
use core::ops::Deref;
use core::str::FromStr;
use k256::ecdsa::signature::hazmat::PrehashVerifier;
use k256::schnorr::{Signature, VerifyingKey};
use serde::ser::SerializeStruct;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_json::Value;
use tag::Tag;

pub use self::id::EventId;
use crate::error::Error;
use crate::key::public_key::PublicKey;

const ID: &str = "id";
const PUBKEY: &str = "pubkey";
const CREATED_AT: &str = "created_at";
const KIND: &str = "kind";
const TAGS: &str = "tags";
const CONTENT: &str = "content";
const SIG: &str = "sig";

/// Supported event keys
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
enum EventKey {
    Id,
    PubKey,
    CreatedAt,
    Kind,
    Tags,
    Content,
    Sig,
}

impl FromStr for EventKey {
    type Err = Error;

    fn from_str(key: &str) -> Result<Self, Self::Err> {
        match key {
            ID => Ok(Self::Id),
            PUBKEY => Ok(Self::PubKey),
            CREATED_AT => Ok(Self::CreatedAt),
            KIND => Ok(Self::Kind),
            TAGS => Ok(Self::Tags),
            CONTENT => Ok(Self::Content),
            SIG => Ok(Self::Sig),
            k => Err(Error::UnknownKey(k.to_string())),
        }
    }
}

/// [`Event`] struct
#[derive(Clone)]
pub struct Event {
    /// Event
    inner: EventIntermediate,
    /// JSON deserialization key order
    deser_order: Vec<EventKey>,
}

impl fmt::Debug for Event {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Event")
            .field(ID, &self.inner.id)
            .field(PUBKEY, &self.inner.pubkey)
            .field(CREATED_AT, &self.inner.created_at)
            .field(KIND, &self.inner.kind)
            .field(TAGS, &self.inner.tags)
            .field(CONTENT, &self.inner.content)
            .field(SIG, &self.inner.sig)
            .finish()
    }
}

impl PartialEq for Event {
    fn eq(&self, other: &Self) -> bool {
        self.inner.eq(&other.inner)
    }
}

impl Eq for Event {}

impl PartialOrd for Event {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Event {
    fn cmp(&self, other: &Self) -> Ordering {
        self.inner.cmp(&other.inner)
    }
}

impl Hash for Event {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.inner.hash(state);
    }
}

impl Deref for Event {
    type Target = EventIntermediate;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl Event {
    /// Compose event
    pub fn new<I, S>(
        id: EventId,
        public_key: PublicKey,
        created_at: u64,
        kind: u16,
        tags: I,
        content: S,
        sig: String,
    ) -> Self
    where
        I: IntoIterator<Item = Tag>,
        S: Into<String>,
    {
        Self {
            inner: EventIntermediate {
                id,
                pubkey: public_key,
                created_at,
                kind,
                tags: tags.into_iter().collect(),
                content: content.into(),
                sig,
            },
            deser_order: Vec::new(),
        }
    }

    /// Deserialize [`Event`] from [`Value`]
    ///
    /// **This method NOT verify the signature!**
    pub fn from_value(value: Value) -> Result<Self, Error> {
        Ok(serde_json::from_value(value)
            .map_err(|_| Error::Json(String::from("Event::from_value")))?)
    }

    /// Get event ID
    pub fn id(&self) -> EventId {
        self.inner.id
    }

    /// Get event author (`pubkey` field)
    pub fn author(&self) -> PublicKey {
        self.inner.pubkey
    }

    /// Get event author reference (`pubkey` field)
    pub fn author_ref(&self) -> &PublicKey {
        &self.inner.pubkey
    }

    /// Get [Timestamp] of when the event was created
    pub fn created_at(&self) -> u64 {
        self.inner.created_at
    }

    /// Get event [Kind]
    pub fn kind(&self) -> u16 {
        self.inner.kind
    }

    /// Get reference to event tags
    pub fn tags(&self) -> &[Tag] {
        &self.inner.tags
    }

    /// Iterate event tags
    pub fn iter_tags(&self) -> impl Iterator<Item = &Tag> {
        self.inner.tags.iter()
    }

    /// Iterate and consume event tags
    pub fn into_iter_tags(self) -> impl Iterator<Item = Tag> {
        self.inner.tags.into_iter()
    }

    /// Get content of **first** tag that match [TagKind].
    pub fn get_tag_content(&self, kind: String) -> Option<&str> {
        self.iter_tags()
            .find(|t| t.kind() == kind)
            .and_then(|t| t.content())
    }

    /// Get content of all tags that match [TagKind].
    pub fn get_tags_content(&self, kind: String) -> Vec<&str> {
        self.iter_tags()
            .filter(|t| t.kind() == kind)
            .filter_map(|t| t.content())
            .collect()
    }

    /// Get reference to event content
    pub fn content(&self) -> &str {
        &self.inner.content
    }

    /// Get event signature
    pub fn signature(&self) -> String {
        self.inner.sig.clone()
    }
    /// Verify both [`EventId`] and [`Signature`]
    pub fn verify(&self) -> Result<(), Error> {
        // Verify ID
        self.verify_id()?;

        // Verify signature
        self.verify_signature()
    }
    /// Verify if the [`EventId`] it's composed correctly
    pub fn verify_id(&self) -> Result<(), Error> {
        let id: EventId = EventId::new(
            &self.inner.pubkey,
            &self.inner.created_at,
            &self.inner.kind,
            &self.inner.tags,
            &self.inner.content,
        );
        if id == self.inner.id {
            Ok(())
        } else {
            Err(Error::InvalidEventId)
        }
    }

    /// Verify only event [`Signature`]
    pub fn verify_signature(&self) -> Result<(), Error> {
        let sig_bytes = hex::decode(&self.inner.sig).map_err(|_| Error::InvalidSignatureFormat)?;
        let signature =
            Signature::try_from(sig_bytes.as_slice()).map_err(|_| Error::InvalidSignatureFormat)?;
        let pubkey = &self.inner.pubkey;
        let pk =
            VerifyingKey::from_bytes(pubkey.as_slice()).map_err(|_| Error::InvalidPublicKey)?;
        let message = self.id();
        pk.verify_prehash(message.as_slice(), &signature)
            .map_err(|_| Error::ValidationFail)
    }

    /// Check POW
    ///
    /// <https://github.com/nostr-protocol/nips/blob/master/13.md>
    pub fn check_pow(&self, difficulty: u8) -> bool {
        self.inner.id.check_pow(difficulty)
    }
    /// Deserialize [`Event`] from JSON
    ///
    /// **This method NOT verify the signature!**
    pub fn from_json<T>(json: T) -> Result<Self, Error>
    where
        T: AsRef<[u8]>,
    {
        Ok(serde_json::from_slice(json.as_ref())
            .map_err(|_| Error::Json(String::from("Event::from_json")))?)
    }
}

/// Event Intermediate used for de/serialization of [`Event`]
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct EventIntermediate {
    /// Id
    pub id: EventId,
    /// Author
    pub pubkey: PublicKey,
    /// Timestamp (seconds)
    pub created_at: u64,
    /// Kind
    pub kind: u16,
    /// Vector of [`Tag`]
    pub tags: Vec<Tag>,
    /// Content
    pub content: String,
    /// Signature
    pub sig: String,
}

impl PartialOrd for EventIntermediate {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for EventIntermediate {
    fn cmp(&self, other: &Self) -> Ordering {
        if self.created_at != other.created_at {
            // Ascending order
            // NOT EDIT, will break many things!!
            self.created_at.cmp(&other.created_at)
        } else {
            self.id.cmp(&other.id)
        }
    }
}

impl Serialize for Event {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        if self.deser_order.is_empty() {
            self.inner.serialize(serializer)
        } else {
            let mut s = serializer.serialize_struct("Event", 7)?;
            for key in self.deser_order.iter() {
                match key {
                    EventKey::Id => s.serialize_field(ID, &self.inner.id)?,
                    EventKey::PubKey => s.serialize_field(PUBKEY, &self.inner.pubkey)?,
                    EventKey::CreatedAt => s.serialize_field(CREATED_AT, &self.inner.created_at)?,
                    EventKey::Kind => s.serialize_field(KIND, &self.inner.kind)?,
                    EventKey::Tags => s.serialize_field(TAGS, &self.inner.tags)?,
                    EventKey::Content => s.serialize_field(CONTENT, &self.inner.content)?,
                    EventKey::Sig => s.serialize_field(SIG, &self.inner.sig)?,
                }
            }
            s.end()
        }
    }
}

impl<'de> Deserialize<'de> for Event {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value: Value = Value::deserialize(deserializer)?;

        let deser_order: Vec<EventKey> = if let Value::Object(map) = &value {
            map.keys()
                .filter_map(|k| EventKey::from_str(k).ok())
                .collect()
        } else {
            Vec::new()
        };

        Ok(Self {
            inner: serde_json::from_value(value).map_err(serde::de::Error::custom)?,
            deser_order,
        })
    }
}
