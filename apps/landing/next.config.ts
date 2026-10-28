import type { NextConfig } from "next";

/** The public site. No basePath: on previews the app sits under `/app` on the same host (repo root `vercel.json`). */
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
};

export default nextConfig;
