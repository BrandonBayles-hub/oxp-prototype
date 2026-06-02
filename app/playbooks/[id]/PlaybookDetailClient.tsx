"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  Plus,
  MapPin,
  Calendar,
  AlertTriangle,
  ArrowUpDown,
  RefreshCw,
  Trash2,
  X,
  FileText,
  ExternalLink,
  Check,
  ChevronDown,
  History,
  PenLine,
} from "lucide-react";
import { usePlaybooks, type PlaybookPriority, type PlaybookStatus } from "@/lib/playbooks-context";
import { useVault } from "@/lib/vault-context";
import { useWorkforce } from "@/lib/workforce-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Chat, type ChatMessage } from "@/components/ui/chat";
import { EscalationDetailSheet } from "@/components/escalation-detail-sheet";
import { ESCALATION_STATUSES, type Task } from "@/lib/escalations-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/lib/permissions-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreateCustomTaskDialog } from "@/components/create-custom-task-dialog";
import { PlaybookHistoryDialog } from "@/components/playbook-history-dialog";
import { PlaybookNotesSheet } from "@/components/playbook-notes-sheet";
import type { TaskTemplate } from "@/lib/specialties-data";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "P0", high: "P1", medium: "P2", low: "P3",
};

function statusBadge(s: string) {
  switch (s) {
    case "In progress": return "bg-primary/10 text-primary";
    case "Done": return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200";
    case "Blocked": return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
    case "Open": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
}

function dueLabel(iso: string | undefined): string {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  if (isToday) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dueBadge(iso: string | undefined) {
  const label = dueLabel(iso);
  if (label === "Today") return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200";
  if (label === "Tomorrow") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  return "bg-muted text-muted-foreground";
}

function playbookStatusColor(s: PlaybookStatus) {
  switch (s) {
    case "In Progress": return "bg-foreground text-background";
    case "On Hold": return "bg-muted text-muted-foreground";
    case "Completed": return "bg-green-600 text-white";
    case "Due Today": return "bg-foreground text-background";
    case "Overdue": return "bg-foreground text-background";
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type SortField = "name" | "priority" | "dueAt" | "status" | "assignee" | "property" | "unit" | "category";
type SortDir = "asc" | "desc";

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_RANK: Record<string, number> = { Blocked: 0, "In progress": 1, Open: 2, Done: 3 };
const PLAYBOOK_STATUSES: PlaybookStatus[] = ["In Progress", "On Hold", "Completed"];
const TASK_PRIORITIES: Array<Task["priority"]> = ["urgent", "high", "medium", "low"];

const TEMPLATE_PRIORITY_MAP: Record<string, NonNullable<Task["priority"]>> = {
  P0: "urgent",
  P1: "high",
  P2: "medium",
  P3: "low",
};

function dueInToIso(dueIn: string | undefined): string {
  if (!dueIn) return new Date().toISOString();
  const absMatch = dueIn.match(/^\d{4}-\d{2}-\d{2}$/);
  if (absMatch) return new Date(dueIn).toISOString();
  const match = dueIn.match(/^(\d+)\s*(.+)/);
  if (!match) return new Date().toISOString();
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  let ms = value * 86_400_000;
  if (unit.startsWith("hour")) ms = value * 3_600_000;
  else if (unit.startsWith("week")) ms = value * 7 * 86_400_000;
  return new Date(Date.now() + ms).toISOString();
}

export function PlaybookDetailClient() {
  const params = useParams();
  const router = useRouter();
  const { getPlaybook, updatePlaybook, updatePlaybookTask, addPlaybookTask, removePlaybook } = usePlaybooks();
  const { documents } = useVault();
  const { humanMembers } = useWorkforce();
  const { hasPermission } = usePermissions();
  const canDeletePlaybook = hasPermission("p-playbooks-delete");
  const playbook = getPlaybook(params.id as string);
  const sourceDoc = playbook?.sourceDocId
    ? documents.find((d) => d.id === playbook.sourceDocId)
    : undefined;

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [fabOpen, setFabOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deletePlaybookOpen, setDeletePlaybookOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());
  const [filterPriorities, setFilterPriorities] = useState<Set<string>>(new Set());
  const [filterCategories, setFilterCategories] = useState<Set<string>>(new Set());
  const [filterAssignees, setFilterAssignees] = useState<Set<string>>(new Set());
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const selectedTask = playbook?.tasks.find((t) => t.id === selectedTaskId) ?? null;

  const handleCreateTaskSave = (task: TaskTemplate) => {
    if (!playbook) return;
    addPlaybookTask(playbook.id, {
      type: "workflow",
      name: task.name,
      summary: task.name,
      category: "Playbook",
      property: task.property || playbook.property,
      unit: playbook.unit,
      status: "Open",
      assignee: task.assignee ?? "",
      priority: TEMPLATE_PRIORITY_MAP[task.priority ?? "P2"] ?? "medium",
      dueAt: dueInToIso(task.dueIn),
      descriptionHtml: task.descriptionHtml,
      sections: task.sections,
      createdAt: new Date().toISOString(),
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const activeFilterCount =
    filterStatuses.size + filterPriorities.size + filterCategories.size + filterAssignees.size;

  const filteredTasks = useMemo(() => {
    if (!playbook) return [];
    let tasks = playbook.tasks;
    if (search) {
      const q = search.toLowerCase();
      tasks = tasks.filter(
        (t) =>
          (t.name ?? "").toLowerCase().includes(q) ||
          t.assignee.toLowerCase().includes(q) ||
          t.property.toLowerCase().includes(q) ||
          (t.unit ?? "").toLowerCase().includes(q)
      );
    }
    if (filterStatuses.size > 0) {
      tasks = tasks.filter((t) => filterStatuses.has(normalizeStatus(t.status)));
    }
    if (filterPriorities.size > 0) {
      tasks = tasks.filter((t) => filterPriorities.has(t.priority ?? "medium"));
    }
    if (filterCategories.size > 0) {
      tasks = tasks.filter((t) => filterCategories.has(t.category));
    }
    if (filterAssignees.size > 0) {
      tasks = tasks.filter((t) => filterAssignees.has(t.assignee));
    }
    if (sortField) {
      tasks = [...tasks].sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case "name": cmp = (a.name ?? "").localeCompare(b.name ?? ""); break;
          case "priority": cmp = (PRIORITY_RANK[a.priority ?? "medium"] ?? 2) - (PRIORITY_RANK[b.priority ?? "medium"] ?? 2); break;
          case "dueAt": cmp = (a.dueAt ?? "").localeCompare(b.dueAt ?? ""); break;
          case "status": cmp = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9); break;
          case "assignee": cmp = (a.assignee || "zzz").localeCompare(b.assignee || "zzz"); break;
          case "property": cmp = a.property.localeCompare(b.property); break;
          case "unit": cmp = (a.unit ?? "").localeCompare(b.unit ?? ""); break;
          case "category": cmp = a.category.localeCompare(b.category); break;
        }
        return sortDir === "desc" ? -cmp : cmp;
      });
    }
    return tasks;
  }, [playbook, search, sortField, sortDir, filterStatuses, filterPriorities, filterCategories, filterAssignees]);

  if (!playbook) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Playbook not found.</p>
        <Link href="/escalations" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Escalations
        </Link>
      </div>
    );
  }

  const completed = playbook.tasks.filter((t) => t.status === "Done").length;
  const total = playbook.tasks.length;
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const isEmergency = playbook.priority === "P0";

  return (
    <div className="relative">
      {/* ── Header row ── */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/escalations"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-heading text-lg font-semibold text-foreground truncate">
          {playbook.templateName}
        </h1>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base h-8 w-40 rounded-md border border-input bg-background pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <button
            type="button"
            onClick={() => setCreateTaskOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground shadow-sm hover:bg-accent"
          >
            <Plus className="h-3 w-3" />
            Add Task
          </button>
          <button
            type="button"
            onClick={() => setNotesOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground shadow-sm hover:bg-accent"
            aria-label="View notes"
          >
            <PenLine className="h-3 w-3" />
            Notes
            {(playbook.notes?.length ?? 0) > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {playbook.notes!.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground shadow-sm hover:bg-accent"
            aria-label="View playbook history"
          >
            <History className="h-3 w-3" />
            History
          </button>
          {canDeletePlaybook && (
            <button
              type="button"
              onClick={() => setDeletePlaybookOpen(true)}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-destructive/40 bg-background px-2.5 text-xs font-medium text-destructive shadow-sm hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          )}
          <select
            value={playbook.status}
            onChange={(e) => updatePlaybook(playbook.id, { status: e.target.value as PlaybookStatus })}
            className={cn(
              "h-8 cursor-pointer rounded-md border-0 px-3 text-xs font-medium shadow-sm",
              playbookStatusColor(playbook.status)
            )}
          >
            {PLAYBOOK_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Info strip (card) ── */}
      <div className="mb-4 rounded-lg border border-border bg-background px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            {playbook.property}
            {playbook.unit && (
              <span className="ml-1 border-l border-border pl-2">Unit {playbook.unit}</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Due {formatDate(playbook.dueAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Launched {formatDate(playbook.launchedAt)}
          </span>
          {isEmergency && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
              <AlertTriangle className="h-3 w-3" />
              Emergency
            </span>
          )}
          {playbook.recurring && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <RefreshCw className="h-3 w-3" />
              {playbook.recurring.frequency}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                pct === 100 ? "bg-green-500" : pct >= 50 ? "bg-green-400" : "bg-green-300"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{completed}/{total}</span>
        </div>

        {/* Assignee + Priority */}
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-x-10 lg:gap-x-14">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-bold text-foreground">Assignee</p>
            <Popover open={assigneePopoverOpen} onOpenChange={(o) => { setAssigneePopoverOpen(o); if (!o) setAssigneeQuery(""); }}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md px-2 py-1 -ml-2 hover:bg-muted/60 transition-colors group"
                >
                  {playbook.assignee ? (
                    <>
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px] font-medium">{initials(playbook.assignee)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">{playbook.assignee}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0 z-[200]" align="start">
                <div className="p-2">
                  <input
                    type="text"
                    value={assigneeQuery}
                    onChange={(e) => setAssigneeQuery(e.target.value)}
                    placeholder="Search members…"
                    className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                </div>
                <div className="max-h-52 overflow-y-auto px-1 pb-1">
                  <button
                    type="button"
                    onClick={() => { updatePlaybook(playbook.id, { assignee: "" }); setAssigneePopoverOpen(false); setAssigneeQuery(""); }}
                    className={cn("flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted", !playbook.assignee && "bg-muted font-medium")}
                  >
                    <Check className={cn("h-3.5 w-3.5 shrink-0", playbook.assignee ? "invisible" : "text-primary")} />
                    <span className="text-muted-foreground">Unassigned</span>
                  </button>
                  {humanMembers
                    .filter((m) => !assigneeQuery || m.name.toLowerCase().includes(assigneeQuery.toLowerCase()))
                    .map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => { updatePlaybook(playbook.id, { assignee: m.name }); setAssigneePopoverOpen(false); setAssigneeQuery(""); }}
                        className={cn("flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted", playbook.assignee === m.name && "bg-muted font-medium")}
                      >
                        <Check className={cn("h-3.5 w-3.5 shrink-0", playbook.assignee === m.name ? "text-primary" : "invisible")} />
                        {m.name}
                      </button>
                    ))}
                  {humanMembers.filter((m) => !assigneeQuery || m.name.toLowerCase().includes(assigneeQuery.toLowerCase())).length === 0 && (
                    <p className="px-2 py-3 text-center text-xs text-muted-foreground">No members found</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="shrink-0">
            <p className="mb-1 text-xs font-bold text-foreground">Priority</p>
            <span className={cn(
              "inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-[10px] font-semibold tabular-nums",
              {
                "border-red-200/80 bg-red-100 text-red-800 dark:border-red-800/50 dark:bg-red-900/40 dark:text-red-200": playbook.priority === "P0",
                "border-amber-200/80 bg-amber-100 text-amber-900 dark:border-amber-800/50 dark:bg-amber-900/40 dark:text-amber-200": playbook.priority === "P1",
                "border-blue-200/80 bg-blue-100 text-blue-900 dark:border-blue-800/50 dark:bg-blue-900/40 dark:text-blue-200": playbook.priority === "P2",
                "border-green-200/80 bg-green-100 text-green-900 dark:border-green-800/50 dark:bg-green-900/40 dark:text-green-200": playbook.priority === "P3",
              }
            )}>
              {playbook.priority}
            </span>
          </div>
        </div>
        <div className="mt-3">
          <p className="mb-0.5 text-xs font-bold text-foreground">Playbook Description</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{playbook.description}</p>
        </div>

        {sourceDoc && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-bold text-foreground">Source SOP</p>
            <Link
              href={`/trainings-sop/detail?id=${sourceDoc.id}`}
              aria-label={`Open ${sourceDoc.fileName} in Trainings & SOP`}
              className="group flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 transition-colors group-hover:bg-muted">
                <FileText className="h-3 w-3 text-muted-foreground" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium leading-tight text-foreground truncate">
                  {sourceDoc.fileName}
                </p>
              </div>
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-primary"
                aria-hidden
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
        )}
      </div>

      {/* ── Task search bar ── */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search Playbook Tasks"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className={cn(
            "relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background shadow-sm transition-colors hover:bg-accent hover:text-foreground",
            activeFilterCount > 0 ? "text-primary border-primary/40" : "text-muted-foreground"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Tasks table (escalations-table pattern) ── */}
      <div className="overflow-x-auto">
        <table className="escalations-table table-borderless min-w-[900px]">
          <thead>
            <tr className="bg-muted/30">
              <ThCol field="name" label="Task" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <ThCol field="priority" label="Priority" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <ThCol field="dueAt" label="Due" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <ThCol field="status" label="Status" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <ThCol field="assignee" label="Name" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <ThCol field="property" label="Property" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <ThCol field="unit" label="Unit" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <ThCol field="category" label="Type" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => (
              <tr key={task.id} className="cursor-pointer table-row-hover" onClick={() => setSelectedTaskId(task.id)}>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
                  {task.name}
                </td>
                <td className="whitespace-nowrap px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={task.priority ?? "medium"}
                    onChange={(e) => updatePlaybookTask(playbook.id, task.id, { priority: e.target.value as Task["priority"] })}
                    className={cn(
                      "inline-flex cursor-pointer appearance-none rounded-full border-0 px-2 py-0.5 text-xs font-medium",
                      task.priority === "urgent" && "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
                      task.priority === "high" && "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
                      task.priority === "medium" && "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
                      task.priority === "low" && "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
                    )}
                  >
                    {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p!] ?? p}</option>)}
                  </select>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", dueBadge(task.dueAt))}>
                    {dueLabel(task.dueAt)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", statusBadge(task.status))}>
                    {task.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                  {task.assignee || <span className="text-muted-foreground">N/A</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                  {task.property}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                  {task.unit || "\u2014"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                  {task.category}
                </td>
                <td className="px-4 py-3">
                  {task.assignee ? (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-[10px] font-medium">{initials(task.assignee)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                      aria-label="Assign"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTasks.length === 0 && (
          <div className="mt-6 flex flex-col items-center gap-2 py-4 text-center">
            <p className="text-sm text-muted-foreground">No tasks match your {activeFilterCount > 0 ? "filters" : "search"}.</p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => { setFilterStatuses(new Set()); setFilterPriorities(new Set()); setFilterCategories(new Set()); setFilterAssignees(new Set()); }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Task detail sheet (reuses escalation detail) ── */}
      <EscalationDetailSheet
        item={selectedTask}
        open={!!selectedTaskId}
        onOpenChange={(o) => !o && setSelectedTaskId(null)}
      />

      {/* ── AI Assistant FAB + Chat Panel ── */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {fabOpen && (
          <div className="w-96 flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <img src="/eli-cube.svg" alt="" className="h-4 w-4" />
                <span className="text-sm font-semibold text-foreground">Playbook Assistant</span>
              </div>
              <button type="button" onClick={() => setFabOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <Chat
              messages={chatMessages}
              onSend={(text) => {
                setChatMessages((prev) => [
                  ...prev,
                  { role: "user", text },
                  { role: "assistant", text: "I can help with this playbook. What would you like to know?" },
                ]);
              }}
              placeholder="Ask about this playbook..."
              roleLabels={{ user: "You", assistant: "ELI+" }}
              roleVariant={{ user: "inbound", assistant: "outbound" }}
              messageListHeight={320}
              showAttach={false}
            />
          </div>
        )}
        <button
          type="button"
          onClick={() => setFabOpen((v) => !v)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label="Ask AI about this playbook"
        >
          <img src="/eli-cube.svg" alt="" className="h-7 w-7" />
        </button>
      </div>

      <CreateCustomTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        mode="template"
        title="Create Task"
        onSave={handleCreateTaskSave}
      />

      <PlaybookHistoryDialog
        playbook={playbook}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />

      <PlaybookNotesSheet
        playbookId={playbook.id}
        playbookName={playbook.templateName}
        notes={playbook.notes ?? []}
        open={notesOpen}
        onOpenChange={setNotesOpen}
      />

      {/* ── Filter dialog ── */}
      {playbook && (
        <TaskFilterDialog
          open={filterOpen}
          onOpenChange={setFilterOpen}
          tasks={playbook.tasks}
          filterStatuses={filterStatuses}
          filterPriorities={filterPriorities}
          filterCategories={filterCategories}
          filterAssignees={filterAssignees}
          onFilterStatuses={setFilterStatuses}
          onFilterPriorities={setFilterPriorities}
          onFilterCategories={setFilterCategories}
          onFilterAssignees={setFilterAssignees}
        />
      )}

      <Dialog open={deletePlaybookOpen} onOpenChange={setDeletePlaybookOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete playbook</DialogTitle>
            <DialogDescription>
              Remove <span className="font-medium text-foreground">{playbook.templateName}</span> and all of its tasks? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeletePlaybookOpen(false)}>Cancel</Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                removePlaybook(playbook.id);
                setDeletePlaybookOpen(false);
                router.push("/escalations/");
              }}
            >
              Delete playbook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ── Filter dialog ────────────────────────────────────────────────────────────

const TASK_STATUS_OPTIONS = ["In Progress", "On Hold", "Completed", "Blocked", "Open"];
const TASK_PRIORITY_OPTIONS: Array<{ value: NonNullable<Task["priority"]>; label: string }> = [
  { value: "urgent", label: "P0 – Urgent" },
  { value: "high",   label: "P1 – High" },
  { value: "medium", label: "P2 – Medium" },
  { value: "low",    label: "P3 – Low" },
];

// Normalize incoming task statuses for display-label matching
const STATUS_DISPLAY_MAP: Record<string, string> = {
  "In progress": "In Progress",
  "Done": "Completed",
};
function normalizeStatus(s: string): string {
  return STATUS_DISPLAY_MAP[s] ?? s;
}

function toggleSetItem<T>(set: Set<T>, item: T): Set<T> {
  const next = new Set(set);
  if (next.has(item)) next.delete(item);
  else next.add(item);
  return next;
}

// Reusable multi-select combobox
function MultiCombobox({
  label,
  options,
  selected,
  onToggle,
  placeholder,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: Set<string>;
  onToggle: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectedLabels = options.filter((o) => selected.has(o.value)).map((o) => o.label);
  const triggerLabel =
    selectedLabels.length === 0
      ? (placeholder ?? `Select ${label}`)
      : selectedLabels.length === 1
      ? selectedLabels[0]
      : `${selectedLabels[0]} +${selectedLabels.length - 1}`;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }} modal>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring",
              selected.size > 0 ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <span className="truncate">{triggerLabel}</span>
            <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[200]" align="start">
          <div className="border-b border-border p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">No options found</p>
            )}
            {filtered.map((opt) => {
              const active = selected.has(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onToggle(opt.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                    active && "bg-muted/60"
                  )}
                >
                  <span className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"
                  )}>
                    {active && <Check className="h-3 w-3" />}
                  </span>
                  <span className={active ? "font-medium text-foreground" : "text-foreground"}>{opt.label}</span>
                </button>
              );
            })}
          </div>
          {selected.size > 0 && (
            <div className="border-t border-border p-1.5">
              <button
                type="button"
                onClick={() => { options.forEach((o) => { if (selected.has(o.value)) onToggle(o.value); }); }}
                className="w-full rounded-sm px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Clear selection
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function TaskFilterDialog({
  open, onOpenChange, tasks,
  filterStatuses, filterPriorities, filterCategories, filterAssignees,
  onFilterStatuses, onFilterPriorities, onFilterCategories, onFilterAssignees,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tasks: Task[];
  filterStatuses: Set<string>;
  filterPriorities: Set<string>;
  filterCategories: Set<string>;
  filterAssignees: Set<string>;
  onFilterStatuses: (s: Set<string>) => void;
  onFilterPriorities: (s: Set<string>) => void;
  onFilterCategories: (s: Set<string>) => void;
  onFilterAssignees: (s: Set<string>) => void;
}) {
  const categoryOptions = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.category).filter(Boolean))).sort()
      .map((c) => ({ value: c, label: c })),
    [tasks]
  );

  const assigneeOptions = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.assignee).filter(Boolean))).sort()
      .map((a) => ({ value: a, label: a })),
    [tasks]
  );

  const activeCount = filterStatuses.size + filterPriorities.size + filterCategories.size + filterAssignees.size;

  const clearAll = () => {
    onFilterStatuses(new Set());
    onFilterPriorities(new Set());
    onFilterCategories(new Set());
    onFilterAssignees(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filter Tasks</DialogTitle>
          <DialogDescription>
            Narrow the task list by status, priority, type, or assignee.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <MultiCombobox
            label="Status"
            options={TASK_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            selected={filterStatuses}
            onToggle={(v) => onFilterStatuses(toggleSetItem(filterStatuses, v))}
            placeholder="All statuses"
          />
          <MultiCombobox
            label="Priority"
            options={TASK_PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label }))}
            selected={filterPriorities}
            onToggle={(v) => onFilterPriorities(toggleSetItem(filterPriorities, v))}
            placeholder="All priorities"
          />
          {categoryOptions.length > 0 && (
            <MultiCombobox
              label="Type"
              options={categoryOptions}
              selected={filterCategories}
              onToggle={(v) => onFilterCategories(toggleSetItem(filterCategories, v))}
              placeholder="All types"
            />
          )}
          {assigneeOptions.length > 0 && (
            <MultiCombobox
              label="Assignee"
              options={assigneeOptions}
              selected={filterAssignees}
              onToggle={(v) => onFilterAssignees(toggleSetItem(filterAssignees, v))}
              placeholder="All assignees"
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={activeCount === 0}
          >
            Clear all
          </Button>
          <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ThCol({ field, label, sortField, sortDir, onSort }: {
  field: SortField; label: string; sortField: SortField | null; sortDir: SortDir; onSort: (f: SortField) => void;
}) {
  return (
    <th
      className="cursor-pointer select-none px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground hover:text-foreground"
      onClick={() => onSort(field)}
    >
      {label}
      <ArrowUpDown className={cn("ml-1 inline h-3 w-3 shrink-0", sortField === field ? "text-foreground" : "text-muted-foreground/40")} />
    </th>
  );
}
