"use client";

import { ArrowUpRight } from "lucide-react";
import { Button } from "@repo/ui/button";
import { explorer } from "@/lib/stellar/config";
import { useToast } from "@/lib/use-toast";

/**
 * "View on Stellar Explorer". Demo transactions (hash "demo…") aren't on chain, so the button says so instead of
 * opening a page that would 404 and never pretends a simulated swap is live. Transactions signed with a real wallet
 * have real Testnet hashes and open on stellar.expert, in mock mode too.
 */
export function ExplorerButton({ hash, label = "View on Explorer", size = "md" }: { hash: string | null; label?: string; size?: "sm" | "md" }) {
	const toast = useToast();
	if (!hash) return null;

	if (isDemoHash(hash)) {
		return (
			<Button variant="outline" size={size} onClick={() => toast.info("Demo transaction: not on Stellar Explorer. Live mode links to stellar.expert (Testnet).")}>
				{label} <ArrowUpRight />
			</Button>
		);
	}
	return (
		<Button asChild variant="outline" size={size}>
			<a href={explorer.tx(hash)} target="_blank" rel="noreferrer">
				{label} <ArrowUpRight />
				<span className="sr-only">(opens in a new tab)</span>
			</a>
		</Button>
	);
}

export const isDemoHash = (hash: string) => hash.startsWith("demo");

/** A toast action that opens a real Testnet transaction; nothing for demo hashes. */
export function explorerAction(hash: string | null | undefined) {
	if (!hash || isDemoHash(hash)) return undefined;
	return { label: "View on Explorer", onClick: () => window.open(explorer.tx(hash), "_blank", "noopener") };
}

/** Short, copyable display of a hash ("demo-ex004…8c20"). */
export function HashText({ hash }: { hash: string }) {
	return (
		<span className="font-mono break-all" title={hash}>
			{hash.length > 16 ? `${hash.slice(0, 10)}…${hash.slice(-4)}` : hash}
		</span>
	);
}
