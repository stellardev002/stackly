"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, logout } from "@/lib/api/endpoints";
import { useSession } from "@/features/auth/store";
import { disconnectWallet } from "@/features/wallet/kit";

/** The signed-in wallet's profile; `role` decides whether the admin opens. */
export function useMe(enabled: boolean) {
	return useQuery({ queryKey: ["me"], queryFn: () => getMe(), enabled, staleTime: 5 * 60_000, retry: 1 });
}

/** Revokes the refresh token, forgets the session and the wallet connection, drops cached data. */
export function useSignOut() {
	const queryClient = useQueryClient();
	return useCallback(async () => {
		const { refreshToken, clear } = useSession.getState();
		if (refreshToken) await logout(refreshToken);
		clear();
		void disconnectWallet();
		queryClient.clear();
	}, [queryClient]);
}
