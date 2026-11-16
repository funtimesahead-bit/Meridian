"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gameStyles as ui } from "@/components/game/GameUi";
import { allPrompts, type Prompt } from "@/dailies/expedition/prompts";
import { matchAnswer } from "@/dailies/expedition/scoring";
import { loadCities } from "@/games/rings/data";
import { playerId } from "@/lib/player";
import { formatTime, saveResult, useBests, type Result } from "@/lib/scores";
import styles from "./QuickFire.module.css";

/* Quick Fire: plain one-answer questions drawn from the Expedition prompt bank.
   Each first valid answer is sent (anonymously) to work out how common every
   answer is; that is what Expedition's rarities are built from. Nothing here
   rewards a rare answer, so people answer naturally. */

export const QUESTIONS = 10;
export const SECONDS_PER_QUESTION = 15;
const QUESTION_MS = SECONDS_PER_QUESTION * 1000;
const AUTO_ADVANCE_MS = 900;
const GAME_KEY = "quickfire";

type Outcome = { prompt: Prompt; answer: string | null; timeMs: number };
type Phase = "loading" | "error" | "ready" | "playing" | "feedback" | "done";

function pickQuestions(pool: Prompt[]): Prompt[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  // At most two of any generated kind, so a round is not all "borders X".
  const used: Record<Prompt["kind"], number> = { list: 0, borders: 0, letter: 0, cities: 0 };
  const limit: Record<Prompt["kind"], number> = { list: QUESTIONS, borders: 2, letter: 2, cities: 2 };
  const picked: Prompt[] = [];
  const groups = new Set<string>();
  for (const prompt of copy) {
    if (used[prompt.kind] >= limit[prompt.kind]) continue;
    if (prompt.group && groups.has(prompt.group)) continue;
    used[prompt.kind]++;
    if (prompt.group) groups.add(prompt.group);
    picked.push(prompt);
    if (picked.length === QUESTIONS) break;
  }
  return picked;
}

function record(prompt: Prompt, answerId: string) {
  fetch("/api/quickfire", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player: playerId(), prompt: prompt.id, answer: answerId }),
    keepalive: true,
  }).catch(() => {
    // Not recorded; the quiz carries on regardless.
  });
}

