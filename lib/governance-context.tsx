"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { COMPLIANCE_ITEMS } from "@/lib/vault-context";

export const GOV_STORAGE = "janet-poc-governance-v3";

export const HIGH_REGULATION_ACTIVITIES = [
  {
    id: "screening",
    label: "Tenant Screening",
    risk: "high",
    description: "Application screening, background checks, and admission decisions.",
    defaultApprovalGate: true,
    defaultPolicyCheck: true,
    defaultRequiredDocs: ["Tenant screening & background checks", "Fair housing & anti-discrimination"],
  },
  {
    id: "eviction",
    label: "Eviction & Notices",
    risk: "critical",
    description: "Eviction filings, legal notices, and lease termination actions.",
    defaultApprovalGate: true,
    defaultPolicyCheck: true,
    defaultRequiredDocs: ["Eviction & lease termination"],
  },
  {
    id: "accommodation",
    label: "Reasonable Accommodation",
    risk: "critical",
    description: "Disability accommodation requests, ESA processing, and modifications.",
    defaultApprovalGate: true,
    defaultPolicyCheck: true,
    defaultRequiredDocs: ["Reasonable accommodation & assistive animals", "Fair housing & anti-discrimination"],
  },
  {
    id: "refunds",
    label: "Refunds & Fee Waivers",
    risk: "medium",
    description: "Security deposit refunds, late fee waivers, and financial concessions.",
    defaultApprovalGate: true,
    defaultPolicyCheck: false,
    defaultRequiredDocs: ["Security deposit handling", "Rent collection & late fees"],
  },
  {
    id: "lease_terms",
    label: "Lease Terms & Enforcement",
    risk: "high",
    description: "Lease clause interpretation, rent adjustments, and term enforcement.",
    defaultApprovalGate: false,
    defaultPolicyCheck: true,
    defaultRequiredDocs: [],
  },
  {
    id: "advertising",
    label: "Advertising & Marketing",
    risk: "medium",
    description: "Listing content, ad targeting, and promotional communications.",
    defaultApprovalGate: false,
    defaultPolicyCheck: true,
    defaultRequiredDocs: ["Fair housing & anti-discrimination"],
  },
] as const;

export type RiskLevel = "low" | "medium" | "high" | "critical";

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

export const LIFECYCLE_STAGES = [
  { id: "draft", label: "Draft", description: "Agent is being configured. No live interactions." },
  { id: "training", label: "Training", description: "Agent is learning from linked SOPs and documents." },
  { id: "shadow", label: "Shadow", description: "Agent runs in parallel but all outputs require human approval before delivery." },
  { id: "active", label: "Active", description: "Agent is live and handling interactions autonomously within guardrails." },
  { id: "suspended", label: "Suspended", description: "Agent is temporarily paused. No new interactions accepted." },
  { id: "retired", label: "Retired", description: "Agent is permanently decommissioned. Historical data retained." },
] as const;

export type AuditEventType = "agent_response" | "tool_call" | "document_retrieval" | "escalation" | "approval" | "config_change";

export const AUDIT_EVENT_TYPES: { id: AuditEventType; label: string; description: string }[] = [
  { id: "agent_response", label: "Agent Responses", description: "All AI-generated messages sent to residents or staff" },
  { id: "tool_call", label: "Tool & API Calls", description: "Every MCP tool invocation and external API call" },
  { id: "document_retrieval", label: "Document Retrievals", description: "Which SOPs/docs were grounded on for each response" },
  { id: "escalation", label: "Escalations", description: "All escalation events, routing decisions, and outcomes" },
  { id: "approval", label: "Approval Decisions", description: "Human approve/deny actions on agent proposals" },
  { id: "config_change", label: "Configuration Changes", description: "Any changes to agent settings, guardrails, or governance" },
];

