"use client";

import { FRIENDBOT_URL, HORIZON_URL } from "@repo/stellar/network";
import { NETWORK_PASSPHRASE } from "@/lib/stellar/config";
import { signTransaction } from "@/features/wallet/kit";

/**
 * Real Stellar Testnet transactions for a connected wallet while the vault contract isn't deployed (mock data,
 * real signatures). Each vault action is recorded as a no-op transaction (a `bumpSequence` to 0, which changes
 * nothing and moves no funds) carrying a memo such as "Stackly deposit STK-002". The user approves it in their own
 * wallet, it lands on Testnet, and its hash opens on Stellar Explorer. Vault balances stay demo data.
 */

export class AccountNotFundedError extends Error {
	name = "AccountNotFundedError";
	constructor() {
		super("This account doesn't exist on Stellar Testnet yet. Fund it with Friendbot (wallet menu → Fund Testnet account), then try again.");
	}
}

/** Whether the account exists on Testnet (it needs a few XLM for fees). */
export async function isFundedOnTestnet(address: string) {
	const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
	if (res.status === 404) return false;
	if (!res.ok) throw new Error("Couldn't reach Stellar Testnet. Try again in a moment.");
	return true;
}

/** Asks Testnet's Friendbot for 10,000 test XLM. User-initiated only. */
export async function fundWithFriendbot(address: string) {
	const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(address)}`);
	if (!res.ok && !(await isFundedOnTestnet(address))) throw new Error("Friendbot couldn't fund this account. Try again shortly.");
}

/**
 * Builds the record transaction, has the wallet sign it (`onSigned` fires after approval), submits it to Horizon
 * and resolves with the hash once the ledger closes.
 */
export async function signAndSubmitRecord(address: string, memo: string, onSigned?: () => void): Promise<string> {
	const { Horizon, TransactionBuilder, Operation, Memo, BASE_FEE } = await import("@stellar/stellar-sdk");
	const server = new Horizon.Server(HORIZON_URL);

	let account;
	try {
		account = await server.loadAccount(address);
	} catch (error) {
		const e = error as { name?: string; response?: { status?: number } };
		if (e.name === "NotFoundError" || e.response?.status === 404) throw new AccountNotFundedError();
		throw new Error("Couldn't reach Stellar Testnet. Try again in a moment.");
	}

	const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
		.addOperation(Operation.bumpSequence({ bumpTo: "0" }))
		.addMemo(Memo.text(memo.slice(0, 28)))
		.setTimeout(180)
		.build();

	const signed = await signTransaction(tx.toXDR(), address);
	onSigned?.();

	try {
		const result = await server.submitTransaction(TransactionBuilder.fromXDR(signed, NETWORK_PASSPHRASE));
		return result.hash;
	} catch (error) {
		const codes = (error as { response?: { data?: { extras?: { result_codes?: { transaction?: string } } } } }).response?.data?.extras?.result_codes;
		throw new Error(codes?.transaction === "tx_insufficient_balance" ? "Not enough Testnet XLM for the network fee. Fund the account with Friendbot." : `Stellar Testnet rejected the transaction${codes?.transaction ? ` (${codes.transaction})` : ""}.`);
	}
}
