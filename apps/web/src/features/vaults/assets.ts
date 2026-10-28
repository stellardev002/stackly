import { useQuery } from "@tanstack/react-query";
import type { AssetRef } from "@repo/stellar/vault";
import { api } from "@/lib/api/client";
import { getAssets } from "@/lib/api/endpoints";
import { useSession } from "@/features/auth/store";

/** Supported assets from the backend (`GET /assets`); their ids are what create requests take. */
export function useAssets() {
	const authed = !!useSession((s) => s.accessToken);
	return useQuery({
		queryKey: ["assets"],
		queryFn: async () => {
			const list: AssetRef[] = await getAssets(api);
			return { all: list, usdc: list.find((a) => a.code === "USDC"), xlm: list.find((a) => a.code === "XLM") };
		},
		enabled: authed,
		staleTime: 60 * 60_000,
	});
}
