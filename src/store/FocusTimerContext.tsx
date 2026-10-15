/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useStore, uid } from '@/store/StoreContext';
import { useToast } from '@/store/ToastContext';
import { useAlarm } from '@/store/AlarmContext';
import { todayISO, computeStudyStreak } from '@/lib/utils';

export type Mode = 'focus' | 'break';
export type ToolMode = 'pomodoro' | 'timer' | 'stopwatch';

export interface CycleState {
  enabled: boolean;
  count: number;
  current: number;
  accumulatedFocus: number;
  subjectId: string | null;
}

interface PersistedPomodoro {
  mode: Mode;
  running: boolean;
  total: number;
  remaining: number;
  endAt: number | null;
  subjectId: string;
  completedRounds: number;
  cycle: CycleState;
  autoStartBreak: boolean;
}

interface PersistedTimer {
  hours: number;
  minutes: number;
  seconds: number;
  configured: boolean;
  running: boolean;
  total: number;
  remaining: number;
  endAt: number | null;
}

interface PersistedStopwatch {
  running: boolean;
  elapsed: number;
  startTime: number | null;
  laps: number[];
}

const STORAGE_POMODORO = 'studia:focus:pomodoro';
const STORAGE_TIMER = 'studia:focus:timer';
const STORAGE_STOPWATCH = 'studia:focus:stopwatch';
const STORAGE_TOOL = 'studia:focus:tool';

interface FocusTimerContextValue {
  // Tool selection
  tool: ToolMode;
  setTool: (t: ToolMode) => void;

  // Pomodoro state & actions
  mode: Mode;
  subjectId: string;
  setSubjectId: (id: string) => void;
  completedRounds: number;
  cycle: CycleState;
  cycleComplete: boolean;
  setCycleComplete: (val: boolean) => void;
  pomodoroRunning: boolean;
  pomodoroRemaining: number;
  pomodoroTotal: number;
  pomodoroProgress: number;
  pomodoroTimeStr: string;
  cycleActive: boolean;
  togglePomodoro: () => void;
  resetPomodoro: () => void;
  skipPomodoro: () => void;
  stopCycle: () => void;
  switchPomodoroMode: (m: Mode) => void;
  saveCycleConfig: (newCycle: CycleState) => void;

  // Custom Timer state & actions
  timerHours: number;
  timerMinutes: number;
  timerSeconds: number;
  setTimerHours: (n: number) => void;
  setTimerMinutes: (n: number) => void;
  setTimerSeconds: (n: number) => void;
  timerConfigured: boolean;
  timerRunning: boolean;
  timerRemaining: number;
  timerTotal: number;
  timerProgress: number;
  timerTimeStr: string;
  startCustomTimer: () => void;
  pauseCustomTimer: () => void;
  resumeCustomTimer: () => void;
  resetCustomTimer: () => void;

  // Custom Stopwatch state & actions
  stopwatchRunning: boolean;
  stopwatchElapsed: number;
  stopwatchTimeStr: string;
  stopwatchLaps: number[];
  toggleStopwatch: () => void;
  resetStopwatch: () => void;
  addStopwatchLap: () => void;
}

const FocusTimerContext = createContext<FocusTimerContextValue | null>(null);

function loadPersistedPomodoro(defaultFocusSec: number): PersistedPomodoro {
  try {
    const raw = localStorage.getItem(STORAGE_POMODORO);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedPomodoro>;
      const mode = parsed.mode === 'break' ? 'break' : 'focus';
      const total = typeof parsed.total === 'number' && parsed.total > 0 ? parsed.total : defaultFocusSec;
      let remaining = typeof parsed.remaining === 'number' ? parsed.remaining : total;
      let running = !!parsed.running;
      let endAt = typeof parsed.endAt === 'number' ? parsed.endAt : null;

      if (running && endAt) {
        const now = Date.now();
        if (now >= endAt) {
          remaining = 0;
          running = false;
          endAt = null;
        } else {
          remaining = Math.max(0, Math.ceil((endAt - now) / 1000));
        }
      } else {
        running = false;
        endAt = null;
      }

      return {
        mode,
        running,
        total,
        remaining,
        endAt,
        subjectId: typeof parsed.subjectId === 'string' ? parsed.subjectId : '',
        completedRounds: typeof parsed.completedRounds === 'number' ? parsed.completedRounds : 0,
        cycle: parsed.cycle && typeof parsed.cycle.count === 'number' ? parsed.cycle : {
          enabled: false,
          count: 2,
          current: 1,
          accumulatedFocus: 0,
          subjectId: null,
        },
        autoStartBreak: false,
      };
    }
  } catch {
    /* ignore malformed */
  }

  return {
    mode: 'focus',
    running: false,
    total: defaultFocusSec,
    remaining: defaultFocusSec,
    endAt: null,
    subjectId: '',
    completedRounds: 0,
    cycle: {
      enabled: false,
      count: 2,
      current: 1,
      accumulatedFocus: 0,
      subjectId: null,
    },
    autoStartBreak: false,
  };
}

