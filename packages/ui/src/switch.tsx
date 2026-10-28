"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "./lib/utils";

/** Coral toggle from the Settings screen. */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			className={cn(
				"peer inline-flex h-7 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-line transition-colors duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-coral/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-coral",
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb className="pointer-events-none block size-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-(--ease-settle) data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
		</SwitchPrimitive.Root>
	);
}

export { Switch };
