"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, KeyRound } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/dialog";
import { Spinner } from "@repo/ui/spinner";
import { Chip, Notice } from "@repo/ui/surface";
import { cn } from "@repo/ui/lib/utils";
import { login } from "@/lib/api/auth";
import { publicApi } from "@/lib/api/client";
import { errorMessage, isWalletRejection } from "@/lib/api/errors";
import { shortKey } from "@/lib/stellar/config";
import { useSession } from "@/features/auth/store";
import { INSTALL_URL, connectWallet, listWallets, signMessage, type WalletId, type WalletOption } from "@/features/wallet/kit";
import { useWalletStore } from "@/features/wallet/store";
import { isFundedOnTestnet } from "@/features/wallet/testnet";
import { WalletIcon } from "@/features/wallet/components/WalletIcon";
import { FundTestnetButton } from "@/features/wallet/components/FundTestnetButton";

type Phase =
	| { name: "idle" }
	| { name: "connecting" }
	| { name: "signing"; address: string }
	| { name: "rejected"; message: string; address?: string }
	| { name: "failed"; message: string; address?: string }
	| { name: "connected"; address: string; funded: boolean | null };

/**
 * Screen 2: wallet connection, a modal over the dashboard (Figma 28:13768 and its Loading / Empty / Error frames).
 * Two wallet steps: connect (share the address), then sign in (sign the backend's one-time message, which proves
 * ownership; no transaction, no fee). With `resume`, the wallet is already connected and only signs in again.
 */
