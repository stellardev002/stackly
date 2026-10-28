import type { Position } from "@repo/stellar/vault";
import type { KeeperConfig } from "./config";
import { RetryableError, executeOnChain } from "./executor";
import { log } from "./log";
import type { Store } from "./store";

/** Which interval is due: the contract numbers them from the start timestamp. */
export function intervalIndexOf(position: Position) {
	return Math.floor((position.next_execution_ts - position.start_ts) / position.interval_seconds);
}

/** One pass: find due positions, claim each interval once, submit, record the result. */
export async function tick(config: KeeperConfig, store: Store) {
	const now = Math.floor(Date.now() / 1000);
	const due = await store.duePositions(now);

	for (const position of due) {
		const intervalIndex = intervalIndexOf(position);
		const claimed = await store.claim(position, intervalIndex);
		if (!claimed) continue;

		try {
			const outcome = await executeOnChain(config, position.id, intervalIndex);
			await store.settle(claimed.id, {
				status: "completed",
				tx_hash: outcome.txHash,
				received_amount: outcome.receivedAmount,
				fee: outcome.fee,
				executed_at: new Date().toISOString(),
			});
			log("info", "executed", { position: position.id, interval: intervalIndex, tx: outcome.txHash });
		} catch (error) {
			// TODO(Module 3): on RetryableError, release the claim (status "eligible") until config.maxRetries is reached.
			const retryable = error instanceof RetryableError;
			await store.settle(claimed.id, { status: "failed", failure_reason: (error as Error).message, executed_at: new Date().toISOString() });
			log(retryable ? "warn" : "error", "execution failed", { position: position.id, interval: intervalIndex, error: (error as Error).message });
		}
	}
}
