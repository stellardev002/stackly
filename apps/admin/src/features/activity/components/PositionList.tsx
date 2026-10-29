"use client";

import { X } from "lucide-react";
import { Chip } from "@repo/ui/surface";
import { POSITION_STATUSES, type AdminPositionSummary, type PositionStatus } from "@/lib/api/dto";
import { humanize, money, relative, shortId, utcDate, utcDateTime } from "@/lib/format";
import { useNow } from "@/lib/clock";
import { PAGE_SIZE } from "@/lib/params";
import { routes } from "@/lib/routes";
import { FilterBar, SelectFilter, ToggleFilter, useFilters } from "@/components/filters";
import { Copyable, DataList, ErrorState, PageHeader, Pager, Section, StatusChip, type Column } from "@/components/ui";
import { usePositions } from "@/features/activity/hooks";

export interface PositionFilters {
	status?: PositionStatus;
	userId?: string;
	due: boolean;
	stuck: boolean;
	offset: number;
}

/** `GET /admin/positions`: every position; "Due now" is what the keeper would pick up, "Stuck" waits > 15 min. */
export function PositionList(f: PositionFilters) {
	const now = useNow();
	const positions = usePositions({
		status: f.status,
		userId: f.userId,
		due: f.due || undefined,
		stuck: f.stuck || undefined,
		offset: f.offset,
		limit: PAGE_SIZE,
	});
	const current = { status: f.status, userId: f.userId, due: f.due ? "true" : undefined, stuck: f.stuck ? "true" : undefined };
	const set = useFilters(current);

	const columns: Column<AdminPositionSummary>[] = [
		{
			header: "Position",
			primary: true,
			cell: (p) => (
				<span className="flex flex-wrap items-center gap-2">
					<span className="font-mono">{shortId(p.id)}</span>
					<span className="text-muted">
						{p.sourceAsset.code} → {p.targetAsset.code}
					</span>
				</span>
			),
		},
		{ header: "Status", cell: (p) => <StatusChip value={p.status} /> },
		{
			header: "Per purchase",
			cell: (p) => <span className="whitespace-nowrap">{money(p.amountPerPurchase, p.sourceAsset.code)}</span>,
		},
		{ header: "Frequency", cell: (p) => humanize(p.frequency) },
		{
			header: "Next purchase",
			cell: (p) =>
				p.status === "active" ? (
					<span className="whitespace-nowrap" title={utcDateTime(p.nextExecutionAt)}>
						{now ? relative(Date.parse(p.nextExecutionAt), now) : utcDateTime(p.nextExecutionAt)}
					</span>
				) : (
					<span className="text-muted">—</span>
				),
		},
		{
			header: "Last attempt",
			cell: (p) =>
				p.lastExecutionStatus ? <StatusChip value={p.lastExecutionStatus} /> : <span className="text-muted">None yet</span>,
		},
		{ header: "Owner", cell: (p) => <Copyable value={p.walletAddress} /> },
		{ header: "Created", hideOnMobile: true, cell: (p) => utcDate(p.createdAt) },
	];

	return (
		<>
			<PageHeader
				title="Positions"
				subtitle={
					positions.data
						? `${positions.data.paginationMeta.totalCount.toLocaleString("en-US")} matching`
						: "Every DCA position, newest first"
				}
			/>
			<Section title="All positions">
				<FilterBar
					active={!!(f.status || f.userId || f.due || f.stuck)}
					count={Object.values(current).filter(Boolean).length}
					onClear={() => set({ status: undefined, userId: undefined, due: undefined, stuck: undefined })}
				>
					<SelectFilter label="Status" value={f.status} options={POSITION_STATUSES} onChange={(status) => set({ status })} />
					<div className="flex gap-2">
						<ToggleFilter label="Due now" on={f.due} onChange={(on) => set({ due: on ? "true" : undefined })} />
						<ToggleFilter label="Stuck" on={f.stuck} onChange={(on) => set({ stuck: on ? "true" : undefined })} />
					</div>
					{f.userId && (
						<button
							type="button"
							onClick={() => set({ userId: undefined })}
							className="cursor-pointer self-start sm:self-end"
							aria-label="Remove owner filter"
						>
							<Chip tone="dark">
								Owner {shortId(f.userId)} <X className="size-3" />
							</Chip>
						</button>
					)}
				</FilterBar>
				{positions.isError ? (
					<ErrorState error={positions.error} onRetry={() => void positions.refetch()} />
				) : (
					<>
						<DataList
							columns={columns}
							rows={positions.data?.results}
							rowKey={(p) => p.id}
							href={(p) => routes.POSITION(p.id)}
							linkLabel={(p) => `Position ${shortId(p.id)}`}
							loading={positions.isPending}
							empty={
								f.due
									? "Nothing is due: the keeper is up to date."
									: f.stuck
										? "No purchase is stuck."
										: "No positions match these filters."
							}
						/>
						<Pager
							meta={positions.data?.paginationMeta}
							offset={f.offset}
							limit={PAGE_SIZE}
							hrefFor={(offset) => routes.POSITIONS({ ...current, offset: offset ? String(offset) : undefined })}
						/>
					</>
				)}
			</Section>
		</>
	);
}
