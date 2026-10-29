"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Skeleton } from "@repo/ui/skeleton";
import { Chip, Notice } from "@repo/ui/surface";
import { httpStatus } from "@/lib/api/errors";
import type { AdminPositionDetail } from "@/lib/api/dto";
import { humanize, money, percent, relative, shortId, utcDateTime } from "@/lib/format";
import { useNow } from "@/lib/clock";
import { routes } from "@/lib/routes";
import {
	Copyable,
	DataList,
	ErrorState,
	Facts,
	InlineLink,
	PageHeader,
	Section,
	StatusChip,
	Tile,
	type Column,
} from "@/components/ui";
import { usePosition } from "@/features/activity/hooks";
import { executionColumns, ledgerColumns } from "@/features/activity/columns";

/** `GET /admin/positions/{id}`: owner, account, balances, signed-purchase runway, recent attempts and ledger rows. */
export function PositionDetail({ id }: { id: string }) {
	const now = useNow();
	const position = usePosition(id);
	const back = (
		<Link href={routes.POSITIONS()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
			<ArrowLeft className="size-4" /> Positions
		</Link>
	);

	if (position.isError) {
		return (
			<>
				{back}
				{httpStatus(position.error) === 404 ? (
					<Notice tone="warning" title="No position with this id" />
				) : (
					<ErrorState error={position.error} onRetry={() => void position.refetch()} />
				)}
			</>
		);
	}
	if (position.isPending) {
		return (
			<>
				{back}
				<Skeleton className="h-10 w-72" />
				<div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
					{[0, 1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-24 rounded-card" />
					))}
				</div>
				<Skeleton className="mt-6 h-64 w-full rounded-card" />
			</>
		);
	}

	const p = position.data;
	const src = p.sourceAsset.code;
	const runwayLow = p.status === "active" && p.authorizationsRemaining === 0;

	return (
		<>
			{back}
			<PageHeader
				title={`Position ${shortId(p.id)}`}
				subtitle={`${humanize(p.frequency)} · ${money(p.amountPerPurchase, src)} → ${p.targetAsset.code}`}
				actions={
					<>
						<StatusChip value={p.status} />
						{p.lastExecutionStatus && (
							<span className="flex items-center gap-2">
								<span className="caption">Last attempt</span>
								<StatusChip value={p.lastExecutionStatus} />
							</span>
						)}
					</>
				}
			/>

			{runwayLow && (
				<Notice tone="warning" title="Needs signatures" className="mb-6">
					Active, but no signed purchases are left: the keeper can&apos;t run it until the owner signs a new batch.
				</Notice>
			)}

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<Tile
					label={`${src} remaining`}
					value={money(p.remainingSourceBalance, src)}
					hint={`Available ${money(p.availableSourceBalance, src)}`}
				/>
				<Tile label={`${p.targetAsset.code} purchased`} value={money(p.purchasedTargetBalance, p.targetAsset.code)} />
				<Tile label="Signed purchases left" value={p.authorizationsRemaining} tone={runwayLow ? "warning" : undefined} />
				<Tile
					label="Next purchase"
					value={p.status === "active" ? (now ? relative(Date.parse(p.nextExecutionAt), now) : "…") : "—"}
					hint={p.status === "active" ? utcDateTime(p.nextExecutionAt) : humanize(p.status)}
				/>
			</div>

			<div className="mt-6 grid min-w-0 gap-6">
				<Section title="Details">
					<Facts
						items={[
							{
								label: "Owner",
								value: (
									<span className="flex flex-wrap items-center gap-2">
										<Copyable value={p.walletAddress} head={6} tail={6} />
										<InlineLink href={routes.USER(p.userId)}>View user</InlineLink>
									</span>
								),
							},
							{
								label: "Position account",
								value: p.accountAddress ? (
									<span className="flex flex-wrap items-center gap-2">
										<Copyable value={p.accountAddress} head={6} tail={6} />
										{p.accountUrl && (
											<a
												href={p.accountUrl}
												target="_blank"
												rel="noreferrer"
												className="inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
											>
												Explorer <ExternalLink className="size-3" />
											</a>
										)}
									</span>
								) : (
									<span className="text-muted">Not created yet</span>
								),
							},
							{ label: "Max slippage", value: percent(p.maxSlippageBps) },
							{ label: "Created", value: utcDateTime(p.createdAt) },
							{ label: "Position id", value: <Copyable value={p.id} head={8} tail={6} /> },
							{
								label: "Ledger check",
								value: <InlineLink href={routes.RECONCILIATION}>Compare with the network</InlineLink>,
							},
						]}
					/>
				</Section>

				<Section title={`Signed & prepared purchases · ${p.authorizations.length}`}>
					<Authorizations rows={p.authorizations} />
				</Section>

				<Section
					title="Recent purchase attempts"
					action={
						<Link href={routes.EXECUTIONS({ positionId: p.id })} className="text-sm underline-offset-4 hover:underline">
							All attempts
						</Link>
					}
				>
					<DataList columns={executionColumns(false)} rows={p.recentExecutions} rowKey={(e) => e.id} empty="No attempts yet." />
				</Section>

				<Section
					title="Recent ledger rows"
					action={
						<Link href={routes.LEDGER({ positionId: p.id })} className="text-sm underline-offset-4 hover:underline">
							Full ledger
						</Link>
					}
				>
					<DataList columns={ledgerColumns(false)} rows={p.recentLedger} rowKey={(r) => r.id} empty="No ledger rows yet." />
				</Section>
			</div>
		</>
	);
}

const authorizationColumns: Column<AdminPositionDetail["authorizations"][number]>[] = [
	{
		header: "Earliest time",
		primary: true,
		cell: (a) => <span className="whitespace-nowrap">{utcDateTime(a.scheduledFor)}</span>,
	},
	{ header: "Status", cell: (a) => <StatusChip value={a.status} /> },
	{ header: "Sequence", cell: (a) => <span className="font-mono text-sm break-all">{a.sequence}</span> },
];

function Authorizations({ rows }: { rows: AdminPositionDetail["authorizations"] }) {
	const counts = rows.reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.status]: (acc[a.status] ?? 0) + 1 }), {});
	return (
		<>
			{rows.length > 0 && (
				<div className="mb-4 flex flex-wrap gap-2">
					{(["active", "prepared", "used"] as const).map((s) => (
						<Chip key={s} tone={s === "active" ? "success" : "neutral"}>
							{humanize(s)} {counts[s] ?? 0}
						</Chip>
					))}
				</div>
			)}
			<DataList
				columns={authorizationColumns}
				rows={rows}
				rowKey={(a) => a.sequence}
				empty="No purchases have been prepared or signed."
			/>
		</>
	);
}
