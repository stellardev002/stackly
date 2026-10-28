import { SUPPORTED_PAIRS } from "@repo/stellar/assets";
import { Reveal } from "@/features/landing/components/Reveal";

/** "Supported Assets" (PRD Screen 1, design gap #16). Driven by the shared pair list, so it never over-promises. */
export function SupportedAssets() {
	return (
		<section aria-labelledby="assets-title" className="landing-container mt-4">
			<Reveal className="flex flex-col gap-4 rounded-panel border border-line bg-white px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-10">
				<div>
					<h2 id="assets-title" className="text-xl tracking-[-0.03em]">
						Supported assets
					</h2>
					<p className="mt-1 text-sm font-light text-muted">Stellar Testnet assets only. More pairs follow once this one is proven end to end.</p>
				</div>
				<ul className="flex flex-wrap gap-2">
					{SUPPORTED_PAIRS.map(({ source, target }) => (
						<li key={`${source.code}-${target.code}`} className="flex items-center gap-2 rounded-full bg-blush px-4 py-2 text-base">
							<span className="rounded-full bg-white px-2 py-0.5 text-sm">{source.code}</span>→<span className="rounded-full bg-coral px-2 py-0.5 text-sm text-white">{target.code}</span>
						</li>
					))}
				</ul>
			</Reveal>
		</section>
	);
}
