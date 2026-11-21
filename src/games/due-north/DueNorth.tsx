"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapCanvas, { type MapFocus, type MapMarker, type MapShape } from "@/components/map/MapCanvas";
import {
  ChoiceCards,
  Hud,
  ProgressBar,
  ResultsScreen,
  SetupScreen,
  gameStyles as ui,
  type Choice,
  type RoundRow,
} from "@/components/game/GameUi";
import { ALL_CITIES, CITY_POOLS, type City } from "@/games/name-the-city/cities";
import { formatTime, saveResult, useBests, type Result } from "@/lib/scores";
import { useStopwatch } from "@/lib/useStopwatch";
import styles from "./DueNorth.module.css";

/* Due North: two cities, one question. Which is further north, further
   south, or closer to the Equator? Built to catch out mental maps: Rome is
   further north than New York, and Madrid than Beijing's neighbour Seoul. */

const GAME_KEY = "due-north";
const ROUNDS = 15;

type Difficulty = "easy" | "hard";
type Kind = "north" | "south" | "equator";

const RULES: Record<Difficulty, { pool: City[]; minGap: number; maxGap: number }> = {
  easy: { pool: [...CITY_POOLS.easy, ...CITY_POOLS.medium], minGap: 3, maxGap: 9 },
  hard: { pool: ALL_CITIES, minGap: 0.4, maxGap: 3 },
};

const DIFFICULTIES: Choice<Difficulty>[] = [
  {
    id: "easy",
    label: "Easy",
    meta: "3–9° apart",
    description: "Famous cities, a few hundred kilometres or more apart north to south.",
  },
  {
    id: "hard",
    label: "Hard",
    meta: "under 3° apart",
    description: "Any city, and the two are within a few degrees of each other.",
  },
];

const QUESTION: Record<Kind, { lead: string; word: string }> = {
  north: { lead: "Which is further", word: "north" },
  south: { lead: "Which is further", word: "south" },
  equator: { lead: "Which is closer to the", word: "Equator" },
};

type Pair = { kind: Kind; a: City; b: City; answer: 0 | 1 };
type Played = Pair & { picked: 0 | 1 };

const metric = (kind: Kind, city: City) => (kind === "equator" ? -Math.abs(city.lat) : city.lat);

function lonGap(a: City, b: City): number {
  const d = Math.abs(a.lon - b.lon) % 360;
  return d > 180 ? 360 - d : d;
}

function pickPairs(difficulty: Difficulty): Pair[] {
  const { pool, minGap, maxGap } = RULES[difficulty];
  const used = new Set<string>();
  const pairs: Pair[] = [];
  const random = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
  for (let attempt = 0; attempt < 20000 && pairs.length < ROUNDS; attempt++) {
    const a = random(pool);
    const b = random(pool);
    if (a === b || a.country === b.country || used.has(a.id) || used.has(b.id)) continue;
    // Far apart east to west, so it takes real map knowledge.
    if (lonGap(a, b) < 25) continue;
    const kind: Kind = Math.random() < 0.2 ? "equator" : Math.random() < 0.5 ? "south" : "north";
    // The Equator question is only interesting across hemispheres.
    if (kind === "equator" && Math.sign(a.lat) === Math.sign(b.lat)) continue;
    const ma = kind === "south" ? -a.lat : metric(kind, a);
    const mb = kind === "south" ? -b.lat : metric(kind, b);
    const gap = Math.abs(ma - mb);
    if (gap < minGap || gap > maxGap) continue;
    used.add(a.id);
    used.add(b.id);
    pairs.push({ kind, a, b, answer: ma > mb ? 0 : 1 });
  }
  return pairs;
}

const latText = (lat: number) => `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? "N" : "S"}`;

/** A line of latitude across the whole map. */
function parallel(lat: number) {
  const coordinates: [number, number][] = [];
  for (let lon = -180; lon <= 180; lon += 2) coordinates.push([lon, lat]);
  return { type: "LineString" as const, coordinates };
}

