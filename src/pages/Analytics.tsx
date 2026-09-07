import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Clock, Target, Flame } from "lucide-react";
import { useStore } from "@/store/StoreContext";
import { useTheme } from "@/store/ThemeContext";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { DAYS, completionRate, toLocalISO, activeStreak } from "@/lib/utils";

type Range = "daily" | "weekly" | "monthly";

export default function Analytics() {
  const { data } = useStore();
  const { theme, reducedMotion } = useTheme();
  const [range, setRange] = useState<Range>("weekly");

  const isDark = theme === "dark";
  const gridColor = isDark ? "rgba(148,163,184,0.1)" : "rgba(148,163,184,0.15)";
  const axisColor = isDark ? "#64748b" : "#94a3b8";
  const tooltipBg = isDark ? "rgb(23 28 41)" : "rgb(255 255 255)";
  const tooltipBorder = isDark ? "rgb(36 43 61)" : "rgb(226 232 240)";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        className="rounded-lg shadow-float px-3 py-2 text-xs border"
        style={{ background: tooltipBg, borderColor: tooltipBorder }}
      >
        <p className="font-medium text-fg mb-1">{label}</p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((p: any, i: number) => (
          <p
            key={i}
            style={{ color: p.color || p.fill }}
            className="font-medium"
          >
            {p.name}: {p.value}
            {p.unit || ""}
          </p>
        ))}
      </div>
    );
  };

  // Study time data
  const studyData = useMemo(() => {
    if (range === "daily") {
      return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const iso = toLocalISO(d);
        const mins = data.sessions
          .filter((s) => s.date === iso && s.type === "focus")
          .reduce((sum, s) => sum + s.duration, 0);
        return {
          label: DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1],
          minutes: mins,
          hours: +(mins / 60).toFixed(1),
        };
      });
    }
    if (range === "weekly") {
      // 8 contiguous weekly buckets: W8 is the current week (ends today),
      // W1 is 7 weeks back. Previously the offset formula produced future
      // weeks, so most buckets always rendered zero minutes.
      return Array.from({ length: 8 }).map((_, i) => {
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - (7 - i) * 7);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);
        const startIso = toLocalISO(weekStart);
        const endIso = toLocalISO(weekEnd);
        const mins = data.sessions
          .filter(
            (s) => s.date >= startIso && s.date <= endIso && s.type === "focus",
          )
          .reduce((sum, s) => sum + s.duration, 0);
        return {
          label: `W${i + 1}`,
          minutes: mins,
          hours: +(mins / 60).toFixed(1),
        };
      });
    }
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const monthStart = toLocalISO(
        new Date(d.getFullYear(), d.getMonth(), 1),
      );
      const monthEnd = toLocalISO(
        new Date(d.getFullYear(), d.getMonth() + 1, 0),
      );
      const mins = data.sessions
        .filter(
          (s) =>
            s.date >= monthStart && s.date <= monthEnd && s.type === "focus",
        )
        .reduce((sum, s) => sum + s.duration, 0);
      return {
        label: d.toLocaleDateString("en-US", { month: "short" }),
        minutes: mins,
        hours: +(mins / 60).toFixed(1),
      };
    });
  }, [data.sessions, range]);

  // Subject distribution
  const subjectData = useMemo(() => {
    return data.subjects
      .map((s) => {
        const mins = data.sessions
          .filter((sess) => sess.subjectId === s.id && sess.type === "focus")
          .reduce((sum, sess) => sum + sess.duration, 0);
        return { name: s.name, value: mins, color: s.color };
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data.sessions, data.subjects]);

  // Homework completion trend
  const homeworkTrend = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const iso = toLocalISO(d);
      const created = data.homework.filter((h) => h.createdAt <= iso).length;
      const completed = data.homework.filter(
        (h) => h.status === "completed" && h.completedAt === iso,
      ).length;
      return {
        label: DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1],
        completed,
        total: created,
      };
    });
  }, [data.homework]);

  // Subject performance
  const subjectPerformance = useMemo(() => {
    return data.subjects
      .map((s) => {
        const hw = data.homework.filter((h) => h.subjectId === s.id);
        const rv = data.revisions.filter((r) => r.subjectId === s.id);
        const hwRate = hw.length
          ? (hw.filter((h) => h.status === "completed").length / hw.length) *
            100
          : 0;
        const rvRate = rv.length
          ? (rv.filter((r) => r.completed).length / rv.length) * 100
          : 0;
        const avgConfidence = rv.length
          ? rv.reduce((sum, r) => sum + r.confidence, 0) / rv.length
          : 0;
        return {
          name: s.name,
          color: s.color,
          performance: Math.round((hwRate + rvRate) / 2),
          confidence: Math.round(avgConfidence),
        };
      })
      .filter((s) => s.performance > 0 || s.confidence > 0);
  }, [data.subjects, data.homework, data.revisions]);

  const totalMinutes = data.sessions
    .filter((s) => s.type === "focus")
    .reduce((sum, s) => sum + s.duration, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const avgPerDay = (totalMinutes / 14 / 60).toFixed(1);
  const hwCompletion = completionRate(data.homework);

  const stats = [
    {
      label: "Total Study Time",
      value: `${totalHours}h`,
      icon: Clock,
      color: "text-brand-500",
      bg: "bg-brand-500/10",
    },
    {
      label: "Avg / Day (2wk)",
      value: `${avgPerDay}h`,
      icon: TrendingUp,
      color: "text-info",
      bg: "bg-info/10",
    },
    {
      label: "Homework Done",
      value: `${hwCompletion}%`,
      icon: Target,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Streak",
      value: `${activeStreak(data.streak)}d`,
      icon: Flame,
      color: "text-warning",
      bg: "bg-warning/10",
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">
          Analytics
        </h2>
        <p className="text-fg-muted text-sm mt-1">
          Understand your patterns. Study smarter.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {stats.map((s, i) => (
          <Card key={s.label} delay={i * 0.05} hover>
            <div className="p-4 flex items-start justify-between">
              <div>
                <p className="text-xs text-fg-subtle">{s.label}</p>
                <p className="text-xl lg:text-2xl font-bold mt-1">{s.value}</p>
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

      {/* Study time chart */}
      <Card>
        <div className="p-5 border-b border-border-default flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="font-semibold">Study Time</h3>
          <div className="inline-flex p-1 bg-bg-muted rounded-xl gap-1 self-start">
            {(["daily", "weekly", "monthly"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${range === r ? "bg-bg-surface shadow-soft text-fg" : "text-fg-muted hover:text-fg"}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={studyData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="studyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="rgb(var(--brand-500))"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="rgb(var(--brand-500))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="label"
                stroke={axisColor}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={axisColor}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="minutes"
                name="Minutes"
                stroke="rgb(var(--brand-500))"
                strokeWidth={2.5}
                fill="url(#studyGradient)"
                animationDuration={reducedMotion ? 0 : 600}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Subject distribution */}
        <Card delay={0.05}>
          <div className="p-5 border-b border-border-default">
            <h3 className="font-semibold">Time by Subject</h3>
          </div>
          <div className="p-5">
            {subjectData.length === 0 ? (
              <p className="text-sm text-fg-subtle text-center py-8">
                No study sessions yet.
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={subjectData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      animationDuration={reducedMotion ? 0 : 600}
                    >
                      {subjectData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 w-full">
                  {subjectData.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="flex-1 text-fg-muted truncate">
                        {s.name}
                      </span>
                      <span className="font-medium">
                        {(s.value / 60).toFixed(1)}h
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Homework trend */}
        <Card delay={0.1}>
          <div className="p-5 border-b border-border-default">
            <h3 className="font-semibold">Homework Completion</h3>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={homeworkTrend}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="label"
                  stroke={axisColor}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={axisColor}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "rgb(var(--brand-500) / 0.05)" }}
                />
                <Bar
                  dataKey="total"
                  name="Assigned"
                  fill="rgb(var(--fg-subtle))"
                  radius={[4, 4, 0, 0]}
                  animationDuration={reducedMotion ? 0 : 600}
                />
                <Bar
                  dataKey="completed"
                  name="Completed"
                  fill="rgb(var(--success))"
                  radius={[4, 4, 0, 0]}
                  animationDuration={reducedMotion ? 0 : 600}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Subject performance */}
      <Card delay={0.15}>
        <div className="p-5 border-b border-border-default">
          <h3 className="font-semibold">Subject Performance</h3>
        </div>
        <div className="p-5">
          {subjectPerformance.length === 0 ? (
            <p className="text-sm text-fg-subtle text-center py-8">
              No performance data yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subjectPerformance.map((s, i) => (
                <motion.div
                  key={s.name}
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 rounded-xl bg-bg-muted/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-sm font-medium">{s.name}</span>
                    </div>
                    <span className="text-sm font-bold">{s.performance}%</span>
                  </div>
                  <Progress value={s.performance} size="sm" color="" />
                  <div className="flex justify-between mt-2 text-xs text-fg-subtle">
                    <span>Confidence: {s.confidence}%</span>
                    <span>
                      {s.performance >= 80
                        ? "Excellent"
                        : s.performance >= 50
                          ? "On track"
                          : "Needs work"}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Productivity pattern */}
      <Card delay={0.2}>
        <div className="p-5 border-b border-border-default">
          <h3 className="font-semibold">Productivity Pattern</h3>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={studyData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="label"
                stroke={axisColor}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={axisColor}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="minutes"
                name="Minutes"
                stroke="rgb(var(--accent-500))"
                strokeWidth={2.5}
                dot={{ fill: "rgb(var(--accent-500))", r: 4 }}
                animationDuration={reducedMotion ? 0 : 600}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
