#![no_std]

//! Stackly DCA vault (PRD Module 1). Holds each owner's deposits in a separate position and enforces the
//! recurring purchase rules. Interface only: every body is `todo!()` until Module 1 is implemented.
//!
//! Enforcement checklist (PRD §10), each mapped to a `VaultError`:
//! - unauthorized withdrawals → `owner.require_auth()` on every owner action, `Unauthorized`
//! - unsupported assets → `DataKey::Pair` allow-list, `UnsupportedAsset`
//! - zero or invalid purchase amounts → `InvalidAmount`
//! - execution before the interval → `TooEarly`
//! - duplicate interval → `last_interval`, `DuplicateInterval`
//! - execution while paused → `NotActive`
//! - purchase above available funds → `InsufficientBalance`
//! - swap outside approved parameters → min output from `max_slippage_bps`, `SlippageExceeded`
//!
//! A failed swap must leave balances untouched (PRD §17): move funds only after the adapter returns
//! an output at or above the minimum, and verify the received amount by balance difference.

mod errors;
mod events;
mod types;

#[cfg(test)]
mod test;

pub use errors::VaultError;
pub use types::{Config, Position, PositionStatus};

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

/// Which balance a withdrawal draws from.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Side {
    Source,
    Target,
}

#[contract]
pub struct DcaVault;

#[contractimpl]
impl DcaVault {
    /// One-time setup. `keeper` may only call `execute`; `swap_adapter` performs swaps.
    pub fn initialize(env: Env, admin: Address, keeper: Address, swap_adapter: Address) -> Result<(), VaultError> {
        todo!()
    }

    /// Admin: allow a (source, target) pair. MVP: Testnet USDC → XLM only.
    pub fn add_pair(env: Env, source: Address, target: Address) -> Result<(), VaultError> {
        todo!()
    }

    /// Owner: create a position in `Created` status. Returns the new position id.
    pub fn create_position(
        env: Env,
        owner: Address,
        source_asset: Address,
        target_asset: Address,
        purchase_amount: i128,
        interval_seconds: u64,
        start_ts: u64,
        end_ts: Option<u64>,
        max_slippage_bps: u32,
    ) -> Result<u64, VaultError> {
        todo!()
    }

    /// Owner: transfer `amount` of the source asset from the owner into this position.
    pub fn deposit(env: Env, position_id: u64, amount: i128) -> Result<(), VaultError> {
        todo!()
    }

    /// Owner: `Created` → `Active`.
    pub fn activate(env: Env, position_id: u64) -> Result<(), VaultError> {
        todo!()
    }

    /// Owner: `Active` → `Paused`. The keeper can't execute a paused position.
    pub fn pause(env: Env, position_id: u64) -> Result<(), VaultError> {
        todo!()
    }

    /// Owner: `Paused` → `Active`. The next execution is no earlier than now.
    pub fn resume(env: Env, position_id: u64) -> Result<(), VaultError> {
        todo!()
    }

    /// Keeper: execute interval `interval_index` if it is due. Swaps exactly `purchase_amount` through the
    /// adapter with a minimum output derived from the position's own slippage limit, credits the output to
    /// the position, advances `next_execution_ts`, and emits `executed`. Returns the amount received.
    pub fn execute(env: Env, position_id: u64, interval_index: u32) -> Result<i128, VaultError> {
        todo!()
    }

    /// Owner: withdraw up to the available balance of one side, always to the owner's own address.
    pub fn withdraw(env: Env, position_id: u64, side: Side, amount: i128) -> Result<(), VaultError> {
        todo!()
    }

    pub fn get_position(env: Env, position_id: u64) -> Result<Position, VaultError> {
        todo!()
    }

    pub fn get_config(env: Env) -> Result<Config, VaultError> {
        todo!()
    }
}
