"use client";

import type { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import type { WalletConnectModule } from "@creit.tech/stellar-wallets-kit/modules/wallet-connect";
import { NETWORK_PASSPHRASE } from "@/lib/stellar/config";
import type { Signer } from "@/lib/api/flows";

/**
 * The one seam to the user's wallet (Stellar Wallets Kit v2, on Stellar Testnet). Varial (formerly Freighter,
 * https://docs.varialwallet.com) is the recommended wallet: its browser extension on desktop, its mobile app over
 * WalletConnect on phones; xBull is the alternative extension. The kit touches `window` when it loads, so it is
 * imported lazily, in the browser only. Stackly asks the wallet for its address, a sign-in message signature and
 * transaction signatures; it never handles keys.
 *
 * Every wallet here must support `signMessage` (sign-in is a signed message), which is why Albedo and Rabet aren't
 * offered. Kit module ids keep Freighter's names ("freighter"); the extension API is unchanged under the new name.
 *
 * Phones: a web page can't tell whether an app is installed. Stackly opens Varial directly with the WalletConnect
 * pairing link; if the page is still in front a few seconds later, the app most likely isn't installed and the
 * connect modal offers the store link. Inside Varial's own in-app browser (`window.stellar.platform === "mobile"`)
 * only Varial is offered.
 */

export type WalletId = "freighter" | "wallet_connect" | "xbull";

/** WalletConnect (Reown) project id. It's public (it ships in the bundle); override per environment if needed. */
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "b8cc56756132b11f2077932ac3d6f807";

/** Varial's app scheme (still Freighter's) and its WalletConnect pairing route, as listed in the WalletConnect registry. */
const VARIAL_APP = "freighterwallet://";
const varialPairingLink = (uri: string) => `${VARIAL_APP}wc-redirect/wc?uri=${encodeURIComponent(uri)}`;

/** Store links from https://varialwallet.com (the listings keep Freighter's name for now). */
export const VARIAL_STORES = {
	extension: "https://chromewebstore.google.com/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk",
	ios: "https://apps.apple.com/us/app/freighter/id6743947720",
	android: "https://play.google.com/store/apps/details?id=org.stellar.freighterwallet",
	site: "https://varialwallet.com/",
};

export type Platform = "ios" | "android" | "desktop";

/** Phones and tablets (iPadOS reports itself as a Mac, so touch points decide). */
export function detectPlatform(): Platform {
	if (typeof navigator === "undefined") return "desktop";
	const ua = navigator.userAgent;
	if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
	if (/android/i.test(ua)) return "android";
	if (/mobile/i.test(ua)) return "android";
	return "desktop";
}

export interface WalletOption {
	id: WalletId;
	name: string;
	kind: string;
	recommended?: boolean;
	available: boolean;
	/** Where to get it when it's not available on this device. */
	installUrl: string;
}

/** The app store for this phone, or Varial's site when the platform is unknown. */
export function varialAppStoreUrl(platform = detectPlatform()) {
	return platform === "ios" ? VARIAL_STORES.ios : platform === "android" ? VARIAL_STORES.android : VARIAL_STORES.site;
}

const OPTIONS: Omit<WalletOption, "available" | "installUrl">[] = [
	{ id: "freighter", name: "Varial", kind: "Browser extension · formerly Freighter", recommended: true },
	{ id: "wallet_connect", name: "Varial Mobile", kind: "Varial app · WalletConnect", recommended: true },
	{ id: "xbull", name: "xBull", kind: "Browser wallet · Testnet" },
];

const INSTALL_URL: Record<WalletId, string> = {
	freighter: VARIAL_STORES.extension,
	wallet_connect: VARIAL_STORES.site,
	xbull: "https://xbull.app/",
};

type Kit = typeof StellarWalletsKit;

/**
 * Survives Fast Refresh re-running this module: a second `init` would stand up a second WalletConnect client on the
 * same project id, whose pairing the phone approves while the page waits on the other one.
 */
const state: { kit: Promise<{ kit: Kit; walletConnect: WalletConnectModule }> | null } = ((
	globalThis as { __stacklyWalletKit?: typeof state }
).__stacklyWalletKit ??= {
	kit: null,
});

async function loadKit() {
	const [
		{ StellarWalletsKit, Networks },
		{ FreighterModule },
		{ xBullModule },
		{ WalletConnectModule, WalletConnectTargetChain },
	] = await Promise.all([
		import("@creit.tech/stellar-wallets-kit"),
		import("@creit.tech/stellar-wallets-kit/modules/freighter"),
		import("@creit.tech/stellar-wallets-kit/modules/xbull"),
		import("@creit.tech/stellar-wallets-kit/modules/wallet-connect"),
	]);
	const origin = window.location.origin;
	const walletConnect = new WalletConnectModule({
		projectId: WALLETCONNECT_PROJECT_ID,
		metadata: {
			name: "Stackly",
			description: "Non-custodial dollar-cost averaging on Stellar",
			url: origin,
			icons: [`${origin}/favicon.ico`],
		},
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

/** True when the selected wallet is Varial Mobile (WalletConnect). */
async function usingWalletConnect() {
	const { kit, walletConnect } = await getKit();
	return kit.selectedModule?.productId === walletConnect.productId;
}

/**
 * The kit for an action. When WalletConnect is the selected wallet, waits (briefly) for its relay client, which
 * starts asynchronously: right after a reload the first signature would otherwise fail with "not started yet".
 */
async function ready(): Promise<Kit> {
	const { kit, walletConnect } = await getKit();
	if (await usingWalletConnect()) {
		for (let i = 0; i < 100 && !(await walletConnect.isAvailable()); i++) await new Promise((r) => setTimeout(r, 100));
	}
	return kit;
}

/** WalletConnect needs WebCrypto, which browsers only expose over HTTPS or localhost (not http://192.168.…). */
function assertSecureContext() {
	if (!window.isSecureContext) {
		throw new Error(
			"Mobile wallets need a secure connection. Open Stackly over HTTPS; a plain http:// address on your network can't connect a wallet.",
		);
	}
}

/**
 * The wallets for this device and whether each is usable. Desktop: the extensions (installed or not) plus Varial
 * Mobile by QR code. Phones: Varial Mobile only (extensions don't exist there). Inside Varial's in-app browser (the
 * kit's "platform wrapper"): Varial Mobile only, already connected through the app.
 */
export async function listWallets(): Promise<WalletOption[]> {
	const platform = detectPlatform();
	let supported: { id: string; isAvailable: boolean; isPlatformWrapper: boolean }[] = [];
	try {
		supported = await (await getKit()).kit.refreshSupportedWallets();
	} catch {
		// The kit couldn't load (blocked script, old browser): everything shows as not detected.
	}
	const wrapper = supported.find((w) => w.isPlatformWrapper);
	const phoneOnly = !!wrapper || platform !== "desktop";
	return OPTIONS.filter((option) => !phoneOnly || option.id === "wallet_connect").map((option) => ({
		...option,
		...(wrapper && { kind: "In the Varial app · Testnet" }),
		...(!wrapper && phoneOnly && { kind: "Opens the Varial app · Testnet" }),
		installUrl: option.id === "wallet_connect" && phoneOnly ? varialAppStoreUrl(platform) : INSTALL_URL[option.id],
		// WalletConnect reports "unavailable" until its relay client has started; it needs no install on this page.
		available: option.id === "wallet_connect" ? supported.length > 0 : supported.some((w) => w.id === option.id && w.isAvailable),
	}));
}

/** Hooks for the phone hand-off to the Varial app. */
export interface AppHandoff {
	/** The page is still in front a few seconds after opening Varial: most likely not installed. */
	onAppNotOpened: (retry: () => void) => void;
	/** Aborts a connection that's waiting on the app (the user gave up or went to install it). */
	signal?: AbortSignal;
}

/**
 * Opens Varial on this phone and calls `onNotOpened` if the page hasn't been sent to the background within a few
 * seconds. A heuristic: no browser tells a page whether an app is installed.
 */
function openVarial(link: string, onNotOpened?: () => void) {
	let left = false;
	const onHide = () => {
		if (document.visibilityState === "hidden") left = true;
	};
	document.addEventListener("visibilitychange", onHide);
	window.addEventListener("pagehide", onHide);
	window.location.href = link;
	window.setTimeout(() => {
		document.removeEventListener("visibilitychange", onHide);
		window.removeEventListener("pagehide", onHide);
		if (!left && document.visibilityState === "visible") onNotOpened?.();
	}, 2500);
}

/** Asks the chosen wallet for access and resolves with the account. Rejects if the user declines. */
export async function connectWallet(id: WalletId, handoff?: AppHandoff): Promise<string> {
	if (id === "wallet_connect") assertSecureContext();
	const { kit, walletConnect } = await getKit();
	kit.setWallet(id);
	await ready();
	if (id !== "wallet_connect") {
		const { address } = await kit.fetchAddress();
		await assertTestnet(kit);
		return address;
	}
	const onPhone = detectPlatform() !== "desktop" && !(await walletConnect.isPlatformWrapper());
	const { address } = onPhone
		? await withDirectHandoff(walletConnect, () => kit.fetchAddress(), handoff)
		: await untilClosed(walletConnect, kit.fetchAddress());
	return address;
}

/**
 * Desktop: the kit opens Reown AppKit's QR modal and waits for the pairing forever, even after the user closes the
 * modal. Treat closing it (after it has opened) as cancelling.
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

/**
 * Phones: instead of AppKit's wallet list, open Varial straight away with the pairing link the kit would show, so it's
 * one tap. The kit hands the link to `modal.open({ uri })`; it's borrowed for this one connection, then restored.
 */
function withDirectHandoff<T>(walletConnect: WalletConnectModule, start: () => Promise<T>, handoff?: AppHandoff): Promise<T> {
	const modal = walletConnect.modal;
	const original = modal.open;
	let link: string | null = null;
	modal.open = (async (options?: { uri?: string }) => {
		if (!options?.uri) return original.call(modal, options as Parameters<typeof original>[0]);
		if (link) return; // the kit and the sign client can both announce the same pairing
		link = varialPairingLink(options.uri);
		const retry = () => link && openVarial(link);
		openVarial(link, () => handoff?.onAppNotOpened(retry));
	}) as typeof original;
	const restore = () => {
		modal.open = original;
	};
	const pending = start();
	const aborted = new Promise<never>((_, reject) => {
		if (handoff?.signal?.aborted) reject(new Error("Connection cancelled."));
		handoff?.signal?.addEventListener("abort", () => reject(new Error("Connection cancelled.")), { once: true });
	});
	return Promise.race([pending, aborted]).finally(restore);
}

/**
 * Brings Varial to the front for a request it has to approve (sign-in, a transaction) when the page is on a phone
 * and connected over WalletConnect: the request is waiting in the app, which the user just left. Also exported for a
 * button, since some browsers only open apps from a tap.
 */
export async function openWalletApp() {
	if (detectPlatform() === "desktop" || !(await usingWalletConnect())) return;
	if (await (await getKit()).walletConnect.isPlatformWrapper()) return; // already inside the app
	openVarial(VARIAL_APP);
}

/** Whether signing now needs the Varial app on this phone (the connect modal shows an "Open Varial" button). */
export async function needsWalletApp() {
	if (detectPlatform() === "desktop" || !(await usingWalletConnect())) return false;
	return !(await (await getKit()).walletConnect.isPlatformWrapper());
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

/** Sends a request to the wallet, then (on a phone over WalletConnect) brings Varial forward to approve it. */
async function request<T>(send: (kit: Kit) => Promise<T>) {
	const kit = await ready();
	const pending = send(kit);
	window.setTimeout(() => void openWalletApp(), 400); // after the request is on the relay
	return pending;
}

/** Signs the backend's sign-in message (SEP-43 / SEP-53 `signMessage`); returns the base64 signature. */
export async function signMessage(message: string, address: string) {
	const { signedMessage } = await request((kit) => kit.signMessage(message, { address, networkPassphrase: NETWORK_PASSPHRASE }));
	if (!signedMessage) throw new Error("Sign-in was declined in your wallet.");
	return signedMessage;
}

/** Asks the wallet to sign a transaction (XDR). Every deposit, authorization batch and withdrawal goes through here. */
export async function signTransaction(xdr: string, address: string, networkPassphrase = NETWORK_PASSPHRASE) {
	await assertTestnet(await ready());
	const { signedTxXdr } = await request((kit) => kit.signTransaction(xdr, { address, networkPassphrase }));
	if (!signedTxXdr) throw new Error("The transaction was declined in your wallet.");
	return signedTxXdr;
}

/** The connected wallet as a `Signer` for the write flows (lib/api/flows.ts). */
export const walletSigner = (address: string): Signer => ({
	address,
	sign: (xdr, passphrase) => signTransaction(xdr, address, passphrase),
});
