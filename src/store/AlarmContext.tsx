/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlarmNotification } from '@/components/ui/AlarmNotification';

// Base-aware URL so the alarm mp3 (served from public/) also works under a
// non-root deployment base (vite.config.ts sets base: '/studia/').
const ALARM_SRC = `${import.meta.env.BASE_URL}alarm.mp3`;
const STORAGE_KEY = 'studia:alarm:state';
const HEARTBEAT_KEY = 'studia:alarm:heartbeat';
const CHANNEL_NAME = 'studia:alarm';
const TAB_ID =
  typeof window !== 'undefined'
    ? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    : 'ssr';

export interface AlarmState {
  active: boolean;
  id: string;
  ownerTabId: string;
  startedAt: number;
}

const IDLE_ALARM: AlarmState = { active: false, id: '', ownerTabId: '', startedAt: 0 };

type ChannelMessage =
  | { type: 'alarm-start'; fromTab: string; state: AlarmState }
  | { type: 'alarm-stop'; fromTab: string }
  | { type: 'timer-start'; fromTab: string; at: number };

interface AlarmContextValue {
  alarmActive: boolean;
  autoplayBlocked: boolean;
  startAlarm: () => void;
  stopAlarm: () => void;
  retrySound: () => void;
  notifyTimerStart: () => void;
  onOtherTimerStarted: (cb: (startedAt: number) => void) => () => void;
}

const AlarmContext = createContext<AlarmContextValue | null>(null);

