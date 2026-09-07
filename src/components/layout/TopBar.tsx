import { motion } from 'framer-motion';
import { Sun, Moon, ChevronLeft } from 'lucide-react';
import { useTheme } from '@/store/ThemeContext';
import { useStore } from '@/store/StoreContext';
import { NAV_ITEMS } from '@/lib/nav';
import { activeStreak } from '@/lib/utils';

interface TopBarProps {
  current: string;
  onOpenMobileNav: () => void;
  onBack?: () => void;
}

export function TopBar({ current, onOpenMobileNav, onBack }: TopBarProps) {
  const { theme, toggle, reducedMotion } = useTheme();
  const { data } = useStore();
  const navItem = NAV_ITEMS.find((n) => n.id === current);

  return (
    <header className="h-16 sticky top-0 z-20 glass border-b border-border-default flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button onClick={onBack} className="lg:hidden text-fg-muted hover:text-fg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={onOpenMobileNav}
            className="lg:hidden flex items-center gap-2 text-fg-muted hover:text-fg transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Studia" className="w-9 h-9 rounded-xl object-cover shrink-0 shadow-glow" />
            <span className="font-bold text-lg text-fg">Studia</span>
          </button>
        )}
        <div className="hidden lg:flex items-center gap-2">
          {navItem && <navItem.icon className="w-5 h-5 text-brand-500" />}
          <h1 className="font-semibold text-fg text-lg">{navItem?.label ?? 'Studia'}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-warning/10 border border-warning/20">
          <span className="text-warning text-sm font-semibold">{activeStreak(data.streak)}</span>
          <span className="text-warning text-sm">🔥</span>
        </div>

        <button
          onClick={toggle}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-fg-muted hover:text-fg hover:bg-bg-muted transition-colors"
          aria-label="Toggle theme"
        >
          <motion.div key={theme} initial={reducedMotion ? false : { rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.2 }}>
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </motion.div>
        </button>
      </div>
    </header>
  );
}
