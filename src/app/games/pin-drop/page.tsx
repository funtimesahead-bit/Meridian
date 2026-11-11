import type { Metadata } from "next";
import { LazyPinDrop } from "@/components/lazy";

export const metadata: Metadata = {
  title: "Pin Drop",
  description: "Drop a pin on a blank world map where you think the country is.",
};

export default function PinDropPage() {
  return (
    <main>
      <LazyPinDrop />
    </main>
  );
}
