import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Trash2, Pencil, ListTodo, CheckCircle2, Circle,
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
import { relativeDue, daysUntil, priorityRank, todayISO } from '@/lib/utils';
import type { Todo, Priority } from '@/types';

export default function Todo() {
  const { data, update } = useStore();
  const { toast } = useToast();
  const { reducedMotion } = useTheme();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'due' | 'priority' | 'title'>('due');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);

  const filtered = useMemo(() => {
    let list = data.todos.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter === 'pending' && t.completed) return false;
      if (statusFilter === 'completed' && !t.completed) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      return true;
    });
    list = list.sort((a, b) => {
      if (sortBy === 'due') return a.dueDate.localeCompare(b.dueDate);
      if (sortBy === 'priority') return priorityRank(a.priority) - priorityRank(b.priority);
      return a.title.localeCompare(b.title);
    });
    return list;
  }, [data.todos, search, statusFilter, priorityFilter, sortBy]);

  const toggleTodo = (id: string) => {
    update((d) => {
      const t = d.todos.find((x) => x.id === id);
      if (t) {
        t.completed = !t.completed;
        toast(t.completed ? 'Task completed' : 'Task reopened', t.completed ? 'success' : 'info');
      }
    });
  };

  const deleteTodo = (id: string) => {
    update((d) => { d.todos = d.todos.filter((t) => t.id !== id); });
    toast('Task deleted', 'info');
  };

  const saveTodo = (t: Todo) => {
    update((d) => {
      const idx = d.todos.findIndex((x) => x.id === t.id);
      if (idx >= 0) d.todos[idx] = t;
      else d.todos.push(t);
    });
    toast(editing ? 'Task updated' : 'Task added', 'success');
    setModalOpen(false);
    setEditing(null);
  };

  const openAdd = () => {
    setEditing({
      id: uid(), title: '', description: '',
      dueDate: todayISO(), priority: 'medium', completed: false, createdAt: todayISO(),
    });
    setModalOpen(true);
  };

  const counts = {
    all: data.todos.length,
    pending: data.todos.filter((t) => !t.completed).length,
    completed: data.todos.filter((t) => t.completed).length,
  };
  const completionRate = counts.all ? Math.round((counts.completed / counts.all) * 100) : 0;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">To-Do List</h2>
          <p className="text-fg-muted text-sm mt-1">Keep track of your daily tasks and get things done.</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Task</Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.all, color: 'text-fg' },
          { label: 'Pending', value: counts.pending, color: 'text-info' },
          { label: 'Completed', value: counts.completed, color: 'text-success' },
          { label: 'Completion', value: `${completionRate}%`, color: 'text-brand-500' },
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
                placeholder="Search tasks..."
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
            {['all', 'pending', 'completed'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-brand-500 text-white' : 'bg-bg-muted text-fg-muted hover:text-fg'}`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} ({s === 'all' ? counts.all : counts[s as keyof typeof counts]})
              </button>
            ))}
            <div className="w-px h-6 bg-border-default self-center" />
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
              icon={<ListTodo className="w-7 h-7" />}
              title={data.todos.length === 0 ? 'No tasks yet' : 'No matches found'}
              description={data.todos.length === 0 ? 'Add your first task to start checking things off.' : 'Try adjusting your filters or search.'}
              action={data.todos.length === 0 ? <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Task</Button> : undefined}
            />
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filtered.map((t, i) => {
                  const due = daysUntil(t.dueDate);
                  const overdue = due < 0 && !t.completed;
                  return (
                    <motion.div
                      key={t.id}
                      layout
                      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.03 }}
                      className="group flex items-start gap-3 p-4 rounded-xl bg-bg-surface border border-border-default hover:border-border-strong transition-colors"
                    >
                      <button onClick={() => toggleTodo(t.id)} className="shrink-0 mt-0.5 transition-transform active:scale-90">
                        {t.completed ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5 text-fg-subtle hover:text-fg-muted" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${t.completed ? 'line-through text-fg-subtle' : 'text-fg'}`}>{t.title}</p>
                        {t.description && <p className="text-xs text-fg-muted mt-1 line-clamp-2">{t.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant={t.priority === 'high' ? 'danger' : t.priority === 'medium' ? 'warning' : 'success'} className="capitalize">{t.priority}</Badge>
                          <Badge variant={t.completed ? 'success' : 'info'}>{t.completed ? 'Completed' : 'Pending'}</Badge>
                          <span className={`text-xs font-medium ${overdue ? 'text-danger' : due <= 1 && !t.completed ? 'text-warning' : 'text-fg-subtle'}`}>
                            {relativeDue(t.dueDate)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => { setEditing({ ...t }); setModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-bg-muted text-fg-subtle hover:text-fg"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteTodo(t.id)} className="p-1.5 rounded-lg hover:bg-danger/10 text-fg-subtle hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
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
          <TodoModal
            todo={editing}
            onClose={() => { setModalOpen(false); setEditing(null); }}
            onSave={saveTodo}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TodoModal({ todo, onClose, onSave }: {
  todo: Todo;
  onClose: () => void;
  onSave: (t: Todo) => void;
}) {
  const [form, setForm] = useState<Todo>(todo);
  const error = !form.title.trim() ? 'Title is required' : null;

  return (
    <Modal open onClose={onClose} onSave={() => !error && onSave(form)} title={todo.title ? 'Edit Task' : 'New Task'} description="Add something to your to-do list."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => !error && onSave(form)} disabled={!!error}>Save</Button></>}>
      <div className="space-y-4">
        <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Review chapter 4 notes" />
        <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What needs to be done?" rows={3} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Due date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}