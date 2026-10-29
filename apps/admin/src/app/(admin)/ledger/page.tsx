import type { Metadata } from "next";
import { LEDGER_KINDS } from "@/lib/api/dto";
import { iso, offsetOf, oneOf, uuid } from "@/lib/params";
import { LedgerList } from "@/features/activity/components/LedgerList";

export const metadata: Metadata = { title: "Ledger" };

export default async function LedgerPage({ searchParams }: PageProps<"/ledger">) {
	const sp = await searchParams;
	return (
		<LedgerList
			kind={oneOf(sp, "kind", LEDGER_KINDS)}
			assetId={uuid(sp, "assetId")}
			positionId={uuid(sp, "positionId")}
			from={iso(sp, "from")}
			to={iso(sp, "to")}
			offset={offsetOf(sp)}
		/>
	);
}
