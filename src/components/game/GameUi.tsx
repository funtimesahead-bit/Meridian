"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import ui from "@/games/name-the-city/CityGame.module.css";
import { formatTime, type Result } from "@/lib/scores";

/* The setup screen, top bar and results screen shared by the games. */

export type Choice<T extends string | number> = {
  id: T;
  label: string;
  /** Small note on the right of a card, e.g. "58 cities". */
  meta?: string;
  description?: string;
};

export function ChoiceCards<T extends string | number>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Choice<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <>
      <h2 className={ui.panelTitle}>{title}</h2>
      <div className={ui.options} role="radiogroup" aria-label={title}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={value === option.id}
            className={ui.option}
            onClick={() => onChange(option.id)}
          >
            <span className={ui.optionHead}>
              <span className={ui.optionLabel}>{option.label}</span>
              {option.meta && <span className={ui.optionMeta}>{option.meta}</span>}
            </span>
            {option.description && (
              <span className={ui.optionText}>{option.description}</span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

export function ChoiceSegments<T extends string | number>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Choice<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <>
      <h2 className={ui.panelTitle}>{title}</h2>
      <div className={ui.segmented} role="radiogroup" aria-label={title}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={value === option.id}
            className={ui.segment}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </>
  );
}

/** Best scores laid out as rows (e.g. difficulty) by columns (e.g. length). */
export function BestTable<R extends string | number, C extends string | number>({
  rows,
  columns,
  bestFor,
}: {
  rows: Choice<R>[];
  columns: Choice<C>[];
  bestFor: (row: R, column: C) => Result | undefined;
}) {
  return (
    <table className={ui.bests}>
      <thead>
        <tr>
          <th scope="col" />
          {columns.map((column) => (
            <th key={column.id} scope="col">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <th scope="row">{row.label}</th>
            {columns.map((column) => {
              const best = bestFor(row.id, column.id);
              return (
                <td key={column.id}>
                  {best ? (
                    <>
                      <span className={`mono ${ui.bestScore}`}>
                        {best.score}/{best.max}
                      </span>
                      <span className={`mono ${ui.bestTime}`}>
                        {formatTime(best.timeMs)}
                      </span>
                    </>
                  ) : (
                    <span className={ui.bestNone}>–</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SetupScreen({
  backHref = "/games",
  backLabel = "Games",
  title,
  lede,
  children,
  best,
  onStart,
  startLabel = "Start",
  startDisabled = false,
  startNote,
  aside,
  rules,
}: {
  backHref?: string;
  backLabel?: string;
  title: string;
  lede: ReactNode;
  /** The choices (difficulty, length...). */
  children: ReactNode;
  /** Best result for the setup currently selected. */
  best?: Result;
  onStart: () => void;
  startLabel?: string;
  startDisabled?: boolean;
  startNote?: ReactNode;
  /** Content for the side panel above the rules, usually a BestTable. */
  aside?: ReactNode;
  rules?: ReactNode[];
}) {
  return (
    <div className={ui.setup}>
      <Link href={backHref} className={ui.back}>
        ← {backLabel}
      </Link>
      <h1 className={ui.title}>{title}</h1>
      <p className={ui.lede}>{lede}</p>

      <div className={ui.setupGrid}>
        <section className={ui.panel}>
          {children}
          <div className={ui.startRow}>
            <button
              type="button"
              className={ui.startButton}
              onClick={onStart}
              disabled={startDisabled}
            >
              {startLabel}
            </button>
            <p className={ui.bestLine}>
              {startNote ??
                (best ? (
                  <>
                    Your best here:{" "}
                    <strong className="mono">
                      {best.score}/{best.max}
                    </strong>{" "}
                    in <span className="mono">{formatTime(best.timeMs)}</span>
                  </>
                ) : (
                  "No saved score for this setup yet."
                ))}
            </p>
          </div>
        </section>

        <aside className={ui.panel}>
          {aside && (
            <>
              <h2 className={ui.panelTitle}>Your best scores</h2>
              {aside}
            </>
          )}
          {rules && (
            <>
              <h2 className={ui.panelTitle}>How it works</h2>
              <ul className={ui.rules}>
                {rules.map((rule, i) => (
                  <li key={i}>{rule}</li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

export function Hud({
  badge,
  stats,
  onQuit,
  quitLabel = "Quit",
}: {
  badge?: string;
  stats: { label: string; value: ReactNode }[];
  onQuit: () => void;
  quitLabel?: string;
}) {
  return (
    <div className={ui.hud}>
      <div className={ui.hudLeft}>
        {badge && <span className={ui.badge}>{badge}</span>}
        {stats.map((stat) => (
          <span key={stat.label} className={ui.hudStat}>
            <span className={ui.hudLabel}>{stat.label}</span>
            <span className="mono">{stat.value}</span>
          </span>
        ))}
      </div>
      <button type="button" className={ui.ghostButton} onClick={onQuit}>
        {quitLabel}
      </button>
    </div>
  );
}

export function ProgressBar({
  steps,
}: {
  /** One entry per step: finished well, finished badly, in progress or still to come. */
  steps: ("good" | "bad" | "now" | "todo")[];
}) {
  const className = { good: ui.segGood, bad: ui.segBad, now: ui.segNow, todo: "" };
  return (
    <div className={ui.progress} aria-hidden="true">
      {steps.map((step, i) => (
        <span key={i} className={`${ui.seg} ${className[step]}`} />
      ))}
    </div>
  );
}

export type RoundRow = {
  id: string;
  ok: boolean;
  title: string;
  subtitle?: string;
  note?: string;
  points: string;
};

export function ResultsScreen({
  kicker,
  result,
  isBest,
  previousBest,
  stats,
  rounds,
  onAgain,
  onSettings,
  settingsLabel = "Change settings",
}: {
  kicker: string;
  result: Result;
  isBest: boolean;
  previousBest?: Result;
  stats: { label: string; value: ReactNode }[];
  rounds?: RoundRow[];
  onAgain: () => void;
  onSettings: () => void;
  settingsLabel?: string;
}) {
  const againRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    againRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className={ui.results}>
      <p className={ui.resultsKicker}>{kicker}</p>
      <h1 className={ui.resultsScore}>
        <span className="mono">{result.score}</span>
        <span className={ui.resultsMax}>
          {" "}
          / <span className="mono">{result.max}</span>
        </span>
      </h1>

      {isBest ? (
        <p className={ui.bestBadge}>
          {previousBest
            ? `New personal best (was ${previousBest.score}/${previousBest.max})`
            : "First score saved for this setup"}
        </p>
      ) : (
        previousBest && (
          <p className={ui.resultsNote}>
            Your best is{" "}
            <span className="mono">
              {previousBest.score}/{previousBest.max}
            </span>{" "}
            in <span className="mono">{formatTime(previousBest.timeMs)}</span>
          </p>
        )
      )}

      <dl className={ui.statRow}>
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt>{stat.label}</dt>
            <dd className="mono">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className={ui.resultsActions}>
        <button ref={againRef} type="button" className={ui.startButton} onClick={onAgain}>
          Play again
        </button>
        <button type="button" className={ui.ghostButton} onClick={onSettings}>
          {settingsLabel}
        </button>
      </div>

      {rounds && rounds.length > 0 && (
        <ol className={ui.roundList}>
          {rounds.map((round) => (
            <li key={round.id} className={ui.round}>
              <span
                className={`${ui.roundDot} ${round.ok ? ui.dotGood : ui.dotBad}`}
                aria-hidden="true"
              />
              <span className={ui.roundCity}>
                {round.title}
                {round.subtitle && (
                  <span className={ui.roundCountry}>{round.subtitle}</span>
                )}
              </span>
              {round.note && <span className={ui.roundNote}>{round.note}</span>}
              <span className={`mono ${ui.roundPoints}`}>{round.points}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export { ui as gameStyles };
