"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fromStroops } from "@repo/stellar/format";
import { utcDateTime, utcMonthDay } from "@/lib/format";

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

interface Point {
	at: string;
	cumulative: string;
}

/**
 * Cumulative target asset acquired, one step per completed purchase (Figma "Your purchase history"). Units of
 * the target asset only: never a value or a return.
 */
export function CumulativeChart({ series, unit = "XLM" }: { series: Point[]; unit?: string }) {
	const points = series.map((p) => ({ t: Date.parse(p.at), v: Number(fromStroops(p.cumulative)) }));
	// Start the step from zero a day before the first purchase, so even one purchase draws a step.
	const data = points.length ? [{ t: points[0]!.t - 86_400_000, v: 0 }, ...points] : points;
	const max = Math.max(...data.map((d) => d.v), 1);
	const step = niceStep(max / 4);
	const ticks = Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);

	return (
		<figure className="h-[200px] w-full sm:h-[220px]" aria-label={`Cumulative ${unit} acquired over ${data.length} purchases`}>
			<ResponsiveContainer width="100%" height="100%">
				<LineChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
					<CartesianGrid vertical={false} stroke="#ebe5e6" />
					<XAxis
						dataKey="t"
						type="number"
						scale="time"
						domain={["dataMin", "dataMax"]}
						ticks={data.map((d) => d.t)}
						tickFormatter={(t: number) => utcMonthDay(t)}
						tick={{ fill: "#7c6e70", fontSize: 12 }}
						axisLine={false}
						tickLine={false}
						tickMargin={10}
						interval="preserveStartEnd"
					/>
					<YAxis ticks={ticks} domain={[0, ticks.at(-1) ?? max]} tickFormatter={(v: number) => compact.format(v)} tick={{ fill: "#a59a9c", fontSize: 11 }} axisLine={false} tickLine={false} />
					<Tooltip
						cursor={{ stroke: "#ffced4" }}
						contentStyle={{ borderRadius: 14, border: "1px solid #ebe5e6", fontFamily: "inherit", fontSize: 13, color: "#270c0f" }}
						labelFormatter={(t) => utcDateTime(Number(t))}
						formatter={(v) => [`${Number(v).toLocaleString("en-US")} ${unit}`, "Acquired to date"]}
					/>
					<Line type="stepAfter" dataKey="v" stroke="#ff6173" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: "#ff6173", stroke: "#fff", strokeWidth: 2 }} animationDuration={900} animationEasing="ease-out" />
				</LineChart>
			</ResponsiveContainer>
		</figure>
	);
}

function niceStep(raw: number) {
	const pow = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
	const n = raw / pow;
	return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}
