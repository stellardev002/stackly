/** Every app route. PRD screen numbers in comments; Screen 1 (landing) lives in apps/landing. */

export const overviewRoutes = {
	/** Screen 3. Screen 2 (wallet connection) is a modal over it when no wallet is connected. */
	OVERVIEW: "/overview",
};

export const vaultRoutes = {
	/** Screen 4 */
	CREATE: "/vaults/create",
	/** Screen 5 */
	REVIEW: "/vaults/create/review",
	/** Screen 7 */
	VAULT: (id: string) => `/vaults/${id}`,
	/** Screen 6. `flow` shows the create stepper; `amount` pre-fills the planned deposit. */
	DEPOSIT: (id: string, opts?: { flow?: boolean; amount?: string }) => {
		const params = new URLSearchParams();
		if (opts?.flow) params.set("flow", "create");
		if (opts?.amount) params.set("amount", opts.amount);
		const qs = params.toString();
		return `/vaults/${id}/deposit${qs ? `?${qs}` : ""}`;
	},
	/** Screen 11 */
	WITHDRAW: (id: string) => `/vaults/${id}/withdraw`,
	/** Screen 8 */
	EXECUTION: (id: string, executionId: string) => `/vaults/${id}/executions/${executionId}`,
};

export const transactionRoutes = {
	/** Screen 9; `?vault=` narrows it to one position. */
	TRANSACTIONS: "/transactions",
	FOR_VAULT: (id: string) => `/transactions?vault=${id}`,
};

export const portfolioRoutes = {
	/** Screen 10 */
	PORTFOLIO: "/portfolio",
};

export const settingsRoutes = {
	/** Screen 12 */
	SETTINGS: "/settings",
};

/** The read API (src/app/api/v1 in live mode, @repo/mock-api in mock mode). */
export const apiRoutes = {
	CLOCK: "/clock",
	WALLET: (address: string) => `/wallets/${address}`,
	POSITIONS: "/positions",
	POSITION: (id: string) => `/positions/${id}`,
	POSITION_EXECUTIONS: (id: string) => `/positions/${id}/executions`,
	EXECUTIONS: "/executions",
	EXECUTION: (id: string) => `/executions/${id}`,
	TRANSACTIONS: "/transactions",
	PORTFOLIO: "/portfolio",
};
