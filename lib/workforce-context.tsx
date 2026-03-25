"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type WorkforceTier = "leadership" | "management" | "coordinator" | "specialist";

export type HrisProvider = "adp" | "workday" | "bamboohr" | "paylocity" | "ukg" | "paychex" | "other";

export type HrisIntegration = {
  provider: HrisProvider;
  employeeId: string;
  lastSyncAt: string;
  syncStatus: "synced" | "stale" | "error";
};

export type WeeklySchedule = {
  /** Days of week (0=Sun … 6=Sat) this member is normally on shift */
  days: number[];
  /** Shift start in "HH:mm" 24h format, local to `timezone` */
  startTime: string;
  /** Shift end in "HH:mm" 24h format */
  endTime: string;
  timezone: string;
};

export type TimeOffEntry = {
  start: string;
  end: string;
  reason?: "pto" | "sick" | "holiday" | "leave" | "other";
};

export type AvailabilityStatus = "available" | "on_shift" | "off_shift" | "time_off" | "unknown";

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
  /** HRIS integration reference — synced from HR software (ADP, Workday, BambooHR, etc.) */
  hris?: HrisIntegration;
  /** Weekly work schedule — synced from HRIS or manually configured */
  schedule?: WeeklySchedule;
  /** Upcoming time-off entries — synced from HRIS */
  timeOff?: TimeOffEntry[];
  /** Subject-matter specialties (e.g. "Late Fees", "Lease Renewals") */
  specialties?: string[];
};

const STORAGE_KEY = "janet-poc-workforce-v6";
const LEGACY_KEY = "janet-poc-workforce";

const TEAMS = [
  "Property Management",
  "Leasing & Marketing",
  "Operations & Maintenance",
  "Revenue & Financial",
  "Resident Relations",
  "Compliance & Legal",
];

const WEEKDAY_SCHEDULE: WeeklySchedule = { days: [1, 2, 3, 4, 5], startTime: "08:00", endTime: "17:00", timezone: "America/Denver" };
const MAINT_SCHEDULE: WeeklySchedule = { days: [1, 2, 3, 4, 5], startTime: "07:00", endTime: "16:00", timezone: "America/Denver" };
const WEEKEND_LEASING_SCHEDULE: WeeklySchedule = { days: [2, 3, 4, 5, 6], startTime: "09:00", endTime: "18:00", timezone: "America/Denver" };
const hrisAdp = (empId: string): HrisIntegration => ({ provider: "adp", employeeId: empId, lastSyncAt: new Date().toISOString(), syncStatus: "synced" });
const hrisWorkday = (empId: string): HrisIntegration => ({ provider: "workday", employeeId: empId, lastSyncAt: new Date().toISOString(), syncStatus: "synced" });

