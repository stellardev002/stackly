"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StacklyLogo } from "@repo/ui/brand";
import { cn } from "@repo/ui/lib/utils";
import { overviewRoutes, portfolioRoutes, settingsRoutes, transactionRoutes } from "@/lib/routes";
import { WalletMenu } from "@/components/layouts/WalletMenu";
import { NotificationsBell } from "@/components/layouts/NotificationsBell";

/** Minimal navigation (PRD §5): four tabs. Vault pages belong to Dashboard. */
const TABS = [
	{ label: "Dashboard", href: overviewRoutes.OVERVIEW, match: ["/overview", "/vaults"] },
	{ label: "Portfolio", href: portfolioRoutes.PORTFOLIO, match: ["/portfolio"] },
	{ label: "History", href: transactionRoutes.TRANSACTIONS, match: ["/transactions"] },
	{ label: "Settings", href: settingsRoutes.SETTINGS, match: ["/settings"] },
];

/**
 * Figma "Product navigation": logo · pill tabs · avatar + address pill. On phones the tabs drop to their own
 * scrollable row under the logo.
 */
export function TopNav() {
	const pathname = usePathname();

	const tabs = (
		<nav aria-label="Main" className="scroll-row -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
			<ul className="flex w-full min-w-max items-center justify-between gap-0.5 rounded-full bg-[#f2f0f0] p-1 md:w-max md:justify-start md:gap-1">
				{TABS.map((tab) => {
					const active = tab.match.some((m) => pathname.startsWith(m));
					return (
						<li key={tab.href}>
							<Link
								href={tab.href}
								aria-current={active ? "page" : undefined}
								className={cn(
									"flex h-10 items-center rounded-full px-3 text-[15px] transition-colors duration-200 min-[400px]:px-4 sm:px-5 sm:text-base",
									active ? "bg-night text-white" : "text-ink hover:bg-white",
								)}
							>
								{tab.label}
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);

	return (
		<header className="sticky top-0 z-40 border-b border-transparent bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
			<div className="app-container flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between md:gap-6 md:py-4">
				<div className="flex items-center justify-between gap-3">
					<Link href={overviewRoutes.OVERVIEW} aria-label="Stackly dashboard" className="rounded-md">
						<StacklyLogo className="[&>span:last-child]:text-[24px] sm:[&>span:last-child]:text-[28px]" />
					</Link>
					<div className="md:hidden">
						<div className="flex items-center gap-2"><NotificationsBell /><WalletMenu compact /></div>
					</div>
				</div>
				<div className="md:flex md:flex-1 md:justify-center">{tabs}</div>
				<div className="hidden md:block">
					<div className="flex items-center gap-3"><NotificationsBell /><WalletMenu /></div>
				</div>
			</div>
		</header>
	);
}
