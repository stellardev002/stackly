"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { FREQUENCY_SECONDS, MONTHLY_NOTE, type AssetRef, type Frequency } from "@repo/stellar/vault";
import { Button } from "@repo/ui/button";
import { Segmented } from "@repo/ui/choice";
import { Field, PillInput } from "@repo/ui/field";
import { Chip, DetailRow, Notice, Panel } from "@repo/ui/surface";
import { useNow } from "@/lib/clock";
import { everyLabel, money, utcDayMonth, utcTime } from "@/lib/format";
import { vaultRoutes } from "@/lib/routes";
import { withBasePath } from "@/lib/site";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, SkeletonLines } from "@/components/states";
import { useSettings } from "@/features/settings/hooks";
import { useWalletBalances } from "@/features/wallet/hooks";
import { useAssets } from "@/features/vaults/assets";
import { createVaultSchema, msToUtcInput, type CreateVaultValues } from "@/features/vaults/schema";
import { useVaultDraft } from "@/features/vaults/store";
import { AssetSelect } from "@/features/vaults/components/AssetSelect";
import { VaultSteps } from "@/features/vaults/components/VaultSteps";

const FREQUENCIES: { value: Frequency; label: string }[] = [
	{ value: "daily", label: "Daily" },
	{ value: "weekly", label: "Weekly" },
	{ value: "monthly", label: "Monthly" },
];

/** Screen 4 (Figma 28:12731 + Validation 40:29725). Waits for the supported assets and your default slippage. */
export function CreateVault() {
	const assets = useAssets();
	const settings = useSettings();
	const header = (
		<>
			<PageHeader title="Create DCA Vault" subtitle="Configure a new USDC → XLM vault. This draft has not been created." />
			<VaultSteps current={0} />
		</>
	);

	if (assets.isError || settings.isError) {
		return (
			<>
				{header}
				<ErrorState error={assets.error ?? settings.error} onRetry={() => void Promise.all([assets.refetch(), settings.refetch()])} />
			</>
		);
	}
	if (assets.isPending || settings.isPending || !assets.data.usdc || !assets.data.xlm) {
		return (
			<>
				{header}
				<Panel aria-busy="true">
					<SkeletonLines rows={6} />
				</Panel>
			</>
		);
	}
	return <CreateVaultForm header={header} source={assets.data.usdc} target={assets.data.xlm} defaultSlippage={(settings.data.defaultSlippageBps / 100).toFixed(2)} />;
}

