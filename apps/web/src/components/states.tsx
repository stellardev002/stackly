"use client";

import Image from "next/image";
import { RotateCcw } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Notice } from "@repo/ui/surface";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { withBasePath } from "@/lib/site";

/** "Nothing to see yet": the Figma empty-state illustration with a line of guidance and an optional action. */
export function EmptyState({ title, children, action, compact, className }: { title: string; children?: React.ReactNode; action?: React.ReactNode; compact?: boolean; className?: string }) {
	return (
		<div className={cn("animate-pop flex flex-col items-center justify-center text-center", compact ? "py-6" : "py-10", className)}>
			<Image src={withBasePath("/images/empty-search.svg")} alt="" width={302} height={237} className={cn("h-auto", compact ? "w-[160px]" : "w-[220px] sm:w-[260px]")} />
			<p className="mt-4 text-xl tracking-[-0.02em]">{title}</p>
			{children && <p className="mt-1 max-w-[380px] text-sm font-light text-muted">{children}</p>}
			{action && <div className="mt-5">{action}</div>}
		</div>
	);
}

/** A load failed: say what happened in plain words, reassure about funds, offer a retry. */
export function ErrorState({ error, onRetry, title = "We couldn't load this", className }: { error: unknown; onRetry?: () => void; title?: string; className?: string }) {
	return (
		<Notice
			tone="error"
			title={title}
			className={cn("animate-pop", className)}
			action={
				onRetry && (
					<Button variant="outline" size="sm" onClick={onRetry}>
						<RotateCcw /> Try again
					</Button>
				)
			}
		>
			{errorMessage(error, "Something went wrong while loading. Your vault is unaffected.")}
		</Notice>
	);
}

/** Skeleton line / block helpers for the designed loading frames. */
export function SkeletonLines({ rows = 4, className }: { rows?: number; className?: string }) {
	return (
		<div className={cn("flex flex-col gap-4", className)} aria-hidden>
			{Array.from({ length: rows }, (_, i) => (
				<div key={i} className="flex items-center justify-between gap-6">
					<div className="shimmer h-4 w-28 rounded-full" />
					<div className="shimmer h-4 w-36 rounded-full" />
				</div>
			))}
		</div>
	);
}
