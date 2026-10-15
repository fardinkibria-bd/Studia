import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { useTheme } from "@/store/ThemeContext";
import { useStore } from "@/store/StoreContext";
import { activeStreak } from "@/lib/utils";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  current: string;
  onNavigate: (id: string) => void;
}

export function MobileNav({
  open,
  onClose,
  onOpen,
  current,
  onNavigate,
}: MobileNavProps) {
  const { reducedMotion } = useTheme();
  const { data } = useStore();

  const main = NAV_ITEMS.filter((n) =>
    [
      "dashboard",
      "schedule",
      "homework",
      "exams",
      "calendar",
    ].includes(n.id),
  );

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { x: "-100%" }}
            animate={{ x: 0, opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { x: "-100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-bg-base border-r border-border-default flex flex-col lg:hidden"
          >
            <div className="h-16 flex items-center justify-between px-4 border-b border-border-default">
              <div className="flex items-center gap-2.5">
                <img
                  src={`${import.meta.env.BASE_URL}logo.jpg`}
                  alt="Studia"
                  className="w-9 h-9 rounded-xl object-cover"
                />
                <span className="font-brand font-bold text-2xl text-info">
                  Studia
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-bg-surface hover:text-fg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="font-titles flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const active = current === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      onClose();
                    }}
                    className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? "text-brand-500 border border-bg-surface sidebar-paper-active"
                        : "text-bg-surface hover:text-fg hover:bg-bg-muted"
                    }`}
                  >
                    <item.icon
                      className={`w-5 h-5 shrink-0 ${active ? "text-purple-500/80 dark:text-brand-500" : "text-green-700 dark:text-brand-500/60"}`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-3 border-t border-border-default">
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-green-700">
                <span className="text-warning">🔥</span>
                <div>
                  <p className="text-xs font-greeting text-fg-subtle">Current streak</p>
                  <p className="text-sm font-semibold text-fg">
                    {activeStreak(data.streak)} days
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom nav — mobile only */}
      <nav className="font-titles text-xs fixed bottom-0 left-0 right-0 z-30 glass bg-bg-base border-t-2 border-bg-surface flex items-center justify-around px-2 h-16 lg:hidden">
        {main.map((item) => {
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[44px] min-h-[44px] justify-center ${
                active
                  ? "text-brand-500 border border-bg-surface sidebar-paper-active"
                  : " "
              }`}
            >
              <item.icon
                className={`w-5 h-5 shrink-0 relative ${active ? "text-purple-500/80 dark:text-brand-500" : "text-green-600/70 dark:text-brand-500/60"}`}
              />
              <span
                className={`text-[10px] font-medium ${active ? "text-brand-500 dark:text-brand-500" : "text-bg-surface dark:text-brand-500/60"}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={onOpen}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-bg-surface min-w-[44px] min-h-[44px] justify-center"
          aria-label="More"
        >
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full bg-current" />
            <div className="w-1 h-1 rounded-full bg-current" />
            <div className="w-1 h-1 rounded-full bg-current" />
          </div>
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
    </>
  );
}
