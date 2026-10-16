import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  GripVertical,
  Clock,
  Coffee,
  Pencil,
} from "lucide-react";
import { resetStaticRoutines, todayISO } from "@/lib/utils";
import { useStore, uid } from "@/store/StoreContext";
import { useToast } from "@/store/ToastContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/Feedback";
import { SubjectPill } from "@/components/ui/Subject";
import { Checkbox } from "@/components/animate-ui/components/radix/checkbox";
import { PlayfulStrike } from "@/components/animate-ui/components/community/playful-todolist";
import {
  DAYS,
  DAYS_FULL,
  formatTime,
  durationLabel,
  timeToMinutes,
  getTodayDayIndex,
  getSubjectById,
} from "@/lib/utils";
import type { RoutineItem } from "@/types";

export default function Schedule() {
  const { data, update } = useStore();
  const { toast } = useToast();
  const [selectedDay, setSelectedDay] = useState(getTodayDayIndex());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RoutineItem | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [today, setToday] = useState(todayISO());

  const dayRoutine = data.routines
    .filter((r) => r.day === selectedDay)
    .sort((a, b) => a.order - b.order);

  useEffect(() => {
    const interval = setInterval(() => {
      const newToday = todayISO();
      if (newToday !== today) {
        setToday(newToday);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [today]);

  useEffect(() => {
    const hasStale = data.routines.some(
      (r) => r.isStatic && r.lastUpdatedDate !== today,
    );
    if (hasStale) {
      update((d) => {
        d.routines = resetStaticRoutines(d.routines);
      });
    }
  }, [today, data.routines, update]);

  const deleteRoutine = (id: string) => {
    update((d) => {
      d.routines = d.routines.filter((r) => r.id !== id);
    });
    toast("Routine deleted", "info");
  };

  const toggleRoutine = (id: string) => {
    update((d) => {
      const r = d.routines.find((x) => x.id === id);
      if (r) {
        r.completed = !r.completed;
        // Local calendar day, matching todayISO()/resetStaticRoutines — the
        // UTC-based string previously made static routines reset immediately
        // in UTC+X timezones before midnight UTC.
        r.lastUpdatedDate = todayISO();
      }
    });
  };

  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  };
  const handleDrop = (id: string) => {
    if (!dragId || dragId === id) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    update((d) => {
      const items = d.routines
        .filter((r) => r.day === selectedDay)
        .sort((a, b) => a.order - b.order);
      const fromIdx = items.findIndex((r) => r.id === dragId);
      const toIdx = items.findIndex((r) => r.id === id);
      if (fromIdx === -1 || toIdx === -1) return;
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      items.forEach((r, i) => {
        r.order = i;
      });
    });
    setDragId(null);
    setDragOverId(null);
  };

  const saveRoutine = (r: RoutineItem) => {
    const isNew = !data.routines.find((x) => x.id === r.id);
    update((d) => {
      const idx = d.routines.findIndex((x) => x.id === r.id);
      if (idx >= 0) d.routines[idx] = r;
      else {
        r.order = d.routines.filter((x) => x.day === r.day).length;
        d.routines.push(r);
      }
      if (isNew && r.isStatic) {
        d.routines = resetStaticRoutines(d.routines);
      }
    });
    toast(editing ? "Routine updated" : "Routine added", "success");
    setModalOpen(false);
    setEditing(null);
  };

  const openAdd = () => {
    setEditing({
      id: uid(),
      title: "",
      subjectId: null,
      startTime: "09:00",
      endTime: "10:00",
      day: selectedDay,
      isBreak: false,
      completed: false,
      order: 0,
      isStatic: false,
      lastUpdatedDate: todayISO(),
    });
    setModalOpen(true);
  };

  const openEdit = (r: RoutineItem) => {
    setEditing({ ...r });
    setModalOpen(true);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl lg:text-3xl font-title font-bold tracking-tight">
            Schedule
          </h2>
          <p className="text-bg-surface text-sm mt-1">
            Plan your day, one block at a time.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4" /> Add Activity
        </Button>
      </div>

      {/* Day selector - sticky on mobile */}
      <div className="sticky top-0 z-10 -mx-4 px-4 lg:mx-0 lg:px-0 lg:static pb-2 lg:pb-0 bg-bg-base dark:bg-bg-base/95 backdrop-blur-sm lg:backdrop-blur-none">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {DAYS.map((day, i) => {
            const active = selectedDay === i;
            const isToday = getTodayDayIndex() === i;
            const count = data.routines.filter((r) => r.day === i).length;
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(i)}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all min-w-[80px] ${
                  active
                    ? "bg-brand-500 text-white shadow-soft"
                    : "border border-bg-surface bg-transparent dark:bg-bg-surface text-brand-500 hover:border-border-strong dark:border-border-default dark:text-fg-subtle"
                }`}
              >
                <span className="block dark:text-fg">{day}</span>
                <span
                  className={`text-xs ${active ? "text-white/80" : "text-warning dark:text-fg-subtle"}`}
                >
                  {count} {count === 1 ? "item" : "items"}
                </span>
                {isToday && (
                  <span
                    className={`block w-1.5 h-1.5 rounded-full mx-auto mt-1 ${active ? "bg-white" : "bg-brand-500"}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Card>
        <div className="p-5 border-b border-border-default">
          <h3 className="font-titles">{DAYS_FULL[selectedDay]}</h3>
        </div>
        <div className="p-5">
          {dayRoutine.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-7 h-7" />}
              title="Your schedule is clear"
              description={`No activities planned for ${DAYS_FULL[selectedDay]}. Add your first one to get started.`}
              action={
                <Button onClick={openAdd}>
                  <Plus className="w-4 h-4" /> Add Activity
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {dayRoutine.map((item) => {
                const subject = getSubjectById(data.subjects, item.subjectId);
                const isDragging = dragId === item.id;
                const isDragOver = dragOverId === item.id;
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(item.id)}
                    onDragOver={(e) => handleDragOver(e, item.id)}
                    onDrop={() => handleDrop(item.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setDragOverId(null);
                    }}
                    className={`group flex items-stretch gap-3 rounded-xl border transition-all border-bg-surface hover:border-green-500 ${isDragging ? "opacity-40" : ""} ${isDragOver ? "ring-2 ring-brand-500" : ""}`}
                  >
                    <div className="hidden sm:flex items-center px-2 cursor-grab active:cursor-grabbing hover:text-fg-muted">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <div
                      className="w-1.5 rounded-l-xl shrink-0"
                      style={{
                        backgroundColor: item.isBreak
                          ? "rgb(var(--fg-subtle))"
                          : (subject?.color ?? "rgb(var(--brand-500))"),
                      }}
                    />

                    <Checkbox
                      id={`routine-${item.id}`}
                      variant="success"
                      checked={item.completed}
                      onCheckedChange={() => toggleRoutine(item.id)}
                      className="mt-3 shrink-0 text-white"
                      aria-label={
                        item.completed
                          ? `Mark "${item.title}" as incomplete`
                          : `Mark "${item.title}" as complete`
                      }
                    />

                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {item.isBreak && (
                              <Coffee className="w-4 h-4 text-fg-subtle shrink-0" />
                            )}
                            <PlayfulStrike
                              checked={item.completed}
                              htmlFor={`routine-${item.id}`}
                              className="min-w-0"
                              textClassName={`text-sm font-medium text-brand-600/85`}
                            >
                              {item.title}
                            </PlayfulStrike>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-bg-surface">
                              {formatTime(item.startTime)} —{" "}
                              {formatTime(item.endTime)}
                            </span>
                            <span className="text-xs text-bg-surface">|</span>
                            <span className="text-xs text-bg-surface">
                              {durationLabel(item.startTime, item.endTime)}
                            </span>
                            {!item.isBreak && (
                              <SubjectPill
                                subject={subject}
                                className="text-xs text-purple-500"
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button
                            type="button"
                            aria-label={`Edit ${item.title}`}
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded-lg hover:bg-brand-500/85 text-brand-500/85 hover:text-fg"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${item.title}`}
                            onClick={() => deleteRoutine(item.id)}
                            className="p-1.5 rounded-lg hover:bg-danger/10 text-warning hover:text-danger"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <AnimatePresence>
        {modalOpen && editing && (
          <RoutineModal
            routine={editing}
            subjects={data.subjects}
            onClose={() => {
              setModalOpen(false);
              setEditing(null);
            }}
            onSave={saveRoutine}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function RoutineModal({
  routine,
  subjects,
  onClose,
  onSave,
}: {
  routine: RoutineItem;
  subjects: { id: string; name: string; color: string }[];
  onClose: () => void;
  onSave: (r: RoutineItem) => void;
}) {
  const [form, setForm] = useState<RoutineItem>(routine);
  const error = !form.title.trim()
    ? "Title is required"
    : timeToMinutes(form.endTime) <= timeToMinutes(form.startTime)
      ? "End time must be after start time"
      : null;

  return (
    <Modal
      open
      onClose={onClose}
      onSave={() => !error && onSave(form)}
      title={routine.title ? "Edit Activity" : "New Activity"}
      description="Add a study session or break to your schedule."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => !error && onSave(form)} disabled={!!error}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Mathematics"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start time"
            type="time"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
          />
          <Input
            label="End time"
            type="time"
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
          />
        </div>
        <Select
          label="Subject"
          value={form.subjectId ?? ""}
          onChange={(e) =>
            setForm({ ...form, subjectId: e.target.value || null })
          }
        >
          <option value="">No subject</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select
          label="Day"
          value={form.day}
          onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}
        >
          {DAYS_FULL.map((d, i) => (
            <option key={i} value={i}>
              {d}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isBreak}
            onChange={(e) =>
              setForm({
                ...form,
                isBreak: e.target.checked,
                subjectId: e.target.checked ? null : form.subjectId,
              })
            }
            className="w-4 h-4 rounded accent-brand-500"
          />
          <span className="text-sm text-bg-surface">This is a break</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isStatic}
            onChange={(e) => setForm({ ...form, isStatic: e.target.checked })}
            className="w-4 h-4 rounded accent-brand-500"
          />
          <span className="text-sm text-bg-surface">
            Static (recurring daily routine)
          </span>
        </label>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
