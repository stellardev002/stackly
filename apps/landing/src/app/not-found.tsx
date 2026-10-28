import type { Metadata } from "next";
import Link from "next/link";
import { StacklyLogo, StacklyMark } from "@repo/ui/brand";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
	return (
		<div className="landing-container flex min-h-dvh flex-col py-6">
			<Link href="/" aria-label="Stackly home" className="w-fit">
				<StacklyLogo />
			</Link>
			<main className="flex flex-1 flex-col items-center justify-center text-center">
				<div className="flex items-end gap-6" aria-hidden>
					<span className="display">4</span>
					<StacklyMark className="animate-float mb-2 h-[88px] w-[82px] text-coral sm:h-[120px] sm:w-[112px]" />
					<span className="display">4</span>
				</div>
				<h1 className="h-page mt-8">This block isn&apos;t in the stack</h1>
				<p className="mt-3 max-w-[440px] text-base font-light text-muted">The page you&apos;re looking for doesn&apos;t exist, or the link is mistyped.</p>
				<Link href="/" className="mt-8 inline-flex h-11 items-center rounded-full bg-night px-5 text-white transition-colors hover:bg-ink-soft">
					Back to Stackly
				</Link>
			</main>
		</div>
	);
}