export function AlarmProvider({ children }: { children: ReactNode }) {
  const [alarm, setAlarm] = useState<AlarmState>(IDLE_ALARM);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const alarmRef = useRef<AlarmState>(IDLE_ALARM);
  const timerListenersRef = useRef(new Set<(startedAt: number) => void>());

  const setAlarmState = useCallback((next: AlarmState) => {
    alarmRef.current = next;
    setAlarm(next);
  }, []);

  /** Single shared Audio element — prevents duplicate copies within a tab. */
  const getAudio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      const audio = new Audio(ALARM_SRC);
      audio.loop = true;
      audio.preload = 'auto';
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setAutoplayBlocked(false);
  }, []);

  const playAudio = useCallback(async () => {
    const audio = getAudio();
    try {
      await audio.play();
      setAutoplayBlocked(false);
    } catch {
      // Autoplay blocked — user must interact with the page first.
      setAutoplayBlocked(true);
    }
  }, [getAudio]);

  const startAlarm = useCallback(() => {
    stopAudio();
    try {
      localStorage.removeItem(HEARTBEAT_KEY);
    } catch {
      /* ignore */
    }
    const next: AlarmState = {
      active: true,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ownerTabId: TAB_ID,
      startedAt: Date.now(),
    };
    setAlarmState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    channelRef.current?.postMessage({ type: 'alarm-start', fromTab: TAB_ID, state: next });
    void playAudio();
  }, [playAudio, setAlarmState, stopAudio]);

  const stopAlarm = useCallback(() => {
    stopAudio();
    setAlarmState(IDLE_ALARM);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(HEARTBEAT_KEY);
    } catch {
      /* ignore */
    }
    channelRef.current?.postMessage({ type: 'alarm-stop', fromTab: TAB_ID });
  }, [setAlarmState, stopAudio]);

  const retrySound = useCallback(() => {
    void playAudio();
  }, [playAudio]);

  const notifyTimerStart = useCallback(() => {
    channelRef.current?.postMessage({ type: 'timer-start', fromTab: TAB_ID, at: Date.now() });
  }, []);

  const onOtherTimerStarted = useCallback((cb: (startedAt: number) => void) => {
    timerListenersRef.current.add(cb);
    return () => {
      timerListenersRef.current.delete(cb);
    };
  }, []);

  // Cross-tab coordination: BroadcastChannel + localStorage fallback.
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;
      channel.onmessage = (ev: MessageEvent<ChannelMessage>) => {
        const msg = ev.data;
        if (!msg || typeof msg !== 'object' || msg.fromTab === TAB_ID) return;
        switch (msg.type) {
          case 'alarm-start':
            if (msg.state?.active) {
              setAlarmState(msg.state);
              if (msg.state.ownerTabId === TAB_ID) {
                void playAudio();
              } else {
                stopAudio();
              }
            }
            break;
          case 'alarm-stop':
            setAlarmState(IDLE_ALARM);
            stopAudio();
            break;
          case 'timer-start':
            timerListenersRef.current.forEach((cb) => cb(msg.at));
            break;
          default:
            break;
        }
      };
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      if (e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as AlarmState;
          if (parsed?.active) {
            setAlarmState(parsed);
            if (parsed.ownerTabId === TAB_ID) {
              void playAudio();
            } else {
              stopAudio();
            }
          } else {
            setAlarmState(IDLE_ALARM);
            stopAudio();
          }
        } catch {
          /* ignore malformed payload */
        }
      } else {
        setAlarmState(IDLE_ALARM);
        stopAudio();
      }
    };
    window.addEventListener('storage', onStorage);

    const claimTimer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as AlarmState;
        if (!parsed?.active) return;
        if (parsed.ownerTabId !== TAB_ID) {
          setAlarmState(parsed);
          stopAudio();
          return;
        }
        setAlarmState(parsed);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch {
          /* ignore */
        }
        channel?.postMessage({ type: 'alarm-start', fromTab: TAB_ID, state: parsed });
        void playAudio();
      } catch {
        /* ignore */
      }
    }, 150);

    return () => {
      window.clearTimeout(claimTimer);
      channel?.close();
      window.removeEventListener('storage', onStorage);
      stopAudio();
    };
  }, [playAudio, setAlarmState, stopAudio]);

  // Heartbeat + dead-owner takeover.
  useEffect(() => {
    if (!alarm.active) return;

    if (alarm.ownerTabId === TAB_ID) {
      const write = () => {
        try {
          localStorage.setItem(HEARTBEAT_KEY, JSON.stringify({ id: alarm.id, at: Date.now() }));
        } catch {
          /* ignore */
        }
        const audio = audioRef.current;
        if (audio && audio.paused) void playAudio();
      };
      write();
      const id = window.setInterval(write, 10000);
      return () => window.clearInterval(id);
    }

    const check = () => {
      const current = alarmRef.current;
      if (!current.active) return;
      try {
        const raw = localStorage.getItem(HEARTBEAT_KEY);
        const hb = raw ? (JSON.parse(raw) as { id: string; at: number }) : null;
        const stale = !hb || hb.id !== current.id || Date.now() - hb.at > 35000;
        if (stale) {
          const claimed: AlarmState = { ...current, ownerTabId: TAB_ID };
          setAlarmState(claimed);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(claimed));
          } catch {
            /* ignore */
          }
          channelRef.current?.postMessage({
            type: 'alarm-start',
            fromTab: TAB_ID,
            state: claimed,
          });
          void playAudio();
        }
      } catch {
        /* ignore */
      }
    };
    const id = window.setInterval(check, 5000);
    return () => window.clearInterval(id);
  }, [alarm, playAudio, setAlarmState]);

  // Re-sync audio state when the tab becomes visible again.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) return;
      const a = alarmRef.current;
      if (!a.active) return;
      const audio = audioRef.current;
      if (!audio) return;
      if (a.ownerTabId === TAB_ID) {
        if (audio.paused) void playAudio();
      } else if (!audio.paused) {
        stopAudio();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [playAudio, stopAudio]);

  return (
    <AlarmContext.Provider
      value={{
        alarmActive: alarm.active,
        autoplayBlocked,
        startAlarm,
        stopAlarm,
        retrySound,
        notifyTimerStart,
        onOtherTimerStarted,
      }}
    >
      {children}
      <AlarmNotification active={alarm.active} alarmId={alarm.id} autoplayBlocked={autoplayBlocked} onStop={stopAlarm} onRetry={retrySound} />
    </AlarmContext.Provider>
  );
}

export function useAlarm() {
  const ctx = useContext(AlarmContext);
  if (!ctx) throw new Error('useAlarm must be used within AlarmProvider');
  return ctx;
}