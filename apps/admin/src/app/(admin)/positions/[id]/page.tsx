import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/params";
import { PositionDetail } from "@/features/activity/components/PositionDetail";

export const metadata: Metadata = { title: "Position" };

export default async function PositionPage({ params }: PageProps<"/positions/[id]">) {
	const { id } = await params;
	if (!isUuid(id)) notFound();
	return <PositionDetail id={id} />;
}
