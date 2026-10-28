/** A tiny router for the mock backend: "/positions/:id" patterns and the request context. */

export interface Ctx {
	method: string;
	path: string;
	params: Record<string, string>;
	query: URLSearchParams;
	body: Record<string, unknown>;
}

export class HttpError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
	}
}

export type Handler = (ctx: Ctx) => unknown;

interface Route {
	method: string;
	parts: string[];
	handler: Handler;
}

const routes: Route[] = [];

export function route(method: string, pattern: string, handler: Handler) {
	routes.push({ method: method.toUpperCase(), parts: pattern.split("/").filter(Boolean), handler });
}

function match(route: Route, segments: string[]) {
	if (route.parts.length !== segments.length) return null;
	const params: Record<string, string> = {};
	for (let i = 0; i < route.parts.length; i++) {
		const part = route.parts[i]!;
		const segment = decodeURIComponent(segments[i]!);
		if (part.startsWith(":")) params[part.slice(1)] = segment;
		else if (part !== segment) return null;
	}
	return params;
}

/** The success envelope the live API uses. */
export const ok = (data: unknown, message = "successful", status_code = 200) => ({ status_code, message, data });

export async function dispatch(method: string, path: string, query: URLSearchParams, body: Record<string, unknown>) {
	const segments = path.split("/").filter(Boolean);
	const candidates = routes.filter((r) => match(r, segments));
	if (candidates.length === 0) throw new HttpError(404, "404 page not found");
	const found = candidates.find((r) => r.method === method.toUpperCase());
	if (!found) throw new HttpError(405, "Method Not Allowed");

	return found.handler({ method, path, params: match(found, segments)!, query, body });
}
