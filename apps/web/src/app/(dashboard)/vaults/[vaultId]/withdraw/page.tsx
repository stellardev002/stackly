import type { Metadata } from "next";
import { WithdrawFunds } from "@/features/vaults/components/WithdrawFunds";

export const metadata: Metadata = {
	title: "Withdraw funds",
	description: "Withdraw available USDC or purchased XLM from your vault to your connected wallet.",
};

export default async function Page({ params }: PageProps<"/vaults/[vaultId]/withdraw">) {
	const { vaultId } = await params;
	return <WithdrawFunds vaultId={decodeURIComponent(vaultId)} />;
}
