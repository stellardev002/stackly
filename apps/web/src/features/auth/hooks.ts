"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/api/auth";
import { publicApi } from "@/lib/api/client";
import { useSession } from "@/features/auth/store";
import { useWalletStore } from "@/features/wallet/store";

/** Signs out: revokes the refresh token on the backend, forgets the session and the wallet, drops cached data. */
export function useSignOut() {
	const queryClient = useQueryClient();
	return useCallback(async () => {
		const { refreshToken, clear } = useSession.getState();
		if (refreshToken) await logout(publicApi, refreshToken);
		clear();
		useWalletStore.getState().disconnect();
		queryClient.clear();
	}, [queryClient]);
}
