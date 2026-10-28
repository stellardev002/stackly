import type { Metadata } from "next";
import { Dashboard } from "@/features/dashboard/Dashboard";

export const metadata: Metadata = {
	title: "Dashboard",
	description: "Your Stackly vaults at a glance: deposits, purchases, available USDC, acquired XLM and the next scheduled buy.",
};

export default function Page() {
	return <Dashboard />;
}
