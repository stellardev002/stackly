"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui/sonner";
import { vaultRoutes } from "@/lib/routes";
import { useNotifications } from "@/features/settings/hooks";

const ATTENTION = new Set(["execution_failed", "low_balance", "authorizations_low"]);

/**
 * Toasts new notifications from the backend inbox while the app is open (muting lives in Settings, server-side).
 * Anything that arrives also means balances moved, so the money views are refreshed.
 */
export function Notifier() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { data } = useNotifications();
	const seen = useRef<Set<string> | null>(null);

	useEffect(() => {
		if (!data) return;
		if (!seen.current) {
			seen.current = new Set(data.map((n) => n.id)); // first load: don't announce what's already there
			return;
		}
		const fresh = data.filter((n) => !seen.current!.has(n.id) && !n.readAt);
		for (const n of data) seen.current.add(n.id);
		if (!fresh.length) return;
		for (const key of ["positions", "position", "executions", "portfolio", "transactions", "wallet"]) void queryClient.invalidateQueries({ queryKey: [key] });
		for (const n of fresh.slice(0, 3)) {
			const action = n.positionId ? { label: "View", onClick: () => router.push(vaultRoutes.VAULT(n.positionId!)) } : undefined;
			if (ATTENTION.has(n.event)) toast.warning(n.message, { action });
			else toast.success(n.message, { action });
		}
	}, [data, queryClient, router]);

	return null;
}
