import type { Metadata } from "next";
import { Reconciliation } from "@/features/reconciliation/Reconciliation";

export const metadata: Metadata = { title: "Reconciliation" };

export default function ReconciliationPage() {
	return <Reconciliation />;
}
