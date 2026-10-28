import type { Metadata, Viewport } from "next";
import "@fontsource/source-sans-3/300.css";
import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/600.css";
import { Toaster } from "@repo/ui/sonner";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_TAGLINE, SITE_URL, THEME_COLOR, TWITTER_HANDLE } from "@/lib/site";
import "./globals.css";

const TITLE = `${SITE_NAME} · ${SITE_TAGLINE}`;
const SHARE = "Automate recurring USDC → XLM purchases from a non-custodial Soroban vault on Stellar Testnet.";

/**
 * App metadata. Icons, the social card and the manifest come from file conventions in this folder
 * (icon.svg · apple-icon.tsx · opengraph-image.tsx · twitter-image.tsx · manifest.ts). Pages set `title` and
 * get "%s | Stackly". The app sits behind a wallet connection, so it's kept out of search; shared links still
 * get the full card.
 */
export const metadata: Metadata = {
	metadataBase: SITE_URL,
	title: { default: TITLE, template: `%s | ${SITE_NAME}` },
	description: SITE_DESCRIPTION,
	applicationName: SITE_NAME,
	keywords: SITE_KEYWORDS,
	authors: [{ name: SITE_NAME }],
	creator: SITE_NAME,
	publisher: SITE_NAME,
	category: "finance",
	// Amounts, dates and wallet addresses must not turn into tap-to-call or map links.
	formatDetection: { telephone: false, email: false, address: false, date: false },
	robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
	appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
	openGraph: { type: "website", locale: "en_US", siteName: SITE_NAME, title: TITLE, description: SHARE, url: "/" },
	twitter: { card: "summary_large_image", site: TWITTER_HANDLE, creator: TWITTER_HANDLE, title: TITLE, description: SHARE },
};

export const viewport: Viewport = {
	themeColor: THEME_COLOR,
	colorScheme: "light",
	width: "device-width",
	initialScale: 1,
	// Shrink the layout viewport when the keyboard opens instead of covering inputs.
	interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en">
			{/* Extensions like Grammarly add attributes to <body> before React loads; ignore those (this element only). */}
			<body suppressHydrationWarning>
				<a href="#main" className="sr-only z-[100] rounded-full bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
					Skip to content
				</a>
				<ReactQueryProvider>
					{children}
					<Toaster position="top-right" richColors={false} closeButton offset={{ top: 84 }} mobileOffset={{ bottom: 72 }} />
				</ReactQueryProvider>
			</body>
		</html>
	);
}
