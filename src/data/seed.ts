import type { AppData } from '@/types';

export const SUBJECT_COLORS = [
  'rgb(14 165 233)',
  'rgb(168 85 247)',
  'rgb(236 72 153)',
  'rgb(244 63 94)',
  'rgb(249 115 22)',
  'rgb(234 179 8)',
  'rgb(16 185 129)',
  'rgb(20 184 166)',
  'rgb(6 182 212)',
  'rgb(99 102 241)',
];

export const EMPTY_DATA: AppData = {
  subjects: [],
  routines: [],
  homework: [],
  todos: [],
  revisions: [],
  exams: [],
  sessions: [],
  goals: [],
  achievements: [],
  calendarEvents: [],
  settings: {
    theme: 'dark',
    reducedMotion: false,
    weeklyGoalHours: 20,
    pomodoroFocus: 25,
    pomodoroBreak: 5,
  },
  streak: { count: 0, lastStudyDate: '' },
};