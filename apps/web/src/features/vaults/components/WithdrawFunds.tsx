"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Field, PillInput } from "@repo/ui/field";
import { Chip, DetailRow, Notice, Panel, PanelHeader } from "@repo/ui/surface";
import { cn } from "@repo/ui/lib/utils";
import { money } from "@/lib/format";
import { vaultRoutes } from "@/lib/routes";
import { fromStroops, shortKey, toStroops } from "@/lib/stellar/config";
import { withBasePath } from "@/lib/site";
import { useToast } from "@/lib/use-toast";
import { ExplorerButton, HashText, explorerAction } from "@/components/ExplorerButton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, SkeletonLines } from "@/components/states";
import { TxProgress } from "@/components/TxProgress";
import { usePreferences } from "@/features/settings/store";
import { useWalletStore } from "@/features/wallet/store";
import { vaultClient } from "@/features/vaults/client";
import { usePosition, useVaultTx } from "@/features/vaults/hooks";
import { amountSchema } from "@/features/vaults/schema";
import { shortId } from "@/features/vaults/status";
import { VaultNotFound } from "@/features/vaults/components/VaultNotFound";

type Side = "source" | "target";

/** Screen 11 (Figma 28:10702 + Loading / Empty / Error / Validation), plus the confirmed state. */
export function WithdrawFunds({ vaultId }: { vaultId: string }) {
	const toast = useToast();
	const owner = useWalletStore((s) => s.address);
	const reviewFirst = usePreferences((s) => s.reviewBeforeSign);
	const position = usePosition(vaultId);
	const tx = useVaultTx();
	const [side, setSide] = useState<Side>("source");
	const [amount, setAmount] = useState("");
	const [touched, setTouched] = useState(false);
	const [reviewing, setReviewing] = useState(false);
	const [sent, setSent] = useState<{ amount: string; asset: string } | null>(null);

	const header = <PageHeader title="Withdraw funds" subtitle={position.data ? `${position.data.name} · ${shortId(position.data.id)} · to your connected wallet` : "Move available funds back to your wallet"} />;

	if (position.isError) {
		const notFound = (position.error as { response?: { status?: number } }).response?.status === 404;
		return (
			<>
				{header}
				{notFound ? <VaultNotFound /> : <ErrorState error={position.error} onRetry={() => void position.refetch()} />}
			</>
		);
	}
	if (position.isPending) {
		return (
			<>
				{header}
				<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,576px)]" aria-busy="true">
					<Panel className="flex flex-col gap-6">
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="shimmer h-[142px] rounded-card" />
							<div className="shimmer h-[142px] rounded-card" />
						</div>
						<SkeletonLines rows={2} />
						<p className="caption">The withdrawal limit will be checked when your vault balance is ready. No withdrawal has been submitted.</p>
					</Panel>
					<Panel>
						<SkeletonLines rows={5} />
					</Panel>
				</div>
			</>
		);
	}

	const p = position.data;
	const asset = side === "source" ? p.source_asset : p.target_asset;
	const code = asset;
	const available = side === "source" ? p.available_source : p.available_target;
	const nothing = BigInt(p.available_source) === 0n && BigInt(p.available_target) === 0n;
	const parsed = amountSchema(Number(fromStroops(available)), `Only ${money(available, asset)} is available. Enter ${money(available, asset)} or less.`).safeParse({ amount });
	const over = touched && !parsed.success && Number(amount) > Number(fromStroops(available));
	const fieldError = touched && !parsed.success ? parsed.error.issues[0]?.message : undefined;
	const value = parsed.success ? toStroops(amount) : 0n;
	const leftUsdc = side === "source" ? BigInt(p.available_source) - value : BigInt(p.available_source);
	const leftPurchases = leftUsdc / BigInt(p.purchase_amount);

	const confirm = async () => {
		const snapshot = { amount: value.toString(), asset };
		const res = await tx.run((opts) => vaultClient.withdraw(p.id, side === "source" ? p.source : p.target, value.toString(), opts));
		if (res) {
			setSent(snapshot);
			toast.success(`Withdrawal confirmed: ${money(snapshot.amount, snapshot.asset)}`, { description: `Sent to ${owner ? shortKey(owner) : "your wallet"}.`, action: explorerAction(res.txHash) });
		}
	};

	const review = (event: React.FormEvent) => {
		event.preventDefault();
		setTouched(true);
		if (!parsed.success) return;
		if (reviewFirst) setReviewing(true);
		else void confirm();
	};

	const choose = (next: Side) => {
		setSide(next);
		setAmount("");
		setTouched(false);
		setReviewing(false);
		tx.reset();
	};

	if (nothing && tx.stage !== "confirmed") {
		return (
			<>
				{header}
				<Panel>
					<EmptyState
						title="Nothing to withdraw yet"
						action={
							<Button asChild>
								<Link href={vaultRoutes.DEPOSIT(p.id, { flow: p.status === "pending" })}>Deposit USDC</Link>
							</Button>
						}
					>
						This vault holds no USDC or XLM. Deposit USDC to start a schedule.
					</EmptyState>
				</Panel>
			</>
		);
	}

	const confirmed = tx.stage === "confirmed" && tx.result;

	return (
		<>
			{header}
			<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,576px)]">
				<div className="flex min-w-0 flex-col gap-4">
					{side === "source" && p.status === "active" && (
						<Notice tone="info" title="Keep your next purchase funded" className="animate-rise">
							{value > 0n
								? `Withdrawing ${money(value, asset)} leaves ${money(leftUsdc, asset)} available for ${leftPurchases} purchase${leftPurchases === 1n ? "" : "s"}. Your strategy stays active unless you pause it.`
								: "Withdrawing USDC reduces how many purchases the vault can fund. Your strategy stays active unless you pause it."}
						</Notice>
					)}
					<form onSubmit={review} noValidate>
						<Panel className="animate-rise flex flex-col gap-6" style={{ "--i": 1 } as React.CSSProperties}>
							<h2 className="h-card">Choose what to withdraw</h2>
							<div role="radiogroup" aria-label="Asset to withdraw" className="grid gap-4 sm:grid-cols-2">
								<AssetCard selected={side === "source"} onSelect={() => choose("source")} label={p.source_asset} amount={money(p.available_source, p.source_asset)} caption="Available source funds" art="withdraw-usdc" disabled={tx.busy} />
								<AssetCard selected={side === "target"} onSelect={() => choose("target")} label={p.target_asset} amount={money(p.available_target, p.target_asset, 4)} caption="Purchased asset balance" art="withdraw-xlm" disabled={tx.busy} />
							</div>
							<Field label="Withdrawal amount" htmlFor="amount" error={over ? undefined : fieldError}>
								<PillInput
									id="amount"
									inputMode="decimal"
									autoComplete="off"
									placeholder={`0.00 ${code}`}
									value={amount}
									onChange={(e) => {
										setAmount(e.target.value);
										setReviewing(false);
									}}
									onBlur={() => setTouched(true)}
									invalid={!!fieldError}
									disabled={tx.busy || !!confirmed}
									trailing={
										<button
											type="button"
											className="cursor-pointer rounded-full bg-blush px-2.5 py-1 text-xs text-ink"
											disabled={tx.busy || !!confirmed}
											onClick={() => {
												setAmount(fromStroops(available));
												setTouched(true);
											}}
										>
											Max
										</button>
									}
									className="h-14 text-xl"
								/>
							</Field>
							{over && (
								<Notice tone="warning" title={`Only ${money(available, asset)} is available`} className="animate-pop">
									Enter {money(available, asset)} or less.{side === "source" && ` You cannot withdraw funds already spent on ${p.target_asset}.`}
								</Notice>
							)}
							<Field label="Receiving wallet" htmlFor="receiver" hint="Withdrawals always go to the wallet that owns the vault.">
								<PillInput id="receiver" readOnly value={owner ? `${shortKey(owner)} · connected wallet` : ""} className="bg-page" />
							</Field>
							{!confirmed && !tx.busy && (
								<Button type="submit" disabled={over} className="w-full sm:w-fit">
									{over ? "Review unavailable" : reviewFirst ? "Review Withdrawal" : `Withdraw ${parsed.success ? money(value, asset) : code}`}
								</Button>
							)}
						</Panel>
					</form>
				</div>

				<aside className="flex min-w-0 flex-col gap-4">
					{confirmed ? (
						<Panel className="animate-pop" aria-live="polite">
							<div className="flex items-center gap-4">
								<span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-coral text-white">
									<svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
										<path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="animate-check" />
									</svg>
								</span>
								<div>
									<p className="h-card">Withdrawal confirmed</p>
									<p className="caption mt-1">Confirmed on Stellar Testnet and booked</p>
								</div>
							</div>
							<p className="stat-value mt-6">{money(sent?.amount ?? value, sent?.asset ?? asset)}</p>
							<dl className="mt-6 flex flex-col gap-3">
								<DetailRow label="Sent to" value={<span className="font-mono">{owner ? shortKey(owner) : "—"}</span>} />
								<DetailRow label={`Vault ${p.source_asset}`} value={money(p.available_source, p.source_asset)} />
								<DetailRow label={`Vault ${p.target_asset}`} value={money(p.available_target, p.target_asset, 4)} />
								{tx.result!.txHash && <DetailRow label="Hash" value={<HashText hash={tx.result!.txHash} />} />}
							</dl>
							<div className="mt-6 flex flex-wrap gap-3">
								<Button asChild>
									<Link href={vaultRoutes.VAULT(p.id)}>
										Back to position <ArrowRight />
									</Link>
								</Button>
								<ExplorerButton hash={tx.result!.txHash ?? null} />
							</div>
						</Panel>
					) : reviewing || tx.stage !== "idle" ? (
						<Panel className="animate-pop">
							<PanelHeader title={<span className="h-card">Review withdrawal</span>} action={<Chip tone="soft">{tx.busy ? "Signing" : "Ready to sign"}</Chip>} />
							<dl className="mt-6 flex flex-col gap-4">
								<DetailRow label="Asset" value={`Testnet ${code}`} />
								<DetailRow label="Amount" value={money(value, asset)} />
								<DetailRow label="Receiving wallet" value={<span className="font-mono">{owner ? shortKey(owner) : "—"}</span>} />
								<DetailRow label={`Vault ${p.source_asset} after withdrawal`} value={`${money(side === "source" ? leftUsdc : BigInt(p.available_source), p.source_asset)}${side === "target" ? " · unchanged" : ""}`} />
								<DetailRow
									label={`${p.target_asset} after withdrawal`}
									value={`${money(side === "target" ? BigInt(p.available_target) - value : BigInt(p.available_target), p.target_asset, 4)}${side === "source" ? " · unchanged" : ""}`}
								/>
								<DetailRow label="Network fee" value="Shown in wallet · XLM" />
							</dl>
							<div className="mt-6 border-t border-line pt-6">
								{tx.busy ? (
									<TxProgress stage={tx.stage} />
								) : (
									<>
										{(tx.stage === "rejected" || tx.stage === "failed") && (
											<Notice tone="error" title={tx.stage === "rejected" ? "Withdrawal declined" : "Withdrawal failed"} className="animate-pop mb-5">
												{tx.stage === "rejected" ? "You declined in your wallet. No withdrawal was submitted and your balances are unchanged." : tx.error}
											</Notice>
										)}
										<Button onClick={confirm} disabled={!parsed.success}>
											{tx.stage === "idle" ? "Confirm Withdrawal" : "Try again"}
										</Button>
									</>
								)}
							</div>
						</Panel>
					) : (
						<Panel className="animate-rise" style={{ "--i": 2 } as React.CSSProperties}>
							<PanelHeader title={<span className="h-card">Review withdrawal</span>} />
							<p className="mt-4 text-base font-light text-muted">Choose an asset and an amount, then review the summary before your wallet asks you to sign.</p>
							<dl className="mt-6 flex flex-col gap-3">
								<DetailRow label={`Available ${p.source_asset}`} value={money(p.available_source, p.source_asset)} />
								<DetailRow label={`Available ${p.target_asset}`} value={money(p.available_target, p.target_asset, 4)} />
							</dl>
						</Panel>
					)}
				</aside>
			</div>
		</>
	);
}

