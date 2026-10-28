import type { Metadata } from "next";
import { Settings } from "@/features/settings/Settings";

export const metadata: Metadata = {
	title: "Settings",
	description: "Connected wallet, Stellar network, notifications, default slippage and transaction preferences.",
};

export default function Page() {
	return <Settings />;
}
