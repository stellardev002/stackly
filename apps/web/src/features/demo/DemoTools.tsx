"use client";

import dynamic from "next/dynamic";
import { USE_MOCK_API } from "@/lib/api/source";

/** Loads the demo controls only in mock mode, so live builds never ship them to the browser. */
const DemoControls = dynamic(() => import("@/features/demo/DemoControls").then((m) => m.DemoControls), { ssr: false });

export function DemoTools() {
	return USE_MOCK_API ? <DemoControls /> : null;
}
