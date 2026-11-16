import { NextResponse } from "next/server";
import {
  ANSWER_ID,
  PLAYER_ID,
  PROMPT_ID,
  connect,
  rarityKey,
  rarityPlayersKey,
} from "@/lib/server/redis";

/* POST /api/quickfire { player, prompt, answer }
   Records one Quick Fire answer. Each player counts once per prompt, so
   replaying cannot pile up votes for one answer. */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad body" }, { status: 400 });
  }
  const { player, prompt, answer } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof player !== "string" ||
    !PLAYER_ID.test(player) ||
    typeof prompt !== "string" ||
    !PROMPT_ID.test(prompt) ||
    typeof answer !== "string" ||
    !ANSWER_ID.test(answer)
  ) {
    return NextResponse.json({ error: "Bad answer" }, { status: 400 });
  }

  const redis = connect();
  if (!redis) return NextResponse.json({ saved: false });

  try {
    const added = await redis.sadd(rarityPlayersKey(prompt), player);
    if (!added) return NextResponse.json({ saved: false, reason: "already answered" });
    await redis.hincrby(rarityKey(prompt), answer, 1);
    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json({ saved: false }, { status: 502 });
  }
}
