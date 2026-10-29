"use client";

import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@repo/ui/skeleton";
import type { StatMetric, Stats } from "@/lib/api/dto";
import { humanize, utcDayMonth, utcDayTime } from "@/lib/format";
import { ErrorState, Section } from "@/components/ui";
import { useStats, type StatsRange } from "@/features/overview/hooks";

const METRICS: { value: StatMetric; label: string; unit?: string }[] = [
	{ value: "executions", label: "Purchase attempts" },
	{ value: "volume", label: "Swap volume (spent)", unit: "amount" },
	{ value: "deposits", label: "Deposits", unit: "amount" },
	{ value: "withdrawals", label: "Withdrawals", unit: "amount" },
	{ value: "new_users", label: "New users" },
	{ value: "positions_created", label: "Positions created" },
];

const RANGES: { label: string; range: StatsRange }[] = [
	{ label: "24 h", range: { days: 1, bucket: "hour" } },
	{ label: "7 d", range: { days: 7, bucket: "day" } },
	{ label: "30 d", range: { days: 30, bucket: "day" } },
	{ label: "90 d", range: { days: 90, bucket: "day" } },
];

/** Chart colours per series; statuses keep their meaning, assets get distinct lines (never summed). */
const COLOURS: Record<string, string> = { completed: "#1f8a4c", failed: "#d92d20", skipped: "#a59a9c", submitted: "#d97706" };
const PALETTE = ["#ff6173", "#270c0f", "#2563eb", "#7c3aed", "#0d9488"];

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** Pivot points into one row per bucket with a column per series (null series → "value"). Display only. */
function pivot(stats: Stats) {
	const rows = new Map<string, Record<string, number | string>>();
	const series = new Set<string>();
	for (const p of stats.points) {
		const key = p.series ?? "value";
		series.add(key);
		const row = rows.get(p.at) ?? { at: p.at };
		row[key] = Number(p.value);
		rows.set(p.at, row);
	}
	const keys = [...series];
	const data = [...rows.values()].sort((a, b) => String(a.at).localeCompare(String(b.at)));
	// Buckets with nothing are left out by the API: draw them as zero.
	for (const row of data) for (const k of keys) row[k] ??= 0;
	return { data, keys };
}

/** Time series from `GET /admin/stats`: pick a metric and a range. One line per status or per asset. */
export function StatsChart() {
	const [metric, setMetric] = useState<StatMetric>("executions");
	const [rangeIndex, setRangeIndex] = useState(2);
	const range = RANGES[rangeIndex]!.range;
	const stats = useStats(metric, range);
	const meta = METRICS.find((m) => m.value === metric)!;

	return (
		<Section
			title="Activity"
			action={
				<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
					<select
						aria-label="Metric"
						value={metric}
						onChange={(e) => setMetric(e.target.value as StatMetric)}
						className="h-9 w-full cursor-pointer rounded-full border border-line bg-white px-3 text-sm outline-none focus:border-coral sm:w-auto"
					>
						{METRICS.map((m) => (
							<option key={m.value} value={m.value}>
								{m.label}
							</option>
						))}
					</select>
					<div role="radiogroup" aria-label="Range" className="flex rounded-full bg-[#f2f0f0] p-1">
						{RANGES.map((r, i) => (
							<button
								key={r.label}
								type="button"
								role="radio"
								aria-checked={i === rangeIndex}
								onClick={() => setRangeIndex(i)}
								className={`h-7 flex-1 cursor-pointer rounded-full px-3 text-xs whitespace-nowrap sm:flex-none ${i === rangeIndex ? "bg-ink text-white" : "text-ink hover:bg-white"}`}
							>
								{r.label}
							</button>
						))}
					</div>
				</div>
			}
		>
			{stats.isError ? (
				<ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
			) : stats.isPending ? (
				<Skeleton className="h-[260px] w-full rounded-card" />
			) : (
				<ChartBody stats={stats.data} amount={!!meta.unit} />
			)}
		</Section>
	);
}

function ChartBody({ stats, amount }: { stats: Stats; amount: boolean }) {
	const { data, keys } = pivot(stats);
	if (!data.length) return <p className="py-16 text-center text-base font-light text-muted">No activity in this range.</p>;
	const hourly = stats.bucket === "hour";
	return (
		<>
			<figure className="h-[260px] w-full" aria-label={`${humanize(stats.metric)} per ${stats.bucket}`}>
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
						<CartesianGrid vertical={false} stroke="#ebe5e6" />
						<XAxis
							dataKey="at"
							tickFormatter={(v: string) => (hourly ? utcDayTime(v).split(" · ")[1]! : utcDayMonth(v))}
							tick={{ fill: "#7c6e70", fontSize: 11 }}
							axisLine={false}
							tickLine={false}
							minTickGap={24}
						/>
						<YAxis
							tickFormatter={(v: number) => compact.format(v)}
							tick={{ fill: "#a59a9c", fontSize: 11 }}
							axisLine={false}
							tickLine={false}
							allowDecimals={amount}
							width={48}
						/>
						<Tooltip
							contentStyle={{
								borderRadius: 14,
								border: "1px solid #ebe5e6",
								fontFamily: "inherit",
								fontSize: 13,
								color: "#270c0f",
							}}
							labelFormatter={(v) => (hourly ? `${utcDayTime(String(v))} UTC` : utcDayMonth(String(v)))}
							formatter={(v, name) => [
								Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 }),
								name === "value" ? humanize(stats.metric) : humanize(String(name)),
							]}
						/>
						{keys.length > 1 && (
							<Legend
								formatter={(v: string) => <span className="text-xs text-ink">{humanize(v)}</span>}
								iconType="circle"
								iconSize={8}
							/>
						)}
						{keys.map((k, i) => (
							<Line
								key={k}
								type="monotone"
								dataKey={k}
								stroke={COLOURS[k] ?? PALETTE[i % PALETTE.length]}
								strokeWidth={2}
								dot={data.length < 3}
								activeDot={{ r: 4 }}
								isAnimationActive={false}
							/>
						))}
					</LineChart>
				</ResponsiveContainer>
			</figure>
			{amount && <p className="caption mt-2">One line per asset; amounts of different assets are never added together.</p>}
		</>
	);
}
