import type { Metadata } from "next";
import { EXECUTION_STATUSES, FAILURE_REASONS } from "@/lib/api/dto";
import { iso, offsetOf, oneOf, uuid } from "@/lib/params";
import { ExecutionList } from "@/features/activity/components/ExecutionList";

export const metadata: Metadata = { title: "Purchases" };

export default async function ExecutionsPage({ searchParams }: PageProps<"/executions">) {
	const sp = await searchParams;
	return (
		<ExecutionList
			status={oneOf(sp, "status", EXECUTION_STATUSES)}
			reason={oneOf(sp, "reason", FAILURE_REASONS)}
			positionId={uuid(sp, "positionId")}
			from={iso(sp, "from")}
			to={iso(sp, "to")}
			offset={offsetOf(sp)}
		/>
	);
}
