"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAuditActions, searchAudit, type AuditQuery } from "@/lib/api/endpoints";
import type { AuditLog as AuditEntry } from "@/lib/api/dto";
import { shortId, utcDateTimeSeconds } from "@/lib/format";
import { PAGE_SIZE } from "@/lib/params";
import { routes } from "@/lib/routes";
import { DateRange, FilterBar, SelectFilter, TextFilter, useFilters } from "@/components/filters";
import { Copyable, DataList, ErrorState, InlineLink, PageHeader, Pager, Section, type Column } from "@/components/ui";

export type AuditFilters = Omit<AuditQuery, "limit" | "offset"> & { offset: number };

const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

/** `GET /audit-logs`: everything that changed and who did it, newest first. Search by request id to trace a call. */
export function AuditLog(f: AuditFilters) {
	const { offset, ...current } = f;
	const logs = useQuery({
		queryKey: ["audit", current, offset],
		queryFn: () => searchAudit({ ...current, offset, limit: PAGE_SIZE }),
		placeholderData: keepPreviousData,
	});
	const actions = useQuery({ queryKey: ["audit-actions"], queryFn: getAuditActions, staleTime: 5 * 60_000 });
	const set = useFilters(current);

	const columns: Column<AuditEntry>[] = [
		{ header: "Time", primary: true, cell: (e) => <span className="whitespace-nowrap">{utcDateTimeSeconds(e.at)}</span> },
		{ header: "Action", cell: (e) => <span className="font-mono text-sm break-all">{e.action}</span> },
		{
			header: "Actor",
			cell: (e) =>
				e.actorId ? (
					<InlineLink href={routes.USER(e.actorId)}>{shortId(e.actorId)}</InlineLink>
				) : (
					<span className="text-muted">Anonymous</span>
				),
		},
		{
			header: "Resource",
			cell: (e) =>
				e.resourceType ? (
					<span className="flex flex-col">
						<span>{e.resourceType}</span>
						{e.resourceId &&
							(e.resourceType === "dca_position" ? (
								<InlineLink href={routes.POSITION(e.resourceId)}>{shortId(e.resourceId)}</InlineLink>
							) : e.resourceType === "user" ? (
								<InlineLink href={routes.USER(e.resourceId)}>{shortId(e.resourceId)}</InlineLink>
							) : (
								<span className="font-mono text-xs break-all text-muted">{e.resourceId}</span>
							))}
					</span>
				) : (
					<span className="text-muted">—</span>
				),
		},
		{
			header: "Request",
			hideOnMobile: true,
			cell: (e) => (e.requestId ? <Copyable value={e.requestId} head={6} tail={4} /> : <span className="text-muted">—</span>),
		},
		{ header: "IP", hideOnMobile: true, cell: (e) => <span className="font-mono text-xs">{e.ip ?? "—"}</span> },
		{
			header: "Details",
			cell: (e) =>
				Object.keys(e.metadata ?? {}).length ? (
					<details className="relative z-10 max-w-[360px]">
						<summary className="cursor-pointer text-sm text-ink underline-offset-4 hover:underline">
							{Object.keys(e.metadata).length} fields
						</summary>
						<pre className="mt-2 max-h-60 overflow-auto rounded-card bg-page p-3 text-xs break-all whitespace-pre-wrap">
							{JSON.stringify(e.metadata, null, 2)}
						</pre>
						{e.traceId && <p className="caption mt-1 break-all">Trace {e.traceId}</p>}
					</details>
				) : (
					<span className="text-muted">—</span>
				),
		},
	];

	return (
		<>
			<PageHeader title="Audit log" subtitle="Sign-ins, position changes, role changes, repairs and worker runs, newest first." />
			<Section title="Events">
				<FilterBar
					active={Object.values(current).some(Boolean)}
					count={Object.values(current).filter(Boolean).length}
					onClear={() =>
						set({
							action: undefined,
							actorId: undefined,
							resourceType: undefined,
							resourceId: undefined,
							requestId: undefined,
							from: undefined,
							to: undefined,
						})
					}
				>
					<SelectFilter
						label="Action"
						value={f.action}
						options={(actions.data ?? []).map((a) => ({ value: a, label: a }))}
						onChange={(action) => set({ action })}
					/>
					<TextFilter
						key={`actor-${f.actorId ?? ""}`}
						label="Actor (user id)"
						value={f.actorId}
						placeholder="UUID"
						pattern={UUID}
						title="A user id (UUID)"
						onChange={(actorId) => set({ actorId })}
					/>
					<TextFilter
						key={`req-${f.requestId ?? ""}`}
						label="Request id"
						value={f.requestId}
						placeholder="x-request-id"
						onChange={(requestId) => set({ requestId })}
					/>
					<TextFilter
						key={`rt-${f.resourceType ?? ""}`}
						label="Resource type"
						value={f.resourceType}
						placeholder="dca_position"
						className="sm:w-[200px]"
						onChange={(resourceType) => set({ resourceType })}
					/>
					<TextFilter
						key={`rid-${f.resourceId ?? ""}`}
						label="Resource id"
						value={f.resourceId}
						placeholder="Id"
						onChange={(resourceId) => set({ resourceId })}
					/>
					<DateRange from={f.from} to={f.to} onChange={(patch) => set(patch)} />
				</FilterBar>
				{logs.isError ? (
					<ErrorState error={logs.error} onRetry={() => void logs.refetch()} />
				) : (
					<>
						<DataList
							columns={columns}
							rows={logs.data?.results}
							rowKey={(e) => e.id}
							loading={logs.isPending}
							empty="No events match these filters."
						/>
						<Pager
							meta={logs.data?.paginationMeta}
							offset={offset}
							limit={PAGE_SIZE}
							hrefFor={(o) => routes.AUDIT({ ...current, offset: o ? String(o) : undefined })}
						/>
					</>
				)}
			</Section>
		</>
	);
}
