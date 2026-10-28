"use client";

import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import type { Execution, Position } from "@repo/stellar/vault";
import { Button } from "@repo/ui/button";
import { Spinner } from "@repo/ui/spinner";
import { Chip, DetailRow, Notice, Panel, PanelHeader } from "@repo/ui/surface";
import { cn } from "@repo/ui/lib/utils";
import { httpStatus } from "@/lib/api/errors";
import { everyLabel, money, percent, utcDate, utcDateTime, utcTimeSeconds } from "@/lib/format";
import { vaultRoutes } from "@/lib/routes";
import { formatAmount } from "@/lib/stellar/config";
import { useToast } from "@/lib/use-toast";
import { ExplorerButton, HashText, explorerAction } from "@/components/ExplorerButton";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, SkeletonLines } from "@/components/states";
import { TxProgress } from "@/components/TxProgress";
import { vaultClient } from "@/features/vaults/client";
import { useExecution, usePosition, useVaultTx } from "@/features/vaults/hooks";
import { EXECUTION_STATUS, failureText, purchasesToSign, shortId } from "@/features/vaults/status";
import { VaultNotFound } from "@/features/vaults/components/VaultNotFound";

const TITLE: Record<Execution["status"], string> = {
	scheduled: "Scheduled purchase",
	eligible: "Eligible purchase",
	submitted: "Purchase in progress",
	completed: "Completed purchase",
	failed: "Failed purchase",
	skipped: "Skipped purchase",
};

