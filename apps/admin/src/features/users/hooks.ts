"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui/sonner";
import { getUser, searchUsers, setUserRole } from "@/lib/api/endpoints";
import { errorMessage } from "@/lib/api/errors";
import type { Role } from "@/lib/api/dto";
import { shortKey } from "@/lib/format";

export interface UserFilters {
	search?: string;
	role?: Role;
	offset: number;
}

export const useUsers = (f: UserFilters, limit: number) =>
	useQuery({ queryKey: ["users", f, limit], queryFn: () => searchUsers({ ...f, limit }), placeholderData: keepPreviousData });

export const useUser = (id: string) => useQuery({ queryKey: ["user", id], queryFn: () => getUser(id) });

/** Promote / demote. The backend refuses your own role and the last admin (409); it's audited. */
export function useSetRole(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (role: Role) => setUserRole(id, role),
		onSuccess: (change) => {
			toast.success(`${shortKey(change.walletAddress)} is now ${change.role === "admin" ? "an admin" : "a user"}`, {
				description: `Was ${change.previousRole}. Takes effect on their next request.`,
			});
			void queryClient.invalidateQueries({ queryKey: ["user", id] });
			void queryClient.invalidateQueries({ queryKey: ["users"] });
			void queryClient.invalidateQueries({ queryKey: ["overview"] });
		},
		onError: (error) => toast.error("Couldn't change the role", { description: errorMessage(error) }),
	});
}
