"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, ExternalLink, KeyRound, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { StacklyMark } from "@repo/ui/brand";
import { Button } from "@repo/ui/button";
import { Spinner } from "@repo/ui/spinner";
import { Chip, Notice } from "@repo/ui/surface";
import { cn } from "@repo/ui/lib/utils";
import { login } from "@/lib/api/endpoints";
import { errorMessage, isWalletRejection } from "@/lib/api/errors";
import { useSession } from "@/features/auth/store";
import {
	connectWallet,
	isPhone,
	listWallets,
	openVarialApp,
	signMessage,
	type WalletId,
	type WalletOption,
} from "@/features/wallet/kit";
import { withBasePath } from "@/lib/site";

type Phase =
	| { name: "idle" }
	| { name: "connecting" }
	| { name: "signing"; address: string }
	| { name: "failed"; message: string; declined: boolean };

/**
 * Sign-in for administrators: connect a wallet, sign the backend's one-time message (no transaction, no fee). The
 * backend decides who is an admin (`role` on `/auth/me`); any wallet can sign in, only admins get past the gate.
 */
export function SignIn() {
	const queryClient = useQueryClient();
	const setTokens = useSession((s) => s.setTokens);
	const setWallet = useSession((s) => s.setWallet);
	const [wallets, setWallets] = useState<WalletOption[] | null>(null);
	const [selected, setSelected] = useState<WalletId>("freighter");
	const [phase, setPhase] = useState<Phase>({ name: "idle" });
	const [phone, setPhone] = useState(false);

	useEffect(() => {
		let cancelled = false;
		listWallets().then((list) => {
			if (cancelled) return;
			setPhone(isPhone());
			setWallets(list);
			setSelected((current) =>
				list.find((w) => w.id === current)?.available ? current : (list.find((w) => w.available)?.id ?? current),
			);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	const current = wallets?.find((w) => w.id === selected);
	const busy = phase.name === "connecting" || phase.name === "signing";

	const start = async () => {
		try {
			setPhase({ name: "connecting" });
			const address = await connectWallet(selected);
			setPhase({ name: "signing", address });
			const tokens = await login(address, (message) => signMessage(message, address));
			queryClient.clear();
			setWallet(selected);
			setTokens(address, tokens);
		} catch (error) {
			setPhase({
				name: "failed",
				declined: isWalletRejection(error),
				message: errorMessage(error, "The wallet didn't respond. Check it's unlocked and set to Testnet."),
			});
		}
	};

	return (
		<main id="main" className="flex min-h-dvh items-center justify-center px-4 py-10">
			<div className="animate-page w-full max-w-[520px] rounded-panel bg-white p-5 shadow-[0_32px_80px_-24px_rgba(14,4,5,0.25)] sm:p-8">
				<div className="flex items-center justify-between gap-3">
					<span className="flex items-center gap-2">
						<StacklyMark className="h-7 w-[26px] text-coral" />
						<span className="text-xl tracking-[-0.03em]">Stackly Admin</span>
					</span>
					<Chip tone="warning">Testnet</Chip>
				</div>
				<h1 className="mt-6 text-[32px] leading-[1.05] tracking-[-0.05em] sm:text-[40px]">Sign in</h1>
				<p className="mt-2 text-base font-light text-muted">
					Sign a one-time message with an administrator&apos;s wallet. It costs nothing and moves no funds.
				</p>

				<div className="mt-6 flex flex-col gap-3" aria-live="polite">
					{phase.name === "signing" && (
						<Notice
							title="Approve the sign-in message"
							action={
								phone && selected === "wallet_connect" ? (
									<Button size="sm" variant="outline" onClick={openVarialApp}>
										Open Varial <ExternalLink />
									</Button>
								) : undefined
							}
						>
							Check {current?.name ?? "your wallet"} and approve the message for {phase.address.slice(0, 4)}…
							{phase.address.slice(-4)}.
						</Notice>
					)}
					{phase.name === "failed" && (
						<Notice tone="error" title={phase.declined ? "Request declined" : "Couldn't sign in"}>
							{phase.declined ? "You declined in your wallet. Nothing was signed." : phase.message}
						</Notice>
					)}
				</div>

				<div role="radiogroup" aria-label="Wallet" className="mt-4 flex flex-col gap-3">
					{(wallets ?? [null, null]).map((wallet, index) =>
						wallet ? (
							<div
								key={wallet.id}
								className={cn(
									"flex min-w-0 items-center gap-3 rounded-card border px-4 py-3.5 transition-colors",
									selected === wallet.id && wallet.available ? "border-transparent bg-blush" : "border-line bg-white",
									busy && selected !== wallet.id && "opacity-50",
								)}
							>
								<button
									type="button"
									role="radio"
									aria-checked={selected === wallet.id}
									disabled={busy || !wallet.available}
									onClick={() => setSelected(wallet.id)}
									className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-coral/40 disabled:cursor-default"
								>
									<WalletMark id={wallet.id} />
									<span className="min-w-0">
										<span className="block text-lg leading-6">{wallet.name}</span>
										<span className="caption block">{wallet.kind}</span>
									</span>
								</button>
								{busy && selected === wallet.id ? (
									<Spinner className="text-coral" />
								) : !wallet.available ? (
									<a
										href={wallet.installUrl}
										target="_blank"
										rel="noreferrer"
										className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-blush px-3 text-xs hover:bg-rose"
									>
										Install <ArrowUpRight className="size-3" aria-hidden />
									</a>
								) : selected === wallet.id ? (
									<Chip tone="accent">
										<Check className="size-3" aria-hidden /> Selected
									</Chip>
								) : (
									<Chip tone="neutral">Available</Chip>
								)}
							</div>
						) : (
							<div key={index} className="shimmer h-[70px] rounded-card" aria-hidden />
						),
					)}
				</div>

				<Button
					onClick={start}
					isLoading={busy}
					loadingText={phase.name === "signing" ? "Waiting for signature…" : "Connecting…"}
					disabled={!current?.available}
					className="mt-6 w-full sm:w-fit"
				>
					<KeyRound /> Sign in with {current?.name ?? "wallet"}
				</Button>
				<p className="caption mt-4 flex items-start gap-1.5">
					<ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden />
					Admins are set by the backend (an existing admin, or <code className="font-mono">ADMIN_WALLET_ADDRESSES</code>).
				</p>
			</div>
		</main>
	);
}

function WalletMark({ id }: { id: WalletId }) {
	if (id === "xbull") {
		return (
			<span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-night text-sm text-white">
				xB
			</span>
		);
	}
	// eslint-disable-next-line @next/next/no-img-element -- a 40px local SVG; next/image adds nothing here
	return <img src={withBasePath("/wallet-varial.svg")} alt="" width={40} height={40} className="size-10 shrink-0 rounded-full" />;
}
