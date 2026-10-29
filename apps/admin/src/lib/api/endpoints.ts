import type { AxiosInstance } from "axios";
import { api, data, publicApi } from "@/lib/api/client";
import type {
	AdminExecution,
	AdminLedgerRow,
	AdminOverview,
	AdminPositionDetail,
	AdminPositionSummary,
	AdminUserDetail,
	AdminUserSummary,
	Asset,
	AuditLog,
	AuthTokens,
	Envelope,
	ExecutionStatus,
	FailureReason,
	Health,
	LedgerKind,
	Me,
	Paginated,
	PositionStatus,
	Reconciliation,
	Repair,
	Role,
	RoleChange,
	RunResult,
	StatMetric,
	Stats,
	Workers,
} from "@/lib/api/dto";

/**
 * Every backend call the admin makes, one function per route. Admin routes answer 403 for non-admins.
 * Empty filter values are dropped so the backend's validation never sees `""`.
 */

const clean = <T extends object>(params: T) =>
	Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")) as Partial<T>;

export interface Page {
	limit?: number;
	offset?: number;
}

// ---- Auth --------------------------------------------------------------------------------------------------------

/** Wallet sign-in: a single-use challenge, signed by the wallet (SEP-53, base64), exchanged for tokens. */
export async function login(address: string, signMessage: (message: string) => Promise<string>): Promise<AuthTokens> {
	const challenge = await data<{ nonce: string; message: string }>(publicApi.post("/auth/challenge", { address }));
	const signature = await signMessage(challenge.message);
	return data<AuthTokens>(publicApi.post("/auth/login", { address, nonce: challenge.nonce, signature }));
}

export const logout = (refreshToken: string) => publicApi.post("/auth/logout", { refreshToken }).catch(() => undefined);

export const getMe = (http: AxiosInstance = api) => data<Me>(http.get("/auth/me"));

// ---- Overview, stats, workers, config, health ----------------------------------------------------------------------

export const getOverview = () => data<AdminOverview>(api.get("/admin/overview"));

export const getStats = (q: { metric: StatMetric; from?: string; to?: string; bucket?: "hour" | "day" }) =>
	data<Stats>(api.get("/admin/stats", { params: clean(q) }));

export const getWorkers = () => data<Workers>(api.get("/admin/workers"));

export const runWorker = (worker: "keeper" | "indexer") => data<RunResult>(api.post(`/admin/workers/${worker}/run`));

export const getConfig = () => data<{ settings: { key: string; value: string }[] }>(api.get("/admin/config"));

/** `/health` sits outside `/v1` and answers 503 (error envelope) when something is down; both carry the details. */
export async function getHealth(): Promise<Health> {
	const url = process.env.NEXT_PUBLIC_HEALTH_URL ?? "/api/health";
	const response = await publicApi.get<Envelope<Health> | { data?: Health; details?: unknown }>(url, {
		baseURL: "",
		validateStatus: () => true,
	});
	const body = response.data as Envelope<Health> & { details?: unknown };
	if (body?.data?.status) return body.data;
	if (response.status === 503) return { status: "error", info: {}, error: {}, details: {} };
	throw new Error(`Health check failed (${response.status})`);
}

export const getAssets = () => data<Asset[]>(api.get("/assets"));

// ---- Users -----------------------------------------------------------------------------------------------------

export const searchUsers = (q: Page & { search?: string; role?: Role }) =>
	data<Paginated<AdminUserSummary>>(api.get("/admin/users", { params: clean(q) }));

export const getUser = (id: string) => data<AdminUserDetail>(api.get(`/admin/users/${id}`));

export const setUserRole = (id: string, role: Role) => data<RoleChange>(api.patch(`/admin/users/${id}/role`, { role }));

// ---- Positions, executions, ledger -----------------------------------------------------------------------------

export interface PositionQuery extends Page {
	status?: PositionStatus;
	userId?: string;
	due?: boolean;
	stuck?: boolean;
}
export const searchPositions = (q: PositionQuery) =>
	data<Paginated<AdminPositionSummary>>(api.get("/admin/positions", { params: clean(q) }));

export const getPosition = (id: string) => data<AdminPositionDetail>(api.get(`/admin/positions/${id}`));

export interface ExecutionQuery extends Page {
	status?: ExecutionStatus;
	reason?: FailureReason;
	positionId?: string;
	from?: string;
	to?: string;
}
export const searchExecutions = (q: ExecutionQuery) =>
	data<Paginated<AdminExecution>>(api.get("/admin/executions", { params: clean(q) }));

export interface LedgerQuery extends Page {
	kind?: LedgerKind;
	assetId?: string;
	positionId?: string;
	from?: string;
	to?: string;
}
export const searchLedger = (q: LedgerQuery) => data<Paginated<AdminLedgerRow>>(api.get("/admin/ledger", { params: clean(q) }));

// ---- Reconciliation & audit ------------------------------------------------------------------------------------

/** Reads up to `limit` position accounts from Stellar and returns the ones whose ledger disagrees. Slow. */
export const reconcile = (limit: number) =>
	data<Reconciliation>(api.get("/reconciliation", { params: { limit }, timeout: 120_000 }));

/** Books `adjustment` ledger rows so the ledger matches the chain. Moves no funds; audited. */
export const repairPosition = (positionId: string) => data<Repair>(api.post("/reconciliation/repair", { positionId }));

export interface AuditQuery extends Page {
	action?: string;
	actorId?: string;
	resourceType?: string;
	resourceId?: string;
	requestId?: string;
	from?: string;
	to?: string;
}
export const searchAudit = (q: AuditQuery) => data<Paginated<AuditLog>>(api.get("/audit-logs", { params: clean(q) }));

export const getAuditActions = async () => (await data<{ actions: string[] }>(api.get("/audit-logs/actions"))).actions;
