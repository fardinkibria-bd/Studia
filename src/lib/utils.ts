import type { RoutineItem, Homework, Subject, StudySession } from '@/types';

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Format a Date as a local YYYY-MM-DD string (no UTC conversion). */
export function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toLocalISO(new Date());
}

export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateLong(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function daysUntil(iso: string): number {
  const target = new Date(iso + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

/** Returns the current streak count, or 0 if a day was missed (streak lost). */
export function activeStreak(streak: { count: number; lastStudyDate: string }): number {
  if (!streak.lastStudyDate) return 0;
  const missed = daysUntil(streak.lastStudyDate);
  // Streak is alive if the last study was today (0) or yesterday (-1).
  return missed >= -1 ? streak.count : 0;
}

/**
 * Derive the current study streak from the source-of-truth session list.
 *
 * A "study day" is a unique local calendar date (YYYY-MM-DD) containing at
 * least one 'focus' study session — multiple sessions on the same date still
 * count as exactly one day. The current streak is the number of consecutive
 * study days ending on the most recent study date, counting backward one
 * calendar day at a time until the first missing date.
 *
 * The streak is always recomputed from the actual sessions rather than
 * maintained with manual +1/-1 updates, so deletions (which can remove a date
 * or split a run), re-creations, and edits can never leave a stale value.
 * Because session dates are already stored as local calendar dates (via
 * toLocalISO/todayISO), this uses the application's existing date rules and
 * needs no additional timezone conversion.
 */
export function computeStudyStreak(
  sessions: Pick<StudySession, 'date' | 'type'>[],
): { count: number; lastStudyDate: string } {
  const studyDays = new Set<string>();
  for (const s of sessions) {
    if (s && s.type === 'focus' && typeof s.date === 'string' && s.date.length > 0) {
      studyDays.add(s.date);
    }
  }
  if (studyDays.size === 0) return { count: 0, lastStudyDate: '' };

  // ISO "YYYY-MM-DD" strings sort lexicographically == chronologically.
  const lastStudyDate = [...studyDays].sort().pop()!;

  let cursor = lastStudyDate;
  let count = 0;
  while (studyDays.has(cursor)) {
    count += 1;
    // Move backward one local calendar day at a time (DST-safe, no UTC involved).
    const [y, m, d] = cursor.split('-').map(Number);
    cursor = toLocalISO(new Date(y, m - 1, d - 1));
  }
  return { count, lastStudyDate };
}

export function relativeDue(iso: string): string {
  const n = daysUntil(iso);
  if (n < 0) return `${Math.abs(n)}d overdue`;
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n <= 7) return `In ${n} days`;
  return formatDate(iso);
}

export function getTodayDayIndex(): number {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function durationLabel(start: string, end: string): string {
  const mins = timeToMinutes(end) - timeToMinutes(start);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function getSubjectById(subjects: Subject[], id: string | null) {
  if (!id) return null;
  return subjects.find((s) => s.id === id) ?? null;
}

export function priorityColor(p: string): string {
  switch (p) {
    case 'high': return 'text-danger bg-danger/10 border-danger/20';
    case 'medium': return 'text-warning bg-warning/10 border-warning/20';
    case 'low': return 'text-success bg-success/10 border-success/20';
    default: return 'text-fg-muted bg-bg-muted border-border';
  }
}

export function statusColor(s: string): string {
  switch (s) {
    case 'completed': return 'text-success bg-success/10 border-success/20';
    case 'in_progress': return 'text-info bg-info/10 border-info/20';
    case 'not_started': return 'text-fg-muted bg-bg-muted border-border';
    default: return 'text-fg-muted bg-bg-muted border-border';
  }
}

export function priorityRank(p: string): number {
  return p === 'high' ? 0 : p === 'medium' ? 1 : 2;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export function getTodayRoutine(routines: RoutineItem[]): RoutineItem[] {
  const day = getTodayDayIndex();
  return routines
    .filter((r) => r.day === day)
    .sort((a, b) => a.order - b.order);
}

export function getUpcomingHomework(homework: Homework[], limit = 5): Homework[] {
  return homework
    .filter((h) => h.status !== 'completed')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, limit);
}

export function completionRate(items: { completed?: boolean; status?: string }[]): number {
  if (!items.length) return 0;
  const done = items.filter((i) => i.completed || i.status === 'completed').length;
  return Math.round((done / items.length) * 100);
}

export function resetStaticRoutines(routines: RoutineItem[]): RoutineItem[] {
  const today = toLocalISO(new Date());
  return routines.map((r) => {
    if (r.isStatic && r.lastUpdatedDate !== today) {
      return { ...r, completed: false, lastUpdatedDate: today };
    }
    if (!r.isStatic && !r.lastUpdatedDate) {
      return { ...r, lastUpdatedDate: today };
    }
    return r;
  });
}
