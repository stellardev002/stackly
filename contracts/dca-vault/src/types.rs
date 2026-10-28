use soroban_sdk::{contracttype, Address};

/// Mirrored in `packages/stellar/src/vault.ts`; keep the two in step.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PositionStatus {
    Created,
    Active,
    Paused,
    Closed,
}

/// PRD §10 "DCA Position Data". Amounts are in the asset's smallest unit (7 decimals for Stellar assets).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Position {
    pub id: u64,
    pub owner: Address,
    /// Stellar Asset Contract addresses.
    pub source_asset: Address,
    pub target_asset: Address,
    pub purchase_amount: i128,
    pub interval_seconds: u64,
    pub start_ts: u64,
    pub end_ts: Option<u64>,
    pub next_execution_ts: u64,
    pub max_slippage_bps: u32,
    pub total_deposited: i128,
    pub total_spent: i128,
    pub source_balance: i128,
    pub target_balance: i128,
    pub execution_count: u32,
    /// The last interval executed; `execute` only accepts the next one (no duplicates, no skipping back).
    pub last_interval: Option<u32>,
    pub status: PositionStatus,
}

/// Set once by `initialize`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Config {
    pub admin: Address,
    /// The only address allowed to call `execute`. It has no other rights.
    pub keeper: Address,
    /// The swap adapter contract (`contracts/swap-adapter` on Testnet).
    pub swap_adapter: Address,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Config,
    NextPositionId,
    Position(u64),
    /// Supported (source, target) pairs.
    Pair(Address, Address),
}
