"use client";

import { useBests } from "@/lib/scores";

const LABELS: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

/** "easy-10" -> "Easy 10". */
function setupLabel(setup: string): string {
  const [first, ...rest] = setup.split("-");
  return [LABELS[first] ?? first, ...rest].join(" ");
}

/** One-line summary of the player's best saved score for a game or quiz. */
export function GameBest({ scoreKey, showSetup = true }: { scoreKey: string; showSetup?: boolean }) {
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
        {top.score}/{top.max}
      </strong>
      {showSetup ? ` · ${setupLabel(setup)}` : ""}
    </span>
  );
}
