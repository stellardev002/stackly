/**
 * Live end-to-end test against the Stackly backend on Stellar Testnet, using the app's own API layer
 * (src/lib/api: auth, endpoints, flows, adapters) with a fresh Testnet keypair standing in for the wallet.
 * It walks the PRD §19 scenarios: sign-in, create, fund, deposit, sign purchases, activate, a real keeper purchase,
 * pause / resume, withdrawals (and the over-balance refusal), another wallet's access refused, cancel, and the
 * dashboard / portfolio / history / settings / notifications reads.
 *
 *   pnpm --filter web e2e:live            (API_URL overrides https://api.usestackly.app/v1)
 *
 * Uses only Testnet assets: Friendbot XLM, and Testnet USDC bought on the Testnet DEX.
 */
import axios, { type AxiosInstance } from "axios";
import { Asset, BASE_FEE, Horizon, Keypair, Networks, Operation, TransactionBuilder, hash } from "@stellar/stellar-sdk";
import { login } from "../src/lib/api/auth";
import * as api from "../src/lib/api/endpoints";
import * as flows from "../src/lib/api/flows";

const API = process.env.API_URL ?? "https://api.usestackly.app/v1";
const HORIZON = "https://horizon-testnet.stellar.org";
const PASSPHRASE = Networks.TESTNET;
const horizon = new Horizon.Server(HORIZON);

