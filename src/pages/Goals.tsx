import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Pencil, Target, Award, CheckCircle2, Flame, Shield, GraduationCap, Moon, Footprints, Sparkles } from 'lucide-react';
import { useStore, uid } from '@/store/StoreContext';
import { useToast } from '@/store/ToastContext';
import { useTheme } from '@/store/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Progress, CircularProgress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Feedback';
import { formatDate, daysUntil, todayISO, activeStreak } from '@/lib/utils';
import type { Goal } from '@/types';

import type { LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = { Footprints, Flame, Shield, GraduationCap, Target, Moon, Award, Sparkles };

export default function Goals() {
  const { data, update } = useStore();
  const { toast } = useToast();
  const { reducedMotion } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const active = data.goals.filter((g) => !g.completed);
  const completed = data.goals.filter((g) => g.completed);

  const saveGoal = (g: Goal) => {
    update((d) => {
      const idx = d.goals.findIndex((x) => x.id === g.id);
      if (idx >= 0) d.goals[idx] = g;
      else d.goals.push(g);
    });
    toast(editing ? 'Goal updated' : 'Goal added', 'success');
    setModalOpen(false);
    setEditing(null);
  };

  const deleteGoal = (id: string) => {
    update((d) => { d.goals = d.goals.filter((g) => g.id !== id); });
    toast('Goal deleted', 'info');
  };

  const toggleComplete = (id: string) => {
    update((d) => {
      const g = d.goals.find((x) => x.id === id);
      if (g) {
        g.completed = !g.completed;
        if (g.completed) { g.current = g.target; toast('Goal completed!', 'success'); }
      }
    });
  };

  const openAdd = () => {
    setEditing({ id: uid(), title: '', description: '', target: 10, current: 0, unit: 'hours', deadline: todayISO(), category: 'study_time', completed: false });
    setModalOpen(true);
  };

  const overallProgress = data.goals.length ? Math.round(data.goals.reduce((sum, g) => sum + Math.min((g.current / g.target) * 100, 100), 0) / data.goals.length) : 0;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Goals & Achievements</h2>
          <p className="text-fg-muted text-sm mt-1">Set targets, build streaks, unlock milestones.</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4" /> New Goal</Button>
      </div>

      {/* Overall progress + streak */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="flex flex-col items-center">
          <div className="p-5 flex flex-col items-center">
            <p className="text-sm text-fg-subtle mb-3">Overall Goal Progress</p>
            <CircularProgress value={overallProgress} size={140} label={`${overallProgress}%`} />
            <p className="text-xs text-fg-subtle mt-3">{completed.length} of {data.goals.length} goals completed</p>
          </div>
        </Card>
        <Card>
          <div className="p-5 flex flex-col items-center justify-center h-full">
            <Flame className="w-10 h-10 text-warning mb-3" />
            <p className="text-3xl font-bold">{activeStreak(data.streak)}</p>
            <p className="text-sm text-fg-muted">day streak</p>
            <p className="text-xs text-fg-subtle mt-2">Keep it going!</p>
          </div>
        </Card>
        <Card>
          <div className="p-5 flex flex-col items-center justify-center h-full">
            <Award className="w-10 h-10 text-accent-500 mb-3" />
            <p className="text-3xl font-bold">{data.achievements.filter(a => a.unlocked).length}</p>
            <p className="text-sm text-fg-muted">achievements unlocked</p>
            <p className="text-xs text-fg-subtle mt-2">out of {data.achievements.length}</p>
          </div>
        </Card>
      </div>

      {/* Active goals */}
      <div>
        <h3 className="font-semibold mb-3">Active Goals</h3>
        {active.length === 0 ? (
          <Card><div className="p-5">
            <EmptyState icon={<Target className="w-7 h-7" />} title="No active goals" description="Set your first goal to start tracking progress." action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> New Goal</Button>} />
          </div></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {active.map((g, i) => {
              const days = daysUntil(g.deadline);
              const pct = Math.min((g.current / g.target) * 100, 100);
              return (
                <motion.div key={g.id} initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card hover>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{g.title}</p>
                          <p className="text-xs text-fg-muted mt-0.5">{g.description}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button onClick={() => { setEditing({ ...g }); setModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-bg-muted text-fg-subtle hover:text-fg"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteGoal(g.id)} className="p-1.5 rounded-lg hover:bg-danger/10 text-fg-subtle hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold">{g.current}<span className="text-sm text-fg-subtle font-normal"> / {g.target} {g.unit}</span></span>
                        <span className="text-sm font-medium">{Math.round(pct)}%</span>
                      </div>
                      <Progress value={pct} size="md" />
                      <div className="flex items-center justify-between mt-3">
                        <Badge variant={days < 0 ? 'danger' : days <= 2 ? 'warning' : 'default'}>{days < 0 ? 'Overdue' : days === 0 ? 'Due today' : `${days}d left`}</Badge>
                        <button onClick={() => toggleComplete(g.id)} className="w-7 h-7 rounded-lg bg-success/10 hover:bg-success/20 text-success flex items-center justify-center"><CheckCircle2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed goals */}
      {completed.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Completed Goals</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {completed.map((g) => (
              <Card key={g.id}>
                <div className="p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{g.title}</p>
                    <p className="text-xs text-fg-subtle">{g.target} {g.unit} · {formatDate(g.deadline)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      <div>
        <h3 className="font-semibold mb-3">Achievements</h3>
        <Card>
          <div className="p-5">
            {data.achievements.length === 0 ? (
              <EmptyState
                icon={<Award className="w-7 h-7" />}
                title="No achievements yet"
                description="Complete goals and build streaks to unlock achievements."
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {data.achievements.map((a, i) => {
                  const Icon = ICONS[a.icon] ?? Award;
                  return (
                    <motion.div
                      key={a.id}
                      initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className={`flex flex-col items-center text-center p-4 rounded-xl border ${a.unlocked ? 'bg-accent-500/5 border-accent-500/20' : 'bg-bg-muted/30 border-border-default opacity-50'}`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${a.unlocked ? 'bg-accent-500/10' : 'bg-bg-muted'}`}>
                        <Icon className={`w-6 h-6 ${a.unlocked ? 'text-accent-500' : 'text-fg-subtle'}`} />
                      </div>
                      <p className="text-xs font-medium">{a.title}</p>
                      <p className="text-[10px] text-fg-subtle mt-0.5">{a.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {modalOpen && editing && (
          <GoalModal goal={editing} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={saveGoal} />
        )}
      </AnimatePresence>
    </div>
  );
}

function GoalModal({ goal, onClose, onSave }: { goal: Goal; onClose: () => void; onSave: (g: Goal) => void }) {
  const [form, setForm] = useState<Goal>(goal);
  const error = !form.title.trim() ? 'Title is required' : form.target <= 0 ? 'Target must be positive' : null;

  return (
    <Modal open onClose={onClose} onSave={() => !error && onSave(form)} title={goal.title ? 'Edit Goal' : 'New Goal'} description="Set a measurable target with a deadline."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => !error && onSave(form)} disabled={!!error}>Save</Button></>}>
      <div className="space-y-4">
        <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Study 20 hours this week" />
        <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Why this goal matters..." />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Target" type="number" value={form.target} onChange={(e) => setForm({ ...form, target: Number(e.target.value) })} />
          <Input label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="hours, tasks, days..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Goal['category'] })}>
            <option value="study_time">Study Time</option>
            <option value="homework">Homework</option>
            <option value="revision">Revision</option>
            <option value="streak">Streak</option>
            <option value="custom">Custom</option>
          </Select>
          <Input label="Deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
