/** What a failed API call looks like to the UI: an axios error with the API's `{ message }` body. */
export type ApiErrorLike = {
	name?: string;
	message?: string;
	response?: { status?: number; data?: { message?: string } };
};

export function errorMessage(error: unknown, fallback = "Something went wrong. Try again.") {
	const e = error as ApiErrorLike | undefined;
	return e?.response?.data?.message ?? e?.message ?? fallback;
}

/** The user declined in their wallet: nothing was submitted, so this is not a failure to alarm about. */
export function isWalletRejection(error: unknown) {
	const e = error as ApiErrorLike | undefined;
	return e?.name === "WalletRejectedError" || /declin|reject|denied|cancel/i.test(e?.message ?? "");
}
