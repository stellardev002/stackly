import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WalletState {
	/** The connected Stellar account (G…). Never a secret: Stackly never sees private keys (PRD §17). */
	address: string | null;
	/** Stellar Wallets Kit module id ("freighter", "wallet_connect", "xbull"). */
	walletId: string | null;
	setConnected: (address: string, walletId: string) => void;
	disconnect: () => void;
}

/** Only the address and wallet choice persist, so a reload reconnects to the same wallet. */
export const useWalletStore = create<WalletState>()(
	persist(
		(set) => ({
			address: null,
			walletId: null,
			setConnected: (address, walletId) => set({ address, walletId }),
			disconnect: () => set({ address: null, walletId: null }),
		}),
		{ name: "stackly-wallet" },
	),
);
