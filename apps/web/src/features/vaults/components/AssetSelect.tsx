"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select";
import type { AssetRef } from "@repo/stellar/vault";
import { cn } from "@repo/ui/lib/utils";

/** Pill dropdown for a supported asset ("USDC · Testnet"); the value is the backend asset id. */
export function AssetSelect({ id, value, onChange, assets, invalid }: { id: string; value: string; onChange: (value: string) => void; assets: AssetRef[]; invalid?: boolean }) {
	return (
		<Select value={value} onValueChange={onChange} disabled={!assets.length}>
			<SelectTrigger
				id={id}
				aria-invalid={invalid || undefined}
				className={cn(
					"h-[52px] w-full cursor-pointer rounded-full border bg-white px-5 text-base text-ink shadow-none focus-visible:border-coral focus-visible:ring-[3px] focus-visible:ring-coral/20",
					invalid ? "border-danger" : "border-line",
				)}
			>
				<SelectValue placeholder={assets.length ? "Choose an asset" : "Loading assets…"} />
			</SelectTrigger>
			<SelectContent className="rounded-card border-line bg-white">
				{assets.map((asset) => (
					<SelectItem key={asset.id} value={asset.id} className="h-10 cursor-pointer rounded-lg text-base">
						{asset.code} · Testnet
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
