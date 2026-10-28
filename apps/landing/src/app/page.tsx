import { Header } from "@/features/landing/components/Header";
import { Hero } from "@/features/landing/components/Hero";
import { SupportedAssets } from "@/features/landing/components/SupportedAssets";
import { HowItWorks } from "@/features/landing/components/HowItWorks";
import { PurchasePreview } from "@/features/landing/components/PurchasePreview";
import { NonCustodial } from "@/features/landing/components/NonCustodial";
import { FAQ, Faq } from "@/features/landing/components/Faq";
import { Footer } from "@/features/landing/components/Footer";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

/** Structured data: the product and its FAQ (eligible for rich results). */
const JSON_LD = [
	{
		"@context": "https://schema.org",
		"@type": "WebApplication",
		name: SITE_NAME,
		url: SITE_URL.href,
		description: SITE_DESCRIPTION,
		applicationCategory: "FinanceApplication",
		operatingSystem: "Web",
		offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
	},
	{
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: FAQ.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
	},
];

/** Screen 1: Landing page (Figma 2003:787 desktop, 2003:496 mobile). */
export default function Home() {
	return (
		<>
			<a href="#main" className="sr-only z-[100] rounded-full bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
				Skip to content
			</a>
			<Header />
			<main id="main" className="pb-4">
				<Hero />
				<SupportedAssets />
				<HowItWorks />
				<PurchasePreview />
				<NonCustodial />
				<Faq />
			</main>
			<Footer />
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
		</>
	);
}
