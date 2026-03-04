"use client";

import { useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Pencil,
  Trash2,
  Plus,
  Sparkles,
  Info,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  FileText,
  Layers,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  getSpecialtyDetail,
  SYSTEM_TASK_CATALOG,
  PROPERTIES,
  DUE_IN_OPTIONS,
  TIMEZONES,
  TIMEZONE_LABELS,
  ALL_WEEKDAYS,
  type SpecialtyTask,
  type SpecialtyTaskRepeats,
  type SpecialtyTaskPriority,
  type Weekday,
  type SpecialtyTeammate,
  type SpecialtyAssignment,
  type AssignmentMode,
  type SmartDistributionConfig,
} from "@/lib/specialties-data";

// ── Sort helpers ────────────────────────────────────────────────────────────

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

const PRIORITY_RANK: Record<string, number> = { P1: 0, P2: 1, P3: 2 };

// ── Page ────────────────────────────────────────────────────────────────────

export function SpecialtyDetailClient() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const detail = getSpecialtyDetail(params.id);

  const [activeTab, setActiveTab] = useState<"tasks" | "teammates" | "assignment">("tasks");
  const [specialtyName, setSpecialtyName] = useState(detail?.specialty.name ?? "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const startEditingName = () => {
    setEditNameValue(specialtyName);
    setIsEditingName(true);
  };

  const commitName = () => {
    const trimmed = editNameValue.trim();
    if (trimmed) setSpecialtyName(trimmed);
    setIsEditingName(false);
  };

  const cancelEditingName = () => {
    setIsEditingName(false);
  };

  if (!detail) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Specialty not found</p>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/escalations/settings")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {isEditingName ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitName();
                  if (e.key === "Escape") cancelEditingName();
                }}
                autoFocus
                className="h-7 rounded-md border border-input bg-background px-2 text-sm font-heading font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-primary hover:text-primary"
                onClick={commitName}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="group flex items-center gap-1.5">
              <h1 className="text-sm font-heading font-semibold text-foreground">
                {specialtyName}
              </h1>
              <button
                onClick={startEditingName}
                className="text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-foreground transition-colors"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search"
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Tab triggers */}
          <div className="inline-flex h-8 items-center rounded-lg border border-border bg-muted p-0.5 text-xs">
            {(["tasks", "teammates", "assignment"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium capitalize transition-all",
                  activeTab === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "tasks" ? "Tasks" : tab === "teammates" ? "Teammates" : "Assignment"}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Specialty</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">{specialtyName}</span>? All task assignments and teammate associations for this specialty will be removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setShowDeleteConfirm(false);
                router.push("/escalations/settings");
              }}
            >
              Delete Specialty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {activeTab === "tasks" && <TasksTab tasks={detail.tasks} specialtyId={detail.specialty.id} />}
        {activeTab === "teammates" && <TeammatesTab teammates={detail.teammates} />}
        {activeTab === "assignment" && <AssignmentTab initial={detail.assignment} />}
      </div>
    </div>
  );
}

// ── Tasks Tab ───────────────────────────────────────────────────────────────

type TaskSortKey = "name" | "workflow" | "repeats" | "priority" | "dueIn";

const CADENCE_OPTIONS: { value: SpecialtyTaskRepeats; label: string }[] = [
  { value: "Never", label: "Does Not Repeat" },
  { value: "Daily", label: "Daily" },
  { value: "Weekly", label: "Weekly" },
  { value: "Monthly", label: "Monthly" },
];

const CUSTOM_WORKFLOWS = ["Custom", "Leasing", "Maintenance", "Renewals", "Compliance", "Accounting", "Document Approval", "Trainings & SOP"];

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

type CadenceState = {
  cadence: SpecialtyTaskRepeats;
  weekDays: Weekday[];
  monthDay: number;
  createTime: string;
  timezone: string;
};

