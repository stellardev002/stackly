import Image from "next/image";
import { SUPPORTED_PAIRS } from "@repo/stellar/assets";
import { APP_LINKS } from "@/lib/site";

/**
 * Hero (Figma "Frame 45114"). The design's "2.8k+ People" social proof is replaced by a factual Testnet badge
 * (design gap #17); the second CTA is "Explore Demo" as the PRD requires.
 */
export function Hero() {
	return (
		<section id="top" aria-labelledby="hero-title" className="landing-container pt-2">
			<div className="relative overflow-hidden rounded-panel bg-blush px-5 pt-14 sm:px-10 sm:pt-16 lg:pt-20">
				<div className="mx-auto flex max-w-[860px] flex-col items-center text-center">
					<p className="animate-rise inline-flex items-center gap-2 rounded-full border border-rose bg-white px-4 py-1.5 text-sm">
						<span className="animate-signal size-2 rounded-full bg-coral text-coral" aria-hidden />
						Live on Stellar Testnet · {SUPPORTED_PAIRS.map((p) => `${p.source.code} → ${p.target.code}`).join(", ")}
					</p>
					<h1 id="hero-title" className="display animate-rise mt-6" style={{ "--i": 1 } as React.CSSProperties}>
						Build Your Stack. One Purchase at a&nbsp;Time.
					</h1>
					<p className="animate-rise mt-6 max-w-[520px] text-base leading-[1.45] sm:text-lg" style={{ "--i": 2 } as React.CSSProperties}>
						Turn a one-time decision into a steady routine. Set a USDC-to-XLM purchase schedule in your own Soroban vault.
					</p>
					<div className="animate-rise mt-8 flex flex-wrap justify-center gap-3" style={{ "--i": 3 } as React.CSSProperties}>
						<a href={APP_LINKS.start} className="inline-flex h-12 items-center rounded-full bg-coral px-6 text-base text-white transition-colors duration-200 hover:bg-coral-strong">
							Start Stacking
						</a>
						<a href={APP_LINKS.demo} className="inline-flex h-12 items-center rounded-full bg-night px-6 text-base text-white transition-colors duration-200 hover:bg-ink-soft">
							Explore Demo
						</a>
					</div>
				</div>
				<Image
					src="/images/hero-stack.svg"
					alt="A person carrying a tall stack of colourful blocks"
					width={801}
					height={893}
					priority
					className="animate-rise mx-auto mt-10 h-auto w-[300px] translate-y-[3%] sm:w-[440px] lg:w-[560px]"
					style={{ "--i": 4 } as React.CSSProperties}
				/>
			</div>
		</section>
	);
}
