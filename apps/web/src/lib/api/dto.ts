/**
 * Response and request shapes of the Stackly backend (https://api.usestackly.app/docs, `/docs-json`). Success is
 * `{ statusCode, message, data }`; lists put `{ results, paginationMeta }` in `data`. Amounts are decimal strings.
 * Only `adapters.ts` and the endpoint / flow modules should touch these.
 */

export interface Envelope<T> {
	statusCode: number;
	message: string;
	data: T;
}

export interface Paginated<T> {
	results: T[];
	paginationMeta: { pageCount: number; totalPages: number; totalCount: number; previousPage: boolean; nextPage: boolean };
}

export interface AssetDto {
	id: string;
	code: string;
	issuer: string;
}

export type FailureReasonDto = "insufficient_balance" | "insufficient_liquidity" | "slippage_exceeded" | "swap_reverted" | "submission_failed";

export interface DcaPositionDto {
	id: string;
	sourceAsset: AssetDto;
	targetAsset: AssetDto;
	amountPerPurchase: string;
	frequency: "daily" | "weekly" | "monthly";
	intervalSeconds: number;
	maxSlippageBps: number;
	startAt: string;
	endAt: string | null;
	nextExecutionAt: string;
	status: "pending" | "active" | "paused" | "cancelled" | "completed";
	lastExecution: { id: string; status: "submitted" | "completed" | "failed" | "skipped"; scheduledFor: string; failureReason: FailureReasonDto | null } | null;
	authorizationsRemaining: number;
	createdAt: string;
}

export interface PositionBalanceDto {
	positionId: string;
	totalDeposited: string;
	totalSpent: string;
	totalWithdrawn: string;
	remainingSourceBalance: string;
	purchasedTargetBalance: string;
	executionCount: number;
	reservedForPurchase: string;
	availableSourceBalance: string;
	availableTargetBalance: string;
}

export interface PositionAccountDto {
	positionId: string;
	address: string;
	ready: boolean;
	explorerUrl: string;
}

export interface ExecutionDto {
	id: string;
	positionId: string;
	scheduledFor: string;
	intervalSeconds: number;
	status: "submitted" | "completed" | "failed" | "skipped";
	sourceAsset: AssetDto;
	targetAsset: AssetDto;
	sourceAmount: string;
	expectedReceiveAmount: string | null;
	minReceiveAmount: string | null;
	receivedAmount: string | null;
	executionPrice: string | null;
	slippageBps: number | null;
	feeAmount: string | null;
	txHash: string | null;
	explorerUrl: string | null;
	failureReason: FailureReasonDto | null;
	retryable: boolean;
	completedAt: string | null;
	createdAt: string;
}

export interface HistoryEntryDto {
	id: string;
	positionId: string;
	type: "deposit" | "swap" | "withdrawal" | "failed_execution" | "adjustment";
	status: "confirmed" | "failed" | "skipped";
	asset: AssetDto;
	amount: string;
	receivedAsset: AssetDto | null;
	receivedAmount: string | null;
	txHash: string | null;
	explorerUrl: string | null;
	failureReason: string | null;
	at: string;
}

export interface AssetTotalsDto {
	asset: AssetDto;
	deposited: string;
	withdrawn: string;
	swappedOut: string;
	swappedIn: string;
	balance: string;
}

export interface PurchasePointDto {
	executionId: string;
	positionId: string;
	completedAt: string;
	sourceAsset: AssetDto;
	targetAsset: AssetDto;
	sourceAmount: string;
	receivedAmount: string;
	executionPrice: string;
}

export interface DashboardDto {
	assets: AssetTotalsDto[];
	positions: Record<"pending" | "active" | "paused" | "completed" | "cancelled", number>;
	upcoming: { positionId: string; sourceAsset: AssetDto; targetAsset: AssetDto; amountPerPurchase: string; nextExecutionAt: string }[];
	recentPurchases: PurchasePointDto[];
}

export interface PortfolioDto {
	assets: AssetTotalsDto[];
	averageAcquisition: { sourceAsset: AssetDto; targetAsset: AssetDto; totalSpent: string; totalReceived: string; averagePrice: string; purchases: number }[];
	purchaseHistory: PurchasePointDto[];
}

export interface WalletBalancesDto {
	address: string;
	funded: boolean;
	balances: { asset: AssetDto | null; code: string; balance: string }[];
}

export type NotificationEvent = "execution_completed" | "execution_failed" | "deposit_confirmed" | "withdrawal_confirmed" | "low_balance" | "authorizations_low";

export interface SettingsDto {
	defaultSlippageBps: number;
	mutedNotifications: NotificationEvent[];
	availableNotifications: NotificationEvent[];
}

export interface NotificationDto {
	id: string;
	event: NotificationEvent;
	positionId: string | null;
	message: string;
	readAt: string | null;
	createdAt: string;
}

export interface DcaPreviewDto {
	sourceAsset: AssetDto;
	targetAsset: AssetDto;
	amountPerPurchase: string;
	frequency: "daily" | "weekly" | "monthly";
	intervalSeconds: number;
	maxSlippageBps: number;
	firstExecutionAt: string;
	lastExecutionAt: string | null;
	estimatedPurchases: number | null;
	leftoverAmount: string | null;
	quote: { expectedReceiveAmount: string; minReceiveAmount: string; price: string } | null;
	fees: { perAuthorizedPurchase: string; perWithdrawal: string; paidByProject: string };
	notices: string[];
}

export interface CreatePositionBody {
	sourceAssetId: string;
	targetAssetId: string;
	amountPerPurchase: string;
	frequency: "daily" | "weekly" | "monthly";
	startAt: string;
	endAt?: string;
	maxSlippageBps?: number;
}

/** An unsigned transaction the wallet must sign and submit (withdrawals, authorization batches). */
export interface PreparedTxDto {
	networkPassphrase: string;
	signXdr: string;
}

export interface AuthTokensDto {
	accessToken: string;
	refreshToken: string;
	tokenType: string;
	expiresIn: number;
}
