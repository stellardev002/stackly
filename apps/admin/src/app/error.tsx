"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Notice } from "@repo/ui/surface";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
	return (
		<div className="mx-auto flex min-h-[60vh] max-w-[520px] items-center px-4">
			<Notice
				tone="error"
				title="This page hit an error"
				action={
					<Button size="sm" variant="outline" onClick={retry}>
						<RotateCw /> Try again
					</Button>
				}
			>
				{error.message || "Something went wrong."}
				{error.digest && <span className="mt-1 block font-mono text-xs">Digest {error.digest}</span>}
			</Notice>
		</div>
	);
}
