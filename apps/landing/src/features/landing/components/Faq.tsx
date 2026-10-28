import { Plus } from "lucide-react";
import { Reveal } from "@/features/landing/components/Reveal";

export const FAQ = [
	{
		q: "Does a schedule guarantee execution?",
		a: "No. An interval makes a purchase eligible. Insufficient balance, network errors, liquidity or your slippage limit can prevent a swap, and a failed swap never spends your USDC.",
	},
	{ q: "What does monthly mean?", a: "Monthly is a fixed 30-day interval, not a calendar month. Daily is 24 hours and weekly is 7 days." },
	{ q: "Can I take my funds out?", a: "Yes. You can pause purchases and withdraw available USDC or purchased XLM at any time. Each withdrawal requires your wallet signature." },
	{ q: "Who controls the vault?", a: "Your connected wallet authorizes actions within the Soroban contract rules. Stackly does not hold your wallet keys." },
	{ q: "Is this real money?", a: "No. Stackly runs on Stellar Testnet with test assets that have no value. It is not investment advice." },
];

/** Figma "Frequently asked questions": native <details>, so it works without JavaScript and with a keyboard. */
export function Faq() {
	return (
		<section id="faq" aria-labelledby="faq-title" className="landing-container mt-16 scroll-mt-24 lg:mt-24">
			<div className="grid gap-8 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-24">
				<Reveal>
					<h2 id="faq-title" className="text-[40px] leading-[1.02] tracking-[-0.05em] sm:text-[48px]">
						A few good questions.
					</h2>
					<p className="mt-3 text-sm font-light text-muted">Understand the rules before you set your routine.</p>
				</Reveal>
				<Reveal delay={1}>
					<div className="divide-y divide-line">
						{FAQ.map((item, i) => (
							<details key={item.q} className="group py-5 first:pt-0" open={i === 0}>
								<summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xl tracking-[-0.03em] [&::-webkit-details-marker]:hidden">
									{item.q}
									<Plus className="size-5 shrink-0 transition-transform duration-300 ease-(--ease-settle) group-open:rotate-45" aria-hidden />
								</summary>
								<p className="mt-3 max-w-[640px] text-sm leading-[1.6] font-light text-muted">{item.a}</p>
							</details>
						))}
					</div>
				</Reveal>
			</div>
		</section>
	);
}
