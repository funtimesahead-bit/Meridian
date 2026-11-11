import type { Metadata } from "next";
import { CityGame } from "@/games/name-the-city/CityGame";

export const metadata: Metadata = {
  title: "Name the City",
  description:
    "A dot lights up on a blank world map. Type the city it marks.",
};

export default function NameTheCityPage() {
  return (
    <main>
      <CityGame />
    </main>
  );
}
