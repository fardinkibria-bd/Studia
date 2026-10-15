import { useState, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Pencil,
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
} from "lucide-react";
import { useStore, uid } from "@/store/StoreContext";
import { useToast } from "@/store/ToastContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Feedback";
import { SubjectPill } from "@/components/ui/Subject";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  PlayfulTodolist,
  type PlayfulTodolistItem,
} from "@/components/animate-ui/components/community/playful-todolist";
import {
  relativeDue,
  daysUntil,
  formatDateLong,
  getSubjectById,
  todayISO,
} from "@/lib/utils";
import type { Exam } from "@/types";

export default function Exams() {
  const { data, update } = useStore();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");

  const filtered = useMemo(() => {
    return data.exams
      .filter((e) => {
        if (filter === "all") return true;
        if (filter === "upcoming") return daysUntil(e.date) >= 0;
        if (filter === "past") return daysUntil(e.date) < 0;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data.exams, filter]);

  const deleteExam = (id: string) => {
    update((d) => {
      d.exams = d.exams.filter((e) => e.id !== id);
    });
    toast("Exam deleted", "info");
    setDeleteTarget(null);
  };

  const toggleComplete = (id: string) => {
    update((d) => {
      const e = d.exams.find((x) => x.id === id);
      if (e) {
        e.completed = !e.completed;
        if (e.completed) toast("Exam marked as done", "success");
      }
    });
  };

  const saveExam = (e: Exam) => {
    update((d) => {
      const idx = d.exams.findIndex((x) => x.id === e.id);
      if (idx >= 0) d.exams[idx] = e;
      else d.exams.push(e);
    });
    toast(editing ? "Exam updated" : "Exam added", "success");
    setModalOpen(false);
    setEditing(null);
  };

  const openAdd = () => {
    setEditing({
      id: uid(),
      title: "",
      subjectId: data.subjects[0]?.id ?? null,
      date: todayISO(),
      time: "",
    });
    setModalOpen(true);
  };

  const upcoming = data.exams.filter((e) => daysUntil(e.date) >= 0).length;
  const past = data.exams.filter((e) => daysUntil(e.date) < 0).length;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl lg:text-3xl font-title font-bold tracking-tight">
            Exams
          </h2>
          <p className="text-bg-surface text-sm mt-1">
            Track upcoming exams and stay prepared.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4" /> Add Exam
        </Button>
      </div>

      {/* Two-column layout: Main content LEFT, Summary rail RIGHT */}
      <div className="flex flex-col md:flex-row items-start gap-4 lg:gap-6">
        {/* Main Exams Container */}
        <div className="w-full md:flex-1 min-w-0 space-y-4 lg:space-y-6">
          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: "all", label: "All" },
              { id: "upcoming", label: "Upcoming" },
              { id: "past", label: "Past" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as "all" | "upcoming" | "past")}
                className={`shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f.id ? "bg-brand-500 text-white" : "bg-bg-surface border border-border-default text-fg-muted hover:text-fg"}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Exam list */}
          <Card>
            <div className="p-5">
              {filtered.length === 0 ? (
                <EmptyState
                  icon={<GraduationCap className="w-7 h-7" />}
                  title="No exams yet"
                  description="Add your first exam to track important dates and stay prepared."
                  action={
                    <Button onClick={openAdd}>
                      <Plus className="w-4 h-4" /> Add Exam
                    </Button>
                  }
                />
              ) : (
                <PlayfulTodolist
                  items={filtered.map((e): PlayfulTodolistItem => {
                    const subject = getSubjectById(data.subjects, e.subjectId);
                    const days = daysUntil(e.date);
                    const isPast = days < 0;
                    return {
                      id: e.id,
                      label: e.title,
                      checked: !!e.completed,
                      variant: "success",
                      labelClassName:
                        isPast || e.completed ? "text-brand-600/85" : "text-brand-600/85",
                      description: e.notes ? (
                        <p className="text-xs text-info line-clamp-2">
                          {e.notes}
                        </p>
                      ) : undefined,
                      meta: (
                        <>
                          <div
                            className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ${isPast ? "bg-blue-300 dark:bg-bg-muted" : "bg-danger/10"}`}
                          >
                            <span
                              className={`text-lg font-bold leading-none ${isPast ? "text-fg-subtle" : "text-danger"}`}
                            >
                              {Math.abs(days)}
                            </span>
                            <span
                              className={`text-[9px] uppercase ${isPast ? "text-fg-subtle" : "text-danger/70"}`}
                            >
                              {isPast ? "days ago" : "days"}
                            </span>
                          </div>
                          <SubjectPill
                            subject={subject}
                            className="text-xs text-purple-500"
                          />
                          <span className="flex items-center gap-1 text-xs text-bg-surface">
                            <Calendar className="w-3 h-3" />{" "}
                            {formatDateLong(e.date)}
                          </span>
                          {e.time && (
                            <span className="flex items-center gap-1 text-xs text-info">
                              <Clock className="w-3 h-3" /> {e.time}
                            </span>
                          )}
                          {e.location && (
                            <span className="flex items-center gap-1 text-xs text-green-700">
                              <MapPin className="w-3 h-3" /> {e.location}
                            </span>
                          )}
                          {!isPast && (
                            <Badge
                              variant={
                                days <= 3
                                  ? "danger"
                                  : days <= 7
                                    ? "warning"
                                    : "default"
                              }
                            >
                              {relativeDue(e.date)}
                            </Badge>
                          )}
                          {e.marks !== undefined && e.marks !== null && (
                            <span className="text-xs font-medium text-success">
                              Marks: {e.marks}
                            </span>
                          )}
                        </>
                      ),
                      actions: (
                        <>
                          <button
                            onClick={() => {
                              setEditing({ ...e });
                              setModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-brand-500 text-brand-600/85 hover:text-fg"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(e)}
                            className="p-1.5 rounded-lg hover:bg-danger/10 text-warning hover:text-danger"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ),
                    };
                  })}
                  onCheckedChange={toggleComplete}
                />
              )}
            </div>
          </Card>
        </div>

        {/* Summary Cards Rail */}
        <div className="w-full md:w-56 lg:w-64 xl:w-72 shrink-0 flex flex-col gap-3">
          {[
            {
              label: "Total Exams",
              value: data.exams.length,
              color: "text-warning",
            },
            { label: "Upcoming", value: upcoming, color: "text-info" },
            { label: "Past", value: past, color: "text-success" },
            {
              label: "Next Exam",
              value: upcoming > 0 ? "Soon" : "—",
              color: "text-danger",
            },
          ].map((s) => (
            <Card key={s.label}>
              <div className="p-4">
                <p className="text-xs text-bg-surface">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>
                  {s.value}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && editing && (
          <ExamModal
            exam={editing}
            subjects={data.subjects}
            onClose={() => {
              setModalOpen(false);
              setEditing(null);
            }}
            onSave={saveExam}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteExam(deleteTarget.id)}
        title="Delete exam?"
        description={`This will permanently remove "${deleteTarget?.title ?? "this exam"}" and its calendar entry. This cannot be undone.`}
        confirmLabel="Delete exam"
      />
    </div>
  );
}

function ExamModal({
  exam,
  subjects,
  onClose,
  onSave,
}: {
  exam: Exam;
  subjects: { id: string; name: string }[];
  onClose: () => void;
  onSave: (e: Exam) => void;
}) {
  const [form, setForm] = useState<Exam>(exam);
  const error = !form.title.trim() ? "Title is required" : null;

  return (
    <Modal
      open
      onClose={onClose}
      onSave={() => !error && onSave(form)}
      title={exam.title ? "Edit Exam" : "New Exam"}
      description="Schedule an upcoming exam."
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
          label="Exam title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Final Calculus Exam"
        />
        <div className="grid grid-cols-2 gap-3">
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
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Time (optional)"
            type="time"
            value={form.time ?? ""}
            onChange={(e) => setForm({ ...form, time: e.target.value || "" })}
          />
          <Input
            label="Location (optional)"
            value={form.location ?? ""}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="e.g. Hall A, Room 204"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Marks (optional)"
            type="number"
            min={0}
            value={form.marks ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                marks:
                  e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            placeholder="e.g. 85"
          />
          <label className="flex items-center gap-2.5 cursor-pointer self-end pb-2">
            <input
              type="checkbox"
              checked={form.completed ?? false}
              onChange={(e) =>
                setForm({ ...form, completed: e.target.checked })
              }
              className="w-4 h-4 rounded accent-brand-500"
            />
            <span className="text-sm text-fg-muted">Completed</span>
          </label>
        </div>
        <Textarea
          label="Notes (optional)"
          value={form.notes ?? ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
          placeholder="Any extra details..."
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
