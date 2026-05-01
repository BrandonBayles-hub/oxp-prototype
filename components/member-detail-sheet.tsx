"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import Link from "next/link";
import { useEscalations, type EscalationType } from "@/lib/escalations-context";
import {
  useConversations,
  UNASSIGN_CONVERSATION_VALUE,
} from "@/lib/conversations-context";
import type { WorkforceMember } from "@/lib/workforce-context";
import type { MemberMetric } from "@/lib/workforce-member-metrics";
import {
  portfolioData,
  getSelectedPropertyNames,
  collectLeafPropertyNames,
  propertyNamesToIdsFromList,
} from "@/lib/property-selector-data";
import { usePermissions } from "@/lib/permissions-context";
import { useRole } from "@/lib/role-context";
import { PropertySelector } from "@/components/property-selector";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SPECIALTIES as SPECIALTY_LIST } from "@/lib/specialties-data";
import {
  Search,
  Pencil,
  X,
  Plus,
  Users,
  MapPin,
  Check,
  Award,
  MessageSquare,
  AlertCircle,
  Building2,
} from "lucide-react";

function formatMemberSheetEscalationType(t: EscalationType): string {
  const map: Record<EscalationType, string> = {
    conversation: "Conversation",
    approval: "Approval",
    workflow: "Workflow",
    training: "Training",
    doc_improvement: "Doc improvement",
  };
  return map[t] ?? t;
}

function formatMemberSheetEscalationDue(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "short" });
  } catch {
    return iso;
  }
}
function getAgentTypeLabel(role: string): string {
  if (role.includes("Insights")) return "Intelligence Agent";
  if (role.includes("Automation")) return "Operations Agent";
  return "Autonomous Agent";
}
/* ──────────────────────────── Member Detail Sheet ────────────────── */

