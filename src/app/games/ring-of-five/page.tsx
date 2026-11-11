import type { Metadata } from "next";
import { LazyRingGame } from "@/components/lazy";

export const metadata: Metadata = {
  title: "Ring of Five",
  description: "Name five cities inside each ring drawn around a mystery centre.",
};

export default function RingOfFivePage() {
  return (
    <main>
      <LazyRingGame mode="five" />
    </main>
  );
}
