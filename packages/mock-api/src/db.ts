import type { Execution, Position, VaultTransaction } from "@repo/stellar/vault";
import { buildSeed } from "./seed";

/**
 * The mock backend's data: one JSON document in localStorage, shaped like the live API's records.
 * Reads return deep copies so handlers never mutate state by accident; `update` is the only way to write.
 * `resetMockDb()` restores the seed. The demo has its own clock (`clock_offset_ms`) so a week of purchases
 * can be simulated in seconds.
 */

export interface MockWallet {
	address: string;
	provider: string;
	/** Stroops, like the contract. */
	usdc: string;
	xlm: string;
}

/** What the next simulated wallet request / swap does. Set from the app's demo controls. */
export interface SimSettings {
	/** Which demo account "Connect" returns: the design's story, or a new wallet with no vault. */
	account: "seeded" | "fresh";
	wallet_installed: boolean;
	next_wallet: "approve" | "reject";
	next_swap: "success" | "slippage" | "liquidity";
	/** Forces every read into a state, to review the designed loading / error frames. */
	force: "none" | "loading" | "error";
	auto_keeper: boolean;
}

export interface MockDb {
	version: number;
	clock_offset_ms: number;
	sim: SimSettings;
	wallets: MockWallet[];
	positions: Position[];
	executions: Execution[];
	transactions: VaultTransaction[];
	/** Outcome decided when a swap is submitted, applied when it settles. */
	pending: Record<string, { outcome: "success" | "liquidity"; submitted_at: number }>;
}

const KEY = "stackly-mock-db";
export const DB_VERSION = 3;

let memory: MockDb | null = null;

function load(): MockDb {
	if (memory) return memory;
	if (typeof localStorage !== "undefined") {
		try {
			const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as MockDb | null;
			if (saved?.version === DB_VERSION) return (memory = saved);
		} catch {
			// Corrupt or blocked storage: fall through to the seed.
		}
	}
	const seeded = buildSeed(DB_VERSION);
	save(seeded);
	return seeded;
}

function save(db: MockDb) {
	memory = db;
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(KEY, JSON.stringify(db));
	} catch {
		// Storage full or blocked: keep the in-memory copy.
	}
}

export function read(): MockDb {
	return structuredClone(load());
}

export function update<T>(fn: (db: MockDb) => T): T {
	const db = read();
	const result = fn(db);
	save(db);
	return result;
}

export function resetMockDb() {
	memory = null;
	if (typeof localStorage !== "undefined") localStorage.removeItem(KEY);
	save(buildSeed(DB_VERSION));
}

/** The demo's "now" (real time + any fast-forward). */
export function nowMs(db: Pick<MockDb, "clock_offset_ms"> = load()) {
	return Date.now() + db.clock_offset_ms;
}

export const nowSeconds = (db?: Pick<MockDb, "clock_offset_ms">) => Math.floor(nowMs(db) / 1000);
