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
import { COUNTRY_SHAPES, measureToCountry, type CountryHit } from "@/lib/geo/world";
import { formatTime, saveResult, useBests, type Result } from "@/lib/scores";
import { useStopwatch } from "@/lib/useStopwatch";
import {
  COUNTRY_POOLS,
  MAX_POINTS,
  pickCountries,
  pointsFor,
  type Difficulty,
  type PinCountry,
} from "./countries";
import styles from "./PinDrop.module.css";

const GAME_KEY = "pin-drop";

const DIFFICULTIES: Choice<Difficulty>[] = [
  {
    id: "easy",
    label: "Easy",
    meta: `${COUNTRY_POOLS.easy.length} countries`,
    description: "Big or unmistakable countries.",
  },
  {
    id: "medium",
    label: "Medium",
    meta: `${COUNTRY_POOLS.medium.length} countries`,
    description: "Countries you know by name but may struggle to place.",
  },
  {
    id: "hard",
    label: "Hard",
    meta: `${COUNTRY_POOLS.hard.length} countries`,
    description: "Small, tucked-away or rarely mentioned countries.",
  },
];

const LENGTHS: Choice<number>[] = [
  { id: 10, label: "10 countries" },
  { id: 20, label: "20 countries" },
];

type Pin = { lon: number; lat: number };
type Round = { country: PinCountry; pin: Pin; hit: CountryHit; points: number };
type Phase = "setup" | "playing" | "results";

function formatKm(km: number): string {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString("en")} km`;
}

export default function PinDrop() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [length, setLength] = useState(10);

  const [countries, setCountries] = useState<PinCountry[]>([]);
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
    setCountries(pickCountries(difficulty, length));
    setIndex(0);
    setPin(null);
    setRounds([]);
    setSummary(null);
    clock.begin();
    setPhase("playing");
  }, [clock, difficulty, length]);

  const confirm = useCallback(() => {
    if (!country || !pin || revealed) return;
    const hit = measureToCountry(country.shapes, pin.lon, pin.lat);
    setRounds((r) => [...r, { country, pin, hit, points: pointsFor(hit.inside, hit.km) }]);
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
  }, [clock, countries.length, isLast, revealed, score, setupKey]);

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
    return revealed.country.shapes.map((name) => ({
      name,
      tone: revealed.hit.inside ? "good" : "accent",
    }));
  }, [revealed]);

  const markers: MapMarker[] = useMemo(() => {
    if (!pin) return [];
    return [
      {
        id: "pin",
        lon: pin.lon,
        lat: pin.lat,
        shape: "pin",
        tone: revealed ? (revealed.hit.inside ? "good" : "bad") : "plain",
      },
    ];
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
          ...revealed.country.shapes.flatMap((name) => {
            const shape = COUNTRY_SHAPES.get(name);
            return shape ? [shape] : [];
          }),
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
        title="Pin Drop"
        lede="You get a country and a blank world map with no borders. Drop a pin where you think it is. Land inside the country for full marks; miss, and the closer you are the more you score."
        best={bests[setupKey]}
        onStart={start}
        aside={
          <BestTable
            rows={DIFFICULTIES}
            columns={LENGTHS}
            bestFor={(d, n) => bests[`${d}-${n}`]}
          />
        }
        rules={[
          <>
            <span className="mono">{MAX_POINTS}</span> points for a pin inside the country
          </>,
          "Outside, points drop with the distance to its nearest border",
          <>
            About <span className="mono">850</span> at 100 km,{" "}
            <span className="mono">430</span> at 500 km,{" "}
            <span className="mono">190</span> at 1,000 km
          </>,
          "Click to place the pin, click again to move it, then drop it",
        ]}
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
        kicker={`${DIFFICULTIES.find((d) => d.id === difficulty)?.label} · ${length} countries`}
        result={summary.result}
        isBest={summary.isBest}
        previousBest={summary.previousBest}
        stats={[
          { label: "Inside", value: `${rounds.filter((r) => r.hit.inside).length}/${rounds.length}` },
          {
            label: "Average miss",
            value: formatKm(rounds.reduce((sum, r) => sum + r.hit.km, 0) / rounds.length),
          },
          { label: "Time", value: formatTime(summary.result.timeMs) },
        ]}
        rounds={rounds.map((r) => ({
          id: r.country.name,
          ok: r.hit.inside,
          title: r.country.name,
          note: r.hit.inside ? "Inside" : `${formatKm(r.hit.km)} off`,
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
          { label: "Country", value: `${index + 1}/${countries.length}` },
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
                <div className={styles.country}>{country.name}</div>
                <div className={styles.detail}>
                  {revealed.hit.inside
                    ? "Inside the country"
                    : `${formatKm(revealed.hit.km)} from the border`}
                  {" · "}
                  <strong className="mono">+{revealed.points}</strong>
                </div>
              </div>
            </div>
            <button type="button" className={ui.primaryButton} onClick={next}>
              {isLast ? "See results" : "Next country"}
              <kbd>↵</kbd>
            </button>
          </>
        ) : (
          <>
            <div className={styles.prompt}>
              <div>
                <div className={styles.ask}>Where is</div>
                <div className={styles.country}>{country.name}?</div>
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
