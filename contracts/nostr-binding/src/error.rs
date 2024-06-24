use ckb_nostr_utils::error::Error as NostrError;
use ckb_std::error::SysError;

#[repr(i8)]
pub enum Error {
    IndexOutOfBound = 1,
    ItemMissing,
    LengthNotEnough,
    Encoding,
    ValidationFail,
    WitnessNotExisting,
    WrongArgsLength,
    InvalidPublicKey,
    InvalidEventId,
    InvalidSignatureFormat,
    UnknownKey,
    Json,
    GlobalUniqueIdNotFound,
    TooManyTypeIdCell,
    TypeIdNotMatch,
}

impl From<SysError> for Error {
    fn from(err: SysError) -> Self {
        match err {
            SysError::IndexOutOfBound => Self::IndexOutOfBound,
            SysError::ItemMissing => Self::ItemMissing,
            SysError::LengthNotEnough(_) => Self::LengthNotEnough,
            SysError::Encoding => Self::Encoding,
            SysError::Unknown(err_code) => panic!("unexpected sys error {}", err_code),
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