let failures = 0;
const results: string[] = [];
function check(label: string, ok: boolean, detail = "") {
	const line = `${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`;
	console.log(line);
	results.push(line);
	if (!ok) failures++;
}
async function expectStatus(label: string, run: () => Promise<unknown>, status: number) {
	try {
		await run();
		check(label, false, "no error");
	} catch (e) {
		const r = (e as { response?: { status?: number; data?: { message?: string } } }).response;
		check(label, r?.status === status, `${r?.status} ${r?.data?.message ?? (e as Error).message}`);
	}
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A Testnet wallet: Friendbot-funded keypair that signs like Freighter (SEP-53 messages, XDR transactions). */
async function newWallet() {
	const kp = Keypair.random();
	const fb = await fetch(`https://friendbot.stellar.org?addr=${kp.publicKey()}`);
	if (!fb.ok) throw new Error(`Friendbot failed: ${fb.status}`);
	const signer: flows.Signer = {
		address: kp.publicKey(),
		sign: async (xdr, passphrase) => {
			const tx = TransactionBuilder.fromXDR(xdr, passphrase);
			tx.sign(kp);
			return tx.toXDR();
		},
	};
	const signMessage = async (message: string) => kp.sign(hash(Buffer.from(`Stellar Signed Message:\n${message}`))).toString("base64");
	return { kp, signer, signMessage };
}

function client(token: string): AxiosInstance {
	return axios.create({ baseURL: API, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
}

async function main() {
	console.log(`Live E2E against ${API}\n`);
	const publicApi = axios.create({ baseURL: API, headers: { "Content-Type": "application/json" } });

	// 1. Sign in with a wallet signature.
	const w = await newWallet();
	const tokens = await login(publicApi, w.kp.publicKey(), w.signMessage);
	check("1  wallet sign-in (challenge → signMessage → JWT)", !!tokens.accessToken && !!tokens.refreshToken, `expires in ${tokens.expiresIn}s`);
	const http = client(tokens.accessToken);

	const assets = await api.getAssets(http);
	const usdc = assets.find((a) => a.code === "USDC")!;
	const xlm = assets.find((a) => a.code === "XLM")!;
	check("   supported assets listed", !!usdc && !!xlm, assets.map((a) => a.code).join(", "));

	const settings = await api.getSettings(http);
	check("   settings readable", typeof settings.defaultSlippageBps === "number", `default slippage ${settings.defaultSlippageBps} bps`);

	// 2–3. Preview, then create a daily 5 USDC position starting in ~1 minute.
	const body = { sourceAssetId: usdc.id, targetAssetId: xlm.id, amountPerPurchase: "5", frequency: "daily" as const, startAt: new Date(Date.now() + 60_000).toISOString(), maxSlippageBps: 100 };
	const preview = await api.previewPosition(http, { ...body, depositAmount: "20" });
	check("3  preview: purchase estimate + live quote + fees", preview.estimatedPurchases === 4 && !!preview.quote && !!preview.fees, `${preview.estimatedPurchases} purchases, ≈${preview.quote?.expectedReceiveAmount} XLM each`);
	await expectStatus("   zero purchase amount rejected", () => flows.createPosition(http, { ...body, amountPerPurchase: "0" }), 400);
	const { position, account } = await flows.createPosition(http, body);
	check("2  position created (pending) with its own account", position.status === "pending" && account.ready, `${position.name}, account ${account.address.slice(0, 6)}…`);

	// Fund the wallet: USDC trustline (app flow), then buy 30 Testnet USDC on the Testnet DEX.
	await flows.addTrustline(w.signer, usdc, PASSPHRASE);
	const src = await horizon.loadAccount(w.kp.publicKey());
	const buy = new TransactionBuilder(src, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
		.addOperation(Operation.pathPaymentStrictReceive({ sendAsset: Asset.native(), sendMax: "1000", destination: w.kp.publicKey(), destAsset: new Asset(usdc.code, usdc.issuer), destAmount: "30", path: [] }))
		.setTimeout(120)
		.build();
	buy.sign(w.kp);
	await horizon.submitTransaction(buy);
	const wallet = await api.getWalletBalances(http);
	check("   wallet funded: trustline + 30 USDC", wallet.funded && wallet.balances.some((b) => b.code === "USDC" && Number(b.balance) >= 30));

	// 4–5. Deposit 20 USDC into the position account.
	const depositHash = await flows.deposit(http, w.signer, position, account, "20", PASSPHRASE);
	let p = await api.getPosition(http, position.id);
	check("4  deposit signed, submitted and booked", p.total_deposited === "200000000" && p.available_source === "200000000", `tx ${depositHash.slice(0, 10)}…`);
	check("5  vault balance updated", p.source_balance === "200000000");

	// Sign 4 purchases, then activate.
	const authHash = await flows.authorize(http, w.signer, position.id, 4);
	p = await api.getPosition(http, position.id);
	check("   4 purchases pre-authorized (signed batch)", p.authorizations_remaining === 4, `tx ${authHash.slice(0, 10)}…`);
	const active = await flows.activate(http, position.id);
	check("   activated", active.status === "active");

	// 6–11. The keeper finds the due purchase, the network validates the pre-signed swap, the vault updates.
	let executions = await api.getPositionExecutions(http, position.id);
	const deadline = Date.now() + 4 * 60_000;
	while (!executions.some((e) => e.status === "completed" || e.status === "failed" || e.status === "skipped") && Date.now() < deadline) {
		await sleep(10_000);
		executions = await api.getPositionExecutions(http, position.id);
	}
	const first = executions.find((e) => e.status !== "submitted");
	check("6–9  keeper executed the due purchase on the DEX", first?.status === "completed", first ? `${first.status} ${first.received_amount ? `→ ${Number(first.received_amount) / 1e7} XLM` : (first.failure_reason ?? "")}` : "timed out after 4 min");
	p = await api.getPosition(http, position.id);
	check("10  purchased XLM balance updated", BigInt(p.target_balance) > 0n && p.total_spent === "50000000", `spent 5 USDC, holds ${Number(p.target_balance) / 1e7} XLM`);
	const execution = first ? await api.getExecution(http, first.id) : null;
	check("8  execution detail: price, slippage within limit, hash", !!execution?.tx_hash && (execution.slippage_bps ?? 999) <= 100, execution ? `price ${execution.execution_price}, slippage ${execution.slippage_bps} bps` : "");
	const history = await api.getHistory(http, { positionId: position.id });
	check("11  history shows deposit and swap", history.items.some((t) => t.type === "swap") && history.items.some((t) => t.type === "deposit"), history.items.map((t) => t.type).join(", "));

	// 12–13. Early / duplicate execution: the next signed purchase isn't valid before tomorrow; still one attempt.
	await sleep(15_000);
	executions = await api.getPositionExecutions(http, position.id);
	check("12–13  no early or duplicate execution", executions.length === 1 && p.next_execution_ts * 1000 > Date.now(), `next ${new Date(p.next_execution_ts * 1000).toISOString()}`);

	// 16–18. Pause and resume.
	check("16  paused", (await flows.pause(http, position.id)).status === "paused");
	await expectStatus("   pausing twice refused", () => flows.pause(http, position.id), 409);
	check("18  resumed", (await flows.resume(http, position.id)).status === "active");

	// 14 / 19–20. Withdrawals: over-balance refused, partial USDC and all XLM withdrawn, another wallet refused.
	await expectStatus("14  withdrawal above available balance refused", () => flows.withdraw(http, w.signer, position.id, usdc, "1000"), 409);
	const w2 = await newWallet();
	const http2 = client((await login(publicApi, w2.kp.publicKey(), w2.signMessage)).accessToken);
	await expectStatus("20  another wallet can't read the position", () => api.getPosition(http2, position.id), 404);
	await expectStatus("20  another wallet can't withdraw from it", () => flows.withdraw(http2, w2.signer, position.id, usdc, "1"), 404);
	const before = BigInt((await api.getPosition(http, position.id)).available_source);
	await flows.withdraw(http, w.signer, position.id, usdc, "5");
	p = await api.getPosition(http, position.id);
	check("19  withdrew 5 USDC to the wallet", BigInt(p.available_source) === before - 50_000_000n, `available ${Number(p.available_source) / 1e7} USDC`);
	const xlmHeld = (Number(p.available_target) / 1e7).toFixed(7);
	await flows.withdraw(http, w.signer, position.id, xlm, xlmHeld);
	p = await api.getPosition(http, position.id);
	check("19  withdrew the purchased XLM", p.available_target === "0", `${xlmHeld} XLM`);

	// Reads the screens use.
	const portfolio = await api.getPortfolio(http);
	check("   portfolio: per-asset totals, avg price, purchase series", portfolio.purchase_count === 1 && !!portfolio.average_price && portfolio.series.length === 1, `avg ${portfolio.average_price} USDC/XLM`);
	check("   dashboard counts", portfolio.counts?.active === 1, JSON.stringify(portfolio.counts));
	const updated = await api.updateSettings(http, { defaultSlippageBps: 75, mutedNotifications: ["deposit_confirmed"] });
	check("   settings saved", updated.defaultSlippageBps === 75 && updated.mutedNotifications.includes("deposit_confirmed"));
	const notifications = await api.getNotifications(http);
	check("   notifications inbox", Array.isArray(notifications), `${notifications.length}: ${notifications.map((n) => n.event).join(", ")}`);

	// 21. Cancel: final, and accounting stays consistent.
	check("   cancelled", (await flows.cancel(http, position.id)).status === "cancelled");
	await expectStatus("   resuming a cancelled position refused", () => flows.resume(http, position.id), 409);
	p = await api.getPosition(http, position.id);
	check("21  accounting consistent after everything", BigInt(p.total_deposited) - BigInt(p.total_spent) - BigInt(p.total_withdrawn) === BigInt(p.source_balance), `deposited ${Number(p.total_deposited) / 1e7}, spent ${Number(p.total_spent) / 1e7}, withdrawn ${Number(p.total_withdrawn) / 1e7}, left ${Number(p.source_balance) / 1e7}`);

	console.log(`\nWallet ${w.kp.publicKey()}\nPosition ${position.id}\n${failures ? `${failures} FAILED` : "All checks passed"}`);
	process.exit(failures ? 1 : 0);
}

main().catch((error) => {
	console.error("E2E aborted:", error?.response?.data ?? error);
	process.exit(1);
});
