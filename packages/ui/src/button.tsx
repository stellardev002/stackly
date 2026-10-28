import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./lib/utils";
import { Spinner } from "./spinner";

/**
 * Pill buttons from the Figma kit. `primary` (ink) is the default action, `accent` (coral) the brand CTA,
 * `outline` the secondary action. `isLoading` keeps the button's width, shows a spinner and, when given,
 * swaps the label for `loadingText` ("Waiting for wallet…"), so the user sees what they're waiting on.
 */
const buttonVariants = cva(
	"relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full font-normal tracking-[-0.01em] transition-[background-color,color,box-shadow,transform] duration-200 ease-(--ease-settle) outline-none select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-100 focus-visible:ring-[3px] focus-visible:ring-coral/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				primary: "bg-ink text-white hover:bg-ink-soft disabled:bg-line disabled:text-muted",
				accent: "bg-coral text-white hover:bg-coral-strong disabled:bg-rose disabled:text-white",
				outline: "border border-line bg-white text-ink hover:border-rose hover:bg-blush disabled:text-subtle",
				ghost: "text-ink hover:bg-blush disabled:text-subtle",
				danger: "bg-danger text-white hover:bg-danger/90 disabled:bg-line disabled:text-muted",
				link: "h-auto rounded-none px-0 text-ink underline-offset-4 hover:underline",
			},
			size: {
				sm: "h-8 px-3.5 text-sm",
				md: "h-11 px-5 text-base",
				lg: "h-12 px-6 text-lg",
				icon: "size-10",
			},
		},
		defaultVariants: { variant: "primary", size: "md" },
	},
);

function Button({
	className,
	variant,
	size,
	isLoading = false,
	loadingText,
	asChild = false,
	children,
	disabled,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		isLoading?: boolean;
		loadingText?: string;
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot : "button";

	return (
		<Comp
			data-slot="button"
			className={cn(buttonVariants({ variant, size }), isLoading && "cursor-progress", className)}
			disabled={isLoading || disabled}
			aria-busy={isLoading || undefined}
			{...props}
		>
			{isLoading && !asChild ? (
				<>
					<Spinner className="size-4" />
					<span>{loadingText ?? children}</span>
				</>
			) : (
				children
			)}
		</Comp>
	);
}

export { Button, buttonVariants };
