"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAgents, type Agent } from "./agents-context";

export type WorkforceTier = "leadership" | "management" | "coordinator" | "specialist";

/** Workforce member (human or agent reference) — used for label-based routing of escalations */
export type WorkforceMember = {
  id: string;
  name: string;
  role: string;
  type: "agent" | "human";
  team: string;
  jtbd: string;
  /** Routing labels: escalations with matching labels can be auto-assigned to this member */
  labels?: string[];
  /** Org tier for hierarchy display */
  tier?: WorkforceTier;
  /** Who this member reports to (member id) */
  reportsTo?: string;
  /** Properties this member is scoped to */
  properties?: string[];
  /** Agent level from roster (l1–l4) for icon display */
  agentLevel?: "l1" | "l2" | "l3" | "l4";
};

const STORAGE_KEY = "janet-poc-workforce-v2";
const LEGACY_KEY = "janet-poc-workforce";

const TEAMS = [
  "Leasing & Marketing",
  "Operations & Maintenance",
  "Revenue & Financial",
  "Resident Relations",
  "Compliance & Legal",
];

const INITIAL_HUMANS: WorkforceMember[] = [
  // Leadership
  { id: "h-exec", name: "Dana Park", role: "VP of Operations", type: "human", team: "Compliance & Legal", jtbd: "Portfolio strategy, compliance oversight, operational performance", labels: ["Compliance", "Policy", "Operations"], tier: "leadership", properties: ["All properties"] },

  // Leasing & Marketing
  { id: "h-leasing-mgr", name: "Sarah Chen", role: "Leasing Manager", type: "human", team: "Leasing & Marketing", jtbd: "Complex applications, lease negotiations, team management", labels: ["Leasing", "Compliance"], tier: "management", reportsTo: "h-exec", properties: ["All properties"] },
  { id: "h-leasing-1", name: "Jordan Rivera", role: "Leasing Consultant", type: "human", team: "Leasing & Marketing", jtbd: "In-person tours, move-in coordination, applicant follow-up", labels: ["Leasing"], tier: "specialist", reportsTo: "h-leasing-mgr", properties: ["Property A", "Property B"] },
  { id: "h-leasing-2", name: "Taylor Kim", role: "Marketing Coordinator", type: "human", team: "Leasing & Marketing", jtbd: "ILS listings, social media, campaign management", labels: ["Leasing"], tier: "coordinator", reportsTo: "h-leasing-mgr", properties: ["All properties"] },

  // Operations & Maintenance
  { id: "h-maint-mgr", name: "Mike Torres", role: "Maintenance Supervisor", type: "human", team: "Operations & Maintenance", jtbd: "Emergency escalations, vendor coordination, budget oversight", labels: ["Maintenance", "Operations"], tier: "management", reportsTo: "h-exec", properties: ["All properties"] },
  { id: "h-maint-1", name: "Carlos Ruiz", role: "Maintenance Technician", type: "human", team: "Operations & Maintenance", jtbd: "HVAC, plumbing, electrical repairs, unit turns", labels: ["Maintenance"], tier: "specialist", reportsTo: "h-maint-mgr", properties: ["Property A", "Property C"] },
  { id: "h-maint-2", name: "Priya Patel", role: "Facilities Coordinator", type: "human", team: "Operations & Maintenance", jtbd: "Vendor scheduling, supply orders, preventive maintenance tracking", labels: ["Maintenance", "Operations"], tier: "coordinator", reportsTo: "h-maint-mgr", properties: ["All properties"] },

  // Revenue & Financial
  { id: "h-rev-mgr", name: "Lisa Nguyen", role: "Revenue Manager", type: "human", team: "Revenue & Financial", jtbd: "Pricing strategy, delinquency management, financial reporting", labels: ["Payments", "Operations"], tier: "management", reportsTo: "h-exec", properties: ["All properties"] },
  { id: "h-rev-1", name: "Alex Johnson", role: "Accounts Specialist", type: "human", team: "Revenue & Financial", jtbd: "Ledger reconciliation, payment disputes, collection follow-up", labels: ["Payments"], tier: "specialist", reportsTo: "h-rev-mgr", properties: ["Property A", "Property B"] },

  // Resident Relations
  { id: "h-res-mgr", name: "Maria Santos", role: "Community Manager", type: "human", team: "Resident Relations", jtbd: "Resident escalations, retention strategy, community events", labels: ["Resident relations"], tier: "management", reportsTo: "h-exec", properties: ["Property A", "Property B"] },
  { id: "h-res-1", name: "Emily Davis", role: "Resident Services Coordinator", type: "human", team: "Resident Relations", jtbd: "Lease renewals, move-out coordination, satisfaction follow-up", labels: ["Resident relations"], tier: "coordinator", reportsTo: "h-res-mgr", properties: ["Property A", "Property B"] },

  // Compliance & Legal
  { id: "h-comp-1", name: "Rachel Adams", role: "Compliance Officer", type: "human", team: "Compliance & Legal", jtbd: "Fair housing policy, screening oversight, accommodation reviews", labels: ["Compliance", "Policy"], tier: "coordinator", reportsTo: "h-exec", properties: ["All properties"] },
];

