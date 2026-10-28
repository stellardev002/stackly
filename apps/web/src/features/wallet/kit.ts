"use client";

import type { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import type { WalletConnectModule } from "@creit.tech/stellar-wallets-kit/modules/wallet-connect";
import { NETWORK_PASSPHRASE } from "@/lib/stellar/config";
import type { Signer } from "@/lib/api/flows";

/**
 * The one seam to the user's wallet (Stellar Wallets Kit v2, on Stellar Testnet): the Freighter and xBull
 * extensions, and Freighter Mobile over WalletConnect. The kit touches `window` when it loads, so it is imported
 * lazily, in the browser only. Stackly asks the wallet for its address, a sign-in message signature and transaction
 * signatures; it never handles keys.
 *
 * Every wallet here must support `signMessage` (sign-in is a signed message), which is why Albedo and Rabet aren't
 * offered. WalletConnect opens Reown AppKit with Freighter featured: a QR code on a computer, a hand-off to the
 * Freighter app on a phone.
 */

export type WalletId = "freighter" | "wallet_connect" | "xbull";

/** WalletConnect (Reown) project id. It's public (it ships in the bundle); override per environment if needed. */
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "b8cc56756132b11f2077932ac3d6f807";

export interface WalletOption {
	id: WalletId;
	name: string;
	kind: string;
	recommended?: boolean;
	available: boolean;
}

const OPTIONS: Omit<WalletOption, "available">[] = [
	{ id: "freighter", name: "Freighter", kind: "Browser extension · Testnet", recommended: true },
	{ id: "wallet_connect", name: "Freighter Mobile", kind: "Freighter app · WalletConnect", recommended: true },
	{ id: "xbull", name: "xBull", kind: "Browser wallet · Testnet" },
];

export const INSTALL_URL: Record<WalletId, string> = {
	freighter: "https://www.freighter.app/",
	wallet_connect: "https://www.freighter.app/",
	xbull: "https://xbull.app/",
};

type Kit = typeof StellarWalletsKit;

/**
 * Survives Fast Refresh re-running this module: a second `init` would stand up a second WalletConnect client on the
 * same project id, whose pairing the phone approves while the page waits on the other one.
 */
const state: { kit: Promise<{ kit: Kit; walletConnect: WalletConnectModule }> | null } = ((globalThis as { __stacklyWalletKit?: typeof state }).__stacklyWalletKit ??= {
	kit: null,
});

async function loadKit() {
	const [{ StellarWalletsKit, Networks }, { FreighterModule }, { xBullModule }, { WalletConnectModule, WalletConnectTargetChain }] = await Promise.all([
		import("@creit.tech/stellar-wallets-kit"),
		import("@creit.tech/stellar-wallets-kit/modules/freighter"),
		import("@creit.tech/stellar-wallets-kit/modules/xbull"),
		import("@creit.tech/stellar-wallets-kit/modules/wallet-connect"),
	]);
	const origin = window.location.origin;
	const walletConnect = new WalletConnectModule({
		projectId: WALLETCONNECT_PROJECT_ID,
		metadata: { name: "Stackly", description: "Non-custodial dollar-cost averaging on Stellar", url: origin, icons: [`${origin}/favicon.ico`] },
		allowedChains: [WalletConnectTargetChain.TESTNET],
	});
	StellarWalletsKit.init({ modules: [new FreighterModule(), walletConnect, new xBullModule()], network: Networks.TESTNET });
	return { kit: StellarWalletsKit, walletConnect };
}

/** Loaded on first use and shared after; a failed load (dropped chunk) is forgotten so the next action retries. */
function getKit() {
	state.kit ??= loadKit().catch((error) => {
		state.kit = null;
		throw error;
	});
	return state.kit;
}

/**
 * The kit for an action. When WalletConnect is the selected wallet, waits (briefly) for its relay client, which
 * starts asynchronously: right after a reload the first signature would otherwise fail with "not started yet".
 */
async function ready(): Promise<Kit> {
	const { kit, walletConnect } = await getKit();
	if (kit.selectedModule?.productId === walletConnect.productId) {
		for (let i = 0; i < 100 && !(await walletConnect.isAvailable()); i++) await new Promise((r) => setTimeout(r, 100));
	}
	return kit;
}

/** WalletConnect needs WebCrypto, which browsers only expose over HTTPS or localhost (not http://192.168.…). */
function assertSecureContext() {
	if (!window.isSecureContext) {
		throw new Error("Mobile wallets need a secure connection. Open Stackly over HTTPS; a plain http:// address on your network can't connect a wallet.");
	}
}

/**
 * The wallets Stackly supports and whether each is usable in this browser. Inside Freighter Mobile's in-app browser
 * (the kit's "platform wrapper") only Freighter Mobile is offered.
 */
export async function listWallets(): Promise<WalletOption[]> {
	let supported: { id: string; isAvailable: boolean; isPlatformWrapper: boolean }[] = [];
	try {
		supported = await (await getKit()).kit.refreshSupportedWallets();
	} catch {
		// The kit couldn't load (blocked script, old browser): everything shows as not detected.
	}
	const wrapper = supported.find((w) => w.isPlatformWrapper);
	return OPTIONS.filter((option) => !wrapper || option.id === wrapper.id).map((option) => ({
		...option,
		...(wrapper && { kind: "In the Freighter app · Testnet" }),
		// WalletConnect reports "unavailable" until its relay client has started; it needs no install.
		available: option.id === "wallet_connect" ? supported.length > 0 : supported.some((w) => w.id === option.id && w.isAvailable),
	}));
}

/** Asks the chosen wallet for access and resolves with the account. Rejects if the user declines. */
export async function connectWallet(id: WalletId): Promise<string> {
	if (id === "wallet_connect") assertSecureContext();
	const { kit, walletConnect } = await getKit();
	kit.setWallet(id);
	await ready();
	const { address } = id === "wallet_connect" ? await untilClosed(walletConnect, kit.fetchAddress()) : await kit.fetchAddress();
	await assertTestnet(kit);
	return address;
}

/**
 * The kit waits for the WalletConnect pairing forever, even after the user closes the QR modal. Treat closing it
 * (after it has opened) as cancelling.
 */
function untilClosed<T>(walletConnect: WalletConnectModule, pending: Promise<T>): Promise<T> {
	let unsubscribe = () => {};
	const closed = new Promise<never>((_, reject) => {
		let opened = false;
		unsubscribe = walletConnect.modal.subscribeState(({ open }) => {
			if (open) opened = true;
			else if (opened) reject(new Error("Connection cancelled in WalletConnect."));
		});
	});
	return Promise.race([pending, closed]).finally(unsubscribe);
}

/** Ends the wallet's connection where it has one (the WalletConnect session); others just forget the account. */
export async function disconnectWallet() {
	if (!state.kit) return;
	await (await state.kit).kit.disconnect();
}

/** Re-selects a persisted wallet after a reload, before the first signature. */
export async function restoreWallet(walletId: string) {
	if (!OPTIONS.some((o) => o.id === walletId)) return; // e.g. Albedo, no longer offered: WalletGate asks to reconnect
	(await getKit()).kit.setWallet(walletId);
}

/** Stackly is Testnet-only: refuse to ask for a signature while the wallet is on another network. */
async function assertTestnet(kit: Kit) {
	let passphrase: string | undefined;
	try {
		passphrase = (await kit.getNetwork()).networkPassphrase;
	} catch {
		return; // WalletConnect can't report its network; its session is pinned to stellar:testnet instead.
	}
	if (passphrase && passphrase !== NETWORK_PASSPHRASE) {
		throw new Error("Your wallet is on a different network. Switch it to Stellar Testnet and try again.");
	}
}

/** Signs the backend's sign-in message (SEP-43 / SEP-53 `signMessage`); returns the base64 signature. */
export async function signMessage(message: string, address: string) {
	const kit = await ready();
	const { signedMessage } = await kit.signMessage(message, { address, networkPassphrase: NETWORK_PASSPHRASE });
	if (!signedMessage) throw new Error("Sign-in was declined in your wallet.");
	return signedMessage;
}

/** Asks the wallet to sign a transaction (XDR). Every deposit, authorization batch and withdrawal goes through here. */
export async function signTransaction(xdr: string, address: string, networkPassphrase = NETWORK_PASSPHRASE) {
	const kit = await ready();
	await assertTestnet(kit);
	const { signedTxXdr } = await kit.signTransaction(xdr, { address, networkPassphrase });
	if (!signedTxXdr) throw new Error("The transaction was declined in your wallet.");
	return signedTxXdr;
}

/** The connected wallet as a `Signer` for the write flows (lib/api/flows.ts). */
export const walletSigner = (address: string): Signer => ({ address, sign: (xdr, passphrase) => signTransaction(xdr, address, passphrase) });
