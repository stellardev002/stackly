import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { getPortfolio } from "@/lib/api/endpoints";
import { useSession } from "@/features/auth/store";

export type { Portfolio } from "@/lib/api/adapters";

/**
 * Screens 3 and 10 (`GET /portfolio` + `GET /dashboard`). Totals are per asset and never summed across assets;
 * there is no market valuation or P/L. `average_price` comes from completed purchases only.
 */
export function usePortfolio() {
	const authed = !!useSession((s) => s.accessToken);
	return useQuery({ queryKey: ["portfolio"], queryFn: () => getPortfolio(api), enabled: authed, refetchInterval: 30_000 });
}
