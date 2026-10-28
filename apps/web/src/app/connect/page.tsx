import { redirect } from "next/navigation";
import { overviewRoutes } from "@/lib/routes";

/** Old entry point: wallet connection is now a modal over the dashboard (Screen 2). */
export default function Page() {
	redirect(overviewRoutes.OVERVIEW);
}
