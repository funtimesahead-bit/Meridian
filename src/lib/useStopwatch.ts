"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** A count-up clock. `begin` restarts it, `stop` freezes it and returns the time. */
export function useStopwatch() {
  const startedAt = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      if (startedAt.current !== null) setElapsed(Date.now() - startedAt.current);
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [running]);

  const begin = useCallback(() => {
    startedAt.current = Date.now();
    setElapsed(0);
    setRunning(true);
  }, []);

  const stop = useCallback((): number => {
    const total = startedAt.current === null ? 0 : Date.now() - startedAt.current;
    startedAt.current = null;
    setElapsed(total);
    setRunning(false);
    return total;
  }, []);

  return { elapsed, running, begin, stop };
}
