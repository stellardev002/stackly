/**
 * Supported assets and pairs. The MVP ships one verified pair, Testnet USDC → XLM (PRD §11); add pairs
 * only after that flow works end to end. The vault contract keeps its own allow-list; this one drives the UI.
 */

/** Stellar classic assets use 7 decimal places (1 unit = 10^7 stroops). */
export const ASSET_DECIMALS = 7;

export interface StellarAsset {
	code: string;
	/** Absent for the native asset. */
	issuer?: string;
	label: string;
}

export const USDC: StellarAsset = {
	code: "USDC",
	// Circle's Testnet USDC.
	issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
	label: "USDC (Testnet)",
};

export const XLM: StellarAsset = { code: "XLM", label: "XLM (Testnet)" };

export const SOURCE_ASSETS = [USDC] as const;

export const TARGET_ASSETS = [XLM] as const;

export const SUPPORTED_PAIRS = [{ source: USDC, target: XLM }] as const;

/** "USDC:GBBD…" or "XLM", the form records and the indexer use. */
export function assetId(asset: StellarAsset) {
	return asset.issuer ? `${asset.code}:${asset.issuer}` : asset.code;
}

/** "USDC:GBBD…" → "USDC". */
export function assetCode(id: string) {
	return id.split(":")[0] ?? id;
}

export function assetById(id: string): StellarAsset | undefined {
	return [...SOURCE_ASSETS, ...TARGET_ASSETS].find((asset) => assetId(asset) === id);
}
