import type { Metadata } from "next";
import { iso, offsetOf, str, uuid } from "@/lib/params";
import { AuditLog } from "@/features/audit/AuditLog";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
	const sp = await searchParams;
	return (
		<AuditLog
			action={str(sp, "action")}
			actorId={uuid(sp, "actorId")}
			resourceType={str(sp, "resourceType")}
			resourceId={str(sp, "resourceId")}
			requestId={str(sp, "requestId")}
			from={iso(sp, "from")}
			to={iso(sp, "to")}
			offset={offsetOf(sp)}
		/>
	);
}
