import { nowMs, read, resetMockDb, update, type SimSettings } from "./db";
import { runKeeper } from "./keeper";
import { FRESH_WALLET, SEEDED_WALLET } from "./seed";
import { toStroops } from "@repo/stellar/format";
import { wait } from "./util";

/**
 * The demo controls' API (apps/web DemoControls, mock mode only). Everything a tester needs to walk through
 * the PRD's scenarios without a network: pick the account, make the next wallet request or swap fail, jump the
 * clock to the next purchase, force loading / error screens, start over.
 */

export type { SimSettings };

export const getSim = () => read().sim;

export function setSim(patch: Partial<SimSettings>) {
	update((db) => {
		db.sim = { ...db.sim, ...patch };
	});
}

/** The demo wallet "Connect" returns for the chosen account. */
export const demoAddress = () => (read().sim.account === "fresh" ? FRESH_WALLET : SEEDED_WALLET);

/**
 * A real wallet (Freighter, xBull, Albedo) connected while the data is mock: give its address demo balances and
 * no vaults, so the whole create → deposit → purchase flow can be run with real Testnet signatures.
 */
export function ensureWallet(address: string, provider: string) {
	update((db) => {
		if (db.wallets.some((w) => w.address === address)) return;
		db.wallets.push({ address, provider, usdc: toStroops("2500").toString(), xlm: toStroops("100").toString() });
	});
}

export const demoNow = () => nowMs();

/** Moves the demo clock to one second after the earliest due purchase, then lets the keeper run. */
export function skipToNextPurchase() {
	const db = read();
	const due = db.positions.filter((p) => p.status === "active").map((p) => p.next_execution_ts * 1000);
	if (!due.length) return false;
	const target = Math.min(...due) + 1_000;
	update((d) => {
		d.clock_offset_ms += Math.max(0, target - nowMs(d));
	});
	runKeeper();
	return true;
}

export function advanceClock(ms: number) {
	update((d) => {
		d.clock_offset_ms += ms;
	});
	runKeeper();
}

export { resetMockDb, runKeeper };

export class WalletRejectedError extends Error {
	name = "WalletRejectedError";
	constructor() {
		super("You declined the request in your wallet. Nothing was submitted and no funds moved.");
	}
}

export class WalletNotFoundError extends Error {
	name = "WalletNotFoundError";
	constructor() {
		super("No compatible wallet detected.");
	}
}

/**
 * Stands in for the wallet's approval prompt: a short pause, then approve or reject as the demo controls say.
 * A rejection applies once, then the next request is approved again.
 */
export async function simulateWalletApproval(ms = 1_400) {
	await wait(ms);
	const { sim } = read();
	if (!sim.wallet_installed) throw new WalletNotFoundError();
	if (sim.next_wallet === "reject") {
		setSim({ next_wallet: "approve" });
		throw new WalletRejectedError();
	}
}
