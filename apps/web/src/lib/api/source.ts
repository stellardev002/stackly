/**
 * Where the app's data comes from.
 *
 * - "mock" (default for now): an in-browser backend (`@repo/mock-api`) with demo data, so every screen can be
 *   built and explored before the contract and indexer exist. Data lives in localStorage (`stackly-mock-db`).
 *   Everything shown in this mode is demo data and the UI must label it so: never present it as a live swap.
 * - "live" (`NEXT_PUBLIC_API_SOURCE=live`): reads from the indexer API, writes as wallet-signed contract calls.
 */
export const API_SOURCE: "mock" | "live" = process.env.NEXT_PUBLIC_API_SOURCE === "live" ? "live" : "mock";

export const USE_MOCK_API = API_SOURCE === "mock";

/** Restores the seed data (mock mode only). */
export async function resetDemoData() {
	const { resetMockDb } = await import("@repo/mock-api/db");
	resetMockDb();
}
