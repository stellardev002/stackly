import type { Metadata } from "next";
import { CreateVault } from "@/features/vaults/components/CreateVault";

export const metadata: Metadata = {
	title: "Create DCA vault",
	description: "Choose an amount, a schedule and a slippage limit for recurring USDC → XLM purchases on Stellar Testnet.",
};

export default function Page() {
	return <CreateVault />;
}
