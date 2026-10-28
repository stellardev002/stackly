"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Ban, Pause, PenLine, Play, Plus } from "lucide-react";
import type { Execution, Position, PositionAccount } from "@repo/stellar/vault";
import { Button } from "@repo/ui/button";
import { Skeleton } from "@repo/ui/skeleton";
import { Chip, DetailRow, Notice, Panel, PanelHeader, StatCard } from "@repo/ui/surface";
import { useNow } from "@/lib/clock";
import { httpStatus } from "@/lib/api/errors";
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
import { TxProgress } from "@/components/TxProgress";
import { vaultClient } from "@/features/vaults/client";
import { usePosition, usePositionAccount, usePositionExecutions, useVaultTx } from "@/features/vaults/hooks";
import { EXECUTION_STATUS, MAX_AUTHORIZATIONS, POSITION_STATUS, failureText, fundedPurchases, nextIntervalStatus, purchasesToSign, shortId } from "@/features/vaults/status";
import { VaultNotFound } from "@/features/vaults/components/VaultNotFound";

/** Screen 7 (Figma 28:11859 + Loading / Empty / Error), on the backend's position, balance and account. */
export function ActivePosition({ vaultId }: { vaultId: string }) {
	const now = useNow();
	const position = usePosition(vaultId);
	const executions = usePositionExecutions(vaultId);
	const account = usePositionAccount(vaultId);

	if (position.isError) {
		return (
			<>
				<PageHeader title="DCA Position" />
				{httpStatus(position.error) === 404 ? <VaultNotFound /> : <ErrorState error={position.error} title="We couldn't load this vault" onRetry={() => void position.refetch()} />}
			</>
		);
	}

	if (position.isPending) return <PositionSkeleton />;

	const p = position.data;
	const list = executions.data ?? [];
	const funded = fundedPurchases(p);
	const title = p.status === "active" ? "Active DCA Position" : `${POSITION_STATUS[p.status].label} DCA Position`;
	const open = p.status === "pending" || p.status === "active" || p.status === "paused";

	return (
		<>
			<PageHeader
				title={title}
				subtitle={
					<>
						{p.name} · {shortId(p.id)} · <span className="text-ink">{POSITION_STATUS[p.status].label}</span>
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
					{ label: "Remaining", value: <Amount stroops={p.available_source} asset={p.source_asset} />, caption: `${funded} purchase${funded === 1 ? "" : "s"} funded` },
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
									<SwapRow key={e.id} execution={e} index={i} />
								))}
							</ul>
						) : (
							<EmptyState compact title="No purchases yet">
								{p.status === "pending" ? "Fund the vault and sign its purchases to start. Purchases will appear here." : "Your first purchase will appear here once the keeper runs it."}
							</EmptyState>
						)}
					</Panel>

					<StrategyDetails position={p} account={account.data ?? null} lastExecution={list.find((e) => e.id === p.last_execution?.id) ?? list[0]} />
				</div>

				<aside className="flex min-w-0 flex-col gap-6">
					<Notice tone="info" title="No performance estimate" className="animate-rise">
						Balances show source spending and acquired units separately. They do not represent gains, losses or a combined portfolio valuation.
					</Notice>
					{open && <SignaturesCard position={p} />}
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
							{funded === 0 ? "Purchases fail or are skipped until you deposit more USDC." : "Deposit more USDC to keep the schedule running after the next purchase."}
						</Notice>
					)}
					<NextInterval position={p} executions={list} now={now} />
					<PromoCard title="Control the pace">Pausing stops future purchases. It does not sell acquired XLM or withdraw available USDC.</PromoCard>
				</aside>
			</div>
		</>
	);
}