function loadPersistedTimer(): PersistedTimer {
  try {
    const raw = localStorage.getItem(STORAGE_TIMER);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedTimer>;
      const hours = typeof parsed.hours === 'number' ? parsed.hours : 0;
      const minutes = typeof parsed.minutes === 'number' ? parsed.minutes : 0;
      const seconds = typeof parsed.seconds === 'number' ? parsed.seconds : 0;
      const total = typeof parsed.total === 'number' ? parsed.total : 0;
      let remaining = typeof parsed.remaining === 'number' ? parsed.remaining : 0;
      let running = !!parsed.running;
      let configured = !!parsed.configured;
      let endAt = typeof parsed.endAt === 'number' ? parsed.endAt : null;

      if (running && endAt) {
        const now = Date.now();
        if (now >= endAt) {
          remaining = 0;
          running = false;
          endAt = null;
          configured = false;
        } else {
          remaining = Math.max(0, Math.ceil((endAt - now) / 1000));
        }
      } else {
        running = false;
        endAt = null;
      }

      return {
        hours,
        minutes,
        seconds,
        configured,
        running,
        total,
        remaining,
        endAt,
      };
    }
  } catch {
    /* ignore */
  }

  return {
    hours: 0,
    minutes: 0,
    seconds: 0,
    configured: false,
    running: false,
    total: 0,
    remaining: 0,
    endAt: null,
  };
}

function loadPersistedStopwatch(): PersistedStopwatch {
  try {
    const raw = localStorage.getItem(STORAGE_STOPWATCH);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedStopwatch>;
      let running = !!parsed.running;
      let elapsed = typeof parsed.elapsed === 'number' ? parsed.elapsed : 0;
      let startTime = typeof parsed.startTime === 'number' ? parsed.startTime : null;
      const laps = Array.isArray(parsed.laps) ? parsed.laps : [];

      if (running && startTime) {
        elapsed = Math.max(0, Date.now() - startTime);
      } else {
        running = false;
        startTime = null;
      }

      return {
        running,
        elapsed,
        startTime,
        laps,
      };
    }
  } catch {
    /* ignore */
  }

  return {
    running: false,
    elapsed: 0,
    startTime: null,
    laps: [],
  };
}

