"use client";

import {
  useCallback, useEffect, useMemo, useRef, useState,
  type ComponentPropsWithoutRef,
} from "react";
import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";
import { useWorkforce, TEAMS, type WorkforceMember, type WorkforceTier } from "@/lib/workforce-context";
import { useAgents, type Agent } from "@/lib/agents-context";
import { useEscalations, type EscalationRoutingRule, type EscalationType } from "@/lib/escalations-context";
import Link from "next/link";
import { useR1Release } from "@/lib/r1-release-context";
import {
  useConversations,
  UNASSIGN_CONVERSATION_VALUE,
} from "@/lib/conversations-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PropertySelector } from "@/components/property-selector";
import {
  portfolioData,
  getSelectedPropertyNames,
  collectLeafPropertyNames,
  propertyNamesToIdsFromList,
  resolveSelectedIdsToLeafPropertyNames,
} from "@/lib/property-selector-data";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SPECIALTIES as SPECIALTY_LIST } from "@/lib/specialties-data";
import {
  Network, Tag, ChevronRight, ChevronDown, Award,
  X, Plus, Building2, MapPin, Search, Check, List, Trash2, Users, Pencil, AlertCircle, MessageSquare,
} from "lucide-react";

/* ──────────────────────────── Helpers ──────────────────────────── */

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

const TIER_ORDER: Record<WorkforceTier, number> = {
  leadership: 0,
  management: 1,
  coordinator: 2,
  specialist: 3,
};

type MemberMetric = { value: string; label: string; highlight?: boolean };

function getMemberMetric(
  member: WorkforceMember,
  agents: Agent[],
  tasksByAssignee: Map<string, number>,
): MemberMetric {
  if (member.type === "agent") {
    const agent = agents.find((a) => a.name === member.name);
    if (agent) {
      if (agent.type === "autonomous") {
        if (agent.revenueImpact && agent.revenueImpact !== "—") {
          return { value: agent.revenueImpact, label: "wk", highlight: true };
        }
        return { value: `${agent.conversationCount}`, label: "chats", highlight: true };
      }
      if (agent.type === "intelligence") {
        return { value: `${agent.insightsGenerated ?? 0}`, label: "insights" };
      }
      if (agent.type === "operations") {
        return { value: `${agent.runsCompleted ?? 0}`, label: "runs" };
      }
    }
    return { value: "100%", label: "compliant", highlight: true };
  }

  const count = tasksByAssignee.get(member.name) ?? 0;
  return { value: String(count), label: "tasks" };
}

function getAgentTypeLabel(role: string): string {
  if (role.includes("Insights")) return "Intelligence Agent";
  if (role.includes("Automation")) return "Operations Agent";
  return "Autonomous Agent";
}

/* ──────────────────────────── Component ────────────────────────── */

