import Link from "next/link";
import { Button } from "@repo/ui/button";

export default function NotFound() {
	return (
		<main id="main" className="mx-auto flex min-h-[70vh] max-w-[520px] flex-col items-start justify-center gap-4 px-4">
			<h1 className="text-[40px] leading-none tracking-[-0.05em]">Not found</h1>
			<p className="text-base font-light text-muted">This admin page doesn&apos;t exist, or the id in the link is malformed.</p>
			<Button asChild>
				<Link href="/">Back to the overview</Link>
			</Button>
		</main>
	);
}