const INITIAL: WorkforceMember[] = [
  // ── Leadership ──
  { id: "h-exec", name: "Dana Park", role: "VP of Operations", type: "human", team: "Property Management", jtbd: "Portfolio strategy, P&L oversight, capital planning, executive reporting", labels: ["Compliance", "Policy", "Operations"], tier: "leadership", properties: ["All properties"], hris: hrisWorkday("WD-1001"), schedule: WEEKDAY_SCHEDULE, specialties: ["Capital Planning", "Portfolio Strategy", "Vendor Negotiations"] },

  // ── Regional Management (reports to VP) ──
  { id: "h-regional", name: "Sarah Chen", role: "Regional Manager", type: "human", team: "Property Management", jtbd: "Multi-property oversight, occupancy targets, property manager development, NOI accountability", labels: ["Leasing", "Operations", "Maintenance"], tier: "management", reportsTo: "h-exec", properties: ["All properties"], hris: hrisWorkday("WD-1002"), schedule: WEEKDAY_SCHEDULE, specialties: ["Occupancy Optimization", "Staff Development", "NOI Analysis"] },
  { id: "h-rev-dir", name: "Lisa Nguyen", role: "Director of Revenue", type: "human", team: "Revenue & Financial", jtbd: "Portfolio pricing strategy, delinquency oversight, financial reporting, budget variance analysis", labels: ["Payments", "Operations"], tier: "management", reportsTo: "h-exec", properties: ["All properties"], hris: hrisWorkday("WD-1003"), schedule: WEEKDAY_SCHEDULE, specialties: ["Late Fees", "Delinquency Management", "Rent Pricing", "Refunds"] },
  { id: "h-comp-dir", name: "Rachel Adams", role: "Director of Compliance", type: "human", team: "Compliance & Legal", jtbd: "Fair housing policy, screening standards, risk management, audit readiness across portfolio", labels: ["Compliance", "Policy"], tier: "management", reportsTo: "h-exec", properties: ["All properties"], hris: hrisWorkday("WD-1004"), schedule: WEEKDAY_SCHEDULE, specialties: ["Fair Housing", "Screening Standards", "Risk Management"] },

  // ── Director of Leasing (reports to VP) ──
  { id: "h-leasing-dir", name: "Jessica Morgan", role: "Director of Leasing", type: "human", team: "Leasing & Marketing", jtbd: "Portfolio leasing strategy, marketing oversight, occupancy targets, leasing team development", labels: ["Leasing"], tier: "management", reportsTo: "h-exec", properties: ["All properties"], hris: hrisWorkday("WD-1005"), schedule: WEEKDAY_SCHEDULE, specialties: ["Leasing Strategy", "Marketing Analytics", "Occupancy Optimization"] },

  // ── Director of Maintenance (reports to VP) ──
  { id: "h-maint-dir", name: "Kevin Brooks", role: "Director of Maintenance", type: "human", team: "Operations & Maintenance", jtbd: "Portfolio maintenance strategy, vendor management, capital project oversight, preventive maintenance programs", labels: ["Maintenance"], tier: "management", reportsTo: "h-exec", properties: ["All properties"], hris: hrisWorkday("WD-1006"), schedule: WEEKDAY_SCHEDULE, specialties: ["Vendor Management", "Capital Projects", "Preventive Maintenance"] },

  // ── Director of Resident Relations (reports to VP) ──
  { id: "h-res-dir", name: "Megan Foster", role: "Director of Resident Relations", type: "human", team: "Resident Relations", jtbd: "Resident retention strategy, satisfaction programs, renewal pipeline oversight, community engagement", labels: ["Resident relations"], tier: "management", reportsTo: "h-exec", properties: ["All properties"], hris: hrisWorkday("WD-1007"), schedule: WEEKDAY_SCHEDULE, specialties: ["Resident Retention", "Satisfaction Programs", "Community Engagement"] },

  // ── Property Manager: Hillside Living ──
  { id: "h-pm-a", name: "Mike Torres", role: "Property Manager", type: "human", team: "Property Management", jtbd: "Day-to-day operations, staff supervision, resident satisfaction, NOI targets for Hillside Living", labels: ["Maintenance", "Operations", "Leasing"], tier: "management", reportsTo: "h-regional", properties: ["Hillside Living"], hris: hrisAdp("ADP-2001"), schedule: WEEKDAY_SCHEDULE, specialties: ["Resident Retention", "Budget Management", "Vendor Relations"] },

  // Leasing & Marketing (reports to Director of Leasing)
  { id: "h-leasing-mgr-a", name: "Taylor Kim", role: "Leasing Manager", type: "human", team: "Leasing & Marketing", jtbd: "Leasing team oversight, marketing campaigns, occupancy reporting, complex applications", labels: ["Leasing"], tier: "coordinator", reportsTo: "h-leasing-dir", properties: ["Hillside Living"], hris: hrisAdp("ADP-2002"), schedule: WEEKDAY_SCHEDULE, specialties: ["Marketing Campaigns", "Complex Applications", "Lease Renewals"] },
  { id: "h-leasing-a1", name: "Jasmine Wright", role: "Leasing Consultant", type: "human", team: "Leasing & Marketing", jtbd: "In-person tours, application processing, prospect follow-up, move-in coordination", labels: ["Leasing"], tier: "specialist", reportsTo: "h-leasing-mgr-a", properties: ["Hillside Living"], hris: hrisAdp("ADP-2003"), schedule: WEEKEND_LEASING_SCHEDULE, specialties: ["Tours", "Move-In Coordination"] },
  { id: "h-abe", name: "Abe Kashiwagi", role: "Leasing Specialist", type: "human", team: "Leasing & Marketing", jtbd: "Cross-property leasing support, escalations, and application review", labels: ["Leasing", "Operations"], tier: "specialist", reportsTo: "h-leasing-dir", properties: ["Hillside Living", "Jamison Apartments"], hris: hrisAdp("ADP-2099"), schedule: WEEKDAY_SCHEDULE, specialties: ["Escalations", "Application Review", "Payments coordination"] },
  { id: "a-leasing", name: "Leasing AI", role: "ELI+ Leasing Agent", type: "agent", team: "Leasing & Marketing", jtbd: "Virtual tours, chat inquiries, application processing, FAQ responses", labels: ["Leasing"], reportsTo: "h-leasing-dir", properties: ["All properties"] },

  // Operations & Maintenance (reports to Director of Maintenance)
  { id: "h-maint-sup-a", name: "Carlos Ruiz", role: "Maintenance Supervisor", type: "human", team: "Operations & Maintenance", jtbd: "Work order prioritization, vendor coordination, unit turns, preventive maintenance scheduling", labels: ["Maintenance"], tier: "coordinator", reportsTo: "h-maint-dir", properties: ["Hillside Living"], hris: hrisAdp("ADP-2004"), schedule: MAINT_SCHEDULE, specialties: ["Vendor Coordination", "Unit Turns", "Preventive Maintenance"] },
  { id: "h-maint-tech-a1", name: "Derek Washington", role: "Maintenance Technician", type: "human", team: "Operations & Maintenance", jtbd: "HVAC, plumbing, electrical repairs, unit turn readiness", labels: ["Maintenance"], tier: "specialist", reportsTo: "h-maint-sup-a", properties: ["Hillside Living"], hris: hrisAdp("ADP-2005"), schedule: MAINT_SCHEDULE, specialties: ["HVAC", "Plumbing", "Electrical"] },
  { id: "h-maint-tech-a2", name: "Luis Hernandez", role: "Maintenance Technician", type: "human", team: "Operations & Maintenance", jtbd: "Appliance repair, drywall, painting, grounds maintenance", labels: ["Maintenance"], tier: "specialist", reportsTo: "h-maint-sup-a", properties: ["Hillside Living"], hris: hrisAdp("ADP-2006"), schedule: MAINT_SCHEDULE, specialties: ["Appliance Repair", "Drywall", "Painting"] },
  { id: "a-maint", name: "Maintenance AI", role: "ELI+ Maintenance Agent", type: "agent", team: "Operations & Maintenance", jtbd: "Work order triage, resident follow-up, scheduling, status updates", labels: ["Maintenance"], reportsTo: "h-maint-dir", properties: ["All properties"] },

  // Resident Relations (reports to Director of Resident Relations)
  { id: "h-res-mgr-a", name: "Emily Davis", role: "Community Manager", type: "human", team: "Resident Relations", jtbd: "Resident events, retention programs, satisfaction tracking, renewal conversations", labels: ["Resident relations"], tier: "coordinator", reportsTo: "h-res-dir", properties: ["Hillside Living"], hris: hrisAdp("ADP-2007"), schedule: WEEKDAY_SCHEDULE, specialties: ["Resident Events", "Retention Programs", "Conflict Resolution"] },

  // Renewal AI — under Property Management (reports to Regional Manager)
  { id: "a-renewal", name: "Renewal AI", role: "ELI+ Renewal Agent", type: "agent", team: "Property Management", jtbd: "Renewal conversations, retention offers, lease extension processing", labels: ["Resident relations"], reportsTo: "h-regional", properties: ["All properties"] },

  // ── Property Manager: Jamison Apartments ──
  { id: "h-pm-b", name: "Maria Santos", role: "Property Manager", type: "human", team: "Property Management", jtbd: "Property operations, team leadership, budget management, resident satisfaction for Jamison Apartments", labels: ["Resident relations", "Operations", "Leasing"], tier: "management", reportsTo: "h-regional", properties: ["Jamison Apartments"], hris: hrisAdp("ADP-3001"), schedule: WEEKDAY_SCHEDULE, specialties: ["Lease Renewals", "Resident Satisfaction", "Budget Management"] },

  // Jamison Apartments — Assistant PM
  { id: "h-apm-b", name: "Priya Patel", role: "Assistant Property Manager", type: "human", team: "Property Management", jtbd: "Leasing oversight, daily operations backup, reporting, vendor management", labels: ["Leasing", "Operations"], tier: "coordinator", reportsTo: "h-pm-b", properties: ["Jamison Apartments"], hris: hrisAdp("ADP-3002"), schedule: WEEKDAY_SCHEDULE, specialties: ["Leasing Operations", "Reporting", "Vendor Management"] },

  // Jamison Apartments — Leasing (reports to Director of Leasing)
  { id: "h-leasing-b1", name: "Alex Johnson", role: "Leasing Consultant", type: "human", team: "Leasing & Marketing", jtbd: "Tours, applications, prospect nurturing, move-in coordination", labels: ["Leasing"], tier: "specialist", reportsTo: "h-leasing-mgr-a", properties: ["Jamison Apartments"], hris: hrisAdp("ADP-3003"), schedule: WEEKDAY_SCHEDULE, specialties: ["Tours", "Applications"] },

  // Jamison Apartments — Maintenance (reports to Maintenance Director chain)
  { id: "h-maint-sup-b", name: "Marcus Brown", role: "Maintenance Supervisor", type: "human", team: "Operations & Maintenance", jtbd: "Work order management, vendor scheduling, preventive maintenance, emergency response", labels: ["Maintenance"], tier: "coordinator", reportsTo: "h-maint-dir", properties: ["Jamison Apartments"], hris: hrisAdp("ADP-3005"), schedule: MAINT_SCHEDULE, specialties: ["Emergency Response", "Vendor Scheduling", "Preventive Maintenance"] },
  { id: "h-maint-tech-b1", name: "James Okafor", role: "Maintenance Technician", type: "human", team: "Operations & Maintenance", jtbd: "General repairs, appliance service, unit turns, grounds maintenance", labels: ["Maintenance"], tier: "specialist", reportsTo: "h-maint-sup-b", properties: ["Jamison Apartments"], hris: hrisAdp("ADP-3006"), schedule: MAINT_SCHEDULE, specialties: ["Appliance Service", "Unit Turns", "Grounds"] },

  // Jamison Apartments — Resident Relations (reports to Director of Resident Relations)
  { id: "h-res-b", name: "Samantha Lee", role: "Resident Services Coordinator", type: "human", team: "Resident Relations", jtbd: "Lease renewals, move-out coordination, resident event planning, satisfaction follow-up", labels: ["Resident relations"], tier: "specialist", reportsTo: "h-res-dir", properties: ["Jamison Apartments"], hris: hrisAdp("ADP-3007"), schedule: WEEKDAY_SCHEDULE, specialties: ["Move-Out Coordination", "Lease Renewals", "Resident Events"] },

  // ── Property Manager: Property C ──
  { id: "h-pm-c", name: "Jordan Rivera", role: "Property Manager", type: "human", team: "Property Management", jtbd: "Lease-up operations, aggressive leasing targets, team building, stabilization", labels: ["Leasing", "Operations"], tier: "management", reportsTo: "h-regional", properties: ["Property C"], hris: hrisAdp("ADP-4001"), schedule: WEEKDAY_SCHEDULE, specialties: ["Lease-Up Strategy", "Team Building", "Stabilization"] },

  // Property C — Leasing (reports to Leasing Manager)
  { id: "h-leasing-c1", name: "Nicole Park", role: "Leasing Consultant", type: "human", team: "Leasing & Marketing", jtbd: "High-volume tours, application processing, prospect follow-up", labels: ["Leasing"], tier: "specialist", reportsTo: "h-leasing-mgr-a", properties: ["Property C"], hris: hrisAdp("ADP-4002"), schedule: WEEKEND_LEASING_SCHEDULE, specialties: ["High-Volume Tours", "Application Processing"] },

  // Property C — Maintenance (reports to Maintenance Director)
  { id: "h-maint-c1", name: "Robert Chen", role: "Maintenance Technician", type: "human", team: "Operations & Maintenance", jtbd: "General repairs, unit punch lists, grounds maintenance, vendor coordination", labels: ["Maintenance"], tier: "specialist", reportsTo: "h-maint-dir", properties: ["Property C"], hris: hrisAdp("ADP-4003"), schedule: MAINT_SCHEDULE, specialties: ["General Repairs", "Punch Lists", "Grounds Maintenance"] },

  // Property C — Resident Relations (reports to Director of Resident Relations)
  { id: "h-res-c", name: "Aisha Williams", role: "Resident Services Coordinator", type: "human", team: "Resident Relations", jtbd: "Move-in orientation, resident communications, event planning, renewal outreach", labels: ["Resident relations"], tier: "specialist", reportsTo: "h-res-dir", properties: ["Property C"], hris: hrisAdp("ADP-4004"), schedule: WEEKDAY_SCHEDULE },

  // ── Revenue & Financial (reports to Director of Revenue) ──
  { id: "h-rev-1", name: "Ben Harrison", role: "Senior Accountant", type: "human", team: "Revenue & Financial", jtbd: "Financial reporting, budget variance analysis, month-end close, bank reconciliation", labels: ["Payments"], tier: "coordinator", reportsTo: "h-rev-dir", properties: ["All properties"], hris: hrisWorkday("WD-1010"), schedule: WEEKDAY_SCHEDULE },
  { id: "h-rev-2", name: "Amanda Torres", role: "Collections Specialist", type: "human", team: "Revenue & Financial", jtbd: "Delinquency follow-up, payment plans, ledger reconciliation, eviction filing prep", labels: ["Payments"], tier: "specialist", reportsTo: "h-rev-dir", properties: ["All properties"], hris: hrisWorkday("WD-1011"), schedule: WEEKDAY_SCHEDULE },
  { id: "a-payments", name: "Payments AI", role: "ELI+ Payments Agent", type: "agent", team: "Revenue & Financial", jtbd: "Rent questions, fee explanations, payment portal assistance", labels: ["Payments"], reportsTo: "h-rev-dir", properties: ["All properties"] },

  // ── Compliance & Legal (reports to Director of Compliance) ──
  { id: "h-comp-1", name: "David Kim", role: "Compliance Analyst", type: "human", team: "Compliance & Legal", jtbd: "Fair housing audits, screening consistency reviews, accommodation processing, SOP maintenance", labels: ["Compliance", "Policy"], tier: "specialist", reportsTo: "h-comp-dir", properties: ["All properties"], hris: hrisWorkday("WD-1012"), schedule: WEEKDAY_SCHEDULE },
];

