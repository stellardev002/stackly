/** Admin routes. Lists take their filters as search params, so a filtered view can be shared or reloaded. */

const query = (params: Record<string, string | number | boolean | undefined | null>) => {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params))
		if (value !== undefined && value !== null && value !== "" && value !== false) search.set(key, String(value));
	const text = search.toString();
	return text ? `?${text}` : "";
};

export const routes = {
	OVERVIEW: "/",
	USERS: (params: Record<string, string | undefined> = {}) => `/users${query(params)}`,
	USER: (id: string) => `/users/${id}`,
	POSITIONS: (params: Record<string, string | boolean | undefined> = {}) => `/positions${query(params)}`,
	POSITION: (id: string) => `/positions/${id}`,
	EXECUTIONS: (params: Record<string, string | undefined> = {}) => `/executions${query(params)}`,
	LEDGER: (params: Record<string, string | undefined> = {}) => `/ledger${query(params)}`,
	RECONCILIATION: "/reconciliation",
	AUDIT: (params: Record<string, string | undefined> = {}) => `/audit${query(params)}`,
	SYSTEM: "/system",
} as const;

export { query as toQuery };
