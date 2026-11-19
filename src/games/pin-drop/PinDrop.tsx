"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MapCanvas, {
  type MapCountry,
  type MapFocus,
  type MapMarker,
  type MapShape,
} from "@/components/map/MapCanvas";
import {
  BestTable,
  ChoiceCards,
  ChoiceSegments,
  Hud,
  ProgressBar,
  ResultsScreen,
  SetupScreen,
  gameStyles as ui,
  type Choice,
} from "@/components/game/GameUi";
import { COUNTRY_SHAPES, type CountryHit } from "@/lib/geo/world";
import { formatTime, saveResult, useBests, type Result } from "@/lib/scores";
import { useStopwatch } from "@/lib/useStopwatch";
import { MAX_POINTS, type Difficulty } from "./countries";
import {
  CAPITAL_FULL_KM,
  TARGET_POOLS,
  measure,
  pickTargets,
  type PinMode,
  type Target,
} from "./targets";
import styles from "./PinDrop.module.css";

type ModeCopy = {
  gameKey: string;
  title: string;
  lede: string;
  one: string;
  many: string;
  difficulties: Record<Difficulty, string>;
  rules: React.ReactNode[];
};

const COPY: Record<PinMode, ModeCopy> = {
  countries: {
    gameKey: "pin-drop",
    title: "Pin Drop: Countries",
    lede: "You get a country and a blank world map with no borders. Drop a pin where you think it is. Land inside the country for full marks; miss, and the closer you are the more you score.",
    one: "country",
    many: "countries",
    difficulties: {
      easy: "Big or unmistakable countries.",
      medium: "Countries you know by name but may struggle to place.",
      hard: "Small, tucked-away or rarely mentioned countries.",
    },
    rules: [
      <>
        <span className="mono">{MAX_POINTS}</span> points for a pin inside the country
      </>,
      "Outside, points drop with the distance to its nearest border",
      <>
        About <span className="mono">850</span> at 100 km, <span className="mono">430</span> at
        500 km, <span className="mono">190</span> at 1,000 km
      </>,
      "Click to place the pin, click again to move it, then drop it",
    ],
  },
  capitals: {
    gameKey: "pin-drop-capitals",
    title: "Pin Drop: Capitals",
    lede: "A capital city is named; find it on a blank world map with no borders and drop a pin. Get within 50 km for full marks; further out, the closer you are the more you score.",
    one: "capital",
    many: "capitals",
    difficulties: {
      easy: "Capitals of big, well-known countries. The country is named too.",
      medium: "Capitals of countries you know by name. The country is named too.",
      hard: "Capitals of small or far-flung countries, and only the city is named.",
    },
    rules: [
      <>
        <span className="mono">{MAX_POINTS}</span> points within{" "}
        <span className="mono">{CAPITAL_FULL_KM}</span> km of the capital
      </>,
      "Further out, points drop with the distance",
      <>
        About <span className="mono">900</span> at 100 km, <span className="mono">570</span> at
        300 km, <span className="mono">120</span> at 1,000 km
      </>,
      "Click to place the pin, click again to move it, then drop it",
    ],
  },
};

type Pin = { lon: number; lat: number };
type Round = { target: Target; pin: Pin; hit: CountryHit; points: number };
type Phase = "setup" | "playing" | "results";

