/** Small helpers shared by the seed and the handlers. */

/** Deterministic PRNG (mulberry32): the seed looks the same on every machine. */
export function random(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const fallback = random(Date.now());

export function hex(length: number, rand: () => number = fallback) {
	return Array.from({ length }, () => Math.floor(rand() * 16).toString(16)).join("");
}

/** A transaction hash that is obviously not on chain: "demo" + 60 hex chars. */
export const demoHash = (rand: () => number = fallback) => `demo${hex(60, rand)}`;

export const DAY = 86_400_000;

export const iso = (ms: number) => new Date(ms).toISOString();

export const pad3 = (n: number) => String(n).padStart(3, "0");

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function paginate<T>(list: T[], page: number, limit: number) {
	const safeLimit = Math.max(1, limit || 10);
	const total = list.length;
	const total_pages = Math.max(1, Math.ceil(total / safeLimit));
	const current = Math.min(Math.max(1, page || 1), total_pages);
	return { items: list.slice((current - 1) * safeLimit, current * safeLimit), meta: { page: current, limit: safeLimit, total, total_pages } };
}
