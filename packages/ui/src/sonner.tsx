"use client";

import { CircleCheckIcon, InfoIcon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { Spinner } from "./spinner";

/** Toasts in the Stackly look: white card, ink text, coral accents; bottom-centre on phones. */
const Toaster = ({ ...props }: ToasterProps) => {
	return (
		<Sonner
			className="toaster group"
			icons={{
				success: <CircleCheckIcon className="size-[18px] text-success" />,
				info: <InfoIcon className="size-[18px] text-ink" />,
				warning: <TriangleAlertIcon className="size-[18px] text-warning" />,
				error: <OctagonXIcon className="size-[18px] text-danger" />,
				loading: <Spinner className="size-[18px] text-coral" />,
			}}
			toastOptions={{
				classNames: {
					toast: "!rounded-card !border-line !bg-white !font-sans !text-ink !shadow-[0_16px_40px_-12px_rgba(39,12,15,0.25)] !gap-3 !py-4",
					title: "!text-[15px] !font-normal !tracking-[-0.01em]",
					description: "!text-sm !font-light !text-muted",
					actionButton: "!rounded-full !bg-ink !px-3 !text-xs !text-white",
					cancelButton: "!rounded-full !bg-blush !text-ink",
				},
			}}
			style={
				{
					"--normal-bg": "#ffffff",
					"--normal-text": "#270c0f",
					"--normal-border": "#ebe5e6",
					"--border-radius": "14px",
				} as React.CSSProperties
			}
			{...props}
		/>
	);
};

export { Toaster };
export { toast } from "sonner";
export type { ExternalToast } from "sonner";
