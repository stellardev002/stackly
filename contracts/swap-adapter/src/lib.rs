#![no_std]

//! Stackly swap adapter (PRD Module 2): the single interface the vault swaps through.
//!
//! First choice: forward to a Soroban DEX router on Testnet once the team has verified contract-to-contract
//! calls and usable USDC/XLM liquidity there. If no verified route exists, this contract becomes a clearly
//! labelled **Testnet liquidity adapter** (a controlled pool funded with test assets) and that is documented
//! in docs/PLAN.md. Whichever it is, it is never presented as a live DEX execution when it isn't one.

use soroban_sdk::{contract, contractimpl, Address, Env, String};

#[contract]
pub struct SwapAdapter;

#[contractimpl]
impl SwapAdapter {
    /// Swap exactly `amount_in` of `source` held by `from` into `target`, sent back to `from`.
    /// Must fail (and move nothing) if the output would be below `min_out`. Returns the amount out.
    pub fn swap(env: Env, from: Address, source: Address, target: Address, amount_in: i128, min_out: i128) -> i128 {
        todo!()
    }

    /// Expected output for `amount_in`, for quotes and the vault's minimum-output check.
    pub fn quote(env: Env, source: Address, target: Address, amount_in: i128) -> i128 {
        todo!()
    }

    /// "dex:<name>" or "testnet-adapter", shown in the UI next to every execution.
    pub fn kind(env: Env) -> String {
        todo!()
    }
}
