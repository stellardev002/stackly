import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@repo/ui/og-card";

/** The link preview (Open Graph; twitter-image.tsx reuses it). Rendered once at build time. */
export const alt = "Stackly: automate recurring USDC → XLM purchases from a non-custodial Soroban vault on Stellar.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
	const [regular, semibold] = await Promise.all([
		readFile(join(process.cwd(), "../../packages/ui/src/assets/fonts/og/source-sans-3-latin-400-normal.woff")),
		readFile(join(process.cwd(), "../../packages/ui/src/assets/fonts/og/source-sans-3-latin-600-normal.woff")),
	]);

	return new ImageResponse(<OgCard eyebrow="Stackly app · Stellar Testnet" title="Your recurring purchases, on schedule." subtitle="Fund a vault, set an amount and a schedule. The contract enforces every purchase." />, {
		...size,
		fonts: [
			{ name: "Source Sans 3", data: regular, weight: 400, style: "normal" },
			{ name: "Source Sans 3", data: semibold, weight: 600, style: "normal" },
		],
	});
}
