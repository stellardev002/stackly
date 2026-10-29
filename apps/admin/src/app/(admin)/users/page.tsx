import type { Metadata } from "next";
import { offsetOf, oneOf, str } from "@/lib/params";
import { UserList } from "@/features/users/components/UserList";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
	const sp = await searchParams;
	return <UserList search={str(sp, "search")} role={oneOf(sp, "role", ["user", "admin"] as const)} offset={offsetOf(sp)} />;
}
