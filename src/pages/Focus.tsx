import { useState } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Timer,
  History,
  Coffee,
  Brain,
  Hourglass,
  StopCircle,
  Repeat,
  CheckCircle2,
} from "lucide-react";
import { useStore } from "@/store/StoreContext";
import { useTheme } from "@/store/ThemeContext";
import {
  useFocusTimer,
  type ToolMode,
  type CycleState,
} from "@/store/FocusTimerContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/Feedback";
import { CircularProgress } from "@/components/ui/Progress";
import { SubjectPill } from "@/components/ui/Subject";
import { FocusingSounds } from "@/components/ui/FocusingSounds";
import { getSubjectById, formatDate, todayISO, daysUntil } from "@/lib/utils";

export default function Focus() {
  const { data } = useStore();
  const { reducedMotion } = useTheme();

  const {
    tool,
    setTool,
    mode,
    subjectId,
    setSubjectId,
    completedRounds,
    cycle,
    cycleComplete,
    setCycleComplete,
    pomodoroRunning,
    pomodoroProgress,
    pomodoroTimeStr,
    cycleActive,
    togglePomodoro,
    resetPomodoro,
    skipPomodoro,
    stopCycle,
    switchPomodoroMode,
    saveCycleConfig,
  } = useFocusTimer();

  const [cycleModalOpen, setCycleModalOpen] = useState(false);
  const [cycleDraft, setCycleDraft] = useState<CycleState>({
    enabled: false,
    count: 2,
    current: 1,
    accumulatedFocus: 0,
    subjectId: null,
  });

  const recentSessions = data.sessions
    .filter((s) => s.type === "focus")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  const todayMinutes = data.sessions
    .filter((s) => s.date === todayISO() && s.type === "focus")
    .reduce((sum, s) => sum + s.duration, 0);

  const openCycleModal = () => {
    setCycleComplete(false);
    setCycleDraft({
      enabled: cycle.enabled,
      count: cycle.count,
      current: cycle.current,
      accumulatedFocus: cycle.accumulatedFocus,
      subjectId: cycle.subjectId,
    });
    setCycleModalOpen(true);
  };

  const handleSaveCycleConfig = () => {
    const count = Math.max(0, Math.min(20, Math.round(cycleDraft.count) || 0));
    const unchanged =
      cycleDraft.enabled === cycle.enabled && count === cycle.count;
    saveCycleConfig({
      enabled: !!(cycleDraft.enabled && count > 0),
      count,
      current: unchanged ? cycle.current : 1,
      accumulatedFocus: unchanged ? cycle.accumulatedFocus : 0,
      subjectId: unchanged ? cycle.subjectId : null,
    });
    setCycleModalOpen(false);
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl lg:text-3xl font-title font-bold tracking-tight">
          Focus Mode
        </h2>
        <p className="text-bg-surface text-sm mt-1">
          Deep work, distraction-free.
        </p>
      </div>

      {/* Tool tabs - sticky */}
      <div className="sticky top-0 z-10 -mx-4 px-4 lg:mx-0 lg:px-0 lg:static pb-2 lg:pb-0 bg-bg-base dark:bg-bg-base/95 backdrop-blur-sm lg:backdrop-blur-none">
        <div className="inline-flex p-1 border-2 border-bg-surface rounded-xl gap-1 mb-6">
          {(
            [
              {
                id: "pomodoro",
                label: "Pomodoro",
                icon: <Brain className="w-4 h-4" />,
              },
              {
                id: "timer",
                label: "Timer",
                icon: <Hourglass className="w-4 h-4" />,
              },
              {
                id: "stopwatch",
                label: "Stopwatch",
                icon: <StopCircle className="w-4 h-4" />,
              },
            ] as { id: ToolMode; label: string; icon: React.ReactNode }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                tool === t.id
                  ? "bg-brand-500 text-white shadow-soft"
                  : "text-bg-surface dark:text-fg-subtle hover:text-green-500/85 dark:hover:text-brand-400"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Timer card */}
        <Card className="lg:col-span-2 self-start">
          <div className="p-6 lg:p-8 flex flex-col items-center">
            {/* Pomodoro Panel */}
            <div
              className={`w-full flex flex-col items-center ${
                tool === "pomodoro" ? "" : "hidden"
              }`}
            >
              {/* Mode switch - sticky within timer card */}
              <div className="sticky top-0 z-5 backdrop-blur-sm -mx-6 lg:-mx-8 px-6 lg:px-8 py-2">
                <div className="inline-flex p-1 border-2 border-bg-surface rounded-xl gap-1">
                  <button
                    onClick={() => switchPomodoroMode("focus")}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                      mode === "focus"
                        ? "bg-brand-500 text-white shadow-soft"
                        : "text-bg-surface dark:text-fg-subtle hover:text-green-500/85 dark:hover:text-brand-400"
                    }`}
                  >
                    <Brain className="w-4 h-4" /> Focus
                  </button>
                  <button
                    onClick={() => switchPomodoroMode("break")}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                      mode === "break"
                        ? "bg-brand-500 text-white shadow-soft"
                        : "text-bg-surface dark:text-fg-subtle hover:text-green-500/85 dark:hover:text-brand-400"
                    }`}
                  >
                    <Coffee className="w-4 h-4" /> Break
                  </button>
                </div>
              </div>

              {/* Cycle progress / completion indicator */}
              {cycleActive && (
                <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-sm">
                  <Repeat className="w-4 h-4 text-brand-500" />
                  <span className="font-medium text-black">
                    Cycle {cycle.current} of {cycle.count}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-xs font-semibold ${
                      mode === "focus"
                        ? "bg-brand-500 text-white"
                        : "bg-accent-500 text-white"
                    }`}
                  >
                    {mode === "focus" ? "Focus" : "Break"}
                  </span>
                </div>
              )}
              {!cycleActive && cycleComplete && (
                <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="font-medium">Cycle complete!</span>
                </div>
              )}

              {/* Timer circle */}
              <div className="relative">
                {!reducedMotion && pomodoroRunning && (
                  <div
                    className="absolute inset-0 rounded-full animate-pulse-ring"
                    style={{
                      boxShadow: `0 0 40px ${
                        mode === "focus"
                          ? "rgb(var(--brand-500))"
                          : "rgb(var(--accent-500))"
                      }40`,
                    }}
                  />
                )}
                <CircularProgress
                  value={pomodoroProgress}
                  size={240}
                  strokeWidth={6}
                  color={
                    mode === "focus"
                      ? "rgb(var(--brand-500))"
                      : "rgb(var(--accent-500))"
                  }
                  label={pomodoroTimeStr}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3 mt-8">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={resetPomodoro}
                  aria-label="Reset"
                  className="border-bg-surface/100 hover:bg-inherit hover:border-green-500/80"
                >
                  <RotateCcw className="w-5 h-5 text-brand-500/85" />
                </Button>
                <Button
                  size="lg"
                  onClick={togglePomodoro}
                  className="w-20 h-20 rounded-full"
                >
                  {pomodoroRunning ? (
                    <Pause className="w-8 h-8" />
                  ) : (
                    <Play className="w-8 h-8 ml-1" />
                  )}
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={skipPomodoro}
                  aria-label="Skip"
                  className="border-bg-surface/100 hover:bg-inherit hover:border-green-500/80"
                >
                  <SkipForward className="w-5 h-5 text-brand-500/85" />
                </Button>
                {cycleActive && (
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={stopCycle}
                    aria-label="Stop cycle"
                  >
                    <StopCircle className="w-5 h-5 text-danger" />
                  </Button>
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
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant={cycleActive ? "secondary" : "outline"}
                    size="md"
                    onClick={openCycleModal}
                    aria-label="Configure cycle"
                    title="Configure Pomodoro cycle"
                    className="h-10 px-3 rounded-xl text-bg-surface/80 border-bg-surface/100"
                  >
                    <Repeat className="w-4 h-4 " />
                    {cycleActive ? `Cycle ${cycle.count}` : "Cycle"}
                  </Button>
                </div>
              </div>

              {/* Session info */}
              <div className="mt-8 w-full max-w-sm space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-bg-surface">Rounds completed</span>
                  <span className="font-semibold text-info">
                    {completedRounds}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-bg-surface">Today's focus time</span>
                  <span className="font-semibold text-info">
                    {Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m
                  </span>
                </div>
                {subjectId && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-bg-surface">Current subject</span>
                    <SubjectPill
                      subject={getSubjectById(data.subjects, subjectId)}
                      className="text-purple-500 text-sm font-medium"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Custom Timer Panel */}
            <div
              className={`w-full flex flex-col items-center ${
                tool === "timer" ? "" : "hidden"
              }`}
            >
              <CustomTimer />
            </div>

            {/* Stopwatch Panel */}
            <div
              className={`w-full flex flex-col items-center ${
                tool === "stopwatch" ? "" : "hidden"
              }`}
            >
              <CustomStopwatch />
            </div>
          </div>
        </Card>

        {/* Sounds */}
        <div className="space-y-4 lg:space-y-6">
          <FocusingSounds />
        </div>

        {/* Recent sessions — full width at the bottom */}
        <Card className="lg:col-span-3">
          <div className="p-5 border-b border-border-default flex items-center gap-2">
            <History className="w-4 h-4 text-brand-500" />
            <h3 className="font-semibold text-bg-surface">Recent Sessions</h3>
          </div>
          <div className="p-5">
            {recentSessions.length === 0 ? (
              <EmptyState
                icon={<Timer className="w-7 h-7" />}
                title="No sessions yet"
                description="Your study sessions will appear here."
              />
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
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-bg-surface"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                        <Timer className="w-4 h-4 text-brand-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-purple-500 font-medium truncate">
                          {subject?.name ?? "Study Session"}
                        </p>
                        <p className="text-xs text-bg-surface">
                          {formatDate(s.date)} ·{" "}
                          {daysUntil(s.date) === 0
                            ? "Today"
                            : daysUntil(s.date) === -1
                              ? "Yesterday"
                              : `${Math.abs(daysUntil(s.date))}d ago`}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-info shrink-0">
                        {s.duration}m
                      </span>
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
          onSave={handleSaveCycleConfig}
        />
      )}
    </div>
  );
}

function CycleModal({
  draft,
  onDraftChange,
  onClose,
  onSave,
}: {
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
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={invalid}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) =>
              onDraftChange({ ...draft, enabled: e.target.checked })
            }
            className="w-4 h-4 rounded accent-brand-500"
          />
          <span className="text-sm text-fg-muted">Enable cycle</span>
        </label>
        <p className="text-xs text-fg-subtle -mt-2">
          Set the number of focus sessions below, then toggle this on to start
          cycling.
        </p>

        <div>
          <label className="text-sm font-medium text-fg-muted block mb-2">
            Focus sessions per cycle
          </label>
          <div className="w-32">
            <Input
              type="number"
              min={0}
              max={20}
              value={draft.count}
              onChange={(e) =>
                onDraftChange({ ...draft, count: Number(e.target.value) || 0 })
              }
            />
          </div>
          {draft.count === 1 && (
            <p className="text-xs text-fg-subtle mt-1.5">
              Focus → Break → Stop
            </p>
          )}
          {draft.count === 2 && (
            <p className="text-xs text-fg-subtle mt-1.5">
              Focus → Break → Focus → Break → Stop
            </p>
          )}
          {draft.count >= 3 && (
            <p className="text-xs text-fg-subtle mt-1.5">
              Repeated Focus → Break until {draft.count} focus sessions are
              done, then stop.
            </p>
          )}
          {invalid && (
            <p className="text-xs text-danger mt-1.5">
              Enter a number between 0 and 20.
            </p>
          )}
        </div>

        <p className="text-xs text-fg-subtle bg-bg-muted/50 rounded-lg p-3">
          The whole cycle is recorded as one study session containing the total
          completed focus time — keeping your stats, charts, and history
          consistent.
        </p>
      </div>
    </Modal>
  );
}

function CustomTimer() {
  const { reducedMotion } = useTheme();
  const {
    timerHours,
    timerMinutes,
    timerSeconds,
    setTimerHours,
    setTimerMinutes,
    setTimerSeconds,
    timerConfigured,
    timerRunning,
    timerProgress,
    timerTimeStr,
    startCustomTimer,
    pauseCustomTimer,
    resumeCustomTimer,
    resetCustomTimer,
  } = useFocusTimer();

  const numInput = (
    value: number,
    setter: (n: number) => void,
    max: number,
    label: string,
  ) => (
    <div className="flex flex-col items-center gap-1.5">
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        disabled={timerRunning}
        onChange={(e) =>
          setter(Math.min(Math.max(0, Number(e.target.value) || 0), max))
        }
        className="w-20 h-14 text-center text-2xl font-bold rounded-xl border border-bg-surface text-bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
      />
      <span className="text-xs text-fg-subtle">{label}</span>
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative mb-8">
        {!reducedMotion && timerRunning && (
          <div
            className="absolute inset-0 rounded-full animate-pulse-ring"
            style={{ boxShadow: "0 0 40px rgb(var(--brand-500))40" }}
          />
        )}
        <CircularProgress
          value={timerProgress}
          size={240}
          strokeWidth={6}
          color="rgb(var(--brand-500))"
          label={timerTimeStr}
        />
      </div>
      {!timerConfigured ? (
        <>
          <div className="flex items-center gap-3 mb-8">
            {numInput(timerHours, setTimerHours, 99, "Hours")}
            <span className="text-2xl font-bold text-black">:</span>
            {numInput(timerMinutes, setTimerMinutes, 59, "Minutes")}
            <span className="text-2xl font-bold text-black">:</span>
            {numInput(timerSeconds, setTimerSeconds, 59, "Seconds")}
          </div>
          <Button
            size="lg"
            onClick={startCustomTimer}
            disabled={timerHours * 3600 + timerMinutes * 60 + timerSeconds <= 0}
            className="w-20 h-20 rounded-full"
          >
            <Play className="w-8 h-8 ml-1" />
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center justify-center gap-3 mt-8">
            <div className="w-10" aria-hidden="true"></div>
            <Button
              size="lg"
              onClick={timerRunning ? pauseCustomTimer : resumeCustomTimer}
              className="w-20 h-20 rounded-full"
            >
              {timerRunning ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={resetCustomTimer}
              aria-label="Reset"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function CustomStopwatch() {
  const { reducedMotion } = useTheme();
  const {
    stopwatchRunning,
    stopwatchTimeStr,
    stopwatchLaps,
    toggleStopwatch,
    resetStopwatch,
    addStopwatchLap,
  } = useFocusTimer();

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative mb-8">
        {!reducedMotion && stopwatchRunning && (
          <div
            className="absolute inset-0 rounded-full animate-pulse-ring"
            style={{ boxShadow: "0 0 40px rgb(var(--accent-500))40" }}
          />
        )}
        <CircularProgress
          value={stopwatchRunning ? 100 : 0}
          size={240}
          strokeWidth={6}
          color="rgb(var(--accent-500))"
          label={stopwatchTimeStr}
          labelClassName="text-2xl font-bold tabular-nums tracking-tight"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="icon"
          onClick={resetStopwatch}
          aria-label="Reset"
        >
          <RotateCcw className="w-5 h-5" />
        </Button>
        <Button
          size="lg"
          onClick={toggleStopwatch}
          className="w-20 h-20 rounded-full"
        >
          {stopwatchRunning ? (
            <Pause className="w-8 h-8" />
          ) : (
            <Play className="w-8 h-8 ml-1" />
          )}
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={addStopwatchLap}
          aria-label="Lap"
          disabled={!stopwatchRunning}
        >
          Lap
        </Button>
      </div>
      {stopwatchLaps.length > 0 && (
        <div className="mt-6 w-full max-w-sm max-h-64 overflow-y-auto space-y-1">
          {stopwatchLaps.map((lapTime, idx) => {
            const lapH = Math.floor(lapTime / 3600000);
            const lapM = Math.floor((lapTime % 3600000) / 60000);
            const lapS = Math.floor((lapTime % 60000) / 1000);
            const lapMs = lapTime % 1000;
            const lapTimeStr = `${String(lapH).padStart(2, "0")}:${String(lapM).padStart(2, "0")}:${String(lapS).padStart(2, "0")}.${String(lapMs).padStart(3, "0")}`;
            return (
              <div
                key={idx}
                className="flex items-center justify-between text-sm py-2 px-3 rounded-full bg-brand-400 border border-brand-500"
              >
                <span className="text-white">
                  Lap {stopwatchLaps.length - idx}
                </span>
                <span className="font-semibold text-white">{lapTimeStr}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
