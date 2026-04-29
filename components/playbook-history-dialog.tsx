"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Download, X, ListFilter, FileText, ExternalLink } from "lucide-react";
import type { Playbook } from "@/lib/playbooks-context";

/* ─────────────────────────────── Types ──────────────────────────────── */

type EventCategory = "Playbook" | "Task";

type HistoryEvent = {
  id: string;
  at: string;
  category: EventCategory;
  action: string;
  entity: string;
  entityId?: string;
  by: string;
  detail?: string;
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "P0",
  high: "P1",
  medium: "P2",
  low: "P3",
};

const SEED_NOTES = [
  "Confirmed with vendor — on-site tomorrow morning.",
  "Called resident, no answer — left voicemail.",
  "Waiting on asset manager sign-off before proceeding.",
  "Work order submitted, tracking #WO-4821.",
  "Vendor confirmed ETA, awaiting arrival.",
  "Follow-up scheduled for tomorrow.",
  "Regional manager looped in via email.",
  "PO approved, vendor proceeding.",
];

const SEED_DOCS = [
  "photo_damage.jpg",
  "work_order_4821.pdf",
  "insurance_claim_form.pdf",
  "bid_comparison.pdf",
  "inspection_report.pdf",
  "vendor_invoice_INV-5523.pdf",
  "resident_notice.pdf",
  "remediation_clearance.pdf",
];

const SEED_LINKS = [
  "Entrata Work Order #4821",
  "Insurance Portal — Claim #2024-0938",
  "Vendor Invoice #INV-5523",
  "Entrata Resident Ledger",
  "Restoration Vendor Quote",
  "Entrata Maintenance Request #MR-7742",
];

const SYSTEM_USER = "ELI+";

/* ─────────────────────────── Event Synthesis ──────────────────────────
   The prototype doesn't persist a full audit trail, so we synthesize a
   plausible, deterministic history from the playbook's metadata + tasks. */

