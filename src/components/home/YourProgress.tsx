"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import styles from "@/app/home.module.css";

/* A short line about the visitor's saved scores, read from this browser. */

type Summary = { bests: number; games: number };

function read(): string {
  let bests = 0;
  const games = new Set<string>();
  try {
    const raw = window.localStorage.getItem("meridian.scores.v1");
    const store = raw ? (JSON.parse(raw) as Record<string, Record<string, unknown>>) : {};
    for (const [game, setups] of Object.entries(store)) {
      const n = Object.keys(setups ?? {}).length;
      if (n > 0) {
        bests += n;
        games.add(game);
      }
    }
    const city = window.localStorage.getItem("meridian.name-the-city.v1");
    const cityBest = city ? Object.keys(JSON.parse(city).best ?? {}).length : 0;
    if (cityBest > 0) {
      bests += cityBest;
      games.add("name-the-city");
    }
  } catch {
    // No saved scores to show.
  }
  return JSON.stringify({ bests, games: games.size } satisfies Summary);
}

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

export function YourProgress() {
  const raw = useSyncExternalStore(subscribe, read, () => "");
  if (!raw) return null;
  const { bests, games } = JSON.parse(raw) as Summary;

  return (
    <div className={styles.progress}>
      {bests > 0 ? (
        <p>
          You have <strong className="mono">{bests}</strong> personal{" "}
          {bests === 1 ? "best" : "bests"} across <strong className="mono">{games}</strong>{" "}
          {games === 1 ? "game or quiz" : "games and quizzes"}, saved in this browser.{" "}
          <Link href="/games">Go beat one →</Link>
        </p>
      ) : (
        <p>
          No account needed: your best scores are saved in this browser as you play.
        </p>
      )}
    </div>
  );
}