export const GENERAL_AI_SECTIONS = [
  {
    id: "humanReview",
    label: "Human-in-the-Loop Review",
    description: "Require human review for high-risk agent outputs before they reach residents.",
    settings: [
      { id: "hrHighRisk", label: "Require review for high-risk activities", default: true },
      { id: "hrNewAgents", label: "Auto-enable shadow mode for newly deployed agents", default: true },
      { id: "hrFinancial", label: "Require approval for financial transactions above threshold", default: true },
    ],
  },
  {
    id: "outputFilters",
    label: "Output Safety Filters",
    description: "Filters that prevent agents from generating harmful, non-compliant, or sensitive content.",
    settings: [
      { id: "ofPii", label: "PII redaction in logs and exports", default: true },
      { id: "ofDiscriminatory", label: "Block discriminatory language patterns", default: true },
      { id: "ofLegal", label: "Flag legal advice or liability-creating statements", default: true },
      { id: "ofPromptInjection", label: "Prompt injection detection and blocking", default: true },
    ],
  },
  {
    id: "fairHousing",
    label: "Fair Housing Posture",
    description: "Aligned with HUD May 2024 guidance. Ensures screening criteria are consistent, transparent, and documented.",
    settings: [
      { id: "fhConsistentCriteria", label: "Enforce consistent screening criteria across properties", default: true },
      { id: "fhApprovedDocsOnly", label: "Ground agent responses in approved documents only", default: true },
      { id: "fhPolicyContradiction", label: "Check responses against policy before sending", default: false },
      { id: "fhDisputeRights", label: "Inform applicants of dispute rights in screening decisions", default: true },
    ],
  },
  {
    id: "frameworks",
    label: "Industry Framework Alignment",
    description: "Track alignment with recognized AI governance frameworks to demonstrate responsible AI practices.",
    settings: [
      { id: "fwNistRmf", label: "NIST AI Risk Management Framework (AI RMF 1.0)", default: true },
      { id: "fwEuAiAct", label: "EU AI Act — high-risk system requirements", default: false },
      { id: "fwBidenEo", label: "Executive Order 14110 — Safe AI", default: false },
      { id: "fwNaahq", label: "NAAHQ AI guidance for multifamily", default: true },
    ],
  },
] as const;

/* ─────────────────────────────── State Types ──────────────────────────── */

export type ActivityGuardrail = {
  enabled: boolean;
  approvalGate: boolean;
  policyCheck: boolean;
  requiredDocs: string[];
  scope: "all" | "specific";
  scopedAgentIds: string[];
  thresholdAmount?: number;
};

export type RequiredDocEntry = {
  document: string;
  required: boolean;
  activities: string[];
};

export type LifecycleSettings = {
  enforceShadowMode: boolean;
  shadowDurationDays: number;
  killSwitchEnabled: boolean;
  autoSuspendOnErrors: boolean;
  errorThreshold: number;
  requireApprovalForActivation: boolean;
};

export type AuditSettings = {
  enabledEvents: Record<AuditEventType, boolean>;
  retentionDays: number;
  exportFormat: "json" | "csv";
  traceEnabled: boolean;
  traceIdFormat: "uuid" | "sequential";
  realTimeAlerts: boolean;
};

export type GovState = {
  activities: Record<string, ActivityGuardrail>;
  requiredDocs: RequiredDocEntry[];
  lifecycle: LifecycleSettings;
  audit: AuditSettings;
  generalAi: Record<string, boolean>;
};

export function buildDefaultState(): GovState {
  const activities: Record<string, ActivityGuardrail> = {};
  for (const a of HIGH_REGULATION_ACTIVITIES) {
    activities[a.id] = {
      enabled: false,
      approvalGate: a.defaultApprovalGate,
      policyCheck: a.defaultPolicyCheck,
      requiredDocs: [...a.defaultRequiredDocs],
      scope: "all",
      scopedAgentIds: [],
    };
  }

  const requiredDocs: RequiredDocEntry[] = COMPLIANCE_ITEMS.map((doc) => ({
    document: doc,
    required: true,
    activities: HIGH_REGULATION_ACTIVITIES
      .filter((a) => (a.defaultRequiredDocs as readonly string[]).includes(doc))
      .map((a) => a.id),
  }));

  return {
    activities,
    requiredDocs,
    lifecycle: {
      enforceShadowMode: true,
      shadowDurationDays: 7,
      killSwitchEnabled: true,
      autoSuspendOnErrors: true,
      errorThreshold: 5,
      requireApprovalForActivation: true,
    },
    audit: {
      enabledEvents: Object.fromEntries(AUDIT_EVENT_TYPES.map((e) => [e.id, true])) as Record<AuditEventType, boolean>,
      retentionDays: 365,
      exportFormat: "json",
      traceEnabled: true,
      traceIdFormat: "uuid",
      realTimeAlerts: true,
    },
    generalAi: Object.fromEntries(
      GENERAL_AI_SECTIONS.flatMap((s) => s.settings.map((st) => [st.id, st.default]))
    ),
  };
}

