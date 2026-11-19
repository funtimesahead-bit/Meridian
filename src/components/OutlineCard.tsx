"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { CardArt } from "@/components/CardArt";
import { today } from "@/lib/day";

/* The Outline card for the Dailies tab and the home page. Kept free of the
   game's own modules (and its map data) so those pages stay light. */

const FIRST_DAY = "2026-11-18";

function read(): string {
  const day = today();
  const number =
    Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${FIRST_DAY}T00:00:00Z`)) / 86_400_000) + 1;
  try {
    const raw = window.localStorage.getItem("meridian.outline.v1");
    const result = raw ? JSON.parse(raw).days?.[day] : null;
    if (result?.done) {
      return result.solved
        ? `#${number} · solved in ${result.guesses.length}`
        : `#${number} · not solved`;
    }
    if (result?.guesses?.length) return `#${number} · ${5 - result.guesses.length} guesses left`;
  } catch {
    // Show the plain label.
  }
  return `#${number} · not played yet`;
}

const subscribe = () => () => {};

export function OutlineCard({ titleTag = "h2" }: { titleTag?: "h2" | "h3" }) {
  const label = useSyncExternalStore(subscribe, read, () => "Today's country");
  const Title = titleTag;
  return (
    <Link href="/dailies/outline" className="game-card">
      <div className="game-card__art">
        <CardArt kind="outline" />
      </div>
      <div className="game-card__body">
        <Title className="game-card__title">Outline</Title>
        <p className="game-card__blurb">
          One country&apos;s silhouette a day. Name it in five guesses; the sooner, the more
          it scores.
        </p>
        <div className="tag-row">
          <span className="tag">Daily</span>
          <span className="tag">Countries</span>
          <span className="tag">Shapes</span>
        </div>
        <div className="game-card__foot">
          <span className="card-best">{label}</span>
          <span className="play-pill">Play</span>
        </div>
      </div>
    </Link>
  );
}
