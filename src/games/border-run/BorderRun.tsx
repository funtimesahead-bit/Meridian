"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapCanvas, {
  type MapCountry,
  type MapFocus,
  type MapMarker,
} from "@/components/map/MapCanvas";
import {
  ChoiceCards,
  Hud,
  SetupScreen,
  gameStyles as ui,
  type Choice,
} from "@/components/game/GameUi";
import { countryGeometry } from "@/lib/geo/world";
import { formatTime, saveResult, useBests, type Result } from "@/lib/scores";
import { useStopwatch } from "@/lib/useStopwatch";
import {
  ROUTE_RULES,
  distancesFrom,
  findCountry,
  labelPoint,
  pickPuzzle,
  shortestRoute,
  type Country,
  type Difficulty,
  type Puzzle,
} from "./graph";
import styles from "./BorderRun.module.css";

const GAME_KEY = "border-run";
const MAX_SCORE = 100;
const EXTRA_GUESS_COST = 12;
const MIN_SOLVED_SCORE = 20;

const DIFFICULTIES: Choice<Difficulty>[] = (["easy", "medium", "hard"] as const).map((id) => {
  const rules = ROUTE_RULES[id];
  return {
    id,
    label: { easy: "Easy", medium: "Medium", hard: "Hard" }[id],
    meta: `${rules.minBetween}–${rules.maxBetween} countries between`,
    description: {
      easy: "A short hop: the two countries are only a few borders apart.",
      medium: "A proper journey across a region.",
      hard: "A long haul, often across a whole continent or two.",
    }[id],
  };
});

type Guess = { country: Country; kind: "best" | "detour" };
type Phase = "setup" | "playing" | "done";

