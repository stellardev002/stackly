"use client";

import type { AdminUserSummary, Role } from "@/lib/api/dto";
import { relative, utcDate, utcDateTime } from "@/lib/format";
import { useNow } from "@/lib/clock";
import { PAGE_SIZE } from "@/lib/params";
import { routes } from "@/lib/routes";
import { FilterBar, SelectFilter, TextFilter, useFilters } from "@/components/filters";
import { Copyable, DataList, ErrorState, PageHeader, Pager, Section, StatusChip, type Column } from "@/components/ui";
import { useUsers, type UserFilters } from "@/features/users/hooks";

/** `GET /admin/users`: every user, newest first; filter by wallet prefix or role. */
export function UserList(filters: UserFilters) {
	const now = useNow();
	const users = useUsers(filters, PAGE_SIZE);
	const current = { search: filters.search, role: filters.role };
	const set = useFilters(current);

	const columns: Column<AdminUserSummary>[] = [
		{ header: "Wallet", primary: true, cell: (u) => <Copyable value={u.walletAddress} head={6} tail={6} /> },
		{ header: "Role", cell: (u) => <StatusChip value={u.role} /> },
		{ header: "Positions", cell: (u) => u.positionCount, className: "text-right md:text-left" },
		{
			header: "Last sign-in",
			cell: (u) =>
				u.lastLoginAt ? (
					<span title={utcDateTime(u.lastLoginAt)}>
						{now ? relative(Date.parse(u.lastLoginAt), now) : utcDate(u.lastLoginAt)}
					</span>
				) : (
					<span className="text-muted">Never</span>
				),
		},
		{ header: "Joined", cell: (u) => utcDate(u.createdAt) },
	];

	return (
		<>
			<PageHeader
				title="Users"
				subtitle={
					users.data
						? `${users.data.paginationMeta.totalCount.toLocaleString("en-US")} wallets have signed in`
						: "Wallets that have signed in"
				}
			/>
			<Section title="All users">
				<FilterBar
					active={!!(filters.search || filters.role)}
					count={Object.values(current).filter(Boolean).length}
					onClear={() => set({ search: undefined, role: undefined })}
				>
					<TextFilter
						key={filters.search ?? ""}
						label="Wallet starts with"
						value={filters.search}
						placeholder="GBZX…"
						transform={(v) => v.toUpperCase()}
						pattern="[A-Za-z2-7]{1,56}"
						title="Letters A–Z and digits 2–7 of a Stellar address"
						onChange={(search) => set({ search })}
					/>
					<SelectFilter
						label="Role"
						value={filters.role}
						options={["admin", "user"] as Role[]}
						onChange={(role) => set({ role })}
					/>
				</FilterBar>
				{users.isError ? (
					<ErrorState error={users.error} onRetry={() => void users.refetch()} />
				) : (
					<>
						<DataList
							columns={columns}
							rows={users.data?.results}
							rowKey={(u) => u.id}
							href={(u) => routes.USER(u.id)}
							loading={users.isPending}
							empty="No users match these filters."
						/>
						<Pager
							meta={users.data?.paginationMeta}
							offset={filters.offset}
							limit={PAGE_SIZE}
							hrefFor={(offset) => routes.USERS({ ...current, offset: offset ? String(offset) : undefined })}
						/>
					</>
				)}
			</Section>
		</>
	);
}
