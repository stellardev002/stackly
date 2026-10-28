/**
 * What a failed call looks like to the UI. Backend errors share one envelope: `{ statusCode, code, message,
 * details?, requestId }`; wallet and Stellar errors are plain `Error`s with a readable message.
 */
export type ApiErrorLike = {
	name?: string;
	message?: string;
	response?: { status?: number; data?: { message?: string; code?: string; details?: unknown[]; requestId?: string } };
};

export function errorMessage(error: unknown, fallback = "Something went wrong. Try again.") {
	const e = error as ApiErrorLike | undefined;
	const body = e?.response?.data;
	if (body?.message) {
		const detail = Array.isArray(body.details) ? body.details.find((d): d is string => typeof d === "string") : undefined;
		return detail && detail !== body.message ? `${body.message}: ${detail}` : body.message;
	}
	if (e?.response?.status === 429) return "Too many requests. Wait a moment and try again.";
	if (e?.response?.status && e.response.status >= 500) return "The Stackly service is having trouble. Your funds are unaffected; try again shortly.";
	if (e?.message === "Network Error") return "We couldn't reach Stackly. Check your connection and try again.";
	return e?.message || fallback;
}

/** The backend's request id, to quote when reporting a problem. */
export const requestId = (error: unknown) => (error as ApiErrorLike | undefined)?.response?.data?.requestId;

export const httpStatus = (error: unknown) => (error as ApiErrorLike | undefined)?.response?.status;

/** The user declined in their wallet: nothing was submitted, so this is not a failure to alarm about. */
export function isWalletRejection(error: unknown) {
	const e = error as ApiErrorLike | undefined;
	return /declin|reject|denied|cancel/i.test(e?.message ?? "");
}
