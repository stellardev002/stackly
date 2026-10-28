"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { Execution, Position } from "@repo/stellar/vault";
import { USDC, XLM, assetId } from "@repo/stellar/assets";
import { Button } from "@repo/ui/button";
import { Chip, DetailRow, Panel, PanelHeader, StatCard } from "@repo/ui/surface";
import { Skeleton } from "@repo/ui/skeleton";
import { useNow } from "@/lib/clock";
import { everyLabel, money, percent, relative, utcDate, utcDateTime, utcDayMonth, utcTime } from "@/lib/format";
import { transactionRoutes, vaultRoutes } from "@/lib/routes";
import { fromStroops } from "@/lib/stellar/config";
import { Amount } from "@/components/Amount";
import { PageHeader } from "@/components/PageHeader";
import { PromoCard } from "@/components/PromoCard";
import { SwapRow } from "@/components/SwapRow";
import { EmptyState, ErrorState } from "@/components/states";
import { AllocationDonut } from "@/components/charts/AllocationDonut";
import { CumulativeChart } from "@/components/charts/CumulativeChart";
import { usePortfolio } from "@/features/portfolio/hooks";
import { usePositions, useRecentExecutions } from "@/features/vaults/hooks";
import { POSITION_STATUS, fundedPurchases, nextIntervalStatus } from "@/features/vaults/status";

const usdc = assetId(USDC);
const xlm = assetId(XLM);

/** Screen 3 (Figma 28:13262 + Loading / Empty / Error). */
export function Dashboard() {
	const now = useNow();
	const positions = usePositions();
	const portfolio = usePortfolio();
	const recent = useRecentExecutions(10);

	const createButton = (
		<Button asChild>
			<Link href={vaultRoutes.CREATE}>
				<Plus /> Create New DCA
			</Link>
		</Button>
	);

	const header = <PageHeader title="Welcome back" subtitle={`Your vault overview · Stellar Testnet · ${utcDateTime(now)}`} action={createButton} />;

	if (positions.isError || portfolio.isError) {
		return (
			<>
				{header}
				<ErrorState
					error={positions.error ?? portfolio.error}
					title="We couldn't load your vaults"
					onRetry={() => {
						void positions.refetch();
						void portfolio.refetch();
						void recent.refetch();
					}}
				/>
				<StatsRow />
			</>
		);
	}

	if (positions.isPending || portfolio.isPending) {
		return (
			<>
				{header}
				<DashboardSkeleton />
			</>
		);
	}

	const list = positions.data;
	const totals = portfolio.data;
	const active = list.filter((p) => p.status === "active");
	const executions = recent.data ?? [];
	const upcoming = [...list].filter((p) => p.status !== "closed").sort((a, b) => rank(a) - rank(b) || a.next_execution_ts - b.next_execution_ts)[0];
	const empty = list.length === 0;

	return (
		<>
			{header}
			<StatsRow
				cards={[
					{ label: "Total vault deposits", value: <Amount stroops={totals.total_deposited} asset={usdc} />, caption: empty ? "Testnet · no deposits yet" : "Testnet · deposited to date" },
					{ label: "Total invested", value: <Amount stroops={totals.total_spent} asset={usdc} />, caption: empty ? "No funds spent" : `Source spent across ${totals.purchase_count} purchase${totals.purchase_count === 1 ? "" : "s"}` },
					{
						label: "Available USDC",
						value: <Amount stroops={totals.source_balance} asset={usdc} />,
						caption: empty ? "No purchases funded" : `${list.reduce((n, p) => n + (p.status === "closed" ? 0 : fundedPurchases(p)), 0)} purchases funded`,
					},
					{
						label: "Purchased XLM",
						value: <Amount stroops={totals.target_balance} asset={xlm} />,
						caption: empty ? "No purchases yet" : `${active.length} active position${active.length === 1 ? "" : "s"} · no valuation`,
					},
				]}
			/>

			<div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,456px)]">
				<div className="flex min-w-0 flex-col gap-6">
					<Panel className="animate-rise" style={{ "--i": 2 } as React.CSSProperties}>
						<PanelHeader title="Your purchase history" action={<Chip tone="soft">Cumulative XLM</Chip>} />
						{totals.series.length ? (
							<>
								<div className="mt-4 flex items-start justify-between gap-3">
									<div>
										<p className="stat-value">
											<Amount stroops={totals.target_balance} asset={xlm} />
										</p>
										<p className="caption mt-2">
											Acquired across {totals.purchase_count} purchase{totals.purchase_count === 1 ? "" : "s"}
										</p>
									</div>
									<Chip tone="neutral">{weeksBetween(totals.series[0]!.at, totals.series.at(-1)!.at)}</Chip>
								</div>
								<div className="mt-4">
									<CumulativeChart series={totals.series} />
								</div>
							</>
						) : (
							<EmptyState title="Nothing to see yet">Your XLM purchases will appear here once you create and fund a vault.</EmptyState>
						)}
					</Panel>

					{executions.length > 0 && (
						<Panel className="animate-rise" style={{ "--i": 3 } as React.CSSProperties}>
							<PanelHeader
								title="Recent swaps"
								action={
									<Button asChild size="sm">
										<Link href={transactionRoutes.TRANSACTIONS}>View history</Link>
									</Button>
								}
							/>
							<ul className="mt-3 flex flex-col">
								{executions.slice(0, 3).map((e, i) => (
									<SwapRow key={e.id} execution={e} position={list.find((p) => p.id === e.position_id)} index={i} />
								))}
							</ul>
						</Panel>
					)}

					{!empty && <Strategies positions={list} />}
				</div>

				<div className="flex min-w-0 flex-col gap-6">
					<UpcomingPurchase position={upcoming} executions={executions} now={now} />
					<PromoCard title="You stay in control">Pause your strategy or withdraw available funds. Every funding action requires your wallet signature.</PromoCard>
					<Panel className="animate-rise" style={{ "--i": 4 } as React.CSSProperties}>
						<PanelHeader title="Deposited USDC allocation" />
						<div className="mt-6">
							<AllocationDonut available={Number(fromStroops(totals.source_balance))} spent={Number(fromStroops(totals.total_spent))} />
						</div>
						<dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
							<DetailRow label={`Available${shareLabel(totals.source_balance, totals.total_spent)}`} value={money(totals.source_balance, usdc)} />
							<DetailRow label={`Spent${shareLabel(totals.total_spent, totals.source_balance)}`} value={money(totals.total_spent, usdc)} />
						</dl>
					</Panel>
				</div>
			</div>
		</>
	);
}

