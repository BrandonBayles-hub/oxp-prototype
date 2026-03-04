"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { useAgents, type Agent } from "@/lib/agents-context";
import { useVault, COMPLIANCE_ITEMS } from "@/lib/vault-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ContractGate, R1ComingSoon } from "@/components/contract-overlay";
import {
  Shield, ScrollText, ClipboardList, BrainCircuit,
  Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle,
  Eye, FileCheck, Power, Timer, Download, History,
  CheckCircle2, XCircle, Clock, Zap,
} from "lucide-react";

/* ─────────────────────────────── Constants ────────────────────────────── */

const GOV_STORAGE = "janet-poc-governance-v2";

const HIGH_REGULATION_ACTIVITIES = [
  {
    id: "screening",
    label: "Tenant Screening",
    risk: "high",
    description: "Application screening, background checks, and admission decisions.",
    defaultApprovalGate: true,
    defaultPolicyCheck: true,
    defaultRequiredDocs: ["Screening policy", "Fair housing policy"],
  },
  {
    id: "eviction",
    label: "Eviction & Notices",
    risk: "critical",
    description: "Eviction filings, legal notices, and lease termination actions.",
    defaultApprovalGate: true,
    defaultPolicyCheck: true,
    defaultRequiredDocs: ["Eviction procedures"],
  },
  {
    id: "accommodation",
    label: "Reasonable Accommodation",
    risk: "critical",
    description: "Disability accommodation requests, ESA processing, and modifications.",
    defaultApprovalGate: true,
    defaultPolicyCheck: true,
    defaultRequiredDocs: ["Reasonable accommodation process", "Fair housing policy"],
  },
  {
    id: "refunds",
    label: "Refunds & Fee Waivers",
    risk: "medium",
    description: "Security deposit refunds, late fee waivers, and financial concessions.",
    defaultApprovalGate: true,
    defaultPolicyCheck: false,
    defaultRequiredDocs: ["Security deposit policy"],
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
    defaultRequiredDocs: ["Fair housing policy"],
  },
] as const;

type RiskLevel = "low" | "medium" | "high" | "critical";

const RISK_COLORS: Record<RiskLevel, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

const LIFECYCLE_STAGES = [
  { id: "draft", label: "Draft", icon: ScrollText, description: "Agent is being configured. No live interactions." },
  { id: "training", label: "Training", icon: BrainCircuit, description: "Agent is learning from linked SOPs and documents." },
  { id: "shadow", label: "Shadow", icon: Eye, description: "Agent runs in parallel but all outputs require human approval before delivery." },
  { id: "active", label: "Active", icon: Zap, description: "Agent is live and handling interactions autonomously within guardrails." },
  { id: "suspended", label: "Suspended", icon: Power, description: "Agent is temporarily paused. No new interactions accepted." },
  { id: "retired", label: "Retired", icon: Clock, description: "Agent is permanently decommissioned. Historical data retained." },
] as const;

type AuditEventType = "agent_response" | "tool_call" | "document_retrieval" | "escalation" | "approval" | "config_change";

const AUDIT_EVENT_TYPES: { id: AuditEventType; label: string; description: string }[] = [
  { id: "agent_response", label: "Agent Responses", description: "All AI-generated messages sent to residents or staff" },
  { id: "tool_call", label: "Tool & API Calls", description: "Every MCP tool invocation and external API call" },
  { id: "document_retrieval", label: "Document Retrievals", description: "Which SOPs/docs were grounded on for each response" },
  { id: "escalation", label: "Escalations", description: "All escalation events, routing decisions, and outcomes" },
  { id: "approval", label: "Approval Decisions", description: "Human approve/deny actions on agent proposals" },
  { id: "config_change", label: "Configuration Changes", description: "Any changes to agent settings, guardrails, or governance" },
];

