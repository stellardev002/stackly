import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { getWalletBalances } from "@/lib/api/endpoints";
import { useSession } from "@/features/auth/store";
import { decimalToStroops } from "@repo/stellar/format";

export interface WalletBalances {
	address: string;
	/** False until the account exists on Testnet (Friendbot). */
	funded: boolean;
	/** Stroops. Null when the wallet has no trustline for that asset. */
	usdc: string | null;
	xlm: string;
}

/** The connected wallet's on-chain balances (`GET /stellar/balances`, PRD Screen 6 "Wallet balance"). */
export function useWalletBalances() {
	const token = useSession((s) => s.accessToken);
	return useQuery({
		queryKey: ["wallet", token ? "session" : "none"],
		queryFn: async (): Promise<WalletBalances> => {
			const b = await getWalletBalances(api);
			const find = (code: string) => b.balances.find((x) => x.code === code);
			const usdc = find("USDC");
			return { address: b.address, funded: b.funded, usdc: usdc ? decimalToStroops(usdc.balance) : null, xlm: decimalToStroops(find("XLM")?.balance ?? "0") };
		},
		enabled: !!token,
	});
}
