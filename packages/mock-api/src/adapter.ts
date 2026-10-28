import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { read } from "./db";
import { runKeeper } from "./keeper";
import { HttpError, dispatch } from "./router";
import { wait } from "./util";
import "./handlers/index";

/**
 * An axios adapter that answers from the in-browser mock backend instead of the network. The web app installs
 * it on its axios instance in mock mode, so hooks work unchanged: same URLs, same envelopes, same error shapes
 * (`error.response.data.message`). Every request also gives the simulated keeper a turn.
 */

const LATENCY: [number, number] = [220, 560];

function parseBody(data: unknown): Record<string, unknown> {
	if (!data) return {};
	if (typeof data === "string") {
		try {
			return JSON.parse(data) as Record<string, unknown>;
		} catch {
			return {};
		}
	}
	return data as Record<string, unknown>;
}

export async function mockAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
	const url = new URL(config.url ?? "/", "http://mock.local/");
	const query = url.searchParams;
	for (const [key, value] of Object.entries(config.params ?? {})) if (value != null && value !== "") query.set(key, String(value));
	// The API's routes sit under /api/v1; strip whatever base the app uses.
	const path = url.pathname.replace(/^\/(app\/)?api\/v1/, "") || "/";
	const method = (config.method ?? "get").toUpperCase();
	const { force } = read().sim;

	await wait(LATENCY[0] + Math.random() * (LATENCY[1] - LATENCY[0]) + (force === "loading" && method === "GET" ? 4_000 : 0));
	runKeeper();

	const respond = (status: number, data: unknown): AxiosResponse => ({
		data,
		status,
		statusText: String(status),
		headers: new AxiosHeaders({ "content-type": "application/json" }),
		config,
		request: { mock: true },
	});

	try {
		if (force === "error" && method === "GET") throw new HttpError(503, "We couldn't reach Stellar Testnet. Your vault is unaffected. Try again in a moment.");
		const result = await dispatch(method, path, query, parseBody(config.data));
		const status = (result as { status_code?: number })?.status_code ?? 200;
		return respond(status, result);
	} catch (error) {
		const status = error instanceof HttpError ? error.status : 500;
		const message = error instanceof Error ? error.message : "Mock backend error";
		if (!(error instanceof HttpError)) console.error("[mock-api]", method, path, error);
		const response = respond(status, { status_code: status, message });
		throw new AxiosError(message, status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST, config, response.request, response);
	}
}
