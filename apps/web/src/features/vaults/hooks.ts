"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Execution, Position } from "@repo/stellar/vault";
import { api } from "@/lib/api/client";
import { errorMessage, isWalletRejection } from "@/lib/api/errors";
import { apiRoutes } from "@/lib/routes";
import { useWalletStore } from "@/features/wallet/store";
import type { WriteOptions, WriteResult } from "@/features/vaults/client";

/** Poll while anything is in flight, so a submitted swap settles on screen without a reload. */
const whileInFlight = (executions?: Execution[]) => (executions?.some((e) => e.status === "submitted") ? 2_000 : false);

export function usePositions() {
	const owner = useWalletStore((s) => s.address);
	return useQuery({
		queryKey: ["positions", owner],
		queryFn: async () => (await api.get(apiRoutes.POSITIONS, { params: { owner } })).data.data as Position[],
		enabled: !!owner,
	});
}

export function usePosition(id: string) {
	return useQuery({
		queryKey: ["position", id],
		queryFn: async () => (await api.get(apiRoutes.POSITION(id))).data.data as Position,
		enabled: !!id,
	});
}

export function usePositionExecutions(id: string) {
	return useQuery({
		queryKey: ["executions", "position", id],
		queryFn: async () => (await api.get(apiRoutes.POSITION_EXECUTIONS(id))).data.data as Execution[],
		enabled: !!id,
		refetchInterval: (query) => whileInFlight(query.state.data),
	});
}

/** Latest executions across the wallet's positions (dashboard "Recent swaps"). */
export function useRecentExecutions(limit = 10) {
	const owner = useWalletStore((s) => s.address);
	return useQuery({
		queryKey: ["executions", "recent", owner, limit],
		queryFn: async () => (await api.get(apiRoutes.EXECUTIONS, { params: { owner, limit } })).data.data as Execution[],
		enabled: !!owner,
		refetchInterval: (query) => whileInFlight(query.state.data),
	});
}

export function useExecution(id: string) {
	return useQuery({
		queryKey: ["execution", id],
		queryFn: async () => (await api.get(apiRoutes.EXECUTION(id))).data.data as Execution,
		enabled: !!id,
		refetchInterval: (query) => (query.state.data?.status === "submitted" ? 2_000 : false),
	});
}

/** Everything a vault write can change. */
const AFFECTED = ["positions", "position", "executions", "execution", "transactions", "portfolio", "wallet", "clock"];

export type TxStage = "idle" | "signing" | "submitting" | "confirmed" | "rejected" | "failed";

/**
 * Runs one wallet-signed vault write and exposes its stage for the UI: waiting for the wallet signature →
 * submitting → confirmed, or rejected (the user declined; nothing was sent) / failed (sent, didn't go
 * through). Never retries on its own: a retried deposit could go out twice.
 */
export function useVaultTx() {
	const queryClient = useQueryClient();
	const owner = useWalletStore((s) => s.address);
	const walletId = useWalletStore((s) => s.walletId);
	const [stage, setStage] = useState<TxStage>("idle");
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<WriteResult | null>(null);

	const run = useCallback(
		async (write: (opts: WriteOptions) => Promise<WriteResult>) => {
			if (!owner) return null;
			setStage("signing");
			setError(null);
			try {
				const res = await write({ owner, walletId, onSigned: () => setStage("submitting") });
				setResult(res);
				setStage("confirmed");
				await Promise.all(AFFECTED.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
				return res;
			} catch (e) {
				setStage(isWalletRejection(e) ? "rejected" : "failed");
				setError(errorMessage(e));
				return null;
			}
		},
		[owner, walletId, queryClient],
	);

	const reset = useCallback(() => {
		setStage("idle");
		setError(null);
		setResult(null);
	}, []);

	return { stage, error, result, run, reset, busy: stage === "signing" || stage === "submitting" };
}
