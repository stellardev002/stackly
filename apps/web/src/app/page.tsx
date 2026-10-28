import { redirect } from "next/navigation";
import { overviewRoutes } from "@/lib/routes";

/** The app root opens the dashboard; the dashboard layout sends visitors without a wallet to /connect. */
export default function Page() {
	redirect(overviewRoutes.OVERVIEW);
}
