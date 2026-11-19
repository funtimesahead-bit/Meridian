"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapCanvas, { type MapMarker } from "@/components/map/MapCanvas";
import {
  BestTable,
  ChoiceCards,
  ChoiceSegments,
  Hud,
  ResultsScreen,
  SetupScreen,
  gameStyles as ui,
  type Choice,
} from "@/components/game/GameUi";
import { normalize } from "@/games/name-the-city/match";
import { loadCities, type CityData, type RingCity } from "@/games/rings/data";
import { CONTINENTS, continentsOf, type ContinentCode } from "@/lib/geo/countryInfo";
import type { SceneId } from "@/lib/geo/world";
import { saveResult, useBests, type Result } from "@/lib/scores";
import styles from "./CitySprint.module.css";

/* City Sprint: name as many cities on one continent as you can before the
   clock runs out. Any place of 50,000+ people counts; each name counts once. */

const GAME_KEY = "city-sprint";
const MIN_POPULATION = 50_000;

type Continent = Exclude<ContinentCode, "AN">;

const SCENES: Record<Continent, SceneId> = {
  EU: "europe",
  AS: "asia",
  AF: "africa",
  NA: "north-america",
  SA: "south-america",
  OC: "oceania-cities",
};

const DURATIONS: Choice<number>[] = [
  { id: 60, label: "1 minute" },
  { id: 120, label: "2 minutes" },
];

type Phase = "loading" | "error" | "setup" | "playing" | "results";
type Named = { key: string; city: RingCity };

function continentName(code: Continent): string {
  return CONTINENTS.find((c) => c.code === code)?.name ?? code;
}

