import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "./lib/utils";

/** White card, radius 14 (every content block in the app). */
export function Panel({ className, ...props }: React.ComponentProps<"section">) {
	return <section className={cn("rounded-card bg-white p-5 sm:p-6", className)} {...props} />;
}

/** Card heading row: title on the left, chip or action on the right. */
export function PanelHeader({ title, action, className }: { title: React.ReactNode; action?: React.ReactNode; className?: string }) {
	return (
		<div className={cn("flex items-start justify-between gap-3", className)}>
			<h2 className="text-base leading-6 tracking-[-0.01em]">{title}</h2>
			{action}
		</div>
	);
}

const NOTICE = {
	info: { icon: Info, box: "bg-blush", title: "text-ink" },
	warning: { icon: AlertTriangle, box: "bg-peach", title: "text-ink" },
	error: { icon: XCircle, box: "bg-danger-bg", title: "text-danger" },
	success: { icon: CheckCircle2, box: "bg-success-bg", title: "text-success" },
} as const;

/** The tinted explainer box ("A schedule is not a guarantee", "Wallet authorization required"). */
export function Notice({
	tone = "info",
	title,
	children,
	className,
	action,
}: {
	tone?: keyof typeof NOTICE;
	title: React.ReactNode;
	children?: React.ReactNode;
	className?: string;
	action?: React.ReactNode;
}) {
	const { icon: Icon, box, title: titleTone } = NOTICE[tone];
	return (
		<div role={tone === "error" ? "alert" : undefined} className={cn("flex gap-3 rounded-card px-5 py-4", box, className)}>
			<Icon className={cn("mt-0.5 size-[18px] shrink-0", titleTone)} aria-hidden />
			<div className="min-w-0 flex-1">
				<p className={cn("text-base leading-6", titleTone)}>{title}</p>
				{children && <div className="mt-1 text-sm leading-[1.5] font-light text-muted">{children}</div>}
				{action && <div className="mt-3">{action}</div>}
			</div>
		</div>
	);
}

const CHIP = {
	neutral: "border border-line bg-white text-ink",
	soft: "bg-blush text-ink",
	accent: "bg-coral text-white",
	dark: "bg-night text-white",
	success: "bg-success-bg text-success",
	warning: "bg-warning-bg text-warning",
	danger: "bg-danger-bg text-danger",
} as const;

export type ChipTone = keyof typeof CHIP;

/** Small rounded status label. `live` adds the waiting pulse (only for states pending on the network). */
export function Chip({ tone = "soft", live, className, children }: { tone?: ChipTone; live?: boolean; className?: string; children: React.ReactNode }) {
	return (
		<span className={cn("inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs whitespace-nowrap", CHIP[tone], className)}>
			{live && <span className="animate-signal size-1.5 rounded-full bg-current" aria-hidden />}
			{children}
		</span>
	);
}

/** "Label / value" row, the design's key-value pattern. */
export function DetailRow({ label, value, className }: { label: React.ReactNode; value: React.ReactNode; className?: string }) {
	return (
		<div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-base", className)}>
			<dt className="font-light text-muted">{label}</dt>
			<span aria-hidden className="text-subtle">
				/
			</span>
			<dd className="min-w-0 break-words text-ink">{value}</dd>
		</div>
	);
}

/** The dark summary card (Figma stat cards). */
export function StatCard({ label, value, caption, className, style }: { label: string; value: React.ReactNode; caption?: React.ReactNode; className?: string; style?: React.CSSProperties }) {
	return (
		<div
			className={cn("flex min-h-[156px] flex-col justify-between rounded-card bg-[linear-gradient(135deg,#0e0405_0%,#1d0d10_60%,#2a1418_100%)] p-5 text-white sm:p-6", className)}
			style={style}
		>
			<p className="text-base leading-5">{label}</p>
			<p className="stat-value mt-3 truncate">{value}</p>
			{caption && <p className="mt-2 text-xs font-light text-white/70">{caption}</p>}
		</div>
	);
}
