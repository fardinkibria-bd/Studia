import { motion } from 'framer-motion';
import { ChevronLeft, Flame } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/nav';
import { useTheme } from '@/store/ThemeContext';
import { useStore } from '@/store/StoreContext';
import { activeStreak } from '@/lib/utils';

interface SidebarProps {
  current: string;
  onNavigate: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ current, onNavigate, collapsed, onToggleCollapse }: SidebarProps) {
  const { reducedMotion } = useTheme();
  const { data } = useStore();

  return (
    <aside
      className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-30 bg-bg-surface border-r border-border-default transition-all duration-300 overflow-hidden ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-border-default">
        <button
          onClick={collapsed ? onToggleCollapse : undefined}
          className={`flex items-center gap-2.5 overflow-hidden ${collapsed ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
        >
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Studia" className="w-9 h-9 rounded-xl object-cover shrink-0 shadow-glow" />
          {!collapsed && (
            <motion.span
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold text-lg text-fg whitespace-nowrap"
            >
              Studia
            </motion.span>
          )}
        </button>
        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            className="text-fg-subtle hover:text-fg transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = current === item.id;
          const button = (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active ? 'text-fg' : 'text-fg-muted hover:text-fg hover:bg-bg-muted'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-brand-500/10 rounded-xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <item.icon className={`w-5 h-5 shrink-0 relative ${active ? 'text-brand-500' : ''}`} />
              {!collapsed && <span className="relative whitespace-nowrap">{item.label}</span>}
            </button>
          );
          return button;
        })}
      </nav>

      <div className="p-3 border-t border-border-default">
        <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-bg-muted ${collapsed ? 'justify-center' : ''}`}>
          <Flame className="w-5 h-5 text-warning shrink-0" />
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-xs text-fg-subtle">Current streak</p>
              <p className="text-sm font-semibold text-fg">{activeStreak(data.streak)} days</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
