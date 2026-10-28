import { SOROBAN_RPC_URL } from "@repo/stellar/network";

/**
 * This app's Stellar settings. Network-wide constants (passphrase, explorer, assets) live in
 * `@repo/stellar`; only what differs per deployment is read from env here.
 */
export const VAULT_CONTRACT_ID = process.env.NEXT_PUBLIC_VAULT_CONTRACT_ID ?? "";

export const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || SOROBAN_RPC_URL;

export { NETWORK_PASSPHRASE, STELLAR_NETWORK, explorer } from "@repo/stellar/network";
export { USDC, XLM, SUPPORTED_PAIRS, assetId, assetCode, assetById } from "@repo/stellar/assets";
export { fromStroops, toStroops, shortKey, formatAmount } from "@repo/stellar/format";
