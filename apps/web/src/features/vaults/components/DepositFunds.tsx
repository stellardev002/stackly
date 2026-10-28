"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, PenLine, Plus } from "lucide-react";
import type { Position, PositionAccount } from "@repo/stellar/vault";
import { Button } from "@repo/ui/button";
import { Field, PillInput } from "@repo/ui/field";
import { Skeleton } from "@repo/ui/skeleton";
import { Chip, DetailRow, Notice, Panel, PanelHeader } from "@repo/ui/surface";
import { httpStatus } from "@/lib/api/errors";
import { everyLabel, money, utcDateTime } from "@/lib/format";
import { vaultRoutes } from "@/lib/routes";
import { explorer, fromStroops, shortKey, toStroops } from "@/lib/stellar/config";
import { useToast } from "@/lib/use-toast";
import { ExplorerButton, explorerAction } from "@/components/ExplorerButton";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, SkeletonLines } from "@/components/states";
import { TxProgress } from "@/components/TxProgress";
import { usePreferences } from "@/features/settings/store";
import { useWalletBalances, type WalletBalances } from "@/features/wallet/hooks";
import { useWalletStore } from "@/features/wallet/store";
import { FundTestnetButton } from "@/features/wallet/components/FundTestnetButton";
import { vaultClient } from "@/features/vaults/client";
import { usePosition, usePositionAccount, useVaultTx } from "@/features/vaults/hooks";
import { amountSchema } from "@/features/vaults/schema";
import { MAX_AUTHORIZATIONS, fundedPurchases, purchasesToSign } from "@/features/vaults/status";
import { VaultNotFound } from "@/features/vaults/components/VaultNotFound";
import { VaultSteps } from "@/features/vaults/components/VaultSteps";

const USDC_FAUCET = "https://faucet.circle.com/";

/**
 * Screen 6 (Figma 28:12298 + Loading / Empty / Error / Validation). On the backend, a deposit is a USDC payment from
 * the wallet into the position's own Stellar account, booked once the network confirms it. A new position then
 * needs its purchases signed in one batch before it starts.
 */
export function DepositFunds({ vaultId, flow, initialAmount }: { vaultId: string; flow: boolean; initialAmount?: string }) {
	const position = usePosition(vaultId);
	const account = usePositionAccount(vaultId);
	const wallet = useWalletBalances();

	const header = (
		<>
			<PageHeader title="Deposit funds" subtitle={flow ? "Fund your new vault, then sign its purchases to start the schedule." : position.data ? `${position.data.name} · to your vault account` : "Add USDC to your vault"} />
			{flow && <VaultSteps current={2} />}
		</>
	);

	if (position.isError || account.isError || wallet.isError) {
		const error = position.error ?? account.error ?? wallet.error;
		return (
			<>
				{header}
				{httpStatus(error) === 404 ? <VaultNotFound /> : <ErrorState error={error} onRetry={() => void Promise.all([position.refetch(), account.refetch(), wallet.refetch()])} />}
			</>
		);
	}

	if (position.isPending || account.isPending || wallet.isPending) {
		return (
			<>
				{header}
				<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,576px)]" aria-busy="true">
					<Panel className="flex flex-col gap-5">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-[52px] w-full" />
						<SkeletonLines rows={4} />
						<p className="caption">Loading wallet balance and vault details…</p>
					</Panel>
					<Panel>
						<SkeletonLines rows={4} />
					</Panel>
				</div>
			</>
		);
	}

	return (
		<>
			{header}
			<DepositBody position={position.data} account={account.data} wallet={wallet.data} flow={flow} initialAmount={initialAmount} />
		</>
	);
}

