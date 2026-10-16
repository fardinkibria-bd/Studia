/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type { AppData } from '@/types';
import { EMPTY_DATA } from '@/data/seed';
import { resetStaticRoutines, computeStudyStreak } from '@/lib/utils';

const STORAGE_KEY = 'studia:data:v2';
const LEGACY_KEYS = ['studia:data:v1'];

type Updater = (data: AppData) => void;

export function normalizeAppData(raw: unknown): AppData | null {
  return migrateLegacy(raw);
}

interface StoreContextValue {
  data: AppData;
  update: (fn: Updater) => void;
  reset: () => void;
  loading: boolean;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const COLLECTION_KEYS = [
  'subjects', 'routines', 'homework', 'todos', 'revisions', 'exams',
  'sessions', 'goals', 'achievements', 'calendarEvents',
] as const;

/** Drop malformed entries so bad localStorage data can't break page rendering. */
function validCollection(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      !!item && typeof item === 'object' && !Array.isArray(item),
  );
}

function migrateLegacy(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const data = { ...EMPTY_DATA } as AppData;

  // Rebuild collections from object entries and validate field types. This is
  // intentionally defensive: localStorage is untrusted input, not a database.
  for (const key of COLLECTION_KEYS) {
    const source = validCollection(obj[key]);
    (data[key] as unknown[]) = source.filter((item) => {
      if (typeof item.id !== 'string') return false;
      for (const field of ['title', 'name', 'description', 'notes', 'location', 'teacher', 'date', 'dueDate', 'scheduledDate', 'time', 'startTime', 'endTime', 'unit', 'category', 'type', 'priority', 'status'] as const) {
        if (field in item && item[field] !== undefined && item[field] !== null && typeof item[field] !== 'string') return false;
      }
      for (const field of ['completed', 'isBreak', 'unlocked', 'isStatic', 'inProgress'] as const) {
        if (field in item && typeof item[field] !== 'boolean') return false;
      }
      for (const field of ['confidence', 'duration', 'marks', 'target', 'current', 'order', 'day'] as const) {
        if (field in item && item[field] !== undefined && typeof item[field] !== 'number') return false;
      }
      return true;
    }) as never;
  }

  const settings = obj.settings;
  if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
    const candidate = settings as Record<string, unknown>;
    data.settings = {
      theme: candidate.theme === 'light' ? 'light' : 'dark',
      reducedMotion: candidate.reducedMotion === true,
      weeklyGoalHours: finiteInRange(candidate.weeklyGoalHours, 1, 1000, EMPTY_DATA.settings.weeklyGoalHours),
      pomodoroFocus: finiteInRange(candidate.pomodoroFocus, 1, 1440, EMPTY_DATA.settings.pomodoroFocus),
      pomodoroBreak: finiteInRange(candidate.pomodoroBreak, 1, 1440, EMPTY_DATA.settings.pomodoroBreak),
    };
  }
  data.streak = computeStudyStreak(data.sessions);
  return data;
}

function finiteInRange(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function loadData(): AppData {
  // Try new storage key first
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const migrated = migrateLegacy(parsed);
      if (migrated) return migrated;
    }
  } catch {
    /* corrupted data - fall through to legacy */
  }

  // Try legacy storage keys
  for (const key of LEGACY_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const migrated = migrateLegacy(parsed);
        if (migrated) {
          // Save migrated data to new key and remove legacy
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
            localStorage.removeItem(key);
          } catch { /* ignore */ }
          return migrated;
        }
      }
    } catch {
      /* corrupted legacy data - ignore */
    }
  }

  return EMPTY_DATA;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loaded = loadData();
    setData({
      ...loaded,
      routines: resetStaticRoutines(loaded.routines),
    });
    setLoading(false);
  }, []);

  const externalChangeAt = useRef(0);

  // Listen for changes made by another tab. Cancel stale queued writes and
  // give the incoming external state a short settling window before saving.
  useEffect(() => {
    if (loading) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue);
        const migrated = migrateLegacy(parsed);
        if (migrated) {
          externalChangeAt.current = Date.now();
          setData(migrated);
        }
      } catch {
        // Ignore malformed external updates; keep current in-memory data.
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loading]);

  // Debounced save to avoid excessive writes.
  useEffect(() => {
    if (loading) return;
    const delay = Math.max(150, 250 - (Date.now() - externalChangeAt.current));
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        /* ignore quota errors */
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [data, loading]);

  const update = useCallback((fn: Updater) => {
    setData((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
    setData(EMPTY_DATA);
  }, []);

  return (
    <StoreContext.Provider value={{ data, update, reset, loading }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}