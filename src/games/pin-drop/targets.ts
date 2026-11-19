import { CAPITALS } from "@/lib/geo/countryInfo";
import { distanceKm, measureToCountry, type CountryHit } from "@/lib/geo/world";
import { COUNTRY_POOLS, MAX_POINTS, pointsFor, type Difficulty } from "./countries";

/* What Pin Drop asks you to find: a country (an area) or a capital (a point). */

export type PinMode = "countries" | "capitals";

export type Target = {
  id: string;
  /** What is asked: "Bolivia" or "Sucre". */
  name: string;
  /** Extra line under the question, e.g. the capital's country. */
  hint?: string;
  /** Shown once the pin is down: the capital's country. */
  answerNote?: string;
  /** Country outlines, for countries. */
  shapes?: string[];
  /** The exact spot, for capitals. */
  point?: [number, number];
};

/** Within this distance of a capital is a perfect drop. */
export const CAPITAL_FULL_KM = 50;

export function pointsForCapital(km: number): number {
  if (km <= CAPITAL_FULL_KM) return MAX_POINTS;
  return Math.round(MAX_POINTS * Math.exp(-(km - CAPITAL_FULL_KM) / 450));
}

/** Where the pin landed relative to the target, and what it scores. */
export function measure(target: Target, lon: number, lat: number): { hit: CountryHit; points: number } {
  if (target.point) {
    const km = distanceKm(lon, lat, target.point[0], target.point[1]);
    return {
      hit: { inside: km <= CAPITAL_FULL_KM, km, nearest: target.point },
      points: pointsForCapital(km),
    };
  }
  const hit = measureToCountry(target.shapes ?? [], lon, lat);
  return { hit, points: pointsFor(hit.inside, hit.km) };
}

const FAME_FOR: Record<Difficulty, "famous" | "known" | "obscure"> = {
  easy: "famous",
  medium: "known",
  hard: "obscure",
};

export const TARGET_POOLS: Record<PinMode, Record<Difficulty, Target[]>> = {
  countries: {
    easy: COUNTRY_POOLS.easy.map((c) => ({ id: c.name, name: c.name, shapes: c.shapes })),
    medium: COUNTRY_POOLS.medium.map((c) => ({ id: c.name, name: c.name, shapes: c.shapes })),
    hard: COUNTRY_POOLS.hard.map((c) => ({ id: c.name, name: c.name, shapes: c.shapes })),
  },
  capitals: (["easy", "medium", "hard"] as Difficulty[]).reduce(
    (pools, d) => {
      pools[d] = CAPITALS.filter((c) => c.country.fame === FAME_FOR[d]).map((c) => ({
        id: c.code,
        name: c.capital,
        // Easy and Medium say which country; Hard leaves you to know.
        hint: d === "hard" ? undefined : c.country.name,
        answerNote: c.country.name,
        point: [c.lon, c.lat] as [number, number],
      }));
      return pools;
    },
    {} as Record<Difficulty, Target[]>,
  ),
};

export function pickTargets(mode: PinMode, difficulty: Difficulty, count: number): Target[] {
  const pool = [...TARGET_POOLS[mode][difficulty]];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
