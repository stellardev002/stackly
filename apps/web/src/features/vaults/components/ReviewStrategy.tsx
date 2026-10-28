"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Pencil } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { MONTHLY_NOTE } from "@repo/stellar/vault";
import { Button } from "@repo/ui/button";
import { Skeleton } from "@repo/ui/skeleton";
import { Chip, DetailRow, Notice, Panel, PanelHeader } from "@repo/ui/surface";
import { api } from "@/lib/api/client";
import type { CreatePositionBody } from "@/lib/api/dto";
import { previewPosition } from "@/lib/api/endpoints";
import { errorMessage } from "@/lib/api/errors";
import { utcDate, utcDateTime } from "@/lib/format";
import { vaultRoutes } from "@/lib/routes";
import { useToast } from "@/lib/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/states";
import { vaultClient } from "@/features/vaults/client";
import { useVaultTx } from "@/features/vaults/hooks";
import type { CreateVaultValues } from "@/features/vaults/schema";
import { EXECUTION_DISCLAIMER } from "@/features/vaults/status";
import { useVaultDraft } from "@/features/vaults/store";
import { VaultSteps } from "@/features/vaults/components/VaultSteps";

const FREQ_NAME = { daily: "Daily · every 24 hours", weekly: "Weekly · fixed 7 days", monthly: "Monthly · fixed 30 days" } as const;

/** The backend request for a draft. The start is moved to "now" if the draft sat on this screen past it. */
function toBody(draft: CreateVaultValues): CreatePositionBody {
	const startMs = Math.max(Date.parse(`${draft.start}:00Z`), Date.now() + 30_000);
	return {
		sourceAssetId: draft.source_asset,
		targetAssetId: draft.target_asset,
		amountPerPurchase: draft.purchase_amount,
		frequency: draft.frequency,
		startAt: new Date(startMs).toISOString(),
		...(draft.end ? { endAt: new Date(`${draft.end}T23:59:59Z`).toISOString() } : {}),
		maxSlippageBps: Math.round(Number(draft.max_slippage) * 100),
	};
}

