import { TopNav } from "@/components/layouts/TopNav";
import { WalletGate } from "@/components/providers/WalletGate";
import { Notifier } from "@/components/providers/Notifier";

/** Every signed-in screen: top navigation, the wallet + session gate and in-app notifications. */
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
		</div>
	);
}
