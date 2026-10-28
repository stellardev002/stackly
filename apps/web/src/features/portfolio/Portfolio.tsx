"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { USDC, XLM, assetId } from "@repo/stellar/assets";
import { Button } from "@repo/ui/button";
import { Chip, DetailRow, Notice, Panel, PanelHeader, StatCard } from "@repo/ui/surface";
import { Skeleton } from "@repo/ui/skeleton";
import { useNow } from "@/lib/clock";
import { money, utcDateTime } from "@/lib/format";
import { transactionRoutes, vaultRoutes } from "@/lib/routes";
import { fromStroops } from "@/lib/stellar/config";
import { Amount } from "@/components/Amount";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, SkeletonLines } from "@/components/states";
import { AllocationDonut } from "@/components/charts/AllocationDonut";
import { CumulativeChart } from "@/components/charts/CumulativeChart";
import { usePortfolio } from "@/features/portfolio/hooks";

const usdc = assetId(USDC);
const xlm = assetId(XLM);

/** Screen 10 (Figma 28:11101 + Loading / Empty / Error). Units and execution prices only, never a valuation. */
export function Portfolio() {
	const now = useNow();
	const portfolio = usePortfolio();

	const header = (
		<PageHeader
			title="My Portfolio"
			subtitle={`Your accumulated assets · Stellar Testnet · ${utcDateTime(now)}`}
			action={
				<Button asChild>
					<Link href={vaultRoutes.CREATE}>
						<Plus /> Create New DCA
					</Link>
				</Button>
			}
		/>
	);

	if (portfolio.isError) {
		return (
			<>
				{header}
				<ErrorState error={portfolio.error} title="We couldn't load your portfolio" onRetry={() => void portfolio.refetch()} />
			</>
		);
	}

	if (portfolio.isPending) {
		return (
			<>
				{header}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
					{[0, 1, 2, 3].map((i) => (
						<div key={i} className="h-[156px] rounded-card bg-night" />
					))}
				</div>
				<div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,456px)]">
					<Panel className="flex flex-col gap-4">
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-[220px] w-full rounded-card" />
					</Panel>
					<Panel>
						<SkeletonLines rows={4} />
					</Panel>
				</div>
			</>
		);
	}

	const t = portfolio.data;
	const empty = BigInt(t.total_deposited) === 0n;

	return (
		<>
			{header}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{[
					{ label: "Deposited USDC", value: <Amount stroops={t.total_deposited} asset={usdc} />, caption: "Total deposits" },
					{ label: "Remaining USDC", value: <Amount stroops={t.source_balance} asset={usdc} />, caption: "Available in vault" },
					{ label: "Spent USDC", value: <Amount stroops={t.total_spent} asset={usdc} />, caption: `Across ${t.purchase_count} completed swap${t.purchase_count === 1 ? "" : "s"}` },
					{ label: "Purchased XLM", value: <Amount stroops={t.target_balance} asset={xlm} />, caption: "Actual acquired units" },
				].map((card, i) => (
					<StatCard key={card.label} {...card} className="animate-rise" style={{ "--i": i } as React.CSSProperties} />
				))}
			</div>

			<div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,456px)]">
				<div className="flex min-w-0 flex-col gap-6">
					<Panel className="animate-rise" style={{ "--i": 2 } as React.CSSProperties}>
						<PanelHeader title={<span className="h-card">Your purchase history</span>} action={<Chip tone="soft">Cumulative XLM</Chip>} />
						{t.series.length ? (
							<>
								<p className="stat-value mt-6">
									<Amount stroops={t.target_balance} asset={xlm} />
								</p>
								<p className="caption mt-2">
									Acquired across {t.purchase_count} purchase{t.purchase_count === 1 ? "" : "s"}
								</p>
								<div className="mt-4">
									<CumulativeChart series={t.series} />
								</div>
							</>
						) : (
							<EmptyState title="No purchases yet">Completed purchases will build this chart, one step per purchase.</EmptyState>
						)}
					</Panel>

					<Panel className="animate-rise" style={{ "--i": 3 } as React.CSSProperties}>
						<h2 className="h-card">Your holdings</h2>
						<div className="mt-6 grid gap-8 sm:grid-cols-2">
							<div>
								<Chip tone="neutral">Source asset</Chip>
								<p className="mt-4 text-[40px] leading-none tracking-[-0.06em] sm:text-[48px]">{money(t.source_balance, usdc)}</p>
								<p className="mt-3 text-base font-light text-muted">Available to purchase or withdraw</p>
							</div>
							<div>
								<Chip tone="soft">Acquired asset</Chip>
								<p className="mt-4 text-[40px] leading-none tracking-[-0.06em] sm:text-[48px]">{money(t.target_balance, xlm)}</p>
								<p className="mt-3 text-base font-light text-muted">
									Acquired through {t.purchase_count} purchase{t.purchase_count === 1 ? "" : "s"}
								</p>
							</div>
						</div>
						<dl className="mt-6 border-t border-line pt-5 [&_dd]:text-sm [&_dt]:text-sm">
							<DetailRow label="Average acquisition price" value={t.average_price ? `${t.average_price} USDC / XLM · from executed swaps` : "Available after your first purchase"} />
						</dl>
					</Panel>
				</div>

				<aside className="flex min-w-0 flex-col gap-6">
					<Notice tone="info" title="Not an investment return chart" className="animate-rise">
						No live price feed is connected. Stackly shows purchases and balances, not simulated profit, annualized returns or a combined fiat valuation.
					</Notice>
					<Panel className="animate-rise" style={{ "--i": 2 } as React.CSSProperties}>
						<h2 className="h-card">USDC funding allocation</h2>
						<div className="mt-6">
							<AllocationDonut available={Number(fromStroops(t.source_balance))} spent={Number(fromStroops(t.total_spent))} />
						</div>
						{!empty && (
							<dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
								<DetailRow label="Available" value={money(t.source_balance, usdc)} />
								<DetailRow label="Spent" value={money(t.total_spent, usdc)} />
							</dl>
						)}
					</Panel>
					<Button asChild variant="outline" className="w-fit">
						<Link href={transactionRoutes.TRANSACTIONS}>
							View transaction history <ArrowRight />
						</Link>
					</Button>
				</aside>
			</div>
		</>
	);
}