function formatKm(km: number): string {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString("en")} km`;
}

export default function PinDrop({ mode = "countries" }: { mode?: PinMode }) {
  const copy = COPY[mode];
  const GAME_KEY = copy.gameKey;
  const DIFFICULTIES: Choice<Difficulty>[] = (["easy", "medium", "hard"] as Difficulty[]).map((id) => ({
    id,
    label: { easy: "Easy", medium: "Medium", hard: "Hard" }[id],
    meta: `${TARGET_POOLS[mode][id].length} ${copy.many}`,
    description: copy.difficulties[id],
  }));
  const LENGTHS: Choice<number>[] = [
    { id: 10, label: `10 ${copy.many}` },
    { id: 20, label: `20 ${copy.many}` },
  ];
  const [phase, setPhase] = useState<Phase>("setup");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [length, setLength] = useState(10);

  const [countries, setCountries] = useState<Target[]>([]);
  const [index, setIndex] = useState(0);
  const [pin, setPin] = useState<Pin | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [summary, setSummary] = useState<{
    result: Result;
    isBest: boolean;
    previousBest?: Result;
  } | null>(null);

  const clock = useStopwatch();
  const bests = useBests(GAME_KEY);
  const setupKey = `${difficulty}-${length}`;

  const country = countries[index];
  const revealed = rounds.length > index ? rounds[index] : null;
  const score = rounds.reduce((sum, r) => sum + r.points, 0);
  const isLast = index === countries.length - 1;

  const start = useCallback(() => {
    setCountries(pickTargets(mode, difficulty, length));
    setIndex(0);
    setPin(null);
    setRounds([]);
    setSummary(null);
    clock.begin();
    setPhase("playing");
  }, [clock, difficulty, length, mode]);

  const confirm = useCallback(() => {
    if (!country || !pin || revealed) return;
    const { hit, points } = measure(country, pin.lon, pin.lat);
    setRounds((r) => [...r, { target: country, pin, hit, points }]);
  }, [country, pin, revealed]);

  const next = useCallback(() => {
    if (!revealed) return;
    if (isLast) {
      const result: Result = {
        score,
        max: countries.length * MAX_POINTS,
        timeMs: clock.stop(),
        date: new Date().toISOString(),
      };
      setSummary({ result, ...saveResult(GAME_KEY, setupKey, result) });
      setPhase("results");
      return;
    }
    setIndex((i) => i + 1);
    setPin(null);
  }, [clock, countries.length, isLast, revealed, score, setupKey, GAME_KEY]);

  // Enter drops the pin, then moves on.
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      if (revealed) next();
      else confirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, revealed, next, confirm]);

  const mapCountries: MapCountry[] = useMemo(() => {
    if (!revealed) return [];
    return (revealed.target.shapes ?? []).map((name) => ({
      name,
      tone: revealed.hit.inside ? "good" : "accent",
    }));
  }, [revealed]);

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = [];
    // For capitals, show where the city really is once the pin is down.
    if (revealed?.target.point) {
      list.push({
        id: "answer",
        lon: revealed.target.point[0],
        lat: revealed.target.point[1],
        tone: "accent",
        size: 5,
        pulse: true,
        label: revealed.target.name,
      });
    }
    if (pin) {
      list.push({
        id: "pin",
        lon: pin.lon,
        lat: pin.lat,
        shape: "pin",
        tone: revealed ? (revealed.hit.inside ? "good" : "bad") : "plain",
      });
    }
    return list;
  }, [pin, revealed]);

  const shapes: MapShape[] = useMemo(() => {
    if (!revealed || revealed.hit.inside) return [];
    return [
      {
        id: `miss-${index}`,
        style: "line",
        geo: {
          type: "LineString",
          coordinates: [
            [revealed.pin.lon, revealed.pin.lat],
            revealed.hit.nearest,
          ],
        },
      },
    ];
  }, [revealed, index]);

  // After the drop, zoom to show the pin and the country together.
  const focus: MapFocus = useMemo(() => {
    if (!revealed) return { key: `round-${index}` };
    return {
      key: `reveal-${index}`,
      pad: 1.6,
      maxZoom: 9,
      geo: {
        type: "FeatureCollection",
        features: [
          ...(revealed.target.shapes ?? []).flatMap((name) => {
            const shape = COUNTRY_SHAPES.get(name);
            return shape ? [shape] : [];
          }),
          ...(revealed.target.point
            ? [
                {
                  type: "Feature" as const,
                  properties: {},
                  geometry: { type: "Point" as const, coordinates: revealed.target.point },
                },
              ]
            : []),
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [revealed.pin.lon, revealed.pin.lat],
            },
          },
        ],
      },
    };
  }, [revealed, index]);

  if (phase === "setup") {
    return (
      <SetupScreen
        title={copy.title}
        lede={copy.lede}
        best={bests[setupKey]}
        onStart={start}
        aside={
          <BestTable
            rows={DIFFICULTIES}
            columns={LENGTHS}
            bestFor={(d, n) => bests[`${d}-${n}`]}
          />
        }
        rules={copy.rules}
      >
        <ChoiceCards
          title="Difficulty"
          options={DIFFICULTIES}
          value={difficulty}
          onChange={setDifficulty}
        />
        <ChoiceSegments title="Length" options={LENGTHS} value={length} onChange={setLength} />
      </SetupScreen>
    );
  }

  if (phase === "results" && summary) {
    return (
      <ResultsScreen
        kicker={`${DIFFICULTIES.find((d) => d.id === difficulty)?.label} · ${length} ${copy.many}`}
        result={summary.result}
        isBest={summary.isBest}
        previousBest={summary.previousBest}
        stats={[
          {
            label: mode === "capitals" ? "Spot on" : "Inside",
            value: `${rounds.filter((r) => r.hit.inside).length}/${rounds.length}`,
          },
          {
            label: "Average miss",
            value: formatKm(rounds.reduce((sum, r) => sum + r.hit.km, 0) / rounds.length),
          },
          { label: "Time", value: formatTime(summary.result.timeMs) },
        ]}
        rounds={rounds.map((r) => ({
          id: r.target.id,
          ok: r.hit.inside,
          title: r.target.name,
          subtitle: r.target.answerNote,
          note: r.hit.inside ? (mode === "capitals" ? "Spot on" : "Inside") : `${formatKm(r.hit.km)} off`,
          points: `+${r.points}`,
        }))}
        onAgain={start}
        onSettings={() => setPhase("setup")}
      />
    );
  }

  if (!country) return null;

  return (
    <div className={ui.game}>
      <Hud
        badge={`${DIFFICULTIES.find((d) => d.id === difficulty)?.label} · ${length}`}
        stats={[
          {
            label: mode === "capitals" ? "Capital" : "Country",
            value: `${index + 1}/${countries.length}`,
          },
          { label: "Score", value: score },
          { label: "Time", value: formatTime(clock.elapsed) },
        ]}
        onQuit={() => {
          clock.stop();
          setPhase("setup");
        }}
      />
      <ProgressBar
        steps={countries.map((_, i) => {
          const r = rounds[i];
          if (r) return r.hit.inside ? "good" : r.points >= MAX_POINTS / 2 ? "now" : "bad";
          return i === index ? "now" : "todo";
        })}
      />

      <MapCanvas
        scene="world"
        countries={mapCountries}
        markers={markers}
        shapes={shapes}
        focus={focus}
        onPick={revealed ? undefined : (lon, lat) => setPin({ lon, lat })}
        ariaLabel="Blank world map. Click to place your pin."
      />

      <div className={styles.bar} aria-live="polite">
        {revealed ? (
          <>
            <div className={styles.prompt}>
              <span
                className={`${styles.mark} ${revealed.hit.inside ? styles.good : styles.miss}`}
                aria-hidden="true"
              >
                {revealed.hit.inside ? "✓" : "↗"}
              </span>
              <div>
                <div className={styles.country}>
                  {country.name}
                  {country.answerNote && <span className={styles.hint}> · {country.answerNote}</span>}
                </div>
                <div className={styles.detail}>
                  {revealed.hit.inside
                    ? mode === "capitals"
                      ? `Spot on: ${formatKm(revealed.hit.km)} away`
                      : "Inside the country"
                    : mode === "capitals"
                      ? `${formatKm(revealed.hit.km)} from ${country.name}`
                      : `${formatKm(revealed.hit.km)} from the border`}
                  {" · "}
                  <strong className="mono">+{revealed.points}</strong>
                </div>
              </div>
            </div>
            <button type="button" className={ui.primaryButton} onClick={next}>
              {isLast ? "See results" : `Next ${copy.one}`}
              <kbd>↵</kbd>
            </button>
          </>
        ) : (
          <>
            <div className={styles.prompt}>
              <div>
                <div className={styles.ask}>Where is</div>
                <div className={styles.country}>{country.name}?</div>
                {country.hint && <div className={styles.detail}>{country.hint}</div>}
              </div>
            </div>
            <button
              type="button"
              className={ui.primaryButton}
              onClick={confirm}
              disabled={!pin}
            >
              {pin ? "Drop pin" : "Click the map"}
              {pin && <kbd>↵</kbd>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
