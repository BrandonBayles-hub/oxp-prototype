"use client";

import { useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Pencil,
  Trash2,
  Plus,
  FileText,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { cn } from "@/lib/utils";
import { CreateCustomTaskDialog } from "@/components/create-custom-task-dialog";
import {
  getPlaybookTemplate,
  PLAYBOOK_CATEGORIES,
  PLAYBOOK_REPEATS_OPTIONS,
  PLAYBOOK_TEMPLATE_DUE_OPTIONS,
  type PlaybookTemplate,
  type PlaybookTemplateTask,
  type PlaybookTemplatePriority,
  type PlaybookTemplateRepeats,
} from "@/lib/playbook-templates-data";
import {
  SPECIALTIES,
  TIMEZONES,
  TIMEZONE_LABELS,
} from "@/lib/specialties-data";

// ── Sort helpers ─────────────────────────────────────────────────────────────

type SortDir = "asc" | "desc";

function toggleSort<K extends string>(
  current: { key: K; dir: SortDir } | null,
  key: K
): { key: K; dir: SortDir } {
  if (current?.key === key) {
    return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return { key, dir: "asc" };
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
  return dir === "asc" ? (
    <ChevronUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3" />
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value || "\u2014"}</p>
    </div>
  );
}

function formatStatDate(iso: string): string {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Time options ─────────────────────────────────────────────────────────────

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const suffix = h < 12 ? "AM" : "PM";
    const min = m === 0 ? "00" : "30";
    TIME_OPTIONS.push(`${hour12}:${min} ${suffix}`);
  }
}

const UNASSIGNED = "__unassigned__";

// ── Page ─────────────────────────────────────────────────────────────────────

