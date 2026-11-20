"use client";

import { useSyncExternalStore } from "react";
import type { Tier } from "./scoring";

/* Small sound effects for the Expedition, generated with the Web Audio API,
   so there are no audio files to load. Sound is on unless the player has
   muted it; the choice is remembered in this browser. */

const KEY = "meridian.sound";
const EVENT = "meridian:sound-changed";

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!soundOn()) return null;
  try {
    context ??= new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
}

function soundOn(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Not remembered, but still applies for this visit.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useSoundOn(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener(EVENT, onChange);
      return () => window.removeEventListener(EVENT, onChange);
    },
    soundOn,
    () => true,
  );
}

/** One short note with a quick attack and a smooth fade. */
function note(
  frequency: number,
  { at = 0, length = 0.12, volume = 0.12, type = "sine" as OscillatorType, slideTo = 0 } = {},
) {
  const ctx = audio();
  if (!ctx) return;
  const start = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + length);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

/** Notes of a major scale, for rising ticks. */
const SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24];
const pitch = (step: number, base = 330) => base * Math.pow(2, SCALE[Math.min(step, SCALE.length - 1)] / 12);

export const sounds = {
  /** A soft tick while the gauge climbs; higher as it goes. */
  climb(step: number) {
    note(pitch(step), { length: 0.07, volume: 0.05, type: "triangle" });
  },
  /** Passing into a new tier on the way up. */
  band(level: number) {
    note(pitch(level * 3 + 4), { length: 0.16, volume: 0.09, type: "triangle" });
  },
  /** Where the answer landed: brighter and fuller the rarer it was. */
  land(tier: Tier) {
    const chords: Record<Tier, number[]> = {
      common: [262, 330],
      uncommon: [294, 370, 440],
      rare: [330, 415, 494, 659],
      legendary: [392, 494, 587, 784, 988],
    };
    chords[tier].forEach((f, i) =>
      note(f, { at: i * 0.06, length: 0.5 + i * 0.05, volume: 0.07, type: i ? "sine" : "triangle" }),
    );
    if (tier === "legendary") {
      // A little sparkle on top.
      [1319, 1568, 1976, 2349].forEach((f, i) =>
        note(f, { at: 0.3 + i * 0.07, length: 0.18, volume: 0.035 }),
      );
    }
  },
  /** Out of time: a low, dull drop. */
  timeout() {
    note(180, { length: 0.35, volume: 0.12, type: "sawtooth", slideTo: 70 });
  },
  /** A pop for each square on the results screen. */
  pop(tier: Tier | null, index: number) {
    if (!tier) {
      note(140, { length: 0.12, volume: 0.06, type: "triangle" });
      return;
    }
    const lift = { common: 0, uncommon: 2, rare: 4, legendary: 7 }[tier];
    note(pitch(index + lift, 392), { length: 0.12, volume: 0.07, type: "triangle" });
  },
  /** The final total settles. */
  finale() {
    [523, 659, 784, 1047].forEach((f, i) => note(f, { at: i * 0.09, length: 0.4, volume: 0.06 }));
  },
};

/** Start the audio inside a click or key press, so later sounds may play. */
export function primeSound() {
  audio();
}
