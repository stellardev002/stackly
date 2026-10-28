use soroban_sdk::contracterror;

/// One variant per rejection the PRD requires (§10 "Contract Enforcement"). Codes are part of the
/// contract's interface: the keeper and the web app map them to messages, so never renumber.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum VaultError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    PositionNotFound = 3,
    /// Caller is not the position owner (withdraw, pause, resume, deposit).
    Unauthorized = 4,
    UnsupportedAsset = 5,
    InvalidAmount = 6,
    InvalidInterval = 7,
    InvalidSlippage = 8,
    /// Execution before `next_execution_ts`.
    TooEarly = 9,
    /// The interval was already executed.
    DuplicateInterval = 10,
    /// Execution while paused (or not yet activated, or closed).
    NotActive = 11,
    /// Purchase or withdrawal exceeds the available balance.
    InsufficientBalance = 12,
    /// Swap output below the position's slippage-derived minimum.
    SlippageExceeded = 13,
    InvalidStatusTransition = 14,
    PositionEnded = 15,
}