function explain(p: Pair): string {
  const [win, lose] = p.answer === 0 ? [p.a, p.b] : [p.b, p.a];
  if (p.kind === "equator") {
    const km = Math.round((Math.abs(lose.lat) - Math.abs(win.lat)) * 111);
    return `${win.name} is ${latText(win.lat)} and ${lose.name} is ${latText(lose.lat)}, so ${win.name} is about ${km.toLocaleString("en")} km closer to the Equator.`;
  }
  const km = Math.round(Math.abs(win.lat - lose.lat) * 111);
  return `${win.name} is at ${latText(win.lat)}, ${lose.name} at ${latText(lose.lat)}: about ${km.toLocaleString("en")} km further ${p.kind}.`;
}

type Phase = "setup" | "playing" | "done";

export default function DueNorth() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [played, setPlayed] = useState<Played[]>([]);
  const [summary, setSummary] = useState<{ result: Result; isBest: boolean; previousBest?: Result } | null>(null);

  const clock = useStopwatch();
  const bests = useBests(GAME_KEY);
  const nextRef = useRef<HTMLButtonElement>(null);

  // The pair on screen: the one just answered while its result shows, else the next one.
  const [showing, setShowing] = useState(false);
  const current = showing ? played[played.length - 1] : pairs[played.length];

  const start = useCallback(() => {
    setPairs(pickPairs(difficulty));
    setPlayed([]);
    setShowing(false);
    setSummary(null);
    clock.begin();
    setPhase("playing");
  }, [clock, difficulty]);

  const choose = useCallback(
    (picked: 0 | 1) => {
      if (phase !== "playing" || showing) return;
      const pair = pairs[played.length];
      if (!pair) return;
      setPlayed((all) => [...all, { ...pair, picked }]);
      setShowing(true);
    },
    [phase, showing, pairs, played.length],
  );

  const next = useCallback(() => {
    if (!showing) return;
    if (played.length >= pairs.length) {
      const score = played.filter((p) => p.picked === p.answer).length;
      const result: Result = { score, max: pairs.length, timeMs: clock.stop(), date: new Date().toISOString() };
      setSummary({ result, ...saveResult(GAME_KEY, difficulty, result) });
      setPhase("done");
      return;
    }
    setShowing(false);
  }, [showing, played, pairs.length, clock, difficulty]);

  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (!showing && (event.key === "ArrowLeft" || event.key === "1")) choose(0);
      else if (!showing && (event.key === "ArrowRight" || event.key === "2")) choose(1);
      else if (showing && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, showing, choose, next]);

  useEffect(() => {
    if (showing) nextRef.current?.focus({ preventScroll: true });
  }, [showing]);

  const last = showing ? played[played.length - 1] : null;

  const markers: MapMarker[] = useMemo(() => {
    if (!last) return [];
    return [last.a, last.b].map((city, i) => ({
      id: city.id,
      lon: city.lon,
      lat: city.lat,
      tone: i === last.answer ? ("good" as const) : ("bad" as const),
      size: 5,
      label: `${city.name} ${latText(city.lat)}`,
    }));
  }, [last]);

  const shapes: MapShape[] = useMemo(() => {
    if (!last) return [];
    const list: MapShape[] = [
      { id: "a", geo: parallel(last.a.lat), style: "line" },
      { id: "b", geo: parallel(last.b.lat), style: "line" },
    ];
    if (last.kind === "equator") list.push({ id: "eq", geo: parallel(0), style: "ringFaint" });
    return list;
  }, [last]);

  const focus: MapFocus | undefined = useMemo(
    () =>
      last
        ? {
            key: `${last.a.id}-${last.b.id}`,
            geo: { type: "MultiPoint", coordinates: [[last.a.lon, last.a.lat], [last.b.lon, last.b.lat]] },
            pad: 1.6,
            maxZoom: 4,
          }
        : { key: "world" },
    [last],
  );

  if (phase === "setup") {
    return (
      <SetupScreen
        title="Due North"
        lede="Two cities, one question: which is further north, further south, or closer to the Equator? Easy to guess, harder to know. Rome is further north than New York."
        best={bests[difficulty]}
        onStart={start}
        rules={[
          `${ROUNDS} pairs a game, scored on how many you get right`,
          "The two cities are always on different continents or far apart east to west",
          "After each answer the map shows both cities and their lines of latitude",
          "Keyboard: ← or 1 for the left city, → or 2 for the right, Enter for the next pair",
        ]}
      >
        <ChoiceCards title="Difficulty" options={DIFFICULTIES} value={difficulty} onChange={setDifficulty} />
      </SetupScreen>
    );
  }

  if (phase === "done" && summary) {
    const rows: RoundRow[] = played.map((p, i) => {
      const win = p.answer === 0 ? p.a : p.b;
      return {
        id: `${i}`,
        ok: p.picked === p.answer,
        title: `${p.a.name} or ${p.b.name}`,
        subtitle: p.kind === "equator" ? "closer to the Equator" : `further ${p.kind}`,
        note: `${win.name}, ${latText(win.lat)}`,
        points: p.picked === p.answer ? "✓" : "✕",
      };
    });
    return (
      <div className={ui.game}>
        <ResultsScreen
          kicker={`Due North · ${DIFFICULTIES.find((d) => d.id === difficulty)?.label}`}
          result={summary.result}
          isBest={summary.isBest}
          previousBest={summary.previousBest}
          stats={[
            { label: "Right", value: `${summary.result.score}/${summary.result.max}` },
            { label: "Time", value: formatTime(summary.result.timeMs) },
          ]}
          rounds={rows}
          onAgain={start}
          onSettings={() => setPhase("setup")}
        />
      </div>
    );
  }

  if (!current) return null;
  const q = QUESTION[current.kind];
  const right = played.filter((p) => p.picked === p.answer).length;

  return (
    <div className={ui.game}>
      <Hud
        badge={DIFFICULTIES.find((d) => d.id === difficulty)?.label}
        stats={[
          { label: "Pair", value: `${Math.min(played.length + (showing ? 0 : 1), pairs.length)}/${pairs.length}` },
          { label: "Right", value: right },
          { label: "Time", value: formatTime(clock.elapsed) },
        ]}
        onQuit={() => {
          clock.stop();
          setPhase("setup");
        }}
      />
      <ProgressBar
        steps={pairs.map((_, i) =>
          i < played.length
            ? played[i].picked === played[i].answer
              ? "good"
              : "bad"
            : i === played.length
              ? "now"
              : "todo",
        )}
      />

      <p className={styles.question}>
        {q.lead} <strong>{q.word}</strong>?
      </p>

      <div className={styles.pair}>
        {[current.a, current.b].map((city, i) => {
          const tone = last ? (i === last.answer ? styles.right : i === last.picked ? styles.wrong : "") : "";
          return (
            <Fragment key={city.id}>
              {i === 1 && <span className={styles.vs}>or</span>}
              <button
                type="button"
                className={`${styles.city} ${tone}`}
                onClick={() => choose(i as 0 | 1)}
                disabled={showing}
              >
                <span className={styles.cityName}>{city.name}</span>
                <span className={styles.cityCountry}>{city.country}</span>
                {last ? (
                  <span className={`mono ${styles.lat}`}>{latText(city.lat)}</span>
                ) : (
                  <span className={styles.key}>{i === 0 ? "← or 1" : "→ or 2"}</span>
                )}
              </button>
            </Fragment>
          );
        })}
      </div>

      {last && (
        <div className={ui.reveal} aria-live="polite">
          <div className={`${ui.revealText} ${last.picked === last.answer ? ui.good : ui.bad}`}>
            <span className={ui.revealMark} aria-hidden="true">
              {last.picked === last.answer ? "✓" : "✕"}
            </span>
            <div>
              <div className={ui.revealCity}>
                <strong>{last.picked === last.answer ? "Right" : "Not quite"}</strong>
              </div>
              <div className={styles.fact}>{explain(last)}</div>
            </div>
          </div>
          <button ref={nextRef} type="button" className={ui.primaryButton} onClick={next}>
            {played.length >= pairs.length ? "See results" : "Next pair"}
          </button>
        </div>
      )}

      <div onMouseDown={(event) => event.preventDefault()}>
        <MapCanvas
          scene="world"
          markers={markers}
          shapes={shapes}
          focus={focus}
          ariaLabel={last ? `Map showing ${last.a.name} and ${last.b.name}` : "World map, hidden until you answer"}
        />
      </div>
    </div>
  );
}
