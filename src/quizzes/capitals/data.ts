import { CAPITALS } from "@/lib/geo/countryInfo";
import type { SceneId } from "@/lib/geo/world";
import { COUNTRY_QUIZZES } from "@/quizzes/countries/data";
import codes from "@/quizzes/flags/codes.json";
import { COUNTRY_CAPITALS, STATE_CAPITALS } from "./list";

/* "Name every capital" quizzes: one per continent, the whole world, and the
   US states. Countries are the sovereign ones from the country quizzes. */

export type CapitalEntry = {
  /** The country or state. */
  place: string;
  /** The capital shown; first of `capitals`. */
  capital: string;
  /** Every capital that counts, each with its accepted spellings. */
  capitals: string[][];
  lat: number;
  lon: number;
};

export type CapitalQuiz = {
  slug: string;
  title: string;
  blurb: string;
  region: string;
  scene: SceneId;
  entries: CapitalEntry[];
};

const CODES = codes as Record<string, string>;
const COORDS = new Map(CAPITALS.map((c) => [c.code.toLowerCase(), c]));

/** Map positions where GeoNames marks a different city from the one shown. */
const POSITION_FIXES: Record<string, [number, number]> = {
  Bolivia: [-19.04, -65.26], // Sucre
  Benin: [6.5, 2.6], // Porto-Novo
  Burundi: [-3.43, 29.93], // Gitega
  "Côte d'Ivoire": [6.82, -5.28], // Yamoussoukro
  Eswatini: [-26.31, 31.14], // Mbabane
  Israel: [31.78, 35.22], // Jerusalem
  Kiribati: [1.33, 172.98], // South Tarawa
  Montenegro: [42.44, 19.26], // Podgorica
  Netherlands: [52.37, 4.9], // Amsterdam
  "South Africa": [-25.75, 28.19], // Pretoria
  "Sri Lanka": [6.89, 79.92], // Sri Jayawardenepura Kotte
  Tanzania: [-6.16, 35.75], // Dodoma
  Yemen: [15.37, 44.19], // Sanaa
  Malaysia: [3.14, 101.69], // Kuala Lumpur
};

function lines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** "Pretoria | Tshwane ; Cape Town" -> [["Pretoria", "Tshwane"], ["Cape Town"]] */
function parseCapitals(text: string): string[][] {
  return text.split(";").map((part) => part.split("|").map((s) => s.trim()).filter(Boolean));
}

const BY_COUNTRY = new Map(
  lines(COUNTRY_CAPITALS).map((line) => {
    const [place, rest] = line.split(" = ");
    return [place.trim(), parseCapitals(rest)];
  }),
);

function countryEntry(place: string): CapitalEntry | null {
  const capitals = BY_COUNTRY.get(place);
  if (!capitals) return null;
  const fix = POSITION_FIXES[place];
  const known = COORDS.get(CODES[place]);
  const lat = fix?.[0] ?? known?.lat;
  const lon = fix?.[1] ?? known?.lon;
  if (lat === undefined || lon === undefined) return null;
  return { place, capital: capitals[0][0], capitals, lat, lon };
}

const STATES: CapitalEntry[] = lines(STATE_CAPITALS).map((line) => {
  const [place, rest] = line.split(" = ");
  const [names, coords] = rest.split("@");
  const [lat, lon] = coords.split(",").map(Number);
  const capitals = parseCapitals(names);
  return { place: place.trim(), capital: capitals[0][0], capitals, lat, lon };
});

const byPlace = (a: CapitalEntry, b: CapitalEntry) => a.place.localeCompare(b.place);

const continentQuizzes: CapitalQuiz[] = COUNTRY_QUIZZES.map((quiz) => {
  const entries = quiz.countries.flatMap((c) => countryEntry(c.name) ?? []).sort(byPlace);
  return {
    slug: quiz.slug.replace(/^countries-of-/, "capitals-of-"),
    title: `Capitals of ${quiz.region}`,
    blurb: `Name the capital of all ${entries.length} countries of ${quiz.region}.`,
    region: quiz.region,
    scene: quiz.scene,
    entries,
  };
});

const world = [
  ...new Map(continentQuizzes.flatMap((q) => q.entries).map((e) => [e.place, e])).values(),
].sort(byPlace);

export const CAPITAL_QUIZZES: CapitalQuiz[] = [
  {
    slug: "capitals-of-the-world",
    title: "Capitals of the World",
    blurb: `Every country's capital, all ${world.length} of them. Bring snacks.`,
    region: "the world",
    scene: "world",
    entries: world,
  },
  ...continentQuizzes,
  {
    slug: "capitals-of-us-states",
    title: "US State Capitals",
    blurb: "All 50 state capitals. Not always the biggest city.",
    region: "the US",
    scene: "usa",
    entries: STATES,
  },
];

export function findCapitalQuiz(slug: string): CapitalQuiz | undefined {
  return CAPITAL_QUIZZES.find((quiz) => quiz.slug === slug);
}