function CreateVaultForm({ header, source, target, defaultSlippage }: { header: React.ReactNode; source: AssetRef; target: AssetRef; defaultSlippage: string }) {
	const router = useRouter();
	const now = useNow();
	const { draft, setDraft } = useVaultDraft();
	const wallet = useWalletBalances();
	const [initialStart] = useState(() => msToUtcInput(Math.ceil((Date.now() + 600_000) / 300_000) * 300_000));

	const form = useForm<CreateVaultValues>({
		resolver: zodResolver(createVaultSchema),
		mode: "onTouched",
		defaultValues:
			draft && draft.source_asset === source.id
				? draft
				: {
						source_asset: source.id,
						target_asset: target.id,
						purchase_amount: "5",
						frequency: "weekly",
						start: initialStart,
						end: "",
						max_slippage: defaultSlippage,
						planned_deposit: "20",
					},
	});
	const { register, control, handleSubmit, formState } = form;
	const errors = formState.errors;
	const values = useWatch({ control });

	const frequency = (values.frequency ?? "weekly") as Frequency;
	const amount = Number(values.purchase_amount) || 0;
	const deposit = Number(values.planned_deposit) || 0;
	const funded = amount > 0 ? Math.floor(deposit / amount) : 0;
	const startMs = values.start ? Date.parse(`${values.start}:00Z`) : now;

	const submit = handleSubmit((data) => {
		setDraft(data);
		router.push(vaultRoutes.REVIEW);
	});

	return (
		<>
			{header}

			<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,516px)]">
				<form onSubmit={submit} noValidate className="order-2 min-w-0 lg:order-1">
					<Panel className="animate-rise flex flex-col gap-6" style={{ "--i": 1 } as React.CSSProperties}>
						<h2 className="text-base">Purchase settings</h2>

						<div className="grid gap-6 sm:grid-cols-2">
							<Field label="Source asset" htmlFor="source_asset" error={errors.source_asset?.message}>
								<Controller control={control} name="source_asset" render={({ field }) => <AssetSelect id="source_asset" value={field.value} onChange={field.onChange} assets={[source]} />} />
							</Field>
							<Field label="Target asset" htmlFor="target_asset" error={errors.target_asset?.message}>
								<Controller
									control={control}
									name="target_asset"
									render={({ field }) => <AssetSelect id="target_asset" value={field.value} onChange={field.onChange} assets={[target]} invalid={!!errors.target_asset} />}
								/>
							</Field>
						</div>

						<Field label="Purchase amount" htmlFor="purchase_amount" error={errors.purchase_amount?.message}>
							<PillInput id="purchase_amount" inputMode="decimal" autoComplete="off" invalid={!!errors.purchase_amount} trailing={<span className="flex items-center gap-2">USDC <Pencil className="size-4" aria-hidden /></span>} {...register("purchase_amount")} />
						</Field>

						<div className="flex flex-col gap-2">
							<span id="frequency-label" className="text-sm font-light text-muted">
								Purchase frequency
							</span>
							<Controller control={control} name="frequency" render={({ field }) => <Segmented label="Purchase frequency" value={field.value} onChange={field.onChange} options={FREQUENCIES} />} />
							{frequency === "monthly" ? (
								<p key="monthly" className="animate-rise text-sm font-light text-muted">
									{MONTHLY_NOTE}
								</p>
							) : (
								<p className="text-sm font-light text-muted">{frequency === "daily" ? "Daily is every 24 hours." : "Weekly is every 7 days."}</p>
							)}
						</div>

						<div className="grid gap-6 sm:grid-cols-2">
							<Field label="Start date · UTC" htmlFor="start" error={errors.start?.message}>
								<PillInput id="start" type="datetime-local" min={msToUtcInput(now)} invalid={!!errors.start} {...register("start")} />
							</Field>
							<Field label="Maximum slippage" htmlFor="max_slippage" error={errors.max_slippage?.message} hint="Purchases that would receive less are rejected.">
								<PillInput id="max_slippage" inputMode="decimal" autoComplete="off" invalid={!!errors.max_slippage} trailing="%" {...register("max_slippage")} />
							</Field>
						</div>

						<Field label="End date · optional" htmlFor="end" error={errors.end?.message} hint="Leave empty to keep buying until you pause or the vault runs out.">
							<PillInput id="end" type="date" min={values.start?.slice(0, 10)} invalid={!!errors.end} {...register("end")} />
						</Field>

						<Field
							label="Planned deposit"
							htmlFor="planned_deposit"
							error={errors.planned_deposit?.message}
							hint={
								wallet.data
									? `You'll fund the vault in step 3. Wallet balance: ${wallet.data.usdc === null ? "no USDC trustline yet" : money(wallet.data.usdc, "USDC")}.`
									: "You'll fund the vault in step 3. Used to estimate how many purchases it covers."
							}
						>
							<PillInput id="planned_deposit" inputMode="decimal" autoComplete="off" invalid={!!errors.planned_deposit} trailing="USDC" {...register("planned_deposit")} />
						</Field>

						<Button type="submit" className="mt-2 w-full sm:w-fit">
							Review Strategy
						</Button>
					</Panel>
				</form>

				<aside className="order-1 flex min-w-0 flex-col gap-6 lg:order-2">
					<Notice tone="warning" title="A schedule is not a guarantee" className="animate-rise">
						Purchases become eligible at each interval. Liquidity, execution conditions or an insufficient balance can prevent a purchase.
					</Notice>
					<section
						className="animate-rise relative isolate hidden min-h-[430px] overflow-hidden rounded-card bg-[#1e0a0d] p-6 text-white sm:block"
						style={{ "--i": 2 } as React.CSSProperties}
						aria-label="Draft summary"
					>
						<div className="flex items-start justify-between">
							<p className="text-base">Your draft at a glance</p>
							<Chip tone="accent">Draft</Chip>
						</div>
						<p className="stat-value mt-6">{amount > 0 ? `${amount.toLocaleString("en-US")} USDC` : "— USDC"}</p>
						<p className="mt-6 text-base">{everyLabel(FREQUENCY_SECONDS[frequency])}, towards XLM.</p>
						<dl className="mt-3 flex flex-col gap-3 [&_dd]:text-white [&_dt]:text-white/70">
							<DetailRow label="First eligible" value={`${utcDayMonth(startMs)} · ${utcTime(startMs)} UTC`} />
							<DetailRow label="Planned funding" value={deposit > 0 ? `${deposit.toLocaleString("en-US")} USDC` : "—"} />
							<DetailRow label="Funded purchases" value={funded > 0 ? `${funded} × ${amount.toLocaleString("en-US")} USDC` : "—"} />
						</dl>
						<Image src={withBasePath("/images/laptop-person.svg")} alt="" width={285} height={250} className="absolute -right-6 -bottom-4 -z-10 h-auto w-[210px] opacity-95 xl:w-[250px]" />
					</section>
				</aside>
			</div>
		</>
	);
}
