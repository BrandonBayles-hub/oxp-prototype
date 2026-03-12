"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type AgentStatus = "draft" | "submitted" | "in_review" | "live" | "paused";
export type AgentDomain = "leasing" | "accounting" | "maintenance" | "renewals" | "compliance" | "general";
export type AgentCreatedFrom = "prompt" | "blueprint" | "custom";
export type AgentLevel = "l1" | "l2" | "l3" | "l4" | "l5";

export const AGENT_LEVEL_OPTIONS: { value: AgentLevel; label: string; description: string }[] = [
  { value: "l5", label: "L5 — Entrata Platform", description: "Core platform capabilities managed by Entrata" },
  { value: "l4", label: "L4 — Autonomous Agent", description: "Full conversational AI that handles end-to-end interactions" },
  { value: "l3", label: "L3 — Orchestrator", description: "Coordinates multiple agents and cross-functional workflows" },
  { value: "l2", label: "L2 — Automation", description: "Task-based automation that runs on a schedule or trigger" },
  { value: "l1", label: "L1 — Operations", description: "Backend operations like data sync, reconciliation, posting" },
];

export type SubmissionAttachment = {
  id: string;
  name: string;
  type: "document" | "video" | "image" | "other";
  size: string;
};

export type SubmissionMessage = {
  id: string;
  from: "entrata" | "customer";
  text: string;
  sentAt: string;
};

export type CustomAgent = {
  id: string;
  name: string;
  status: AgentStatus;
  domain: AgentDomain;
  createdFrom: AgentCreatedFrom;
  blueprintName?: string;
  description?: string;
};

export type SubmissionPriority = "normal" | "high" | "urgent";

export type AgentSubmission = {
  id: string;
  prompt: string;
  status: "submitted" | "in_review" | "needs_info" | "approved" | "live";
  submittedAt: string;
  suggestedName?: string;
  agentLevel?: AgentLevel;
  deployLocation?: string;
  additionalDetails?: string;
  attachments?: SubmissionAttachment[];
  messages?: SubmissionMessage[];
  assignedTo?: string;
  priority?: SubmissionPriority;
  customerOrg?: string;
  estimatedCompletion?: string;
  internalNotes?: string;
};

const AGENTS_KEY = "entrata-agent-builder-agents";
const SUBMISSIONS_KEY = "entrata-agent-builder-submissions";

const INITIAL_AGENTS: CustomAgent[] = [
  { id: "1", name: "New lead → create task", status: "live", domain: "leasing", createdFrom: "blueprint", blueprintName: "Lead Response" },
  { id: "2", name: "Lease renewal reminder", status: "paused", domain: "renewals", createdFrom: "custom" },
  { id: "3", name: "Work order → notify resident", status: "live", domain: "maintenance", createdFrom: "blueprint", blueprintName: "Maintenance Triage" },
];

const INITIAL_SUBMISSIONS: AgentSubmission[] = [
  {
    id: "sub-1",
    prompt: "I want an agent that scans all month-to-month leases and sends a renewal offer with market-rate pricing, escalating to the property manager if no response after 7 days.",
    status: "in_review",
    submittedAt: "2026-02-28T14:30:00Z",
    suggestedName: "Renewal Pricing Agent",
    agentLevel: "l2",
    deployLocation: "Renewals workflow — after lease expiration scan",
    attachments: [
      { id: "att-1", name: "Renewal-SOP-2026.pdf", type: "document", size: "2.4 MB" },
    ],
    messages: [
      { id: "msg-1", from: "entrata", text: "Can you clarify what \"market-rate pricing\" source you'd like us to use? Do you have a preferred comp data provider, or should we use Entrata's built-in market analytics?", sentAt: "2026-03-01T10:00:00Z" },
      { id: "msg-2", from: "customer", text: "Use Entrata's built-in market analytics as the primary source. If the unit is in a submarket where Entrata doesn't have strong comp data, fall back to the regional average.", sentAt: "2026-03-01T14:22:00Z" },
    ],
    assignedTo: "Sarah Chen",
    priority: "high",
    customerOrg: "Greystar Properties",
    estimatedCompletion: "2026-03-14T00:00:00Z",
  },
  {
    id: "sub-2",
    prompt: "Create an agent that monitors vendor invoices above $2,500 and cross-references them against historical pricing for the same work type, flagging anomalies.",
    status: "approved",
    submittedAt: "2026-02-25T09:15:00Z",
    suggestedName: "Invoice Watchdog",
    agentLevel: "l2",
    attachments: [
      { id: "att-2", name: "Vendor-Pricing-Guidelines.pdf", type: "document", size: "1.1 MB" },
      { id: "att-3", name: "AP-Process-Walkthrough.mp4", type: "video", size: "48 MB" },
    ],
    assignedTo: "Marcus Rivera",
    priority: "normal",
    customerOrg: "Greystar Properties",
    estimatedCompletion: "2026-03-07T00:00:00Z",
    internalNotes: "Straightforward L2 — historical pricing model already exists in the data warehouse. ~3 day build.",
  },
  {
    id: "sub-3",
    prompt: "Build an offboarding agent that handles the full move-out workflow: notice confirmation, final inspection scheduling, deposit calculation, and forwarding address collection.",
    status: "needs_info",
    submittedAt: "2026-03-02T09:00:00Z",
    suggestedName: "Offboarding Assistant",
    agentLevel: "l4",
    messages: [
      { id: "msg-3", from: "entrata", text: "Great request! A couple of things we need to finalize:\n1. Should the agent handle the resident communication directly (chat/email), or just coordinate the back-office tasks?\n2. Do you have a deposit calculation SOP you can upload? State rules vary significantly.", sentAt: "2026-03-03T11:15:00Z" },
    ],
    assignedTo: "Sarah Chen",
    priority: "urgent",
    customerOrg: "Greystar Properties",
  },
];

