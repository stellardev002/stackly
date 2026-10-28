"use client";

import Link from "next/link";
import { ArrowRight, Copy, LogOut, Settings } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import { settingsRoutes } from "@/lib/routes";
import { shortKey } from "@/lib/stellar/config";
import { useToast } from "@/lib/use-toast";
import { useSignOut } from "@/features/auth/hooks";
import { useWalletStore } from "@/features/wallet/store";
import { useWalletBalances } from "@/features/wallet/hooks";
import { WalletIcon } from "@/features/wallet/components/WalletIcon";
import { FundTestnetButton } from "@/features/wallet/components/FundTestnetButton";
import { AddressAvatar } from "@/components/AddressAvatar";
import { money } from "@/lib/format";

/** Avatar + coral address pill; opens a menu with the address, wallet balances, Friendbot, settings and sign-out. */
export function WalletMenu({ compact = false }: { compact?: boolean }) {
	const { address, walletId } = useWalletStore();
	const signOut = useSignOut();
	const toast = useToast();
	const balances = useWalletBalances();
	if (!address) return null;

	const copy = async () => {
		await navigator.clipboard.writeText(address);
		toast.success("Address copied");
	};

	return (
		<Popover>
			<div className="flex items-center gap-2">
				<AddressAvatar address={address} className="size-9" />
				<PopoverTrigger className="flex h-10 cursor-pointer items-center gap-2 rounded-full bg-coral px-4 text-sm text-white transition-colors duration-200 hover:bg-coral-strong sm:h-11 sm:px-5 sm:text-base">
					<span className="tracking-tight">{shortKey(address)}</span>
					{!compact && <ArrowRight className="size-4" aria-hidden />}
					<span className="sr-only">Wallet menu</span>
				</PopoverTrigger>
			</div>
			<PopoverContent align="end" sideOffset={10} className="w-[310px] rounded-card border-line bg-white p-4 shadow-[0_24px_60px_-20px_rgba(39,12,15,0.3)]">
				<div className="flex items-center gap-3">
					<WalletIcon id={walletId ?? "freighter"} className="size-9" />
					<div className="min-w-0">
						<p className="text-base capitalize">{walletId ?? "Wallet"}</p>
						<p className="caption">Stellar Testnet</p>
					</div>
				</div>
				<p className="mt-3 rounded-card bg-page p-3 font-mono text-xs break-all text-muted">{address}</p>
				{balances.data && (
					<dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
						<div className="rounded-card bg-page p-2.5">
							<dt className="caption">Wallet USDC</dt>
							<dd>{balances.data.usdc === null ? "No trustline" : money(balances.data.usdc, "USDC")}</dd>
						</div>
						<div className="rounded-card bg-page p-2.5">
							<dt className="caption">Wallet XLM</dt>
							<dd>{money(balances.data.xlm, "XLM")}</dd>
						</div>
					</dl>
				)}
				{balances.data && !balances.data.funded && (
					<div className="mt-3">
						<p className="caption mb-2">This account isn&apos;t on Testnet yet. Friendbot sends 10,000 test XLM (no real value).</p>
						<FundTestnetButton address={address} />
					</div>
				)}
				<div className="mt-3 flex flex-col">
					<button type="button" onClick={copy} className="flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-left hover:bg-blush">
						<Copy className="size-4" aria-hidden /> Copy address
					</button>
					<Link href={settingsRoutes.SETTINGS} className="flex h-10 items-center gap-3 rounded-lg px-2 hover:bg-blush">
						<Settings className="size-4" aria-hidden /> Settings
					</Link>
					<button
						type="button"
						onClick={async () => {
							await signOut();
							toast.info("Signed out. Your vaults stay on chain.");
						}}
						className="flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-left text-danger hover:bg-danger-bg"
					>
						<LogOut className="size-4" aria-hidden /> Disconnect wallet
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
