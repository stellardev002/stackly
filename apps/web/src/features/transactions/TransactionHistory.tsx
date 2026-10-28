"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { TransactionType, VaultTransaction } from "@repo/stellar/vault";
import { Button } from "@repo/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select";
import { Chip, Panel } from "@repo/ui/surface";
import { cn } from "@repo/ui/lib/utils";
import { money, utcDate, utcTime } from "@/lib/format";
import { transactionRoutes, vaultRoutes } from "@/lib/routes";
import { explorer } from "@/lib/stellar/config";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState } from "@/components/states";
import { TRANSACTION_STATUS, TRANSACTION_TYPE, failureText, shortId } from "@/features/vaults/status";
import { usePositions } from "@/features/vaults/hooks";
import { useTransactions } from "@/features/transactions/hooks";

const ALL = "all";

/** Screen 9 (Figma 28:11355 + Loading / Empty / Error). `vault` narrows the list to one position. */
export function TransactionHistory({ vault }: { vault?: string }) {
	const [type, setType] = useState<string>(ALL);
	const [positionId, setPositionId] = useState<string>(vault ?? ALL);
	const [page, setPage] = useState(1);
	const positions = usePositions();

	const query = useTransactions({ type: type === ALL ? undefined : (type as TransactionType), positionId: positionId === ALL ? undefined : positionId, page });

	const filtered = type !== ALL || positionId !== ALL;
	const reset = () => {
		setType(ALL);
		setPositionId(ALL);
		setPage(1);
	};
	const changed = <T,>(set: (v: T) => void) => (v: T) => {
		set(v);
		setPage(1);
	};
	const vaultName = positions.data?.find((p) => p.id === positionId);

	return (
		<>
			<PageHeader
				title="Transaction History"
				subtitle={vaultName ? `Deposits, swaps and withdrawals for ${vaultName.name} · ${shortId(vaultName.id)}` : "Every deposit, swap and withdrawal across your vaults"}
				action={
					vault && (
						<Button asChild variant="outline">
							<Link href={transactionRoutes.TRANSACTIONS}>
								<X /> Show all vaults
							</Link>
						</Button>
					)
				}
			/>

			<Panel className="animate-rise p-4 sm:p-6">
				<div className="scroll-row -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
					<FilterSelect label="Type" value={type} onChange={changed(setType)} options={[{ value: ALL, label: "All types" }, ...Object.entries(TRANSACTION_TYPE).map(([value, label]) => ({ value, label }))]} />
					<FilterSelect
						label="Vault"
						value={positionId}
						onChange={changed(setPositionId)}
						options={[{ value: ALL, label: "All vaults" }, ...(positions.data ?? []).map((p) => ({ value: p.id, label: `${p.name} · ${shortId(p.id)}` }))]}
					/>
				</div>

				<div className="mt-6" aria-live="polite" aria-busy={query.isFetching}>
					{query.isError ? (
						<ErrorState error={query.error} title="We couldn't load your history" onRetry={() => void query.refetch()} />
					) : query.isPending ? (
						<HistorySkeleton />
					) : query.data.items.length === 0 ? (
						filtered ? (
							<EmptyState
								compact
								title="No transactions match"
								action={
									<Button variant="outline" onClick={reset}>
										Clear filters
									</Button>
								}
							>
								Try another type or vault.
							</EmptyState>
						) : (
							<EmptyState
								title="No transactions yet"
								action={
									<Button asChild>
										<Link href={vaultRoutes.CREATE}>Create a vault</Link>
									</Button>
								}
							>
								Deposits, swaps and withdrawals will appear here once you fund a vault.
							</EmptyState>
						)
					) : (
						<div className={cn("transition-opacity duration-200", query.isPlaceholderData && "opacity-60")}>
							<Table rows={query.data.items} />
							<MobileList rows={query.data.items} />
							<Pager page={page} pages={query.data.totalPages} total={query.data.total} onPage={setPage} />
						</div>
					)}
				</div>
			</Panel>
		</>
	);
}

/** A failed execution's history id is the execution id; other entries are ledger rows, so they link to the vault. */
function describe(t: VaultTransaction) {
	const amount = money(t.amount, t.asset);
	if (t.type === "swap" && t.counter_amount && t.counter_asset) return { main: `${amount} → ${money(t.counter_amount, t.counter_asset, 4)}`, sub: "View vault", href: vaultRoutes.VAULT(t.position_id) };
	if (t.type === "failed_execution") return { main: `${amount} attempted`, sub: failureText(t.failure_reason)?.title ?? "No swap", href: vaultRoutes.EXECUTION(t.position_id, t.id) };
	if (t.type === "deposit") return { main: amount, sub: "Into your vault", href: vaultRoutes.VAULT(t.position_id) };
	if (t.type === "withdrawal") return { main: amount, sub: "To your wallet", href: vaultRoutes.VAULT(t.position_id) };
	return { main: `${t.direction === "out" ? "−" : "+"}${amount}`, sub: "Ledger correction", href: vaultRoutes.VAULT(t.position_id) };
}

