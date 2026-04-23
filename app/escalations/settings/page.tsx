"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Pencil, Plus, Users, Sparkles, RotateCw, UsersRound, UserPen, Trash2, ArrowUpDown, ChevronUp, ChevronDown, MoveRight, FileText, BookOpen, Check, FolderOpen, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { CreateCustomTaskDialog } from "@/components/create-custom-task-dialog";
import { usePermissions } from "@/lib/permissions-context";
import { useWorkforce } from "@/lib/workforce-context";
import { useVault, type VaultItem } from "@/lib/vault-context";
import {
  SEED_PLAYBOOK_TEMPLATES,
  PLAYBOOK_CATEGORIES,
  PLAYBOOK_REPEATS_OPTIONS,
  PLAYBOOK_TEMPLATE_DUE_OPTIONS,
  type PlaybookTemplate,
  type PlaybookTemplateTask,
  type PlaybookTemplatePriority,
  type PlaybookTemplateType,
  type PlaybookTemplateVariety,
  type PlaybookTemplateRepeats,
} from "@/lib/playbook-templates-data";
import {
  SPECIALTIES,
  SEED_TASKS,
  SYSTEM_TASK_CATALOG,
  WORKFLOWS,
  PROPERTIES,
  DUE_IN_OPTIONS,
  TIMEZONES,
  TIMEZONE_LABELS,
  ALL_WEEKDAYS,
  getSpecialtyDetail,
  type TaskTemplate,
  type Specialty,
  type SpecialtyTaskRepeats,
  type SpecialtyTaskPriority,
  type AssignmentMode,
  type Weekday,
} from "@/lib/specialties-data";

// ── Sidebar nav items ──────────────────────────────────────────────────────

type NavSection = { label: string; items: { id: string; label: string }[] };

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Escalations",
    items: [
      { id: "escalation-tasks", label: "Escalation Tasks" },
      { id: "specialties", label: "Specialties" },
    ],
  },
  {
    label: "Playbooks",
    items: [
      { id: "playbook-library", label: "Playbook Library" },
    ],
  },
];

// ── Assignee combobox ───────────────────────────────────────────────────────

function AssigneeCombobox({
  members,
  value,
  onChange,
}: {
  members: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q));
  }, [members, query]);
  const selectedName = members.find((m) => m.id === value)?.name ?? "Unassigned";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>{selectedName}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0 z-[200]" align="start">
        <div className="p-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members…"
            className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>
        <div className="max-h-48 overflow-y-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted",
              !value && "bg-muted font-medium"
            )}
          >
            <Check className={cn("h-3.5 w-3.5 shrink-0", value ? "invisible" : "text-primary")} />
            <span className="text-muted-foreground">Unassigned</span>
          </button>
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onChange(m.id); setOpen(false); setQuery(""); }}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                value === m.id && "bg-muted font-medium"
              )}
            >
              <Check className={cn("h-3.5 w-3.5 shrink-0", value === m.id ? "text-primary" : "invisible")} />
              {m.name}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">No members found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Page component ─────────────────────────────────────────────────────────

export default function EscalationSettingsPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canAccess = hasPermission("p-tasks-edit-specialty");
  const [activeSection, setActiveSection] = useState("escalation-tasks");

  useEffect(() => {
    if (!canAccess) router.replace("/escalations");
  }, [canAccess, router]);

  if (!canAccess) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Access restricted</p>
        <p>Your role does not have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-background px-4 py-6">
        <button
          onClick={() => router.push("/escalations")}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </button>

        <nav className="space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveSection(item.id)}
                      className={cn(
                        "w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                        activeSection === item.id
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {activeSection === "escalation-tasks" && <EscalationTasksView />}
        {activeSection === "specialties" && <SpecialtiesView />}
        {activeSection === "playbook-library" && <PlaybookLibraryView />}
      </div>
    </div>
  );
}

// ── Escalation Tasks View ──────────────────────────────────────────────────

const UNASSIGNED = "__unassigned__";

function buildInitialTasks(): TaskTemplate[] {
  const assigned = [...SEED_TASKS];
  const assignedNames = new Set(assigned.filter((t) => t.system).map((t) => t.name));
  for (const cat of SYSTEM_TASK_CATALOG) {
    if (!assignedNames.has(cat.name)) {
      assigned.push({
        id: cat.id,
        name: cat.name,
        workflow: cat.workflow,
        specialtyId: "",
        description: cat.description,
        system: true,
      });
    }
  }
  return assigned;
}

const ALL_SPECIALTIES = "All Specialties";

