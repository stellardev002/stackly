import type { Metadata } from "next";
import { ReviewStrategy } from "@/features/vaults/components/ReviewStrategy";

export const metadata: Metadata = {
	title: "Review strategy",
	description: "Check your recurring purchase settings, funding preview and fees before creating the vault.",
};

export default function Page() {
	return <ReviewStrategy />;
}
