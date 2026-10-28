import { Stepper } from "@repo/ui/choice";

/** Configure → Review → Fund vault (Figma stepper on Screens 4–6). */
export function VaultSteps({ current }: { current: 0 | 1 | 2 }) {
	return <Stepper steps={["Configure", "Review", "Fund vault"]} current={current} className="animate-rise mb-6" />;
}
