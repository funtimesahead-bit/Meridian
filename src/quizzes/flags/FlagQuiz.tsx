"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Hud, gameStyles as ui } from "@/components/game/GameUi";
import { formatTime, saveResult, useBests, type Result } from "@/lib/scores";
import { useStopwatch } from "@/lib/useStopwatch";
import { findFlagQuiz, type Flag } from "./data";
import styles from "./FlagQuiz.module.css";

type Phase = "ready" | "playing" | "done";

/** Wrong clicks allowed per flag; the last one gives the answer away. */
const TRIES = 3;
/** Credit for finding a flag after 0, 1 or 2 wrong clicks. */
const CREDIT = [1, 2 / 3, 1 / 3];
/** How long the answer stays highlighted after the last try is used. */
const REVEAL_MS = 1600;

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const pct = (value: number) => `${Math.round(value * 100)}%`;

/** How each answered flag went: credit 1, partial, or 0 (given away). */
type Outcome = { credit: number; wrong: number };

export default function FlagQuiz({ slug }: { slug: string }) {
  const base = findFlagQuiz(slug)!;
  const [withExtra, setWithExtra] = useState(false);
  const flags = useMemo(
    () => (withExtra && base.extra ? [...base.flags, ...base.extra.flags] : base.flags),
    [base, withExtra],
  );
  const gameKey = `quiz-${base.slug}`;
  const setupKey = withExtra ? "extra" : "all";

  const [phase, setPhase] = useState<Phase>("ready");
  /** The grid, in a fixed random order for this run. */
  const [grid, setGrid] = useState<Flag[]>([]);
  /** The order the names are asked in. */
  const [queue, setQueue] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [outcomes, setOutcomes] = useState<Map<string, Outcome>>(() => new Map());
  /** A wrong flag just clicked, flashed red for a moment. */
  const [flash, setFlash] = useState<{ name: string; id: number } | null>(null);
  /** Set while the answer is shown after the last try. */
  const [giving, setGiving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    result: Result;
    accuracy: number;
    isBest: boolean;
    previousBest?: Result;
  } | null>(null);

  const clock = useStopwatch();
  const best = useBests(gameKey)[setupKey];
  const revealTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (revealTimer.current) window.clearTimeout(revealTimer.current);
  }, []);

  const target = queue[step];
  const answered = outcomes.size;
  const credit = [...outcomes.values()].reduce((sum, o) => sum + o.credit, 0);
  const accuracy = answered ? credit / answered : 1;

  const start = () => {
    if (revealTimer.current) window.clearTimeout(revealTimer.current);
    setGrid(shuffle(flags));
    setQueue(shuffle(flags.map((f) => f.name)));
    setStep(0);
    setWrong(0);
    setOutcomes(new Map());
    setFlash(null);
    setGiving(false);
    setNotice(null);
    setSummary(null);
    clock.begin();
    setPhase("playing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const settle = (name: string, outcome: Outcome) => {
    const next = new Map(outcomes).set(name, outcome);
    setOutcomes(next);
    setWrong(0);
    setGiving(false);
    if (step + 1 >= queue.length) {
      const total = [...next.values()].reduce((sum, o) => sum + o.credit, 0);
      const acc = total / next.size;
      const result: Result = {
        score: Math.round(acc * 100),
        max: 100,
        timeMs: clock.stop(),
        date: new Date().toISOString(),
      };
      setSummary({ result, accuracy: acc, ...saveResult(gameKey, setupKey, result) });
      setNotice(null);
      setPhase("done");
    } else {
      setStep(step + 1);
    }
  };

  const pick = (flag: Flag) => {
    if (phase !== "playing" || giving || !target || outcomes.has(flag.name)) return;
    if (flag.name === target) {
      setNotice(null);
      settle(target, { credit: CREDIT[wrong], wrong });
      return;
    }
    const misses = wrong + 1;
    setWrong(misses);
    setFlash({ name: flag.name, id: Date.now() });
    if (misses >= TRIES) {
      setGiving(true);
      setNotice(`That was ${flag.name}. Here is ${target}.`);
      revealTimer.current = window.setTimeout(() => {
        setNotice(null);
        settle(target, { credit: 0, wrong: misses });
      }, REVEAL_MS);
    } else {
      const left = TRIES - misses;
      setNotice(`That’s ${flag.name}. ${left} ${left === 1 ? "try" : "tries"} left.`);
    }
  };

  const toneOf = (name: string): string => {
    const o = outcomes.get(name);
    if (o) return o.credit === 1 ? styles.good : o.credit > 0 ? styles.partial : styles.missed;
    if (giving && name === target) return styles.answer;
    return "";
  };

  const missedNames = [...outcomes.entries()].filter(([, o]) => o.credit === 0).map(([n]) => n);

  return (
    <div className={styles.quiz}>
      <Link href="/quizzes" className={ui.back}>
        ← Quizzes
      </Link>
      <div className={styles.head}>
        <h1 className={styles.title}>{base.title}</h1>
        <Hud
          stats={[
            { label: "Flag", value: `${Math.min(answered + (phase === "playing" ? 1 : 0), flags.length)}/${flags.length}` },
            { label: "Accuracy", value: answered ? pct(accuracy) : "–" },
            { label: "Time", value: formatTime(clock.elapsed) },
            ...(best ? [{ label: "Best", value: `${best.score}% · ${formatTime(best.timeMs)}` }] : []),
          ]}
          onQuit={phase === "playing" ? () => setPhase("ready") : start}
          quitLabel={phase === "playing" ? "Quit" : phase === "done" ? "Play again" : "Start"}
        />
      </div>

      {phase === "ready" && (
        <div className={styles.setup}>
          <p>
            All <strong>{flags.length}</strong> flags of {base.region} are laid out in a grid. Click
            the one that is named. You get {TRIES} tries per flag: the first counts in full, each
            miss counts for less, and after the third the answer is shown and scores nothing. The
            stopwatch has no limit; your score is your accuracy.
          </p>
          {base.extra && (
            <div className={styles.variants} role="radiogroup" aria-label="What to include">
              <button
                type="button"
                role="radio"
                aria-checked={!withExtra}
                className={ui.segment}
                onClick={() => setWithExtra(false)}
              >
                {base.extra.baseLabel} ({base.flags.length})
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={withExtra}
                className={ui.segment}
                onClick={() => setWithExtra(true)}
              >
                {base.extra.label} ({base.flags.length + base.extra.flags.length})
              </button>
            </div>
          )}
          <button type="button" className={ui.startButton} onClick={start} autoFocus>
            Start
          </button>
        </div>
      )}

      {phase === "playing" && target && (
        <div className={styles.ask} aria-live="polite">
          <p className={styles.askLine}>
            Click the flag of <strong key={target}>{target}</strong>
          </p>
          <p className={styles.askSub}>
            <span className={styles.pips} aria-label={`${TRIES - wrong} tries left`}>
              {Array.from({ length: TRIES }, (_, i) => (
                <span key={i} className={i < TRIES - wrong ? styles.pipOn : styles.pipOff} />
              ))}
            </span>
            {notice && <span className={styles.notice}>{notice}</span>}
          </p>
        </div>
      )}

      {phase === "done" && summary && (
        <div className={ui.reveal} aria-live="polite">
          <div className={`${ui.revealText} ${summary.accuracy >= 0.8 ? ui.good : ui.bad}`}>
            <span className={ui.revealMark} aria-hidden="true">
              {summary.accuracy >= 0.8 ? "✓" : "✕"}
            </span>
            <div>
              <div className={ui.revealCity}>
                <strong>{pct(summary.accuracy)} accuracy</strong>
                <span className={ui.revealCountry}>
                  {flags.length} flags in {formatTime(summary.result.timeMs)}
                  {missedNames.length > 0 && ` · ${missedNames.length} given away`}
                </span>
              </div>
              <div className={ui.revealPoints}>
                {summary.previousBest
                  ? summary.isBest
                    ? `New personal best (was ${summary.previousBest.score}% in ${formatTime(summary.previousBest.timeMs)})`
                    : `Your best is ${summary.previousBest.score}% in ${formatTime(summary.previousBest.timeMs)}`
                  : "First run saved as your best"}
              </div>
            </div>
          </div>
          <div className={styles.doneActions}>
            <button type="button" className={ui.ghostButton} onClick={() => setPhase("ready")}>
              Change setup
            </button>
            <button type="button" className={ui.primaryButton} onClick={start}>
              Play again
            </button>
          </div>
        </div>
      )}

      {phase !== "ready" && (
        <div className={styles.grid}>
          {grid.map((flag) => {
            const done = outcomes.has(flag.name) || phase === "done";
            const flashing = flash?.name === flag.name;
            return (
              <button
                key={flag.name}
                type="button"
                className={`${styles.tile} ${toneOf(flag.name)} ${done ? styles.done : ""} ${flashing ? styles.wrong : ""}`}
                onClick={() => pick(flag)}
                onAnimationEnd={() => flashing && setFlash(null)}
                aria-label={done ? flag.name : "Flag"}
                disabled={phase !== "playing"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flag.src} alt="" draggable={false} />
                {done && <span className={styles.caption}>{flag.name}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
