"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useWorkforce, getManagerOf, isTierAbove, isMemberAvailable, type WorkforceMember, type WorkforceTier } from "@/lib/workforce-context";
import type { ConversationItem } from "@/lib/conversations-context";
import type { Agent } from "@/lib/agents-context";
import type { TaskSections } from "@/lib/specialties-data";

export type EscalationType =
  | "conversation"
  | "approval"
  | "workflow"
  | "training"
  | "doc_improvement";

export type EscalationReference = {
  title: string;
  snippet?: string;
  docId?: string;
  section?: string;
};

export type EscalationHistoryEntry = {
  at: string;
  by?: string;
  action: string;
  detail?: string;
};

export type EscalationNote = {
  at: string;
  by: string;
  text: string;
};

export type AffectedParty = {
  type: "lead" | "resident" | "vendor";
  name?: string;
  unit?: string;
  status?: string;
  detail?: string;
};

export type EscalationItem = {
  id: string;
  name?: string;
  type: EscalationType;
  summary: string;
  aiReasonForEscalation?: string;
  category: string;
  property: string;
  escalatedByAgent?: string;
  status: string;
  assignee: string;
  labels?: string[];
  dueAt?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  linkToSource?: string;
  references?: EscalationReference[];
  conversationContext?: { role: "resident" | "agent" | "staff"; text: string }[];
  affectedParty?: AffectedParty;
  history?: EscalationHistoryEntry[];
  notes?: EscalationNote[];
  instructionForAgent?: string;
  /** AI-generated multiple-choice answers for training/clarity escalations */
  trainingOptions?: string[];
  documentApprovalContext?: {
    documentId: string;
    documentName: string;
    changeSummary: string;
    proposedBody: string;
    previousBody?: string;
  };
  /** Link to the live conversation in conversations-context */
  conversationId?: string;
  /** Unit identifier for property-level tasks (e.g. "34-A") */
  unit?: string;
  /** Lifecycle timestamps for SLA and metrics */
  createdAt: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  handedBackAt?: string;
  /** Linked feedback item id (from feedback-context) */
  feedbackId?: string;
  /** Structured resolution for approval-type escalations */
  resolution?: {
    decision: "approved" | "denied" | "modified";
    comment?: string;
    adjustedAmount?: string;
    decidedBy: string;
    decidedAt: string;
  };
  /** SLA escalation tier: 0=fresh, 1=laterally reassigned, 2+=manager chain depth */
  slaStage?: number;
  /** Timestamp of the last SLA-triggered action; resets the clock for the next tier */
  lastSlaActionAt?: string;
  /** Rich-text HTML description for custom tasks */
  descriptionHtml?: string;
  /** Task sections config (links, attachments, checklist) for custom tasks */
  sections?: TaskSections;
};

export type EscalationRoutingRule = {
  id: string;
  category?: string;
  type?: EscalationType;
  labels?: string[];
  property?: string;
  /** Workforce member IDs (not names) — resolved at routing time for rename safety */
  assigneeIds: string[];
  /** @deprecated — legacy name-based assignees, migrated to assigneeIds on load */
  assignees?: string[];
  /** Only match escalations at or above this priority */
  minPriority?: "low" | "medium" | "high" | "urgent";
  /** Minutes before the system tries to reassign laterally to a peer with capacity */
  reassignAfterMinutes?: number;
  /** Minutes before the system escalates to the assignee's manager via reportsTo */
  escalateToManagerAfterMinutes?: number;
  /** Highest org tier the escalation can reach; stops climbing reportsTo if the next manager is above this */
  maxEscalationTier?: WorkforceTier;
};

export const ESCALATION_STATUSES = [
  "Open",
  "In progress",
  "Waiting on resident",
  "Pending approval",
  "Handed back to agent",
  "Blocked",
  "Done",
] as const;
export type EscalationStatus = (typeof ESCALATION_STATUSES)[number];

/* ─── Task ↔ Escalation equivalence aliases ─────────────────────────────
 * "Task" and "EscalationItem" are synonyms for the same work-item type.
 * Import whichever name reads best at the call-site.
 * ──────────────────────────────────────────────────────────────────────── */
export type Task = EscalationItem;
export type TaskType = EscalationType;
export type TaskReference = EscalationReference;
export type TaskHistoryEntry = EscalationHistoryEntry;
export type TaskNote = EscalationNote;
export type TaskRoutingRule = EscalationRoutingRule;
export const TASK_STATUSES = ESCALATION_STATUSES;

const ACTIVE_STATUSES: readonly string[] = ESCALATION_STATUSES.filter((s) => s !== "Done");

const DEFAULT_SLA_REASSIGN_MIN = 10;
const DEFAULT_SLA_ESCALATE_MIN = 30;

const PRIORITY_RANK: Record<string, number> = { low: 0, medium: 1, high: 2, urgent: 3 };

