import { assetCode } from "@repo/stellar/assets";
import { nowMs, read } from "../db";
import { HttpError, ok, route } from "../router";
import { paginate } from "../util";

/** Read-only views: wallet balances, executions, transaction history and the portfolio summary. */

/** The backend's "now". The demo clock can run ahead of real time; countdowns follow it. */
route("GET", "/clock", () => ok({ now: nowMs() }));

route("GET", "/wallets/:address", ({ params }) => {
	const wallet = read().wallets.find((w) => w.address === params.address);
	if (!wallet) throw new HttpError(404, "Wallet not found on Testnet.");
	return ok(wallet);
});

route("GET", "/positions/:id/executions", ({ params }) => {
	const list = read()
		.executions.filter((e) => e.position_id === params.id)
		.sort((a, b) => (b.executed_at ?? b.scheduled_at).localeCompare(a.executed_at ?? a.scheduled_at));
	return ok(list);
});

/** Recent executions across the owner's positions (dashboard "Recent swaps"). */
route("GET", "/executions", ({ query }) => {
	const db = read();
	const owner = query.get("owner");
	const ids = new Set(db.positions.filter((p) => !owner || p.owner === owner).map((p) => p.id));
	const list = db.executions
		.filter((e) => ids.has(e.position_id))
		.sort((a, b) => (b.executed_at ?? b.scheduled_at).localeCompare(a.executed_at ?? a.scheduled_at))
		.slice(0, Number(query.get("limit")) || 10);
	return ok(list);
});

route("GET", "/executions/:id", ({ params }) => {
	const execution = read().executions.find((e) => e.id === params.id);
	if (!execution) throw new HttpError(404, "We couldn't find that execution.");
	return ok(execution);
});

/** History with the design's filters: type, asset, status, date range and an id / reference search. */
route("GET", "/transactions", ({ query }) => {
	const db = read();
	const owner = query.get("owner");
	const type = query.get("type");
	const status = query.get("status");
	const asset = query.get("asset");
	const positionId = query.get("position_id");
	const from = query.get("from");
	const to = query.get("to");
	const search = query.get("q")?.trim().toLowerCase();
	const ownedIds = new Set(db.positions.filter((p) => !owner || p.owner === owner).map((p) => p.id));
	const list = db.transactions
		.filter(
			(t) =>
				ownedIds.has(t.position_id) &&
				(!type || t.type === type) &&
				(!status || t.status === status) &&
				(!asset || assetCode(t.asset) === asset || (t.counter_asset && assetCode(t.counter_asset) === asset)) &&
				(!positionId || t.position_id === positionId) &&
				(!from || t.created_at >= from) &&
				(!to || t.created_at <= to) &&
				(!search || t.id.toLowerCase().includes(search) || t.tx_hash?.toLowerCase().includes(search) || t.position_id.toLowerCase().includes(search)),
		)
		.sort((a, b) => b.created_at.localeCompare(a.created_at));
	return ok(paginate(list, Number(query.get("page")), Number(query.get("limit"))));
});

/**
 * Totals per asset. Holdings of different assets are never summed into one value (PRD Screen 3), and there is
 * no market valuation: the average price is spent ÷ received over completed swaps.
 */
route("GET", "/portfolio", ({ query }) => {
	const db = read();
	const owner = query.get("owner");
	const positions = db.positions.filter((p) => !owner || p.owner === owner);
	const ids = new Set(positions.map((p) => p.id));
	const sum = (values: string[]) => values.reduce((total, v) => total + BigInt(v), 0n);
	const completed = db.executions
		.filter((e) => ids.has(e.position_id) && e.status === "completed")
		.sort((a, b) => (a.executed_at ?? "").localeCompare(b.executed_at ?? ""));
	const spent = completed.reduce((total, e) => total + BigInt(e.source_amount), 0n);
	const received = completed.reduce((total, e) => total + BigInt(e.received_amount ?? "0"), 0n);

	let cumulative = 0n;
	const series = completed.map((e) => {
		cumulative += BigInt(e.received_amount ?? "0");
		return { at: e.executed_at ?? e.scheduled_at, received: e.received_amount ?? "0", cumulative: cumulative.toString() };
	});

	return ok({
		total_deposited: sum(positions.map((p) => p.total_deposited)).toString(),
		total_spent: sum(positions.map((p) => p.total_spent)).toString(),
		source_balance: sum(positions.map((p) => p.source_balance)).toString(),
		target_balance: sum(positions.map((p) => p.target_balance)).toString(),
		purchase_count: completed.length,
		/** Source units paid per target unit, or null before the first completed swap. */
		average_price: received > 0n ? (Number(spent) / Number(received)).toFixed(4) : null,
		series,
	});
});
