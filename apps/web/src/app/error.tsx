"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/ErrorScreen";

/** Something outside the dashboard threw (Next 16 passes `retry`). */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return <ErrorScreen retry={retry} digest={error.digest} />;
}
