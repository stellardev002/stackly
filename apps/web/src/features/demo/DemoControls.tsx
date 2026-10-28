"use client";

import { useCallback, useEffect, useState } from "react";
import { FastForward, FlaskConical, RotateCcw, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { SimSettings } from "@repo/mock-api/sim";
import { Button } from "@repo/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import { Switch } from "@repo/ui/switch";
import { cn } from "@repo/ui/lib/utils";
import { utcDateTime } from "@/lib/format";
import { useToast } from "@/lib/use-toast";
import { useWalletStore } from "@/features/wallet/store";
import { SIM_EVENT } from "@/features/demo/events";

const sim = () => import("@repo/mock-api/sim");

/**
 * Demo controls (mock mode only): drive the PRD's test scenarios by hand. Choose the account, make the next
 * wallet request or purchase fail, jump the clock to the next purchase so the simulated keeper runs, force
 * the loading / error screens, or start over. Every simulated transaction is labelled as demo data.
 */
export function DemoControls() {
	const queryClient = useQueryClient();
	const toast = useToast();
	const disconnect = useWalletStore((s) => s.disconnect);
	const [open, setOpen] = useState(false);
	const [settings, setSettings] = useState<SimSettings | null>(null);
	const [now, setNow] = useState<number | null>(null);

	const refresh = useCallback(async () => {
		const s = await sim();
		setSettings(s.getSim());
		setNow(s.demoNow());
	}, []);

	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		void sim().then((s) => {
			if (cancelled) return;
			setSettings(s.getSim());
			setNow(s.demoNow());
		});
		return () => {
			cancelled = true;
		};
	}, [open]);

	const changed = async () => {
		await refresh();
		window.dispatchEvent(new Event(SIM_EVENT));
		await queryClient.invalidateQueries();
	};

	const set = async (patch: Partial<SimSettings>) => {
		(await sim()).setSim(patch);
		await changed();
	};

	const skip = async () => {
		const moved = (await sim()).skipToNextPurchase();
		await changed();
		if (moved) toast.info("Clock moved to the next purchase. The keeper is picking it up…");
		else toast.warning("No active vault has a purchase scheduled. Fund and start a vault first.");
	};

	const switchAccount = async (account: SimSettings["account"]) => {
		await set({ account });
		disconnect();
		queryClient.clear();
		toast.info(account === "fresh" ? "Connect again to use a new wallet with no vault." : "Connect again to use the story wallet.");
	};

	const reset = async () => {
		(await sim()).resetMockDb();
		disconnect();
		queryClient.clear();
		await refresh();
		window.dispatchEvent(new Event(SIM_EVENT));
		toast.success("Demo data reset");
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger className="fixed bottom-4 left-4 z-50 flex h-11 cursor-pointer items-center gap-2 rounded-full bg-night px-4 text-sm text-white shadow-[0_12px_30px_-10px_rgba(14,4,5,0.6)] transition-transform duration-200 hover:-translate-y-0.5 sm:bottom-6 sm:left-6">
				<FlaskConical className="size-4 text-coral" aria-hidden /> Demo controls
			</PopoverTrigger>
			<PopoverContent
				side="top"
				align="start"
				sideOffset={12}
				className="max-h-[min(640px,calc(100dvh-6rem))] w-[min(360px,calc(100vw-2rem))] overflow-y-auto rounded-panel border-line bg-white p-5 shadow-[0_32px_80px_-24px_rgba(14,4,5,0.45)]"
			>
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-lg tracking-[-0.02em]">Demo controls</p>
						<p className="caption">Mock data in this browser · nothing touches the network</p>
					</div>
					<button type="button" onClick={() => setOpen(false)} className="cursor-pointer rounded-full p-1 hover:bg-blush" aria-label="Close demo controls">
						<X className="size-4" />
					</button>
				</div>

				{!settings ? (
					<div className="shimmer mt-4 h-60 rounded-card" />
				) : (
					<div className="mt-4 flex flex-col gap-5">
						<Group label="Demo clock">
							<p className="text-sm">{now ? utcDateTime(now) : "—"}</p>
							<Button size="sm" onClick={skip} className="mt-2 w-full">
								<FastForward /> Skip to next purchase
							</Button>
							<Toggle label="Keeper runs automatically" checked={settings.auto_keeper} onChange={(v) => set({ auto_keeper: v })} />
						</Group>

						<Group label="Next purchase">
							<Options
								value={settings.next_swap}
								onChange={(v) => set({ next_swap: v })}
								options={[
									{ value: "success", label: "Completes" },
									{ value: "slippage", label: "Slippage fail" },
									{ value: "liquidity", label: "Liquidity fail" },
								]}
							/>
						</Group>

						<Group label="Demo wallet">
							<Options
								value={settings.next_wallet}
								onChange={(v) => set({ next_wallet: v })}
								options={[
									{ value: "approve", label: "Approves" },
									{ value: "reject", label: "Rejects next" },
								]}
							/>
							<Toggle label="Demo wallet available" checked={settings.wallet_installed} onChange={(v) => set({ wallet_installed: v })} />
							<p className="caption">Freighter, xBull and Albedo are your real extensions: approve or reject in the extension itself.</p>
						</Group>

						<Group label="Demo wallet account">
							<Options
								value={settings.account}
								onChange={switchAccount}
								options={[
									{ value: "seeded", label: "Story wallet" },
									{ value: "fresh", label: "New wallet" },
								]}
							/>
						</Group>

						<Group label="Screen state">
							<Options
								value={settings.force}
								onChange={(v) => set({ force: v })}
								options={[
									{ value: "none", label: "Normal" },
									{ value: "loading", label: "Slow" },
									{ value: "error", label: "Error" },
								]}
							/>
						</Group>

						<Button variant="outline" size="sm" onClick={reset}>
							<RotateCcw /> Reset demo data
						</Button>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<fieldset className="flex flex-col gap-2">
			<legend className="caption mb-2 tracking-wide uppercase">{label}</legend>
			{children}
		</fieldset>
	);
}

function Options<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
	return (
		<div className="flex flex-wrap gap-1.5">
			{options.map((o) => (
				<button
					key={o.value}
					type="button"
					aria-pressed={o.value === value}
					onClick={() => onChange(o.value)}
					className={cn("h-8 cursor-pointer rounded-full px-3 text-sm transition-colors", o.value === value ? "bg-night text-white" : "bg-page text-ink hover:bg-blush")}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<label className="mt-1 flex items-center justify-between gap-3 text-sm">
			{label}
			<Switch checked={checked} onCheckedChange={onChange} />
		</label>
	);
}
