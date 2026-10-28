import type { AxiosInstance } from "axios";
import { HORIZON_URL } from "@repo/stellar/network";
import type { AssetRef, Position, PositionAccount } from "@repo/stellar/vault";
import { toAccount, toPosition } from "./adapters";
import type { CreatePositionBody, DcaPositionDto, Envelope, PositionAccountDto, PreparedTxDto } from "./dto";

/**
 * Every write, as the backend sequences it. Pure functions of an HTTP client and a wallet signer, so the browser
 * (Stellar Wallets Kit) and the live end-to-end test (a Testnet keypair) run the same code.
 *
 *   create   → POST /dca-positions, POST /dca-positions/{id}/account (project-funded account; wallet is its signer)
 *   deposit  → wallet pays the source asset into the position account, then POST …/ledger/sync
 *   authorize→ POST …/authorizations {count}, wallet signs + submits the batch, POST …/authorizations/sync
 *   activate / pause / resume / cancel → plain API calls (the signed purchases are the on-chain guarantee)
 *   withdraw → POST …/withdrawals, wallet signs + submits, POST …/ledger/sync
 */

export interface Signer {
	address: string;
	/** Signs a transaction XDR for `networkPassphrase` and returns the signed XDR. Rejects if the user declines. */
	sign(xdr: string, networkPassphrase: string): Promise<string>;
}

/** Called once the wallet has approved (the UI moves from "Approve in wallet" to "Submitting"). */
export type OnSigned = () => void;

const data = async <T>(promise: Promise<{ data: Envelope<T> }>) => (await promise).data.data;

export class TrustlineMissingError extends Error {
	name = "TrustlineMissingError";
	constructor(code: string) {
		super(`Your wallet can't hold ${code} yet. Add a ${code} trustline, then try again.`);
	}
}

export class InsufficientFundsError extends Error {
	name = "InsufficientFundsError";
}

async function sdk() {
	return import("@stellar/stellar-sdk");
}

const server = async () => new (await sdk()).Horizon.Server(HORIZON_URL);

/** Submits a signed XDR to Stellar and returns the hash, turning Horizon result codes into readable errors. */
async function submit(signedXdr: string, networkPassphrase: string, assetCode = "USDC"): Promise<string> {
	const { TransactionBuilder } = await sdk();
	try {
		const result = await (await server()).submitTransaction(TransactionBuilder.fromXDR(signedXdr, networkPassphrase));
		return result.hash;
	} catch (error) {
		const codes = (error as { response?: { data?: { extras?: { result_codes?: { transaction?: string; operations?: string[] } } } } }).response?.data?.extras?.result_codes;
		const op = codes?.operations?.find((c) => c !== "op_success");
		if (op === "op_no_trust" || op === "op_src_no_trust") throw new TrustlineMissingError(assetCode);
		if (op === "op_underfunded") throw new InsufficientFundsError(`Your wallet doesn't hold enough ${assetCode} for this.`);
		if (codes?.transaction === "tx_insufficient_balance") throw new InsufficientFundsError("Not enough Testnet XLM for the network fee. Fund the wallet with Friendbot.");
		if (codes?.transaction === "tx_too_late") throw new Error("The signing window expired. Try again.");
		throw new Error(`Stellar Testnet rejected the transaction${op ? ` (${op})` : codes?.transaction ? ` (${codes.transaction})` : ""}.`);
	}
}

/** Signs and submits a transaction the backend prepared (withdrawals, authorization batches). */
async function signPrepared(prepared: PreparedTxDto, signer: Signer, onSigned?: OnSigned, assetCode?: string) {
	const signed = await signer.sign(prepared.signXdr, prepared.networkPassphrase);
	onSigned?.();
	return submit(signed, prepared.networkPassphrase, assetCode);
}

export async function createPosition(http: AxiosInstance, body: CreatePositionBody): Promise<{ position: Position; account: PositionAccount }> {
	const created = await data<DcaPositionDto>(http.post("/dca-positions", body));
	const account = await data<PositionAccountDto>(http.post(`/dca-positions/${created.id}/account`));
	return { position: toPosition(created), account: toAccount(account) };
}

