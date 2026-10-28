import type { AxiosInstance } from "axios";
import type { Execution, Position, PositionAccount, TransactionType, VaultTransaction } from "@repo/stellar/vault";
import { toAccount, toExecution, toPortfolio, toPosition, toTransaction, type Portfolio } from "./adapters";
import type {
	AssetDto,
	DashboardDto,
	DcaPositionDto,
	DcaPreviewDto,
	Envelope,
	ExecutionDto,
	HistoryEntryDto,
	NotificationDto,
	Paginated,
	PortfolioDto,
	PositionAccountDto,
	PositionBalanceDto,
	SettingsDto,
	WalletBalancesDto,
	CreatePositionBody,
} from "./dto";

/**
 * Every read the UI makes against the Stackly backend (`/v1`), as plain functions of an HTTP client: the app passes
 * its authenticated `api` instance, the live end-to-end test passes its own. Results are mapped to the UI model.
 */

const data = async <T>(promise: Promise<{ data: Envelope<T> }>) => (await promise).data.data;
const status = (error: unknown) => (error as { response?: { status?: number } }).response?.status;

export interface Page<T> {
	items: T[];
	total: number;
	totalPages: number;
	hasNext: boolean;
	hasPrevious: boolean;
}

const page = <D, T>(p: Paginated<D>, map: (d: D) => T): Page<T> => ({
	items: p.results.map(map),
	total: p.paginationMeta.totalCount,
	totalPages: p.paginationMeta.totalPages,
	hasNext: p.paginationMeta.nextPage,
	hasPrevious: p.paginationMeta.previousPage,
});

export const getAssets = (http: AxiosInstance) => data<AssetDto[]>(http.get("/assets"));

export async function getPosition(http: AxiosInstance, id: string): Promise<Position> {
	const [position, balance] = await Promise.all([data<DcaPositionDto>(http.get(`/dca-positions/${id}`)), data<PositionBalanceDto>(http.get(`/dca-positions/${id}/balance`))]);
	return toPosition(position, balance);
}

/** All of the owner's positions with their balances (one balance request per position). */
export async function getPositions(http: AxiosInstance): Promise<Position[]> {
	const list = await data<Paginated<DcaPositionDto>>(http.get("/dca-positions", { params: { limit: 100 } }));
	return Promise.all(
		list.results.map(async (p) => {
			const balance = await data<PositionBalanceDto>(http.get(`/dca-positions/${p.id}/balance`)).catch(() => null);
			return toPosition(p, balance);
		}),
	);
}

/** The position's own Stellar account, or null before it is created. */
export async function getPositionAccount(http: AxiosInstance, id: string): Promise<PositionAccount | null> {
	try {
		return toAccount(await data<PositionAccountDto>(http.get(`/dca-positions/${id}/account`)));
	} catch (error) {
		if (status(error) === 404) return null;
		throw error;
	}
}

export const getPositionExecutions = async (http: AxiosInstance, id: string, limit = 20): Promise<Execution[]> =>
	(await data<Paginated<ExecutionDto>>(http.get(`/dca-positions/${id}/executions`, { params: { limit } }))).results.map(toExecution);

export const getExecution = async (http: AxiosInstance, id: string): Promise<Execution> => toExecution(await data<ExecutionDto>(http.get(`/executions/${id}`)));

/** Latest executions across positions (newest first), for "Recent swaps". */
export async function getRecentExecutions(http: AxiosInstance, positionIds: string[], limit = 5): Promise<Execution[]> {
	const lists = await Promise.all(positionIds.map((id) => getPositionExecutions(http, id, limit).catch(() => [])));
	return lists
		.flat()
		.sort((a, b) => (b.executed_at ?? b.created_at).localeCompare(a.executed_at ?? a.created_at))
		.slice(0, limit);
}

export interface HistoryQuery {
	positionId?: string;
	type?: TransactionType;
	limit?: number;
	offset?: number;
}

export const getHistory = async (http: AxiosInstance, q: HistoryQuery): Promise<Page<VaultTransaction>> =>
	page(await data<Paginated<HistoryEntryDto>>(http.get("/history", { params: { limit: q.limit ?? 10, offset: q.offset ?? 0, positionId: q.positionId, type: q.type } })), toTransaction);

export async function getPortfolio(http: AxiosInstance): Promise<Portfolio> {
	const [portfolio, dashboard] = await Promise.all([data<PortfolioDto>(http.get("/portfolio", { params: { historyLimit: 100 } })), data<DashboardDto>(http.get("/dashboard"))]);
	return toPortfolio(portfolio, dashboard);
}

export const getWalletBalances = (http: AxiosInstance) => data<WalletBalancesDto>(http.get("/stellar/balances"));

export const previewPosition = (http: AxiosInstance, body: CreatePositionBody & { depositAmount?: string }) => data<DcaPreviewDto>(http.post("/dca-positions/preview", body));

export const getSettings = (http: AxiosInstance) => data<SettingsDto>(http.get("/settings"));

export const updateSettings = (http: AxiosInstance, body: Partial<Pick<SettingsDto, "defaultSlippageBps" | "mutedNotifications">>) => data<SettingsDto>(http.patch("/settings", body));

export const getNotifications = async (http: AxiosInstance, limit = 20) => (await data<Paginated<NotificationDto>>(http.get("/notifications", { params: { limit } }))).results;

export const getUnreadCount = async (http: AxiosInstance) => (await data<{ unread: number }>(http.get("/notifications/unread-count"))).unread;

export const markAllNotificationsRead = (http: AxiosInstance) => data<{ marked: number }>(http.post("/notifications/read-all"));
