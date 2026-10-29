"use client";

import { useState } from "react";
import { Scale, Wrench } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/dialog";
import { toast } from "@repo/ui/sonner";
import { Chip, Notice } from "@repo/ui/surface";
import { reconcile, repairPosition } from "@/lib/api/endpoints";
import { errorMessage, httpStatus } from "@/lib/api/errors";
import type { Reconciliation as ReconciliationResult, Repair } from "@/lib/api/dto";
import { isNegative, shortId, signed, amount } from "@/lib/format";
import { routes } from "@/lib/routes";
import { Copyable, DataList, ErrorState, InlineLink, PageHeader, Section, Tile, type Column } from "@/components/ui";

type Entry = ReconciliationResult["drifted"][number];
type AssetRow = Entry["assets"][number];

const LIMITS = [10, 25, 50];

/**
 * `GET /reconciliation` compares position accounts on Stellar with the ledger and returns the ones that disagree;
 * `POST /reconciliation/repair` books signed `adjustment` rows for one position so the ledger matches the chain. It
 * moves no funds and is audited. Native XLM is never adjusted (the account also holds a reserve and top-ups).
 */
export function Reconciliation() {
	const [limit, setLimit] = useState(25);
	const run = useMutation({
		mutationFn: reconcile,
		onError: (error) => toast.error("Comparison failed", { description: errorMessage(error) }),
	});
	const result = run.data;

	return (
		<>
			<PageHeader
				title="Reconciliation"
				subtitle="Compare position accounts on Stellar with the ledger. Only accounts that disagree are listed; accounts with a purchase in flight are skipped."
			/>
			<Section title="Run a comparison">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
					<label className="flex flex-col gap-1.5">
						<span className="caption">Accounts to check</span>
						<select
							value={limit}
							onChange={(e) => setLimit(Number(e.target.value))}
							className="h-10 w-full cursor-pointer rounded-full border border-line bg-white px-4 text-sm outline-none focus:border-coral sm:w-[160px]"
						>
							{LIMITS.map((l) => (
								<option key={l} value={l}>
									Up to {l}
								</option>
							))}
						</select>
					</label>
					<Button
						onClick={() => run.mutate(limit)}
						isLoading={run.isPending}
						loadingText="Reading the network…"
						className="w-full sm:w-fit"
					>
						<Scale /> Compare now
					</Button>
				</div>
				<p className="caption mt-3">
					Reads each account from Horizon after letting the indexer catch up, so it can take a little while.
				</p>
			</Section>

			{run.isError && (
				<div className="mt-6">
					<ErrorState error={run.error} title="Couldn't compare" onRetry={() => run.mutate(limit)} />
				</div>
			)}

			{result && (
				<div className="animate-pop mt-6 flex flex-col gap-6">
					<div className="grid grid-cols-3 gap-3">
						<Tile label="Checked" value={result.checked} />
						<Tile label="Skipped" value={result.skipped} hint="In flight or unreachable" />
						<Tile label="Drifted" value={result.drifted.length} tone={result.drifted.length ? "danger" : "success"} />
					</div>
					{result.drifted.length === 0 ? (
						<Notice tone="success" title="Ledger and network agree">
							Every checked account matches its ledger.
						</Notice>
					) : (
						result.drifted.map((entry) => (
							<DriftedEntry key={entry.positionId} entry={entry} onRepaired={() => run.mutate(limit)} />
						))
					)}
				</div>
			)}
		</>
	);
}

const assetColumns: Column<AssetRow>[] = [
	{ header: "Asset", primary: true, cell: (a) => <Chip tone="dark">{a.asset.code}</Chip> },
	{ header: "On Stellar", cell: (a) => <span className="whitespace-nowrap">{amount(a.chainBalance, 7)}</span> },
	{ header: "Ledger", cell: (a) => <span className="whitespace-nowrap">{amount(a.ledgerBalance, 7)}</span> },
	{
		header: "Difference",
		cell: (a) => (
			<span className={`whitespace-nowrap ${isNegative(a.difference) ? "text-danger" : ""}`}>{signed(a.difference, 7)}</span>
		),
	},
	{ header: "Drift", cell: (a) => (a.drift ? <Chip tone="danger">Drift</Chip> : <Chip tone="success">OK</Chip>) },
];

