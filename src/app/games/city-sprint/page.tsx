import type { Metadata } from "next";
import { LazyCitySprint } from "@/components/lazy";

export const metadata: Metadata = {
  title: "City Sprint",
  description: "Name as many cities on a continent as you can before the clock runs out.",
};

export default function CitySprintPage() {
  return (
    <main>
      <LazyCitySprint />
    </main>
  );
}
