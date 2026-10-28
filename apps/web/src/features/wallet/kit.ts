"use client";

import type { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import { USE_MOCK_API } from "@/lib/api/source";
import { NETWORK_PASSPHRASE } from "@/lib/stellar/config";

/**
 * The one seam to the user's wallet (Stellar Wallets Kit). The kit touches `window` when it loads, so it is
 * imported lazily, in the browser only. Stackly asks wallets for an address and for signatures; it never handles
 * keys. Freighter, xBull and Albedo are always the real extensions, on Stellar Testnet. In mock mode a "Demo
 * wallet" is offered too: no extension, and the demo controls decide whether it approves.
 */

export type WalletId = "freighter" | "xbull" | "albedo" | "demo";

export interface WalletOption {
	id: WalletId;
	name: string;
	kind: string;
	recommended?: boolean;
	available: boolean;
}

const REAL: Omit<WalletOption, "available">[] = [
	{ id: "freighter", name: "Freighter", kind: "Browser extension · Testnet", recommended: true },
	{ id: "xbull", name: "xBull", kind: "Browser wallet · Testnet" },
	{ id: "albedo", name: "Albedo", kind: "Web wallet · Testnet" },
];

const DEMO: Omit<WalletOption, "available"> = { id: "demo", name: "Demo wallet", kind: "No extension needed · simulated signatures" };

export const INSTALL_URL: Record<Exclude<WalletId, "demo">, string> = {
	freighter: "https://www.freighter.app/",
	xbull: "https://xbull.app/",
	albedo: "https://albedo.link/",
};

/** A real wallet signs real Testnet transactions; the demo wallet only simulates the prompt. */
export const isRealWallet = (id: string | null | undefined) => !!id && id !== "demo";

let kitPromise: Promise<StellarWalletsKit> | null = null;

function getKit() {
	kitPromise ??= import("@creit.tech/stellar-wallets-kit").then(
		({ StellarWalletsKit, WalletNetwork, allowAllModules, FREIGHTER_ID }) =>
			new StellarWalletsKit({ network: WalletNetwork.TESTNET, selectedWalletId: FREIGHTER_ID, modules: allowAllModules() }),
	);
	return kitPromise;
}

const mockSim = () => import("@repo/mock-api/sim");

/** The wallets Stackly supports and whether each is installed in this browser (plus the demo wallet in mock mode). */
export async function listWallets(): Promise<WalletOption[]> {
	let supported: { id: string; isAvailable: boolean }[] = [];
	try {
		supported = await (await getKit()).getSupportedWallets();
	} catch {
		// The kit couldn't load (blocked script, old browser): only the demo wallet remains.
	}
	const real = REAL.map((option) => ({ ...option, available: supported.some((w) => w.id === option.id && w.isAvailable) }));
	if (!USE_MOCK_API) return real;
	const demoAvailable = (await mockSim()).getSim().wallet_installed;
	return [...real, { ...DEMO, available: demoAvailable }];
}

/** Asks the chosen wallet for access and resolves with the account. Rejects if the user declines. */
export async function connectWallet(id: WalletId): Promise<string> {
	if (id === "demo") {
		const sim = await mockSim();
		await sim.simulateWalletApproval(1_600);
		return sim.demoAddress();
	}
	const kit = await getKit();
	kit.setWallet(id);
	const { address } = await kit.getAddress();
	await assertTestnet(kit);
	return address;
}

/** Re-selects a persisted wallet after a reload, before the first signature. */
export async function restoreWallet(walletId: string) {
	if (!isRealWallet(walletId)) return;
	(await getKit()).setWallet(walletId);
}

/** Stackly is Testnet-only: refuse to ask for a signature while the wallet is on another network. */
async function assertTestnet(kit: StellarWalletsKit) {
	let passphrase: string | undefined;
	try {
		passphrase = (await kit.getNetwork()).networkPassphrase;
	} catch {
		return; // Some wallets (Albedo) can't report their network; they sign for the passphrase we pass.
	}
	if (passphrase && passphrase !== NETWORK_PASSPHRASE) {
		throw new Error("Your wallet is on a different network. Switch it to Stellar Testnet and try again.");
	}
}

/** Asks the wallet to sign a prepared transaction (XDR) for Testnet. Every vault action goes through here. */
export async function signTransaction(xdr: string, address: string) {
	const kit = await getKit();
	await assertTestnet(kit);
	const { signedTxXdr } = await kit.signTransaction(xdr, { address, networkPassphrase: NETWORK_PASSPHRASE });
	return signedTxXdr;
}
