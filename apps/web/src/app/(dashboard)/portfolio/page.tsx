import type { Metadata } from "next";
import { Portfolio } from "@/features/portfolio/Portfolio";

export const metadata: Metadata = {
	title: "Portfolio",
	description: "USDC deposited, spent and remaining, XLM acquired and the average execution price across your Stackly vaults.",
};

export default function Page() {
	return <Portfolio />;
}
