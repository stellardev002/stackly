import { StackLoader } from "@repo/ui/brand";

export default function Loading() {
	return (
		<div className="flex min-h-[60vh] items-center justify-center">
			<StackLoader label="Loading" />
		</div>
	);
}
