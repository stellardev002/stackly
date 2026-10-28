import type { Position, VaultTransaction } from "@repo/stellar/vault";
import { api } from "@/lib/api/client";
import { USE_MOCK_API } from "@/lib/api/source";
import { apiRoutes } from "@/lib/routes";
import { isRealWallet } from "@/features/wallet/kit";

/**
 * Every write to a vault. In live mode each call builds a Soroban transaction against the vault contract,
 * has the user sign it in their wallet (features/wallet/kit.ts), submits it and waits for the ledger; in mock
 * mode the demo wallet "signs" and the in-browser backend answers. Hooks only ever talk to this interface.
 * `onSigned` fires once the wallet approved, so the UI can move from "Sign in wallet" to "Submitting".
 */

export interface CreatePositionInput {
	owner: string;
	name: string;
	source_asset: string;
	target_asset: string;
	/** Stroops. */
	purchase_amount: string;
	interval_seconds: number;
	start_ts: number;
	end_ts: number | null;
	max_slippage_bps: number;
}

export interface WriteResult {
	position: Position;
	transaction?: VaultTransaction;
	message: string;
	/** The signed transaction's hash: a real Testnet hash for real wallets, a "demo…" hash otherwise. */
	txHash?: string | null;
}

export interface WriteOptions {
	owner: string;
	/** The connected wallet ("freighter", "xbull", "albedo" sign for real; "demo" is simulated). */
	walletId: string | null;
	onSigned?: () => void;
}

export interface VaultClient {
	createPosition(input: CreatePositionInput, opts: WriteOptions): Promise<WriteResult>;
	deposit(positionId: string, amountStroops: string, opts: WriteOptions): Promise<WriteResult>;
	activate(positionId: string, opts: WriteOptions): Promise<WriteResult>;
	pause(positionId: string, opts: WriteOptions): Promise<WriteResult>;
	resume(positionId: string, opts: WriteOptions): Promise<WriteResult>;
	withdraw(positionId: string, side: "source" | "target", amountStroops: string, opts: WriteOptions): Promise<WriteResult>;
}

/**
 * Mock data, wallet signatures either simulated or real:
 * - Demo wallet: the simulated prompt (approve / reject per the demo controls) and a pretend ledger close.
 * - Freighter / xBull / Albedo: the user approves a real no-op Testnet transaction in their extension
 *   (features/wallet/testnet.ts); its hash is stored on the deposit / withdrawal and opens on Stellar Explorer.
 * Either way the vault accounting itself is the in-browser demo backend.
 */
async function mockWrite(path: string, body: Record<string, unknown>, opts: WriteOptions, memo: string): Promise<WriteResult> {
	let txHash: string | undefined;
	if (isRealWallet(opts.walletId)) {
		const { signAndSubmitRecord } = await import("@/features/wallet/testnet");
		txHash = await signAndSubmitRecord(opts.owner, memo, opts.onSigned);
	} else {
		const sim = await import("@repo/mock-api/sim");
		await sim.simulateWalletApproval();
		opts.onSigned?.();
		await new Promise((resolve) => setTimeout(resolve, 1_300));
	}
	const { data } = await api.post(path, { ...body, owner: opts.owner, tx_hash: txHash });
	const payload = data.data as Position | { position: Position; transaction?: VaultTransaction };
	const result = "position" in payload ? { ...payload, message: data.message } : { position: payload, message: data.message };
	return { ...result, txHash: txHash ?? result.transaction?.tx_hash ?? null };
}

const mockClient: VaultClient = {
	createPosition: (input, opts) => mockWrite(apiRoutes.POSITIONS, { ...input }, opts, "Stackly create vault"),
	deposit: (id, amount, opts) => mockWrite(`${apiRoutes.POSITION(id)}/deposit`, { amount }, opts, `Stackly deposit ${id}`),
	activate: (id, opts) => mockWrite(`${apiRoutes.POSITION(id)}/activate`, {}, opts, `Stackly start ${id}`),
	pause: (id, opts) => mockWrite(`${apiRoutes.POSITION(id)}/pause`, {}, opts, `Stackly pause ${id}`),
	resume: (id, opts) => mockWrite(`${apiRoutes.POSITION(id)}/resume`, {}, opts, `Stackly resume ${id}`),
	withdraw: (id, asset, amount, opts) => mockWrite(`${apiRoutes.POSITION(id)}/withdraw`, { asset, amount }, opts, `Stackly withdraw ${id}`),
};

const notWired = () => Promise.reject(new Error("Live contract calls aren't wired yet (docs/PLAN.md, Module 4)."));

/** TODO(Module 4): build with the contract's TypeScript bindings, sign via kit.signTransaction, submit, await the ledger. */
const contractClient: VaultClient = {
	createPosition: notWired,
	deposit: notWired,
	activate: notWired,
	pause: notWired,
	resume: notWired,
	withdraw: notWired,
};

export const vaultClient: VaultClient = USE_MOCK_API ? mockClient : contractClient;
