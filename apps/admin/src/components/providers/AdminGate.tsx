"use client";

import { useEffect, useSyncExternalStore } from "react";
import { LogOut, ShieldAlert } from "lucide-react";
import { StackLoader } from "@repo/ui/brand";
import { Button } from "@repo/ui/button";
import { Notice } from "@repo/ui/surface";
import { errorMessage, httpStatus } from "@/lib/api/errors";
import { shortKey } from "@/lib/format";
import { useMe, useSignOut } from "@/features/auth/hooks";
import { useSession } from "@/features/auth/store";
import { SignIn } from "@/features/auth/components/SignIn";
import { restoreWallet } from "@/features/wallet/kit";
import { AdminShell } from "@/components/layouts/AdminShell";

const subscribe = (onChange: () => void) => useSession.persist.onFinishHydration(onChange);
const hasHydrated = () => useSession.persist.hasHydrated();

/**
 * The admin opens only for a signed-in wallet whose backend role is `admin`. Without a session: sign in. Signed in
 * but not an admin: say so, offer sign-out. The backend enforces this on every admin route too (403).
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
	const hydrated = useSyncExternalStore(subscribe, hasHydrated, () => false);
	const token = useSession((s) => s.accessToken ?? s.refreshToken);
	const walletId = useSession((s) => s.walletId);
	const me = useMe(hydrated && !!token);
	const signOut = useSignOut();

	useEffect(() => {
		if (walletId) void restoreWallet(walletId);
	}, [walletId]);

	const loading = (
		<div className="flex min-h-dvh items-center justify-center">
			<StackLoader label="Loading admin" />
		</div>
	);
	if (!hydrated) return loading;
	if (!token) return <SignIn />;

	if (me.isError) {
		return (
			<Centered>
				<Notice
					tone="error"
					title="Couldn't load your account"
					action={
						<div className="flex flex-wrap gap-2">
							<Button size="sm" onClick={() => void me.refetch()}>
								Try again
							</Button>
							<Button size="sm" variant="outline" onClick={() => void signOut()}>
								Sign out
							</Button>
						</div>
					}
				>
					{httpStatus(me.error) === 401 ? "Your session expired. Sign in again." : errorMessage(me.error)}
				</Notice>
			</Centered>
		);
	}

	if (!me.data) return loading;

	if (me.data.role !== "admin") {
		return (
			<Centered>
				<div className="flex flex-col items-start gap-4 rounded-panel bg-white p-6 sm:p-8">
					<span className="flex size-12 items-center justify-center rounded-full bg-danger-bg text-danger">
						<ShieldAlert className="size-6" aria-hidden />
					</span>
					<h1 className="text-[28px] leading-tight tracking-[-0.04em]">Not an administrator</h1>
					<p className="text-base font-light text-muted">
						<span className="font-mono text-ink">{shortKey(me.data.walletAddress, 6, 6)}</span> is signed in, but its role is{" "}
						<strong className="font-normal text-ink">user</strong>. Ask an existing admin to promote it, or sign in with an admin
						wallet.
					</p>
					<Button variant="outline" onClick={() => void signOut()}>
						<LogOut /> Sign out
					</Button>
				</div>
			</Centered>
		);
	}

	return <AdminShell>{children}</AdminShell>;
}

function Centered({ children }: { children: React.ReactNode }) {
	return (
		<main id="main" className="flex min-h-dvh items-center justify-center px-4">
			<div className="w-full max-w-[520px]">{children}</div>
		</main>
	);
}
