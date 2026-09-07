import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Pencil, RefreshCw, CheckCircle2, Circle, Calendar, TrendingUp, Clock,
} from 'lucide-react';
import { useStore, uid } from '@/store/StoreContext';
import { useToast } from '@/store/ToastContext';
import { useTheme } from '@/store/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Feedback';
import { SubjectPill } from '@/components/ui/Subject';
import { relativeDue, daysUntil, formatDateLong, getSubjectById, todayISO, completionRate } from '@/lib/utils';
import type { RevisionTopic } from '@/types';

export default function Revision() {
  const { data, update } = useStore();
  const { toast } = useToast();
  const { reducedMotion } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RevisionTopic | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'in_progress' | 'completed' | 'overdue'>('all');

  const filtered = useMemo(() => {
    return data.revisions
      .filter((r) => {
        if (filter === 'all') return true;
        if (filter === 'completed') return r.completed;
        if (filter === 'in_progress') return r.inProgress && !r.completed;
        if (filter === 'upcoming') return !r.completed && !r.inProgress && daysUntil(r.scheduledDate) >= 0;
        if (filter === 'overdue') return !r.completed && !r.inProgress && daysUntil(r.scheduledDate) < 0;
        return true;
      })
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }, [data.revisions, filter]);

  const cycleStatus = (id: string) => {
    update((d) => {
      const r = d.revisions.find((x) => x.id === id);
      if (r) {
        if (!r.completed && !r.inProgress) {
          // 1st click: mark as in progress
          r.inProgress = true;
          toast('Revision marked as in progress', 'info');
        } else if (r.inProgress) {
          // 2nd click: mark as completed
          r.inProgress = false;
          r.completed = true;
          r.confidence = Math.min(r.confidence + 10, 100);
          toast('Revision completed', 'success');
        } else {
          // Completed → back to not started
          r.completed = false;
          toast('Revision marked as not started', 'info');
        }
      }
    });
  };

  const updateConfidence = (id: string, delta: number) => {
    update((d) => {
      const r = d.revisions.find((x) => x.id === id);
      if (r) r.confidence = Math.min(Math.max(r.confidence + delta, 0), 100);
    });
  };

  const deleteRevision = (id: string) => {
    update((d) => { d.revisions = d.revisions.filter((r) => r.id !== id); });
    toast('Revision deleted', 'info');
  };

  const saveRevision = (r: RevisionTopic) => {
    update((d) => {
      const idx = d.revisions.findIndex((x) => x.id === r.id);
      if (idx >= 0) d.revisions[idx] = r;
      else d.revisions.push(r);
    });
    toast(editing ? 'Revision updated' : 'Revision added', 'success');
    setModalOpen(false);
    setEditing(null);
  };

  const openAdd = () => {
    setEditing({ id: uid(), title: '', subjectId: data.subjects[0]?.id ?? null, scheduledDate: todayISO(), confidence: 50, completed: false });
    setModalOpen(true);
  };

  const completion = completionRate(data.revisions);
  const inProgress = data.revisions.filter((r) => r.inProgress && !r.completed).length;
  const upcoming = data.revisions.filter((r) => !r.completed && !r.inProgress && daysUntil(r.scheduledDate) >= 0).length;
  const overdue = data.revisions.filter((r) => !r.completed && !r.inProgress && daysUntil(r.scheduledDate) < 0).length;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Revision</h2>
          <p className="text-fg-muted text-sm mt-1">Schedule topics and track your confidence.</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Topic</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card><div className="p-4"><p className="text-xs text-fg-subtle">Total Topics</p><p className="text-2xl font-bold mt-1">{data.revisions.length}</p></div></Card>
        <Card><div className="p-4"><p className="text-xs text-fg-subtle">Completed</p><p className="text-2xl font-bold mt-1 text-success">{data.revisions.filter(r => r.completed).length}</p></div></Card>
        <Card><div className="p-4"><p className="text-xs text-fg-subtle">In Progress</p><p className="text-2xl font-bold mt-1 text-info">{inProgress}</p></div></Card>
        <Card><div className="p-4"><p className="text-xs text-fg-subtle">Upcoming</p><p className="text-2xl font-bold mt-1 text-info">{upcoming}</p></div></Card>
        <Card><div className="p-4"><p className="text-xs text-fg-subtle">Overdue</p><p className={`text-2xl font-bold mt-1 ${overdue ? 'text-danger' : 'text-fg'}`}>{overdue}</p></div></Card>
      </div>

      {/* Progress bar */}
      <Card>
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-500" />
              <span className="text-sm font-medium">Overall Revision Progress</span>
            </div>
            <span className="text-sm font-bold">{completion}%</span>
          </div>
          <Progress value={completion} size="lg" />
        </div>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All' },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'in_progress', label: 'In Progress' },
          { id: 'overdue', label: 'Overdue' },
          { id: 'completed', label: 'Completed' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as 'all' | 'upcoming' | 'in_progress' | 'completed' | 'overdue')}
            className={`shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f.id ? 'bg-brand-500 text-white' : 'bg-bg-surface border border-border-default text-fg-muted hover:text-fg'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <Card>
        <div className="p-5">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<RefreshCw className="w-7 h-7" />}
              title="No revision topics"
              description="Start your first revision session by adding a topic to review."
              action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Topic</Button>}
            />
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border-default" />

              <div className="space-y-4">
                {filtered.map((r, i) => {
                  const subject = getSubjectById(data.subjects, r.subjectId);
                  const days = daysUntil(r.scheduledDate);
                  const isOverdue = !r.completed && days < 0;
                  return (
                    <motion.div
                      key={r.id}
                      initial={reducedMotion ? false : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="relative pl-12"
                    >
                      {/* Timeline dot */}
                      <div
                        className="absolute left-2.5 top-3 w-3 h-3 rounded-full border-2 border-bg-surface"
                        style={{ backgroundColor: r.completed ? 'rgb(var(--success))' : isOverdue ? 'rgb(var(--danger))' : subject?.color ?? 'rgb(var(--brand-500))' }}
                      />

                      <div className={`group p-4 rounded-xl border transition-colors ${r.completed ? 'bg-bg-muted/40 border-border-default opacity-70' : r.inProgress ? 'bg-info/5 border-info/30' : 'bg-bg-surface border-border-default hover:border-border-strong'}`}>
                        <div className="flex items-start gap-3">
                          <button onClick={() => cycleStatus(r.id)} className="shrink-0 mt-0.5 transition-transform active:scale-90">
                            {r.completed ? <CheckCircle2 className="w-5 h-5 text-success" /> : r.inProgress ? <Clock className="w-5 h-5 text-info" /> : <Circle className="w-5 h-5 text-fg-subtle hover:text-fg-muted" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium ${r.completed ? 'line-through text-fg-subtle' : r.inProgress ? 'text-info' : 'text-fg'}`}>{r.title}</p>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button onClick={() => { setEditing({ ...r }); setModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-bg-muted text-fg-subtle hover:text-fg"><Pencil className="w-3.5 h-3.5" /></button>
                                <button onClick={() => deleteRevision(r.id)} className="p-1.5 rounded-lg hover:bg-danger/10 text-fg-subtle hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <SubjectPill subject={subject} className="text-xs" />
                              <span className="flex items-center gap-1 text-xs text-fg-subtle">
                                <Calendar className="w-3 h-3" /> {formatDateLong(r.scheduledDate)}
                              </span>
                              {!r.completed && r.inProgress && (
                                <Badge variant="info">In Progress</Badge>
                              )}
                              {!r.completed && !r.inProgress && (
                                <Badge variant={isOverdue ? 'danger' : days <= 1 ? 'warning' : 'default'}>
                                  {relativeDue(r.scheduledDate)}
                                </Badge>
                              )}
                            </div>

                            {/* Confidence slider */}
                            <div className="mt-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs text-fg-subtle">Confidence</span>
                                <span className={`text-xs font-medium ${r.confidence >= 80 ? 'text-success' : r.confidence >= 50 ? 'text-warning' : 'text-danger'}`}>{r.confidence}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => updateConfidence(r.id, -5)} className="w-7 h-7 rounded-lg bg-bg-muted hover:bg-border-default text-fg-muted text-sm font-bold shrink-0">−</button>
                                <Progress value={r.confidence} size="sm" color={r.confidence >= 80 ? 'bg-success' : r.confidence >= 50 ? 'bg-warning' : 'bg-danger'} />
                                <button onClick={() => updateConfidence(r.id, 5)} className="w-7 h-7 rounded-lg bg-bg-muted hover:bg-border-default text-fg-muted text-sm font-bold shrink-0">+</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>

      <AnimatePresence>
        {modalOpen && editing && (
          <RevisionModal
            revision={editing}
            subjects={data.subjects}
            onClose={() => { setModalOpen(false); setEditing(null); }}
            onSave={saveRevision}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function RevisionModal({ revision, subjects, onClose, onSave }: {
  revision: RevisionTopic;
  subjects: { id: string; name: string }[];
  onClose: () => void;
  onSave: (r: RevisionTopic) => void;
}) {
  const [form, setForm] = useState<RevisionTopic>(revision);
  const error = !form.title.trim() ? 'Title is required' : null;

  return (
    <Modal open onClose={onClose} onSave={() => !error && onSave(form)} title={revision.title ? 'Edit Topic' : 'New Revision Topic'} description="Schedule a topic to review."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => !error && onSave(form)} disabled={!!error}>Save</Button></>}>
      <div className="space-y-4">
        <Input label="Topic" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Integration by Parts" />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Subject" value={form.subjectId ?? ''} onChange={(e) => setForm({ ...form, subjectId: e.target.value || null })}>
            <option value="">No subject</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input label="Schedule date" type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium text-fg-muted">Confidence level</label>
            <span className="text-sm font-medium">{form.confidence}%</span>
          </div>
          <input type="range" min="0" max="100" step="5" value={form.confidence} onChange={(e) => setForm({ ...form, confidence: Number(e.target.value) })} className="w-full accent-brand-500" />
        </div>
        <Textarea label="Notes (optional)" value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
