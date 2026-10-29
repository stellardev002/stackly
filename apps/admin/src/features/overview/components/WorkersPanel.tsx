"use client";

import { Play } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Chip } from "@repo/ui/surface";
import type { AccountBalance, Worker, Workers } from "@/lib/api/dto";
import { amount, humanize, intervalLabel, relative, utcDateTime } from "@/lib/format";
import { useNow } from "@/lib/clock";
import { Copyable, Section } from "@/components/ui";
import { useRunWorker } from "@/features/overview/hooks";

/** Keeper and indexer loops (with run-now), the fee and funding accounts, and stuck purchases. */
export function WorkersPanel({ workers, title = "Workers" }: { workers: Workers; title?: string }) {
	const run = useRunWorker();
	return (
		<Section
			title={title}
			action={
				workers.stuckExecutions > 0 ? (
					<Chip tone="danger">{workers.stuckExecutions} stuck</Chip>
				) : (
					<Chip tone="success">Nothing stuck</Chip>
				)
			}
		>
			<div className="grid gap-4 md:grid-cols-2">
				<WorkerCard
					name="keeper"
					description="Submits each due pre-authorized purchase."
					worker={workers.keeper}
					running={run.isPending && run.variables === "keeper"}
					onRun={() => run.mutate("keeper")}
					disabled={run.isPending}
				/>
				<WorkerCard
					name="indexer"
					description="Books deposits and withdrawals from the chain."
					worker={workers.indexer}
					running={run.isPending && run.variables === "indexer"}
					onRun={() => run.mutate("indexer")}
					disabled={run.isPending}
				/>
				<AccountCard label="Keeper account" hint="Pays swap fees · keep ≥ 5 XLM" account={workers.keeperAccount} min={5} />
				<AccountCard label="Funding account" hint="Funds new position accounts" account={workers.fundingAccount} />
			</div>
		</Section>
	);
}

function WorkerCard({
	name,
	description,
	worker,
	running,
	onRun,
	disabled,
}: {
	name: "keeper" | "indexer";
	description: string;
	worker: Worker;
	running: boolean;
	onRun: () => void;
	disabled: boolean;
}) {
	const now = useNow();
	return (
		<div className="flex min-w-0 flex-col gap-3 rounded-card border border-line p-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="text-base">{humanize(name)}</p>
				{!worker.enabled ? (
					<Chip tone="neutral">Disabled</Chip>
				) : worker.healthy ? (
					<Chip tone="success">Healthy</Chip>
				) : (
					<Chip tone="danger">Unhealthy</Chip>
				)}
			</div>
			<p className="caption -mt-2">{description}</p>
			<dl className="grid grid-cols-2 gap-3 text-sm">
				<div>
					<dt className="caption">Runs</dt>
					<dd>{intervalLabel(worker.intervalSeconds)}</dd>
				</div>
				<div className="min-w-0">
					<dt className="caption">Last success</dt>
					<dd title={worker.lastRunAt ? utcDateTime(worker.lastRunAt) : undefined}>
						{worker.lastRunAt ? (now ? relative(Date.parse(worker.lastRunAt), now) : utcDateTime(worker.lastRunAt)) : "Never"}
					</dd>
				</div>
			</dl>
			{worker.lastReport && (
				<div className="flex flex-wrap gap-1.5">
					{Object.entries(worker.lastReport).map(([k, v]) => (
						<span key={k} className="rounded-full bg-page px-2.5 py-1 text-xs">
							{humanize(k.replace(/([A-Z])/g, " $1").toLowerCase())} <span className="text-muted">{v}</span>
						</span>
					))}
				</div>
			)}
			{worker.lastError && (
				<p className="rounded-card bg-danger-bg px-3 py-2 text-sm break-words text-danger">{worker.lastError}</p>
			)}
			<Button
				size="sm"
				variant="outline"
				className="mt-auto w-full sm:w-fit"
				onClick={onRun}
				isLoading={running}
				loadingText="Running…"
				disabled={disabled || !worker.enabled}
			>
				<Play /> Run {name} now
			</Button>
		</div>
	);
}

function AccountCard({
	label,
	hint,
	account,
	min,
}: {
	label: string;
	hint: string;
	account: AccountBalance | null;
	min?: number;
}) {
	const low = account?.xlm != null && min !== undefined && Number(account.xlm) < min;
	return (
		<div className="flex min-w-0 flex-col gap-2 rounded-card border border-line p-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="text-base">{label}</p>
				{!account ? (
					<Chip tone="neutral">Not configured</Chip>
				) : account.xlm === null ? (
					<Chip tone="warning">Unreachable</Chip>
				) : low ? (
					<Chip tone="danger">Low</Chip>
				) : (
					<Chip tone="success">OK</Chip>
				)}
			</div>
			<p className="caption -mt-1">{hint}</p>
			{account && (
				<>
					<p className={`text-2xl tracking-[-0.03em] ${low ? "text-danger" : ""}`}>
						{account.xlm === null ? "—" : `${amount(account.xlm, 2)} XLM`}
					</p>
					<Copyable value={account.address} head={6} tail={6} />
				</>
			)}
		</div>
	);
}
