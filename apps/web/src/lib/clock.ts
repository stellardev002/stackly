"use client";

import { useEffect, useState } from "react";

/** The current time, re-rendering every `tickMs`, for countdowns and due states (no `Date.now()` during render). */
export function useNow(tickMs = 30_000) {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), tickMs);
		return () => clearInterval(id);
	}, [tickMs]);

	return now;
}
