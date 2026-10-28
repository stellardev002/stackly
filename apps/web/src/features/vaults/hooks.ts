"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Execution, Position } from "@repo/stellar/vault";
import { api } from "@/lib/api/client";
import { getExecution, getPosition, getPositionAccount, getPositionExecutions, getPositions, getRecentExecutions } from "@/lib/api/endpoints";
import { errorMessage, isWalletRejection } from "@/lib/api/errors";
import { useSession } from "@/features/auth/store";
import type { WriteOptions, WriteResult } from "@/features/vaults/client";

/** While something is in flight or due, refresh often so a keeper purchase settles on screen without a reload. */
const LIVE_MS = 10_000;

const dueSoon = (positions?: Position[]) => positions?.some((p) => p.status === "active" && p.next_execution_ts * 1000 - Date.now() < 120_000) ?? false;
const inFlight = (executions?: Execution[]) => executions?.some((e) => e.status === "submitted") ?? false;

function useAuthed() {
	return !!useSession((s) => s.accessToken);
}

export function usePositions() {
	const authed = useAuthed();
	return useQuery({
		queryKey: ["positions"],
		queryFn: () => getPositions(api),
		enabled: authed,
		refetchInterval: (query) => (dueSoon(query.state.data) ? LIVE_MS : 60_000),
	});
}

export function usePosition(id: string) {
	const authed = useAuthed();
	return useQuery({
		queryKey: ["position", id],
		queryFn: () => getPosition(api, id),
		enabled: authed && !!id,
		refetchInterval: (query) => (query.state.data && dueSoon([query.state.data]) ? LIVE_MS : 60_000),
	});
}

export function usePositionAccount(id: string) {
	const authed = useAuthed();
	return useQuery({ queryKey: ["account", id], queryFn: () => getPositionAccount(api, id), enabled: authed && !!id, staleTime: 5 * 60_000 });
}

export function usePositionExecutions(id: string) {
	const authed = useAuthed();
	return useQuery({
		queryKey: ["executions", "position", id],
		queryFn: () => getPositionExecutions(api, id),
		enabled: authed && !!id,
		refetchInterval: (query) => (inFlight(query.state.data) ? LIVE_MS : 30_000),
	});
}

/** Latest executions across the wallet's positions (dashboard "Recent swaps"). */
export function useRecentExecutions(positions: Position[] | undefined, limit = 5) {
	const ids = positions?.map((p) => p.id) ?? [];
	return useQuery({
		queryKey: ["executions", "recent", ids.join(","), limit],
		queryFn: () => getRecentExecutions(api, ids, limit),
		enabled: ids.length > 0,
		refetchInterval: (query) => (inFlight(query.state.data) || dueSoon(positions) ? LIVE_MS : 30_000),
	});
}

export function useExecution(id: string) {
	const authed = useAuthed();
	return useQuery({
		queryKey: ["execution", id],
		queryFn: () => getExecution(api, id),
		enabled: authed && !!id,
		refetchInterval: (query) => (query.state.data?.status === "submitted" ? 4_000 : false),
	});
}

/** Everything a vault write can change. */
const AFFECTED = ["positions", "position", "account", "executions", "execution", "transactions", "portfolio", "wallet", "notifications"];

export type TxStage = "idle" | "signing" | "submitting" | "confirmed" | "rejected" | "failed";

/**
 * Runs one vault write and exposes its stage for the UI: waiting for the wallet → submitting → confirmed, or
 * rejected (declined in the wallet; nothing was sent) / failed. Never retries on its own: a retried deposit could
 * go out twice.
 */
export function useVaultTx() {
	const queryClient = useQueryClient();
	const owner = useSession((s) => s.address);
	const [stage, setStage] = useState<TxStage>("idle");
	const [error, setError] = useState<string | null>(null);
	const [errorName, setErrorName] = useState<string | null>(null);
	const [result, setResult] = useState<WriteResult | null>(null);

	const run = useCallback(
		async (write: (opts: WriteOptions) => Promise<WriteResult>) => {
			if (!owner) return null;
			setStage("signing");
			setError(null);
			setErrorName(null);
			try {
				const res = await write({ owner, onSigned: () => setStage("submitting") });
				setResult(res);
				setStage("confirmed");
				await Promise.all(AFFECTED.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
				return res;
			} catch (e) {
				setStage(isWalletRejection(e) ? "rejected" : "failed");
				setError(errorMessage(e));
				setErrorName((e as Error)?.name ?? null);
				return null;
			}
		},
		[owner, queryClient],
	);

	const reset = useCallback(() => {
		setStage("idle");
		setError(null);
		setErrorName(null);
		setResult(null);
	}, []);

	return { stage, error, errorName, result, run, reset, busy: stage === "signing" || stage === "submitting" };
}
