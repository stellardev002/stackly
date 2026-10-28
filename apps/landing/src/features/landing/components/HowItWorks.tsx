import Image from "next/image";
import { APP_LINKS } from "@/lib/site";
import { Reveal } from "@/features/landing/components/Reveal";

const STEPS = [
	{ title: "Connect your wallet", body: "Freighter, xBull or Albedo. Stackly never sees your keys." },
	{ title: "Set your routine", body: "Choose how much USDC to spend, how often, and your slippage limit." },
	{ title: "Fund your vault", body: "Deposit USDC into your own position. Only your wallet can withdraw it." },
	{ title: "Purchases run on schedule", body: "Each interval, the contract checks the timing and your limits, then swaps." },
];

/** Figma "Editorial thesis" band, followed by the PRD's "How Stackly Works" steps (design gap #16). */
export function HowItWorks() {
	return (
		<section id="how-it-works" aria-labelledby="how-title" className="landing-container mt-4 scroll-mt-24">
			<Reveal className="relative overflow-hidden rounded-panel bg-night text-white">
				<div className="grid items-center gap-8 lg:grid-cols-[minmax(0,620px)_minmax(0,1fr)]">
					<div className="order-2 lg:order-1">
						<Image src="/images/thesis-builder.svg" alt="" width={670} height={626} className="h-auto w-full max-w-[560px] translate-y-1 lg:-ml-14" />
					</div>
					<div className="order-1 px-6 pt-12 sm:px-10 lg:order-2 lg:py-16 lg:pr-12 lg:pl-0">
						<h2 id="how-title" className="text-[36px] leading-[1.02] tracking-[-0.05em] sm:text-[48px] lg:text-[56px]">
							Less timing the market. More building habit.
						</h2>
						<p className="mt-5 max-w-[640px] text-base leading-[1.5] font-light text-white/80">
							Dollar-cost averaging spreads purchases over time. Stackly helps you explore that routine with transparent rules, clear balances and a wallet you control. Prices can rise or fall; a schedule does not guarantee a return.
						</p>
						<a href={APP_LINKS.start} className="mt-7 inline-flex h-11 items-center rounded-full bg-coral px-5 text-base text-white transition-colors duration-200 hover:bg-coral-strong">
							Start Stacking
						</a>
					</div>
				</div>
			</Reveal>

			<ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{STEPS.map((step, i) => (
					<Reveal as="li" key={step.title} delay={i} className="flex flex-col rounded-card border border-line bg-white p-6">
						<span className="flex size-9 items-center justify-center rounded-full bg-blush text-coral-ink tabular-nums">{i + 1}</span>
						<h3 className="mt-5 text-xl tracking-[-0.03em]">{step.title}</h3>
						<p className="mt-2 text-sm leading-[1.5] font-light text-muted">{step.body}</p>
					</Reveal>
				))}
			</ol>
		</section>
	);
}
