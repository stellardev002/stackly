/**
 * Stellar network constants. The MVP runs on Testnet only (PRD §17, §20): assets have no value and
 * mainnet is out of scope. Apps read contract ids from their own env and pass them alongside these.
 */
export const STELLAR_NETWORK = "testnet" as const;

export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

export const HORIZON_URL = "https://horizon-testnet.stellar.org";

export const FRIENDBOT_URL = "https://friendbot.stellar.org";

const EXPLORER = "https://stellar.expert/explorer/testnet";

export const explorer = {
	tx: (hash: string) => `${EXPLORER}/tx/${hash}`,
	account: (address: string) => `${EXPLORER}/account/${address}`,
	contract: (id: string) => `${EXPLORER}/contract/${id}`,
};