function DepositBody({ position: p, account, wallet, flow, initialAmount }: { position: Position; account: PositionAccount | null; wallet: WalletBalances; flow: boolean; initialAmount?: string }) {
	const router = useRouter();
	const toast = useToast();
	const owner = useWalletStore((s) => s.address);
	const openExplorer = usePreferences((s) => s.openExplorer);
	const deposit = useVaultTx();
	const sign = useVaultTx();
	const setup = useVaultTx();
	const trust = useVaultTx();
	const [amount, setAmount] = useState(initialAmount ?? "");
	const [touched, setTouched] = useState(false);

	const walletUsdc = wallet.usdc === null ? 0 : Number(fromStroops(wallet.usdc));
	const parsed = amountSchema(walletUsdc, `Your wallet holds ${money(wallet.usdc ?? "0", "USDC")}. Enter that amount or less.`).safeParse({ amount });
	const fieldError = touched && !parsed.success ? parsed.error.issues[0]?.message : undefined;
	const value = parsed.success ? toStroops(amount) : 0n;
	const after = BigInt(p.available_source) + value;
	const extra = value / BigInt(p.purchase_amount);
	const label = parsed.success ? money(value, "USDC") : "USDC";
	const toSign = purchasesToSign(p);
	const canSignMore = p.authorizations_remaining < MAX_AUTHORIZATIONS && fundedPurchases(p) > p.authorizations_remaining && (p.status === "pending" || p.status === "active" || p.status === "paused");
	const confirmed = deposit.stage === "confirmed" && deposit.result;

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		setTouched(true);
		if (!parsed.success || !account) return;
		const res = await deposit.run((opts) => vaultClient.deposit(p, account, value.toString(), opts));
		if (res) {
			toast.success(`Deposit confirmed: ${money(value, "USDC")}`, { description: "Booked in your vault once Stellar confirmed it.", action: explorerAction(res.txHash) });
			if (openExplorer && res.txHash) window.open(explorer.tx(res.txHash), "_blank", "noopener");
		}
	};

	const signAndStart = async () => {
		const res = await sign.run((opts) => vaultClient.authorize(p, toSign, opts));
		if (res) {
			toast.success(p.status === "pending" ? "Schedule started" : `${toSign} purchase${toSign === 1 ? "" : "s"} signed`, {
				description: `First purchase eligible ${utcDateTime(p.next_execution_ts * 1000)}.`,
				action: explorerAction(res.txHash),
			});
			router.push(vaultRoutes.VAULT(p.id));
		}
	};

	if (!account) {
		return (
			<Panel>
				<PanelHeader title="Set up your vault account" />
				<p className="mt-3 text-base font-light text-muted">This strategy doesn&apos;t have its Stellar account yet. Stackly creates it and pays the reserve; your wallet becomes its only signer.</p>
				{setup.stage === "failed" && (
					<Notice tone="error" title="Setup failed" className="mt-4">
						{setup.error}
					</Notice>
				)}
				<Button className="mt-5" isLoading={setup.busy} loadingText="Creating account…" onClick={() => void setup.run((opts) => vaultClient.createAccount(p.id, opts))}>
					Create vault account
				</Button>
			</Panel>
		);
	}

	return (
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
								<p className="caption mt-1">Confirmed on Stellar Testnet and booked in your vault</p>
							</div>
						</div>
						<p className="stat-value mt-6">{money(value, "USDC")}</p>
						<dl className="mt-6 flex flex-col gap-3">
							<DetailRow label="Vault balance" value={money(p.available_source, "USDC")} />
							<DetailRow label="Funded purchases" value={`${fundedPurchases(p)} × ${money(p.purchase_amount, "USDC")}`} />
							<DetailRow label="Signed purchases" value={`${p.authorizations_remaining}`} />
						</dl>

						{canSignMore && (
							<div className="mt-6 rounded-card bg-blush p-5">
								<p className="text-lg tracking-[-0.02em]">{p.status === "pending" ? "Last step: sign your purchases" : "Sign purchases for the new funds"}</p>
								<p className="mt-1 text-sm font-light text-muted">
									One approval signs the next {toSign} purchase{toSign === 1 ? "" : "s"}. Each is fixed on chain: {money(p.purchase_amount, "USDC")} → XLM with a minimum output, not before its scheduled time. The
									keeper can only submit them as signed.
								</p>
								{sign.stage !== "idle" && <TxProgress stage={sign.stage} className="mt-4" />}
								{(sign.stage === "rejected" || sign.stage === "failed") && (
									<Notice tone="error" title={sign.stage === "rejected" ? "Declined" : "Signing failed"} className="animate-pop mt-4">
										{sign.stage === "rejected" ? "You declined in your wallet. Your deposit is safe in the vault; sign whenever you're ready." : sign.error}
									</Notice>
								)}
							</div>
						)}

						<div className="mt-6 flex flex-wrap gap-3">
							{canSignMore ? (
								<Button onClick={signAndStart} isLoading={sign.busy} loadingText={sign.stage === "signing" ? "Waiting for wallet…" : "Submitting…"}>
									<PenLine /> {p.status === "pending" ? `Sign ${toSign} purchase${toSign === 1 ? "" : "s"} & start` : `Sign ${toSign} more`}
								</Button>
							) : (
								<Button asChild>
									<Link href={vaultRoutes.VAULT(p.id)}>
										Back to position <ArrowRight />
									</Link>
								</Button>
							)}
							<ExplorerButton hash={deposit.result!.txHash ?? null} label="View on Stellar Explorer" />
							{!canSignMore && (
								<Button
									variant="ghost"
									onClick={() => {
										deposit.reset();
										setAmount("");
										setTouched(false);
									}}
								>
									<Plus /> Deposit more
								</Button>
							)}
						</div>
					</Panel>
				) : (
					<>
						<Notice tone="info" title="Wallet authorization required" className="animate-rise">
							Stackly cannot move funds without your approval. The deposit is a USDC payment from your wallet to your vault account; your wallet shows the network fee before you sign.
						</Notice>
						<WalletReadiness wallet={wallet} owner={owner} trust={trust} usdcAsset={p.source} />
						{(deposit.stage === "rejected" || deposit.stage === "failed") && (
							<Notice tone="error" title={deposit.stage === "rejected" ? "Deposit declined" : "Deposit failed"} className="animate-pop" action={<Chip tone="neutral">Not submitted</Chip>}>
								{deposit.stage === "rejected"
									? `You declined the ${label} deposit in your wallet. Nothing was submitted and no funds moved. Your amount is saved below.`
									: `${deposit.error} Your vault balance changes only after confirmation.`}
							</Notice>
						)}
						<form onSubmit={submit} noValidate>
							<Panel className="animate-rise flex flex-col gap-5" style={{ "--i": 1 } as React.CSSProperties}>
								<PanelHeader title="Deposit USDC" />
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
										disabled={deposit.busy || wallet.usdc === null}
										trailing={
											<button
												type="button"
												className="cursor-pointer rounded-full bg-blush px-2.5 py-1 text-xs text-ink"
												onClick={() => {
													setAmount(fromStroops(wallet.usdc ?? "0"));
													setTouched(true);
												}}
												disabled={deposit.busy || !wallet.usdc}
											>
												Max
											</button>
										}
										className="h-14 text-xl"
									/>
								</Field>
								<dl className="flex flex-col gap-3">
									<DetailRow label="Wallet balance" value={wallet.usdc === null ? "No USDC trustline" : money(wallet.usdc, "USDC")} />
									<DetailRow label="Current vault balance" value={money(p.available_source, "USDC")} />
								</dl>
								<dl className="flex flex-col gap-3 border-t border-line pt-5">
									<DetailRow label="Vault balance after deposit" value={money(after, "USDC")} />
									<DetailRow label="Additional funded purchases" value={extra > 0n ? `${extra} × ${money(p.purchase_amount, "USDC")}` : "—"} />
								</dl>
								{deposit.busy ? (
									<TxProgress stage={deposit.stage} className="mt-1" />
								) : (
									<Button type="submit" className="w-full sm:w-fit" disabled={wallet.usdc === null || !wallet.funded}>
										{deposit.stage === "rejected" || deposit.stage === "failed" ? "Try again" : `Deposit ${label}`}
									</Button>
								)}
							</Panel>
						</form>
						{!flow && canSignMore && p.status !== "pending" && (
							<Notice tone="warning" title={`${fundedPurchases(p) - p.authorizations_remaining} funded purchase${fundedPurchases(p) - p.authorizations_remaining === 1 ? " isn't" : "s aren't"} signed yet`}>
								Sign them from your position page so the keeper can run them.
							</Notice>
						)}
					</>
				)}
			</div>

			<aside className="flex min-w-0 flex-col gap-4">
				<Panel className="animate-rise" style={{ "--i": 2 } as React.CSSProperties}>
					<PanelHeader title="Where your funds go" />
					<dl className="mt-5 flex flex-col gap-4">
						<DetailRow
							label="Vault account"
							value={
								<a href={account.explorer_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono underline-offset-4 hover:underline" title={account.address}>
									{shortKey(account.address, 6, 6)} <ArrowUpRight className="size-3" aria-hidden />
								</a>
							}
						/>
						<DetailRow label="Strategy" value={`${money(p.purchase_amount, "USDC")} · ${everyLabel(p.interval_seconds).toLowerCase()}`} />
						<DetailRow label="Only signer" value={<span className="font-mono">{owner ? shortKey(owner) : "—"} (your wallet)</span>} />
						<DetailRow label="Network" value="Stellar Testnet" />
					</dl>
					<p className="caption mt-5">Your vault is a Stellar account only your wallet can sign for. Stackly never holds its key, so it can&apos;t move your funds; you can withdraw available funds at any time.</p>
				</Panel>
				<Panel className="animate-rise" style={{ "--i": 3 } as React.CSSProperties}>
					<PanelHeader title="Before you approve" />
					<p className="mt-4 text-base font-light text-muted">Check the asset, amount, destination and Testnet network in your wallet. A rejected or failed transaction does not change your vault balance.</p>
				</Panel>
			</aside>
		</div>
	);
}

