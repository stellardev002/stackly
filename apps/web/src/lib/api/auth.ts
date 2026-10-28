import type { AxiosInstance } from "axios";
import type { AuthTokensDto, Envelope } from "./dto";

/**
 * Wallet sign-in (no passwords): the backend issues a single-use message, the wallet signs it (SEP-43 / SEP-53
 * `signMessage`, base64 signature), the backend returns a short-lived access token and a single-use refresh token.
 */

export type SignMessage = (message: string) => Promise<string>;

export async function login(http: AxiosInstance, address: string, signMessage: SignMessage): Promise<AuthTokensDto> {
	const { data: challenge } = await http.post<Envelope<{ nonce: string; message: string }>>("/auth/challenge", { address });
	const signature = await signMessage(challenge.data.message);
	const { data } = await http.post<Envelope<AuthTokensDto>>("/auth/login", { address, nonce: challenge.data.nonce, signature });
	return data.data;
}

export async function refresh(http: AxiosInstance, refreshToken: string): Promise<AuthTokensDto> {
	const { data } = await http.post<Envelope<AuthTokensDto>>("/auth/refresh", { refreshToken });
	return data.data;
}

export async function logout(http: AxiosInstance, refreshToken: string) {
	await http.post("/auth/logout", { refreshToken }).catch(() => undefined);
}
