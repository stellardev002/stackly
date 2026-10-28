import Image from "next/image";
import { StacklyMark } from "@repo/ui/brand";
import { cn } from "@repo/ui/lib/utils";
import { withBasePath } from "@/lib/site";

/**
 * Wallet brand marks (Figma "Wallet choice"). The design reuses Freighter's mark for xBull, so xBull gets a neutral
 * lettermark rather than another brand's logo; Freighter Mobile (WalletConnect) uses Freighter's; the demo wallet uses the Stackly mark.
 */
export function WalletIcon({ id, className }: { id: string; className?: string }) {
	if (id === "freighter" || id === "wallet_connect" || id === "albedo") {
		const file = id === "wallet_connect" ? "freighter" : id;
		return <Image src={withBasePath(`/images/wallet-${file}.svg`)} alt="" width={40} height={40} className={cn("size-10 shrink-0 rounded-full", className)} />;
	}
	if (id === "demo") {
		return (
			<span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-full bg-blush", className)}>
				<StacklyMark className="h-5 w-[18px] text-coral" />
			</span>
		);
	}
	return (
		<span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-full bg-night text-sm tracking-[-0.04em] text-white", className)}>
			xB
		</span>
	);
}
