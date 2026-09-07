import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, Square, Volume2 } from 'lucide-react';
import { useTheme } from '@/store/ThemeContext';
import { Button } from '@/components/ui/Button';

interface AlarmNotificationProps {
  active: boolean;
  alarmId: string;
  autoplayBlocked: boolean;
  onStop: () => void;
  onRetry: () => void;
}

export function AlarmNotification({
  active,
  alarmId,
  autoplayBlocked,
  onStop,
  onRetry,
}: AlarmNotificationProps) {
  const { reducedMotion } = useTheme();

  return (
    <div className="fixed top-4 inset-x-0 z-[110] flex justify-center px-4 pointer-events-none">
      <AnimatePresence>
        {active && (
          <motion.div
            key={alarmId}
            initial={reducedMotion ? false : { opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reducedMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.96 }
            }
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="glass-strong rounded-2xl shadow-float border border-border-default p-4 pointer-events-auto w-full max-w-md"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
                <BellRing className="w-5 h-5 text-brand-500 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm font-semibold text-fg">Focus session complete</p>
                <p className="text-xs text-fg-muted mt-0.5">
                  {autoplayBlocked
                    ? 'Sound is blocked by the browser. Click "Enable sound" to hear the alarm.'
                    : 'Alarm playing — stop it when you are ready.'}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              {autoplayBlocked && (
                <Button variant="secondary" size="sm" onClick={onRetry} className="flex-1 sm:flex-none">
                  <Volume2 className="w-4 h-4" /> Enable sound
                </Button>
              )}
              <Button size="sm" onClick={onStop} className="flex-1 sm:flex-none">
                <Square className="w-4 h-4" /> Stop Alarm
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}