function loadPersistedTool(): ToolMode {
  try {
    const t = localStorage.getItem(STORAGE_TOOL);
    if (t === 'pomodoro' || t === 'timer' || t === 'stopwatch') return t;
  } catch {
    /* ignore */
  }
  return 'pomodoro';
}

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const { data, update } = useStore();
  const { toast } = useToast();
  const { startAlarm, stopAlarm, notifyTimerStart, onOtherTimerStarted } = useAlarm();

  const focusMin = Math.max(1, data.settings.pomodoroFocus);
  const breakMin = Math.max(1, data.settings.pomodoroBreak);

  const [tool, setToolState] = useState<ToolMode>(() => loadPersistedTool());

  // Pomodoro state
  const [pomodoro, setPomodoro] = useState<PersistedPomodoro>(() =>
    loadPersistedPomodoro(focusMin * 60)
  );
  const [cycleComplete, setCycleComplete] = useState(false);

  // Custom Timer state
  const [timer, setTimer] = useState<PersistedTimer>(() => loadPersistedTimer());

  // Custom Stopwatch state
  const [stopwatch, setStopwatch] = useState<PersistedStopwatch>(() =>
    loadPersistedStopwatch()
  );

  // Fallback initial subject ID once store subjects load if none is set
  useEffect(() => {
    if (!pomodoro.subjectId && data.subjects[0]?.id) {
      setPomodoro((p) => ({ ...p, subjectId: data.subjects[0].id }));
    }
  }, [data.subjects, pomodoro.subjectId]);

  // Keep refs for stable callbacks
  const pomodoroRef = useRef(pomodoro);
  pomodoroRef.current = pomodoro;
  const timerRef = useRef(timer);
  timerRef.current = timer;
  const stopwatchRef = useRef(stopwatch);
  stopwatchRef.current = stopwatch;
  const focusMinRef = useRef(focusMin);
  focusMinRef.current = focusMin;
  const breakMinRef = useRef(breakMin);
  breakMinRef.current = breakMin;

  // Persist tool selection
  const setTool = useCallback((t: ToolMode) => {
    setToolState(t);
    try {
      localStorage.setItem(STORAGE_TOOL, t);
    } catch {
      /* ignore */
    }
  }, []);

  // Save Pomodoro state to storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_POMODORO, JSON.stringify(pomodoro));
    } catch {
      /* ignore */
    }
  }, [pomodoro]);

  // Save Custom Timer state to storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TIMER, JSON.stringify(timer));
    } catch {
      /* ignore */
    }
  }, [timer]);

  // Save Stopwatch state to storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_STOPWATCH, JSON.stringify(stopwatch));
    } catch {
      /* ignore */
    }
  }, [stopwatch]);

  // Log session helper
  const logFocusSession = useCallback(
    (minutes: number, subject: string | null) => {
      const subId = subject || pomodoroRef.current.subjectId || data.subjects[0]?.id || '';
      update((d) => {
        d.sessions.push({
          id: uid(),
          subjectId: subId,
          taskId: null,
          date: todayISO(),
          duration: minutes,
          type: 'focus',
        });
        d.streak = computeStudyStreak(d.sessions);
      });
    },
    [data.subjects, update]
  );

  // Complete Pomodoro segment
  const completePomodoroSegment = useCallback(
    (segEndedByTimer: boolean) => {
      const p = pomodoroRef.current;
      const curMode = p.mode;
      const c = p.cycle;
      const inCycle = c.enabled && c.count > 0;

      if (curMode === 'focus') {
        const minutes = Math.max(
          1,
          Math.min(
            Math.round(Math.max(0, p.total - p.remaining) / 60),
            focusMinRef.current
          )
        );

        const nextBreakSec = breakMinRef.current * 60;

        if (inCycle) {
          const nextCycle: CycleState = {
            ...c,
            subjectId: c.accumulatedFocus === 0 ? p.subjectId : c.subjectId,
            accumulatedFocus: c.accumulatedFocus + minutes,
          };
          toast(`Focus session complete! ${minutes}m logged`, 'success');
          if (segEndedByTimer) {
            startAlarm();
            // Auto start the break timer
            notifyTimerStart();
            setPomodoro((prev) => ({
              ...prev,
              mode: 'break',
              running: true,
              total: nextBreakSec,
              remaining: nextBreakSec,
              endAt: Date.now() + nextBreakSec * 1000,
              completedRounds: prev.completedRounds + 1,
              cycle: nextCycle,
            }));
          } else {
            setPomodoro((prev) => ({
              ...prev,
              mode: 'break',
              running: false,
              total: nextBreakSec,
              remaining: nextBreakSec,
              endAt: null,
              completedRounds: prev.completedRounds + 1,
              cycle: nextCycle,
            }));
          }
        } else {
          // Single session
          logFocusSession(minutes, p.subjectId);
          toast(`Focus session complete! ${minutes}m logged`, 'success');
          if (segEndedByTimer) startAlarm();
          setPomodoro((prev) => ({
            ...prev,
            mode: 'break',
            running: false,
            total: nextBreakSec,
            remaining: nextBreakSec,
            endAt: null,
            completedRounds: prev.completedRounds + 1,
          }));
        }
        return;
      }

      // Break finished
      const nextFocusSec = focusMinRef.current * 60;
      if (inCycle) {
        if (c.current >= c.count) {
          // Final break done
          if (c.accumulatedFocus > 0) {
            logFocusSession(c.accumulatedFocus, c.subjectId);
          }
          toast('Cycle complete! 🎉', 'success');
          if (segEndedByTimer) startAlarm();
          setCycleComplete(true);
          setPomodoro((prev) => ({
            ...prev,
            mode: 'focus',
            running: false,
            total: nextFocusSec,
            remaining: nextFocusSec,
            endAt: null,
            cycle: {
              ...prev.cycle,
              enabled: false,
              current: 1,
              accumulatedFocus: 0,
              subjectId: null,
            },
          }));
        } else {
          // Advance to next focus in cycle
          const nextCycle: CycleState = { ...c, current: c.current + 1 };
          if (segEndedByTimer) {
            startAlarm();
            notifyTimerStart();
            setPomodoro((prev) => ({
              ...prev,
              mode: 'focus',
              running: true,
              total: nextFocusSec,
              remaining: nextFocusSec,
              endAt: Date.now() + nextFocusSec * 1000,
              cycle: nextCycle,
            }));
          } else {
            setPomodoro((prev) => ({
              ...prev,
              mode: 'focus',
              running: false,
              total: nextFocusSec,
              remaining: nextFocusSec,
              endAt: null,
              cycle: nextCycle,
            }));
          }
        }
      } else {
        toast('Break over — ready to focus?', 'info');
        setPomodoro((prev) => ({
          ...prev,
          mode: 'focus',
          running: false,
          total: nextFocusSec,
          remaining: nextFocusSec,
          endAt: null,
        }));
      }
    },
    [logFocusSession, notifyTimerStart, startAlarm, toast]
  );

  // Complete Custom Timer
  const completeCustomTimer = useCallback(() => {
    startAlarm();
    toast('Timer finished! ⏰', 'info');
    setTimer((t) => ({
      ...t,
      running: false,
      configured: false,
      remaining: 0,
      endAt: null,
    }));
  }, [startAlarm, toast]);

  // Pomodoro Ticking Interval
  useEffect(() => {
    if (!pomodoro.running) return;

    const tick = () => {
      const p = pomodoroRef.current;
      if (!p.running || p.endAt === null) return;
      const now = Date.now();
      const rem = Math.max(0, Math.ceil((p.endAt - now) / 1000));
      if (rem <= 0) {
        completePomodoroSegment(true);
      } else {
        setPomodoro((prev) => ({ ...prev, remaining: rem }));
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [completePomodoroSegment, pomodoro.running]);

  // Custom Timer Ticking Interval
  useEffect(() => {
    if (!timer.running) return;

    const tick = () => {
      const t = timerRef.current;
      if (!t.running || t.endAt === null) return;
      const now = Date.now();
      const rem = Math.max(0, Math.ceil((t.endAt - now) / 1000));
      if (rem <= 0) {
        completeCustomTimer();
      } else {
        setTimer((prev) => ({ ...prev, remaining: rem }));
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [completeCustomTimer, timer.running]);

  // Stopwatch Ticking Interval
  useEffect(() => {
    if (!stopwatch.running) return;

    const tick = () => {
      const s = stopwatchRef.current;
      if (!s.running || s.startTime === null) return;
      setStopwatch((prev) => ({
        ...prev,
        elapsed: Math.max(0, Date.now() - (s.startTime ?? Date.now())),
      }));
    };

    tick();
    const id = window.setInterval(tick, 25);
    return () => window.clearInterval(id);
  }, [stopwatch.running]);

  // Handle visibility change (returning to browser tab after backgrounding)
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) return;

      // Resync Pomodoro
      const p = pomodoroRef.current;
      if (p.running && p.endAt !== null) {
        const rem = Math.max(0, Math.ceil((p.endAt - Date.now()) / 1000));
        if (rem <= 0) {
          completePomodoroSegment(true);
        } else {
          setPomodoro((prev) => ({ ...prev, remaining: rem }));
        }
      }

      // Resync Custom Timer
      const t = timerRef.current;
      if (t.running && t.endAt !== null) {
        const rem = Math.max(0, Math.ceil((t.endAt - Date.now()) / 1000));
        if (rem <= 0) {
          completeCustomTimer();
        } else {
          setTimer((prev) => ({ ...prev, remaining: rem }));
        }
      }

      // Resync Stopwatch
      const s = stopwatchRef.current;
      if (s.running && s.startTime !== null) {
        setStopwatch((prev) => ({
          ...prev,
          elapsed: Math.max(0, Date.now() - (s.startTime ?? Date.now())),
        }));
      }
    };

    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [completeCustomTimer, completePomodoroSegment]);

  // Cross-tab coordination: pause timers when another browser tab starts one
  useEffect(() => {
    const unsub = onOtherTimerStarted(() => {
      setPomodoro((p) => {
        if (!p.running) return p;
        const now = Date.now();
        const rem = p.endAt ? Math.max(0, Math.ceil((p.endAt - now) / 1000)) : p.remaining;
        return { ...p, running: false, endAt: null, remaining: rem };
      });
      setTimer((t) => {
        if (!t.running) return t;
        const now = Date.now();
        const rem = t.endAt ? Math.max(0, Math.ceil((t.endAt - now) / 1000)) : t.remaining;
        return { ...t, running: false, endAt: null, remaining: rem };
      });
    });
    return unsub;
  }, [onOtherTimerStarted]);

  // Auto-hide the "cycle complete" indicator after 8s
  useEffect(() => {
    if (!cycleComplete) return;
    const id = window.setTimeout(() => setCycleComplete(false), 8000);
    return () => window.clearTimeout(id);
  }, [cycleComplete]);

  // If settings focus/break durations change while idle, update the total/remaining
  useEffect(() => {
    setPomodoro((p) => {
      if (p.running) return p;
      const expectedTotal = (p.mode === 'focus' ? focusMin : breakMin) * 60;
      // If idle at full duration, update to the newly configured settings duration
      if (p.remaining === p.total && p.total !== expectedTotal) {
        return { ...p, total: expectedTotal, remaining: expectedTotal };
      }
      return p;
    });
  }, [focusMin, breakMin]);

  // --- Pomodoro user actions ---
  const setSubjectId = useCallback((id: string) => {
    setPomodoro((p) => ({ ...p, subjectId: id }));
  }, []);

  const togglePomodoro = useCallback(() => {
    const p = pomodoroRef.current;
    if (p.running) {
      // Pause
      const now = Date.now();
      const rem = p.endAt ? Math.max(0, Math.ceil((p.endAt - now) / 1000)) : p.remaining;
      setPomodoro((prev) => ({
        ...prev,
        running: false,
        endAt: null,
        remaining: rem,
      }));
    } else {
      // Start or Resume
      stopAlarm();
      setCycleComplete(false);
      // Pause custom timer if running
      setTimer((t) => (t.running ? { ...t, running: false, endAt: null } : t));

      const dur = p.remaining > 0 ? p.remaining : (p.mode === 'focus' ? focusMinRef.current : breakMinRef.current) * 60;
      setPomodoro((prev) => ({
        ...prev,
        running: true,
        remaining: dur,
        endAt: Date.now() + dur * 1000,
      }));
      notifyTimerStart();
    }
  }, [notifyTimerStart, stopAlarm]);

  const resetPomodoro = useCallback(() => {
    stopAlarm();
    setCycleComplete(false);
    const dur = (pomodoroRef.current.mode === 'focus' ? focusMinRef.current : breakMinRef.current) * 60;
    setPomodoro((p) => ({
      ...p,
      running: false,
      endAt: null,
      total: dur,
      remaining: dur,
    }));
  }, [stopAlarm]);

  const skipPomodoro = useCallback(() => {
    stopAlarm();
    const p = pomodoroRef.current;
    const curMode = p.mode;
    const c = p.cycle;
    const inCycle = c.enabled && c.count > 0;

    if (curMode === 'break' && inCycle) {
      if (c.current >= c.count) {
        if (c.accumulatedFocus > 0) {
          logFocusSession(c.accumulatedFocus, c.subjectId);
        }
        toast('Cycle complete! 🎉', 'success');
        setCycleComplete(true);
        const dur = focusMinRef.current * 60;
        setPomodoro((prev) => ({
          ...prev,
          mode: 'focus',
          running: false,
          total: dur,
          remaining: dur,
          endAt: null,
          cycle: {
            ...prev.cycle,
            enabled: false,
            current: 1,
            accumulatedFocus: 0,
            subjectId: null,
          },
        }));
      } else {
        // Skip break -> next focus
        const dur = focusMinRef.current * 60;
        notifyTimerStart();
        setPomodoro((prev) => ({
          ...prev,
          mode: 'focus',
          running: true,
          total: dur,
          remaining: dur,
          endAt: Date.now() + dur * 1000,
          cycle: { ...prev.cycle, current: prev.cycle.current + 1 },
        }));
      }
      return;
    }

    completePomodoroSegment(false);
  }, [completePomodoroSegment, logFocusSession, notifyTimerStart, stopAlarm, toast]);

  const stopCycle = useCallback(() => {
    stopAlarm();
    const p = pomodoroRef.current;
    const c = p.cycle;
    if (c.accumulatedFocus > 0) {
      logFocusSession(c.accumulatedFocus, c.subjectId);
    }
    const dur = focusMinRef.current * 60;
    setPomodoro((prev) => ({
      ...prev,
      mode: 'focus',
      running: false,
      endAt: null,
      total: dur,
      remaining: dur,
      cycle: {
        enabled: false,
        count: c.count,
        current: 1,
        accumulatedFocus: 0,
        subjectId: null,
      },
    }));
    setCycleComplete(true);
    toast(
      c.accumulatedFocus > 0 ? `Cycle stopped — ${c.accumulatedFocus}m logged` : 'Cycle stopped',
      'info'
    );
  }, [logFocusSession, stopAlarm, toast]);

  const switchPomodoroMode = useCallback(
    (m: Mode) => {
      if (m === pomodoroRef.current.mode) return;
      stopAlarm();
      const dur = (m === 'focus' ? focusMinRef.current : breakMinRef.current) * 60;
      setPomodoro((p) => ({
        ...p,
        mode: m,
        running: false,
        endAt: null,
        total: dur,
        remaining: dur,
      }));
    },
    [stopAlarm]
  );

  const saveCycleConfig = useCallback(
    (newCycle: CycleState) => {
      setPomodoro((p) => ({
        ...p,
        cycle: newCycle,
      }));
      setCycleComplete(false);
      if (newCycle.count > 0) {
        toast(
          newCycle.enabled
            ? `Cycle set for ${newCycle.count} ${newCycle.count === 1 ? 'session' : 'sessions'}`
            : 'Cycle disabled',
          'success'
        );
      } else {
        toast('Cycle disabled (0 sessions)', 'info');
      }
    },
    [toast]
  );

  // --- Custom Timer user actions ---
  const setTimerHours = useCallback((h: number) => {
    setTimer((t) => ({ ...t, hours: h }));
  }, []);

  const setTimerMinutes = useCallback((m: number) => {
    setTimer((t) => ({ ...t, minutes: m }));
  }, []);

  const setTimerSeconds = useCallback((s: number) => {
    setTimer((t) => ({ ...t, seconds: s }));
  }, []);

  const startCustomTimer = useCallback(() => {
    const t = timerRef.current;
    const total = t.hours * 3600 + t.minutes * 60 + t.seconds;
    if (total <= 0) return;
    stopAlarm();

    // Pause Pomodoro if running
    setPomodoro((p) => (p.running ? { ...p, running: false, endAt: null } : p));

    setTimer((prev) => ({
      ...prev,
      configured: true,
      running: true,
      total,
      remaining: total,
      endAt: Date.now() + total * 1000,
    }));
    notifyTimerStart();
  }, [notifyTimerStart, stopAlarm]);

  const pauseCustomTimer = useCallback(() => {
    const t = timerRef.current;
    const now = Date.now();
    const rem = t.endAt ? Math.max(0, Math.ceil((t.endAt - now) / 1000)) : t.remaining;
    setTimer((prev) => ({
      ...prev,
      running: false,
      endAt: null,
      remaining: rem,
    }));
  }, []);

  const resumeCustomTimer = useCallback(() => {
    const t = timerRef.current;
    if (t.remaining <= 0) return;
    stopAlarm();

    // Pause Pomodoro if running
    setPomodoro((p) => (p.running ? { ...p, running: false, endAt: null } : p));

    setTimer((prev) => ({
      ...prev,
      running: true,
      endAt: Date.now() + prev.remaining * 1000,
    }));
    notifyTimerStart();
  }, [notifyTimerStart, stopAlarm]);

  const resetCustomTimer = useCallback(() => {
    stopAlarm();
    setTimer({
      hours: 0,
      minutes: 0,
      seconds: 0,
      configured: false,
      running: false,
      total: 0,
      remaining: 0,
      endAt: null,
    });
  }, [stopAlarm]);

  // --- Stopwatch user actions ---
  const toggleStopwatch = useCallback(() => {
    const s = stopwatchRef.current;
    if (s.running) {
      const now = Date.now();
      const el = s.startTime ? Math.max(0, now - s.startTime) : s.elapsed;
      setStopwatch((prev) => ({
        ...prev,
        running: false,
        startTime: null,
        elapsed: el,
      }));
    } else {
      const now = Date.now();
      setStopwatch((prev) => ({
        ...prev,
        running: true,
        startTime: now - prev.elapsed,
      }));
    }
  }, []);

  const resetStopwatch = useCallback(() => {
    setStopwatch({
      running: false,
      elapsed: 0,
      startTime: null,
      laps: [],
    });
  }, []);

  const addStopwatchLap = useCallback(() => {
    setStopwatch((prev) => {
      if (!prev.running) return prev;
      return {
        ...prev,
        laps: [prev.elapsed, ...prev.laps],
      };
    });
  }, []);

  // Display calculations
  const pomodoroMins = Math.floor(pomodoro.remaining / 60);
  const pomodoroSecs = pomodoro.remaining % 60;
  const pomodoroTimeStr = `${String(pomodoroMins).padStart(2, '0')}:${String(pomodoroSecs).padStart(2, '0')}`;
  const pomodoroProgress =
    pomodoro.total > 0 ? ((pomodoro.total - pomodoro.remaining) / pomodoro.total) * 100 : 0;

  const timerH = Math.floor(timer.remaining / 3600);
  const timerM = Math.floor((timer.remaining % 3600) / 60);
  const timerS = timer.remaining % 60;
  const timerTimeStr = `${String(timerH).padStart(2, '0')}:${String(timerM).padStart(2, '0')}:${String(timerS).padStart(2, '0')}`;
  const timerProgress = timer.total > 0 ? ((timer.total - timer.remaining) / timer.total) * 100 : 0;

  const stopH = Math.floor(stopwatch.elapsed / 3600000);
  const stopM = Math.floor((stopwatch.elapsed % 3600000) / 60000);
  const stopS = Math.floor((stopwatch.elapsed % 60000) / 1000);
  const stopMs = stopwatch.elapsed % 1000;
  const stopwatchTimeStr = `${String(stopH).padStart(2, '0')}:${String(stopM).padStart(2, '0')}:${String(stopS).padStart(2, '0')}.${String(stopMs).padStart(3, '0')}`;

  const cycleActive = pomodoro.cycle.enabled && pomodoro.cycle.count > 0;

  return (
    <FocusTimerContext.Provider
      value={{
        tool,
        setTool,
        mode: pomodoro.mode,
        subjectId: pomodoro.subjectId,
        setSubjectId,
        completedRounds: pomodoro.completedRounds,
        cycle: pomodoro.cycle,
        cycleComplete,
        setCycleComplete,
        pomodoroRunning: pomodoro.running,
        pomodoroRemaining: pomodoro.remaining,
        pomodoroTotal: pomodoro.total,
        pomodoroProgress,
        pomodoroTimeStr,
        cycleActive,
        togglePomodoro,
        resetPomodoro,
        skipPomodoro,
        stopCycle,
        switchPomodoroMode,
        saveCycleConfig,

        timerHours: timer.hours,
        timerMinutes: timer.minutes,
        timerSeconds: timer.seconds,
        setTimerHours,
        setTimerMinutes,
        setTimerSeconds,
        timerConfigured: timer.configured,
        timerRunning: timer.running,
        timerRemaining: timer.remaining,
        timerTotal: timer.total,
        timerProgress,
        timerTimeStr,
        startCustomTimer,
        pauseCustomTimer,
        resumeCustomTimer,
        resetCustomTimer,

        stopwatchRunning: stopwatch.running,
        stopwatchElapsed: stopwatch.elapsed,
        stopwatchTimeStr,
        stopwatchLaps: stopwatch.laps,
        toggleStopwatch,
        resetStopwatch,
        addStopwatchLap,
      }}
    >
      {children}
    </FocusTimerContext.Provider>
  );
}

export function useFocusTimer() {
  const ctx = useContext(FocusTimerContext);
  if (!ctx) throw new Error('useFocusTimer must be used within FocusTimerProvider');
  return ctx;
}
