"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useWorkforce, getAssigneeByLabels, type WorkforceMember } from "@/lib/workforce-context";

// TDD §4.6.1 + Harvey/Sierra/DEEP-RESEARCH: full escalation model for handoff-with-context and staff assist
export type EscalationType =
  | "conversation"
  | "approval"
  | "workflow"
  | "training"
  | "doc_improvement";

/** Citation/reference: why the agent responded a certain way or source it used (Harvey-style source grounding) */
export type EscalationReference = {
  title: string;
  snippet?: string;
  docId?: string;
  section?: string;
};

/** Audit event: created, assigned, replied, noted, done, reopened */
export type EscalationHistoryEntry = {
  at: string; // ISO timestamp
  by?: string;
  action: string;
  detail?: string;
};

/** Staff note (internal) */
export type EscalationNote = {
  at: string;
  by: string;
  text: string;
};

/** When the escalation concerns a person (lead, resident, vendor) — for resident-facing tasks */
export type AffectedParty = {
  type: "lead" | "resident" | "vendor";
  name?: string;
  /** Unit / apartment (e.g. "4B", "Bldg 2 #101") */
  unit?: string;
  /** e.g. "Current", "Notice", "Prospective", "Applicant", "Past", "Active" */
  status?: string;
  /** Optional: lease end, move-in date, or vendor company */
  detail?: string;
};

export type EscalationItem = {
  id: string;
  /** Display name / title (e.g. short summary); fallback to summary if missing */
  name?: string;
  type: EscalationType;
  summary: string;
  /** AI reason for escalation (confidence, guardrail, human requested, policy unclear, etc.) — Sierra-style handoff reason */
  aiReasonForEscalation?: string;
  category: string;
  property: string;
  /** AI agent that escalated (e.g. "Payments AI", "Leasing AI") — for card display */
  escalatedByAgent?: string;
  status: string;
  assignee: string;
  /** Labels/tags to identify the problem (e.g. policy exception, urgent, maintenance) */
  labels?: string[];
  /** Optional: when this should be done (ISO date); used for overdue callout */
  dueAt?: string;
  /** Optional: priority for ordering and badges */
  priority?: "low" | "medium" | "high" | "urgent";
  linkToSource?: string;
  /** References/citations: why bot responded or sources for why it might not respond (TDD §4.5, Harvey source grounding) */
  references?: EscalationReference[];
  /** For conversation-based: context so human can reply in thread (TDD §4.6.1 HIL) */
  conversationContext?: { role: "resident" | "agent" | "staff"; text: string }[];
  /** When task concerns a resident/lead/vendor: who they are, unit, status */
  affectedParty?: AffectedParty;
  /** Audit trail: created, assigned, replied, noted, done */
  history?: EscalationHistoryEntry[];
  /** Staff notes (internal) */
  notes?: EscalationNote[];
  /** Human instruction for the agent (e.g. confirm policy, amount to use, how to respond) — so the agent can use it when replying or in future */
  instructionForAgent?: string;
  /** For type "approval": document/SOP change request — review view shows document + change summary */
  documentApprovalContext?: {
    documentId: string;
    documentName: string;
    changeSummary: string;
    proposedBody: string;
  };
};

/** Routing rule: first matching rule sets assignee. Used so we can see who (person or AI) is doing what work. */
export type EscalationRoutingRule = {
  /** Match escalation category (e.g. "Payments", "Maintenance") */
  category?: string;
  /** Match escalation type */
  type?: EscalationType;
  /** Match if escalation has any of these labels */
  labels?: string[];
  /** Assignee to set when this rule matches */
  assignee: string;
};

/** Default routing: category and type → assignee. Order matters: first match wins. */
const ROUTING_RULES: EscalationRoutingRule[] = [
  { type: "approval", assignee: "Admin" },
  { type: "doc_improvement", assignee: "Admin" },
  { category: "Compliance", assignee: "Admin" },
  { category: "Payments", assignee: "Sarah" },
  { category: "Maintenance", assignee: "Mike" },
  { category: "Leasing", assignee: "Sarah" },
  { type: "training", assignee: "Mike" },
  { category: "Accounting", assignee: "Sarah" },
  { assignee: "Mike" }, // fallback: unassigned goes to Mike
];

