import { USDC, XLM, assetId } from "@repo/stellar/assets";
import { toStroops } from "@repo/stellar/format";
import { FREQUENCY_SECONDS, type Execution, type Position, type VaultTransaction } from "@repo/stellar/vault";
import type { MockDb, MockWallet } from "./db";
import { DAY, demoHash, iso, random } from "./util";

/**
 * Demo accounts. Display only: shaped like Stellar keys (G + 55 base32) but not funded Testnet accounts.
 * `SEEDED_WALLET` carries the Figma story; `FRESH_WALLET` has funds and no vault (empty states, full create flow).
 */
export const SEEDED_WALLET = "GCL7XD2KQV5NMR4WSTACKLYDEMOWALLETQ7ZBH3FJ6LP2TNOTREAL9Q2M";
export const FRESH_WALLET = "GDFRESHSTACKLYDEMOWALLETK4NOVAULTYETX7HM2QPLW3RJTEST5EM5H";

/** Mock rate: 4 XLM per USDC (0.25 USDC / XLM), so 50 USDC buys 200 XLM as in the design. */
export const MOCK_XLM_PER_USDC = 4;

const NETWORK_FEE = "100"; // 0.00001 XLM

/** Most recent 09:00 UTC that is at least an hour ago, so the last purchase is always in the past. */
function lastPurchaseAt(now: number) {
	const d = new Date(now - 3_600_000);
	const at = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 9, 0, 0);
	return at <= now - 3_600_000 ? at : at - DAY;
}

/**
 * The design's story, with dates relative to the first run: "The weekly stack" (STK-001) buys 50 USDC of XLM
 * every 7 days. One 1,000 USDC deposit, four completed purchases of 200 XLM, and on the latest interval a first
 * attempt rejected for slippage (EX-004-A, nothing moved) before the keeper's retry completed (EX-004).
 */
export function buildSeed(version: number): MockDb {
	const rand = random(42);
	const usdc = assetId(USDC);
	const xlm = assetId(XLM);
	const week = FREQUENCY_SECONDS.weekly;
	const last = lastPurchaseAt(Date.now());
	const first = last - 21 * DAY;
	const fifty = toStroops("50");
	const twoHundred = toStroops("200");

	const executions: Execution[] = [];
	const transactions: VaultTransaction[] = [];

	const tx = (row: Partial<VaultTransaction> & Pick<VaultTransaction, "id" | "type" | "asset" | "amount" | "created_at">): VaultTransaction => ({
		position_id: "STK-001",
		counter_asset: null,
		counter_amount: null,
		execution_id: null,
		failure_reason: null,
		status: "confirmed",
		tx_hash: demoHash(rand),
		...row,
	});

	transactions.push(tx({ id: "DP-001", type: "deposit", asset: usdc, amount: toStroops("1000").toString(), created_at: iso(first - 17 * 3_600_000) }));

	for (let index = 0; index < 4; index++) {
		const at = first + index * 7 * DAY;
		const isRetry = index === 3;
		const id = `EX-00${index + 1}`;

		if (isRetry) {
			executions.push({
				id: "EX-004-A",
				position_id: "STK-001",
				interval_index: index,
				attempt: 1,
				source_amount: fifty.toString(),
				received_amount: null,
				execution_price: null,
				min_received: ((twoHundred * 995n) / 1000n).toString(),
				slippage_bps: null,
				fee: "0",
				network_fee: null,
				status: "failed",
				failure_reason: "The quote moved beyond your 0.50% maximum slippage before submission.",
				tx_hash: null,
				scheduled_at: iso(at),
				executed_at: iso(at),
				events: [
					{ at: iso(at), label: "Interval eligible" },
					{ at: iso(at + 4_000), label: "Quote checked" },
					{ at: iso(at + 6_000), label: "Failed · slippage limit" },
				],
			});
			transactions.push(
				tx({
					id: "EX-004-A",
					type: "failed_execution",
					asset: usdc,
					amount: fifty.toString(),
					execution_id: "EX-004-A",
					failure_reason: "Slippage limit · no swap",
					status: "failed",
					tx_hash: null,
					created_at: iso(at + 6_000),
				}),
			);
		}

		const done = isRetry ? at + 5 * 60_000 : at + 35_000;
		const hash = demoHash(rand);
		executions.push({
			id,
			position_id: "STK-001",
			interval_index: index,
			attempt: isRetry ? 2 : 1,
			source_amount: fifty.toString(),
			received_amount: twoHundred.toString(),
			execution_price: "0.25",
			min_received: ((twoHundred * 995n) / 1000n).toString(),
			slippage_bps: 12,
			fee: "0",
			network_fee: NETWORK_FEE,
			status: "completed",
			failure_reason: null,
			tx_hash: hash,
			scheduled_at: iso(at),
			executed_at: iso(done),
			events: isRetry
				? [
						{ at: iso(at), label: "Interval eligible" },
						{ at: iso(at + 6_000), label: "Initial attempt failed" },
						{ at: iso(at + 290_000), label: "Retry submitted" },
						{ at: iso(done), label: "Purchase completed" },
					]
				: [
						{ at: iso(at), label: "Interval eligible" },
						{ at: iso(at + 20_000), label: "Quote checked" },
						{ at: iso(at + 30_000), label: "Submitted" },
						{ at: iso(done), label: "Purchase completed" },
					],
		});
		transactions.push(
			tx({
				id,
				type: "swap",
				asset: usdc,
				amount: fifty.toString(),
				counter_asset: xlm,
				counter_amount: twoHundred.toString(),
				execution_id: id,
				tx_hash: hash,
				created_at: iso(done),
			}),
		);
	}

	const position: Position = {
		id: "STK-001",
		name: "The weekly stack",
		owner: SEEDED_WALLET,
		source_asset: usdc,
		target_asset: xlm,
		purchase_amount: fifty.toString(),
		interval_seconds: week,
		start_ts: first / 1000,
		end_ts: null,
		next_execution_ts: (last + 7 * DAY) / 1000,
		max_slippage_bps: 50,
		total_deposited: toStroops("1000").toString(),
		total_spent: toStroops("200").toString(),
		source_balance: toStroops("800").toString(),
		target_balance: toStroops("800").toString(),
		execution_count: 4,
		status: "active",
		created_at: iso(first - 18 * 3_600_000),
	};

	const wallets: MockWallet[] = [
		{ address: SEEDED_WALLET, provider: "freighter", usdc: toStroops("2500").toString(), xlm: toStroops("120").toString() },
		{ address: FRESH_WALLET, provider: "freighter", usdc: toStroops("1000").toString(), xlm: toStroops("50").toString() },
	];

	return {
		version,
		clock_offset_ms: 0,
		sim: { account: "seeded", wallet_installed: true, next_wallet: "approve", next_swap: "success", force: "none", auto_keeper: true },
		wallets,
		positions: [position],
		executions,
		transactions,
		pending: {},
	};
}
