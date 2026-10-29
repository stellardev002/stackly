"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Copy, ExternalLink, RotateCw } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Skeleton } from "@repo/ui/skeleton";
import { Chip, type ChipTone, Notice, Panel } from "@repo/ui/surface";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage, requestId } from "@/lib/api/errors";
import type { PaginationMeta } from "@/lib/api/dto";
import { humanize, shortKey, txUrl } from "@/lib/format";

/** Page title row: title + subtitle, actions wrap below on phones. */
export function PageHeader({
	title,
	subtitle,
	actions,
}: {
	title: string;
	subtitle?: React.ReactNode;
	actions?: React.ReactNode;
}) {
	return (
		<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div className="min-w-0">
				<h1 className="text-[32px] leading-[1.05] tracking-[-0.05em] sm:text-[40px]">{title}</h1>
				{subtitle && <p className="mt-2 text-base font-light text-muted">{subtitle}</p>}
			</div>
			{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
		</div>
	);
}

// ---- Status chips (labels and tones in one place) -----------------------------------------------------------------

const TONES: Record<string, ChipTone> = {
	// positions
	pending: "warning",
	active: "success",
	paused: "neutral",
	cancelled: "danger",
	completed: "dark",
	// executions
	submitted: "warning",
	failed: "danger",
	skipped: "neutral",
	// ledger
	deposit: "success",
	withdrawal: "soft",
	swap: "dark",
	adjustment: "warning",
	// authorizations
	prepared: "neutral",
	used: "soft",
	// roles
	admin: "accent",
	user: "neutral",
};

export function StatusChip({ value, live }: { value: string; live?: boolean }) {
	return (
		<Chip tone={TONES[value] ?? "neutral"} live={live ?? value === "submitted"}>
			{humanize(value)}
		</Chip>
	);
}

// ---- Addresses, ids, hashes -------------------------------------------------------------------------------------

/** A shortened key with the full value on hover and a copy button. */
export function Copyable({
	value,
	head = 4,
	tail = 4,
	className,
}: {
	value: string;
	head?: number;
	tail?: number;
	className?: string;
}) {
	const [copied, setCopied] = useState(false);
	return (
		<span className={cn("inline-flex min-w-0 items-center gap-1 font-mono text-sm", className)}>
			<span className="truncate" title={value}>
				{shortKey(value, head, tail)}
			</span>
			<button
				type="button"
				aria-label="Copy"
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void navigator.clipboard?.writeText(value).then(() => {
						setCopied(true);
						window.setTimeout(() => setCopied(false), 1200);
					});
				}}
				className="relative z-10 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-blush hover:text-ink focus-visible:ring-[3px] focus-visible:ring-coral/40 focus-visible:outline-none"
			>
				{copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
			</button>
		</span>
	);
}

export function TxLink({ hash }: { hash: string | null }) {
	if (!hash) return <span className="text-muted">—</span>;
	return (
		<a
			href={txUrl(hash)}
			target="_blank"
			rel="noreferrer"
			className="relative z-10 inline-flex items-center gap-1 font-mono text-sm text-ink underline-offset-4 hover:underline"
			onClick={(e) => e.stopPropagation()}
		>
			{shortKey(hash, 6, 4)} <ExternalLink className="size-3 text-muted" aria-hidden />
		</a>
	);
}

/** An in-app link that stays above a row's whole-card link. */
export function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
	return (
		<Link href={href} className="relative z-10 text-ink underline-offset-4 hover:underline">
			{children}
		</Link>
	);
}

// ---- Responsive data list ---------------------------------------------------------------------------------------

export interface Column<T> {
	header: string;
	cell: (row: T) => React.ReactNode;
	className?: string;
	/** Shown as the card heading on phones. */
	primary?: boolean;
	/** Hidden from the phone card (still in the table). */
	hideOnMobile?: boolean;
}

/**
 * Rows as a table from `md` up (scrolling sideways inside its panel if it must) and as stacked cards on phones,
 * where each card shows the primary column as its heading and the rest as label/value pairs. With `href`, a whole
 * row or card opens the detail page.
 */
