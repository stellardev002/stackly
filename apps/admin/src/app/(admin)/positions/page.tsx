import type { Metadata } from "next";
import { POSITION_STATUSES } from "@/lib/api/dto";
import { flag, offsetOf, oneOf, uuid } from "@/lib/params";
import { PositionList } from "@/features/activity/components/PositionList";

export const metadata: Metadata = { title: "Positions" };

export default async function PositionsPage({ searchParams }: PageProps<"/positions">) {
	const sp = await searchParams;
	return (
		<PositionList
			status={oneOf(sp, "status", POSITION_STATUSES)}
			userId={uuid(sp, "userId")}
			due={flag(sp, "due")}
			stuck={flag(sp, "stuck")}
			offset={offsetOf(sp)}
		/>
	);
}
