"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  CITY_POOLS,
  DIFFICULTIES,
  QUIZ_LENGTHS,
  pickCities,
  type City,
  type Difficulty,
  type QuizLength,
} from "./cities";
import { isCorrectGuess, normalize } from "./match";
import {
  comboKey,
  formatTime,
  saveRun,
  useScores,
  type Run,
} from "./scores";
import type { MapDot, MapTarget } from "./WorldMap";
import styles from "./CityGame.module.css";

const WorldMap = dynamic(() => import("./WorldMap"), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map…</div>,
});

const TRIES_PER_CITY = 3;
const AUTO_ADVANCE_MS = 1400;

type Outcome = "correct" | "missed" | "skipped";

type RoundResult = {
  city: City;
  outcome: Outcome;
  /** 3 for a first-try answer, 2 for second, 1 for third, 0 otherwise. */
  points: number;
  wrongGuesses: string[];
};

type Phase = "setup" | "playing" | "results";

type Summary = { run: Run; isBest: boolean; previousBest?: Run };

function difficultyLabel(id: Difficulty): string {
  return DIFFICULTIES.find((d) => d.id === id)?.label ?? id;
}

export function CityGame() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [length, setLength] = useState<QuizLength>(10);

  const [cities, setCities] = useState<City[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<RoundResult | null>(null);
  const [guess, setGuess] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);

  const startedAt = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const advanceTimer = useRef<number | null>(null);

  const city = cities[index];
  const triesLeft = TRIES_PER_CITY - wrongGuesses.length;
  const score = results.reduce((sum, r) => sum + r.points, 0);
  const isLast = index === cities.length - 1;

  // Warm up the map bundle while the player is still choosing settings.
  useEffect(() => {
    void import("./WorldMap");
  }, []);

  const clearAdvance = useCallback(() => {
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }, []);
  useEffect(() => clearAdvance, [clearAdvance]);

  // Running clock.
  useEffect(() => {
    if (phase !== "playing") return;
    const tick = () => setElapsed(Date.now() - startedAt.current);
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [phase]);

  // Keep the keyboard where it is needed: the answer box, then the Next button.
  useEffect(() => {
    if (phase !== "playing") return;
    if (revealed) nextRef.current?.focus({ preventScroll: true });
    else inputRef.current?.focus({ preventScroll: true });
  }, [phase, index, revealed]);

  const start = useCallback(
    (d: Difficulty = difficulty, n: QuizLength = length) => {
      clearAdvance();
      setCities(pickCities(d, n));
      setIndex(0);
      setResults([]);
      setWrongGuesses([]);
      setRevealed(null);
      setGuess("");
      setNotice(null);
      setShaking(false);
      setSummary(null);
      setElapsed(0);
      startedAt.current = Date.now();
      setPhase("playing");
    },
    [clearAdvance, difficulty, length],
  );

  const finish = useCallback(
    (all: RoundResult[]) => {
      const run: Run = {
        difficulty,
        length,
        score: all.reduce((sum, r) => sum + r.points, 0),
        maxScore: all.length * TRIES_PER_CITY,
        correct: all.filter((r) => r.outcome === "correct").length,
        timeMs: Date.now() - startedAt.current,
        date: new Date().toISOString(),
      };
      setSummary({ run, ...saveRun(run) });
      setPhase("results");
    },
    [difficulty, length],
  );

  const next = useCallback(() => {
    clearAdvance();
    if (!revealed) return;
    if (isLast) {
      finish(results);
      return;
    }
    setIndex((i) => i + 1);
    setWrongGuesses([]);
    setRevealed(null);
    setGuess("");
    setNotice(null);
  }, [clearAdvance, finish, isLast, results, revealed]);

  const reveal = useCallback(
    (outcome: Outcome, wrong: string[]) => {
      if (!city) return;
      const result: RoundResult = {
        city,
        outcome,
        points: outcome === "correct" ? TRIES_PER_CITY - wrong.length : 0,
        wrongGuesses: wrong,
      };
      setResults((r) => [...r, result]);
      setRevealed(result);
      setNotice(null);
      setGuess("");
    },
    [city],
  );

  // After a correct answer, move on by itself after a short beat.
  useEffect(() => {
    if (revealed?.outcome !== "correct") return;
    advanceTimer.current = window.setTimeout(next, AUTO_ADVANCE_MS);
    return clearAdvance;
  }, [revealed, next, clearAdvance]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!city) return;
    if (revealed) {
      next();
      return;
    }
    const text = guess.trim();
    if (!text) return;

    if (isCorrectGuess(text, city)) {
      reveal("correct", wrongGuesses);
      return;
    }
    if (wrongGuesses.some((w) => normalize(w) === normalize(text))) {
      setNotice("You already tried that one.");
      setShaking(true);
      return;
    }

    const wrong = [...wrongGuesses, text];
    setShaking(true);
    if (wrong.length >= TRIES_PER_CITY) {
      reveal("missed", wrong);
    } else {
      setWrongGuesses(wrong);
      setGuess("");
      setNotice(null);
    }
  };

  const mapTarget: MapTarget | null = useMemo(() => {
    if (!city) return null;
    return {
      id: city.id,
      lon: city.lon,
      lat: city.lat,
      status: !revealed
        ? "active"
        : revealed.outcome === "correct"
          ? "correct"
          : "missed",
      label: revealed ? city.name : undefined,
    };
  }, [city, revealed]);

  const pastDots: MapDot[] = useMemo(
    () =>
      results
        .filter((r) => r.city.id !== city?.id)
        .map((r) => ({
          id: r.city.id,
          lon: r.city.lon,
          lat: r.city.lat,
          ok: r.outcome === "correct",
        })),
    [results, city],
  );

  if (phase === "setup") {
    return (
      <Setup
        difficulty={difficulty}
        length={length}
        onDifficulty={setDifficulty}
        onLength={setLength}
        onStart={() => start()}
      />
    );
  }

  if (phase === "results" && summary) {
    return (
      <Results
        summary={summary}
        results={results}
        onAgain={() => start()}
        onSettings={() => setPhase("setup")}
      />
    );
  }

  if (!city) return null;

  return (
    <div className={styles.game}>
      <div className={styles.hud}>
        <div className={styles.hudLeft}>
          <span className={styles.badge}>
            {difficultyLabel(difficulty)} · {length}
          </span>
          <span className={styles.hudStat}>
            <span className={styles.hudLabel}>City</span>
            <span className="mono">
              {index + 1}/{cities.length}
            </span>
          </span>
          <span className={styles.hudStat}>
            <span className={styles.hudLabel}>Score</span>
            <span className="mono">{score}</span>
          </span>
          <span className={styles.hudStat}>
            <span className={styles.hudLabel}>Time</span>
            <span className="mono">{formatTime(elapsed)}</span>
          </span>
        </div>
        <button
          type="button"
          className={styles.ghostButton}
          onClick={() => {
            clearAdvance();
            setPhase("setup");
          }}
        >
          Quit
        </button>
      </div>

      <div
        className={styles.progress}
        role="progressbar"
        aria-label="Quiz progress"
        aria-valuemin={0}
        aria-valuemax={cities.length}
        aria-valuenow={results.length}
      >
        {cities.map((c, i) => {
          const r = results[i];
          const state = r
            ? r.outcome === "correct"
              ? styles.segGood
              : styles.segBad
            : i === index
              ? styles.segNow
              : "";
          return <span key={c.id} className={`${styles.seg} ${state}`} />;
        })}
      </div>

      {/* Dragging or zooming the map must not pull the keyboard out of the answer box. */}
      <div onMouseDown={(event) => event.preventDefault()}>
        <WorldMap target={mapTarget} past={pastDots} />
      </div>

      <form className={styles.answer} onSubmit={submit}>
        {revealed ? (
          <div className={styles.reveal} aria-live="polite">
            <div
              className={`${styles.revealText} ${
                revealed.outcome === "correct" ? styles.good : styles.bad
              }`}
            >
              <span className={styles.revealMark} aria-hidden="true">
                {revealed.outcome === "correct" ? "✓" : "✕"}
              </span>
              <div>
                <div className={styles.revealCity}>
                  {revealed.outcome === "correct" ? "" : "It was "}
                  <strong>{city.name}</strong>
                  <span className={styles.revealCountry}>{city.country}</span>
                </div>
                <div className={styles.revealPoints}>
                  {revealed.outcome === "correct"
                    ? `+${revealed.points} ${revealed.points === 1 ? "point" : "points"}`
                    : revealed.outcome === "skipped"
                      ? "Skipped · 0 points"
                      : "Out of tries · 0 points"}
                </div>
              </div>
            </div>
            <button ref={nextRef} type="submit" className={styles.primaryButton}>
              {isLast ? "See results" : "Next city"}
              <kbd>↵</kbd>
            </button>
          </div>
        ) : (
          <>
            <div className={styles.inputRow}>
              <input
                ref={inputRef}
                className={`${styles.input} ${shaking ? styles.shake : ""}`}
                onAnimationEnd={() => setShaking(false)}
                value={guess}
                onChange={(e) => {
                  setGuess(e.target.value);
                  if (notice) setNotice(null);
                }}
                placeholder="Which city is this?"
                aria-label="Your guess"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="words"
                spellCheck={false}
                enterKeyHint="go"
              />
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={!guess.trim()}
              >
                Guess
              </button>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => reveal("skipped", wrongGuesses)}
              >
                Skip
              </button>
            </div>

            <div className={styles.status} aria-live="polite">
              <span className={styles.tries} aria-label={`${triesLeft} of ${TRIES_PER_CITY} tries left`}>
                {Array.from({ length: TRIES_PER_CITY }, (_, i) => (
                  <span
                    key={i}
                    className={`${styles.pip} ${i < triesLeft ? styles.pipOn : ""}`}
                  />
                ))}
                <span className={styles.triesText}>
                  {triesLeft} {triesLeft === 1 ? "try" : "tries"} left
                </span>
              </span>

              {wrongGuesses.map((w) => (
                <span key={w} className={styles.wrong}>
                  {w}
                </span>
              ))}

              {notice && <span className={styles.notice}>{notice}</span>}

              {!notice && triesLeft === 1 && (
                <span className={styles.hint}>
                  Hint: it is in <strong>{city.country}</strong>
                </span>
              )}
            </div>
          </>
        )}
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Setup({
  difficulty,
  length,
  onDifficulty,
  onLength,
  onStart,
}: {
  difficulty: Difficulty;
  length: QuizLength;
  onDifficulty: (d: Difficulty) => void;
  onLength: (n: QuizLength) => void;
  onStart: () => void;
}) {
  const scores = useScores();
  const best = scores.best[comboKey(difficulty, length)];

  return (
    <div className={styles.setup}>
      <Link href="/games" className={styles.back}>
        ← Games
      </Link>
      <h1 className={styles.title}>Name the City</h1>
      <p className={styles.lede}>
        A dot lights up on a blank world map, with no borders and no labels.
        Type the city it marks. You get three tries per city, and small typos
        and missing accents are forgiven.
      </p>

      <div className={styles.setupGrid}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Difficulty</h2>
          <div className={styles.options} role="radiogroup" aria-label="Difficulty">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={difficulty === d.id}
                className={styles.option}
                onClick={() => onDifficulty(d.id)}
              >
                <span className={styles.optionHead}>
                  <span className={styles.optionLabel}>{d.label}</span>
                  <span className={styles.optionMeta}>
                    {CITY_POOLS[d.id].length} cities
                  </span>
                </span>
                <span className={styles.optionText}>{d.description}</span>
              </button>
            ))}
          </div>

          <h2 className={styles.panelTitle}>Length</h2>
          <div className={styles.segmented} role="radiogroup" aria-label="Number of cities">
            {QUIZ_LENGTHS.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={length === n}
                className={styles.segment}
                onClick={() => onLength(n)}
              >
                {n} cities
              </button>
            ))}
          </div>

          <div className={styles.startRow}>
            <button type="button" className={styles.startButton} onClick={onStart}>
              Start
            </button>
            <p className={styles.bestLine}>
              {best ? (
                <>
                  Your best here:{" "}
                  <strong className="mono">
                    {best.score}/{best.maxScore}
                  </strong>{" "}
                  in <span className="mono">{formatTime(best.timeMs)}</span>
                </>
              ) : (
                "No saved score for this setup yet."
              )}
            </p>
          </div>
        </section>

        <aside className={styles.panel}>
          <h2 className={styles.panelTitle}>Your best scores</h2>
          <table className={styles.bests}>
            <thead>
              <tr>
                <th scope="col" />
                {QUIZ_LENGTHS.map((n) => (
                  <th key={n} scope="col">
                    {n} cities
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DIFFICULTIES.map((d) => (
                <tr key={d.id}>
                  <th scope="row">{d.label}</th>
                  {QUIZ_LENGTHS.map((n) => {
                    const run = scores.best[comboKey(d.id, n)];
                    return (
                      <td key={n}>
                        {run ? (
                          <>
                            <span className={`mono ${styles.bestScore}`}>
                              {run.score}/{run.maxScore}
                            </span>
                            <span className={`mono ${styles.bestTime}`}>
                              {formatTime(run.timeMs)}
                            </span>
                          </>
                        ) : (
                          <span className={styles.bestNone}>–</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className={styles.panelTitle}>Scoring</h2>
          <ul className={styles.rules}>
            <li>
              <span className="mono">3</span> points for a first-try answer
            </li>
            <li>
              <span className="mono">2</span> on the second try,{" "}
              <span className="mono">1</span> on the third
            </li>
            <li>The country is given as a hint before your last try</li>
            <li>Ties on points are broken by the faster time</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Results({
  summary,
  results,
  onAgain,
  onSettings,
}: {
  summary: Summary;
  results: RoundResult[];
  onAgain: () => void;
  onSettings: () => void;
}) {
  const { run, isBest, previousBest } = summary;
  const againRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    againRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className={styles.results}>
      <p className={styles.resultsKicker}>
        {difficultyLabel(run.difficulty)} · {run.length} cities
      </p>
      <h1 className={styles.resultsScore}>
        <span className="mono">{run.score}</span>
        <span className={styles.resultsMax}>
          {" "}
          / <span className="mono">{run.maxScore}</span>
        </span>
      </h1>

      {isBest ? (
        <p className={styles.bestBadge}>
          {previousBest
            ? `New personal best (was ${previousBest.score}/${previousBest.maxScore})`
            : "First score saved for this setup"}
        </p>
      ) : (
        previousBest && (
          <p className={styles.resultsNote}>
            Your best is{" "}
            <span className="mono">
              {previousBest.score}/{previousBest.maxScore}
            </span>{" "}
            in <span className="mono">{formatTime(previousBest.timeMs)}</span>
          </p>
        )
      )}

      <dl className={styles.statRow}>
        <div>
          <dt>Named</dt>
          <dd className="mono">
            {run.correct}/{run.length}
          </dd>
        </div>
        <div>
          <dt>First try</dt>
          <dd className="mono">
            {results.filter((r) => r.points === TRIES_PER_CITY).length}
          </dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd className="mono">{formatTime(run.timeMs)}</dd>
        </div>
      </dl>

      <div className={styles.resultsActions}>
        <button ref={againRef} type="button" className={styles.startButton} onClick={onAgain}>
          Play again
        </button>
        <button type="button" className={styles.ghostButton} onClick={onSettings}>
          Change settings
        </button>
      </div>

      <ol className={styles.roundList}>
        {results.map((r) => (
          <li key={r.city.id} className={styles.round}>
            <span
              className={`${styles.roundDot} ${
                r.outcome === "correct" ? styles.dotGood : styles.dotBad
              }`}
              aria-hidden="true"
            />
            <span className={styles.roundCity}>
              {r.city.name}
              <span className={styles.roundCountry}>{r.city.country}</span>
            </span>
            <span className={styles.roundNote}>
              {r.outcome === "skipped"
                ? "Skipped"
                : r.outcome === "missed"
                  ? "Missed"
                  : r.wrongGuesses.length === 0
                    ? "First try"
                    : r.wrongGuesses.length === 1
                      ? "Second try"
                      : "Third try"}
            </span>
            <span className={`mono ${styles.roundPoints}`}>+{r.points}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
