import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface CountdownApi {
  /** Seconds remaining (0 when idle at 00:00). */
  remaining: number;
  /** Total configured duration in seconds for the current segment. */
  total: number;
  running: boolean;
  start: (durationSec: number) => void;
  pause: () => void;
  resume: () => void;
  reset: (durationSec?: number) => void;
}

/**
 * Timestamp-based countdown timer.
 *
 * Instead of decrementing a counter every second (which drifts under browser
 * throttling), this hook stores the absolute target end time and recomputes the
 * remaining time from `Date.now()` on every tick. If the browser throttles or
 * suspends execution (background tab, screen off, lock screen), the hook
 * recovers immediately on the next tick: it detects the missed deadline and
 * fires `onComplete` exactly once.
 */
export function useCountdown(initialDurationSec = 0, onComplete?: () => void): CountdownApi {
  const [total, setTotal] = useState(Math.max(0, Math.round(initialDurationSec)));
  const [remaining, setRemaining] = useState(Math.max(0, Math.round(initialDurationSec)));
  const [running, setRunning] = useState(false);

  const endAtRef = useRef<number | null>(null);
  const pendingRef = useRef(Math.max(0, Math.round(initialDurationSec)));
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  // Always call the latest onComplete handler without restarting the effect.
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    if (!running) return;
    completedRef.current = false;

    const tick = () => {
      const endAt = endAtRef.current;
      if (endAt === null) return;
      const secs = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(secs);
      if (secs <= 0) {
        endAtRef.current = null;
        setRunning(false);
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current?.();
        }
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [running]);

  const start = useCallback((durationSec: number) => {
    const d = Math.max(1, Math.round(durationSec));
    pendingRef.current = d;
    endAtRef.current = Date.now() + d * 1000;
    setTotal(d);
    setRemaining(d);
    setRunning(true);
  }, []);

  const pause = useCallback(() => {
    const endAt = endAtRef.current;
    if (endAt !== null) {
      pendingRef.current = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    }
    endAtRef.current = null;
    setRunning(false);
  }, []);

  const resume = useCallback(() => {
    if (pendingRef.current <= 0) return;
    endAtRef.current = Date.now() + pendingRef.current * 1000;
    setRunning(true);
  }, []);

  const reset = useCallback((durationSec?: number) => {
    endAtRef.current = null;
    completedRef.current = false;
    if (durationSec !== undefined) {
      const d = Math.max(0, Math.round(durationSec));
      pendingRef.current = d;
      setTotal(d);
      setRemaining(d);
    }
    setRunning(false);
  }, []);

  return useMemo(
    () => ({ remaining, total, running, start, pause, resume, reset }),
    [remaining, total, running, start, pause, resume, reset]
  );
}