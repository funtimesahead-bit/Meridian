import type { Metadata } from "next";
import { LazyBorderRun } from "@/components/lazy";

export const metadata: Metadata = {
  title: "Border Run",
  description: "Connect two countries by naming the countries between them.",
};

export default function BorderRunPage() {
  return (
    <main>
      <LazyBorderRun />
    </main>
  );
}