export default function QuickFire() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [pool, setPool] = useState<Prompt[]>([]);
  const [questions, setQuestions] = useState<Prompt[]>([]);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [startedAt, setStartedAt] = useState(0);
  const [roundStartedAt, setRoundStartedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [guess, setGuess] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [summary, setSummary] = useState<{ result: Result; isBest: boolean; previousBest?: Result } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);
  const best = useBests(GAME_KEY).all;

  useEffect(() => {
    let cancelled = false;
    loadCities()
      .then((data) => {
        if (cancelled) return;
        setPool(allPrompts(data));
        setPhase("ready");
      })
      .catch(() => !cancelled && setPhase("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  const index = outcomes.length;
  const question = questions[index];
  const last = outcomes[outcomes.length - 1];
  const correct = outcomes.filter((o) => o.answer).length;

  const start = useCallback(() => {
    const t = Date.now();
    setQuestions(pickQuestions(pool));
    setOutcomes([]);
    setSummary(null);
    setGuess("");
    setNotice(null);
    setStartedAt(t);
    setRoundStartedAt(t);
    setNow(t);
    setPhase("playing");
  }, [pool]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [phase]);

  const remaining = phase === "playing" ? Math.max(0, QUESTION_MS - (now - roundStartedAt)) : QUESTION_MS;

  const finishQuestion = useCallback(
    (answer: string | null) => {
      if (!question) return;
      setOutcomes((all) => [...all, { prompt: question, answer, timeMs: Date.now() - roundStartedAt }]);
      setGuess("");
      setNotice(null);
      setPhase("feedback");
    },
    [question, roundStartedAt],
  );

  // Out of time.
  useEffect(() => {
    if (phase === "playing" && remaining <= 0) finishQuestion(null);
  }, [phase, remaining, finishQuestion]);

  // After a short pause, move on (or finish).
  useEffect(() => {
    if (phase !== "feedback") return;
    const delay = last?.answer ? AUTO_ADVANCE_MS : AUTO_ADVANCE_MS * 2;
    const id = window.setTimeout(() => {
      if (outcomes.length >= questions.length) {
        const result: Result = {
          score: outcomes.filter((o) => o.answer).length,
          max: questions.length,
          timeMs: Date.now() - startedAt,
          date: new Date().toISOString(),
        };
        setSummary({ result, ...saveResult(GAME_KEY, "all", result) });
        setPhase("done");
      } else {
        const t = Date.now();
        setRoundStartedAt(t);
        setNow(t);
        setPhase("playing");
      }
    }, delay);
    return () => window.clearTimeout(id);
  }, [phase, last, outcomes, questions.length, startedAt]);

  useEffect(() => {
    if (phase === "playing") inputRef.current?.focus({ preventScroll: true });
    if (phase === "done") againRef.current?.focus({ preventScroll: true });
  }, [phase, index]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (phase !== "playing" || !question || !guess.trim()) return;
    const answer = matchAnswer(question, guess);
    if (!answer) {
      setNotice(`“${guess.trim()}” is not a valid answer.`);
      setShaking(true);
      return;
    }
    record(question, answer.id);
    finishQuestion(answer.name);
  };

  const head = (
    <>
      <Link href="/quizzes" className={ui.back}>
        ← Quizzes
      </Link>
      <h1 className={styles.title}>Quick Fire</h1>
    </>
  );

  if (phase === "loading" || phase === "error") {
    return (
      <div className={styles.page}>
        {head}
        <p className={styles.muted}>
          {phase === "loading"
            ? "Loading questions…"
            : "The questions could not be loaded. Check your connection and reload the page."}
        </p>
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <div className={styles.page}>
        {head}
        <div className={styles.card}>
          <p className={styles.lede}>
            {QUESTIONS} quick questions, each with lots of right answers. Type the first one
            that comes to mind; you have {SECONDS_PER_QUESTION} seconds each.
          </p>
          <ul className={ui.rules}>
            <li>Any valid answer counts; wrong ones are just not accepted</li>
            <li>A new random set every time you play</li>
          </ul>
          <button type="button" className={ui.startButton} onClick={start} autoFocus>
            Start
          </button>
          {best && (
            <p className={styles.muted}>
              Your best: <strong className="mono">{best.score}/{best.max}</strong> in{" "}
              <span className="mono">{formatTime(best.timeMs)}</span>
            </p>
          )}
        </div>
        <p className={styles.note}>
          Your answers are recorded anonymously, with no account or personal details, to work
          out how common each answer is. That is what scores the daily Expedition.
        </p>
      </div>
    );
  }

  if (phase === "done" && summary) {
    return (
      <div className={styles.page}>
        {head}
        <div className={styles.card}>
          <p className={styles.kicker}>Round complete</p>
          <p className={styles.total}>
            <span className="mono">{summary.result.score}</span>
            <span className={styles.totalMax}>
              {" "}
              / <span className="mono">{summary.result.max}</span>
            </span>
          </p>
          <p className={styles.muted}>
            in <span className="mono">{formatTime(summary.result.timeMs)}</span>
            {summary.isBest ? " · new best" : ""}
          </p>
          <button ref={againRef} type="button" className={ui.startButton} onClick={start}>
            Play again
          </button>
        </div>
        <ol className={styles.list}>
          {outcomes.map((o, i) => (
            <li key={i}>
              <span className={`${styles.mark} ${o.answer ? styles.good : styles.bad}`} aria-hidden="true">
                {o.answer ? "✓" : "✕"}
              </span>
              <span className={styles.listPrompt}>
                {o.prompt.text}
                <strong>{o.answer ?? "No answer"}</strong>
              </span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (!question && phase !== "feedback") return null;
  const shown = phase === "feedback" ? last?.prompt : question;

  return (
    <div className={styles.page}>
      {head}
      <div className={styles.progress} aria-hidden="true">
        {questions.map((_, i) => {
          const o = outcomes[i];
          const cls = o ? (o.answer ? styles.good : styles.bad) : i === index ? styles.now : "";
          return <span key={i} className={`${styles.seg} ${cls}`} />;
        })}
        <span className={`mono ${styles.count}`}>
          {correct}/{questions.length}
        </span>
      </div>

      <div className={styles.card}>
        <p className={styles.kicker}>
          Question {phase === "feedback" ? index : index + 1} of {questions.length}
        </p>
        <h2 className={styles.prompt}>{shown?.text}</h2>

        {phase === "feedback" && last ? (
          <p className={`${styles.feedback} ${last.answer ? styles.good : styles.bad}`} aria-live="polite">
            {last.answer ? `✓ ${last.answer}` : "✕ Out of time"}
          </p>
        ) : (
          <>
            <div className={styles.timer} aria-hidden="true">
              <span
                className={`${styles.timerFill} ${remaining < 5000 ? styles.timerLow : ""}`}
                style={{ width: `${(remaining / QUESTION_MS) * 100}%` }}
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
                placeholder="First answer that comes to mind"
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
        )}
      </div>
    </div>
  );
}
