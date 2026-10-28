"use client";

import Link from "next/link";
import { Pause, Play, Plus } from "lucide-react";
import type { Position } from "@repo/stellar/vault";
import { assetCode } from "@repo/stellar/assets";
import { Button } from "@repo/ui/button";
import { Skeleton } from "@repo/ui/skeleton";
import { Chip, DetailRow, Notice, Panel, PanelHeader, StatCard } from "@repo/ui/surface";
import { useNow } from "@/lib/clock";
import { frequencyLabel, money, percent, relative, utcDateTime, utcDayMonth, utcTime } from "@/lib/format";
import { transactionRoutes, vaultRoutes } from "@/lib/routes";
import { shortKey } from "@/lib/stellar/config";
import { useToast } from "@/lib/use-toast";
import { Amount } from "@/components/Amount";
import { explorerAction } from "@/components/ExplorerButton";
import { PageHeader } from "@/components/PageHeader";
import { PromoCard } from "@/components/PromoCard";
import { SwapRow } from "@/components/SwapRow";
import { EmptyState, ErrorState, SkeletonLines } from "@/components/states";
import { vaultClient } from "@/features/vaults/client";
import { usePosition, usePositionExecutions, useVaultTx } from "@/features/vaults/hooks";
import { EXECUTION_STATUS, POSITION_STATUS, fundedPurchases, nextIntervalStatus } from "@/features/vaults/status";
import { VaultNotFound } from "@/features/vaults/components/VaultNotFound";

/** Screen 7 (Figma 28:11859 + Loading / Empty / Error), plus the paused state the design lacked. */
export function ActivePosition({ vaultId }: { vaultId: string }) {
	const now = useNow();
	const position = usePosition(vaultId);
	const executions = usePositionExecutions(vaultId);

	if (position.isError) {
		const notFound = (position.error as { response?: { status?: number } }).response?.status === 404;
		return (
			<>
				<PageHeader title="DCA Position" />
				{notFound ? <VaultNotFound /> : <ErrorState error={position.error} title="We couldn't load this vault" onRetry={() => void position.refetch()} />}
			</>
		);
	}

	if (position.isPending) return <PositionSkeleton />;

	const p = position.data;
	const list = executions.data ?? [];
	const last = list.find((e) => e.status !== "submitted");
	const funded = fundedPurchases(p);
	const title = p.status === "active" ? "Active DCA Position" : `${POSITION_STATUS[p.status].label} DCA Position`;

	return (
		<>
			<PageHeader
				title={title}
				subtitle={
					<>
						{p.name} · {p.id} · <span className="text-ink">{POSITION_STATUS[p.status].label}</span>
					</>
				}
				action={
					<Button asChild>
						<Link href={vaultRoutes.CREATE}>
							<Plus /> Create New DCA
						</Link>
					</Button>
				}
			/>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{[
					{ label: "Deposits", value: <Amount stroops={p.total_deposited} asset={p.source_asset} />, caption: "Total vault funding" },
					{ label: "Spent", value: <Amount stroops={p.total_spent} asset={p.source_asset} />, caption: `${p.execution_count} completed purchase${p.execution_count === 1 ? "" : "s"}` },
					{ label: "Remaining", value: <Amount stroops={p.source_balance} asset={p.source_asset} />, caption: `${funded} purchase${funded === 1 ? "" : "s"} funded` },
					{ label: "Acquired", value: <Amount stroops={p.target_balance} asset={p.target_asset} />, caption: "Separate asset quantity" },
				].map((card, i) => (
					<StatCard key={card.label} {...card} className="animate-rise" style={{ "--i": i } as React.CSSProperties} />
				))}
			</div>

			<div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,456px)]">
				<div className="flex min-w-0 flex-col gap-6">
					<Panel className="animate-rise" style={{ "--i": 2 } as React.CSSProperties}>
						<PanelHeader
							title="Purchase history"
							action={
								list.length > 0 && (
									<Button asChild size="sm">
										<Link href={transactionRoutes.FOR_VAULT(p.id)}>View history</Link>
									</Button>
								)
							}
						/>
						{executions.isPending ? (
							<SkeletonLines rows={3} className="mt-6" />
						) : executions.isError ? (
							<ErrorState error={executions.error} className="mt-4" onRetry={() => void executions.refetch()} />
						) : list.length ? (
							<ul className="mt-3 flex flex-col">
								{list.slice(0, 4).map((e, i) => (
									<SwapRow key={e.id} execution={e} position={p} index={i} />
								))}
							</ul>
						) : (
							<EmptyState compact title="No purchases yet">
								{p.status === "created" ? "Fund the vault and start the schedule. Purchases will appear here." : "Your first purchase will appear here once it executes."}
							</EmptyState>
						)}
					</Panel>

					<StrategyDetails position={p} lastExecutionAt={last?.executed_at ?? null} lastResult={last ? `${EXECUTION_STATUS[last.status].label}${last.received_amount ? ` · ${money(last.source_amount, p.source_asset)} → ${money(last.received_amount, p.target_asset)}` : ""}` : "No purchases yet"} />
				</div>

				<aside className="flex min-w-0 flex-col gap-6">
					<Notice tone="info" title="No performance estimate" className="animate-rise">
						Balances show source spending and acquired units separately. They do not represent gains, losses or a combined portfolio valuation.
					</Notice>
					{p.status === "active" && funded < 2 && (
						<Notice
							tone="warning"
							title={funded === 0 ? "Your next purchase isn't funded" : "One funded purchase left"}
							className="animate-rise"
							action={
								<Button asChild size="sm">
									<Link href={vaultRoutes.DEPOSIT(p.id)}>Deposit more</Link>
								</Button>
							}
						>
							{funded === 0 ? "The keeper will skip intervals until you deposit more USDC." : "Deposit more USDC to keep the schedule running after the next purchase."}
						</Notice>
					)}
					<NextInterval position={p} executions={list} now={now} />
					<PromoCard title="Control the pace">Pausing stops future purchases. It does not sell acquired XLM or withdraw available USDC.</PromoCard>
				</aside>
			</div>
		</>
	);
}

