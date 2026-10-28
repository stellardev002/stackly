import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Preferences that only affect this browser. Default slippage and notification muting live on the backend
 * (`GET/PATCH /settings`, features/settings/hooks.ts).
 */
export interface LocalPreferences {
	/** Show the review summary before asking the wallet to sign a withdrawal. */
	reviewBeforeSign: boolean;
	/** Open Stellar Explorer in a new tab after a confirmed transaction. */
	openExplorer: boolean;
}

export const DEFAULT_PREFERENCES: LocalPreferences = { reviewBeforeSign: true, openExplorer: false };

export const usePreferences = create<LocalPreferences & { save: (next: LocalPreferences) => void }>()(
	persist(
		(set) => ({
			...DEFAULT_PREFERENCES,
			save: (next) => set(next),
		}),
		{ name: "stackly-preferences" },
	),
);
