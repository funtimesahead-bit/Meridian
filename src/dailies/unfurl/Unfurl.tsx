"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { gameStyles as ui } from "@/components/game/GameUi";
import { COUNTRY_NAMES, findCountry } from "@/dailies/outline/schedule";
import outline from "@/dailies/outline/Outline.module.css";
import { CONTINENTS, COUNTRY_INFO, codeOf } from "@/lib/geo/countryInfo";
import { today } from "@/lib/day";
import { TILES, alsoAccepted, flagForDay, tileOrder, unfurlNumber } from "./schedule";
import styles from "./Unfurl.module.css";

/* Unfurl: one flag a day, hidden under tiles. Each wrong guess lifts more of
   them. Name the country in six guesses. */

const MAX_GUESSES = 6;
const POINTS = [100, 80, 60, 45, 30, 15];
/** Tiles open before the first guess, and how many more each wrong guess opens. */
const START_TILES = 2;
const PER_GUESS = 4;
/** Wrong guesses before the continent is shown. */
const HINT_AFTER = 3;
const STORE_KEY = "meridian.unfurl.v1";

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
    // Works without saving; it just won't survive a reload.
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
  let streak = 0;
  let cursor = store.days[day]?.done ? day : previousDay(day);
  while (store.days[cursor]?.solved) {
    streak++;
    cursor = previousDay(cursor);
  }
  return {
    played: results.length,
    winRate: results.length ? Math.round((wins.length / results.length) * 100) : 0,
    streak,
  };
}

function untilMidnight(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const minutes = Math.max(0, Math.round((next.getTime() - now.getTime()) / 60000));
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function Unfurl() {
  const [day] = useState(today);
  const country = useMemo(() => flagForDay(day), [day]);
  const order = useMemo(() => tileOrder(day), [day]);
  const number = unfurlNumber(day);
  const continent = useMemo(() => {
    const code = codeOf(country);
    const c = code ? COUNTRY_INFO[code]?.continent : undefined;
    return CONTINENTS.find((x) => x.code === c)?.name;
  }, [country]);

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
  const wrongCount = result.guesses.length - (result.solved ? 1 : 0);
  const openCount = result.done ? TILES : Math.min(TILES, START_TILES + PER_GUESS * wrongCount);
  const open = new Set(order.slice(0, openCount));

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
    const solved = guessed.name === country.name || alsoAccepted(country.name).includes(guessed.name);
    // Store the real answer for a lookalike, so the result reads correctly.
    const guesses = [...result.guesses, solved ? country.name : guessed.name];
    const done = solved || guesses.length >= MAX_GUESSES;
    save({ guesses, solved, done });
    setGuess("");
    setNotice(
      solved && guessed.name !== country.name
        ? `${guessed.name}'s flag is almost the same, so that counts.`
        : solved || done
          ? null
          : `Not ${guessed.name}. ${PER_GUESS} more tiles lifted.`,
    );
    if (!solved) setShaking(true);
  };

  const s = stats(store, day);
  const squares = [
    ...result.guesses.map((g) => (g === country.name ? "🟩" : "🟥")),
    ...Array(MAX_GUESSES - result.guesses.length).fill("⬛"),
  ].join("");
  const shareText = `Meridian Unfurl #${number} · ${
    result.solved ? `${result.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`
  }\n${squares}\n${typeof window !== "undefined" ? window.location.origin : ""}/dailies/unfurl`;

  return (
    <div className={outline.page}>
      <Link href="/dailies" className={ui.back}>
        ← Dailies
      </Link>
      <div>
        <h1 className={outline.title}>
          Unfurl <span className="mono">#{number}</span>
        </h1>
        <p className={outline.lede}>
          Whose flag is under the tiles? Six guesses; every miss lifts {PER_GUESS} more tiles.
        </p>
      </div>

      <div className={outline.layout}>
        <div className={outline.stage}>
          <div className={styles.flag} role="img" aria-label={result.done ? `The flag of ${country.name}` : "Today's flag, partly hidden"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={country.flag} alt="" draggable={false} />
            <div className={styles.tiles} aria-hidden="true">
              {Array.from({ length: TILES }, (_, i) => (
                <span key={i} className={`${styles.tile} ${open.has(i) ? styles.open : ""}`} />
              ))}
            </div>
          </div>
          {!result.done && (
            <p className={styles.hint}>
              {wrongCount >= HINT_AFTER && continent ? (
                <>
                  Hint: it's in <strong>{continent}</strong>.
                </>
              ) : (
                `After ${HINT_AFTER} misses you get a hint.`
              )}
            </p>
          )}
        </div>

        <div className={outline.panel}>
          <ol className={outline.guesses} aria-label="Your guesses">
            {Array.from({ length: MAX_GUESSES }, (_, i) => {
              const g = result.guesses[i];
              const right = g === country.name;
              return (
                <li key={i} className={`${outline.guess} ${g ? (right ? outline.right : outline.wrong) : ""}`}>
                  <span className={outline.guessNo}>{i + 1}</span>
                  <span className={outline.guessText}>{g ?? ""}</span>
                  {g && <span aria-hidden="true">{right ? "✓" : "✕"}</span>}
                </li>
              );
            })}
          </ol>

          {!result.done ? (
            <form onSubmit={submit} className={outline.form}>
              <div className={ui.inputRow}>
                <input
                  ref={inputRef}
                  list="unfurl-countries"
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
              <datalist id="unfurl-countries">
                {COUNTRY_NAMES.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <p className={outline.status} aria-live="polite">
                {notice ??
                  `${MAX_GUESSES - result.guesses.length} guesses left · worth ${POINTS[result.guesses.length]} now`}
              </p>
            </form>
          ) : (
            <div className={outline.result} aria-live="polite">
              <p className={outline.verdict}>
                {result.solved ? (
                  <>
                    Got it in <strong>{result.guesses.length}</strong>:{" "}
                  </>
                ) : (
                  <>It was </>
                )}
                <strong className={outline.answer}>{country.name}</strong>
              </p>
              {notice && <p className={styles.hint}>{notice}</p>}
              <p className={outline.points}>
                <span className="mono">{score}</span> / 100 points
              </p>
              <p className={outline.squares}>{squares}</p>
              <div className={outline.actions}>
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
                <span className={outline.next}>Next Unfurl in {untilMidnight()}</span>
              </div>
            </div>
          )}

          <dl className={outline.stats}>
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
    </div>
  );
}
