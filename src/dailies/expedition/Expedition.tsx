"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import MapCanvas, { type MapCountry, type MapMarker, type MapShape } from "@/components/map/MapCanvas";
import { gameStyles as ui } from "@/components/game/GameUi";
import { labelPoint } from "@/games/border-run/graph";
import { loadCities } from "@/games/rings/data";
import { playerId } from "@/lib/player";
import {
  STOPS,
  expeditionNumber,
  promptsForDay,
  today,
  type Answer,
  type Prompt,
} from "./prompts";
import {
  LIVE_THRESHOLD,
  MAX_POINTS,
  MISSED_SQUARE,
  TIERS,
  matchAnswer,
  pointsFor,
  shares,
  tierFor,
  type StopCounts,
  type Tier,
} from "./scoring";
import styles from "./Expedition.module.css";

export const SECONDS_PER_STOP = 25;
const STOP_MS = SECONDS_PER_STOP * 1000;

type StopResult = {
  /** Which prompt this answered, to catch a run saved against an older prompt bank. */
  promptId: string;
  answerId: string | null;
  name: string | null;
  share: number;
  points: number;
  tier: Tier | null;
};

type Saved = {
  stops: StopResult[];
  /** When the stop in progress began, so a reload cannot reset the clock. */
  startedAt: number | null;
  sent: boolean;
};

/** Quick Fire answer counts for each of today's prompts, in stop order. */
type Stats = { live: boolean; counts: StopCounts[]; players: number[] };

type Phase = "loading" | "error" | "intro" | "playing" | "reveal" | "done";

const saveKey = (day: string) => `meridian.expedition.v1.${day}`;

function readSaved(day: string): Saved {
  try {
    const raw = window.localStorage.getItem(saveKey(day));
    if (raw) {
      const data = JSON.parse(raw) as Partial<Saved>;
      return {
        stops: Array.isArray(data.stops) ? data.stops.slice(0, STOPS) : [],
        startedAt: typeof data.startedAt === "number" ? data.startedAt : null,
        sent: Boolean(data.sent),
      };
    }
  } catch {
    // Fall through to a fresh run.
  }
  return { stops: [], startedAt: null, sent: false };
}

function writeSaved(day: string, saved: Saved) {
  try {
    window.localStorage.setItem(saveKey(day), JSON.stringify(saved));
  } catch {
    // The run still works; it just will not survive a reload.
  }
}


function percent(share: number): string {
  const p = share * 100;
  if (p < 0.1) return "<0.1%";
  // A decimal below 10% keeps the label honest near the tier cut-offs (2%, 8%).
  return p < 10 ? `${(Math.floor(p * 10) / 10).toFixed(1)}%` : `${Math.round(p)}%`;
}

