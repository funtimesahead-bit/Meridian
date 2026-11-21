import type { Metadata } from "next";
import { LazyDueNorth } from "@/components/lazy";

export const metadata: Metadata = {
  title: "Due North",
  description: "Two cities: which is further north, further south, or closer to the Equator?",
};

export default function DueNorthPage() {
  return (
    <main>
      <LazyDueNorth />
    </main>
  );
}
