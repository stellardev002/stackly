import { SOROBAN_RPC_URL } from "@repo/stellar/network";

function required(name: string) {
	const value = process.env[name];
	if (!value) throw new Error(`Missing ${name} (see apps/keeper/.env.example)`);
	return value;
}

/** Read once at startup; a missing value stops the keeper before it touches the network. */
export function loadConfig() {
	return {
		rpcUrl: process.env.STELLAR_RPC_URL || SOROBAN_RPC_URL,
		vaultContractId: required("VAULT_CONTRACT_ID"),
		keeperSecret: required("KEEPER_SECRET_KEY"),
		supabaseUrl: required("SUPABASE_URL"),
		supabaseKey: required("SUPABASE_SERVICE_ROLE_KEY"),
		pollIntervalMs: Number(process.env.KEEPER_POLL_INTERVAL_MS ?? 30_000),
		maxRetries: Number(process.env.KEEPER_MAX_RETRIES ?? 3),
	};
}

export type KeeperConfig = ReturnType<typeof loadConfig>;
