"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAgents, type Agent } from "@/lib/agents-context";
import { useVault, COMPLIANCE_ITEMS } from "@/lib/vault-context";
import {
  useGovernance,
  HIGH_REGULATION_ACTIVITIES,
  RISK_COLORS,
  LIFECYCLE_STAGES,
  AUDIT_EVENT_TYPES,
  GENERAL_AI_SECTIONS,
  type RiskLevel,
  type AuditEventType,
} from "@/lib/governance-context";
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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Shield, ScrollText, ClipboardList, BrainCircuit,
  Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle,
  Eye, FileCheck, Power, Timer, Download, History,
  CheckCircle2, XCircle, Clock, Zap, Search, Cpu,
  FileText, Wrench, ArrowRight, Activity,
} from "lucide-react";

/* ─────────────────────────────── Mock Audit Log ───────────────────────── */

const MOCK_AUDIT_LOG = [
  { id: "a1", timestamp: "2026-02-20T08:15:23Z", event: "agent_response" as AuditEventType, agent: "Leasing AI", detail: "Responded to tour inquiry for Unit 204", traceId: "tr-9f3a1b" },
  { id: "a2", timestamp: "2026-02-20T07:42:11Z", event: "tool_call" as AuditEventType, agent: "Payments Operations", detail: "Called Entrata MCP: postLedgerEntry", traceId: "tr-8e2c4d" },
  { id: "a3", timestamp: "2026-02-20T06:30:00Z", event: "document_retrieval" as AuditEventType, agent: "Compliance AI", detail: "Retrieved 'Fair housing & anti-discrimination' for screening response", traceId: "tr-7d1b3e" },
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

type TraceStep = {
  type: "input" | "rag" | "llm" | "tool" | "output";
  label: string;
  detail: string;
  latencyMs: number;
  meta?: Record<string, string | number>;
};

type TraceDetail = {
  traceId: string;
  agent: string;
  event: AuditEventType;
  timestamp: string;
  totalLatencyMs: number;
  totalTokens: number;
  estimatedCost: string;
  steps: TraceStep[];
};

function TraceViewerContent({ trace }: { trace: TraceDetail }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Trace: <code className="text-sm font-mono">{trace.traceId}</code>
        </SheetTitle>
      </SheetHeader>

      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Agent</p>
            <p className="mt-0.5 text-sm font-medium">{trace.agent}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Event</p>
            <p className="mt-0.5 text-sm font-medium capitalize">{trace.event.replace(/_/g, " ")}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total latency</p>
            <p className="mt-0.5 text-sm font-semibold">{trace.totalLatencyMs}ms</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tokens / Cost</p>
            <p className="mt-0.5 text-sm font-semibold">{trace.totalTokens} · {trace.estimatedCost}</p>
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Execution chain</h4>
          <div className="space-y-0">
            {trace.steps.map((step, si) => {
              const stepIcons: Record<string, typeof Shield> = { input: Zap, rag: FileText, llm: Cpu, tool: Wrench, output: CheckCircle2 };
              const StepIcon = stepIcons[step.type] ?? Zap;
              const isLast = si === trace.steps.length - 1;
              return (
                <div key={si} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background">
                      <StepIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-border" />}
                  </div>
                  <div className={cn("pb-4 flex-1 min-w-0", isLast && "pb-0")}>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{step.label}</p>
                      <span className="text-[10px] text-muted-foreground">{step.latencyMs}ms</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
                    {step.meta && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(step.meta).map(([k, v]) => (
                          <span key={k} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border p-3 bg-muted/30">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Timestamp</p>
          <p className="text-xs">{new Date(trace.timestamp).toLocaleString()}</p>
        </div>
      </div>
    </>
  );
}

function generateMockTrace(entry: (typeof MOCK_AUDIT_LOG)[number]): TraceDetail {
  const ragLatency = 45 + Math.floor(Math.random() * 60);
  const llmLatency = 180 + Math.floor(Math.random() * 400);
  const toolLatency = entry.event === "tool_call" ? 90 + Math.floor(Math.random() * 200) : 0;
  const tokensIn = 400 + Math.floor(Math.random() * 600);
  const tokensOut = 120 + Math.floor(Math.random() * 300);
  const total = tokensIn + tokensOut;
  const cost = (total * 0.000003).toFixed(4);

  const steps: TraceStep[] = [
    { type: "input", label: "User input", detail: entry.detail, latencyMs: 2, meta: { channel: "Chat", property: "Oakwood Apartments" } },
    { type: "rag", label: "RAG retrieval", detail: "Queried Vault for relevant SOPs and policies", latencyMs: ragLatency, meta: { chunks: 3 + Math.floor(Math.random() * 4), topScore: (0.85 + Math.random() * 0.14).toFixed(2) } },
    { type: "llm", label: "LLM inference", detail: "Claude 3.5 Sonnet — generated response", latencyMs: llmLatency, meta: { model: "claude-3.5-sonnet", tokensIn, tokensOut } },
  ];
  if (entry.event === "tool_call" || entry.event === "agent_response") {
    const toolName = entry.detail.includes("MCP") ? entry.detail.split(": ").pop() ?? "Entrata MCP" : "Entrata MCP";
    steps.push({ type: "tool", label: "Tool call", detail: `Called ${toolName}`, latencyMs: toolLatency, meta: { tool: toolName, result: "success" } });
  }
  if (entry.event === "escalation") {
    steps.push({ type: "tool", label: "Escalation", detail: "Routed to on-call staff via escalation engine", latencyMs: 15, meta: { reason: "emergency", assignee: "On-call maintenance" } });
  }
  steps.push({ type: "output", label: "Response delivered", detail: "Sent to user via channel", latencyMs: 5 });

  return {
    traceId: entry.traceId,
    agent: entry.agent,
    event: entry.event,
    timestamp: entry.timestamp,
    totalLatencyMs: steps.reduce((s, st) => s + st.latencyMs, 0),
    totalTokens: total,
    estimatedCost: `$${cost}`,
    steps,
  };
}

const LIFECYCLE_ICONS: Record<string, typeof Shield> = {
  draft: ScrollText,
  training: BrainCircuit,
  shadow: Eye,
  active: Zap,
  suspended: Power,
  retired: Clock,
};

/* ─────────────────────────────── Component ─────────────────────────────── */

export default function GovernancePage() {
  const { agents } = useAgents();
  const { documents } = useVault();
  const {
    state,
    updateState,
    updateActivity,
    updateLifecycle,
    updateAudit,
    toggleGeneralAi,
    toggleDocRequired,
    enabledGuardrailCount,
  } = useGovernance();
  const [activeTab, setActiveTab] = useState("guardrails");
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [addDocDialogOpen, setAddDocDialogOpen] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<TraceDetail | null>(null);
  /* ── Derived data ── */

  const allAgents = useMemo(() => agents, [agents]);
  const activeAgentCount = useMemo(() => agents.filter((a) => a.status === "Active").length, [agents]);

  const approvedDocCount = useMemo(
    () => documents.filter((d) => d.approvalStatus === "approved").length,
    [documents]
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
                            {allAgents.filter((a) => a.type === "autonomous").map((agent) => {
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
                  const Icon = LIFECYCLE_ICONS[stage.id] ?? Shield;
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

          {/* Aggregate metrics */}
          <div className="grid gap-3 sm:grid-cols-4 mb-4">
            <Card className="border-border/60">
              <CardContent className="flex items-center gap-3 pt-5">
                <Activity className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-lg font-semibold">{MOCK_AUDIT_LOG.length}</p>
                  <p className="text-xs text-muted-foreground">Total traces</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="flex items-center gap-3 pt-5">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-lg font-semibold">
                    {Math.round(MOCK_AUDIT_LOG.reduce((s, e) => s + generateMockTrace(e).totalLatencyMs, 0) / MOCK_AUDIT_LOG.length)}ms
                  </p>
                  <p className="text-xs text-muted-foreground">Avg latency</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="flex items-center gap-3 pt-5">
                <Cpu className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-lg font-semibold">
                    {(MOCK_AUDIT_LOG.reduce((s, e) => s + generateMockTrace(e).totalTokens, 0) / 1000).toFixed(1)}K
                  </p>
                  <p className="text-xs text-muted-foreground">Tokens today</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="flex items-center gap-3 pt-5">
                <XCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-lg font-semibold">0%</p>
                  <p className="text-xs text-muted-foreground">Error rate</p>
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
                          <button
                            type="button"
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                            onClick={() => setSelectedTrace(generateMockTrace(entry))}
                          >
                            {entry.traceId} <Search className="inline h-2.5 w-2.5 ml-0.5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Trace Viewer Sheet */}
          <Sheet open={!!selectedTrace} onOpenChange={(open) => !open && setSelectedTrace(null)}>
            <SheetContent className="sm:max-w-lg overflow-y-auto">
              {selectedTrace && <TraceViewerContent trace={selectedTrace!} />}
            </SheetContent>
          </Sheet>
        </TabsContent>

        {/* ───── TAB 5: General AI Governance ───── */}
        <TabsContent value="general" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Best practices for responsible AI that go beyond multifamily regulation.
            Covers human oversight, output safety, fair housing posture, and alignment with recognized AI governance frameworks.
          </p>

          {GENERAL_AI_SECTIONS.map((section) => {
            const enabledCount = section.settings.filter((s) => state.generalAi[s.id]).length;

            return (
              <Card key={section.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
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
