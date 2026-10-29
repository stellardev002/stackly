"use client";

import { useSyncExternalStore } from "react";

/**
 * The current time for "5 minutes ago" labels, ticking every 30 s. Render code must not call `Date.now()` (React
 * Compiler purity), so components read it from here. The server snapshot is 0: relative labels render after hydration.
 */
let now = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(onChange: () => void) {
	listeners.add(onChange);
	if (!timer) {
		now = Date.now();
		timer = setInterval(() => {
			now = Date.now();
			for (const l of listeners) l();
		}, 30_000);
	}
	return () => {
		listeners.delete(onChange);
		if (!listeners.size && timer) {
			clearInterval(timer);
			timer = null;
		}
	};
}

// The snapshot must be stable between ticks, so the first read pins `now`.
export const useNow = () =>
	useSyncExternalStore(
		subscribe,
		() => (now ||= Date.now()),
		() => 0,
	);
