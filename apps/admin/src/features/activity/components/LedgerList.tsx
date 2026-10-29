"use client";

import { X } from "lucide-react";
import { Chip } from "@repo/ui/surface";
import { LEDGER_KINDS, type LedgerKind } from "@/lib/api/dto";
import { shortId } from "@/lib/format";
import { PAGE_SIZE } from "@/lib/params";
import { routes } from "@/lib/routes";
import { DateRange, FilterBar, SelectFilter, useFilters } from "@/components/filters";
import { DataList, ErrorState, PageHeader, Pager, Section } from "@/components/ui";
import { useAssets, useLedger } from "@/features/activity/hooks";
import { ledgerColumns } from "@/features/activity/columns";

export interface LedgerFilters {
	kind?: LedgerKind;
	assetId?: string;
	positionId?: string;
	from?: string;
	to?: string;
	offset: number;
}

/** `GET /admin/ledger`: every balance movement across users. Positive entered a position, negative left it. */
export function LedgerList(f: LedgerFilters) {
	const { offset, ...current } = f;
	const ledger = useLedger({ ...current, offset, limit: PAGE_SIZE });
	const assets = useAssets();
	const set = useFilters(current);

	return (
		<>
			<PageHeader title="Ledger" subtitle="Deposits, swap legs, withdrawals and administrator adjustments, newest first." />
			<Section title="Ledger rows">
				<FilterBar
					active={Object.values(current).some(Boolean)}
					count={Object.values(current).filter(Boolean).length}
					onClear={() => set({ kind: undefined, assetId: undefined, positionId: undefined, from: undefined, to: undefined })}
				>
					<SelectFilter label="Kind" value={f.kind} options={LEDGER_KINDS} onChange={(kind) => set({ kind })} />
					<SelectFilter
						label="Asset"
						value={f.assetId}
						options={(assets.data ?? []).map((a) => ({ value: a.id, label: a.code }))}
						onChange={(assetId) => set({ assetId })}
					/>
					<DateRange from={f.from} to={f.to} onChange={(patch) => set(patch)} />
					{f.positionId && (
						<button
							type="button"
							onClick={() => set({ positionId: undefined })}
							className="cursor-pointer self-start sm:self-end"
							aria-label="Remove position filter"
						>
							<Chip tone="dark">
								Position {shortId(f.positionId)} <X className="size-3" />
							</Chip>
						</button>
					)}
				</FilterBar>
				{ledger.isError ? (
					<ErrorState error={ledger.error} onRetry={() => void ledger.refetch()} />
				) : (
					<>
						<DataList
							columns={ledgerColumns(true)}
							rows={ledger.data?.results}
							rowKey={(r) => r.id}
							loading={ledger.isPending}
							empty="No ledger rows match these filters."
						/>
						<Pager
							meta={ledger.data?.paginationMeta}
							offset={offset}
							limit={PAGE_SIZE}
							hrefFor={(o) => routes.LEDGER({ ...current, offset: o ? String(o) : undefined })}
						/>
					</>
				)}
			</Section>
		</>
	);
}
