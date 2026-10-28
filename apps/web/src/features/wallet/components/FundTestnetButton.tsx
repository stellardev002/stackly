"use client";

import { useState } from "react";
import { Droplets } from "lucide-react";
import { Button } from "@repo/ui/button";
import { errorMessage } from "@/lib/api/errors";
import { useToast } from "@/lib/use-toast";

/** Funds a Testnet account with Friendbot (10,000 test XLM, no real value). Only ever runs on click. */
export function FundTestnetButton({ address, onFunded, size = "sm" }: { address: string; onFunded?: () => void; size?: "sm" | "md" }) {
	const toast = useToast();
	const [busy, setBusy] = useState(false);

	const fund = async () => {
		setBusy(true);
		try {
			const { fundWithFriendbot } = await import("@/features/wallet/testnet");
			await fundWithFriendbot(address);
			toast.success("Testnet account funded", { description: "10,000 test XLM from Friendbot. You can sign transactions now." });
			onFunded?.();
		} catch (error) {
			toast.error("Couldn't fund the account", { description: errorMessage(error) });
		} finally {
			setBusy(false);
		}
	};

	return (
		<Button size={size} variant="outline" onClick={fund} isLoading={busy} loadingText="Asking Friendbot…">
			<Droplets /> Fund with Friendbot
		</Button>
	);
}
