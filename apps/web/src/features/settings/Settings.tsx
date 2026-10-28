"use client";

import { useState } from "react";
import { Button } from "@repo/ui/button";
import { Field, PillInput } from "@repo/ui/field";
import { Switch } from "@repo/ui/switch";
import { Chip, DetailRow, Notice, Panel } from "@repo/ui/surface";
import type { NotificationEvent, SettingsDto } from "@/lib/api/dto";
import { errorMessage } from "@/lib/api/errors";
import { shortKey } from "@/lib/stellar/config";
import { useToast } from "@/lib/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, SkeletonLines } from "@/components/states";
import { useSignOut } from "@/features/auth/hooks";
import { useWalletStore } from "@/features/wallet/store";
import { WalletIcon } from "@/features/wallet/components/WalletIcon";
import { NOTIFICATION_LABEL, useSettings, useUpdateSettings } from "@/features/settings/hooks";
import { usePreferences, type LocalPreferences } from "@/features/settings/store";

/**
 * Screen 12 (Figma 28:10476 + Validation 40:29082 + Error 40:31212). Default slippage and notification muting are
 * saved to your Stackly account (`PATCH /settings`); review-before-sign and open-explorer stay in this browser.
 */
export function Settings() {
	const settings = useSettings();
	return (
		<>
			<PageHeader title="Settings" subtitle="Your wallet, network and preferences" />
			{settings.isError ? (
				<ErrorState error={settings.error} title="We couldn't load your settings" onRetry={() => void settings.refetch()} />
			) : settings.isPending ? (
				<Panel aria-busy="true">
					<SkeletonLines rows={6} />
				</Panel>
			) : (
				<SettingsForm server={settings.data} />
			)}
		</>
	);
}

