import { TopNav } from "@/components/layouts/TopNav";
import { WalletGate } from "@/components/providers/WalletGate";
import { Notifier } from "@/components/providers/Notifier";
import { DemoTools } from "@/features/demo/DemoTools";

/** Every signed-in screen: top navigation, the wallet gate, in-app notifications and (mock only) demo controls. */
export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-dvh bg-page">
			<TopNav />
			<main id="main" className="app-container min-w-0 pb-28">
				<WalletGate>
					{children}
					<Notifier />
				</WalletGate>
			</main>
			<DemoTools />
		</div>
	);
}
