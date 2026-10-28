import type { AssetRef, Position, PositionAccount } from "@repo/stellar/vault";
import { api } from "@/lib/api/client";
import type { CreatePositionBody } from "@/lib/api/dto";
import * as flows from "@/lib/api/flows";
import { NETWORK_PASSPHRASE } from "@/lib/stellar/config";
import { walletSigner } from "@/features/wallet/kit";

/**
 * Every vault write the screens make, on the Stackly backend (lib/api/flows.ts) with the connected wallet as the
 * signer. `onSigned` moves the UI from "Approve in your wallet" to "Submitting"; actions that need no signature
 * (create, activate, pause, resume, cancel) call it straight away.
 */

export interface WriteOptions {
	owner: string;
	onSigned: () => void;
}

export interface WriteResult {
	message: string;
	position?: Position;
	account?: PositionAccount;
	/** Hash of the Stellar transaction the wallet signed, when there was one. */
	txHash?: string | null;
}

/** Amount in stroops → the backend's decimal string. */
const decimal = (stroops: string) => {
	const s = stroops.padStart(8, "0");
	return `${s.slice(0, -7)}.${s.slice(-7)}`;
};

export const vaultClient = {
	async create(body: CreatePositionBody, opts: WriteOptions): Promise<WriteResult> {
		opts.onSigned();
		const { position, account } = await flows.createPosition(api, body);
		return { message: "Strategy created", position, account };
	},

	async deposit(position: Position, account: PositionAccount, amountStroops: string, opts: WriteOptions): Promise<WriteResult> {
		const txHash = await flows.deposit(api, walletSigner(opts.owner), position, account, decimal(amountStroops), NETWORK_PASSPHRASE, opts.onSigned);
		return { message: "Deposit confirmed", txHash };
	},

	/** Signs `count` purchases and, for a new position, activates it. */
	async authorize(position: Position, count: number, opts: WriteOptions): Promise<WriteResult> {
		const txHash = await flows.authorize(api, walletSigner(opts.owner), position.id, count, opts.onSigned);
		const updated = position.status === "pending" ? await flows.activate(api, position.id) : undefined;
		return { message: position.status === "pending" ? "Schedule started" : "Purchases signed", txHash, position: updated };
	},

	async pause(id: string, opts: WriteOptions): Promise<WriteResult> {
		opts.onSigned();
		return { message: "Strategy paused", position: await flows.pause(api, id) };
	},

	async resume(id: string, opts: WriteOptions): Promise<WriteResult> {
		opts.onSigned();
		return { message: "Strategy resumed", position: await flows.resume(api, id) };
	},

	async cancel(id: string, opts: WriteOptions): Promise<WriteResult> {
		opts.onSigned();
		return { message: "Strategy cancelled", position: await flows.cancel(api, id) };
	},

	async retryMissed(id: string, count: number, opts: WriteOptions): Promise<WriteResult> {
		const txHash = await flows.retryMissed(api, walletSigner(opts.owner), id, count, opts.onSigned);
		return { message: "Missed purchase rescheduled", txHash };
	},

	async withdraw(id: string, asset: AssetRef, amountStroops: string, opts: WriteOptions): Promise<WriteResult> {
		const txHash = await flows.withdraw(api, walletSigner(opts.owner), id, asset, decimal(amountStroops), opts.onSigned);
		return { message: "Withdrawal confirmed", txHash };
	},

	async addTrustline(asset: AssetRef, opts: WriteOptions): Promise<WriteResult> {
		const txHash = await flows.addTrustline(walletSigner(opts.owner), asset, NETWORK_PASSPHRASE, opts.onSigned);
		return { message: `${asset.code} trustline added`, txHash };
	},

	async createAccount(id: string, opts: WriteOptions): Promise<WriteResult> {
		opts.onSigned();
		return { message: "Vault account ready", account: await flows.createAccount(api, id) };
	},
};
