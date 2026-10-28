/**
 * The UI's data model, mapped from the Stackly backend (https://api.usestackly.app/docs) by
 * `apps/web/src/lib/api/adapters.ts`. The backend sends decimal strings and camelCase; the UI keeps amounts as
 * stroop strings (integer, 7 decimals) so nothing loses precision and money maths stays in BigInt.
 *
 * Architecture (backend): each DCA position has its own classic Stellar account whose only signer is the owner's
 * wallet. Deposits are payments into it; purchases are swaps the wallet pre-authorizes in batches (fixed amount,
 * minimum output, destination and earliest time), which the backend's keeper submits when due.
 */

export type PositionStatus = "pending" | "active" | "paused" | "cancelled" | "completed";

export type Frequency = "daily" | "weekly" | "monthly";

const DAY_SECONDS = 86_400;

/** Monthly is a fixed 30-day interval, not a calendar month (PRD Screen 4, backend `intervalSeconds`). */
export const FREQUENCY_SECONDS: Record<Frequency, number> = {
	daily: DAY_SECONDS,
	weekly: 7 * DAY_SECONDS,
	monthly: 30 * DAY_SECONDS,
};

export const MONTHLY_NOTE = "Monthly is a fixed 30-day interval, not a calendar month, so the date drifts against the calendar.";

/** An asset as the backend lists it (`GET /assets`). `id` is what create / withdraw requests take. */
export interface AssetRef {
	id: string;
	code: string;
	/** Empty for native XLM. */
	issuer: string;
}

export type FailureReason = "insufficient_balance" | "insufficient_liquidity" | "slippage_exceeded" | "swap_reverted" | "submission_failed";

export interface LastExecution {
	id: string;
	status: ExecutionStatus;
	scheduled_for: string;
	failure_reason: FailureReason | null;
}

/** A position with its balances (`GET /dca-positions/{id}` + `/balance`). */
export interface Position {
	id: string;
	/** Display label derived from the strategy ("Weekly USDC → XLM"); the backend stores no name. */
	name: string;
	source: AssetRef;
	target: AssetRef;
	/** Asset codes, for display and `money()`. */
	source_asset: string;
	target_asset: string;
	frequency: Frequency;
	purchase_amount: string;
	interval_seconds: number;
	/** Unix seconds. */
	start_ts: number;
	end_ts: number | null;
	next_execution_ts: number;
	max_slippage_bps: number;
	status: PositionStatus;
	/** Signed purchases still ready for the keeper. Zero means nothing can run until the owner signs more. */
	authorizations_remaining: number;
	last_execution: LastExecution | null;
	created_at: string;
	total_deposited: string;
	total_spent: string;
	total_withdrawn: string;
	/** Source still in the account (deposited − spent − withdrawn). */
	source_balance: string;
	/** Source not promised to an in-flight purchase: what gates purchases and withdrawals. */
	available_source: string;
	reserved_for_purchase: string;
	target_balance: string;
	available_target: string;
	execution_count: number;
}

/** The position's own Stellar account: deposits are payments to `address`. */
export interface PositionAccount {
	address: string;
	ready: boolean;
	explorer_url: string;
}

/** Backend statuses are submitted · completed · failed · skipped; scheduled / eligible are derived for display. */
export type ExecutionStatus = "scheduled" | "eligible" | "submitted" | "completed" | "failed" | "skipped";

export interface Execution {
	id: string;
	position_id: string;
	scheduled_at: string;
	interval_seconds: number;
	status: ExecutionStatus;
	source_asset: string;
	target_asset: string;
	source_amount: string;
	expected_amount: string | null;
	min_received: string | null;
	received_amount: string | null;
	/** Source paid per target unit, decimal string. */
	execution_price: string | null;
	slippage_bps: number | null;
	/** Network fee in XLM (stroops), paid by the project. */
	fee: string | null;
	tx_hash: string | null;
	explorer_url: string | null;
	failure_reason: FailureReason | null;
	/** The cause can clear (slippage, liquidity, balance), so the owner may make up the purchase. */
	retryable: boolean;
	executed_at: string | null;
	created_at: string;
}

/** One `GET /history` entry (Screen 9). */
export type TransactionType = "deposit" | "swap" | "withdrawal" | "failed_execution" | "adjustment";

export interface VaultTransaction {
	id: string;
	position_id: string;
	type: TransactionType;
	status: "confirmed" | "failed" | "skipped";
	asset: string;
	/** Absolute amount in stroops; `direction` says which way it moved. */
	amount: string;
	direction: "in" | "out";
	counter_asset: string | null;
	counter_amount: string | null;
	tx_hash: string | null;
	explorer_url: string | null;
	failure_reason: string | null;
	created_at: string;
}
