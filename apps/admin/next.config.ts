import type { NextConfig } from "next";

/**
 * On Vercel the admin is one of the services in the repo root `vercel.json`, mounted under `/admin` on the shared
 * host (landing at `/`, the app at `/app`). Dev serves it at the root of localhost:3001. Set ADMIN_BASE_PATH="" once
 * it has its own domain.
 */
const BASE_PATH = process.env.ADMIN_BASE_PATH ?? (process.env.VERCEL ? "/admin" : "");

/** The Stackly backend (https://api.usestackly.app/docs). Its routes sit under `/v1`; the health check at `/health`. */
const API_ORIGIN = process.env.API_PROXY_TARGET || "https://api.usestackly.app";

/** Same-origin proxy (the backend sends no CORS headers for browsers). NEXT_PUBLIC_API_URL forces direct calls. */
const API_URL = process.env.NEXT_PUBLIC_API_URL || `${BASE_PATH}/api/v1`;

const nextConfig: NextConfig = {
	basePath: BASE_PATH,
	env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH, NEXT_PUBLIC_API_URL: API_URL, NEXT_PUBLIC_HEALTH_URL: `${BASE_PATH}/api/health` },
	// A separate output dir for one-off verification builds, so they never overwrite a running `pnpm dev`.
	distDir: process.env.NEXT_DIST_DIR || ".next",
	reactCompiler: true,
	devIndicators: { position: "bottom-right" },
	transpilePackages: ["@repo/ui"],
	allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
	async rewrites() {
		return [
			{ source: "/api/v1/:path*", destination: `${API_ORIGIN}/v1/:path*` },
			{ source: "/api/health", destination: `${API_ORIGIN}/health` },
		];
	},
};

export default nextConfig;
