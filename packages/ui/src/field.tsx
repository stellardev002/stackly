import * as React from "react";
import { cn } from "./lib/utils";

/** Label + control + hint/error, the form row used on every screen. The error is announced politely. */
export function Field({
	label,
	htmlFor,
	hint,
	error,
	className,
	children,
}: {
	label: React.ReactNode;
	htmlFor?: string;
	hint?: React.ReactNode;
	error?: React.ReactNode;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div className={cn("flex flex-col gap-2", className)}>
			<label htmlFor={htmlFor} className="text-sm font-light text-muted">
				{label}
			</label>
			{children}
			{error ? (
				<p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="animate-rise text-sm text-danger">
					{error}
				</p>
			) : (
				hint && <p className="text-sm font-light text-muted">{hint}</p>
			)}
		</div>
	);
}

/** The rounded pill input (Figma "Purchase amount"). Put an icon or unit in `trailing`. */
export function PillInput({
	className,
	trailing,
	invalid,
	...props
}: React.ComponentProps<"input"> & { trailing?: React.ReactNode; invalid?: boolean }) {
	return (
		<div
			className={cn(
				"flex h-[52px] items-center gap-3 rounded-full border bg-white px-5 transition-[border-color,box-shadow] focus-within:border-coral focus-within:ring-[3px] focus-within:ring-coral/20",
				invalid ? "border-danger" : "border-line",
				props.disabled && "bg-page",
				className,
			)}
		>
			<input
				aria-invalid={invalid || undefined}
				aria-describedby={invalid && props.id ? `${props.id}-error` : undefined}
				className="h-full w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-subtle disabled:text-muted"
				{...props}
			/>
			{trailing && <span className="flex shrink-0 items-center text-muted">{trailing}</span>}
		</div>
	);
}
