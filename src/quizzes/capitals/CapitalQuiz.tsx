"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import MapCanvas, { type MapMarker, type MapShape } from "@/components/map/MapCanvas";
import { Hud, gameStyles as ui } from "@/components/game/GameUi";
import { editDistance, normalize } from "@/games/name-the-city/match";
import { formatTime, saveResult, useBests, type Result } from "@/lib/scores";
import { useStopwatch } from "@/lib/useStopwatch";
import { findCapitalQuiz, type CapitalEntry } from "./data";
import styles from "./CapitalQuiz.module.css";

type Phase = "ready" | "playing" | "done";
type Mode = "map" | "list";

const MODES: { id: Mode; label: string; note: string }[] = [
  { id: "map", label: "With map", note: "Every capital is marked as a dot" },
  { id: "list", label: "No map", note: "Just the list of places" },
];

function allowedTypos(length: number): number {
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  return 2;
}

export default function CapitalQuiz({ slug }: { slug: string }) {
  const quiz = findCapitalQuiz(slug)!;
  const total = quiz.entries.length;
  const gameKey = `quiz-${quiz.slug}`;
  const placeWord = quiz.scene === "usa" ? "states" : "countries";

  const [mode, setMode] = useState<Mode>("map");
  const [phase, setPhase] = useState<Phase>("ready");
  const [found, setFound] = useState<Set<string>>(() => new Set());
  const [guess, setGuess] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [lastFound, setLastFound] = useState<CapitalEntry | null>(null);
  const [stateLines, setStateLines] = useState<MapShape[]>([]);
  const [summary, setSummary] = useState<{
    result: Result;
    isBest: boolean;
    previousBest?: Result;
  } | null>(null);

  const clock = useStopwatch();
  const bests = useBests(gameKey);
  const best = bests[mode];
  const inputRef = useRef<HTMLInputElement>(null);

  // State borders for the US map, loaded only for that quiz.
  useEffect(() => {
    if (quiz.scene !== "usa") return;
    let cancelled = false;
    import("@/learn/us-history/boundaries").then(({ unitsOn }) => {
      if (cancelled) return;
      const states = unitsOn(20250101).filter((u) => u.properties.t === "s");
      setStateLines([{ id: "states", style: "outline", geo: states }]);
    });
    return () => {
      cancelled = true;
    };
  }, [quiz.scene]);

  /** Every accepted spelling of every capital, by place. */
  const answers = useMemo(
    () =>
      quiz.entries.map((entry) => ({
        entry,
        keys: entry.capitals.flat().map(normalize),
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

  const finish = (places: Set<string>) => {
    const result: Result = {
      score: places.size,
      max: total,
      timeMs: clock.stop(),
      date: new Date().toISOString(),
    };
    setSummary({ result, ...saveResult(gameKey, mode, result) });
    setPhase("done");
  };

  const accept = (entry: CapitalEntry) => {
    const places = new Set(found).add(entry.place);
    setFound(places);
    setLastFound(entry);
    setGuess("");
    setNotice(null);
    if (places.size === total) finish(places);
  };

  /** A place still open whose capital is exactly `key`. */
  const exactMatch = (key: string) =>
    answers.find((a) => !found.has(a.entry.place) && a.keys.includes(key))?.entry;

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
        a.entry !== match &&
        !found.has(a.entry.place) &&
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
      setNotice(`${already.entry.place} is already filled in.`);
      setShaking(true);
      setGuess("");
      return;
    }
    let bestEntry: CapitalEntry | null = null;
    let bestDistance = Infinity;
    for (const a of answers) {
      if (found.has(a.entry.place)) continue;
      for (const k of a.keys) {
        const budget = allowedTypos(k.length);
        if (budget === 0 || Math.abs(k.length - key.length) > budget) continue;
        const d = editDistance(key, k);
        if (d <= budget && d < bestDistance) {
          bestDistance = d;
          bestEntry = a.entry;
        }
      }
    }
    if (bestEntry) accept(bestEntry);
    else {
      setNotice(`${guess.trim()} is not a capital here.`);
      setShaking(true);
    }
  };

  const done = phase === "done";

  const markers: MapMarker[] = useMemo(
    () =>
      quiz.entries.map((entry) => {
        const isFound = found.has(entry.place);
        return {
          id: entry.place,
          lon: entry.lon,
          lat: entry.lat,
          size: isFound || done ? 4 : 3.5,
          shape: isFound || done ? ("dot" as const) : ("slot" as const),
          tone: isFound ? ("good" as const) : done ? ("bad" as const) : ("dim" as const),
          label: isFound || done ? entry.capital : undefined,
          labelOnHover: !(isFound && entry === lastFound),
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
            Name the capital of all {total} {placeWord}
            {quiz.scene === "usa" ? "" : ` of ${quiz.region}`}. Type them in any order; each
            one fills in next to its {placeWord === "states" ? "state" : "country"}. Where a
            country has more than one capital, any of them counts. The stopwatch runs, but there
            is no time limit.
          </p>
          <div className={styles.modes} role="radiogroup" aria-label="Map">
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
                        ? `All ${total} capitals`
                        : `${summary.result.score} of ${total} capitals`}
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
            <form onSubmit={submit} className={styles.entry}>
              <div className={ui.inputRow}>
                <input
                  ref={inputRef}
                  className={`${ui.input} ${shaking ? ui.shake : ""}`}
                  onAnimationEnd={() => setShaking(false)}
                  value={guess}
                  onChange={(e) => onType(e.target.value)}
                  placeholder="Type a capital"
                  aria-label="Type a capital"
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
                    Got <strong className={styles.last}>{lastFound.place}</strong>:{" "}
                    {lastFound.capitals.map((c) => c[0]).join(" / ")}. {total - found.size} to go.
                  </span>
                ) : (
                  <span>Capitals fill in as soon as you type them. Small typos count after Enter.</span>
                )}
              </div>
            </form>
          )}

          {showMap && (
            <div onMouseDown={(event) => event.preventDefault()}>
              <MapCanvas
                scene={quiz.scene}
                borders
                tall
                shapes={stateLines}
                markers={markers}
                ariaLabel={`Map of ${quiz.region} with every capital marked`}
              />
            </div>
          )}

          <ol className={styles.list}>
            {quiz.entries.map((entry) => {
              const isFound = found.has(entry.place);
              const others = entry.capitals.slice(1).map((c) => c[0]);
              return (
                <li
                  key={entry.place}
                  className={`${styles.row} ${isFound ? styles.found : done ? styles.missed : ""} ${
                    entry === lastFound ? styles.fresh : ""
                  }`}
                  title={isFound || done ? [entry.capital, ...others].join(", ") : undefined}
                >
                  <span className={styles.place}>{entry.place}</span>
                  <span className={styles.capital}>
                    {isFound || done ? (
                      <>
                        {entry.capital}
                        {others.length > 0 && <span className={styles.also}> +{others.length}</span>}
                      </>
                    ) : (
                      <span className={styles.blank} />
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
