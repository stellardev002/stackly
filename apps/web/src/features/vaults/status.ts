import type { ChipTone } from "@repo/ui/surface";
import type { Execution, ExecutionStatus, FailureReason, Position, PositionStatus, TransactionType, VaultTransaction } from "@repo/stellar/vault";

/** Every status label, tone and sentence. Components never decide these. */

interface StatusCopy {
	label: string;
	tone: ChipTone;
	/** Pulse while waiting on the network. */
	live?: boolean;
	description: string;
}

export const POSITION_STATUS: Record<PositionStatus, StatusCopy> = {
	pending: { label: "Not started", tone: "neutral", description: "Fund this vault and sign its purchases to start the schedule." },
	active: { label: "Active", tone: "soft", description: "Purchases run on schedule." },
	paused: { label: "Paused", tone: "warning", description: "No purchases run until you resume. Your balances stay in the vault." },
	cancelled: { label: "Cancelled", tone: "neutral", description: "This strategy was cancelled. You can still withdraw what's in the vault." },
	completed: { label: "Completed", tone: "success", description: "The end date has passed; this vault no longer purchases." },
};

/** PRD Screen 8. Scheduled / eligible are derived from the position; the backend reports the other four. */
export const EXECUTION_STATUS: Record<ExecutionStatus, StatusCopy> = {
	scheduled: { label: "Scheduled", tone: "dark", description: "Waiting for the next interval." },
	eligible: { label: "Eligible", tone: "accent", live: true, description: "Due now. The keeper will submit it shortly." },
	submitted: { label: "Submitted", tone: "warning", live: true, description: "Sent to Stellar Testnet, waiting for the result." },
	completed: { label: "Completed", tone: "success", description: "The swap executed and the XLM was added to your vault." },
	failed: { label: "Failed", tone: "danger", description: "This attempt didn't go through. Nothing was debited." },
	skipped: { label: "Skipped", tone: "neutral", description: "This interval wasn't attempted. Nothing was debited." },
};

/** Why a purchase failed or was skipped (backend `failureReason`), in plain words. */
export const FAILURE_REASON: Record<FailureReason, { title: string; body: string }> = {
	slippage_exceeded: { title: "Slippage limit exceeded", body: "The market moved beyond your maximum slippage, so the swap was rejected." },
	insufficient_liquidity: { title: "Not enough liquidity", body: "The Stellar DEX didn't have enough liquidity to fill the minimum output." },
	insufficient_balance: { title: "Insufficient vault balance", body: "The vault didn't hold enough USDC for this purchase. Deposit more to keep buying." },
	swap_reverted: { title: "Swap reverted", body: "The network rejected the swap transaction." },
	submission_failed: { title: "Submission failed", body: "The purchase couldn't be submitted to Stellar." },
};

export const failureText = (reason: string | null) => (reason && reason in FAILURE_REASON ? FAILURE_REASON[reason as FailureReason] : null);

export const TRANSACTION_TYPE: Record<TransactionType, string> = {
	deposit: "Deposit",
	swap: "Swap",
	withdrawal: "Withdrawal",
	failed_execution: "Failed Execution",
	adjustment: "Adjustment",
};

export const TRANSACTION_STATUS: Record<VaultTransaction["status"], StatusCopy> = {
	confirmed: { label: "Completed", tone: "success", description: "Confirmed on Stellar Testnet." },
	failed: { label: "Failed", tone: "danger", description: "No funds moved." },
	skipped: { label: "Skipped", tone: "neutral", description: "Not attempted; no funds moved." },
};

/**
 * The state of a position's next interval, for the "Upcoming purchase" / "Your next interval" cards: Scheduled until
 * due, Eligible once due, Submitted while the keeper's swap is in flight. An active position with no signed purchases
 * left can't run anything until the owner signs more.
 */
export function nextIntervalStatus(position: Position, executions: Execution[], now: number): StatusCopy & { key: string } {
	if (position.status !== "active") return { key: position.status, ...POSITION_STATUS[position.status] };
	if (executions.some((e) => e.position_id === position.id && e.status === "submitted")) return { key: "submitted", ...EXECUTION_STATUS.submitted };
	if (position.authorizations_remaining === 0) {
		return { key: "unsigned", label: "Needs signatures", tone: "warning", description: "No signed purchases are left, so the keeper can't buy. Sign more purchases to continue." };
	}
	if (position.next_execution_ts * 1000 <= now) return { key: "eligible", ...EXECUTION_STATUS.eligible };
	return { key: "scheduled", ...EXECUTION_STATUS.scheduled };
}

/** How many purchases the available balance still funds. */
export const fundedPurchases = (position: Pick<Position, "available_source" | "purchase_amount">) =>
	BigInt(position.purchase_amount) > 0n ? Number(BigInt(position.available_source) / BigInt(position.purchase_amount)) : 0;

/** A position account holds at most 19 unused signed purchases (Stellar's 20 signers, one is the wallet). */
export const MAX_AUTHORIZATIONS = 19;

/** How many purchases to sign: what the balance funds, at least 1, at most what still fits. */
export const purchasesToSign = (position: Pick<Position, "available_source" | "purchase_amount" | "authorizations_remaining">) =>
	Math.max(1, Math.min(MAX_AUTHORIZATIONS - position.authorizations_remaining, fundedPurchases(position) - position.authorizations_remaining));

/** Required wording on Review (PRD Screen 5); the backend's preview `notices` are shown alongside. */
export const EXECUTION_DISCLAIMER =
	"The amount of XLM received varies. Purchases may fail or be skipped if liquidity, slippage limits or funding aren't met. A failed purchase doesn't spend your USDC.";

/** Short reference for long backend ids (UUIDv7): the last 6 characters, uppercased. */
export const shortId = (id: string) => `#${id.replace(/-/g, "").slice(-6).toUpperCase()}`;
