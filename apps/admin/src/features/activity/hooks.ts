"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
	getAssets,
	getPosition,
	searchExecutions,
	searchLedger,
	searchPositions,
	type ExecutionQuery,
	type LedgerQuery,
	type PositionQuery,
} from "@/lib/api/endpoints";

export const usePositions = (q: PositionQuery) =>
	useQuery({ queryKey: ["positions", q], queryFn: () => searchPositions(q), placeholderData: keepPreviousData });

export const usePosition = (id: string) => useQuery({ queryKey: ["position", id], queryFn: () => getPosition(id) });

export const useExecutions = (q: ExecutionQuery) =>
	useQuery({ queryKey: ["executions", q], queryFn: () => searchExecutions(q), placeholderData: keepPreviousData });

export const useLedger = (q: LedgerQuery) =>
	useQuery({ queryKey: ["ledger", q], queryFn: () => searchLedger(q), placeholderData: keepPreviousData });

export const useAssets = () => useQuery({ queryKey: ["assets"], queryFn: getAssets, staleTime: 60 * 60_000 });
