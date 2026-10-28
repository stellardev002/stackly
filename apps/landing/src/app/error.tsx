"use client";

import { useEffect } from "react";
import { StacklyMark } from "@repo/ui/brand";

/** Something on the page threw (Next 16 passes `retry`). */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<main className="landing-container flex min-h-dvh flex-col items-center justify-center text-center">
			<StacklyMark className="h-[45px] w-[42px] text-coral" />
			<h1 className="h-page mt-6">Something slipped off the stack</h1>
			<p className="mt-3 max-w-[440px] text-base font-light text-muted">This page hit a problem. Try again, or come back in a moment.</p>
			<button type="button" onClick={retry} className="mt-8 inline-flex h-11 cursor-pointer items-center rounded-full bg-night px-5 text-white hover:bg-ink-soft">
				Try again
			</button>
		</main>
	);
}