const BUCKET_TO_TEAM: Record<string, string> = {
  "Revenue & Financial Management": "Revenue & Financial",
  "Leasing & Marketing": "Leasing & Marketing",
  "Resident Relations & Retention": "Resident Relations",
  "Operations & Maintenance": "Operations & Maintenance",
  "Risk Management & Compliance": "Compliance & Legal",
};

const AGENT_TYPE_ROLE: Record<string, string> = {
  l5: "AI Strategic Intelligence",
  l4: "AI Agent",
  l3: "AI Agent",
  l2: "AI Insights & Automation",
  l1: "AI Operations",
};

const TEAM_MANAGER: Record<string, string> = {
  "Leasing & Marketing": "h-leasing-mgr",
  "Operations & Maintenance": "h-maint-mgr",
  "Revenue & Financial": "h-rev-mgr",
  "Resident Relations": "h-res-mgr",
  "Compliance & Legal": "h-exec",
};

function agentToWorkforceMember(agent: Agent): WorkforceMember {
  const team = BUCKET_TO_TEAM[agent.bucket] ?? agent.bucket;
  return {
    id: `roster-agent-${agent.id}`,
    name: agent.name,
    role: AGENT_TYPE_ROLE[agent.type] ?? "AI Agent",
    type: "agent",
    team,
    jtbd: agent.description,
    labels: agent.labels ?? [],
    reportsTo: TEAM_MANAGER[team],
    agentLevel: agent.type as WorkforceMember["agentLevel"],
  };
}

function normalizeLabel(l: string): string {
  return l.trim().toLowerCase();
}

type WorkforceContextValue = {
  members: WorkforceMember[];
  setMembers: React.Dispatch<React.SetStateAction<WorkforceMember[]>>;
  updateMember: (id: string, updates: Partial<Omit<WorkforceMember, "id">>) => void;
  humanMembers: WorkforceMember[];
  agentMembers: WorkforceMember[];
  allLabels: string[];
};

const WorkforceContext = createContext<WorkforceContextValue | null>(null);

export function WorkforceProvider({ children }: { children: React.ReactNode }) {
  const [humanState, setHumanState] = useState<WorkforceMember[]>(INITIAL_HUMANS);
  const [mounted, setMounted] = useState(false);
  const { agents: rosterAgents } = useAgents();

  useEffect(() => {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          localStorage.removeItem(LEGACY_KEY);
        }
        raw = null;
      }
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const humansOnly = parsed.filter((m: WorkforceMember) => m.type === "human");
          const defaultsById = new Map(INITIAL_HUMANS.map((m) => [m.id, m]));
          const merged = humansOnly.map((stored: WorkforceMember) => {
            const defaults = defaultsById.get(stored.id);
            if (!defaults) return stored;
            return { ...defaults, ...stored };
          });
          const existingIds = new Set(humansOnly.map((m: WorkforceMember) => m.id));
          const missing = INITIAL_HUMANS.filter((m) => !existingIds.has(m.id));
          setHumanState(missing.length > 0 ? [...merged, ...missing] : merged);
        }
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  const agentMembers = useMemo(
    () => rosterAgents.filter((a) => a.status === "Active").map(agentToWorkforceMember),
    [rosterAgents]
  );

  const members = useMemo(() => [...humanState, ...agentMembers], [humanState, agentMembers]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(humanState));
    } catch {
      // ignore
    }
  }, [humanState, mounted]);

  const setMembers: React.Dispatch<React.SetStateAction<WorkforceMember[]>> = useCallback((action) => {
    setHumanState((prev) => {
      const next = typeof action === "function" ? action([...prev, ...agentMembers]) : action;
      return next.filter((m) => m.type === "human");
    });
  }, [agentMembers]);

  const updateMember = useCallback((id: string, updates: Partial<Omit<WorkforceMember, "id">>) => {
    setHumanState((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  }, []);

  const humanMembers = humanState;

  const allLabels = useMemo(() => Array.from(
    new Set(
      members.flatMap((m) => (m.labels ?? []).map((l) => l.trim()).filter(Boolean))
    )
  ).sort((a, b) => a.localeCompare(b)), [members]);

  return (
    <WorkforceContext.Provider
      value={{ members, setMembers, updateMember, humanMembers, agentMembers, allLabels }}
    >
      {children}
    </WorkforceContext.Provider>
  );
}

export function useWorkforce() {
  const ctx = useContext(WorkforceContext);
  if (!ctx) throw new Error("useWorkforce must be used within WorkforceProvider");
  return ctx;
}

/** Used by escalation routing: find best assignee by label match. Returns member name or "" */
export function getAssigneeByLabels(
  escalationLabels: string[] | undefined,
  humanMembers: WorkforceMember[]
): string {
  if (!escalationLabels?.length || humanMembers.length === 0) return "";
  const escSet = new Set(escalationLabels.map(normalizeLabel));
  let best: { name: string; score: number } | null = null;
  for (const m of humanMembers) {
    const memberLabels = m.labels ?? [];
    const score = memberLabels.filter((l) => escSet.has(normalizeLabel(l))).length;
    if (score > 0 && (!best || score > best.score)) {
      best = { name: m.name, score };
    }
  }
  return best?.name ?? "";
}

export { TEAMS };
