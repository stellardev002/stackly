"use client";

/** The root layout itself failed: a bare page in brand colours. */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
	return (
		<html lang="en">
			<body style={{ fontFamily: "'Source Sans 3', system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, padding: 16, color: "#270c0f" }}>
				<div style={{ textAlign: "center", maxWidth: 420 }}>
					<h1 style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.04em" }}>Stackly couldn’t load</h1>
					<button type="button" onClick={retry} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 999, border: 0, background: "#270c0f", color: "#fff", fontSize: 16, cursor: "pointer" }}>
						Try again
					</button>
				</div>
			</body>
		</html>
	);
}
