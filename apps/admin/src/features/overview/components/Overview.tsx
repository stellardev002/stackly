"use client";

import Link from "next/link";
import { RotateCw } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Skeleton } from "@repo/ui/skeleton";
import { StatCard } from "@repo/ui/surface";
import { EXECUTION_STATUSES, POSITION_STATUSES } from "@/lib/api/dto";
import { humanize, money } from "@/lib/format";
import { routes } from "@/lib/routes";
import { ErrorState, PageHeader, Section, StatusChip, Tile } from "@/components/ui";
import { useOverview } from "@/features/overview/hooks";
import { StatsChart } from "@/features/overview/components/StatsChart";
import { WorkersPanel } from "@/features/overview/components/WorkersPanel";

/** Headline cards: two per row on phones, so they fit tighter there. */
const CARD = "animate-rise min-h-[124px] p-4 sm:min-h-[156px] sm:p-6";

/** Admin home (`GET /admin/overview` + `/admin/stats`). Everything links into the filtered list behind it. */
export function Overview() {
	const overview = useOverview();
	const o = overview.data;

	const header = (
		<PageHeader
			title="Overview"
			subtitle="Stellar Testnet · refreshes every minute"
			actions={
				<Button
					variant="outline"
					size="sm"
					onClick={() => void overview.refetch()}
					isLoading={overview.isFetching}
					loadingText="Refreshing…"
				>
					<RotateCw /> Refresh
				</Button>
			}
		/>
	);

	if (overview.isError) {
		return (
			<>
				{header}
				<ErrorState error={overview.error} onRetry={() => void overview.refetch()} title="Couldn't load the overview" />
			</>
		);
	}

	return (
		<>
			{header}
			<div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
				{o ? (
					<>
						<StatCard
							className={CARD}
							label="Users"
							value={o.users.total.toLocaleString("en-US")}
							caption={`${o.users.admins} admin${o.users.admins === 1 ? "" : "s"}`}
						/>
						<StatCard
							className={CARD}
							style={{ "--i": 1 } as React.CSSProperties}
							label="Active positions"
							value={o.positions.active.toLocaleString("en-US")}
							caption={`${POSITION_STATUSES.reduce((n, s) => n + o.positions[s], 0)} positions in total`}
						/>
						<StatCard
							className={CARD}
							style={{ "--i": 2 } as React.CSSProperties}
							label="Purchases in flight"
							value={o.inFlight.toLocaleString("en-US")}
							caption={`${o.workers.stuckExecutions} waiting over 15 min`}
						/>
						<StatCard
							className={CARD}
							style={{ "--i": 3 } as React.CSSProperties}
							label="Open warnings"
							value={o.openWarnings.toLocaleString("en-US")}
							caption="Low funds or no signed purchases"
						/>
					</>
				) : (
					[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[124px] rounded-card sm:h-[156px]" />)
				)}
			</div>

			<div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-2">
				<Section
					title="Positions by status"
					action={
						<Link href={routes.POSITIONS()} className="text-sm underline-offset-4 hover:underline">
							All positions
						</Link>
					}
				>
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
						{POSITION_STATUSES.map((s) => (
							<Link
								key={s}
								href={routes.POSITIONS({ status: s })}
								className="rounded-card outline-none focus-visible:ring-[3px] focus-visible:ring-coral/40"
							>
								<Tile label={humanize(s)} value={o ? o.positions[s].toLocaleString("en-US") : "…"} />
							</Link>
						))}
						<Link
							href={routes.POSITIONS({ due: true })}
							className="rounded-card outline-none focus-visible:ring-[3px] focus-visible:ring-coral/40"
						>
							<Tile label="Due now" value="View" hint="What the keeper picks up" />
						</Link>
					</div>
				</Section>

				<Section
					title="Purchases · last 24 h"
					action={
						<Link href={routes.EXECUTIONS()} className="text-sm underline-offset-4 hover:underline">
							All purchases
						</Link>
					}
				>
					<div className="grid grid-cols-2 gap-3">
						{EXECUTION_STATUSES.map((s) => (
							<Link
								key={s}
								href={routes.EXECUTIONS({ status: s })}
								className="rounded-card outline-none focus-visible:ring-[3px] focus-visible:ring-coral/40"
							>
								<Tile
									label={humanize(s)}
									value={o ? o.executionsLast24h[s].toLocaleString("en-US") : "…"}
									tone={
										s === "failed" && o?.executionsLast24h.failed
											? "danger"
											: s === "completed" && o?.executionsLast24h.completed
												? "success"
												: undefined
									}
								/>
							</Link>
						))}
					</div>
				</Section>
			</div>

			<div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
				<StatsChart />
				<Section title="Swap volume · all time">
					{!o ? (
						<Skeleton className="h-24 w-full rounded-card" />
					) : o.volume.length === 0 ? (
						<p className="py-6 text-base font-light text-muted">No confirmed swaps yet.</p>
					) : (
						<ul className="flex flex-col divide-y divide-line">
							{o.volume.map((v) => (
								<li key={v.asset.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
									<span className="w-fit">
										<StatusChip value={v.asset.code} />
									</span>
									<p className="text-sm">
										<span className="text-muted">Spent </span>
										{money(v.spent, v.asset.code)}
									</p>
									<p className="text-sm">
										<span className="text-muted">Received </span>
										{money(v.received, v.asset.code)}
									</p>
								</li>
							))}
						</ul>
					)}
					<p className="caption mt-4">Per asset; assets are never added together.</p>
				</Section>
			</div>

			<div className="mt-6">
				{o ? <WorkersPanel workers={o.workers} /> : <Skeleton className="h-[320px] w-full rounded-card" />}
			</div>
		</>
	);
}
