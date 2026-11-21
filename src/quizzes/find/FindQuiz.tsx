"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { geoContains } from "d3-geo";
import MapCanvas, { type MapCountry, type MapMarker } from "@/components/map/MapCanvas";
import { Hud, gameStyles as ui } from "@/components/game/GameUi";
import { labelPoint } from "@/games/border-run/graph";
import { COUNTRY_SHAPES, distanceKm, measureToCountry } from "@/lib/geo/world";
import { formatTime, saveResult, useBests, type Result } from "@/lib/scores";
import { useStopwatch } from "@/lib/useStopwatch";
import type { QuizCountry } from "@/quizzes/countries/data";
import flagStyles from "@/quizzes/flags/FlagQuiz.module.css";
import { findFindQuiz } from "./data";
import styles from "./FindQuiz.module.css";

type Phase = "ready" | "playing" | "done";

/** Wrong clicks allowed per country; the last one gives the answer away. */
const TRIES = 3;
/** Credit for finding a country after 0, 1 or 2 wrong clicks. */
const CREDIT = [1, 2 / 3, 1 / 3];
const REVEAL_MS = 1800;
/** A click on the sea this close to the target's coast still counts. */
const COAST_KM = 30;
/** Small countries drawn as a ring: a click this close to the ring counts. */
const MARKER_KM = 140;

type Outcome = { credit: number; wrong: number };

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const pct = (value: number) => `${Math.round(value * 100)}%`;

/** Which of the quiz's countries a click landed on, if any. */
function countryAt(countries: QuizCountry[], lon: number, lat: number): QuizCountry | null {
  for (const country of countries) {
    for (const name of country.shapes) {
      const shape = COUNTRY_SHAPES.get(name);
      if (shape && geoContains(shape, [lon, lat])) return country;
    }
  }
  let best: QuizCountry | null = null;
  let bestKm = MARKER_KM;
  for (const country of countries) {
    if (!country.marker) continue;
    const km = distanceKm(lon, lat, country.marker[0], country.marker[1]);
    if (km < bestKm) {
      bestKm = km;
      best = country;
    }
  }
  return best;
}

/** True when a click on open sea is close enough to the target to count. */
function nearTarget(target: QuizCountry, lon: number, lat: number): boolean {
  if (target.marker && distanceKm(lon, lat, target.marker[0], target.marker[1]) <= MARKER_KM) {
    return true;
  }
  return target.shapes.length > 0 && measureToCountry(target.shapes, lon, lat).km <= COAST_KM;
}

