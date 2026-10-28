import { StackLoader } from "@repo/ui/brand";

/** First load of any route: the Stackly mark building itself, layer by layer. */
export default function Loading() {
	return (
		<div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-page">
			<StackLoader label="Loading Stackly" />
			<p className="caption tracking-wide">Stacking things up…</p>
		</div>
	);
}
