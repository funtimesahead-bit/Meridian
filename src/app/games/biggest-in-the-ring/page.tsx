import type { Metadata } from "next";
import { LazyRingGame } from "@/components/lazy";

export const metadata: Metadata = {
  title: "Biggest in the Ring",
  description: "Name the most populous city inside each ring.",
};

export default function BiggestInTheRingPage() {
  return (
    <main>
      <LazyRingGame mode="biggest" />
    </main>
  );
}
