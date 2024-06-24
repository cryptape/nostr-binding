pub use blake2b_ref::{Blake2b, Blake2bBuilder};

pub const CKB_PERSONALIZATION: &[u8] = b"ckb-default-hash";

pub fn new_blake2b() -> Blake2b {
    Blake2bBuilder::new(32)
        .personal(CKB_PERSONALIZATION)
        .build()
}

pub fn new_blake2b_stat() -> Blake2bStatistics {
    Blake2bStatistics::new(new_blake2b())
}

pub fn blake160(data: &[u8]) -> [u8; 20] {
    let mut blake2b = new_blake2b();
    let mut hash = [0u8; 32];
    blake2b.update(data);
    blake2b.finalize(&mut hash);
    let mut ret = [0u8; 20];
    (&mut ret).copy_from_slice(&hash[0..20]);
    ret
}

pub struct Blake2bStatistics {
    count: usize,
    blake2b: Blake2b,
}

impl Blake2bStatistics {
    pub fn new(blake2b: Blake2b) -> Self {
        Self { count: 0, blake2b }
    }

    pub fn update(&mut self, data: &[u8]) {
        self.blake2b.update(data);
        self.count += data.len();
    }
    pub fn finalize(self, dst: &mut [u8]) {
        self.blake2b.finalize(dst)
    }
    pub fn count(&self) -> usize {
        self.count
    }
}
