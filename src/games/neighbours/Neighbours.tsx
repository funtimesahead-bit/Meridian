"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MapCanvas, { type MapCountry, type MapFocus, type MapMarker } from "@/components/map/MapCanvas";
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
import { labelPoint } from "@/games/border-run/graph";
import { BY_NAME, PLACES, findPlace, neighboursOf, type Place } from "./borders";
import { geoArea, type GeoPermissibleObjects } from "d3-geo";
import type { Polygon } from "geojson";
import { COUNTRY_SHAPES, measureToCountry } from "@/lib/geo/world";
import { formatTime, saveResult, useBests, type Result } from "@/lib/scores";
import { useStopwatch } from "@/lib/useStopwatch";
import chips from "@/games/border-run/BorderRun.module.css";

/* Neighbours: a country is lit up on a map with every border drawn. Name all
   the countries it shares a land border with. */

const GAME_KEY = "neighbours";
const ROUNDS = 5;
const STRIKES = 3;

type Difficulty = "easy" | "medium" | "hard";

type Country = Place;

const FAME = {
  easy: new Set(["famous"]),
  medium: new Set(["famous", "known"]),
  hard: new Set(["famous", "known", "obscure"]),
};
const RANGE: Record<Difficulty, [number, number]> = {
  easy: [2, 6],
  medium: [3, 9],
  hard: [4, 16],
};

/** Countries a round can be about, for each difficulty. */
const CANDIDATES: Record<Difficulty, Country[]> = Object.fromEntries(
  (["easy", "medium", "hard"] as const).map((d) => [
    d,
    PLACES.filter((c) => {
      const n = neighboursOf(c.name).length;
      return c.name !== "Western Sahara" && FAME[d].has(c.fame) && n >= RANGE[d][0] && n <= RANGE[d][1];
    }),
  ]),
) as Record<Difficulty, Country[]>;

const DIFFICULTIES: Choice<Difficulty>[] = [
  {
    id: "easy",
    label: "Easy",
    meta: `${CANDIDATES.easy.length} countries`,
    description: "Well-known countries with two to six neighbours.",
  },
  {
    id: "medium",
    label: "Medium",
    meta: `${CANDIDATES.medium.length} countries`,
    description: "More countries, and up to nine neighbours each.",
  },
  {
    id: "hard",
    label: "Hard",
    meta: `${CANDIDATES.hard.length} countries`,
    description: "Anywhere, at least four neighbours. Russia and China have fourteen.",
  },
];

function pickRounds(difficulty: Difficulty): Country[] {
  const pool = [...CANDIDATES[difficulty]];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, ROUNDS);
}

/** The biggest single polygon of a country. */
function mainland(shapeNames: string[]): Polygon[] {
  let best: Polygon | null = null;
  let bestArea = -1;
  for (const name of shapeNames) {
    const shape = COUNTRY_SHAPES.get(name);
    if (!shape) continue;
    const polys =
      shape.geometry.type === "Polygon" ? [shape.geometry.coordinates] : shape.geometry.coordinates;
    for (const coordinates of polys) {
      const polygon: Polygon = { type: "Polygon", coordinates };
      const area = geoArea(polygon);
      if (area > bestArea) {
        bestArea = area;
        best = polygon;
      }
    }
  }
  return best ? [best] : [];
}

type Round = { country: Country; found: string[]; wrong: string[]; done: boolean };
type Phase = "setup" | "playing" | "done";

/** Every country shape on the map, so borders do not give the answer away. */
const ALL_SHAPES = PLACES.flatMap((c) => c.shapes.map((s) => [s, c.name] as const));