export function ConnectModal({ open, resume }: { open: boolean; resume?: { address: string; walletId: WalletId } }) {
	const queryClient = useQueryClient();
	const setConnected = useWalletStore((s) => s.setConnected);
	const setTokens = useSession((s) => s.setTokens);
	const [wallets, setWallets] = useState<WalletOption[] | null>(null);
	const [selected, setSelected] = useState<WalletId>(resume?.walletId ?? "freighter");
	const [phase, setPhase] = useState<Phase>({ name: "idle" });

	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		listWallets()
			.then((list) => {
				if (cancelled) return;
				setWallets(list);
				const firstAvailable = list.find((w) => w.available);
				if (firstAvailable && !resume) setSelected((current) => (list.find((w) => w.id === current)?.available ? current : firstAvailable.id));
			})
			.catch(() => !cancelled && setWallets([]));
		return () => {
			cancelled = true;
		};
	}, [open, resume]);

	const noneDetected = wallets !== null && !wallets.some((w) => w.available);
	const current = wallets?.find((w) => w.id === selected);
	const walletName = current?.name ?? "your wallet";
	const busy = phase.name === "connecting" || phase.name === "signing";

	const signIn = async (address: string) => {
		setPhase({ name: "signing", address });
		const tokens = await login(publicApi, address, (message) => signMessage(message, address));
		setTokens(address, tokens);
		const funded = await isFundedOnTestnet(address).catch(() => null);
		setPhase({ name: "connected", address, funded });
	};

	const start = async () => {
		let address = phase.name === "rejected" || phase.name === "failed" ? phase.address : resume?.address;
		try {
			if (!address) {
				setPhase({ name: "connecting" });
				address = await connectWallet(selected);
			}
			await signIn(address);
		} catch (error) {
			if (isWalletRejection(error)) setPhase({ name: "rejected", message: errorMessage(error), address });
			else setPhase({ name: "failed", message: errorMessage(error, "The wallet didn't respond. Check it's unlocked and set to Testnet."), address });
		}
	};

	const finish = () => {
		if (phase.name !== "connected") return;
		queryClient.clear();
		setConnected(phase.address, selected);
	};

	const title = phase.name === "connected" ? "You're signed in" : resume ? "Sign in again" : "Connect a wallet";

	return (
		<Dialog open={open}>
			<DialogContent
				showCloseButton={false}
				onEscapeKeyDown={(e) => e.preventDefault()}
				onPointerDownOutside={(e) => e.preventDefault()}
				className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-panel border-0 bg-white p-6 shadow-[0_32px_80px_-24px_rgba(14,4,5,0.45)] sm:max-w-[690px] sm:p-8"
			>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<DialogTitle className="text-[34px] leading-[1.05] font-normal tracking-[-0.05em] text-ink sm:text-[44px]">{title}</DialogTitle>
					<Chip tone="warning">Stellar Testnet</Chip>
				</div>
				<DialogDescription className="mt-2 text-base font-light text-muted">
					{phase.name === "connected"
						? "You're ready to set up a recurring purchase."
						: resume
							? "Your session expired. Sign a one-time message in your wallet to continue. It costs nothing and moves no funds."
							: "Choose a wallet you own. Stackly never asks for your recovery phrase or private keys."}
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
								<p className="text-lg">{walletName} connected</p>
								<p className="font-mono text-sm break-all text-muted" title={phase.address}>
									{shortKey(phase.address, 6, 6)} · Testnet
								</p>
							</div>
						</div>
						{phase.funded === false && (
							<Notice tone="warning" title="This account isn't on Testnet yet" action={<FundTestnetButton address={phase.address} onFunded={() => setPhase({ ...phase, funded: true })} />}>
								Stellar accounts need a few test XLM before they can sign transactions. Friendbot sends 10,000 Testnet XLM (no real value).
							</Notice>
						)}
						<Button onClick={finish} className="w-fit" autoFocus>
							Continue to Dashboard <ArrowRight />
						</Button>
					</div>
				) : (
					<>
						<div className="mt-6 flex flex-col gap-4" aria-live="polite">
							{noneDetected && !resume && (
								<Notice tone="info" title="No compatible wallet detected">
									Install a supported wallet, then return here to connect. No wallet is connected yet.
								</Notice>
							)}
							{phase.name === "signing" && (
								<Notice tone="info" title={`Sign in with ${walletName}`}>
									Approve the sign-in message in your wallet. It proves you own {shortKey(phase.address)}; no transaction is sent and nothing is charged.
								</Notice>
							)}
							{phase.name === "rejected" && (
								<Notice tone="error" title="Request declined">
									You declined in {walletName}. You&apos;re not signed in and no funds moved. Try again and approve in your wallet.
								</Notice>
							)}
							{phase.name === "failed" && (
								<Notice tone="error" title="Couldn't sign in">
									{phase.message}
								</Notice>
							)}
						</div>

						{!resume && (
							<div role="radiogroup" aria-label="Wallet" className="mt-4 flex flex-col gap-3">
								{(wallets ?? [null, null, null]).map((wallet, index) =>
									wallet ? (
										<div
											key={wallet.id}
											className={cn(
												"animate-rise flex w-full items-center gap-4 rounded-card border px-5 py-4 transition-colors duration-200",
												selected === wallet.id && wallet.available ? "border-transparent bg-blush" : "border-line bg-white",
												wallet.available && "hover:border-rose",
												busy && selected !== wallet.id && "opacity-50",
											)}
											style={{ "--i": index } as React.CSSProperties}
										>
											<button
												type="button"
												role="radio"
												aria-checked={selected === wallet.id}
												disabled={busy || !wallet.available}
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
											{busy && selected === wallet.id ? (
												<Spinner className="text-coral" />
											) : !wallet.available ? (
												<a href={INSTALL_URL[wallet.id]} target="_blank" rel="noreferrer" className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-blush px-3 text-xs hover:bg-rose">
													Install <ArrowUpRight className="size-3" aria-hidden />
												</a>
											) : busy ? (
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
						)}

						<div className="mt-8 flex flex-col gap-3">
							{noneDetected && !resume ? (
								<Button asChild className="w-fit">
									<a href={INSTALL_URL.freighter} target="_blank" rel="noreferrer">
										Install Freighter
									</a>
								</Button>
							) : (
								<Button
									onClick={start}
									isLoading={busy}
									loadingText={phase.name === "signing" ? "Waiting for signature…" : `Connecting ${walletName}…`}
									disabled={!resume && !current?.available}
									className="w-fit"
								>
									{resume || "address" in phase ? <KeyRound /> : null}
									{resume || phase.name === "rejected" || phase.name === "failed" ? `Sign in with ${walletName}` : `Connect ${walletName}`}
								</Button>
							)}
							{selected === "freighter" && !resume && phase.name === "idle" && current?.available && (
								<p className="caption">Set Freighter to Testnet first (Freighter → Settings → Network). You&apos;ll be asked to approve access, then sign a free sign-in message.</p>
							)}
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
