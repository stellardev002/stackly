import { StackLoader } from "@repo/ui/brand";

/** Route change inside the app: the navigation stays, the content area shows the brand loader. */
export default function Loading() {
	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
			<StackLoader label="Loading" />
		</div>
	);
}
