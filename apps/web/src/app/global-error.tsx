"use client";

/** The root layout itself failed: a bare page in brand colours (no app styles are guaranteed here). */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
	return (
		<html lang="en">
			<body style={{ fontFamily: "'Source Sans 3', system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, padding: 16, background: "#fafafa", color: "#270c0f" }}>
				<div style={{ textAlign: "center", maxWidth: 440 }}>
					<svg width="42" height="45" viewBox="0 0 28 30" aria-hidden>
						<path d="M0 5.35714L18 0L28 5.35714L10 10.7143L0 5.35714ZM0 15L18 9.64286L28 15L10 20.3571L0 15ZM0 24.6429L18 19.2857L28 24.6429L10 30L0 24.6429Z" fill="#ff6173" />
					</svg>
					<h1 style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.04em", margin: "20px 0 8px" }}>Stackly couldn’t load</h1>
					<p style={{ color: "#7c6e70", margin: 0 }}>Your vault and its funds are not affected. Try again in a moment.</p>
					<button type="button" onClick={retry} style={{ marginTop: 24, padding: "12px 24px", borderRadius: 999, border: 0, background: "#270c0f", color: "#fff", fontSize: 16, cursor: "pointer" }}>
						Try again
					</button>
				</div>
			</body>
		</html>
	);
}
