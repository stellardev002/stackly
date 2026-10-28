import axios, { type AxiosAdapter } from "axios";
import { USE_MOCK_API } from "@/lib/api/source";

// The app's own /api/v1 route handlers, or a direct URL (next.config.ts sets NEXT_PUBLIC_API_URL).
const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/** In mock mode every request is answered in the browser (lib/api/source.ts); loaded only then. */
const mockAdapter: AxiosAdapter = async (config) => (await import("@repo/mock-api/adapter")).mockAdapter(config);

/**
 * No auth header: reads are public by owner address (the chain is public anyway), and every write is a
 * contract call the user signs in their wallet, never an API request.
 */
export const api = axios.create({
	baseURL: BASE_URL,
	headers: { "Content-Type": "application/json" },
	...(USE_MOCK_API ? { adapter: mockAdapter } : {}),
});
