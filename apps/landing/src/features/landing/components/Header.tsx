import { StacklyLogo } from "@repo/ui/brand";
import { APP_LINKS } from "@/lib/site";

const NAV = [
	{ label: "How it works", href: "#how-it-works" },
	{ label: "The vault", href: "#the-vault" },
	{ label: "FAQ", href: "#faq" },
];

/** Figma "Landing navigation": logo · three anchors · Launch Testnet app. Links into the app are plain <a>s. */
export function Header() {
	return (
		<header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md">
			<div className="landing-container flex h-[72px] items-center justify-between gap-4">
				<a href="#top" aria-label="Stackly home" className="rounded-md">
					<StacklyLogo className="[&>span:last-child]:text-[24px] sm:[&>span:last-child]:text-[28px]" />
				</a>
				<nav aria-label="Sections" className="hidden md:block">
					<ul className="flex items-center gap-8 text-base">
						{NAV.map((item) => (
							<li key={item.href}>
								<a href={item.href} className="rounded-sm transition-colors duration-200 hover:text-coral-ink">
									{item.label}
								</a>
							</li>
						))}
					</ul>
				</nav>
				<a href={APP_LINKS.start} className="inline-flex h-11 items-center rounded-full bg-night px-5 text-sm text-white transition-colors duration-200 hover:bg-ink-soft sm:text-base">
					Launch Testnet app
				</a>
			</div>
		</header>
	);
}
