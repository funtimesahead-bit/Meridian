"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoCircle } from "d3-geo";
import MapCanvas, {
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
import { getCentredScene } from "@/lib/geo/world";
import { formatTime, saveResult, useBests, type Result } from "@/lib/scores";
import { useStopwatch } from "@/lib/useStopwatch";
import {
  RING_RULES,
  buildRingGame,
  countryName,
  formatPopulation,
  loadCities,
  readGuess,
  type CityData,
  type Difficulty,
  type RingCity,
  type RingGame as Game,
} from "./data";
import styles from "./RingGame.module.css";

/** "five": name five cities in each ring. "biggest": name the largest city in each ring. */
export type AnyRingMode = "five" | "biggest";

const CITIES_PER_RING = 5;
const STRIKES_PER_RING = 3;
const BIGGEST_POINTS = [100, 60, 30];
const OUTSIDE_PENALTY = 10;
const AUTO_ADVANCE_MS = 1400;
/** In the biggest-city game, places this close to the centre count as part of it. */
const SUBURB_KM = 35;
const KM_PER_DEGREE = 111.195;

const COPY = {
  five: {
    key: "ring-five",
    title: "Ring of Five",
    lede: "A city is picked and a ring drawn around it on a blank, borderless map. Name five cities inside the ring. Then the ring widens and you name five more in the new band, and so on outward.",
  },
  biggest: {
    key: "ring-biggest",
    title: "Biggest in the Ring",
    lede: "A city is picked and a ring drawn around it on a blank, borderless map. Name the single most populous city inside the ring. Then the ring widens and you find the biggest city in the new band, and so on outward.",
  },
};

const RING_COUNTS: Choice<number>[] = [
  { id: 5, label: "5 rings" },
  { id: 8, label: "8 rings" },
];

const DIFFICULTIES: Choice<Difficulty>[] = [
  {
    id: "easy",
    label: "Easy",
    meta: `${RING_RULES.easy.stepKm} km rings`,
    description: "Wide rings around one of the world's most famous cities.",
  },
  {
    id: "medium",
    label: "Medium",
    meta: `${RING_RULES.medium.stepKm} km rings`,
    description: "Tighter rings around a well-known city or capital.",
  },
  {
    id: "hard",
    label: "Hard",
    meta: `${RING_RULES.hard.stepKm} km rings`,
    description: "Small rings around a small city anywhere, and the centre is not named.",
  },
];

type RingState = {
  named: RingCity[];
  /** Biggest mode: cities in the ring that were guessed but are not the largest. */
  wrong: RingCity[];
  penalty: number;
  done: null | "cleared" | "gave-up" | "failed";
  points: number;
};

const emptyRing = (): RingState => ({
  named: [],
  wrong: [],
  penalty: 0,
  done: null,
  points: 0,
});

type Phase = "setup" | "playing" | "results";

function circle(city: RingCity, km: number) {
  return geoCircle()
    .center([city.lon, city.lat])
    .radius(km / KM_PER_DEGREE)
    .precision(0.5)();
}

export default function RingGame({ mode }: { mode: AnyRingMode }) {
  const copy = COPY[mode];
  const [phase, setPhase] = useState<Phase>("setup");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [ringCount, setRingCount] = useState(5);

  const [data, setData] = useState<CityData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  const [ringIndex, setRingIndex] = useState(0);
  const [states, setStates] = useState<RingState[]>([]);
  const [guess, setGuess] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [summary, setSummary] = useState<{
    result: Result;
    isBest: boolean;
    previousBest?: Result;
  } | null>(null);

  const clock = useStopwatch();
  const bests = useBests(copy.key);
  const setupKey = `${difficulty}-${ringCount}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadCities()
      .then((loaded) => !cancelled && setData(loaded))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const ring = game?.rings[ringIndex] ?? [];
  const state = states[ringIndex];
  const required = Math.min(CITIES_PER_RING, ring.length);
  const isLast = game ? ringIndex === game.rings.length - 1 : false;
  const maxScore =
    mode === "five"
      ? (game?.rings.reduce((sum, r) => sum + Math.min(CITIES_PER_RING, r.length), 0) ?? 0)
      : ringCount * BIGGEST_POINTS[0];
  const score = Math.max(
    0,
    states.reduce((sum, s) => sum + s.points - s.penalty, 0),
  );

  const start = useCallback(() => {
    if (!data) return;
    const built = buildRingGame(
      data,
      difficulty,
      ringCount,
      mode === "five" ? 7 : 3,
      mode === "biggest" ? SUBURB_KM : 1,
    );
    setGame(built);
    setStates(built.rings.map(emptyRing));
    setRingIndex(0);
    setGuess("");
    setNotice(null);
    setSummary(null);
    clock.begin();
    setPhase("playing");
  }, [clock, data, difficulty, mode, ringCount]);

  const updateRing = useCallback(
    (change: (s: RingState) => RingState) => {
      setStates((all) => all.map((s, i) => (i === ringIndex ? change(s) : s)));
    },
    [ringIndex],
  );

  const next = useCallback(() => {
    if (!game || !state?.done) return;
    if (isLast) {
      const result: Result = {
        score,
        max: maxScore,
        timeMs: clock.stop(),
        date: new Date().toISOString(),
      };
      setSummary({ result, ...saveResult(copy.key, setupKey, result) });
      setPhase("results");
      return;
    }
    setRingIndex((i) => i + 1);
    setGuess("");
    setNotice(null);
  }, [clock, copy.key, game, isLast, maxScore, score, setupKey, state]);

  // Move on by itself after a ring is cleared.
  useEffect(() => {
    if (phase !== "playing" || state?.done !== "cleared") return;
    const id = window.setTimeout(next, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(id);
    // `next` changes on every clock tick; the ring's state is what matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, ringIndex, state?.done]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (state?.done) nextRef.current?.focus({ preventScroll: true });
    else inputRef.current?.focus({ preventScroll: true });
  }, [phase, ringIndex, state?.done]);

  const complain = (message: string) => {
    setNotice(message);
    setShaking(true);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!data || !game || !state) return;
    if (state.done) {
      next();
      return;
    }
    const text = guess.trim();
    if (!text) return;

    const reading = readGuess(data, game, ring, text, (city) =>
      state.named.includes(city) || state.wrong.includes(city) ? 0 : 1,
    );

    if (reading.kind === "unknown") {
      complain("No city of 15,000+ people matches that name.");
      return;
    }
    if (reading.kind === "centre") {
      complain("That is the centre city. It does not count.");
      setGuess("");
      return;
    }

    if (reading.kind === "elsewhere" && reading.km < game.excludeKm) {
      complain(`${reading.city.name} is part of the centre city's area. It does not count.`);
      setGuess("");
      return;
    }
    if (reading.kind === "elsewhere") {
      const inner = ringIndex * game.stepKm;
      const where =
        reading.km < inner ? "inside an earlier ring" : "outside the ring";
      const km = `${Math.round(reading.km).toLocaleString("en")} km from the centre`;
      if (mode === "biggest") {
        updateRing((s) => ({ ...s, penalty: s.penalty + OUTSIDE_PENALTY }));
        complain(`${reading.city.name} is ${where} (${km}). −${OUTSIDE_PENALTY} points.`);
      } else {
        complain(`${reading.city.name} is ${where} (${km}).`);
      }
      setGuess("");
      return;
    }

    const city = reading.city;
    setGuess("");

    if (mode === "five") {
      if (state.named.includes(city)) {
        complain(`${city.name} is already on your list.`);
        return;
      }
      const named = [...state.named, city];
      setNotice(null);
      updateRing((s) => ({
        ...s,
        named,
        points: named.length,
        done: named.length >= required ? "cleared" : null,
      }));
      return;
    }

    // Biggest mode.
    if (city === ring[0]) {
      setNotice(null);
      updateRing((s) => ({
        ...s,
        named: [city],
        points: BIGGEST_POINTS[s.wrong.length] ?? 0,
        done: "cleared",
      }));
      return;
    }
    if (state.wrong.includes(city)) {
      complain(`You already tried ${city.name}.`);
      return;
    }
    const wrong = [...state.wrong, city];
    if (wrong.length >= STRIKES_PER_RING) {
      setNotice(null);
      setShaking(true);
      updateRing((s) => ({ ...s, wrong, done: "failed" }));
    } else {
      complain(
        difficulty === "hard"
          ? `${city.name} is not the biggest city in the ring.`
          : `${city.name} is #${ring.indexOf(city) + 1} in this ring.`,
      );
      updateRing((s) => ({ ...s, wrong }));
    }
  };

  const giveUp = () => {
    setNotice(null);
    setGuess("");
    updateRing((s) => ({ ...s, done: mode === "five" ? "gave-up" : "failed" }));
  };

  /* ---- What the map shows ---- */

  /** Cities revealed when a ring was not finished. */
  const revealedFor = useCallback(
    (index: number): RingCity[] => {
      if (!game) return [];
      const s = states[index];
      const cities = game.rings[index];
      if (!s?.done || s.done === "cleared") return [];
      if (mode === "biggest") return cities.slice(0, 1);
      const need = Math.min(CITIES_PER_RING, cities.length) - s.named.length;
      return cities.filter((c) => !s.named.includes(c)).slice(0, need);
    },
    [game, mode, states],
  );

  const markers: MapMarker[] = useMemo(() => {
    if (!game) return [];
    const list: MapMarker[] = [];
    // Labels point away from the centre so they collide less.
    const side = (city: RingCity) => (city.lon < game.centre.lon ? "left" : "right");
    states.forEach((s, i) => {
      if (i > ringIndex) return;
      // Once a ring is over its names are tucked away; hover a dot to read it.
      // In the biggest-city game the correct answers stay labelled.
      const over = Boolean(s.done);
      const quiet = over;
      const answerQuiet = over && mode === "five";
      for (const city of s.wrong) {
        list.push({ id: `w${city.id}`, lon: city.lon, lat: city.lat, tone: "dim", size: 3.5, label: city.name, labelSide: side(city), labelOnHover: quiet });
      }
      for (const city of revealedFor(i)) {
        list.push({ id: `r${city.id}`, lon: city.lon, lat: city.lat, tone: "bad", size: 4, label: city.name, labelSide: side(city), labelOnHover: answerQuiet });
      }
      for (const city of s.named) {
        list.push({ id: `n${city.id}`, lon: city.lon, lat: city.lat, tone: "good", size: 4, label: city.name, labelSide: side(city), labelOnHover: answerQuiet });
      }
    });
    list.push({
      id: "centre",
      lon: game.centre.lon,
      lat: game.centre.lat,
      tone: "plain",
      size: 5,
      pulse: true,
      label: game.centreNamed ? game.centre.name : undefined,
    });
    return list;
  }, [game, states, ringIndex, revealedFor]);

  const shapes: MapShape[] = useMemo(() => {
    if (!game) return [];
    const outer = circle(game.centre, (ringIndex + 1) * game.stepKm);
    const list: MapShape[] = [];
    if (ringIndex === 0) {
      list.push({ id: "band-0", style: "band", geo: outer });
    } else {
      list.push({
        id: `band-${ringIndex}`,
        style: "band",
        geo: [outer, circle(game.centre, ringIndex * game.stepKm)],
      });
      for (let i = 1; i <= ringIndex; i++) {
        list.push({ id: `inner-${i}`, style: "ringFaint", geo: circle(game.centre, i * game.stepKm) });
      }
    }
    list.push({ id: `outer-${ringIndex}`, style: "ring", geo: outer });
    return list;
  }, [game, ringIndex]);

  const focus: MapFocus | undefined = useMemo(() => {
    if (!game) return undefined;
    return {
      key: `${game.centre.id}-${ringIndex}`,
      geo: circle(game.centre, (ringIndex + 1) * game.stepKm),
      pad: 1.25,
      maxZoom: 36,
    };
  }, [game, ringIndex]);

  // A map centred on the chosen city, so the rings are true circles.
  const scene = useMemo(
    () =>
      game
        ? getCentredScene(game.centre.lon, game.centre.lat, game.stepKm * game.rings.length)
        : "world",
    [game],
  );

  /* ---- Screens ---- */

  const difficultyLabel = DIFFICULTIES.find((d) => d.id === difficulty)?.label ?? "";

  if (phase === "setup") {
    return (
      <SetupScreen
        title={copy.title}
        lede={copy.lede}
        best={bests[setupKey]}
        onStart={start}
        startDisabled={!data}
        startNote={
          loadError
            ? "The city list could not be loaded. Check your connection and reload."
            : !data
              ? "Loading the city list…"
              : undefined
        }
        aside={
          <BestTable
            rows={DIFFICULTIES}
            columns={RING_COUNTS}
            bestFor={(d, n) => bests[`${d}-${n}`]}
          />
        }
        rules={
          mode === "five"
            ? [
                <>
                  <span className="mono">1</span> point per city, five cities per ring
                </>,
                "Any town or city of 15,000+ people counts",
                "Unlimited guesses; give up on a ring to see what was there",
                "Each new ring only counts cities in the new band",
              ]
            : [
                <>
                  <span className="mono">100</span> points first try,{" "}
                  <span className="mono">60</span> second, <span className="mono">30</span> third
                </>,
                "A city in the ring that is not the biggest costs a strike; three strikes and the ring is lost",
                "On Easy and Medium a wrong city tells you where it ranks in the ring",
                "After each ring, its five biggest cities are listed on the map",
                <>
                  A city outside the ring is not a strike, but costs{" "}
                  <span className="mono">{OUTSIDE_PENALTY}</span> points
                </>,
                `The centre city and its suburbs (within ${SUBURB_KM} km) never count`,
              ]
        }
      >
        <ChoiceCards
          title="Difficulty"
          options={DIFFICULTIES}
          value={difficulty}
          onChange={setDifficulty}
        />
        <ChoiceSegments
          title="Length"
          options={RING_COUNTS}
          value={ringCount}
          onChange={setRingCount}
        />
      </SetupScreen>
    );
  }

  if (!game || !state) return null;

  const rangeLabel = (index: number) =>
    index === 0
      ? `0–${game.stepKm} km`
      : `${index * game.stepKm}–${(index + 1) * game.stepKm} km`;

  if (phase === "results" && summary) {
    const penalties = states.reduce((sum, s) => sum + s.penalty, 0);
    return (
      <ResultsScreen
        kicker={`${difficultyLabel} · ${ringCount} rings · around ${game.centre.name}, ${countryName(game.centre.countryCode)}`}
        result={summary.result}
        isBest={summary.isBest}
        previousBest={summary.previousBest}
        stats={
          mode === "five"
            ? [
                {
                  label: "Rings cleared",
                  value: `${states.filter((s) => s.done === "cleared").length}/${ringCount}`,
                },
                { label: "Cities", value: states.reduce((sum, s) => sum + s.named.length, 0) },
                { label: "Time", value: formatTime(summary.result.timeMs) },
              ]
            : [
                {
                  label: "Found",
                  value: `${states.filter((s) => s.done === "cleared").length}/${ringCount}`,
                },
                { label: "Penalties", value: penalties ? `−${penalties}` : "0" },
                { label: "Time", value: formatTime(summary.result.timeMs) },
              ]
        }
        rounds={states.map((s, i) =>
          mode === "five"
            ? {
                id: `ring-${i}`,
                ok: s.done === "cleared",
                title: `Ring ${i + 1}`,
                subtitle: s.named.map((c) => c.name).join(", ") || "No cities named",
                points: `${s.named.length}/${Math.min(CITIES_PER_RING, game.rings[i].length)}`,
              }
            : {
                id: `ring-${i}`,
                ok: s.done === "cleared",
                title: game.rings[i][0]?.name ?? "—",
                subtitle: game.rings[i][0]
                  ? `${formatPopulation(game.rings[i][0].population)} · ${rangeLabel(i)}`
                  : undefined,
                note:
                  s.done === "cleared"
                    ? ["First try", "Second try", "Third try"][s.wrong.length]
                    : "Missed",
                points: `+${s.points}`,
              },
        )}
        onAgain={start}
        onSettings={() => setPhase("setup")}
      />
    );
  }

  const centreLabel = game.centreNamed ? game.centre.name : "the marked city";
  const where =
    ringIndex === 0
      ? `within ${game.stepKm} km of ${centreLabel}`
      : `between ${ringIndex * game.stepKm} and ${(ringIndex + 1) * game.stepKm} km from ${centreLabel}`;
  const revealed = revealedFor(ringIndex);
  /** The ring whose top cities are listed: this one once it is over, else the one before. */
  const finishedIndex = state.done ? ringIndex : ringIndex - 1;

  return (
    <div className={ui.game}>
      <Hud
        badge={`${difficultyLabel} · ${ringCount}`}
        stats={[
          { label: "Ring", value: `${ringIndex + 1}/${ringCount}` },
          { label: "Score", value: score },
          { label: "Time", value: formatTime(clock.elapsed) },
        ]}
        onQuit={() => {
          clock.stop();
          setPhase("setup");
        }}
      />
      <ProgressBar
        steps={states.map((s, i) =>
          s.done ? (s.done === "cleared" ? "good" : "bad") : i === ringIndex ? "now" : "todo",
        )}
      />

      {/* Dragging or zooming the map must not pull the keyboard out of the answer box. */}
      <div className={styles.mapWrap} onMouseDown={(event) => event.preventDefault()}>
        <MapCanvas
          scene={scene}
          shapes={shapes}
          markers={markers}
          focus={focus}
          ariaLabel="Blank map with a ring drawn around a city"
        />
        {mode === "biggest" && finishedIndex >= 0 && (
          <aside className={styles.topList} aria-live="polite">
            <h2>
              Ring {finishedIndex + 1} · biggest cities
              <span>{rangeLabel(finishedIndex)}</span>
            </h2>
            <ol>
              {game.rings[finishedIndex].slice(0, 5).map((city) => (
                <li key={city.id}>
                  <span className={styles.topName}>{city.name}</span>
                  <span className="mono">{formatPopulation(city.population)}</span>
                </li>
              ))}
            </ol>
          </aside>
        )}
      </div>

      <form className={ui.answer} onSubmit={submit}>
        <p className={styles.prompt}>
          {mode === "five" ? (
            <>
              Name <strong>{required} cities</strong> {where}
            </>
          ) : (
            <>
              Name the <strong>biggest city</strong> {where}
            </>
          )}
        </p>

        {state.done ? (
          <div className={ui.reveal} aria-live="polite">
            <div
              className={`${ui.revealText} ${state.done === "cleared" ? ui.good : ui.bad}`}
            >
              <span className={ui.revealMark} aria-hidden="true">
                {state.done === "cleared" ? "✓" : "✕"}
              </span>
              <div>
                {mode === "five" ? (
                  <>
                    <div className={ui.revealCity}>
                      <strong>
                        {state.done === "cleared"
                          ? "Ring cleared"
                          : `Named ${state.named.length} of ${required}`}
                      </strong>
                    </div>
                    <div className={ui.revealPoints}>
                      {state.done === "cleared"
                        ? `+${state.points} points`
                        : `Also here: ${revealed.map((c) => c.name).join(", ")}`}
                    </div>
                  </>
                ) : (
                  <>
                    <div className={ui.revealCity}>
                      {state.done === "cleared" ? "" : "It was "}
                      <strong>{ring[0]?.name}</strong>
                      {ring[0] && (
                        <span className={ui.revealCountry}>
                          {countryName(ring[0].countryCode)} ·{" "}
                          {formatPopulation(ring[0].population)} people
                        </span>
                      )}
                    </div>
                    <div className={ui.revealPoints}>
                      {state.done === "cleared" ? `+${state.points} points` : "0 points"}
                    </div>
                  </>
                )}
              </div>
            </div>
            <button ref={nextRef} type="submit" className={ui.primaryButton}>
              {isLast ? "See results" : "Next ring"}
              <kbd>↵</kbd>
            </button>
          </div>
        ) : (
          <>
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
                placeholder={mode === "five" ? "Type a city" : "Type the biggest city"}
                aria-label="Your guess"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="words"
                spellCheck={false}
                enterKeyHint="go"
              />
              <button type="submit" className={ui.primaryButton} disabled={!guess.trim()}>
                Guess
              </button>
              <button type="button" className={ui.ghostButton} onClick={giveUp}>
                Give up
              </button>
            </div>

            <div className={ui.status} aria-live="polite">
              {mode === "five" ? (
                <span className={styles.slots}>
                  {Array.from({ length: required }, (_, i) => (
                    <span
                      key={i}
                      className={`${styles.slot} ${state.named[i] ? styles.slotFilled : ""}`}
                    >
                      {state.named[i]?.name ?? i + 1}
                    </span>
                  ))}
                </span>
              ) : (
                <span
                  className={ui.tries}
                  aria-label={`${STRIKES_PER_RING - state.wrong.length} strikes left`}
                >
                  {Array.from({ length: STRIKES_PER_RING }, (_, i) => (
                    <span
                      key={i}
                      className={`${ui.pip} ${i < STRIKES_PER_RING - state.wrong.length ? ui.pipOn : ""}`}
                    />
                  ))}
                  <span className={ui.triesText}>
                    {STRIKES_PER_RING - state.wrong.length}{" "}
                    {STRIKES_PER_RING - state.wrong.length === 1 ? "strike" : "strikes"} left
                  </span>
                </span>
              )}
              {notice && <span className={ui.notice}>{notice}</span>}
            </div>
          </>
        )}
      </form>
    </div>
  );
}
