"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui/sonner";
import { getConfig, getHealth, getOverview, getStats, getWorkers, runWorker } from "@/lib/api/endpoints";
import { errorMessage } from "@/lib/api/errors";
import type { StatMetric } from "@/lib/api/dto";
import { humanize } from "@/lib/format";

export const useOverview = () => useQuery({ queryKey: ["overview"], queryFn: getOverview, refetchInterval: 60_000 });

export const useWorkers = () => useQuery({ queryKey: ["workers"], queryFn: getWorkers, refetchInterval: 30_000 });

export const useConfig = () => useQuery({ queryKey: ["config"], queryFn: getConfig, staleTime: 5 * 60_000 });

export const useHealth = () => useQuery({ queryKey: ["health"], queryFn: getHealth, refetchInterval: 60_000 });

export interface StatsRange {
	days: number;
	bucket: "hour" | "day";
}

/** `from` is rounded to the bucket so the query key (and the cache) is stable between renders. */
export function useStats(metric: StatMetric, range: StatsRange) {
	return useQuery({
		queryKey: ["stats", metric, range.days, range.bucket],
		queryFn: () => {
			const step = range.bucket === "hour" ? 3_600_000 : 86_400_000;
			const from = new Date(Math.floor((Date.now() - range.days * 86_400_000) / step) * step).toISOString();
			return getStats({ metric, from, bucket: range.bucket });
		},
	});
}

/** Runs the keeper or indexer now (waits for the tick), then refreshes everything it can change. */
export function useRunWorker() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: runWorker,
		onSuccess: (result, worker) => {
			if (result.error) toast.error(`${humanize(worker)} run failed`, { description: result.error });
			else
				toast.success(`${humanize(worker)} run finished`, {
					description: result.report
						? Object.entries(result.report)
								.map(([k, v]) => `${humanize(k.replace(/([A-Z])/g, " $1").toLowerCase())}: ${v}`)
								.join(" · ")
						: undefined,
				});
			for (const key of ["overview", "workers", "positions", "executions", "ledger", "health"])
				void queryClient.invalidateQueries({ queryKey: [key] });
		},
		onError: (error, worker) => toast.error(`Couldn't run the ${worker}`, { description: errorMessage(error) }),
	});
}
