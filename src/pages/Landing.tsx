import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight, CalendarDays, BookOpen, BarChart3, Timer,
  Target, RefreshCw, Sparkles, Check, Zap, Moon, Sun,
} from 'lucide-react';
import { useRef } from 'react';
import { useTheme } from '@/store/ThemeContext';
import { Button } from '@/components/ui/Button';

interface LandingProps {
  onEnter: () => void;
}

const features = [
  { icon: CalendarDays, title: 'Smart Scheduling', desc: 'Build daily routines with drag-and-drop ease. Assign subjects, set durations, and track breaks.' },
  { icon: BookOpen, title: 'Homework Manager', desc: 'Never miss a deadline. Filter, sort, and prioritize assignments with clear visual indicators.' },
  { icon: RefreshCw, title: 'Revision Tracker', desc: 'Schedule revisions, track confidence levels, and watch your progress build over time.' },
  { icon: BarChart3, title: 'Deep Analytics', desc: 'Beautiful interactive charts reveal your study patterns, productivity trends, and subject performance.' },
  { icon: Timer, title: 'Focus Mode', desc: 'A distraction-free timer with Pomodoro support helps you build deep study habits.' },
  { icon: Target, title: 'Goals & Streaks', desc: 'Set academic goals, maintain study streaks, and unlock achievements that keep you motivated.' },
];

