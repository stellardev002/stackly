"use client";

import type { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import { NETWORK_PASSPHRASE } from "@/lib/stellar/config";
import type { Signer } from "@/lib/api/flows";

/**
 * The one seam to the user's wallet (Stellar Wallets Kit: Freighter, xBull, Albedo), on Stellar Testnet. The kit
 * touches `window` when it loads, so it is imported lazily, in the browser only. Stackly asks the wallet for its
 * address, a sign-in message signature and transaction signatures; it never handles keys.
 */

export type WalletId = "freighter" | "xbull" | "albedo";

export interface WalletOption {
	id: WalletId;
	name: string;
	kind: string;
	recommended?: boolean;
	available: boolean;
}

const OPTIONS: Omit<WalletOption, "available">[] = [
	{ id: "freighter", name: "Freighter", kind: "Browser extension · Testnet", recommended: true },
	{ id: "xbull", name: "xBull", kind: "Browser wallet · Testnet" },
	{ id: "albedo", name: "Albedo", kind: "Web wallet · Testnet" },
];

export const INSTALL_URL: Record<WalletId, string> = {
	freighter: "https://www.freighter.app/",
	xbull: "https://xbull.app/",
	albedo: "https://albedo.link/",
};

let kitPromise: Promise<StellarWalletsKit> | null = null;

function getKit() {
	kitPromise ??= import("@creit.tech/stellar-wallets-kit").then(
		({ StellarWalletsKit, WalletNetwork, allowAllModules, FREIGHTER_ID }) =>
			new StellarWalletsKit({ network: WalletNetwork.TESTNET, selectedWalletId: FREIGHTER_ID, modules: allowAllModules() }),
	);
	return kitPromise;
}

/** The wallets Stackly supports and whether each is installed in this browser. */
export async function listWallets(): Promise<WalletOption[]> {
	let supported: { id: string; isAvailable: boolean }[] = [];
	try {
		supported = await (await getKit()).getSupportedWallets();
	} catch {
		// The kit couldn't load (blocked script, old browser): everything shows as not detected.
	}
	return OPTIONS.map((option) => ({ ...option, available: supported.some((w) => w.id === option.id && w.isAvailable) }));
}

/** Asks the chosen wallet for access and resolves with the account. Rejects if the user declines. */
export async function connectWallet(id: WalletId): Promise<string> {
	const kit = await getKit();
	kit.setWallet(id);
	const { address } = await kit.getAddress();
	await assertTestnet(kit);
	return address;
}

/** Re-selects a persisted wallet after a reload, before the first signature. */
export async function restoreWallet(walletId: string) {
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

/** Signs the backend's sign-in message (SEP-43 `signMessage`); returns the base64 signature. */
export async function signMessage(message: string, address: string) {
	const kit = await getKit();
	const { signedMessage } = await kit.signMessage(message, { address, networkPassphrase: NETWORK_PASSPHRASE });
	return signedMessage;
}

/** Asks the wallet to sign a transaction (XDR). Every deposit, authorization batch and withdrawal goes through here. */
export async function signTransaction(xdr: string, address: string, networkPassphrase = NETWORK_PASSPHRASE) {
	const kit = await getKit();
	await assertTestnet(kit);
	const { signedTxXdr } = await kit.signTransaction(xdr, { address, networkPassphrase });
	return signedTxXdr;
}

/** The connected wallet as a `Signer` for the write flows (lib/api/flows.ts). */
export const walletSigner = (address: string): Signer => ({ address, sign: (xdr, passphrase) => signTransaction(xdr, address, passphrase) });