type SubmitPromptPayload = {
  prompt: string;
  suggestedName?: string;
  agentLevel?: AgentLevel;
  deployLocation?: string;
  additionalDetails?: string;
  attachments?: SubmissionAttachment[];
};

type SubmissionMetaPatch = Partial<Pick<AgentSubmission, "assignedTo" | "priority" | "estimatedCompletion" | "internalNotes">>;

type AgentBuilderContextValue = {
  agents: CustomAgent[];
  submissions: AgentSubmission[];
  toggleAgent: (id: string) => void;
  addAgentFromBlueprint: (agent: Omit<CustomAgent, "id">) => void;
  submitPrompt: (payload: SubmitPromptPayload) => void;
  addMessageToSubmission: (submissionId: string, text: string, from: "entrata" | "customer") => void;
  updateSubmissionStatus: (id: string, status: AgentSubmission["status"]) => void;
  updateSubmissionMeta: (id: string, meta: SubmissionMetaPatch) => void;
  atLeastOneActive: boolean;
};

const AgentBuilderContext = createContext<AgentBuilderContextValue | null>(null);

export function AgentBuilderProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<CustomAgent[]>(INITIAL_AGENTS);
  const [submissions, setSubmissions] = useState<AgentSubmission[]>(INITIAL_SUBMISSIONS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const rawAgents = localStorage.getItem(AGENTS_KEY);
      if (rawAgents) {
        const parsed = JSON.parse(rawAgents);
        if (Array.isArray(parsed)) setAgents(parsed);
      }
      const rawSubs = localStorage.getItem(SUBMISSIONS_KEY);
      if (rawSubs) {
        const parsed = JSON.parse(rawSubs);
        if (Array.isArray(parsed)) setSubmissions(parsed);
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(AGENTS_KEY, JSON.stringify(agents));
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
    } catch {
      // ignore
    }
  }, [agents, submissions, mounted]);

  const toggleAgent = useCallback((id: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: a.status === "live" ? "paused" : "live" } : a
      )
    );
  }, []);

  const addAgentFromBlueprint = useCallback((agent: Omit<CustomAgent, "id">) => {
    setAgents((prev) => [...prev, { ...agent, id: String(Date.now()) }]);
  }, []);

  const submitPrompt = useCallback((payload: SubmitPromptPayload) => {
    setSubmissions((prev) => [
      {
        id: `sub-${Date.now()}`,
        prompt: payload.prompt,
        status: "submitted",
        submittedAt: new Date().toISOString(),
        suggestedName: payload.suggestedName || undefined,
        agentLevel: payload.agentLevel || undefined,
        deployLocation: payload.deployLocation || undefined,
        additionalDetails: payload.additionalDetails || undefined,
        attachments: payload.attachments?.length ? payload.attachments : undefined,
      },
      ...prev,
    ]);
  }, []);

  const addMessageToSubmission = useCallback((submissionId: string, text: string, from: "entrata" | "customer") => {
    setSubmissions((prev) =>
      prev.map((sub) => {
        if (sub.id !== submissionId) return sub;
        const msg: SubmissionMessage = {
          id: `msg-${Date.now()}`,
          from,
          text,
          sentAt: new Date().toISOString(),
        };
        return {
          ...sub,
          status: from === "customer" ? "in_review" : from === "entrata" ? "needs_info" : sub.status,
          messages: [...(sub.messages ?? []), msg],
        };
      })
    );
  }, []);

  const updateSubmissionStatus = useCallback((id: string, status: AgentSubmission["status"]) => {
    setSubmissions((prev) => prev.map((sub) => (sub.id === id ? { ...sub, status } : sub)));
  }, []);

  const updateSubmissionMeta = useCallback((id: string, meta: SubmissionMetaPatch) => {
    setSubmissions((prev) => prev.map((sub) => (sub.id === id ? { ...sub, ...meta } : sub)));
  }, []);

  const atLeastOneActive = agents.some((a) => a.status === "live");

  return (
    <AgentBuilderContext.Provider
      value={{ agents, submissions, toggleAgent, addAgentFromBlueprint, submitPrompt, addMessageToSubmission, updateSubmissionStatus, updateSubmissionMeta, atLeastOneActive }}
    >
      {children}
    </AgentBuilderContext.Provider>
  );
}

export function useAgentBuilder() {
  const ctx = useContext(AgentBuilderContext);
  if (!ctx) throw new Error("useAgentBuilder must be used within AgentBuilderProvider");
  return ctx;
}
