"use client";

import { useBests } from "@/lib/scores";

const LABELS: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  map: "With map",
  EU: "Europe",
  AS: "Asia",
  AF: "Africa",
  NA: "North America",
  SA: "South America",
  OC: "Oceania",
  "60": "1 min",
  "120": "2 min",
  list: "No map",
};

/** "easy-10" -> "Easy 10". */
function setupLabel(setup: string): string {
  return setup
    .split("-")
    .map((part) => LABELS[part] ?? part)
    .join(" ");
}

/** One-line summary of the player's best saved score for a game or quiz. */
export function GameBest({
  scoreKey,
  showSetup = true,
  percent = false,
}: {
  scoreKey: string;
  showSetup?: boolean;
  /** Show the best as a percentage (scores saved out of 100). */
  percent?: boolean;
}) {
  const bests = Object.entries(useBests(scoreKey));
  if (bests.length === 0) {
    return <span className="card-best">Not played yet</span>;
  }
  const [setup, top] = bests.reduce((a, b) =>
    b[1].score / b[1].max > a[1].score / a[1].max ? b : a,
  );
  return (
    <span className="card-best">
      Best{" "}
      <strong className="mono">
        {percent ? `${top.score}%` : `${top.score}/${top.max}`}
      </strong>
      {showSetup ? ` · ${setupLabel(setup)}` : ""}
    </span>
  );
}
