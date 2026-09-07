/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { SOUND_FILES } from '@/data/sounds.generated';

export interface FocusSound {
  id: string;
  name: string;
  url: string;
}

interface SoundContextValue {
  sounds: FocusSound[];
  currentSound: string | null;
  isPlaying: boolean;
  loopEnabled: boolean;
  volume: number;
  errorMsg: string | null;
  toggle: (src: string) => void;
  stop: () => void;
  toggleLoop: () => void;
  setVolume: (v: number) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

/**
 * Focus sounds are discovered from the public/ folder at build time: a Vite
 * plugin (vite.config.ts) runs scripts/generate-sounds-manifest.mjs on every
 * dev/build start, writing src/data/sounds.generated.ts with the root-relative
 * URL of every MP3 file directly inside public/ (alarm.mp3 is excluded — it is
 * the Focus session-completion alarm played by AlarmContext, not an ambient
 * focusing sound). Each URL is joined with import.meta.env.BASE_URL so the
 * audio also loads when the app is deployed under a non-root base
 * (vite.config.ts sets base: '/studia/'). Human-friendly display names are
 * derived from the original filenames for the UI only.
 */
const SOUNDS: FocusSound[] = SOUND_FILES.map((url) => {
  const filename = url.split('/').pop() ?? '';
  const name = filename
    .replace(/\.mp3$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  // Root-relative manifest URL joined with the deployment base path.
  const resolvedUrl = `${import.meta.env.BASE_URL}${url.replace(/^\//, '')}`;
  return { id: url, name, url: resolvedUrl };
});

/**
 * Provides a single shared HTMLAudioElement for the Focusing Sounds feature.
 * Lives at the App level so the audio keeps playing while the user navigates
 * within the website. Fully independent from the Focus clocks/timers.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSound, setCurrentSound] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [volume, setVolumeState] = useState(0.6);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Keep latest values accessible to callbacks without re-creating them.
  const loopRef = useRef(loopEnabled);
  loopRef.current = loopEnabled;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  /** Single shared Audio element — prevents multiple sounds playing at once. */
  const getAudio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }
    return audioRef.current;
  }, []);

  /** Play a specific sound; stops any currently playing sound first. */
  const play = useCallback(
    (src: string) => {
      const audio = getAudio();
      setErrorMsg(null);
      audio.pause();
      audio.currentTime = 0;
      audio.src = src;
      audio.loop = loopRef.current;
      audio.volume = volumeRef.current;
      void audio.play().catch(() => {
        setErrorMsg('Could not play this sound.');
        setIsPlaying(false);
      });
      setCurrentSound(src);
      setIsPlaying(true);
    },
    [getAudio]
  );

  /** Stop playback and deselect the current sound. */
  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setCurrentSound(null);
    setIsPlaying(false);
    setErrorMsg(null);
  }, []);

  /** Toggle play/pause for a given sound; selecting a different sound switches to it. */
  const toggle = useCallback(
    (src: string) => {
      if (currentSound !== src) {
        play(src);
        return;
      }
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        audio.pause();
        setIsPlaying(false);
      } else {
        const el = getAudio();
        if (el.src) {
          void el.play().catch(() => {
            setErrorMsg('Could not play this sound.');
            setIsPlaying(false);
          });
          setIsPlaying(true);
        } else {
          play(src);
        }
      }
    },
    [currentSound, getAudio, play]
  );

  /** Toggle native HTML5 looping. */
  const toggleLoop = useCallback(() => {
    setLoopEnabled((prev) => {
      const next = !prev;
      if (audioRef.current) audioRef.current.loop = next;
      return next;
    });
  }, []);

  /** Set volume 0–1. */
  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
  }, []);

  // Sync UI state with audio element events + cleanup on unmount.
  useEffect(() => {
    const audio = getAudio();
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      setErrorMsg('Could not play this sound.');
      setIsPlaying(false);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [getAudio]);

  return (
    <SoundContext.Provider
      value={{ sounds: SOUNDS, currentSound, isPlaying, loopEnabled, volume, errorMsg, toggle, stop, toggleLoop, setVolume }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export function useSounds() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSounds must be used within SoundProvider');
  return ctx;
}