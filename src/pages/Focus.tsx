import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, SkipForward, Timer, History, Coffee, Brain, Hourglass, StopCircle, Repeat, CheckCircle2 } from 'lucide-react';
import { useStore, uid } from '@/store/StoreContext';
import { useToast } from '@/store/ToastContext';
import { useTheme } from '@/store/ThemeContext';
import { useAlarm } from '@/store/AlarmContext';
import { useCountdown } from '@/hooks/useCountdown';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Feedback';
import { CircularProgress } from '@/components/ui/Progress';
import { SubjectPill } from '@/components/ui/Subject';
import { FocusingSounds } from '@/components/ui/FocusingSounds';
import { getSubjectById, formatDate, todayISO, daysUntil, computeStudyStreak } from '@/lib/utils';

type Mode = 'focus' | 'break';
type ToolMode = 'pomodoro' | 'timer' | 'stopwatch';

interface CycleState {
  /** Whether cycle mode is enabled. */
  enabled: boolean;
  /** Number of focus sessions configured for the cycle (the "cycle count"). */
  count: number;
  /** The focus session we are currently on (1-based). */
  current: number;
  /** Total completed focus minutes accumulated in the current cycle. */
  accumulatedFocus: number;
  /** Subject snapshotted when the cycle's first focus session completes — the single logged session uses this. */
  subjectId: string | null;
}

const CYCLE_STORAGE = 'studia:pomodoro:cycle';

function loadCycle(): CycleState {
  try {
    const raw = localStorage.getItem(CYCLE_STORAGE);
    if (raw) {
      const parsed = JSON.parse(raw) as { enabled?: boolean; count?: number } | null;
      if (parsed && typeof parsed.count === 'number') {
        return {
          enabled: !!parsed.enabled,
          count: Math.max(0, Math.round(parsed.count)),
          current: 1,
          accumulatedFocus: 0,
          subjectId: null,
        };
      }
    }
  } catch {
    /* ignore malformed */
  }
  return { enabled: false, count: 2, current: 1, accumulatedFocus: 0, subjectId: null };
}

function saveCycle(cycle: CycleState) {
  try {
    // Persist only the configuration; an in-progress run is not restored
    // across refreshes (matching the existing app, which does not persist
    // running timer state).
    localStorage.setItem(CYCLE_STORAGE, JSON.stringify({ enabled: cycle.enabled, count: cycle.count }));
  } catch {
    /* ignore */
  }
}

