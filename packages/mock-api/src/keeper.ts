import type { Execution, Position, VaultTransaction } from "@repo/stellar/vault";
import { nowMs, update, type MockDb } from "./db";
import { MOCK_XLM_PER_USDC } from "./seed";
import { demoHash, iso, pad3 } from "./util";

/**
 * A simulated keeper + contract, run on every mock request (as a real keeper polls). It follows the rules the
 * contract enforces: only active, due positions; one completed execution per interval; never more than the
 * purchase amount; a failed attempt moves nothing; an empty vault skips the interval.
 */

/** How long a submitted swap waits for "ledger close" before it settles. */
const SETTLE_MS = 4_000;
/** How long the keeper waits before retrying an interval whose last attempt failed. */
const RETRY_MS = 8_000;

const executionsOf = (db: MockDb, position: Position, interval: number) =>
	db.executions.filter((e) => e.position_id === position.id && e.interval_index === interval);

function baseId(db: MockDb, position: Position, interval: number) {
	const existing = db.executions.find((e) => e.position_id === position.id && e.interval_index === interval);
	if (existing) return existing.id.replace(/-[A-Z]$/, "");
	const used = new Set(db.executions.map((e) => e.id.replace(/-[A-Z]$/, "")));
	let n = used.size + 1;
	while (used.has(`EX-${pad3(n)}`)) n++;
	return `EX-${pad3(n)}`;
}

function transaction(row: Omit<VaultTransaction, "counter_asset" | "counter_amount" | "failure_reason" | "execution_id"> & Partial<VaultTransaction>): VaultTransaction {
	return { counter_asset: null, counter_amount: null, failure_reason: null, execution_id: null, ...row };
}

function startAttempt(db: MockDb, position: Position, now: number) {
	const interval = Math.round((position.next_execution_ts - position.start_ts) / position.interval_seconds);
	const attempts = executionsOf(db, position, interval);
	if (attempts.some((e) => e.status === "submitted" || e.status === "completed")) return;
	const lastFailure = attempts.filter((e) => e.status === "failed").at(-1);
	if (lastFailure && now - Date.parse(lastFailure.executed_at ?? lastFailure.scheduled_at) < RETRY_MS) return;

	const scheduledAt = iso(position.next_execution_ts * 1000);
	const amount = BigInt(position.purchase_amount);
	const base = baseId(db, position, interval);
	const failedSoFar = attempts.filter((e) => e.status === "failed").length;
	const expected = amount * BigInt(MOCK_XLM_PER_USDC);
	const minReceived = (expected * BigInt(10_000 - position.max_slippage_bps)) / 10_000n;
	const common = {
		position_id: position.id,
		interval_index: interval,
		attempt: attempts.length + 1,
		source_amount: amount.toString(),
		min_received: minReceived.toString(),
		fee: "0",
		scheduled_at: scheduledAt,
	};

	// Not enough left in the vault: the contract rejects the purchase, the keeper skips the interval.
	if (BigInt(position.source_balance) < amount) {
		const id = `${base}-S`;
		db.executions.push({
			...common,
			id,
			received_amount: null,
			execution_price: null,
			slippage_bps: null,
			network_fee: null,
			status: "skipped",
			failure_reason: "Insufficient vault balance for this purchase. Deposit more to resume purchases.",
			tx_hash: null,
			executed_at: iso(now),
			events: [
				{ at: scheduledAt, label: "Interval eligible" },
				{ at: iso(now), label: "Skipped · insufficient balance" },
			],
		});
		db.transactions.push(
			transaction({ id, position_id: position.id, type: "failed_execution", asset: position.source_asset, amount: amount.toString(), execution_id: id, failure_reason: "Insufficient balance · skipped", status: "failed", tx_hash: null, created_at: iso(now) }),
		);
		position.next_execution_ts += position.interval_seconds;
		return;
	}

	const outcome = db.sim.next_swap;
	db.sim.next_swap = "success";

	// The quote is checked before submission; outside the slippage limit nothing is sent.
	if (outcome === "slippage") {
		const id = `${base}-${String.fromCharCode(65 + failedSoFar)}`;
		db.executions.push({
			...common,
			id,
			received_amount: null,
			execution_price: null,
			slippage_bps: null,
			network_fee: null,
			status: "failed",
			failure_reason: `The quote moved beyond your ${(position.max_slippage_bps / 100).toFixed(2)}% maximum slippage before submission.`,
			tx_hash: null,
			executed_at: iso(now),
			events: [
				{ at: scheduledAt, label: "Interval eligible" },
				{ at: iso(now), label: "Quote checked" },
				{ at: iso(now), label: "Failed · slippage limit" },
			],
		});
		db.transactions.push(
			transaction({ id, position_id: position.id, type: "failed_execution", asset: position.source_asset, amount: amount.toString(), execution_id: id, failure_reason: "Slippage limit · no swap", status: "failed", tx_hash: null, created_at: iso(now) }),
		);
		return;
	}

	const id = outcome === "liquidity" ? `${base}-${String.fromCharCode(65 + failedSoFar)}` : base;
	db.executions.push({
		...common,
		id,
		received_amount: null,
		execution_price: null,
		slippage_bps: null,
		network_fee: null,
		status: "submitted",
		failure_reason: null,
		tx_hash: demoHash(),
		executed_at: null,
		events: [
			{ at: scheduledAt, label: attempts.length ? "Retry eligible" : "Interval eligible" },
			{ at: iso(now), label: "Quote checked" },
			{ at: iso(now), label: attempts.length ? "Retry submitted" : "Submitted" },
		],
	});
	db.pending[id] = { outcome, submitted_at: now };
}

