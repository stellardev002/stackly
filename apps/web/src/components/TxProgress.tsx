"use client";

import { Check, X } from "lucide-react";
import { Spinner } from "@repo/ui/spinner";
import { cn } from "@repo/ui/lib/utils";
import type { TxStage } from "@/features/vaults/hooks";

const STEPS = [
	{ key: "signing", label: "Approve in your wallet", hint: "Check the asset, amount and Testnet network before signing." },
	{ key: "submitting", label: "Submitting to Stellar Testnet", hint: "Waiting for the ledger to close (about 5 seconds)." },
	{ key: "confirmed", label: "Confirmed", hint: "Your vault balance is updated." },
] as const;

/**
 * The pending → success treatment the design didn't include (gap #3), shared by every wallet-signed action:
 * a three-step progress with the current step live, a tick when done, a cross where it stopped.
 */
export function TxProgress({ stage, className }: { stage: TxStage; className?: string }) {
	const index = stage === "signing" || stage === "rejected" ? 0 : stage === "submitting" || stage === "failed" ? 1 : stage === "confirmed" ? 2 : -1;
	const stopped = stage === "rejected" || stage === "failed";

	return (
		<ol className={cn("flex flex-col gap-4", className)} aria-live="polite">
			{STEPS.map((step, i) => {
				const done = i < index || stage === "confirmed";
				const current = i === index && !done;
				return (
					<li key={step.key} className={cn("flex gap-3 transition-opacity duration-300", i > index && "opacity-40")}>
						<span
							className={cn(
								"mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
								done ? "bg-ink text-white" : current && stopped ? "bg-danger-bg text-danger" : current ? "bg-blush text-coral" : "bg-line text-muted",
							)}
						>
							{done ? (
								<svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
									<path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="animate-check" />
								</svg>
							) : current && stopped ? (
								<X className="size-4" aria-hidden />
							) : current ? (
								<Spinner className="size-4" />
							) : (
								<Check className="size-3.5 opacity-0" aria-hidden />
							)}
						</span>
						<span className="min-w-0">
							<span className="block text-base">{step.label}</span>
							{(current || (done && i === 2)) && <span className="caption block">{current && stopped ? (stage === "rejected" ? "Declined in your wallet. Nothing was submitted." : "This step didn't complete.") : step.hint}</span>}
						</span>
					</li>
				);
			})}
		</ol>
	);
}
