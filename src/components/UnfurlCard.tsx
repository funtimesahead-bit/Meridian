"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { CardArt } from "@/components/CardArt";
import { today } from "@/lib/day";

/* The Unfurl card for the Dailies tab and the home page. Kept free of the
   game's own modules so those pages stay light. */

const FIRST_DAY = "2026-11-20";

function read(): string {
  const day = today();
  const number =
    Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${FIRST_DAY}T00:00:00Z`)) / 86_400_000) + 1;
  try {
    const raw = window.localStorage.getItem("meridian.unfurl.v1");
    const result = raw ? JSON.parse(raw).days?.[day] : null;
    if (result?.done) {
      return result.solved
        ? `#${number} · solved in ${result.guesses.length}`
        : `#${number} · not solved`;
    }
    if (result?.guesses?.length) return `#${number} · ${6 - result.guesses.length} guesses left`;
  } catch {
    // Show the plain label.
  }
  return `#${number} · not played yet`;
}

const subscribe = () => () => {};

export function UnfurlCard({ titleTag = "h2" }: { titleTag?: "h2" | "h3" }) {
  const label = useSyncExternalStore(subscribe, read, () => "Today's flag");
  const Title = titleTag;
  return (
    <Link href="/dailies/unfurl" className="game-card">
      <div className="game-card__art">
        <CardArt kind="unfurl" />
      </div>
      <div className="game-card__body">
        <Title className="game-card__title">Unfurl</Title>
        <p className="game-card__blurb">
          One flag a day, hidden under tiles. Every wrong guess lifts a few more. Name it in
          six.
        </p>
        <div className="tag-row">
          <span className="tag">Daily</span>
          <span className="tag">Flags</span>
        </div>
        <div className="game-card__foot">
          <span className="card-best">{label}</span>
          <span className="play-pill">Play</span>
        </div>
      </div>
    </Link>
  );
}
