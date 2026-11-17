"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import MapCanvas, { type MapMarker } from "@/components/map/MapCanvas";
import { Hud, gameStyles as ui } from "@/components/game/GameUi";
import { editDistance, normalize } from "@/games/name-the-city/match";
import { formatTime, saveResult, useBests, type Result } from "@/lib/scores";
import { useStopwatch } from "@/lib/useStopwatch";
import { findCityQuiz, type RankedCity } from "./data";
import styles from "./CityRankQuiz.module.css";

type Phase = "ready" | "playing" | "done";
type Mode = "map" | "list";

const MODES: { id: Mode; label: string; note: string }[] = [
  { id: "map", label: "With map", note: "Every city is marked from the start" },
  { id: "list", label: "No map", note: "Just the list and the populations" },
];

function allowedTypos(length: number): number {
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  return 2;
}

function formatMillions(m: number): string {
  return `${m.toFixed(1)}M`;
}

export default function CityRankQuiz({ slug }: { slug: string }) {
  const quiz = findCityQuiz(slug)!;
  const total = quiz.cities.length;
  const gameKey = `cities-${quiz.slug}`;

  const [mode, setMode] = useState<Mode>("map");
  const [phase, setPhase] = useState<Phase>("ready");
  const [found, setFound] = useState<Set<number>>(() => new Set());
  const [guess, setGuess] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [lastFound, setLastFound] = useState<number | null>(null);
  const [summary, setSummary] = useState<{
    result: Result;
    isBest: boolean;
    previousBest?: Result;
  } | null>(null);

  const clock = useStopwatch();
  const bests = useBests(gameKey);
  const best = bests[mode];
  const inputRef = useRef<HTMLInputElement>(null);

  /** Every accepted spelling of every city. */
  const answers = useMemo(
    () =>
      quiz.cities.map((city) => ({
        city,
        keys: [city.name, ...city.aliases].map(normalize),
      })),
    [quiz],
  );

  useEffect(() => {
    if (phase === "playing") inputRef.current?.focus({ preventScroll: true });
  }, [phase]);

  const start = () => {
    setFound(new Set());
    setGuess("");
    setNotice(null);
    setLastFound(null);
    setSummary(null);
    clock.begin();
    setPhase("playing");
  };

  const finish = (ranks: Set<number>) => {
    const result: Result = {
      score: ranks.size,
      max: total,
      timeMs: clock.stop(),
      date: new Date().toISOString(),
    };
    setSummary({ result, ...saveResult(gameKey, mode, result) });
    setPhase("done");
  };

  const accept = (city: RankedCity) => {
    const ranks = new Set(found).add(city.rank);
    setFound(ranks);
    setLastFound(city.rank);
    setGuess("");
    setNotice(null);
    if (ranks.size === total) finish(ranks);
  };

  /** A city still to find whose name is exactly `key`. */
  const exactMatch = (key: string) =>
    answers.find((a) => !found.has(a.city.rank) && a.keys.includes(key))?.city;

  const onType = (text: string) => {
    setGuess(text);
    if (notice) setNotice(null);
    const key = normalize(text);
    if (!key) return;
    const match = exactMatch(key);
    if (!match) return;
    // Wait for Enter if this is also the start of a longer answer still open.
    const startsAnother = answers.some(
      (a) =>
        a.city !== match &&
        !found.has(a.city.rank) &&
        a.keys.some((k) => k.length > key.length && k.startsWith(key)),
    );
    if (!startsAnother) accept(match);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (phase !== "playing") return;
    const key = normalize(guess);
    if (!key) return;

    const exact = exactMatch(key);
    if (exact) {
      accept(exact);
      return;
    }
    const already = answers.find((a) => a.keys.includes(key));
    if (already) {
      setNotice(`${already.city.name} is already on the list.`);
      setShaking(true);
      setGuess("");
      return;
    }
    let bestCity: RankedCity | null = null;
    let bestDistance = Infinity;
    for (const a of answers) {
      if (found.has(a.city.rank)) continue;
      for (const k of a.keys) {
        const budget = allowedTypos(k.length);
        if (budget === 0 || Math.abs(k.length - key.length) > budget) continue;
        const d = editDistance(key, k);
        if (d <= budget && d < bestDistance) {
          bestDistance = d;
          bestCity = a.city;
        }
      }
    }
    if (bestCity) accept(bestCity);
    else {
      setNotice(`${guess.trim()} is not in the top ${total}.`);
      setShaking(true);
    }
  };

  const done = phase === "done";

  const markers: MapMarker[] = useMemo(
    () =>
      quiz.cities.map((city) => {
        const isFound = found.has(city.rank);
        return {
          id: city.name,
          lon: city.lon,
          lat: city.lat,
          size: isFound || done ? 4.5 : 4,
          shape: isFound || done ? ("dot" as const) : ("slot" as const),
          tone: isFound ? ("good" as const) : done ? ("bad" as const) : ("dim" as const),
          label: isFound || done ? city.name : undefined,
          labelOnHover: !(isFound && city.rank === lastFound),
        };
      }),
    [quiz, found, done, lastFound],
  );

  const showMap = mode === "map";
  const modeLabel = MODES.find((m) => m.id === mode)?.label;

  return (
    <div className={styles.quiz}>
      <Link href="/quizzes" className={ui.back}>
        ← Quizzes
      </Link>
      <div className={styles.head}>
        <h1 className={styles.title}>{quiz.title}</h1>
        <Hud
          badge={phase === "ready" ? undefined : modeLabel}
          stats={[
            { label: "Found", value: `${found.size}/${total}` },
            { label: "Time", value: formatTime(clock.elapsed) },
            ...(best
              ? [{ label: "Best", value: `${best.score}/${best.max} · ${formatTime(best.timeMs)}` }]
              : []),
          ]}
          onQuit={phase === "playing" ? () => finish(found) : start}
          quitLabel={phase === "playing" ? "Give up" : phase === "done" ? "Play again" : "Start"}
        />
      </div>

      {phase === "ready" ? (
        <div className={styles.ready}>
          <p className={styles.lede}>
            Name the {total} most populous cities in {quiz.region}. Their populations are
            shown as clues; the names fill in as you get them. The stopwatch runs, but there
            is no time limit.
          </p>
          <div className={styles.modes} role="radiogroup" aria-label="Difficulty">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={mode === m.id}
                className={ui.option}
                onClick={() => setMode(m.id)}
              >
                <span className={ui.optionHead}>
                  <span className={ui.optionLabel}>{m.label}</span>
                  {bests[m.id] && (
                    <span className={ui.optionMeta}>
                      Best {bests[m.id].score}/{bests[m.id].max}
                    </span>
                  )}
                </span>
                <span className={ui.optionText}>{m.note}</span>
              </button>
            ))}
          </div>
          <button type="button" className={ui.startButton} onClick={start} autoFocus>
            Start
          </button>
          <p className={styles.footnote}>
            Populations are approximate metro-area figures in millions, based on UN
            estimates. Sources rank the bottom of the list differently.
          </p>
        </div>
      ) : (
        <>
          {done && summary ? (
            <div className={ui.reveal} aria-live="polite">
              <div
                className={`${ui.revealText} ${summary.result.score === total ? ui.good : ui.bad}`}
              >
                <span className={ui.revealMark} aria-hidden="true">
                  {summary.result.score === total ? "✓" : "✕"}
                </span>
                <div>
                  <div className={ui.revealCity}>
                    <strong>
                      {summary.result.score === total
                        ? `All ${total} cities`
                        : `${summary.result.score} of ${total} cities`}
                    </strong>
                    <span className={ui.revealCountry}>
                      in {formatTime(summary.result.timeMs)} · {modeLabel}
                    </span>
                  </div>
                  <div className={ui.revealPoints}>
                    {summary.isBest
                      ? summary.previousBest
                        ? `New personal best (was ${summary.previousBest.score}/${summary.previousBest.max} in ${formatTime(summary.previousBest.timeMs)})`
                        : "First score saved"
                      : summary.previousBest
                        ? `Your best is ${summary.previousBest.score}/${summary.previousBest.max} in ${formatTime(summary.previousBest.timeMs)}`
                        : ""}
                  </div>
                </div>
              </div>
              <div className={styles.doneActions}>
                <button type="button" className={ui.ghostButton} onClick={() => setPhase("ready")}>
                  Change setting
                </button>
                <button type="button" className={ui.primaryButton} onClick={start}>
                  Play again
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className={ui.inputRow}>
                <input
                  ref={inputRef}
                  className={`${ui.input} ${shaking ? ui.shake : ""}`}
                  onAnimationEnd={() => setShaking(false)}
                  value={guess}
                  onChange={(e) => onType(e.target.value)}
                  placeholder="Type a city"
                  aria-label="Type a city"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="words"
                  spellCheck={false}
                />
              </div>
              <div className={ui.status} aria-live="polite">
                {notice ? (
                  <span className={ui.notice}>{notice}</span>
                ) : lastFound ? (
                  <span>
                    Got <strong className={styles.last}>{quiz.cities[lastFound - 1].name}</strong>{" "}
                    at #{lastFound}. {total - found.size} to go.
                  </span>
                ) : (
                  <span>Cities fill in as soon as you type them. Small typos count after Enter.</span>
                )}
              </div>
            </form>
          )}

          <div className={`${styles.board} ${showMap ? styles.withMap : ""}`}>
            {showMap && (
              <div onMouseDown={(event) => event.preventDefault()}>
                <MapCanvas
                  scene={quiz.scene}
                  borders
                  tall
                  markers={markers}
                  ariaLabel={`Map of ${quiz.region} with the ${total} biggest cities marked`}
                />
              </div>
            )}
            <ol className={styles.list}>
              {quiz.cities.map((city) => {
                const isFound = found.has(city.rank);
                return (
                  <li
                    key={city.rank}
                    className={`${styles.row} ${isFound ? styles.found : done ? styles.missed : ""} ${
                      city.rank === lastFound ? styles.fresh : ""
                    }`}
                  >
                    <span className={styles.rank}>{city.rank}</span>
                    <span className={styles.name}>
                      {isFound || done ? city.name : <span className={styles.blank} />}
                    </span>
                    <span className={`mono ${styles.pop}`}>{formatMillions(city.millions)}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