const DEFAULT_ROUTING_RULES: EscalationRoutingRule[] = [
  { id: "r-1", type: "approval", assigneeIds: ["h-exec"], reassignAfterMinutes: 60, escalateToManagerAfterMinutes: 240, maxEscalationTier: "management" },
  { id: "r-2", type: "doc_improvement", assigneeIds: ["h-exec"], reassignAfterMinutes: 60, escalateToManagerAfterMinutes: 240, maxEscalationTier: "management" },
  { id: "r-3", category: "Compliance", assigneeIds: ["h-comp-dir"], reassignAfterMinutes: 15, escalateToManagerAfterMinutes: 60, maxEscalationTier: "leadership" },
  { id: "r-3b", category: "Compliance", minPriority: "urgent", assigneeIds: ["h-comp-dir", "h-exec"], reassignAfterMinutes: 5, escalateToManagerAfterMinutes: 15, maxEscalationTier: "leadership" },
  { id: "r-4", category: "Payments", assigneeIds: ["h-rev-dir", "h-regional"], reassignAfterMinutes: 10, escalateToManagerAfterMinutes: 30, maxEscalationTier: "management" },
  { id: "r-5a", category: "Maintenance", property: "Hillside Living", assigneeIds: ["h-pm-a", "h-maint-sup-a"], reassignAfterMinutes: 10, escalateToManagerAfterMinutes: 30, maxEscalationTier: "management" },
  { id: "r-5b", category: "Maintenance", property: "Jamison Apartments", assigneeIds: ["h-maint-sup-b", "h-pm-b"], reassignAfterMinutes: 10, escalateToManagerAfterMinutes: 30, maxEscalationTier: "management" },
  { id: "r-5c", category: "Maintenance", property: "Property C", assigneeIds: ["h-pm-c"], reassignAfterMinutes: 10, escalateToManagerAfterMinutes: 30, maxEscalationTier: "management" },
  { id: "r-5", category: "Maintenance", assigneeIds: ["h-pm-a", "h-maint-sup-b", "h-pm-c"], reassignAfterMinutes: 10, escalateToManagerAfterMinutes: 30, maxEscalationTier: "management" },
  { id: "r-6a", category: "Leasing", property: "Hillside Living", assigneeIds: ["h-leasing-mgr-a"], reassignAfterMinutes: 10, escalateToManagerAfterMinutes: 30, maxEscalationTier: "management" },
  { id: "r-6b", category: "Leasing", property: "Jamison Apartments", assigneeIds: ["h-apm-b"], reassignAfterMinutes: 10, escalateToManagerAfterMinutes: 30, maxEscalationTier: "management" },
  { id: "r-6c", category: "Leasing", property: "Property C", assigneeIds: ["h-pm-c", "h-leasing-c1"], reassignAfterMinutes: 10, escalateToManagerAfterMinutes: 30, maxEscalationTier: "management" },
  { id: "r-6", category: "Leasing", assigneeIds: ["h-leasing-mgr-a", "h-apm-b", "h-leasing-c1"], reassignAfterMinutes: 10, escalateToManagerAfterMinutes: 30, maxEscalationTier: "management" },
  { id: "r-7", type: "training", assigneeIds: ["h-pm-a"], reassignAfterMinutes: 30, escalateToManagerAfterMinutes: 120, maxEscalationTier: "coordinator" },
  { id: "r-8", category: "Accounting", assigneeIds: ["h-rev-1", "h-rev-dir"], reassignAfterMinutes: 15, escalateToManagerAfterMinutes: 60, maxEscalationTier: "management" },
  { id: "r-fallback", assigneeIds: ["h-exec"], reassignAfterMinutes: 10, escalateToManagerAfterMinutes: 30, maxEscalationTier: "management" },
];

const ROUTING_STORAGE_KEY = "janet-poc-routing-rules-v3";

// ─── Unified routing pipeline ─────────────────────────────────────────────

/**
 * Compute how specific a rule is (number of non-null matching conditions).
 * More specific rules take priority regardless of array order.
 */
function ruleSpecificity(rule: EscalationRoutingRule): number {
  let score = 0;
  if (rule.category != null) score++;
  if (rule.type != null) score++;
  if (rule.property != null) score++;
  if (rule.labels != null && rule.labels.length > 0) score++;
  if (rule.minPriority != null) score++;
  return score;
}

function matchesRule(item: EscalationItem, rule: EscalationRoutingRule): boolean {
  if (rule.category != null && item.category !== rule.category) return false;
  if (rule.type != null && item.type !== rule.type) return false;
  if (rule.property != null && item.property !== rule.property) return false;
  if (rule.labels != null && rule.labels.length > 0) {
    const itemLabels = item.labels ?? [];
    if (!rule.labels.some((l) => itemLabels.includes(l))) return false;
  }
  if (rule.minPriority != null) {
    const itemRank = PRIORITY_RANK[item.priority ?? "medium"] ?? 1;
    const ruleRank = PRIORITY_RANK[rule.minPriority] ?? 0;
    if (itemRank < ruleRank) return false;
  }
  return true;
}

/** Find the best-matching rule: most specific wins, not first-in-array. */
function findBestRule(item: EscalationItem, rules: EscalationRoutingRule[]): EscalationRoutingRule | undefined {
  let best: EscalationRoutingRule | undefined;
  let bestScore = -1;
  for (const rule of rules) {
    if (!matchesRule(item, rule)) continue;
    const score = ruleSpecificity(rule);
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }
  return best;
}

/** Resolve rule assigneeIds to member names, migrating legacy name-based assignees */
function resolveAssigneeIds(rule: EscalationRoutingRule, allMembers: WorkforceMember[]): string[] {
  if (rule.assigneeIds?.length) {
    return rule.assigneeIds
      .map((id) => allMembers.find((m) => m.id === id)?.name)
      .filter((n): n is string => n != null);
  }
  return rule.assignees ?? [];
}

function getWorkloadCount(assignee: string, items: EscalationItem[]): number {
  return items.filter(
    (i) => i.assignee === assignee && i.status !== "Done"
  ).length;
}

function coversProperty(member: WorkforceMember, property: string | undefined): boolean {
  if (!property) return true;
  const props = member.properties ?? [];
  return props.length === 0 || props.includes("All properties") || props.includes(property);
}

/**
 * Unified routing: first try label+property matching across all human members,
 * then fall through to explicit routing rules (matched by specificity) if no
 * label match is found.
 */
function getAssignedByRouting(
  item: EscalationItem,
  allMembers: WorkforceMember[],
  allItems: EscalationItem[],
  rules: EscalationRoutingRule[],
  excludeAssignee?: string
): { assignee: string; rule: EscalationRoutingRule | undefined } {
  // 1. Label + property matching: route to the best human whose labels overlap
  const humanMembers = allMembers.filter((m) => m.type === "human");
  const labelMatch = pickBestByLabels(item.labels, humanMembers, allItems, item.property, excludeAssignee);
  if (labelMatch) return { assignee: labelMatch, rule: undefined };

  // 2. Fallback: explicit routing rules (most-specific rule wins)
  const rule = findBestRule(item, rules);
  if (rule) {
    const names = resolveAssigneeIds(rule, allMembers);
    const picked = pickBestCandidate(names, allMembers, allItems, item.property, excludeAssignee);
    if (picked) return { assignee: picked, rule };
  }

  return { assignee: "", rule: undefined };
}

/** Among a named candidate pool, pick best by availability → property → workload */
function pickBestCandidate(
  candidateNames: string[],
  allMembers: WorkforceMember[],
  allItems: EscalationItem[],
  property?: string,
  excludeAssignee?: string
): string {
  if (candidateNames.length === 0) return "";
  if (candidateNames.length === 1 && candidateNames[0] !== excludeAssignee) return candidateNames[0];

  const candidates = candidateNames
    .filter((name) => name !== excludeAssignee)
    .map((name) => {
      const member = allMembers.find((m) => m.name === name);
      return {
        name,
        available: member ? isMemberAvailable(member) : true,
        covers: member ? coversProperty(member, property) : true,
        workload: getWorkloadCount(name, allItems),
      };
    });

  if (candidates.length === 0) return "";

  candidates.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    if (a.covers !== b.covers) return a.covers ? -1 : 1;
    return a.workload - b.workload;
  });

  return candidates[0].name;
}

