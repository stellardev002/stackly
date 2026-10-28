import { toast, type ExternalToast } from "@repo/ui/sonner";

/** Toasts (sonner; the <Toaster /> sits in the root layout). Kept as a hook so call sites stay the same. */
export const useToast = () => ({
	success: (message: string, options?: ExternalToast) => toast.success(message, options),
	error: (message: string, options?: ExternalToast) => toast.error(message, options),
	warning: (message: string, options?: ExternalToast) => toast.warning(message, options),
	info: (message: string, options?: ExternalToast) => toast.info(message, options),
});
