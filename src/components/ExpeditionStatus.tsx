"use client";

import { useSyncExternalStore } from "react";

/* Today's Expedition number and whether this browser has played it.
   Kept free of the game's own modules so the Dailies page stays light. */

const FIRST_DAY = "2026-11-19";
const STOPS = 8;

function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function read(): string {
  const day = today();
  const number =
    Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${FIRST_DAY}T00:00:00Z`)) / 86_400_000) + 1;
  try {
    const raw = window.localStorage.getItem(`meridian.expedition.v1.${day}`);
    const stops: { points?: number }[] = raw ? (JSON.parse(raw).stops ?? []) : [];
    if (stops.length >= STOPS) {
      const total = stops.reduce((sum, s) => sum + (s.points ?? 0), 0);
      return `#${number} · done · ${total} pts`;
    }
    if (stops.length > 0) return `#${number} · stop ${stops.length + 1} of ${STOPS}`;
  } catch {
    // Show the plain label.
  }
  return `#${number} · not played yet`;
}

const subscribe = () => () => {};

export function ExpeditionStatus() {
  const label = useSyncExternalStore(subscribe, read, () => "Today’s expedition");
  return <span className="card-best">{label}</span>;
}
