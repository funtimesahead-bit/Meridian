import { geoArea, geoCentroid } from "d3-geo";
import { editDistance, normalize } from "@/games/name-the-city/match";
import { COUNTRY_POOLS, type PinCountry } from "@/games/pin-drop/countries";
import { COUNTRY_SHAPES, SHAPE_NEIGHBOURS } from "@/lib/geo/world";

/* The land-border network behind Border Run: which countries touch which,
   worked out from the shared borders in the map outline file. */

export type Difficulty = "easy" | "medium" | "hard";

export type Country = PinCountry & { aliases: string[] };

const ALIASES: Record<string, string[]> = {
  "United States": ["USA", "US", "United States of America", "America"],
  "United Kingdom": ["UK", "Great Britain", "Britain"],
  "United Arab Emirates": ["UAE", "Emirates"],
  "DR Congo": ["DRC", "Democratic Republic of the Congo", "Democratic Republic of Congo", "Congo Kinshasa"],
  "Republic of the Congo": ["Congo", "Republic of Congo", "Congo Brazzaville"],
  "Côte d'Ivoire": ["Ivory Coast"],
  Czechia: ["Czech Republic"],
  Myanmar: ["Burma"],
  Eswatini: ["Swaziland"],
  "North Macedonia": ["Macedonia"],
  "Bosnia and Herzegovina": ["Bosnia", "Bosnia Herzegovina"],
  "Timor-Leste": ["East Timor"],
  Turkey: ["Türkiye"],
  "Central African Republic": ["CAR"],
  Netherlands: ["Holland", "The Netherlands"],
  Russia: ["Russian Federation"],
  "South Korea": ["Republic of Korea"],
  "North Korea": ["DPRK"],
  Gambia: ["The Gambia"],
};

/** Places that are not in the Pin Drop lists but matter for land routes. */
const EXTRA: PinCountry[] = [
  { name: "Western Sahara", shapes: ["W. Sahara"] },
  { name: "Palestine", shapes: ["Palestine"] },
];

export const COUNTRIES: Country[] = [
  ...COUNTRY_POOLS.easy,
  ...COUNTRY_POOLS.medium,
  ...COUNTRY_POOLS.hard,
  ...EXTRA,
].map((country) => ({ ...country, aliases: ALIASES[country.name] ?? [] }));

const BY_NAME = new Map(COUNTRIES.map((c) => [c.name, c]));
const BY_SHAPE = new Map(COUNTRIES.flatMap((c) => c.shapes.map((s) => [s, c] as const)));

/** Borders that only exist through a far-away overseas territory. */
const NOT_REALLY_NEIGHBOURS = new Set(["France|Brazil", "France|Suriname"]);

const NEIGHBOURS = new Map<string, Set<string>>(COUNTRIES.map((c) => [c.name, new Set()]));
for (const country of COUNTRIES) {
  for (const shape of country.shapes) {
    for (const otherShape of SHAPE_NEIGHBOURS.get(shape) ?? []) {
      const other = BY_SHAPE.get(otherShape);
      if (!other || other === country) continue;
      if (
        NOT_REALLY_NEIGHBOURS.has(`${country.name}|${other.name}`) ||
        NOT_REALLY_NEIGHBOURS.has(`${other.name}|${country.name}`)
      ) {
        continue;
      }
      NEIGHBOURS.get(country.name)!.add(other.name);
      NEIGHBOURS.get(other.name)!.add(country.name);
    }
  }
}

export function neighboursOf(name: string): string[] {
  return [...(NEIGHBOURS.get(name) ?? [])];
}

/** Number of border crossings from `from` to every country it can reach by land. */
export function distancesFrom(from: string, allowed?: Set<string>): Map<string, number> {
  const distance = new Map([[from, 0]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    for (const next of NEIGHBOURS.get(current) ?? []) {
      if (distance.has(next) || (allowed && !allowed.has(next))) continue;
      distance.set(next, distance.get(current)! + 1);
      queue.push(next);
    }
  }
  return distance;
}

/** One shortest land route, including both ends. */
export function shortestRoute(from: string, to: string): string[] {
  const toEnd = distancesFrom(to);
  const route = [from];
  let current = from;
  while (current !== to) {
    const step = neighboursOf(current)
      .filter((n) => toEnd.get(n) === toEnd.get(current)! - 1)
      .sort()[0];
    if (!step) return [];
    route.push(step);
    current = step;
  }
  return route;
}

export const ROUTE_RULES: Record<
  Difficulty,
  { minBetween: number; maxBetween: number; spare: number }
> = {
  easy: { minBetween: 2, maxBetween: 3, spare: 3 },
  medium: { minBetween: 4, maxBetween: 5, spare: 4 },
  hard: { minBetween: 6, maxBetween: 9, spare: 5 },
};

export type Puzzle = {
  start: Country;
  end: Country;
  /** Countries needed between the two ends on a shortest route. */
  between: number;
  maxGuesses: number;
};

/**
 * Two countries joined by land, the right number of borders apart.
 * Islands and countries on separate landmasses can never be paired, because
 * a pair is only made from countries one can reach from the other.
 */
export function pickPuzzle(difficulty: Difficulty): Puzzle {
  const rules = ROUTE_RULES[difficulty];
  for (let attempt = 0; attempt < 500; attempt++) {
    const start = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    const options = [...distancesFrom(start.name)].filter(
      ([, d]) => d - 1 >= rules.minBetween && d - 1 <= rules.maxBetween,
    );
    if (!options.length) continue;
    const [endName, d] = options[Math.floor(Math.random() * options.length)];
    return {
      start,
      end: BY_NAME.get(endName)!,
      between: d - 1,
      maxGuesses: d - 1 + rules.spare,
    };
  }
  throw new Error("No route puzzle could be built");
}

/* ---------- Reading a typed country ---------- */

const KEYS = COUNTRIES.map((country) => ({
  country,
  keys: [country.name, ...country.aliases].map(normalize),
}));

function allowedTypos(length: number): number {
  if (length <= 5) return 0;
  if (length <= 8) return 1;
  return 2;
}

export function findCountry(text: string): Country | null {
  const key = normalize(text);
  if (!key) return null;
  const exact = KEYS.find((k) => k.keys.includes(key));
  if (exact) return exact.country;

  let best: Country | null = null;
  let bestDistance = Infinity;
  for (const { country, keys } of KEYS) {
    for (const k of keys) {
      const budget = allowedTypos(k.length);
      if (budget === 0 || Math.abs(k.length - key.length) > budget) continue;
      const d = editDistance(key, k);
      if (d <= budget && d < bestDistance) {
        bestDistance = d;
        best = country;
      }
    }
  }
  return best;
}

/** Where to put a country's name on the map: the middle of its biggest piece. */
export function labelPoint(country: Country): [number, number] | null {
  let best: { area: number; point: [number, number] } | null = null;
  for (const name of country.shapes) {
    const shape = COUNTRY_SHAPES.get(name);
    if (!shape) continue;
    const polygons =
      shape.geometry.type === "Polygon"
        ? [shape.geometry.coordinates]
        : shape.geometry.coordinates;
    for (const coordinates of polygons) {
      const polygon = { type: "Polygon" as const, coordinates };
      const area = geoArea(polygon);
      if (!best || area > best.area) {
        best = { area, point: geoCentroid(polygon) as [number, number] };
      }
    }
  }
  return best?.point ?? null;
}
