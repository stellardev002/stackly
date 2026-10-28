"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Field, PillInput } from "@repo/ui/field";
import { Skeleton } from "@repo/ui/skeleton";
import { Chip, DetailRow, Notice, Panel, PanelHeader } from "@repo/ui/surface";
import { everyLabel, money, utcDateTime } from "@/lib/format";
import { vaultRoutes } from "@/lib/routes";
import { explorer, fromStroops, shortKey, toStroops } from "@/lib/stellar/config";
import { useToast } from "@/lib/use-toast";
import { ExplorerButton, HashText, explorerAction } from "@/components/ExplorerButton";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, SkeletonLines } from "@/components/states";
import { TxProgress } from "@/components/TxProgress";
import { usePreferences } from "@/features/settings/store";
import { useWalletBalances } from "@/features/wallet/hooks";
import { useWalletStore } from "@/features/wallet/store";
import { vaultClient } from "@/features/vaults/client";
import { usePosition, useVaultTx } from "@/features/vaults/hooks";
import { amountSchema } from "@/features/vaults/schema";
import { VaultNotFound } from "@/features/vaults/components/VaultNotFound";
import { VaultSteps } from "@/features/vaults/components/VaultSteps";

/** Screen 6 (Figma 28:12298 + Loading / Empty / Error / Validation), plus the confirmed state the design lacked. */
export function DepositFunds({ vaultId, flow, initialAmount }: { vaultId: string; flow: boolean; initialAmount?: string }) {
	const router = useRouter();
	const toast = useToast();
	const owner = useWalletStore((s) => s.address);
	const openExplorer = usePreferences((s) => s.openExplorer);
	const position = usePosition(vaultId);
	const wallet = useWalletBalances();
	const deposit = useVaultTx();
	const activate = useVaultTx();
	const [amount, setAmount] = useState(initialAmount ?? "");
	const [touched, setTouched] = useState(false);

	const header = (
		<>
			<PageHeader
				title="Deposit funds"
				subtitle={flow ? "Fund your new vault. Purchases start once you start the schedule." : position.data ? `${position.data.name} · ${position.data.id}` : "Add USDC to your vault"}
			/>
			{flow && <VaultSteps current={2} />}
		</>
	);

	if (position.isError || wallet.isError) {
		const notFound = (position.error as { response?: { status?: number } } | null)?.response?.status === 404;
		return (
			<>
				{header}
				{notFound ? <VaultNotFound /> : <ErrorState error={position.error ?? wallet.error} onRetry={() => void Promise.all([position.refetch(), wallet.refetch()])} />}
			</>
		);
	}

	if (position.isPending || wallet.isPending) {
		return (
			<>
				{header}
				<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,576px)]" aria-busy="true">
					<Panel className="flex flex-col gap-5">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-[52px] w-full" />
						<SkeletonLines rows={4} />
						<p className="caption flex items-center gap-2">Loading wallet balance and vault details…</p>
					</Panel>
					<Panel>
						<SkeletonLines rows={4} />
					</Panel>
				</div>
			</>
		);
	}

	const p = position.data;
	const walletUsdc = Number(fromStroops(wallet.data.usdc));
	const parsed = amountSchema(walletUsdc, `Your wallet holds ${money(wallet.data.usdc, p.source_asset)}. Enter that amount or less.`).safeParse({ amount });
	const fieldError = touched && !parsed.success ? parsed.error.issues[0]?.message : undefined;
	const value = parsed.success ? toStroops(amount) : 0n;
	const after = BigInt(p.source_balance) + value;
	const extra = value / BigInt(p.purchase_amount);
	const label = parsed.success ? money(value, p.source_asset) : "USDC";

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		setTouched(true);
		if (!parsed.success) return;
		const res = await deposit.run((opts) => vaultClient.deposit(p.id, value.toString(), opts));
		if (res) {
			toast.success(`Deposit confirmed: ${money(value, p.source_asset)}`, {
				description: `${res.transaction?.id} · vault balance ${money(res.position.source_balance, p.source_asset)}`,
				action: explorerAction(res.txHash),
			});
			if (openExplorer && res.transaction?.tx_hash && !res.transaction.tx_hash.startsWith("demo")) window.open(explorer.tx(res.transaction.tx_hash), "_blank", "noopener");
		}
	};

	const start = async () => {
		const res = await activate.run((opts) => vaultClient.activate(p.id, opts));
		if (res) {
			toast.success("Schedule started", { description: `First purchase eligible ${utcDateTime(res.position.next_execution_ts * 1000)}.`, action: explorerAction(res.txHash) });
			router.push(vaultRoutes.VAULT(p.id));
		}
	};

	const confirmed = deposit.stage === "confirmed" && deposit.result;
	const needsStart = (deposit.result?.position.status ?? p.status) === "created";

	return (
		<>
			{header}
			<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,576px)]">
				<div className="flex min-w-0 flex-col gap-4">
					{confirmed ? (
						<Panel className="animate-pop" aria-live="polite">
							<div className="flex items-center gap-4">
								<span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-coral text-white">
									<svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
										<path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="animate-check" />
									</svg>
								</span>
								<div>
									<p className="h-card">Deposit confirmed</p>
									<p className="caption mt-1">Confirmed on Stellar Testnet · {deposit.result!.transaction ? utcDateTime(deposit.result!.transaction.created_at) : "just now"}</p>
								</div>
							</div>
							<p className="stat-value mt-6">{money(deposit.result!.transaction?.amount ?? value, p.source_asset)}</p>
							<dl className="mt-6 flex flex-col gap-3">
								<DetailRow label="Vault balance" value={money(deposit.result!.position.source_balance, p.source_asset)} />
								<DetailRow label="Funded purchases" value={`${Number(BigInt(deposit.result!.position.source_balance) / BigInt(p.purchase_amount))} × ${money(p.purchase_amount, p.source_asset)}`} />
								<DetailRow label="Transaction" value={deposit.result!.transaction?.id ?? "—"} />
								{deposit.result!.transaction?.tx_hash && <DetailRow label="Hash" value={<HashText hash={deposit.result!.transaction.tx_hash} />} />}
							</dl>
							{needsStart && activate.stage !== "idle" && <TxProgress stage={activate.stage} className="mt-6" />}
							{needsStart && (activate.stage === "rejected" || activate.stage === "failed") && (
								<Notice tone="error" title={activate.stage === "rejected" ? "Start declined" : "The schedule didn't start"} className="animate-pop mt-4">
									{activate.stage === "rejected" ? "You declined in your wallet. Your deposit is safe in the vault; start the schedule whenever you're ready." : activate.error}
								</Notice>
							)}
							<div className="mt-6 flex flex-wrap gap-3">
								{needsStart ? (
									<Button onClick={start} isLoading={activate.busy} loadingText={activate.stage === "signing" ? "Waiting for wallet…" : "Starting…"}>
										<Play /> Start schedule
									</Button>
								) : (
									<Button asChild>
										<Link href={vaultRoutes.VAULT(p.id)}>
											Back to position <ArrowRight />
										</Link>
									</Button>
								)}
								<ExplorerButton hash={deposit.result!.transaction?.tx_hash ?? null} label="View on Stellar Explorer" />
								{!needsStart && (
									<Button
										variant="ghost"
										onClick={() => {
											deposit.reset();
											setAmount("");
											setTouched(false);
										}}
									>
										Deposit more
									</Button>
								)}
							</div>
							{needsStart && <p className="caption mt-3">Starting the schedule is a separate wallet signature. Until then, no purchase runs.</p>}
						</Panel>
					) : (
						<>
							<Notice tone="info" title="Wallet authorization required" className="animate-rise">
								Stackly cannot move funds without your approval. Keep Testnet XLM in your wallet to pay network fees, shown by your wallet before signing.
							</Notice>
							{(deposit.stage === "rejected" || deposit.stage === "failed") && (
								<Notice tone="error" title={deposit.stage === "rejected" ? "Deposit declined" : "Deposit failed"} className="animate-pop" action={<Chip tone="neutral">Not submitted</Chip>}>
									{deposit.stage === "rejected"
										? `You declined the ${label} deposit in your wallet. Nothing was submitted and no funds moved. Your amount is saved below.`
										: `${deposit.error} Your vault balance changes only after confirmation.`}
								</Notice>
							)}
							<form onSubmit={submit} noValidate>
								<Panel className="animate-rise flex flex-col gap-5" style={{ "--i": 1 } as React.CSSProperties}>
									<PanelHeader title={`Deposit ${p.source_asset.split(":")[0]}`} />
									<Chip tone="soft" className="w-fit">
										USDC · Stellar Testnet
									</Chip>
									<Field label="Amount to deposit" htmlFor="amount" error={fieldError}>
										<PillInput
											id="amount"
											inputMode="decimal"
											autoComplete="off"
											placeholder="0.00"
											value={amount}
											onChange={(e) => setAmount(e.target.value)}
											onBlur={() => setTouched(true)}
											invalid={!!fieldError}
											disabled={deposit.busy}
											trailing={
												<button type="button" className="cursor-pointer rounded-full bg-blush px-2.5 py-1 text-xs text-ink" onClick={() => {
													setAmount(fromStroops(wallet.data.usdc));
													setTouched(true);
												}} disabled={deposit.busy}>
													Max
												</button>
											}
											className="h-14 text-xl"
										/>
									</Field>
									<dl className="flex flex-col gap-3">
										<DetailRow label="Wallet balance" value={money(wallet.data.usdc, p.source_asset)} />
										<DetailRow label="Current vault balance" value={money(p.source_balance, p.source_asset)} />
									</dl>
									<dl className="flex flex-col gap-3 border-t border-line pt-5">
										<DetailRow label="Vault balance after deposit" value={money(after, p.source_asset)} />
										<DetailRow label="Additional funded purchases" value={extra > 0n ? `${extra} × ${money(p.purchase_amount, p.source_asset)}` : "—"} />
									</dl>
									{deposit.busy ? (
										<TxProgress stage={deposit.stage} className="mt-1" />
									) : (
										<Button type="submit" className="w-full sm:w-fit">
											{deposit.stage === "rejected" || deposit.stage === "failed" ? "Try again" : `Deposit ${label}`}
										</Button>
									)}
								</Panel>
							</form>
						</>
					)}
				</div>

				<aside className="flex min-w-0 flex-col gap-4">
					<Panel className="animate-rise" style={{ "--i": 2 } as React.CSSProperties}>
						<PanelHeader title="Where your funds go" />
						<dl className="mt-5 flex flex-col gap-4">
							<DetailRow label="Destination vault" value={p.id} />
							<DetailRow label="Strategy" value={`${money(p.purchase_amount, p.source_asset)} · ${everyLabel(p.interval_seconds).toLowerCase()}`} />
							<DetailRow label="Owner wallet" value={<span className="font-mono">{owner ? shortKey(owner) : "—"}</span>} />
							<DetailRow label="Network" value="Stellar Testnet" />
						</dl>
						<p className="caption mt-5">Deposited USDC stays available in your vault until a purchase executes. You can withdraw available funds with your wallet signature.</p>
					</Panel>
					<Panel className="animate-rise" style={{ "--i": 3 } as React.CSSProperties}>
						<PanelHeader title="Before you approve" />
						<p className="mt-4 text-base font-light text-muted">Check the asset, amount and Testnet network in your wallet. A rejected or failed transaction does not change your vault balance.</p>
					</Panel>
				</aside>
			</div>
		</>
	);
}