const GENERAL_AI_SECTIONS = [
  {
    id: "humanReview",
    label: "Human-in-the-Loop Review",
    icon: Eye,
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
    icon: Shield,
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
    icon: FileCheck,
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
    icon: ClipboardList,
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

type ActivityGuardrail = {
  enabled: boolean;
  approvalGate: boolean;
  policyCheck: boolean;
  requiredDocs: string[];
  scope: "all" | "specific";
  scopedAgentIds: string[];
  thresholdAmount?: number;
};

type RequiredDocEntry = {
  document: string;
  required: boolean;
  activities: string[];
};

type LifecycleSettings = {
  enforceShadowMode: boolean;
  shadowDurationDays: number;
  killSwitchEnabled: boolean;
  autoSuspendOnErrors: boolean;
  errorThreshold: number;
  requireApprovalForActivation: boolean;
};

type AuditSettings = {
  enabledEvents: Record<AuditEventType, boolean>;
  retentionDays: number;
  exportFormat: "json" | "csv";
  traceEnabled: boolean;
  traceIdFormat: "uuid" | "sequential";
  realTimeAlerts: boolean;
};

type GovState = {
  activities: Record<string, ActivityGuardrail>;
  requiredDocs: RequiredDocEntry[];
  lifecycle: LifecycleSettings;
  audit: AuditSettings;
  generalAi: Record<string, boolean>;
};

function buildDefaultState(): GovState {
  const activities: Record<string, ActivityGuardrail> = {};
  for (const a of HIGH_REGULATION_ACTIVITIES) {
    activities[a.id] = {
      enabled: true,
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

/* ─────────────────────────────── Mock Audit Log ───────────────────────── */

const MOCK_AUDIT_LOG = [
  { id: "a1", timestamp: "2026-02-20T08:15:23Z", event: "agent_response" as AuditEventType, agent: "Leasing AI", detail: "Responded to tour inquiry for Unit 204", traceId: "tr-9f3a1b" },
  { id: "a2", timestamp: "2026-02-20T07:42:11Z", event: "tool_call" as AuditEventType, agent: "Payments Operations", detail: "Called Entrata MCP: postLedgerEntry", traceId: "tr-8e2c4d" },
  { id: "a3", timestamp: "2026-02-20T06:30:00Z", event: "document_retrieval" as AuditEventType, agent: "Compliance AI", detail: "Retrieved 'Fair housing policy' for screening response", traceId: "tr-7d1b3e" },
  { id: "a4", timestamp: "2026-02-19T16:20:45Z", event: "escalation" as AuditEventType, agent: "Maintenance AI", detail: "Escalated emergency work order to on-call staff", traceId: "tr-6c0a2f" },
  { id: "a5", timestamp: "2026-02-19T14:10:33Z", event: "approval" as AuditEventType, agent: "Renewal AI", detail: "Human approved $200 concession for Unit 312 renewal", traceId: "tr-5b9f1a" },
  { id: "a6", timestamp: "2026-02-19T11:05:12Z", event: "config_change" as AuditEventType, agent: "System", detail: "Updated screening guardrail: approval gate enabled", traceId: "tr-4a8e0b" },
  { id: "a7", timestamp: "2026-02-19T09:30:00Z", event: "agent_response" as AuditEventType, agent: "Compliance AI", detail: "Answered fair housing question from applicant", traceId: "tr-3c7d9c" },
  { id: "a8", timestamp: "2026-02-18T15:45:22Z", event: "tool_call" as AuditEventType, agent: "Leasing Operations", detail: "Called Entrata MCP: createApplication", traceId: "tr-2b6c8d" },
];

const EVENT_ICONS: Record<AuditEventType, typeof Shield> = {
  agent_response: Zap,
  tool_call: Power,
  document_retrieval: ScrollText,
  escalation: AlertTriangle,
  approval: CheckCircle2,
  config_change: History,
};

/* ─────────────────────────────── Component ─────────────────────────────── */

export default function GovernancePage() {
  const { agents } = useAgents();
  const { documents } = useVault();
  const [state, setState] = useState<GovState>(buildDefaultState);
  const [activeTab, setActiveTab] = useState("guardrails");
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [addDocDialogOpen, setAddDocDialogOpen] = useState(false);

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

  /* ── Derived data ── */

  const allAgents = useMemo(() => agents, [agents]);
  const activeAgentCount = useMemo(() => agents.filter((a) => a.status === "Active").length, [agents]);
  const trainingAgentCount = useMemo(() => agents.filter((a) => a.status === "Training").length, [agents]);

  const approvedDocCount = useMemo(
    () => documents.filter((d) => d.approvalStatus === "approved").length,
    [documents]
  );

  const enabledGuardrailCount = useMemo(
    () => Object.values(state.activities).filter((a) => a.enabled).length,
    [state.activities]
  );

  const enabledAuditEvents = useMemo(
    () => Object.values(state.audit.enabledEvents).filter(Boolean).length,
    [state.audit.enabledEvents]
  );

  const enabledFrameworks = useMemo(
    () => GENERAL_AI_SECTIONS.find((s) => s.id === "frameworks")
      ?.settings.filter((s) => state.generalAi[s.id]).length ?? 0,
    [state.generalAi]
  );

  /* ── Overview stats ── */

  const stats = [
    { label: "Active guardrails", value: `${enabledGuardrailCount}/${HIGH_REGULATION_ACTIVITIES.length}` },
    { label: "Audit events tracked", value: `${enabledAuditEvents}/${AUDIT_EVENT_TYPES.length}` },
    { label: "Active agents", value: activeAgentCount },
    { label: "Approved SOPs", value: approvedDocCount },
  ];

  return (
    <R1ComingSoon featureName="Governance" description="Define and enforce compliance policies, guardrails, and audit controls across all AI agents and properties.">
    <ContractGate featureName="Governance">
    <>
      <PageHeader
        title="Governance"
        description="Guardrails, audit controls, agent lifecycle management, and AI best practices — for both multifamily regulation and general AI liability."
      />

      {/* Overview stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="py-3">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
          <TabsTrigger value="docs">Required Docs</TabsTrigger>
          <TabsTrigger value="lifecycle">Agent Lifecycle</TabsTrigger>
          <TabsTrigger value="audit">Audit & Transparency</TabsTrigger>
          <TabsTrigger value="general">General AI</TabsTrigger>
        </TabsList>

        {/* ───── TAB 1: Guardrails by Activity ───── */}
        <TabsContent value="guardrails" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure guardrails for high-regulation multifamily activities. Each activity can have approval gates (human sign-off before action),
            deterministic policy checks, and required documents that must be approved in the Vault before the agent can act.
          </p>

          {HIGH_REGULATION_ACTIVITIES.map((activity) => {
            const guardrail = state.activities[activity.id];
            if (!guardrail) return null;
            const isExpanded = expandedActivity === activity.id;

            return (
              <Card key={activity.id} className={cn(!guardrail.enabled && "opacity-60")}>
                <CardContent className="py-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{activity.label}</h3>
                        <Badge className={cn("text-[10px]", RISK_COLORS[activity.risk as RiskLevel])}>
                          {activity.risk}
                        </Badge>
                        {guardrail.approvalGate && (
                          <Badge variant="outline" className="text-[10px]">Approval gate</Badge>
                        )}
                        {guardrail.policyCheck && (
                          <Badge variant="outline" className="text-[10px]">Policy check</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{activity.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={guardrail.enabled}
                        onCheckedChange={(checked) => updateActivity(activity.id, { enabled: checked })}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setExpandedActivity(isExpanded ? null : activity.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded settings */}
                  {isExpanded && guardrail.enabled && (
                    <div className="mt-4 space-y-4 border-t border-border pt-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex items-center justify-between rounded-md border border-border p-3">
                          <div>
                            <p className="text-sm font-medium">Approval gate</p>
                            <p className="text-xs text-muted-foreground">Require human sign-off before action</p>
                          </div>
                          <Switch
                            checked={guardrail.approvalGate}
                            onCheckedChange={(checked) => updateActivity(activity.id, { approvalGate: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-md border border-border p-3">
                          <div>
                            <p className="text-sm font-medium">Policy check</p>
                            <p className="text-xs text-muted-foreground">Deterministic check against SOP</p>
                          </div>
                          <Switch
                            checked={guardrail.policyCheck}
                            onCheckedChange={(checked) => updateActivity(activity.id, { policyCheck: checked })}
                          />
                        </div>
                      </div>

                      {/* Scope */}
                      <div>
                        <p className="mb-2 text-sm font-medium">Scope</p>
                        <div className="flex gap-3">
                          <Button
                            variant={guardrail.scope === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateActivity(activity.id, { scope: "all", scopedAgentIds: [] })}
                          >
                            All agents
                          </Button>
                          <Button
                            variant={guardrail.scope === "specific" ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateActivity(activity.id, { scope: "specific" })}
                          >
                            Specific agents
                          </Button>
                        </div>
                        {guardrail.scope === "specific" && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {allAgents.filter((a) => a.type === "l4").map((agent) => {
                              const isSelected = guardrail.scopedAgentIds.includes(agent.id);
                              return (
                                <button
                                  key={agent.id}
                                  type="button"
                                  onClick={() => {
                                    const ids = isSelected
                                      ? guardrail.scopedAgentIds.filter((id) => id !== agent.id)
                                      : [...guardrail.scopedAgentIds, agent.id];
                                    updateActivity(activity.id, { scopedAgentIds: ids });
                                  }}
                                  className={cn(
                                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                                    isSelected
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border text-muted-foreground hover:border-primary/40"
                                  )}
                                >
                                  {agent.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Required docs for this activity */}
                      {guardrail.requiredDocs.length > 0 && (
                        <div>
                          <p className="mb-1.5 text-sm font-medium">Required documents</p>
                          <div className="flex flex-wrap gap-1.5">
                            {guardrail.requiredDocs.map((doc) => {
                              const inVault = documents.some(
                                (d) => d.fileName.toLowerCase().includes(doc.toLowerCase()) && d.approvalStatus === "approved"
                              );
                              return (
                                <Badge
                                  key={doc}
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    inVault ? "border-green-300 text-green-700 dark:border-green-700 dark:text-green-300" : "border-red-300 text-red-700 dark:border-red-700 dark:text-red-300"
                                  )}
                                >
                                  {inVault ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                                  {doc}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Threshold for financial activities */}
                      {activity.id === "refunds" && (
                        <div>
                          <label className="mb-1 block text-sm font-medium">Approval threshold ($)</label>
                          <Input
                            type="number"
                            className="w-40"
                            value={guardrail.thresholdAmount ?? 500}
                            onChange={(e) => updateActivity(activity.id, { thresholdAmount: Number(e.target.value) })}
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            Amounts above this require human approval
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ───── TAB 2: Required Documents ───── */}
        <TabsContent value="docs" className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Documents that must be in the Vault and approved before agents can act on regulated activities.
                Extends the Getting Started compliance checklist.
              </p>
            </div>
            <Button size="sm" onClick={() => setAddDocDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add requirement
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Required activities</TableHead>
                  <TableHead>Vault status</TableHead>
                  <TableHead className="w-24 text-right">Required</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.requiredDocs.map((entry, idx) => {
                  const inVault = documents.some(
                    (d) => d.fileName.toLowerCase().includes(entry.document.toLowerCase()) && d.approvalStatus === "approved"
                  );
                  return (
                    <TableRow key={entry.document}>
                      <TableCell className="font-medium">{entry.document}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {entry.activities.length > 0 ? entry.activities.map((aId) => {
                            const act = HIGH_REGULATION_ACTIVITIES.find((a) => a.id === aId);
                            return (
                              <Badge key={aId} variant="secondary" className="text-[10px]">
                                {act?.label ?? aId}
                              </Badge>
                            );
                          }) : (
                            <span className="text-xs text-muted-foreground">All activities</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            inVault
                              ? "border-green-300 text-green-700 dark:border-green-700 dark:text-green-300"
                              : "border-red-300 text-red-700 dark:border-red-700 dark:text-red-300"
                          )}
                        >
                          {inVault ? "Approved" : "Missing / Not approved"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={entry.required}
                          onCheckedChange={() => toggleDocRequired(idx)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Compliance coverage summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Compliance Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {HIGH_REGULATION_ACTIVITIES.map((activity) => {
                  const guardrail = state.activities[activity.id];
                  const reqDocs = guardrail?.requiredDocs ?? [];
                  const docsInVault = reqDocs.filter((doc) =>
                    documents.some((d) => d.fileName.toLowerCase().includes(doc.toLowerCase()) && d.approvalStatus === "approved")
                  );
                  const coverage = reqDocs.length > 0 ? Math.round((docsInVault.length / reqDocs.length) * 100) : 100;

                  return (
                    <div key={activity.id} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{activity.label}</p>
                        <span className={cn(
                          "text-xs font-semibold",
                          coverage === 100 ? "text-green-600" : coverage >= 50 ? "text-amber-600" : "text-red-600"
                        )}>
                          {coverage}%
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-1.5 rounded-full transition-all",
                            coverage === 100 ? "bg-green-500" : coverage >= 50 ? "bg-amber-500" : "bg-red-500"
                          )}
                          style={{ width: `${coverage}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {docsInVault.length}/{reqDocs.length} docs approved
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───── TAB 3: Agent Lifecycle ───── */}
        <TabsContent value="lifecycle" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Manage the full lifecycle of your AI agents — from initial configuration through deployment, monitoring, and retirement.
            These controls ensure every agent goes through proper vetting before going live.
          </p>

          {/* Lifecycle stages visualization */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Deployment Stages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {LIFECYCLE_STAGES.map((stage) => {
                  const Icon = stage.icon;
                  const agentCount = agents.filter((a) => {
                    if (stage.id === "active") return a.status === "Active";
                    if (stage.id === "training") return a.status === "Training";
                    if (stage.id === "draft") return a.status === "Draft";
                    if (stage.id === "suspended") return a.status === "Off";
                    return false;
                  }).length;

                  return (
                    <div key={stage.id} className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-4 text-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{stage.label}</span>
                      <span className="text-xs text-muted-foreground leading-tight">{stage.description}</span>
                      {agentCount > 0 && (
                        <Badge variant="secondary" className="mt-1 text-[10px]">
                          {agentCount} agent{agentCount !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Lifecycle controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Lifecycle Controls</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <div className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Enforce shadow mode for new agents</p>
                    <p className="text-xs text-muted-foreground">
                      New agents must operate in shadow mode (human-reviewed) before going fully active
                    </p>
                  </div>
                  <Switch
                    checked={state.lifecycle.enforceShadowMode}
                    onCheckedChange={(checked) => updateLifecycle({ enforceShadowMode: checked })}
                  />
                </div>
                {state.lifecycle.enforceShadowMode && (
                  <div className="mt-3 flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3">
                    <Timer className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1">
                      <label className="text-sm font-medium">Minimum shadow duration</label>
                      <p className="text-xs text-muted-foreground">Days in shadow mode before activation is allowed</p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={90}
                      className="w-20 text-center"
                      value={state.lifecycle.shadowDurationDays}
                      onChange={(e) => updateLifecycle({ shadowDurationDays: Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium">Require approval for activation</p>
                  <p className="text-xs text-muted-foreground">
                    Moving an agent from shadow/training to active requires manager approval
                  </p>
                </div>
                <Switch
                  checked={state.lifecycle.requireApprovalForActivation}
                  onCheckedChange={(checked) => updateLifecycle({ requireApprovalForActivation: checked })}
                />
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium">Kill switch</p>
                  <p className="text-xs text-muted-foreground">
                    Global emergency stop — instantly suspends all agents
                  </p>
                </div>
                <Switch
                  checked={state.lifecycle.killSwitchEnabled}
                  onCheckedChange={(checked) => updateLifecycle({ killSwitchEnabled: checked })}
                />
              </div>

              <div className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-suspend on error threshold</p>
                    <p className="text-xs text-muted-foreground">
                      Automatically suspend an agent if it exceeds the error threshold
                    </p>
                  </div>
                  <Switch
                    checked={state.lifecycle.autoSuspendOnErrors}
                    onCheckedChange={(checked) => updateLifecycle({ autoSuspendOnErrors: checked })}
                  />
                </div>
                {state.lifecycle.autoSuspendOnErrors && (
                  <div className="mt-3 flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1">
                      <label className="text-sm font-medium">Error threshold</label>
                      <p className="text-xs text-muted-foreground">Errors within a 24-hour window before auto-suspend</p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      className="w-20 text-center"
                      value={state.lifecycle.errorThreshold}
                      onChange={(e) => updateLifecycle({ errorThreshold: Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Agent status overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Agent Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Guardrails</TableHead>
                    <TableHead>Vault binding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.slice(0, 10).map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">{agent.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-[10px]",
                            agent.status === "Active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                              : agent.status === "Training"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                          )}
                        >
                          {agent.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {agent.guardrails !== "None" ? agent.guardrails : "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {agent.vaultBinding || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───── TAB 4: Audit & Transparency ───── */}
        <TabsContent value="audit" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Full audit trail of every agent interaction, tool call, and document retrieval.
            Exportable for compliance reviews, dispute resolution, and regulatory audits.
          </p>

          {/* Audit event toggles */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Tracked Events</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {AUDIT_EVENT_TYPES.map((eventType, idx) => (
                <div
                  key={eventType.id}
                  className={cn(
                    "flex items-center justify-between py-4",
                    idx === 0 && "pt-0",
                    idx === AUDIT_EVENT_TYPES.length - 1 && "pb-0"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium">{eventType.label}</p>
                    <p className="text-xs text-muted-foreground">{eventType.description}</p>
                  </div>
                  <Switch
                    checked={state.audit.enabledEvents[eventType.id]}
                    onCheckedChange={(checked) =>
                      updateAudit({
                        enabledEvents: { ...state.audit.enabledEvents, [eventType.id]: checked },
                      })
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Audit configuration */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Retention & Export</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Retention period</label>
                  <Select
                    value={String(state.audit.retentionDays)}
                    onValueChange={(val) => updateAudit({ retentionDays: Number(val) })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="730">2 years</SelectItem>
                      <SelectItem value="1825">5 years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Export format</label>
                  <Select
                    value={state.audit.exportFormat}
                    onValueChange={(val) => updateAudit({ exportFormat: val as "json" | "csv" })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  <Download className="mr-1.5 h-4 w-4" /> Export audit log
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Tracing & Alerts</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <div className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Tracing</p>
                      <p className="text-xs text-muted-foreground">Attach trace IDs to every agent interaction chain</p>
                    </div>
                    <Switch
                      checked={state.audit.traceEnabled}
                      onCheckedChange={(checked) => updateAudit({ traceEnabled: checked })}
                    />
                  </div>
                  {state.audit.traceEnabled && (
                    <div className="mt-3">
                      <label className="mb-1 block text-sm font-medium">Trace ID format</label>
                      <Select
                        value={state.audit.traceIdFormat}
                        onValueChange={(val) => updateAudit({ traceIdFormat: val as "uuid" | "sequential" })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="uuid">UUID</SelectItem>
                          <SelectItem value="sequential">Sequential</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div>
                    <p className="text-sm font-medium">Real-time alerts</p>
                    <p className="text-xs text-muted-foreground">Notify on policy violations or anomalies</p>
                  </div>
                  <Switch
                    checked={state.audit.realTimeAlerts}
                    onCheckedChange={(checked) => updateAudit({ realTimeAlerts: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent audit log */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead>Trace</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_AUDIT_LOG.map((entry) => {
                    const Icon = EVENT_ICONS[entry.event];
                    return (
                      <TableRow key={entry.id}>
                        <TableCell><Icon className="h-4 w-4 text-muted-foreground" /></TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString("en-US", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {entry.event.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{entry.agent}</TableCell>
                        <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                          {entry.detail}
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{entry.traceId}</code>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───── TAB 5: General AI Governance ───── */}
        <TabsContent value="general" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Best practices for responsible AI that go beyond multifamily regulation.
            Covers human oversight, output safety, fair housing posture, and alignment with recognized AI governance frameworks.
          </p>

          {GENERAL_AI_SECTIONS.map((section) => {
            const Icon = section.icon;
            const enabledCount = section.settings.filter((s) => state.generalAi[s.id]).length;

            return (
              <Card key={section.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <CardTitle>{section.label}</CardTitle>
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {enabledCount}/{section.settings.length} enabled
                    </Badge>
                  </div>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-border">
                  {section.settings.map((setting, idx) => (
                    <div
                      key={setting.id}
                      className={cn(
                        "flex items-center justify-between py-4",
                        idx === 0 && "pt-0",
                        idx === section.settings.length - 1 && "pb-0"
                      )}
                    >
                      <span className="text-sm">{setting.label}</span>
                      <Switch
                        checked={state.generalAi[setting.id] ?? setting.default}
                        onCheckedChange={() => toggleGeneralAi(setting.id)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {/* Governance score / posture summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Governance Posture</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <PostureItem
                  label="Guardrails"
                  value={enabledGuardrailCount}
                  total={HIGH_REGULATION_ACTIVITIES.length}
                  color="green"
                />
                <PostureItem
                  label="Audit coverage"
                  value={enabledAuditEvents}
                  total={AUDIT_EVENT_TYPES.length}
                  color="blue"
                />
                <PostureItem
                  label="Framework alignment"
                  value={enabledFrameworks}
                  total={GENERAL_AI_SECTIONS.find((s) => s.id === "frameworks")?.settings.length ?? 0}
                  color="purple"
                />
                <PostureItem
                  label="Safety filters"
                  value={GENERAL_AI_SECTIONS.find((s) => s.id === "outputFilters")
                    ?.settings.filter((s) => state.generalAi[s.id]).length ?? 0}
                  total={GENERAL_AI_SECTIONS.find((s) => s.id === "outputFilters")?.settings.length ?? 0}
                  color="amber"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add required doc dialog */}
      <AddRequiredDocDialog
        open={addDocDialogOpen}
        onOpenChange={setAddDocDialogOpen}
        existingDocs={state.requiredDocs.map((d) => d.document)}
        onAdd={(doc, activities) => {
          updateState((prev) => ({
            ...prev,
            requiredDocs: [...prev.requiredDocs, { document: doc, required: true, activities }],
          }));
          setAddDocDialogOpen(false);
        }}
      />
    </>
    </ContractGate>
    </R1ComingSoon>
  );
}

/* ─────────────────────────────── Sub-components ───────────────────────── */

function PostureItem({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const colorMap: Record<string, string> = {
    green: "bg-green-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    amber: "bg-amber-500",
  };
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold">{value}/{total}</span>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
        <div
          className={cn("h-1.5 rounded-full transition-all", colorMap[color] ?? "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AddRequiredDocDialog({
  open,
  onOpenChange,
  existingDocs,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingDocs: string[];
  onAdd: (doc: string, activities: string[]) => void;
}) {
  const [docName, setDocName] = useState("");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!docName.trim()) return;
    onAdd(docName.trim(), selectedActivities);
    setDocName("");
    setSelectedActivities([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Required Document</DialogTitle>
          <DialogDescription>
            Specify a document that must be in the Vault and approved before agents can act.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Document name</label>
            <Input
              placeholder="e.g. Pet policy"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Required for activities</label>
            <div className="flex flex-wrap gap-1.5">
              {HIGH_REGULATION_ACTIVITIES.map((a) => {
                const selected = selectedActivities.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() =>
                      setSelectedActivities((prev) =>
                        selected ? prev.filter((id) => id !== a.id) : [...prev, a.id]
                      )
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Leave empty to apply to all activities</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!docName.trim()}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
