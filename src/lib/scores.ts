"use client";

import { useMemo, useSyncExternalStore } from "react";

/* Best scores for every game except Name the City (which keeps its own
   store), saved in the browser. One entry per game and per setup. */

export type Result = {
  score: number;
  max: number;
  timeMs: number;
  /** ISO timestamp of when the run finished. */
  date: string;
};

type Store = Record<string, Record<string, Result>>;

const STORAGE_KEY = "meridian.scores.v1";
const CHANGE_EVENT = "meridian:game-scores-changed";

function parse(raw: string | null): Store {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? (data as Store) : {};
  } catch {
    return {};
  }
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** More points wins; equal points are decided by the faster time. */
export function isBetter(a: Result, b: Result | undefined): boolean {
  if (!b) return true;
  if (a.score !== b.score) return a.score > b.score;
  return a.timeMs < b.timeMs;
}

export function saveResult(
  game: string,
  setup: string,
  result: Result,
): { isBest: boolean; previousBest?: Result } {
  const store = parse(readRaw());
  const previousBest = store[game]?.[setup];
  const isBest = isBetter(result, previousBest);
  if (isBest) {
    try {
      const next: Store = { ...store, [game]: { ...store[game], [setup]: result } };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      // Storage can be unavailable (private mode, quota). The game still works.
    }
  }
  return { isBest, previousBest };
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Saved bests for one game, keyed by setup. Empty during server rendering. */
export function useBests(game: string): Record<string, Result> {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => parse(raw)[game] ?? {}, [raw, game]);
}

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
