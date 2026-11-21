import type { Metadata } from "next";
import { LazyDayNight } from "@/components/lazy";

export const metadata: Metadata = {
  title: "Day and Night",
  description: "See where it is day and night on Earth for any date and time, and why the seasons happen.",
};

export default function DayNightPage() {
  return (
    <main>
      <LazyDayNight />
    </main>
  );
}
