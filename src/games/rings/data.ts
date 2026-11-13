import { CITY_POOLS } from "@/games/name-the-city/cities";
import { editDistance, normalize } from "@/games/name-the-city/match";
import { distanceKm } from "@/lib/geo/world";

/* City data and rules shared by the two ring games.
   Cities come from public/data/cities.json (GeoNames, places of 15,000+). */

export type Difficulty = "easy" | "medium" | "hard";

export type RingCity = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  population: number;
  countryCode: string;
  /** Normalised spellings that count as this city. */
  keys: string[];
};

export type CityData = {
  cities: RingCity[];
  byKey: Map<string, RingCity[]>;
};

type Row = [string, string | 0, number, number, number, string, string[]?];

let pending: Promise<CityData> | null = null;

export function loadCities(): Promise<CityData> {
  pending ??= fetch("/data/cities.json")
    .then((response) => {
      if (!response.ok) throw new Error(`City data failed to load (${response.status})`);
      return response.json() as Promise<Row[]>;
    })
    .then((rows) => {
      const byKey = new Map<string, RingCity[]>();
      const cities = rows.map((row, id): RingCity => {
        const [name, ascii, lat, lon, population, countryCode, alts] = row;
        const keys = [
          ...new Set(
            [name, ascii || name, ...(alts ?? [])].map(normalize).filter(Boolean),
          ),
        ];
        const city = { id, name, lat, lon, population, countryCode, keys };
        for (const key of keys) {
          const list = byKey.get(key);
          if (list) list.push(city);
          else byKey.set(key, [city]);
        }
        return city;
      });
      return { cities, byKey };
    })
    .catch((error) => {
      pending = null;
      throw error;
    });
  return pending;
}

/* ---------- Building a game ---------- */

export const RING_RULES: Record<
  Difficulty,
  { stepKm: number; minPopulation: number; maxPopulation: number; centreNamed: boolean }
> = {
  easy: { stepKm: 840, minPopulation: 1_000_000, maxPopulation: Infinity, centreNamed: true },
  medium: { stepKm: 490, minPopulation: 200_000, maxPopulation: 1_000_000, centreNamed: true },
  hard: { stepKm: 280, minPopulation: 40_000, maxPopulation: 200_000, centreNamed: false },
};

export type RingGame = {
  centre: RingCity;
  stepKm: number;
  centreNamed: boolean;
  /** Places closer to the centre than this are its own suburbs and are left out. */
  excludeKm: number;
  /** Cities in each ring, biggest first. Ring 0 is the inner circle. */
  rings: RingCity[][];
};

const candidateCache = new Map<Difficulty, RingCity[]>();

/**
 * Cities a ring can be centred on. Easy and Medium use the hand-picked famous
 * cities from Name the City, so the rings land in places people know. Hard
 * uses any small city in the world.
 */
function centreCandidates(data: CityData, difficulty: Difficulty): RingCity[] {
  const cached = candidateCache.get(difficulty);
  if (cached) return cached;

  let list: RingCity[];
  if (difficulty === "hard") {
    const rules = RING_RULES.hard;
    list = data.cities.filter(
      (c) =>
        c.population >= rules.minPopulation &&
        c.population < rules.maxPopulation &&
        Math.abs(c.lat) < 66,
    );
  } else {
    // Match each famous city to its entry in the data: the place of that name
    // within 25 km, or failing that the biggest place there.
    const found = new Set<RingCity>();
    for (const famous of CITY_POOLS[difficulty]) {
      const nearby = data.cities.filter(
        (c) =>
          Math.abs(c.lat - famous.lat) < 0.3 &&
          distanceKm(famous.lon, famous.lat, c.lon, c.lat) < 25,
      );
      const names = [famous.name, ...famous.alt].map(normalize);
      const match = nearby.find((c) => c.keys.some((k) => names.includes(k))) ?? nearby[0];
      if (match) found.add(match);
    }
    list = [...found];
  }
  candidateCache.set(difficulty, list);
  return list;
}

/**
 * Pick a centre city whose every ring holds at least `minPerRing` cities.
 * Tries random centres and keeps the first that works, or the best one seen.
 */
