import { editDistance, normalize } from "@/games/name-the-city/match";
import { WORLD_COUNTRIES, type WorldCountry } from "@/lib/geo/countries";

/* Which country is the Outline on a given day.

   Every country appears once per cycle, in a shuffled order that is the same
   for everyone. Where one cycle hands over to the next, no country may come
   back within MIN_GAP days. */

const FIRST_DAY = "2026-11-18";
const MIN_GAP = 14;

const POOL: WorldCountry[] = [...WORLD_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cycles = new Map<number, number[]>();

/** The order of the pool (as indexes) for one cycle. */
function cycleOrder(cycle: number): number[] {
  const cached = cycles.get(cycle);
  if (cached) return cached;

  const random = seeded(hash(`meridian-outline-cycle-${cycle}`));
  const order = POOL.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  // Keep the start of this cycle clear of the end of the last one.
  if (cycle > 0) {
    const previous = cycleOrder(cycle - 1);
    const recent = new Set(previous.slice(-MIN_GAP));
    for (let i = 0; i < MIN_GAP; i++) {
      if (!recent.has(order[i])) continue;
      for (let k = MIN_GAP; k < order.length; k++) {
        if (!recent.has(order[k])) {
          [order[i], order[k]] = [order[k], order[i]];
          break;
        }
      }
    }
  }
  cycles.set(cycle, order);
  return order;
}

export function outlineNumber(day: string): number {
  const ms = Date.parse(`${day}T00:00:00Z`) - Date.parse(`${FIRST_DAY}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

/** The country for a day (YYYY-MM-DD). */
export function countryForDay(day: string): WorldCountry {
  const index = Math.max(0, outlineNumber(day) - 1);
  const cycle = Math.floor(index / POOL.length);
  return POOL[cycleOrder(cycle)[index % POOL.length]];
}

/* ---------- Guesses ---------- */

const KEYS = POOL.map((country) => ({
  country,
  keys: [country.name, ...country.aliases].map(normalize),
}));

function allowedTypos(length: number): number {
  if (length <= 5) return 0;
  if (length <= 8) return 1;
  return 2;
}

/** The country a typed guess means, if any. */
export function findCountry(text: string): WorldCountry | null {
  const key = normalize(text);
  if (!key) return null;
  const exact = KEYS.find((k) => k.keys.includes(key));
  if (exact) return exact.country;
  let best: WorldCountry | null = null;
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


/** Every country name, for the guess box's suggestions. */
export const COUNTRY_NAMES = POOL.map((c) => c.name);
