import { useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, Timer, RotateCcw, Plus, Trash2, Pencil, BookOpen, Palette, Monitor } from 'lucide-react';
import { useStore, uid } from '@/store/StoreContext';
import { useTheme } from '@/store/ThemeContext';
import { useToast } from '@/store/ToastContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SUBJECT_COLORS } from '@/data/seed';
import type { Subject } from '@/types';

export default function Settings() {
  const { data, update, reset } = useStore();
  const { theme, setTheme, reducedMotion, setReducedMotion } = useTheme();
  const { toast } = useToast();
  const [subjectModal, setSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const saveSubject = (s: Subject) => {
    update((d) => {
      const idx = d.subjects.findIndex((x) => x.id === s.id);
      if (idx >= 0) d.subjects[idx] = s;
      else d.subjects.push(s);
    });
    toast(editingSubject ? 'Subject updated' : 'Subject added', 'success');
    setSubjectModal(false);
    setEditingSubject(null);
  };

  const deleteSubject = (id: string) => {
    update((d) => { d.subjects = d.subjects.filter((s) => s.id !== id); });
    toast('Subject deleted', 'info');
  };

  const updateSettings = (key: keyof typeof data.settings, value: string | number) => {
    update((d) => { d.settings[key] = value as never; });
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-fg-muted text-sm mt-1">Customize your Studia experience.</p>
      </div>

      {/* Appearance */}
      <Card>
        <div className="p-5 border-b border-border-default flex items-center gap-2">
          <Palette className="w-4 h-4 text-fg-muted" />
          <h3 className="font-semibold">Appearance</h3>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <p className="text-sm font-medium mb-3">Theme</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-brand-500 bg-brand-500/5' : 'border-border-default hover:border-border-strong'}`}
              >
                <Sun className="w-5 h-5 text-warning mb-2" />
                <p className="text-sm font-medium">Light</p>
                <p className="text-xs text-fg-subtle">Bright and clean</p>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-brand-500 bg-brand-500/5' : 'border-border-default hover:border-border-strong'}`}
              >
                <Moon className="w-5 h-5 text-info mb-2" />
                <p className="text-sm font-medium">Dark</p>
                <p className="text-xs text-fg-subtle">Deep and focused</p>
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Reduced motion</p>
              <p className="text-xs text-fg-subtle">Minimize animations for accessibility</p>
            </div>
            <button
              onClick={() => setReducedMotion(!reducedMotion)}
              className={`w-12 h-7 rounded-full transition-colors relative ${reducedMotion ? 'bg-brand-500' : 'bg-bg-muted'}`}
            >
              <motion.div className="absolute top-1 w-5 h-5 rounded-full bg-white shadow" animate={{ left: reducedMotion ? 24 : 4 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
            </button>
          </div>
        </div>
      </Card>

      {/* Focus settings */}
      <Card>
        <div className="p-5 border-b border-border-default flex items-center gap-2">
          <Timer className="w-4 h-4 text-fg-muted" />
          <h3 className="font-semibold">Focus Timer</h3>
        </div>
        <div className="p-5 grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-fg-muted block mb-2">Focus (min)</label>
            <Input type="number" value={data.settings.pomodoroFocus} onChange={(e) => updateSettings('pomodoroFocus', Math.max(1, Number(e.target.value)))} />
          </div>
          <div>
            <label className="text-sm font-medium text-fg-muted block mb-2">Break (min)</label>
            <Input type="number" value={data.settings.pomodoroBreak} onChange={(e) => updateSettings('pomodoroBreak', Math.max(1, Number(e.target.value)))} />
          </div>
          <div>
            <label className="text-sm font-medium text-fg-muted block mb-2">Weekly goal (h)</label>
            <Input type="number" value={data.settings.weeklyGoalHours} onChange={(e) => updateSettings('weeklyGoalHours', Math.max(1, Number(e.target.value)))} />
          </div>
        </div>
      </Card>

      {/* Subjects */}
      <Card>
        <div className="p-5 border-b border-border-default flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-fg-muted" />
            <h3 className="font-semibold">Subjects</h3>
          </div>
          <Button size="sm" onClick={() => { setEditingSubject({ id: uid(), name: '', color: SUBJECT_COLORS[0], teacher: '' }); setSubjectModal(true); }}>
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
        <div className="p-5">
          {data.subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8 px-4">
              <BookOpen className="w-8 h-8 text-fg-subtle mb-3" />
              <p className="text-sm font-medium text-fg">No subjects yet</p>
              <p className="text-xs text-fg-muted mt-1 max-w-xs">Add subjects to organize your homework, revisions, and sessions.</p>
              <Button size="sm" className="mt-4" onClick={() => { setEditingSubject({ id: uid(), name: '', color: SUBJECT_COLORS[0], teacher: '' }); setSubjectModal(true); }}>
                <Plus className="w-4 h-4" /> Add Subject
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.subjects.map((s) => (
                <div key={s.id} className="group flex items-center gap-3 p-3 rounded-xl bg-bg-muted/50 border border-border-default">
                  <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}40` }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    {s.teacher && <p className="text-xs text-fg-subtle truncate">{s.teacher}</p>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingSubject({ ...s }); setSubjectModal(true); }} className="p-1.5 rounded-lg hover:bg-bg-surface text-fg-subtle hover:text-fg"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteSubject(s.id)} className="p-1.5 rounded-lg hover:bg-danger/10 text-fg-subtle hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Data */}
      <Card>
        <div className="p-5 border-b border-border-default flex items-center gap-2">
          <Monitor className="w-4 h-4 text-fg-muted" />
          <h3 className="font-semibold">Data Management</h3>
        </div>
        <div className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-danger/5 border border-danger/20">
            <div>
              <p className="text-sm font-medium">Reset all data</p>
              <p className="text-xs text-fg-subtle mt-0.5">This will permanently delete all your data. This cannot be undone.</p>
            </div>
            <Button variant="danger" onClick={() => setResetOpen(true)}><RotateCcw className="w-4 h-4" /> Reset</Button>
          </div>
        </div>
      </Card>

      {/* Subject modal */}
      {subjectModal && editingSubject && (
        <SubjectModal subject={editingSubject} onClose={() => { setSubjectModal(false); setEditingSubject(null); }} onSave={saveSubject} />
      )}

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => { reset(); toast('All data cleared', 'success'); }}
        title="Reset all data?"
        description="This will permanently delete all your routines, homework, revisions, sessions, goals, and calendar events. This cannot be undone."
        confirmLabel="Reset everything"
      />
    </div>
  );
}

function SubjectModal({ subject, onClose, onSave }: { subject: Subject; onClose: () => void; onSave: (s: Subject) => void }) {
  const [form, setForm] = useState<Subject>(subject);
  const error = !form.name.trim() ? 'Name is required' : null;

  return (
    <Modal open onClose={onClose} onSave={() => !error && onSave(form)} title={subject.name ? 'Edit Subject' : 'New Subject'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => !error && onSave(form)} disabled={!!error}>Save</Button></>}>
      <div className="space-y-4">
        <Input label="Subject name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" />
        <Input label="Teacher (optional)" value={form.teacher ?? ''} onChange={(e) => setForm({ ...form, teacher: e.target.value })} placeholder="e.g. Dr. Chen" />
        <div>
          <label className="text-sm font-medium text-fg-muted block mb-2">Color</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                className={`w-9 h-9 rounded-lg transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-offset-bg-surface scale-110' : ''}`}
                style={{ backgroundColor: c, boxShadow: form.color === c ? `0 0 0 2px ${c}` : `0 0 8px ${c}40` }}
              />
            ))}
          </div>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
