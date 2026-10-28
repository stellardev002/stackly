/**
 * The DCA vault's data model, mirrored from the Soroban contract (`contracts/dca-vault/src/types.rs`) and the
 * indexer schema (`supabase/migrations`). Keep the three in step. Amounts are strings of stroops (i128 on chain)
 * so nothing loses precision in JSON. Ids are the display references the UI shows (STK-001, EX-004, DP-001).
 */

/** PRD §10 "Position status". `created` is configured but not yet activated. */
export type PositionStatus = "created" | "active" | "paused" | "closed";

export type Frequency = "daily" | "weekly" | "monthly";

const DAY_SECONDS = 86_400;

/**
 * The contract stores intervals in seconds. "Monthly" is a fixed 30-day interval, not a calendar month,
 * and the UI must say so wherever a monthly schedule is chosen or shown (PRD Screen 4).
 */
export const FREQUENCY_SECONDS: Record<Frequency, number> = {
	daily: DAY_SECONDS,
	weekly: 7 * DAY_SECONDS,
	monthly: 30 * DAY_SECONDS,
};

export const MONTHLY_NOTE = "Monthly is a fixed 30-day interval, not a calendar month, so the date drifts against the calendar.";

export function frequencyOf(intervalSeconds: number): Frequency | null {
	const match = (Object.keys(FREQUENCY_SECONDS) as Frequency[]).find((f) => FREQUENCY_SECONDS[f] === intervalSeconds);
	return match ?? null;
}

/** PRD §10 "DCA Position Data". */
export interface Position {
	id: string;
	/** Off-chain label ("The weekly stack"); the contract doesn't store it. */
	name: string;
	owner: string;
	/** Asset ids ("USDC:G…" or "XLM"), see `assetId`. */
	source_asset: string;
	target_asset: string;
	purchase_amount: string;
	interval_seconds: number;
	/** Unix seconds. */
	start_ts: number;
	end_ts: number | null;
	next_execution_ts: number;
	/** Basis points (100 = 1%). */
	max_slippage_bps: number;
	total_deposited: string;
	total_spent: string;
	source_balance: string;
	target_balance: string;
	execution_count: number;
	status: PositionStatus;
	created_at: string;
}

/** PRD Screen 8. */
export type ExecutionStatus = "scheduled" | "eligible" | "submitted" | "completed" | "failed" | "skipped";

export interface ExecutionEvent {
	at: string;
	label: string;
}

export interface Execution {
	id: string;
	position_id: string;
	/** Which interval this was (0-based); the contract completes each one at most once. */
	interval_index: number;
	/** 1 for the first try at an interval, 2 for the keeper's retry, … */
	attempt: number;
	source_amount: string;
	received_amount: string | null;
	/** Source units paid per target unit ("0.25" USDC per XLM), as a decimal string. */
	execution_price: string | null;
	min_received: string;
	slippage_bps: number | null;
	/** Protocol / adapter fee in the source asset (stroops). */
	fee: string | null;
	/** Stellar network fee in XLM (stroops). */
	network_fee: string | null;
	status: ExecutionStatus;
	failure_reason: string | null;
	/** Null when the attempt stopped before submission. */
	tx_hash: string | null;
	scheduled_at: string;
	executed_at: string | null;
	events: ExecutionEvent[];
}

/** PRD Screen 9. */
export type TransactionType = "deposit" | "swap" | "withdrawal" | "failed_execution";

export interface VaultTransaction {
	id: string;
	position_id: string;
	type: TransactionType;
	asset: string;
	amount: string;
	/** For swaps: what came back (target asset). */
	counter_asset: string | null;
	counter_amount: string | null;
	execution_id: string | null;
	failure_reason: string | null;
	status: "pending" | "confirmed" | "failed";
	tx_hash: string | null;
	created_at: string;
}
