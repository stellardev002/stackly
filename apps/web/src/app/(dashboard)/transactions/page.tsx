import type { Metadata } from "next";
import { TransactionHistory } from "@/features/transactions/TransactionHistory";

export const metadata: Metadata = {
	title: "Transaction history",
	description: "Every deposit, swap, failed execution and withdrawal in your Stackly vaults, with Stellar references.",
};

export default async function Page({ searchParams }: PageProps<"/transactions">) {
	const { vault } = await searchParams;
	return <TransactionHistory key={typeof vault === "string" ? vault : "all"} vault={typeof vault === "string" ? vault : undefined} />;
}
