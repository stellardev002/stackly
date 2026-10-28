"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/ErrorScreen";

/** A dashboard screen threw: keep the navigation, replace only the content. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return <ErrorScreen retry={retry} digest={error.digest} inline />;
}
