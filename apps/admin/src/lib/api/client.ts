import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { AuthTokens, Envelope } from "@/lib/api/dto";
import { useSession } from "@/features/auth/store";

/**
 * The Stackly backend client. The browser calls this app's own `/api/v1` (proxied to https://api.usestackly.app/v1
 * by next.config.ts). Requests carry the admin's access token; a 401 triggers one shared refresh (refresh tokens are
 * single-use, so parallel requests must not each refresh), then the request is retried once. If the refresh fails,
 * the session is cleared and the gate asks the wallet to sign in again.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/** Unauthenticated calls (challenge, login, refresh, health). */
export const publicApi = axios.create({ baseURL: BASE_URL, headers: { "Content-Type": "application/json" } });

export const api = axios.create({ baseURL: BASE_URL, headers: { "Content-Type": "application/json" } });

api.interceptors.request.use((config) => {
	const token = useSession.getState().accessToken;
	if (token) config.headers.set("Authorization", `Bearer ${token}`);
	return config;
});

let refreshing: Promise<string | null> | null = null;

function refreshOnce(): Promise<string | null> {
	refreshing ??= (async () => {
		const { address, refreshToken, setTokens, clear } = useSession.getState();
		if (!address || !refreshToken) return null;
		try {
			const { data } = await publicApi.post<Envelope<AuthTokens>>("/auth/refresh", { refreshToken });
			setTokens(address, data.data);
			return data.data.accessToken;
		} catch {
			clear();
			return null;
		}
	})().finally(() => {
		refreshing = null;
	});
	return refreshing;
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
	const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
	if (error.response?.status !== 401 || !config || config._retried) throw error;
	const token = await refreshOnce();
	if (!token) throw error;
	config._retried = true;
	config.headers.set("Authorization", `Bearer ${token}`);
	return api(config);
});

/** Unwraps the `{ statusCode, message, data }` envelope. */
export async function data<T>(request: Promise<{ data: Envelope<T> }>): Promise<T> {
	return (await request).data.data;
}
