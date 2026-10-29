/** The admin's base path: `/admin` on every Vercel deployment, empty in dev (next.config.ts). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix local assets referenced by hand (plain <img>, CSS urls); <Link> and next/image add it themselves. */
export const withBasePath = (src: string) =>
	BASE_PATH && src.startsWith("/") && !src.startsWith(`${BASE_PATH}/`) ? `${BASE_PATH}${src}` : src;
