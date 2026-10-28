"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select";
import { assetId, type StellarAsset } from "@repo/stellar/assets";
import { cn } from "@repo/ui/lib/utils";

/** Pill dropdown for an asset ("USDC · Testnet"). */
export function AssetSelect({
	id,
	value,
	onChange,
	assets,
	invalid,
}: {
	id: string;
	value: string;
	onChange: (value: string) => void;
	assets: readonly StellarAsset[];
	invalid?: boolean;
}) {
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger
				id={id}
				aria-invalid={invalid || undefined}
				className={cn(
					"h-[52px] w-full cursor-pointer rounded-full border bg-white px-5 text-base text-ink shadow-none focus-visible:border-coral focus-visible:ring-[3px] focus-visible:ring-coral/20",
					invalid ? "border-danger" : "border-line",
				)}
			>
				<SelectValue placeholder="Choose an asset" />
			</SelectTrigger>
			<SelectContent className="rounded-card border-line bg-white">
				{assets.map((asset) => (
					<SelectItem key={assetId(asset)} value={assetId(asset)} className="h-10 cursor-pointer rounded-lg text-base">
						{asset.code} · Testnet
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
