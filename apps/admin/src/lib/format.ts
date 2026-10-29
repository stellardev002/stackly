/**
 * Display formatting. Amounts arrive as 7-decimal strings and are formatted as text (never through floating point);
 * different assets are never added together. Dates are always UTC.
 */

/** "1250000.5000000" → "1,250,000.50". Keeps the sign; trims to `decimals` (truncates, never rounds up money). */
export function amount(value: string | null | undefined, decimals = 2) {
	if (value === null || value === undefined || value === "") return "—";
	const negative = value.trim().startsWith("-");
	const [whole = "0", fraction = ""] = value.trim().replace(/^[-+]/, "").split(".");
	const grouped = whole.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	const frac = fraction.slice(0, decimals).padEnd(decimals, "0");
	const text = decimals > 0 ? `${grouped}.${frac}` : grouped;
	const isZero = !/[1-9]/.test(text);
	return `${negative && !isZero ? "−" : ""}${text}`;
}

/** "1,250,000.50 USDC" */
export const money = (value: string | null | undefined, code: string, decimals = 2) =>
	value === null || value === undefined ? "—" : `${amount(value, decimals)} ${code}`;

/** A signed amount for ledger rows: "+12.50" / "−3.00". */
export function signed(value: string, decimals = 2) {
	const text = amount(value, decimals);
	return value.trim().startsWith("-") || text.startsWith("−") ? text : /[1-9]/.test(text) ? `+${text}` : text;
}

export const isNegative = (value: string) => value.trim().startsWith("-") && /[1-9]/.test(value);

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" });
const timeSeconds = new Intl.DateTimeFormat("en-GB", {
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hourCycle: "h23",
	timeZone: "UTC",
});

/** "20 Oct 2026" */
export const utcDate = (value: string | number | Date) => day.format(new Date(value));
/** "27 Oct" */
export const utcDayMonth = (value: string | number | Date) => dayMonth.format(new Date(value));
/** "20 Oct 2026 · 09:00 UTC" */
export const utcDateTime = (value: string | number | Date) => `${utcDate(value)} · ${time.format(new Date(value))} UTC`;
/** "20 Oct 2026 · 09:00:12 UTC" (audit log) */
export const utcDateTimeSeconds = (value: string | number | Date) =>
	`${utcDate(value)} · ${timeSeconds.format(new Date(value))} UTC`;
/** "27 Oct · 09:00" (chart tooltips, hourly buckets) */
export const utcDayTime = (value: string | number | Date) => `${utcDayMonth(value)} · ${time.format(new Date(value))}`;

/** "in 2 days", "5 minutes ago". */
export function relative(target: number, now: number) {
	const diff = target - now;
	const abs = Math.abs(diff);
	for (const [size, unit] of [
		[86_400_000, "day"],
		[3_600_000, "hour"],
		[60_000, "minute"],
	] as const) {
		if (abs >= size) {
			const n = Math.round(abs / size);
			const label = `${n} ${unit}${n === 1 ? "" : "s"}`;
			return diff > 0 ? `in ${label}` : `${label} ago`;
		}
	}
	return diff > 0 ? "in under a minute" : "just now";
}

/** "every 5 min", "every 30 s" */
export function intervalLabel(seconds: number) {
	if (!seconds) return "off";
	if (seconds % 3600 === 0) return `every ${seconds / 3600} h`;
	if (seconds % 60 === 0) return `every ${seconds / 60} min`;
	return `every ${seconds} s`;
}

/** Basis points → "1.00%". */
export const percent = (bps: number) => `${(bps / 100).toFixed(2)}%`;

/** "GBZX…K4LA". */
export const shortKey = (key: string, head = 4, tail = 4) =>
	key.length > head + tail + 1 ? `${key.slice(0, head)}…${key.slice(-tail)}` : key;

/** Backend ids are UUIDv7: the tail is the distinguishing part ("#a1b2c3"). */
export const shortId = (id: string) => `#${id.replace(/-/g, "").slice(-6)}`;

/** "insufficient_balance" → "Insufficient balance". */
export const humanize = (value: string) => value.replace(/[_.]/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export const EXPLORER = "https://stellar.expert/explorer/testnet";
export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const accountUrl = (address: string) => `${EXPLORER}/account/${address}`;