function matchesRule(item: EscalationItem, rule: EscalationRoutingRule): boolean {
  if (rule.category != null && item.category !== rule.category) return false;
  if (rule.type != null && item.type !== rule.type) return false;
  if (rule.labels != null && rule.labels.length > 0) {
    const itemLabels = item.labels ?? [];
    if (!rule.labels.some((l) => itemLabels.includes(l))) return false;
  }
  return true;
}

function getAssignedByRule(item: EscalationItem): string {
  const rule = ROUTING_RULES.find((r) => matchesRule(item, r));
  return rule ? rule.assignee : "";
}

/** 1) Label-based: match escalation labels to workforce member labels. 2) Fallback: category/type rules. */
function getAssignedByRouting(
  item: EscalationItem,
  humanMembers: WorkforceMember[]
): string {
  const byLabel = getAssigneeByLabels(item.labels, humanMembers);
  if (byLabel) return byLabel;
  return getAssignedByRule(item);
}

/** Apply routing to items that have no assignee. Uses labels first, then rules. */
function applyRoutingRules(
  items: EscalationItem[],
  humanMembers: WorkforceMember[]
): EscalationItem[] {
  return items.map((item) => {
    if (item.assignee != null && item.assignee.trim() !== "") return item;
    const assignee = getAssignedByRouting(item, humanMembers);
    if (assignee === "") return item;
    return appendHistory(
      { ...item, assignee },
      { at: new Date().toISOString(), by: "System", action: "Auto-assigned (labels)", detail: assignee }
    );
  });
}

