"use client";

import { useEffect, useState } from "react";

/**
 * Available vs spent of the deposited USDC (Figma "Deposited USDC allocation"). One asset only, so no
 * valuation is implied. The arc grows in on mount; reduced motion shows it at rest.
 */
export function AllocationDonut({ available, spent, unit = "USDC", emptyLabel = "No deposits yet" }: { available: number; spent: number; unit?: string; emptyLabel?: string }) {
	const total = available + spent;
	const share = total > 0 ? available / total : 0;
	const [shown, setShown] = useState(0);

	useEffect(() => {
		const frame = requestAnimationFrame(() => setShown(share));
		return () => cancelAnimationFrame(frame);
	}, [share]);

	const r = 84;
	const c = 2 * Math.PI * r;

	return (
		<figure className="relative mx-auto aspect-square w-full max-w-[220px]" aria-label={total > 0 ? `${Math.round(share * 100)}% of deposited ${unit} is available, ${Math.round((1 - share) * 100)}% spent` : emptyLabel}>
			<svg viewBox="0 0 200 200" className="size-full -rotate-90" aria-hidden>
				<circle cx="100" cy="100" r={r} fill="none" stroke={total > 0 ? "#ff6173" : "#ebe5e6"} strokeWidth="18" />
				{total > 0 && (
					<circle
						cx="100"
						cy="100"
						r={r}
						fill="none"
						stroke="#5a2129"
						strokeWidth="18"
						strokeDasharray={c}
						strokeDashoffset={c * (1 - shown)}
						className="transition-[stroke-dashoffset] duration-1000 ease-(--ease-settle) motion-reduce:transition-none"
					/>
				)}
			</svg>
			<figcaption className="absolute inset-0 flex flex-col items-center justify-center">
				{total > 0 ? (
					<>
						<span className="text-[44px] leading-none tracking-[-0.06em] tabular-nums sm:text-[56px]">{Math.round(share * 100)}%</span>
						<span className="caption mt-1">available {unit}</span>
					</>
				) : (
					<>
						<span className="text-3xl tracking-[-0.05em]">0 {unit}</span>
						<span className="caption mt-1">{emptyLabel}</span>
					</>
				)}
			</figcaption>
		</figure>
	);
}
