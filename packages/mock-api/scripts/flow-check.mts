// End-to-end check of the mock simulation (no browser): the PRD's core flow and its rejection paths.
// Run: pnpm --filter @repo/mock-api check:flow
import axios from "axios";
import { mockAdapter } from "../src/adapter";
import * as sim from "../src/sim";

const api = axios.create({ baseURL: "/api/v1", adapter: mockAdapter });
const fresh = "GDFRESHSTACKLYDEMOWALLETK4NOVAULTYETX7HM2QPLW3RJTEST5EM5H";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (label: string, ok: boolean, detail = "") => {
	console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
	if (!ok) failures++;
};
const expectError = async (label: string, run: () => Promise<unknown>, status: number) => {
	try {
		await run();
		check(label, false, "no error");
	} catch (e) {
		const s = (e as { response?: { status?: number; data?: { message?: string } } }).response;
		check(label, s?.status === status, `${s?.status} ${s?.data?.message}`);
	}
};

sim.resetMockDb();
const seeded = (await api.get("/portfolio", { params: { owner: sim.demoAddress() } })).data.data;
check("seed matches the design story", seeded.total_deposited === "10000000000" && seeded.target_balance === "8000000000" && seeded.purchase_count === 4, JSON.stringify({ d: seeded.total_deposited, x: seeded.target_balance, n: seeded.purchase_count }));

// 2–3. Create a position (fresh wallet), then 4–5. deposit.
const created = (await api.post("/positions", { owner: fresh, name: "Test stack", source_asset: "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5", target_asset: "XLM", purchase_amount: "100000000", interval_seconds: 86400, start_ts: 0, end_ts: null, max_slippage_bps: 50 })).data.data;
check("create position", created.id === "STK-002" && created.status === "created", created.id);
await expectError("zero purchase amount rejected", () => api.post("/positions", { owner: fresh, purchase_amount: "0", interval_seconds: 86400, max_slippage_bps: 50 }), 400);
await expectError("deposit over wallet balance rejected", () => api.post(`/positions/${created.id}/deposit`, { owner: fresh, amount: "99990000000" }), 400);
const dep = (await api.post(`/positions/${created.id}/deposit`, { owner: fresh, amount: "250000000" })).data.data;
check("deposit updates vault balance", dep.position.source_balance === "250000000" && dep.transaction.id.startsWith("DP-"), dep.transaction.id);
await expectError("unauthorized deposit rejected", () => api.post(`/positions/${created.id}/deposit`, { owner: sim.demoAddress(), amount: "1" }), 403);

// Activate, then 6–10. keeper executes a due interval.
await api.post(`/positions/${created.id}/activate`, { owner: fresh });
sim.skipToNextPurchase();
let execs = (await api.get(`/positions/${created.id}/executions`)).data.data;
check("keeper submits the due interval", execs[0]?.status === "submitted", execs[0]?.status);
await wait(4200);
execs = (await api.get(`/positions/${created.id}/executions`)).data.data;
let pos = (await api.get(`/positions/${created.id}`)).data.data;
check("swap completes and credits XLM", execs[0]?.status === "completed" && BigInt(pos.target_balance) > 0n && pos.source_balance === "150000000", `${execs[0]?.status} xlm=${pos.target_balance} usdc=${pos.source_balance}`);
const history = (await api.get("/transactions", { params: { owner: fresh } })).data.data.items;
check("history shows the swap", history.some((t: { type: string }) => t.type === "swap"));

// 12–13. Early and duplicate execution: nothing new before the next interval.
const before = execs.length;
await api.get("/clock");
execs = (await api.get(`/positions/${created.id}/executions`)).data.data;
check("no early / duplicate execution", execs.length === before, `${execs.length}`);

// 15. Excessive slippage rejected, balances untouched; retry completes.
sim.setSim({ next_swap: "slippage" });
sim.skipToNextPurchase();
execs = (await api.get(`/positions/${created.id}/executions`)).data.data;
pos = (await api.get(`/positions/${created.id}`)).data.data;
check("slippage failure moves nothing", execs[0]?.status === "failed" && execs[0]?.tx_hash === null && pos.source_balance === "150000000", `${execs[0]?.id} ${execs[0]?.status}`);
await wait(8200);
await api.get("/clock");
await wait(4200);
execs = (await api.get(`/positions/${created.id}/executions`)).data.data;
check("keeper retry completes the interval", execs[0]?.status === "completed" && execs[0]?.attempt === 2, `${execs[0]?.id} attempt ${execs[0]?.attempt}`);

// 16–18. Pause blocks execution; resume restores it.
await api.post(`/positions/${created.id}/pause`, { owner: fresh });
const pausedCount = (await api.get(`/positions/${created.id}/executions`)).data.data.length;
sim.advanceClock(3 * 86400_000);
await api.get("/clock");
check("paused position is not executed", (await api.get(`/positions/${created.id}/executions`)).data.data.length === pausedCount);
await api.post(`/positions/${created.id}/resume`, { owner: fresh });
pos = (await api.get(`/positions/${created.id}`)).data.data;
check("resume schedules the next interval no earlier than now", pos.status === "active" && pos.next_execution_ts * 1000 >= sim.demoNow() - 60_000);

// 14. Insufficient balance: 50 USDC left for a 100 USDC purchase → interval skipped, nothing deducted.
const remaining = pos.source_balance;
sim.skipToNextPurchase();
execs = (await api.get(`/positions/${created.id}/executions`)).data.data;
pos = (await api.get(`/positions/${created.id}`)).data.data;
check("insufficient balance skips the interval", remaining === "50000000" && execs[0]?.status === "skipped" && pos.source_balance === remaining, `${execs[0]?.status} balance=${pos.source_balance}`);

// 19–20. Withdraw available funds; over-withdrawal and wrong owner rejected.
await expectError("withdrawal above balance rejected", () => api.post(`/positions/${created.id}/withdraw`, { owner: fresh, asset: "target", amount: "999999999999" }), 400);
await expectError("unauthorized withdrawal rejected", () => api.post(`/positions/${created.id}/withdraw`, { owner: sim.demoAddress(), asset: "target", amount: "1" }), 403);
const wd = (await api.post(`/positions/${created.id}/withdraw`, { owner: fresh, asset: "target", amount: pos.target_balance })).data.data;
check("withdraw available XLM", wd.position.target_balance === "0" && wd.transaction.id.startsWith("WD-"), wd.transaction.id);

// Wallet rejection simulation.
sim.setSim({ next_wallet: "reject" });
try {
	await sim.simulateWalletApproval(10);
	check("wallet rejection simulated", false);
} catch (e) {
	check("wallet rejection simulated", (e as Error).name === "WalletRejectedError");
}
check("rejection applies once", sim.getSim().next_wallet === "approve");

console.log(failures ? `\n${failures} FAILED` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
