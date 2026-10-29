import type { Metadata } from "next";
import { System } from "@/features/system/System";

export const metadata: Metadata = { title: "System" };

export default function SystemPage() {
	return <System />;
}
