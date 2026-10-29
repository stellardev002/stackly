"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { humanize } from "@/lib/format";
import { toQuery } from "@/lib/routes";

/**
 * List filters live in the URL (the route file reads them and passes plain props), so a filtered view survives a
 * reload and can be shared. Changing a filter resets paging.
 */
export function useFilters(current: Record<string, string | undefined>) {
	const router = useRouter();
	const pathname = usePathname();
	return (patch: Record<string, string | undefined>) => {
		const next = { ...current, ...patch, offset: undefined };
		router.replace(`${pathname}${toQuery(next)}`, { scroll: false });
	};
}

/**
 * The filter strip. From `sm` up the controls sit inline and wrap; on phones they fold behind a "Filters" button
 * (with the number of active filters) so the results aren't pushed below the fold.
 */
export function FilterBar({
	children,
	onClear,
	active,
	count,
}: {
	children: React.ReactNode;
	onClear?: () => void;
	active?: boolean;
	/** Active filters, shown on the phone toggle. */
	count?: number;
}) {
	const [open, setOpen] = useState(false);
	return (
		<div className="mb-4">
			<div className="flex items-center gap-2 sm:hidden">
				<Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
					<SlidersHorizontal /> Filters{active ? ` · ${count ?? "on"}` : ""}
					<ChevronDown className={cn("transition-transform", open && "rotate-180")} />
				</Button>
				{onClear && active && (
					<Button variant="ghost" size="sm" onClick={onClear}>
						<X /> Clear
					</Button>
				)}
			</div>
			<div className={cn("mt-3 flex-col gap-3 sm:mt-0 sm:flex sm:flex-row sm:flex-wrap sm:items-end", open ? "flex" : "hidden")}>
				{children}
				{onClear && active && (
					<Button variant="ghost" size="sm" onClick={onClear} className="hidden self-auto sm:inline-flex">
						<X /> Clear filters
					</Button>
				)}
			</div>
		</div>
	);
}

const control =
	"h-10 w-full rounded-full border border-line bg-white px-4 text-sm text-ink outline-none transition-[border-color,box-shadow] focus:border-coral focus:ring-[3px] focus:ring-coral/20 sm:w-auto";

function Label({ text, children, className }: { text: string; children: React.ReactNode; className?: string }) {
	return (
		<label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
			<span className="caption">{text}</span>
			{children}
		</label>
	);
}

/** A native select (phones get their own picker). Empty value = all. */
export function SelectFilter({
	label,
	value,
	options,
	onChange,
	allLabel = "All",
	format = humanize,
}: {
	label: string;
	value: string | undefined;
	options: readonly string[] | { value: string; label: string }[];
	onChange: (value: string | undefined) => void;
	allLabel?: string;
	format?: (value: string) => string;
}) {
	const items = (options as (string | { value: string; label: string })[]).map((o) =>
		typeof o === "string" ? { value: o, label: format(o) } : o,
	);
	return (
		<Label text={label}>
			<select
				value={value ?? ""}
				onChange={(e) => onChange(e.target.value || undefined)}
				className={cn(control, "cursor-pointer pr-8 sm:min-w-[150px]")}
			>
				<option value="">{allLabel}</option>
				{items.map((o) => (
					<option key={o.value} value={o.value}>
						{o.label}
					</option>
				))}
			</select>
		</Label>
	);
}

/** Free text, applied on submit (Enter or the search button), not on every keystroke. */
export function TextFilter({
	label,
	value,
	onChange,
	placeholder,
	transform = (v) => v,
	pattern,
	title,
	className,
}: {
	label: string;
	value: string | undefined;
	onChange: (value: string | undefined) => void;
	placeholder?: string;
	transform?: (value: string) => string;
	pattern?: string;
	title?: string;
	className?: string;
}) {
	const [text, setText] = useState(value ?? "");
	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				const v = transform(text.trim());
				onChange(v || undefined);
			}}
			className={cn("flex min-w-0 flex-col gap-1.5 sm:w-[280px]", className)}
		>
			<span className="caption">{label}</span>
			<div
				className={cn(
					control,
					"flex items-center gap-2 px-3 focus-within:border-coral focus-within:ring-[3px] focus-within:ring-coral/20 sm:w-full",
				)}
			>
				<input
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder={placeholder}
					pattern={pattern}
					title={title}
					aria-label={label}
					className="h-full w-full min-w-0 bg-transparent font-mono text-sm outline-none placeholder:font-sans placeholder:text-subtle"
				/>
				<button
					type="submit"
					aria-label={`Search ${label.toLowerCase()}`}
					className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-blush hover:text-ink"
				>
					<Search className="size-4" />
				</button>
			</div>
		</form>
	);
}

/** From / to dates (UTC days). Values are ISO timestamps for the API; inputs show YYYY-MM-DD. */
export function DateRange({
	from,
	to,
	onChange,
}: {
	from?: string;
	to?: string;
	onChange: (patch: { from?: string; to?: string }) => void;
}) {
	const day = (iso?: string) => (iso ? iso.slice(0, 10) : "");
	return (
		<>
			<Label text="From (UTC)">
				<input
					type="date"
					value={day(from)}
					max={day(to) || undefined}
					onChange={(e) => onChange({ from: e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined })}
					className={control}
				/>
			</Label>
			<Label text="To (UTC, inclusive)">
				<input
					type="date"
					value={to ? day(new Date(new Date(to).getTime() - 1).toISOString()) : ""}
					min={day(from) || undefined}
					onChange={(e) =>
						onChange({
							to: e.target.value
								? new Date(new Date(`${e.target.value}T00:00:00.000Z`).getTime() + 86_400_000).toISOString()
								: undefined,
						})
					}
					className={control}
				/>
			</Label>
		</>
	);
}

/** On/off chip filter ("Due now", "Stuck"). */
export function ToggleFilter({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
	return (
		<button
			type="button"
			aria-pressed={on}
			onClick={() => onChange(!on)}
			className={cn(
				"h-10 cursor-pointer self-start rounded-full border px-4 text-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-coral/40 focus-visible:outline-none sm:self-end",
				on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-rose",
			)}
		>
			{label}
		</button>
	);
}