export function buildRingGame(
  data: CityData,
  difficulty: Difficulty,
  ringCount: number,
  minPerRing: number,
  excludeKm = 1,
): RingGame {
  const rules = RING_RULES[difficulty];
  const candidates = centreCandidates(data, difficulty);
  const maxKm = rules.stepKm * ringCount;
  const latWindow = maxKm / 111 + 0.5;

  let best: { rings: RingCity[][]; centre: RingCity; weakest: number } | null = null;

  for (let attempt = 0; attempt < 600; attempt++) {
    const centre = candidates[Math.floor(Math.random() * candidates.length)];
    const rings: RingCity[][] = Array.from({ length: ringCount }, () => []);
    for (const city of data.cities) {
      if (city === centre || Math.abs(city.lat - centre.lat) > latWindow) continue;
      const km = distanceKm(centre.lon, centre.lat, city.lon, city.lat);
      // Skip the centre's own duplicates and, when asked, its suburbs.
      if (km < excludeKm || km >= maxKm) continue;
      rings[Math.floor(km / rules.stepKm)].push(city);
    }
    const weakest = Math.min(...rings.map((r) => r.length));
    if (!best || weakest > best.weakest) best = { rings, centre, weakest };
    if (weakest >= minPerRing) break;
  }

  const chosen = best!;
  // Data is already sorted by population, so each ring is too.
  return {
    centre: chosen.centre,
    stepKm: rules.stepKm,
    centreNamed: rules.centreNamed,
    excludeKm,
    rings: chosen.rings,
  };
}

/* ---------- Reading a guess ---------- */

function allowedTypos(length: number): number {
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  return 2;
}

export type GuessReading =
  | { kind: "in-ring"; city: RingCity }
  | { kind: "elsewhere"; city: RingCity; km: number }
  | { kind: "centre" }
  | { kind: "unknown" };

/**
 * Work out what a typed name refers to: a city in the current ring, a real
 * city somewhere else, the centre itself, or nothing we know.
 * `prefer` ranks same-named cities in the ring (e.g. not-yet-named first).
 */
export function readGuess(
  data: CityData,
  game: RingGame,
  ring: RingCity[],
  text: string,
  prefer: (city: RingCity) => number = () => 0,
): GuessReading {
  const key = normalize(text);
  if (!key) return { kind: "unknown" };

  const rank = (a: RingCity, b: RingCity) =>
    prefer(b) - prefer(a) || b.population - a.population;

  const exactInRing = ring.filter((c) => c.keys.includes(key)).sort(rank);
  if (exactInRing.length) return { kind: "in-ring", city: exactInRing[0] };

  if (game.centre.keys.includes(key)) return { kind: "centre" };

  const known = data.byKey.get(key);
  if (known?.length) {
    const nearest = known
      .map((city) => ({
        city,
        km: distanceKm(game.centre.lon, game.centre.lat, city.lon, city.lat),
      }))
      .sort((a, b) => a.km - b.km)[0];
    return { kind: "elsewhere", ...nearest };
  }

  // Not an exact name anywhere: forgive a small typo of a city in the ring.
  let bestCity: RingCity | null = null;
  let bestDistance = Infinity;
  for (const city of ring) {
    for (const k of city.keys) {
      const budget = allowedTypos(k.length);
      if (budget === 0 || Math.abs(k.length - key.length) > budget) continue;
      const d = editDistance(key, k);
      if (d > budget) continue;
      if (d < bestDistance || (d === bestDistance && bestCity && rank(city, bestCity) < 0)) {
        bestCity = city;
        bestDistance = d;
      }
    }
  }
  return bestCity ? { kind: "in-ring", city: bestCity } : { kind: "unknown" };
}

/* ---------- Display helpers ---------- */

let regionNames: Intl.DisplayNames | null = null;

export function countryName(code: string): string {
  try {
    regionNames ??= new Intl.DisplayNames(["en"], { type: "region" });
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export function formatPopulation(population: number): string {
  if (population >= 1_000_000) {
    const millions = population / 1_000_000;
    return `${millions >= 10 ? Math.round(millions) : millions.toFixed(1)}M`;
  }
  return `${Math.round(population / 1000)}k`;
}
