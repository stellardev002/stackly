import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { TransactionType } from "@repo/stellar/vault";
import { api } from "@/lib/api/client";
import { getHistory } from "@/lib/api/endpoints";
import { useSession } from "@/features/auth/store";

export interface TransactionFilters {
	type?: TransactionType;
	positionId?: string;
	page?: number;
	limit?: number;
}

/** Screen 9: `GET /history` (filters: position and type). Keeps the previous page on screen while the next loads. */
export function useTransactions({ type, positionId, page = 1, limit = 10 }: TransactionFilters) {
	const authed = !!useSession((s) => s.accessToken);
	return useQuery({
		queryKey: ["transactions", type, positionId, page, limit],
		queryFn: () => getHistory(api, { type, positionId, limit, offset: (page - 1) * limit }),
		enabled: authed,
		placeholderData: keepPreviousData,
	});
}
