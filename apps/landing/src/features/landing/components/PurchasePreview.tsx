import Image from "next/image";
import { APP_LINKS } from "@/lib/site";
import { Reveal } from "@/features/landing/components/Reveal";

/** An illustrative schedule, labelled as an example: no prices, no returns. */
const EXAMPLE = [
	{ when: "Week 1", status: "Completed" },
	{ when: "Week 2", status: "Completed" },
	{ when: "Week 3", status: "Completed" },
	{ when: "Week 4", status: "Scheduled" },
];

/**
 * Figma "Make the next purchase one less decision today", with the PRD's "Automated Purchase Preview" in place
 * of the people count (design gaps #16, #17).
 */
export function PurchasePreview() {
	return (
		<section aria-labelledby="preview-title" className="landing-container mt-16 lg:mt-24">
			<div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
				<Reveal className="overflow-hidden rounded-panel bg-blush">
					<Image src="/images/laptop-card.svg" alt="A person working on a laptop, sitting on a stack of coins" width={588} height={516} className="h-auto w-full" />
				</Reveal>
				<Reveal delay={1}>
					<p className="text-base">A 50 USDC weekly routine. A clear next eligible time. Every purchase recorded separately.</p>
					<h2 id="preview-title" className="mt-4 text-[40px] leading-[1.02] tracking-[-0.05em] sm:text-[56px] lg:text-[64px]">
						<span className="text-subtle">Make the </span>
						<span className="text-coral">next</span> purchase one less decision from today.
					</h2>
					<figure className="mt-8 max-w-[460px] rounded-card bg-night p-5 text-white" aria-label="Example weekly schedule">
						<figcaption className="flex items-center justify-between text-sm text-white/70">
							<span>Example · 50 USDC → XLM · weekly</span>
							<span className="rounded-full bg-coral px-2.5 py-0.5 text-xs text-white">Preview</span>
						</figcaption>
						<ol className="mt-4 flex flex-col divide-y divide-white/10">
							{EXAMPLE.map((row) => (
								<li key={row.when} className="flex items-center justify-between py-2.5 text-base">
									<span>{row.when}</span>
									<span className="text-white/70">50 USDC → XLM</span>
									<span className={row.status === "Completed" ? "text-white" : "text-coral"}>{row.status}</span>
								</li>
							))}
						</ol>
					</figure>
					<a href={APP_LINKS.start} className="mt-8 inline-flex h-11 items-center rounded-full bg-coral px-5 text-base text-white transition-colors duration-200 hover:bg-coral-strong">
						Start Stacking
					</a>
				</Reveal>
			</div>
		</section>
	);
}
