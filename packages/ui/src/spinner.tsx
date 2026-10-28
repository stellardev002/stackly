import { cn } from "./lib/utils";

/** A quiet ring spinner for buttons and inline waits. The ring takes the current text colour. */
export function Spinner({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("animate-spin-slow size-5", className)}>
			<circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
			<path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
		</svg>
	);
}