/** Signed purchases the keeper can run, and a way to sign more (at most 19 unused per vault). */
function SignaturesCard({ position: p }: { position: Position }) {
	const toast = useToast();
	const tx = useVaultTx();
	const funded = fundedPurchases(p);
	const unsigned = Math.max(0, funded - p.authorizations_remaining);
	const room = MAX_AUTHORIZATIONS - p.authorizations_remaining;
	const count = purchasesToSign(p);
	const canSign = p.status !== "pending" && room > 0 && unsigned > 0;

	const signMore = async () => {
		const res = await tx.run((opts) => vaultClient.authorize(p, count, opts));
		if (res) toast.success(`${count} purchase${count === 1 ? "" : "s"} signed`, { description: "The keeper can run them on schedule.", action: explorerAction(res.txHash) });
	};

	if (p.status === "pending") {
		return (
			<Notice
				tone="warning"
				title="Not started yet"
				className="animate-rise"
				action={
					<Button asChild size="sm">
						<Link href={vaultRoutes.DEPOSIT(p.id, { flow: true })}>Fund and start</Link>
					</Button>
				}
			>
				Deposit USDC, then sign the purchases in one approval to start the schedule.
			</Notice>
		);
	}

	return (
		<Panel className="animate-rise" style={{ "--i": 2 } as React.CSSProperties}>
			<PanelHeader title="Signed purchases" action={<Chip tone={p.authorizations_remaining === 0 ? "warning" : "soft"}>{p.authorizations_remaining} ready</Chip>} />
			<p className="mt-3 text-sm font-light text-muted">
				{p.authorizations_remaining === 0
					? "No signed purchases are left, so the keeper can't buy. Sign more to continue."
					: `The keeper can run the next ${p.authorizations_remaining} purchase${p.authorizations_remaining === 1 ? "" : "s"} exactly as you signed them: fixed amount, minimum output and time.`}
				{unsigned > 0 && ` ${unsigned} more ${unsigned === 1 ? "is" : "are"} funded but not signed.`}
			</p>
			{tx.stage !== "idle" && tx.stage !== "confirmed" && <TxProgress stage={tx.stage} className="mt-4" />}
			{(tx.stage === "rejected" || tx.stage === "failed") && (
				<Notice tone="error" title={tx.stage === "rejected" ? "Declined" : "Signing failed"} className="mt-4">
					{tx.stage === "rejected" ? "You declined in your wallet. Nothing changed." : tx.error}
				</Notice>
			)}
			{canSign && (
				<Button className="mt-4" onClick={signMore} isLoading={tx.busy} loadingText={tx.stage === "signing" ? "Waiting for wallet…" : "Submitting…"}>
					<PenLine /> Sign {count} more purchase{count === 1 ? "" : "s"}
				</Button>
			)}
		</Panel>
	);
}

function NextInterval({ position: p, executions, now }: { position: Position; executions: Execution[]; now: number }) {
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
					<p className="h-card mt-6">{p.status === "paused" ? "Purchases are paused" : p.status === "pending" ? "Schedule not started" : "No more purchases"}</p>
					<p className="mt-2 text-base font-light text-muted">{status.description}</p>
				</>
			)}
		</Panel>
	);
}

