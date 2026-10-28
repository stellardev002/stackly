import type { NextConfig } from "next";

/**
 * Production serves this app at the root of its own host, and dev at the root of localhost:3000.
 * Previews have a single host shared by every service (repo root `vercel.json`), so there it lives
 * under `/app`. Next prefixes pages, <Link>s, static imports and `/_next` assets with it; anything
 * that builds a URL by hand reads NEXT_PUBLIC_BASE_PATH.
 */
const BASE_PATH = process.env.VERCEL_ENV === "preview" ? "/app" : "";

/**
 * The read API (positions, executions, history, portfolio) is served by this app's own route handlers
 * under `/api/v1` (src/app/api/v1). NEXT_PUBLIC_API_URL points the browser elsewhere if that moves.
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
	transpilePackages: ["@repo/ui", "@repo/mock-api", "@repo/stellar"],
	// Dev only: let a phone on the LAN load dev assets / HMR.
	allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
};

export default nextConfig;
