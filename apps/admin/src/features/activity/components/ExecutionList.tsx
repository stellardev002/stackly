"use client";

import { X } from "lucide-react";
import { Chip } from "@repo/ui/surface";
import { EXECUTION_STATUSES, FAILURE_REASONS, type ExecutionStatus, type FailureReason } from "@/lib/api/dto";
import { shortId } from "@/lib/format";
import { PAGE_SIZE } from "@/lib/params";
import { routes } from "@/lib/routes";
import { DateRange, FilterBar, SelectFilter, useFilters } from "@/components/filters";
import { DataList, ErrorState, PageHeader, Pager, Section } from "@/components/ui";
import { useExecutions } from "@/features/activity/hooks";
import { REASON, executionColumns } from "@/features/activity/columns";

export interface ExecutionFilters {
	status?: ExecutionStatus;
	reason?: FailureReason;
	positionId?: string;
	from?: string;
	to?: string;
	offset: number;
}

/** `GET /admin/executions`: automated purchase attempts across all users, newest interval first. */
export function ExecutionList(f: ExecutionFilters) {
	const { offset, ...current } = f;
	const executions = useExecutions({ ...current, offset, limit: PAGE_SIZE });
	const set = useFilters(current);
	const columns = executionColumns(true);

	return (
		<>
			<PageHeader
				title="Purchases"
				subtitle="Every automated purchase attempt. Failed attempts debit nothing and aren't retried automatically."
			/>
			<Section title="Purchase attempts">
				<FilterBar
					active={Object.values(current).some(Boolean)}
					count={Object.values(current).filter(Boolean).length}
					onClear={() => set({ status: undefined, reason: undefined, positionId: undefined, from: undefined, to: undefined })}
				>
					<SelectFilter label="Status" value={f.status} options={EXECUTION_STATUSES} onChange={(status) => set({ status })} />
					<SelectFilter
						label="Reason"
						value={f.reason}
						options={FAILURE_REASONS.map((r) => ({ value: r, label: REASON[r]! }))}
						onChange={(reason) => set({ reason })}
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
				{executions.isError ? (
					<ErrorState error={executions.error} onRetry={() => void executions.refetch()} />
				) : (
					<>
						<DataList
							columns={columns}
							rows={executions.data?.results}
							rowKey={(e) => e.id}
							loading={executions.isPending}
							empty="No purchase attempts match these filters."
						/>
						<Pager
							meta={executions.data?.paginationMeta}
							offset={offset}
							limit={PAGE_SIZE}
							hrefFor={(o) => routes.EXECUTIONS({ ...current, offset: o ? String(o) : undefined })}
						/>
					</>
				)}
			</Section>
		</>
	);
}