export default function Neighbours() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [summary, setSummary] = useState<{
    result: Result;
    isBest: boolean;
    previousBest?: Result;
    found: number;
    total: number;
  } | null>(null);

  const clock = useStopwatch();
  const bests = useBests(GAME_KEY);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const round = rounds[index];
  const answers = useMemo(() => (round ? neighboursOf(round.country.name) : []), [round]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (round?.done) nextRef.current?.focus({ preventScroll: true });
    else inputRef.current?.focus({ preventScroll: true });
  }, [phase, round?.done, index]);

  const start = () => {
    setRounds(pickRounds(difficulty).map((country) => ({ country, found: [], wrong: [], done: false })));
    setIndex(0);
    setText("");
    setNotice(null);
    setSummary(null);
    clock.begin();
    setPhase("playing");
  };

  const update = (next: Round) => setRounds((all) => all.map((r, i) => (i === index ? next : r)));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!round || round.done || !text.trim()) return;
    const country = findPlace(text);
    if (!country) {
      setNotice("That is not a country I know.");
      setShaking(true);
      return;
    }
    setText("");
    if (country === round.country) {
      setNotice(`${country.name} is the country itself.`);
      setShaking(true);
      return;
    }
    if (round.found.includes(country.name) || round.wrong.includes(country.name)) {
      setNotice(`You already tried ${country.name}.`);
      setShaking(true);
      return;
    }
    if (answers.includes(country.name)) {
      const found = [...round.found, country.name];
      const done = found.length === answers.length;
      update({ ...round, found, done });
      setNotice(done ? `All ${answers.length} found.` : null);
      return;
    }
    const wrong = [...round.wrong, country.name];
    const done = wrong.length >= STRIKES;
    update({ ...round, wrong, done });
    setShaking(true);
    setNotice(
      done
        ? `${country.name} doesn't border ${round.country.name}. That's ${STRIKES} strikes.`
        : `${country.name} doesn't border ${round.country.name}. ${STRIKES - wrong.length} ${STRIKES - wrong.length === 1 ? "strike" : "strikes"} left.`,
    );
  };

  const next = () => {
    if (index + 1 < rounds.length) {
      setIndex(index + 1);
      setNotice(null);
      return;
    }
    const found = rounds.reduce((n, r) => n + r.found.length, 0);
    const total = rounds.reduce((n, r) => n + neighboursOf(r.country.name).length, 0);
    const result: Result = {
      score: Math.round((found / total) * 100),
      max: 100,
      timeMs: clock.stop(),
      date: new Date().toISOString(),
    };
    setSummary({ result, found, total, ...saveResult(GAME_KEY, difficulty, result) });
    setPhase("done");
  };

  /* ---- Map ---- */

  const mapCountries: MapCountry[] = useMemo(() => {
    if (!round) return [];
    const found = new Set(round.found);
    const wrong = new Set(round.wrong);
    const missing = new Set(round.done ? answers.filter((a) => !found.has(a)) : []);
    return ALL_SHAPES.map(([shape, name]) => ({
      name: shape,
      tone:
        name === round.country.name
          ? ("accent" as const)
          : found.has(name)
            ? ("good" as const)
            : wrong.has(name) || missing.has(name)
              ? ("bad" as const)
              : ("plain" as const),
    }));
  }, [round, answers]);

  const markers: MapMarker[] = useMemo(() => {
    if (!round) return [];
    const labelled = round.done ? answers : round.found;
    return labelled.flatMap((name) => {
      const country = BY_NAME.get(name);
      const point = country && labelPoint(country);
      return point
        ? [{ id: name, lon: point[0], lat: point[1], tone: "plain" as const, size: 2.5, label: name }]
        : [];
    });
  }, [round, answers]);

  const focus: MapFocus | undefined = useMemo(() => {
    if (!round) return undefined;
    // Frame the country and the nearest part of each neighbour. Whole
    // neighbours would not do: Russia alone stretches across the map.
    const centre = labelPoint(round.country);
    const near = centre
      ? answers.flatMap((a) => {
          const n = BY_NAME.get(a);
          return n?.shapes.length ? [measureToCountry(n.shapes, centre[0], centre[1]).nearest] : [];
        })
      : [];
    const geo: GeoPermissibleObjects = {
      type: "GeometryCollection",
      geometries: [
        // Only the main landmass, so France's overseas parts don't widen the view.
        ...mainland(round.country.shapes),
        { type: "MultiPoint", coordinates: near },
      ],
    } as GeoPermissibleObjects;
    return { key: round.country.name, geo, pad: 1.8, maxZoom: 10 };
  }, [round, answers]);

  /* ---- Screens ---- */

  if (phase === "setup") {
    return (
      <SetupScreen
        title="Neighbours"
        lede="A country lights up on a map with every border drawn but no names. Type every country it shares a land border with."
        best={bests[difficulty]}
        onStart={start}
        startNote={
          bests[difficulty] ? (
            <>
              Your best here: <strong className="mono">{bests[difficulty].score}%</strong> in{" "}
              <span className="mono">{formatTime(bests[difficulty].timeMs)}</span>
            </>
          ) : undefined
        }
        rules={[
          `${ROUNDS} countries a game`,
          "Type the neighbours in any order. You're told how many there are",
          `A wrong country is a strike; ${STRIKES} strikes end that round`,
          "Only land borders count, not sea crossings or bridges",
          "Your score is the share of neighbours you found",
        ]}
      >
        <ChoiceCards title="Difficulty" options={DIFFICULTIES} value={difficulty} onChange={setDifficulty} />
      </SetupScreen>
    );
  }

  if (phase === "done" && summary) {
    const rows: RoundRow[] = rounds.map((r) => {
      const all = neighboursOf(r.country.name);
      const missed = all.filter((n) => !r.found.includes(n));
      return {
        id: r.country.name,
        ok: missed.length === 0,
        title: r.country.name,
        subtitle: `${all.length} neighbours`,
        note: missed.length ? `Missed ${missed.sort().join(", ")}` : "All found",
        points: `${r.found.length}/${all.length}`,
      };
    });
    return (
      <div className={ui.game}>
        <ResultsScreen
          kicker={`Neighbours · ${DIFFICULTIES.find((d) => d.id === difficulty)?.label}`}
          result={summary.result}
          isBest={summary.isBest}
          previousBest={summary.previousBest}
          stats={[
            { label: "Found", value: `${summary.found}/${summary.total}` },
            { label: "Time", value: formatTime(summary.result.timeMs) },
          ]}
          rounds={rows}
          onAgain={start}
          onSettings={() => setPhase("setup")}
        />
      </div>
    );
  }

  if (!round) return null;

  return (
    <div className={ui.game}>
      <Hud
        badge={DIFFICULTIES.find((d) => d.id === difficulty)?.label}
        stats={[
          { label: "Country", value: `${index + 1}/${rounds.length}` },
          { label: "Found", value: `${round.found.length}/${answers.length}` },
          { label: "Strikes", value: `${round.wrong.length}/${STRIKES}` },
          { label: "Time", value: formatTime(clock.elapsed) },
        ]}
        onQuit={() => {
          clock.stop();
          setPhase("setup");
        }}
      />
      <ProgressBar
        steps={rounds.map((r, i) =>
          i === index && !r.done
            ? "now"
            : r.done
              ? r.found.length === neighboursOf(r.country.name).length
                ? "good"
                : "bad"
              : "todo",
        )}
      />

      <div onMouseDown={(event) => event.preventDefault()}>
        <MapCanvas
          scene="world"
          borders
          countries={mapCountries}
          markers={markers}
          focus={focus}
          ariaLabel={`World map with ${round.country.name} highlighted`}
        />
      </div>

      <p className={chips.prompt}>
        <strong>{round.country.name}</strong> has <strong>{answers.length}</strong> land{" "}
        {answers.length === 1 ? "neighbour" : "neighbours"}. Name them.
      </p>

      {round.done ? (
        <div className={ui.reveal} aria-live="polite">
          <div
            className={`${ui.revealText} ${round.found.length === answers.length ? ui.good : ui.bad}`}
          >
            <span className={ui.revealMark} aria-hidden="true">
              {round.found.length === answers.length ? "✓" : "✕"}
            </span>
            <div>
              <div className={ui.revealCity}>
                <strong>
                  {round.found.length}/{answers.length} found
                </strong>
                <span className={ui.revealCountry}>{answers.join(", ")}</span>
              </div>
            </div>
          </div>
          <button ref={nextRef} type="button" className={ui.primaryButton} onClick={next}>
            {index + 1 < rounds.length ? "Next country" : "See results"}
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className={ui.inputRow}>
            <input
              ref={inputRef}
              className={`${ui.input} ${shaking ? ui.shake : ""}`}
              onAnimationEnd={() => setShaking(false)}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (notice) setNotice(null);
              }}
              placeholder="Type a neighbouring country"
              aria-label="Type a neighbouring country"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="words"
              spellCheck={false}
              enterKeyHint="go"
            />
            <button type="submit" className={ui.primaryButton} disabled={!text.trim()}>
              Add
            </button>
            <button
              type="button"
              className={ui.ghostButton}
              onClick={() => update({ ...round, done: true })}
            >
              Give up
            </button>
          </div>
        </form>
      )}

      <div className={ui.status} aria-live="polite">
        {round.found.map((name) => (
          <span key={name} className={`${chips.chip} ${chips.chipGood}`}>
            {name}
          </span>
        ))}
        {round.wrong.map((name) => (
          <span key={name} className={`${chips.chip} ${chips.chipBad}`}>
            {name}
          </span>
        ))}
        {notice && <span className={ui.notice}>{notice}</span>}
      </div>
    </div>
  );
}