function Reference({ hash, url }: { hash: string | null; url: string | null }) {
	if (!hash) return <span className="text-sm font-light text-subtle">No hash · not submitted</span>;
	const short = `${hash.slice(0, 10)}…${hash.slice(-4)}`;
	return (
		<a href={url ?? explorer.tx(hash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-sm text-muted hover:text-ink" title={hash}>
			{short} <ArrowUpRight className="size-3" aria-hidden />
			<span className="sr-only">(opens Stellar Explorer)</span>
		</a>
	);
}

function Table({ rows }: { rows: VaultTransaction[] }) {
	return (
		<div className="hidden overflow-x-auto md:block">
			<table className="w-full min-w-[760px] text-left">
				<caption className="sr-only">Vault transactions</caption>
				<thead>
					<tr className="text-sm font-light text-muted">
						{["ID / Type", "Asset / Amount", "Date & time · UTC", "Status", "Stellar reference"].map((h) => (
							<th key={h} scope="col" className="pb-3 font-light">
								{h}
							</th>
						))}
					</tr>
				</thead>
				<tbody className="divide-y divide-line">
					{rows.map((t, i) => {
						const d = describe(t);
						const s = TRANSACTION_STATUS[t.status];
						return (
							<tr key={`${t.id}-${t.type}`} className="animate-rise align-middle" style={{ "--i": i } as React.CSSProperties}>
								<td className="py-5 pr-4">
									<p className="text-lg tracking-[-0.02em]">{TRANSACTION_TYPE[t.type]}</p>
									<p className="caption" title={t.id}>{shortId(t.id)}</p>
								</td>
								<td className="py-5 pr-4">
									<p className="text-lg tracking-[-0.02em]">{d.main}</p>
									<Link href={d.href} className="caption inline-flex items-center gap-1 hover:text-ink">
										{d.sub} <ArrowUpRight className="size-3" aria-hidden />
									</Link>
								</td>
								<td className="py-5 pr-4 text-base whitespace-nowrap">
									{utcDate(t.created_at)} · {utcTime(t.created_at)}
								</td>
								<td className="py-5 pr-4">
									<Chip tone={s.tone} live={s.live}>
										{s.label}
									</Chip>
								</td>
								<td className="py-5">
									<Reference hash={t.tx_hash} url={t.explorer_url} />
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

function MobileList({ rows }: { rows: VaultTransaction[] }) {
	return (
		<ul className="flex flex-col divide-y divide-line md:hidden">
			{rows.map((t, i) => {
				const d = describe(t);
				const s = TRANSACTION_STATUS[t.status];
				return (
					<li key={`${t.id}-${t.type}`} className="animate-rise flex flex-col gap-2 py-4" style={{ "--i": i } as React.CSSProperties}>
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<p className="text-lg tracking-[-0.02em]">{TRANSACTION_TYPE[t.type]}</p>
								<p className="caption">
									{shortId(t.id)} · {utcDate(t.created_at)} · {utcTime(t.created_at)} UTC
								</p>
							</div>
							<Chip tone={s.tone} live={s.live}>
								{s.label}
							</Chip>
						</div>
						<Link href={d.href} className="text-base">
							{d.main} <span className="caption">· {d.sub}</span>
						</Link>
						<Reference hash={t.tx_hash} url={t.explorer_url} />
					</li>
				);
			})}
		</ul>
	);
}

function Pager({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
	if (pages <= 1) return <p className="caption mt-4">{total} transaction{total === 1 ? "" : "s"}</p>;
	return (
		<nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3">
			<p className="caption">
				Page {page} of {pages} · {total} transactions
			</p>
			<div className="flex gap-2">
				<Button variant="outline" size="icon" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
					<ChevronLeft />
				</Button>
				<Button variant="outline" size="icon" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page">
					<ChevronRight />
				</Button>
			</div>
		</nav>
	);
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger aria-label={label} className={cn("h-11 shrink-0 cursor-pointer rounded-full border-line bg-white px-5 text-base text-ink shadow-none", value !== ALL && "border-ink")}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent className="rounded-card border-line bg-white">
				{options.map((o) => (
					<SelectItem key={o.value} value={o.value} className="h-10 cursor-pointer rounded-lg text-base">
						{o.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}


function HistorySkeleton() {
	return (
		<div className="flex flex-col divide-y divide-line" aria-label="Loading transactions">
			{Array.from({ length: 6 }, (_, i) => (
				<div key={i} className="grid grid-cols-2 gap-4 py-5 md:grid-cols-5">
					<div className="flex flex-col gap-2">
						<div className="shimmer h-4 w-20 rounded-full" />
						<div className="shimmer h-3 w-14 rounded-full" />
					</div>
					<div className="shimmer h-4 w-32 rounded-full" />
					<div className="shimmer hidden h-4 w-28 rounded-full md:block" />
					<div className="shimmer hidden h-7 w-24 rounded-full md:block" />
					<div className="shimmer hidden h-4 w-32 rounded-full md:block" />
				</div>
			))}
		</div>
	);
}
