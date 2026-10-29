import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthTokens } from "@/lib/api/dto";

/**
 * The admin's backend session, signed in with their wallet. Kept under its own key: on Vercel the admin shares an
 * origin with the app (`/admin` and `/app`), and signing in here must not replace the app's session.
 */
interface SessionState {
	address: string | null;
	walletId: string | null;
	accessToken: string | null;
	refreshToken: string | null;
	setTokens: (address: string, tokens: AuthTokens) => void;
	setWallet: (walletId: string) => void;
	clear: () => void;
}

export const useSession = create<SessionState>()(
	persist(
		(set) => ({
			address: null,
			walletId: null,
			accessToken: null,
			refreshToken: null,
			setTokens: (address, tokens) => set({ address, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
			setWallet: (walletId) => set({ walletId }),
			clear: () => set({ address: null, accessToken: null, refreshToken: null }),
		}),
		{ name: "stackly-admin-session" },
	),
);