function NextInterval({ position: p, executions, now }: { position: Position; executions: Parameters<typeof nextIntervalStatus>[1]; now: number }) {
	const status = nextIntervalStatus(p, executions, now);
	const next = p.next_execution_ts * 1000;
	return (
		<Panel className="animate-rise" style={{ "--i": 3 } as React.CSSProperties} aria-live="polite">
			<PanelHeader title="Your next interval" action={<Chip tone={status.tone} live={status.live}>{status.label}</Chip>} />
			{p.status === "active" ? (
				<>
					<p className="mt-6 text-[48px] leading-none tracking-[-0.06em] sm:text-[56px]">{utcDayMonth(next)}</p>
					<p className="mt-6 text-base font-light text-muted">
						{utcTime(next)} UTC · {money(p.purchase_amount, p.source_asset)} · {relative(next, now)}
					</p>
					<p className="mt-2 text-base font-light text-muted">{status.key === "scheduled" ? "The interval becomes eligible at this time. The actual XLM amount is determined when the swap executes." : status.description}</p>
				</>
			) : (
				<>
					<p className="h-card mt-6">{p.status === "paused" ? "Purchases are paused" : p.status === "created" ? "Schedule not started" : "No more purchases"}</p>
					<p className="mt-2 text-base font-light text-muted">{status.description}</p>
					{p.status === "created" && (
						<Button asChild className="mt-5">
							<Link href={vaultRoutes.DEPOSIT(p.id, { flow: true })}>Fund and start</Link>
						</Button>
					)}
				</>
			)}
		</Panel>
	);
}

function StrategyDetails({ position: p, lastExecutionAt, lastResult }: { position: Position; lastExecutionAt: string | null; lastResult: string }) {
	const toast = useToast();
	const tx = useVaultTx();
	const pausing = p.status === "active";

	const toggle = async () => {
		const res = await tx.run((opts) => (pausing ? vaultClient.pause(p.id, opts) : vaultClient.resume(p.id, opts)));
		if (res) {
			toast.success(pausing ? "Strategy paused" : "Strategy resumed", {
				description: pausing ? "No purchases run until you resume." : `Next purchase ${utcDateTime(res.position.next_execution_ts * 1000)}.`,
				action: explorerAction(res.txHash),
			});
		} else toast.info("Nothing changed", { description: "The request was declined or didn't complete." });
	};

	return (
		<Panel className="animate-rise" style={{ "--i": 4 } as React.CSSProperties}>
			<PanelHeader title="Strategy details" action={<Chip tone={POSITION_STATUS[p.status].tone}>{POSITION_STATUS[p.status].label}</Chip>} />
			<p className="mt-6 text-[40px] leading-none tracking-[-0.06em] sm:text-[48px]">
				{assetCode(p.source_asset)} → {assetCode(p.target_asset)}
			</p>
			<dl className="mt-8 flex flex-col gap-4">
				<DetailRow label="Vault ID" value={p.id} />
				<DetailRow label="Purchase amount" value={money(p.purchase_amount, p.source_asset)} />
				<DetailRow label="Frequency" value={frequencyLabel(p.interval_seconds)} />
				<DetailRow label="Next eligible time" value={p.status === "active" ? utcDateTime(p.next_execution_ts * 1000) : POSITION_STATUS[p.status].label} />
				<DetailRow label="Maximum slippage" value={percent(p.max_slippage_bps)} />
				{p.end_ts && <DetailRow label="End date" value={utcDateTime(p.end_ts * 1000)} />}
				<DetailRow label="Last execution" value={lastExecutionAt ? utcDateTime(lastExecutionAt) : "—"} />
				<DetailRow label="Last result" value={lastResult} />
				<DetailRow label="Owner" value={<span className="font-mono">{shortKey(p.owner)}</span>} />
			</dl>
			<div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
				<Button asChild>
					<Link href={vaultRoutes.DEPOSIT(p.id, { flow: p.status === "created" })}>{p.status === "created" ? "Fund vault" : "Deposit More"}</Link>
				</Button>
				{(p.status === "active" || p.status === "paused") && (
					<Button variant="outline" onClick={toggle} isLoading={tx.busy} loadingText={tx.stage === "signing" ? "Waiting for wallet…" : pausing ? "Pausing…" : "Resuming…"}>
						{pausing ? <Pause /> : <Play />} {pausing ? "Pause strategy" : "Resume strategy"}
					</Button>
				)}
				<Button asChild variant="outline">
					<Link href={vaultRoutes.WITHDRAW(p.id)}>Withdraw Available Funds</Link>
				</Button>
				<Button asChild variant="ghost">
					<Link href={transactionRoutes.FOR_VAULT(p.id)}>View Transaction History</Link>
				</Button>
			</div>
		</Panel>
	);
}

function PositionSkeleton() {
	return (
		<div aria-busy="true" aria-label="Loading vault">
			<div className="pt-10 pb-8">
				<Skeleton className="h-12 w-72 rounded-2xl" />
				<Skeleton className="mt-3 h-4 w-56" />
			</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{[0, 1, 2, 3].map((i) => (
					<div key={i} className="h-[156px] rounded-card bg-night" />
				))}
			</div>
			<div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,456px)]">
				<Panel>
					<SkeletonLines rows={6} />
				</Panel>
				<Panel>
					<SkeletonLines rows={3} />
				</Panel>
			</div>
		</div>
	);
}
