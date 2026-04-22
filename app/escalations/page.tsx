"use client";

import { Suspense, useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, AlertTriangle, Clock, CheckCircle2, Search, X, ArrowLeftRight, TrendingUp, BarChart3, Plus, Settings, Check, SlidersHorizontal, ArrowUpDown, ChevronDown, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EscalationDetailSheet } from "@/components/escalation-detail-sheet";
import { CustomTaskDetailSheet } from "@/components/custom-task-detail-sheet";
import { CreateCustomTaskDialog } from "@/components/create-custom-task-dialog";
import {
  useEscalations,
  useEscalationAnalytics,
  type EscalationType,
  ESCALATION_STATUSES,
} from "@/lib/escalations-context";
import { useFeedback } from "@/lib/feedback-context";
import { useWorkforce } from "@/lib/workforce-context";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRole } from "@/lib/role-context";
import { usePermissions } from "@/lib/permissions-context";
import { usePlaybooks, type PlaybookPriority } from "@/lib/playbooks-context";
import { SEED_PLAYBOOK_TEMPLATES } from "@/lib/playbook-templates-data";
import { PROPERTIES } from "@/lib/specialties-data";
import { PropertySelector } from "@/components/property-selector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "Payments", "Maintenance", "Leasing", "Accounting", "Compliance"];
const CATEGORY_LABELS: Record<string, string> = { All: "All categories", ...Object.fromEntries(CATEGORIES.filter((c) => c !== "All").map((c) => [c, c])) };
const STATUSES = ["All", ...ESCALATION_STATUSES];
const STATUS_LABELS: Record<string, string> = { All: "All statuses", ...Object.fromEntries(ESCALATION_STATUSES.map((s) => [s, s])) };
const PRIORITIES = ["All", "Urgent", "High", "Medium", "Low"];
const PRIORITY_LABELS: Record<string, string> = { All: "All priorities", Urgent: "Urgent", High: "High", Medium: "Medium", Low: "Low" };
const PROPERTY_LABEL_ALL = "All properties";
const SPECIALTIES_FILTER = [
  "All", "Onsite Leasing", "Centralized Leasing", "Onsite Maintenance",
  "Centralized Maintenance", "Renewals", "Compliance", "Accounting",
];
const SPECIALTY_LABELS: Record<string, string> = { All: "All Specialties", ...Object.fromEntries(SPECIALTIES_FILTER.filter((s) => s !== "All").map((s) => [s, s])) };
const TYPES: { value: EscalationType | "All"; label: string }[] = [
  { value: "All", label: "All types" },
  { value: "conversation", label: "Conversation" },
  { value: "approval", label: "Approval" },
  { value: "workflow", label: "Workflow" },
  { value: "training", label: "Training / clarity" },
  { value: "doc_improvement", label: "Policy / doc improvement" },
];

const MOCK_UNITS = [
  { value: "101", label: "Unit 101" },
  { value: "102", label: "Unit 102" },
  { value: "103", label: "Unit 103" },
  { value: "104", label: "Unit 104" },
  { value: "201", label: "Unit 201" },
  { value: "202", label: "Unit 202" },
  { value: "203", label: "Unit 203" },
  { value: "204", label: "Unit 204" },
  { value: "301", label: "Unit 301" },
  { value: "302", label: "Unit 302" },
  { value: "303", label: "Unit 303" },
  { value: "401", label: "Unit 401" },
  { value: "402", label: "Unit 402" },
];

function EscalationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const propertyParam = searchParams.get("property");
  const initialCategory =
    categoryParam && CATEGORIES.includes(categoryParam) ? categoryParam : "All";
  const { items, updateAssignee, bulkAssign, bulkUpdateStatus, bulkDelete, bulkAddLabels, addEscalation } = useEscalations();
  const { suggestedEscalations } = useFeedback();
  const { linkEscalation } = useFeedback();
  const { humanMembers, getCurrentUser, getDirectReports } = useWorkforce();
  const { role } = useRole();
  const { hasPermission } = usePermissions();
  const canAccessSettings = hasPermission("p-tasks-edit-specialty");
  const { addPlaybook } = usePlaybooks();
  const analytics = useEscalationAnalytics();

  const currentUser = useMemo(() => getCurrentUser(role), [getCurrentUser, role]);
  const directReportNames = useMemo(() => {
    if (!currentUser) return new Set<string>();
    const reports = getDirectReports(currentUser.id);
    const names = new Set<string>();
    const collectAll = (memberId: string) => {
      const children = getDirectReports(memberId);
      for (const child of children) {
        names.add(child.name);
        collectAll(child.id);
      }
    };
    collectAll(currentUser.id);
    return names;
  }, [currentUser, getDirectReports]);

  const [showAllTeam, setShowAllTeam] = useState(true);

  const propertiesFromItems = useMemo(() => {
    const set = new Set(items.map((i) => i.property));
    const list = ["All", ...Array.from(set).sort()];
    if (propertyParam && !list.includes(propertyParam)) list.push(propertyParam);
    return list;
  }, [items, propertyParam]);
  const initialProperty = propertyParam && propertiesFromItems.includes(propertyParam) ? propertyParam : "All";
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(() => initialCategory !== "All" ? new Set([initialCategory]) : new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [propertyFilter, setPropertyFilter] = useState<Set<string>>(() => initialProperty !== "All" ? new Set([initialProperty]) : new Set());
  const [priorityFilter, setPriorityFilter] = useState<Set<string>>(new Set());
  const [assigneeFilter, setAssigneeFilter] = useState<Set<string>>(new Set());
  const [specialtyFilter, setSpecialtyFilter] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [activeTab, setActiveTab] = useState<"escalations" | "playbooks">("escalations");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [showLaunchPlaybook, setShowLaunchPlaybook] = useState(false);
  const [launchTemplateId, setLaunchTemplateId] = useState("");
  const [launchPropertyIds, setLaunchPropertyIds] = useState<Set<string>>(new Set());
  const [launchUnits, setLaunchUnits] = useState<Set<string>>(new Set());
  const [launchAssignee, setLaunchAssignee] = useState("");

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categoryFilter.size > 0) count++;
    if (statusFilter.size > 0) count++;
    if (typeFilter.size > 0) count++;
    if (propertyFilter.size > 0) count++;
    if (priorityFilter.size > 0) count++;
    if (specialtyFilter.size > 0) count++;
    if (assigneeFilter.size > 0) count++;
    return count;
  }, [categoryFilter, statusFilter, typeFilter, propertyFilter, priorityFilter, specialtyFilter, assigneeFilter]);

  const assigneeNames = useMemo(
    () => ["Unassigned", ...humanMembers.map((m) => m.name).sort()],
    [humanMembers]
  );

  useEffect(() => {
    if (categoryParam && CATEGORIES.includes(categoryParam)) {
      setCategoryFilter(new Set([categoryParam]));
    }
  }, [categoryParam]);
  useEffect(() => {
    if (propertyParam && propertiesFromItems.includes(propertyParam)) {
      setPropertyFilter(new Set([propertyParam]));
    }
  }, [propertyParam, propertiesFromItems]);

  const properties = propertiesFromItems;

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return items.filter((row) => {
      if (categoryFilter.size > 0 && !categoryFilter.has(row.category)) return false;
      if (statusFilter.size > 0 && !statusFilter.has(row.status)) return false;
      if (typeFilter.size > 0 && !typeFilter.has(row.type)) return false;
      if (propertyFilter.size > 0 && !propertyFilter.has(row.property)) return false;
      if (priorityFilter.size > 0) {
        const p = row.priority ?? "medium";
        const pTitle = p.charAt(0).toUpperCase() + p.slice(1);
        if (!priorityFilter.has(pTitle)) return false;
      }
      if (assigneeFilter.size > 0) {
        const a = row.assignee || "Unassigned";
        if (!assigneeFilter.has(a)) return false;
      }
      if (currentUser) {
        const assignee = row.assignee || "";
        if (showAllTeam) {
          if (assignee !== currentUser.name && !directReportNames.has(assignee)) return false;
        } else {
          if (assignee !== currentUser.name) return false;
        }
      }
      if (q) {
        const searchable = [
          row.summary, row.name, row.category, row.property,
          row.escalatedByAgent, row.assignee, row.aiReasonForEscalation,
          ...(row.labels ?? []),
          ...(row.notes ?? []).map((n) => n.text),
        ].filter(Boolean).join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [items, categoryFilter, statusFilter, typeFilter, propertyFilter, priorityFilter, assigneeFilter, searchQuery, showAllTeam, currentUser, directReportNames]);

  const propertyOptions = useMemo(
    () => [{ value: "All", label: PROPERTY_LABEL_ALL }, ...properties.filter((p) => p !== "All").map((p) => ({ value: p, label: p }))],
    [properties]
  );

  const openCount = items.filter((i) => i.status !== "Done").length;
  const urgentHighCount = items.filter((i) => i.status !== "Done" && (i.priority === "urgent" || i.priority === "high")).length;
  const overdueCount = items.filter((i) => i.status !== "Done" && i.dueAt && new Date(i.dueAt) < new Date()).length;
  const resolvedCount = items.filter((i) => i.status === "Done").length;
  const handedBackCount = items.filter((i) => i.status === "Handed back to agent").length;

  const selected = selectedId ? items.find((i) => i.id === selectedId) ?? null : null;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolledRight, setIsScrolledRight] = useState(false);
  const [scrollbarVisible, setScrollbarVisible] = useState(false);
  const scrollbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    setIsScrolledRight((el?.scrollLeft ?? 0) > 0);
    setScrollbarVisible(true);
    if (scrollbarTimeoutRef.current) clearTimeout(scrollbarTimeoutRef.current);
    scrollbarTimeoutRef.current = setTimeout(() => setScrollbarVisible(false), 1500);
  }, []);

  // Bulk selection
  const allFilteredSelected = filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id));
  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)));
    }
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const [bulkAssignee, setBulkAssignee] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");

  const handleBulkAssign = () => {
    if (!bulkAssignee || selectedIds.size === 0) return;
    bulkAssign(Array.from(selectedIds), bulkAssignee);
    setBulkAssignee("");
    setSelectedIds(new Set());
  };

  const handleBulkStatus = () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    bulkUpdateStatus(Array.from(selectedIds), bulkStatus);
    setBulkStatus("");
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} item(s)?`)) return;
    bulkDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  // Create escalation from feedback suggestion
  const handleCreateFromFeedback = (fb: typeof suggestedEscalations[0]) => {
    const escId = addEscalation({
      type: "training",
      summary: `Feedback: ${fb.comment ?? fb.messageText.slice(0, 80)}`,
      category: "Training",
      property: "Portfolio",
      escalatedByAgent: fb.agentName,
      aiReasonForEscalation: `Negative feedback received: "${fb.comment ?? fb.messageText}"`,
      status: "Open",
      assignee: "",
      feedbackId: fb.id,
    });
    linkEscalation(fb.id, escId);
  };

  const handleCreateTask = () => {
    setShowCreateTaskDialog(true);
  };

  const handleCreateTaskSave = (task: import("@/lib/specialties-data").TaskTemplate) => {
    const escId = addEscalation({
      type: "workflow",
      name: task.name,
      summary: task.name,
      category: "Leasing",
      property: task.property ?? "Portfolio",
      escalatedByAgent: "Manual",
      aiReasonForEscalation: task.description || "Created manually from the escalations toolbar.",
      status: "Open",
      assignee: task.assignee ?? "",
      priority: "medium",
      descriptionHtml: task.descriptionHtml,
      sections: task.sections,
    });
    setSelectedId(escId);
  };

  const handleLaunchPlaybook = () => {
    const template = SEED_PLAYBOOK_TEMPLATES.find((t) => t.id === launchTemplateId);
    if (!template || launchPropertyIds.size === 0) return;

    const selectedProperties = Array.from(launchPropertyIds);
    const primaryProperty = selectedProperties[0];
    const unitsString = launchUnits.size > 0 ? Array.from(launchUnits).join(", ") : undefined;

    const now = new Date().toISOString();
    const PRIORITY_MAP: Record<string, PlaybookPriority> = { P0: "P0", P1: "P1", P2: "P2", P3: "P3" };

    const tasks = template.tasks.map((t) => ({
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: t.name,
      type: "workflow" as const,
      summary: t.name,
      category: "Playbook",
      property: primaryProperty,
      status: "Open",
      assignee: launchAssignee === "unassigned" ? "" : launchAssignee,
      priority: ({ P0: "urgent", P1: "high", P2: "medium", P3: "low" } as const)[t.priority] ?? ("medium" as const),
      dueAt: now,
      createdAt: now,
      unit: unitsString,
    }));

    addPlaybook({
      templateName: template.name,
      property: primaryProperty,
      properties: selectedProperties,
      unit: unitsString,
      createdAt: now.split("T")[0],
      dueAt: now,
      launchedAt: now,
      status: "In Progress",
      priority: PRIORITY_MAP[template.priority] ?? "P2",
      assignee: launchAssignee === "unassigned" ? "" : launchAssignee,
      description: template.description,
      tasks,
    });

    setShowLaunchPlaybook(false);
    setActiveTab("playbooks");
  };

  return (
    <>
      <div className="-mt-2 mb-3 flex justify-center py-2 relative">
        <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("escalations")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              activeTab === "escalations"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Escalations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("playbooks")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              activeTab === "playbooks"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Playbooks
          </button>
        </div>
        <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {canAccessSettings && (
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-background hover:bg-background/90"
              aria-label="Settings"
              onClick={() => router.push("/escalations/settings")}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          {role !== "ic" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-background hover:bg-background/90"
                  aria-label="Add escalation"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={handleCreateTask}>Create Task</DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setLaunchTemplateId(""); setLaunchPropertyIds(new Set()); setLaunchUnits(new Set()); setLaunchAssignee(""); setTimeout(() => setShowLaunchPlaybook(true), 50); }}>Launch Playbook</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      {activeTab === "escalations" ? (
        <>
      <PageHeader
        title="Escalations"
        description="Tasks that need human attention — agent escalations, approvals, training, and policy improvements."
      />

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {([
          { label: "Open", value: openCount, icon: AlertCircle, color: openCount > 0 ? "text-foreground" : "text-muted-foreground" },
          { label: "Urgent / High", value: urgentHighCount, icon: AlertTriangle, color: urgentHighCount > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground" },
          { label: "Overdue", value: overdueCount, icon: Clock, color: overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground" },
          { label: "Handed Back", value: handedBackCount, icon: ArrowLeftRight, color: handedBackCount > 0 ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground" },
          { label: "Resolved", value: resolvedCount, icon: CheckCircle2, color: "text-green-600 dark:text-green-400" },
        ] as const).map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-0 pt-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 py-1.5">
                <span className={cn("text-xl font-semibold tracking-tight", stat.color)}>
                  {stat.value}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Feedback suggestions (hidden until ready to introduce) */}
      {false && suggestedEscalations.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-4">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
            Suggested escalations from feedback ({suggestedEscalations.length})
          </h3>
          <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
            Negative feedback that may need a training escalation to improve agent behavior.
          </p>
          <div className="space-y-2">
            {suggestedEscalations.slice(0, 3).map((fb) => (
              <div key={fb.id} className="flex items-center justify-between gap-3 rounded-md border border-amber-200 dark:border-amber-800 bg-background px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{fb.agentName}</p>
                  <p className="text-xs text-muted-foreground truncate">{fb.comment ?? fb.messageText}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 text-xs"
                  onClick={() => handleCreateFromFeedback(fb)}
                >
                  Create escalation
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics toggle (hidden — analytics live on Performance page) */}
      {false && (<>
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setShowAnalytics(!showAnalytics)}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          {showAnalytics ? "Hide analytics" : "Show analytics"}
        </Button>
      </div>

      {/* Analytics panel */}
      {showAnalytics && (
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardHeader className="px-4 pb-0 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Avg First Response</CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-1.5">
                <span className="text-lg font-semibold">
                  {analytics.avgFirstResponseMs > 0 ? formatDurationShort(analytics.avgFirstResponseMs) : "N/A"}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="px-4 pb-0 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Avg Resolution</CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-1.5">
                <span className="text-lg font-semibold">
                  {analytics.avgResolutionMs > 0 ? formatDurationShort(analytics.avgResolutionMs) : "N/A"}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="px-4 pb-0 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total</CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-1.5">
                <span className="text-lg font-semibold">{analytics.total}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="px-4 pb-0 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Resolution Rate</CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-1.5">
                <span className="text-lg font-semibold">
                  {analytics.total > 0 ? `${Math.round((analytics.resolved / analytics.total) * 100)}%` : "N/A"}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Distribution charts (simple bar representation) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="px-4 pb-2 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">By Category</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {analytics.byCategory.map((t) => (
                  <div key={t.label} className="mt-1.5 flex items-center gap-2">
                    <span className="w-20 shrink-0 text-xs text-muted-foreground truncate">{t.label}</span>
                    <div className="flex-1 rounded-full bg-muted h-2">
                      <div
                        className="h-2 rounded-full bg-primary/60"
                        style={{ width: `${Math.min(100, (t.count / Math.max(analytics.total, 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs font-medium">{t.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="px-4 pb-2 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">By Agent</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {analytics.byAgent.map((t) => (
                  <div key={t.label} className="mt-1.5 flex items-center gap-2">
                    <span className="w-24 shrink-0 text-xs text-muted-foreground truncate">{t.label}</span>
                    <div className="flex-1 rounded-full bg-muted h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500/60"
                        style={{ width: `${Math.min(100, (t.count / Math.max(analytics.total, 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs font-medium">{t.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Pattern detection */}
          {analytics.patterns.length > 0 && (
            <Card>
              <CardHeader className="px-4 pb-2 pt-4">
                <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Detected Patterns
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ul className="space-y-1">
                  {analytics.patterns.map((p, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      {p}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      </>)}

      {/* Search + Filters row */}
      <div className="mb-6 flex items-center gap-2">
        <div className="relative w-52 shrink-0">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search escalations"
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-7 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">All</span>
          <Switch
            checked={showAllTeam}
            onCheckedChange={setShowAllTeam}
            aria-label="Show tasks for me and my direct reports"
          />
        </div>
      </div>

      {/* Filters dialog */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Escalations</DialogTitle>
            <DialogDescription>Narrow results by one or more criteria.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <FilterRow label="Category">
              <MultiCheckList
                options={CATEGORIES.filter((c) => c !== "All").map((c) => ({ value: c, label: CATEGORY_LABELS[c] ?? c }))}
                selected={categoryFilter}
                onChange={setCategoryFilter}
                placeholder="All categories"
              />
            </FilterRow>
            <FilterRow label="Status">
              <MultiCheckList
                options={STATUSES.filter((s) => s !== "All").map((s) => ({ value: s, label: STATUS_LABELS[s] ?? s }))}
                selected={statusFilter}
                onChange={setStatusFilter}
                placeholder="All statuses"
              />
            </FilterRow>
            <FilterRow label="Tasks">
              <MultiCheckList
                options={TYPES.filter((t) => t.value !== "All").map((t) => ({ value: t.value, label: t.label }))}
                selected={typeFilter}
                onChange={setTypeFilter}
                placeholder="All types"
              />
            </FilterRow>
            <FilterRow label="Priority">
              <MultiCheckList
                options={PRIORITIES.filter((p) => p !== "All").map((p) => ({ value: p, label: PRIORITY_LABELS[p] ?? p }))}
                selected={priorityFilter}
                onChange={setPriorityFilter}
                placeholder="All priorities"
              />
            </FilterRow>
            <FilterRow label="Property">
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-xs",
                      propertyFilter.size === 0 && "text-muted-foreground"
                    )}
                  >
                    <span className="truncate">
                      {propertyFilter.size === 0 ? "All properties" : `${propertyFilter.size} selected`}
                    </span>
                    <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0 z-[200]" align="start" sideOffset={4}>
                  <PropertySelector
                    selected={propertyFilter}
                    onSelectionChange={setPropertyFilter}
                    className="h-[360px] border-0 shadow-none rounded-md"
                  />
                </PopoverContent>
              </Popover>
            </FilterRow>
            <FilterRow label="Specialty">
              <MultiCheckList
                options={SPECIALTIES_FILTER.filter((s) => s !== "All").map((s) => ({ value: s, label: SPECIALTY_LABELS[s] ?? s }))}
                selected={specialtyFilter}
                onChange={setSpecialtyFilter}
                placeholder="All specialties"
              />
            </FilterRow>
            <FilterRow label="Assignee">
              <MultiCheckList
                options={assigneeNames.map((a) => ({ value: a, label: a }))}
                selected={assigneeFilter}
                onChange={setAssigneeFilter}
                placeholder="All assignees"
              />
            </FilterRow>
          </div>
          {activeFilterCount > 0 && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setCategoryFilter(new Set());
                  setStatusFilter(new Set());
                  setTypeFilter(new Set());
                  setPriorityFilter(new Set());
                  setPropertyFilter(new Set());
                  setSpecialtyFilter(new Set());
                  setAssigneeFilter(new Set());
                }}
              >
                Clear all filters
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <select
            value={bulkAssignee}
            onChange={(e) => setBulkAssignee(e.target.value)}
            className="h-8 rounded border border-input bg-background px-2 text-xs"
          >
            <option value="">Assign to...</option>
            {assigneeNames.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleBulkAssign} disabled={!bulkAssignee}>
            Assign
          </Button>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="h-8 rounded border border-input bg-background px-2 text-xs"
          >
            <option value="">Set status...</option>
            {ESCALATION_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleBulkStatus} disabled={!bulkStatus}>
            Update
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleBulkDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className={`overflow-x-auto scrollbar-hover ${scrollbarVisible ? "scrollbar-visible" : ""}`}
        data-sticky-scrolled={isScrolledRight ? "true" : undefined}
      >
        <table className="escalations-table table-borderless min-w-[900px]">
          <thead>
            <tr className="bg-muted/30">
              <th className="w-10 px-2 py-3">
                <input
                  type="checkbox"
                  checked={allFilteredSelected && filtered.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-border"
                  aria-label="Select all"
                />
              </th>
              <th className="sticky-col sticky left-0 z-10 min-w-[220px] border-r border-border bg-muted px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground">
                Summary
              </th>
              <th className="min-w-[110px] px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground">Type</th>
              <th className="min-w-[100px] px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground">Category</th>
              <th className="min-w-[100px] px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground">Property</th>
              <th className="min-w-[80px] px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground">Priority</th>
              <th className="min-w-[88px] px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground">Due</th>
              <th className="min-w-[130px] px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground">Status</th>
              <th className="min-w-[120px] px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const isOverdue = row.dueAt && new Date(row.dueAt) < new Date();
              return (
                <tr
                  key={row.id}
                  onClick={() => setSelectedId(row.id)}
                  className={`group cursor-pointer table-row-hover ${row.status === "Done" ? "bg-muted/20" : ""}`}
                >
                  <td className="w-10 px-2 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      className="h-4 w-4 rounded border-border"
                      aria-label={`Select ${row.summary}`}
                    />
                  </td>
                  <td className="sticky-col sticky left-0 z-10 min-w-[220px] whitespace-nowrap border-r border-border bg-muted px-4 py-3 group-hover:bg-muted/80">
                    <span className="text-sm font-medium text-foreground">
                      {row.name ?? row.summary}
                    </span>
                  </td>
                  <td className="min-w-[110px] whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                    {formatType(row.type)}
                  </td>
                  <td className="min-w-[100px] whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                    {row.category}
                  </td>
                  <td className="min-w-[100px] whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                    {row.property}
                  </td>
                  <td className="min-w-[80px] whitespace-nowrap px-4 py-3 text-sm">
                    {row.priority ? (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.priority === "urgent"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                            : row.priority === "high"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                              : "text-muted-foreground"
                        }`}
                      >
                        {row.priority === "urgent"
                          ? "Urgent"
                          : row.priority.charAt(0).toUpperCase() + row.priority.slice(1)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </td>
                  <td className="min-w-[88px] whitespace-nowrap px-4 py-3 text-sm">
                    {isOverdue && row.status !== "Done" ? (
                      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-200">
                        Overdue
                      </span>
                    ) : row.dueAt ? (
                      <span className="text-muted-foreground">{formatDueDate(row.dueAt)}</span>
                    ) : (
                      "\u2014"
                    )}
                  </td>
                  <td className="min-w-[130px] whitespace-nowrap px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        row.status === "Done" && "bg-muted text-muted-foreground",
                        row.status === "Open" && "bg-primary/10 text-primary",
                        row.status === "In progress" && "bg-primary/10 text-primary",
                        row.status === "Waiting on resident" && "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
                        row.status === "Pending approval" && "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
                        row.status === "Handed back to agent" && "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
                        row.status === "Blocked" && "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
                      )}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="min-w-[120px] px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={row.assignee || "Unassigned"}
                      onChange={(e) => updateAssignee(row.id, e.target.value)}
                      className="select h-8 w-full min-w-[6rem]"
                    >
                      {assigneeNames.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            No escalations match the filters.
          </p>
        )}
      </div>

      {selected?.type === "workflow" ? (
        <CustomTaskDetailSheet
          item={selected}
          open={!!selectedId}
          onOpenChange={(o) => !o && setSelectedId(null)}
        />
      ) : (
        <EscalationDetailSheet
          item={selected}
          open={!!selectedId}
          onOpenChange={(o) => !o && setSelectedId(null)}
        />
      )}

      <CreateCustomTaskDialog
        open={showCreateTaskDialog}
        onOpenChange={setShowCreateTaskDialog}
        mode="template"
        onSave={handleCreateTaskSave}
      />

      <Dialog open={showLaunchPlaybook} onOpenChange={(open) => { setShowLaunchPlaybook(open); if (!open) { setLaunchTemplateId(""); setLaunchPropertyIds(new Set()); setLaunchUnits(new Set()); setLaunchAssignee(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Launch Playbook</DialogTitle>
            <DialogDescription>Select a playbook template and property to launch a new playbook.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Playbook Template</label>
              <Select value={launchTemplateId} onValueChange={setLaunchTemplateId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {SEED_PLAYBOOK_TEMPLATES.filter((t) => t.variety !== "automated").map((t) => (
                    <SelectItem key={t.id} value={t.id} textValue={t.name} className="text-sm">
                      <span className="flex items-center gap-2">
                        {t.name}
                        <span className="text-[10px] text-muted-foreground">({t.tasks.length} tasks)</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {launchTemplateId && (() => {
                const tpl = SEED_PLAYBOOK_TEMPLATES.find((t) => t.id === launchTemplateId);
                return tpl ? (
                  <p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>
                ) : null;
              })()}
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Property</label>
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-9 text-sm px-3">
                    {launchPropertyIds.size === 0 ? (
                      <span className="text-muted-foreground">Select properties...</span>
                    ) : (
                      `${launchPropertyIds.size} property(s) selected`
                    )}
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[200]" align="start" sideOffset={4}>
                  <PropertySelector 
                    selected={launchPropertyIds}
                    onSelectionChange={setLaunchPropertyIds}
                    className="h-[400px] border-0 shadow-none rounded-md"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {launchPropertyIds.size > 0 && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                <label className="text-sm font-medium text-foreground">Units (Optional)</label>
                <MultiCheckList
                  options={MOCK_UNITS}
                  selected={launchUnits}
                  onChange={setLaunchUnits}
                  placeholder="Select affected units..."
                />
                <p className="text-xs text-muted-foreground">Specify which unit(s) or resident(s) are affected by this incident.</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Assignee (Optional)</label>
              <Select value={launchAssignee} onValueChange={setLaunchAssignee}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Assign playbook to..." />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="unassigned" className="text-sm text-muted-foreground italic">Leave unassigned</SelectItem>
                  {assigneeNames.map((a) => (
                    <SelectItem key={a} value={a} className="text-sm">{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowLaunchPlaybook(false)}>Cancel</Button>
            <Button size="sm" disabled={!launchTemplateId || launchPropertyIds.size === 0} onClick={handleLaunchPlaybook}>
              Launch Playbook
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </>
      ) : (
        <PlaybooksTab />
      )}
    </>
  );
}

export default function EscalationsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <EscalationsContent />
    </Suspense>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-start gap-3">
      <label className="pt-1.5 text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function MultiCheckList({ options, selected, onChange, placeholder }: {
  options: { value: string; label: string }[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  placeholder: string;
}) {
  const summary = selected.size === 0
    ? placeholder
    : selected.size === 1
      ? (options.find((o) => o.value === Array.from(selected)[0])?.label ?? `${selected.size} selected`)
      : `${selected.size} selected`;

  return (
    <Popover modal={true}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-xs",
            selected.size === 0 && "text-muted-foreground"
          )}
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1 z-[200]" align="start">
        <div className="max-h-48 overflow-y-auto">
          {options.map(({ value, label }) => {
            const isSelected = selected.has(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  const next = new Set(selected);
                  if (next.has(value)) next.delete(value);
                  else next.add(value);
                  onChange(next);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-muted",
                  isSelected && "font-medium"
                )}
              >
                <span className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-input",
                  isSelected && "border-primary bg-primary text-primary-foreground"
                )}>
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
                {label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ─── Playbooks tab (inline within Escalations) ─────────────────────── */

type PbSortField = "templateName" | "property" | "createdAt" | "status" | "priority" | "completedTasks" | "assignee";
type PbSortDir = "asc" | "desc";

const PB_PRIORITY_RANK: Record<PlaybookPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const PB_STATUS_ORDER: Record<string, number> = { Overdue: 0, "Due Today": 1, "In Progress": 2, "On Hold": 3, Completed: 4 };

function pbPriorityColor(p: PlaybookPriority) {
  switch (p) {
    case "P0": return "bg-red-500";
    case "P1": return "bg-amber-400";
    case "P2": return "bg-blue-400";
    case "P3": return "bg-green-400";
  }
}

function pbStatusBadge(s: string) {
  switch (s) {
    case "Due Today": return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
    case "Overdue": return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
    case "On Hold": return "bg-muted text-muted-foreground";
    case "In Progress": return "bg-primary/10 text-primary";
    case "Completed": return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200";
    default: return "text-muted-foreground";
  }
}

function pbFormatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function pbInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function PlaybooksTab() {
  const router = useRouter();
  const { playbooks } = usePlaybooks();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<PbSortField | null>(null);
  const [sortDir, setSortDir] = useState<PbSortDir>("asc");

  const toggleSort = (field: PbSortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let list = playbooks;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.templateName.toLowerCase().includes(q) || p.property.toLowerCase().includes(q) || p.assignee.toLowerCase().includes(q)
      );
    }
    if (sortField) {
      list = [...list].sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case "templateName": cmp = a.templateName.localeCompare(b.templateName); break;
          case "property": cmp = a.property.localeCompare(b.property); break;
          case "createdAt": cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
          case "status": cmp = (PB_STATUS_ORDER[a.status] ?? 99) - (PB_STATUS_ORDER[b.status] ?? 99); break;
          case "priority": cmp = PB_PRIORITY_RANK[a.priority] - PB_PRIORITY_RANK[b.priority]; break;
          case "completedTasks": {
            const aR = a.tasks.filter((t) => t.status === "Done").length / (a.tasks.length || 1);
            const bR = b.tasks.filter((t) => t.status === "Done").length / (b.tasks.length || 1);
            cmp = aR - bR; break;
          }
          case "assignee": cmp = (a.assignee || "zzz").localeCompare(b.assignee || "zzz"); break;
        }
        return sortDir === "desc" ? -cmp : cmp;
      });
    }
    return list;
  }, [playbooks, search, sortField, sortDir]);

  return (
    <>
      <PageHeader title="Playbooks" />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </button>
      </div>

      <div className="overflow-x-auto scrollbar-hover">
        <table className="table-borderless min-w-[900px]">
          <thead>
            <tr className="bg-muted/30">
              <PbTh field="templateName" label="Task" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="sticky left-0 z-10 min-w-[180px] border-r border-border bg-muted" />
              <PbTh field="property" label="Name" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="min-w-[160px]" />
              <PbTh field="createdAt" label="Created" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="min-w-[120px]" />
              <PbTh field="status" label="Status" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="min-w-[100px]" />
              <PbTh field="priority" label="Priority" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="min-w-[90px]" />
              <PbTh field="completedTasks" label="Completed Tasks" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="min-w-[200px]" />
              <PbTh field="assignee" label="Assignee" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="min-w-[80px]" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((pb) => {
              const completed = pb.tasks.filter((t) => t.status === "Done").length;
              const total = pb.tasks.length;
              const pct = total > 0 ? (completed / total) * 100 : 0;
              return (
                <tr
                  key={pb.id}
                  onClick={() => router.push(`/playbooks/${pb.id}`)}
                  className="group cursor-pointer table-row-hover"
                >
                  <td className="sticky left-0 z-10 min-w-[180px] border-r border-border bg-background whitespace-nowrap px-4 py-3.5">
                    <span className="text-sm font-medium text-foreground">{pb.templateName}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-sm text-foreground">{pb.property}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-sm text-muted-foreground">{pbFormatDate(pb.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", pbStatusBadge(pb.status))}>{pb.status}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <span className={cn("h-2.5 w-2.5 rounded-full", pbPriorityColor(pb.priority))} />
                      {pb.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-green-500" : pct >= 50 ? "bg-green-400" : "bg-green-300")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">{completed}/{total}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {pb.assignee ? (
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px] font-medium">{pbInitials(pb.assignee)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Assign"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">No playbooks match the search.</p>
        )}
      </div>
    </>
  );
}

function PbTh({ field, label, sortField, sortDir, onSort, className }: {
  field: PbSortField; label: string; sortField: PbSortField | null; sortDir: PbSortDir; onSort: (f: PbSortField) => void; className?: string;
}) {
  return (
    <th
      className={cn("cursor-pointer select-none px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground hover:text-foreground", className)}
      onClick={() => onSort(field)}
    >
      {label}
      <ArrowUpDown className={cn("ml-1 inline h-3 w-3 shrink-0", sortField === field ? "text-foreground" : "text-muted-foreground/40")} />
    </th>
  );
}

/* ─── Escalation helpers ─────────────────────────────────────────────── */

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

function formatDurationShort(ms: number): string {
  if (ms < 60_000) return "< 1m";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
