import { cn } from "./lib/utils";

/** The three stacked layers of the Stackly mark (Figma "Stackly mark"), top to bottom. */
const LAYERS = [
	"M0 5.35714L18 0L28 5.35714L10 10.7143L0 5.35714Z",
	"M0 15L18 9.64286L28 15L10 20.3571L0 15Z",
	"M0 24.6429L18 19.2857L28 24.6429L10 30L0 24.6429Z",
];

export function StacklyMark({ className, title }: { className?: string; title?: string }) {
	return (
		<svg viewBox="0 0 28 30" fill="none" role={title ? "img" : undefined} aria-hidden={!title} className={cn("h-[30px] w-7", className)}>
			{title && <title>{title}</title>}
			{LAYERS.map((d) => (
				<path key={d} d={d} fill="currentColor" />
			))}
		</svg>
	);
}

/** Mark + wordmark, as in the navigation. */
export function StacklyLogo({ className }: { className?: string }) {
	return (
		<span className={cn("inline-flex items-center gap-2 text-ink", className)}>
			<StacklyMark className="text-coral" />
			<span className="text-[28px] leading-none tracking-[-0.05em]">stackly</span>
		</span>
	);
}

/**
 * The brand loader: the mark's layers drop onto the stack one by one, like purchases accumulating.
 * Reduced-motion visitors see the static mark.
 */
export function StackLoader({ className, label = "Loading" }: { className?: string; label?: string }) {
	return (
		<span role="status" aria-label={label} className={cn("inline-flex flex-col items-center", className)}>
			<svg viewBox="-2 -6 32 40" className="h-12 w-11 overflow-visible text-coral" aria-hidden>
				<g className="animate-stack">
					{LAYERS.map((d) => (
						<path key={d} d={d} fill="currentColor" className="stack-layer" />
					))}
				</g>
			</svg>
		</span>
	);
}