export default function WorkforcePage() {
  const { members, humanMembers, agentMembers, updateMember, allLabels } = useWorkforce();
  const { agents } = useAgents();
  const {
    items: escalations,
    routingRules, addRoutingRule, removeRoutingRule, updateRoutingRule,
  } = useEscalations();
  const { items: conversations } = useConversations();
  const { isR1Release } = useR1Release();
  const [activeTab, setActiveTab] = useState("org");
  const [orgView, setOrgView] = useState<"tree" | "table">("tree");
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilters, setPropertyFilters] = useState<Set<string>>(new Set());
  const [specialtyFilters, setSpecialtyFilters] = useState<Set<string>>(new Set());
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedMemberId) ?? null,
    [members, selectedMemberId],
  );

  const toggleNode = useCallback((id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /* ── Property filter ── */

  const allProperties = useMemo(() => {
    const set = new Set<string>();
    for (const m of members) {
      for (const p of m.properties ?? []) {
        if (p !== "All properties") set.add(p);
      }
    }
    return Array.from(set).sort();
  }, [members]);

  const allSpecialties = useMemo(() => {
    const set = new Set<string>();
    for (const m of members) {
      for (const s of m.specialties ?? []) set.add(s);
    }
    return Array.from(set).sort();
  }, [members]);

  const hasActiveFilters = searchQuery.trim() !== "" || propertyFilters.size > 0 || specialtyFilters.size > 0;

  const filteredMembers = useMemo(() => {
    let result = members;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.jtbd.toLowerCase().includes(q) ||
        m.team.toLowerCase().includes(q),
      );
    }
    if (propertyFilters.size > 0) {
      const filterNames = resolveSelectedIdsToLeafPropertyNames(propertyFilters);
      result = result.filter((m) => {
        const props = m.properties ?? [];
        if (props.includes("All properties")) return true;
        return props.some((p) => filterNames.has(p));
      });
    }
    if (specialtyFilters.size > 0) {
      result = result.filter((m) => {
        const specs = m.specialties ?? [];
        return specs.some((s) => specialtyFilters.has(s));
      });
    }
    return result;
  }, [members, searchQuery, propertyFilters, specialtyFilters]);

  /* ── Stats ── */

  const totalHumans = humanMembers.length;
  const totalAI = agentMembers.length;
  const totalMembers = members.length;
  const teamsWithAI = useMemo(() => {
    const s: Record<string, number> = {};
    for (const m of members) {
      if (m.type === "agent") s[m.team] = (s[m.team] ?? 0) + 1;
    }
    return Object.keys(s).length;
  }, [members]);
  const openEscalations = escalations.filter((e) => e.status !== "Done").length;

  /* ── Org Structure data ── */

  const leaderIds = useMemo(
    () => new Set(members.filter((m) => m.tier === "leadership").map((m) => m.id)),
    [members],
  );

  const leaders = useMemo(
    () => filteredMembers.filter((m) => m.tier === "leadership"),
    [filteredMembers],
  );

  const propertyCount = allProperties.length;

  const tasksByAssignee = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of escalations) {
      if (e.assignee && e.status !== "Done" && e.status !== "Resolved") {
        map.set(e.assignee, (map.get(e.assignee) ?? 0) + 1);
      }
    }
    for (const c of conversations) {
      if (c.assignee && c.status === "open") {
        map.set(c.assignee, (map.get(c.assignee) ?? 0) + 1);
      }
    }
    return map;
  }, [escalations, conversations]);

  const memberMetrics = useMemo(() => {
    const map = new Map<string, MemberMetric>();
    for (const m of members) {
      map.set(m.id, getMemberMetric(m, agents, tasksByAssignee));
    }
    return map;
  }, [members, agents, tasksByAssignee]);

  const offAgentNames = useMemo(() => {
    const set = new Set<string>();
    for (const a of agents) {
      if (a.status === "Off") set.add(a.name);
    }
    return set;
  }, [agents]);

  const sortMembers = (arr: WorkforceMember[]) =>
    [...arr].sort((a, b) => {
      const aMgr = a.type === "human" && a.tier === "management";
      const bMgr = b.type === "human" && b.tier === "management";
      if (aMgr !== bMgr) return aMgr ? -1 : 1;
      if (a.type !== b.type) return a.type === "agent" ? -1 : 1;
      const ta = TIER_ORDER[a.tier ?? "specialist"];
      const tb = TIER_ORDER[b.tier ?? "specialist"];
      if (ta !== tb) return ta - tb;
      return a.name.localeCompare(b.name);
    });

  const childrenOfMap = useMemo(() => {
    const map = new Map<string, WorkforceMember[]>();
    for (const m of filteredMembers) {
      if (m.reportsTo && !leaderIds.has(m.id)) {
        const list = map.get(m.reportsTo) ?? [];
        list.push(m);
        map.set(m.reportsTo, list);
      }
    }
    for (const children of map.values()) {
      children.sort((a, b) => {
        if (a.type !== b.type) return a.type === "agent" ? -1 : 1;
        const ta = TIER_ORDER[a.tier ?? "specialist"];
        const tb = TIER_ORDER[b.tier ?? "specialist"];
        if (ta !== tb) return ta - tb;
        return a.name.localeCompare(b.name);
      });
    }
    return map;
  }, [filteredMembers, leaderIds]);

  const autoExpandedRef = useRef(false);

  const teamSections = useMemo(() => {
    const sections: { team: string; topLevel: WorkforceMember[] }[] = [];
    for (const team of TEAMS) {
      const teamMembers = filteredMembers.filter(
        (m) => m.team === team && !leaderIds.has(m.id),
      );
      if (teamMembers.length === 0) continue;
      const topLevel = teamMembers.filter(
        (m) => !m.reportsTo || leaderIds.has(m.reportsTo),
      );
      sections.push({ team, topLevel: sortMembers(topLevel) });
    }
    return sections;
  }, [filteredMembers, leaderIds]);

  useEffect(() => {
    if (autoExpandedRef.current) return;
    const ids = new Set<string>();
    for (const l of leaders) {
      if (childrenOfMap.has(l.id)) ids.add(l.id);
    }
    for (const section of teamSections) {
      for (const m of section.topLevel) {
        if (childrenOfMap.has(m.id)) ids.add(m.id);
      }
    }
    if (ids.size > 0) {
      setExpandedNodes(ids);
      autoExpandedRef.current = true;
    }
  }, [leaders, teamSections, childrenOfMap]);

  return (
    <>
      <PageHeader
        title="Workforce"
        description="Your org structure with AI layered in — who works on what, how work routes, and how human and AI capabilities combine."
      />

      {/* Overview stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total workforce", value: totalMembers },
          { label: "Human staff", value: totalHumans },
          { label: "ELI+ agents", value: totalAI },
          { label: "Teams with AI", value: `${teamsWithAI}/${TEAMS.length}` },
          { label: "Open escalations", value: openEscalations },
        ].map((s: { label: string; value: string | number; sub?: string }) => (
          <Card key={s.label}>
            <CardContent className="py-3">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              {s.sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{s.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="org">Org Structure</TabsTrigger>
          <TabsTrigger value="routing" className="hidden">Routing</TabsTrigger>
          <TabsTrigger value="roles">Roles &amp; Access</TabsTrigger>
          {!isR1Release && <TabsTrigger value="compliance">Compliance</TabsTrigger>}
        </TabsList>

        {/* ───── TAB 1: Org Structure ───── */}
        <TabsContent value="org" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-9 shrink-0 rounded-md border border-input">
              <button
                type="button"
                onClick={() => setOrgView("tree")}
                className={cn(
                  "flex h-full w-9 shrink-0 items-center justify-center rounded-l-md transition-colors",
                  orgView === "tree"
                    ? "bg-muted text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
                style={{ width: 36, minWidth: 36, maxWidth: 36 }}
                aria-label="Tree view"
              >
                <Network className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOrgView("table")}
                className={cn(
                  "flex h-full w-9 shrink-0 items-center justify-center rounded-r-md border-l border-input transition-colors",
                  orgView === "table"
                    ? "bg-muted text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
                style={{ width: 36, minWidth: 36, maxWidth: 36 }}
                aria-label="Table view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people, roles, teams..."
                className="h-9 pl-8 text-xs"
              />
            </div>
            <Popover modal={true}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 gap-1.5 text-xs font-normal">
                  Property
                  {propertyFilters.size > 0 && (
                    <Badge variant="secondary" className="ml-0.5 h-4 min-w-[1rem] rounded-full px-1 text-[10px]">{propertyFilters.size}</Badge>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0 z-[200]" align="start" sideOffset={4}>
                <PropertySelector
                  selected={propertyFilters}
                  onSelectionChange={setPropertyFilters}
                  className="h-[360px] border-0 shadow-none rounded-md"
                />
              </PopoverContent>
            </Popover>
            <FilterDropdown
              label="Specialty"
              options={allSpecialties}
              selected={specialtyFilters}
              onToggle={(s) => setSpecialtyFilters((prev) => {
                const next = new Set(prev);
                if (next.has(s)) next.delete(s); else next.add(s);
                return next;
              })}
            />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setPropertyFilters(new Set()); setSpecialtyFilters(new Set()); }}
                className="flex h-9 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>

          {orgView === "tree" ? (
            <Card>
              <CardContent className="pt-6 pb-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-semibold text-foreground">
                      Property Team + Agent Workforce
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {totalHumans} staff &middot; {totalAI} ELI+ agents
                  </p>
                </div>

                {leaders.map((m) => (
                  <MemberRowContent
                    key={m.id}
                    member={m}
                    metric={memberMetrics.get(m.id)!}
                    onMemberClick={setSelectedMemberId}
                    isAgentOff={m.type === "agent" && offAgentNames.has(m.name)}
                  />
                ))}

                {teamSections.map((section) => (
                  <div key={section.team}>
                    <TeamDivider label={section.team} />
                    {section.topLevel.map((m, i) => (
                      <MemberNode
                        key={m.id}
                        member={m}
                        childrenOfMap={childrenOfMap}
                        memberMetrics={memberMetrics}
                        isLast={i === section.topLevel.length - 1}
                        expandedNodes={expandedNodes}
                        onToggle={toggleNode}
                        onMemberClick={setSelectedMemberId}
                        offAgentNames={offAgentNames}
                      />
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <OrgTable
              leaders={leaders}
              teamSections={teamSections}
              childrenOfMap={childrenOfMap}
              memberMetrics={memberMetrics}
              expandedNodes={expandedNodes}
              onToggle={toggleNode}
              onMemberClick={setSelectedMemberId}
              offAgentNames={offAgentNames}
            />
          )}
        </TabsContent>

        {/* ───── TAB 2: Routing ───── */}
        <TabsContent value="routing" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Escalations are first routed by label and property match (configured per person on the Org tab). If no label match is found, these rules apply — the most specific matching rule wins.
          </p>

          <RoutingRulesEditor
            rules={routingRules}
            humanMembers={humanMembers}
            onAdd={addRoutingRule}
            onRemove={removeRoutingRule}
            onUpdate={updateRoutingRule}
          />
        </TabsContent>

        {/* ───── TAB 3: Roles & Access ───── */}
        <TabsContent value="roles">
          <RolesAccessPanel humanMembers={humanMembers} />
        </TabsContent>

        {/* ───── TAB 4: Compliance ───── */}
        {!isR1Release && (
          <TabsContent value="compliance">
            <ComingSoon feature="Compliance tracking" />
          </TabsContent>
        )}
      </Tabs>

      {/* ───── Member Detail Sheet ───── */}
      <MemberDetailSheet
        member={selectedMember}
        open={selectedMember !== null}
        onOpenChange={(open) => { if (!open) setSelectedMemberId(null); }}
        members={members}
        allLabels={allLabels}
        childrenOfMap={childrenOfMap}
        memberMetrics={memberMetrics}
        updateMember={updateMember}
        onMemberClick={setSelectedMemberId}
      />
    </>
  );
}

/* ──────────────────────────── Roles & Access ────────────────────── */

import { ALL_PERMISSIONS, PERMISSION_SECTIONS, SECTION_VIEW_PERMISSION, usePermissions } from "@/lib/permissions-context";
import { useRole } from "@/lib/role-context";
import { Switch } from "@/components/ui/switch";

type RoleTab = { key: string; label: string; builtin: boolean };

const BUILT_IN_ROLES: RoleTab[] = [
  { key: "admin", label: "Corporate Admins", builtin: true },
  { key: "regional", label: "Team Lead", builtin: true },
];

type EntrataGroup = { id: string; name: string; memberCount: number };

const ENTRATA_GROUPS: EntrataGroup[] = [
  { id: "eg-leasing", name: "Leasing Team", memberCount: 6 },
  { id: "eg-maintenance", name: "Maintenance Staff", memberCount: 12 },
  { id: "eg-accounting", name: "Accounting", memberCount: 4 },
  { id: "eg-regional-ops", name: "Regional Operations", memberCount: 8 },
  { id: "eg-compliance", name: "Compliance Officers", memberCount: 3 },
  { id: "eg-resident-svc", name: "Resident Services", memberCount: 9 },
];

function RolesAccessPanel({ humanMembers }: { humanMembers: WorkforceMember[] }) {
  const [customRoles, setCustomRoles] = useState<RoleTab[]>([]);
  const [activeRole, setActiveRole] = useState<string>("admin");
  const { permissions, setPermissions } = usePermissions();
  const [roleMembers, setRoleMembers] = useState<Record<string, string[]>>(() => ({
    admin: [],
    regional: ["h-regional"],
  }));
  const [comboOpen, setComboOpen] = useState(false);
  const [comboQuery, setComboQuery] = useState("");
  const [groupComboOpen, setGroupComboOpen] = useState(false);
  const [groupComboQuery, setGroupComboQuery] = useState("");
  const [roleGroups, setRoleGroups] = useState<Record<string, string[]>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);

  const allRoles = [...BUILT_IN_ROLES, ...customRoles];
  const isAdmin = activeRole === "admin";
  const showUserPicker = !isAdmin;
  const currentPerms = permissions[activeRole] ?? new Set<string>();
  const currentMembers = roleMembers[activeRole] ?? [];

  const currentGroups = roleGroups[activeRole] ?? [];

  const availableGroups = useMemo(() => {
    const assigned = new Set(currentGroups);
    const q = groupComboQuery.toLowerCase().trim();
    return ENTRATA_GROUPS.filter((g) => {
      if (assigned.has(g.id)) return false;
      if (q && !g.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [currentGroups, groupComboQuery]);

  const availableMembers = useMemo(() => {
    const assigned = new Set(currentMembers);
    const q = comboQuery.toLowerCase().trim();
    return humanMembers.filter((m) => {
      if (assigned.has(m.id)) return false;
      if (q && !m.name.toLowerCase().includes(q) && !m.role.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [humanMembers, currentMembers, comboQuery]);

  const addMember = (memberId: string) => {
    setRoleMembers((prev) => ({
      ...prev,
      [activeRole]: [...(prev[activeRole] ?? []), memberId],
    }));
    setComboOpen(false);
    setComboQuery("");
  };

  const removeMember = (memberId: string) => {
    setRoleMembers((prev) => ({
      ...prev,
      [activeRole]: (prev[activeRole] ?? []).filter((id) => id !== memberId),
    }));
  };

  const addGroup = (groupId: string) => {
    setRoleGroups((prev) => ({
      ...prev,
      [activeRole]: [...(prev[activeRole] ?? []), groupId],
    }));
    setGroupComboOpen(false);
    setGroupComboQuery("");
  };

  const removeGroup = (groupId: string) => {
    setRoleGroups((prev) => ({
      ...prev,
      [activeRole]: (prev[activeRole] ?? []).filter((id) => id !== groupId),
    }));
  };

  const togglePermission = (permId: string) => {
    if (isAdmin) return;
    setPermissions((prev) => {
      const next = { ...prev };
      const set = new Set(next[activeRole] ?? []);
      if (set.has(permId)) set.delete(permId);
      else set.add(permId);
      next[activeRole] = set;
      return next;
    });
  };

  const toggleSectionMaster = (section: string, currentlyOn: boolean) => {
    if (isAdmin) return;
    const viewPermId = SECTION_VIEW_PERMISSION[section];
    if (!viewPermId) return;
    setPermissions((prev) => {
      const next = { ...prev };
      const set = new Set(next[activeRole] ?? []);
      if (currentlyOn) {
        const sectionPermIds = ALL_PERMISSIONS
          .filter((p) => p.section === section)
          .map((p) => p.id);
        for (const id of sectionPermIds) set.delete(id);
      } else {
        set.add(viewPermId);
      }
      next[activeRole] = set;
      return next;
    });
  };

  const handleCreateRole = () => {
    const trimmed = newRoleName.trim();
    if (!trimmed) return;
    const key = `custom-${Date.now()}`;
    setCustomRoles((prev) => [...prev, { key, label: trimmed, builtin: false }]);
    setPermissions((prev) => ({ ...prev, [key]: new Set<string>() }));
    setRoleMembers((prev) => ({ ...prev, [key]: [] }));
    setActiveRole(key);
    setCreateOpen(false);
    setNewRoleName("");
  };

  const handleDeleteRole = (key: string) => {
    setCustomRoles((prev) => prev.filter((r) => r.key !== key));
    setRoleMembers((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setRoleGroups((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setPermissions((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (activeRole === key) setActiveRole("admin");
    setDeleteConfirmKey(null);
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        {allRoles.map((r) => (
          <div key={r.key} className="group relative flex items-center">
            <button
              onClick={() => setActiveRole(r.key)}
              className={cn(
                "shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors",
                activeRole === r.key
                  ? "bg-muted text-foreground shadow-sm ring-1 ring-border"
                  : "border border-border bg-background text-foreground hover:bg-muted",
                !r.builtin && "pr-8"
              )}
            >
              {r.label}
            </button>
            {!r.builtin && (
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteConfirmKey(r.key); }}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 transition-colors",
                  activeRole === r.key
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-muted-foreground/60 hover:text-foreground"
                )}
                aria-label={`Delete ${r.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setCreateOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          aria-label="Create new role"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Create role dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-foreground" htmlFor="new-role-name">
              Role name
            </label>
            <Input
              id="new-role-name"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="e.g. Property Manager"
              className="mt-1.5"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateRole(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setNewRoleName(""); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateRole} disabled={!newRoleName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete role confirmation dialog */}
      <Dialog open={!!deleteConfirmKey} onOpenChange={() => setDeleteConfirmKey(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">
              {allRoles.find((r) => r.key === deleteConfirmKey)?.label}
            </span>
            ? All assigned users and permissions will be removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmKey(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirmKey && handleDeleteRole(deleteConfirmKey)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isAdmin && (
        <div className="mb-8 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Corporate Admin users are synced automatically through Entrata. All permissions are enabled by default.
          </p>
        </div>
      )}

      {showUserPicker && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-sm font-semibold text-foreground">Users in this role</h3>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                  <Plus className="h-3 w-3" />
                  Add User
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={comboQuery}
                      onChange={(e) => setComboQuery(e.target.value)}
                      placeholder="Search people..."
                      className="h-8 w-full rounded-md border border-input bg-background pl-7 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto p-1">
                  {availableMembers.length === 0 ? (
                    <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matching users</p>
                  ) : (
                    availableMembers.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => addMember(m.id)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted transition-colors"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                          {m.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{m.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{m.role}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={groupComboOpen} onOpenChange={setGroupComboOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                  <Users className="h-3 w-3" />
                  Add Group
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <div className="p-2 border-b border-border">
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Entrata User Groups</p>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={groupComboQuery}
                      onChange={(e) => setGroupComboQuery(e.target.value)}
                      placeholder="Search groups..."
                      className="h-8 w-full rounded-md border border-input bg-background pl-7 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto p-1">
                  {availableGroups.length === 0 ? (
                    <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matching groups</p>
                  ) : (
                    availableGroups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => addGroup(g.id)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted transition-colors"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Users className="h-3 w-3" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{g.name}</p>
                          <p className="text-[11px] text-muted-foreground">{g.memberCount} members</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Assigned groups */}
          {currentGroups.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {currentGroups.map((groupId) => {
                const group = ENTRATA_GROUPS.find((g) => g.id === groupId);
                if (!group) return null;
                return (
                  <span
                    key={groupId}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    <Users className="h-3 w-3 text-primary" />
                    {group.name}
                    <span className="text-muted-foreground">({group.memberCount})</span>
                    <button
                      onClick={() => removeGroup(groupId)}
                      className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`Remove ${group.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Assigned individuals */}
          {currentMembers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {currentMembers.map((memberId) => {
                const member = humanMembers.find((m) => m.id === memberId);
                if (!member) return null;
                return (
                  <span
                    key={memberId}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-medium text-muted-foreground">
                      {member.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                    {member.name}
                    <button
                      onClick={() => removeMember(memberId)}
                      className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`Remove ${member.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          ) : currentGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground">No users or groups assigned to this role yet.</p>
          ) : null}
        </div>
      )}

      <div className="space-y-8">
        {PERMISSION_SECTIONS.map((section) => {
          const viewPermId = SECTION_VIEW_PERMISSION[section];
          const sectionPerms = ALL_PERMISSIONS.filter((p) => p.section === section);
          const childPerms = sectionPerms.length === 1 ? sectionPerms : sectionPerms.filter((p) => p.id !== viewPermId);
          const viewPerm = sectionPerms.find((p) => p.id === viewPermId);
          if (sectionPerms.length === 0) return null;
          const masterOn = isAdmin || currentPerms.has(viewPermId);
          return (
            <div key={section}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold text-foreground">{section}</h3>
                  {!isAdmin && viewPerm && (
                    <span className={cn(
                      "text-xs font-medium transition-colors",
                      masterOn ? "text-primary" : "text-muted-foreground"
                    )}>
                      {masterOn ? "Enabled" : "Disabled"}
                    </span>
                  )}
                </div>
                {isAdmin ? (
                  <span className="text-xs text-muted-foreground italic">Always on</span>
                ) : viewPerm ? (
                  <Switch
                    checked={masterOn}
                    onCheckedChange={() => toggleSectionMaster(section, masterOn)}
                  />
                ) : null}
              </div>
              <div className={cn(
                "rounded-lg border border-border transition-opacity",
                !masterOn && !isAdmin && "opacity-40 pointer-events-none"
              )}>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-40">Capability</th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                      <th className="px-4 py-2 w-28" />
                    </tr>
                  </thead>
                  <tbody>
                    {childPerms.map((perm) => {
                      const enabled = currentPerms.has(perm.id);
                      return (
                        <tr key={perm.id} className="border-b border-border last:border-b-0">
                          <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">{perm.capability}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{perm.description}</td>
                          <td className="px-4 py-3 text-right">
                            {isAdmin ? (
                              <span className="text-xs text-muted-foreground italic">Always on</span>
                            ) : enabled ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-red-600"
                                onClick={() => togglePermission(perm.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                                Remove
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => togglePermission(perm.id)}
                              >
                                <Plus className="h-3 w-3" />
                                Add
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────── Routing Rules Editor ──────────────── */

const RULE_CATEGORIES = ["Payments", "Maintenance", "Leasing", "Accounting", "Compliance"];
const RULE_TYPES: { value: EscalationType; label: string }[] = [
  { value: "approval", label: "Approval" },
  { value: "doc_improvement", label: "Doc improvement" },
  { value: "conversation", label: "Conversation" },
  { value: "training", label: "Training" },
  { value: "workflow", label: "Workflow" },
];
const TIER_OPTIONS: { value: WorkforceTier; label: string }[] = [
  { value: "specialist", label: "Specialist" },
  { value: "coordinator", label: "Coordinator" },
  { value: "management", label: "Management" },
  { value: "leadership", label: "Leadership" },
];

function describeCondition(rule: EscalationRoutingRule): string {
  const parts: string[] = [];
  if (rule.category) parts.push(`Category = ${rule.category}`);
  if (rule.type) {
    const label = RULE_TYPES.find((t) => t.value === rule.type)?.label ?? rule.type;
    parts.push(`Type = ${label}`);
  }
  if (rule.property) parts.push(`Property = ${rule.property}`);
  if (rule.labels?.length) parts.push(`Labels include ${rule.labels.join(", ")}`);
  if (rule.minPriority) parts.push(`Priority ≥ ${rule.minPriority}`);
  return parts.length > 0 ? parts.join(" & ") : "Everything (fallback)";
}

function RoutingRulesEditor({
  rules,
  humanMembers,
  onAdd,
  onRemove,
  onUpdate,
}: {
  rules: EscalationRoutingRule[];
  humanMembers: WorkforceMember[];
  onAdd: (rule: Omit<EscalationRoutingRule, "id">) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Omit<EscalationRoutingRule, "id">>) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newType, setNewType] = useState("");
  const [newAssignees, setNewAssignees] = useState<string[]>([]);
  const [newReassignMin, setNewReassignMin] = useState("");
  const [newEscalateMin, setNewEscalateMin] = useState("");
  const [newMaxTier, setNewMaxTier] = useState("");

  const assigneeOptions = useMemo(() => {
    const names = humanMembers.map((m) => m.name);
    if (!names.includes("Admin")) names.unshift("Admin");
    return names;
  }, [humanMembers]);

  const isFallback = (rule: EscalationRoutingRule) =>
    !rule.category && !rule.type && (!rule.labels || rule.labels.length === 0);

  const resetForm = () => {
    setNewCategory("");
    setNewType("");
    setNewAssignees([]);
    setNewReassignMin("");
    setNewEscalateMin("");
    setNewMaxTier("");
    setAdding(false);
  };

  const nameToId = useCallback((name: string) => {
    return humanMembers.find((m) => m.name === name)?.id ?? name;
  }, [humanMembers]);

  const resolveNames = useCallback((rule: EscalationRoutingRule): string[] => {
    if (rule.assigneeIds?.length) {
      return rule.assigneeIds
        .map((id) => humanMembers.find((m) => m.id === id)?.name)
        .filter((n): n is string => n != null);
    }
    return rule.assignees ?? [];
  }, [humanMembers]);

  const handleAdd = () => {
    if (newAssignees.length === 0) return;
    const rule: Omit<EscalationRoutingRule, "id"> = { assigneeIds: newAssignees.map(nameToId) };
    if (newCategory) rule.category = newCategory;
    if (newType) rule.type = newType as EscalationType;
    if (newReassignMin) rule.reassignAfterMinutes = Number(newReassignMin);
    if (newEscalateMin) rule.escalateToManagerAfterMinutes = Number(newEscalateMin);
    if (newMaxTier) rule.maxEscalationTier = newMaxTier as WorkforceTier;
    onAdd(rule);
    resetForm();
  };

  const addAssigneeToRule = (ruleId: string, name: string, currentIds: string[]) => {
    const id = nameToId(name);
    if (!currentIds.includes(id)) {
      onUpdate(ruleId, { assigneeIds: [...currentIds, id] });
    }
  };

  const removeAssigneeFromRule = (ruleId: string, name: string, currentIds: string[]) => {
    const id = nameToId(name);
    const next = currentIds.filter((n) => n !== id);
    if (next.length > 0) onUpdate(ruleId, { assigneeIds: next });
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-4">#</TableHead>
              <TableHead className="w-[180px]">Condition</TableHead>
              <TableHead>Assignees</TableHead>
              <TableHead className="w-[80px] text-center">Reassign</TableHead>
              <TableHead className="w-[80px] text-center">Escalate</TableHead>
              <TableHead className="w-[100px] text-center">Ceiling</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule, i) => {
              const fallback = isFallback(rule);
              const ruleNames = resolveNames(rule);
              const ruleIds = rule.assigneeIds ?? [];
              const unusedOptions = assigneeOptions.filter((n) => !ruleNames.includes(n));
              return (
                <TableRow key={rule.id} className={cn(fallback && "bg-muted/30", "align-top")}>
                  <TableCell className="pl-4 pt-3 text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="pt-3">
                    <span className={cn("text-xs font-medium", fallback && "text-muted-foreground")}>
                      {describeCondition(rule)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5 py-1">
                      {ruleNames.map((name) => {
                        const member = humanMembers.find((m) => m.name === name);
                        const propLabel = member?.properties?.includes("All properties")
                          ? "All"
                          : member?.properties?.join(", ");
                        return (
                          <span
                            key={name}
                            className="group inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-xs"
                          >
                            {name}
                            {propLabel && (
                              <span className="text-[10px] text-muted-foreground">({propLabel})</span>
                            )}
                            {ruleNames.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeAssigneeFromRule(rule.id, name, ruleIds)}
                                className="ml-0.5 rounded-full p-0.5 text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive group-hover:text-muted-foreground"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </span>
                        );
                      })}
                      {unusedOptions.length > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-6 items-center gap-0.5 rounded-full border border-dashed border-border px-2 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-1" align="start">
                            <div className="max-h-48 overflow-y-auto">
                              {unusedOptions.map((name) => (
                                <button
                                  key={name}
                                  type="button"
                                  onClick={() => addAssigneeToRule(rule.id, name, ruleIds)}
                                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                                >
                                  {name}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="pt-2 text-center">
                    <input
                      type="number"
                      min={1}
                      value={rule.reassignAfterMinutes ?? ""}
                      onChange={(e) => onUpdate(rule.id, { reassignAfterMinutes: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="10"
                      className="h-7 w-16 rounded border border-input bg-background px-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      aria-label="Reassign after minutes"
                    />
                    <span className="block text-[9px] text-muted-foreground mt-0.5">min</span>
                  </TableCell>
                  <TableCell className="pt-2 text-center">
                    <input
                      type="number"
                      min={1}
                      value={rule.escalateToManagerAfterMinutes ?? ""}
                      onChange={(e) => onUpdate(rule.id, { escalateToManagerAfterMinutes: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="30"
                      className="h-7 w-16 rounded border border-input bg-background px-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      aria-label="Escalate to manager after minutes"
                    />
                    <span className="block text-[9px] text-muted-foreground mt-0.5">min</span>
                  </TableCell>
                  <TableCell className="pt-2 text-center">
                    <select
                      value={rule.maxEscalationTier ?? ""}
                      onChange={(e) => onUpdate(rule.id, { maxEscalationTier: (e.target.value || undefined) as WorkforceTier | undefined })}
                      className="h-7 w-[88px] rounded border border-input bg-background px-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      aria-label="Max escalation tier"
                    >
                      <option value="">No limit</option>
                      {TIER_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="pt-3">
                    {!fallback && (
                      <button
                        type="button"
                        onClick={() => onRemove(rule.id)}
                        className="rounded p-1 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Remove rule"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Add rule form row */}
            {adding && (
              <TableRow className="align-top">
                <TableCell className="pl-4 pt-3 text-xs text-muted-foreground">+</TableCell>
                <TableCell className="pt-2">
                  <div className="flex flex-col gap-2">
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Any category</option>
                      {RULE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Any type</option>
                      {RULE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </TableCell>
                <TableCell className="pt-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {newAssignees.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-xs"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => setNewAssignees((prev) => prev.filter((n) => n !== name))}
                          className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value && !newAssignees.includes(e.target.value)) {
                          setNewAssignees((prev) => [...prev, e.target.value]);
                        }
                        e.target.value = "";
                      }}
                      className="h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Add person...</option>
                      {assigneeOptions
                        .filter((n) => !newAssignees.includes(n))
                        .map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                  </div>
                </TableCell>
                <TableCell className="pt-2 text-center">
                  <input
                    type="number"
                    min={1}
                    value={newReassignMin}
                    onChange={(e) => setNewReassignMin(e.target.value)}
                    placeholder="10"
                    className="h-7 w-16 rounded border border-input bg-background px-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    aria-label="Reassign after minutes"
                  />
                </TableCell>
                <TableCell className="pt-2 text-center">
                  <input
                    type="number"
                    min={1}
                    value={newEscalateMin}
                    onChange={(e) => setNewEscalateMin(e.target.value)}
                    placeholder="30"
                    className="h-7 w-16 rounded border border-input bg-background px-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    aria-label="Escalate to manager after minutes"
                  />
                </TableCell>
                <TableCell className="pt-2 text-center">
                  <select
                    value={newMaxTier}
                    onChange={(e) => setNewMaxTier(e.target.value)}
                    className="h-7 w-[88px] rounded border border-input bg-background px-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    aria-label="Max escalation tier"
                  >
                    <option value="">No limit</option>
                    {TIER_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </TableCell>
                <TableCell className="pt-2">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={newAssignees.length === 0}
                      className="rounded p-1 text-primary transition-colors hover:bg-primary/10 disabled:opacity-30"
                      aria-label="Save rule"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted"
                      aria-label="Cancel"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {!adding && (
          <div className="border-t border-border px-4 py-2">
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Add rule
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────── Filter Dropdown ───────────────────── */

function FilterDropdown({
  label,
  icon: Icon,
  options,
  selected,
  onToggle,
}: {
  label: string;
  icon?: React.ElementType;
  options: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-1.5 text-xs font-normal",
            selected.size > 0 && "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary",
          )}
        >
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
          {selected.size > 0 && (
            <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {selected.size}
            </span>
          )}
          <ChevronDown className={cn("ml-1 h-3 w-3 transition-transform", open && "rotate-180")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="start">
        {options.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">No options</p>
        )}
        {options.map((opt) => {
          const isSelected = selected.has(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <div className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30",
              )}>
                {isSelected && <Check className="h-3 w-3" />}
              </div>
              {opt}
            </button>
          );
        })}
        {selected.size > 0 && (
          <>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={() => { for (const s of selected) onToggle(s); }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Clear all
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ──────────────────────────── Team Divider ──────────────────────── */

function TeamDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="h-px flex-1 bg-border" />
      <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/* ──────────────────────────── Member Row Content ─────────────────── */

function MemberRowContent({
  member,
  metric,
  onMemberClick,
  isAgentOff,
}: {
  member: WorkforceMember;
  metric: MemberMetric;
  onMemberClick?: (id: string) => void;
  isAgentOff?: boolean;
}) {
  const isAgent = member.type === "agent";
  const initials = member.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

  const scope = member.properties?.join(", ") ?? "";
  const description = isAgent
    ? `ELI+ Agent \u00b7 ${member.jtbd}`
    : [member.role, scope].filter(Boolean).join(" \u00b7 ");

  const handleClick = onMemberClick
    ? (e: React.MouseEvent) => { e.stopPropagation(); onMemberClick(member.id); }
    : undefined;

  return (
    <div className={cn("flex items-center gap-3 py-3 relative", isAgentOff && "opacity-40")}>
      <div
        className={cn(onMemberClick && "cursor-pointer")}
        onClick={handleClick}
      >
        {isAgent ? (
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-shadow hover:ring-2 hover:ring-primary/30",
            isAgentOff ? "bg-muted" : "bg-primary/10",
          )}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/eli-cube.svg" alt="" className={cn("h-5 w-5", isAgentOff && "grayscale")} />
          </div>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground transition-shadow hover:ring-2 hover:ring-primary/30">
            {initials}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "text-sm font-medium text-foreground",
              onMemberClick && "cursor-pointer hover:underline",
            )}
            onClick={handleClick}
          >
            {member.name}
          </p>
          {isAgent && !isAgentOff && (
            <span className="inline-flex items-center rounded bg-[#B3FFCC] px-1.5 py-0.5 text-[10px] font-medium leading-3 text-black">
              Active
            </span>
          )}
          {isAgent && isAgentOff && (
            <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-3 text-muted-foreground">
              Off
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>

      {isAgentOff ? (
        <div className="shrink-0 text-right">
          <p className="text-xs font-medium text-amber-600">Not enabled</p>
          <p className="text-[10px] text-muted-foreground">Activate in Agent Roster</p>
        </div>
      ) : (
        <div className="shrink-0 text-right">
          <p
            className={cn(
              "text-sm font-semibold",
              metric.highlight
                ? "text-green-600 dark:text-green-400"
                : "text-foreground",
            )}
          >
            {metric.value}
          </p>
          <p className="text-[10px] text-muted-foreground">{metric.label}</p>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────── Member Node (recursive) ───────────── */

function MemberNode({
  member,
  childrenOfMap,
  memberMetrics,
  isLast,
  expandedNodes,
  onToggle,
  onMemberClick,
  offAgentNames,
}: {
  member: WorkforceMember;
  childrenOfMap: Map<string, WorkforceMember[]>;
  memberMetrics: Map<string, MemberMetric>;
  isLast: boolean;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
  onMemberClick: (id: string) => void;
  offAgentNames: Set<string>;
}) {
  const children = childrenOfMap.get(member.id) ?? [];
  const metric = memberMetrics.get(member.id)!;
  const hasChildren = children.length > 0;
  const isExpanded = expandedNodes.has(member.id);
  const isOff = member.type === "agent" && offAgentNames.has(member.name);

  return (
    <div className="relative ml-4 pl-6">
      {/* Vertical connector */}
      <div
        className={cn(
          "absolute left-0 w-px bg-border",
          isLast ? "top-0 h-8" : "top-0 bottom-0",
        )}
      />
      {/* Horizontal branch to avatar */}
      <div className="absolute left-0 top-8 h-px w-5 bg-border" />

      <div
        className={cn(
          "flex items-center gap-0",
          hasChildren && "cursor-pointer rounded-md transition-colors hover:bg-muted/50",
        )}
        onClick={hasChildren ? () => onToggle(member.id) : undefined}
        role={hasChildren ? "button" : undefined}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-label={hasChildren ? (isExpanded ? `Collapse ${member.name}` : `Expand ${member.name}`) : undefined}
      >
        {hasChildren && (
          <div className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </div>
        )}
        <div className={cn("flex-1 min-w-0", !hasChildren && "ml-5")}>
          <MemberRowContent member={member} metric={metric} onMemberClick={onMemberClick} isAgentOff={isOff} />
        </div>
      </div>

      {hasChildren && isExpanded &&
        children.map((child, i) => (
          <MemberNode
            key={child.id}
            member={child}
            childrenOfMap={childrenOfMap}
            memberMetrics={memberMetrics}
            isLast={i === children.length - 1}
            expandedNodes={expandedNodes}
            onToggle={onToggle}
            onMemberClick={onMemberClick}
            offAgentNames={offAgentNames}
          />
        ))}

      {hasChildren && !isExpanded && (
        <button
          type="button"
          onClick={() => onToggle(member.id)}
          className="ml-5 -mt-1 mb-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {children.length} direct report{children.length !== 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
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

function MemberDetailSheet({
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

  const properties = member?.properties ?? [];
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

/* ──────────────────────────── Org Table ──────────────────────────── */

function OrgTable({
  leaders,
  teamSections,
  childrenOfMap,
  memberMetrics,
  expandedNodes,
  onToggle,
  onMemberClick,
  offAgentNames,
}: {
  leaders: WorkforceMember[];
  teamSections: { team: string; topLevel: WorkforceMember[] }[];
  childrenOfMap: Map<string, WorkforceMember[]>;
  memberMetrics: Map<string, MemberMetric>;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
  onMemberClick: (id: string) => void;
  offAgentNames: Set<string>;
}) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[260px]">Name</TableHead>
            <TableHead className="min-w-[140px]">Role</TableHead>
            <TableHead className="min-w-[100px]">Properties</TableHead>
            <TableHead className="min-w-[120px]">Labels</TableHead>
            <TableHead className="text-right min-w-[100px]">Metric</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaders.map((m) => (
            <OrgTableRow
              key={m.id}
              member={m}
              depth={0}
              childrenOfMap={childrenOfMap}
              memberMetrics={memberMetrics}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onMemberClick={onMemberClick}
              offAgentNames={offAgentNames}
            />
          ))}
          {teamSections.map((section) =>
            section.topLevel.map((m) => (
              <OrgTableRow
                key={m.id}
                member={m}
                depth={0}
                childrenOfMap={childrenOfMap}
                memberMetrics={memberMetrics}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
                onMemberClick={onMemberClick}
                offAgentNames={offAgentNames}
              />
            )),
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

/* ──────────────────────────── Org Table Row ──────────────────────── */

function OrgTableRow({
  member,
  depth,
  childrenOfMap,
  memberMetrics,
  expandedNodes,
  onToggle,
  onMemberClick,
  offAgentNames,
}: {
  member: WorkforceMember;
  depth: number;
  childrenOfMap: Map<string, WorkforceMember[]>;
  memberMetrics: Map<string, MemberMetric>;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
  onMemberClick: (id: string) => void;
  offAgentNames: Set<string>;
}) {
  const children = childrenOfMap.get(member.id) ?? [];
  const metric = memberMetrics.get(member.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedNodes.has(member.id);
  const isAgent = member.type === "agent";
  const isOff = isAgent && offAgentNames.has(member.name);
  const initials = member.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  const labels = member.labels ?? [];
  const properties = member.properties ?? [];

  const hasAllProps = properties.length >= 3;
  const propsDisplay = hasAllProps ? "All properties" : properties.join(", ");

  return (
    <>
      <TableRow
        className={cn(
          hasChildren && "cursor-pointer",
          isAgent && depth > 0 && "bg-muted/20",
          isOff && "opacity-40",
        )}
        onClick={hasChildren ? () => onToggle(member.id) : undefined}
      >
        {/* Name */}
        <TableCell className="py-2.5">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggle(member.id); }}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
              >
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <span className="w-5 shrink-0" />
            )}
            <div
              className="shrink-0 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onMemberClick(member.id); }}
            >
              {isAgent ? (
                <div className={cn("flex h-7 w-7 items-center justify-center rounded-full transition-shadow hover:ring-2 hover:ring-primary/30", isOff ? "bg-muted" : "bg-primary/10")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/eli-cube.svg" alt="" className={cn("h-3.5 w-3.5", isOff && "grayscale")} />
                </div>
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold transition-shadow hover:ring-2 hover:ring-primary/30">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <span
                className="cursor-pointer whitespace-nowrap text-sm font-medium hover:underline"
                onClick={(e) => { e.stopPropagation(); onMemberClick(member.id); }}
              >
                {member.name}
              </span>
              {isAgent && (
                <span className={cn("ml-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-3", isOff ? "bg-muted text-muted-foreground" : "bg-[#B3FFCC] text-black")}>
                  {isOff ? "Off" : "Active"}
                </span>
              )}
              {hasChildren && !isExpanded && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">+{children.length}</span>
              )}
            </div>
          </div>
        </TableCell>

        {/* Role */}
        <TableCell className="py-2.5">
          <span className="whitespace-nowrap text-xs text-muted-foreground">{member.role}</span>
        </TableCell>

        {/* Properties */}
        <TableCell className="py-2.5">
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {propsDisplay || "\u2014"}
          </span>
        </TableCell>

        {/* Labels */}
        <TableCell className="py-2.5">
          <div className="flex flex-wrap gap-1">
            {labels.map((l) => (
              <span key={l} className="inline-block whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {l}
              </span>
            ))}
          </div>
        </TableCell>

        {/* Metric */}
        <TableCell className="py-2.5 text-right">
          {isOff ? (
            <span className="text-xs text-amber-600">Not enabled</span>
          ) : metric ? (
            <span className="whitespace-nowrap">
              <span className={cn("text-sm font-semibold", metric.highlight && "text-green-600 dark:text-green-400")}>
                {metric.value}
              </span>
              <span className="ml-1 text-[10px] text-muted-foreground">{metric.label}</span>
            </span>
          ) : null}
        </TableCell>
      </TableRow>
      {hasChildren && isExpanded &&
        children.map((child) => (
          <OrgTableRow
            key={child.id}
            member={child}
            depth={depth + 1}
            childrenOfMap={childrenOfMap}
            memberMetrics={memberMetrics}
            expandedNodes={expandedNodes}
            onToggle={onToggle}
            onMemberClick={onMemberClick}
            offAgentNames={offAgentNames}
          />
        ))}
    </>
  );
}