export default function FindQuiz({ slug }: { slug: string }) {
  const quiz = findFindQuiz(slug)!;
  const gameKey = `quiz-${quiz.slug}`;
  const countries = quiz.countries;

  const [phase, setPhase] = useState<Phase>("ready");
  const [queue, setQueue] = useState<QuizCountry[]>([]);
  const [step, setStep] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [outcomes, setOutcomes] = useState<Map<string, Outcome>>(() => new Map());
  /** A wrong country just clicked, shown red for a moment. */
  const [flash, setFlash] = useState<string | null>(null);
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
  const best = useBests(gameKey).all;
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const target = queue[step];
  const answered = outcomes.size;
  const credit = [...outcomes.values()].reduce((sum, o) => sum + o.credit, 0);
  const accuracy = answered ? credit / answered : 1;

  const start = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setQueue(shuffle(countries));
    setStep(0);
    setWrong(0);
    setOutcomes(new Map());
    setFlash(null);
    setGiving(false);
    setNotice(null);
    setSummary(null);
    clock.begin();
    setPhase("playing");
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
      setSummary({ result, accuracy: acc, ...saveResult(gameKey, "all", result) });
      setNotice(null);
      setPhase("done");
    } else {
      setStep(step + 1);
    }
  };

  const pick = (lon: number, lat: number) => {
    if (phase !== "playing" || giving || !target) return;
    const clicked = countryAt(countries, lon, lat);
    if (clicked === target || (!clicked && nearTarget(target, lon, lat))) {
      setNotice(null);
      settle(target.name, { credit: CREDIT[wrong], wrong });
      return;
    }
    if (!clicked) {
      setNotice("That’s open water. Clicks on the sea don’t count as a try.");
      return;
    }
    if (outcomes.has(clicked.name)) {
      setNotice(`That’s ${clicked.name}, already done. It doesn’t count as a try.`);
      return;
    }
    const misses = wrong + 1;
    setWrong(misses);
    setFlash(clicked.name);
    later(() => setFlash((f) => (f === clicked.name ? null : f)), 700);
    if (misses >= TRIES) {
      setGiving(true);
      setNotice(`That’s ${clicked.name}. Here is ${target.name}.`);
      later(() => {
        setNotice(null);
        settle(target.name, { credit: 0, wrong: misses });
      }, REVEAL_MS);
    } else {
      const left = TRIES - misses;
      setNotice(`That’s ${clicked.name}. ${left} ${left === 1 ? "try" : "tries"} left.`);
    }
  };

  const toneOf = (country: QuizCountry): MapCountry["tone"] => {
    if (flash === country.name) return "bad";
    if (giving && country === target) return "accent";
    const o = outcomes.get(country.name);
    if (!o) return phase === "done" ? "bad" : "plain";
    return o.credit === 1 ? "good" : o.credit > 0 ? "accent" : "bad";
  };

  const mapCountries: MapCountry[] = countries.flatMap((country) =>
    country.shapes.map((name) => ({ name, tone: toneOf(country) })),
  );

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = [];
    for (const country of countries) {
      if (!country.marker) continue;
      const o = outcomes.get(country.name);
      const tone = o ? (o.credit === 1 ? "good" : o.credit > 0 ? "accent" : "bad") : "dim";
      list.push({
        id: country.name,
        lon: country.marker[0],
        lat: country.marker[1],
        size: 5,
        shape: o ? "dot" : "slot",
        tone,
        label: o || phase === "done" ? country.name : undefined,
        labelOnHover: true,
      });
    }
    if (giving && target) {
      const point = target.marker ?? labelPoint(target);
      if (point) {
        list.push({
          id: "answer",
          lon: point[0],
          lat: point[1],
          tone: "accent",
          size: 6,
          pulse: true,
          label: target.name,
        });
      }
    }
    return list;
  }, [countries, outcomes, giving, target, phase]);

  const missed = [...outcomes.entries()].filter(([, o]) => o.credit === 0).map(([n]) => n);

  return (
    <div className={flagStyles.quiz}>
      <Link href="/quizzes" className={ui.back}>
        ← Quizzes
      </Link>
      <div className={flagStyles.head}>
        <h1 className={flagStyles.title}>{quiz.title}</h1>
        <Hud
          stats={[
            {
              label: "Country",
              value: `${Math.min(answered + (phase === "playing" ? 1 : 0), countries.length)}/${countries.length}`,
            },
            { label: "Accuracy", value: answered ? pct(accuracy) : "–" },
            { label: "Time", value: formatTime(clock.elapsed) },
            ...(best ? [{ label: "Best", value: `${best.score}% · ${formatTime(best.timeMs)}` }] : []),
          ]}
          onQuit={phase === "playing" ? () => setPhase("ready") : start}
          quitLabel={phase === "playing" ? "Quit" : phase === "done" ? "Play again" : "Start"}
        />
      </div>

      {phase === "ready" && (
        <div className={flagStyles.setup}>
          <p>
            A country of {quiz.region} is named; click it on the map. All{" "}
            <strong>{countries.length}</strong> come up once each. You get {TRIES} tries per
            country: the first counts in full, each miss counts for less, and after the third the
            answer is shown. Small countries are ringed, and you can zoom in.
          </p>
          <button type="button" className={ui.startButton} onClick={start} autoFocus>
            Start
          </button>
        </div>
      )}

      {phase === "playing" && target && (
        <div className={flagStyles.ask} aria-live="polite">
          <p className={flagStyles.askLine}>
            Click <strong key={target.name}>{target.name}</strong>
          </p>
          <p className={flagStyles.askSub}>
            <span className={flagStyles.pips} aria-label={`${TRIES - wrong} tries left`}>
              {Array.from({ length: TRIES }, (_, i) => (
                <span key={i} className={i < TRIES - wrong ? flagStyles.pipOn : flagStyles.pipOff} />
              ))}
            </span>
            {notice && <span className={flagStyles.notice}>{notice}</span>}
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
                  {countries.length} countries in {formatTime(summary.result.timeMs)}
                  {missed.length > 0 && ` · missed ${missed.join(", ")}`}
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
          <button type="button" className={ui.primaryButton} onClick={start}>
            Play again
          </button>
        </div>
      )}

      <div className={styles.mapWrap} onMouseDown={(event) => event.preventDefault()}>
        <MapCanvas
          scene={quiz.scene}
          borders
          tall
          countries={mapCountries}
          markers={markers}
          onPick={phase === "playing" ? pick : undefined}
          ariaLabel={`Map of ${quiz.region} with country borders. Click the named country.`}
        />
      </div>

      <div className={styles.legend} aria-hidden="true">
        <span>
          <i className={styles.full} /> First try
        </span>
        <span>
          <i className={styles.part} /> Second or third try
        </span>
        <span>
          <i className={styles.miss} /> Missed
        </span>
      </div>
    </div>
  );
}
