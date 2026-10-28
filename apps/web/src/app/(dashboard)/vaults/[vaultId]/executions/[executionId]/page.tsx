import type { Metadata } from "next";
import { ExecutionDetails } from "@/features/vaults/components/ExecutionDetails";

export async function generateMetadata({ params }: PageProps<"/vaults/[vaultId]/executions/[executionId]">): Promise<Metadata> {
	const { executionId } = await params;
	return { title: `Execution ${executionId}`, description: "Amounts, price, slippage, fees, timeline and Stellar reference for one automated purchase." };
}

export default async function Page({ params }: PageProps<"/vaults/[vaultId]/executions/[executionId]">) {
	const { vaultId, executionId } = await params;
	return <ExecutionDetails vaultId={decodeURIComponent(vaultId)} executionId={decodeURIComponent(executionId)} />;
}
