import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Trash2, Pencil, BookOpen, CheckCircle2, Circle, Clock,
} from 'lucide-react';
import { useStore, uid } from '@/store/StoreContext';
import { useToast } from '@/store/ToastContext';
import { useTheme } from '@/store/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Feedback';
import { SubjectPill } from '@/components/ui/Subject';
import { relativeDue, daysUntil, priorityRank, getSubjectById, todayISO } from '@/lib/utils';
import type { Homework, HomeworkStatus, Priority } from '@/types';

const STATUSES: { value: HomeworkStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export default function Homework() {
  const { data, update } = useStore();
  const { toast } = useToast();
  const { reducedMotion } = useTheme();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'due' | 'priority' | 'title'>('due');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Homework | null>(null);

  const filtered = useMemo(() => {
    let list = data.homework.filter((h) => {
      if (search && !h.title.toLowerCase().includes(search.toLowerCase()) && !h.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && h.status !== statusFilter) return false;
      if (subjectFilter !== 'all' && h.subjectId !== subjectFilter) return false;
      if (priorityFilter !== 'all' && h.priority !== priorityFilter) return false;
      return true;
    });
    list = list.sort((a, b) => {
      if (sortBy === 'due') return a.dueDate.localeCompare(b.dueDate);
      if (sortBy === 'priority') return priorityRank(a.priority) - priorityRank(b.priority);
      return a.title.localeCompare(b.title);
    });
    return list;
  }, [data.homework, search, statusFilter, subjectFilter, priorityFilter, sortBy]);

  const cycleStatus = (id: string) => {
    update((d) => {
      const h = d.homework.find((x) => x.id === id);
      if (h) {
        const order: HomeworkStatus[] = ['not_started', 'in_progress', 'completed'];
        const idx = order.indexOf(h.status);
        const next = order[(idx + 1) % 3];
        h.status = next;
        if (next === 'completed') {
          h.completedAt = todayISO();
          toast('Homework completed', 'success');
        } else {
          h.completedAt = undefined;
        }
      }
    });
  };

  const deleteHomework = (id: string) => {
    update((d) => { d.homework = d.homework.filter((h) => h.id !== id); });
    toast('Homework deleted', 'info');
  };

  const saveHomework = (h: Homework) => {
    update((d) => {
      const idx = d.homework.findIndex((x) => x.id === h.id);
      if (idx >= 0) d.homework[idx] = h;
      else d.homework.push(h);
    });
    toast(editing ? 'Homework updated' : 'Homework added', 'success');
    setModalOpen(false);
    setEditing(null);
  };

  const openAdd = () => {
    setEditing({
      id: uid(), title: '', subjectId: data.subjects[0]?.id ?? null, description: '',
      dueDate: todayISO(), priority: 'medium', status: 'not_started', createdAt: todayISO(),
    });
    setModalOpen(true);
  };

  const counts = {
    all: data.homework.length,
    not_started: data.homework.filter((h) => h.status === 'not_started').length,
    in_progress: data.homework.filter((h) => h.status === 'in_progress').length,
    completed: data.homework.filter((h) => h.status === 'completed').length,
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Homework</h2>
          <p className="text-fg-muted text-sm mt-1">Track assignments, deadlines, and progress.</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Assignment</Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.all, color: 'text-fg' },
          { label: 'Not Started', value: counts.not_started, color: 'text-fg-muted' },
          { label: 'In Progress', value: counts.in_progress, color: 'text-info' },
          { label: 'Completed', value: counts.completed, color: 'text-success' },
        ].map((s) => (
          <Card key={s.label}><div className="p-4"><p className="text-xs text-fg-subtle">{s.label}</p><p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p></div></Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assignments..."
                className="w-full h-11 pl-10 pr-3 rounded-xl bg-bg-muted border border-border-default text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'due' | 'priority' | 'title')} className="sm:w-44">
              <option value="due">Sort: Due date</option>
              <option value="priority">Sort: Priority</option>
              <option value="title">Sort: Title</option>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', 'not_started', 'in_progress', 'completed'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-brand-500 text-white' : 'bg-bg-muted text-fg-muted hover:text-fg'}`}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')} ({s === 'all' ? counts.all : counts[s as keyof typeof counts]})
              </button>
            ))}
            <div className="w-px h-6 bg-border-default self-center" />
            <Select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="h-8 w-auto text-xs py-0">
              <option value="all">All subjects</option>
              {data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="h-8 w-auto text-xs py-0">
              <option value="all">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* List */}
      <Card>
        <div className="p-5">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-7 h-7" />}
              title={data.homework.length === 0 ? 'No homework yet' : 'No matches found'}
              description={data.homework.length === 0 ? 'Add your first assignment to start tracking deadlines.' : 'Try adjusting your filters or search.'}
              action={data.homework.length === 0 ? <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Assignment</Button> : undefined}
            />
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filtered.map((h, i) => {
                  const subject = getSubjectById(data.subjects, h.subjectId);
                  const due = daysUntil(h.dueDate);
                  const overdue = due < 0 && h.status !== 'completed';
                  return (
                    <motion.div
                      key={h.id}
                      layout
                      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.03 }}
                      className="group flex items-start gap-3 p-4 rounded-xl bg-bg-surface border border-border-default hover:border-border-strong transition-colors"
                    >
                      <button onClick={() => cycleStatus(h.id)} className="shrink-0 mt-0.5 transition-transform active:scale-90">
                        {h.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-success" /> :
                         h.status === 'in_progress' ? <Clock className="w-5 h-5 text-info" /> :
                         <Circle className="w-5 h-5 text-fg-subtle hover:text-fg-muted" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${h.status === 'completed' ? 'line-through text-fg-subtle' : 'text-fg'}`}>{h.title}</p>
                        {h.description && <p className="text-xs text-fg-muted mt-1 line-clamp-2">{h.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <SubjectPill subject={subject} className="text-xs" />
                          <Badge variant={h.priority === 'high' ? 'danger' : h.priority === 'medium' ? 'warning' : 'success'} className="capitalize">{h.priority}</Badge>
                          <Badge variant={h.status === 'completed' ? 'success' : h.status === 'in_progress' ? 'info' : 'default'} className="capitalize">
                            {h.status.replace('_', ' ')}
                          </Badge>
                          <span className={`text-xs font-medium ${overdue ? 'text-danger' : due <= 1 && h.status !== 'completed' ? 'text-warning' : 'text-fg-subtle'}`}>
                            {relativeDue(h.dueDate)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => { setEditing({ ...h }); setModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-bg-muted text-fg-subtle hover:text-fg"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteHomework(h.id)} className="p-1.5 rounded-lg hover:bg-danger/10 text-fg-subtle hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </Card>

      <AnimatePresence>
        {modalOpen && editing && (
          <HomeworkModal
            homework={editing}
            subjects={data.subjects}
            onClose={() => { setModalOpen(false); setEditing(null); }}
            onSave={saveHomework}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function HomeworkModal({ homework, subjects, onClose, onSave }: {
  homework: Homework;
  subjects: { id: string; name: string }[];
  onClose: () => void;
  onSave: (h: Homework) => void;
}) {
  const [form, setForm] = useState<Homework>(homework);
  const error = !form.title.trim() ? 'Title is required' : null;

  return (
    <Modal open onClose={onClose} onSave={() => !error && onSave(form)} title={homework.title ? 'Edit Assignment' : 'New Assignment'} description="Track what's due and when."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => !error && onSave(form)} disabled={!!error}>Save</Button></>}>
      <div className="space-y-4">
        <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Calculus Problem Set 7" />
        <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What needs to be done?" rows={3} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Subject" value={form.subjectId ?? ''} onChange={(e) => setForm({ ...form, subjectId: e.target.value || null })}>
            <option value="">No subject</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input label="Due date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as HomeworkStatus })}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </div>
        <Textarea label="Notes (optional)" value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any extra details..." rows={2} />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
