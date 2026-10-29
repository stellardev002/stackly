"use client";

import type { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";

/**
 * The admin only needs a wallet to sign in (one SEP-53 message; it never signs transactions). Same wallets as the
 * app: the Varial extension (formerly Freighter), xBull, and Varial Mobile over WalletConnect (Reown AppKit, which
 * lists Varial first and opens the app on a phone). The kit touches `window` when it loads, so it's imported lazily.
 */

export type WalletId = "freighter" | "wallet_connect" | "xbull";

const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "b8cc56756132b11f2077932ac3d6f807";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

export interface WalletOption {
	id: WalletId;
	name: string;
	kind: string;
	available: boolean;
	installUrl: string;
}

const OPTIONS: Omit<WalletOption, "available">[] = [
	{
		id: "freighter",
		name: "Varial",
		kind: "Browser extension",
		installUrl: "https://chromewebstore.google.com/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk",
	},
	{ id: "wallet_connect", name: "Varial Mobile", kind: "Varial app · WalletConnect", installUrl: "https://varialwallet.com/" },
	{ id: "xbull", name: "xBull", kind: "Browser wallet", installUrl: "https://xbull.app/" },
];

/** Phones and tablets, where browser extensions don't exist. */
export function isPhone() {
	if (typeof navigator === "undefined") return false;
	return (
		/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) ||
		(/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
	);
}

type Kit = typeof StellarWalletsKit;
type WalletConnect = InstanceType<typeof import("@creit.tech/stellar-wallets-kit/modules/wallet-connect").WalletConnectModule>;

/** Survives Fast Refresh: a second `init` would start a second WalletConnect client on the same project id. */
const state: { kit: Promise<{ kit: Kit; walletConnect: WalletConnect }> | null } = ((
	globalThis as { __stacklyAdminKit?: typeof state }
).__stacklyAdminKit ??= { kit: null });

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
			name: "Stackly Admin",
			description: "Stackly operations dashboard",
			url: origin,
			icons: [`${origin}/favicon.ico`],
		},
		allowedChains: [WalletConnectTargetChain.TESTNET],
	});
	StellarWalletsKit.init({ modules: [new FreighterModule(), walletConnect, new xBullModule()], network: Networks.TESTNET });
	return { kit: StellarWalletsKit, walletConnect };
}

function getKit() {
	state.kit ??= loadKit().catch((error) => {
		state.kit = null;
		throw error;
	});
	return state.kit;
}

/** Waits (briefly) for the WalletConnect relay client, which starts asynchronously. */
async function ready() {
	const { kit, walletConnect } = await getKit();
	if (kit.selectedModule?.productId === walletConnect.productId) {
		for (let i = 0; i < 100 && !(await walletConnect.isAvailable()); i++) await new Promise((r) => setTimeout(r, 100));
	}
	return kit;
}

/** The wallets for this device: on phones only Varial Mobile (extensions can't be installed there). */
export async function listWallets(): Promise<WalletOption[]> {
	let supported: { id: string; isAvailable: boolean }[] = [];
	try {
		supported = await (await getKit()).kit.refreshSupportedWallets();
	} catch {
		// The kit couldn't load: everything shows as not detected.
	}
	return OPTIONS.filter((o) => !isPhone() || o.id === "wallet_connect").map((o) => ({
		...o,
		installUrl:
			o.id === "wallet_connect" && isPhone()
				? /iphone|ipad|ipod|macintosh/i.test(navigator.userAgent)
					? "https://apps.apple.com/us/app/freighter/id6743947720"
					: "https://play.google.com/store/apps/details?id=org.stellar.freighterwallet"
				: o.installUrl,
		available: o.id === "wallet_connect" ? supported.length > 0 : supported.some((w) => w.id === o.id && w.isAvailable),
	}));
}

/** Asks the chosen wallet for its address. On desktop, closing the WalletConnect QR modal cancels. */
export async function connectWallet(id: WalletId): Promise<string> {
	if (id === "wallet_connect" && !window.isSecureContext) {
		throw new Error(
			"Varial Mobile needs a secure connection. Open the admin over HTTPS; a plain http:// address on your network can't connect.",
		);
	}
	const { kit, walletConnect } = await getKit();
	kit.setWallet(id);
	await ready();
	if (id !== "wallet_connect") return (await kit.fetchAddress()).address;
	let unsubscribe = () => {};
	const closed = new Promise<never>((_, reject) => {
		let opened = false;
		unsubscribe = walletConnect.modal.subscribeState(({ open }) => {
			if (open) opened = true;
			else if (opened) reject(new Error("Connection cancelled in WalletConnect."));
		});
	});
	return (await Promise.race([kit.fetchAddress(), closed]).finally(unsubscribe)).address;
}

/** Brings Varial forward on a phone, where the sign-in request waits in the app the user just left. */
export function openVarialApp() {
	if (isPhone()) window.location.href = "freighterwallet://";
}

/** Signs the backend's sign-in message (SEP-53); returns the base64 signature. */
export async function signMessage(message: string, address: string) {
	const kit = await ready();
	const pending = kit.signMessage(message, { address, networkPassphrase: NETWORK_PASSPHRASE });
	if (isPhone() && kit.selectedModule?.productId === "wallet_connect") window.setTimeout(openVarialApp, 400);
	const { signedMessage } = await pending;
	if (!signedMessage) throw new Error("Sign-in was declined in your wallet.");
	return signedMessage;
}

export async function restoreWallet(walletId: string) {
	if (OPTIONS.some((o) => o.id === walletId)) (await getKit()).kit.setWallet(walletId);
}

export async function disconnectWallet() {
	if (state.kit) await (await state.kit).kit.disconnect().catch(() => undefined);
}
