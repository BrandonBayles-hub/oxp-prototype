"use client";

import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { useWorkforce, TEAMS, type WorkforceMember, type WorkforceTier } from "@/lib/workforce-context";
import { useAgents } from "@/lib/agents-context";
import { useEscalations } from "@/lib/escalations-context";
import { useRole, isPropertyInScope } from "@/lib/role-context";
import { ContractGate } from "@/components/contract-overlay";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BarChart3, Bot, Building2, Users, X, Zap, BrainCircuit, Cog,
} from "lucide-react";
import Image from "next/image";

type ViewMode = "org" | "all" | "agents" | "humans";

const TIER_ORDER: Record<WorkforceTier, number> = { leadership: 0, management: 1, coordinator: 2, specialist: 3 };

function AgentIcon({ level, size = "md" }: { level?: WorkforceMember["agentLevel"]; size?: "sm" | "md" }) {
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const imgSize = size === "sm" ? 14 : 20;
  switch (level) {
    case "l1": return <Cog className={cn(iconClass, "text-gray-400")} />;
    case "l2": return <BarChart3 className={cn(iconClass, "text-amber-400")} />;
    case "l3": return <Bot className={cn(iconClass, "text-emerald-400")} />;
    case "l4": return <Image src="/eli-plus-cube.svg" alt="ELI+" width={imgSize} height={imgSize} />;
    default:   return <Zap className={cn(iconClass, "text-amber-500")} />;
  }
}

function agentAvatarBg(level?: WorkforceMember["agentLevel"]) {
  switch (level) {
    case "l1": return "bg-gray-100 dark:bg-gray-800";
    case "l3": return "bg-emerald-50 dark:bg-emerald-950/40";
    default:   return "bg-amber-50 dark:bg-amber-950/40";
  }
}

function normalizeLabel(t: string): string {
  return t.trim().toLowerCase();
}