export default function CitySprint() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<CityData | null>(null);
  const [continent, setContinent] = useState<Continent>("EU");
  const [seconds, setSeconds] = useState(60);
  const [named, setNamed] = useState<Named[]>([]);
  const [guess, setGuess] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [endsAt, setEndsAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [summary, setSummary] = useState<{ result: Result; isBest: boolean; previousBest?: Result } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bests = useBests(GAME_KEY);
  const setupKey = `${continent}-${seconds}`;

  useEffect(() => {
    let cancelled = false;
    loadCities()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setPhase("setup");
      })
      .catch(() => !cancelled && setPhase("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  /** Every city of 50,000+ with the continents it counts for, biggest first. */
  const big = useMemo(
    () =>
      (data?.cities ?? [])
        .filter((c) => c.population >= MIN_POPULATION)
        .map((city) => ({ city, continents: continentsOf(city.countryCode, city.lon, city.lat) })),
    [data],
  );

  /** For the chosen continent: each spelling -> the cities it could mean. */
  const pool = useMemo(() => {
    const byKey = new Map<string, RingCity[]>();
    const names = new Set<string>();
    for (const { city, continents } of big) {
      if (!continents.includes(continent)) continue;
      names.add(normalize(city.name));
      for (const k of city.keys) {
        const list = byKey.get(k);
        if (list) list.push(city);
        else byKey.set(k, [city]);
      }
    }
    return { byKey, size: names.size };
  }, [big, continent]);

  const sizes = useMemo(() => {
    const out = {} as Record<Continent, number>;
    for (const c of CONTINENTS) {
      out[c.code] = new Set(
        big.filter((b) => b.continents.includes(c.code)).map((b) => normalize(b.city.name)),
      ).size;
    }
    return out;
  }, [big]);

  const remaining = phase === "playing" ? Math.max(0, endsAt - now) : seconds * 1000;

  const finish = useCallback(
    (list: Named[]) => {
      const result: Result = {
        score: list.length,
        max: pool.size,
        timeMs: seconds * 1000,
        date: new Date().toISOString(),
      };
      setSummary({ result, ...saveResult(GAME_KEY, setupKey, result) });
      setPhase("results");
    },
    [pool.size, seconds, setupKey],
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "playing" && remaining <= 0) finish(named);
  }, [phase, remaining, finish, named]);

  useEffect(() => {
    if (phase === "playing") inputRef.current?.focus({ preventScroll: true });
  }, [phase]);

  const start = () => {
    const t = Date.now();
    setNamed([]);
    setGuess("");
    setNotice(null);
    setSummary(null);
    setNow(t);
    setEndsAt(t + seconds * 1000);
    setPhase("playing");
  };

  const complain = (message: string) => {
    setNotice(message);
    setShaking(true);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (phase !== "playing") return;
    const key = normalize(guess);
    if (!key) return;
    setGuess("");

    const matches = pool.byKey.get(key);
    if (!matches?.length) {
      // Is it a real city somewhere else?
      const elsewhere = data?.byKey.get(key)?.find((c) => c.population >= MIN_POPULATION);
      if (elsewhere) {
        const where = continentsOf(elsewhere.countryCode, elsewhere.lon, elsewhere.lat)[0];
        complain(
          where
            ? `${elsewhere.name} is in ${continentName(where as Continent)}, not ${continentName(continent)}.`
            : `${elsewhere.name} doesn't count here.`,
        );
      } else {
        complain(`No city of ${MIN_POPULATION.toLocaleString("en")}+ in ${continentName(continent)} is called that.`);
      }
      return;
    }
    // Each name counts once, even when several cities share it.
    const city = matches[0];
    const nameKey = normalize(city.name);
    if (named.some((n) => n.key === nameKey)) {
      complain(`You already have ${city.name}.`);
      return;
    }
    setNotice(null);
    setNamed((list) => [{ key: nameKey, city }, ...list]);
  };

  const markers: MapMarker[] = useMemo(
    () =>
      named.map((n, i) => ({
        id: `${n.key}-${i}`,
        lon: n.city.lon,
        lat: n.city.lat,
        tone: "good" as const,
        size: i === 0 ? 4.5 : 3.2,
        label: n.city.name,
        labelOnHover: i !== 0,
      })),
    [named],
  );

  /** The biggest cities left unnamed, to learn from afterwards. */
  const missed = useMemo(() => {
    if (phase !== "results") return [];
    const have = new Set(named.map((n) => n.key));
    const out: RingCity[] = [];
    const seen = new Set<string>();
    for (const { city, continents } of big) {
      if (!continents.includes(continent)) continue;
      const k = normalize(city.name);
      if (have.has(k) || seen.has(k)) continue;
      seen.add(k);
      out.push(city);
      if (out.length === 12) break;
    }
    return out;
  }, [phase, named, big, continent]);

  const continentChoices: Choice<Continent>[] = CONTINENTS.map((c) => ({
    id: c.code,
    label: c.name,
    meta: data ? `${sizes[c.code].toLocaleString("en")} cities` : undefined,
  }));

  if (phase === "loading" || phase === "error") {
    return (
      <div className="page loading" role="status">
        {phase === "loading" ? (
          <>
            <span className="loading__spinner" aria-hidden="true" />
            Loading the city list…
          </>
        ) : (
          "The city list could not be loaded. Check your connection and reload the page."
        )}
      </div>
    );
  }

  if (phase === "setup") {
    return (
      <SetupScreen
        title="City Sprint"
        lede="Pick a continent and race the clock: name as many of its cities as you can before time runs out. Any city or town of 50,000 people or more counts."
        best={bests[setupKey]}
        onStart={start}
        startNote={
          bests[setupKey] ? (
            <>
              Your best here: <strong className="mono">{bests[setupKey].score}</strong> cities
            </>
          ) : undefined
        }
        aside={
          <BestTable rows={continentChoices} columns={DURATIONS} bestFor={(c, s) => bests[`${c}-${s}`]} />
        }
        rules={[
          "Type a city and press Enter; each correct one is added",
          "Every name counts once, even if several cities share it",
          "Spelling must match, but accents and capitals don't matter",
          "Russia, Turkey, Kazakhstan, Georgia and Azerbaijan count for Europe and Asia; Hawaii counts for Oceania",
        ]}
      >
        <ChoiceCards title="Continent" options={continentChoices} value={continent} onChange={setContinent} />
        <ChoiceSegments title="Time" options={DURATIONS} value={seconds} onChange={setSeconds} />
      </SetupScreen>
    );
  }

  if (phase === "results" && summary) {
    return (
      <>
        <ResultsScreen
          kicker={`${continentName(continent)} · ${seconds === 60 ? "1 minute" : "2 minutes"}`}
          result={summary.result}
          isBest={summary.isBest}
          previousBest={summary.previousBest}
          stats={[
            { label: "Cities", value: named.length },
            { label: "Per minute", value: Math.round((named.length * 60) / seconds) },
            {
              label: "Biggest named",
              value: named.length
                ? [...named].sort((a, b) => b.city.population - a.city.population)[0].city.name
                : "–",
            },
          ]}
          onAgain={start}
          onSettings={() => setPhase("setup")}
        />
        <div className={styles.namedWrap}>
          <h2>Biggest cities you didn&apos;t name</h2>
          <p className={styles.chips}>
            {missed.map((c) => (
              <span key={c.name} className={`${styles.chip} ${styles.missed}`}>
                {c.name}{" "}
                <span className={styles.pop}>{(c.population / 1_000_000).toFixed(1)}M</span>
              </span>
            ))}
          </p>
        </div>
        {named.length > 0 && (
          <div className={styles.namedWrap}>
            <h2>You named</h2>
            <p className={styles.chips}>
              {[...named].reverse().map((n) => (
                <span key={n.key} className={styles.chip}>
                  {n.city.name}
                </span>
              ))}
            </p>
          </div>
        )}
      </>
    );
  }

  const secondsLeft = Math.ceil(remaining / 1000);

  return (
    <div className={ui.game}>
      <Hud
        badge={continentName(continent)}
        stats={[
          { label: "Cities", value: named.length },
          {
            label: "Time left",
            value: `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`,
          },
        ]}
        onQuit={() => finish(named)}
        quitLabel="Stop"
      />
      <div className={styles.timer} aria-hidden="true">
        <span
          className={`${styles.timerFill} ${remaining < 10_000 ? styles.timerLow : ""}`}
          style={{ width: `${(remaining / (seconds * 1000)) * 100}%` }}
        />
      </div>

      <form onSubmit={submit}>
        <div className={ui.inputRow}>
          <input
            ref={inputRef}
            className={`${ui.input} ${shaking ? ui.shake : ""}`}
            onAnimationEnd={() => setShaking(false)}
            value={guess}
            onChange={(e) => {
              setGuess(e.target.value);
              if (notice) setNotice(null);
            }}
            placeholder={`A city in ${continentName(continent)}`}
            aria-label="Type a city"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck={false}
            enterKeyHint="go"
          />
        </div>
        <p className={ui.status} aria-live="polite">
          {notice ? (
            <span className={ui.notice}>{notice}</span>
          ) : named[0] ? (
            <span>
              Added <strong className={styles.last}>{named[0].city.name}</strong>. Keep going!
            </span>
          ) : (
            <span>Type a city and press Enter.</span>
          )}
        </p>
      </form>

      <div onMouseDown={(event) => event.preventDefault()}>
        <MapCanvas
          scene={SCENES[continent]}
          borders
          tall
          markers={markers}
          ariaLabel={`Map of ${continentName(continent)} with the cities you have named`}
        />
      </div>
    </div>
  );
}
