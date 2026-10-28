"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { apiRoutes } from "@/lib/routes";

/**
 * The backend's "now", ticking locally. In mock mode the demo clock can be fast-forwarded, so countdowns and
 * "Eligible" states must follow the backend, not the browser.
 */
export function useNow(tickMs = 30_000) {
	const { data } = useQuery({
		queryKey: ["clock"],
		queryFn: async () => {
			const { data } = await api.get(apiRoutes.CLOCK);
			return (data.data.now as number) - Date.now();
		},
		staleTime: 15_000,
	});
	const offset = data ?? 0;
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), tickMs);
		return () => clearInterval(id);
	}, [tickMs]);

	return now + offset;
}