/** Label-based routing (primary): among all human members, find best match by label overlap + property */
function pickBestByLabels(
  escalationLabels: string[] | undefined,
  humanMembers: WorkforceMember[],
  allItems: EscalationItem[],
  property?: string,
  excludeAssignee?: string
): string {
  if (!escalationLabels?.length || humanMembers.length === 0) return "";
  const escSet = new Set(escalationLabels.map((l) => l.trim().toLowerCase()));

  const candidates: { name: string; score: number; available: boolean; workload: number }[] = [];
  for (const m of humanMembers) {
    if (excludeAssignee && m.name === excludeAssignee) continue;
    if (!coversProperty(m, property)) continue;
    const memberLabels = m.labels ?? [];
    const score = memberLabels.filter((l) => escSet.has(l.trim().toLowerCase())).length;
    if (score > 0) {
      candidates.push({ name: m.name, score, available: isMemberAvailable(m), workload: getWorkloadCount(m.name, allItems) });
    }
  }
  if (candidates.length === 0) return "";
  candidates.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    return b.score - a.score || a.workload - b.workload;
  });
  return candidates[0].name;
}

function applyRoutingRules(
  items: EscalationItem[],
  allMembers: WorkforceMember[],
  rules: EscalationRoutingRule[]
): EscalationItem[] {
  return items.map((item) => {
    if (item.assignee != null && item.assignee.trim() !== "") return item;
    const { assignee } = getAssignedByRouting(item, allMembers, items, rules);
    if (assignee === "") return item;
    return appendHistory(
      { ...item, assignee },
      { at: new Date().toISOString(), by: "System", action: "Auto-assigned", detail: assignee }
    );
  });
}

// ─── Structured escalation creation from conversation context ──────────────

const BUCKET_TO_CATEGORY: Record<string, string> = {
  "Leasing & Marketing": "Leasing",
  "Revenue & Financial Management": "Payments",
  "Operations & Maintenance": "Maintenance",
  "Resident Relations & Retention": "Resident relations",
  "Risk Management & Compliance": "Compliance",
};

export function deriveCategoryFromBucket(bucket?: string): string {
  if (!bucket) return "General";
  return BUCKET_TO_CATEGORY[bucket] ?? "General";
}

function computeDueAt(slaMinutes?: number): string | undefined {
  if (!slaMinutes) return undefined;
  return new Date(Date.now() + slaMinutes * 60_000).toISOString();
}

/**
 * Build a fully-formed escalation from a conversation + agent context.
 * The AI only supplies `conversationId` and `reason`; everything else is system-derived.
 */
export function createEscalationFromConversation(
  conversationId: string,
  reason: string,
  conversations: ConversationItem[],
  agents: Agent[]
): Omit<EscalationItem, "id" | "createdAt"> {
  const convo = conversations.find((c) => c.id === conversationId);
  const agent = agents.find((a) => convo?.agent.includes(a.name));

  return {
    type: "conversation",
    summary: reason,
    aiReasonForEscalation: reason,
    category: deriveCategoryFromBucket(agent?.bucket),
    labels: agent?.labels ?? [],
    property: convo?.property ?? "Portfolio",
    escalatedByAgent: agent?.name,
    conversationId,
    dueAt: computeDueAt(agent?.slaFirstResponseMinutes ?? 15),
    priority: "medium",
    status: "Open",
    assignee: "",
    conversationContext: convo?.messages ?? [],
    affectedParty: convo
      ? {
          type: convo.contactType === "Lead" ? "lead" : "resident",
          name: convo.resident,
          unit: convo.unit ?? undefined,
        }
      : undefined,
  };
}

// ─── Seed data ─────────────────────────────────────────────────────────

