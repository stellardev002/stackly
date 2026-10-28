import type { Position, VaultTransaction } from "@repo/stellar/vault";
import { nowMs, nowSeconds, read, update, type MockDb } from "../db";
import { HttpError, ok, route } from "../router";
import { demoHash, iso, pad3 } from "../util";

/**
 * Positions. In live mode the reads come from the indexer API and the writes are Soroban contract calls signed
 * in the user's wallet; here both are answered in the browser. Writes apply the rules the contract enforces
 * (PRD §10), so the UI's error paths behave as they will on Testnet.
 */

function find(db: MockDb, id: string) {
	const position = db.positions.find((p) => p.id === id);
	if (!position) throw new HttpError(404, "We couldn't find that vault.");
	return position;
}

function owned(db: MockDb, id: string, owner: unknown) {
	const position = find(db, id);
	// The contract checks `owner.require_auth()`: only the owner's wallet can act on a position.
	if (owner && owner !== position.owner) throw new HttpError(403, "Only the wallet that owns this vault can do that.");
	return position;
}

function positiveStroops(value: unknown, field: string) {
	let amount: bigint;
	try {
		amount = BigInt(String(value));
	} catch {
		throw new HttpError(400, `${field} must be an amount in stroops`);
	}
	if (amount <= 0n) throw new HttpError(400, "Enter an amount greater than zero.");
	return amount;
}

function nextId(list: { id: string }[], prefix: string) {
	const used = new Set(list.map((item) => item.id));
	let n = list.filter((item) => item.id.startsWith(prefix)).length + 1;
	while (used.has(`${prefix}${pad3(n)}`)) n++;
	return `${prefix}${pad3(n)}`;
}

/** A real Testnet hash from a wallet-signed record transaction (64 hex chars); anything else gets a demo hash. */
const realHash = (value: unknown) => (typeof value === "string" && /^[0-9a-f]{64}$/i.test(value) ? value.toLowerCase() : null);

function record(db: MockDb, position: Position, row: Pick<VaultTransaction, "id" | "type" | "asset" | "amount">, txHash: unknown) {
	const entry: VaultTransaction = {
		...row,
		position_id: position.id,
		counter_asset: null,
		counter_amount: null,
		execution_id: null,
		failure_reason: null,
		status: "confirmed",
		tx_hash: realHash(txHash) ?? demoHash(),
		created_at: iso(nowMs(db)),
	};
	db.transactions.push(entry);
	return entry;
}

route("GET", "/positions", ({ query }) => {
	const owner = query.get("owner");
	const status = query.get("status");
	const list = read()
		.positions.filter((p) => (!owner || p.owner === owner) && (!status || p.status === status))
		.sort((a, b) => b.created_at.localeCompare(a.created_at));
	return ok(list);
});

route("GET", "/positions/:id", ({ params }) => ok(find(read(), params.id!)));

route("POST", "/positions", ({ body }) =>
	update((db) => {
		const owner = String(body.owner ?? "");
		if (!db.wallets.some((w) => w.address === owner)) throw new HttpError(401, "Connect a wallet first.");
		const purchase = positiveStroops(body.purchase_amount, "purchase_amount");
		const interval = Number(body.interval_seconds);
		if (!Number.isInteger(interval) || interval <= 0) throw new HttpError(400, "Choose a purchase frequency.");
		const slippage = Number(body.max_slippage_bps);
		if (!Number.isInteger(slippage) || slippage < 10 || slippage > 500) throw new HttpError(400, "Maximum slippage must be between 0.1% and 5%.");
		const start = Math.max(Number(body.start_ts) || 0, nowSeconds(db));
		const end = body.end_ts ? Number(body.end_ts) : null;
		if (end !== null && end <= start) throw new HttpError(400, "The end date must be after the start date.");
		const position: Position = {
			id: nextId(db.positions, "STK-"),
			name: String(body.name || "My stack").slice(0, 40),
			owner,
			source_asset: String(body.source_asset),
			target_asset: String(body.target_asset),
			purchase_amount: purchase.toString(),
			interval_seconds: interval,
			start_ts: start,
			end_ts: end,
			next_execution_ts: start,
			max_slippage_bps: slippage,
			total_deposited: "0",
			total_spent: "0",
			source_balance: "0",
			target_balance: "0",
			execution_count: 0,
			status: "created",
			created_at: iso(nowMs(db)),
		};
		db.positions.push(position);
		return ok(position, "Vault created", 201);
	}),
);

route("POST", "/positions/:id/deposit", ({ params, body }) =>
	update((db) => {
		const position = owned(db, params.id!, body.owner);
		const amount = positiveStroops(body.amount, "amount");
		const wallet = db.wallets.find((w) => w.address === position.owner);
		if (!wallet || BigInt(wallet.usdc) < amount) throw new HttpError(400, "Your wallet doesn't hold enough USDC for this deposit.");
		wallet.usdc = (BigInt(wallet.usdc) - amount).toString();
		position.total_deposited = (BigInt(position.total_deposited) + amount).toString();
		position.source_balance = (BigInt(position.source_balance) + amount).toString();
		const transaction = record(db, position, { id: nextId(db.transactions, "DP-"), type: "deposit", asset: position.source_asset, amount: amount.toString() }, body.tx_hash);
		return ok({ position, transaction }, "Deposit confirmed");
	}),
);

const transitions: Record<string, { from: Position["status"][]; to: Position["status"]; message: string }> = {
	activate: { from: ["created"], to: "active", message: "Schedule started" },
	pause: { from: ["active"], to: "paused", message: "Strategy paused" },
	resume: { from: ["paused"], to: "active", message: "Strategy resumed" },
};

for (const [action, { from, to, message }] of Object.entries(transitions)) {
	route("POST", `/positions/:id/${action}`, ({ params, body }) =>
		update((db) => {
			const position = owned(db, params.id!, body.owner);
			if (!from.includes(position.status)) throw new HttpError(409, `This vault is ${position.status}, so it can't be ${to === "active" ? "started" : to}.`);
			position.status = to;
			// Resuming never back-fills missed intervals: the next one is no earlier than now.
			if (to === "active") {
				const now = nowSeconds(db);
				while (position.next_execution_ts < now - 60) position.next_execution_ts += position.interval_seconds;
			}
			return ok({ position }, message);
		}),
	);
}

route("POST", "/positions/:id/withdraw", ({ params, body }) =>
	update((db) => {
		const position = owned(db, params.id!, body.owner);
		const amount = positiveStroops(body.amount, "amount");
		const side = body.asset === "target" ? "target" : "source";
		const balanceKey = side === "target" ? "target_balance" : "source_balance";
		// The contract rejects withdrawals above the position's available balance (PRD Screen 11).
		if (BigInt(position[balanceKey]) < amount) throw new HttpError(400, "That's more than this vault holds. Enter the available balance or less.");
		position[balanceKey] = (BigInt(position[balanceKey]) - amount).toString();
		const wallet = db.wallets.find((w) => w.address === position.owner)!;
		const walletKey = side === "target" ? "xlm" : "usdc";
		wallet[walletKey] = (BigInt(wallet[walletKey]) + amount).toString();
		const asset = side === "target" ? position.target_asset : position.source_asset;
		const transaction = record(db, position, { id: nextId(db.transactions, "WD-"), type: "withdrawal", asset, amount: amount.toString() }, body.tx_hash);
		return ok({ position, transaction }, "Withdrawal confirmed");
	}),
);
