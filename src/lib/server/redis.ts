import { Redis } from "@upstash/redis";

/* Shared Upstash Redis access for the API routes. Server-side only.

   Rarity data (how often each answer is given to a prompt) comes only from
   Quick Fire, where people answer plainly. Expedition answers are stored
   under their own keys and never mixed in, because Expedition players aim
   for rare answers on purpose. */

export const KEEP_SECONDS = 400 * 24 * 60 * 60;

export const PROMPT_ID = /^[a-z0-9-]{1,64}$/;
export const ANSWER_ID = /^[a-z0-9]{1,48}$/;
export const PLAYER_ID = /^[a-z0-9-]{8,64}$/;

export function connect(): Redis | null {
  // Vercel's Upstash integration may name these either way.
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

/** answer id -> how many Quick Fire players gave it, for one prompt. */
export const rarityKey = (promptId: string) => `rarity:${promptId}`;
/** Players who have answered a prompt in Quick Fire; each counts once. */
export const rarityPlayersKey = (promptId: string) => `rarity:${promptId}:players`;
