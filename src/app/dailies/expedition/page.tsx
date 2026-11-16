import type { Metadata } from "next";
import { LazyExpedition } from "@/components/lazy";

export const metadata: Metadata = {
  title: "Expedition",
  description: "Eight geography prompts a day. The rarer your answer, the more it scores.",
};

export default function ExpeditionPage() {
  return (
    <main>
      <LazyExpedition />
    </main>
  );
}
