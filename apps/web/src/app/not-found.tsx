import type { Metadata } from "next";
import Link from "next/link";
import { StacklyLogo, StacklyMark } from "@repo/ui/brand";
import { Button } from "@repo/ui/button";
import { overviewRoutes } from "@/lib/routes";

export const metadata: Metadata = { title: "Page not found" };

/** 404: a stack with one layer missing. */
export default function NotFound() {
	return (
		<div className="app-container flex min-h-dvh flex-col py-6">
			<Link href={overviewRoutes.OVERVIEW} aria-label="Stackly dashboard" className="w-fit">
				<StacklyLogo />
			</Link>
			<main id="main" className="flex flex-1 flex-col items-center justify-center text-center">
				<div className="relative flex items-end gap-6" aria-hidden>
					<span className="display text-ink">4</span>
					<span className="relative mb-2 flex flex-col items-center">
						<StacklyMark className="animate-float h-[88px] w-[82px] text-coral sm:h-[120px] sm:w-[112px]" />
					</span>
					<span className="display text-ink">4</span>
				</div>
				<h1 className="h-page mt-8">This block isn&apos;t in the stack</h1>
				<p className="mt-3 max-w-[460px] text-base font-light text-muted">The page you&apos;re looking for doesn&apos;t exist. It may have moved, or the link is mistyped.</p>
				<div className="mt-8 flex flex-wrap justify-center gap-3">
					<Button asChild>
						<Link href={overviewRoutes.OVERVIEW}>Back to dashboard</Link>
					</Button>
				</div>
			</main>
		</div>
	);
}
