import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { NotificationEvent, SettingsDto } from "@/lib/api/dto";
import { getNotifications, getSettings, getUnreadCount, markAllNotificationsRead, updateSettings } from "@/lib/api/endpoints";
import { useSession } from "@/features/auth/store";

const useAuthed = () => !!useSession((s) => s.accessToken);

/** Backend settings: default slippage for new positions and which notifications are muted. */
export function useSettings() {
	return useQuery({ queryKey: ["settings"], queryFn: () => getSettings(api), enabled: useAuthed(), staleTime: 5 * 60_000 });
}

export function useUpdateSettings() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: Partial<Pick<SettingsDto, "defaultSlippageBps" | "mutedNotifications">>) => updateSettings(api, body),
		onSuccess: (data) => queryClient.setQueryData(["settings"], data),
	});
}

/** Plain-language names for the backend's notification events. */
export const NOTIFICATION_LABEL: Record<NotificationEvent, { label: string; hint: string }> = {
	execution_completed: { label: "Purchase completed", hint: "After each completed purchase." },
	execution_failed: { label: "Purchase failed or skipped", hint: "When an automated purchase doesn't go through." },
	deposit_confirmed: { label: "Deposit confirmed", hint: "When a deposit lands in your vault." },
	withdrawal_confirmed: { label: "Withdrawal confirmed", hint: "When a withdrawal reaches your wallet." },
	low_balance: { label: "Funding reminders", hint: "When your vault is running out of USDC." },
	authorizations_low: { label: "Signed purchases running low", hint: "When you need to sign more purchases." },
};

/** The in-app inbox (`GET /notifications`); polled, there is no push channel. */
export function useNotifications() {
	return useQuery({ queryKey: ["notifications", "list"], queryFn: () => getNotifications(api, 20), enabled: useAuthed(), refetchInterval: 30_000 });
}

export function useUnreadCount() {
	return useQuery({ queryKey: ["notifications", "unread"], queryFn: () => getUnreadCount(api), enabled: useAuthed(), refetchInterval: 20_000 });
}

export function useMarkAllRead() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => markAllNotificationsRead(api),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
	});
}