export default function Landing({ onEnter }: LandingProps) {
  const { theme, toggle, reducedMotion } = useTheme();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const previewY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const previewScale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);

  return (
    <div className="min-h-screen bg-bg-base text-fg overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border-default">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Studia" className="w-9 h-9 rounded-xl object-cover shadow-glow" />
            <span className="font-bold text-lg">Studia</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-fg-muted">
            <a href="#features" className="hover:text-fg transition-colors">Features</a>
            <a href="#preview" className="hover:text-fg transition-colors">Preview</a>
            <a href="#workflow" className="hover:text-fg transition-colors">Workflow</a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="w-10 h-10 rounded-lg flex items-center justify-center text-fg-muted hover:text-fg hover:bg-bg-muted transition-colors" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Button size="sm" onClick={onEnter}>Open App <ArrowRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 grid-pattern opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-accent-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative max-w-7xl mx-auto text-center">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-sm font-medium mb-6"
          >
            <Sparkles className="w-4 h-4" />
            The next-gen study planner
          </motion.div>

          <motion.h1
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.1]"
          >
            Plan smarter.<br />
            <span className="gradient-text">Study better.</span>
          </motion.h1>

          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 text-lg text-fg-muted max-w-2xl mx-auto leading-relaxed"
          >
            Organize your entire academic life in one beautiful place. Routines, homework, revision,
            exams, focus sessions, and analytics — designed to keep you consistent and motivated.
          </motion.p>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button size="lg" onClick={onEnter}>
              Get Started — It's Free <ArrowRight className="w-5 h-5" />
            </Button>
            <Button size="lg" variant="secondary" onClick={() => document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' })}>
              See it in action
            </Button>
          </motion.div>

          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-fg-subtle">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-success" /> No setup required</span>
            <span className="hidden sm:flex items-center gap-1.5"><Zap className="w-4 h-4 text-warning" /> Works offline</span>
          </div>
        </div>

        {/* Interactive dashboard preview */}
        <motion.div
          id="preview"
          style={{ y: previewY, scale: previewScale }}
          className="relative max-w-5xl mx-auto mt-16"
        >
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-brand-500/20 to-accent-500/20 rounded-3xl blur-2xl" />
            <div className="relative glass-strong rounded-2xl shadow-float overflow-hidden">
              <div className="h-9 bg-bg-muted/50 border-b border-border-default flex items-center gap-2 px-4">
                <div className="w-3 h-3 rounded-full bg-danger/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
              </div>
              <div className="p-4 sm:p-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Today', value: '4 tasks', icon: CalendarDays, color: 'text-brand-500' },
                  { label: 'Streak', value: '5 days', icon: Zap, color: 'text-warning' },
                  { label: 'Progress', value: '68%', icon: Target, color: 'text-success' },
                  { label: 'Focus', value: '2h 15m', icon: Timer, color: 'text-info' },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="card-base p-3 sm:p-4"
                  >
                    <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                    <p className="text-xs text-fg-subtle">{stat.label}</p>
                    <p className="text-base sm:text-lg font-semibold">{stat.value}</p>
                  </motion.div>
                ))}
                <div className="col-span-2 md:col-span-3 card-base p-4">
                  <p className="text-xs text-fg-subtle mb-3">Weekly Study Time</p>
                  <div className="flex items-end gap-1.5 h-24">
                    {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={reducedMotion ? false : { height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 0.6 + i * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
                        className="flex-1 rounded-t bg-gradient-to-t from-brand-500/60 to-brand-500 min-h-[4px]"
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-fg-subtle">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
                  </div>
                </div>
                <div className="card-base p-4 flex flex-col items-center justify-center">
                  <p className="text-xs text-fg-subtle mb-2">Completion</p>
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90">
                      <circle cx="32" cy="32" r="28" fill="none" strokeWidth="6" className="stroke-bg-muted" />
                      <motion.circle
                        cx="32" cy="32" r="28" fill="none" strokeWidth="6" stroke="rgb(var(--brand-500))" strokeLinecap="round"
                        strokeDasharray={175.9}
                        initial={reducedMotion ? false : { strokeDashoffset: 175.9 }}
                        animate={{ strokeDashoffset: 175.9 - (175.9 * 0.68) }}
                        transition={{ delay: 0.8, duration: 1, ease: [0.4, 0, 0.2, 1] }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">68%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything you need to stay on track</h2>
            <p className="mt-3 text-fg-muted max-w-2xl mx-auto">A complete toolkit for academic productivity, crafted with intention.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={reducedMotion ? undefined : { y: -4 }}
                className="card-base p-6 group"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center mb-4 group-hover:bg-brand-500/20 transition-colors">
                  <f.icon className="w-6 h-6 text-brand-500" />
                </div>
                <h3 className="font-semibold text-lg mb-1.5">{f.title}</h3>
                <p className="text-sm text-fg-muted leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="py-20 px-4 sm:px-6 bg-bg-surface/50 border-y border-border-default">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Built for how students actually work</h2>
          </div>
          <div className="space-y-8">
            {[
              { step: '01', title: 'See your day at a glance', desc: 'Open the dashboard and instantly know what to study, what\'s due, and where you stand.' },
              { step: '02', title: 'Plan your week', desc: 'Drag subjects into your schedule, assign homework, and block time for revision — all visually.' },
              { step: '03', title: 'Focus and execute', desc: 'Start a focus session, track your time, and check off tasks as you go.' },
              { step: '04', title: 'Review and improve', desc: 'Analytics reveal your patterns so you can study smarter, not just harder.' },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={reducedMotion ? false : { opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-4 sm:gap-6 items-start"
              >
                <span className="text-3xl sm:text-4xl font-bold gradient-text shrink-0 w-16">{s.step}</span>
                <div className="pt-1">
                  <h3 className="font-semibold text-lg sm:text-xl mb-1">{s.title}</h3>
                  <p className="text-fg-muted text-sm sm:text-base">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute -inset-6 bg-gradient-to-r from-brand-500/20 to-accent-500/20 rounded-3xl blur-3xl" />
            <div className="relative card-base p-8 sm:p-12">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Ready to study smarter?</h2>
              <p className="mt-3 text-fg-muted">Join the next generation of organized students. No account needed to get started.</p>
              <div className="mt-6">
                <Button size="lg" onClick={onEnter}>
                  Open Studia <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border-default py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-fg-subtle">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Studia" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-medium text-fg">Studia</span>
          </div>
          <p>Crafted for students who plan to succeed.</p>
        </div>
      </footer>
    </div>
  );
}