/* ─────────────────────────────── Context ──────────────────────────────── */

type GovernanceContextValue = {
  state: GovState;
  updateState: (updater: (prev: GovState) => GovState) => void;
  updateActivity: (actId: string, patch: Partial<ActivityGuardrail>) => void;
  updateLifecycle: (patch: Partial<LifecycleSettings>) => void;
  updateAudit: (patch: Partial<AuditSettings>) => void;
  toggleGeneralAi: (key: string) => void;
  toggleDocRequired: (docIndex: number) => void;
  enabledGuardrailCount: number;
};

const GovernanceContext = createContext<GovernanceContextValue | null>(null);

export function GovernanceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GovState>(buildDefaultState);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GOV_STORAGE);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState((prev) => ({
          activities: { ...prev.activities, ...parsed.activities },
          requiredDocs: parsed.requiredDocs ?? prev.requiredDocs,
          lifecycle: { ...prev.lifecycle, ...parsed.lifecycle },
          audit: {
            ...prev.audit,
            ...parsed.audit,
            enabledEvents: { ...prev.audit.enabledEvents, ...parsed.audit?.enabledEvents },
          },
          generalAi: { ...prev.generalAi, ...parsed.generalAi },
        }));
      }
    } catch { /* ignore */ }
  }, []);

  const persist = useCallback((next: GovState) => {
    try { localStorage.setItem(GOV_STORAGE, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  const updateState = useCallback((updater: (prev: GovState) => GovState) => {
    setState((prev) => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, [persist]);

  const updateActivity = useCallback((actId: string, patch: Partial<ActivityGuardrail>) => {
    updateState((prev) => ({
      ...prev,
      activities: {
        ...prev.activities,
        [actId]: { ...prev.activities[actId], ...patch },
      },
    }));
  }, [updateState]);

  const updateLifecycle = useCallback((patch: Partial<LifecycleSettings>) => {
    updateState((prev) => ({
      ...prev,
      lifecycle: { ...prev.lifecycle, ...patch },
    }));
  }, [updateState]);

  const updateAudit = useCallback((patch: Partial<AuditSettings>) => {
    updateState((prev) => ({
      ...prev,
      audit: { ...prev.audit, ...patch },
    }));
  }, [updateState]);

  const toggleGeneralAi = useCallback((key: string) => {
    updateState((prev) => ({
      ...prev,
      generalAi: { ...prev.generalAi, [key]: !prev.generalAi[key] },
    }));
  }, [updateState]);

  const toggleDocRequired = useCallback((docIndex: number) => {
    updateState((prev) => {
      const docs = [...prev.requiredDocs];
      docs[docIndex] = { ...docs[docIndex], required: !docs[docIndex].required };
      return { ...prev, requiredDocs: docs };
    });
  }, [updateState]);

  const enabledGuardrailCount = Object.values(state.activities).filter((a) => a.enabled).length;

  return (
    <GovernanceContext.Provider
      value={{
        state,
        updateState,
        updateActivity,
        updateLifecycle,
        updateAudit,
        toggleGeneralAi,
        toggleDocRequired,
        enabledGuardrailCount,
      }}
    >
      {children}
    </GovernanceContext.Provider>
  );
}

export function useGovernance() {
  const ctx = useContext(GovernanceContext);
  if (!ctx) throw new Error("useGovernance must be used within GovernanceProvider");
  return ctx;
}
