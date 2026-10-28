"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@repo/ui/button";
import { Field, PillInput } from "@repo/ui/field";
import { Switch } from "@repo/ui/switch";
import { Chip, DetailRow, Notice, Panel } from "@repo/ui/surface";
import { shortKey } from "@/lib/stellar/config";
import { useToast } from "@/lib/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { useWalletStore } from "@/features/wallet/store";
import { WalletIcon } from "@/features/wallet/components/WalletIcon";
import { usePreferences, type Preferences } from "@/features/settings/store";

/** Screen 12 (Figma 28:10476 + Validation 40:29082 + Error 40:31212). Preferences live in this browser. */
export function Settings() {
	const toast = useToast();
	const queryClient = useQueryClient();
	const { address, walletId, disconnect } = useWalletStore();
	const { save, ...saved } = usePreferences();
	const [form, setForm] = useState<Preferences>(saved);
	const [confirming, setConfirming] = useState(false);
	const [saving, setSaving] = useState(false);

	const slippage = Number(form.defaultSlippage);
	const slippageError = form.defaultSlippage.trim() === "" ? "Enter a default slippage" : Number.isNaN(slippage) ? "Use a number, like 0.5" : slippage < 0.1 || slippage > 5 ? "Choose between 0.1% and 5%" : undefined;
	const dirty = (Object.keys(saved) as (keyof Preferences)[]).some((key) => saved[key] !== form[key]);
	const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => setForm((f) => ({ ...f, [key]: value }));

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (slippageError) return;
		setSaving(true);
		await new Promise((resolve) => setTimeout(resolve, 450));
		save({ ...form, defaultSlippage: slippage.toFixed(2) });
		setForm((f) => ({ ...f, defaultSlippage: slippage.toFixed(2) }));
		setSaving(false);
		toast.success("Preferences saved", { description: "Stored in this browser." });
	};

	const signOut = () => {
		disconnect();
		queryClient.clear();
		toast.info("Wallet disconnected. Your vaults stay on chain.");
	};

	return (
		<>
			<PageHeader title="Settings" subtitle="Your wallet, network and preferences" />
			<form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-2">
				<div className="flex min-w-0 flex-col gap-6">
					<Panel className="animate-rise">
						<div className="flex items-start justify-between gap-3">
							<h2 className="h-card">Connected wallet</h2>
							<Chip tone="soft">{walletId === "demo" ? "Demo wallet" : "Connected"}</Chip>
						</div>
						<div className="mt-5 flex items-center gap-3">
							<WalletIcon id={walletId ?? "freighter"} />
							<dl className="flex flex-col gap-2">
								<DetailRow label="Provider" value={<span className="capitalize">{walletId === "demo" ? "Demo wallet · simulated signatures" : walletId ? `${walletId} · real Testnet signatures` : "—"}</span>} />
								<DetailRow label="Address" value={<span className="font-mono" title={address ?? undefined}>{address ? shortKey(address, 6, 6) : "—"}</span>} />
							</dl>
						</div>
						<dl className="mt-4 flex flex-col gap-2">
							<DetailRow label="Stellar network" value="Testnet · Test SDF Network ; September 2015" />
						</dl>
						<div className="mt-6 border-t border-line pt-6">
							{confirming ? (
								<div className="animate-pop flex flex-wrap items-center gap-3">
									<p className="text-sm text-muted">Disconnect this wallet? Your vaults stay on chain.</p>
									<Button type="button" variant="danger" size="sm" onClick={signOut}>
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
						<p className="caption mt-1">In-app notices while Stackly is open.</p>
						<div className="mt-5 flex flex-col gap-5">
							<ToggleRow id="notifyPurchases" label="Purchase updates" hint="In-app notice after each completed purchase." checked={form.notifyPurchases} onChange={(v) => set("notifyPurchases", v)} />
							<ToggleRow id="notifyAttention" label="Execution needs attention" hint="In-app alerts for failed or skipped purchases." checked={form.notifyAttention} onChange={(v) => set("notifyAttention", v)} />
							<ToggleRow id="notifyFunding" label="Funding reminders" hint="Alert when fewer than 2 purchases are funded." checked={form.notifyFunding} onChange={(v) => set("notifyFunding", v)} />
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
							<Field label="Default maximum slippage" htmlFor="defaultSlippage" error={slippageError} hint="Pre-fills new vaults. Existing vaults keep their own limit.">
								<PillInput id="defaultSlippage" inputMode="decimal" value={form.defaultSlippage} onChange={(e) => set("defaultSlippage", e.target.value)} invalid={!!slippageError} trailing="%" />
							</Field>
							<ToggleRow id="reviewBeforeSign" label="Review before wallet request" hint="Show the summary before asking you to sign a withdrawal." checked={form.reviewBeforeSign} onChange={(v) => set("reviewBeforeSign", v)} />
							<ToggleRow id="openExplorer" label="Open Explorer after confirmation" hint="Opens confirmed deposits on Stellar Explorer (live mode)." checked={form.openExplorer} onChange={(v) => set("openExplorer", v)} />
						</div>
						<div className="mt-6 flex flex-wrap items-center gap-3">
							<Button type="submit" isLoading={saving} loadingText="Saving…" disabled={!!slippageError || !dirty}>
								Save preferences
							</Button>
							{dirty && !saving && <span className="caption animate-rise">Unsaved changes</span>}
						</div>
					</Panel>
				</div>
			</form>
		</>
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
