import { motion } from 'framer-motion';
import { Play, Pause, Square, Volume2, Repeat } from 'lucide-react';
import { useSounds } from '@/store/SoundContext';
import { useTheme } from '@/store/ThemeContext';
import { Card } from '@/components/ui/Card';

/**
 * "Focusing Sounds" panel — a self-contained audio player for ambient study
 * sounds. Fully independent from the Focus clocks/timers. Uses the shared
 * SoundProvider's single Audio element so only one sound plays at a time.
 */
export function FocusingSounds() {
  const { sounds, currentSound, isPlaying, loopEnabled, volume, errorMsg, toggle, stop, toggleLoop, setVolume } = useSounds();
  const { reducedMotion } = useTheme();

  return (
    <Card>
      <div className="p-5 border-b border-border-default flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-fg-muted" />
        <h3 className="font-semibold">Focusing Sounds</h3>
      </div>
      <div className="p-5 space-y-4">
        {sounds.length === 0 ? (
          <p className="text-sm text-fg-subtle text-center py-4">No sounds available.</p>
        ) : (
          <>
            {/* Sound list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sounds.map((s, i) => {
                const active = currentSound === s.url;
                const playing = active && isPlaying;
                return (
                  <motion.button
                    key={s.id}
                    initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => toggle(s.url)}
                    className={`group flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                      active
                        ? 'bg-brand-500/10 border-brand-500/40'
                        : 'bg-bg-muted/40 border-border-default hover:border-border-strong'
                    }`}
                    aria-label={`${s.name}${playing ? ' — playing' : ''}`}
                  >
                    <span
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        active
                          ? 'bg-brand-500 text-white'
                          : 'bg-bg-muted text-fg-subtle group-hover:text-fg'
                      }`}
                    >
                      {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`block text-sm font-medium truncate ${active ? 'text-brand-500' : 'text-fg'}`}>{s.name}</span>
                      {active && (
                        <span className="block text-[10px] text-fg-subtle">
                          {playing ? 'Playing' : 'Paused'}
                        </span>
                      )}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border-default">
              {/* Play / Stop */}
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={() => currentSound && toggle(currentSound)}
                  disabled={!currentSound}
                  whileTap={reducedMotion ? undefined : { scale: 0.95 }}
                  className="w-9 h-9 rounded-lg bg-brand-500 text-white flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none hover:bg-brand-600 transition-colors"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </motion.button>
                <motion.button
                  onClick={stop}
                  disabled={!currentSound}
                  whileTap={reducedMotion ? undefined : { scale: 0.95 }}
                  className="w-9 h-9 rounded-lg bg-bg-muted text-fg-muted hover:text-danger hover:bg-danger/10 flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  aria-label="Stop"
                >
                  <Square className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Loop toggle */}
              <button
                onClick={toggleLoop}
                className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium transition-colors ${
                  loopEnabled
                    ? 'bg-brand-500/10 text-brand-500 border border-brand-500/30'
                    : 'bg-bg-muted text-fg-muted hover:text-fg border border-transparent'
                }`}
                aria-pressed={loopEnabled}
                aria-label="Toggle loop"
              >
                <Repeat className="w-4 h-4" />
                Loop
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2 ml-auto min-w-[120px]">
                <Volume2 className="w-4 h-4 text-fg-subtle shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-brand-500"
                  aria-label="Volume"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-lg p-2.5">{errorMsg}</p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}