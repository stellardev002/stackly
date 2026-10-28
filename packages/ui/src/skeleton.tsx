import { cn } from "./lib/utils";

/** A placeholder block with a soft sweep (Figma "Loading" frames). Hidden from assistive tech. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot="skeleton" aria-hidden className={cn("shimmer rounded-full", className)} {...props} />;
}

export { Skeleton };
