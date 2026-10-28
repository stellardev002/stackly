import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@repo/ui/og-card";

/** The link preview (Open Graph; twitter-image.tsx reuses it). Rendered once at build time. */
export const alt = "Stackly: Build your stack, one purchase at a time. Recurring USDC → XLM purchases from a non-custodial vault on Stellar.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
	const [regular, semibold] = await Promise.all([
		readFile(join(process.cwd(), "../../packages/ui/src/assets/fonts/og/source-sans-3-latin-400-normal.woff")),
		readFile(join(process.cwd(), "../../packages/ui/src/assets/fonts/og/source-sans-3-latin-600-normal.woff")),
	]);

	return new ImageResponse(<OgCard eyebrow="Live on Stellar Testnet" title="Build your stack, one purchase at a time." subtitle="Set a USDC → XLM schedule in your own Soroban vault. You keep the keys." />, {
		...size,
		fonts: [
			{ name: "Source Sans 3", data: regular, weight: 400, style: "normal" },
			{ name: "Source Sans 3", data: semibold, weight: 600, style: "normal" },
		],
	});
}
