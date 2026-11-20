"use client";

import { useEffect, useRef, useState } from "react";
import { TIERS, type Tier } from "./scoring";
import { sounds } from "./sound";
import styles from "./Expedition.module.css";

/* The reveal for one stop: a climber rises up an altitude gauge from Common
   towards Legendary and stops at how rare the answer was. The points count
   up on the way, and the tier badge stamps down when it lands. */

/** Height on the gauge (0 to 1) for an answer given by this share of players.
    The same log scale as the points, so the climb matches the score. */
export function altitude(share: number): number {
  const rarity = Math.log(1 / Math.max(share, 1e-6)) / Math.log(100);
  return Math.min(1, Math.max(0, rarity));
}

/** Where each tier begins on the gauge, from the tier cut-offs. */
const BANDS: { tier: Tier; from: number }[] = [
  { tier: "common", from: 0 },
  { tier: "uncommon", from: altitude(0.2) },
  { tier: "rare", from: altitude(0.08) },
  { tier: "legendary", from: altitude(0.02) },
];

/** Index of the band a height on the gauge falls in. */
function bandAt(height: number): number {
  let band = 0;
  BANDS.forEach((b, i) => {
    if (i === 0 || height > b.from + 1e-9) band = i;
  });
  return band;
}

/** Distance from the bottom of the gauge for a height, leaving room for the climber. */
const gaugeY = (height: number) => `calc(6px + ${height} * (100% - 12px))`;

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Counts a number up to `target` over `ms`, from wherever it was. */
export function useCountUp(target: number, ms: number): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const begin = from.current;
    if (prefersReducedMotion() || begin === target) {
      from.current = target;
      setValue(target);
      return;
    }
    let frame = 0;
    const step = (time: number) => {
      const t = Math.min(1, (time - start) / ms);
      const v = Math.round(begin + (target - begin) * (1 - Math.pow(1 - t, 3)));
      from.current = v;
      setValue(v);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}

type Props = {
  tier: Tier | null;
  share: number;
  points: number;
  /** Called once the climber has landed, so the rest of the reveal can show. */
  onLanded: () => void;
  children: React.ReactNode;
};

export function Climb({ tier, share, points, onLanded, children }: Props) {
  const target = tier ? altitude(share) : 0;
  const duration = tier ? 500 + 1300 * target : 0;
  const [height, setHeight] = useState(() => (prefersReducedMotion() ? target : 0));
  const [landed, setLanded] = useState(false);
  const shownPoints = Math.round(points * (target > 0 ? height / target : 1));
  const landedRef = useRef(onLanded);
  landedRef.current = onLanded;

  useEffect(() => {
    const land = () => {
      setHeight(target);
      setLanded(true);
      if (tier) sounds.land(tier);
      else sounds.timeout();
      landedRef.current();
    };
    if (!tier || prefersReducedMotion()) {
      const id = window.setTimeout(land, tier ? 0 : 150);
      return () => window.clearTimeout(id);
    }
    let frame = 0;
    let lastTick = -1;
    let lastBand = 0;
    const start = performance.now();
    const step = (time: number) => {
      const t = Math.min(1, (time - start) / duration);
      const h = target * easeInOut(t);
      setHeight(h);
      const tick = Math.floor(h * 14);
      const band = bandAt(h);
      if (band > lastBand) {
        lastBand = band;
        sounds.band(band);
      } else if (tick > lastTick) {
        sounds.climb(tick);
      }
      lastTick = tick;
      if (t < 1) frame = requestAnimationFrame(step);
      else land();
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [tier, target, duration]);

  const current = tier ? (landed ? tier : BANDS[bandAt(height)].tier) : null;

  return (
    <div className={`${styles.climb} ${tier ? styles[tier] : styles.missed}`}>
      <div className={styles.gauge} aria-hidden="true">
        {BANDS.map((b, i) => (
          <div
            key={b.tier}
            className={`${styles.band} ${styles[b.tier]} ${current && BANDS.findIndex((x) => x.tier === current) >= i ? styles.bandLit : ""}`}
            style={{
              bottom: i === 0 ? 0 : gaugeY(b.from),
              top: i === BANDS.length - 1 ? 0 : `calc(100% - ${gaugeY(BANDS[i + 1].from)})`,
            }}
          >
            <span>{TIERS[b.tier].label}</span>
          </div>
        ))}
        <div className={styles.rope} style={{ height: `calc(6px + ${height} * (100% - 12px))` }} />
        <div
          className={`${styles.climber} ${current ? styles[current] : styles.missed} ${landed ? styles.climberLanded : ""}`}
          style={{ bottom: `calc(${height} * (100% - 12px))` }}
        />
      </div>
      <div className={styles.climbBody}>
        <div className={styles.climbTop}>
          <span
            className={`${styles.tier} ${styles.stamp} ${tier ? styles[tier] : styles.missed} ${landed ? styles.stamped : ""}`}
          >
            {tier ? TIERS[tier].label : "Out of time"}
            {landed && tier && tier !== "common" && <span className={styles.burst} />}
          </span>
          <p className={`mono ${styles.revealPoints} ${landed ? styles.pointsLanded : ""}`}>
            +{shownPoints}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
