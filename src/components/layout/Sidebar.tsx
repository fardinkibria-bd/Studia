import { motion } from "framer-motion";
import { ChevronLeft, Flame } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { useTheme } from "@/store/ThemeContext";
import { useStore } from "@/store/StoreContext";
import { activeStreak } from "@/lib/utils";

interface SidebarProps {
  current: string;
  onNavigate: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  current,
  onNavigate,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const { reducedMotion } = useTheme();
  const { data } = useStore();

  return (
    <aside
      className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-30 sidebar-surface border-r sidebar-divider transition-all duration-300 overflow-hidden ${
        collapsed ? "w-[72px]" : "w-64"
      }`}
    >
      <div className="h-16 flex items-center justify-between px-4 dark:border-b dark:border-border-default">
        <button
          onClick={collapsed ? onToggleCollapse : undefined}
          className={`flex items-center gap-2.5 overflow-hidden ${collapsed ? "cursor-pointer hover:opacity-80 transition-opacity" : "cursor-default"}`}
        >
          <img
            src={`${import.meta.env.BASE_URL}logo.jpg`}
            alt="Studia"
            className="w-9 h-9 rounded-xl object-cover shrink-0 shadow-glow"
          />
          {!collapsed && (
            <motion.span
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-brand font-bold text-3xl text-info dark:text-fg whitespace-nowrap"
            >
              Studia
            </motion.span>
          )}
        </button>
        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            className="text-bg-surface hover:text-green-300 transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="font-titles text-xs flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        {NAV_ITEMS.map((item) => {
          const active = current === item.id;
          const button = (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "text-brand-500 border border-bg-surface dark:text-fg dark:bg-bg-muted/20 sidebar-paper-active"
                  : "text-bg-surface dark:text-fg-subtle hover:text-brand-500 hover:border hover:border-bg-surface"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 dark:bg-brand-500/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              <item.icon
                className={`w-5 h-5 shrink-0 relative ${active ? "text-purple-500/80 dark:text-brand-500" : "text-green-700 dark:text-brand-500/60"}`}
              />
              {!collapsed && (
                <span className="relative whitespace-nowrap">{item.label}</span>
              )}
            </button>
          );
          return button;
        })}
      </nav>

      <div className="p-3">
        <div
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-green-700 dark:bg-bg-muted ${collapsed ? "justify-center" : ""}`}
        >
          <Flame className="w-5 h-5 text-warning shrink-0" />
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-xs font-greeting text-fg-subtle">Current streak</p>
              <p className="text-sm font-semibold text-fg">
                {activeStreak(data.streak)} days
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