/** What the wallet needs before it can deposit: to exist on Testnet, a USDC trustline, and some test USDC. */
function WalletReadiness({ wallet, owner, trust, usdcAsset }: { wallet: WalletBalances; owner: string | null; trust: ReturnType<typeof useVaultTx>; usdcAsset: Position["source"] }) {
	if (!wallet.funded && owner) {
		return (
			<Notice tone="warning" title="Your wallet isn't on Testnet yet" action={<FundTestnetButton address={owner} />}>
				It needs a few test XLM for network fees. Friendbot sends 10,000 (no real value).
			</Notice>
		);
	}
	if (wallet.usdc === null) {
		return (
			<Notice
				tone="warning"
				title="Your wallet can't hold USDC yet"
				action={
					<Button size="sm" isLoading={trust.busy} loadingText="Waiting for wallet…" onClick={() => void trust.run((opts) => vaultClient.addTrustline(usdcAsset, opts))}>
						Add USDC trustline
					</Button>
				}
			>
				Stellar wallets opt in to each asset with a trustline (one signature, a tiny XLM fee).{trust.stage === "failed" && ` ${trust.error}`}
			</Notice>
		);
	}
	if (BigInt(wallet.usdc) === 0n) {
		return (
			<Notice
				tone="info"
				title="Get Testnet USDC"
				action={
					<Button asChild size="sm" variant="outline">
						<a href={USDC_FAUCET} target="_blank" rel="noreferrer">
							Circle USDC faucet <ArrowUpRight />
						</a>
					</Button>
				}
			>
				Your wallet has no USDC. Circle&apos;s faucet sends free Testnet USDC to your address (choose Stellar).
			</Notice>
		);
	}
	return null;
}
