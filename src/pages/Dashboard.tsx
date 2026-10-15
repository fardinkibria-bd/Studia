import { motion } from "framer-motion";
import {
  CalendarDays,
  Zap,
  Target,
  Timer,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useStore } from "@/store/StoreContext";
import { useTheme } from "@/store/ThemeContext";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { SubjectPill } from "@/components/ui/Subject";
import { EmptyState } from "@/components/ui/Feedback";
import { Checkbox } from "@/components/animate-ui/components/radix/checkbox";
import { PlayfulStrike } from "@/components/animate-ui/components/community/playful-todolist";
import {
  getTodayRoutine,
  getUpcomingHomework,
  completionRate,
  relativeDue,
  formatTime,
  durationLabel,
  daysUntil,
  getSubjectById,
  activeStreak,
} from "@/lib/utils";

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { data, update } = useStore();
  const { reducedMotion } = useTheme();
  const subjects = data.subjects;

  const toggleTodo = (id: string) => {
    update((d) => {
      const t = d.todos.find((x) => x.id === id);
      if (t) t.completed = !t.completed;
    });
  };

  const todayRoutine = getTodayRoutine(data.routines);
  const upcoming = getUpcomingHomework(data.homework, 5);
  const upcomingExams = data.exams
    .filter((e) => daysUntil(e.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const todayRevisions = data.revisions
    .filter((r) => !r.completed && daysUntil(r.scheduledDate) <= 1)
    .slice(0, 4);

  const homeworkRate = completionRate(data.homework);
  const revisionRate = completionRate(data.revisions);
  const overallProgress = Math.round((homeworkRate + revisionRate) / 2);

  const weekSessions = data.sessions.filter(
    (s) => daysUntil(s.date) >= -6 && daysUntil(s.date) <= 0,
  );
  const weekMinutes = weekSessions.reduce((sum, s) => sum + s.duration, 0);
  const weekHours = (weekMinutes / 60).toFixed(1);

  const stats = [
    {
      label: "Today's Tasks",
      value: `${todayRoutine.filter((r) => !r.completed).length} pending`,
      icon: CalendarDays,
      color: "text-brand-500",
      bg: "bg-brand-500/10",
    },
    {
      label: "Study Streak",
      value: `${activeStreak(data.streak)} days`,
      icon: Zap,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "This Week",
      value: `${weekHours}h`,
      icon: Timer,
      color: "text-info",
      bg: "bg-info/10",
    },
    {
      label: "Progress",
      value: `${overallProgress}%`,
      icon: TrendingUp,
      color: "text-success",
      bg: "bg-success/10",
    },
  ];

  const toggleRoutine = (id: string) => {
    update((d) => {
      const r = d.routines.find((x) => x.id === id);
      if (r) r.completed = !r.completed;
    });
  };

  const goTo = (page: string) => onNavigate?.(page);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl lg:text-4xl font-bold font-greeting tracking-tight text-green-700">
            {new Date().getHours() < 12
              ? "Good morning"
              : new Date().getHours() < 18
                ? "Good afternoon"
                : "Good evening"}
          </h2>
          <p className="text-bg-muted text-sm font-titles mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={() => goTo?.("focus")}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-green-700 dark:bg-brand-500 text-white text-sm font-medium hover:bg-green-600 dark:hover:bg-brand-600 transition-colors w-fit"
        >
          <Timer className="w-4 h-4" /> Start Focus Session
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {stats.map((s, i) => (
          <Card key={s.label} delay={i * 0.05} hover>
            <div className="p-4 flex items-start justify-between">
              <div>
                <p className="text-xs text-bg-surface font-medium">{s.label}</p>
                <p className="text-xl text-brand-600/80 lg:text-2xl font-bold mt-1">
                  {s.value}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}
              >
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Today's Schedule */}
        <Card className="lg:col-span-2" delay={0.1}>
          <div className="p-5 border-b border-border-default flex items-center justify-between">
            <h3 className="font-titles text-bg-surface">Today's Schedule</h3>
            <button
              onClick={() => goTo?.("schedule")}
              className="text-xs text-brand-500 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-5 text-bg-surface">
            {todayRoutine.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="w-7 h-7" />}
                title="Your schedule is clear"
                description="No routines planned for today. Enjoy the breather or add a new activity."
                action={
                  <button
                    onClick={() => goTo?.("schedule")}
                    className="px-4 h-10 rounded-xl bg-green-700/95 text-white text-sm font-medium hover:bg-green-600 dark:bg-brand-500 dark:hover:bg-brand-600 transition-colors"
                  >
                    Add routine
                  </button>
                }
              />
            ) : (
              <div className="space-y-2">
                {todayRoutine.map((item, i) => {
                  const subject = getSubjectById(subjects, item.subjectId);
                  return (
                    <motion.div
                      key={item.id}
                      initial={reducedMotion ? false : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.04 }}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${item.completed ? " border-border-strong opacity-60" : "border-1 border-bg-surface hover:border-green-500"}`}
                    >
                      <Checkbox
                        id={`dash-routine-${item.id}`}
                        variant="success"
                        checked={item.completed}
                        onCheckedChange={() => toggleRoutine(item.id)}
                        className="mt-0.5 shrink-0  text-white"
                        aria-label={
                          item.completed
                            ? `Mark "${item.title}" as incomplete`
                            : `Mark "${item.title}" as complete`
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <PlayfulStrike
                          checked={item.completed}
                          htmlFor={`dash-routine-${item.id}`}
                          textClassName={`text-sm font-medium text-brand-600/85`}
                        >
                          {item.title}
                        </PlayfulStrike>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-bg-surface">
                            {formatTime(item.startTime)} —{" "}
                            {formatTime(item.endTime)}
                          </span>
                          <span className="text-xs text-bg-surface">|</span>
                          <span className="text-xs text-bg-surface">
                            {durationLabel(item.startTime, item.endTime)}
                          </span>
                        </div>
                      </div>
                      {!item.isBreak && subject && (
                        <span style={{ backgroundColor: subject.color }} />
                      )}
                      <SubjectPill
                        subject={subject}
                        className="text-purple-500 mt-0.5"
                      />
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Upcoming exams */}
        <Card delay={0.25}>
          <div className="p-5 border-b border-border-default">
            <h3 className="font-titles text-bg-surface">Upcoming Exams</h3>
          </div>
          <div className="p-5">
            {upcomingExams.length === 0 ? (
              <p className="text-sm text-bg-surface text-center py-4">
                No exams scheduled.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingExams.map((e, i) => {
                  const subject = getSubjectById(subjects, e.subjectId);
                  const days = daysUntil(e.date);
                  return (
                    <motion.div
                      key={e.id}
                      initial={reducedMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.25 + i * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-12 h-12 rounded-xl bg-danger/10 flex flex-col items-center justify-center shrink-0">
                        <span className="text-lg font-bold text-danger leading-none">
                          {days}
                        </span>
                        <span className="text-[9px] text-danger/70 uppercase">
                          days
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-brand-600/85 font-medium truncate">
                          {e.title}
                        </p>
                        <SubjectPill
                          subject={subject}
                          className="text-purple-500 mt-0.5"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Upcoming homework */}
        <Card className="lg:col-span-2" delay={0.2}>
          <div className="p-5 border-b border-border-default flex items-center justify-between">
            <h3 className="font-titles text-bg-surface">Upcoming Homework</h3>
            <button
              onClick={() => goTo?.("homework")}
              className="text-xs text-brand-500 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-5">
            {upcoming.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-7 h-7" />}
                title="All caught up!"
                description="You have no pending homework. Great work."
              />
            ) : (
              <div className="space-y-2">
                {upcoming.map((h, i) => {
                  const subject = getSubjectById(subjects, h.subjectId);
                  const due = daysUntil(h.dueDate);
                  return (
                    <motion.div
                      key={h.id}
                      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.04 }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-bg-surface"
                    >
                      <div
                        className="w-1 h-10 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            subject?.color ?? "rgb(var(--fg-subtle))",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-brand-600/85 font-medium truncate">
                          {h.title}
                        </p>
                        <SubjectPill
                          subject={subject}
                          className="text-purple-500 mt-0.5"
                        />
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`text-xs font-medium ${due < 0 ? "text-danger" : due <= 1 ? "text-warning" : "text-fg-muted"}`}
                        >
                          {relativeDue(h.dueDate)}
                        </p>
                        <Badge
                          variant={
                            h.priority === "high"
                              ? "danger"
                              : h.priority === "medium"
                                ? "warning"
                                : "success"
                          }
                          className="mt-1 capitalize"
                        >
                          {h.priority}
                        </Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Revision Due */}
        <Card delay={0.3}>
          <div className="p-5 border-b border-border-default flex items-center justify-between">
            <h3 className="font-titles text-bg-surface">Revision Due</h3>
            <button
              onClick={() => goTo?.("revision")}
              className="text-xs text-brand-500 hover:underline"
            >
              View
            </button>
          </div>
          <div className="p-5">
            {todayRevisions.length === 0 ? (
              <p className="text-sm text-bg-surface text-center py-4">
                Nothing to revise today.
              </p>
            ) : (
              <div className="space-y-2">
                {todayRevisions.map((r, i) => {
                  const subject = getSubjectById(subjects, r.subjectId);
                  return (
                    <motion.div
                      key={r.id}
                      initial={reducedMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.04 }}
                      className="p-2.5 bg-border-default/50 rounded-lg px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-brand-500/85 font-medium truncate">
                          {r.title}
                        </p>
                        <SubjectPill
                          subject={subject}
                          className="text-[10px] text-purple-500"
                        />
                      </div>
                      <span className="text-xs text-bg-surface shrink-0">
                        {r.confidence}%
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Goals + To-Do strip */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Active Goals */}
        <Card delay={0.35}>
          <div className="p-5 border-b border-border-default flex items-center justify-between">
            <h3 className="font-titles text-bg-surface">Active Goals</h3>
            <button
              onClick={() => goTo?.("goals")}
              className="text-xs text-brand-500 hover:underline flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-5">
            {data.goals.filter((g) => !g.completed).length === 0 ? (
              <EmptyState
                icon={<Target className="w-7 h-7" />}
                title="No active goals"
                description="Set your first goal to start tracking progress."
                action={
                  <button
                    onClick={() => goTo?.("goals")}
                    className="px-4 h-10 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
                  >
                    Add a goal
                  </button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.goals
                  .filter((g) => !g.completed)
                  .slice(0, 4)
                  .map((g, i) => (
                    <motion.div
                      key={g.id}
                      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 + i * 0.05 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-brand-500" />
                        <p className="text-sm text-bg-surface font-medium truncate flex-1">
                          {g.title}
                        </p>
                      </div>
                      <Progress
                        value={(g.current / g.target) * 100}
                        size="sm"
                      />
                      <p className="text-xs text-bg-surface mt-1.5">
                        {g.current} / {g.target} {g.unit}
                      </p>
                    </motion.div>
                  ))}
              </div>
            )}
          </div>
        </Card>

        {/* To-Do */}
        <Card delay={0.4}>
          <div className="p-5 border-b border-border-default flex items-center justify-between">
            <h3 className="font-titles text-bg-surface">To-Do</h3>
            <button
              onClick={() => goTo?.("todo")}
              className="text-xs text-brand-500 hover:underline"
            >
              View
            </button>
          </div>
          <div className="p-5">
            {data.todos.length === 0 ? (
              <p className="text-sm text-bg-surface text-center py-4">
                No tasks yet.
              </p>
            ) : (
              <div className="space-y-2">
                {data.todos.slice(0, 2).map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={reducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + i * 0.04 }}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-bg-muted"
                  >
                    <Checkbox
                      id={`dash-todo-${t.id}`}
                      variant="success"
                      size="sm"
                      checked={t.completed}
                      onCheckedChange={() => toggleTodo(t.id)}
                      className="shrink-0 text-white"
                      aria-label={
                        t.completed
                          ? `Mark "${t.title}" as not done`
                          : `Mark "${t.title}" as done`
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <PlayfulStrike
                        checked={t.completed}
                        htmlFor={`dash-todo-${t.id}`}
                        textClassName="text-sm text-brand-500/85 font-medium"
                      >
                        {t.title}
                      </PlayfulStrike>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
