import { z } from "zod";

const amount = (label: string) =>
	z
		.string()
		.trim()
		.min(1, `Enter ${label}`)
		.regex(/^\d+(\.\d{1,7})?$/, "Use numbers only, with up to 7 decimals")
		.refine((v) => Number(v) > 0, "Enter an amount greater than zero");

/**
 * Screen 4: Create DCA Vault. Amounts are decimal strings converted to stroops on submit. `planned_deposit`
 * and `name` fill design gaps #9 and #10 (DESIGN-PLAN.md): Review's purchase count needs a deposit figure.
 */
export const createVaultSchema = z
	.object({
		name: z.string().trim().max(40, "Keep the name under 40 characters"),
		source_asset: z.string().min(1, "Choose a source asset"),
		target_asset: z.string().min(1, "Choose a target asset"),
		purchase_amount: amount("a purchase amount").refine((v) => Number(v) >= 1, "The minimum purchase is 1 USDC"),
		frequency: z.enum(["daily", "weekly", "monthly"]),
		/** "YYYY-MM-DDTHH:mm", read as UTC. */
		start: z.string().min(1, "Choose a start date"),
		end: z.string(),
		/** Percent. Stored on chain as basis points. */
		max_slippage: z
			.string()
			.trim()
			.min(1, "Enter a maximum slippage")
			.refine((v) => !Number.isNaN(Number(v)), "Use a number, like 0.5")
			.refine((v) => Number(v) >= 0.1 && Number(v) <= 5, "Choose between 0.1% and 5%"),
		planned_deposit: amount("how much you plan to deposit"),
	})
	.refine((v) => v.source_asset !== v.target_asset, { path: ["target_asset"], message: "Choose a different asset to buy" })
	.refine((v) => Number(v.planned_deposit) >= Number(v.purchase_amount), {
		path: ["planned_deposit"],
		message: "Deposit at least one purchase amount",
	})
	.refine((v) => !v.end || Date.parse(`${v.end}T23:59:59Z`) > Date.parse(`${v.start}:00Z`), {
		path: ["end"],
		message: "The end date must be after the start date",
	});

export type CreateVaultValues = z.infer<typeof createVaultSchema>;

/** Screens 6 and 11. `max` is the available balance in whole units. */
export const amountSchema = (max: number, overMessage: string) =>
	z.object({
		amount: amount("an amount").refine((v) => Number(v) <= max, overMessage),
	});

/** "YYYY-MM-DDTHH:mm" (UTC) → unix seconds. */
export const utcInputToSeconds = (value: string) => Math.floor(Date.parse(`${value}:00Z`) / 1000);

/** Unix ms → "YYYY-MM-DDTHH:mm" in UTC, for datetime-local inputs labelled UTC. */
export const msToUtcInput = (ms: number) => new Date(ms).toISOString().slice(0, 16);
