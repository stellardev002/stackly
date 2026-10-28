import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { TransactionType, VaultTransaction } from "@repo/stellar/vault";
import { api } from "@/lib/api/client";
import { apiRoutes } from "@/lib/routes";
import { useWalletStore } from "@/features/wallet/store";

export interface TransactionPage {
	items: VaultTransaction[];
	meta: { page: number; limit: number; total: number; total_pages: number };
}

export interface TransactionFilters {
	type?: TransactionType;
	status?: VaultTransaction["status"];
	asset?: string;
	positionId?: string;
	/** ISO dates (inclusive). */
	from?: string;
	to?: string;
	q?: string;
	page?: number;
	limit?: number;
}

/** Screen 9, with the design's filters. Keeps the previous page on screen while the next loads. */
export function useTransactions({ type, status, asset, positionId, from, to, q, page = 1, limit = 10 }: TransactionFilters) {
	const owner = useWalletStore((s) => s.address);
	return useQuery({
		queryKey: ["transactions", owner, type, status, asset, positionId, from, to, q, page, limit],
		queryFn: async () =>
			(await api.get(apiRoutes.TRANSACTIONS, { params: { owner, type, status, asset, position_id: positionId, from, to, q, page, limit } })).data
				.data as TransactionPage,
		enabled: !!owner,
		placeholderData: keepPreviousData,
	});
}