const INITIAL: EscalationItem[] = [
  {
    id: "1",
    type: "conversation",
    summary: "Resident asked about late fee policy",
    category: "Payments",
    property: "Property A",
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
      { role: "agent", text: "I’m not sure of your community’s exact late fee. I’ve escalated this so a team member can confirm." },
    ],
    dueAt: "2025-02-18T17:00:00Z",
    priority: "high",
  },
  {
    id: "2",
    type: "conversation",
    summary: "Work order #4402 — HVAC not cooling",
    category: "Maintenance",
    property: "Property A",
    escalatedByAgent: "Maintenance AI",
    aiReasonForEscalation: "Resident requested human follow-up to prioritize and confirm ETA; escalated per policy.",
    status: "In progress",
    assignee: "Mike",
    linkToSource: "Thread #1025",
    affectedParty: {
      type: "resident",
      name: "Marcus Webb",
      unit: "Bldg 2 #101",
      status: "Current",
    },
    conversationContext: [
      { role: "resident", text: "My AC isn’t cooling. Already submitted work order 4402." },
      { role: "agent", text: "I see work order #4402. I’ve escalated for a human to prioritize and confirm ETA." },
    ],
    dueAt: "2025-02-17T12:00:00Z",
    priority: "urgent",
  },
  {
    id: "3",
    type: "training",
    summary: "Lease renewal terms clarification",
    category: "Leasing",
    property: "Property B",
    escalatedByAgent: "Leasing AI",
    aiReasonForEscalation: "Agent needs clarity on how to respond to 2-month lease extension requests; no clear guidance in current SOPs.",
    status: "Open",
    assignee: "",
    linkToSource: "Agent prompt review",
    conversationContext: [
      { role: "agent", text: "Agent asking for clarity: How should I respond when a resident asks for a 2-month lease extension?" },
    ],
  },
  {
    id: "4",
    type: "doc_improvement",
    summary: "Suggested SOP change: screening dispute process",
    category: "Compliance",
    property: "Property B",
    escalatedByAgent: "Compliance AI",
    aiReasonForEscalation: "Agent identified gap in screening dispute process during a conversation; suggesting SOP update for human review.",
    status: "Open",
    assignee: "",
    linkToSource: "SOP Maintenance escalation, §2",
  },
  {
    id: "5",
    type: "approval",
    summary: "Refund request over $500 — needs approval",
    category: "Payments",
    property: "Property A",
    escalatedByAgent: "Payments AI",
    aiReasonForEscalation: "Refund exceeds $500; guardrail requires human approval before proceeding.",
    status: "Open",
    assignee: "",
    linkToSource: "Workflow run #8821",
    affectedParty: {
      type: "resident",
      name: "Jordan Lee",
      unit: "3A",
      status: "Notice",
      detail: "Move-out Mar 15",
    },
  },
  {
    id: "6",
    type: "conversation",
    summary: "Noise complaint — ongoing issue between neighbors",
    category: "Leasing",
    property: "Property B",
    escalatedByAgent: "Leasing AI",
    aiReasonForEscalation: "Resident reports recurring noise from upstairs unit; third complaint this month. Requires human judgment on lease violation notice.",
    status: "Open",
    assignee: "",
    linkToSource: "Thread #1031",
    affectedParty: {
      type: "resident",
      name: "Diane Moss",
      unit: "2C",
      status: "Current",
      detail: "Lease ends Dec 2025",
    },
    conversationContext: [
      { role: "resident", text: "The upstairs neighbor is blasting music again at 11pm. This is the third time this month. I need someone to do something about this." },
      { role: "agent", text: "I'm sorry you're dealing with this. I've escalated to your property team so they can review the situation and take appropriate action." },
    ],
    dueAt: "2025-02-20T17:00:00Z",
    priority: "medium",
  },
  {
    id: "7",
    type: "conversation",
    summary: "Water leak in unit — emergency maintenance",
    category: "Maintenance",
    property: "Property C",
    escalatedByAgent: "Maintenance AI",
    aiReasonForEscalation: "Resident reports active water leak from ceiling; classified as emergency. Requires immediate dispatch and vendor coordination.",
    status: "In progress",
    assignee: "Mike",
    linkToSource: "Thread #1033",
    affectedParty: {
      type: "resident",
      name: "Kevin Tran",
      unit: "5D",
      status: "Current",
    },
    conversationContext: [
      { role: "resident", text: "There's water dripping from my bathroom ceiling. It's getting worse and starting to puddle on the floor." },
      { role: "agent", text: "This sounds like an emergency. I've created an urgent work order and escalated to the maintenance team for immediate response." },
    ],
    dueAt: "2025-02-16T10:00:00Z",
    priority: "urgent",
  },
  {
    id: "8",
    type: "approval",
    summary: "Early lease termination request — military PCS orders",
    category: "Leasing",
    property: "Property A",
    escalatedByAgent: "Leasing AI",
    aiReasonForEscalation: "Resident requesting early termination under SCRA (military orders). Requires manager review of documentation and approval of termination terms.",
    status: "Open",
    assignee: "",
    linkToSource: "Thread #1035",
    affectedParty: {
      type: "resident",
      name: "Sgt. Ryan Mitchell",
      unit: "7A",
      status: "Current",
      detail: "Lease ends Nov 2025",
    },
    dueAt: "2025-02-21T17:00:00Z",
    priority: "high",
  },
  {
    id: "9",
    type: "conversation",
    summary: "Resident disputing move-out charges",
    category: "Payments",
    property: "Property B",
    escalatedByAgent: "Payments AI",
    aiReasonForEscalation: "Former resident contesting $1,200 in move-out charges including carpet replacement. Agent cannot authorize adjustments; needs human review of move-out inspection photos.",
    status: "Open",
    assignee: "",
    linkToSource: "Thread #1037",
    affectedParty: {
      type: "resident",
      name: "Lisa Park",
      unit: "3F",
      status: "Past",
      detail: "Moved out Jan 31",
    },
    conversationContext: [
      { role: "resident", text: "I just got my final statement and I'm being charged $1,200 for carpet replacement. The carpet was already worn when I moved in. I have photos from my move-in inspection." },
      { role: "agent", text: "I understand your concern. I've escalated this to the property team so they can review your move-in inspection documentation alongside the move-out report." },
    ],
    priority: "medium",
  },
  {
    id: "10",
    type: "conversation",
    summary: "Prospective resident asking about pet policy exceptions",
    category: "Leasing",
    property: "Property C",
    escalatedByAgent: "Leasing AI",
    aiReasonForEscalation: "Prospect asking whether breed restriction can be waived for an emotional support animal. Agent needs guidance on FHA reasonable accommodation policy.",
    status: "Open",
    assignee: "",
    linkToSource: "Thread #1039",
    affectedParty: {
      type: "lead",
      name: "Amanda Wright",
      status: "Prospective",
    },
    conversationContext: [
      { role: "resident", text: "I'm interested in a 2BR unit but I have a German Shepherd that's my emotional support animal. I saw your breed restrictions — does that apply to ESAs?" },
      { role: "agent", text: "Great question. Emotional support animals are handled differently under fair housing guidelines. I've escalated this to our leasing team to provide accurate guidance on the accommodation process." },
    ],
    priority: "medium",
  },
  {
    id: "11",
    type: "conversation",
    summary: "Payment plan request for outstanding balance",
    category: "Payments",
    property: "Property A",
    escalatedByAgent: "Payments AI",
    aiReasonForEscalation: "Resident requesting a payment plan for $2,400 outstanding balance. Agent cannot set up payment plans without human approval.",
    status: "Open",
    assignee: "",
    linkToSource: "Thread #1043",
    affectedParty: {
      type: "resident",
      name: "Michael Torres",
      unit: "1D",
      status: "Current",
      detail: "Balance: $2,400",
    },
    conversationContext: [
      { role: "resident", text: "I'm behind on rent and I'd like to set up a payment plan. Is that possible?" },
      { role: "agent", text: "I understand. Payment plans need to be approved by the property team. I've escalated this so they can review your account and set something up." },
    ],
    priority: "medium",
  },
  {
    id: "12",
    type: "conversation",
    summary: "Resident requesting parking spot transfer",
    category: "Leasing",
    property: "Property A",
    escalatedByAgent: "Leasing AI",
    aiReasonForEscalation: "Resident wants to transfer reserved parking spot to a different location. Agent needs manager approval for the change.",
    status: "Open",
    assignee: "",
    linkToSource: "Thread #1041",
    affectedParty: {
      type: "resident",
      name: "David Kim",
      unit: "6B",
      status: "Current",
    },
    conversationContext: [
      { role: "resident", text: "Can I switch my parking spot? The one I have is too far from the entrance." },
      { role: "agent", text: "I'd be happy to help look into that. Let me connect you with the leasing team to check availability and process the transfer." },
    ],
    priority: "low",
  },
  {
    id: "13",
    type: "conversation",
    summary: "Elevator outage — multiple resident complaints",
    category: "Maintenance",
    property: "Property B",
    escalatedByAgent: "Maintenance AI",
    aiReasonForEscalation: "Multiple residents complaining about elevator being out of service for 3 days. Requires coordination with elevator vendor.",
    status: "Open",
    assignee: "",
    linkToSource: "Thread #1045",
    priority: "high",
    dueAt: "2025-02-19T17:00:00Z",
  },
  {
    id: "14",
    type: "conversation",
    summary: "Resident reporting unauthorized pet in neighboring unit",
    category: "Leasing",
    property: "Property B",
    escalatedByAgent: "Leasing AI",
    aiReasonForEscalation: "Resident reports neighbor has an unauthorized large dog. Agent needs human to verify pet policy compliance.",
    status: "Open",
    assignee: "",
    linkToSource: "Thread #1047",
    affectedParty: {
      type: "resident",
      name: "Tom Bradley",
      unit: "4C",
      status: "Current",
    },
    conversationContext: [
      { role: "resident", text: "My neighbor in 4D has a large dog that barks all day. I don't think pets over 25 lbs are allowed here." },
      { role: "agent", text: "Thank you for letting us know. I've escalated this to the property team so they can review the pet policy and follow up with the resident in 4D." },
    ],
    priority: "medium",
  },
  {
    id: "15",
    type: "approval",
    summary: "Vendor invoice over $5,000 — AC unit replacement",
    category: "Maintenance",
    property: "Property B",
    escalatedByAgent: "Maintenance AI",
    aiReasonForEscalation: "Vendor submitted $5,200 invoice for AC unit replacement. Exceeds approval threshold; needs manager sign-off.",
    status: "Open",
    assignee: "",
    linkToSource: "Workflow run #8830",
    priority: "high",
    dueAt: "2025-02-22T17:00:00Z",
  },
  {
    id: "16",
    type: "conversation",
    summary: "Rent increase dispute — renewal offer rejected",
    category: "Payments",
    property: "Property B",
    escalatedByAgent: "Renewals AI",
    aiReasonForEscalation: "Resident contesting 8% rent increase on renewal. Threatening to vacate. Needs retention strategy from manager.",
    status: "In progress",
    assignee: "",
    linkToSource: "Thread #1049",
    affectedParty: {
      type: "resident",
      name: "Patricia Holmes",
      unit: "8A",
      status: "Current",
      detail: "Lease ends Apr 2025",
    },
    conversationContext: [
      { role: "resident", text: "An 8% increase is way too much. I've been a good tenant for 3 years. If you can't come down on the price, I'm going to move." },
      { role: "agent", text: "I understand your concern. I've escalated this to the property manager so they can discuss options with you directly." },
    ],
    priority: "urgent",
  },
  {
    id: "17",
    type: "conversation",
    summary: "Garage remote replacement — resident in 2A",
    category: "Maintenance",
    property: "Property A",
    escalatedByAgent: "Maintenance AI",
    status: "Done",
    assignee: "Sarah",
    linkToSource: "Thread #1053",
    priority: "low",
  },
  {
    id: "18",
    type: "conversation",
    summary: "Rent ledger correction — duplicate charge removed",
    category: "Payments",
    property: "Property B",
    escalatedByAgent: "Payments AI",
    status: "Done",
    assignee: "Sarah",
    linkToSource: "Thread #1055",
    priority: "medium",
  },
  {
    id: "19",
    type: "conversation",
    summary: "Package room access issue resolved",
    category: "Maintenance",
    property: "Property C",
    escalatedByAgent: "Maintenance AI",
    status: "Done",
    assignee: "Mike",
    linkToSource: "Thread #1057",
    priority: "low",
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

export const ESCALATION_STATUSES = ["Open", "In progress", "Done"] as const;
export type EscalationStatus = (typeof ESCALATION_STATUSES)[number];

type EscalationsContextValue = {
  items: EscalationItem[];
  setItems: React.Dispatch<React.SetStateAction<EscalationItem[]>>;
  addEscalation: (item: Omit<EscalationItem, "id">) => string;
  updateAssignee: (id: string, assignee: string) => void;
  updateStatus: (id: string, status: string) => void;
  updateLabels: (id: string, labels: string[]) => void;
  markDone: (id: string) => void;
  reopen: (id: string) => void;
  addReply: (id: string, text: string) => void;
  addNote: (id: string, by: string, text: string) => void;
  updateInstructionForAgent: (id: string, instruction: string) => void;
};

const EscalationsContext = createContext<EscalationsContextValue | null>(null);

export function EscalationsProvider({ children }: { children: React.ReactNode }) {
  const { humanMembers } = useWorkforce();
  const [items, setItems] = useState<EscalationItem[]>(INITIAL);

  useEffect(() => {
    setItems((prev) => applyRoutingRules(prev, humanMembers));
  }, [humanMembers]);

  const addEscalation = useCallback(
    (item: Omit<EscalationItem, "id">) => {
      const id = `esc-${Date.now()}`;
      const fullItem: EscalationItem = { ...item, id, assignee: "", history: [] };
      const assignee = getAssignedByRouting(fullItem, humanMembers);
      const full: EscalationItem = {
        ...item,
        id,
        assignee,
        history: [{ at: new Date().toISOString(), by: "System", action: "Created" }],
      };
      setItems((prev) => applyRoutingRules([...prev, full], humanMembers));
      return id;
    },
    [humanMembers]
  );

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
        return appendHistory(
          { ...r, status },
          { at: new Date().toISOString(), action: "Status", detail: status }
        );
      })
    );
  }, []);

  const markDone = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return appendHistory(
          { ...r, status: "Done" },
          { at: new Date().toISOString(), action: "Done" }
        );
      })
    );
  }, []);

  const reopen = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return appendHistory(
          { ...r, status: "Open" },
          { at: new Date().toISOString(), action: "Reopened" }
        );
      })
    );
  }, []);

  const addReply = useCallback((id: string, text: string) => {
    setItems((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const existing = r.conversationContext ?? [];
        return appendHistory(
          {
            ...r,
            conversationContext: [...existing, { role: "staff" as const, text }],
          },
          { at: new Date().toISOString(), action: "Reply added" }
        );
      })
    );
  }, []);

  const addNote = useCallback((id: string, by: string, text: string) => {
    const note: EscalationNote = { at: new Date().toISOString(), by, text };
    setItems((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return appendHistory(
          { ...r, notes: [...(r.notes ?? []), note] },
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

  const updateLabels = useCallback((id: string, labels: string[]) => {
    setItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, labels } : r))
    );
  }, []);

  return (
    <EscalationsContext.Provider
      value={{ items, setItems, addEscalation, updateAssignee, updateStatus, updateLabels, markDone, reopen, addReply, addNote, updateInstructionForAgent }}
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
