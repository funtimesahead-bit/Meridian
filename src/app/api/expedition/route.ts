import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/* Answer counts for the daily Expedition, kept in Upstash Redis.

   GET  /api/expedition?day=YYYY-MM-DD   -> how many players gave each answer
   POST /api/expedition { day, player, answers } -> record one finished run

   Without Redis settings the game still works; it just uses the hand-set
   rarities. */

export const dynamic = "force-dynamic";

const STOPS = 8;
const KEEP_SECONDS = 400 * 24 * 60 * 60;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const ANSWER_ID = /^[a-z0-9]{1,48}$/;
const PLAYER_ID = /^[a-z0-9-]{8,64}$/;

function connect(): Redis | null {
  // Vercel's Upstash integration may name these either way.
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

const playersKey = (day: string) => `exp:${day}:players`;
const stopKey = (day: string, stop: number) => `exp:${day}:s${stop}`;

/** Players around the world are on different dates, so allow a day either side. */
function isCurrentDay(day: string): boolean {
  const ms = Date.parse(`${day}T12:00:00Z`);
  return Number.isFinite(ms) && Math.abs(ms - Date.now()) < 2 * 86_400_000;
}

export async function GET(request: Request) {
  const day = new URL(request.url).searchParams.get("day") ?? "";
  if (!DAY.test(day)) {
    return NextResponse.json({ error: "Bad day" }, { status: 400 });
  }
  const redis = connect();
  if (!redis) return NextResponse.json({ live: false, players: 0, stops: [] });

  try {
    const pipe = redis.pipeline();
    pipe.scard(playersKey(day));
    for (let i = 0; i < STOPS; i++) pipe.hgetall(stopKey(day, i));
    const [players, ...stops] = await pipe.exec();
    return NextResponse.json(
      {
        live: true,
        players: Number(players) || 0,
        stops: stops.map((s) => (s && typeof s === "object" ? s : {})),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ live: false, players: 0, stops: [] });
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
