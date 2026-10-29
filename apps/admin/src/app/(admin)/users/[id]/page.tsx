import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/params";
import { UserDetail } from "@/features/users/components/UserDetail";

export const metadata: Metadata = { title: "User" };

export default async function UserPage({ params }: PageProps<"/users/[id]">) {
	const { id } = await params;
	if (!isUuid(id)) notFound();
	return <UserDetail id={id} />;
}
