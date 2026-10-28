"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Execution, Position } from "@repo/stellar/vault";
import { assetCode } from "@repo/stellar/assets";
import { Button } from "@repo/ui/button";
import { Spinner } from "@repo/ui/spinner";
import { Chip, DetailRow, Notice, Panel, PanelHeader } from "@repo/ui/surface";
import { cn } from "@repo/ui/lib/utils";
import { everyLabel, money, percent, utcDate, utcDateTime, utcTimeSeconds } from "@/lib/format";
import { vaultRoutes } from "@/lib/routes";
import { formatAmount } from "@/lib/stellar/config";
import { ExplorerButton, HashText } from "@/components/ExplorerButton";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, SkeletonLines } from "@/components/states";
import { useExecution, usePosition } from "@/features/vaults/hooks";
import { EXECUTION_STATUS } from "@/features/vaults/status";
import { VaultNotFound } from "@/features/vaults/components/VaultNotFound";

const TITLE: Record<Execution["status"], string> = {
	scheduled: "Scheduled purchase",
	eligible: "Eligible purchase",
	submitted: "Purchase in progress",
	completed: "Completed purchase",
	failed: "Failed purchase",
	skipped: "Skipped purchase",
};

/** Screen 8 (Figma 28:11626 + Loading 40:33759 + Error 40:31891), for every PRD execution status. */
export function ExecutionDetails({ vaultId, executionId }: { vaultId: string; executionId: string }) {
	const execution = useExecution(executionId);
	const position = usePosition(vaultId);

	if (execution.isError || position.isError) {
		const notFound = ((execution.error ?? position.error) as { response?: { status?: number } }).response?.status === 404;
		return (
			<>
				<PageHeader title="Swap execution details" />
				{notFound ? <VaultNotFound /> : <ErrorState error={execution.error ?? position.error} onRetry={() => void Promise.all([execution.refetch(), position.refetch()])} />}
			</>
		);
	}

	if (execution.isPending || position.isPending) {
		return (
			<>
				<PageHeader title="Swap execution details" subtitle="Loading execution…" />
				<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,516px)]" aria-busy="true">
					<Panel>
						<SkeletonLines rows={8} />
					</Panel>
					<Panel>
						<SkeletonLines rows={4} />
					</Panel>
				</div>
			</>
		);
	}

	const e = execution.data;
	const p = position.data;
	const status = EXECUTION_STATUS[e.status];
	const source = p.source_asset;
	const target = p.target_asset;

	return (
		<>
			<PageHeader
				title="Swap execution details"
				subtitle={`${p.name} · ${p.id} · Execution ${e.id}`}
				action={
					<Button asChild variant="outline">
						<Link href={vaultRoutes.VAULT(p.id)}>
							<ArrowLeft /> Back to position
						</Link>
					</Button>
				}
			/>

			<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,516px)]">
				<div className="flex min-w-0 flex-col gap-4">
					<StatusNotices execution={e} position={p} />
					<Panel className="animate-rise" style={{ "--i": 1 } as React.CSSProperties} aria-live="polite">
						<PanelHeader title={TITLE[e.status]} action={<Chip tone={status.tone} live={status.live}>{status.label}</Chip>} />
						<p className="mt-6 text-[36px] leading-none tracking-[-0.06em] sm:text-[48px]">
							{e.status === "completed" && e.received_amount ? (
								<>
									{money(e.source_amount, source)} → {money(e.received_amount, target)}
								</>
							) : e.status === "submitted" ? (
								<>
									{money(e.source_amount, source)} → <span className="text-muted">{assetCode(target)}</span>
								</>
							) : (
								`${money(e.source_amount, source)} attempted`
							)}
						</p>
						<p className="caption mt-3 border-b border-line pb-6">
							{e.status === "completed" ? "Actual source spend and target output" : `${assetCode(source)} → ${assetCode(target)}`} · Stellar Testnet
						</p>
						<dl className="mt-6 flex flex-col gap-4">
							<DetailRow label="Execution ID" value={e.attempt > 1 ? `${e.id} · attempt ${e.attempt}` : e.id} />
							<DetailRow label="Purchase interval" value={`${utcDate(e.scheduled_at)} · ${everyLabel(p.interval_seconds).toLowerCase()}`} />
							<DetailRow label="Source spent" value={e.status === "completed" ? money(e.source_amount, source) : `0 ${assetCode(source)}`} />
							<DetailRow label="Target received" value={e.received_amount ? money(e.received_amount, target, 4) : `0 ${assetCode(target)}`} />
							<DetailRow label="Execution price" value={e.execution_price ? `${e.execution_price} ${assetCode(source)} / ${assetCode(target)}` : "Not executed"} />
							<DetailRow label={e.status === "completed" ? "Actual slippage" : "Maximum slippage"} value={e.slippage_bps !== null ? `${percent(e.slippage_bps)} · max ${percent(p.max_slippage_bps)}` : percent(p.max_slippage_bps)} />
							<DetailRow label="Minimum accepted" value={money(e.min_received, target, 4)} />
							<DetailRow label="Execution fee" value={e.status === "completed" ? `${formatAmount(e.fee ?? "0")} ${assetCode(source)}` : `0 ${assetCode(source)} · no swap`} />
							<DetailRow label="Network fee" value={e.network_fee ? `${formatAmount(e.network_fee, 7)} XLM` : "0 XLM · not submitted"} />
							<DetailRow
								label={e.status === "completed" ? "Completed" : e.status === "failed" ? "Failed at" : e.status === "skipped" ? "Skipped at" : "Scheduled"}
								value={utcDateTime(e.executed_at ?? e.scheduled_at)}
							/>
						</dl>
						{(e.status === "failed" || e.status === "skipped") && (
							<Button asChild className="mt-8">
								<Link href={e.status === "skipped" ? vaultRoutes.DEPOSIT(p.id) : vaultRoutes.VAULT(p.id)}>{e.status === "skipped" ? "Deposit more" : "Review strategy limits"}</Link>
							</Button>
						)}
					</Panel>
				</div>

				<aside className="flex min-w-0 flex-col gap-4">
					{e.status === "completed" && (
						<Notice tone="info" title="Execution states are explicit" className="animate-rise">
							Scheduled, Eligible, Submitted, Completed, Failed and Skipped each have a distinct state. Only completed swaps add acquired XLM.
						</Notice>
					)}
					<Panel className="animate-rise" style={{ "--i": 2 } as React.CSSProperties}>
						<PanelHeader title="Stellar reference" action={<Chip tone="soft">Stellar Testnet</Chip>} />
						{e.tx_hash ? (
							<>
								<p className="caption mt-5">Transaction hash{e.tx_hash.startsWith("demo") && " · demo data, not on chain"}</p>
								<p className="mt-2 text-2xl tracking-[-0.03em]">
									<HashText hash={e.tx_hash} />
								</p>
								<div className="mt-5">
									<ExplorerButton hash={e.tx_hash} />
								</div>
							</>
						) : (
							<>
								<p className="caption mt-5">Transaction hash</p>
								<p className="mt-2 text-2xl tracking-[-0.03em]">No hash · not submitted</p>
								<p className="mt-2 text-sm font-light text-muted">This attempt stopped before submission, so there is no on-chain transaction to view.</p>
							</>
						)}
					</Panel>
					<Panel className="animate-rise" style={{ "--i": 3 } as React.CSSProperties}>
						<PanelHeader title="Execution timeline" />
						<ol className="relative mt-5 flex flex-col gap-4">
							{e.events.map((event, i) => {
								const lastEvent = i === e.events.length - 1;
								return (
									<li key={`${event.at}-${i}`} className="animate-rise flex items-start gap-3" style={{ "--i": i } as React.CSSProperties}>
										<span className={cn("mt-1.5 flex size-3 shrink-0 rounded-full", lastEvent ? (e.status === "failed" ? "bg-danger" : e.status === "completed" ? "bg-coral" : "bg-ink") : "bg-line")} aria-hidden />
										<span className="text-base">
											<span className="font-light text-muted tabular-nums">{utcTimeSeconds(event.at)}</span> <span className="text-subtle">/</span> {event.label}
										</span>
									</li>
								);
							})}
							{e.status === "submitted" && (
								<li className="flex items-center gap-3 text-base text-muted">
									<Spinner className="size-3 text-coral" /> Waiting for the ledger to close…
								</li>
							)}
						</ol>
						{(e.status === "failed" || e.status === "skipped") && <p className="caption mt-4">No purchase completed in this attempt.</p>}
					</Panel>
				</aside>
			</div>
		</>
	);
}

function StatusNotices({ execution: e, position: p }: { execution: Execution; position: Position }) {
	if (e.status === "failed") {
		const slippage = /slippage/i.test(e.failure_reason ?? "");
		return (
			<div className="animate-rise grid gap-4 xl:grid-cols-2">
				<Notice tone="error" title={slippage ? "Swap failed · slippage limit exceeded" : "Swap failed · insufficient liquidity"}>
					{e.failure_reason} No swap was performed: no USDC was spent and no XLM was acquired.
				</Notice>
				<Notice tone="warning" title="Your balances are unchanged">
					Only completed swaps add acquired XLM. The keeper retries this interval while it is still eligible.
				</Notice>
			</div>
		);
	}
	if (e.status === "skipped") {
		return (
			<Notice tone="warning" title="Purchase skipped · insufficient balance" className="animate-rise">
				{e.failure_reason} Remaining balance: {money(p.source_balance, p.source_asset)}.
			</Notice>
		);
	}
	if (e.status === "submitted") {
		return (
			<Notice tone="info" title="Submitted to Stellar Testnet" className="animate-rise">
				The keeper sent this purchase. It settles when the ledger closes, usually within a few seconds. This page updates on its own.
			</Notice>
		);
	}
	return null;
}
