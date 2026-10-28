/** Brand copy for the root layout's metadata. */
const SITE_NAME = "Stackly";
const SITE_TAGLINE = "Build Your Stack, One Purchase at a Time";
const SITE_DESCRIPTION =
	"Stackly is a non-custodial dollar-cost averaging vault on Stellar. Deposit USDC, choose an amount and a schedule, and a Soroban smart contract makes each recurring XLM purchase under the rules you approved.";

const SITE_KEYWORDS = ["Stackly", "DCA", "dollar-cost averaging", "recurring buy", "Stellar", "Soroban", "USDC", "XLM", "non-custodial vault", "Stellar Testnet"];

const TWITTER_HANDLE = "@stackly";

/** Mirrors `--color-ink` in packages/ui globals.css (browser chrome on mobile). */
const THEME_COLOR = "#ffffff";

/** Read through next.config `env`, so client components agree with the server render. */
const IS_PRODUCTION = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";

/**
 * Absolute site URL for `metadataBase`: NEXT_PUBLIC_SITE_URL → the deployment URL on Vercel → localhost
 * in dev. Set NEXT_PUBLIC_SITE_URL in production once the domain is chosen.
 */
const ORIGIN =
	process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ?? "http://localhost:3000";

/** This app's base path: `/app` on previews, empty in production and dev (next.config.ts). */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix app-local assets when this app is mounted below the site root (previews). */
function withBasePath(src: string) {
	return BASE_PATH && src.startsWith("/") && !src.startsWith(`${BASE_PATH}/`) ? `${BASE_PATH}${src}` : src;
}

/** Includes the base path, so previews resolve metadata URLs under `/app`. */
const SITE_URL = new URL(`${BASE_PATH}/`, ORIGIN);

/** The landing site (`apps/landing`). Link to it with a plain <a>. */
const LANDING_URL =
	process.env.NEXT_PUBLIC_LANDING_URL ?? (IS_PRODUCTION || process.env.NODE_ENV !== "development" ? "/" : "http://localhost:3002");

export { SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION, SITE_KEYWORDS, TWITTER_HANDLE, THEME_COLOR, SITE_URL, BASE_PATH, withBasePath, LANDING_URL };
