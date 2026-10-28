import Image from "next/image";
import { cn } from "@repo/ui/lib/utils";
import { withBasePath } from "@/lib/site";

/** The coral illustrated card ("You stay in control", "Control the pace"). */
export function PromoCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
	return (
		<section className={cn("relative isolate min-h-[240px] overflow-hidden rounded-card bg-coral p-6 text-white", className)}>
			<h2 className="text-2xl leading-7 tracking-[-0.03em]">{title}</h2>
			<p className="mt-1 max-w-[58%] text-sm leading-[1.4] font-light text-white/90 sm:max-w-[290px]">{children}</p>
			<Image
				src={withBasePath("/images/laptop-person.svg")}
				alt=""
				width={285}
				height={250}
				className="animate-float absolute -right-4 -bottom-3 -z-10 h-auto w-[150px] sm:w-[220px]"
			/>
		</section>
	);
}
