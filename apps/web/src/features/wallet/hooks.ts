import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { apiRoutes } from "@/lib/routes";
import { useWalletStore } from "@/features/wallet/store";

export interface WalletBalances {
	address: string;
	provider: string;
	/** Stroops. */
	usdc: string;
	xlm: string;
}

/** The connected wallet's balances (PRD Screen 6 "Wallet balance"). */
export function useWalletBalances() {
	const address = useWalletStore((s) => s.address);
	return useQuery({
		queryKey: ["wallet", address],
		queryFn: async () => (await api.get(apiRoutes.WALLET(address!))).data.data as WalletBalances,
		enabled: !!address,
	});
}
