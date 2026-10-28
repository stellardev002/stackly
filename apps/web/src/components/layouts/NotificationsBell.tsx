"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import { cn } from "@repo/ui/lib/utils";
import { useNow } from "@/lib/clock";
import { relative } from "@/lib/format";
import { vaultRoutes } from "@/lib/routes";
import { useMarkAllRead, useNotifications, useUnreadCount } from "@/features/settings/hooks";
import { useWalletStore } from "@/features/wallet/store";

/** The backend's in-app inbox (`GET /notifications`): purchases, deposits, withdrawals and low-funds warnings. */
export function NotificationsBell() {
	const address = useWalletStore((s) => s.address);
	const unread = useUnreadCount();
	const list = useNotifications();
	const markAll = useMarkAllRead();
	const now = useNow(60_000);
	if (!address) return null;
	const count = unread.data ?? 0;

	return (
		<Popover>
			<PopoverTrigger className="relative flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#f2f0f0] text-ink transition-colors hover:bg-blush sm:size-11" aria-label={`Notifications${count ? `, ${count} unread` : ""}`}>
				<Bell className="size-5" aria-hidden />
				{count > 0 && <span className="animate-pop absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[11px] text-white">{count > 9 ? "9+" : count}</span>}
			</PopoverTrigger>
			<PopoverContent align="end" sideOffset={10} className="w-[min(360px,calc(100vw-2rem))] rounded-card border-line bg-white p-0 shadow-[0_24px_60px_-20px_rgba(39,12,15,0.3)]">
				<div className="flex items-center justify-between border-b border-line px-4 py-3">
					<p className="text-base">Notifications</p>
					{count > 0 && (
						<button type="button" onClick={() => markAll.mutate()} className="cursor-pointer text-sm text-coral-ink hover:underline">
							Mark all read
						</button>
					)}
				</div>
				<ul className="max-h-[360px] overflow-y-auto">
					{list.isPending ? (
						<li className="p-4">
							<div className="shimmer h-10 rounded-card" />
						</li>
					) : !list.data?.length ? (
						<li className="px-4 py-8 text-center text-sm text-muted">No notifications yet. Purchases, deposits and withdrawals will show up here.</li>
					) : (
						list.data.map((n) => {
							const body = (
								<>
									<span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-coral")} aria-hidden />
									<span className="min-w-0">
										<span className="block text-sm">{n.message}</span>
										<span className="caption">{relative(Date.parse(n.createdAt), now)}</span>
									</span>
								</>
							);
							return (
								<li key={n.id} className="border-b border-line last:border-0">
									{n.positionId ? (
										<Link href={vaultRoutes.VAULT(n.positionId)} className="flex gap-3 px-4 py-3 hover:bg-page">
											{body}
										</Link>
									) : (
										<div className="flex gap-3 px-4 py-3">{body}</div>
									)}
								</li>
							);
						})
					)}
				</ul>
			</PopoverContent>
		</Popover>
	);
}
