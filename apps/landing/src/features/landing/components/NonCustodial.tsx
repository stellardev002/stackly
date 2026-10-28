import { KeyRound, ShieldCheck, Timer, Wallet } from "lucide-react";
import { Reveal } from "@/features/landing/components/Reveal";

const POINTS = [
	{ icon: Wallet, title: "Your funds, your vault", body: "USDC sits in a Soroban smart contract position that belongs to your wallet, not to Stackly." },
	{ icon: KeyRound, title: "Only you sign", body: "Every deposit, pause, resume and withdrawal is approved in your own wallet." },
	{ icon: Timer, title: "A keeper with one job", body: "It can trigger a purchase that is due. It can't move funds, change your strategy or redirect what you bought." },
	{ icon: ShieldCheck, title: "Rules the contract enforces", body: "Early, duplicate, over-budget or over-slippage purchases are rejected, and a failed swap moves nothing." },
];

/** "The vault": the PRD's non-custodial explanation (design gap #16; the design only covered it in the FAQ). */
export function NonCustodial() {
	return (
		<section id="the-vault" aria-labelledby="vault-title" className="landing-container mt-16 scroll-mt-24 lg:mt-24">
			<Reveal className="max-w-[720px]">
				<h2 id="vault-title" className="text-[36px] leading-[1.02] tracking-[-0.05em] sm:text-[48px]">
					A vault only you control.
				</h2>
				<p className="mt-3 text-base font-light text-muted">Non-custodial by design: the contract holds the rules, your wallet holds the keys.</p>
			</Reveal>
			<ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{POINTS.map((point, i) => (
					<Reveal as="li" key={point.title} delay={i} className="rounded-card bg-blush p-6">
						<point.icon className="size-6 text-coral-ink" aria-hidden />
						<h3 className="mt-5 text-xl tracking-[-0.03em]">{point.title}</h3>
						<p className="mt-2 text-sm leading-[1.5] font-light text-muted">{point.body}</p>
					</Reveal>
				))}
			</ul>
		</section>
	);
}
