import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import type { Execution } from "@repo/stellar/vault";
import { Chip } from "@repo/ui/surface";
import { cn } from "@repo/ui/lib/utils";
import { money, utcDate, utcTime } from "@/lib/format";
import { vaultRoutes } from "@/lib/routes";
import { EXECUTION_STATUS } from "@/features/vaults/status";

/** "50 USDC → 200.15 XLM · 20 Oct 2026 · 09:05 UTC · Completed": one execution, linking to its details. */
export function SwapRow({ execution: e, index = 0 }: { execution: Execution; index?: number }) {
	const status = EXECUTION_STATUS[e.status];
	const title =
		e.status === "completed" && e.received_amount
			? `${money(e.source_amount, e.source_asset)} → ${money(e.received_amount, e.target_asset)}`
			: `${money(e.source_amount, e.source_asset)} ${e.status === "submitted" ? `→ ${e.target_asset}` : "attempted"}`;
	const at = e.executed_at ?? e.created_at;

	return (
		<li className="animate-rise" style={{ "--i": index } as React.CSSProperties}>
			<Link href={vaultRoutes.EXECUTION(e.position_id, e.id)} className="-mx-2 flex items-center gap-4 rounded-card px-2 py-3 transition-colors duration-200 hover:bg-page">
				<span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-white", e.status === "completed" || e.status === "submitted" ? "bg-coral" : "bg-subtle")}>
					<ArrowLeftRight className="size-4" aria-hidden />
				</span>
				<span className="min-w-0 flex-1">
					<span className="block truncate text-lg leading-6 tracking-[-0.02em]">{title}</span>
					<span className="caption block">
						{utcDate(at)} · {utcTime(at)} UTC
					</span>
				</span>
				<Chip tone={status.tone} live={status.live}>
					{status.label}
				</Chip>
			</Link>
		</li>
	);
}
