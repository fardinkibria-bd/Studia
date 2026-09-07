import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  RefreshCw,
  CalendarRange,
  Timer,
  BarChart3,
  Target,
  Settings,
  ClipboardList,
  ListTodo,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'homework', label: 'Homework', icon: BookOpen },
  { id: 'todo', label: 'To-Do', icon: ListTodo },
  { id: 'revision', label: 'Revision', icon: RefreshCw },
  { id: 'exams', label: 'Exams', icon: ClipboardList },
  { id: 'calendar', label: 'Calendar', icon: CalendarRange },
  { id: 'focus', label: 'Focus', icon: Timer },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'settings', label: 'Settings', icon: Settings },
];
