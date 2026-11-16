import { editDistance, normalize } from "@/games/name-the-city/match";
import type { Answer, Prompt } from "./prompts";

/* How rare an answer is, and what it is worth.

   Each prompt starts with PRIOR_PLAYERS imaginary players spread across the
   answers by their hand-set weights. Real players' answers are added on top,
   so as more people play, the real numbers take over. */

export const PRIOR_PLAYERS = 30;
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
  const realTotal = prompt.answers.reduce((sum, a) => sum + (counts[a.id] ?? 0), 0);
  const all = PRIOR_PLAYERS + realTotal;
  return new Map(
    prompt.answers.map((a) => [
      a.id,
      ((PRIOR_PLAYERS * a.weight) / totalWeight + (counts[a.id] ?? 0)) / all,
    ]),
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
  const exact = prompt.answers.find((a) => a.keys.includes(key));
  if (exact) return exact;

  let best: Answer | null = null;
  let bestDistance = Infinity;
  for (const answer of prompt.answers) {
    for (const k of answer.keys) {
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
