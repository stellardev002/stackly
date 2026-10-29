"use client";

import { Skeleton } from "@repo/ui/skeleton";
import { Chip } from "@repo/ui/surface";
import { humanize } from "@/lib/format";
import { DataList, ErrorState, PageHeader, Section, type Column } from "@/components/ui";
import { useConfig, useHealth, useWorkers } from "@/features/overview/hooks";
import { WorkersPanel } from "@/features/overview/components/WorkersPanel";

type Setting = { key: string; value: string };

const settingColumns: Column<Setting>[] = [
	{ header: "Setting", primary: true, cell: (s) => <span className="font-mono text-sm break-all">{s.key}</span> },
	{ header: "Value", cell: (s) => <span className="font-mono text-sm break-all">{s.value}</span> },
];

/** Service health (`/health`), the workers and accounts (`/admin/workers`), and non-secret settings (`/admin/config`). */
export function System() {
	const health = useHealth();
	const workers = useWorkers();
	const config = useConfig();

	return (
		<>
			<PageHeader title="System" subtitle="Dependencies, background workers, operating accounts and deployment settings." />
			<div className="grid min-w-0 gap-6">
				<Section
					title="Health"
					action={
						health.data ? (
							<Chip tone={health.data.status === "ok" ? "success" : "danger"}>
								{health.data.status === "ok" ? "All systems up" : humanize(health.data.status)}
							</Chip>
						) : undefined
					}
				>
					{health.isError ? (
						<ErrorState error={health.error} onRetry={() => void health.refetch()} />
					) : !health.data ? (
						<Skeleton className="h-16 w-full rounded-card" />
					) : Object.keys(health.data.details).length === 0 ? (
						<p className="text-base font-light text-muted">
							{health.data.status === "ok" ? "Healthy." : "A dependency is down; the failing check is named in the server log."}
						</p>
					) : (
						<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{Object.entries(health.data.details).map(([name, { status }]) => (
								<li key={name} className="flex items-center justify-between gap-3 rounded-card border border-line px-4 py-3">
									<span className="min-w-0 truncate">{humanize(name)}</span>
									<Chip tone={status === "up" ? "success" : "danger"}>{status}</Chip>
								</li>
							))}
						</ul>
					)}
				</Section>

				{workers.isError ? (
					<ErrorState error={workers.error} onRetry={() => void workers.refetch()} title="Couldn't load the workers" />
				) : workers.data ? (
					<WorkersPanel workers={workers.data} title="Workers & accounts" />
				) : (
					<Skeleton className="h-[320px] w-full rounded-card" />
				)}

				<Section title="Deployment settings" action={<span className="caption">Keys and secrets are never shown</span>}>
					{config.isError ? (
						<ErrorState error={config.error} onRetry={() => void config.refetch()} />
					) : (
						<DataList columns={settingColumns} rows={config.data?.settings} rowKey={(s) => s.key} loading={config.isPending} />
					)}
				</Section>
			</div>
		</>
	);
}
