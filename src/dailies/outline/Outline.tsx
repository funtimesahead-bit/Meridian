"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import MapCanvas, { type MapFocus } from "@/components/map/MapCanvas";
import { gameStyles as ui } from "@/components/game/GameUi";
import { countryGeometry } from "@/lib/geo/world";
import { today } from "@/lib/day";
import { COUNTRY_NAMES, countryForDay, findCountry, outlineNumber } from "./schedule";
import { SIZE, silhouette } from "./shape";
import styles from "./Outline.module.css";

const MAX_GUESSES = 5;
const POINTS = [100, 80, 60, 40, 20];
const STORE_KEY = "meridian.outline.v1";

type DayResult = { guesses: string[]; solved: boolean; done: boolean };
type Store = { days: Record<string, DayResult> };

function readStore(): Store {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as Partial<Store>;
      if (data.days && typeof data.days === "object") return { days: data.days };
    }
  } catch {
    // Start fresh.
  }
  return { days: {} };
}

function writeStore(store: Store) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Works without saving; it just will not survive a reload.
  }
}

function previousDay(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function stats(store: Store, day: string) {
  const results = Object.values(store.days).filter((r) => r.done);
  const wins = results.filter((r) => r.solved);
  // Current streak: solved days running back from today (or yesterday, if today is not done).
  let streak = 0;
  let cursor = store.days[day]?.done ? day : previousDay(day);
  while (store.days[cursor]?.solved) {
    streak++;
    cursor = previousDay(cursor);
  }
  const distribution = POINTS.map((_, i) => wins.filter((r) => r.guesses.length === i + 1).length);
  return {
    played: results.length,
    winRate: results.length ? Math.round((wins.length / results.length) * 100) : 0,
    streak,
    distribution,
  };
}

function untilMidnight(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const minutes = Math.max(0, Math.round((next.getTime() - now.getTime()) / 60000));
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function Outline() {
  const [day] = useState(today);
  const country = useMemo(() => countryForDay(day), [day]);
  const shape = useMemo(() => silhouette(country), [country]);
  const number = outlineNumber(day);

  const [store, setStore] = useState<Store>({ days: {} });
  const [guess, setGuess] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStore(readStore());
  }, []);

  const result: DayResult = store.days[day] ?? { guesses: [], solved: false, done: false };
  const score = result.solved ? POINTS[result.guesses.length - 1] : 0;

  useEffect(() => {
    if (!result.done) inputRef.current?.focus({ preventScroll: true });
  }, [result.done]);

  const save = (next: DayResult) => {
    const updated = { days: { ...store.days, [day]: next } };
    setStore(updated);
    writeStore(updated);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (result.done || !guess.trim()) return;
    const guessed = findCountry(guess);
    if (!guessed) {
      setNotice(`“${guess.trim()}” isn't a country we know. That didn't count as a guess.`);
      setShaking(true);
      return;
    }
    if (result.guesses.includes(guessed.name)) {
      setNotice(`You already guessed ${guessed.name}.`);
      setShaking(true);
      setGuess("");
      return;
    }
    const guesses = [...result.guesses, guessed.name];
    const solved = guessed.name === country.name;
    const done = solved || guesses.length >= MAX_GUESSES;
    save({ guesses, solved, done });
    setGuess("");
    setNotice(solved ? null : done ? null : `Not ${guessed.name}.`);
    if (!solved) setShaking(true);
  };

  const s = stats(store, day);
  const squares = [
    ...result.guesses.map((g) => (g === country.name ? "🟩" : "🟥")),
    ...Array(MAX_GUESSES - result.guesses.length).fill("⬛"),
  ].join("");
  const shareText = `Meridian Outline #${number} · ${
    result.solved ? `${result.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`
  }\n${squares}\n${typeof window !== "undefined" ? window.location.origin : ""}/dailies/outline`;

  const focus: MapFocus = useMemo(
    () => ({
      key: country.name,
      geo: country.shapes.length ? countryGeometry(country.shapes) : undefined,
      pad: 4,
      maxZoom: 6,
    }),
    [country],
  );

  return (
    <div className={styles.page}>
      <Link href="/dailies" className={ui.back}>
        ← Dailies
      </Link>
      <div className={styles.head}>
        <h1 className={styles.title}>
          Outline <span className="mono">#{number}</span>
        </h1>
        <p className={styles.lede}>Which country is this? Five guesses; the sooner you get it, the more it scores.</p>
      </div>

      <div className={styles.layout}>
        <div className={styles.stage}>
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className={`${styles.shape} ${result.done ? (result.solved ? styles.won : styles.lost) : ""}`}
            role="img"
            aria-label="The outline of today's country"
          >
            {shape.zone && <path d={shape.zone} className={styles.zoneEdge} />}
            {shape.zone && <path d={shape.zone} className={styles.zone} />}
            {shape.land && <path d={shape.land} className={styles.land} />}
            {shape.islands.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={3.2} className={styles.island} />
            ))}
          </svg>
          {shape.zone && (
            <p className={styles.caption}>Islands with their surrounding sea zone (200 nautical miles).</p>
          )}
        </div>

        <div className={styles.panel}>
          <ol className={styles.guesses} aria-label="Your guesses">
            {Array.from({ length: MAX_GUESSES }, (_, i) => {
              const g = result.guesses[i];
              const right = g === country.name;
              return (
                <li
                  key={i}
                  className={`${styles.guess} ${g ? (right ? styles.right : styles.wrong) : ""}`}
                >
                  <span className={styles.guessNo}>{i + 1}</span>
                  <span className={styles.guessText}>{g ?? ""}</span>
                  {g && <span aria-hidden="true">{right ? "✓" : "✕"}</span>}
                </li>
              );
            })}
          </ol>

          {!result.done ? (
            <form onSubmit={submit} className={styles.form}>
              <div className={ui.inputRow}>
                <input
                  ref={inputRef}
                  list="outline-countries"
                  className={`${ui.input} ${shaking ? ui.shake : ""}`}
                  onAnimationEnd={() => setShaking(false)}
                  value={guess}
                  onChange={(e) => {
                    setGuess(e.target.value);
                    if (notice) setNotice(null);
                  }}
                  placeholder="Type a country"
                  aria-label="Your guess"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button type="submit" className={ui.primaryButton} disabled={!guess.trim()}>
                  Guess
                </button>
              </div>
              <datalist id="outline-countries">
                {COUNTRY_NAMES.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <p className={styles.status} aria-live="polite">
                {notice ?? `${MAX_GUESSES - result.guesses.length} guesses left · worth ${POINTS[result.guesses.length]} now`}
              </p>
            </form>
          ) : (
            <div className={styles.result} aria-live="polite">
              <p className={styles.verdict}>
                {result.solved ? (
                  <>
                    Got it in <strong>{result.guesses.length}</strong>:{" "}
                  </>
                ) : (
                  <>It was </>
                )}
                <strong className={styles.answer}>{country.name}</strong>
              </p>
              <p className={styles.points}>
                <span className="mono">{score}</span> / 100 points
              </p>
              <p className={styles.squares}>{squares}</p>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={ui.primaryButton}
                  onClick={() =>
                    navigator.clipboard
                      ?.writeText(shareText)
                      .then(() => setCopied(true))
                      .catch(() => setCopied(false))
                  }
                >
                  {copied ? "Copied" : "Copy result"}
                </button>
                <span className={styles.next}>Next Outline in {untilMidnight()}</span>
              </div>
            </div>
          )}

          <dl className={styles.stats}>
            <div>
              <dt>Played</dt>
              <dd className="mono">{s.played}</dd>
            </div>
            <div>
              <dt>Solved</dt>
              <dd className="mono">{s.winRate}%</dd>
            </div>
            <div>
              <dt>Streak</dt>
              <dd className="mono">{s.streak}</dd>
            </div>
          </dl>
        </div>
      </div>

      {result.done && (
        <div className={styles.locator} onMouseDown={(e) => e.preventDefault()}>
          <MapCanvas
            scene="world"
            countries={country.shapes.map((name) => ({ name, tone: "accent" as const }))}
            markers={
              country.point
                ? [{ id: "c", lon: country.point[0], lat: country.point[1], tone: "accent", size: 5, pulse: true }]
                : []
            }
            focus={focus}
            ariaLabel={`Where ${country.name} is on the world map`}
          />
        </div>
      )}
    </div>
  );
}