function normalizeLabel(l: string): string {
  return l.trim().toLowerCase();
}

// ─── Availability computation (driven by HRIS schedule + time-off) ─────────

/**
 * Compute real-time availability for a workforce member based on their
 * HRIS-synced schedule and time-off entries. Agents are always "available."
 */
export function getAvailability(member: WorkforceMember, atDate: Date = new Date()): AvailabilityStatus {
  if (member.type === "agent") return "available";

  if (member.timeOff?.length) {
    const atMs = atDate.getTime();
    const onTimeOff = member.timeOff.some((entry) => {
      const start = new Date(entry.start).getTime();
      const end = new Date(entry.end).getTime();
      return atMs >= start && atMs <= end;
    });
    if (onTimeOff) return "time_off";
  }

  if (!member.schedule) return "unknown";

  const { days, startTime, endTime, timezone } = member.schedule;
  const localStr = atDate.toLocaleString("en-US", { timeZone: timezone });
  const local = new Date(localStr);
  const dayOfWeek = local.getDay();

  if (!days.includes(dayOfWeek)) return "off_shift";

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const minutesSinceMidnight = local.getHours() * 60 + local.getMinutes();
  const shiftStart = startH * 60 + startM;
  const shiftEnd = endH * 60 + endM;

  if (shiftEnd > shiftStart) {
    return minutesSinceMidnight >= shiftStart && minutesSinceMidnight < shiftEnd ? "on_shift" : "off_shift";
  }
  // Overnight shift (e.g. 22:00–06:00)
  return minutesSinceMidnight >= shiftStart || minutesSinceMidnight < shiftEnd ? "on_shift" : "off_shift";
}

