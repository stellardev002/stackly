import { loadConfig } from "./config";
import { indexOnce } from "./indexer";
import { log } from "./log";
import { tick } from "./scheduler";
import { createStore } from "./store";

/** Index first, so the scheduler acts on fresh state, then execute what is due. One pass at a time. */
async function main() {
	const config = loadConfig();
	const store = createStore(config);
	let stopping = false;

	const stop = () => {
		stopping = true;
		log("info", "stopping after the current pass");
	};
	process.on("SIGINT", stop);
	process.on("SIGTERM", stop);

	log("info", "keeper started", { contract: config.vaultContractId, everyMs: config.pollIntervalMs });
	while (!stopping) {
		try {
			await indexOnce(config);
			await tick(config, store);
		} catch (error) {
			log("error", "pass failed", { error: (error as Error).message });
		}
		await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
	}
}

main().catch((error) => {
	log("error", "keeper crashed", { error: (error as Error).message });
	process.exit(1);
});
