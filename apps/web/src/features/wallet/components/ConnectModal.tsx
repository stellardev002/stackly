"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/dialog";
import { Spinner } from "@repo/ui/spinner";
import { Chip, Notice } from "@repo/ui/surface";
import { cn } from "@repo/ui/lib/utils";
import { USE_MOCK_API } from "@/lib/api/source";
import { errorMessage, isWalletRejection } from "@/lib/api/errors";
import { shortKey } from "@/lib/stellar/config";
import { INSTALL_URL, connectWallet, isRealWallet, listWallets, type WalletId, type WalletOption } from "@/features/wallet/kit";
import { useWalletStore } from "@/features/wallet/store";
import { WalletIcon } from "@/features/wallet/components/WalletIcon";
import { FundTestnetButton } from "@/features/wallet/components/FundTestnetButton";
import { SIM_EVENT } from "@/features/demo/events";

type Phase =
	| { name: "idle" }
	| { name: "connecting" }
	| { name: "rejected"; message: string }
	| { name: "failed"; message: string }
	| { name: "connected"; address: string; funded: boolean | null };

/**
 * Screen 2: wallet connection, a modal over the dashboard (Figma 28:13768 and its Loading / Empty / Error frames),
 * plus the PRD gaps the design left: a Testnet indicator and a connected confirmation with "Continue to Dashboard".
 * Freighter, xBull and Albedo connect the real extension on Stellar Testnet; in mock mode the Demo wallet needs no
 * extension. A real account that doesn't exist on Testnet yet can be funded with Friendbot right here.
 */