export default function BorderRun() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [summary, setSummary] = useState<{
    solved: boolean;
    result: Result;
    isBest: boolean;
    previousBest?: Result;
    route: string[];
  } | null>(null);

  const clock = useStopwatch();
  const bests = useBests(GAME_KEY);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === "playing") inputRef.current?.focus({ preventScroll: true });
  }, [phase, guesses.length]);

  const start = useCallback(() => {
    setPuzzle(pickPuzzle(difficulty));
    setGuesses([]);
    setText("");
    setNotice(null);
    setSummary(null);
    clock.begin();
    setPhase("playing");
  }, [clock, difficulty]);

  /** Shortest-route distances from each end, for judging guesses. */
  const fromStart = useMemo(
    () => (puzzle ? distancesFrom(puzzle.start.name) : new Map<string, number>()),
    [puzzle],
  );
  const fromEnd = useMemo(
    () => (puzzle ? distancesFrom(puzzle.end.name) : new Map<string, number>()),
    [puzzle],
  );

  const finish = (all: Guess[], solved: boolean) => {
    if (!puzzle) return;
    const extra = Math.max(0, all.length - puzzle.between);
    const result: Result = {
      score: solved ? Math.max(MIN_SOLVED_SCORE, MAX_SCORE - extra * EXTRA_GUESS_COST) : 0,
      max: MAX_SCORE,
      timeMs: clock.stop(),
      date: new Date().toISOString(),
    };
    setSummary({
      solved,
      result,
      ...saveResult(GAME_KEY, difficulty, result),
      route: shortestRoute(puzzle.start.name, puzzle.end.name),
    });
    setPhase("done");
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!puzzle || phase !== "playing" || !text.trim()) return;

    const country = findCountry(text);
    if (!country) {
      setNotice("That is not a country I know.");
      setShaking(true);
      return;
    }
    setText("");
    if (country === puzzle.start || country === puzzle.end) {
      setNotice(`${country.name} is one of the two ends.`);
      setShaking(true);
      return;
    }
    if (guesses.some((g) => g.country === country)) {
      setNotice(`You already used ${country.name}.`);
      setShaking(true);
      return;
    }

    const total = puzzle.between + 1;
    const through =
      (fromStart.get(country.name) ?? Infinity) + (fromEnd.get(country.name) ?? Infinity);
    const kind = through === total ? "best" : "detour";
    const all = [...guesses, { country, kind } as Guess];
    setGuesses(all);

    // Solved once the guessed countries link the two ends.
    const allowed = new Set([puzzle.start.name, puzzle.end.name, ...all.map((g) => g.country.name)]);
    const linked = distancesFrom(puzzle.start.name, allowed).has(puzzle.end.name);
    if (linked) {
      finish(all, true);
      return;
    }
    if (all.length >= puzzle.maxGuesses) {
      finish(all, false);
      return;
    }
    setNotice(
      kind === "best"
        ? `${country.name} is on a shortest route.`
        : Number.isFinite(through)
          ? `${country.name} is a detour: ${through - total} extra ${through - total === 1 ? "border" : "borders"} that way.`
          : `${country.name} cannot be reached by land from here.`,
    );
  };

  /* ---- Map ---- */

  const mapCountries: MapCountry[] = useMemo(() => {
    if (!puzzle) return [];
    const list: MapCountry[] = [];
    const add = (country: Country, tone: MapCountry["tone"]) =>
      country.shapes.forEach((name) => list.push({ name, tone }));

    // When it is over, show the shortest route the player did not find.
    if (summary) {
      const used = new Set(guesses.map((g) => g.country.name));
      for (const name of summary.route.slice(1, -1)) {
        if (used.has(name)) continue;
        const country = findCountry(name);
        if (country) add(country, "plain");
      }
    }
    for (const g of guesses) add(g.country, g.kind === "best" ? "good" : "bad");
    add(puzzle.start, "accent");
    add(puzzle.end, "accent");
    return list;
  }, [puzzle, guesses, summary]);

  const markers: MapMarker[] = useMemo(() => {
    if (!puzzle) return [];
    return [puzzle.start, puzzle.end].flatMap((country) => {
      const point = labelPoint(country);
      return point
        ? [{ id: country.name, lon: point[0], lat: point[1], tone: "plain" as const, size: 3, label: country.name }]
        : [];
    });
  }, [puzzle]);

  const focus: MapFocus | undefined = useMemo(() => {
    if (!puzzle) return undefined;
    return {
      key: `${puzzle.start.name}-${puzzle.end.name}`,
      geo: countryGeometry([...puzzle.start.shapes, ...puzzle.end.shapes]),
      pad: 1.5,
      maxZoom: 9,
    };
  }, [puzzle]);

  /* ---- Screens ---- */

  if (phase === "setup" || !puzzle) {
    return (
      <SetupScreen
        title="Border Run"
        lede="You get two countries joined by land. Type the countries in between to build a route from one to the other, crossing only land borders. The fewer countries you need, the better."
        best={bests[difficulty]}
        onStart={start}
        rules={[
          "Type countries in any order; the run ends when they link the two ends",
          <>
            A perfect run scores <span className="mono">{MAX_SCORE}</span>; each guess beyond
            the shortest route costs <span className="mono">{EXTRA_GUESS_COST}</span>
          </>,
          "Green countries are on a shortest route, red ones are detours",
          "You get the shortest route's length plus a few spare guesses",
          "Small typos and common other names are accepted",
        ]}
      >
        <ChoiceCards
          title="Difficulty"
          options={DIFFICULTIES}
          value={difficulty}
          onChange={setDifficulty}
        />
      </SetupScreen>
    );
  }

  const left = puzzle.maxGuesses - guesses.length;
  const difficultyLabel = DIFFICULTIES.find((d) => d.id === difficulty)?.label;

  return (
    <div className={ui.game}>
      <Hud
        badge={difficultyLabel}
        stats={[
          { label: "Guesses left", value: left },
          { label: "Shortest", value: `${puzzle.between} between` },
          { label: "Time", value: formatTime(clock.elapsed) },
        ]}
        onQuit={() => {
          clock.stop();
          setPhase("setup");
        }}
        quitLabel={phase === "done" ? "Settings" : "Quit"}
      />

      <div onMouseDown={(event) => event.preventDefault()}>
        <MapCanvas
          scene="world"
          borders
          countries={mapCountries}
          markers={markers}
          focus={focus}
          ariaLabel="World map showing the two countries to connect and your guesses"
        />
      </div>

      <p className={styles.prompt}>
        Get from <strong>{puzzle.start.name}</strong> to <strong>{puzzle.end.name}</strong>
      </p>

      {summary ? (
        <div className={ui.reveal} aria-live="polite">
          <div className={`${ui.revealText} ${summary.solved ? ui.good : ui.bad}`}>
            <span className={ui.revealMark} aria-hidden="true">
              {summary.solved ? "✓" : "✕"}
            </span>
            <div>
              <div className={ui.revealCity}>
                <strong>
                  {summary.solved
                    ? guesses.length === puzzle.between
                      ? "Perfect route"
                      : `Route found in ${guesses.length} (shortest is ${puzzle.between})`
                    : "Out of guesses"}
                </strong>
                <span className={ui.revealCountry}>
                  <span className="mono">
                    {summary.result.score}/{MAX_SCORE}
                  </span>{" "}
                  in {formatTime(summary.result.timeMs)}
                  {summary.isBest && summary.result.score > 0 ? " · new best" : ""}
                </span>
              </div>
              <div className={ui.revealPoints}>Shortest: {summary.route.join(" → ")}</div>
            </div>
          </div>
          <button type="button" className={ui.primaryButton} onClick={start} autoFocus>
            New route
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
              placeholder="Type a country on the way"
              aria-label="Type a country"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="words"
              spellCheck={false}
              enterKeyHint="go"
            />
            <button type="submit" className={ui.primaryButton} disabled={!text.trim()}>
              Add
            </button>
            <button type="button" className={ui.ghostButton} onClick={() => finish(guesses, false)}>
              Give up
            </button>
          </div>
        </form>
      )}

      <div className={ui.status} aria-live="polite">
        {guesses.map((g) => (
          <span
            key={g.country.name}
            className={`${styles.chip} ${g.kind === "best" ? styles.chipGood : styles.chipBad}`}
          >
            {g.country.name}
          </span>
        ))}
        {notice && !summary && <span className={ui.notice}>{notice}</span>}
        {!guesses.length && !notice && (
          <span>No guesses yet. Any country that helps bridge the gap counts.</span>
        )}
      </div>
    </div>
  );
}
