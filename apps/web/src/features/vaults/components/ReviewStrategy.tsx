"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Pencil } from "lucide-react";
import { assetCode } from "@repo/stellar/assets";
import { FREQUENCY_SECONDS, MONTHLY_NOTE } from "@repo/stellar/vault";
import { Button } from "@repo/ui/button";
import { Chip, DetailRow, Notice, Panel, PanelHeader } from "@repo/ui/surface";
import { everyLabel, utcDate, utcDateTime } from "@/lib/format";
import { vaultRoutes } from "@/lib/routes";
import { toStroops } from "@/lib/stellar/config";
import { useToast } from "@/lib/use-toast";
import { explorerAction } from "@/components/ExplorerButton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/states";
import { TxProgress } from "@/components/TxProgress";
import { vaultClient } from "@/features/vaults/client";
import { useVaultTx } from "@/features/vaults/hooks";
import { utcInputToSeconds } from "@/features/vaults/schema";
import { EXECUTION_DISCLAIMER } from "@/features/vaults/status";
import { useVaultDraft } from "@/features/vaults/store";
import { VaultSteps } from "@/features/vaults/components/VaultSteps";

const FREQ_NAME = { daily: "Daily · every 24 hours", weekly: "Weekly · fixed 7 days", monthly: "Monthly · fixed 30 days" } as const;

/** Screen 5 (Figma 28:12499 + Loading / Error). Creating the vault is a wallet-signed contract call. */
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

	if (!draft) {
		return (
			<>
				<PageHeader title="Review Strategy" subtitle="Check the details before creating your Testnet vault" />
				<VaultSteps current={1} />
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

	const source = assetCode(draft.source_asset);
	const target = assetCode(draft.target_asset);
	const purchase = Number(draft.purchase_amount);
	const deposit = Number(draft.planned_deposit);
	const count = Math.floor(deposit / purchase);
	const startMs = utcInputToSeconds(draft.start) * 1000;

	const confirm = async () => {
		const res = await tx.run((opts) =>
			vaultClient.createPosition(
				{
					owner: opts.owner,
					name: draft.name,
					source_asset: draft.source_asset,
					target_asset: draft.target_asset,
					purchase_amount: toStroops(draft.purchase_amount).toString(),
					interval_seconds: FREQUENCY_SECONDS[draft.frequency],
					start_ts: utcInputToSeconds(draft.start),
					end_ts: draft.end ? Math.floor(Date.parse(`${draft.end}T23:59:59Z`) / 1000) : null,
					max_slippage_bps: Math.round(Number(draft.max_slippage) * 100),
				},
				opts,
			),
		);
		if (res) {
			toast.success(`${res.position.name} created`, { description: `${res.position.id} · Next, fund it to start purchasing.`, action: explorerAction(res.txHash) });
			clearDraft();
			router.push(vaultRoutes.DEPOSIT(res.position.id, { flow: true, amount: draft.planned_deposit }));
		}
	};

	return (
		<>
			<PageHeader title="Review Strategy" subtitle="Check the details before creating your Testnet vault" />
			<VaultSteps current={1} />

			<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,516px)]">
				<div className="flex min-w-0 flex-col gap-4">
					<Notice tone="warning" title="Prices and execution can change" className="animate-rise">
						{EXECUTION_DISCLAIMER}
					</Notice>
					<Panel className="animate-rise" style={{ "--i": 1 } as React.CSSProperties}>
						<PanelHeader title={draft.name} action={<Chip tone="soft">Draft</Chip>} />
						<p className="mt-6 text-[40px] leading-none tracking-[-0.06em] sm:text-[48px]">
							{source} → {target}
						</p>
						<p className="mt-6 border-b border-line pb-6 text-lg font-light text-muted">
							Spend {draft.purchase_amount} {source} {everyLabel(FREQUENCY_SECONDS[draft.frequency]).toLowerCase()} to acquire {target} at the price available at execution.
						</p>
						<dl className="mt-6 flex flex-col gap-4">
							<EditableRow label="Source asset" value={`Testnet ${source}`} />
							<EditableRow label="Target asset" value={`Testnet ${target}`} />
							<EditableRow label="Purchase amount" value={`${draft.purchase_amount} ${source}`} edit />
							<EditableRow label="Frequency" value={FREQ_NAME[draft.frequency]} edit />
							<EditableRow label="First eligible time" value={utcDateTime(startMs)} edit />
							<EditableRow label="Maximum slippage" value={`${Number(draft.max_slippage).toFixed(2)}%`} edit />
							<EditableRow label="End date" value={draft.end ? utcDate(`${draft.end}T00:00:00Z`) : "None"} edit />
							<EditableRow label="Network" value="Stellar Testnet" />
						</dl>
						{draft.frequency === "monthly" && <p className="mt-4 text-sm font-light text-muted">{MONTHLY_NOTE}</p>}
					</Panel>
				</div>

				<aside className="flex min-w-0 flex-col gap-4">
					<Panel className="animate-rise" style={{ "--i": 2 } as React.CSSProperties}>
						<PanelHeader title="Funding preview" />
						<dl className="mt-5 flex flex-col gap-4">
							<DetailRow label="Planned deposit" value={`${deposit.toLocaleString("en-US")} ${source}`} />
							<DetailRow label="Per purchase" value={`${purchase.toLocaleString("en-US")} ${source}`} />
							<DetailRow label="Purchase count" value={`${count} funded purchase${count === 1 ? "" : "s"}`} />
						</dl>
						<dl className="mt-6 flex flex-col gap-4 border-t border-line pt-6">
							<DetailRow label="Network fee" value="Calculated in wallet · XLM" />
							<DetailRow label="Execution fee" value="Shown before each submission" />
						</dl>
					</Panel>

					<Panel className="animate-rise" style={{ "--i": 3 } as React.CSSProperties}>
						<PanelHeader title={tx.stage === "idle" ? "Ready to create?" : "Creating your vault"} />
						{tx.stage === "idle" || tx.stage === "rejected" || tx.stage === "failed" ? (
							<>
								{tx.stage !== "idle" && (
									<Notice tone="error" title={tx.stage === "rejected" ? "Request declined" : "The vault wasn't created"} className="animate-pop mt-4">
										{tx.stage === "rejected" ? "You declined the request in your wallet. Nothing was submitted and no funds moved. Your settings are saved." : tx.error}
									</Notice>
								)}
								<label className="mt-5 flex cursor-pointer items-start gap-3 text-sm font-light text-muted">
									<input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[#ff6173]" />
									I understand this is Testnet, purchases are not guaranteed and there are no guaranteed returns.
								</label>
								<div className="mt-6 flex flex-wrap gap-3">
									<Button onClick={confirm} disabled={!agreed}>
										{tx.stage === "idle" ? "Confirm Strategy" : "Try again"} <ArrowRight />
									</Button>
									<Button asChild variant="outline">
										<Link href={vaultRoutes.CREATE}>Back to settings</Link>
									</Button>
								</div>
								{!agreed && <p className="caption mt-3">Tick the box to continue.</p>}
							</>
						) : (
							<TxProgress stage={tx.stage} className="mt-5" />
						)}
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
