import type { Metadata } from "next";
import { LazyOutline } from "@/components/lazy";

export const metadata: Metadata = {
  title: "Outline",
  description: "A daily country silhouette. Five guesses to name it.",
};

export default function OutlinePage() {
  return (
    <main>
      <LazyOutline />
    </main>
  );
}
