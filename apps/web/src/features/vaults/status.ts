import type { ChipTone } from "@repo/ui/surface";
import type { Execution, ExecutionStatus, Position, PositionStatus, TransactionType, VaultTransaction } from "@repo/stellar/vault";

/** Every status label, tone and sentence. Components never decide these. */

interface StatusCopy {
	label: string;
	tone: ChipTone;
	/** Pulse while waiting on the network. */
	live?: boolean;
	description: string;
}

export const POSITION_STATUS: Record<PositionStatus, StatusCopy> = {
	created: { label: "Not started", tone: "neutral", description: "Fund this vault and start the schedule to begin purchasing." },
	active: { label: "Active", tone: "soft", description: "Purchases run on schedule." },
	paused: { label: "Paused", tone: "warning", description: "No purchases run until you resume. Your balances stay in the vault." },
	closed: { label: "Ended", tone: "neutral", description: "The end date has passed; this vault no longer purchases." },
};

/** PRD Screen 8. Only `submitted` waits on the network. */
export const EXECUTION_STATUS: Record<ExecutionStatus, StatusCopy> = {
	scheduled: { label: "Scheduled", tone: "dark", description: "Waiting for the next interval." },
	eligible: { label: "Eligible", tone: "accent", live: true, description: "Due now. The keeper will submit it shortly." },
	submitted: { label: "Submitted", tone: "warning", live: true, description: "Sent to Stellar Testnet, waiting for the ledger to close." },
	completed: { label: "Completed", tone: "success", description: "The swap executed and the XLM was added to your vault." },
	failed: { label: "Failed", tone: "danger", description: "This attempt didn't execute. Your balances are unchanged." },
	skipped: { label: "Skipped", tone: "neutral", description: "This interval was skipped. Your balances are unchanged." },
};

export const TRANSACTION_TYPE: Record<TransactionType, string> = {
	deposit: "Deposit",
	swap: "Swap",
	withdrawal: "Withdrawal",
	failed_execution: "Failed Execution",
};

export const TRANSACTION_STATUS: Record<VaultTransaction["status"], StatusCopy> = {
	pending: { label: "Pending", tone: "warning", live: true, description: "Waiting for confirmation." },
	confirmed: { label: "Completed", tone: "success", description: "Confirmed on Stellar Testnet." },
	failed: { label: "Failed", tone: "danger", description: "No funds moved." },
};

/**
 * The state of a position's next interval, for the "Upcoming purchase" / "Your next interval" cards: it is
 * Scheduled until due, Eligible once due, Submitted while the keeper's swap is in flight.
 */
export function nextIntervalStatus(position: Position, executions: Execution[], now: number): StatusCopy & { key: string } {
	if (position.status === "paused") return { key: "paused", label: "Paused", tone: "warning", description: POSITION_STATUS.paused.description };
	if (position.status === "created") return { key: "created", label: "Not started", tone: "neutral", description: POSITION_STATUS.created.description };
	if (position.status === "closed") return { key: "closed", label: "Ended", tone: "neutral", description: POSITION_STATUS.closed.description };
	if (executions.some((e) => e.position_id === position.id && e.status === "submitted")) return { key: "submitted", ...EXECUTION_STATUS.submitted };
	if (position.next_execution_ts * 1000 <= now) return { key: "eligible", ...EXECUTION_STATUS.eligible };
	return { key: "scheduled", ...EXECUTION_STATUS.scheduled };
}

/** How many purchases the remaining balance still funds. */
export const fundedPurchases = (position: Pick<Position, "source_balance" | "purchase_amount">) =>
	Number(BigInt(position.source_balance) / BigInt(position.purchase_amount));

/** Required wording on Review (PRD Screen 5). */
export const EXECUTION_DISCLAIMER =
	"The amount of XLM received varies. Purchases may fail or be skipped if liquidity, slippage limits, funding or execution conditions are not met. A failed purchase doesn't spend your USDC.";
