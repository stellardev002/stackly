import { decimalToStroops } from "@repo/stellar/format";
import type { AssetRef, Execution, Frequency, Position, PositionAccount, VaultTransaction } from "@repo/stellar/vault";
import type { AssetTotalsDto, DashboardDto, DcaPositionDto, ExecutionDto, HistoryEntryDto, PortfolioDto, PositionAccountDto, PositionBalanceDto } from "./dto";

/** Backend records → the UI model (`@repo/stellar/vault`): camelCase → snake_case, decimals → stroops, ISO → unix. */

const seconds = (iso: string) => Math.floor(Date.parse(iso) / 1000);
const abs = (stroops: string) => stroops.replace(/^-/, "");
const asset = (a: { id: string; code: string; issuer: string }): AssetRef => ({ id: a.id, code: a.code, issuer: a.issuer });

const FREQUENCY_NAME: Record<Frequency, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };

export function toPosition(p: DcaPositionDto, b?: PositionBalanceDto | null): Position {
	return {
		id: p.id,
		name: `${FREQUENCY_NAME[p.frequency]} ${p.sourceAsset.code} → ${p.targetAsset.code}`,
		source: asset(p.sourceAsset),
		target: asset(p.targetAsset),
		source_asset: p.sourceAsset.code,
		target_asset: p.targetAsset.code,
		frequency: p.frequency,
		purchase_amount: decimalToStroops(p.amountPerPurchase),
		interval_seconds: p.intervalSeconds,
		start_ts: seconds(p.startAt),
		end_ts: p.endAt ? seconds(p.endAt) : null,
		next_execution_ts: seconds(p.nextExecutionAt),
		max_slippage_bps: p.maxSlippageBps,
		status: p.status,
		authorizations_remaining: p.authorizationsRemaining,
		last_execution: p.lastExecution
			? { id: p.lastExecution.id, status: p.lastExecution.status, scheduled_for: p.lastExecution.scheduledFor, failure_reason: p.lastExecution.failureReason }
			: null,
		created_at: p.createdAt,
		total_deposited: decimalToStroops(b?.totalDeposited),
		total_spent: decimalToStroops(b?.totalSpent),
		total_withdrawn: decimalToStroops(b?.totalWithdrawn),
		source_balance: decimalToStroops(b?.remainingSourceBalance),
		available_source: decimalToStroops(b?.availableSourceBalance),
		reserved_for_purchase: decimalToStroops(b?.reservedForPurchase),
		target_balance: decimalToStroops(b?.purchasedTargetBalance),
		available_target: decimalToStroops(b?.availableTargetBalance),
		execution_count: b?.executionCount ?? 0,
	};
}

export const toAccount = (a: PositionAccountDto): PositionAccount => ({ address: a.address, ready: a.ready, explorer_url: a.explorerUrl });

export function toExecution(e: ExecutionDto): Execution {
	const opt = (v: string | null) => (v == null ? null : decimalToStroops(v));
	return {
		id: e.id,
		position_id: e.positionId,
		scheduled_at: e.scheduledFor,
		interval_seconds: e.intervalSeconds,
		status: e.status,
		source_asset: e.sourceAsset.code,
		target_asset: e.targetAsset.code,
		source_amount: decimalToStroops(e.sourceAmount),
		expected_amount: opt(e.expectedReceiveAmount),
		min_received: opt(e.minReceiveAmount),
		received_amount: opt(e.receivedAmount),
		execution_price: e.executionPrice,
		slippage_bps: e.slippageBps,
		fee: opt(e.feeAmount),
		tx_hash: e.txHash,
		explorer_url: e.explorerUrl,
		failure_reason: e.failureReason,
		retryable: e.retryable,
		executed_at: e.completedAt,
		created_at: e.createdAt,
	};
}

export function toTransaction(h: HistoryEntryDto): VaultTransaction {
	const amount = decimalToStroops(h.amount);
	return {
		id: h.id,
		position_id: h.positionId,
		type: h.type,
		status: h.status,
		asset: h.asset.code,
		amount: abs(amount),
		direction: amount.startsWith("-") ? "out" : "in",
		counter_asset: h.receivedAsset?.code ?? null,
		counter_amount: h.receivedAmount == null ? null : abs(decimalToStroops(h.receivedAmount)),
		tx_hash: h.txHash,
		explorer_url: h.explorerUrl,
		failure_reason: h.failureReason,
		created_at: h.at,
	};
}

/** What the dashboard and portfolio screens show: per-asset totals, never summed across assets. */
export interface Portfolio {
	total_deposited: string;
	total_spent: string;
	source_balance: string;
	target_balance: string;
	purchase_count: number;
	average_price: string | null;
	series: { at: string; received: string; cumulative: string }[];
	counts: DashboardDto["positions"] | null;
	upcoming: DashboardDto["upcoming"];
}

const zero = "0";

/** The MVP has one pair (USDC → XLM): source totals come from the USDC row, holdings from the XLM row. */
export function toPortfolio(p: PortfolioDto, d?: DashboardDto | null): Portfolio {
	const pair = p.averageAcquisition[0];
	const sourceCode = pair?.sourceAsset.code ?? "USDC";
	const targetCode = pair?.targetAsset.code ?? "XLM";
	const row = (code: string): AssetTotalsDto | undefined => p.assets.find((a) => a.asset.code === code);
	const src = row(sourceCode);
	const tgt = row(targetCode);
	let cumulative = 0n;
	const series = p.purchaseHistory.map((point) => {
		const received = BigInt(decimalToStroops(point.receivedAmount));
		cumulative += received;
		return { at: point.completedAt, received: received.toString(), cumulative: cumulative.toString() };
	});
	return {
		total_deposited: src ? decimalToStroops(src.deposited) : zero,
		total_spent: src ? decimalToStroops(src.swappedOut) : zero,
		source_balance: src ? decimalToStroops(src.balance) : zero,
		target_balance: tgt ? decimalToStroops(tgt.balance) : zero,
		purchase_count: p.averageAcquisition.reduce((n, a) => n + a.purchases, 0),
		average_price: pair?.averagePrice ?? null,
		series,
		counts: d?.positions ?? null,
		upcoming: d?.upcoming ?? [],
	};
}
