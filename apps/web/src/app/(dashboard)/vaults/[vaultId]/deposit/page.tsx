import type { Metadata } from "next";
import { DepositFunds } from "@/features/vaults/components/DepositFunds";

export const metadata: Metadata = {
	title: "Deposit funds",
	description: "Fund your Stackly vault with Testnet USDC. Every deposit is signed in your wallet.",
};

export default async function Page({ params, searchParams }: PageProps<"/vaults/[vaultId]/deposit">) {
	const [{ vaultId }, query] = await Promise.all([params, searchParams]);
	const amount = typeof query.amount === "string" && /^\d+(\.\d{1,7})?$/.test(query.amount) ? query.amount : undefined;
	return <DepositFunds vaultId={decodeURIComponent(vaultId)} flow={query.flow === "create"} initialAmount={amount} />;
}
