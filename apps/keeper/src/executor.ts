import type { KeeperConfig } from "./config";

export interface ExecutionOutcome {
	txHash: string;
	receivedAmount: string;
	fee: string;
}

/** A failure worth retrying on the next tick (RPC timeout, fee bump), as opposed to a contract rejection. */
export class RetryableError extends Error {}

/**
 * Calls `execute(position_id, interval_index)` on the vault contract, signed by the keeper account.
 *
 * Keeper rules (PRD §12), enforced by the contract, not by this code: the keeper can only trigger a due
 * interval. It cannot withdraw, change parameters or recipients, execute early, exceed the purchase amount
 * or bypass the slippage check. The contract computes the minimum output from the position's own
 * `max_slippage_bps`; the keeper passes no price or amount.
 *
 * TODO(Module 3): build the invocation with @stellar/stellar-sdk (`contract.Client` or
 * `Contract.call` + `rpc.Server.prepareTransaction`), sign with config.keeperSecret, send, poll
 * `getTransaction` until final, and read the `executed` event for the received amount.
 */
export async function executeOnChain(config: KeeperConfig, positionId: string, intervalIndex: number): Promise<ExecutionOutcome> {
	void config;
	throw new Error(`execute(${positionId}, ${intervalIndex}) is not wired to the contract yet`);
}
