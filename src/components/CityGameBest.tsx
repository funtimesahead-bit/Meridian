"use client";

import { DIFFICULTIES } from "@/games/name-the-city/cities";
import { useScores } from "@/games/name-the-city/scores";

/** One-line summary of the player's saved scores, for the Games tab card. */
export function CityGameBest() {
  const { best, history } = useScores();
  const runs = Object.values(best);
  if (runs.length === 0) {
    return <span className="card-best">Not played yet</span>;
  }

  const top = runs.reduce((a, b) =>
    b.score / b.maxScore > a.score / a.maxScore ? b : a,
  );
  const label = DIFFICULTIES.find((d) => d.id === top.difficulty)?.label;

  return (
    <span className="card-best">
      Best{" "}
      <strong className="mono">
        {top.score}/{top.maxScore}
      </strong>{" "}
      · {label} {top.length}
      {history.length > 1 ? ` · ${history.length} plays` : ""}
    </span>
  );
}
