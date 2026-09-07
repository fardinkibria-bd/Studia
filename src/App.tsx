import { Suspense, lazy, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { StoreProvider, useStore } from '@/store/StoreContext';
import { ThemeProvider, useTheme } from '@/store/ThemeContext';
import { ToastProvider } from '@/store/ToastContext';
import { AlarmProvider } from '@/store/AlarmContext';
import { SoundProvider } from '@/store/SoundContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';

const Landing = lazy(() => import('@/pages/Landing'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Schedule = lazy(() => import('@/pages/Schedule'));
const Homework = lazy(() => import('@/pages/Homework'));
const Todo = lazy(() => import('@/pages/Todo'));
const Revision = lazy(() => import('@/pages/Revision'));
const Exams = lazy(() => import('@/pages/Exams'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const Focus = lazy(() => import('@/pages/Focus'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Goals = lazy(() => import('@/pages/Goals'));
const Settings = lazy(() => import('@/pages/Settings'));

function PageLoader() {
  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="skeleton h-8 w-48 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="card-base p-5 space-y-3"><div className="skeleton h-4 w-1/3" /><div className="skeleton h-8 w-2/3" /><div className="skeleton h-2 w-full" /></div>)}
      </div>
    </div>
  );
}

const ONBOARDED_KEY = 'studia:onboarded';

function AppShell() {
  const [page, setPage] = useState<string>(() => {
    const hash = window.location.hash.slice(1);
    if (hash) return hash;
    // Show landing only on the very first visit
    try {
      if (localStorage.getItem(ONBOARDED_KEY)) return 'dashboard';
    } catch { /* ignore */ }
    return 'landing';
  });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { loading } = useStore();
  const { reducedMotion } = useTheme();

  useEffect(() => {
    window.location.hash = page;
  }, [page]);

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        setPage(hash);
      } else {
        // If hash is empty, go to dashboard if onboarded, else landing
        try {
          setPage(localStorage.getItem(ONBOARDED_KEY) ? 'dashboard' : 'landing');
        } catch {
          setPage('landing');
        }
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (id: string) => {
    setPage(id);
    window.scrollTo(0, 0);
    // Mark onboarding as complete once the user enters the app
    try {
      localStorage.setItem(ONBOARDED_KEY, 'true');
    } catch { /* ignore */ }
  };

  if (page === 'landing') {
    return (
      <Suspense fallback={<PageLoader />}>
        <Landing onEnter={() => navigate('dashboard')} />
      </Suspense>
    );
  }

  const pages: Record<string, React.LazyExoticComponent<React.ComponentType<{ onNavigate?: (page: string) => void }>>> = {
    dashboard: Dashboard,
    schedule: Schedule,
    homework: Homework,
    todo: Todo,
    revision: Revision,
    exams: Exams,
    calendar: Calendar,
    focus: Focus,
    analytics: Analytics,
    goals: Goals,
    settings: Settings,
  };

  const CurrentPage = pages[page] ?? Dashboard;

  return (
    <div className="min-h-screen bg-bg-base">
      <Sidebar current={page} onNavigate={navigate} collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} onOpen={() => setMobileNavOpen(true)} current={page} onNavigate={navigate} />
      <div className={`transition-all duration-300 ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
        <TopBar current={page} onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="pb-20 lg:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={reducedMotion || loading ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <Suspense fallback={<PageLoader />}>
                <CurrentPage onNavigate={navigate} />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <StoreProvider>
        <AlarmProvider>
          <SoundProvider>
            <ToastProvider>
              <AppShell />
            </ToastProvider>
          </SoundProvider>
        </AlarmProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}
