"use client";

import { useEffect, useSyncExternalStore } from "react";
import { StackLoader } from "@repo/ui/brand";
import { useSession } from "@/features/auth/store";
import { restoreWallet, type WalletId } from "@/features/wallet/kit";
import { useWalletStore } from "@/features/wallet/store";
import { ConnectModal } from "@/features/wallet/components/ConnectModal";

const subscribe = (onChange: () => void) => {
	const a = useWalletStore.persist.onFinishHydration(onChange);
	const b = useSession.persist.onFinishHydration(onChange);
	return () => {
		a();
		b();
	};
};
const hasHydrated = () => useWalletStore.persist.hasHydrated() && useSession.persist.hasHydrated();

/**
 * The wallet is the only "account": the app needs a connected wallet and a backend session signed by it. Until
 * then the dashboard sits blurred behind the connect modal (Figma Screen 2). When the session expires (refresh
 * failed) but the wallet is still connected, the modal only asks the wallet to sign in again.
 */
export function WalletGate({ children }: { children: React.ReactNode }) {
	const hydrated = useSyncExternalStore(subscribe, hasHydrated, () => false);
	const address = useWalletStore((s) => s.address);
	const walletId = useWalletStore((s) => s.walletId);
	const sessionAddress = useSession((s) => s.address);
	const sessionToken = useSession((s) => s.accessToken ?? s.refreshToken);

	useEffect(() => {
		if (walletId) void restoreWallet(walletId);
	}, [walletId]);

	if (!hydrated) {
		return (
			<div className="flex min-h-[70vh] items-center justify-center">
				<StackLoader label="Loading your vault" />
			</div>
		);
	}

	const signedIn = !!address && sessionAddress === address && !!sessionToken;
	if (!signedIn) {
		return (
			<>
				<DashboardBackdrop />
				<ConnectModal open resume={address && walletId ? { address, walletId: walletId as WalletId } : undefined} />
			</>
		);
	}

	return <>{children}</>;
}

/** A static, blurred dashboard silhouette behind the modal, like the design. */
function DashboardBackdrop() {
	return (
		<div aria-hidden className="pointer-events-none blur-[6px] select-none">
			<div className="mt-10 h-14 w-64 rounded-full bg-[#e9e3e4]" />
			<div className="mt-3 h-4 w-full max-w-80 rounded-full bg-[#efeaeb]" />
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