/** Quick check: is a member routable right now? */
export function isMemberAvailable(member: WorkforceMember, atDate?: Date): boolean {
  const status = getAvailability(member, atDate);
  return status === "available" || status === "on_shift" || status === "unknown";
}

/** Role → workforce member mapping for simulating a "logged-in" user */
const ROLE_USER_MAP: Record<string, string> = {
  admin: "h-exec",
  regional: "h-regional",
  property: "h-pm-a",
  ic: "h-leasing-a1",
};

type WorkforceContextValue = {
  members: WorkforceMember[];
  setMembers: React.Dispatch<React.SetStateAction<WorkforceMember[]>>;
  updateMember: (id: string, updates: Partial<Omit<WorkforceMember, "id">>) => void;
  humanMembers: WorkforceMember[];
  /** Human members currently available (on-shift and not on time-off) — used for routing */
  availableHumanMembers: WorkforceMember[];
  agentMembers: WorkforceMember[];
  allLabels: string[];
  /** Get the workforce member representing the currently logged-in user */
  getCurrentUser: (role: string) => WorkforceMember | undefined;
  /** Get direct reports (members whose reportsTo matches the given member id) */
  getDirectReports: (memberId: string) => WorkforceMember[];
};

const WorkforceContext = createContext<WorkforceContextValue | null>(null);

