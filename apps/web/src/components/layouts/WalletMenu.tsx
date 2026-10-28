"use client";

import Link from "next/link";
import { ArrowRight, Copy, LogOut, Settings } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import { Chip } from "@repo/ui/surface";
import { USE_MOCK_API } from "@/lib/api/source";
import { settingsRoutes } from "@/lib/routes";
import { shortKey } from "@/lib/stellar/config";
import { useToast } from "@/lib/use-toast";
import { useWalletStore } from "@/features/wallet/store";
import { WalletIcon } from "@/features/wallet/components/WalletIcon";
import { FundTestnetButton } from "@/features/wallet/components/FundTestnetButton";
import { isRealWallet } from "@/features/wallet/kit";
import { AddressAvatar } from "@/components/AddressAvatar";

/** Avatar + coral address pill; opens a small menu with the full address, copy, settings and disconnect. */
export function WalletMenu({ compact = false }: { compact?: boolean }) {
	const { address, walletId, disconnect } = useWalletStore();
	const queryClient = useQueryClient();
	const toast = useToast();
	if (!address) return null;

	const copy = async () => {
		await navigator.clipboard.writeText(address);
		toast.success("Address copied");
	};

	const signOut = () => {
		disconnect();
		queryClient.clear();
		toast.info("Wallet disconnected. Your vault stays on chain.");
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
			<PopoverContent align="end" sideOffset={10} className="w-[300px] rounded-card border-line bg-white p-4 shadow-[0_24px_60px_-20px_rgba(39,12,15,0.3)]">
				<div className="flex items-center gap-3">
					<WalletIcon id={walletId ?? "freighter"} className="size-9" />
					<div className="min-w-0">
						<p className="text-base capitalize">{walletId === "demo" ? "Demo wallet" : (walletId ?? "Wallet")}</p>
						<p className="caption">Stellar Testnet · {isRealWallet(walletId) ? "real signatures" : "simulated signatures"}</p>
					</div>
				</div>
				<p className="mt-3 rounded-card bg-page p-3 font-mono text-xs break-all text-muted">{address}</p>
				<div className="mt-3 flex flex-col">
					<button type="button" onClick={copy} className="flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-left hover:bg-blush">
						<Copy className="size-4" aria-hidden /> Copy address
					</button>
					<Link href={settingsRoutes.SETTINGS} className="flex h-10 items-center gap-3 rounded-lg px-2 hover:bg-blush">
						<Settings className="size-4" aria-hidden /> Settings
					</Link>
					<button type="button" onClick={signOut} className="flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-left text-danger hover:bg-danger-bg">
						<LogOut className="size-4" aria-hidden /> Disconnect wallet
					</button>
				</div>
				{isRealWallet(walletId) && (
					<div className="mt-3 border-t border-line pt-3">
						<p className="caption mb-2">Needs Testnet XLM for fees? Friendbot sends 10,000 (no real value).</p>
						<FundTestnetButton address={address} />
					</div>
				)}
				{USE_MOCK_API && (
					<div className="mt-3 border-t border-line pt-3">
						<Chip tone="warning">{isRealWallet(walletId) ? "Demo balances · real Testnet signatures" : "Demo data · nothing here is on chain"}</Chip>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
