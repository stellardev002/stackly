"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui/sonner";
import { money } from "@/lib/format";
import { vaultRoutes } from "@/lib/routes";
import { usePositions, useRecentExecutions } from "@/features/vaults/hooks";
import { fundedPurchases } from "@/features/vaults/status";
import { usePreferences } from "@/features/settings/store";

/**
 * In-app notifications (Settings → Notifications). Watches executions and positions and toasts when a
 * purchase completes, needs attention, or a vault is about to run dry. Polls quietly in the background.
 */
export function Notifier() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { notifyPurchases, notifyAttention, notifyFunding } = usePreferences();
	const { data: executions } = useRecentExecutions(10);
	const { data: positions } = usePositions();
	const seen = useRef<Map<string, string> | null>(null);
	const warnedLow = useRef(new Set<string>());

	// Keep the keeper's work visible: refresh in the background every few seconds.
	useEffect(() => {
		const id = setInterval(() => {
			for (const key of ["executions", "positions", "clock"]) void queryClient.invalidateQueries({ queryKey: [key] });
		}, 6_000);
		return () => clearInterval(id);
	}, [queryClient]);

	useEffect(() => {
		if (!executions) return;
		const previous = seen.current;
		seen.current = new Map(executions.map((e) => [e.id, e.status]));
		if (!previous) return; // first load: don't announce history
		if (executions.some((e) => previous.get(e.id) !== e.status)) {
			// A purchase moved: balances, history and the portfolio changed with it.
			for (const key of ["position", "portfolio", "transactions", "execution"]) void queryClient.invalidateQueries({ queryKey: [key] });
		}
		for (const e of executions) {
			const before = previous.get(e.id);
			if (before === e.status) continue;
			const position = positions?.find((p) => p.id === e.position_id);
			const open = { label: "View", onClick: () => router.push(vaultRoutes.EXECUTION(e.position_id, e.id)) };
			if (e.status === "completed" && notifyPurchases && e.received_amount) {
				toast.success(`Purchase completed: ${money(e.source_amount, position?.source_asset ?? "USDC")} → ${money(e.received_amount, position?.target_asset ?? "XLM")}`, {
					description: `${position?.name ?? e.position_id} · ${e.id}`,
					action: open,
				});
			} else if ((e.status === "failed" || e.status === "skipped") && notifyAttention) {
				toast.error(e.status === "failed" ? "A purchase didn't execute" : "A purchase was skipped", {
					description: `${e.failure_reason ?? ""} Your balances are unchanged.`,
					action: open,
				});
			} else if (e.status === "submitted" && !before && notifyPurchases) {
				toast.loading(`Purchase submitted for ${position?.name ?? e.position_id}`, { id: `sub-${e.id}`, duration: 4_000 });
			}
		}
	}, [executions, positions, notifyPurchases, notifyAttention, router, queryClient]);

	useEffect(() => {
		if (!positions || !notifyFunding) return;
		for (const p of positions) {
			if (p.status !== "active" || warnedLow.current.has(p.id)) continue;
			if (fundedPurchases(p) < 2) {
				warnedLow.current.add(p.id);
				toast.warning(`${p.name} has ${fundedPurchases(p) === 0 ? "no" : "one"} funded purchase left`, {
					description: "Deposit more USDC to keep the schedule running.",
					action: { label: "Deposit", onClick: () => router.push(vaultRoutes.DEPOSIT(p.id)) },
				});
			}
		}
	}, [positions, notifyFunding, router]);

	return null;
}