export default function WorkforcePage() {
  const { members, updateMember, allLabels: workforceLabels, humanMembers, agentMembers } = useWorkforce();
  const { agents } = useAgents();
  const { items: escalations } = useEscalations();
  const { role, roleProperties } = useRole();
  const isSiteStaff = role === "ic";
  const isRegional = role === "regional";
  const isProperty = role === "property";
  const [view, setView] = useState<ViewMode>("org");

  const SITE_STAFF_PROPERTY = "Property A";

  const scopedMembers = useMemo(() => {
    if (roleProperties === "all") return members;
    return members.filter((m) => {
      const props = m.properties ?? [];
      if (props.length === 0) return true;
      return props.some((p) => isPropertyInScope(p, roleProperties));
    });
  }, [members, roleProperties]);

  const myTeamMembers = useMemo(() => {
    const filterProps = isSiteStaff ? [SITE_STAFF_PROPERTY] : (roleProperties === "all" ? null : roleProperties);
    if (!filterProps) return members;
    return members.filter((m) => {
      const props = m.properties ?? [];
      return props.includes("All properties") || props.some((p) => filterProps.includes(p));
    });
  }, [members, isSiteStaff, roleProperties]);
  const myTeamHumans = useMemo(() => myTeamMembers.filter((m) => m.type === "human"), [myTeamMembers]);
  const myTeamAgents = useMemo(() => myTeamMembers.filter((m) => m.type === "agent"), [myTeamMembers]);

  const displayMembers = (isSiteStaff || isRegional || isProperty) ? scopedMembers : members;
  const displayHumans = useMemo(() => displayMembers.filter((m) => m.type === "human"), [displayMembers]);
  const displayAgents = useMemo(() => displayMembers.filter((m) => m.type === "agent"), [displayMembers]);

  const teamsWithAI = useMemo(() => {
    const s = new Set<string>();
    for (const m of displayMembers) if (m.type === "agent") s.add(m.team);
    return s.size;
  }, [displayMembers]);

  const totalHumans = displayHumans.length;
  const totalAI = displayAgents.length;
  const totalMembers = displayMembers.length;
  const openEscalations = escalations.filter((e) => e.status !== "Done").length;

  const labelPool = useMemo(() => {
    const set = new Set<string>();
    workforceLabels.forEach((t) => set.add(t));
    agents.forEach((a) => (a.labels ?? []).forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [workforceLabels, agents]);

  const teamGroups = useMemo(() => {
    return TEAMS.map((team) => {
      const teamMembers = displayMembers.filter((m) => m.team === team);
      const teamAgents = teamMembers.filter((m) => m.type === "agent");
      const teamHumans = teamMembers
        .filter((m) => m.type === "human")
        .sort((a, b) => {
          const ta = TIER_ORDER[a.tier ?? "specialist"];
          const tb = TIER_ORDER[b.tier ?? "specialist"];
          return ta !== tb ? ta - tb : a.name.localeCompare(b.name);
        });
      const hasActiveAgent = teamAgents.length > 0;
      return { team, members: teamMembers, agents: teamAgents, humans: teamHumans, hasActiveAgent };
    }).filter((g) => g.members.length > 0);
  }, [displayMembers]);

  const memberById = useMemo(() => new Map(displayMembers.map((m) => [m.id, m])), [displayMembers]);
  const memberSet = useMemo(() => new Set(displayMembers.map((m) => m.id)), [displayMembers]);

  const orgMembers = useMemo(() => {
    const seenAgentTeam = new Set<string>();
    return displayMembers.filter((m) => {
      if (m.type === "human") return true;
      if (m.agentLevel !== "l4") return false;
      if (seenAgentTeam.has(m.team)) return false;
      seenAgentTeam.add(m.team);
      return true;
    });
  }, [displayMembers]);

  const orgMemberSet = useMemo(() => new Set(orgMembers.map((m) => m.id)), [orgMembers]);

  const orgRoots = useMemo(() => {
    return orgMembers.filter((m) => !m.reportsTo || !orgMemberSet.has(m.reportsTo));
  }, [orgMembers, orgMemberSet]);

  const childrenOf = useMemo(() => {
    const map = new Map<string, WorkforceMember[]>();
    for (const m of orgMembers) {
      if (m.reportsTo && orgMemberSet.has(m.reportsTo)) {
        const list = map.get(m.reportsTo) ?? [];
        list.push(m);
        map.set(m.reportsTo, list);
      }
    }
    for (const [, list] of map) {
      list.sort((a, b) => {
        if (a.type !== b.type) return a.type === "human" ? 1 : -1;
        const ta = TIER_ORDER[a.tier ?? "specialist"];
        const tb = TIER_ORDER[b.tier ?? "specialist"];
        return ta !== tb ? ta - tb : a.name.localeCompare(b.name);
      });
    }
    return map;
  }, [orgMembers, orgMemberSet]);

  return (
    <ContractGate featureName="Workforce">
    <>
      <PageHeader
        title={isSiteStaff ? "My Workforce" : "Workforce"}
        description={isSiteStaff
          ? "Your team and the AI agents that work alongside you at your property."
          : "Your org structure with AI layered in — who works on what, how work routes, and how human and AI capabilities combine."
        }
      />

      {isSiteStaff ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: "My team", value: myTeamHumans.length, sub: `at ${SITE_STAFF_PROPERTY}` },
              { label: "AI agents", value: myTeamAgents.length, sub: "working alongside you" },
              { label: "Open escalations", value: openEscalations },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="py-3">
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  {"sub" in s && s.sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{s.sub}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
          <SiteStaffMyTeam humans={myTeamHumans} agents={myTeamAgents} property={SITE_STAFF_PROPERTY} />
        </>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "Total workforce", value: totalMembers, sub: `${totalHumans} human · ${totalAI} AI` },
              { label: "Human staff", value: totalHumans },
              { label: "AI agents", value: totalAI },
              { label: "Teams with AI", value: `${teamsWithAI}/${TEAMS.length}` },
              { label: "Open escalations", value: openEscalations },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="py-3">
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  {"sub" in s && s.sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{s.sub}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* View toggle + summary */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
              {([
                { key: "org", label: "Org Chart" },
                { key: "all", label: "All" },
                { key: "agents", label: "AI Agents" },
                { key: "humans", label: "Humans" },
              ] as { key: ViewMode; label: string }[]).map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setView(v.key)}
                  className={cn(
                    "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                    view === v.key
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {totalHumans} staff · {agentMembers.filter((a) => a.role.includes("Agent") || a.role.includes("Autonomous")).length} autonomous agents · {agentMembers.filter((a) => a.role.includes("Insights") || a.role.includes("Intelligence") || a.role.includes("Automation") || a.role.includes("Operations")).length} intelligence agents
            </span>
          </div>

          {view === "org" && (
            <OrgChartView
              roots={orgRoots}
              childrenOf={childrenOf}
              totalHumans={totalHumans}
              totalAI={totalAI}
            />
          )}
          {(view === "all" || view === "agents" || view === "humans") && (
            <TeamListView
              teamGroups={teamGroups}
              filter={view}
              labelPool={labelPool}
              onUpdate={updateMember}
            />
          )}
        </>
      )}
    </>
    </ContractGate>
  );
}

/* ═══════════════════════════════════════════════════════════
   Org Chart View — Hierarchical tree with connectors
   ═══════════════════════════════════════════════════════════ */

function OrgChartView({
  roots,
  childrenOf,
  totalHumans,
  totalAI,
}: {
  roots: WorkforceMember[];
  childrenOf: Map<string, WorkforceMember[]>;
  totalHumans: number;
  totalAI: number;
}) {
  const sortedRoots = useMemo(() =>
    [...roots].sort((a, b) => {
      if (a.type !== b.type) return a.type === "human" ? -1 : 1;
      const ta = TIER_ORDER[a.tier ?? "specialist"];
      const tb = TIER_ORDER[b.tier ?? "specialist"];
      return ta !== tb ? ta - tb : a.name.localeCompare(b.name);
    }),
    [roots]
  );

  return (
    <Card>
      <CardContent className="py-6">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <h2 className="text-lg font-semibold text-foreground">Property Team + Agent Workforce</h2>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {totalHumans} staff · {totalAI} AI agents
          </p>
        </div>

        <div>
          {sortedRoots.map((root) => (
            <OrgChartNode key={root.id} member={root} childrenOf={childrenOf} depth={0} isLast={false} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OrgChartNode({
  member,
  childrenOf,
  depth,
  isLast,
}: {
  member: WorkforceMember;
  childrenOf: Map<string, WorkforceMember[]>;
  depth: number;
  isLast: boolean;
}) {
  const children = childrenOf.get(member.id) ?? [];
  const isAgent = member.type === "agent";
  const indent = depth * 40;

  const directReportAgents = children.filter((c) => c.type === "agent");
  const directReportHumans = children.filter((c) => c.type === "human");

  const teamGrouped = useMemo(() => {
    if (children.length === 0) return [];
    const map = new Map<string, { agents: WorkforceMember[]; humans: WorkforceMember[] }>();
    for (const c of children) {
      const team = c.team;
      if (!map.has(team)) map.set(team, { agents: [], humans: [] });
      if (c.type === "agent") map.get(team)!.agents.push(c);
      else map.get(team)!.humans.push(c);
    }
    return Array.from(map.entries());
  }, [children]);

  const isManager = directReportHumans.length > 0 || directReportAgents.length > 0;

  return (
    <div>
      {/* The member row */}
      <div className="relative flex items-center gap-3 py-3" style={{ paddingLeft: indent }}>
        {depth > 0 && (
          <>
            {/* Vertical line from parent */}
            <div
              className="absolute border-l-2 border-border"
              style={{ left: indent - 20, top: 0, height: "50%" }}
            />
            {/* Horizontal connector */}
            <div
              className="absolute border-t-2 border-border"
              style={{ left: indent - 20, top: "50%", width: 20 }}
            />
            {/* Curved corner */}
            <div
              className="absolute rounded-bl-lg border-b-2 border-l-2 border-border"
              style={{ left: indent - 20, top: 0, width: 20, height: "50%" }}
            />
          </>
        )}

        {/* Avatar */}
        <div className={cn(
          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
          isAgent ? agentAvatarBg(member.agentLevel) : "bg-muted text-foreground"
        )}>
          {isAgent ? <AgentIcon level={member.agentLevel} /> : member.name.split(" ").map((n) => n[0]).join("")}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              {isAgent && member.name.endsWith(" AI") ? `ELI+ ${member.name}` : member.name}
            </p>
            {isAgent && (
              <span className="rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white">AI</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isAgent
              ? `Autonomous Agent · ${member.jtbd}`
              : `${member.role}${member.properties?.[0] ? ` · ${member.properties[0]}` : ""}`
            }
          </p>
        </div>

        {/* Metric */}
        <div className="shrink-0 text-right">
          <OrgChartMetric member={member} />
        </div>
      </div>

      {/* Children grouped by team */}
      {isManager && teamGrouped.length > 0 && (
        <div>
          {teamGrouped.map(([team, group], gi) => {
            const allInGroup = [...group.agents, ...group.humans];
            return (
              <div key={team}>
                {/* Team section header */}
                <div
                  className="flex items-center gap-2 pb-1 pt-4"
                  style={{ paddingLeft: indent + 40 }}
                >
                  <div className="h-px flex-1 bg-border/50" />
                  <p className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {team}
                  </p>
                  <div className="h-px flex-1 bg-border/50" />
                </div>

                {/* Team members */}
                {allInGroup.map((child, ci) => (
                  <OrgChartNode
                    key={child.id}
                    member={child}
                    childrenOf={childrenOf}
                    depth={depth + 1}
                    isLast={ci === allInGroup.length - 1 && gi === teamGrouped.length - 1}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrgChartMetric({ member }: { member: WorkforceMember }) {
  const isAgent = member.type === "agent";
  let value = "—";
  let label = "";
  let color = "text-foreground";

  if (isAgent) {
    color = "text-green-600 dark:text-green-400";
    if (member.name.includes("Leasing") && member.role.includes("Agent")) { value = "34%"; label = "conv."; }
    else if (member.name.includes("Payments") && member.role.includes("Agent")) { value = "$23.4K"; label = "wk"; }
    else if (member.name.includes("Renewal") && member.role.includes("Agent")) { value = "92%"; label = "retain"; }
    else if (member.name.includes("Maintenance") && member.role.includes("Agent")) { value = "4.2hr"; label = "avg"; }
    else if (member.name.includes("Compliance") && member.role.includes("Agent")) { value = "100%"; label = "compliant"; }
    else if (member.role.includes("Insights")) { value = "—"; label = "insights"; }
    else if (member.role.includes("Automation") || member.role.includes("Operations")) { value = "97%"; label = "auto"; }
    else { value = "Active"; }
  } else {
    if (member.tier === "leadership") { value = "6"; label = "properties"; }
    else if (member.tier === "management" && member.team.includes("Leasing")) { value = "312"; label = "units"; }
    else if (member.tier === "management" && member.team.includes("Maintenance")) { value = "5"; label = "active WOs"; }
    else if (member.tier === "management" && member.team.includes("Revenue")) { value = "$23.4K"; label = "collected"; }
    else if (member.tier === "management" && member.team.includes("Resident")) { value = "92%"; label = "retention"; }
    else if (member.role.includes("Consultant") || member.role.includes("Coordinator")) { value = "2"; label = "tours today"; }
    else if (member.role.includes("Technician")) { value = "3"; label = "WOs"; }
    else if (member.role.includes("Specialist")) { value = "4"; label = "tasks"; }
    else if (member.role.includes("Officer")) { value = "2"; label = "reviews"; }
    else if (member.name.includes("Jake") || member.name.includes("Jordan")) { value = "Training"; label = ""; }
  }

  return (
    <>
      <p className={cn("text-sm font-bold", color)}>{value}</p>
      {label && <p className="text-[10px] text-muted-foreground">{label}</p>}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   Team List View (All / AI Agents / Humans)
   ═══════════════════════════════════════════════════════════ */

function TeamListView({
  teamGroups,
  filter,
  labelPool,
  onUpdate,
}: {
  teamGroups: { team: string; agents: WorkforceMember[]; humans: WorkforceMember[]; hasActiveAgent: boolean }[];
  filter: "all" | "agents" | "humans";
  labelPool: string[];
  onUpdate: (id: string, updates: Partial<Omit<WorkforceMember, "id">>) => void;
}) {
  const filteredGroups = useMemo(() => {
    return teamGroups.map((g) => ({
      ...g,
      agents: filter === "humans" ? [] : g.agents,
      humans: filter === "agents" ? [] : g.humans,
    })).filter((g) => g.agents.length > 0 || g.humans.length > 0);
  }, [teamGroups, filter]);

  return (
    <div className="space-y-4">
      {filteredGroups.map((group) => {
        const totalInGroup = group.agents.length + group.humans.length;
        return (
          <Card key={group.team}>
            <CardContent className="py-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "inline-flex h-2.5 w-2.5 rounded-full",
                    group.hasActiveAgent ? "bg-green-500" : "bg-muted-foreground/40"
                  )} />
                  <h3 className="text-base font-semibold text-foreground">{group.team}</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {group.agents.length > 0 && `${group.agents.length} agent${group.agents.length !== 1 ? "s" : ""}`}
                  {group.agents.length > 0 && group.humans.length > 0 && " · "}
                  {group.humans.length > 0 && `${group.humans.length} staff`}
                </span>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">{totalInGroup} member{totalInGroup !== 1 ? "s" : ""}</p>

              {group.agents.length > 0 && (
                <div className="mb-6">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Autonomous Agents
                  </p>
                  <div className="space-y-4">
                    {group.agents.map((m) => (
                      <TeamMemberRow key={m.id} member={m} labelPool={labelPool} onUpdate={onUpdate} />
                    ))}
                  </div>
                </div>
              )}

              {group.humans.length > 0 && (
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Staff
                  </p>
                  <div className="space-y-4">
                    {group.humans.map((m) => (
                      <TeamMemberRow key={m.id} member={m} labelPool={labelPool} onUpdate={onUpdate} />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TeamMemberRow({
  member,
  labelPool,
  onUpdate,
}: {
  member: WorkforceMember;
  labelPool: string[];
  onUpdate: (id: string, updates: Partial<Omit<WorkforceMember, "id">>) => void;
}) {
  const isAgent = member.type === "agent";
  const labels = member.labels ?? [];
  const labelsNormalized = useMemo(() => new Set(labels.map(normalizeLabel)), [labels]);
  const availableToAdd = labelPool.filter((t) => !labelsNormalized.has(normalizeLabel(t)));

  const addLabel = (tag: string) => {
    const t = tag.trim();
    if (!t || labelsNormalized.has(normalizeLabel(t))) return;
    const canonical = labelPool.find((l) => normalizeLabel(l) === normalizeLabel(t)) ?? t;
    onUpdate(member.id, { labels: [...labels, canonical] });
  };

  const removeLabel = (tag: string) => {
    onUpdate(member.id, { labels: labels.filter((l) => l !== tag) });
  };

  return (
    <div className="flex items-start gap-3">
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        isAgent ? agentAvatarBg(member.agentLevel) : "bg-muted text-foreground"
      )}>
        {isAgent ? <AgentIcon level={member.agentLevel} /> : member.name.split(" ").map((n) => n[0]).join("")}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{member.name}</p>
          {isAgent && (
            <span className="rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white">AI</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{member.team}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">Works on:</span> {member.jtbd}
        </p>

        {/* Routing labels — humans only for v1 */}
        {!isAgent && (
          <div className="mt-2">
            <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">Routing labels</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {labels.map((l) => (
                <span
                  key={l}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium"
                >
                  {l}
                  <button type="button" onClick={() => removeLabel(l)} className="rounded hover:bg-muted" aria-label={`Remove ${l}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <select
                value=""
                onChange={(e) => { if (e.target.value) addLabel(e.target.value); e.target.value = ""; }}
                className="h-7 rounded border border-input bg-background px-2 text-xs"
                aria-label="Add existing label"
              >
                <option value="">Add existing…</option>
                {availableToAdd.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                type="text"
                placeholder="New label"
                className="h-7 w-24 rounded border border-input bg-background px-2 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addLabel((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  const input = (e.currentTarget.parentElement?.querySelector('input[type="text"]') as HTMLInputElement);
                  if (input?.value) { addLabel(input.value); input.value = ""; }
                }}
                className="h-7 rounded border border-input bg-background px-3 text-xs font-medium hover:bg-muted"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right side type label */}
      <div className="shrink-0 text-right">
        {isAgent ? (
          <>
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">Active</p>
            <p className="text-[10px] text-muted-foreground">autonomous</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground">Staff</p>
            <p className="text-[10px] text-muted-foreground">{member.role}</p>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Site Staff — My Team
   ═══════════════════════════════════════════════════════════ */

function SiteStaffMyTeam({
  humans,
  agents,
  property,
}: {
  humans: WorkforceMember[];
  agents: WorkforceMember[];
  property: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Your team at <span className="font-medium text-foreground">{property}</span> — the people and AI agents you work alongside every day.
        </p>
        <Badge variant="outline" className="shrink-0">
          {humans.length} people · {agents.length} AI
        </Badge>
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Users className="h-4 w-4" /> Team Members
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {humans.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-start gap-3 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                  {m.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.role}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{m.jtbd}</p>
                  {m.properties && m.properties.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.properties.map((p) => (
                        <Badge key={p} variant="secondary" className="text-[9px]">
                          <Building2 className="mr-0.5 h-2.5 w-2.5" /> {p}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Bot className="h-4 w-4" /> AI Agents at Your Property
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-start gap-3 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <AgentTypeBadge role={m.role} />
                  </div>
                  <p className="text-xs text-muted-foreground">{m.team}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{m.jtbd}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */

function AgentTypeBadge({ role }: { role: string }) {
  if (role.includes("Insights")) {
    return (
      <Badge variant="outline" className="gap-1 text-[9px]">
        <BrainCircuit className="h-2.5 w-2.5" /> Insights
      </Badge>
    );
  }
  if (role.includes("Automation") || role.includes("Operations")) {
    return (
      <Badge variant="outline" className="gap-1 text-[9px]">
        <Cog className="h-2.5 w-2.5" /> Automation
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-[9px]">
      <Zap className="h-2.5 w-2.5" /> Autonomous
    </Badge>
  );
}