function DriftedEntry({ entry, onRepaired }: { entry: Entry; onRepaired: () => void }) {
	const [open, setOpen] = useState(false);
	const queryClient = useQueryClient();
	const repair = useMutation({
		mutationFn: () => repairPosition(entry.positionId),
		onSuccess: (r) => {
			setOpen(false);
			toast.success(
				r.repaired.length ? `Booked ${r.repaired.length} adjustment${r.repaired.length === 1 ? "" : "s"}` : "Nothing to adjust",
			);
			for (const key of ["ledger", "position", "positions"]) void queryClient.invalidateQueries({ queryKey: [key] });
		},
	});

	return (
		<Section
			title={
				<span className="flex flex-wrap items-center gap-2">
					Position <InlineLink href={routes.POSITION(entry.positionId)}>{shortId(entry.positionId)}</InlineLink>
				</span>
			}
			action={
				<Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={!!repair.data}>
					<Wrench /> {repair.data ? "Repaired" : "Repair ledger"}
				</Button>
			}
		>
			<div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
				<span className="caption">Account</span>
				<Copyable value={entry.address} head={6} tail={6} />
			</div>
			<DataList columns={assetColumns} rows={entry.assets} rowKey={(a) => a.asset.id} />
			{repair.data && <RepairResult result={repair.data} onRecheck={onRepaired} />}

			<Dialog open={open} onOpenChange={(o) => !repair.isPending && setOpen(o)}>
				<DialogContent className="max-w-[calc(100%-2rem)] gap-0 rounded-panel border-0 bg-white p-6 sm:max-w-[480px] sm:p-8">
					<DialogTitle className="text-2xl font-normal tracking-[-0.03em]">Repair this position&apos;s ledger?</DialogTitle>
					<DialogDescription className="mt-2 text-base font-light text-muted">
						For each credit asset that differs, Stackly books an <span className="text-ink">adjustment</span> ledger row so the
						ledger matches the network. No funds move. Native XLM is never adjusted. The repair is audited under your wallet.
					</DialogDescription>
					{repair.isError && (
						<Notice tone="error" title="Couldn't repair" className="mt-4">
							{httpStatus(repair.error) === 409
								? "A purchase is in flight for this position. Try again once it settles."
								: errorMessage(repair.error)}
						</Notice>
					)}
					<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Button variant="outline" onClick={() => setOpen(false)} disabled={repair.isPending}>
							Cancel
						</Button>
						<Button variant="danger" onClick={() => repair.mutate()} isLoading={repair.isPending} loadingText="Repairing…">
							Book adjustments
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</Section>
	);
}

function RepairResult({ result, onRecheck }: { result: Repair; onRecheck: () => void }) {
	return (
		<div className="mt-4 flex flex-col gap-3">
			{result.repaired.length > 0 && (
				<Notice tone="success" title="Adjustments booked">
					{result.repaired.map((r) => `${r.asset.code} ${signed(r.adjustment, 7)}`).join(" · ")}
				</Notice>
			)}
			{result.unrepairable.map((u) => (
				<Notice key={u.asset.id} tone="warning" title={`${u.asset.code} left alone`}>
					{u.reason}
				</Notice>
			))}
			{result.stillDrifted && (
				<Notice
					tone="warning"
					title="Still differs after the repair"
					action={
						<Button size="sm" variant="outline" onClick={onRecheck}>
							Compare again
						</Button>
					}
				>
					A payment may have landed meanwhile, or an asset can&apos;t be repaired automatically.
				</Notice>
			)}
		</div>
	);
}
