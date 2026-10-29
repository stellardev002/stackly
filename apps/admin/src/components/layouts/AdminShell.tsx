"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Activity,
	BookOpenText,
	ClipboardList,
	LayoutDashboard,
	LogOut,
	Menu,
	Repeat2,
	Scale,
	Server,
	Users,
	Wallet,
} from "lucide-react";
import { StacklyMark } from "@repo/ui/brand";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/dialog";
import { cn } from "@repo/ui/lib/utils";
import { shortKey } from "@/lib/format";
import { routes } from "@/lib/routes";
import { useSession } from "@/features/auth/store";
import { useSignOut } from "@/features/auth/hooks";

const NAV = [
	{ label: "Overview", href: routes.OVERVIEW, icon: LayoutDashboard, match: (p: string) => p === "/" },
	{ label: "Users", href: routes.USERS(), icon: Users, match: (p: string) => p.startsWith("/users") },
	{ label: "Positions", href: routes.POSITIONS(), icon: Wallet, match: (p: string) => p.startsWith("/positions") },
	{ label: "Purchases", href: routes.EXECUTIONS(), icon: Repeat2, match: (p: string) => p.startsWith("/executions") },
	{ label: "Ledger", href: routes.LEDGER(), icon: BookOpenText, match: (p: string) => p.startsWith("/ledger") },
	{ label: "Reconciliation", href: routes.RECONCILIATION, icon: Scale, match: (p: string) => p.startsWith("/reconciliation") },
	{ label: "Audit log", href: routes.AUDIT(), icon: ClipboardList, match: (p: string) => p.startsWith("/audit") },
	{ label: "System", href: routes.SYSTEM, icon: Server, match: (p: string) => p.startsWith("/system") },
];

/**
 * The admin frame: a fixed sidebar from `lg` up; below that a top bar whose menu opens the same navigation as a
 * drawer. Content is a single column that never scrolls sideways (wide tables scroll inside their own panel).
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
	const [open, setOpen] = useState(false);
	const pathname = usePathname();

	return (
		<div className="min-h-dvh lg:pl-[248px]">
			<aside className="fixed inset-y-0 left-0 hidden w-[248px] flex-col border-r border-line bg-white lg:flex">
				<Navigation pathname={pathname} />
			</aside>

			<header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
				<Brand />
				<button
					type="button"
					onClick={() => setOpen(true)}
					aria-label="Open menu"
					className="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-blush focus-visible:ring-[3px] focus-visible:ring-coral/40 focus-visible:outline-none"
				>
					<Menu className="size-5" />
				</button>
			</header>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent
					showCloseButton={false}
					className="top-0 left-0 h-dvh w-[280px] max-w-[85vw] translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-white p-0 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:max-w-[280px]"
				>
					<DialogTitle className="sr-only">Menu</DialogTitle>
					<DialogDescription className="sr-only">Admin sections</DialogDescription>
					<Navigation pathname={pathname} onNavigate={() => setOpen(false)} />
				</DialogContent>
			</Dialog>

			<main id="main" className="mx-auto w-full max-w-[1280px] min-w-0 px-4 pt-6 pb-16 sm:px-6 lg:px-10 lg:pt-10">
				{children}
			</main>
		</div>
	);
}

function Brand() {
	return (
		<Link
			href={routes.OVERVIEW}
			className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-coral/40"
		>
			<StacklyMark className="h-6 w-[22px] text-coral" />
			<span className="text-lg tracking-[-0.03em]">
				Stackly <span className="text-muted">Admin</span>
			</span>
		</Link>
	);
}

function Navigation({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
	const address = useSession((s) => s.address);
	const signOut = useSignOut();
	return (
		<div className="flex h-full flex-col">
			<div className="flex h-16 items-center px-5">
				<Brand />
			</div>
			<nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-2">
				<ul className="flex flex-col gap-1">
					{NAV.map(({ label, href, icon: Icon, match }) => {
						const active = match(pathname);
						return (
							<li key={label}>
								<Link
									href={href}
									onClick={onNavigate}
									aria-current={active ? "page" : undefined}
									className={cn(
										"flex h-11 items-center gap-3 rounded-full px-4 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-coral/40",
										active ? "bg-ink text-white" : "text-ink hover:bg-blush",
									)}
								>
									<Icon className="size-[18px] shrink-0" aria-hidden />
									{label}
								</Link>
							</li>
						);
					})}
				</ul>
			</nav>
			<div className="border-t border-line p-4">
				<div className="flex items-center gap-2 text-sm">
					<Activity className="size-4 text-success" aria-hidden />
					<span className="min-w-0 truncate font-mono text-muted" title={address ?? undefined}>
						{address ? shortKey(address, 6, 4) : "—"}
					</span>
				</div>
				<button
					type="button"
					onClick={() => void signOut()}
					className="mt-3 flex h-10 w-full cursor-pointer items-center gap-2 rounded-full px-3 text-sm text-ink hover:bg-blush focus-visible:ring-[3px] focus-visible:ring-coral/40 focus-visible:outline-none"
				>
					<LogOut className="size-4" aria-hidden /> Sign out
				</button>
			</div>
		</div>
	);
}