export function DataList<T>({
	columns,
	rows,
	rowKey,
	href,
	loading,
	empty = "Nothing here yet.",
	linkLabel = () => "Open details",
}: {
	columns: Column<T>[];
	rows: T[] | undefined;
	rowKey: (row: T) => string | number;
	href?: (row: T) => string;
	loading?: boolean;
	empty?: React.ReactNode;
	/** Accessible name of the whole-row link. */
	linkLabel?: (row: T) => string;
}) {
	if (loading || !rows) return <ListSkeleton columns={columns.length} />;
	if (!rows.length) return <p className="px-1 py-10 text-center text-base font-light text-muted">{empty}</p>;
	const primary = columns.find((c) => c.primary) ?? columns[0]!;
	// Many columns don't fit a tablet: keep cards until the desktop layout.
	const wide = columns.length > 6;
	const rest = columns.filter((c) => c !== primary && !c.hideOnMobile);

	return (
		<>
			<div className={cn("hidden overflow-x-auto", wide ? "xl:block" : "md:block")}>
				<table className="w-full text-left text-sm">
					<thead>
						<tr className="border-b border-line">
							{columns.map((c) => (
								<th
									key={c.header}
									scope="col"
									className={cn("px-3 py-3 font-normal whitespace-nowrap text-muted first:pl-0 last:pr-0", c.className)}
								>
									{c.header}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => (
							<tr
								key={rowKey(row)}
								className={cn("border-b border-line last:border-0", href && "relative cursor-pointer hover:bg-page")}
							>
								{columns.map((c, i) => (
									<td key={c.header} className={cn("px-3 py-3.5 align-middle first:pl-0 last:pr-0", c.className)}>
										{i === 0 && href && <RowLink href={href(row)} label={linkLabel(row)} />}
										{c.cell(row)}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<ul
				className={cn(
					"-my-3 flex flex-col divide-y divide-line sm:grid sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0",
					wide ? "xl:hidden" : "md:hidden",
				)}
			>
				{rows.map((row) => (
					<li key={rowKey(row)} className="relative py-4">
						{href && <RowLink href={href(row)} label={linkLabel(row)} />}
						<div className="min-w-0 text-base">{primary.cell(row)}</div>
						<dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
							{rest.map((c) => (
								<div key={c.header} className="min-w-0">
									<dt className="caption">{c.header}</dt>
									<dd className="mt-0.5 min-w-0 break-words">{c.cell(row)}</dd>
								</div>
							))}
						</dl>
					</li>
				))}
			</ul>
		</>
	);
}

/** Covers the whole row or card; copy buttons and inline links sit above it (`relative z-10`). */
function RowLink({ href, label }: { href: string; label: string }) {
	return (
		<Link
			href={href}
			aria-label={label}
			className="absolute inset-0 rounded-card outline-none focus-visible:ring-[3px] focus-visible:ring-coral/40"
		/>
	);
}

function ListSkeleton({ columns }: { columns: number }) {
	return (
		<div aria-busy="true" aria-label="Loading" className="flex flex-col gap-4 py-2">
			{[0, 1, 2, 3, 4].map((i) => (
				<div key={i} className="flex items-center gap-4">
					{Array.from({ length: Math.min(columns, 4) }, (_, j) => (
						<Skeleton key={j} className={cn("h-4", j === 0 ? "w-40" : "hidden w-24 md:block")} />
					))}
				</div>
			))}
		</div>
	);
}

/** Previous / next with "21–40 of 132". Links, so pages are shareable and the back button works. */
export function Pager({
	meta,
	offset,
	limit,
	hrefFor,
}: {
	meta?: PaginationMeta;
	offset: number;
	limit: number;
	hrefFor: (offset: number) => string;
}) {
	if (!meta || meta.totalCount <= limit) return meta?.totalCount ? <p className="caption mt-4">{meta.totalCount} total</p> : null;
	const from = offset + 1;
	const to = offset + meta.pageCount;
	return (
		<nav aria-label="Pages" className="mt-4 flex flex-wrap items-center justify-between gap-3">
			<p className="caption">
				{from}–{to} of {meta.totalCount}
			</p>
			<div className="flex gap-2">
				{meta.previousPage ? (
					<Button asChild size="sm" variant="outline">
						<Link href={hrefFor(Math.max(0, offset - limit))}>
							<ChevronLeft /> Previous
						</Link>
					</Button>
				) : (
					<Button size="sm" variant="outline" disabled>
						<ChevronLeft /> Previous
					</Button>
				)}
				{meta.nextPage ? (
					<Button asChild size="sm" variant="outline">
						<Link href={hrefFor(offset + limit)}>
							Next <ChevronRight />
						</Link>
					</Button>
				) : (
					<Button size="sm" variant="outline" disabled>
						Next <ChevronRight />
					</Button>
				)}
			</div>
		</nav>
	);
}

// ---- States -----------------------------------------------------------------------------------------------------

export function ErrorState({
	error,
	onRetry,
	title = "Couldn't load this",
}: {
	error: unknown;
	onRetry?: () => void;
	title?: string;
}) {
	const id = requestId(error);
	return (
		<Notice
			tone="error"
			title={title}
			action={
				onRetry && (
					<Button size="sm" variant="outline" onClick={onRetry}>
						<RotateCw /> Try again
					</Button>
				)
			}
		>
			{errorMessage(error)}
			{id && <span className="mt-1 block font-mono text-xs">Request id {id}</span>}
		</Notice>
	);
}

/** A Panel with a heading row; `flush` drops the inner top margin for lists. */
export function Section({
	title,
	action,
	children,
	className,
}: {
	title: React.ReactNode;
	action?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<Panel className={cn("min-w-0", className)}>
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<h2 className="text-lg leading-6 tracking-[-0.01em]">{title}</h2>
				{action}
			</div>
			{children}
		</Panel>
	);
}

/** Key/value facts in a responsive grid (1 column on phones, 2–3 wider). */
export function Facts({ items, columns = 3 }: { items: { label: string; value: React.ReactNode }[]; columns?: 2 | 3 }) {
	return (
		<dl className={cn("grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2", columns === 3 && "xl:grid-cols-3")}>
			{items.map((item) => (
				<div key={item.label} className="min-w-0">
					<dt className="caption">{item.label}</dt>
					<dd className="mt-1 min-w-0 text-base break-words">{item.value}</dd>
				</div>
			))}
		</dl>
	);
}

/** A small stat tile for the light panels (the dark StatCard is for the headline numbers). */
export function Tile({
	label,
	value,
	hint,
	tone,
}: {
	label: string;
	value: React.ReactNode;
	hint?: React.ReactNode;
	tone?: "danger" | "warning" | "success";
}) {
	return (
		<div className="min-w-0 rounded-card border border-line bg-white p-4">
			<p className="caption">{label}</p>
			<p
				className={cn(
					"mt-1 truncate text-2xl tracking-[-0.03em]",
					tone === "danger" && "text-danger",
					tone === "warning" && "text-warning",
					tone === "success" && "text-success",
				)}
			>
				{value}
			</p>
			{hint && <p className="caption mt-1">{hint}</p>}
		</div>
	);
}
