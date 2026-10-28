"use client";

import { AnimatedNumber } from "@repo/ui/animated-number";
import { assetCode } from "@repo/stellar/assets";
import { fromStroops } from "@repo/stellar/format";

const grouped = (n: number, decimals: number) => n.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: 0 });

/** A stat amount that counts up on first view ("1,000 USDC"). Exact value is rendered for no-JS / reduced motion. */
export function Amount({ stroops, asset, decimals = 2 }: { stroops: string; asset: string; decimals?: number }) {
	const value = Number(fromStroops(stroops));
	return (
		<>
			<AnimatedNumber value={value} format={(n) => grouped(n, n === value ? decimals : 0)} /> {assetCode(asset)}
		</>
	);
}
