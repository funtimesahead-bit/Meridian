"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import MapCanvas, { type MapCountry, type MapMarker } from "@/components/map/MapCanvas";
import { Hud, gameStyles as ui } from "@/components/game/GameUi";
import { editDistance, normalize } from "@/games/name-the-city/match";
import { formatTime, saveResult, useBests, type Result } from "@/lib/scores";
import { useStopwatch } from "@/lib/useStopwatch";
import { findQuiz, type QuizCountry } from "./data";
import styles from "./CountryQuiz.module.css";

type Phase = "ready" | "playing" | "done";

function allowedTypos(length: number): number {
  if (length <= 5) return 0;
  if (length <= 8) return 1;
  return 2;
}

export default function CountryQuiz({ slug }: { slug: string }) {
  const quiz = findQuiz(slug)!;
  const total = quiz.countries.length;
  const gameKey = `quiz-${quiz.slug}`;

  const [phase, setPhase] = useState<Phase>("ready");
  const [found, setFound] = useState<Set<string>>(() => new Set());
  const [guess, setGuess] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [lastFound, setLastFound] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    result: Result;
    isBest: boolean;
    previousBest?: Result;
  } | null>(null);

  const clock = useStopwatch();
  const best = useBests(gameKey).all;
  const inputRef = useRef<HTMLInputElement>(null);

  /** Every accepted spelling of every country. */
  const answers = useMemo(
    () =>
      quiz.countries.map((country) => ({
        country,
        keys: [country.name, ...country.aliases].map(normalize),
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

  const finish = (names: Set<string>) => {
    const result: Result = {
      score: names.size,
      max: total,
      timeMs: clock.stop(),
      date: new Date().toISOString(),
    };
    setSummary({ result, ...saveResult(gameKey, "all", result) });
    setPhase("done");
  };

  const accept = (country: QuizCountry) => {
    const names = new Set(found).add(country.name);
    setFound(names);
    setLastFound(country.name);
    setGuess("");
    setNotice(null);
    if (names.size === total) finish(names);
  };

  /** A country still to find whose name is exactly `key`. */
  const exactMatch = (key: string) =>
    answers.find((a) => !found.has(a.country.name) && a.keys.includes(key))?.country;

  const onType = (text: string) => {
    setGuess(text);
    if (notice) setNotice(null);
    const key = normalize(text);
    if (!key) return;
    const match = exactMatch(key);
    if (!match) return;
    // "Dominica" is also the start of "Dominican Republic": when a longer
    // answer is still open, wait for Enter instead of jumping in.
    const startsAnother = answers.some(
      (a) =>
        a.country !== match &&
        !found.has(a.country.name) &&
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
      setNotice(`${already.country.name} is already on the map.`);
      setShaking(true);
      setGuess("");
      return;
    }
    // Forgive a small typo.
    let bestCountry: QuizCountry | null = null;
    let bestDistance = Infinity;
    for (const a of answers) {
      if (found.has(a.country.name)) continue;
      for (const k of a.keys) {
        const budget = allowedTypos(k.length);
        if (budget === 0 || Math.abs(k.length - key.length) > budget) continue;
        const d = editDistance(key, k);
        if (d <= budget && d < bestDistance) {
          bestDistance = d;
          bestCountry = a.country;
        }
      }
    }
    if (bestCountry) accept(bestCountry);
    else setShaking(true);
  };

  const done = phase === "done";

  const mapCountries: MapCountry[] = useMemo(
    () =>
      quiz.countries.flatMap((country) =>
        country.shapes.map((name) => ({
          name,
          tone: found.has(country.name)
            ? ("good" as const)
            : done
              ? ("bad" as const)
              : ("plain" as const),
        })),
      ),
    [quiz, found, done],
  );

  const markers: MapMarker[] = useMemo(
    () =>
      quiz.countries.flatMap((country) => {
        if (!country.marker) return [];
        const isFound = found.has(country.name);
        return [
          {
            id: country.name,
            lon: country.marker[0],
            lat: country.marker[1],
            size: 5,
            shape: isFound || done ? ("dot" as const) : ("slot" as const),
            tone: isFound ? ("good" as const) : done ? ("bad" as const) : ("dim" as const),
            label: done ? country.name : undefined,
          },
        ];
      }),
    [quiz, found, done],
  );

  return (
    <div className={styles.quiz}>
      <Link href="/quizzes" className={ui.back}>
        ← Quizzes
      </Link>
      <div className={styles.head}>
        <h1 className={styles.title}>{quiz.title}</h1>
        <Hud
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

      <div className={styles.mapWrap} onMouseDown={(event) => event.preventDefault()}>
        <MapCanvas
          scene={quiz.scene}
          borders
          tall
          countries={mapCountries}
          markers={markers}
          ariaLabel={`Blank map of ${quiz.region} with country borders`}
        />
        {phase === "ready" && (
          <div className={styles.cover}>
            <p>
              Name all <strong>{total}</strong> countries of {quiz.region}. The stopwatch
              starts when you do, and there is no time limit.
            </p>
            <button type="button" className={ui.startButton} onClick={start} autoFocus>
              Start
            </button>
          </div>
        )}
      </div>

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
                    ? `All ${total} countries`
                    : `${summary.result.score} of ${total} countries`}
                </strong>
                <span className={ui.revealCountry}>
                  in {formatTime(summary.result.timeMs)}
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
          <button type="button" className={ui.primaryButton} onClick={start}>
            Play again
          </button>
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
              placeholder={phase === "playing" ? "Type a country" : "Press Start to begin"}
              aria-label="Type a country"
              disabled={phase !== "playing"}
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
                Got <strong className={styles.last}>{lastFound}</strong>. {total - found.size} to go.
              </span>
            ) : (
              <span>Countries fill in as soon as you type them. Small typos count after Enter.</span>
            )}
          </div>
        </form>
      )}

      <ol className={styles.list}>
        {quiz.countries.map((country, i) => {
          const isFound = found.has(country.name);
          return (
            <li
              key={country.name}
              className={`${styles.item} ${isFound ? styles.itemFound : done ? styles.itemMissed : ""}`}
            >
              {isFound || done ? country.name : <span className={styles.blank}>{i + 1}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
