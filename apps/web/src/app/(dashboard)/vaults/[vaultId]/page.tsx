import type { Metadata } from "next";
import { ActivePosition } from "@/features/vaults/components/ActivePosition";

export async function generateMetadata({ params }: PageProps<"/vaults/[vaultId]">): Promise<Metadata> {
	const { vaultId } = await params;
	return { title: `${vaultId} · DCA position`, description: "Balances, schedule, purchase history and actions for one Stackly vault." };
}

export default async function Page({ params }: PageProps<"/vaults/[vaultId]">) {
	const { vaultId } = await params;
	return <ActivePosition vaultId={decodeURIComponent(vaultId)} />;
}
