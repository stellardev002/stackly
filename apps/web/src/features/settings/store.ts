import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Screen 12 preferences. Stored in this browser only: the PRD has no notification backend, so notifications
 * are in-app toasts (design gap #20).
 */
export interface Preferences {
	/** Percent, pre-fills "Maximum slippage" on Create. */
	defaultSlippage: string;
	notifyPurchases: boolean;
	notifyAttention: boolean;
	notifyFunding: boolean;
	/** Show the review summary before asking the wallet to sign a withdrawal. */
	reviewBeforeSign: boolean;
	/** Open Stellar Explorer in a new tab after a confirmed transaction. */
	openExplorer: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
	defaultSlippage: "0.50",
	notifyPurchases: true,
	notifyAttention: true,
	notifyFunding: true,
	reviewBeforeSign: true,
	openExplorer: false,
};

export const usePreferences = create<Preferences & { save: (next: Preferences) => void }>()(
	persist(
		(set) => ({
			...DEFAULT_PREFERENCES,
			save: (next) => set(next),
		}),
		{ name: "stackly-preferences" },
	),
);
