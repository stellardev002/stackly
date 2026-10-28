import { cn } from "@repo/ui/lib/utils";

const PALETTE = ["#ff6173", "#f3c751", "#9190c6", "#77c1c5", "#e49d1e", "#5a2129", "#6accba"];

/**
 * A deterministic avatar from the wallet address (the design's photo avatar implies a profile Stackly doesn't
 * have). Same address, same colours, everywhere.
 */
export function AddressAvatar({ address, className }: { address: string; className?: string }) {
	let hash = 0;
	for (const char of address) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	const a = PALETTE[hash % PALETTE.length];
	const b = PALETTE[(hash >>> 8) % PALETTE.length];
	const angle = hash % 360;
	return (
		<span
			aria-hidden
			className={cn("inline-block shrink-0 rounded-full ring-2 ring-white", className)}
			style={{ background: `conic-gradient(from ${angle}deg, ${a}, ${b}, ${a})` }}
		/>
	);
}
