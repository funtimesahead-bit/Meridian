import type { Metadata } from "next";
import { LazyEuropeHistory } from "@/components/lazy";

export const metadata: Metadata = {
  title: "Europe Through Time",
  description: "An interactive map of Europe's borders from 1492 to today, with every change explained.",
};

export default function EuropeHistoryPage() {
  return (
    <main>
      <LazyEuropeHistory />
    </main>
  );
}
