/**
 * Admin response and request shapes of the Stackly backend (https://api.usestackly.app/docs, `/docs-json`, tags
 * Admin · Reconciliation · Audit · Auth). Success is `{ statusCode, message, data }`; lists put `{ results,
 * paginationMeta }` in `data`. Amounts are 7-decimal strings; amounts of different assets are never added together.
 */

export interface Envelope<T> {
	statusCode: number;
	message: string;
	data: T;
}

export interface PaginationMeta {
	pageCount: number;
	totalPages: number;
	totalCount: number;
	previousPage: boolean;
	nextPage: boolean;
}

export interface Paginated<T> {
	results: T[];
	paginationMeta: PaginationMeta;
}

export interface AuthTokens {
	accessToken: string;
	refreshToken: string;
	tokenType: string;
	expiresIn: number;
}

export type Role = "user" | "admin";

export interface Me {
	id: string;
	walletAddress: string;
	role: Role;
	createdAt: string;
}

export interface Asset {
	id: string;
	code: string;
	/** Empty for native XLM. */
	issuer: string;
}

export const POSITION_STATUSES = ["pending", "active", "paused", "cancelled", "completed"] as const;
export type PositionStatus = (typeof POSITION_STATUSES)[number];

export const EXECUTION_STATUSES = ["submitted", "completed", "failed", "skipped"] as const;
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export const FAILURE_REASONS = [
	"insufficient_balance",
	"insufficient_liquidity",
	"slippage_exceeded",
	"swap_reverted",
	"submission_failed",
] as const;
export type FailureReason = (typeof FAILURE_REASONS)[number];

export const LEDGER_KINDS = ["deposit", "withdrawal", "swap", "adjustment"] as const;
export type LedgerKind = (typeof LEDGER_KINDS)[number];

export type Frequency = "daily" | "weekly" | "monthly";

// ---- Overview & workers ----------------------------------------------------------------------------------------

export interface Worker {
	enabled: boolean;
	intervalSeconds: number;
	lastRunAt: string | null;
	lastReport: Record<string, number> | null;
	lastError: string | null;
	/** True when disabled, or it ran within three intervals. */
	healthy: boolean;
}

export interface AccountBalance {
	address: string;
	/** Null when the network couldn't be reached or the account doesn't exist. */
	xlm: string | null;
}

export interface Workers {
	keeper: Worker;
	indexer: Worker;
	keeperAccount: AccountBalance | null;
	fundingAccount: AccountBalance | null;
	stuckExecutions: number;
}

export interface RunResult {
	report: Record<string, number> | null;
	error: string | null;
}

export interface AssetVolume {
	asset: Asset;
	spent: string;
	received: string;
}

export interface AdminOverview {
	users: { total: number; admins: number };
	positions: Record<PositionStatus, number>;
	executionsLast24h: Record<ExecutionStatus, number>;
	volume: AssetVolume[];
	inFlight: number;
	openWarnings: number;
	workers: Workers;
}

export const STAT_METRICS = ["new_users", "positions_created", "executions", "volume", "deposits", "withdrawals"] as const;
export type StatMetric = (typeof STAT_METRICS)[number];

export interface Stats {
	metric: StatMetric;
	bucket: "hour" | "day";
	/** Time order; empty buckets are left out. `series` is a status or an asset code, null for single-series metrics. */
	points: { at: string; series: string | null; value: string }[];
}

export interface Health {
	status: "ok" | "error" | "shutting_down";
	info: Record<string, { status: string }>;
	error: Record<string, { status: string }>;
	details: Record<string, { status: string }>;
}

// ---- Users -----------------------------------------------------------------------------------------------------

export interface AdminUserSummary {
	id: string;
	walletAddress: string;
	role: Role;
	positionCount: number;
	lastLoginAt: string | null;
	createdAt: string;
}

export interface AssetTotals {
	asset: Asset;
	deposited: string;
	withdrawn: string;
	swappedOut: string;
	swappedIn: string;
	balance: string;
}

export interface AdminUserDetail extends AdminUserSummary {
	defaultSlippageBps: number;
	mutedNotifications: string[];
	positions: {
		id: string;
		status: PositionStatus;
		sourceCode: string;
		targetCode: string;
		amountPerPurchase: string;
		createdAt: string;
	}[];
	assets: AssetTotals[];
	recentActivity: { id: number; action: string; at: string }[];
}

export interface RoleChange {
	id: string;
	walletAddress: string;
	previousRole: Role;
	role: Role;
}

// ---- Positions, executions, ledger -----------------------------------------------------------------------------

export interface AdminPositionSummary {
	id: string;
	userId: string;
	walletAddress: string;
	status: PositionStatus;
	sourceAsset: Asset;
	targetAsset: Asset;
	amountPerPurchase: string;
	frequency: Frequency;
	nextExecutionAt: string;
	lastExecutionStatus: ExecutionStatus | null;
	createdAt: string;
}

export interface AdminExecution {
	id: string;
	positionId: string;
	walletAddress: string;
	status: ExecutionStatus;
	scheduledFor: string;
	sourceAsset: Asset;
	targetAsset: Asset;
	sourceAmount: string;
	receivedAmount: string | null;
	txHash: string | null;
	failureReason: FailureReason | null;
	createdAt: string;
}

export interface AdminLedgerRow {
	id: string;
	positionId: string;
	walletAddress: string;
	kind: LedgerKind;
	asset: Asset;
	/** Signed: positive entered the position, negative left it. */
	amount: string;
	/** Random for an adjustment. */
	txHash: string;
	createdAt: string;
}

export interface AdminPositionDetail extends AdminPositionSummary {
	maxSlippageBps: number;
	accountAddress: string | null;
	accountUrl: string | null;
	remainingSourceBalance: string;
	availableSourceBalance: string;
	purchasedTargetBalance: string;
	authorizationsRemaining: number;
	authorizations: { sequence: string; scheduledFor: string; status: "prepared" | "active" | "used" }[];
	recentExecutions: AdminExecution[];
	recentLedger: AdminLedgerRow[];
}

// ---- Reconciliation & audit ------------------------------------------------------------------------------------

export interface ReconciledAsset {
	asset: Asset;
	chainBalance: string;
	ledgerBalance: string;
	/** Chain minus ledger. */
	difference: string;
	drift: boolean;
}

export interface Reconciliation {
	checked: number;
	skipped: number;
	drifted: { positionId: string; address: string; assets: ReconciledAsset[]; drift: boolean }[];
}

export interface Repair {
	repaired: { asset: Asset; adjustment: string }[];
	unrepairable: { asset: Asset; reason: string }[];
	stillDrifted: boolean;
}

export interface AuditLog {
	id: number;
	at: string;
	actorId: string | null;
	action: string;
	resourceType: string | null;
	resourceId: string | null;
	requestId: string | null;
	traceId: string | null;
	ip: string | null;
	metadata: Record<string, unknown>;
}