/** Screen 5 (Figma 28:12499 + Loading / Error), from the backend's preview (`POST /dca-positions/preview`). */
export function ReviewStrategy() {
	const router = useRouter();
	const toast = useToast();
	const { draft, clearDraft } = useVaultDraft();
	const tx = useVaultTx();
	const [agreed, setAgreed] = useState(false);
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		// The draft lives in sessionStorage; wait one tick so a reload doesn't flash the empty state.
		const id = requestAnimationFrame(() => setHydrated(true));
		return () => cancelAnimationFrame(id);
	}, []);

	const preview = useQuery({
		queryKey: ["preview", draft],
		queryFn: () => previewPosition(api, { ...toBody(draft!), depositAmount: draft!.planned_deposit }),
		enabled: !!draft,
		staleTime: 30_000,
	});

	const header = (
		<>
			<PageHeader title="Review Strategy" subtitle="Check the details before creating your Testnet vault" />
			<VaultSteps current={1} />
		</>
	);

	if (!draft) {
		return (
			<>
				{header}
				{hydrated && (
					<Panel>
						<EmptyState
							title="There's no strategy to review"
							action={
								<Button asChild>
									<Link href={vaultRoutes.CREATE}>Configure a vault</Link>
								</Button>
							}
						>
							Start by choosing an amount and a schedule.
						</EmptyState>
					</Panel>
				)}
			</>
		);
	}

	const p = preview.data;
	const confirm = async () => {
		const res = await tx.run((opts) => vaultClient.create(toBody(draft), opts));
		if (res?.position) {
			toast.success("Strategy created", { description: "Your vault account is ready. Next, deposit USDC into it." });
			clearDraft();
			router.push(vaultRoutes.DEPOSIT(res.position.id, { flow: true, amount: draft.planned_deposit }));
		}
	};

	return (
		<>
			{header}
			<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,516px)]">
				<div className="flex min-w-0 flex-col gap-4">
					<Notice tone="warning" title="Prices and execution can change" className="animate-rise">
						{EXECUTION_DISCLAIMER}
						{p?.notices.length ? (
							<ul className="mt-2 list-disc space-y-1 pl-4">
								{p.notices.map((n) => (
									<li key={n}>{n}</li>
								))}
							</ul>
						) : null}
					</Notice>
					<Panel className="animate-rise" style={{ "--i": 1 } as React.CSSProperties}>
						<PanelHeader title={`${FREQ_NAME[draft.frequency].split(" ·")[0]} strategy`} action={<Chip tone="soft">Draft</Chip>} />
						<p className="mt-6 text-[40px] leading-none tracking-[-0.06em] sm:text-[48px]">USDC → XLM</p>
						<p className="mt-6 border-b border-line pb-6 text-lg font-light text-muted">
							Spend {draft.purchase_amount} USDC {draft.frequency === "daily" ? "every day" : draft.frequency === "weekly" ? "every 7 days" : "every 30 days"} to acquire XLM at the price available at
							execution.
						</p>
						<dl className="mt-6 flex flex-col gap-4">
							<EditableRow label="Source asset" value="Testnet USDC" />
							<EditableRow label="Target asset" value="Testnet XLM" />
							<EditableRow label="Purchase amount" value={`${draft.purchase_amount} USDC`} edit />
							<EditableRow label="Frequency" value={FREQ_NAME[draft.frequency]} edit />
							<EditableRow label="First eligible time" value={p ? utcDateTime(p.firstExecutionAt) : utcDateTime(Date.parse(`${draft.start}:00Z`))} edit />
							<EditableRow label="Maximum slippage" value={`${Number(draft.max_slippage).toFixed(2)}%`} edit />
							<EditableRow label="End date" value={draft.end ? utcDate(`${draft.end}T00:00:00Z`) : "None"} edit />
							<EditableRow label="Network" value="Stellar Testnet" />
						</dl>
						{draft.frequency === "monthly" && <p className="mt-4 text-sm font-light text-muted">{MONTHLY_NOTE}</p>}
					</Panel>
				</div>

				<aside className="flex min-w-0 flex-col gap-4">
					<Panel className="animate-rise" style={{ "--i": 2 } as React.CSSProperties}>
						<PanelHeader title="Funding preview" action={preview.isFetching ? <Chip tone="neutral">Updating…</Chip> : <Chip tone="soft">Live quote</Chip>} />
						{preview.isError ? (
							<Notice tone="error" title="Preview unavailable" className="mt-4">
								{errorMessage(preview.error)}
							</Notice>
						) : !p ? (
							<div className="mt-5 flex flex-col gap-4" aria-busy="true">
								{[0, 1, 2, 3].map((i) => (
									<Skeleton key={i} className="h-4 w-56" />
								))}
							</div>
						) : (
							<>
								<dl className="mt-5 flex flex-col gap-4">
									<DetailRow label="Planned deposit" value={`${Number(draft.planned_deposit).toLocaleString("en-US")} USDC`} />
									<DetailRow label="Per purchase" value={`${Number(p.amountPerPurchase).toLocaleString("en-US")} USDC`} />
									<DetailRow label="Purchase count" value={p.estimatedPurchases == null ? "—" : `${p.estimatedPurchases} funded purchase${p.estimatedPurchases === 1 ? "" : "s"}`} />
									{p.leftoverAmount && Number(p.leftoverAmount) > 0 && <DetailRow label="Left over" value={`${Number(p.leftoverAmount)} USDC`} />}
									{p.quote ? (
										<>
											<DetailRow label="Each purchase now" value={`≈ ${Number(p.quote.expectedReceiveAmount).toFixed(2)} XLM`} />
											<DetailRow label="Minimum accepted" value={`${Number(p.quote.minReceiveAmount).toFixed(2)} XLM`} />
											<DetailRow label="Current price" value={`${p.quote.price} USDC / XLM`} />
										</>
									) : (
										<DetailRow label="Quote" value="No liquidity right now" />
									)}
								</dl>
								<dl className="mt-6 flex flex-col gap-4 border-t border-line pt-6">
									<DetailRow label="Signing purchases" value={`${p.fees.perAuthorizedPurchase} XLM each, from your wallet`} />
									<DetailRow label="Each withdrawal" value={`${p.fees.perWithdrawal} XLM, from your wallet`} />
									<DetailRow label="Paid by Stackly" value={`${Number(p.fees.paidByProject)} XLM (account reserve and every purchase fee)`} />
								</dl>
							</>
						)}
					</Panel>

					<Panel className="animate-rise" style={{ "--i": 3 } as React.CSSProperties}>
						<PanelHeader title={tx.busy ? "Creating your vault" : "Ready to create?"} />
						{(tx.stage === "failed" || tx.stage === "rejected") && (
							<Notice tone="error" title="The vault wasn't created" className="animate-pop mt-4">
								{tx.error}
							</Notice>
						)}
						<p className="mt-4 text-sm font-light text-muted">This creates your strategy and its own Stellar account (Stackly pays the reserve). Your wallet becomes its only signer. No signature needed yet.</p>
						<label className="mt-5 flex cursor-pointer items-start gap-3 text-sm font-light text-muted">
							<input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} disabled={tx.busy} className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[#ff6173]" />
							I understand this is Testnet, purchases are not guaranteed and there are no guaranteed returns.
						</label>
						<div className="mt-6 flex flex-wrap gap-3">
							<Button onClick={confirm} disabled={!agreed || preview.isError} isLoading={tx.busy} loadingText="Creating vault account…">
								{tx.stage === "failed" ? "Try again" : "Confirm Strategy"} <ArrowRight />
							</Button>
							<Button asChild variant="outline">
								<Link href={vaultRoutes.CREATE}>Back to settings</Link>
							</Button>
						</div>
						{!agreed && <p className="caption mt-3">Tick the box to continue.</p>}
					</Panel>
				</aside>
			</div>
		</>
	);
}

function EditableRow({ label, value, edit }: { label: string; value: string; edit?: boolean }) {
	return (
		<div className="flex items-center justify-between gap-3">
			<DetailRow label={label} value={value} />
			{edit && (
				<Link href={vaultRoutes.CREATE} className="rounded-full p-1.5 text-ink transition-colors hover:bg-blush" aria-label={`Edit ${label.toLowerCase()}`}>
					<Pencil className="size-4" />
				</Link>
			)}
		</div>
	);
}