function untilMidnight(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const minutes = Math.max(0, Math.round((next.getTime() - now.getTime()) / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function answerPoint(answer: Answer): [number, number] | null {
  if (answer.point && !answer.country) return answer.point;
  if (answer.country) {
    return (answer.country.shapes.length ? labelPoint(answer.country) : null) ?? answer.country.point ?? null;
  }
  return answer.point ?? null;
}

export default function Expedition() {
  const [day] = useState(today);
  const [phase, setPhase] = useState<Phase>("loading");
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [stats, setStats] = useState<Stats>({ live: false, counts: [], players: [] });
  const [saved, setSaved] = useState<Saved>({ stops: [], startedAt: null, sent: false });
  const [now, setNow] = useState(() => Date.now());
  const [guess, setGuess] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const number = expeditionNumber(day);
  const index = saved.stops.length;
  const prompt = prompts[Math.min(index, STOPS - 1)];
  const total = saved.stops.reduce((sum, s) => sum + s.points, 0);

  const update = useCallback(
    (next: Saved) => {
      setSaved(next);
      writeSaved(day, next);
    },
    [day],
  );

  /* ---- Load the city list (for city prompts) and today's answer counts ---- */

  useEffect(() => {
    let cancelled = false;
    loadCities()
      .then(async (cities) => {
        const todays = promptsForDay(day, cities);
        // Rarity comes from Quick Fire answers to these prompts.
        const loaded = await fetch(
          `/api/expedition?prompts=${todays.map((p) => p.id).join(",")}`,
        )
          .then((r) => (r.ok ? (r.json() as Promise<Stats>) : null))
          .catch(() => null);
        if (cancelled) return;
        setPrompts(todays);
        if (loaded?.live) setStats(loaded);
        let restored = readSaved(day);
        if (restored.stops.some((s, i) => s.promptId !== todays[i]?.id)) {
          // The prompt bank changed since this run was saved; start it again.
          restored = { stops: [], startedAt: null, sent: false };
          writeSaved(day, restored);
        }
        setSaved(restored);
        if (restored.stops.length >= STOPS) setPhase("done");
        else if (restored.startedAt !== null) setPhase("playing");
        else if (restored.stops.length > 0) setPhase("reveal");
        else setPhase("intro");
      })
      .catch(() => !cancelled && setPhase("error"));
    return () => {
      cancelled = true;
    };
  }, [day]);

  /* ---- The clock ---- */

  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [phase]);

  const remaining =
    phase === "playing" && saved.startedAt !== null
      ? Math.max(0, STOP_MS - (now - saved.startedAt))
      : STOP_MS;

  const record = useCallback(
    (answer: Answer | null) => {
      if (!prompt) return;
      let result: StopResult = {
        promptId: prompt.id,
        answerId: null,
        name: null,
        share: 0,
        points: 0,
        tier: null,
      };
      if (answer) {
        const share = shares(prompt, stats.counts[index])?.get(answer.id) ?? 0;
        result = {
          promptId: prompt.id,
          answerId: answer.id,
          name: answer.name,
          share,
          points: pointsFor(share),
          tier: tierFor(share),
        };
      }
      update({ ...saved, stops: [...saved.stops, result], startedAt: null });
      setGuess("");
      setNotice(null);
      setPhase("reveal");
    },
    [index, prompt, saved, stats.counts, update],
  );

  // Out of time: the stop scores nothing.
  useEffect(() => {
    if (phase === "playing" && remaining <= 0) record(null);
  }, [phase, remaining, record]);

  useEffect(() => {
    if (phase === "playing") inputRef.current?.focus({ preventScroll: true });
    if (phase === "reveal") nextRef.current?.focus({ preventScroll: true });
  }, [phase, index]);

  const beginStop = () => {
    const started = Date.now();
    setNow(started);
    update({ ...saved, startedAt: started });
    setPhase("playing");
  };

  const next = () => {
    if (index >= STOPS) setPhase("done");
    else beginStop();
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (phase !== "playing" || !prompt || !guess.trim()) return;
    const answer = matchAnswer(prompt, guess);
    if (!answer) {
      setNotice(`“${guess.trim()}” is not a valid answer here.`);
      setShaking(true);
      return;
    }
    record(answer);
  };

  /* ---- Send the finished run, once ---- */

  useEffect(() => {
    if (phase !== "done" || saved.sent || saved.stops.length < STOPS) return;
    const body = JSON.stringify({
      day,
      player: playerId(),
      answers: saved.stops.map((s) => s.answerId),
    });
    fetch("/api/expedition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
      .then((r) => {
        if (r.ok) update({ ...saved, sent: true });
      })
      .catch(() => {
        // Not sent; it is tried again next time the page opens.
      });
  }, [phase, saved, day, update]);

  /* ---- Map: a trail through every answer so far ---- */

  const answered = useMemo(
    () =>
      saved.stops.map((s, i) => {
        const answer = s.answerId
          ? prompts[i]?.answers.find((a) => a.id === s.answerId)
          : undefined;
        return { stop: s, answer, point: answer ? answerPoint(answer) : null };
      }),
    [saved.stops, prompts],
  );

  const mapCountries: MapCountry[] = useMemo(
    () =>
      answered.flatMap(({ answer, stop }) =>
        answer?.country
          ? answer.country.shapes.map((name) => ({
              name,
              tone: stop.tier === "legendary" ? ("accent" as const) : ("good" as const),
            }))
          : [],
      ),
    [answered],
  );

  const markers: MapMarker[] = useMemo(
    () =>
      answered.flatMap(({ answer, point, stop }, i) =>
        answer && point
          ? [
              {
                id: `stop-${i}`,
                lon: point[0],
                lat: point[1],
                size: 4.5,
                tone: stop.tier === "legendary" ? ("accent" as const) : ("plain" as const),
                label: `${i + 1}. ${answer.name}`,
                labelOnHover: i !== answered.length - 1,
              },
            ]
          : [],
      ),
    [answered],
  );

  const shapes: MapShape[] = useMemo(() => {
    const points = answered.flatMap(({ point }) => (point ? [point] : []));
    return points.length > 1
      ? [{ id: "trail", style: "line", geo: { type: "LineString", coordinates: points } }]
      : [];
  }, [answered]);

  /* ---- Screens ---- */

  const header = (
    <div className={styles.head}>
      <Link href="/dailies" className={ui.back}>
        ← Dailies
      </Link>
      <h1 className={styles.title}>
        Expedition <span className="mono">#{number}</span>
      </h1>
    </div>
  );

  if (phase === "loading") {
    return (
      <div className={styles.page}>
        {header}
        <p className={styles.muted}>Packing for today’s expedition…</p>
      </div>
    );
  }

  if (phase === "error" || !prompt) {
    return (
      <div className={styles.page}>
        {header}
        <p className={styles.muted}>
          Today’s expedition could not be loaded. Check your connection and reload the page.
        </p>
      </div>
    );
  }

  /** Whether a stop's rarities are still mostly the hand-set estimates. */
  const estimatedAt = (stop: number) => !stats.live || (stats.players[stop] ?? 0) < LIVE_THRESHOLD;
  const estimatedStops = saved.stops.filter((_, i) => estimatedAt(i)).length;
  const map = (
    <div onMouseDown={(event) => event.preventDefault()}>
      <MapCanvas
        scene="world"
        countries={mapCountries}
        markers={markers}
        shapes={shapes}
        ariaLabel="World map tracing the route of your answers"
      />
    </div>
  );

  if (phase === "intro") {
    return (
      <div className={styles.page}>
        {header}
        <div className={styles.intro}>
          <p className={styles.lede}>
            Eight stops, one answer each. Every stop asks for something with many right
            answers. Name any of them, but the fewer explorers who think of yours, the more it
            is worth.
          </p>
          <ul className={ui.rules}>
            <li>
              <span className="mono">{SECONDS_PER_STOP}</span> seconds per stop; run out and it
              scores nothing
            </li>
            <li>Wrong answers are simply not accepted, so keep trying</li>
            <li>
              Up to <span className="mono">{MAX_POINTS}</span> points per stop for a rare answer
            </li>
            <li>One expedition a day, the same for everyone</li>
          </ul>
          <button type="button" className={ui.startButton} onClick={beginStop} autoFocus>
            Set off
          </button>
        </div>
        {map}
      </div>
    );
  }

  if (phase === "done") {
    const squares = saved.stops
      .map((s) => (s.tier ? TIERS[s.tier].square : MISSED_SQUARE))
      .join("");
    const shareText = `Meridian Expedition #${number} · ${total}/${STOPS * MAX_POINTS}\n${squares}\n${typeof window !== "undefined" ? window.location.origin : ""}/dailies/expedition`;
    return (
      <div className={styles.page}>
        {header}
        <div className={styles.summary}>
          <div>
            <p className={styles.kicker}>Expedition complete</p>
            <p className={styles.total}>
              <span className="mono">{total}</span>
              <span className={styles.totalMax}>
                {" "}
                / <span className="mono">{STOPS * MAX_POINTS}</span>
              </span>
            </p>
            <p className={styles.squares} aria-label="Rarity of each answer">
              {squares}
            </p>
          </div>
          <div className={styles.summaryActions}>
            <button
              type="button"
              className={ui.primaryButton}
              onClick={() => {
                navigator.clipboard
                  ?.writeText(shareText)
                  .then(() => setCopied(true))
                  .catch(() => setCopied(false));
              }}
            >
              {copied ? "Copied" : "Copy result"}
            </button>
            <p className={styles.muted}>Next expedition in {untilMidnight()}</p>
          </div>
        </div>

        <ol className={styles.stopList}>
          {saved.stops.map((s, i) => (
            <li key={i}>
              <span className={styles.stopNumber}>{i + 1}</span>
              <span className={styles.stopPrompt}>
                {prompts[i]?.text}
                <strong>{s.name ?? "Out of time"}</strong>
              </span>
              <span className={`${styles.tier} ${s.tier ? styles[s.tier] : styles.missed}`}>
                {s.tier ? `${TIERS[s.tier].label} · ${percent(s.share)}` : "Missed"}
              </span>
              <span className={`mono ${styles.stopPoints}`}>+{s.points}</span>
            </li>
          ))}
        </ol>
        <p className={styles.muted}>
          Rarities come from how often people give each answer in{" "}
          <Link href="/quizzes/quick-fire">Quick Fire</Link>, where nobody is trying to be rare.
          {estimatedStops > 0 &&
            ` ${estimatedStops === STOPS ? "All" : estimatedStops} of today’s stops still use estimates, until ${LIVE_THRESHOLD} people have answered them there.`}
        </p>
        {map}
      </div>
    );
  }

  /* ---- Playing and reveal ---- */

  const last = phase === "reveal" ? saved.stops[index - 1] : null;
  const shown = phase === "reveal" ? prompts[index - 1] : prompt;
  const shownShares = shown ? shares(shown, stats.counts[phase === "reveal" ? index - 1 : index]) : null;
  const top = shown
    ? [...shown.answers]
        .sort((a, b) => (shownShares!.get(b.id) ?? 0) - (shownShares!.get(a.id) ?? 0))
        .slice(0, 3)
    : [];

  return (
    <div className={styles.page}>
      {header}

      <div className={styles.stops} aria-label={`Stop ${Math.min(index + 1, STOPS)} of ${STOPS}`}>
        {Array.from({ length: STOPS }, (_, i) => {
          const s = saved.stops[i];
          const cls = s ? (s.tier ? styles[s.tier] : styles.missed) : i === index ? styles.current : "";
          return <span key={i} className={`${styles.stopDot} ${cls}`} />;
        })}
        <span className={`mono ${styles.runningTotal}`}>{total} pts</span>
      </div>

      <div className={styles.card}>
        <p className={styles.kicker}>
          Stop {phase === "reveal" ? index : index + 1} of {STOPS}
        </p>
        <h2 className={styles.prompt}>{shown?.text}</h2>

        {phase === "playing" ? (
          <>
            <div className={styles.timer} aria-hidden="true">
              <span
                className={`${styles.timerFill} ${remaining < 6000 ? styles.timerLow : ""}`}
                style={{ width: `${(remaining / STOP_MS) * 100}%` }}
              />
            </div>
            <form onSubmit={submit} className={ui.inputRow}>
              <input
                ref={inputRef}
                className={`${ui.input} ${shaking ? ui.shake : ""}`}
                onAnimationEnd={() => setShaking(false)}
                value={guess}
                onChange={(e) => {
                  setGuess(e.target.value);
                  if (notice) setNotice(null);
                }}
                placeholder="Your answer"
                aria-label="Your answer"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="words"
                spellCheck={false}
                enterKeyHint="go"
              />
              <button type="submit" className={ui.primaryButton} disabled={!guess.trim()}>
                Submit
              </button>
            </form>
            <p className={styles.status} aria-live="polite">
              <span className="mono">{Math.ceil(remaining / 1000)}s</span>
              {notice && <span className={styles.notice}>{notice}</span>}
            </p>
          </>
        ) : (
          last && (
            <div className={styles.reveal} aria-live="polite">
              <div className={styles.revealMain}>
                <span className={`${styles.tier} ${last.tier ? styles[last.tier] : styles.missed}`}>
                  {last.tier ? TIERS[last.tier].label : "Out of time"}
                </span>
                <p className={styles.revealAnswer}>
                  {last.name ? (
                    <>
                      <strong>{last.name}</strong>
                      <span>
                        {estimatedAt(index - 1) ? "about " : ""}
                        {percent(last.share)} of explorers
                      </span>
                    </>
                  ) : (
                    <strong>No answer in time</strong>
                  )}
                </p>
                <p className={`mono ${styles.revealPoints}`}>+{last.points}</p>
              </div>
              <div className={styles.topAnswers}>
                <p>
                  Most common · {shown?.answers.length} valid answers
                </p>
                <ol>
                  {top.map((a) => (
                    <li key={a.id}>
                      <span>{a.name}</span>
                      <span className="mono">{percent(shownShares!.get(a.id) ?? 0)}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <button ref={nextRef} type="button" className={ui.primaryButton} onClick={next}>
                {index >= STOPS ? "See results" : "Next stop"}
                <kbd>↵</kbd>
              </button>
            </div>
          )
        )}
      </div>

      {map}
    </div>
  );
}
