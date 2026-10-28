import { cn } from "@repo/ui/lib/utils";

/** Big page title, subtitle line and an optional action (Figma: "Hey, Dean!" / "Create New DCA"). */
export function PageHeader({ title, subtitle, action, className }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; className?: string }) {
	return (
		<header className={cn("animate-rise flex flex-col gap-5 pt-8 pb-8 sm:flex-row sm:items-end sm:justify-between lg:pt-10", className)}>
			<div className="min-w-0">
				<h1 className="h-page">{title}</h1>
				{subtitle && <p className="mt-2 text-base font-light text-muted">{subtitle}</p>}
			</div>
			{action && <div className="shrink-0">{action}</div>}
		</header>
	);
}
