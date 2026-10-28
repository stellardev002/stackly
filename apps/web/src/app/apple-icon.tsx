import { ImageResponse } from "next/og";

/** Home-screen icon (180×180): the Stackly mark on blush. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
	return new ImageResponse(
		<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#ffeff1" }}>
			<svg width="92" height="98" viewBox="0 0 28 30">
				<path d="M0 5.35714L18 0L28 5.35714L10 10.7143L0 5.35714ZM0 15L18 9.64286L28 15L10 20.3571L0 15ZM0 24.6429L18 19.2857L28 24.6429L10 30L0 24.6429Z" fill="#ff6173" />
			</svg>
		</div>,
		size,
	);
}
