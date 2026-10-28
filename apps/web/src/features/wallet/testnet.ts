"use client";

import { FRIENDBOT_URL, HORIZON_URL } from "@repo/stellar/network";

/** Whether the account exists on Testnet (it needs a few XLM for fees). */
export async function isFundedOnTestnet(address: string) {
	const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
	if (res.status === 404) return false;
	if (!res.ok) throw new Error("Couldn't reach Stellar Testnet. Try again in a moment.");
	return true;
}

/** Asks Testnet's Friendbot for 10,000 test XLM. User-initiated only. */
export async function fundWithFriendbot(address: string) {
	const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(address)}`);
	if (!res.ok && !(await isFundedOnTestnet(address))) throw new Error("Friendbot couldn't fund this account. Try again shortly.");
}
