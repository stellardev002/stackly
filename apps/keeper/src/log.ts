/** One JSON line per event, so hosted logs stay searchable. Never log the keeper secret. */
export function log(level: "info" | "warn" | "error", message: string, fields: Record<string, unknown> = {}) {
	const line = JSON.stringify({ at: new Date().toISOString(), level, message, ...fields });
	if (level === "error") console.error(line);
	else console.log(line);
}