function StrategyDetails({ position: p, account, lastExecution }: { position: Position; account: PositionAccount | null; lastExecution?: Execution }) {
	const toast = useToast();
	const tx = useVaultTx();
	const [confirmCancel, setConfirmCancel] = useState(false);
	const pausing = p.status === "active";
	const last = p.last_execution;
	const reason = failureText(last?.failure_reason ?? null);

	const toggle = async () => {
		const res = await tx.run((opts) => (pausing ? vaultClient.pause(p.id, opts) : vaultClient.resume(p.id, opts)));
		if (res) toast.success(res.message, { description: pausing ? "No purchases run until you resume." : "Missed intervals aren't caught up; the next one is the later of its time and now." });
	};

	const cancel = async () => {
		const res = await tx.run((opts) => vaultClient.cancel(p.id, opts));
		setConfirmCancel(false);
		if (res) toast.success("Strategy cancelled", { description: "No more purchases. You can still withdraw what's in the vault." });
	};

	return (
		<Panel className="animate-rise" style={{ "--i": 4 } as React.CSSProperties}>
			<PanelHeader title="Strategy details" action={<Chip tone={POSITION_STATUS[p.status].tone}>{POSITION_STATUS[p.status].label}</Chip>} />
			<p className="mt-6 text-[40px] leading-none tracking-[-0.06em] sm:text-[48px]">
				{p.source_asset} → {p.target_asset}
			</p>
			<dl className="mt-8 flex flex-col gap-4">
				<DetailRow label="Vault ID" value={<span title={p.id}>{shortId(p.id)}</span>} />
				<DetailRow
					label="Vault account"
					value={
						account ? (
							<a href={account.explorer_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono underline-offset-4 hover:underline" title={account.address}>
								{shortKey(account.address, 6, 6)} <ArrowUpRight className="size-3" aria-hidden />
							</a>
						) : (
							"Not created yet"
						)
					}
				/>
				<DetailRow label="Purchase amount" value={money(p.purchase_amount, p.source_asset)} />
				<DetailRow label="Frequency" value={frequencyLabel(p.interval_seconds)} />
				<DetailRow label="Next eligible time" value={p.status === "active" ? utcDateTime(p.next_execution_ts * 1000) : POSITION_STATUS[p.status].label} />
				<DetailRow label="Maximum slippage" value={percent(p.max_slippage_bps)} />
				{p.end_ts && <DetailRow label="End date" value={utcDateTime(p.end_ts * 1000)} />}
				<DetailRow label="Signed purchases left" value={`${p.authorizations_remaining}`} />
				<DetailRow label="Last execution" value={last ? utcDateTime(lastExecution?.executed_at ?? last.scheduled_for) : "—"} />
				<DetailRow
					label="Last result"
					value={
						last ? (
							<span className="inline-flex flex-wrap items-center gap-2">
								<Chip tone={EXECUTION_STATUS[last.status].tone}>{EXECUTION_STATUS[last.status].label}</Chip>
								{lastExecution?.received_amount ? `${money(lastExecution.source_amount, p.source_asset)} → ${money(lastExecution.received_amount, p.target_asset, 4)}` : reason?.title}
							</span>
						) : (
							"No purchases yet"
						)
					}
				/>
			</dl>
			{(tx.stage === "failed" || tx.stage === "rejected") && (
				<Notice tone="error" title="That didn't go through" className="mt-6">
					{tx.error}
				</Notice>
			)}
			<div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
				{(p.status === "pending" || p.status === "active" || p.status === "paused") && (
					<Button asChild>
						<Link href={vaultRoutes.DEPOSIT(p.id, { flow: p.status === "pending" })}>{p.status === "pending" ? "Fund vault" : "Deposit More"}</Link>
					</Button>
				)}
				{(p.status === "active" || p.status === "paused") && (
					<Button variant="outline" onClick={toggle} isLoading={tx.busy && !confirmCancel} loadingText={pausing ? "Pausing…" : "Resuming…"}>
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
			{(p.status === "pending" || p.status === "active" || p.status === "paused") && (
				<div className="mt-4">
					{confirmCancel ? (
						<div className="animate-pop flex flex-wrap items-center gap-3 rounded-card bg-danger-bg p-4">
							<p className="text-sm text-ink">Cancel this strategy for good? No more purchases will run. Your funds stay in the vault until you withdraw them.</p>
							<Button variant="danger" size="sm" onClick={cancel} isLoading={tx.busy} loadingText="Cancelling…">
								Cancel strategy
							</Button>
							<Button variant="ghost" size="sm" onClick={() => setConfirmCancel(false)} disabled={tx.busy}>
								Keep it
							</Button>
						</div>
					) : (
						<button type="button" onClick={() => setConfirmCancel(true)} className="inline-flex cursor-pointer items-center gap-2 text-sm text-danger hover:underline">
							<Ban className="size-4" aria-hidden /> Cancel strategy
						</button>
					)}
				</div>
			)}
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
