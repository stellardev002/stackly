import Link from "next/link";
import { Button } from "@repo/ui/button";
import { Panel } from "@repo/ui/surface";
import { overviewRoutes } from "@/lib/routes";
import { EmptyState } from "@/components/states";

/** A vault id that doesn't exist (or isn't this wallet's). */
export function VaultNotFound() {
	return (
		<Panel>
			<EmptyState
				title="We couldn't find that vault"
				action={
					<Button asChild>
						<Link href={overviewRoutes.OVERVIEW}>Back to dashboard</Link>
					</Button>
				}
			>
				Check the link, or open your vaults from the dashboard.
			</EmptyState>
		</Panel>
	);
}