function shiftIso(base: string, hours: number): string {
  const d = new Date(base);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

function buildHistory(playbook: Playbook): HistoryEvent[] {
  const events: HistoryEvent[] = [];
  const launched = playbook.launchedAt;
  const created = playbook.createdAt;
  const launchOwner = playbook.assignee || SYSTEM_USER;

  events.push({
    id: `pe-${playbook.id}-created`,
    at: created,
    category: "Playbook",
    action: "Created",
    entity: playbook.templateName,
    by: SYSTEM_USER,
    detail: `${playbook.property}${playbook.unit ? ` · Unit ${playbook.unit}` : ""}`,
  });

  if (playbook.description) {
    events.push({
      id: `pe-${playbook.id}-desc`,
      at: shiftIso(created, 1),
      category: "Playbook",
      action: "Description set",
      entity: playbook.templateName,
      by: SYSTEM_USER,
      detail: playbook.description,
    });
  }

  if (playbook.assignee) {
    events.push({
      id: `pe-${playbook.id}-assignee`,
      at: shiftIso(created, 2),
      category: "Playbook",
      action: "Assignee set",
      entity: playbook.templateName,
      by: SYSTEM_USER,
      detail: playbook.assignee,
    });
  }

  if (playbook.recurring) {
    events.push({
      id: `pe-${playbook.id}-recurring`,
      at: shiftIso(created, 3),
      category: "Playbook",
      action: "Schedule set",
      entity: playbook.templateName,
      by: launchOwner,
      detail: playbook.recurring.frequency.charAt(0).toUpperCase() + playbook.recurring.frequency.slice(1),
    });
  }

  events.push({
    id: `pe-${playbook.id}-launched`,
    at: launched,
    category: "Playbook",
    action: "Launched",
    entity: playbook.templateName,
    by: launchOwner,
    detail: `Due ${new Date(playbook.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
  });

  if (playbook.status !== "In Progress") {
    events.push({
      id: `pe-${playbook.id}-status`,
      at: shiftIso(launched, 6),
      category: "Playbook",
      action: "Status changed",
      entity: playbook.templateName,
      by: launchOwner,
      detail: playbook.status,
    });
  }

  playbook.tasks.forEach((task, idx) => {
    const baseOffset = idx * 0.5;
    const createdAt = shiftIso(launched, baseOffset);
    const assignedAt = shiftIso(launched, baseOffset + 0.25);
    const startedAt = shiftIso(launched, baseOffset + 1);
    const finishedAt = shiftIso(launched, baseOffset + 4 + idx * 0.25);
    const taskName = task.name ?? task.summary ?? "Task";

    events.push({
      id: `te-${task.id}-added`,
      at: createdAt,
      category: "Task",
      action: "Added",
      entity: taskName,
      entityId: task.id,
      by: launchOwner,
      detail: `${task.category}${task.unit ? ` · Unit ${task.unit}` : ""} · ${PRIORITY_LABEL[task.priority ?? "medium"] ?? "P2"}`,
    });

    if (task.assignee) {
      events.push({
        id: `te-${task.id}-assigned`,
        at: assignedAt,
        category: "Task",
        action: "Assigned",
        entity: taskName,
        entityId: task.id,
        by: launchOwner,
        detail: task.assignee,
      });
    }

    if (task.status === "In progress" || task.status === "Done") {
      events.push({
        id: `te-${task.id}-started`,
        at: startedAt,
        category: "Task",
        action: "Started",
        entity: taskName,
        entityId: task.id,
        by: task.assignee || launchOwner,
      });
    }

    if (task.status === "Done") {
      events.push({
        id: `te-${task.id}-completed`,
        at: finishedAt,
        category: "Task",
        action: "Completed",
        entity: taskName,
        entityId: task.id,
        by: task.assignee || launchOwner,
      });
    }

    if (task.status === "Blocked") {
      events.push({
        id: `te-${task.id}-blocked`,
        at: shiftIso(launched, baseOffset + 2),
        category: "Task",
        action: "Blocked",
        entity: taskName,
        entityId: task.id,
        by: task.assignee || launchOwner,
      });
    }

    // Sprinkle notes, docs, and links on tasks that have been touched
    const isTouched = task.status === "In progress" || task.status === "Done" || task.status === "Blocked";
    if (isTouched) {
      if (idx % 3 === 0) {
        events.push({
          id: `te-${task.id}-note`,
          at: shiftIso(launched, baseOffset + 1.5),
          category: "Task",
          action: "Note added",
          entity: taskName,
          entityId: task.id,
          by: task.assignee || launchOwner,
          detail: SEED_NOTES[idx % SEED_NOTES.length],
        });
      }
      if (idx % 4 === 0) {
        events.push({
          id: `te-${task.id}-doc`,
          at: shiftIso(launched, baseOffset + 2),
          category: "Task",
          action: "Document attached",
          entity: taskName,
          entityId: task.id,
          by: task.assignee || launchOwner,
          detail: SEED_DOCS[idx % SEED_DOCS.length],
        });
      }
      if (idx % 5 === 0 && idx > 0) {
        events.push({
          id: `te-${task.id}-link`,
          at: shiftIso(launched, baseOffset + 2.5),
          category: "Task",
          action: "Link added",
          entity: taskName,
          entityId: task.id,
          by: task.assignee || launchOwner,
          detail: SEED_LINKS[idx % SEED_LINKS.length],
        });
      }
    }
  });

  return events.sort((a, b) => (a.at < b.at ? 1 : -1));
}

/* ─────────────────────────── UI helpers ─────────────────────────────── */

const DATE_RANGES = ["All Time", "Last 24 Hours", "Last 7 Days", "Last 30 Days", "Last 90 Days"] as const;
type DateRange = (typeof DATE_RANGES)[number];

function withinRange(iso: string, range: DateRange): boolean {
  if (range === "All Time") return true;
  const days =
    range === "Last 24 Hours" ? 1 :
    range === "Last 7 Days" ? 7 :
    range === "Last 30 Days" ? 30 : 90;
  const ms = days * 86_400_000;
  return Date.now() - new Date(iso).getTime() <= ms;
}

/* ─────────────────────────────── Component ──────────────────────────── */

export function PlaybookHistoryDialog({
  playbook,
  open,
  onOpenChange,
}: {
  playbook: Playbook | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"All" | EventCategory>("All");
  const [actionFilter, setActionFilter] = useState<string>("All");
  const [userFilter, setUserFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<DateRange>("All Time");

  const events = useMemo(() => (playbook ? buildHistory(playbook) : []), [playbook]);

  const uniqueActions = useMemo(() => {
    const set = new Set(events.map((e) => e.action));
    return ["All", ...Array.from(set).sort()];
  }, [events]);

  const uniqueUsers = useMemo(() => {
    const set = new Set(events.map((e) => e.by).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [events]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (categoryFilter !== "All" && e.category !== categoryFilter) return false;
      if (actionFilter !== "All" && e.action !== actionFilter) return false;
      if (userFilter !== "All" && e.by !== userFilter) return false;
      if (!withinRange(e.at, dateFilter)) return false;
      if (q) {
        const blob = `${e.action} ${e.entity} ${e.by} ${e.detail ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [events, search, categoryFilter, actionFilter, userFilter, dateFilter]);

  const activeFilterCount =
    (categoryFilter !== "All" ? 1 : 0) +
    (actionFilter !== "All" ? 1 : 0) +
    (userFilter !== "All" ? 1 : 0) +
    (dateFilter !== "All Time" ? 1 : 0);

  const clearAll = () => {
    setCategoryFilter("All");
    setActionFilter("All");
    setUserFilter("All");
    setDateFilter("All Time");
    setSearch("");
  };

  const handleExportCsv = () => {
    if (!playbook) return;
    const headers = ["Item", "Type", "Action", "Details", "Date", "User"];
    const rows = filtered.map((e) => [
      e.entity,
      e.category,
      e.action,
      e.detail ?? "",
      new Date(e.at).toLocaleString(),
      e.by,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const slug = playbook.templateName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `playbook-history_${slug}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!playbook) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="px-6 pb-3 pt-6">
          <DialogTitle>Playbook history</DialogTitle>
          <DialogDescription className="sr-only">
            Activity and task events for {playbook.templateName}. Use filters and search to narrow the list, or export to CSV.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex flex-col gap-2 border-b border-border px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64 min-w-[12rem]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search history..."
                className="input-base pl-8 pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as "All" | EventCategory)}
              className="select-base w-auto min-w-[8rem]"
            >
              <option value="All">Type: All</option>
              <option value="Playbook">Type: Playbook</option>
              <option value="Task">Type: Task</option>
            </select>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="select-base w-auto min-w-[9rem]"
            >
              {uniqueActions.map((a) => (
                <option key={a} value={a}>
                  {a === "All" ? "Action: All" : a}
                </option>
              ))}
            </select>

            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="select-base w-auto min-w-[9rem]"
            >
              {uniqueUsers.map((u) => (
                <option key={u} value={u}>
                  {u === "All" ? "User: All" : u}
                </option>
              ))}
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateRange)}
              className="select-base w-auto min-w-[9rem]"
            >
              {DATE_RANGES.map((r) => (
                <option key={r} value={r}>
                  {r === "All Time" ? "Date: All Time" : r}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="icon"
              onClick={handleExportCsv}
              disabled={filtered.length === 0}
              className="ml-auto shrink-0"
              aria-label="Export CSV"
              title="Export CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing{" "}
              <span className="font-medium text-foreground tabular-nums">{filtered.length}</span>
              {" "}of{" "}
              <span className="font-medium text-foreground tabular-nums">{events.length}</span>
              {" "}events
            </span>
            {(activeFilterCount > 0 || search) && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <ListFilter className="h-3 w-3" />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Table area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {filtered.length === 0 ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-1.5 px-6 py-12 text-center">
              <p className="text-sm font-medium text-foreground">No history matches your filters</p>
              <p className="text-xs text-muted-foreground">
                Try clearing filters or adjusting the date range.
              </p>
            </div>
          ) : (
            <table className="escalations-table table-borderless w-full">
              <thead className="sticky top-0 z-10 bg-muted/30 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
                <tr>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Date</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="table-row-hover">
                    <td className="max-w-[220px] truncate px-4 py-3 text-sm font-medium text-foreground">
                      {e.entity}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {e.category}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                      {e.action}
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-sm text-muted-foreground">
                      {e.action === "Document attached" && e.detail ? (
                        <a
                          href="#"
                          onClick={(ev) => ev.preventDefault()}
                          className="inline-flex max-w-full items-center gap-1.5 truncate text-primary hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{e.detail}</span>
                        </a>
                      ) : e.action === "Link added" && e.detail ? (
                        <a
                          href="#"
                          onClick={(ev) => ev.preventDefault()}
                          className="inline-flex max-w-full items-center gap-1.5 truncate text-primary hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{e.detail}</span>
                        </a>
                      ) : (
                        e.detail ?? "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {new Date(e.at).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {e.by ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5 text-[9px]">
                            <AvatarFallback className="bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200">
                              {e.by.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {e.by}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
