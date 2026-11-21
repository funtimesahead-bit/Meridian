import { WORLD_COUNTRIES, type WorldCountry } from "@/lib/geo/countries";
import codes from "@/quizzes/flags/codes.json";

/* Which flag is the Unfurl on a given day, and the order its tiles open.

   Every country with a flag appears once per cycle, in a shuffled order that
   is the same for everyone, with no repeat within MIN_GAP days across cycles. */

export const FIRST_DAY = "2026-11-20";
const MIN_GAP = 14;

const CODES = codes as Record<string, string>;

/** Flags that are near copies of another country's, so a tile or two can't tell them apart. */
const LOOKALIKES: Record<string, string[]> = {
  Chad: ["Romania"],
  Romania: ["Chad"],
  Monaco: ["Indonesia"],
  Indonesia: ["Monaco"],
};

export type FlagCountry = WorldCountry & { flag: string };

const POOL: FlagCountry[] = WORLD_COUNTRIES.filter((c) => CODES[c.name])
  .map((c) => ({ ...c, flag: `/flags/world/${CODES[c.name]}.svg` }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** Guesses that also count, because the flag is all but identical. */
export function alsoAccepted(name: string): string[] {
  return LOOKALIKES[name] ?? [];
}

export const COLS = 6;
export const ROWS = 4;
export const TILES = COLS * ROWS;

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

function shuffled(count: number, random: () => number): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

const cycles = new Map<number, number[]>();

function cycleOrder(cycle: number): number[] {
  const cached = cycles.get(cycle);
  if (cached) return cached;
  const order = shuffled(POOL.length, seeded(hash(`meridian-unfurl-cycle-${cycle}`)));
  if (cycle > 0) {
    const recent = new Set(cycleOrder(cycle - 1).slice(-MIN_GAP));
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

export function unfurlNumber(day: string): number {
  const ms = Date.parse(`${day}T00:00:00Z`) - Date.parse(`${FIRST_DAY}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

export function flagForDay(day: string): FlagCountry {
  const index = Math.max(0, unfurlNumber(day) - 1);
  const cycle = Math.floor(index / POOL.length);
  return POOL[cycleOrder(cycle)[index % POOL.length]];
}

/** The order the tiles open in on a day; the same for everyone. */
export function tileOrder(day: string): number[] {
  return shuffled(TILES, seeded(hash(`meridian-unfurl-tiles-${day}`)));
}
