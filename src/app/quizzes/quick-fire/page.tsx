import type { Metadata } from "next";
import { LazyQuickFire } from "@/components/lazy";

export const metadata: Metadata = {
  title: "Quick Fire",
  description: "Ten quick geography questions. Type the first answer that comes to mind.",
};

export default function QuickFirePage() {
  return (
    <main>
      <LazyQuickFire />
    </main>
  );
}