function SettingsForm({ server }: { server: SettingsDto }) {
	const toast = useToast();
	const signOut = useSignOut();
	const update = useUpdateSettings();
	const { address, walletId } = useWalletStore();
	const { save: saveLocal, ...savedLocal } = usePreferences();
	const [slippage, setSlippage] = useState((server.defaultSlippageBps / 100).toFixed(2));
	const [muted, setMuted] = useState<NotificationEvent[]>(server.mutedNotifications);
	const [local, setLocal] = useState<LocalPreferences>(savedLocal);
	const [confirming, setConfirming] = useState(false);

	const value = Number(slippage);
	const slippageError = slippage.trim() === "" ? "Enter a default slippage" : Number.isNaN(value) ? "Use a number, like 1" : value < 0.1 || value > 5 ? "Choose between 0.1% and 5%" : undefined;
	const bps = Math.round(value * 100);
	const dirty =
		bps !== server.defaultSlippageBps ||
		[...muted].sort().join() !== [...server.mutedNotifications].sort().join() ||
		local.reviewBeforeSign !== savedLocal.reviewBeforeSign ||
		local.openExplorer !== savedLocal.openExplorer;

	const toggleEvent = (event: NotificationEvent, on: boolean) => setMuted((m) => (on ? m.filter((e) => e !== event) : [...new Set([...m, event])]));

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (slippageError) return;
		try {
			await update.mutateAsync({ defaultSlippageBps: bps, mutedNotifications: muted });
			saveLocal(local);
			setSlippage((bps / 100).toFixed(2));
			toast.success("Preferences saved", { description: "Slippage and notifications are saved to your Stackly account." });
		} catch (error) {
			toast.error("Couldn't save preferences", { description: errorMessage(error) });
		}
	};

	return (
		<form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-2">
			<div className="flex min-w-0 flex-col gap-6">
				<Panel className="animate-rise">
					<div className="flex items-start justify-between gap-3">
						<h2 className="h-card">Connected wallet</h2>
						<Chip tone="success">Signed in</Chip>
					</div>
					<div className="mt-5 flex items-center gap-3">
						<WalletIcon id={walletId ?? "freighter"} />
						<dl className="flex flex-col gap-2">
							<DetailRow label="Provider" value={<span className="capitalize">{walletId ?? "—"}</span>} />
							<DetailRow
								label="Address"
								value={
									<span className="font-mono" title={address ?? undefined}>
										{address ? shortKey(address, 6, 6) : "—"}
									</span>
								}
							/>
						</dl>
					</div>
					<dl className="mt-4 flex flex-col gap-2">
						<DetailRow label="Stellar network" value="Testnet · Test SDF Network ; September 2015" />
					</dl>
					<div className="mt-6 border-t border-line pt-6">
						{confirming ? (
							<div className="animate-pop flex flex-wrap items-center gap-3">
								<p className="text-sm text-muted">Disconnect and sign out? Your vaults stay on chain.</p>
								<Button
									type="button"
									variant="danger"
									size="sm"
									onClick={async () => {
										await signOut();
										toast.info("Signed out. Your vaults stay on chain.");
									}}
								>
									Disconnect
								</Button>
								<Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
									Cancel
								</Button>
							</div>
						) : (
							<Button type="button" variant="outline" onClick={() => setConfirming(true)}>
								Disconnect wallet
							</Button>
						)}
					</div>
				</Panel>

				<Panel className="animate-rise" style={{ "--i": 1 } as React.CSSProperties}>
					<h2 className="h-card">Notifications</h2>
					<p className="caption mt-1">In-app notices (the bell and toasts). Saved to your account.</p>
					<div className="mt-5 flex flex-col gap-5">
						{server.availableNotifications.map((event) => (
							<ToggleRow key={event} id={event} label={NOTIFICATION_LABEL[event]?.label ?? event} hint={NOTIFICATION_LABEL[event]?.hint ?? ""} checked={!muted.includes(event)} onChange={(on) => toggleEvent(event, on)} />
						))}
					</div>
				</Panel>
			</div>

			<div className="flex min-w-0 flex-col gap-6">
				<Notice tone="warning" title="Never share your recovery phrase" className="animate-rise">
					Stackly will not ask for your secret key. Authorize transactions only inside your trusted wallet.
				</Notice>
				<Panel className="animate-rise" style={{ "--i": 2 } as React.CSSProperties}>
					<h2 className="h-card">Transaction preferences</h2>
					<div className="mt-5 flex flex-col gap-6">
						<Field label="Default maximum slippage" htmlFor="defaultSlippage" error={slippageError} hint="Pre-fills new vaults. Existing vaults keep the limit fixed in their signed purchases.">
							<PillInput id="defaultSlippage" inputMode="decimal" value={slippage} onChange={(e) => setSlippage(e.target.value)} invalid={!!slippageError} trailing="%" />
						</Field>
						<ToggleRow
							id="reviewBeforeSign"
							label="Review before wallet request"
							hint="Show the summary before asking you to sign a withdrawal. This browser only."
							checked={local.reviewBeforeSign}
							onChange={(v) => setLocal((l) => ({ ...l, reviewBeforeSign: v }))}
						/>
						<ToggleRow
							id="openExplorer"
							label="Open Explorer after confirmation"
							hint="Opens confirmed deposits on Stellar Explorer. This browser only."
							checked={local.openExplorer}
							onChange={(v) => setLocal((l) => ({ ...l, openExplorer: v }))}
						/>
					</div>
					<div className="mt-6 flex flex-wrap items-center gap-3">
						<Button type="submit" isLoading={update.isPending} loadingText="Saving…" disabled={!!slippageError || !dirty}>
							Save preferences
						</Button>
						{dirty && !update.isPending && <span className="caption animate-rise">Unsaved changes</span>}
					</div>
				</Panel>
			</div>
		</form>
	);
}

function ToggleRow({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<div className="flex items-center justify-between gap-4">
			<label htmlFor={id} className="min-w-0 cursor-pointer">
				<span className="block text-base">{label}</span>
				<span className="caption block">{hint}</span>
			</label>
			<Switch id={id} checked={checked} onCheckedChange={onChange} />
		</div>
	);
}
