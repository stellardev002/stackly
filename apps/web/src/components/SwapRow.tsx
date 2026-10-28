import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import type { Execution, Position } from "@repo/stellar/vault";
import { Chip } from "@repo/ui/surface";
import { cn } from "@repo/ui/lib/utils";
import { money, utcDate, utcTime } from "@/lib/format";
import { vaultRoutes } from "@/lib/routes";
import { EXECUTION_STATUS } from "@/features/vaults/status";

/** "50 USDC → 200 XLM · Oct 20, 2026 · 09:05 UTC · Completed": one execution, linking to its details. */
export function SwapRow({ execution, position, index = 0 }: { execution: Execution; position?: Position; index?: number }) {
	const status = EXECUTION_STATUS[execution.status];
	const source = position?.source_asset ?? "USDC";
	const target = position?.target_asset ?? "XLM";
	const title =
		execution.status === "completed" && execution.received_amount
			? `${money(execution.source_amount, source)} → ${money(execution.received_amount, target)}`
			: `${money(execution.source_amount, source)} ${execution.status === "submitted" ? "→ XLM" : "attempted"}`;

	return (
		<li className="animate-rise" style={{ "--i": index } as React.CSSProperties}>
			<Link
				href={vaultRoutes.EXECUTION(execution.position_id, execution.id)}
				className="-mx-2 flex items-center gap-4 rounded-card px-2 py-3 transition-colors duration-200 hover:bg-page"
			>
				<span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-white", execution.status === "completed" || execution.status === "submitted" ? "bg-coral" : "bg-subtle")}>
					<ArrowLeftRight className="size-4" aria-hidden />
				</span>
				<span className="min-w-0 flex-1">
					<span className="block truncate text-lg leading-6 tracking-[-0.02em]">{title}</span>
					<span className="caption block">
						{utcDate(execution.executed_at ?? execution.scheduled_at)} · {utcTime(execution.executed_at ?? execution.scheduled_at)} UTC
					</span>
				</span>
				<Chip tone={status.tone} live={status.live}>
					{status.label}
				</Chip>
			</Link>
		</li>
	);
}