function SheetSectionAddTrigger({
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-muted",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function MemberDetailSheet({
  member,
  open,
  onOpenChange,
  members,
  allLabels,
  childrenOfMap,
  memberMetrics,
  updateMember,
  onMemberClick,
}: {
  member: WorkforceMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: WorkforceMember[];
  allLabels: string[];
  childrenOfMap: Map<string, WorkforceMember[]>;
  memberMetrics: Map<string, MemberMetric>;
  updateMember: (id: string, updates: Partial<Omit<WorkforceMember, "id">>) => void;
  onMemberClick: (id: string) => void;
}) {
  const { hasPermission } = usePermissions();
  const { role: viewerRole } = useRole();
  const canEdit = hasPermission("p-wf-members-edit");
  const canViewEscalations = hasPermission("p-tasks-view");
  const canBulkEscalations = hasPermission("p-tasks-bulk-actions");
  const canViewConversations = hasPermission("p-cc-view");
  const canBulkConversations = hasPermission("p-comms-assign-conversation");
  const { items: escalationItems, bulkAssign } = useEscalations();
  const { items: conversationItems, updateAssignee: updateConversationAssignee } = useConversations();
  const [newLabel, setNewLabel] = useState("");
  const [newSpecialty, setNewSpecialty] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [managerSearch, setManagerSearch] = useState("");
  const [selectedEscalationIds, setSelectedEscalationIds] = useState<Set<string>>(new Set());
  const [bulkEscReassignName, setBulkEscReassignName] = useState("");
  const [selectedConvoIds, setSelectedConvoIds] = useState<Set<string>>(new Set());
  const [bulkConvoReassignName, setBulkConvoReassignName] = useState("");

  useEffect(() => {
    setSelectedEscalationIds(new Set());
    setBulkEscReassignName("");
    setSelectedConvoIds(new Set());
    setBulkConvoReassignName("");
  }, [member?.id]);

  const memberOpenEscalations = useMemo(() => {
    if (!member) return [];
    return escalationItems.filter(
      (i) => i.assignee === member.name && i.status !== "Done",
    );
  }, [escalationItems, member]);

  const humanAssigneeNames = useMemo(
    () => members.filter((m) => m.type === "human").map((m) => m.name).sort((a, b) => a.localeCompare(b)),
    [members],
  );

  const memberOpenConversations = useMemo(() => {
    if (!member) return [];
    return conversationItems.filter(
      (c) => c.assignee === member.name && c.status === "open",
    );
  }, [conversationItems, member]);

  const properties = useMemo(() => member?.properties ?? [], [member]);
  const hasAllProperties = properties.includes("All properties");

  const propertyListTree = portfolioData;
  const knownLeafNames = useMemo(
    () => collectLeafPropertyNames(propertyListTree),
    [propertyListTree],
  );
  const sheetPropertySelectedIds = useMemo(() => {
    if (!member || hasAllProperties) return new Set<string>();
    return propertyNamesToIdsFromList(
      properties.filter((p) => p !== "All properties"),
      propertyListTree,
    );
  }, [member, properties, hasAllProperties, propertyListTree]);

  if (!member) return null;

  const escAllSelected =
    memberOpenEscalations.length > 0
    && memberOpenEscalations.every((i) => selectedEscalationIds.has(i.id));
  const toggleEscSelectAll = () => {
    if (escAllSelected) setSelectedEscalationIds(new Set());
    else setSelectedEscalationIds(new Set(memberOpenEscalations.map((i) => i.id)));
  };
  const toggleEscSelect = (id: string) => {
    setSelectedEscalationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const handleBulkEscUnassign = () => {
    if (selectedEscalationIds.size === 0) return;
    bulkAssign(Array.from(selectedEscalationIds), "Unassigned");
    setSelectedEscalationIds(new Set());
    setBulkEscReassignName("");
  };
  const handleBulkEscReassign = () => {
    if (selectedEscalationIds.size === 0 || !bulkEscReassignName) return;
    bulkAssign(Array.from(selectedEscalationIds), bulkEscReassignName);
    setSelectedEscalationIds(new Set());
    setBulkEscReassignName("");
  };

  const convoAllSelected =
    memberOpenConversations.length > 0
    && memberOpenConversations.every((c) => selectedConvoIds.has(c.id));
  const toggleConvoSelectAll = () => {
    if (convoAllSelected) setSelectedConvoIds(new Set());
    else setSelectedConvoIds(new Set(memberOpenConversations.map((c) => c.id)));
  };
  const toggleConvoSelect = (id: string) => {
    setSelectedConvoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const handleBulkConvoUnassign = () => {
    if (selectedConvoIds.size === 0) return;
    selectedConvoIds.forEach((id) => updateConversationAssignee(id, UNASSIGN_CONVERSATION_VALUE));
    setSelectedConvoIds(new Set());
    setBulkConvoReassignName("");
  };
  const handleBulkConvoReassign = () => {
    if (selectedConvoIds.size === 0 || !bulkConvoReassignName) return;
    selectedConvoIds.forEach((id) => updateConversationAssignee(id, bulkConvoReassignName));
    setSelectedConvoIds(new Set());
    setBulkConvoReassignName("");
  };

  const onSheetPropertyIdsChange = (ids: Set<string>) => {
    const fromTree = getSelectedPropertyNames(propertyListTree, ids);
    const legacy = (member.properties ?? []).filter(
      (p) => p !== "All properties" && !knownLeafNames.has(p),
    );
    updateMember(member.id, { properties: [...new Set([...fromTree, ...legacy])] });
  };

  const isAgent = member.type === "agent";
  const initials = member.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  const reportsTo = member.reportsTo ? members.find((m) => m.id === member.reportsTo) : null;
  const directReports = childrenOfMap.get(member.id) ?? [];
  const labels = member.labels ?? [];
  const specialties = member.specialties ?? [];
  const metric = memberMetrics.get(member.id);

  const tierLabel: Record<string, string> = {
    leadership: "Leadership",
    management: "Manager",
    coordinator: "Coordinator",
    specialist: "Specialist",
  };

  const unusedLabels = allLabels.filter(
    (l) => !labels.some((existing) => existing.toLowerCase() === l.toLowerCase()),
  );

  const addLabel = (label: string) => {
    if (!label.trim() || labels.some((l) => l.toLowerCase() === label.trim().toLowerCase())) return;
    updateMember(member.id, { labels: [...labels, label.trim()] });
  };

  const removeLabel = (label: string) => {
    updateMember(member.id, { labels: labels.filter((l) => l !== label) });
  };

  const removeProperty = (property: string) => {
    updateMember(member.id, { properties: properties.filter((p) => p !== property) });
  };

  const toggleAllProperties = () => {
    if (hasAllProperties) {
      updateMember(member.id, { properties: properties.filter((p) => p !== "All properties") });
    } else {
      updateMember(member.id, { properties: ["All properties"] });
    }
  };

  const addSpecialty = (s: string) => {
    if (!s.trim() || specialties.some((e) => e.toLowerCase() === s.trim().toLowerCase())) return;
    updateMember(member.id, { specialties: [...specialties, s.trim()] });
  };

  const removeSpecialty = (s: string) => {
    updateMember(member.id, { specialties: specialties.filter((e) => e !== s) });
  };

  const hasHris = !!member.hris;
  /** HRIS-linked reporting is read-only for non-admins (Workday is canonical); admins may override in OXP for the prototype. */
  const canEditReports = canEdit && (!hasHris || viewerRole === "admin");

  const addDirectReport = (reportId: string) => {
    updateMember(reportId, { reportsTo: member.id });
    setReportSearch("");
  };

  const removeDirectReport = (reportId: string) => {
    updateMember(reportId, { reportsTo: undefined });
  };

  const changeManager = (managerId: string | undefined) => {
    updateMember(member.id, { reportsTo: managerId });
    setManagerSearch("");
  };

  const availableForReport = members.filter(
    (m) => m.id !== member.id && m.reportsTo !== member.id && (!reportSearch || m.name.toLowerCase().includes(reportSearch.toLowerCase())),
  );

  const availableManagers = members.filter(
    (m) => m.id !== member.id && (!managerSearch || m.name.toLowerCase().includes(managerSearch.toLowerCase())),
  );

  const managerPickerContent = (
    <>
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search members…"
          value={managerSearch}
          onChange={(e) => setManagerSearch(e.target.value)}
          className="h-8 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {availableManagers.slice(0, 20).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => changeManager(m.id)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
          >
            <span className="font-medium">{m.name}</span>
            <span className="text-muted-foreground">{m.role}</span>
          </button>
        ))}
      </div>
    </>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            {isAgent ? (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/eli-cube.svg" alt="" className="h-6 w-6" />
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-base font-semibold text-foreground">
                {initials}
              </div>
            )}
            <div>
              <SheetTitle className="flex items-center gap-2">
                {member.name}
                {isAgent && (
                  <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-3 text-muted-foreground">
                    {member.role}
                  </span>
                )}
              </SheetTitle>
              <SheetDescription>{member.role}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* ── Overview ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Department</p>
              <p className="mt-0.5 text-sm font-medium">{member.team}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Role</p>
              <p className="mt-0.5 text-sm font-medium">{member.tier ? tierLabel[member.tier] : (isAgent ? getAgentTypeLabel(member.role) : "Staff")}</p>
            </div>
            {metric && (
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{metric.label}</p>
                <p className={cn("mt-0.5 text-sm font-semibold", metric.highlight && "text-green-600 dark:text-green-400")}>{metric.value}</p>
              </div>
            )}
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Reports to</p>
                {reportsTo && canEditReports && (
                  <div className="flex shrink-0 items-center gap-0.5 -mt-0.5 -mr-0.5">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                          aria-label="Change manager"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-64 p-2">
                        {managerPickerContent}
                      </PopoverContent>
                    </Popover>
                    <button
                      type="button"
                      onClick={() => changeManager(undefined)}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove manager"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {reportsTo ? (
                <button
                  type="button"
                  onClick={() => onMemberClick(reportsTo.id)}
                  className="mt-0.5 block w-full text-left text-sm font-medium text-primary hover:underline"
                >
                  {reportsTo.name}
                </button>
              ) : canEditReports ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Plus className="h-3 w-3" /> Assign manager
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-64 p-2">
                    {managerPickerContent}
                  </PopoverContent>
                </Popover>
              ) : (
                <p className="mt-0.5 text-sm text-muted-foreground italic">None</p>
              )}
            </div>
          </div>

          {/* ── Direct Reports ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Direct reports ({directReports.length})
                </p>
              </div>
              {canEditReports && (
                <Popover>
                  <PopoverTrigger asChild>
                    <SheetSectionAddTrigger>
                      <Plus className="h-3 w-3" /> Add
                    </SheetSectionAddTrigger>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 p-2">
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search members…"
                        value={reportSearch}
                        onChange={(e) => setReportSearch(e.target.value)}
                        className="h-8 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {availableForReport.slice(0, 20).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => addDirectReport(m.id)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                        >
                          <span className="font-medium">{m.name}</span>
                          <span className="text-muted-foreground">{m.role}</span>
                        </button>
                      ))}
                      {availableForReport.length === 0 && (
                        <p className="px-2 py-3 text-center text-xs text-muted-foreground">No members available</p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            {directReports.length > 0 ? (
              <div className="space-y-1">
                {directReports.map((dr) => {
                  const drIsAgent = dr.type === "agent";
                  const drInitials = dr.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
                  return (
                    <div
                      key={dr.id}
                      className="group flex w-full items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-muted"
                    >
                      <button
                        type="button"
                        onClick={() => onMemberClick(dr.id)}
                        className="flex flex-1 items-center gap-2.5 text-left"
                      >
                        {drIsAgent ? (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/eli-cube.svg" alt="" className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                            {drInitials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium">{dr.name}</p>
                          <p className="truncate text-[10px] text-muted-foreground">{dr.role}</p>
                        </div>
                      </button>
                      {canEditReports && (
                        <button
                          type="button"
                          onClick={() => removeDirectReport(dr.id)}
                          className="shrink-0 rounded-full p-1 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground hover:!bg-destructive/10 hover:!text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic px-2">No direct reports</p>
            )}
          </div>

          {/* ── Properties ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Properties</p>
              </div>
              <Popover modal>
                <PopoverTrigger asChild>
                  <SheetSectionAddTrigger>
                    <Plus className="h-3 w-3" /> Add
                  </SheetSectionAddTrigger>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0 z-[200]" align="end" sideOffset={4}>
                  <div className="border-b border-border px-3 py-2">
                    <button
                      type="button"
                      onClick={toggleAllProperties}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                          hasAllProperties
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30",
                        )}
                      >
                        {hasAllProperties && <Check className="h-3 w-3" />}
                      </div>
                      All properties
                    </button>
                  </div>
                  <PropertySelector
                    selected={sheetPropertySelectedIds}
                    onSelectionChange={onSheetPropertyIdsChange}
                    className={cn(
                      "h-[360px] max-h-[min(360px,50vh)] border-0 shadow-none rounded-none",
                      hasAllProperties && "pointer-events-none opacity-50",
                    )}
                  />
                </PopoverContent>
              </Popover>
            </div>
            {properties.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No properties assigned</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {properties.map((p) => (
                  <span
                    key={p}
                    className="group inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs"
                  >
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    {p}
                    <button
                      type="button"
                      onClick={() => removeProperty(p)}
                      className="ml-0.5 rounded-full p-0.5 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive group-hover:text-muted-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Specialties ── */}
          {!isAgent && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Award className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Specialties</p>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <SheetSectionAddTrigger>
                      <Plus className="h-3 w-3" /> Add
                    </SheetSectionAddTrigger>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 p-2">
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search or add specialty…"
                        value={newSpecialty}
                        onChange={(e) => setNewSpecialty(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newSpecialty.trim()) {
                            addSpecialty(newSpecialty);
                            setNewSpecialty("");
                          }
                        }}
                        className="h-8 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {SPECIALTY_LIST
                        .filter((s) => !specialties.some((e) => e.toLowerCase() === s.name.toLowerCase()))
                        .filter((s) => !newSpecialty || s.name.toLowerCase().includes(newSpecialty.toLowerCase()))
                        .map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => { addSpecialty(s.name); setNewSpecialty(""); }}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                          >
                            <Award className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{s.name}</span>
                          </button>
                        ))}
                      {newSpecialty.trim() && !SPECIALTY_LIST.some((s) => s.name.toLowerCase() === newSpecialty.trim().toLowerCase()) && !specialties.some((s) => s.toLowerCase() === newSpecialty.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => { addSpecialty(newSpecialty); setNewSpecialty(""); }}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-primary hover:bg-muted"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Create &ldquo;{newSpecialty.trim()}&rdquo;</span>
                        </button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              {specialties.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No specialties assigned</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {specialties.map((s) => (
                    <Badge key={s} variant="secondary" className="gap-1 pr-1 font-medium">
                      {s}
                      <button
                        type="button"
                        onClick={() => removeSpecialty(s)}
                        className="ml-0.5 rounded-full p-0.5 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Open conversations (communications) ── */}
          {canViewConversations && (
            <div>
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
                    Open conversations ({memberOpenConversations.length})
                  </p>
                </div>
                <Link
                  href="/conversations"
                  className="shrink-0 text-xs text-primary hover:underline"
                >
                  View all
                </Link>
              </div>
              {memberOpenConversations.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">None assigned</p>
              ) : (
                <>
                  {canBulkConversations && selectedConvoIds.size > 0 && (
                    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                      <select
                        value={bulkConvoReassignName}
                        onChange={(e) => setBulkConvoReassignName(e.target.value)}
                        className="h-7 flex-1 min-w-[8rem] rounded border border-input bg-background px-2 text-xs"
                        aria-label="Reassign selected to"
                      >
                        <option value="">Reassign to…</option>
                        {humanAssigneeNames.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs shrink-0"
                        disabled={!bulkConvoReassignName}
                        onClick={handleBulkConvoReassign}
                      >
                        Reassign
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs shrink-0"
                        onClick={handleBulkConvoUnassign}
                      >
                        Unassign
                      </Button>
                    </div>
                  )}
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          {canBulkConversations && (
                            <TableHead className="w-10 px-2 py-2">
                              <Checkbox
                                checked={convoAllSelected}
                                onCheckedChange={toggleConvoSelectAll}
                                aria-label="Select all conversations"
                              />
                            </TableHead>
                          )}
                          <TableHead className="min-w-[140px] py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Contact
                          </TableHead>
                          <TableHead className="min-w-[72px] py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Channel
                          </TableHead>
                          <TableHead className="min-w-[72px] py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Property
                          </TableHead>
                          <TableHead className="min-w-[140px] py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Preview
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {memberOpenConversations.map((row) => (
                          <TableRow key={row.id} className="text-xs">
                            {canBulkConversations && (
                              <TableCell className="w-10 px-2 py-2" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={selectedConvoIds.has(row.id)}
                                  onCheckedChange={() => toggleConvoSelect(row.id)}
                                  aria-label={`Select conversation with ${row.resident}`}
                                />
                              </TableCell>
                            )}
                            <TableCell className="py-2 font-medium text-foreground whitespace-nowrap">
                              {row.resident}
                              {row.unit && (
                                <span className="ml-1 text-[10px] text-muted-foreground">· {row.unit}</span>
                              )}
                            </TableCell>
                            <TableCell className="py-2 text-muted-foreground whitespace-nowrap capitalize">
                              {row.channel}
                            </TableCell>
                            <TableCell className="py-2 text-muted-foreground whitespace-nowrap">
                              {row.property}
                            </TableCell>
                            <TableCell className="max-w-[180px] py-2 text-muted-foreground">
                              <span className="line-clamp-2">{row.preview}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Open escalations (tasks) ── */}
          {canViewEscalations && (
            <div>
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
                    Open escalations ({memberOpenEscalations.length})
                  </p>
                </div>
                <Link
                  href="/escalations"
                  className="shrink-0 text-xs text-primary hover:underline"
                >
                  View all
                </Link>
              </div>
              {memberOpenEscalations.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">None assigned</p>
              ) : (
                <>
                  {canBulkEscalations && selectedEscalationIds.size > 0 && (
                    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                      <select
                        value={bulkEscReassignName}
                        onChange={(e) => setBulkEscReassignName(e.target.value)}
                        className="h-7 flex-1 min-w-[8rem] rounded border border-input bg-background px-2 text-xs"
                        aria-label="Reassign selected to"
                      >
                        <option value="">Reassign to…</option>
                        {humanAssigneeNames.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs shrink-0"
                        disabled={!bulkEscReassignName}
                        onClick={handleBulkEscReassign}
                      >
                        Reassign
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs shrink-0"
                        onClick={handleBulkEscUnassign}
                      >
                        Unassign
                      </Button>
                    </div>
                  )}
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          {canBulkEscalations && (
                            <TableHead className="w-10 px-2 py-2">
                              <Checkbox
                                checked={escAllSelected}
                                onCheckedChange={toggleEscSelectAll}
                                aria-label="Select all escalations"
                              />
                            </TableHead>
                          )}
                          <TableHead className="min-w-[140px] py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Summary
                          </TableHead>
                          <TableHead className="min-w-[88px] py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Type
                          </TableHead>
                          <TableHead className="min-w-[72px] py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Category
                          </TableHead>
                          <TableHead className="min-w-[72px] py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Property
                          </TableHead>
                          <TableHead className="min-w-[64px] py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Due
                          </TableHead>
                          <TableHead className="min-w-[100px] py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {memberOpenEscalations.map((row) => {
                          const isOverdue = row.dueAt && new Date(row.dueAt) < new Date();
                          return (
                            <TableRow key={row.id} className="text-xs">
                              {canBulkEscalations && (
                                <TableCell className="w-10 px-2 py-2" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedEscalationIds.has(row.id)}
                                    onCheckedChange={() => toggleEscSelect(row.id)}
                                    aria-label={`Select ${row.summary}`}
                                  />
                                </TableCell>
                              )}
                              <TableCell className="max-w-[200px] py-2 font-medium text-foreground">
                                <span className="line-clamp-2">{row.name ?? row.summary}</span>
                              </TableCell>
                              <TableCell className="py-2 text-muted-foreground whitespace-nowrap">
                                {formatMemberSheetEscalationType(row.type)}
                              </TableCell>
                              <TableCell className="py-2 text-muted-foreground whitespace-nowrap">
                                {row.category}
                              </TableCell>
                              <TableCell className="py-2 text-muted-foreground whitespace-nowrap">
                                {row.property}
                              </TableCell>
                              <TableCell className="py-2 whitespace-nowrap">
                                {isOverdue ? (
                                  <span className="inline-flex rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800 dark:bg-red-900/40 dark:text-red-200">
                                    Overdue
                                  </span>
                                ) : row.dueAt ? (
                                  <span className="text-muted-foreground">{formatMemberSheetEscalationDue(row.dueAt)}</span>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell className="py-2 whitespace-nowrap">
                                <span
                                  className={cn(
                                    "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                    row.status === "Open" && "bg-primary/10 text-primary",
                                    row.status === "In progress" && "bg-primary/10 text-primary",
                                    row.status === "Waiting on resident" && "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
                                    row.status === "Pending approval" && "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
                                    row.status === "Handed back to agent" && "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
                                    row.status === "Blocked" && "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
                                    !["Open", "In progress", "Waiting on resident", "Pending approval", "Handed back to agent", "Blocked"].includes(row.status) && "bg-muted text-muted-foreground",
                                  )}
                                >
                                  {row.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </SheetContent>
    </Sheet>
  );
}
