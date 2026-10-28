"use client";

import { useEffect, useSyncExternalStore } from "react";
import { StackLoader } from "@repo/ui/brand";
import { USE_MOCK_API } from "@/lib/api/source";
import { isRealWallet, restoreWallet } from "@/features/wallet/kit";
import { useWalletStore } from "@/features/wallet/store";
import { ConnectModal } from "@/features/wallet/components/ConnectModal";

const subscribe = (onChange: () => void) => useWalletStore.persist.onFinishHydration(onChange);
const hasHydrated = () => useWalletStore.persist.hasHydrated();

/**
 * The wallet is the only "account". Until one is connected, the dashboard sits blurred behind the connect
 * modal (Figma Screen 2); after that the app renders normally.
 */
export function WalletGate({ children }: { children: React.ReactNode }) {
	const hydrated = useSyncExternalStore(subscribe, hasHydrated, () => false);
	const address = useWalletStore((s) => s.address);
	const walletId = useWalletStore((s) => s.walletId);

	useEffect(() => {
		if (walletId) void restoreWallet(walletId);
		// Mock data: make sure a real wallet's address still has its demo account (e.g. after "Reset demo data").
		if (USE_MOCK_API && address && isRealWallet(walletId)) void import("@repo/mock-api/sim").then((sim) => sim.ensureWallet(address, walletId!));
	}, [walletId, address]);

	if (!hydrated) {
		return (
			<div className="flex min-h-[70vh] items-center justify-center">
				<StackLoader label="Loading your vault" />
			</div>
		);
	}

	if (!address) {
		return (
			<>
				<DashboardBackdrop />
				<ConnectModal open />
			</>
		);
	}

	return <>{children}</>;
}

/** A static, blurred dashboard silhouette behind the modal, like the design. */
function DashboardBackdrop() {
	return (
		<div aria-hidden className="app-container pointer-events-none blur-[6px] select-none">
			<div className="mt-10 h-14 w-64 rounded-full bg-[#e9e3e4]" />
			<div className="mt-3 h-4 w-80 rounded-full bg-[#efeaeb]" />
			<div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{[0, 1, 2, 3].map((i) => (
					<div key={i} className="h-[156px] rounded-card bg-night" />
				))}
			</div>
			<div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
				<div className="h-[380px] rounded-card bg-white" />
				<div className="h-[380px] rounded-card bg-coral/80" />
			</div>
		</div>
	);
}
