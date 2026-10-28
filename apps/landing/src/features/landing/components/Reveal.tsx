"use client";

import { useEffect, useRef } from "react";
import { cn } from "@repo/ui/lib/utils";

/**
 * Fades and lifts its content in once it scrolls into view (CSS `.reveal` in packages/ui). Content is visible
 * without JavaScript and with reduced motion; the observer only adds the entrance.
 */
export function Reveal({ children, className, delay = 0, as: Tag = "div" }: { children: React.ReactNode; className?: string; delay?: number; as?: "div" | "section" | "li" }) {
	const ref = useRef<HTMLElement>(null);

	useEffect(() => {
		const node = ref.current;
		if (!node) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					node.dataset.visible = "true";
					observer.disconnect();
				}
			},
			{ rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	return (
		<Tag ref={ref as never} className={cn("reveal", className)} style={{ "--i": delay } as React.CSSProperties}>
			{children}
		</Tag>
	);
}