function settle(db: MockDb, now: number) {
	for (const [id, { outcome, submitted_at }] of Object.entries(db.pending)) {
		if (now - submitted_at < SETTLE_MS) continue;
		delete db.pending[id];
		const execution = db.executions.find((e) => e.id === id);
		const position = execution && db.positions.find((p) => p.id === execution.position_id);
		if (!execution || !position) continue;
		const amount = BigInt(execution.source_amount);
		const settledAt = iso(submitted_at + SETTLE_MS);

		if (outcome === "liquidity") {
			Object.assign<Execution, Partial<Execution>>(execution, {
				status: "failed",
				failure_reason: "The pool didn't have enough liquidity to fill the minimum output. The transaction reverted.",
				network_fee: "100",
				executed_at: settledAt,
				events: [...execution.events, { at: settledAt, label: "Failed · insufficient liquidity" }],
			});
			db.transactions.push(
				transaction({ id, position_id: position.id, type: "failed_execution", asset: position.source_asset, amount: amount.toString(), execution_id: id, failure_reason: "Insufficient liquidity · reverted", status: "failed", tx_hash: execution.tx_hash, created_at: settledAt }),
			);
			continue;
		}

		// A small, varying price inside the position's slippage limit.
		const slippageBps = Math.floor(Math.random() * Math.min(40, position.max_slippage_bps));
		const ideal = amount * BigInt(MOCK_XLM_PER_USDC);
		const received = (ideal * BigInt(10_000 - slippageBps)) / 10_000n;
		const price = (Number(amount) / Number(received)).toFixed(4);

		Object.assign<Execution, Partial<Execution>>(execution, {
			status: "completed",
			received_amount: received.toString(),
			execution_price: price,
			slippage_bps: slippageBps,
			network_fee: "100",
			executed_at: settledAt,
			events: [...execution.events, { at: settledAt, label: "Purchase completed" }],
		});
		position.source_balance = (BigInt(position.source_balance) - amount).toString();
		position.total_spent = (BigInt(position.total_spent) + amount).toString();
		position.target_balance = (BigInt(position.target_balance) + received).toString();
		position.execution_count += 1;
		position.next_execution_ts += position.interval_seconds;
		if (position.end_ts && position.next_execution_ts > position.end_ts) position.status = "closed";
		db.transactions.push(
			transaction({ id, position_id: position.id, type: "swap", asset: position.source_asset, amount: amount.toString(), counter_asset: position.target_asset, counter_amount: received.toString(), execution_id: id, status: "confirmed", tx_hash: execution.tx_hash, created_at: settledAt }),
		);
	}
}

/** One keeper pass: settle what's in flight, then start every due interval. */
export function runKeeper() {
	update((db) => {
		const now = nowMs(db);
		settle(db, now);
		if (!db.sim.auto_keeper) return;
		for (const position of db.positions) {
			if (position.status !== "active") continue;
			if (position.next_execution_ts * 1000 > now) continue;
			if (position.end_ts && position.next_execution_ts > position.end_ts) continue;
			startAttempt(db, position, now);
		}
	});
}