function EscalationTasksView() {
  const [tasks, setTasks] = useState<TaskTemplate[]>(buildInitialTasks);
  const [workflowFilter, setWorkflowFilter] = useState("All Workflows");
  const [specialtyFilter, setSpecialtyFilter] = useState(ALL_SPECIALTIES);
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState("system");

  const tabTasks = useMemo(
    () => tasks.filter((t) => (tab === "system" ? t.system : !t.system)),
    [tasks, tab]
  );

  const workflowOptions = useMemo(() => {
    const set = new Set(tabTasks.map((t) => t.workflow));
    return ["All Workflows", ...Array.from(set).sort()];
  }, [tabTasks]);

  const specialtyOptions = useMemo(() => {
    const ids = new Set(tabTasks.map((t) => t.specialtyId));
    const hasUnassigned = ids.has("");
    const named = SPECIALTIES.filter((s) => ids.has(s.id));
    return { hasUnassigned, named };
  }, [tabTasks]);

  useEffect(() => {
    if (workflowFilter !== "All Workflows" && !workflowOptions.includes(workflowFilter)) {
      setWorkflowFilter("All Workflows");
    }
  }, [workflowFilter, workflowOptions]);

  useEffect(() => {
    if (
      specialtyFilter !== ALL_SPECIALTIES &&
      specialtyFilter !== UNASSIGNED &&
      !specialtyOptions.named.some((s) => s.id === specialtyFilter)
    ) {
      setSpecialtyFilter(ALL_SPECIALTIES);
    }
  }, [specialtyFilter, specialtyOptions]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return tabTasks.filter((t) => {
      if (workflowFilter !== "All Workflows" && t.workflow !== workflowFilter) return false;
      if (specialtyFilter === UNASSIGNED && t.specialtyId !== "") return false;
      if (specialtyFilter !== ALL_SPECIALTIES && specialtyFilter !== UNASSIGNED && t.specialtyId !== specialtyFilter) return false;
      if (q && !t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tabTasks, workflowFilter, specialtyFilter, searchQuery]);

  const handleSpecialtyChange = (taskId: string, specialtyId: string) => {
    const val = specialtyId === UNASSIGNED ? "" : specialtyId;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, specialtyId: val } : t)));
  };

  const handlePriorityChange = (taskId: string, priority: SpecialtyTaskPriority) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority } : t)));
  };

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskTemplate | null>(null);
  const [editingTask, setEditingTask] = useState<TaskTemplate | null>(null);
  const [editingSystemTask, setEditingSystemTask] = useState<TaskTemplate | null>(null);
  const [systemEditPriority, setSystemEditPriority] = useState<SpecialtyTaskPriority>("P2");
  const [systemEditSpecialty, setSystemEditSpecialty] = useState("");

  const handleAddCustomTask = (task: TaskTemplate) => {
    setTasks((prev) => [...prev, task]);
  };

  const handleEditTask = (updated: TaskTemplate) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setTaskToDelete(null);
  };

  return (
    <>
      <h1 className="text-xl font-semibold text-foreground">Escalation Tasks</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Define the tasks that require human attention. System tasks originate from Entrata workflows; custom tasks are created by your team.
      </p>

      {/* Toolbar */}
      <div className="mt-5 flex items-center gap-2">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-8">
            <TabsTrigger value="system" className="text-xs px-3 py-1">System Tasks</TabsTrigger>
            <TabsTrigger value="custom" className="text-xs px-3 py-1">Custom Tasks</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {workflowOptions.map((w) => (
              <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SPECIALTIES} className="text-xs">All Specialties</SelectItem>
            {specialtyOptions.hasUnassigned && (
              <SelectItem value={UNASSIGNED} className="text-xs text-amber-600 dark:text-amber-400">
                Unassigned
              </SelectItem>
            )}
            {specialtyOptions.named.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {tab === "custom" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Task
            </Button>
          )}
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Tasks"
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Per-tab context */}
      <p className="mt-3 text-xs text-muted-foreground">
        {tab === "system"
          ? "System tasks are generated by Entrata workflows. Assign each to a specialty to control routing and team ownership."
          : "Custom tasks are created by your team for recurring or ad-hoc work that falls outside standard system workflows."}
      </p>

      {/* Table */}
      <div className="mt-4 rounded-lg border border-border overflow-x-auto scrollbar-hover">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="sticky left-0 z-10 min-w-[200px] border-r border-border bg-muted px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Task</th>
              <th className="min-w-[110px] px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Workflow</th>
              <th className="min-w-[70px] px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Priority</th>
              <th className="min-w-[160px] px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Specialty</th>
              <th className="min-w-[200px] px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Description</th>
              <th className="w-20 min-w-[80px] px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((task) => {
              const isUnassigned = !task.specialtyId;
              return (
                <tr
                  key={task.id}
                  className={cn(
                    "border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors",
                    isUnassigned && tab === "system" && "bg-amber-50/40 dark:bg-amber-950/10"
                  )}
                >
                  <td className="sticky left-0 z-10 border-r border-border bg-background min-w-[200px] px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">{task.name}</td>
                  <td className="min-w-[110px] px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{task.workflow}</td>
                  <td className="min-w-[70px] px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={task.priority ?? "P2"}
                      onValueChange={(v) => handlePriorityChange(task.id, v as SpecialtyTaskPriority)}
                    >
                      <SelectTrigger
                        className={cn(
                          "h-7 w-16 text-xs font-medium border-0 shadow-none rounded-md",
                          (task.priority ?? "P2") === "P1"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                            : (task.priority ?? "P2") === "P2"
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
                  <td className="min-w-[160px] px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={task.specialtyId || UNASSIGNED}
                      onValueChange={(v) => handleSpecialtyChange(task.id, v)}
                    >
                      <SelectTrigger
                        className={cn(
                          "h-8 w-full text-xs border-0 shadow-none",
                          isUnassigned
                            ? "bg-amber-100/60 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                            : "bg-muted/40"
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED} className="text-xs text-muted-foreground">
                          Unassigned
                        </SelectItem>
                        {SPECIALTIES.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="min-w-[200px] px-4 py-3 text-sm text-muted-foreground truncate max-w-xs">{task.description}</td>
                  <td className="w-20 min-w-[80px] px-2 py-3 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          if (task.system) {
                            setEditingSystemTask(task);
                            setSystemEditPriority(task.priority ?? "P2");
                            setSystemEditSpecialty(task.specialtyId);
                          } else {
                            setEditingTask(task);
                          }
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {!task.system && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setTaskToDelete(task)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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

      <CreateCustomTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        mode="template"
        onSave={handleAddCustomTask}
      />

      <CreateCustomTaskDialog
        open={editingTask !== null}
        onOpenChange={(open) => { if (!open) setEditingTask(null); }}
        mode="template"
        initialData={editingTask}
        onSave={(updated) => { handleEditTask(updated); }}
      />

      {/* Edit System Task Dialog */}
      <Dialog open={editingSystemTask !== null} onOpenChange={(v) => { if (!v) setEditingSystemTask(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit System Task</DialogTitle>
            <DialogDescription>
              System tasks are managed by Entrata. You can adjust the priority and specialty assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
              <p className="text-sm font-medium text-foreground">{editingSystemTask?.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{editingSystemTask?.workflow}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Priority</label>
                <Select value={systemEditPriority} onValueChange={(v) => setSystemEditPriority(v as SpecialtyTaskPriority)}>
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
                <label className="text-xs font-medium text-foreground">Specialty</label>
                <Select value={systemEditSpecialty || UNASSIGNED} onValueChange={(v) => setSystemEditSpecialty(v === UNASSIGNED ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED} className="text-xs text-muted-foreground">Unassigned</SelectItem>
                    {SPECIALTIES.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-sm">{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setEditingSystemTask(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!editingSystemTask) return;
                setTasks((prev) =>
                  prev.map((t) =>
                    t.id === editingSystemTask.id
                      ? { ...t, priority: systemEditPriority, specialtyId: systemEditSpecialty }
                      : t
                  )
                );
                setEditingSystemTask(null);
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </>
  );
}

// ── Cadence helpers ───────────────────────────────────────────────────────

const TASK_WORKFLOWS = ["Custom", ...WORKFLOWS.filter((w) => w !== "All Workflows")];

const CADENCE_OPTIONS: { value: SpecialtyTaskRepeats; label: string }[] = [
  { value: "Never", label: "Does Not Repeat" },
  { value: "Daily", label: "Daily" },
  { value: "Weekly", label: "Weekly" },
  { value: "Monthly", label: "Monthly" },
];

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

// ── Specialties View ───────────────────────────────────────────────────────

const ASSIGNMENT_MODE_LABELS: Record<AssignmentMode, { label: string; icon: React.ReactNode }> = {
  smart: { label: "Smart Distribution", icon: <Sparkles className="h-3.5 w-3.5" /> },
  "round-robin": { label: "Round Robin", icon: <RotateCw className="h-3.5 w-3.5" /> },
  group: { label: "Group", icon: <UsersRound className="h-3.5 w-3.5" /> },
  manual: { label: "Manual", icon: <UserPen className="h-3.5 w-3.5" /> },
};

function SpecialtiesView() {
  const router = useRouter();
  const [specialties, setSpecialties] = useState(SPECIALTIES);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [specialtyToDelete, setSpecialtyToDelete] = useState<Specialty | null>(null);

  const handleAddSpecialty = (name: string) => {
    const id = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setSpecialties((prev) => [...prev, { id: `${id}-${Date.now()}`, name }]);
  };

  const handleDeleteSpecialty = (id: string) => {
    setSpecialties((prev) => prev.filter((s) => s.id !== id));
    setSpecialtyToDelete(null);
  };

  const details = useMemo(
    () => specialties.map((s) => ({ specialty: s, detail: getSpecialtyDetail(s.id) })),
    [specialties]
  );

  return (
    <>
      <h1 className="text-xl font-semibold text-foreground">Specialties</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Specialties group related escalation tasks and the teammates who handle them. Each specialty has its own task list, team roster, and routing configuration.
      </p>

      <div className="mt-4 flex items-center">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Specialty
        </Button>
      </div>

      <div className="mt-4 rounded-lg border border-border overflow-x-auto scrollbar-hover">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="sticky left-0 z-10 min-w-[180px] border-r border-border bg-muted px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Specialty</th>
              <th className="min-w-[70px] px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tasks</th>
              <th className="min-w-[90px] px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Members</th>
              <th className="min-w-[140px] px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Assignment</th>
              <th className="w-20 min-w-[80px] px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {details.map(({ specialty: s, detail }) => {
              const taskCount = detail?.tasks.length ?? SEED_TASKS.filter((t) => t.specialtyId === s.id).length;
              const memberCount = detail?.teammates.length ?? 0;
              const mode = detail?.assignment.mode ?? "smart";
              const modeInfo = ASSIGNMENT_MODE_LABELS[mode];

              return (
                <tr
                  key={s.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => router.push(`/escalations/settings/specialty/${s.id}`)}
                >
                  <td className="sticky left-0 z-10 min-w-[180px] border-r border-border bg-background px-4 py-3">
                    <span className="text-sm font-medium text-foreground">{s.name}</span>
                  </td>
                  <td className="min-w-[70px] px-4 py-3 text-sm text-muted-foreground">
                    {taskCount}
                  </td>
                  <td className="min-w-[90px] px-4 py-3">
                    {memberCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {memberCount}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">No members</span>
                    )}
                  </td>
                  <td className="min-w-[140px] px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      {modeInfo.icon}
                      {modeInfo.label}
                    </span>
                  </td>
                  <td className="w-20 min-w-[80px] px-2 py-3 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); router.push(`/escalations/settings/specialty/${s.id}`); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setSpecialtyToDelete(s); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {specialties.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No specialties created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CreateSpecialtyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSave={handleAddSpecialty}
      />

      <Dialog open={specialtyToDelete !== null} onOpenChange={(v) => { if (!v) setSpecialtyToDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Specialty</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">{specialtyToDelete?.name}</span>? Tasks and member assignments for this specialty will no longer be available. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setSpecialtyToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => specialtyToDelete && handleDeleteSpecialty(specialtyToDelete.id)}
            >
              Delete Specialty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreateSpecialtyDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");

  const reset = () => setName("");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim());
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Specialty</DialogTitle>
          <DialogDescription>
            Add a new specialty to group tasks and route them to the right team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Specialty Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Centralized Renewals"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => { reset(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button size="sm" disabled={!name.trim()} onClick={handleSave}>
            Create Specialty
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Playbook Library View ──────────────────────────────────────────────────

type PbSortField = "name" | "category" | "repeats" | "priority";
type PbSortDir = "asc" | "desc";

const PB_PRIORITY_RANK: Record<PlaybookTemplatePriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

function pbPriorityBadge(p: PlaybookTemplatePriority) {
  switch (p) {
    case "P0": return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
    case "P1": return "bg-muted text-muted-foreground";
    case "P2": return "bg-muted text-muted-foreground";
    case "P3": return "bg-muted text-muted-foreground";
  }
}

function PlaybookLibraryView() {
  const router = useRouter();
  const [templates, setTemplates] = useState<PlaybookTemplate[]>(SEED_PLAYBOOK_TEMPLATES);
  const [sortField, setSortField] = useState<PbSortField | null>(null);
  const [sortDir, setSortDir] = useState<PbSortDir>("asc");
  const [showChooser, setShowChooser] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [showFromDocDialog, setShowFromDocDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<PlaybookTemplate | null>(null);

  const toggleSort = (field: PbSortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  function SortIcon({ field }: { field: PbSortField }) {
    if (sortField !== field) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp className="ml-1 inline h-3 w-3" />
      : <ChevronDown className="ml-1 inline h-3 w-3" />;
  }

  const sorted = useMemo(() => {
    const list = [...templates];
    if (!sortField) return list;
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "category": cmp = a.category.localeCompare(b.category); break;
        case "repeats": cmp = a.repeats.localeCompare(b.repeats); break;
        case "priority": cmp = PB_PRIORITY_RANK[a.priority] - PB_PRIORITY_RANK[b.priority]; break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [templates, sortField, sortDir]);

  const handleDelete = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setTemplateToDelete(null);
  };

  const handleCreate = (template: PlaybookTemplate) => {
    setTemplates((prev) => [...prev, template]);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Manage Playbooks</h1>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setShowChooser(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Create Playbook
          </Button>
        </div>
      </div>

      <p className="mt-2 text-xs font-medium text-muted-foreground">Playbooks</p>

      <div className="mt-3 rounded-lg border border-border overflow-x-auto scrollbar-hover">
        <table className="w-full min-w-[850px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th
                className="sticky left-0 z-10 min-w-[180px] border-r border-border bg-muted cursor-pointer px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                onClick={() => toggleSort("name")}
              >
                Playbook Name <SortIcon field="name" />
              </th>
              <th
                className="min-w-[100px] cursor-pointer px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                onClick={() => toggleSort("category")}
              >
                Category <SortIcon field="category" />
              </th>
              <th
                className="min-w-[90px] cursor-pointer px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                onClick={() => toggleSort("repeats")}
              >
                Repeats <SortIcon field="repeats" />
              </th>
              <th
                className="min-w-[80px] cursor-pointer px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                onClick={() => toggleSort("priority")}
              >
                Priority <SortIcon field="priority" />
              </th>
              <th className="min-w-[200px] px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Description
              </th>
              <th className="w-20 min-w-[80px] px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((tpl) => (
              <tr
                key={tpl.id}
                className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
              >
                <td className="sticky left-0 z-10 min-w-[180px] border-r border-border bg-background px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">
                  {tpl.name}
                </td>
                <td className="min-w-[100px] px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                  {tpl.category}
                </td>
                <td className="min-w-[90px] px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                  {tpl.repeats}
                </td>
                <td className="min-w-[80px] px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      pbPriorityBadge(tpl.priority)
                    )}
                  >
                    {tpl.priority}
                  </span>
                </td>
                <td className="min-w-[200px] px-4 py-3 text-sm text-muted-foreground truncate max-w-xs">
                  {tpl.description}
                </td>
                <td className="w-20 min-w-[80px] px-2 py-3 text-center">
                  {tpl.variety === "automated" ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => router.push("/workflows")}
                      title="Edit in Workato"
                    >
                      <MoveRight className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <div className="flex items-center justify-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => router.push(`/escalations/settings/playbook/${tpl.id}`)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setTemplateToDelete(tpl)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No playbook templates yet. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PlaybookCreationChooser
        open={showChooser}
        onOpenChange={setShowChooser}
        onChooseCustom={() => { setShowChooser(false); setShowCustomDialog(true); }}
        onChooseFromDoc={() => { setShowChooser(false); setShowFromDocDialog(true); }}
      />

      <CreatePlaybookTemplateDialog
        open={showCustomDialog}
        onOpenChange={setShowCustomDialog}
        onCreate={handleCreate}
      />

      <CreatePlaybookFromDocDialog
        open={showFromDocDialog}
        onOpenChange={setShowFromDocDialog}
        onCreate={handleCreate}
      />

      <Dialog open={templateToDelete !== null} onOpenChange={(v) => { if (!v) setTemplateToDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Playbook</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">{templateToDelete?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setTemplateToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => templateToDelete && handleDelete(templateToDelete.id)}
            >
              Delete Playbook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Playbook Creation Chooser ───────────────────────────────────────────

function PlaybookCreationChooser({
  open,
  onOpenChange,
  onChooseCustom,
  onChooseFromDoc,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChooseCustom: () => void;
  onChooseFromDoc: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Playbook</DialogTitle>
          <DialogDescription>
            Choose how you&apos;d like to create your playbook.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <button
            type="button"
            onClick={onChooseCustom}
            className="group flex flex-col items-center gap-3 rounded-lg border border-border p-5 text-center transition-all hover:border-primary hover:bg-primary/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10">
              <Pencil className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Custom Playbook</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Build a playbook from scratch with your own tasks and configuration.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onChooseFromDoc}
            className="group flex flex-col items-center gap-3 rounded-lg border border-border p-5 text-center transition-all hover:border-primary hover:bg-primary/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10">
              <BookOpen className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">From SOP &amp; Trainings</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Generate a playbook from an existing document&apos;s procedures.
              </p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Task generation from documents ─────────────────────────────────────────

function generateTasksFromDocument(doc: VaultItem): PlaybookTemplateTask[] {
  const docName = doc.fileName.toLowerCase();

  if (doc.body) {
    const lines = doc.body.split("\n");
    const steps: { name: string; desc: string }[] = [];
    for (const line of lines) {
      const trimmed = line.replace(/^[●○■\-•]\s*/, "").trim();
      if (!trimmed || trimmed.length < 8 || trimmed.length > 120) continue;
      if (trimmed.startsWith("http") || trimmed.startsWith("//")) continue;
      const isActionable =
        /^(setup|change|click|remove|delete|select|ensure|disable|turn|go|search|filter|check|review|run|update|submit|generate|send|notify|create|schedule|confirm|verify|approve|complete|close|document|file|gather|alert|take|attach)/i.test(trimmed) ||
        /^[A-Z]/.test(trimmed);
      if (isActionable && !trimmed.includes("○") && !trimmed.includes("●")) {
        const name = trimmed.length > 60 ? trimmed.slice(0, 57) + "..." : trimmed;
        steps.push({ name, desc: trimmed });
      }
    }
    if (steps.length > 0) {
      const priorities: PlaybookTemplatePriority[] = ["P1", "P1", "P2", "P2", "P2", "P3"];
      return steps.slice(0, 12).map((s, i) => ({
        id: `gen-${Date.now()}-${i}`,
        name: s.name,
        description: s.desc,
        dueOffset: i < 3 ? "1 Day" : i < 6 ? "3 Days" : "1 Week",
        priority: priorities[Math.min(i, priorities.length - 1)],
        specialtyId: "",
      }));
    }
  }

  if (docName.includes("leasing")) {
    return [
      { id: `gen-${Date.now()}-0`, name: "Review lease terms", description: "Review and verify all lease terms are current", dueOffset: "1 Day", priority: "P1" as const, specialtyId: "" },
      { id: `gen-${Date.now()}-1`, name: "Prepare lease documents", description: "Generate lease documents from template", dueOffset: "2 Days", priority: "P2" as const, specialtyId: "" },
      { id: `gen-${Date.now()}-2`, name: "Verify applicant information", description: "Cross-reference applicant details", dueOffset: "1 Day", priority: "P1" as const, specialtyId: "" },
      { id: `gen-${Date.now()}-3`, name: "Manager approval", description: "Get manager sign-off on lease agreement", dueOffset: "3 Days", priority: "P1" as const, specialtyId: "" },
      { id: `gen-${Date.now()}-4`, name: "Send for signature", description: "Distribute lease for electronic signature", dueOffset: "5 Days", priority: "P2" as const, specialtyId: "" },
    ];
  }

  if (docName.includes("maintenance")) {
    return [
      { id: `gen-${Date.now()}-0`, name: "Document issue", description: "Record maintenance issue details and photos", dueOffset: "1 Hour", priority: "P1" as const, specialtyId: "" },
      { id: `gen-${Date.now()}-1`, name: "Assess priority", description: "Determine urgency and required resources", dueOffset: "1 Hour", priority: "P0" as const, specialtyId: "" },
      { id: `gen-${Date.now()}-2`, name: "Assign vendor or team", description: "Route work order to appropriate handler", dueOffset: "1 Day", priority: "P1" as const, specialtyId: "" },
      { id: `gen-${Date.now()}-3`, name: "Notify resident", description: "Communicate timeline to affected resident", dueOffset: "1 Day", priority: "P2" as const, specialtyId: "" },
      { id: `gen-${Date.now()}-4`, name: "Verify completion", description: "Inspect work and confirm resolution", dueOffset: "3 Days", priority: "P2" as const, specialtyId: "" },
      { id: `gen-${Date.now()}-5`, name: "Close work order", description: "Mark complete and update records", dueOffset: "5 Days", priority: "P3" as const, specialtyId: "" },
    ];
  }

  if (docName.includes("refund") || docName.includes("payment")) {
    return [
      { id: `gen-${Date.now()}-0`, name: "Verify refund eligibility", description: "Check request against refund policy criteria", dueOffset: "1 Day", priority: "P1" as const, specialtyId: "" },
      { id: `gen-${Date.now()}-1`, name: "Gather documentation", description: "Collect original payment reference and written request", dueOffset: "1 Day", priority: "P2" as const, specialtyId: "" },
      { id: `gen-${Date.now()}-2`, name: "Determine approval tier", description: "Route to appropriate approver based on amount", dueOffset: "1 Day", priority: "P1" as const, specialtyId: "" },
      { id: `gen-${Date.now()}-3`, name: "Manager approval", description: "Get manager or VP sign-off per threshold", dueOffset: "3 Days", priority: "P1" as const, specialtyId: "" },
      { id: `gen-${Date.now()}-4`, name: "Process refund", description: "Execute refund in payment system with reason code", dueOffset: "5 Days", priority: "P2" as const, specialtyId: "" },
      { id: `gen-${Date.now()}-5`, name: "Notify resident", description: "Confirm refund processed and provide timeline", dueOffset: "5 Days", priority: "P3" as const, specialtyId: "" },
    ];
  }

  return [
    { id: `gen-${Date.now()}-0`, name: "Review document procedures", description: `Review procedures outlined in "${doc.fileName}"`, dueOffset: "1 Day", priority: "P1" as const, specialtyId: "" },
    { id: `gen-${Date.now()}-1`, name: "Assign responsible parties", description: "Identify and assign team members to each step", dueOffset: "1 Day", priority: "P2" as const, specialtyId: "" },
    { id: `gen-${Date.now()}-2`, name: "Execute procedures", description: "Complete each step per the documented process", dueOffset: "3 Days", priority: "P1" as const, specialtyId: "" },
    { id: `gen-${Date.now()}-3`, name: "Manager review", description: "Manager reviews completion and quality", dueOffset: "5 Days", priority: "P2" as const, specialtyId: "" },
    { id: `gen-${Date.now()}-4`, name: "Document completion", description: "Record outcomes and close out playbook", dueOffset: "1 Week", priority: "P3" as const, specialtyId: "" },
  ];
}

// ── Create Playbook From Document Dialog ───────────────────────────────────

type FromDocStep = "select" | "generating" | "tasks" | "metadata";

function approvalBadgeClass(status: string) {
  switch (status) {
    case "approved": return "bg-[#B3FFCC] text-black border-transparent dark:bg-emerald-900/40 dark:text-emerald-300";
    case "review": 
    case "needs_review": return "bg-amber-400 text-amber-950 border-transparent dark:bg-amber-900/40 dark:text-amber-300";
    default: return "";
  }
}

const FROM_DOC_TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const suffix = h < 12 ? "AM" : "PM";
    const min = m === 0 ? "00" : "30";
    FROM_DOC_TIME_OPTIONS.push(`${hour12}:${min} ${suffix}`);
  }
}

function approvalLabel(status: string) {
  switch (status) {
    case "approved": return "Approved";
    case "review":
    case "needs_review": return "Needs review";
    default: return status;
  }
}

function CreatePlaybookFromDocDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (template: PlaybookTemplate) => void;
}) {
  const { documents } = useVault();
  const { humanMembers } = useWorkforce();

  const allItems = useMemo(() => documents.filter((d) => !d.isTemplate), [documents]);
  const folders = useMemo(() => allItems.filter((d) => d.type === "folder"), [allItems]);

  const [step, setStep] = useState<FromDocStep>("select");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedDoc, setSelectedDoc] = useState<VaultItem | null>(null);
  const [tasks, setTasks] = useState<PlaybookTemplateTask[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<PlaybookTemplateTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<PlaybookTemplateTask | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(PLAYBOOK_CATEGORIES[0]);
  const [priority, setPriority] = useState<PlaybookTemplatePriority>("P1");
  const [playbookType, setPlaybookType] = useState<PlaybookTemplateType>("operational");
  const [repeats, setRepeats] = useState<PlaybookTemplateRepeats>("Never");
  const [onDate, setOnDate] = useState("");
  const [createTime, setCreateTime] = useState("7:00 AM");
  const [timezone, setTimezone] = useState("America/Denver");
  const [assigneeId, setAssigneeId] = useState("");

  const currentFolder = useMemo(
    () => currentFolderId ? folders.find((f) => f.id === currentFolderId) ?? null : null,
    [currentFolderId, folders]
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allItems
      .filter((d) => {
        if (d.isTemplate) return false;
        if (q) {
          return d.type === "file" && d.fileName.toLowerCase().includes(q);
        }
        if (currentFolderId) return d.folderId === currentFolderId;
        return !d.folderId || d.type === "folder";
      })
      .filter((d) => {
        if (d.type === "file" && d.approvalStatus !== "approved") return false;
        if (typeFilter !== "all" && d.type === "file" && d.documentType !== typeFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.type === "folder" && b.type !== "folder") return -1;
        if (a.type !== "folder" && b.type === "folder") return 1;
        return 0;
      });
  }, [allItems, searchQuery, typeFilter, currentFolderId]);

  const reset = () => {
    setStep("select");
    setCurrentFolderId(null);
    setSearchQuery("");
    setTypeFilter("all");
    setSelectedDoc(null);
    setTasks([]);
    setShowAddTask(false);
    setTaskToEdit(null);
    setTaskToDelete(null);
    setName("");
    setDescription("");
    setCategory(PLAYBOOK_CATEGORIES[0]);
    setPriority("P1");
    setPlaybookType("operational");
    setRepeats("Never");
    setOnDate("");
    setCreateTime("7:00 AM");
    setTimezone("America/Denver");
    setAssigneeId("");
  };

  const handleSelectDoc = (doc: VaultItem) => {
    setSelectedDoc(doc);
  };

  const handleConfirmDoc = (doc?: VaultItem) => {
    const target = doc ?? selectedDoc;
    if (!target) return;
    setSelectedDoc(target);
    setStep("generating");
    setTimeout(() => {
      const generated = generateTasksFromDocument(target);
      setTasks(generated);
      setName(target.fileName);
      setDescription(`Playbook generated from "${target.fileName}" procedures.`);
      setStep("tasks");
    }, 2200);
  };

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

  const handleSpecialtyChange = (taskId: string, specialtyId: string) => {
    const val = specialtyId === "__unassigned__" ? "" : specialtyId;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, specialtyId: val } : t)));
  };

  const handlePriorityChange = (taskId: string, priority: PlaybookTemplatePriority) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority } : t)));
  };

  const handleCreate = () => {
    if (!name.trim() || !selectedDoc) return;
    onCreate({
      id: `pbt-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      category,
      type: playbookType,
      variety: "custom",
      priority,
      repeats,
      ...(repeats !== "Never" && { onDate, createTime, timezone }),
      ...(assigneeId && { assigneeId }),
      tasks,
      sourceDoc: {
        name: selectedDoc.fileName,
        type: selectedDoc.documentType.toUpperCase(),
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " at " +
              new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short" }),
      },
      lastEdited: new Date().toISOString().split("T")[0],
      stats: { lastLaunch: "", nextLaunch: "", launches: 0, activePlays: 0, activeTasks: 0 },
    });
    reset();
    onOpenChange(false);
  };

  const inputClass =
    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
  const labelClass = "text-xs font-medium text-foreground";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "select" && "Select a Document"}
            {step === "generating" && "Generating Tasks"}
            {step === "tasks" && "Review Tasks"}
            {step === "metadata" && "Playbook Details"}
          </DialogTitle>
          <DialogDescription>
            {step === "select" && "Choose a document from SOP & Trainings to generate playbook tasks from."}
            {step === "generating" && (
              <>
                Analyzing <span className="font-medium text-foreground">{selectedDoc?.fileName}</span> and extracting actionable tasks…
              </>
            )}
            {step === "tasks" && (
              <>
                Tasks generated from <span className="font-medium text-foreground">{selectedDoc?.fileName}</span>. Edit, delete, or add tasks before proceeding.
              </>
            )}
            {step === "metadata" && "Set the playbook name, category, and other details."}
          </DialogDescription>
        </DialogHeader>

        {/* Step progress */}
        <div className="flex items-center gap-2 px-1">
          {(["select", "tasks", "metadata"] as const).map((s, i) => {
            const isComplete =
              (s === "select" && step !== "select") ||
              (s === "tasks" && step === "metadata");
            const isCurrent =
              step === s ||
              (s === "tasks" && step === "generating");
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="h-px w-6 bg-border" />}
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition-colors",
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isComplete
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {s === "tasks" && step === "generating"
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : isComplete
                      ? <Check className="h-3 w-3" />
                      : i + 1}
                </div>
                <span className={cn("text-xs", isCurrent ? "font-medium text-foreground" : "text-muted-foreground")}>
                  {s === "select" ? "Document" : s === "tasks" ? "Tasks" : "Details"}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Step: Select Document ── */}
        {step === "select" && (
          <div className="flex-1 overflow-hidden flex flex-col gap-3 py-2 -mx-6 px-6">
            {/* Breadcrumb */}
            {currentFolder && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <button type="button" onClick={() => setCurrentFolderId(null)} className="hover:underline text-primary">
                  SOP &amp; Trainings
                </button>
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium text-foreground">{currentFolder.fileName}</span>
              </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files, type, or owners"
                  className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Types</SelectItem>
                  <SelectItem value="sop" className="text-xs">SOP</SelectItem>
                  <SelectItem value="policy" className="text-xs">Policy</SelectItem>
                  <SelectItem value="lease" className="text-xs">Lease</SelectItem>
                  <SelectItem value="other" className="text-xs">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="rounded-lg border border-border overflow-x-auto scrollbar-hover">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="sticky left-0 z-10 min-w-[200px] border-r border-border bg-muted px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="min-w-[80px] px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                    <th className="min-w-[100px] px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Property</th>
                    <th className="min-w-[90px] px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Approval</th>
                    <th className="min-w-[100px] px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Modified</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-border last:border-b-0 transition-colors cursor-pointer",
                        row.type === "file" && selectedDoc?.id === row.id
                          ? "bg-primary/10 hover:bg-primary/15"
                          : "hover:bg-muted/20"
                      )}
                      onClick={() => {
                        if (row.type === "folder") setCurrentFolderId(row.id);
                        else handleSelectDoc(row);
                      }}
                      onDoubleClick={() => {
                        if (row.type === "file") handleConfirmDoc(row);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (row.type === "folder") setCurrentFolderId(row.id);
                          else handleSelectDoc(row);
                        }
                      }}
                    >
                      {row.type === "folder" ? (
                        <td colSpan={5} className="px-4 py-2.5 font-medium text-foreground">
                          <span className="inline-flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-500 dark:bg-gray-500">
                              <FolderOpen className="h-3.5 w-3.5 text-white" />
                            </span>
                            {row.fileName}
                          </span>
                        </td>
                      ) : (
                        <>
                          <td className="sticky left-0 z-10 min-w-[200px] border-r border-border bg-background px-4 py-2.5 font-medium text-foreground">
                            <span className="inline-flex items-center gap-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              </span>
                              <span className="truncate text-sm">{row.fileName}</span>
                              {row.version && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">v{row.version}</Badge>
                              )}
                            </span>
                          </td>
                          <td className="min-w-[80px] px-4 py-2.5 text-sm capitalize text-muted-foreground">{row.documentType}</td>
                          <td className="min-w-[100px] px-4 py-2.5 text-sm text-muted-foreground">{row.property}</td>
                          <td className="min-w-[90px] px-4 py-2.5">
                            <Badge variant="secondary" className={cn("text-[10px]", approvalBadgeClass(row.approvalStatus))}>
                              {approvalLabel(row.approvalStatus)}
                            </Badge>
                          </td>
                          <td className="min-w-[100px] px-4 py-2.5 text-sm text-muted-foreground">{row.modified}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        {currentFolderId ? (
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <FolderOpen className="h-8 w-8 opacity-30" />
                            <p className="text-sm font-medium text-foreground">This folder is empty</p>
                            <p className="text-xs">Move documents into this folder or navigate back.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <FileText className="h-8 w-8 opacity-30" />
                            <p className="text-sm">No documents match the current filters.</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Step: Generating Tasks ── */}
        {step === "generating" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="relative flex items-center justify-center">
              <div className="absolute h-20 w-20 animate-ping rounded-full bg-primary/10" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-7 w-7 text-primary animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-sm font-medium text-foreground">Generating tasks…</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Analyzing <span className="font-medium text-foreground">{selectedDoc?.fileName}</span> and extracting procedures into actionable tasks.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {/* ── Step: Review Tasks ── */}
        {step === "tasks" && (
          <div className="flex-1 overflow-hidden flex flex-col gap-3 py-2 -mx-6 px-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowAddTask(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add Task
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="rounded-lg border border-border overflow-x-auto scrollbar-hover">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="sticky left-0 z-10 min-w-[180px] border-r border-border bg-muted px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Task Name</th>
                    <th className="min-w-[180px] px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Description</th>
                    <th className="min-w-[80px] px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Due</th>
                    <th className="min-w-[110px] px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Priority</th>
                    <th className="min-w-[150px] px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Specialty</th>
                    <th className="w-20 min-w-[80px] px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors">
                      <td className="sticky left-0 z-10 min-w-[180px] border-r border-border bg-background px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">{task.name}</td>
                      <td className="min-w-[180px] px-4 py-3 text-sm text-muted-foreground max-w-[220px] truncate">{task.description}</td>
                      <td className="min-w-[80px] px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{task.dueOffset}</td>
                      <td className="min-w-[110px] px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={task.priority}
                          onValueChange={(v) => handlePriorityChange(task.id, v as PlaybookTemplatePriority)}
                        >
                          <SelectTrigger className="h-8 w-28 text-xs border-0 shadow-none bg-muted/40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="P0" className="text-xs">P0 - Emergency</SelectItem>
                            <SelectItem value="P1" className="text-xs">P1 - High</SelectItem>
                            <SelectItem value="P2" className="text-xs">P2 - Medium</SelectItem>
                            <SelectItem value="P3" className="text-xs">P3 - Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="min-w-[150px] px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={task.specialtyId || "__unassigned__"}
                          onValueChange={(v) => handleSpecialtyChange(task.id, v)}
                        >
                          <SelectTrigger className="h-8 w-full text-xs border-0 shadow-none bg-muted/40">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned__" className="text-xs text-muted-foreground">Select</SelectItem>
                            {SPECIALTIES.map((s) => (
                              <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="w-20 min-w-[80px] px-2 py-3 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setTaskToEdit(task)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setTaskToDelete(task)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tasks.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No tasks yet. Click &ldquo;Add Task&rdquo; to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>

            {/* Add Task Dialog */}
            <FromDocAddTaskDialog open={showAddTask} onOpenChange={setShowAddTask} onSave={handleAddTask} />

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
                  <Button variant="ghost" size="sm" onClick={() => setTaskToDelete(null)}>Cancel</Button>
                  <Button variant="destructive" size="sm" onClick={() => taskToDelete && handleDeleteTask(taskToDelete.id)}>Delete Task</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ── Step: Metadata ── */}
        {step === "metadata" && (
          <div className="flex-1 overflow-y-auto space-y-4 py-2 -mx-6 px-6">
            {selectedDoc && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">Source Document</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedDoc.fileName}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] capitalize">{selectedDoc.documentType}</Badge>
              </div>
            )}

            <div className="space-y-1.5">
              <label className={labelClass}>Playbook Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Move-In Checklist" className={inputClass} />
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>Description</label>
              <RichTextEditor
                content={description}
                onChange={setDescription}
                placeholder="Describe what this playbook is for"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className={labelClass}>Type</label>
                <Select value={playbookType} onValueChange={(v) => setPlaybookType(v as PlaybookTemplateType)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational" className="text-sm">Operational</SelectItem>
                    <SelectItem value="emergency" className="text-sm">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Priority</label>
                <Select value={priority} onValueChange={(v) => setPriority(v as PlaybookTemplatePriority)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P0" className="text-sm">P0 — Critical</SelectItem>
                    <SelectItem value="P1" className="text-sm">P1 — High</SelectItem>
                    <SelectItem value="P2" className="text-sm">P2 — Medium</SelectItem>
                    <SelectItem value="P3" className="text-sm">P3 — Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Assignee</label>
                <AssigneeCombobox
                  members={humanMembers}
                  value={assigneeId}
                  onChange={setAssigneeId}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>Repeats</label>
              <Select value={repeats} onValueChange={(v) => setRepeats(v as PlaybookTemplateRepeats)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAYBOOK_REPEATS_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r} className="text-sm">{r === "Never" ? "Does Not Repeat" : r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {repeats !== "Never" && (
              <>
                <div className="space-y-1.5">
                  <label className={labelClass}>On Date</label>
                  <input
                    type="text"
                    value={onDate}
                    onChange={(e) => setOnDate(e.target.value)}
                    placeholder={repeats === "Weekly" ? "e.g. Monday" : repeats === "Monthly" ? "e.g. 15" : "e.g. Jun 1"}
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={labelClass}>Creation Time</label>
                    <Select value={createTime} onValueChange={setCreateTime}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FROM_DOC_TIME_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClass}>Timezone</label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
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

            
          </div>
        )}

        {/* Footer navigation */}
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div>
            {step !== "select" && step !== "generating" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(step === "metadata" ? "tasks" : "select")}
              >
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step !== "generating" && (
            <Button variant="ghost" size="sm" onClick={() => { reset(); onOpenChange(false); }}>
              Cancel
            </Button>
            )}
            {step === "select" && (
              <Button size="sm" onClick={() => handleConfirmDoc()} disabled={!selectedDoc}>
                Next
              </Button>
            )}
            {step === "tasks" && (
              <Button size="sm" onClick={() => setStep("metadata")} disabled={tasks.length === 0}>
                Next
              </Button>
            )}
            {step === "metadata" && (
              <Button size="sm" onClick={handleCreate} disabled={!name.trim()}>
                Create Playbook
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── From-Doc Add / Edit Task Dialogs ───────────────────────────────────────

const FROM_DOC_UNASSIGNED = "__unassigned__";

function FromDocAddTaskDialog({
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

  const reset = () => { setName(""); setDescription(""); setDueOffset("1 Day"); setPriority("P2"); setSpecialtyId(""); };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ id: `pbt-t-${Date.now()}`, name: name.trim(), description: description.trim(), dueOffset, priority, specialtyId });
    reset();
    onOpenChange(false);
  };

  const labelClass = "text-xs font-medium text-foreground";
  const inputClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
          <DialogDescription>Add a task to this playbook template.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className={labelClass}>Task Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Submit Photos" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what this task involves" rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className={labelClass}>Due</label>
              <Select value={dueOffset} onValueChange={setDueOffset}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
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
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
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
              <Select value={specialtyId || FROM_DOC_UNASSIGNED} onValueChange={(v) => setSpecialtyId(v === FROM_DOC_UNASSIGNED ? "" : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={FROM_DOC_UNASSIGNED} className="text-xs text-muted-foreground">None</SelectItem>
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-sm">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button size="sm" disabled={!name.trim()} onClick={handleSave}>Add Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// ── Create Playbook Template Dialog ────────────────────────────────────────

function CreatePlaybookTemplateDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (template: PlaybookTemplate) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(PLAYBOOK_CATEGORIES[0]);
  const [type, setType] = useState<PlaybookTemplateType>("operational");
  const [variety, setVariety] = useState<PlaybookTemplateVariety>("custom");
  const [priority, setPriority] = useState<PlaybookTemplatePriority>("P1");
  const [repeats, setRepeats] = useState<PlaybookTemplateRepeats>("Never");

  const reset = () => {
    setName("");
    setDescription("");
    setCategory(PLAYBOOK_CATEGORIES[0]);
    setType("operational");
    setVariety("custom");
    setPriority("P1");
    setRepeats("Never");
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onCreate({
      id: `pbt-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      category,
      type,
      variety,
      priority,
      repeats,
      tasks: [],
      lastEdited: new Date().toISOString().split("T")[0],
      stats: {
        lastLaunch: "",
        nextLaunch: "",
        launches: 0,
        activePlays: 0,
        activeTasks: 0,
      },
    });
    reset();
    onOpenChange(false);
  };

  const labelClass = "text-xs font-medium text-foreground";
  const inputClass =
    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Playbook</DialogTitle>
          <DialogDescription>
            Define a new playbook template that can be launched from the escalations workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 -mx-6 px-6">
          <div className="space-y-1.5">
            <label className={labelClass}>Playbook Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Move-In Checklist"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this playbook is for"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelClass}>Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAYBOOK_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelClass}>Type</label>
              <Select value={type} onValueChange={(v) => setType(v as PlaybookTemplateType)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operational" className="text-sm">Operational</SelectItem>
                  <SelectItem value="emergency" className="text-sm">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Variety</label>
              <Select value={variety} onValueChange={(v) => setVariety(v as PlaybookTemplateVariety)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom" className="text-sm">Custom</SelectItem>
                  <SelectItem value="automated" className="text-sm">Automated (Workato)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Repeats</label>
            <Select value={repeats} onValueChange={(v) => setRepeats(v as PlaybookTemplateRepeats)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAYBOOK_REPEATS_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r} className="text-sm">{r === "Never" ? "Does Not Repeat" : r}</SelectItem>
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
            Create Playbook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

