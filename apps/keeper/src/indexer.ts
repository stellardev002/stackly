import type { KeeperConfig } from "./config";

/**
 * Module 7: indexes the vault contract's events (position created, deposit, executed, failed, paused,
 * resumed, withdrawn) into the database the web app's read API serves, and reconciles each touched
 * position with `get_position` so the cache never drifts from contract state.
 *
 * TODO(Module 7): poll `rpc.Server.getEvents({ filters: [{ type: "contract", contractIds: [config.vaultContractId] }] })`
 * from a stored cursor, decode with `scValToNative`, upsert positions / executions / transactions.
 */
export async function indexOnce(config: KeeperConfig) {
	void config;
}