/** Positions needing action first (created, paused), then active by next purchase. */
const rank = (p: Position) => (p.status === "active" ? 0 : p.status === "created" ? 1 : 2);

function shareLabel(part: string, other: string) {
	const total = Number(part) + Number(other);
	return total > 0 ? ` · ${Math.round((Number(part) / total) * 100)}%` : "";
}

function weeksBetween(a: string, b: string) {
	const weeks = Math.max(1, Math.round((Date.parse(b) - Date.parse(a)) / (7 * 86_400_000)) + 1);
	return `${weeks} week${weeks === 1 ? "" : "s"}`;
}

function StatsRow({ cards }: { cards?: { label: string; value: React.ReactNode; caption: string }[] }) {
	const items = cards ?? ["Total vault deposits", "Total invested", "Available USDC", "Purchased XLM"].map((label) => ({ label, value: "—", caption: "Unavailable right now" }));
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{items.map((card, i) => (
				<StatCard key={card.label} label={card.label} value={card.value} caption={card.caption} className="animate-rise" style={{ "--i": i } as React.CSSProperties} />
			))}
		</div>
	);
}

function UpcomingPurchase({ position, executions, now }: { position?: Position; executions: Execution[]; now: number }) {
	if (!position) {
		return (
			<Panel className="animate-rise" style={{ "--i": 2 } as React.CSSProperties}>
				<PanelHeader title="Upcoming purchase" action={<Chip tone="soft">Not scheduled</Chip>} />
				<p className="h-card mt-6">No purchase scheduled</p>
				<p className="mt-2 text-sm font-light text-muted">Create a vault and fund it to schedule your first purchase.</p>
				<dl className="mt-4">
					<DetailRow label="Next eligible time" value="Not set" />
				</dl>
			</Panel>
		);
	}
	const status = nextIntervalStatus(position, executions, now);
	const next = position.next_execution_ts * 1000;
	return (
		<Panel className="animate-rise" style={{ "--i": 2 } as React.CSSProperties}>
			<PanelHeader title="Upcoming purchase" action={<Chip tone={status.tone} live={status.live}>{status.label}</Chip>} />
			<p className="stat-value mt-6">{money(position.purchase_amount, position.source_asset)}</p>
			<p className="mt-6 text-base font-light text-muted">To purchase XLM · amount received varies</p>
			<dl className="mt-2 flex flex-col gap-2">
				<DetailRow
					label="Next eligible time"
					value={
						position.status === "active" ? (
							<>
								{utcDayMonth(next)} · {utcTime(next)} UTC <span className="text-muted">({relative(next, now)})</span>
							</>
						) : (
							POSITION_STATUS[position.status].label
						)
					}
				/>
				<DetailRow label="Max slippage" value={percent(position.max_slippage_bps)} />
			</dl>
			<Button asChild className="mt-6">
				<Link href={vaultRoutes.VAULT(position.id)}>View schedule</Link>
			</Button>
		</Panel>
	);
}

