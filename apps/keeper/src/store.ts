import { createClient } from "@supabase/supabase-js";
import type { Execution, Position } from "@repo/stellar/vault";
import type { KeeperConfig } from "./config";

/**
 * The keeper's view of the indexer database (supabase/migrations). The contract is the source of truth;
 * these rows are a cache the indexer keeps reconciled with contract state, plus the keeper's own
 * submission log. `executions (position_id, interval_index)` is unique: that is the keeper's idempotency key.
 */
export function createStore(config: KeeperConfig) {
	const db = createClient(config.supabaseUrl, config.supabaseKey, { auth: { persistSession: false } });

	return {
		/** Active positions whose next interval is due. The contract re-checks all of this on execute. */
		async duePositions(nowTs: number) {
			const { data, error } = await db.from("positions").select("*").eq("status", "active").lte("next_execution_ts", nowTs);
			if (error) throw error;
			return data as Position[];
		},

		/**
		 * Claims one interval before submitting. Returns null when another run already claimed it, so the
		 * same interval is never submitted twice (the contract rejects duplicates independently).
		 */
		async claim(position: Position, intervalIndex: number) {
			const { data, error } = await db
				.from("executions")
				.insert({
					position_id: position.id,
					interval_index: intervalIndex,
					source_amount: position.purchase_amount,
					status: "submitted",
					scheduled_at: new Date(position.next_execution_ts * 1000).toISOString(),
				})
				.select()
				.single();
			if (error?.code === "23505") return null; // unique violation: already claimed
			if (error) throw error;
			return data as Execution;
		},

		async settle(id: string, patch: Partial<Execution>) {
			const { error } = await db.from("executions").update(patch).eq("id", id);
			if (error) throw error;
		},
	};
}

export type Store = ReturnType<typeof createStore>;
