/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { AppData } from '@/types';
import { EMPTY_DATA } from '@/data/seed';
import { resetStaticRoutines, computeStudyStreak } from '@/lib/utils';

const STORAGE_KEY = 'studia:data:v2';
const LEGACY_KEYS = ['studia:data:v1'];

type Updater = (data: AppData) => void;

interface StoreContextValue {
  data: AppData;
  update: (fn: Updater) => void;
  reset: () => void;
  loading: boolean;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function migrateLegacy(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const data: AppData = {
    ...EMPTY_DATA,
    ...(obj as Partial<AppData>),
  };
  // Ensure calendarEvents exists (added in v2)
  if (!Array.isArray(data.calendarEvents)) data.calendarEvents = [];
  // Ensure todos exists (added in v3)
  if (!Array.isArray(data.todos)) data.todos = [];
  // Ensure all collections are arrays
  (['subjects', 'routines', 'homework', 'revisions', 'exams', 'sessions', 'goals', 'achievements'] as const).forEach((k) => {
    if (!Array.isArray(data[k])) data[k] = [];
  });
  // Ensure settings object is valid
  if (!data.settings || typeof data.settings !== 'object') {
    data.settings = { ...EMPTY_DATA.settings };
  } else {
    data.settings = { ...EMPTY_DATA.settings, ...data.settings };
  }
  // The streak is always derived from the actual study sessions (unique local
  // calendar dates with ≥1 focus session, consecutive ending on the most recent
  // study date). Recompute on load so any stale persisted streak is healed.
  data.streak = computeStudyStreak(data.sessions);
  return data;
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

  // Debounced save to avoid excessive writes
  useEffect(() => {
    if (loading) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        /* ignore quota errors */
      }
    }, 150);
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