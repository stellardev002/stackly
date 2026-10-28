/** Brand copy for metadata. */
const SITE_NAME = "Stackly";
const SITE_TAGLINE = "Build Your Stack, One Purchase at a Time";
const SITE_DESCRIPTION =
	"Stackly automates recurring purchases on Stellar. Deposit USDC into a non-custodial Soroban vault, choose an amount and a schedule, and the contract makes each XLM purchase under the rules you approved. Live on Stellar Testnet.";

const SITE_KEYWORDS = ["Stackly", "DCA", "dollar-cost averaging", "recurring buy", "automated investing", "Stellar", "Soroban", "USDC", "XLM", "non-custodial", "Stellar Testnet"];

const THEME_COLOR = "#ffffff";

const TWITTER_HANDLE = "@stackly";

/**
 * Absolute URL of this site, for `metadataBase` / canonical / robots / sitemap: NEXT_PUBLIC_SITE_URL →
 * https://usestackly.app in production → the deployment URL on Vercel previews → localhost in dev.
 */
const SITE_URL = new URL(
	process.env.NEXT_PUBLIC_SITE_URL ??
		(process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? "https://usestackly.app" : undefined) ??
		(process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ??
		"http://localhost:3002",
);

/**
 * The app (`apps/web`): `/app` on the shared Vercel host, its own port in dev. Links into it are plain
 * <a>s: a <Link> would route inside this landing app.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "/app");

/** The dashboard opens the wallet modal when no wallet is connected. The app runs on demo data until the live API exists. */
const APP_LINKS = {
	start: `${APP_URL}/overview`,
	demo: `${APP_URL}/overview`,
};

export { SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION, SITE_KEYWORDS, THEME_COLOR, TWITTER_HANDLE, SITE_URL, APP_URL, APP_LINKS };
