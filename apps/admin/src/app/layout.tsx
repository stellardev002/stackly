import type { Metadata, Viewport } from "next";
import "@fontsource/source-sans-3/300.css";
import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/600.css";
import { Toaster } from "@repo/ui/sonner";
import { Providers } from "@/components/providers/Providers";
import "./globals.css";

/** The operations dashboard. Private: behind an admin wallet sign-in and kept out of search. */
export const metadata: Metadata = {
	title: { default: "Stackly Admin", template: "%s | Stackly Admin" },
	description: "Stackly operations: users, positions, purchases, the ledger, reconciliation and workers.",
	applicationName: "Stackly Admin",
	robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
	formatDetection: { telephone: false, email: false, address: false, date: false },
};

export const viewport: Viewport = {
	themeColor: "#ffffff",
	colorScheme: "light",
	width: "device-width",
	initialScale: 1,
	interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en">
			<body suppressHydrationWarning>
				<a
					href="#main"
					className="sr-only z-[100] rounded-full bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
				>
					Skip to content
				</a>
				<Providers>
					{children}
					<Toaster position="top-right" richColors={false} closeButton mobileOffset={{ bottom: 16 }} />
				</Providers>
			</body>
		</html>
	);
}