function CadenceScheduler({
  value,
  onChange,
  labelClass,
}: {
  value: CadenceState;
  onChange: (next: CadenceState) => void;
  labelClass: string;
}) {
  const update = (patch: Partial<CadenceState>) => onChange({ ...value, ...patch });

  const toggleDay = (day: Weekday) => {
    const next = value.weekDays.includes(day)
      ? value.weekDays.filter((d) => d !== day)
      : [...value.weekDays, day];
    update({ weekDays: next.length > 0 ? next : [day] });
  };

  return (
    <div className="space-y-3">
      {/* Cadence select */}
      <div className="space-y-1.5">
        <label className={labelClass}>Cadence</label>
        <Select
          value={value.cadence}
          onValueChange={(v) => {
            const c = v as SpecialtyTaskRepeats;
            const patch: Partial<CadenceState> = { cadence: c };
            if (c === "Weekly" && value.weekDays.length === 0) patch.weekDays = ["Mon"];
            if (c === "Monthly" && !value.monthDay) patch.monthDay = 1;
            update(patch);
          }}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CADENCE_OPTIONS.map((c) => (
              <SelectItem key={c.value} value={c.value} className="text-sm">
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Weekly: day picker */}
      {value.cadence === "Weekly" && (
        <div className="space-y-1.5">
          <label className={labelClass}>Repeat On</label>
          <div className="flex gap-1">
            {ALL_WEEKDAYS.map((day) => {
              const active = value.weekDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "flex h-8 w-10 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly: day of month */}
      {value.cadence === "Monthly" && (
        <div className="space-y-1.5">
          <label className={labelClass}>Day of Month</label>
          <Select
            value={String(value.monthDay || 1)}
            onValueChange={(v) => update({ monthDay: parseInt(v) })}
          >
            <SelectTrigger className="h-9 w-24 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_DAYS.map((d) => (
                <SelectItem key={d} value={String(d)} className="text-sm">
                  {d}{d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Creation time + timezone (shown for any repeating cadence) */}
      {value.cadence !== "Never" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelClass}>Created At</label>
            <input
              type="time"
              value={value.createTime}
              onChange={(e) => update({ createTime: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Timezone</label>
            <Select value={value.timezone} onValueChange={(v) => update({ timezone: v })}>
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
      )}
    </div>
  );
}

function TasksTab({ tasks: initialTasks, specialtyId }: { tasks: SpecialtyTask[]; specialtyId: string }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [taskFilter, setTaskFilter] = useState("All Tasks");
  const [workflowFilter, setWorkflowFilter] = useState("All Workflows");
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<{ key: TaskSortKey; dir: SortDir } | null>(null);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSystemDialog, setShowSystemDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<SpecialtyTask | null>(null);
  const [taskToRemove, setTaskToRemove] = useState<SpecialtyTask | null>(null);

  const workflows = useMemo(() => {
    const set = new Set(tasks.map((t) => t.workflow));
    return ["All Workflows", ...Array.from(set).sort()];
  }, [tasks]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = tasks.filter((t) => {
      if (workflowFilter !== "All Workflows" && t.workflow !== workflowFilter) return false;
      if (q && !t.name.toLowerCase().includes(q) && !t.workflow.toLowerCase().includes(q))
        return false;
      return true;
    });

    if (sort) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        switch (sort.key) {
          case "name":
            cmp = a.name.localeCompare(b.name);
            break;
          case "workflow":
            cmp = a.workflow.localeCompare(b.workflow);
            break;
          case "repeats":
            cmp = a.repeats.localeCompare(b.repeats);
            break;
          case "priority":
            cmp = (PRIORITY_RANK[a.priority] ?? 0) - (PRIORITY_RANK[b.priority] ?? 0);
            break;
          case "dueIn":
            cmp = a.dueIn.localeCompare(b.dueIn);
            break;
        }
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [tasks, workflowFilter, searchQuery, sort]);

  const handlePriorityChange = (taskId: string, priority: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, priority: priority as SpecialtyTask["priority"] } : t
      )
    );
  };

  const handleAddCustomTask = (task: SpecialtyTask) => {
    setTasks((prev) => [...prev, task]);
  };

  const handleAddSystemTasks = (newTasks: SpecialtyTask[]) => {
    setTasks((prev) => {
      const existingNames = new Set(prev.map((t) => t.name));
      const toAdd = newTasks.filter((t) => !existingNames.has(t.name));
      return [...prev, ...toAdd];
    });
  };

  const handleEditTask = (updated: SpecialtyTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleRemoveTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setTaskToRemove(null);
  };

  const thClass =
    "px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors";

  return (
    <>
      <h2 className="text-base font-semibold text-foreground">Specialty Tasks</h2>

      {/* Toolbar */}
      <div className="mt-4 flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Add Task
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem
              className="gap-2 text-xs cursor-pointer"
              onClick={() => setShowCreateDialog(true)}
            >
              <FileText className="h-3.5 w-3.5" />
              Create New Task
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 text-xs cursor-pointer"
              onClick={() => setShowSystemDialog(true)}
            >
              <Layers className="h-3.5 w-3.5" />
              Add System Tasks
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Select value={taskFilter} onValueChange={setTaskFilter}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All Tasks" className="text-xs">All Tasks</SelectItem>
          </SelectContent>
        </Select>

        <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {workflows.map((w) => (
              <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto relative w-56">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Tasks, workflows"
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className={thClass} onClick={() => setSort(toggleSort(sort, "name"))}>
                Task <SortIcon active={sort?.key === "name"} dir={sort?.dir ?? "asc"} />
              </th>
              <th className={thClass} onClick={() => setSort(toggleSort(sort, "workflow"))}>
                Workflow <SortIcon active={sort?.key === "workflow"} dir={sort?.dir ?? "asc"} />
              </th>
              <th className={thClass} onClick={() => setSort(toggleSort(sort, "repeats"))}>
                Repeats <SortIcon active={sort?.key === "repeats"} dir={sort?.dir ?? "asc"} />
              </th>
              <th className={thClass} onClick={() => setSort(toggleSort(sort, "priority"))}>
                Due <SortIcon active={sort?.key === "priority"} dir={sort?.dir ?? "asc"} />
              </th>
              <th className={thClass} onClick={() => setSort(toggleSort(sort, "dueIn"))}>
                Due <SortIcon active={sort?.key === "dueIn"} dir={sort?.dir ?? "asc"} />
              </th>
              <th className="w-10 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((task) => (
              <tr
                key={task.id}
                className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
              >
                <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">
                  {task.name}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                  {task.workflow}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                  {task.repeats}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={task.priority}
                    onValueChange={(v) => handlePriorityChange(task.id, v)}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-7 w-16 text-xs font-medium border-0 shadow-none rounded-md",
                        task.priority === "P1"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                          : task.priority === "P2"
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P1" className="text-xs">P1</SelectItem>
                      <SelectItem value="P2" className="text-xs">P2</SelectItem>
                      <SelectItem value="P3" className="text-xs">P3</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                  {task.dueIn}
                </td>
                <td className="px-2 py-3 text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditingTask(task)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setTaskToRemove(task)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No tasks match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create New Task Dialog */}
      <CreateNewTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        specialtyId={specialtyId}
        onSave={handleAddCustomTask}
      />

      {/* Add System Tasks Dialog */}
      <AddSystemTasksDialog
        open={showSystemDialog}
        onOpenChange={setShowSystemDialog}
        specialtyId={specialtyId}
        existingTaskNames={new Set(tasks.map((t) => t.name))}
        onAdd={handleAddSystemTasks}
      />

      {/* Edit Task Dialog */}
      <EditTaskDialog
        task={editingTask}
        onOpenChange={(open) => { if (!open) setEditingTask(null); }}
        onSave={(updated) => { handleEditTask(updated); setEditingTask(null); }}
      />

      {/* Remove Task Confirmation */}
      <Dialog open={taskToRemove !== null} onOpenChange={(v) => { if (!v) setTaskToRemove(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {taskToRemove?.source === "custom" ? "Delete Task" : "Remove Task"}
            </DialogTitle>
            <DialogDescription>
              {taskToRemove?.source === "custom" ? (
                <>Are you sure you want to delete <span className="font-medium text-foreground">{taskToRemove?.name}</span>? This custom task will be permanently removed.</>
              ) : (
                <>Are you sure you want to remove <span className="font-medium text-foreground">{taskToRemove?.name}</span> from this specialty? The system task will still be available to add back later.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setTaskToRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => taskToRemove && handleRemoveTask(taskToRemove.id)}
            >
              {taskToRemove?.source === "custom" ? "Delete Task" : "Remove Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Edit Task Dialog ────────────────────────────────────────────────────────

function EditTaskDialog({
  task,
  onOpenChange,
  onSave,
}: {
  task: SpecialtyTask | null;
  onOpenChange: (open: boolean) => void;
  onSave: (task: SpecialtyTask) => void;
}) {
  const [name, setName] = useState("");
  const [workflow, setWorkflow] = useState("Custom");
  const [schedule, setSchedule] = useState<CadenceState>({
    cadence: "Never",
    weekDays: ["Mon"],
    monthDay: 1,
    createTime: "09:00",
    timezone: "America/Denver",
  });
  const [priority, setPriority] = useState<SpecialtyTaskPriority>("P2");
  const [dueIn, setDueIn] = useState("1 Day");
  const [assignee, setAssignee] = useState("");
  const [property, setProperty] = useState("");

  const isOpen = task !== null;
  const isCustom = task?.source === "custom";

  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (task && task.id !== loadedId) {
    setLoadedId(task.id);
    setName(task.name);
    setWorkflow(task.workflow);
    setSchedule({
      cadence: task.repeats,
      weekDays: task.weekDays ?? ["Mon"],
      monthDay: task.monthDay ?? 1,
      createTime: task.createTime ?? "09:00",
      timezone: task.timezone ?? "America/Denver",
    });
    setPriority(task.priority);
    setDueIn(task.dueIn);
    setAssignee(task.assignee ?? "");
    setProperty(task.property ?? "");
  }

  const handleSave = () => {
    if (!task) return;
    if (isCustom && !name.trim()) return;
    const scheduling: Partial<SpecialtyTask> = schedule.cadence !== "Never"
      ? {
          createTime: schedule.createTime,
          timezone: schedule.timezone,
          ...(schedule.cadence === "Weekly" ? { weekDays: schedule.weekDays } : {}),
          ...(schedule.cadence === "Monthly" ? { monthDay: schedule.monthDay } : {}),
        }
      : { weekDays: undefined, monthDay: undefined, createTime: undefined, timezone: undefined };

    onSave({
      ...task,
      ...(isCustom
        ? {
            name: name.trim(),
            workflow,
            repeats: schedule.cadence,
            assignee: assignee || undefined,
            property: property || undefined,
          }
        : {}),
      priority,
      dueIn,
      ...scheduling,
    });
  };

  const handleClose = () => {
    setLoadedId(null);
    onOpenChange(false);
  };

  const labelClass = "text-xs font-medium text-foreground";
  const inputClass =
    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCustom ? "Edit Task" : "Edit System Task"}
          </DialogTitle>
          <DialogDescription>
            {isCustom
              ? "Update any field on this custom task."
              : "System tasks are managed by Entrata. You can adjust the priority and due date for this specialty."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isCustom ? (
            <>
              {/* Task Name */}
              <div className="space-y-1.5">
                <label className={labelClass}>Task Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Workflow */}
              <div className="space-y-1.5">
                <label className={labelClass}>Workflow</label>
                <Select value={workflow} onValueChange={setWorkflow}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOM_WORKFLOWS.map((w) => (
                      <SelectItem key={w} value={w} className="text-sm">{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cadence + scheduling */}
              <CadenceScheduler value={schedule} onChange={setSchedule} labelClass={labelClass} />
            </>
          ) : (
            <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
              <p className="text-sm font-medium text-foreground">{task?.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{task?.workflow} &middot; {task?.repeats === "Never" ? "Does not repeat" : task?.repeats}</p>
            </div>
          )}

          {/* Priority + Due In */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelClass}>Priority</label>
              <Select value={priority} onValueChange={(v) => setPriority(v as SpecialtyTaskPriority)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P1" className="text-sm">P1 - Critical</SelectItem>
                  <SelectItem value="P2" className="text-sm">P2 - High</SelectItem>
                  <SelectItem value="P3" className="text-sm">P3 - Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Due In</label>
              <Select value={dueIn} onValueChange={setDueIn}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DUE_IN_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d} className="text-sm">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isCustom && (
            <>
              {/* Assignee */}
              <div className="space-y-1.5">
                <label className={labelClass}>Assignee <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="Leave blank for automatic assignment"
                  className={inputClass}
                />
              </div>

              {/* Property */}
              <div className="space-y-1.5">
                <label className={labelClass}>Property <span className="text-muted-foreground font-normal">(optional)</span></label>
                <Select value={property || "__none__"} onValueChange={(v) => setProperty(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Properties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-sm">All Properties</SelectItem>
                    {PROPERTIES.map((p) => (
                      <SelectItem key={p} value={p} className="text-sm">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={isCustom && !name.trim()} onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create New Task Dialog ──────────────────────────────────────────────────

function CreateNewTaskDialog({
  open,
  onOpenChange,
  specialtyId,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specialtyId: string;
  onSave: (task: SpecialtyTask) => void;
}) {
  const [name, setName] = useState("");
  const [workflow, setWorkflow] = useState("Custom");
  const [schedule, setSchedule] = useState<CadenceState>({
    cadence: "Never",
    weekDays: ["Mon"],
    monthDay: 1,
    createTime: "09:00",
    timezone: "America/Denver",
  });
  const [priority, setPriority] = useState<SpecialtyTaskPriority>("P2");
  const [dueIn, setDueIn] = useState("1 Day");
  const [assignee, setAssignee] = useState("");
  const [property, setProperty] = useState("");

  const reset = () => {
    setName("");
    setWorkflow("Custom");
    setSchedule({ cadence: "Never", weekDays: ["Mon"], monthDay: 1, createTime: "09:00", timezone: "America/Denver" });
    setPriority("P2");
    setDueIn("1 Day");
    setAssignee("");
    setProperty("");
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const scheduling: Partial<SpecialtyTask> = schedule.cadence !== "Never"
      ? {
          createTime: schedule.createTime,
          timezone: schedule.timezone,
          ...(schedule.cadence === "Weekly" ? { weekDays: schedule.weekDays } : {}),
          ...(schedule.cadence === "Monthly" ? { monthDay: schedule.monthDay } : {}),
        }
      : {};

    onSave({
      id: `st-custom-${Date.now()}`,
      name: name.trim(),
      workflow,
      specialtyId,
      repeats: schedule.cadence,
      priority,
      dueIn,
      source: "custom",
      assignee: assignee || undefined,
      property: property || undefined,
      ...scheduling,
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
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Create a custom task that will live within this specialty.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Task Name */}
          <div className="space-y-1.5">
            <label className={labelClass}>Task Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekly Lead Cleanup"
              className={inputClass}
            />
          </div>

          {/* Workflow */}
          <div className="space-y-1.5">
            <label className={labelClass}>Workflow</label>
            <Select value={workflow} onValueChange={setWorkflow}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTOM_WORKFLOWS.map((w) => (
                  <SelectItem key={w} value={w} className="text-sm">{w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cadence + scheduling */}
          <CadenceScheduler value={schedule} onChange={setSchedule} labelClass={labelClass} />

          {/* Priority + Due In (side by side) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelClass}>Priority</label>
              <Select value={priority} onValueChange={(v) => setPriority(v as SpecialtyTaskPriority)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P1" className="text-sm">P1 - Critical</SelectItem>
                  <SelectItem value="P2" className="text-sm">P2 - High</SelectItem>
                  <SelectItem value="P3" className="text-sm">P3 - Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Due In</label>
              <Select value={dueIn} onValueChange={setDueIn}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DUE_IN_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d} className="text-sm">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <label className={labelClass}>Assignee <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Leave blank for automatic assignment"
              className={inputClass}
            />
          </div>

          {/* Property */}
          <div className="space-y-1.5">
            <label className={labelClass}>Property <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Select value={property || "__none__"} onValueChange={(v) => setProperty(v === "__none__" ? "" : v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-sm">All Properties</SelectItem>
                {PROPERTIES.map((p) => (
                  <SelectItem key={p} value={p} className="text-sm">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => { reset(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button size="sm" disabled={!name.trim()} onClick={handleSave}>
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add System Tasks Dialog ─────────────────────────────────────────────────

function AddSystemTasksDialog({
  open,
  onOpenChange,
  specialtyId,
  existingTaskNames,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specialtyId: string;
  existingTaskNames: Set<string>;
  onAdd: (tasks: SpecialtyTask[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState("All Workflows");

  const catalogWorkflows = useMemo(() => {
    const set = new Set(SYSTEM_TASK_CATALOG.map((t) => t.workflow));
    return ["All Workflows", ...Array.from(set).sort()];
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return SYSTEM_TASK_CATALOG.filter((t) => {
      if (workflowFilter !== "All Workflows" && t.workflow !== workflowFilter) return false;
      if (q && !t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [searchQuery, workflowFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      const arr = map.get(t.workflow) ?? [];
      arr.push(t);
      map.set(t.workflow, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggleTask = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const newTasks: SpecialtyTask[] = SYSTEM_TASK_CATALOG
      .filter((t) => selected.has(t.id))
      .map((t) => ({
        id: `st-sys-${t.id}-${Date.now()}`,
        name: t.name,
        workflow: t.workflow,
        specialtyId,
        repeats: "Never" as const,
        priority: "P2" as const,
        dueIn: "1 Day",
        source: "system" as const,
      }));
    onAdd(newTasks);
    setSelected(new Set());
    setSearchQuery("");
    setWorkflowFilter("All Workflows");
    onOpenChange(false);
  };

  const reset = () => {
    setSelected(new Set());
    setSearchQuery("");
    setWorkflowFilter("All Workflows");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add System Tasks</DialogTitle>
          <DialogDescription>
            Select tasks from Entrata to add to this specialty. These define which system tasks route to this team.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {catalogWorkflows.map((w) => (
                <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6 min-h-0">
          <div className="space-y-4 py-2">
            {grouped.map(([workflow, items]) => (
              <div key={workflow}>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  {workflow}
                </p>
                <div className="space-y-1">
                  {items.map((task) => {
                    const isSelected = selected.has(task.id);
                    const alreadyAdded = existingTaskNames.has(task.name);
                    return (
                      <button
                        key={task.id}
                        disabled={alreadyAdded}
                        onClick={() => toggleTask(task.id)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-all",
                          alreadyAdded
                            ? "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                            : isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-muted-foreground/30"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            alreadyAdded
                              ? "border-muted-foreground/30 bg-muted"
                              : isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input"
                          )}
                        >
                          {(isSelected || alreadyAdded) && <Check className="h-3 w-3" />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {task.name}
                            {alreadyAdded && (
                              <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                                Already added
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                            {task.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {grouped.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No system tasks match the current filters.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-4 -mx-6 px-6">
          <div className="flex w-full items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {selected.size} task{selected.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { reset(); onOpenChange(false); }}>
                Cancel
              </Button>
              <Button size="sm" disabled={selected.size === 0} onClick={handleAdd}>
                Add {selected.size > 0 ? selected.size : ""} Task{selected.size !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Teammates Tab ───────────────────────────────────────────────────────────

type TeammateSortKey = "name" | "permission" | "property";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function TeammatesTab({ teammates: initialTeammates }: { teammates: SpecialtyTeammate[] }) {
  const [teammates, setTeammates] = useState(initialTeammates);
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<{ key: TeammateSortKey; dir: SortDir } | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = teammates.filter((t) => {
      if (
        q &&
        !t.name.toLowerCase().includes(q) &&
        !t.properties.some((p) => p.toLowerCase().includes(q))
      )
        return false;
      return true;
    });

    if (sort) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        switch (sort.key) {
          case "name":
            cmp = a.name.localeCompare(b.name);
            break;
          case "permission":
            cmp = a.permission.localeCompare(b.permission);
            break;
          case "property":
            cmp = a.properties.join(", ").localeCompare(b.properties.join(", "));
            break;
        }
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [teammates, searchQuery, sort]);

  const handleRemove = (id: string) => {
    setTeammates((prev) => prev.filter((t) => t.id !== id));
  };

  const thClass =
    "px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors";

  return (
    <>
      <h2 className="text-base font-semibold text-foreground">Teammates</h2>

      {/* Toolbar */}
      <div className="mt-4 flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Add Teammate
        </Button>

        <div className="ml-auto relative w-56">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Teammates"
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className={thClass} onClick={() => setSort(toggleSort(sort, "name"))}>
                Name <SortIcon active={sort?.key === "name"} dir={sort?.dir ?? "asc"} />
              </th>
              <th className={thClass} onClick={() => setSort(toggleSort(sort, "permission"))}>
                Permission{" "}
                <SortIcon active={sort?.key === "permission"} dir={sort?.dir ?? "asc"} />
              </th>
              <th className={thClass} onClick={() => setSort(toggleSort(sort, "property"))}>
                Property <SortIcon active={sort?.key === "property"} dir={sort?.dir ?? "asc"} />
              </th>
              <th className="w-10 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((tm) => (
              <tr
                key={tm.id}
                className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs font-medium">
                        {getInitials(tm.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">{tm.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{tm.permission}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {tm.properties.join(", ")}
                </td>
                <td className="px-2 py-3 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(tm.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No teammates match the current search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Assignment Tab ──────────────────────────────────────────────────────────

const ASSIGNMENT_MODES: {
  value: AssignmentMode;
  label: string;
  icon?: React.ReactNode;
  description: string;
}[] = [
  {
    value: "smart",
    label: "Smart Distribution",
    icon: <Sparkles className="h-4 w-4" />,
    description:
      "Smart distribution is logic that determines when a task should be reassigned to another user based on that user\u2019s availability and capacity.",
  },
  {
    value: "round-robin",
    label: "Round Robin",
    description:
      "Automatically cycles tasks through a list of eligible users. The system remembers who was assigned last for that property, passing the next task to the following user.",
  },
  {
    value: "group",
    label: "Group Assignment",
    description:
      "All users associated with this team will be considered assigned to a task, and able to perform that task.",
  },
  {
    value: "manual",
    label: "Manual Assignment",
    description: "Admins and managers can manually assign tasks to team members.",
  },
];

function AssignmentTab({ initial }: { initial: SpecialtyAssignment }) {
  const [mode, setMode] = useState<AssignmentMode>(initial.mode);
  const [config, setConfig] = useState<SmartDistributionConfig>(initial.smartConfig);

  const updateConfig = (updates: Partial<SmartDistributionConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  return (
    <>
      <h2 className="text-base font-semibold text-foreground">Skills Based Routing</h2>

      {/* Mode cards */}
      <div className="mt-5 grid grid-cols-4 gap-3">
        {ASSIGNMENT_MODES.map((m) => {
          const selected = mode === m.value;
          return (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={cn(
                "rounded-lg border p-4 text-left transition-all",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-muted-foreground/30"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border",
                    selected ? "border-primary" : "border-muted-foreground/40"
                  )}
                >
                  {selected && (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </span>
                <span className="flex items-center gap-1.5">
                  {m.icon && selected && m.icon}
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      selected ? "text-primary" : "text-foreground"
                    )}
                  >
                    {m.label}
                  </span>
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {m.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Smart Distribution Logic */}
      {mode === "smart" && (
        <div className="mt-8">
          <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
            Smart Distribution Logic
          </p>

          <div className="mt-4 space-y-5">
            {/* 1. Max tasks */}
            <div className="flex items-center gap-3">
              <Switch
                checked={config.maxTasks > 0}
                onCheckedChange={(checked) =>
                  updateConfig({ maxTasks: checked ? 20 : 0 })
                }
              />
              <span className="text-sm text-foreground">
                Assign no more than{" "}
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={config.maxTasks}
                  onChange={(e) =>
                    updateConfig({ maxTasks: parseInt(e.target.value) || 0 })
                  }
                  className="mx-1 inline-block h-7 w-14 rounded-md border border-input bg-background px-2 text-center text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />{" "}
                Tasks from this team to any given individual at a time
              </span>
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </div>

            {/* 2. Only active users */}
            <div className="flex items-center gap-3">
              <Switch
                checked={config.onlyActiveUsers}
                onCheckedChange={(checked) =>
                  updateConfig({ onlyActiveUsers: checked })
                }
              />
              <span className="text-sm text-foreground">
                Only assign tasks to users that are logged in (Active)
              </span>
            </div>

            {/* 3. Reassign to idle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={config.reassignToIdle}
                onCheckedChange={(checked) =>
                  updateConfig({ reassignToIdle: checked })
                }
              />
              <span className="text-sm text-foreground">
                If an active Team Member has no tasks, reassign tasks currently held by others to that Teammember.
              </span>
            </div>

            {/* 4. Priority preemption */}
            <div className="flex items-center gap-3">
              <Switch
                checked={config.priorityPreemption}
                onCheckedChange={(checked) =>
                  updateConfig({ priorityPreemption: checked })
                }
              />
              <span className="flex items-center gap-1 text-sm text-foreground">
                If a task is created with a priority of
                <Select
                  value={config.priorityThreshold}
                  onValueChange={(v) =>
                    updateConfig({
                      priorityThreshold: v as SmartDistributionConfig["priorityThreshold"],
                    })
                  }
                >
                  <SelectTrigger className="mx-1 h-7 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P1 and Above" className="text-xs">
                      P1 and Above
                    </SelectItem>
                    <SelectItem value="P2 and Above" className="text-xs">
                      P2 and Above
                    </SelectItem>
                    <SelectItem value="P3 and Above" className="text-xs">
                      P3 and Above
                    </SelectItem>
                  </SelectContent>
                </Select>
                reassign tasks with lower priorities to make room
              </span>
            </div>

            {/* 5. Reassign after timeout */}
            <div className="flex items-center gap-3">
              <Switch
                checked={config.reassignAfterTimeout}
                onCheckedChange={(checked) =>
                  updateConfig({ reassignAfterTimeout: checked })
                }
              />
              <span className="flex items-center gap-1 text-sm text-foreground">
                Reassign tasks from this team after
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={config.reassignTimeoutValue}
                  onChange={(e) =>
                    updateConfig({
                      reassignTimeoutValue: parseInt(e.target.value) || 1,
                    })
                  }
                  className="mx-1 inline-block h-7 w-14 rounded-md border border-input bg-background px-2 text-center text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Select
                  value={config.reassignTimeoutUnit}
                  onValueChange={(v) =>
                    updateConfig({
                      reassignTimeoutUnit: v as SmartDistributionConfig["reassignTimeoutUnit"],
                    })
                  }
                >
                  <SelectTrigger className="mx-1 h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hour(s)" className="text-xs">
                      Hour(s)
                    </SelectItem>
                    <SelectItem value="Day(s)" className="text-xs">
                      Day(s)
                    </SelectItem>
                    <SelectItem value="Week(s)" className="text-xs">
                      Week(s)
                    </SelectItem>
                  </SelectContent>
                </Select>
                If the status has not been updated
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
