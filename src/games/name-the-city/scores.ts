"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Difficulty, QuizLength } from "./cities";

/** One finished quiz. */
export type Run = {
  difficulty: Difficulty;
  length: QuizLength;
  score: number;
  maxScore: number;
  correct: number;
  timeMs: number;
  /** ISO timestamp of when the run finished. */
  date: string;
};

export type ScoreStore = {
  /** Best run per "difficulty-length" combination. */
  best: Record<string, Run>;
  /** Most recent runs, newest first. */
  history: Run[];
};

const STORAGE_KEY = "meridian.name-the-city.v1";
const CHANGE_EVENT = "meridian:scores-changed";
const HISTORY_LIMIT = 30;
const EMPTY: ScoreStore = { best: {}, history: [] };

export function comboKey(difficulty: Difficulty, length: QuizLength): string {
  return `${difficulty}-${length}`;
}

function parse(raw: string | null): ScoreStore {
  if (!raw) return EMPTY;
  try {
    const data = JSON.parse(raw) as Partial<ScoreStore>;
    return {
      best: data.best && typeof data.best === "object" ? data.best : {},
      history: Array.isArray(data.history) ? data.history : [],
    };
  } catch {
    return EMPTY;
  }
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** True when `a` beats `b`: more points, or the same points in less time. */
export function isBetter(a: Run, b: Run | undefined): boolean {
  if (!b) return true;
  if (a.score !== b.score) return a.score > b.score;
  return a.timeMs < b.timeMs;
}

/** Save a finished run. Returns whether it is a new personal best and what it replaced. */
export function saveRun(run: Run): { isBest: boolean; previousBest?: Run } {
  const store = parse(readRaw());
  const key = comboKey(run.difficulty, run.length);
  const previousBest = store.best[key];
  const isBest = isBetter(run, previousBest);

  const next: ScoreStore = {
    best: isBest ? { ...store.best, [key]: run } : store.best,
    history: [run, ...store.history].slice(0, HISTORY_LIMIT),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Storage can be unavailable (private mode, quota). The game still works.
  }
  return { isBest, previousBest };
}

export function clearScores(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Nothing to clear.
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Saved scores, kept in sync across tabs. Empty during server rendering. */
export function useScores(): ScoreStore {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => parse(raw), [raw]);
}

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