function AssetCard({ selected, onSelect, label, amount, caption, art, disabled }: { selected: boolean; onSelect: () => void; label: string; amount: string; caption: string; art: string; disabled?: boolean }) {
	return (
		<button
			type="button"
			role="radio"
			aria-checked={selected}
			onClick={onSelect}
			disabled={disabled}
			className={cn(
				"relative isolate flex min-h-[142px] cursor-pointer flex-col justify-between overflow-hidden rounded-card p-5 text-left transition-[background-color,box-shadow,transform] duration-300 ease-(--ease-settle) outline-none focus-visible:ring-[3px] focus-visible:ring-coral/40 disabled:cursor-default",
				selected ? "bg-coral text-white shadow-[0_16px_40px_-18px_rgba(255,97,115,0.9)]" : "bg-blush text-ink hover:-translate-y-0.5",
			)}
		>
			<span className={cn("w-fit rounded-full px-3 py-1 text-xs", selected ? "bg-wine text-white" : "border border-rose bg-white")}>{label}</span>
			<span className="mt-3 block text-[32px] leading-none tracking-[-0.06em] sm:text-[36px]">{amount}</span>
			<span className={cn("mt-2 block text-xs font-light", selected ? "text-white/85" : "text-muted")}>{caption}</span>
			<Image src={withBasePath(`/images/${art}.svg`)} alt="" width={265} height={247} className="absolute -right-6 -bottom-8 -z-10 h-auto w-[150px] opacity-90" />
		</button>
	);
}
