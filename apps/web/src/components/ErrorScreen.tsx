"use client";

import Image from "next/image";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@repo/ui/button";
import { overviewRoutes } from "@/lib/routes";
import { withBasePath } from "@/lib/site";

/** The full error treatment (route and app error boundaries): what happened, that funds are safe, what to do. */
export function ErrorScreen({ retry, digest, inline = false }: { retry: () => void; digest?: string; inline?: boolean }) {
	return (
		<div className={inline ? "flex min-h-[60vh] items-center justify-center py-10" : "app-container flex min-h-dvh items-center justify-center py-10"}>
			<div className="animate-pop flex max-w-[520px] flex-col items-center text-center">
				<Image src={withBasePath("/images/empty-search.svg")} alt="" width={302} height={237} className="h-auto w-[220px]" priority />
				<h1 className="h-page mt-6">Something slipped off the stack</h1>
				<p className="mt-3 text-base font-light text-muted">
					This screen hit an unexpected problem. Your vault and its funds are held by the contract and are not affected.
				</p>
				{digest && <p className="caption mt-2 font-mono">Reference {digest}</p>}
				<div className="mt-8 flex flex-wrap justify-center gap-3">
					<Button onClick={retry}>
						<RotateCcw /> Try again
					</Button>
					<Button asChild variant="outline">
						<Link href={overviewRoutes.OVERVIEW}>Back to dashboard</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
