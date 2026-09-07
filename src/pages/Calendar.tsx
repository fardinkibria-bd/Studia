import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarRange, X, Clock, MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import { useStore, uid } from '@/store/StoreContext';
import { useToast } from '@/store/ToastContext';
import { useTheme } from '@/store/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { SubjectPill } from '@/components/ui/Subject';
import { DAYS, MONTHS, getSubjectById, formatDateLong, todayISO, toLocalISO, computeStudyStreak } from '@/lib/utils';
import type { Homework, Exam, RevisionTopic, StudySession, CalendarEvent } from '@/types';

type View = 'month' | 'week' | 'day';
type CalEvent = {
  id: string;
  type: 'homework' | 'exam' | 'revision' | 'session' | 'custom';
  title: string;
  date: string;
  time?: string;
  subjectId: string | null;
  location?: string;
  notes?: string;
  status?: string;
};

export default function Calendar() {
  const { data, update } = useStore();
  const { toast } = useToast();
  const { reducedMotion } = useTheme();
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const events: CalEvent[] = useMemo(() => {
    const hw: CalEvent[] = data.homework.map((h: Homework) => ({
      id: h.id, type: 'homework', title: h.title, date: h.dueDate, subjectId: h.subjectId, status: h.status, notes: h.description,
    }));
    const ex: CalEvent[] = data.exams.map((e: Exam) => ({
      id: e.id, type: 'exam', title: e.title, date: e.date, time: e.time, subjectId: e.subjectId, location: e.location, notes: e.notes,
    }));
    const rv: CalEvent[] = data.revisions.map((r: RevisionTopic) => ({
      id: r.id, type: 'revision', title: r.title, date: r.scheduledDate, subjectId: r.subjectId,
    }));
    const ss: CalEvent[] = data.sessions.map((s: StudySession) => ({
      id: s.id, type: 'session', title: 'Study Session', date: s.date, subjectId: s.subjectId, time: `${s.duration}m`,
    }));
    const ce: CalEvent[] = data.calendarEvents.map((e: CalendarEvent) => ({
      id: e.id, type: 'custom', title: e.title, date: e.date, time: e.time, subjectId: e.subjectId, location: e.location, notes: e.notes,
    }));
    return [...hw, ...ex, ...rv, ...ss, ...ce];
  }, [data]);

  const eventsForDate = (iso: string) => events.filter((e) => e.date === iso);

  const typeColor: Record<CalEvent['type'], string> = {
    homework: 'rgb(var(--info))',
    exam: 'rgb(var(--danger))',
    revision: 'rgb(var(--accent-500))',
    session: 'rgb(var(--brand-500))',
    custom: 'rgb(var(--success))',
  };

  const typeLabel: Record<CalEvent['type'], string> = {
    homework: 'Homework', exam: 'Exam', revision: 'Revision', session: 'Session', custom: 'Event',
  };

  // Month view
  const monthDays = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const days: { date: Date; iso: string; current: boolean }[] = [];
    for (let i = startOffset; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      days.push({ date: d, iso: toLocalISO(d), current: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, iso: toLocalISO(d), current: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, iso: toLocalISO(d), current: false });
    }
    return days;
  }, [cursor]);

  // Week view
  const weekDays = useMemo(() => {
    const start = new Date(cursor);
    const day = start.getDay() === 0 ? 6 : start.getDay() - 1;
    start.setDate(start.getDate() - day);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d, iso: toLocalISO(d) };
    });
  }, [cursor]);

  const todayStr = todayISO();

  const navigate = (dir: number) => {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCursor(d);
  };

  const headerLabel = useMemo(() => {
    if (view === 'month') return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view === 'week') {
      const end = weekDays[6];
      return `${weekDays[0].date.getDate()} ${MONTHS[weekDays[0].date.getMonth()]} — ${end.date.getDate()} ${MONTHS[end.date.getMonth()]}`;
    }
    return formatDateLong(selectedDate);
  }, [cursor, view, weekDays, selectedDate]);

  const selectDate = (iso: string) => {
    setSelectedDate(iso);
    const [y, m, d] = iso.split('-').map(Number);
    setCursor(new Date(y, m - 1, d));
  };

  const openAddEvent = (date?: string) => {
    setEditingEvent({
      id: uid(), title: '', date: date ?? selectedDate, subjectId: data.subjects[0]?.id ?? null,
    });
    setEventModalOpen(true);
  };

  const openEditEvent = (e: CalEvent) => {
    if (e.type !== 'custom') return;
    const original = data.calendarEvents.find((x) => x.id === e.id);
    if (original) {
      setEditingEvent({ ...original });
      setEventModalOpen(true);
    }
  };

  const deleteEvent = (id: string) => {
    update((d) => { d.calendarEvents = d.calendarEvents.filter((e) => e.id !== id); });
    toast('Event deleted', 'info');
    setSelectedEvent(null);
  };

  const deleteSession = (id: string) => {
    update((d) => {
      d.sessions = d.sessions.filter((s) => s.id !== id);
      // Deleting a session can remove a study day and/or split the current
      // run, so the streak is always re-derived from the remaining sessions
      // instead of being blindly decremented.
      d.streak = computeStudyStreak(d.sessions);
    });
    toast('Study session deleted', 'info');
    setSelectedEvent(null);
  };

  // Esc to close the event detail popup
  useEffect(() => {
    if (!selectedEvent) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedEvent(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEvent]);

  const saveEvent = (e: CalendarEvent) => {
    update((d) => {
      const idx = d.calendarEvents.findIndex((x) => x.id === e.id);
      if (idx >= 0) d.calendarEvents[idx] = e;
      else d.calendarEvents.push(e);
    });
    toast(editingEvent?.title ? 'Event updated' : 'Event added', 'success');
    setEventModalOpen(false);
    setEditingEvent(null);
  };

  const selectedDateEvents = eventsForDate(selectedDate);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Calendar</h2>
          <p className="text-fg-muted text-sm mt-1">All your deadlines and sessions in one view.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-bg-muted rounded-xl gap-1">
            {(['month', 'week', 'day'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${view === v ? 'bg-bg-surface shadow-soft text-fg' : 'text-fg-muted hover:text-fg'}`}
              >
                {v}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => openAddEvent()}><Plus className="w-4 h-4" /> Add Event</Button>
        </div>
      </div>

      <Card>
        <div className="p-5 border-b border-border-default flex items-center justify-between">
          <h3 className="font-semibold">{headerLabel}</h3>
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg hover:bg-bg-muted flex items-center justify-center text-fg-muted hover:text-fg"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => { setCursor(new Date()); setSelectedDate(todayStr); }} className="px-3 h-8 rounded-lg text-xs font-medium hover:bg-bg-muted text-fg-muted hover:text-fg">Today</button>
            <button onClick={() => navigate(1)} className="w-8 h-8 rounded-lg hover:bg-bg-muted flex items-center justify-center text-fg-muted hover:text-fg"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-fg-muted justify-center py-2 border-b border-border-default">
          {(Object.keys(typeColor) as CalEvent['type'][]).map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: typeColor[t] }} />
              {typeLabel[t]}
            </span>
          ))}
        </div>

        {/* Month view */}
        {view === 'month' && (
          <div className="p-3 sm:p-5">
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {DAYS.map((d) => <div key={d} className="text-center text-xs font-medium text-fg-subtle py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {monthDays.map((day, i) => {
                const dayEvents = eventsForDate(day.iso);
                const isToday = day.iso === todayStr;
                const isSelected = day.iso === selectedDate;
                return (
                  <button
                    key={i}
                    onClick={() => { selectDate(day.iso); setView('day'); }}
                    className={`min-h-[60px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-lg border text-left transition-colors ${
                      day.current ? 'bg-bg-surface border-border-default hover:border-border-strong' : 'bg-bg-muted/30 border-transparent'
                    } ${isToday ? 'ring-2 ring-brand-500' : ''} ${isSelected ? 'ring-2 ring-accent-500' : ''}`}
                  >
                    <span className={`text-xs sm:text-sm ${isToday ? 'font-bold text-brand-500' : isSelected ? 'font-bold text-accent-500' : day.current ? 'text-fg' : 'text-fg-subtle'}`}>
                      {day.date.getDate()}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div key={e.id} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: typeColor[e.type] }} />
                          <span className="text-[10px] sm:text-xs text-fg-muted truncate hidden sm:block">{e.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && <span className="text-[10px] text-fg-subtle">+{dayEvents.length - 3} more</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Week view */}
        {view === 'week' && (
          <div className="p-3 sm:p-5">
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {weekDays.map((day, i) => {
                const dayEvents = eventsForDate(day.iso);
                const isToday = day.iso === todayStr;
                const isSelected = day.iso === selectedDate;
                return (
                  <div key={i} className={`min-h-[200px] p-2 rounded-lg border ${isToday ? 'ring-2 ring-brand-500 border-border-default' : isSelected ? 'ring-2 ring-accent-500 border-border-default' : 'border-border-default bg-bg-surface'}`}>
                    <div className="text-center mb-2">
                      <p className="text-xs text-fg-subtle">{DAYS[i]}</p>
                      <p className={`text-sm font-semibold ${isToday ? 'text-brand-500' : isSelected ? 'text-accent-500' : ''}`}>{day.date.getDate()}</p>
                    </div>
                    <div className="space-y-1.5">
                      {dayEvents.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => setSelectedEvent(e)}
                          className="w-full text-left p-1.5 rounded-md text-xs hover:scale-[1.02] transition-transform"
                          style={{ backgroundColor: `${typeColor[e.type]}20` }}
                        >
                          <span className="block font-medium truncate" style={{ color: typeColor[e.type] }}>{e.title}</span>
                          {e.time && <span className="text-[10px] text-fg-subtle">{e.time}</span>}
                        </button>
                      ))}
                      <button
                        onClick={() => openAddEvent(day.iso)}
                        className="w-full text-left p-1.5 rounded-md text-xs text-fg-subtle hover:text-fg hover:bg-bg-muted transition-colors"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Day view */}
        {view === 'day' && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-fg-muted">{formatDateLong(selectedDate)}</p>
              <Button size="sm" onClick={() => openAddEvent(selectedDate)}><Plus className="w-4 h-4" /> Add Event</Button>
            </div>
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-12">
                <CalendarRange className="w-10 h-10 text-fg-subtle mx-auto mb-3" />
                <p className="text-sm text-fg-muted">No events on this day.</p>
                <Button variant="secondary" size="sm" className="mt-4" onClick={() => openAddEvent(selectedDate)}><Plus className="w-4 h-4" /> Add Event</Button>
              </div>
            ) : (
              <div className="space-y-2 max-w-2xl">
                {selectedDateEvents.map((e, i) => {
                  const subject = getSubjectById(data.subjects, e.subjectId);
                  return (
                    <motion.div
                      key={e.id}
                      initial={reducedMotion ? false : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-bg-surface border border-border-default hover:border-border-strong transition-colors"
                    >
                      <button onClick={() => setSelectedEvent(e)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                        <div className="w-1.5 h-12 rounded-full shrink-0" style={{ backgroundColor: typeColor[e.type] }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{e.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="default" className="capitalize">{typeLabel[e.type]}</Badge>
                            <SubjectPill subject={subject} className="text-xs" />
                          </div>
                        </div>
                        {e.time && <span className="text-xs text-fg-subtle shrink-0">{e.time}</span>}
                      </button>
                      {(e.type === 'custom' || e.type === 'session') && (
                        <div className="flex items-center gap-1 shrink-0">
                          {e.type === 'custom' && (
                            <button onClick={() => openEditEvent(e)} className="p-1.5 rounded-lg hover:bg-bg-muted text-fg-subtle hover:text-fg"><Pencil className="w-3.5 h-3.5" /></button>
                          )}
                          <button
                            onClick={() => e.type === 'session' ? deleteSession(e.id) : deleteEvent(e.id)}
                            className="p-1.5 rounded-lg hover:bg-danger/10 text-fg-subtle hover:text-danger"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Event detail panel */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
            <motion.div
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative w-full max-w-md glass-strong rounded-t-3xl sm:rounded-2xl shadow-float"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: typeColor[selectedEvent.type] }} />
                    <Badge variant="default" className="capitalize">{typeLabel[selectedEvent.type]}</Badge>
                  </div>
                  <button onClick={() => setSelectedEvent(null)} className="text-fg-subtle hover:text-fg"><X className="w-5 h-5" /></button>
                </div>
                <h3 className="text-lg font-semibold mb-2">{selectedEvent.title}</h3>
                <div className="space-y-2 text-sm text-fg-muted">
                  <p className="flex items-center gap-2"><CalendarRange className="w-4 h-4" /> {formatDateLong(selectedEvent.date)}</p>
                  {selectedEvent.time && <p className="flex items-center gap-2"><Clock className="w-4 h-4" /> {selectedEvent.time}</p>}
                  {selectedEvent.location && <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {selectedEvent.location}</p>}
                  {selectedEvent.subjectId && (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4" />
                      <SubjectPill subject={getSubjectById(data.subjects, selectedEvent.subjectId)} />
                    </div>
                  )}
                  {selectedEvent.notes && <p className="pt-2 border-t border-border-default mt-3">{selectedEvent.notes}</p>}
                  {selectedEvent.status && <Badge variant={selectedEvent.status === 'completed' ? 'success' : 'default'} className="capitalize mt-2">{selectedEvent.status.replace('_', ' ')}</Badge>}
                </div>
                {(selectedEvent.type === 'custom' || selectedEvent.type === 'session') && (
                  <div className="flex gap-2 mt-5 pt-4 border-t border-border-default">
                    {selectedEvent.type === 'custom' && (
                      <Button variant="secondary" size="sm" onClick={() => { openEditEvent(selectedEvent); setSelectedEvent(null); }}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => selectedEvent.type === 'session' ? deleteSession(selectedEvent.id) : deleteEvent(selectedEvent.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit event modal */}
      <AnimatePresence>
        {eventModalOpen && editingEvent && (
          <EventModal
            event={editingEvent}
            subjects={data.subjects}
            onClose={() => { setEventModalOpen(false); setEditingEvent(null); }}
            onSave={saveEvent}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EventModal({ event, subjects, onClose, onSave }: {
  event: CalendarEvent;
  subjects: { id: string; name: string }[];
  onClose: () => void;
  onSave: (e: CalendarEvent) => void;
}) {
  const [form, setForm] = useState<CalendarEvent>(event);
  const error = !form.title.trim() ? 'Title is required' : null;

  return (
    <Modal open onClose={onClose} onSave={() => !error && onSave(form)} title={event.title ? 'Edit Event' : 'New Event'} description="Add a custom event to your calendar."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => !error && onSave(form)} disabled={!!error}>Save</Button></>}>
      <div className="space-y-4">
        <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Study group meeting" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input label="Time (optional)" type="time" value={form.time ?? ''} onChange={(e) => setForm({ ...form, time: e.target.value || undefined })} />
        </div>
        <Select label="Subject" value={form.subjectId ?? ''} onChange={(e) => setForm({ ...form, subjectId: e.target.value || null })}>
          <option value="">No subject</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Input label="Location (optional)" value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Library, Room 204" />
        <Textarea label="Notes (optional)" value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Any extra details..." />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}