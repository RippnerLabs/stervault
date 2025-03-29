use anchor_lang::prelude::*;

#[constant]
pub const MAXIMUM_AGE: u64 = 10000;
pub const MAX_MINTS: usize = 64;
pub const MAX_BORROW_POSITIONS: usize = 64;