export default function Focus() {
  const { data, update } = useStore();
  const { toast } = useToast();
  const { reducedMotion } = useTheme();
  const { startAlarm, stopAlarm, notifyTimerStart, onOtherTimerStarted } = useAlarm();
  const [tool, setTool] = useState<ToolMode>('pomodoro');
  const [mode, setMode] = useState<Mode>('focus');
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? '');
  const [completedRounds, setCompletedRounds] = useState(0);
  const [cycle, setCycle] = useState<CycleState>(() => loadCycle());
  const [cycleComplete, setCycleComplete] = useState(false);
  const [cycleModalOpen, setCycleModalOpen] = useState(false);
  const [cycleDraft, setCycleDraft] = useState<CycleState>({ enabled: false, count: 2, current: 1, accumulatedFocus: 0, subjectId: null });

  // Settings values are user-editable numbers — clamp them so a corrupted,
  // empty, or zero value can never produce a zero-length timer segment.
  const focusMin = Math.max(1, data.settings.pomodoroFocus);
  const breakMin = Math.max(1, data.settings.pomodoroBreak);
  const totalSeconds = (mode === 'focus' ? focusMin : breakMin) * 60;

  // --- Keep the latest values available to stable callbacks (loop guards) ---
  const cycleRef = useRef(cycle);
  cycleRef.current = cycle;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const subjectIdRef = useRef(subjectId);
  subjectIdRef.current = subjectId;
  const focusMinRef = useRef(focusMin);
  focusMinRef.current = focusMin;
  const autoStartRef = useRef(false);

  /** Log one focus study session and update the daily streak (existing behavior). */
  const logFocusSession = useCallback(
    (minutes: number, subject: string | null) => {
      update((d) => {
        d.sessions.push({ id: uid(), subjectId: subject ?? subjectIdRef.current, taskId: null, date: todayISO(), duration: minutes, type: 'focus' });
        // The streak is derived from the actual session list (unique study
        // days, consecutive ending on the most recent study date), so it stays
        // correct even when sessions are deleted or edited elsewhere.
        d.streak = computeStudyStreak(d.sessions);
      });
    },
    [update]
  );

  // --- Segment transition (mode switch, session logging, alarm trigger) ---
  const completeSegment = useCallback(
    (segEndedByTimer: boolean) => {
      const curMode = modeRef.current;
      const c = cycleRef.current;
      const inCycle = c.enabled && c.count > 0;

      if (curMode === 'focus') {
        setCompletedRounds((n) => n + 1);
        // Minutes actually spent in this segment: the full configured length
        // when it finishes naturally, but only the real elapsed time when the
        // user skips it early (logging the full amount on a manual skip
        // inflated study statistics).
        const cd = countdownRef.current;
        const minutes = Math.max(1, Math.min(Math.round(Math.max(0, cd.total - cd.remaining) / 60), focusMinRef.current));
        if (inCycle) {
          // Accumulate focus time — the whole cycle is recorded as ONE session.
          // Snapshot the subject on the first completed focus session so that
          // changing the subject mid-cycle does not corrupt the logged session.
          setCycle((prev) => ({
            ...prev,
            subjectId: prev.accumulatedFocus === 0 ? subjectIdRef.current : prev.subjectId,
            accumulatedFocus: prev.accumulatedFocus + minutes,
          }));
          toast(`Focus session complete! ${minutes}m logged`, 'success');
          if (segEndedByTimer) {
            startAlarm();
            autoStartRef.current = true; // auto-start the break timer
          }
          setMode('break');
        } else {
          // Existing single-session behavior.
          logFocusSession(minutes, subjectIdRef.current);
          toast(`Focus session complete! ${minutes}m logged`, 'success');
          if (segEndedByTimer) startAlarm();
          setMode('break');
        }
        return;
      }

      // Break finished.
      if (inCycle) {
        if (c.current >= c.count) {
          // Final break done — record the whole cycle as one focus session,
          // then stop completely (do NOT auto-start another focus timer).
          if (c.accumulatedFocus > 0) logFocusSession(c.accumulatedFocus, c.subjectId);
          toast('Cycle complete! 🎉', 'success');
          if (segEndedByTimer) startAlarm();
          setCycleComplete(true);
          setCycle((prev) => ({ ...prev, enabled: false, current: 1, accumulatedFocus: 0, subjectId: null }));
          setMode('focus');
        } else {
          // Interim break done — advance to the next focus session.
          setCycle((prev) => ({ ...prev, current: prev.current + 1 }));
          if (segEndedByTimer) {
            startAlarm(); // notify that the break is over
            autoStartRef.current = true; // auto-start the next focus timer
          }
          setMode('focus');
        }
      } else {
        // No cycle active — existing single-session behavior.
        toast('Break over — ready to focus?', 'info');
        setMode('focus');
      }
    },
    [logFocusSession, toast, startAlarm]
  );

  // --- Timestamp-based Pomodoro countdown ---
  // The hook stores an absolute end time so throttling/backgrounding never
  // causes drift; on resume it detects the missed deadline and fires onComplete.
  const countdown = useCountdown(focusMin * 60, () => completeSegment(true));

  // Keep latest countdown API available to stable subscriptions.
  const countdownRef = useRef(countdown);
  countdownRef.current = countdown;

  const prevModeRef = useRef(mode);

  // Re-arm the countdown whenever the segment mode or duration changes.
  // Also handles the automatic start of the next segment (break -> focus,
  // focus -> break) during an active cycle.
  useEffect(() => {
    const modeChanged = prevModeRef.current !== mode;
    prevModeRef.current = mode;
    const wasRunning = countdownRef.current.running;
    const dur = (mode === 'focus' ? focusMin : breakMin) * 60;

    countdownRef.current.reset(dur);

    if (autoStartRef.current) {
      // A segment finished naturally (or a break was skipped) — continue the
      // cycle by auto-starting the next segment.
      autoStartRef.current = false;
      countdownRef.current.start(dur);
      notifyTimerStart();
    } else if (wasRunning && !modeChanged) {
      // Focus/Break duration changed while the timer was running — restart
      // the current segment with the new duration.
      countdownRef.current.start(dur);
      notifyTimerStart();
    }
    // countdownRef intentionally omitted — it mirrors `countdown` which changes every render.
  }, [mode, focusMin, breakMin, notifyTimerStart]);

  // Cross-tab: if another tab starts a timer, pause ours so only one
  // countdown is authoritative (prevents confusing duplicate alarms).
  useEffect(() => {
    const unsub = onOtherTimerStarted(() => {
      countdownRef.current.pause();
    });
    return unsub;
  }, [onOtherTimerStarted]);

  // Persist cycle configuration (refresh-safe).
  useEffect(() => {
    saveCycle(cycle);
  }, [cycle]);

  // Auto-hide the "cycle complete" indicator after a few seconds.
  useEffect(() => {
    if (!cycleComplete) return;
    const id = window.setTimeout(() => setCycleComplete(false), 8000);
    return () => window.clearTimeout(id);
  }, [cycleComplete]);

  const toggle = () => {
    if (countdown.running) {
      countdown.pause();
    } else {
      // Restarting a session must not inherit an old alarm state.
      stopAlarm();
      setCycleComplete(false);
      if (countdown.remaining >= totalSeconds) {
        countdown.start(totalSeconds);
      } else {
        countdown.resume();
      }
      notifyTimerStart();
    }
  };

  const reset = () => {
    stopAlarm();
    setCycleComplete(false);
    countdown.reset(totalSeconds);
  };

  const stopCycle = () => {
    stopAlarm();
    const c = cycleRef.current;
    if (c.accumulatedFocus > 0) logFocusSession(c.accumulatedFocus, c.subjectId);
    countdown.reset(totalSeconds);
    setCycle({ enabled: false, count: c.count, current: 1, accumulatedFocus: 0, subjectId: null });
    setMode('focus');
    setCycleComplete(true);
    toast(c.accumulatedFocus > 0 ? `Cycle stopped — ${c.accumulatedFocus}m logged` : 'Cycle stopped', 'info');
  };

  const skip = () => {
    // Skipping ends the segment manually — silence any active alarm but do
    // not ring it (the alarm only fires when the timer naturally reaches 00:00).
    stopAlarm();

    const curMode = modeRef.current;
    const c = cycleRef.current;
    const inCycle = c.enabled && c.count > 0;

    if (curMode === 'break' && inCycle) {
      // Skipping a break never logs a session and never changes the total
      // cycle count. It only advances to the next focus session (or stops).
      if (c.current >= c.count) {
        // Final break skipped — record the accumulated focus and stop.
        if (c.accumulatedFocus > 0) logFocusSession(c.accumulatedFocus, c.subjectId);
        toast('Cycle complete! 🎉', 'success');
        setCycleComplete(true);
        setCycle((prev) => ({ ...prev, enabled: false, current: 1, accumulatedFocus: 0, subjectId: null }));
        setMode('focus');
      } else {
        // Skip the interim break and immediately continue with the next focus.
        setCycle((prev) => ({ ...prev, current: prev.current + 1 }));
        autoStartRef.current = true;
        setMode('focus');
      }
      return;
    }

    // Focus segment (or non-cycle break): existing manual-skip behavior.
    completeSegment(false);
  };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    stopAlarm();
    setMode(m);
  };

  const switchTool = (t: ToolMode) => {
    if (t === tool) return;
    stopAlarm();
    countdown.pause();
    setTool(t);
  };

  const mins = Math.floor(countdown.remaining / 60);
  const secs = countdown.remaining % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const progress = totalSeconds > 0 ? ((totalSeconds - countdown.remaining) / totalSeconds) * 100 : 0;

  const recentSessions = data.sessions
    .filter((s) => s.type === 'focus')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  const todayMinutes = data.sessions
    .filter((s) => s.date === todayISO() && s.type === 'focus')
    .reduce((sum, s) => sum + s.duration, 0);

  const cycleActive = cycle.enabled && cycle.count > 0;

  const openCycleModal = () => {
    setCycleComplete(false);
    setCycleDraft({
      enabled: cycle.enabled,
      count: cycle.count,
      current: 1,
      accumulatedFocus: 0,
      subjectId: null,
    });
    setCycleModalOpen(true);
  };

  const saveCycleConfig = () => {
    const count = Math.max(0, Math.min(20, Math.round(cycleDraft.count) || 0));
    const prev = cycleRef.current;
    const unchanged = cycleDraft.enabled === prev.enabled && count === prev.count;
    setCycle({
      enabled: !!(cycleDraft.enabled && count > 0),
      count,
      current: unchanged ? prev.current : 1,
      accumulatedFocus: unchanged ? prev.accumulatedFocus : 0,
      subjectId: unchanged ? prev.subjectId : null,
    });
    setCycleComplete(false);
    if (count > 0) {
      toast(cycleDraft.enabled ? `Cycle set for ${count} ${count === 1 ? 'session' : 'sessions'}` : 'Cycle disabled', 'success');
    } else {
      toast('Cycle disabled (0 sessions)', 'info');
    }
    setCycleModalOpen(false);
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Focus Mode</h2>
        <p className="text-fg-muted text-sm mt-1">Deep work, distraction-free.</p>
      </div>

      {/* Tool tabs */}
      <div className="inline-flex p-1 bg-bg-muted rounded-xl gap-1 mb-6">
        {([
          { id: 'pomodoro', label: 'Pomodoro', icon: <Brain className="w-4 h-4" /> },
          { id: 'timer', label: 'Timer', icon: <Hourglass className="w-4 h-4" /> },
          { id: 'stopwatch', label: 'Stopwatch', icon: <StopCircle className="w-4 h-4" /> },
        ] as { id: ToolMode; label: string; icon: React.ReactNode }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => switchTool(t.id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors ${tool === t.id ? 'bg-bg-surface shadow-soft text-fg' : 'text-fg-muted hover:text-fg'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Timer card */}
        <Card className="lg:col-span-2 self-start">
          <div className="p-6 lg:p-8 flex flex-col items-center">
            {tool === 'pomodoro' && (
              <>
                {/* Mode switch */}
                <div className="inline-flex p-1 bg-bg-muted rounded-xl gap-1 mb-4">
                  <button
                    onClick={() => switchMode('focus')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors ${mode === 'focus' ? 'bg-bg-surface shadow-soft text-fg' : 'text-fg-muted hover:text-fg'}`}
                  >
                    <Brain className="w-4 h-4" /> Focus
                  </button>
                  <button
                    onClick={() => switchMode('break')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors ${mode === 'break' ? 'bg-bg-surface shadow-soft text-fg' : 'text-fg-muted hover:text-fg'}`}
                  >
                    <Coffee className="w-4 h-4" /> Break
                  </button>
                </div>

                {/* Cycle progress / completion indicator */}
                {cycleActive && (
                  <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-sm">
                    <Repeat className="w-4 h-4 text-brand-500" />
                    <span className="font-medium text-fg">Cycle {cycle.current} of {cycle.count}</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-xs font-semibold ${mode === 'focus' ? 'bg-brand-500 text-white' : 'bg-accent-500 text-white'}`}>
                      {mode === 'focus' ? 'Focus' : 'Break'}
                    </span>
                  </div>
                )}
                {!cycleActive && cycleComplete && (
                  <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="font-medium text-fg">Cycle complete!</span>
                  </div>
                )}

                {/* Timer circle */}
                <div className="relative">
                  {!reducedMotion && countdown.running && (
                    <div className="absolute inset-0 rounded-full animate-pulse-ring" style={{ boxShadow: `0 0 40px ${mode === 'focus' ? 'rgb(var(--brand-500))' : 'rgb(var(--accent-500))'}40` }} />
                  )}
                  <CircularProgress
                    value={progress}
                    size={240}
                    strokeWidth={6}
                    color={mode === 'focus' ? 'rgb(var(--brand-500))' : 'rgb(var(--accent-500))'}
                    label={timeStr}
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 mt-8">
                  <Button variant="secondary" size="icon" onClick={reset} aria-label="Reset"><RotateCcw className="w-5 h-5" /></Button>
                  <Button size="lg" onClick={toggle} className="w-20 h-20 rounded-full">
                    {countdown.running ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                  </Button>
                  <Button variant="secondary" size="icon" onClick={skip} aria-label="Skip"><SkipForward className="w-5 h-5" /></Button>
                  {cycleActive && (
                    <Button variant="secondary" size="icon" onClick={stopCycle} aria-label="Stop cycle"><StopCircle className="w-5 h-5" /></Button>
                  )}
                </div>

                {/* Subject selector + Cycle button */}
                <div className="w-full max-w-sm mt-8 mb-4">
                  <div className="grid grid-cols-[1fr,auto] gap-2">
                    <Select
                      value={subjectId}
                      onChange={(e) => setSubjectId(e.target.value)}
                      aria-label="Select subject"
                      className="h-10 text-sm"
                    >
                      <option value="">No subject</option>
                      {data.subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </Select>
                    <Button
                      variant={cycleActive ? 'secondary' : 'outline'}
                      size="md"
                      onClick={openCycleModal}
                      aria-label="Configure cycle"
                      title="Configure Pomodoro cycle"
                      className="h-10 px-3 rounded-xl"
                    >
                      <Repeat className="w-4 h-4" />
                      {cycleActive ? `Cycle ${cycle.count}` : 'Cycle'}
                    </Button>
                  </div>
                </div>

                {/* Session info */}
                <div className="mt-8 w-full max-w-sm space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-fg-muted">Rounds completed</span>
                    <span className="font-semibold">{completedRounds}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-fg-muted">Today's focus time</span>
                    <span className="font-semibold">{Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m</span>
                  </div>
                  {subjectId && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-fg-muted">Current subject</span>
                      <SubjectPill subject={getSubjectById(data.subjects, subjectId)} />
                    </div>
                  )}
                </div>
              </>
            )}

            {tool === 'timer' && <CustomTimer />}
            {tool === 'stopwatch' && <CustomStopwatch />}
          </div>
        </Card>

        {/* Sounds */}
        <div className="space-y-4 lg:space-y-6">
          <FocusingSounds />
        </div>

        {/* Recent sessions — full width at the bottom */}
        <Card className="lg:col-span-3">
          <div className="p-5 border-b border-border-default flex items-center gap-2">
            <History className="w-4 h-4 text-fg-muted" />
            <h3 className="font-semibold">Recent Sessions</h3>
          </div>
          <div className="p-5">
            {recentSessions.length === 0 ? (
              <EmptyState icon={<Timer className="w-7 h-7" />} title="No sessions yet" description="Your study sessions will appear here." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                {recentSessions.map((s, i) => {
                  const subject = getSubjectById(data.subjects, s.subjectId);
                  return (
                    <motion.div
                      key={s.id}
                      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-bg-muted/50"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                        <Timer className="w-4 h-4 text-brand-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{subject?.name ?? 'Study Session'}</p>
                        <p className="text-xs text-fg-subtle">{formatDate(s.date)} · {daysUntil(s.date) === 0 ? 'Today' : daysUntil(s.date) === -1 ? 'Yesterday' : `${Math.abs(daysUntil(s.date))}d ago`}</p>
                      </div>
                      <span className="text-sm font-semibold text-fg-muted shrink-0">{s.duration}m</span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Cycle configuration modal */}
      {cycleModalOpen && (
        <CycleModal
          draft={cycleDraft}
          onDraftChange={setCycleDraft}
          onClose={() => setCycleModalOpen(false)}
          onSave={saveCycleConfig}
        />
      )}
    </div>
  );
}

function CycleModal({ draft, onDraftChange, onClose, onSave }: {
  draft: CycleState;
  onDraftChange: (d: CycleState) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const invalid = draft.count < 0 || draft.count > 20;

  return (
    <Modal
      open
      onClose={onClose}
      onSave={onSave}
      title="Pomodoro Cycle"
      description="Repeat Focus → Break for a set number of focus sessions."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} disabled={invalid}>Save</Button>
        </>
      }
    >
      <div className="space-y-5">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => onDraftChange({ ...draft, enabled: e.target.checked })}
            className="w-4 h-4 rounded accent-brand-500"
          />
          <span className="text-sm text-fg-muted">Enable cycle</span>
        </label>
        <p className="text-xs text-fg-subtle -mt-2">
          Set the number of focus sessions below, then toggle this on to start cycling.
        </p>

        <div>
          <label className="text-sm font-medium text-fg-muted block mb-2">Focus sessions per cycle</label>
          <div className="w-32">
            <Input
              type="number"
              min={0}
              max={20}
              value={draft.count}
              onChange={(e) => onDraftChange({ ...draft, count: Number(e.target.value) || 0 })}
            />
          </div>
          {draft.count === 1 && <p className="text-xs text-fg-subtle mt-1.5">Focus → Break → Stop</p>}
          {draft.count === 2 && <p className="text-xs text-fg-subtle mt-1.5">Focus → Break → Focus → Break → Stop</p>}
          {draft.count >= 3 && <p className="text-xs text-fg-subtle mt-1.5">Repeated Focus → Break until {draft.count} focus sessions are done, then stop.</p>}
          {invalid && <p className="text-xs text-danger mt-1.5">Enter a number between 0 and 20.</p>}
        </div>

        <p className="text-xs text-fg-subtle bg-bg-muted/50 rounded-lg p-3">
          The whole cycle is recorded as one study session containing the total completed focus time — keeping your stats, charts, and history consistent.
        </p>
      </div>
    </Modal>
  );
}

function CustomTimer() {
  const { reducedMotion } = useTheme();
  const { startAlarm, stopAlarm, notifyTimerStart, onOtherTimerStarted } = useAlarm();
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [configured, setConfigured] = useState(false);

  // Timestamp-based custom countdown — accurate even when backgrounded.
  const countdown = useCountdown(0, () => {
    setConfigured(false);
    startAlarm();
  });
  const pauseRef = useRef(countdown.pause);
  pauseRef.current = countdown.pause;

  // Cross-tab: pause when another tab starts its own timer.
  useEffect(() => {
    const unsub = onOtherTimerStarted(() => {
      pauseRef.current();
    });
    return unsub;
  }, [onOtherTimerStarted]);

  const start = () => {
    const total = hours * 3600 + minutes * 60 + seconds;
    if (total <= 0) return;
    stopAlarm(); // restarting must not inherit an old alarm state
    setConfigured(true);
    countdown.start(total);
    notifyTimerStart();
  };

  const pause = () => countdown.pause();
  const resume = () => countdown.resume();

  const reset = () => {
    stopAlarm();
    countdown.reset(0);
    setConfigured(false);
    setHours(0);
    setMinutes(0);
    setSeconds(0);
  };

  const h = Math.floor(countdown.remaining / 3600);
  const m = Math.floor((countdown.remaining % 3600) / 60);
  const s = countdown.remaining % 60;
  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const progress = countdown.total > 0 ? ((countdown.total - countdown.remaining) / countdown.total) * 100 : 0;

  const numInput = (value: number, setter: (n: number) => void, max: number, label: string) => (
    <div className="flex flex-col items-center gap-1.5">
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        disabled={countdown.running}
        onChange={(e) => setter(Math.min(Math.max(0, Number(e.target.value) || 0), max))}
        className="w-20 h-14 text-center text-2xl font-bold rounded-xl bg-bg-muted border border-border-default text-fg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
      />
      <span className="text-xs text-fg-subtle">{label}</span>
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative mb-8">
        {!reducedMotion && countdown.running && (
          <div className="absolute inset-0 rounded-full animate-pulse-ring" style={{ boxShadow: '0 0 40px rgb(var(--brand-500))40' }} />
        )}
        <CircularProgress value={progress} size={240} strokeWidth={6} color="rgb(var(--brand-500))" label={timeStr} />
      </div>
      {!configured ? (
        <>
          <div className="flex items-center gap-3 mb-8">
            {numInput(hours, setHours, 99, 'Hours')}
            <span className="text-2xl font-bold text-fg-subtle">:</span>
            {numInput(minutes, setMinutes, 59, 'Minutes')}
            <span className="text-2xl font-bold text-fg-subtle">:</span>
            {numInput(seconds, setSeconds, 59, 'Seconds')}
          </div>
          <Button size="lg" onClick={start} disabled={hours * 3600 + minutes * 60 + seconds <= 0} className="w-20 h-20 rounded-full">
            <Play className="w-8 h-8 ml-1" />
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center justify-center gap-3 mt-8">
            <div className="w-10" aria-hidden="true"></div>
            <Button size="lg" onClick={countdown.running ? pause : resume} className="w-20 h-20 rounded-full">
              {countdown.running ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </Button>
            <Button variant="secondary" size="icon" onClick={reset} aria-label="Reset"><RotateCcw className="w-5 h-5" /></Button>
          </div>
        </>
      )}
    </div>
  );
}

function CustomStopwatch() {
  const { reducedMotion } = useTheme();
  const [elapsed, setElapsed] = useState(0); // elapsed time in milliseconds
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const intervalRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;

  // Single interval per run: keying off [running] only means ticking updates
  // (setElapsed) never tear down and recreate the interval every 10ms, which
  // previously made the stopwatch drift slightly and churn the scheduler.
  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now() - elapsedRef.current;
    intervalRef.current = window.setInterval(() => {
      setElapsed(Date.now() - startRef.current);
    }, 10);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  const h = Math.floor(elapsed / 3600000);
  const m = Math.floor((elapsed % 3600000) / 60000);
  const s = Math.floor((elapsed % 60000) / 1000);
  const ms = elapsed % 1000;
  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;

  const reset = () => {
    setRunning(false);
    setElapsed(0);
    setLaps([]);
  };

  const addLap = () => {
    if (running) {
      setLaps((prev) => [elapsed, ...prev]);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative mb-8">
        {!reducedMotion && running && (
          <div className="absolute inset-0 rounded-full animate-pulse-ring" style={{ boxShadow: '0 0 40px rgb(var(--accent-500))40' }} />
        )}
        <CircularProgress value={running ? 100 : 0} size={240} strokeWidth={6} color="rgb(var(--accent-500))" label={timeStr} labelClassName="text-2xl font-bold tabular-nums tracking-tight" />
      </div>
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="icon" onClick={reset} aria-label="Reset"><RotateCcw className="w-5 h-5" /></Button>
        <Button size="lg" onClick={() => setRunning((r) => !r)} className="w-20 h-20 rounded-full">
          {running ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
        </Button>
        <Button variant="secondary" size="md" onClick={addLap} aria-label="Lap" disabled={!running}>Lap</Button>
      </div>
      {laps.length > 0 && (
        <div className="mt-6 w-full max-w-sm max-h-64 overflow-y-auto space-y-1">
          {laps.map((lapTime, idx) => {
            const lapH = Math.floor(lapTime / 3600000);
            const lapM = Math.floor((lapTime % 3600000) / 60000);
            const lapS = Math.floor((lapTime % 60000) / 1000);
            const lapMs = lapTime % 1000;
            const lapTimeStr = `${String(lapH).padStart(2, '0')}:${String(lapM).padStart(2, '0')}:${String(lapS).padStart(2, '0')}.${String(lapMs).padStart(3, '0')}`;
            return (
              <div key={idx} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-bg-muted/50">
                <span className="text-fg-muted">Lap {laps.length - idx}</span>
                <span className="font-semibold">{lapTimeStr}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}