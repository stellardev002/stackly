//! Contract events, indexed by `apps/keeper/src/indexer.ts`. Topic names are part of the interface:
//! the indexer filters on them, so rename both sides together.
//!
//! | Topic                     | Data                                             |
//! |---------------------------|--------------------------------------------------|
//! | ("created", position_id)  | owner, source, target, purchase_amount, interval |
//! | ("deposit", position_id)  | amount                                           |
//! | ("executed", position_id) | interval_index, amount_in, amount_out            |
//! | ("exec_fail", position_id)| interval_index, error code                       |
//! | ("paused", position_id)   | ()                                               |
//! | ("resumed", position_id)  | next_execution_ts                                |
//! | ("withdraw", position_id) | side, amount                                     |
//!
//! A rejected `execute` reverts, so its event never lands; the keeper records those failures from the
//! transaction result instead. `exec_fail` is for failures the contract handles without reverting.
//!
//! TODO(Module 1): one `#[contractevent]` struct (or `env.events().publish`) helper per row.
