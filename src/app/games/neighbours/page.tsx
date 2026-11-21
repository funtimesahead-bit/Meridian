import type { Metadata } from "next";
import { LazyNeighbours } from "@/components/lazy";

export const metadata: Metadata = {
  title: "Neighbours",
  description: "Name every country that shares a land border with the one on the map.",
};

export default function NeighboursPage() {
  return (
    <main>
      <LazyNeighbours />
    </main>
  );
}
