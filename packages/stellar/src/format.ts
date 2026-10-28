import { ASSET_DECIMALS } from "./assets";

const SCALE = 10n ** BigInt(ASSET_DECIMALS);

/** "12.5" → 125000000n. Throws on more than 7 decimals rather than rounding money silently. */
export function toStroops(amount: string): bigint {
	const [whole = "0", fraction = ""] = amount.trim().split(".");
	if (fraction.length > ASSET_DECIMALS) throw new Error(`At most ${ASSET_DECIMALS} decimal places`);
	return BigInt(whole || "0") * SCALE + BigInt(fraction.padEnd(ASSET_DECIMALS, "0"));
}

/** A backend decimal string ("-5.0000000", "20.1493713") → stroop string ("-50000000"). Null stays null. */
export function decimalToStroops(value: string | null | undefined): string {
	if (value == null || value === "") return "0";
	const negative = value.trim().startsWith("-");
	const stroops = toStroops(value.trim().replace(/^[-+]/, ""));
	return (negative ? -stroops : stroops).toString();
}

/** 125000000n → "12.5". Exact, no grouping: for inputs and maths. */
export function fromStroops(stroops: bigint | string): string {
	const value = BigInt(stroops);
	const sign = value < 0n ? "-" : "";
	const abs = value < 0n ? -value : value;
	const fraction = (abs % SCALE).toString().padStart(ASSET_DECIMALS, "0").replace(/0+$/, "");
	return `${sign}${abs / SCALE}${fraction ? `.${fraction}` : ""}`;
}

/**
 * Display form: grouped, trimmed, never rounded away to zero. 1000.0000000 → "1,000", 12.3456 → "12.35",
 * 0.00001 → "0.00001". `decimals` caps the fraction for ordinary amounts.
 */
export function formatAmount(stroops: bigint | string, decimals = 2): string {
	const value = BigInt(stroops);
	const sign = value < 0n ? "-" : "";
	const abs = value < 0n ? -value : value;
	const places = 10n ** BigInt(decimals);
	const unit = SCALE / places;
	// Tiny amounts (fees) keep their significant digits instead of showing "0".
	if (abs > 0n && abs < unit) return `${sign}${fromStroops(abs)}`;
	const rounded = (abs + unit / 2n) / unit;
	const fraction = (rounded % places).toString().padStart(decimals, "0").replace(/0+$/, "");
	return `${sign}${(rounded / places).toLocaleString("en-US")}${fraction ? `.${fraction}` : ""}`;
}

/** "GCL7…9Q2M" for tight spaces; full values stay copyable. */
export function shortKey(value: string, head = 4, tail = 4) {
	return value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;
}
