"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/dialog";
import { Skeleton } from "@repo/ui/skeleton";
import { Chip, Notice } from "@repo/ui/surface";
import { httpStatus } from "@/lib/api/errors";
import type { AdminUserDetail, AssetTotals } from "@/lib/api/dto";
import { accountUrl, humanize, money, percent, relative, shortId, utcDate, utcDateTime, utcDateTimeSeconds } from "@/lib/format";
import { useNow } from "@/lib/clock";
import { routes } from "@/lib/routes";
import { useSession } from "@/features/auth/store";
import { Copyable, DataList, ErrorState, Facts, PageHeader, Section, StatusChip, type Column } from "@/components/ui";
import { useSetRole, useUser } from "@/features/users/hooks";

/** `GET /admin/users/{id}`: profile, role (changeable), per-asset totals, positions, settings and recent activity. */
export function UserDetail({ id }: { id: string }) {
	const user = useUser(id);
	const back = (
		<Link href={routes.USERS()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
			<ArrowLeft className="size-4" /> Users
		</Link>
	);

	if (user.isError) {
		return (
			<>
				{back}
				{httpStatus(user.error) === 404 ? (
					<Notice tone="warning" title="No user with this id" />
				) : (
					<ErrorState error={user.error} onRetry={() => void user.refetch()} />
				)}
			</>
		);
	}
	if (user.isPending) {
		return (
			<>
				{back}
				<Skeleton className="h-10 w-72" />
				<Skeleton className="mt-6 h-48 w-full rounded-card" />
			</>
		);
	}
	const u = user.data;
	return (
		<>
			{back}
			<PageHeader
				title={`User ${shortId(u.id)}`}
				subtitle={<Copyable value={u.walletAddress} head={8} tail={8} className="text-base" />}
				actions={<RoleControl user={u} />}
			/>
			<div className="grid min-w-0 gap-6">
				<Section title="Profile">
					<Facts
						items={[
							{ label: "Role", value: <StatusChip value={u.role} /> },
							{ label: "Positions", value: u.positionCount },
							{ label: "Joined", value: utcDateTime(u.createdAt) },
							{ label: "Last sign-in", value: u.lastLoginAt ? utcDateTime(u.lastLoginAt) : "Never" },
							{ label: "Default slippage", value: percent(u.defaultSlippageBps) },
							{
								label: "Muted notifications",
								value: u.mutedNotifications.length ? u.mutedNotifications.map(humanize).join(", ") : "None",
							},
							{
								label: "Wallet on Stellar Expert",
								value: (
									<a
										href={accountUrl(u.walletAddress)}
										target="_blank"
										rel="noreferrer"
										className="underline-offset-4 hover:underline"
									>
										Open account
									</a>
								),
							},
						]}
					/>
				</Section>

				<Section title="Holdings by asset">
					<AssetTotalsList assets={u.assets} />
				</Section>

				<div className="grid min-w-0 gap-6 xl:grid-cols-2">
					<Section
						title={`Positions · ${u.positions.length}`}
						action={
							u.positions.length > 0 ? (
								<Link href={routes.POSITIONS({ userId: u.id })} className="text-sm underline-offset-4 hover:underline">
									Open in Positions
								</Link>
							) : undefined
						}
					>
						<DataList
							columns={positionColumns}
							rows={u.positions}
							rowKey={(p) => p.id}
							href={(p) => routes.POSITION(p.id)}
							empty="This user hasn't created a position."
						/>
					</Section>
					<Section
						title="Recent activity"
						action={
							<Link href={routes.AUDIT({ actorId: u.id })} className="text-sm underline-offset-4 hover:underline">
								Audit log
							</Link>
						}
					>
						<RecentActivity entries={u.recentActivity} />
					</Section>
				</div>
			</div>
		</>
	);
}

const positionColumns: Column<AdminUserDetail["positions"][number]>[] = [
	{ header: "Position", primary: true, cell: (p) => <span className="font-mono">{shortId(p.id)}</span> },
	{ header: "Pair", cell: (p) => `${p.sourceCode} → ${p.targetCode}` },
	{ header: "Per purchase", cell: (p) => money(p.amountPerPurchase, p.sourceCode) },
	{ header: "Status", cell: (p) => <StatusChip value={p.status} /> },
	{ header: "Created", cell: (p) => utcDate(p.createdAt) },
];

/** Per-asset totals as cards: never summed across assets. */
export function AssetTotalsList({ assets }: { assets: AssetTotals[] }) {
	if (!assets.length) return <p className="text-base font-light text-muted">No deposits or purchases yet.</p>;
	return (
		<div className="grid gap-4 md:grid-cols-2">
			{assets.map((a) => (
				<div key={a.asset.id} className="min-w-0 rounded-card border border-line p-4">
					<div className="flex items-center justify-between gap-2">
						<Chip tone="dark">{a.asset.code}</Chip>
						<p className="truncate text-xl tracking-[-0.03em]">{money(a.balance, a.asset.code)}</p>
					</div>
					<dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
						{(
							[
								["Deposited", a.deposited],
								["Withdrawn", a.withdrawn],
								["Spent on swaps", a.swappedOut],
								["Received from swaps", a.swappedIn],
							] as const
						).map(([label, value]) => (
							<div key={label} className="min-w-0">
								<dt className="caption">{label}</dt>
								<dd className="truncate">{money(value, a.asset.code)}</dd>
							</div>
						))}
					</dl>
				</div>
			))}
		</div>
	);
}

function RecentActivity({ entries }: { entries: AdminUserDetail["recentActivity"] }) {
	const now = useNow();
	if (!entries.length) return <p className="text-base font-light text-muted">No recorded activity.</p>;
	return (
		<ol className="flex flex-col divide-y divide-line">
			{entries.map((e) => (
				<li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
					<span className="font-mono text-sm break-all">{e.action}</span>
					<span className="caption" title={utcDateTimeSeconds(e.at)}>
						{now ? relative(Date.parse(e.at), now) : utcDateTime(e.at)}
					</span>
				</li>
			))}
		</ol>
	);
}

/** Promote / demote with a confirmation. Your own role can't be changed (the backend refuses it too). */
function RoleControl({ user }: { user: AdminUserDetail }) {
	const [open, setOpen] = useState(false);
	const me = useSession((s) => s.address);
	const setRole = useSetRole(user.id);
	const next = user.role === "admin" ? "user" : "admin";
	const self = me === user.walletAddress;

	return (
		<>
			<Button
				variant={next === "admin" ? "primary" : "outline"}
				size="sm"
				onClick={() => setOpen(true)}
				disabled={self}
				title={self ? "You can't change your own role" : undefined}
			>
				{next === "admin" ? <ShieldCheck /> : <ShieldOff />}
				{next === "admin" ? "Make admin" : "Remove admin"}
			</Button>
			<Dialog open={open} onOpenChange={(o) => !setRole.isPending && setOpen(o)}>
				<DialogContent className="max-w-[calc(100%-2rem)] gap-0 rounded-panel border-0 bg-white p-6 sm:max-w-[460px] sm:p-8">
					<DialogTitle className="text-2xl font-normal tracking-[-0.03em]">
						{next === "admin" ? "Make this wallet an admin?" : "Remove admin access?"}
					</DialogTitle>
					<DialogDescription className="mt-2 text-base font-light text-muted">
						{next === "admin"
							? "They'll be able to see every user, position and ledger row, run the workers, repair ledgers and change roles."
							: "They'll lose access to the admin on their next request. The last admin can't be removed."}
					</DialogDescription>
					<p className="mt-4 rounded-card bg-page px-4 py-3 font-mono text-sm break-all">{user.walletAddress}</p>
					<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Button variant="outline" onClick={() => setOpen(false)} disabled={setRole.isPending}>
							Cancel
						</Button>
						<Button
							variant={next === "admin" ? "primary" : "danger"}
							isLoading={setRole.isPending}
							loadingText="Saving…"
							onClick={() => setRole.mutate(next, { onSuccess: () => setOpen(false) })}
						>
							{next === "admin" ? "Make admin" : "Remove admin"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