/** Screen 8 (Figma 28:11626 + Loading 40:33759 + Error 40:31891), from `GET /executions/{id}`. */
export function ExecutionDetails({ vaultId, executionId }: { vaultId: string; executionId: string }) {
	const execution = useExecution(executionId);
	const position = usePosition(vaultId);

	if (execution.isError || position.isError) {
		const error = execution.error ?? position.error;
		return (
			<>
				<PageHeader title="Swap execution details" />
				{httpStatus(error) === 404 ? <VaultNotFound /> : <ErrorState error={error} onRetry={() => void Promise.all([execution.refetch(), position.refetch()])} />}
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
	const reason = failureText(e.failure_reason);
	const timeline = [
		{ at: e.scheduled_at, label: "Interval eligible" },
		{ at: e.created_at, label: e.status === "skipped" ? "Not attempted" : "Submitted by the keeper" },
		...(e.executed_at ? [{ at: e.executed_at, label: "Purchase completed" }] : []),
		...(e.status === "failed" || e.status === "skipped" ? [{ at: e.created_at, label: `${status.label} · ${reason?.title ?? "see reason"}` }] : []),
	].sort((a, b) => a.at.localeCompare(b.at));

	return (
		<>
			<PageHeader
				title="Swap execution details"
				subtitle={`${p.name} · ${shortId(p.id)} · Execution ${shortId(e.id)}`}
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
									{money(e.source_amount, e.source_asset)} → {money(e.received_amount, e.target_asset)}
								</>
							) : e.status === "submitted" ? (
								<>
									{money(e.source_amount, e.source_asset)} → <span className="text-muted">{e.target_asset}</span>
								</>
							) : (
								`${money(e.source_amount, e.source_asset)} attempted`
							)}
						</p>
						<p className="caption mt-3 border-b border-line pb-6">
							{e.status === "completed" ? "Actual source spend and target output" : `${e.source_asset} → ${e.target_asset}`} · Stellar Testnet DEX
						</p>
						<dl className="mt-6 flex flex-col gap-4">
							<DetailRow label="Execution ID" value={<span title={e.id}>{shortId(e.id)}</span>} />
							<DetailRow label="Purchase interval" value={`${utcDate(e.scheduled_at)} · ${everyLabel(e.interval_seconds).toLowerCase()}`} />
							<DetailRow label="Source spent" value={e.status === "completed" ? money(e.source_amount, e.source_asset) : `0 ${e.source_asset}`} />
							<DetailRow label="Target received" value={e.received_amount ? money(e.received_amount, e.target_asset, 4) : `0 ${e.target_asset}`} />
							<DetailRow label="Expected at submission" value={e.expected_amount ? money(e.expected_amount, e.target_asset, 4) : "—"} />
							<DetailRow label="Minimum accepted" value={e.min_received ? money(e.min_received, e.target_asset, 4) : "—"} />
							<DetailRow label="Execution price" value={e.execution_price ? `${e.execution_price} ${e.source_asset} / ${e.target_asset}` : "Not executed"} />
							<DetailRow
								label={e.status === "completed" ? "Actual slippage" : "Maximum slippage"}
								value={e.slippage_bps !== null ? `${percent(e.slippage_bps)}${e.slippage_bps < 0 ? " (better than quoted)" : ""} · max ${percent(p.max_slippage_bps)}` : percent(p.max_slippage_bps)}
							/>
							<DetailRow label="Network fee" value={e.fee ? `${formatAmount(e.fee, 7)} XLM · paid by Stackly` : "0 XLM"} />
							<DetailRow
								label={e.status === "completed" ? "Completed" : e.status === "failed" ? "Failed at" : e.status === "skipped" ? "Skipped at" : "Submitted"}
								value={utcDateTime(e.executed_at ?? e.created_at)}
							/>
						</dl>
					</Panel>
				</div>

				<aside className="flex min-w-0 flex-col gap-4">
					{e.status === "completed" && (
						<Notice tone="info" title="Executed as you signed it" className="animate-rise">
							This purchase was one of the transactions your wallet pre-authorized: its amount, minimum output and earliest time were fixed on chain. Only completed swaps add XLM.
						</Notice>
					)}
					<Panel className="animate-rise" style={{ "--i": 2 } as React.CSSProperties}>
						<PanelHeader title="Stellar reference" action={<Chip tone="soft">Stellar Testnet</Chip>} />
						{e.tx_hash ? (
							<>
								<p className="caption mt-5">Transaction hash</p>
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
							{timeline.map((event, i) => {
								const lastEvent = i === timeline.length - 1;
								return (
									<li key={`${event.label}-${i}`} className="animate-rise flex items-start gap-3" style={{ "--i": i } as React.CSSProperties}>
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
					</Panel>
				</aside>
			</div>
		</>
	);
}

function StatusNotices({ execution: e, position: p }: { execution: Execution; position: Position }) {
	const toast = useToast();
	const tx = useVaultTx();
	const reason = failureText(e.failure_reason);
	const isLatest = p.last_execution?.id === e.id;
	const canRetry = e.retryable && isLatest && (p.status === "active" || p.status === "paused") && p.authorizations_remaining === 0;
	const count = Math.max(1, purchasesToSign(p));

	const retry = async () => {
		const res = await tx.run((opts) => vaultClient.retryMissed(p.id, count, opts));
		if (res) toast.success("Missed purchase rescheduled", { description: "It's signed and eligible now; the keeper will pick it up shortly.", action: explorerAction(res.txHash) });
	};

	if (e.status === "failed" || e.status === "skipped") {
		return (
			<div className="animate-rise flex flex-col gap-4">
				<div className="grid gap-4 xl:grid-cols-2">
					<Notice tone="error" title={`${e.status === "failed" ? "Swap failed" : "Purchase skipped"} · ${reason?.title ?? "unknown reason"}`}>
						{reason?.body ?? e.failure_reason} No swap was performed: no USDC was spent and no XLM was acquired.
					</Notice>
					<Notice tone="warning" title="Your balances are unchanged">
						A missed interval isn&apos;t retried automatically. {e.retryable ? "This cause can clear, so you can make up the purchase." : "The keeper moves on to the next interval."}
					</Notice>
				</div>
				{e.retryable && isLatest && (
					<Panel>
						<PanelHeader title="Make up this purchase" />
						<p className="mt-2 text-sm font-light text-muted">
							Reschedules the missed purchase to now. A signed purchase can&apos;t run twice, so your wallet signs a fresh batch of {count}.
							{!canRetry && p.authorizations_remaining > 0 && " Available once the purchases you already signed are used."}
						</p>
						{tx.stage !== "idle" && tx.stage !== "confirmed" && <TxProgress stage={tx.stage} className="mt-4" />}
						{tx.stage === "failed" && (
							<Notice tone="error" title="Couldn't reschedule" className="mt-4">
								{tx.error}
							</Notice>
						)}
						<Button className="mt-4" onClick={retry} disabled={!canRetry} isLoading={tx.busy} loadingText={tx.stage === "signing" ? "Waiting for wallet…" : "Submitting…"}>
							<RotateCcw /> Make up purchase
						</Button>
					</Panel>
				)}
			</div>
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
