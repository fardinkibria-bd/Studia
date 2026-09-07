export type ID = string;

export type Priority = 'low' | 'medium' | 'high';
export type HomeworkStatus = 'not_started' | 'in_progress' | 'completed';

export interface Subject {
  id: ID;
  name: string;
  color: string;
  teacher?: string;
}

export interface RoutineItem {
  id: ID;
  title: string;
  subjectId: ID | null;
  startTime: string;
  endTime: string;
  day: number;
  isBreak: boolean;
  completed: boolean;
  order: number;
  isStatic?: boolean;
  lastUpdatedDate?: string;
}

export interface Homework {
  id: ID;
  title: string;
  subjectId: ID | null;
  description: string;
  dueDate: string;
  priority: Priority;
  status: HomeworkStatus;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Todo {
  id: ID;
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  completed: boolean;
  createdAt: string;
}

export interface RevisionTopic {
  id: ID;
  title: string;
  subjectId: ID | null;
  scheduledDate: string;
  confidence: number;
  completed: boolean;
  inProgress?: boolean;
  notes?: string;
}

export interface Exam {
  id: ID;
  title: string;
  subjectId: ID | null;
  date: string;
  time: string;
  location?: string;
  notes?: string;
  completed?: boolean;
  marks?: number;
}

export interface StudySession {
  id: ID;
  subjectId: ID | null;
  taskId?: ID | null;
  date: string;
  duration: number;
  type: 'focus' | 'break';
}

export interface CalendarEvent {
  id: ID;
  title: string;
  date: string;
  time?: string;
  subjectId: ID | null;
  location?: string;
  notes?: string;
}

export interface Goal {
  id: ID;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  deadline: string;
  category: 'study_time' | 'homework' | 'revision' | 'streak' | 'custom';
  completed: boolean;
}

export interface Achievement {
  id: ID;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface Settings {
  theme: 'light' | 'dark';
  reducedMotion: boolean;
  weeklyGoalHours: number;
  pomodoroFocus: number;
  pomodoroBreak: number;
}

export interface AppData {
  subjects: Subject[];
  routines: RoutineItem[];
  homework: Homework[];
  todos: Todo[];
  revisions: RevisionTopic[];
  exams: Exam[];
  sessions: StudySession[];
  goals: Goal[];
  achievements: Achievement[];
  calendarEvents: CalendarEvent[];
  settings: Settings;
  streak: { count: number; lastStudyDate: string };
}