export function ConnectModal({ open }: { open: boolean }) {
	const setConnected = useWalletStore((s) => s.setConnected);
	const [wallets, setWallets] = useState<WalletOption[] | null>(null);
	const [selected, setSelected] = useState<WalletId>("freighter");
	const [phase, setPhase] = useState<Phase>({ name: "idle" });

	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		const load = () =>
			listWallets()
				.then((list) => {
					if (cancelled) return;
					setWallets(list);
					const firstAvailable = list.find((w) => w.available);
					if (firstAvailable) setSelected((current) => (list.find((w) => w.id === current)?.available ? current : firstAvailable.id));
				})
				.catch(() => !cancelled && setWallets([]));
		void load();
		// The demo controls can "install" or "uninstall" the demo wallet while the modal is open.
		window.addEventListener(SIM_EVENT, load);
		return () => {
			cancelled = true;
			window.removeEventListener(SIM_EVENT, load);
		};
	}, [open]);

	const noneDetected = wallets !== null && !wallets.some((w) => w.available);
	const current = wallets?.find((w) => w.id === selected);
	const connecting = phase.name === "connecting";

	const connect = async () => {
		setPhase({ name: "connecting" });
		try {
			const address = await connectWallet(selected);
			let funded: boolean | null = null;
			if (isRealWallet(selected)) {
				// Mock data: give the real address demo balances so the full flow works with real signatures.
				if (USE_MOCK_API) (await import("@repo/mock-api/sim")).ensureWallet(address, selected);
				const { isFundedOnTestnet } = await import("@/features/wallet/testnet");
				funded = await isFundedOnTestnet(address).catch(() => null);
			}
			setPhase({ name: "connected", address, funded });
		} catch (error) {
			if (isWalletRejection(error)) setPhase({ name: "rejected", message: errorMessage(error) });
			else if ((error as Error)?.name === "WalletNotFoundError") setWallets((list) => list?.map((w) => (w.id === "demo" ? { ...w, available: false } : w)) ?? []);
			else setPhase({ name: "failed", message: errorMessage(error, "The wallet didn't respond. Check it's unlocked and set to Testnet.") });
		}
	};

	const finish = () => phase.name === "connected" && setConnected(phase.address, selected);

	return (
		<Dialog open={open}>
			<DialogContent
				showCloseButton={false}
				onEscapeKeyDown={(e) => e.preventDefault()}
				onPointerDownOutside={(e) => e.preventDefault()}
				className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-panel border-0 bg-white p-6 shadow-[0_32px_80px_-24px_rgba(14,4,5,0.45)] sm:max-w-[690px] sm:p-8"
			>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<DialogTitle className="text-[34px] leading-[1.05] font-normal tracking-[-0.05em] text-ink sm:text-[44px]">{phase.name === "connected" ? "Wallet connected" : "Connect a wallet"}</DialogTitle>
					<Chip tone="warning">Stellar Testnet</Chip>
				</div>
				<DialogDescription className="mt-2 text-base font-light text-muted">
					{phase.name === "connected" ? "You're ready to set up a recurring purchase." : "Choose a wallet you own. Stackly never asks for your recovery phrase or private keys."}
				</DialogDescription>

				{phase.name === "connected" ? (
					<div className="animate-pop mt-6 flex flex-col gap-5">
						<div className="flex items-center gap-4 rounded-card bg-blush p-5">
							<span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-coral text-white">
								<svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
									<path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="animate-check" />
								</svg>
							</span>
							<div className="min-w-0">
								<p className="text-lg">{current?.name ?? "Wallet"} connected</p>
								<p className="font-mono text-sm break-all text-muted" title={phase.address}>
									{shortKey(phase.address, 6, 6)} · Testnet
								</p>
							</div>
						</div>
						{isRealWallet(selected) && USE_MOCK_API && (
							<Notice tone="info" title="Real signatures, demo balances">
								Each action asks {current?.name} to sign a real Stellar Testnet transaction that moves no funds, so you get a real hash on Stellar Explorer. Vault balances
								and purchases are demo data until the vault contract is deployed.
							</Notice>
						)}
						{phase.funded === false && (
							<Notice tone="warning" title="This account isn't on Testnet yet" action={<FundTestnetButton address={phase.address} onFunded={() => setPhase({ ...phase, funded: true })} />}>
								Stellar accounts need a few test XLM before they can sign. Friendbot sends 10,000 Testnet XLM (no real value).
							</Notice>
						)}
						<Button onClick={finish} className="w-fit" autoFocus>
							Continue to Dashboard <ArrowRight />
						</Button>
					</div>
				) : (
					<>
						<div className="mt-6 flex flex-col gap-4" aria-live="polite">
							{noneDetected && (
								<Notice tone="info" title="No compatible wallet detected">
									Install a supported wallet, then return here to connect. No wallet is connected yet.
								</Notice>
							)}
							{phase.name === "rejected" && (
								<Notice tone="error" title="Connection rejected">
									You declined the request in {current?.name}. Your wallet is not connected and no funds have moved. Try again and approve access in your wallet.
								</Notice>
							)}
							{phase.name === "failed" && (
								<Notice tone="error" title="Couldn't connect">
									{phase.message}
								</Notice>
							)}
						</div>

						<div role="radiogroup" aria-label="Wallet" className="mt-4 flex flex-col gap-3">
							{(wallets ?? [null, null, null]).map((wallet, index) =>
								wallet ? (
									<div
										key={wallet.id}
										className={cn(
											"animate-rise flex w-full items-center gap-4 rounded-card border px-5 py-4 transition-colors duration-200",
											selected === wallet.id && wallet.available ? "border-transparent bg-blush" : "border-line bg-white",
											wallet.available && "hover:border-rose",
											connecting && selected !== wallet.id && "opacity-50",
										)}
										style={{ "--i": index } as React.CSSProperties}
									>
										<button
											type="button"
											role="radio"
											aria-checked={selected === wallet.id}
											disabled={connecting || !wallet.available}
											onClick={() => setSelected(wallet.id)}
											className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-coral/40 disabled:cursor-default"
										>
											<WalletIcon id={wallet.id} />
											<span className="min-w-0 flex-1">
												<span className="block text-xl leading-6 tracking-[-0.02em]">{wallet.name}</span>
												<span className="caption block">
													{wallet.kind}
													{wallet.recommended && " · Recommended"}
												</span>
											</span>
										</button>
										{connecting && selected === wallet.id ? (
											<Spinner className="text-coral" />
										) : !wallet.available ? (
											wallet.id === "demo" ? (
												<Chip tone="soft">Not detected</Chip>
											) : (
												<a href={INSTALL_URL[wallet.id]} target="_blank" rel="noreferrer" className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-blush px-3 text-xs hover:bg-rose">
													Install <ArrowUpRight className="size-3" aria-hidden />
												</a>
											)
										) : connecting ? (
											<Chip tone="neutral">Waiting</Chip>
										) : selected === wallet.id ? (
											<Chip tone="accent">
												<Check className="size-3" aria-hidden /> Selected
											</Chip>
										) : (
											<Chip tone="neutral">Available</Chip>
										)}
									</div>
								) : (
									<div key={index} className="shimmer h-[78px] rounded-card" aria-hidden />
								),
							)}
						</div>

						<div className="mt-8 flex flex-col gap-3">
							{noneDetected ? (
								<Button asChild className="w-fit">
									<a href={INSTALL_URL.freighter} target="_blank" rel="noreferrer">
										Install Freighter
									</a>
								</Button>
							) : (
								<Button onClick={connect} isLoading={connecting} loadingText={`Connecting ${current?.name ?? ""}…`} disabled={!current?.available} className="w-fit">
									{phase.name === "rejected" || phase.name === "failed" ? `Retry with ${current?.name}` : `Connect ${current?.name ?? "wallet"}`}
								</Button>
							)}
							{selected === "freighter" && current?.available && phase.name === "idle" && <p className="caption">Set Freighter to Testnet first (Freighter → Settings → Network).</p>}
							{(phase.name === "rejected" || phase.name === "failed") && <p className="caption">Or select another wallet above to connect.</p>}
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
