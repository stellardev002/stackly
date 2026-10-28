"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "./lib/utils";

/** Daily / Weekly / Monthly: a radio group drawn as three pills. */
export function Segmented<T extends string>({
	value,
	onChange,
	options,
	label,
	className,
}: {
	value: T;
	onChange: (value: T) => void;
	options: { value: T; label: string }[];
	label: string;
	className?: string;
}) {
	const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

	const onKeyDown = (event: React.KeyboardEvent, index: number) => {
		const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
		if (!step) return;
		event.preventDefault();
		const next = (index + step + options.length) % options.length;
		onChange(options[next]!.value);
		refs.current[next]?.focus();
	};

	return (
		<div role="radiogroup" aria-label={label} className={cn("grid grid-cols-3 gap-2", className)}>
			{options.map((option, index) => {
				const selected = option.value === value;
				return (
					<button
						key={option.value}
						ref={(node) => {
							refs.current[index] = node;
						}}
						type="button"
						role="radio"
						aria-checked={selected}
						tabIndex={selected ? 0 : -1}
						onClick={() => onChange(option.value)}
						onKeyDown={(event) => onKeyDown(event, index)}
						className={cn(
							"h-[52px] cursor-pointer rounded-full px-4 text-left text-base transition-colors duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-coral/40 sm:px-6",
							selected ? "bg-night text-white" : "bg-[#e9e7e7] text-ink hover:bg-rose",
						)}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}

/** Configure → Review → Fund vault. Completed steps show a tick; the current step is coral. */
export function Stepper({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
	return (
		<ol className={cn("scroll-row flex items-center gap-3 overflow-x-auto sm:gap-6", className)} aria-label="Progress">
			{steps.map((step, index) => {
				const state = index < current ? "done" : index === current ? "current" : "todo";
				return (
					<li key={step} className="flex shrink-0 items-center gap-2 sm:gap-3" aria-current={state === "current" ? "step" : undefined}>
						<span
							className={cn(
								"flex size-8 items-center justify-center rounded-full text-sm transition-colors duration-300 sm:size-9 sm:text-base",
								state === "current" ? "bg-coral text-white" : "bg-[#e9e7e7] text-ink",
							)}
						>
							{state === "done" ? <Check className="size-4" aria-hidden /> : index + 1}
						</span>
						<span className={cn("text-base tracking-[-0.02em] sm:text-xl", state === "todo" ? "text-muted" : "text-ink")}>
							{step}
							{state === "done" && <span className="sr-only"> (completed)</span>}
						</span>
					</li>
				);
			})}
		</ol>
	);
}
