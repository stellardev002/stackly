"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpStatus } from "@/lib/api/errors";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			gcTime: 10 * 60_000,
			// Don't retry what won't change: bad filters, missing records, no permission.
			retry: (count, error) => {
				const status = httpStatus(error);
				return count < 2 && !(status && status >= 400 && status < 500);
			},
			refetchOnWindowFocus: false,
		},
		// Never auto-retry a write (role changes, repairs, worker runs).
		mutations: { retry: false },
	},
});

export function Providers({ children }: { children: React.ReactNode }) {
	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
