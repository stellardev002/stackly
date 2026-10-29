"use client";

import type { AdminExecution, AdminLedgerRow } from "@/lib/api/dto";
import { humanize, isNegative, money, shortId, signed, utcDateTime } from "@/lib/format";
import { routes } from "@/lib/routes";
import { Copyable, InlineLink, StatusChip, TxLink, type Column } from "@/components/ui";

/** Failure / skip reasons in plain words (the same copy the app shows owners). */
export const REASON: Record<string, string> = {
	insufficient_balance: "Not enough balance",
	insufficient_liquidity: "Not enough liquidity",
	slippage_exceeded: "Slippage above limit",
	swap_reverted: "Swap reverted",
	submission_failed: "Submission failed",
};

/** Purchase-attempt columns; `withOwner` adds position and wallet (the cross-user list). */
export function executionColumns(withOwner: boolean): Column<AdminExecution>[] {
	return [
		{ header: "Interval", primary: true, cell: (e) => <span className="whitespace-nowrap">{utcDateTime(e.scheduledFor)}</span> },
		{ header: "Status", cell: (e) => <StatusChip value={e.status} /> },
		{ header: "Spent", cell: (e) => <span className="whitespace-nowrap">{money(e.sourceAmount, e.sourceAsset.code)}</span> },
		{
			header: "Received",
			cell: (e) => (
				<span className="whitespace-nowrap">{e.receivedAmount ? money(e.receivedAmount, e.targetAsset.code) : "—"}</span>
			),
		},
		{
			header: "Reason",
			cell: (e) =>
				e.failureReason ? (
					<span className="text-danger">{REASON[e.failureReason] ?? humanize(e.failureReason)}</span>
				) : (
					<span className="text-muted">—</span>
				),
		},
		...(withOwner
			? [
					{
						header: "Position",
						cell: (e: AdminExecution) => <InlineLink href={routes.POSITION(e.positionId)}>{shortId(e.positionId)}</InlineLink>,
					},
					{ header: "Wallet", hideOnMobile: true, cell: (e: AdminExecution) => <Copyable value={e.walletAddress} /> },
				]
			: []),
		{ header: "Transaction", cell: (e) => <TxLink hash={e.txHash} /> },
	];
}

/** Ledger columns; `withOwner` adds position and wallet. Amounts are signed: + entered the position, − left it. */
export function ledgerColumns(withOwner: boolean): Column<AdminLedgerRow>[] {
	return [
		{ header: "Recorded", primary: true, cell: (r) => <span className="whitespace-nowrap">{utcDateTime(r.createdAt)}</span> },
		{ header: "Kind", cell: (r) => <StatusChip value={r.kind} /> },
		{
			header: "Amount",
			cell: (r) => (
				<span className={`whitespace-nowrap ${isNegative(r.amount) ? "text-danger" : "text-success"}`}>
					{signed(r.amount, 7)} {r.asset.code}
				</span>
			),
		},
		...(withOwner
			? [
					{
						header: "Position",
						cell: (r: AdminLedgerRow) => <InlineLink href={routes.POSITION(r.positionId)}>{shortId(r.positionId)}</InlineLink>,
					},
					{ header: "Wallet", hideOnMobile: true, cell: (r: AdminLedgerRow) => <Copyable value={r.walletAddress} /> },
				]
			: []),
		{
			header: "Transaction",
			cell: (r) => (r.kind === "adjustment" ? <span className="caption">Admin adjustment</span> : <TxLink hash={r.txHash} />),
		},
	];
}
