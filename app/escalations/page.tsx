"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { EscalationDetailSheet } from "@/components/escalation-detail-sheet";
import { useEscalations, type EscalationType } from "@/lib/escalations-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Clock, Flame } from "lucide-react";
import { ContractGate } from "@/components/contract-overlay";
import { useRole, isPropertyInScope } from "@/lib/role-context";

const CATEGORIES = ["All", "Payments", "Maintenance", "Leasing", "Accounting", "Compliance"];
const CATEGORY_LABELS: Record<string, string> = { All: "All categories", ...Object.fromEntries(CATEGORIES.filter((c) => c !== "All").map((c) => [c, c])) };
const STATUSES = ["All", "Open", "In progress", "Done"];
const STATUS_LABELS: Record<string, string> = { All: "All statuses", ...Object.fromEntries(STATUSES.filter((s) => s !== "All").map((s) => [s, s])) };
const PRIORITIES = ["All", "Urgent", "High", "Medium", "Low"];
const PRIORITY_LABELS: Record<string, string> = { All: "All priorities", ...Object.fromEntries(PRIORITIES.filter((p) => p !== "All").map((p) => [p, p])) };
const PROPERTY_LABEL_ALL = "All properties";
const TYPES: { value: EscalationType | "All"; label: string }[] = [
  { value: "All", label: "All types" },
  { value: "conversation", label: "Conversation" },
  { value: "approval", label: "Approval" },
  { value: "workflow", label: "Workflow" },
  { value: "training", label: "Training / clarity" },
  { value: "doc_improvement", label: "Policy / doc improvement" },
];

function formatType(t: EscalationType): string {
  const map: Record<EscalationType, string> = {
    conversation: "Conversation",
    approval: "Approval",
    workflow: "Workflow",
    training: "Training",
    doc_improvement: "Doc improvement",
  };
  return map[t] ?? t;
}

function formatDueDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "short" });
  } catch {
    return iso;
  }
}

function EscalationsContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const propertyParam = searchParams.get("property");
  const initialCategory =
    categoryParam && CATEGORIES.includes(categoryParam) ? categoryParam : "All";
  const { items: allItems, updateAssignee } = useEscalations();
  const { role, roleProperties } = useRole();
  const items = useMemo(() => {
    if (role === "admin") return allItems;
    if (role === "ic") {
      return allItems.filter(
        (i) => i.assignee === "Sarah" && isPropertyInScope(i.property, roleProperties)
      );
    }
    return allItems.filter((i) => isPropertyInScope(i.property, roleProperties));
  }, [allItems, role, roleProperties]);
  const propertiesFromItems = useMemo(() => {
    const set = new Set(items.map((i) => i.property));
    const list = ["All", ...Array.from(set).sort()];
    if (propertyParam && !list.includes(propertyParam)) list.push(propertyParam);
    return list;
  }, [items, propertyParam]);
  const initialProperty = propertyParam && propertiesFromItems.includes(propertyParam) ? propertyParam : "All";
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState<EscalationType | "All">("All");
  const [propertyFilter, setPropertyFilter] = useState(initialProperty);
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (categoryParam && CATEGORIES.includes(categoryParam)) {
      setCategoryFilter(categoryParam);
    }
  }, [categoryParam]);
  useEffect(() => {
    if (propertyParam && propertiesFromItems.includes(propertyParam)) {
      setPropertyFilter(propertyParam);
    }
  }, [propertyParam, propertiesFromItems]);

  const properties = propertiesFromItems;

  const filtered = useMemo(() => {
    return items.filter((row) => {
      if (categoryFilter !== "All" && row.category !== categoryFilter) return false;
      if (statusFilter !== "All" && row.status !== statusFilter) return false;
      if (typeFilter !== "All" && row.type !== typeFilter) return false;
      if (propertyFilter !== "All" && row.property !== propertyFilter) return false;
      if (priorityFilter !== "All") {
        const p = row.priority ?? "medium";
        if (priorityFilter === "Urgent" && p !== "urgent") return false;
        if (priorityFilter === "High" && p !== "high") return false;
        if (priorityFilter === "Medium" && p !== "medium") return false;
        if (priorityFilter === "Low" && p !== "low") return false;
      }
      return true;
    });
  }, [items, categoryFilter, statusFilter, typeFilter, propertyFilter, priorityFilter]);

  const propertyOptions = useMemo(
    () => [{ value: "All", label: PROPERTY_LABEL_ALL }, ...properties.filter((p) => p !== "All").map((p) => ({ value: p, label: p }))],
    [properties]
  );

  const selected = selectedId ? items.find((i) => i.id === selectedId) ?? null : null;

  const now = new Date();
  const openItems = filtered.filter((i) => i.status !== "Done");
  const openCount = openItems.length;
  const urgentCount = openItems.filter((i) => i.priority === "urgent" || i.priority === "high").length;
  const overdueCount = openItems.filter((i) => i.dueAt && new Date(i.dueAt) < now).length;
  const doneCount = filtered.filter((i) => i.status === "Done").length;

  return (
    <>
      <PageHeader
        title="Escalations"
        description="Tasks that need human attention — agent escalations, approvals, training, and policy improvements."
      />

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Open", value: openCount, icon: AlertCircle, color: openCount > 0 ? "text-foreground" : "text-muted-foreground" },
          { label: "Urgent / High", value: urgentCount, icon: Flame, color: urgentCount > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground" },
          { label: "Overdue", value: overdueCount, icon: Clock, color: overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground" },
          { label: "Resolved", value: doneCount, icon: CheckCircle2, color: "text-green-600 dark:text-green-400" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 py-3">
                <Icon className={cn("h-5 w-5 shrink-0", s.color)} />
                <div>
                  <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as EscalationType | "All")}
          className="select w-full"
          aria-label="Filter by type"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="select w-full"
          aria-label="Filter by category"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
          ))}
        </select>
        <select
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          className="select w-full"
          aria-label="Filter by property"
        >
          {propertyOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select w-full"
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="select w-full"
          aria-label="Filter by priority"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{PRIORITY_LABELS[p] ?? p}</option>
          ))}
        </select>
      </div>

      {/* Escalation list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {filtered.length} escalation{filtered.length !== 1 ? "s" : ""}
            </CardTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {openCount > 0 && <span>{openCount} open</span>}
              {urgentCount > 0 && <span className="text-amber-600 dark:text-amber-400">{urgentCount} urgent</span>}
              {overdueCount > 0 && <span className="text-red-600 dark:text-red-400">{overdueCount} overdue</span>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {filtered.map((row) => {
                const isOverdue = row.dueAt && new Date(row.dueAt) < now && row.status !== "Done";
                const isDone = row.status === "Done";
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/40",
                        isDone
                          ? "bg-muted/30 hover:bg-muted/50"
                          : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                      )}
                    >
                      {/* Left content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-sm font-medium",
                              isDone ? "text-muted-foreground line-through" : "text-foreground"
                            )}
                            title={row.name ?? row.summary}
                          >
                            {row.name ?? row.summary}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          <span>{formatType(row.type)}</span>
                          <span aria-hidden>·</span>
                          <span>{row.category}</span>
                          {row.property && (
                            <>
                              <span aria-hidden>·</span>
                              <span>{row.property}</span>
                            </>
                          )}
                          {row.escalatedByAgent && (
                            <>
                              <span aria-hidden>·</span>
                              <span>{row.escalatedByAgent}</span>
                            </>
                          )}
                          {row.dueAt && !isOverdue && row.status !== "Done" && (
                            <>
                              <span aria-hidden>·</span>
                              <span>Due {formatDueDate(row.dueAt)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right side: badges + status */}
                      <div className="flex shrink-0 items-center gap-2">
                        {isOverdue && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800 dark:bg-red-900/40 dark:text-red-200">
                            Overdue
                          </span>
                        )}
                        {!isOverdue && (row.priority === "urgent" || row.priority === "high") && !isDone && (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-medium",
                              row.priority === "urgent"
                                ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                            )}
                          >
                            {row.priority === "urgent" ? "Urgent" : "High"}
                          </span>
                        )}
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium",
                            isDone
                              ? "bg-muted text-muted-foreground"
                              : row.status === "In progress"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                                : "bg-primary/10 text-primary"
                          )}
                        >
                          {row.status}
                        </span>
                        {row.assignee && (
                          <span className="hidden text-xs text-muted-foreground sm:inline">
                            {row.assignee}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="mb-3 h-8 w-8 text-green-500" />
              <p className="text-sm font-medium text-foreground">No escalations match the filters</p>
              <p className="mt-1 text-xs text-muted-foreground">Try adjusting your filters to see more items.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <EscalationDetailSheet
        item={selected}
        open={!!selectedId}
        onOpenChange={(o) => !o && setSelectedId(null)}
      />
    </>
  );
}

export default function EscalationsPage() {
  return (
    <ContractGate featureName="Escalations">
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <EscalationsContent />
    </Suspense>
    </ContractGate>
  );
}
