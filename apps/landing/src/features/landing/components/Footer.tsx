import Image from "next/image";
import { StacklyLogo } from "@repo/ui/brand";
import { APP_LINKS } from "@/lib/site";
import { Reveal } from "@/features/landing/components/Reveal";

/** Figma "Closing invitation" + "Footer". The legal line is corrected: the MVP does make real Testnet transactions. */
export function Footer() {
	return (
		<>
			<section aria-labelledby="cta-title" className="landing-container mt-16 lg:mt-24">
				<Reveal className="relative isolate overflow-hidden rounded-panel bg-coral px-6 pt-10 text-white sm:px-10 lg:min-h-[296px] lg:py-14">
					<div className="max-w-[760px]">
						<h2 id="cta-title" className="text-[36px] leading-[1.02] tracking-[-0.05em] sm:text-[48px]">
							Your routine starts with one small step.
						</h2>
						<p className="mt-2 text-sm font-light text-white/85">Explore a non-custodial DCA vault on Stellar Testnet.</p>
						<a href={APP_LINKS.start} className="mt-7 inline-flex h-11 items-center rounded-full bg-night px-5 text-base text-white transition-colors duration-200 hover:bg-ink-soft">
							Launch Testnet app
						</a>
					</div>
					<Image
						src="/images/vault-bricks.png"
						alt="Stacked stone bricks"
						width={850}
						height={694}
						className="relative mx-auto mt-10 h-auto w-full max-w-[420px] rotate-[6deg] rounded-panel lg:absolute lg:top-6 lg:right-10 lg:mt-0 lg:w-[380px]"
					/>
				</Reveal>
			</section>

			<footer className="landing-container mt-12 pb-10">
				<div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<StacklyLogo />
						<p className="mt-3 text-sm font-light text-muted">Build deliberately. Stack consistently.</p>
					</div>
					<nav aria-label="Footer">
						<ul className="flex flex-wrap gap-x-10 gap-y-3 text-base">
							<li>
								<a href="#faq" className="hover:text-coral-ink">
									FAQ
								</a>
							</li>
							<li>
								<a href="https://developers.stellar.org/docs/networks" target="_blank" rel="noreferrer" className="hover:text-coral-ink">
									Stellar Testnet
								</a>
							</li>
							<li>
								<a href="#risk" className="hover:text-coral-ink">
									Risk notice
								</a>
							</li>
						</ul>
					</nav>
				</div>
				<p id="risk" className="mt-8 border-t border-line pt-6 text-xs leading-[1.6] font-light text-muted">
					© {new Date().getFullYear()} Stackly · A Testnet demonstration on Stellar / Soroban. Test assets only; they have no value. Purchases can fail or be skipped, prices can rise or fall, and a schedule
					does not guarantee a return. Not financial advice.
				</p>
			</footer>
		</>
	);
}