export function PlaybookTemplateDetailClient() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const template = getPlaybookTemplate(params.id);

  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [category, setCategory] = useState(template?.category ?? PLAYBOOK_CATEGORIES[0]);
  const [repeats, setRepeats] = useState<PlaybookTemplateRepeats>(template?.repeats ?? "Never");
  const [onDate, setOnDate] = useState(template?.onDate ?? "");
  const [createTime, setCreateTime] = useState(template?.createTime ?? "7:00 AM");
  const [timezone, setTimezone] = useState(template?.timezone ?? "America/Los_Angeles");
  const [tasks, setTasks] = useState<PlaybookTemplateTask[]>(template?.tasks ?? []);

  const [showAddTask, setShowAddTask] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<PlaybookTemplateTask | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<PlaybookTemplateTask | null>(null);

  type TaskSortField = "name" | "description" | "dueOffset" | "priority" | "specialtyId";
  const [sort, setSort] = useState<{ key: TaskSortField; dir: SortDir } | null>(null);

  const sortedTasks = useMemo(() => {
    const list = [...tasks];
    if (!sort) return list;
    list.sort((a, b) => {
      const va = a[sort.key] ?? "";
      const vb = b[sort.key] ?? "";
      const cmp = va.localeCompare(vb);
      return sort.dir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [tasks, sort]);

  const handleAddTask = (task: PlaybookTemplateTask) => {
    setTasks((prev) => [...prev, task]);
  };

  const handleUpdateTask = (updated: PlaybookTemplateTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setTaskToEdit(null);
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setTaskToDelete(null);
  };

  const handlePriorityChange = (taskId: string, priority: PlaybookTemplatePriority) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority } : t)));
  };

  const handleSpecialtyChange = (taskId: string, specialtyId: string) => {
    const val = specialtyId === UNASSIGNED ? "" : specialtyId;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, specialtyId: val } : t)));
  };

  if (!template) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Playbook not found</p>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const labelClass = "text-xs font-medium text-foreground";
  const inputClass =
    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/escalations/settings")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-semibold text-foreground">
            {name || "Playbook Name"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Last Edited: {new Date(template.lastEdited).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            Generate Tasks
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowAddTask(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Tasks
          </Button>
        </div>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-3 px-6 py-4">
        <StatCard label="Last Launch" value={formatStatDate(template.stats.lastLaunch)} />
        <StatCard label="Next Launch" value={formatStatDate(template.stats.nextLaunch)} />
        <StatCard label="Playbook Launches" value={template.stats.launches} />
        <StatCard label="Active Plays" value={template.stats.activePlays} />
        <StatCard label="Active Tasks" value={template.stats.activeTasks} />
      </div>

      {/* Two-column body */}
      <div className="flex flex-1 gap-6 overflow-hidden px-6 pb-6">
        {/* Left: Playbook Details */}
        <div className="w-80 shrink-0 overflow-y-auto rounded-lg border border-border bg-background p-5">
          <h2 className="text-sm font-semibold text-foreground">Playbook Details</h2>

          {/* Source doc */}
          {template.sourceDoc && (
            <div className="mt-4 flex items-start gap-2.5 rounded-md border border-border px-3 py-2.5">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">
                  {template.sourceDoc.name} | {template.sourceDoc.type}
                </p>
                <p className="text-[10px] text-muted-foreground">{template.sourceDoc.date}</p>
              </div>
              <button className="text-xs font-medium text-primary hover:underline shrink-0">
                View
              </button>
            </div>
          )}

          {/* Name */}
          <div className="mt-4 space-y-1.5">
            <label className={labelClass}>
              <span className="text-destructive">*</span>Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Playbook Name"
              className={inputClass}
            />
          </div>

          {/* Description (TipTap) */}
          <div className="mt-4 space-y-1.5">
            <label className={labelClass}>Description</label>
            <RichTextEditor
              content={description}
              placeholder="I am your rich text editor."
              onChange={setDescription}
            />
          </div>

          {/* Category */}
          <div className="mt-4 space-y-1.5">
            <label className={labelClass}>
              <span className="text-destructive">*</span>Category
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {PLAYBOOK_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Repeats */}
          <div className="mt-4 space-y-1.5">
            <label className={labelClass}>
              <span className="text-destructive">*</span>Repeats
            </label>
            <Select value={repeats} onValueChange={(v) => setRepeats(v as PlaybookTemplateRepeats)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAYBOOK_REPEATS_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r} className="text-sm">
                    {r === "Never" ? "Does Not Repeat" : r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Schedule fields (visible when repeats !== Never) */}
          {repeats !== "Never" && (
            <>
              <div className="mt-4 space-y-1.5">
                <label className={labelClass}>
                  <span className="text-destructive">*</span>On Date
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={onDate}
                    onChange={(e) => setOnDate(e.target.value)}
                    placeholder="e.g. Oct 3"
                    className={cn(inputClass, "flex-1")}
                  />
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={labelClass}>
                    <span className="text-destructive">*</span>Creation Time
                  </label>
                  <Select value={createTime} onValueChange={setCreateTime}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>
                    <span className="text-destructive">*</span>Timezone
                  </label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz} className="text-sm">
                          {TIMEZONE_LABELS[tz] ?? tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Assignment Info */}
          <div className="mt-6 space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assignment Info</h3>
            <p className="text-xs text-muted-foreground">
              Tasks will be assigned based on specialty routing rules when the playbook is launched.
            </p>
          </div>
        </div>

        {/* Right: Tasks table */}
        <div className="flex-1 overflow-y-auto">
          <div className="rounded-lg border border-border overflow-x-auto scrollbar-hover">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th
                    className="sticky left-0 z-10 min-w-[180px] border-r border-border bg-muted cursor-pointer px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                    onClick={() => setSort(toggleSort(sort, "name"))}
                  >
                    Task Name <SortIcon active={sort?.key === "name"} dir={sort?.dir ?? "asc"} />
                  </th>
                  <th
                    className="min-w-[180px] cursor-pointer px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                    onClick={() => setSort(toggleSort(sort, "description"))}
                  >
                    Description <SortIcon active={sort?.key === "description"} dir={sort?.dir ?? "asc"} />
                  </th>
                  <th
                    className="min-w-[80px] cursor-pointer px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                    onClick={() => setSort(toggleSort(sort, "dueOffset"))}
                  >
                    Due <SortIcon active={sort?.key === "dueOffset"} dir={sort?.dir ?? "asc"} />
                  </th>
                  <th
                    className="min-w-[80px] cursor-pointer px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                    onClick={() => setSort(toggleSort(sort, "priority"))}
                  >
                    Priority <SortIcon active={sort?.key === "priority"} dir={sort?.dir ?? "asc"} />
                  </th>
                  <th
                    className="min-w-[150px] cursor-pointer px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                    onClick={() => setSort(toggleSort(sort, "specialtyId"))}
                  >
                    Specialty <SortIcon active={sort?.key === "specialtyId"} dir={sort?.dir ?? "asc"} />
                  </th>
                  <th className="w-20 min-w-[80px] px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {sortedTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="sticky left-0 z-10 min-w-[180px] border-r border-border bg-background px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">
                      {task.name}
                    </td>
                    <td className="min-w-[180px] px-4 py-3 text-sm text-muted-foreground max-w-[220px] truncate">
                      {task.description}
                    </td>
                    <td className="min-w-[80px] px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {task.dueOffset}
                    </td>
                    <td className="min-w-[80px] px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={task.priority}
                        onValueChange={(v) => handlePriorityChange(task.id, v as PlaybookTemplatePriority)}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-7 w-16 text-xs font-medium border-0 shadow-none rounded-md",
                            task.priority === "P0"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                              : task.priority === "P1"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                                : task.priority === "P2"
                                  ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200"
                                  : "bg-muted text-muted-foreground"
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="P0" className="text-xs">P0</SelectItem>
                          <SelectItem value="P1" className="text-xs">P1</SelectItem>
                          <SelectItem value="P2" className="text-xs">P2</SelectItem>
                          <SelectItem value="P3" className="text-xs">P3</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="min-w-[150px] px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={task.specialtyId || UNASSIGNED}
                        onValueChange={(v) => handleSpecialtyChange(task.id, v)}
                      >
                        <SelectTrigger className="h-8 w-full text-xs border-0 shadow-none bg-muted/40">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED} className="text-xs text-muted-foreground">
                            Select
                          </SelectItem>
                          {SPECIALTIES.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="w-20 min-w-[80px] px-2 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setTaskToEdit(task)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setTaskToDelete(task)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No tasks yet. Click &ldquo;Add Tasks&rdquo; to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Task Dialog */}
      <AddTaskDialog
        open={showAddTask}
        onOpenChange={setShowAddTask}
        onSave={handleAddTask}
      />

      {/* Edit Task Dialog */}
      <CreateCustomTaskDialog
        open={taskToEdit !== null}
        onOpenChange={(open) => { if (!open) setTaskToEdit(null); }}
        mode="playbook"
        initialData={taskToEdit}
        onSave={(updated) => { handleUpdateTask(updated); setTaskToEdit(null); }}
      />

      {/* Delete Task Confirm */}
      <Dialog open={taskToDelete !== null} onOpenChange={(v) => { if (!v) setTaskToDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">{taskToDelete?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setTaskToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => taskToDelete && handleDeleteTask(taskToDelete.id)}
            >
              Delete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Add Task Dialog ──────────────────────────────────────────────────────────

function AddTaskDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: PlaybookTemplateTask) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueOffset, setDueOffset] = useState("1 Day");
  const [priority, setPriority] = useState<PlaybookTemplatePriority>("P2");
  const [specialtyId, setSpecialtyId] = useState("");

  const reset = () => {
    setName("");
    setDescription("");
    setDueOffset("1 Day");
    setPriority("P2");
    setSpecialtyId("");
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: `pbt-t-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      dueOffset,
      priority,
      specialtyId,
    });
    reset();
    onOpenChange(false);
  };

  const labelClass = "text-xs font-medium text-foreground";
  const inputClass =
    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
          <DialogDescription>
            Add a task to this playbook template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className={labelClass}>Task Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Submit Photos"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this task involves"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className={labelClass}>Due</label>
              <Select value={dueOffset} onValueChange={setDueOffset}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAYBOOK_TEMPLATE_DUE_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d} className="text-sm">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Priority</label>
              <Select value={priority} onValueChange={(v) => setPriority(v as PlaybookTemplatePriority)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P0" className="text-sm">P0 - Emergency</SelectItem>
                  <SelectItem value="P1" className="text-sm">P1 - High</SelectItem>
                  <SelectItem value="P2" className="text-sm">P2 - Medium</SelectItem>
                  <SelectItem value="P3" className="text-sm">P3 - Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Specialty</label>
              <Select value={specialtyId || UNASSIGNED} onValueChange={(v) => setSpecialtyId(v === UNASSIGNED ? "" : v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED} className="text-xs text-muted-foreground">
                    None
                  </SelectItem>
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-sm">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => { reset(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button size="sm" disabled={!name.trim()} onClick={handleSave}>
            Add Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