/** "Active strategies": every vault the wallet owns, including paused and not-started ones (design gap #8). */
function Strategies({ positions }: { positions: Position[] }) {
	const activeCount = positions.filter((p) => p.status === "active").length;
	return (
		<Panel className="animate-rise" style={{ "--i": 4 } as React.CSSProperties}>
			<PanelHeader title={positions.length > 1 ? "Your strategies" : "Active strategies"} action={<Chip tone="soft">{activeCount} active</Chip>} />
			<ul className="mt-2 divide-y divide-line">
				{positions.map((p) => (
					<li key={p.id} className="flex flex-col gap-5 py-5 last:pb-0">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<p className="h-section">{p.name}</p>
									{p.status !== "active" && <Chip tone={POSITION_STATUS[p.status].tone}>{POSITION_STATUS[p.status].label}</Chip>}
								</div>
								<p className="caption mt-2">
									{p.id} · Started {utcDate(p.start_ts * 1000)}
								</p>
							</div>
							<dl className="flex flex-col gap-1.5 text-sm sm:items-end [&_dd]:text-sm [&_dt]:text-sm">
								<DetailRow label="Purchase amount" value={money(p.purchase_amount, p.source_asset)} />
								<DetailRow label="Frequency" value={everyLabel(p.interval_seconds)} />
								<DetailRow label="Remaining" value={money(p.source_balance, p.source_asset)} />
							</dl>
						</div>
						<div className="flex flex-wrap gap-3">
							<Button asChild variant="outline">
								<Link href={vaultRoutes.VAULT(p.id)}>View position</Link>
							</Button>
							<Button asChild>
								<Link href={vaultRoutes.DEPOSIT(p.id)}>{p.status === "created" ? "Fund vault" : "Deposit funds"}</Link>
							</Button>
						</div>
					</li>
				))}
			</ul>
		</Panel>
	);
}

function DashboardSkeleton() {
	return (
		<div aria-busy="true" aria-label="Loading your vaults">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{[0, 1, 2, 3].map((i) => (
					<div key={i} className="flex h-[156px] flex-col justify-between rounded-card bg-night p-6">
						<Skeleton className="h-4 w-28 opacity-20" />
						<Skeleton className="h-10 w-44 opacity-20" />
						<Skeleton className="h-3 w-32 opacity-20" />
					</div>
				))}
			</div>
			<div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,456px)]">
				<Panel className="flex flex-col gap-4">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-12 w-52" />
					<Skeleton className="h-[200px] w-full rounded-card" />
				</Panel>
				<Panel className="flex flex-col gap-4">
					<Skeleton className="h-4 w-36" />
					<Skeleton className="h-12 w-40" />
					<Skeleton className="h-4 w-56" />
					<Skeleton className="h-4 w-48" />
					<Skeleton className="h-11 w-36" />
				</Panel>
			</div>
		</div>
	);
}
