import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CreateVaultValues } from "@/features/vaults/schema";

/**
 * The strategy being configured, carried from Create (Screen 4) to Review (Screen 5). Session storage, so a
 * reload on Review keeps it but a new tab starts clean.
 */
interface DraftState {
	draft: CreateVaultValues | null;
	setDraft: (draft: CreateVaultValues) => void;
	clearDraft: () => void;
}

export const useVaultDraft = create<DraftState>()(
	persist(
		(set) => ({
			draft: null,
			setDraft: (draft) => set({ draft }),
			clearDraft: () => set({ draft: null }),
		}),
		{ name: "stackly-draft", storage: createJSONStorage(() => sessionStorage) },
	),
);