const now = new Date().toISOString();
const INITIAL: EscalationItem[] = [
  {
    id: "1",
    type: "conversation",
    summary: "Resident asked about late fee policy",
    category: "Payments",
    property: "Hillside Living",
    escalatedByAgent: "Payments AI",
    aiReasonForEscalation: "Community late fee not found in policy set; need human to confirm exact amount before replying to resident.",
    status: "Open",
    assignee: "",
    linkToSource: "Thread #1024",
    affectedParty: {
      type: "resident",
      name: "Jamie Chen",
      unit: "4B",
      status: "Current",
      detail: "Lease ends Aug 2025",
    },
    conversationContext: [
      { role: "resident", text: "What happens if I pay rent 5 days late?" },
      { role: "agent", text: "I'm not sure of your community's exact late fee. I've escalated this so a team member can confirm." },
    ],
    dueAt: "2025-02-18T17:00:00Z",
    priority: "high",
    createdAt: "2025-02-17T14:00:00Z",
  },
  {
    id: "2",
    type: "conversation",
    summary: "Work order #4402 — HVAC not cooling",
    category: "Maintenance",
    property: "Hillside Living",
    escalatedByAgent: "Maintenance AI",
    aiReasonForEscalation: "Resident requested human follow-up to prioritize and confirm ETA; escalated per policy.",
    status: "In progress",
    assignee: "Mike Torres",
    linkToSource: "Thread #1025",
    affectedParty: {
      type: "resident",
      name: "Marcus Webb",
      unit: "Bldg 2 #101",
      status: "Current",
    },
    conversationContext: [
      { role: "resident", text: "My AC isn't cooling. Already submitted work order 4402." },
      { role: "agent", text: "I see work order #4402. I've escalated for a human to prioritize and confirm ETA." },
    ],
    dueAt: "2025-02-17T12:00:00Z",
    priority: "urgent",
    createdAt: "2025-02-16T10:30:00Z",
    firstResponseAt: "2025-02-16T10:45:00Z",
  },
  {
    id: "3",
    type: "training",
    summary: "Lease renewal terms clarification",
    category: "Leasing",
    property: "Jamison Apartments",
    escalatedByAgent: "Leasing AI",
    aiReasonForEscalation: "Agent needs clarity on how to respond to 2-month lease extension requests; no clear guidance in current SOPs.",
    status: "Open",
    assignee: "",
    linkToSource: "Agent prompt review",
    conversationContext: [
      { role: "agent", text: "Agent asking for clarity: How should I respond when a resident asks for a 2-month lease extension?" },
    ],
    trainingOptions: [
      "Offer a month-to-month extension at a 5% premium while a full renewal is prepared. Cite lease addendum §3.2.",
      "A 2-month extension is available with management approval. Advise the resident to submit a written request; the team will respond within 48 hours.",
      "Short-term extensions under 6 months are not offered at this property. The resident must sign a new 12-month lease or provide 60-day notice to vacate per §7.1.",
    ],
    createdAt: "2025-02-18T09:00:00Z",
  },
  {
    id: "4",
    type: "doc_improvement",
    summary: "Suggested SOP change: screening dispute process",
    category: "Compliance",
    property: "Portfolio",
    escalatedByAgent: "Compliance AI",
    aiReasonForEscalation: "Agent identified gap in screening dispute process during a conversation; suggesting SOP update for human review.",
    status: "Open",
    assignee: "",
    linkToSource: "SOP Maintenance escalation, §2",
    createdAt: "2025-02-18T11:00:00Z",
  },
  {
    id: "5",
    type: "approval",
    summary: "Refund request over $500 — needs approval",
    category: "Payments",
    property: "Hillside Living",
    escalatedByAgent: "Payments AI",
    aiReasonForEscalation: "Refund exceeds $500; guardrail requires human approval before proceeding.",
    status: "Open",
    assignee: "",
    linkToSource: "Workflow run #8821",
    references: [
      { title: "Guardrail", snippet: "Refunds over $500 require human approval" },
      { title: "Requested amount", snippet: "$623.47" },
      { title: "Reason", snippet: "Overpayment on final month due to mid-month move-out" },
    ],
    affectedParty: {
      type: "resident",
      name: "Jordan Lee",
      unit: "3A",
      status: "Notice",
      detail: "Move-out Mar 15",
    },
    createdAt: "2025-02-18T08:00:00Z",
  },
  {
    id: "ic-1",
    type: "conversation",
    summary: "Resident reports water leak under kitchen sink — Unit 12A",
    category: "Maintenance",
    property: "Hillside Living",
    escalatedByAgent: "Maintenance AI",
    aiReasonForEscalation: "Resident reports active water leak; requires on-site staff to assess severity and coordinate emergency vendor if needed.",
    status: "Open",
    assignee: "Sarah",
    priority: "urgent",
    affectedParty: { type: "resident", name: "Priya Patel", unit: "12A", status: "Current" },
    conversationContext: [
      { role: "resident", text: "There's water leaking under my kitchen sink. It's pooling on the floor." },
      { role: "agent", text: "I've created a priority work order and escalated this to your on-site team for immediate attention." },
    ],
    dueAt: new Date(Date.now() + 2 * 3600_000).toISOString(),
    createdAt: new Date(Date.now() - 45 * 60_000).toISOString(),
  },
  {
    id: "ic-2",
    type: "conversation",
    summary: "Prospect wants to schedule in-person tour today",
    category: "Leasing",
    property: "Hillside Living",
    escalatedByAgent: "Leasing AI",
    aiReasonForEscalation: "Prospect specifically requested an in-person tour within the next few hours; requires on-site coordination.",
    status: "Open",
    assignee: "Sarah",
    priority: "high",
    affectedParty: { type: "lead", name: "Tom Richardson", detail: "2BR prospect, moving from out of state" },
    conversationContext: [
      { role: "resident", text: "I'm in town just for today — can I come see a 2-bedroom unit this afternoon?" },
      { role: "agent", text: "I'd love to help arrange that! I've notified our on-site team to coordinate a tour time for you today." },
    ],
    dueAt: new Date(Date.now() + 4 * 3600_000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 60_000).toISOString(),
  },
  {
    id: "ic-3",
    type: "conversation",
    summary: "Noise complaint — Unit 8C about Unit 9C",
    category: "Resident relations",
    property: "Hillside Living",
    escalatedByAgent: "Resident Relations AI",
    aiReasonForEscalation: "Recurring noise complaint (3rd this month); policy requires on-site staff follow-up after repeated complaints.",
    status: "Open",
    assignee: "Sarah",
    priority: "medium",
    affectedParty: { type: "resident", name: "Angela Morris", unit: "8C", status: "Current", detail: "3rd noise complaint this month" },
    conversationContext: [
      { role: "resident", text: "The unit above me is blasting music again. This is the third time this month. Can someone actually do something about it?" },
      { role: "agent", text: "I'm sorry you're dealing with this again. I've flagged this as a recurring issue and escalated to our on-site team for a direct follow-up." },
    ],
    dueAt: new Date(Date.now() + 6 * 3600_000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: "ic-4",
    type: "conversation",
    summary: "Package locker jammed — multiple residents affected",
    category: "Maintenance",
    property: "Hillside Living",
    escalatedByAgent: "Maintenance AI",
    aiReasonForEscalation: "Multiple residents reported the package locker system is jammed; requires on-site reset or vendor call.",
    status: "Open",
    assignee: "Sarah",
    priority: "medium",
    affectedParty: { type: "resident", name: "Derek Holt", unit: "6B", status: "Current" },
    conversationContext: [
      { role: "resident", text: "The package locker won't open. I have a delivery stuck in there and my code isn't working." },
      { role: "agent", text: "I've checked and it looks like the locker system may need a manual reset. I've notified on-site staff to take a look." },
    ],
    dueAt: new Date(Date.now() + 5 * 3600_000).toISOString(),
    createdAt: new Date(Date.now() - 90 * 60_000).toISOString(),
  },
  {
    id: "ic-5",
    type: "conversation",
    summary: "Move-in inspection needed — Unit 22D tomorrow",
    category: "Leasing",
    property: "Hillside Living",
    escalatedByAgent: "Leasing AI",
    aiReasonForEscalation: "New resident moves in tomorrow; pre-move-in inspection and key handoff need to be completed by on-site staff.",
    status: "Open",
    assignee: "Sarah",
    priority: "high",
    affectedParty: { type: "resident", name: "Carla Jimenez", unit: "22D", status: "Incoming", detail: "Move-in scheduled tomorrow" },
    conversationContext: [
      { role: "resident", text: "Hi, just confirming I'm moving in tomorrow. What time can I pick up keys?" },
      { role: "agent", text: "Welcome! I've notified our on-site team to finalize the unit inspection and prepare your keys. Someone will reach out with a specific time." },
    ],
    dueAt: new Date(Date.now() + 8 * 3600_000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
  },
  {
    id: "daily-closing-1",
    name: "Daily Property Closing",
    type: "workflow",
    summary: "Daily Property Closing",
    category: "Leasing",
    property: "Sun Valley Apartments",
    status: "In progress",
    assignee: "Madelyn Dias",
    priority: "medium",
    dueAt: "2024-10-31T23:59:59Z",
    createdAt: "2025-10-15T08:00:00Z",
    descriptionHtml: "<p><strong><em>What\u2019s New</em></strong></p><ul><li>Clients can now edit the text to create better descriptions</li><li>This will allow them to have better communication with their teams</li><li><span style=\"color: red\">Lots and lots of control like color and alignment</span></li></ul>",
    sections: {
      links: { enabled: false, required: false },
      attachments: { enabled: false, required: false },
      checklist: {
        enabled: true,
        requireAll: true,
        items: ["Lock the doors", "Close the windows"],
      },
    },
    history: [
      { at: "2025-10-15T08:00:00Z", by: "System", action: "created task", detail: "Daily Property Closing" },
      { at: "2025-10-15T08:05:00Z", by: "System", action: "assigned to", detail: "Madelyn Dias" },
    ],
  },
];

function appendHistory(
  item: EscalationItem,
  entry: EscalationHistoryEntry
): EscalationItem {
  return {
    ...item,
    history: [...(item.history ?? []), entry],
  };
}

/** Find the SLA config that applies to an escalation using specificity-based matching */
function getSlaConfig(
  item: EscalationItem,
  rules: EscalationRoutingRule[]
): { rule: EscalationRoutingRule | undefined; reassignMin: number; escalateMin: number; maxTier: WorkforceTier | undefined } {
  const rule = findBestRule(item, rules);
  return {
    rule,
    reassignMin: rule?.reassignAfterMinutes ?? DEFAULT_SLA_REASSIGN_MIN,
    escalateMin: rule?.escalateToManagerAfterMinutes ?? DEFAULT_SLA_ESCALATE_MIN,
    maxTier: rule?.maxEscalationTier,
  };
}

/**
 * Tiered SLA enforcement:
 *   Stage 0 → 1: lateral reassign from rule's assignee pool (or label fallback)
 *   Stage 1+    : escalate to manager via reportsTo chain
 *   Top of chain: mark Critical - Unresolved
 *
 * Short-circuits when no items have overdue SLAs.
 */
function applySlaChecks(
  items: EscalationItem[],
  rules: EscalationRoutingRule[],
  allMembers: WorkforceMember[],
  notifications: EscalationNotification[]
): { items: EscalationItem[]; changed: boolean } {
  const nowMs = Date.now();

  // #4: Early exit — skip entirely if nothing is overdue
  const hasOverdue = items.some((i) => i.status !== "Done" && i.dueAt && new Date(i.dueAt).getTime() < nowMs);
  if (!hasOverdue) return { items, changed: false };

  let changed = false;
  const nowIso = new Date(nowMs).toISOString();
  const humanMembers = allMembers.filter((m) => m.type === "human");

  const updated = items.map((item) => {
    if (item.status === "Done" || !item.dueAt) return item;
    const due = new Date(item.dueAt).getTime();
    if (due >= nowMs) return item;

    const stage = item.slaStage ?? 0;
    const clockStart = item.lastSlaActionAt
      ? new Date(item.lastSlaActionAt).getTime()
      : new Date(item.createdAt).getTime();
    const { rule: matchedRule, reassignMin, escalateMin } = getSlaConfig(item, rules);

    if (stage === 0) {
      const elapsedMin = (nowMs - clockStart) / 60_000;
      if (elapsedMin < reassignMin) return item;

      changed = true;
      let newPriority = item.priority;
      if (!newPriority || newPriority === "low") newPriority = "medium";
      else if (newPriority === "medium") newPriority = "high";
      else if (newPriority === "high") newPriority = "urgent";

      // Lateral reassignment: labels+property first, then rule's assignee pool
      let peer = pickBestByLabels(item.labels, humanMembers, items, item.property, item.assignee || undefined);
      if (!peer && matchedRule) {
        const poolNames = resolveAssigneeIds(matchedRule, allMembers);
        peer = pickBestCandidate(poolNames, allMembers, items, item.property, item.assignee || undefined);
      }

      if (peer) {
        notifications.push({
          id: `sla-reassign-${item.id}-${nowMs}`,
          title: "SLA: Reassigned",
          description: `"${item.summary}" reassigned to ${peer} (lateral)`,
          variant: "urgent",
          timestamp: nowIso,
        });
        return appendHistory(
          { ...item, assignee: peer, priority: newPriority, slaStage: 1, lastSlaActionAt: nowIso },
          { at: nowIso, by: "System", action: "SLA lateral reassign", detail: `Reassigned from ${item.assignee || "Unassigned"} to ${peer}` }
        );
      }

      const manager = item.assignee ? getManagerOf(item.assignee, humanMembers) : undefined;
      const managerNote = manager ? ` Manager ${manager.name} notified.` : "";
      notifications.push({
        id: `sla-notify-${item.id}-${nowMs}`,
        title: "SLA: No peer capacity",
        description: `"${item.summary}" — no peer with capacity.${managerNote}`,
        variant: "urgent",
        timestamp: nowIso,
      });
      return appendHistory(
        { ...item, priority: newPriority, slaStage: 1, lastSlaActionAt: nowIso },
        { at: nowIso, by: "System", action: "SLA breached — manager notified", detail: `No peer with capacity.${managerNote} Priority → ${newPriority}` }
      );
    }

    // Stage 1+: escalate to manager via reportsTo
    const elapsedMin = (nowMs - clockStart) / 60_000;
    if (elapsedMin < escalateMin) return item;

    changed = true;
    const { maxTier } = getSlaConfig(item, rules);
    const manager = item.assignee ? getManagerOf(item.assignee, humanMembers) : undefined;

    const managerAboveCeiling = manager && maxTier && manager.tier && isTierAbove(manager.tier, maxTier);

    if (manager && !managerAboveCeiling) {
      notifications.push({
        id: `sla-escalate-${item.id}-${nowMs}`,
        title: "SLA: Escalated to Manager",
        description: `"${item.summary}" escalated to ${manager.name}`,
        variant: "urgent",
        timestamp: nowIso,
      });
      return appendHistory(
        { ...item, assignee: manager.name, slaStage: stage + 1, lastSlaActionAt: nowIso, priority: "urgent" },
        { at: nowIso, by: "System", action: "SLA manager escalation", detail: `Escalated from ${item.assignee} to ${manager.name} (${manager.role})` }
      );
    }

    const alreadyCritical = (item.history ?? []).some((h) =>
      h.action === "SLA critical — top of chain" || h.action === "SLA critical — tier ceiling reached"
    );
    if (alreadyCritical) return item;

    const ceilingReason = managerAboveCeiling
      ? `Tier ceiling (${maxTier}) reached. ${manager!.name} (${manager!.tier}) is above the allowed escalation level.`
      : "No further manager in reporting chain. Requires immediate attention.";
    const ceilingAction = managerAboveCeiling
      ? "SLA critical — tier ceiling reached"
      : "SLA critical — top of chain";

    notifications.push({
      id: `sla-critical-${item.id}-${nowMs}`,
      title: managerAboveCeiling ? "Escalation Ceiling Reached" : "Critical: Unresolved",
      description: `"${item.summary}" — ${managerAboveCeiling ? `ceiling at ${maxTier} tier` : "top of management chain"}`,
      variant: "urgent",
      timestamp: nowIso,
    });
    return appendHistory(
      { ...item, priority: "urgent", slaStage: stage + 1, lastSlaActionAt: nowIso },
      { at: nowIso, by: "System", action: ceilingAction, detail: ceilingReason }
    );
  });

  return { items: updated, changed };
}

// ─── Notification event emitter (simple pub/sub for toast) ──────────────

export type EscalationNotification = {
  id: string;
  escalationId?: string;
  linkTo?: string;
  title: string;
  description: string;
  variant: "default" | "urgent" | "info";
  timestamp: string;
};

type NotificationListener = (n: EscalationNotification) => void;
const notificationListeners = new Set<NotificationListener>();
export function onEscalationNotification(listener: NotificationListener) {
  notificationListeners.add(listener);
  return () => { notificationListeners.delete(listener); };
}
function emitNotification(n: EscalationNotification) {
  notificationListeners.forEach((fn) => fn(n));
}

// ─── Context ──────────────────────────────────────────────────────────────

type EscalationsContextValue = {
  items: EscalationItem[];
  setItems: React.Dispatch<React.SetStateAction<EscalationItem[]>>;
  addEscalation: (item: Omit<EscalationItem, "id" | "createdAt">) => string;
  /** Permanently remove an escalation from the queue (prototype local state). */
  removeEscalation: (id: string) => void;
  updateAssignee: (id: string, assignee: string) => void;
  updateStatus: (id: string, status: string) => void;
  updateLabels: (id: string, labels: string[]) => void;
  markDone: (id: string) => void;
  reopen: (id: string) => void;
  addReply: (id: string, text: string) => void;
  addNote: (id: string, by: string, text: string) => void;
  updateInstructionForAgent: (id: string, instruction: string) => void;
  handBackToAgent: (id: string) => void;
  resolveApproval: (id: string, decision: "approved" | "denied" | "modified", opts: { comment?: string; adjustedAmount?: string; decidedBy: string; handBack?: boolean }) => void;
  /** Bulk assign multiple escalations */
  bulkAssign: (ids: string[], assignee: string) => void;
  /** Bulk update status */
  bulkUpdateStatus: (ids: string[], status: string) => void;
  /** Bulk delete multiple escalations */
  bulkDelete: (ids: string[]) => void;
  /** Bulk add labels */
  bulkAddLabels: (ids: string[], labels: string[]) => void;
  /** Configurable routing rules */
  routingRules: EscalationRoutingRule[];
  setRoutingRules: React.Dispatch<React.SetStateAction<EscalationRoutingRule[]>>;
  addRoutingRule: (rule: Omit<EscalationRoutingRule, "id">) => void;
  removeRoutingRule: (id: string) => void;
  updateRoutingRule: (id: string, updates: Partial<Omit<EscalationRoutingRule, "id">>) => void;
};

const EscalationsContext = createContext<EscalationsContextValue | null>(null);

export function EscalationsProvider({ children }: { children: React.ReactNode }) {
  const { members } = useWorkforce();
  const [items, setItems] = useState<EscalationItem[]>(INITIAL);
  const [routingRules, setRoutingRules] = useState<EscalationRoutingRule[]>(DEFAULT_ROUTING_RULES);
  const slaTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const membersRef = useRef(members);
  useEffect(() => { membersRef.current = members; }, [members]);
  const routingRulesRef = useRef(routingRules);
  useEffect(() => { routingRulesRef.current = routingRules; }, [routingRules]);

  // Load persisted routing rules (migrates legacy name-based and single-assignee formats)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ROUTING_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const migrated = parsed.map((r: Record<string, unknown>) => {
            if (!r.assigneeIds && !r.assignees && typeof r.assignee === "string") {
              const { assignee, ...rest } = r;
              return { ...rest, assignees: [assignee as string], assigneeIds: [] };
            }
            if (!r.assigneeIds && Array.isArray(r.assignees)) {
              return { ...r, assigneeIds: [] };
            }
            return r;
          });
          setRoutingRules(migrated as EscalationRoutingRule[]);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Persist routing rules
  useEffect(() => {
    try {
      localStorage.setItem(ROUTING_STORAGE_KEY, JSON.stringify(routingRules));
    } catch { /* ignore */ }
  }, [routingRules]);

  // Apply routing when workforce or rules change
  useEffect(() => {
    setItems((prev) => applyRoutingRules(prev, members, routingRules));
  }, [members, routingRules]);

  // SLA enforcement timer: check every 30s
  useEffect(() => {
    slaTimerRef.current = setInterval(() => {
      setItems((prev) => {
        const pendingNotifications: EscalationNotification[] = [];
        const result = applySlaChecks(prev, routingRulesRef.current, membersRef.current, pendingNotifications);
        if (result.changed) {
          pendingNotifications.forEach(emitNotification);
        }
        return result.changed ? result.items : prev;
      });
    }, 30_000);
    return () => { if (slaTimerRef.current) clearInterval(slaTimerRef.current); };
  }, []);

  const addEscalation = useCallback(
    (item: Omit<EscalationItem, "id" | "createdAt">) => {
      const id = `esc-${Date.now()}`;
      const createdAt = new Date().toISOString();
      const fullItem: EscalationItem = { ...item, id, createdAt, assignee: "", history: [] };
      const { assignee } = getAssignedByRouting(fullItem, members, [], routingRules);
      const full: EscalationItem = {
        ...item,
        id,
        createdAt,
        assignee,
        history: [{ at: createdAt, by: "System", action: "Created" }],
      };
      setItems((prev) => {
        const next = applyRoutingRules([...prev, full], members, routingRules);
        emitNotification({
          id: `new-${id}`,
          escalationId: id,
          linkTo: item.linkToSource || undefined,
          title: "New Escalation",
          description: item.summary,
          variant: item.priority === "urgent" ? "urgent" : "default",
          timestamp: createdAt,
        });
        return next;
      });
      return id;
    },
    [members, routingRules]
  );

  const removeEscalation = useCallback((id: string) => {
    setItems((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateAssignee = useCallback((id: string, assignee: string) => {
    const value = assignee === "Unassigned" ? "" : assignee;
    setItems((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return appendHistory(
          { ...r, assignee: value },
          { at: new Date().toISOString(), by: "System", action: "Assigned", detail: value || "Unassigned" }
        );
      })
    );
  }, []);

  const updateStatus = useCallback((id: string, status: string) => {
    if (!ESCALATION_STATUSES.includes(status as EscalationStatus)) return;
    setItems((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updates: Partial<EscalationItem> = { status };
        if (status === "Done" && !r.resolvedAt) updates.resolvedAt = new Date().toISOString();
        return appendHistory(
          { ...r, ...updates },
          { at: new Date().toISOString(), action: "Status", detail: status }
        );
      })
    );
  }, []);

  const markDone = useCallback((id: string) => {
    const resolvedAt = new Date().toISOString();
    setItems((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return appendHistory(
          { ...r, status: "Done", resolvedAt },
          { at: resolvedAt, action: "Done" }
        );
      })
    );
  }, []);

  const reopen = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return appendHistory(
          { ...r, status: "Open", resolvedAt: undefined },
          { at: new Date().toISOString(), action: "Reopened" }
        );
      })
    );
  }, []);

  const addReply = useCallback((id: string, text: string) => {
    const at = new Date().toISOString();
    setItems((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const existing = r.conversationContext ?? [];
        const updates: Partial<EscalationItem> = {
          conversationContext: [...existing, { role: "staff" as const, text }],
        };
        if (!r.firstResponseAt) updates.firstResponseAt = at;
        return appendHistory(
          { ...r, ...updates },
          { at, action: "Reply added" }
        );
      })
    );
  }, []);

  const addNote = useCallback((id: string, by: string, text: string) => {
    const note: EscalationNote = { at: new Date().toISOString(), by, text };
    setItems((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updates: Partial<EscalationItem> = {};
        if (!r.firstResponseAt) updates.firstResponseAt = note.at;
        return appendHistory(
          { ...r, notes: [...(r.notes ?? []), note], ...updates },
          { at: note.at, by, action: "Note added" }
        );
      })
    );
  }, []);

  const updateInstructionForAgent = useCallback((id: string, instruction: string) => {
    setItems((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return appendHistory(
          { ...r, instructionForAgent: instruction },
          { at: new Date().toISOString(), action: "Instruction for agent", detail: instruction ? "Updated" : "Cleared" }
        );
      })
    );
  }, []);

  const handBackToAgent = useCallback((id: string) => {
    const handedBackAt = new Date().toISOString();
    setItems((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = appendHistory(
          { ...r, status: "Handed back to agent", handedBackAt },
          { at: handedBackAt, by: "Staff", action: "Handed back to agent", detail: r.instructionForAgent ? "With instruction" : "No instruction" }
        );
        return updated;
      })
    );

    // Simulate agent processing and responding after a short delay
    setTimeout(() => {
      setItems((prev) =>
        prev.map((r) => {
          if (r.id !== id || r.status !== "Handed back to agent") return r;
          const instruction = r.instructionForAgent;
          const agentReply = instruction
            ? `Thank you for the guidance. Based on your instruction, I'll apply that going forward. Resuming the conversation now.`
            : `Acknowledged. Resuming the conversation with the available context.`;
          const existing = r.conversationContext ?? [];
          return appendHistory(
            {
              ...r,
              status: "In progress",
              conversationContext: [...existing, { role: "agent" as const, text: agentReply }],
            },
            { at: new Date().toISOString(), by: r.escalatedByAgent ?? "Agent", action: "Agent resumed", detail: "Agent re-entered conversation" }
          );
        })
      );

      emitNotification({
        id: `handback-${id}-${Date.now()}`,
        title: "Agent Resumed",
        description: "The agent has re-entered the conversation with your guidance.",
        variant: "info",
        timestamp: new Date().toISOString(),
      });
    }, 2000);
  }, []);

  const resolveApproval = useCallback((
    id: string,
    decision: "approved" | "denied" | "modified",
    opts: { comment?: string; adjustedAmount?: string; decidedBy: string; handBack?: boolean },
  ) => {
    const decidedAt = new Date().toISOString();
    const resolution = {
      decision,
      comment: opts.comment || undefined,
      adjustedAmount: opts.adjustedAmount || undefined,
      decidedBy: opts.decidedBy,
      decidedAt,
    };
    const actionLabel = decision === "approved" ? "Approved" : decision === "denied" ? "Denied" : "Approved with changes";
    const detail = [
      opts.adjustedAmount ? `Amount: ${opts.adjustedAmount}` : null,
      opts.comment ? `Comment: ${opts.comment}` : null,
    ].filter(Boolean).join("; ") || undefined;

    setItems((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const base = {
          ...r,
          resolution,
          instructionForAgent: opts.comment || r.instructionForAgent,
        };
        if (opts.handBack) {
          return appendHistory(
            { ...base, status: "Handed back to agent", handedBackAt: decidedAt },
            { at: decidedAt, by: opts.decidedBy, action: actionLabel, detail }
          );
        }
        return appendHistory(
          { ...base, status: "Done", resolvedAt: decidedAt },
          { at: decidedAt, by: opts.decidedBy, action: actionLabel, detail }
        );
      })
    );

    if (opts.handBack) {
      setTimeout(() => {
        setItems((prev) =>
          prev.map((r) => {
            if (r.id !== id || r.status !== "Handed back to agent") return r;
            const agentReply = `Understood — ${actionLabel.toLowerCase()}${opts.adjustedAmount ? ` for ${opts.adjustedAmount}` : ""}. Processing now.`;
            const existing = r.conversationContext ?? [];
            return appendHistory(
              {
                ...r,
                status: "In progress",
                conversationContext: [...existing, { role: "agent" as const, text: agentReply }],
              },
              { at: new Date().toISOString(), by: r.escalatedByAgent ?? "Agent", action: "Agent processing decision" }
            );
          })
        );

        emitNotification({
          id: `approval-handback-${id}-${Date.now()}`,
          title: "Agent Processing",
          description: `The agent is processing the ${actionLabel.toLowerCase()} decision.`,
          variant: "info",
          timestamp: new Date().toISOString(),
        });
      }, 2000);
    }
  }, []);

  const updateLabels = useCallback((id: string, labels: string[]) => {
    setItems((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id) return r;
        const at = new Date().toISOString();
        let updated = appendHistory({ ...r, labels }, { at, by: "Staff", action: "Labels updated", detail: labels.join(", ") || "cleared" });

        if (r.status !== "Done") {
          const withNewLabels: EscalationItem = { ...r, labels };
          const { assignee: newAssignee } = getAssignedByRouting(withNewLabels, members, prev, routingRules);
          if (newAssignee && newAssignee !== r.assignee) {
            updated = appendHistory(
              { ...updated, assignee: newAssignee },
              { at, by: "System", action: "Reassigned via labels", detail: newAssignee }
            );
            setTimeout(() => emitNotification({
              id: `reroute-${id}-${Date.now()}`,
              title: "Escalation Reassigned",
              description: `Labels updated — reassigned to ${newAssignee} based on the new labels.`,
              variant: "info",
              timestamp: at,
            }), 0);
          }
        }

        return updated;
      });
      return next;
    });
  }, [members, routingRules]);

  // Bulk operations
  const bulkAssign = useCallback((ids: string[], assignee: string) => {
    const value = assignee === "Unassigned" ? "" : assignee;
    const at = new Date().toISOString();
    setItems((prev) =>
      prev.map((r) => {
        if (!ids.includes(r.id)) return r;
        return appendHistory(
          { ...r, assignee: value },
          { at, by: "System", action: "Bulk assigned", detail: value || "Unassigned" }
        );
      })
    );
  }, []);

  const bulkUpdateStatus = useCallback((ids: string[], status: string) => {
    if (!ESCALATION_STATUSES.includes(status as EscalationStatus)) return;
    const at = new Date().toISOString();
    setItems((prev) =>
      prev.map((r) => {
        if (!ids.includes(r.id)) return r;
        const updates: Partial<EscalationItem> = { status };
        if (status === "Done" && !r.resolvedAt) updates.resolvedAt = at;
        return appendHistory(
          { ...r, ...updates },
          { at, action: "Bulk status", detail: status }
        );
      })
    );
  }, []);

  const bulkAddLabels = useCallback((ids: string[], labels: string[]) => {
    setItems((prev) =>
      prev.map((r) => {
        if (!ids.includes(r.id)) return r;
        const existing = new Set(r.labels ?? []);
        labels.forEach((l) => existing.add(l));
        return { ...r, labels: Array.from(existing) };
      })
    );
  }, []);

  const bulkDelete = useCallback((ids: string[]) => {
    setItems((prev) => prev.filter((r) => !ids.includes(r.id)));
  }, []);

  // Routing rule management
  const addRoutingRule = useCallback((rule: Omit<EscalationRoutingRule, "id">) => {
    const id = `r-${Date.now()}`;
    setRoutingRules((prev) => [...prev.filter((r) => r.id !== "r-fallback"), { ...rule, id }, ...prev.filter((r) => r.id === "r-fallback")]);
  }, []);

  const removeRoutingRule = useCallback((id: string) => {
    setRoutingRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateRoutingRule = useCallback((id: string, updates: Partial<Omit<EscalationRoutingRule, "id">>) => {
    setRoutingRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  return (
    <EscalationsContext.Provider
      value={{
        items, setItems, addEscalation, removeEscalation, updateAssignee, updateStatus, updateLabels,
        markDone, reopen, addReply, addNote, updateInstructionForAgent, handBackToAgent, resolveApproval,
        bulkAssign, bulkUpdateStatus, bulkDelete, bulkAddLabels,
        routingRules, setRoutingRules, addRoutingRule, removeRoutingRule, updateRoutingRule,
      }}
    >
      {children}
    </EscalationsContext.Provider>
  );
}

export function useEscalations() {
  const ctx = useContext(EscalationsContext);
  if (!ctx) throw new Error("useEscalations must be used within EscalationsProvider");
  return ctx;
}

// ─── Analytics helpers (used by pattern-detection UI) ─────────────────────

export type EscalationTrend = {
  label: string;
  count: number;
  change?: number;
};

export function useEscalationAnalytics() {
  const { items } = useEscalations();

  return useMemo(() => {
    const active = items.filter((i) => i.status !== "Done");
    const done = items.filter((i) => i.status === "Done");

    // By type
    const byType = new Map<string, number>();
    items.forEach((i) => { byType.set(i.type, (byType.get(i.type) ?? 0) + 1); });

    // By category
    const byCategory = new Map<string, number>();
    items.forEach((i) => { byCategory.set(i.category, (byCategory.get(i.category) ?? 0) + 1); });

    // By agent
    const byAgent = new Map<string, number>();
    items.forEach((i) => {
      if (i.escalatedByAgent) byAgent.set(i.escalatedByAgent, (byAgent.get(i.escalatedByAgent) ?? 0) + 1);
    });

    // By property
    const byProperty = new Map<string, number>();
    items.forEach((i) => { byProperty.set(i.property, (byProperty.get(i.property) ?? 0) + 1); });

    // Avg resolution time (ms) for resolved items
    const resolutionTimes = done
      .filter((i) => i.resolvedAt && i.createdAt)
      .map((i) => new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime());
    const avgResolutionMs = resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0;

    // Avg first response time
    const responseTimes = items
      .filter((i) => i.firstResponseAt && i.createdAt)
      .map((i) => new Date(i.firstResponseAt!).getTime() - new Date(i.createdAt).getTime());
    const avgFirstResponseMs = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // Recurring patterns: categories/agents with 3+ escalations
    const patterns: string[] = [];
    byAgent.forEach((count, agent) => {
      if (count >= 3) patterns.push(`${agent} has ${count} escalations — review agent config or SOPs`);
    });
    byCategory.forEach((count, cat) => {
      if (count >= 3) patterns.push(`${cat} category has ${count} escalations — potential SOP gap`);
    });
    byProperty.forEach((count, prop) => {
      const avg = items.length / Math.max(byProperty.size, 1);
      if (count > avg * 1.5 && count >= 2) patterns.push(`${prop} has ${count} escalations (above average) — may need training`);
    });

    const mapToTrends = (m: Map<string, number>): EscalationTrend[] =>
      Array.from(m.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);

    return {
      total: items.length,
      active: active.length,
      resolved: done.length,
      byType: mapToTrends(byType),
      byCategory: mapToTrends(byCategory),
      byAgent: mapToTrends(byAgent),
      byProperty: mapToTrends(byProperty),
      avgResolutionMs,
      avgFirstResponseMs,
      patterns,
    };
  }, [items]);
}
