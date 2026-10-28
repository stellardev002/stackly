import { assetCode } from "@repo/stellar/assets";
import { formatAmount } from "@repo/stellar/format";

/** Display formatting. Dates are always UTC, as in the design ("27 Oct 2026 · 09:00 UTC"). */

/** "1,000 USDC". `stroops` is the contract's integer amount. */
export const money = (stroops: string | bigint, asset: string, decimals = 2) => `${formatAmount(stroops, decimals)} ${assetCode(asset)}`;

const toDate = (value: string | number | Date) => (value instanceof Date ? value : new Date(value));

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", timeZone: "UTC" });
const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" });
const timeSeconds = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZone: "UTC" });

/** "20 Oct 2026" */
export const utcDate = (value: string | number | Date) => day.format(toDate(value));
/** "27 Oct" */
export const utcDayMonth = (value: string | number | Date) => dayMonth.format(toDate(value));
/** "Oct 20" (chart axes) */
export const utcMonthDay = (value: string | number | Date) => monthDay.format(toDate(value));
/** "09:00" */
export const utcTime = (value: string | number | Date) => time.format(toDate(value));
/** "09:04:50" */
export const utcTimeSeconds = (value: string | number | Date) => timeSeconds.format(toDate(value));
/** "20 Oct 2026 · 09:00 UTC" */
export const utcDateTime = (value: string | number | Date) => `${utcDate(value)} · ${utcTime(value)} UTC`;

/** "in 2 days", "in 3 hours", "5 minutes ago": for countdowns next to exact UTC times. */
export function relative(target: number, now: number) {
	const diff = target - now;
	const abs = Math.abs(diff);
	const units: [number, string][] = [
		[86_400_000, "day"],
		[3_600_000, "hour"],
		[60_000, "minute"],
	];
	for (const [size, unit] of units) {
		if (abs >= size) {
			const n = Math.round(abs / size);
			const label = `${n} ${unit}${n === 1 ? "" : "s"}`;
			return diff > 0 ? `in ${label}` : `${label} ago`;
		}
	}
	return diff > 0 ? "in under a minute" : "just now";
}

/** "Every 7 days", "Every 30 days", "Daily". */
export function everyLabel(intervalSeconds: number) {
	const days = Math.round(intervalSeconds / 86_400);
	return days === 1 ? "Every day" : `Every ${days} days`;
}

/** "Weekly · every 7 days" */
export function frequencyLabel(intervalSeconds: number) {
	const days = Math.round(intervalSeconds / 86_400);
	const name = days === 1 ? "Daily" : days === 7 ? "Weekly" : days === 30 ? "Monthly" : `Every ${days} days`;
	return days === 1 ? "Daily · every 24 hours" : `${name} · every ${days} days`;
}

/** Basis points → "0.50%". */
export const percent = (bps: number) => `${(bps / 100).toFixed(2)}%`;
