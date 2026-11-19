import type { Metadata } from "next";
import { LazyPinDrop } from "@/components/lazy";

export const metadata: Metadata = {
  title: "Pin Drop: Capitals",
  description: "A capital city is named. Drop a pin on the blank world map where you think it is.",
};

export default function PinDropCapitalsPage() {
  return (
    <main>
      <LazyPinDrop mode="capitals" />
    </main>
  );
}
