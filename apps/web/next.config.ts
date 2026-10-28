import type { NextConfig } from "next";

/**
 * On Vercel every deployment (production and previews) is one host shared by the services in the repo root
 * `vercel.json`: landing at `/`, this app under `/app`. Dev serves it at the root of localhost:3000. Once the app
 * gets its own domain, set APP_BASE_PATH="" in the Vercel project to serve it at the root again. Next prefixes
 * pages, <Link>s, static imports and `/_next` assets with it; anything that builds a URL by hand reads
 * NEXT_PUBLIC_BASE_PATH.
 */
const BASE_PATH = process.env.APP_BASE_PATH ?? (process.env.VERCEL ? "/app" : "");

/** The Stackly backend (https://api.usestackly.app/docs). Its routes sit under `/v1`. */
const API_ORIGIN = process.env.API_PROXY_TARGET || "https://api.usestackly.app";

/**
 * Where the browser sends API calls: this app's own `/api/v1` path, proxied to the backend below, so CORS never
 * applies (the backend doesn't allow browser origins). NEXT_PUBLIC_API_URL forces direct calls instead.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || `${BASE_PATH}/api/v1`;

const nextConfig: NextConfig = {
	basePath: BASE_PATH,
	// VERCEL_ENV inlined for client code too (lib/site.ts picks production URLs with it).
	env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH, NEXT_PUBLIC_API_URL: API_URL, NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "" },
	// A separate output dir for one-off verification builds (`NEXT_DIST_DIR=.next-verify next build`)
	// so they never overwrite the `.next` a running `pnpm dev` is serving from.
	distDir: process.env.NEXT_DIST_DIR || ".next",
	reactCompiler: true,
	// The demo controls sit bottom-left; keep Next's dev badge out of their way.
	devIndicators: { position: "bottom-right" },
	transpilePackages: ["@repo/ui", "@repo/stellar"],
	// Dev only: let a phone on the LAN load dev assets / HMR.
	allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
	// Same-origin API proxy: the browser calls `<basePath>/api/v1/…`, Next forwards it to the backend's `/v1/…`.
	async rewrites() {
		return [{ source: "/api/v1/:path*", destination: `${API_ORIGIN}/v1/:path*` }];
	},
};

export default nextConfig;
