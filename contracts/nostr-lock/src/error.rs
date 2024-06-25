use ckb_nostr_utils::error::Error as NostrError;
use ckb_std::error::SysError;
extern crate alloc;

#[repr(i8)]
pub enum Error {
    IndexOutOfBound = 1,
    ItemMissing,
    LengthNotEnough,
    Encoding,
    // nostr lock script error code starts from 10
    Unknown = 10,
    SighashAllMismatched,
    KindMismatched,
    ContentMismatched,
    GenerateSighashAll,
    InvalidScriptArgs = 15,
    InvalidPublicKey,
    InvalidEventId,
    ValidationFail,
    InvalidSignatureFormat,
    UnknownKey = 20,
    Json,
    PubkeyNotEmpty,
    WrongTargetDifficulty,
    PoWDifficulty,
    NonceNotFound = 25,
    PubkeyNotFound,
    WrongWitnessArgs,
}

impl From<SysError> for Error {
    fn from(err: SysError) -> Self {
        match err {
            SysError::IndexOutOfBound => Self::IndexOutOfBound,
            SysError::ItemMissing => Self::ItemMissing,
            SysError::LengthNotEnough(_) => Self::LengthNotEnough,
            SysError::Encoding => Self::Encoding,
            SysError::Unknown(_) => Self::Unknown,
        }
    }
}

impl From<NostrError> for Error {
    fn from(err: NostrError) -> Self {
        match err {
            NostrError::InvalidPublicKey => Self::InvalidPublicKey,
            NostrError::InvalidEventId => Self::InvalidEventId,
            NostrError::ValidationFail => Self::ValidationFail,
            NostrError::InvalidSignatureFormat => Self::InvalidSignatureFormat,
            NostrError::UnknownKey(_) => Self::UnknownKey,
            NostrError::Json(_) => Self::Json,
        }
    }
}
