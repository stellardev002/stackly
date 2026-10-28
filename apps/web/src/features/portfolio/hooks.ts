import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { apiRoutes } from "@/lib/routes";
import { useWalletStore } from "@/features/wallet/store";

/**
 * Screen 10. Totals are per asset and never summed across assets; there is no market valuation or P/L
 * until a reliable price source exists (PRD §15). `average_price` comes from executed swaps only.
 */
export interface Portfolio {
	total_deposited: string;
	total_spent: string;
	source_balance: string;
	target_balance: string;
	purchase_count: number;
	average_price: string | null;
	series: { at: string; received: string; cumulative: string }[];
}

export function usePortfolio() {
	const owner = useWalletStore((s) => s.address);
	return useQuery({
		queryKey: ["portfolio", owner],
		queryFn: async () => (await api.get(apiRoutes.PORTFOLIO, { params: { owner } })).data.data as Portfolio,
		enabled: !!owner,
	});
}