export function WorkforceProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<WorkforceMember[]>(INITIAL);
  const [mounted, setMounted] = useState(false);

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
          const defaultsById = new Map(INITIAL.map((m) => [m.id, m]));
          const validIds = new Set(INITIAL.map((m) => m.id));
          const merged = parsed
            .filter((stored: WorkforceMember) => validIds.has(stored.id) || stored.type === "human")
            .map((stored: WorkforceMember) => {
              const defaults = defaultsById.get(stored.id);
              if (!defaults) return stored;
              if (defaults.type === "agent") {
                return { ...defaults, ...stored, reportsTo: defaults.reportsTo, team: defaults.team, role: defaults.role };
              }
              return { ...defaults, ...stored };
            });
          const existingIds = new Set(merged.map((m: WorkforceMember) => m.id));
          const missing = INITIAL.filter((m) => !existingIds.has(m.id));
          setMembers(missing.length > 0 ? [...merged, ...missing] : merged);
        }
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
    } catch {
      // ignore
    }
  }, [members, mounted]);

  const updateMember = useCallback((id: string, updates: Partial<Omit<WorkforceMember, "id">>) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  }, []);

  const humanMembers = useMemo(() => members.filter((m) => m.type === "human"), [members]);
  const availableHumanMembers = useMemo(() => humanMembers.filter((m) => isMemberAvailable(m)), [humanMembers]);
  const agentMembers = useMemo(() => members.filter((m) => m.type === "agent"), [members]);

  const allLabels = useMemo(() => Array.from(
    new Set(
      members.flatMap((m) => (m.labels ?? []).map((l) => l.trim()).filter(Boolean))
    )
  ).sort((a, b) => a.localeCompare(b)), [members]);

  const getCurrentUser = useCallback((role: string): WorkforceMember | undefined => {
    const memberId = ROLE_USER_MAP[role];
    return memberId ? members.find((m) => m.id === memberId) : undefined;
  }, [members]);

  const getDirectReports = useCallback((memberId: string): WorkforceMember[] => {
    return members.filter((m) => m.reportsTo === memberId);
  }, [members]);

  return (
    <WorkforceContext.Provider
      value={{ members, setMembers, updateMember, humanMembers, availableHumanMembers, agentMembers, allLabels, getCurrentUser, getDirectReports }}
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

export const TIER_RANK: Record<WorkforceTier, number> = {
  specialist: 0,
  coordinator: 1,
  management: 2,
  leadership: 3,
};

/** Returns true if `tier` is strictly above `ceiling` in the org hierarchy */
export function isTierAbove(tier: WorkforceTier, ceiling: WorkforceTier): boolean {
  return TIER_RANK[tier] > TIER_RANK[ceiling];
}

/** Walk the reportsTo chain to find a member's direct manager */
export function getManagerOf(
  memberName: string,
  members: WorkforceMember[]
): WorkforceMember | undefined {
  const member = members.find((m) => m.name === memberName);
  if (!member?.reportsTo) return undefined;
  return members.find((m) => m.id === member.reportsTo);
}

export { TEAMS };
