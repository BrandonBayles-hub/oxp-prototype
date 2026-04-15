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
} from "lucide-react";
import { usePlaybooks, type PlaybookPriority, type PlaybookStatus } from "@/lib/playbooks-context";
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

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function priorityDot(p: string | undefined) {
  switch (p) {
    case "urgent": return "bg-red-500";
    case "high": return "bg-amber-400";
    case "medium": return "bg-blue-400";
    case "low": return "bg-green-400";
    default: return "bg-muted";
  }
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
const PLAYBOOK_STATUSES: PlaybookStatus[] = ["In Progress", "On Hold", "Completed", "Due Today", "Overdue"];
const TASK_PRIORITIES: Array<Task["priority"]> = ["urgent", "high", "medium", "low"];

export function PlaybookDetailClient() {
  const params = useParams();
  const router = useRouter();
  const { getPlaybook, updatePlaybook, updatePlaybookTask, removePlaybook } = usePlaybooks();
  const { hasPermission } = usePermissions();
  const canDeletePlaybook = hasPermission("p-playbooks-delete");
  const playbook = getPlaybook(params.id as string);

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [fabOpen, setFabOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deletePlaybookOpen, setDeletePlaybookOpen] = useState(false);
  const selectedTask = playbook?.tasks.find((t) => t.id === selectedTaskId) ?? null;

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

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
  }, [playbook, search, sortField, sortDir]);

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
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground">
            <SlidersHorizontal className="h-3 w-3" />
            Filters
          </button>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground shadow-sm hover:bg-accent">
            <Plus className="h-3 w-3" />
            Add Task
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

        {/* Assignee + Description */}
        {playbook.assignee && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-bold text-foreground">Assignee</p>
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px] font-medium">{initials(playbook.assignee)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">{playbook.assignee}</span>
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", {
                "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300": playbook.priority === "P0",
                "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300": playbook.priority === "P1",
                "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300": playbook.priority === "P2",
                "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300": playbook.priority === "P3",
              })}>
                <span className={cn("h-1.5 w-1.5 rounded-full", priorityDot(playbook.priority))} />
                {playbook.priority}
              </span>
            </div>
          </div>
        )}
        <div className="mt-3">
          <p className="mb-0.5 text-xs font-bold text-foreground">Playbook Description</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{playbook.description}</p>
        </div>
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
        <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
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
          <p className="mt-4 text-sm text-muted-foreground">No tasks match the search.</p>
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
                router.push("/escalations");
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
