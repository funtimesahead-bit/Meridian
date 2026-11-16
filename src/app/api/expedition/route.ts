import { NextResponse } from "next/server";
import {
  ANSWER_ID,
  KEEP_SECONDS,
  PLAYER_ID,
  PROMPT_ID,
  connect,
  rarityKey,
  rarityPlayersKey,
} from "@/lib/server/redis";

/* The daily Expedition.

   GET  /api/expedition?prompts=id1,id2,...
        -> for each prompt, how many Quick Fire players gave each answer.
           Rarity comes from Quick Fire only (see src/lib/server/redis.ts).
   POST /api/expedition { day, player, answers }
        -> stores one finished Expedition run under its own keys, for
           reference. It does not change any rarity.

   Without Redis settings the game still works on hand-set rarities. */

export const dynamic = "force-dynamic";

const STOPS = 8;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const playersKey = (day: string) => `exp:${day}:players`;
const stopKey = (day: string, stop: number) => `exp:${day}:s${stop}`;

/** Players around the world are on different dates, so allow a day either side. */
function isCurrentDay(day: string): boolean {
  const ms = Date.parse(`${day}T12:00:00Z`);
  return Number.isFinite(ms) && Math.abs(ms - Date.now()) < 2 * 86_400_000;
}

export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("prompts") ?? "")
    .split(",")
    .filter(Boolean);
  if (ids.length === 0 || ids.length > 12 || !ids.every((id) => PROMPT_ID.test(id))) {
    return NextResponse.json({ error: "Bad prompts" }, { status: 400 });
  }
  const redis = connect();
  if (!redis) return NextResponse.json({ live: false, counts: [], players: [] });

  try {
    const pipe = redis.pipeline();
    for (const id of ids) {
      pipe.hgetall(rarityKey(id));
      pipe.scard(rarityPlayersKey(id));
    }
    const results = await pipe.exec();
    const counts = ids.map((_, i) => {
      const c = results[i * 2];
      return c && typeof c === "object" ? c : {};
    });
    const players = ids.map((_, i) => Number(results[i * 2 + 1]) || 0);
    return NextResponse.json(
      { live: true, counts, players },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ live: false, counts: [], players: [] });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad body" }, { status: 400 });
  }
  const { day, player, answers } = (body ?? {}) as {
    day?: unknown;
    player?: unknown;
    answers?: unknown;
  };
  if (
    typeof day !== "string" ||
    !DAY.test(day) ||
    !isCurrentDay(day) ||
    typeof player !== "string" ||
    !PLAYER_ID.test(player) ||
    !Array.isArray(answers) ||
    answers.length !== STOPS ||
    !answers.every((a) => a === null || (typeof a === "string" && ANSWER_ID.test(a)))
  ) {
    return NextResponse.json({ error: "Bad run" }, { status: 400 });
  }

  const redis = connect();
  if (!redis) return NextResponse.json({ saved: false });

  try {
    // Each player counts once per day.
    const added = await redis.sadd(playersKey(day), player);
    if (!added) return NextResponse.json({ saved: false, reason: "already played" });

    const pipe = redis.pipeline();
    pipe.expire(playersKey(day), KEEP_SECONDS);
    (answers as (string | null)[]).forEach((answer, stop) => {
      if (!answer) return;
      pipe.hincrby(stopKey(day, stop), answer, 1);
      pipe.expire(stopKey(day, stop), KEEP_SECONDS);
    });
    await pipe.exec();
    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json({ saved: false }, { status: 502 });
  }
}
