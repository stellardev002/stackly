/**
 * The social preview card (1200×630) every app renders through `next/og` in its `opengraph-image.tsx`.
 * Inline styles only: the image renderer supports a subset of CSS and needs `display: flex` on any element
 * with more than one child. Brand: blush #FFEFF1, ink #270C0F, coral #FF6173, Source Sans 3.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;

/** The mark's three layers, as in `brand.tsx`. */
const MARK = "M0 5.35714L18 0L28 5.35714L10 10.7143L0 5.35714ZM0 15L18 9.64286L28 15L10 20.3571L0 15ZM0 24.6429L18 19.2857L28 24.6429L10 30L0 24.6429Z";

export interface OgCardProps {
	eyebrow: string;
	title: string;
	subtitle: string;
	/** A scheduled-purchase card on the right, the product's core idea. */
	showSchedule?: boolean;
}

export function OgCard({ eyebrow, title, subtitle, showSchedule = true }: OgCardProps) {
	return (
		<div style={{ width: "100%", height: "100%", display: "flex", position: "relative", backgroundColor: "#ffeff1", fontFamily: "Source Sans 3", color: "#270c0f" }}>
			<div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: showSchedule ? 740 : 1056 }}>
				<div style={{ display: "flex", alignItems: "center", gap: 14 }}>
					<svg width="42" height="45" viewBox="0 0 28 30">
						<path d={MARK} fill="#ff6173" />
					</svg>
					<span style={{ fontSize: 44, letterSpacing: -2 }}>stackly</span>
				</div>

				<div style={{ display: "flex", flexDirection: "column" }}>
					<div style={{ display: "flex", alignSelf: "flex-start", fontSize: 20, padding: "8px 18px", borderRadius: 999, backgroundColor: "#ffffff", border: "1px solid #ffced4" }}>{eyebrow}</div>
					<div style={{ display: "flex", fontSize: 70, lineHeight: 0.98, marginTop: 26, letterSpacing: -4 }}>{title}</div>
					<div style={{ display: "flex", fontSize: 26, lineHeight: 1.35, marginTop: 22, color: "#7c6e70" }}>{subtitle}</div>
				</div>

				<div style={{ display: "flex", fontSize: 20, color: "#7c6e70" }}>Non-custodial · Soroban · Stellar Testnet</div>
			</div>

			{showSchedule && (
				<div
					style={{
						position: "absolute",
						right: 72,
						top: 150,
						width: 340,
						display: "flex",
						flexDirection: "column",
						padding: 28,
						borderRadius: 24,
						backgroundColor: "#0e0405",
						color: "#ffffff",
						boxShadow: "0 30px 70px rgba(39,12,15,0.35)",
					}}
				>
					<div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, color: "rgba(255,255,255,0.7)" }}>
						<span>USDC → XLM</span>
						<span style={{ display: "flex", padding: "2px 12px", borderRadius: 999, backgroundColor: "#ff6173", color: "#ffffff" }}>Weekly</span>
					</div>
					<div style={{ display: "flex", fontSize: 64, letterSpacing: -4, marginTop: 18 }}>50 USDC</div>
					<div style={{ display: "flex", fontSize: 20, marginTop: 6, color: "rgba(255,255,255,0.75)" }}>Next purchase · every 7 days</div>
					<div style={{ display: "flex", gap: 8, marginTop: 26 }}>
						<div style={{ display: "flex", flex: 1, height: 8, borderRadius: 999, backgroundColor: "#ff6173" }} />
						<div style={{ display: "flex", flex: 1, height: 8, borderRadius: 999, backgroundColor: "#ff6173" }} />
						<div style={{ display: "flex", flex: 1, height: 8, borderRadius: 999, backgroundColor: "#ff6173" }} />
						<div style={{ display: "flex", flex: 1, height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)" }} />
					</div>
				</div>
			)}
		</div>
	);
}
