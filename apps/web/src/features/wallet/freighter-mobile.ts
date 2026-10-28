"use client";

import { ModuleType, WalletNetwork, type ModuleInterface } from "@creit.tech/stellar-wallets-kit";
import { WalletConnectModal } from "@walletconnect/modal";
import { SignClient } from "@walletconnect/sign-client";

/**
 * Freighter Mobile over WalletConnect, as a Stellar Wallets Kit module. The kit's own WalletConnect module asks for a
 * single method and refuses `signMessage`, which sign-in needs; Freighter Mobile answers both `stellar_signXDR` and
 * `stellar_signMessage`, so this session asks for both. Other WalletConnect wallets that sign messages work too.
 * Imported lazily by kit.ts (it opens a relay socket and touches `window`).
 */

export const FREIGHTER_MOBILE_ID = "wallet_connect";

const CHAIN = "stellar:testnet";
const SIGN_XDR = "stellar_signXDR";
const SIGN_MESSAGE = "stellar_signMessage";

type Client = Awaited<ReturnType<typeof SignClient.init>>;
type Session = ReturnType<Client["session"]["getAll"]>[number];

/** True inside Freighter Mobile's in-app browser, which injects `window.stellar` and has no extension API. */
export function isFreighterMobileBrowser() {
	const stellar = (window as { stellar?: { provider?: string; platform?: string } }).stellar;
	return stellar?.provider === "freighter" && stellar?.platform === "mobile";
}

const accountOf = (session: Session) => session.namespaces.stellar?.accounts[0]?.split(":")[2] ?? "";

const usable = (session: Session) => {
	const stellar = session.namespaces.stellar;
	return !!stellar && stellar.accounts.some((a) => a.startsWith(`${CHAIN}:`)) && [SIGN_XDR, SIGN_MESSAGE].every((m) => stellar.methods.includes(m));
};

export class FreighterMobileModule implements ModuleInterface {
	moduleType = ModuleType.BRIDGE_WALLET;
	productId = FREIGHTER_MOBILE_ID;
	productName = "Freighter Mobile";
	productUrl = "https://www.freighter.app/";
	productIcon = "https://stellar.creit.tech/wallet-icons/freighter.png";

	private clientPromise: Promise<Client> | null = null;
	private modal: WalletConnectModal;

	constructor(private readonly metadata: { projectId: string; name: string; description: string; url: string; icons: string[] }) {
		this.modal = new WalletConnectModal({ projectId: metadata.projectId, chains: [CHAIN], themeMode: "light", themeVariables: { "--wcm-z-index": "100" } });
	}

	private client() {
		const { projectId, ...metadata } = this.metadata;
		this.clientPromise ??= SignClient.init({ projectId, metadata }).catch((error) => {
			this.clientPromise = null;
			throw error;
		});
		return this.clientPromise;
	}

	async isAvailable() {
		return true;
	}

	async isPlatformWrapper() {
		return isFreighterMobileBrowser();
	}

	/** The open session for `address` (or any), else a new pairing: QR code on desktop, wallet hand-off on mobile. */
	private async session(address?: string): Promise<Session> {
		const client = await this.client();
		const existing = client.session.getAll().filter(usable);
		const match = existing.find((s) => !address || accountOf(s) === address);
		if (match) return match;

		const { uri, approval } = await client.connect({
			requiredNamespaces: { stellar: { methods: [SIGN_XDR, SIGN_MESSAGE], chains: [CHAIN], events: [] } },
		});
		if (uri) await this.modal.openModal({ uri });
		let unsubscribe = () => {};
		try {
			const closed = new Promise<never>((_, reject) => {
				unsubscribe = this.modal.subscribeModal((state) => {
					if (!state.open) reject(new Error("Connection cancelled in WalletConnect."));
				});
			});
			const session = await Promise.race([approval(), closed]);
			if (address && accountOf(session) !== address) {
				throw new Error(`Freighter Mobile is on a different account. Switch it to ${address.slice(0, 4)}…${address.slice(-4)} and try again.`);
			}
			return session;
		} finally {
			unsubscribe();
			this.modal.closeModal();
		}
	}

	private async request<T>(address: string | undefined, method: string, params: Record<string, string>) {
		const [client, session] = await Promise.all([this.client(), this.session(address)]);
		return client.request<T>({ topic: session.topic, chainId: CHAIN, request: { method, params } });
	}

	async getAddress() {
		return { address: accountOf(await this.session()) };
	}

	async signTransaction(xdr: string, opts?: { networkPassphrase?: string; address?: string }) {
		if (opts?.networkPassphrase && opts.networkPassphrase !== WalletNetwork.TESTNET) throw new Error("Freighter Mobile is connected on Testnet only.");
		const { signedXDR } = await this.request<{ signedXDR: string }>(opts?.address, SIGN_XDR, { xdr });
		return { signedTxXdr: signedXDR, signerAddress: opts?.address };
	}

	async signMessage(message: string, opts?: { address?: string }) {
		const { signature } = await this.request<{ signature: string }>(opts?.address, SIGN_MESSAGE, { message });
		return { signedMessage: signature, signerAddress: opts?.address };
	}

	async signAuthEntry(): Promise<never> {
		throw new Error("Freighter Mobile over WalletConnect can't sign auth entries here.");
	}

	/** The session is only ever opened on `stellar:testnet`. */
	async getNetwork() {
		return { network: "TESTNET", networkPassphrase: WalletNetwork.TESTNET };
	}

	async disconnect() {
		const client = await this.client();
		await Promise.all(client.session.getAll().map((s) => client.disconnect({ topic: s.topic, reason: { code: 6000, message: "User disconnected" } })));
	}
}
