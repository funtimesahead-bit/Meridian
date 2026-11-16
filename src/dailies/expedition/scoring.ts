import { editDistance, normalize } from "@/games/name-the-city/match";
import { KNOWN_NAMES, type Answer, type Prompt } from "./prompts";
import { variants } from "./broad";

/* How rare an answer is, and what it is worth.

   An answer's share mixes two things: the hand-set weights (a judgement of
   how commonly each answer comes to mind) and real Quick Fire answers.
   With little data the weights lead. As data comes in it gains influence,
   but the weights never drop below JUDGEMENT_FLOOR, because a small
   player base can be lopsided. */

/** How many players' worth of data the hand-set weights count as. */
export const PRIOR_PLAYERS = 30;
/** The least say the hand-set weights ever have, however much data there is. */
export const JUDGEMENT_FLOOR = 0.4;
export const MAX_POINTS = 100;

/** Below this many real players, rarities are shown as estimates. */
export const LIVE_THRESHOLD = 20;

export type Tier = "common" | "uncommon" | "rare" | "legendary";

export const TIERS: Record<Tier, { label: string; square: string }> = {
  common: { label: "Common", square: "⬜" },
  uncommon: { label: "Uncommon", square: "🟦" },
  rare: { label: "Rare", square: "🟪" },
  legendary: { label: "Legendary", square: "🟨" },
};

export const MISSED_SQUARE = "⬛";

/** Real answer counts for one stop: answer id -> number of players. */
export type StopCounts = Record<string, number>;

/** Share of players (0 to 1) expected to give each answer. */
export function shares(prompt: Prompt, counts: StopCounts = {}): Map<string, number> {
  const totalWeight = prompt.answers.reduce((sum, a) => sum + a.weight, 0);
  const realTotal = prompt.answers.reduce((sum, a) => sum + (Number(counts[a.id]) || 0), 0);
  // How much the hand-set weights count: all of it with no data, falling
  // as data arrives, but never below the floor.
  const judgement =
    realTotal === 0
      ? 1
      : Math.max(JUDGEMENT_FLOOR, PRIOR_PLAYERS / (PRIOR_PLAYERS + realTotal));
  return new Map(
    prompt.answers.map((a) => {
      const guessed = a.weight / totalWeight;
      const observed = realTotal ? (Number(counts[a.id]) || 0) / realTotal : 0;
      return [a.id, judgement * guessed + (1 - judgement) * observed];
    }),
  );
}

export function tierFor(share: number): Tier {
  if (share >= 0.2) return "common";
  if (share >= 0.08) return "uncommon";
  if (share >= 0.02) return "rare";
  return "legendary";
}

/** 1% of players or fewer is worth 100; the most obvious answers about 10–15. */
export function pointsFor(share: number): number {
  const rarity = Math.log(1 / Math.max(share, 1e-6)) / Math.log(100);
  return Math.round(MAX_POINTS * Math.min(1, Math.max(0.05, rarity)));
}

function allowedTypos(length: number): number {
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  return 2;
}

/** The answer a typed guess refers to, if it is one of this prompt's answers. */
export function matchAnswer(prompt: Prompt, text: string): Answer | null {
  const key = normalize(text);
  if (!key) return null;
  // "The Nile", "Mt Fuji" and "River Thames" should find Nile, Fuji and Thames.
  const typed = [...new Set(variants(text.trim()).map(normalize).filter(Boolean))];
  for (const k of typed) {
    const exact = prompt.answers.find((a) => a.keys.includes(k));
    if (exact) return exact;
  }
  // A real name of something else is a wrong answer, not a typo.
  if (typed.some((k) => KNOWN_NAMES.has(k))) return null;

  let best: Answer | null = null;
  let bestDistance = Infinity;
  for (const answer of prompt.answers) {
    for (const k of answer.typoKeys ?? answer.keys) {
      const budget = allowedTypos(k.length);
      if (budget === 0 || Math.abs(k.length - key.length) > budget) continue;
      const d = editDistance(key, k);
      if (d <= budget && d < bestDistance) {
        bestDistance = d;
        best = answer;
      }
    }
  }
  return best;
}