/** Creates the account for a position that doesn't have one yet (e.g. if setup was interrupted). */
export const createAccount = async (http: AxiosInstance, positionId: string) => toAccount(await data<PositionAccountDto>(http.post(`/dca-positions/${positionId}/account`)));

/** Pays `amount` (decimal string) of the source asset from the wallet into the position account, then books it. */
export async function deposit(
	http: AxiosInstance,
	signer: Signer,
	position: Pick<Position, "id" | "source">,
	account: PositionAccount,
	amount: string,
	networkPassphrase: string,
	onSigned?: OnSigned,
): Promise<string> {
	const { TransactionBuilder, Operation, Asset, BASE_FEE } = await sdk();
	let source;
	try {
		source = await (await server()).loadAccount(signer.address);
	} catch {
		throw new InsufficientFundsError("Your wallet isn't on Stellar Testnet yet. Fund it with Friendbot first.");
	}
	const asset = toSdkAsset(Asset, position.source);
	const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase })
		.addOperation(Operation.payment({ destination: account.address, asset, amount }))
		.setTimeout(300)
		.build();
	const signed = await signer.sign(tx.toXDR(), networkPassphrase);
	onSigned?.();
	const hash = await submit(signed, networkPassphrase, position.source.code);
	await syncLedger(http, position.id);
	return hash;
}

/** Prepares `count` pre-authorized purchases, has the wallet sign the batch, submits it and syncs. Returns the hash. */
export async function authorize(http: AxiosInstance, signer: Signer, positionId: string, count: number, onSigned?: OnSigned): Promise<string> {
	const prepared = await data<PreparedTxDto>(http.post(`/dca-positions/${positionId}/authorizations`, { count }));
	const hash = await signPrepared(prepared, signer, onSigned);
	await http.post(`/dca-positions/${positionId}/authorizations/sync`);
	return hash;
}

const transition = (action: "activate" | "pause" | "resume" | "cancel") => async (http: AxiosInstance, positionId: string) =>
	toPosition(await data<DcaPositionDto>(http.post(`/dca-positions/${positionId}/${action}`)));

export const activate = transition("activate");
export const pause = transition("pause");
export const resume = transition("resume");
export const cancel = transition("cancel");

/** Makes up a missed purchase: reschedules it to now, then the wallet signs a fresh batch (the old signature can't be reused). */
export async function retryMissed(http: AxiosInstance, signer: Signer, positionId: string, count: number, onSigned?: OnSigned): Promise<string> {
	await http.post(`/dca-positions/${positionId}/retry-missed`);
	return authorize(http, signer, positionId, count, onSigned);
}

/** Withdraws `amount` of `asset` from the position account to the wallet. */
export async function withdraw(http: AxiosInstance, signer: Signer, positionId: string, asset: AssetRef, amount: string, onSigned?: OnSigned): Promise<string> {
	const prepared = await data<PreparedTxDto>(http.post(`/dca-positions/${positionId}/withdrawals`, { assetId: asset.id, amount }));
	const hash = await signPrepared(prepared, signer, onSigned, asset.code);
	await syncLedger(http, positionId);
	return hash;
}

export const syncLedger = (http: AxiosInstance, positionId: string) => http.post(`/dca-positions/${positionId}/ledger/sync`);

/** Adds a trustline so the wallet can hold `asset` (needed for USDC deposits and withdrawals). */
export async function addTrustline(signer: Signer, asset: AssetRef, networkPassphrase: string, onSigned?: OnSigned): Promise<string> {
	const { TransactionBuilder, Operation, Asset, BASE_FEE } = await sdk();
	const source = await (await server()).loadAccount(signer.address);
	const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase })
		.addOperation(Operation.changeTrust({ asset: toSdkAsset(Asset, asset) }))
		.setTimeout(300)
		.build();
	const signed = await signer.sign(tx.toXDR(), networkPassphrase);
	onSigned?.();
	return submit(signed, networkPassphrase, asset.code);
}

function toSdkAsset(Asset: Awaited<ReturnType<typeof sdk>>["Asset"], a: AssetRef) {
	return a.issuer ? new Asset(a.code, a.issuer) : Asset.native();
}
