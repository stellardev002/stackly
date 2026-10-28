import type { NextConfig } from "next";

/** Where the app (`apps/web`) lives; mirrors APP_URL in src/lib/site.ts. */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "/app");

/**
 * The public site, at the root of the shared Vercel host. The app is mounted under `/app` on the same host by the
 * repo root `vercel.json` (apps/web sets that basePath on every Vercel deployment).
 */
const nextConfig: NextConfig = {
	// VERCEL_ENV inlined for client code too (lib/site.ts picks production URLs with it).
	env: { NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "" },
	// A separate output dir for one-off verification builds (`NEXT_DIST_DIR=.next-verify next build`)
	// so they never overwrite the `.next` a running `pnpm dev` is serving from.
	distDir: process.env.NEXT_DIST_DIR || ".next",
	reactCompiler: true,
	transpilePackages: ["@repo/ui", "@repo/stellar"],
	allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
	// Behind Vercel Services the optimizer route (`/_next/image`) does not reach this app,
	// so images are served as they are.
	images: { unoptimized: true },
	// App paths typed or shared without the `/app` prefix land on this site: send them to the app.
	async redirects() {
		const toApp = (source: string) => ({ source, destination: `${APP_URL}${source}`, permanent: false });
		return ["/overview", "/connect", "/portfolio", "/settings", "/transactions", "/vaults/:path*"].map(toApp);
	},
};

export default nextConfig;
