/**
 * The live read API (Module 7): positions, executions, transaction history and portfolio, served from the
 * indexer's database (Supabase, see supabase/migrations). Replace this catch-all with one route handler per
 * endpoint in `apiRoutes` (src/lib/routes.ts); `@repo/mock-api` shows the expected shapes.
 * In mock mode the browser never calls this.
 */
const notImplemented = () =>
	Response.json({ status_code: 501, message: "The live API isn't implemented yet. Run with NEXT_PUBLIC_API_SOURCE=mock." }, { status: 501 });

export const GET = notImplemented;
