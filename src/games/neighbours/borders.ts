import { editDistance, normalize } from "@/games/name-the-city/match";
import { WORLD_COUNTRIES, type Fame } from "@/lib/geo/countries";
import { SHAPE_NEIGHBOURS } from "@/lib/geo/world";

/* Land borders between every country, microstates included, worked out from
   the shared edges in the map outline file. */

export type Place = { name: string; shapes: string[]; aliases: string[]; fame: Fame };

export const PLACES: Place[] = [
  ...WORLD_COUNTRIES,
  // Not a country in our lists, but its borders are part of Morocco's, Algeria's and Mauritania's.
  { name: "Western Sahara", shapes: ["W. Sahara"], aliases: [], fame: "obscure" },
];

export const BY_NAME = new Map(PLACES.map((p) => [p.name, p]));
const BY_SHAPE = new Map(PLACES.flatMap((p) => p.shapes.map((s) => [s, p] as const)));

/** Borders that only exist through a far-away overseas territory. */
const NOT_REALLY = new Set(["France|Brazil", "France|Suriname"]);

const NEIGHBOURS = new Map<string, Set<string>>(PLACES.map((p) => [p.name, new Set()]));
for (const place of PLACES) {
  for (const shape of place.shapes) {
    for (const otherShape of SHAPE_NEIGHBOURS.get(shape) ?? []) {
      const other = BY_SHAPE.get(otherShape);
      if (!other || other === place) continue;
      if (NOT_REALLY.has(`${place.name}|${other.name}`) || NOT_REALLY.has(`${other.name}|${place.name}`)) {
        continue;
      }
      NEIGHBOURS.get(place.name)!.add(other.name);
      NEIGHBOURS.get(other.name)!.add(place.name);
    }
  }
}

export function neighboursOf(name: string): string[] {
  return [...(NEIGHBOURS.get(name) ?? [])].sort();
}

const KEYS = PLACES.map((place) => ({ place, keys: [place.name, ...place.aliases].map(normalize) }));

function allowedTypos(length: number): number {
  if (length <= 5) return 0;
  if (length <= 8) return 1;
  return 2;
}

/** The place a typed name means, allowing small typos and other names. */
export function findPlace(text: string): Place | null {
  const key = normalize(text);
  if (!key) return null;
  const exact = KEYS.find((k) => k.keys.includes(key));
  if (exact) return exact.place;
  let best: Place | null = null;
  let bestDistance = Infinity;
  for (const { place, keys } of KEYS) {
    for (const k of keys) {
      const budget = allowedTypos(k.length);
      if (budget === 0 || Math.abs(k.length - key.length) > budget) continue;
      const d = editDistance(key, k);
      if (d <= budget && d < bestDistance) {
        bestDistance = d;
        best = place;
      }
    }
  }
  return best;
}
