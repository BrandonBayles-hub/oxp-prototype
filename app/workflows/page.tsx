"use client";

import { useState, Suspense, lazy, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Workflow,
  BrainCircuit,
  Check,
  Code2,
  Loader2,
  Cog,
  FlaskConical,
  Rocket,
  TestTube,
  Building2,
  Zap,
  Layers,
  X,
  Plus,
  ArrowLeft,
  GitBranch,
  Pencil,
  Trash2,
  Search,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Beaker,
  ThumbsUp,
  ThumbsDown,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Activity,
} from "lucide-react";
import {
  PMC_PROPERTY_RECORDS,
  type PmcPropertyRecord,
} from "@/components/custom-agent-builder/lib/pmc-identity";
import { TodoListBanner } from "@/components/custom-agent-builder/components/TodoListBanner";
import { useR1Release } from "@/lib/r1-release-context";
import { useR2Release } from "@/lib/r2-release-context";
import { generateWorkflow } from "@/lib/workflow-generator";

const CustomAgentBuilder = lazy(() => import("@/components/custom-agent-builder"));
const WorkflowVisualizer = lazy(() => import("@/components/workflow-visualizer"));
const LegacyAgentBuilder = lazy(() => import("@/components/legacy-agent-builder"));

// ─── Types ───

type AgentType = "deterministic" | "ai-powered";
type AgentStatusValue = "draft" | "sandbox" | "live" | "paused";

type AgentVersion = {
  id: string;
  versionNumber: number;
  status: "draft" | "sandbox" | "live" | "retired";
  createdAt: string;
  description: string;
};

type SimpleEval = {
  id: string;
  input: string;
  expected: string;
  severity: "critical" | "major" | "minor";
  tags: string[];
  status?: "pass" | "fail" | "not_run";
};

type ObjectTrace = {
  objectType: "resident" | "lead" | "lease" | "work_order" | "invoice" | "unit" | "property" | "renewal_offer" | "message";
  objectId: string;
  objectLabel: string;
  action: "read" | "created" | "updated" | "deleted" | "sent";
};

type ExecutionLogEntry = {
  id: string;
  runAt: string;
  version: number;
  environment: "sandbox" | "production";
  status: "success" | "failure" | "timeout" | "partial";
  durationMs: number;
  triggerSource: string;
  propertyId?: string;
  stepsExecuted: number;
  stepsTotal: number;
  objectsModified: ObjectTrace[];
  errorMessage?: string;
  llmTokensUsed?: number;
  costUsd?: number;
};

type ChangeHistoryEntry = {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: "created" | "updated" | "version_added" | "status_changed" | "properties_changed" | "config_changed" | "evals_changed";
  summary: string;
  details?: string;
  versionAffected?: number;
  diff?: { field: string; from: string; to: string }[];
};

type UnifiedAgent = {
  id: string;
  name: string;
  type: AgentType;
  description: string;
  status: AgentStatusValue;
  domain: string;
  createdAt: string;
  versions: AgentVersion[];
  activeVersion: number;
  propertyIds: string[];
  propertyVersionMap: Record<string, number>;
  triggers: string[];
  evals: SimpleEval[];
  lastRunAt?: string;
  runsLast30d?: number;
  executionLog: ExecutionLogEntry[];
  changeHistory: ChangeHistoryEntry[];
};

// ─── Seed data ───

const SAMPLE_AGENTS: UnifiedAgent[] = [
  {
    id: "ua-1",
    name: "Lease Renewal Automation",
    type: "deterministic",
    description: "Scans expiring leases within 90 days, calculates renewal offers based on market rent and payment history, sends via email, escalates if no response in 7 days.",
    status: "live",
    domain: "Renewals",
    createdAt: "2026-05-15T10:00:00Z",
    versions: [
      { id: "v1", versionNumber: 1, status: "retired", createdAt: "2026-05-15T10:00:00Z", description: "Initial version — basic renewal scan" },
      { id: "v2", versionNumber: 2, status: "live", createdAt: "2026-06-01T14:30:00Z", description: "Added payment history weighting and escalation logic" },
    ],
    activeVersion: 2,
    propertyIds: ["prop.hillside", "prop.jamison"],
    propertyVersionMap: { "prop.hillside": 2, "prop.jamison": 1 },
    triggers: ["Nightly at 2:00 AM", "On lease expiration (< 90 days)"],
    evals: [],
    lastRunAt: "2026-06-22T02:00:00Z",
    runsLast30d: 62,
    executionLog: [
      { id: "run-1a", runAt: "2026-06-22T02:00:00Z", version: 2, environment: "production", status: "success", durationMs: 14200, triggerSource: "Nightly at 2:00 AM", propertyId: "prop.hillside", stepsExecuted: 8, stepsTotal: 8, objectsModified: [
        { objectType: "lease", objectId: "L-4521", objectLabel: "Lease #4521 — Jane Smith, Unit 204B", action: "read" },
        { objectType: "lease", objectId: "L-4533", objectLabel: "Lease #4533 — Mark Johnson, Unit 112A", action: "read" },
        { objectType: "resident", objectId: "R-1102", objectLabel: "Jane Smith", action: "read" },
        { objectType: "renewal_offer", objectId: "RO-8821", objectLabel: "Renewal offer $1,990/mo — Jane Smith", action: "created" },
        { objectType: "message", objectId: "EM-3310", objectLabel: "Renewal offer email to jane.smith@email.com", action: "sent" },
      ]},
      { id: "run-1b", runAt: "2026-06-21T02:00:00Z", version: 2, environment: "production", status: "success", durationMs: 11800, triggerSource: "Nightly at 2:00 AM", propertyId: "prop.hillside", stepsExecuted: 8, stepsTotal: 8, objectsModified: [
        { objectType: "lease", objectId: "L-4510", objectLabel: "Lease #4510 — Sarah Chen, Unit 305A", action: "read" },
        { objectType: "resident", objectId: "R-1098", objectLabel: "Sarah Chen", action: "read" },
        { objectType: "renewal_offer", objectId: "RO-8819", objectLabel: "Renewal offer $2,100/mo — Sarah Chen", action: "created" },
        { objectType: "message", objectId: "EM-3308", objectLabel: "Renewal offer email to sarah.chen@email.com", action: "sent" },
      ]},
      { id: "run-1c", runAt: "2026-06-20T02:00:00Z", version: 2, environment: "production", status: "failure", durationMs: 3400, triggerSource: "Nightly at 2:00 AM", propertyId: "prop.jamison", stepsExecuted: 3, stepsTotal: 8, objectsModified: [
        { objectType: "lease", objectId: "L-4498", objectLabel: "Lease #4498 — Tom Wilson, Unit 101", action: "read" },
      ], errorMessage: "MCP timeout: renewals.get_market_rent failed after 30000ms" },
      { id: "run-1d", runAt: "2026-06-19T02:00:00Z", version: 2, environment: "production", status: "success", durationMs: 18900, triggerSource: "Nightly at 2:00 AM", propertyId: "prop.hillside", stepsExecuted: 8, stepsTotal: 8, objectsModified: [
        { objectType: "lease", objectId: "L-4488", objectLabel: "Lease #4488 — Mike Rivera, Unit 410", action: "read" },
        { objectType: "resident", objectId: "R-1085", objectLabel: "Mike Rivera", action: "read" },
        { objectType: "renewal_offer", objectId: "RO-8815", objectLabel: "Renewal offer $1,875/mo — Mike Rivera", action: "created" },
        { objectType: "message", objectId: "EM-3301", objectLabel: "Renewal offer email to mike.r@email.com", action: "sent" },
        { objectType: "resident", objectId: "R-1085", objectLabel: "Mike Rivera — escalation note added", action: "updated" },
      ]},
      { id: "run-1e", runAt: "2026-06-18T02:00:00Z", version: 1, environment: "production", status: "success", durationMs: 9200, triggerSource: "Nightly at 2:00 AM", propertyId: "prop.jamison", stepsExecuted: 6, stepsTotal: 6, objectsModified: [
        { objectType: "lease", objectId: "L-4475", objectLabel: "Lease #4475 — Lisa Park, Unit 202", action: "read" },
        { objectType: "renewal_offer", objectId: "RO-8810", objectLabel: "Renewal offer $1,650/mo — Lisa Park", action: "created" },
      ]},
    ],
    changeHistory: [
      { id: "ch-1a", timestamp: "2026-05-15T10:00:00Z", userId: "user-jdoe", userName: "John Doe", action: "created", summary: "Created agent with initial v1 configuration", versionAffected: 1 },
      { id: "ch-1b", timestamp: "2026-05-22T14:30:00Z", userId: "user-jdoe", userName: "John Doe", action: "properties_changed", summary: "Added Hillside Apartments to the agent", diff: [{ field: "propertyIds", from: "[]", to: "[prop.hillside]" }] },
      { id: "ch-1c", timestamp: "2026-06-01T14:30:00Z", userId: "user-asmith", userName: "Alice Smith", action: "version_added", summary: "Created v2 — added payment history weighting and escalation logic", versionAffected: 2 },
      { id: "ch-1d", timestamp: "2026-06-01T16:00:00Z", userId: "user-asmith", userName: "Alice Smith", action: "status_changed", summary: "Promoted v2 from sandbox to live", versionAffected: 2, diff: [{ field: "status", from: "sandbox", to: "live" }] },
      { id: "ch-1e", timestamp: "2026-06-10T09:15:00Z", userId: "user-jdoe", userName: "John Doe", action: "properties_changed", summary: "Added Jamison Park Residences, assigned to v1", diff: [{ field: "propertyIds", from: "[prop.hillside]", to: "[prop.hillside, prop.jamison]" }] },
      { id: "ch-1f", timestamp: "2026-06-15T11:00:00Z", userId: "user-asmith", userName: "Alice Smith", action: "config_changed", summary: "Updated escalation timeout from 5 days to 7 days", versionAffected: 2, diff: [{ field: "escalation_timeout_days", from: "5", to: "7" }] },
    ],
  },
  {
    id: "ua-2",
    name: "Invoice Anomaly Detector",
    type: "deterministic",
    description: "Monitors vendor invoices above $2,500, cross-references against historical pricing, flags anomalies for human review.",
    status: "sandbox",
    domain: "Accounting",
    createdAt: "2026-06-10T09:00:00Z",
    versions: [
      { id: "v1", versionNumber: 1, status: "sandbox", createdAt: "2026-06-10T09:00:00Z", description: "Initial build — threshold-based detection" },
    ],
    activeVersion: 1,
    propertyIds: [],
    propertyVersionMap: {},
    triggers: ["On new invoice received"],
    evals: [],
    runsLast30d: 0,
    executionLog: [],
    changeHistory: [
      { id: "ch-2a", timestamp: "2026-06-10T09:00:00Z", userId: "user-bwong", userName: "Brian Wong", action: "created", summary: "Created Invoice Anomaly Detector agent", versionAffected: 1 },
    ],
  },
  {
    id: "ua-3",
    name: "Resident Inquiry Agent",
    type: "ai-powered",
    description: "Conversational AI that handles resident questions about leases, payments, maintenance requests, and community policies via chat and SMS.",
    status: "live",
    domain: "Communications",
    createdAt: "2026-05-20T11:00:00Z",
    versions: [
      { id: "v1", versionNumber: 1, status: "retired", createdAt: "2026-05-20T11:00:00Z", description: "Initial — basic Q&A with lease and payment data" },
      { id: "v2", versionNumber: 2, status: "retired", createdAt: "2026-06-05T09:00:00Z", description: "Added maintenance request creation via MCP" },
      { id: "v3", versionNumber: 3, status: "live", createdAt: "2026-06-18T16:00:00Z", description: "Added community policy knowledge base and escalation rules" },
    ],
    activeVersion: 3,
    propertyIds: ["prop.hillside", "prop.jamison", "prop.oakmont"],
    propertyVersionMap: { "prop.hillside": 3, "prop.jamison": 3, "prop.oakmont": 2 },
    triggers: ["Inbound SMS", "Inbound chat"],
    evals: [],
    lastRunAt: "2026-06-22T15:42:00Z",
    runsLast30d: 1847,
    executionLog: [
      { id: "run-3a", runAt: "2026-06-22T15:42:00Z", version: 3, environment: "production", status: "success", durationMs: 2100, triggerSource: "Inbound SMS", propertyId: "prop.hillside", stepsExecuted: 4, stepsTotal: 4, llmTokensUsed: 1840, costUsd: 0.012, objectsModified: [
        { objectType: "resident", objectId: "R-1102", objectLabel: "Jane Smith — identity verified", action: "read" },
        { objectType: "lease", objectId: "L-4521", objectLabel: "Lease #4521 — balance lookup", action: "read" },
        { objectType: "message", objectId: "SMS-9921", objectLabel: "Balance response to +1-555-0142", action: "sent" },
      ]},
      { id: "run-3b", runAt: "2026-06-22T14:18:00Z", version: 3, environment: "production", status: "success", durationMs: 3800, triggerSource: "Inbound chat", propertyId: "prop.jamison", stepsExecuted: 6, stepsTotal: 6, llmTokensUsed: 3200, costUsd: 0.022, objectsModified: [
        { objectType: "resident", objectId: "R-2045", objectLabel: "David Kim — identity verified", action: "read" },
        { objectType: "work_order", objectId: "WO-7892", objectLabel: "Work order — leaking faucet, Unit 311", action: "created" },
        { objectType: "message", objectId: "CHAT-441", objectLabel: "Work order confirmation to David Kim", action: "sent" },
      ]},
      { id: "run-3c", runAt: "2026-06-22T11:05:00Z", version: 3, environment: "production", status: "success", durationMs: 1500, triggerSource: "Inbound SMS", propertyId: "prop.hillside", stepsExecuted: 3, stepsTotal: 3, llmTokensUsed: 980, costUsd: 0.006, objectsModified: [
        { objectType: "resident", objectId: "R-1098", objectLabel: "Sarah Chen", action: "read" },
        { objectType: "message", objectId: "SMS-9918", objectLabel: "Pet policy response to +1-555-0199", action: "sent" },
      ]},
      { id: "run-3d", runAt: "2026-06-22T09:30:00Z", version: 2, environment: "production", status: "failure", durationMs: 8200, triggerSource: "Inbound chat", propertyId: "prop.oakmont", stepsExecuted: 2, stepsTotal: 5, llmTokensUsed: 2400, costUsd: 0.016, objectsModified: [
        { objectType: "resident", objectId: "R-3011", objectLabel: "Amy Torres", action: "read" },
      ], errorMessage: "LLM response exceeded safety threshold — escalated to human agent" },
      { id: "run-3e", runAt: "2026-06-21T19:10:00Z", version: 3, environment: "production", status: "success", durationMs: 2900, triggerSource: "Inbound SMS", propertyId: "prop.hillside", stepsExecuted: 5, stepsTotal: 5, llmTokensUsed: 2100, costUsd: 0.014, objectsModified: [
        { objectType: "resident", objectId: "R-1085", objectLabel: "Mike Rivera", action: "read" },
        { objectType: "lease", objectId: "L-4488", objectLabel: "Lease renewal status lookup", action: "read" },
        { objectType: "message", objectId: "SMS-9910", objectLabel: "Renewal status response to +1-555-0177", action: "sent" },
      ]},
    ],
    changeHistory: [
      { id: "ch-3a", timestamp: "2026-05-20T11:00:00Z", userId: "user-jdoe", userName: "John Doe", action: "created", summary: "Created Resident Inquiry Agent with basic Q&A capabilities", versionAffected: 1 },
      { id: "ch-3b", timestamp: "2026-05-28T10:00:00Z", userId: "user-jdoe", userName: "John Doe", action: "properties_changed", summary: "Added Hillside Apartments and Jamison Park", diff: [{ field: "propertyIds", from: "[]", to: "[prop.hillside, prop.jamison]" }] },
      { id: "ch-3c", timestamp: "2026-06-05T09:00:00Z", userId: "user-asmith", userName: "Alice Smith", action: "version_added", summary: "Created v2 — added maintenance request creation via MCP", versionAffected: 2 },
      { id: "ch-3d", timestamp: "2026-06-12T14:00:00Z", userId: "user-jdoe", userName: "John Doe", action: "properties_changed", summary: "Added Oakmont Towers on v2", diff: [{ field: "propertyIds", from: "[prop.hillside, prop.jamison]", to: "[prop.hillside, prop.jamison, prop.oakmont]" }] },
      { id: "ch-3e", timestamp: "2026-06-18T16:00:00Z", userId: "user-asmith", userName: "Alice Smith", action: "version_added", summary: "Created v3 — added community policy knowledge base and escalation rules", versionAffected: 3 },
      { id: "ch-3f", timestamp: "2026-06-18T17:30:00Z", userId: "user-asmith", userName: "Alice Smith", action: "status_changed", summary: "Promoted v3 to live for Hillside and Jamison", versionAffected: 3, diff: [{ field: "status", from: "sandbox", to: "live" }] },
      { id: "ch-3g", timestamp: "2026-06-20T09:00:00Z", userId: "user-jdoe", userName: "John Doe", action: "evals_changed", summary: "Added 5 evaluation cases for edge-case testing" },
    ],
  },
  {
    id: "ua-4",
    name: "After-Hours Maintenance Triage",
    type: "ai-powered",
    description: "Handles after-hours maintenance calls, classifies urgency, dispatches emergency vendors for critical issues, and logs non-urgent requests for next business day.",
    status: "paused",
    domain: "Maintenance",
    createdAt: "2026-06-08T13:00:00Z",
    versions: [
      { id: "v1", versionNumber: 1, status: "live", createdAt: "2026-06-08T13:00:00Z", description: "Voice + SMS triage with vendor dispatch" },
    ],
    activeVersion: 1,
    propertyIds: ["prop.hillside"],
    propertyVersionMap: { "prop.hillside": 1 },
    triggers: ["Inbound voice (after 6 PM)"],
    evals: [],
    lastRunAt: "2026-06-20T23:15:00Z",
    runsLast30d: 34,
    executionLog: [
      { id: "run-4a", runAt: "2026-06-20T23:15:00Z", version: 1, environment: "production", status: "success", durationMs: 45000, triggerSource: "Inbound voice", propertyId: "prop.hillside", stepsExecuted: 7, stepsTotal: 7, llmTokensUsed: 4200, costUsd: 0.028, objectsModified: [
        { objectType: "resident", objectId: "R-1102", objectLabel: "Jane Smith — identity verified via phone", action: "read" },
        { objectType: "work_order", objectId: "WO-7901", objectLabel: "Emergency work order — water heater burst, Unit 204B", action: "created" },
        { objectType: "work_order", objectId: "WO-7901", objectLabel: "Assigned to ABC Plumbing (emergency dispatch)", action: "updated" },
        { objectType: "message", objectId: "SMS-9925", objectLabel: "Emergency confirmation to +1-555-0142", action: "sent" },
        { objectType: "message", objectId: "SMS-9926", objectLabel: "Dispatch notice to ABC Plumbing", action: "sent" },
      ]},
      { id: "run-4b", runAt: "2026-06-19T21:45:00Z", version: 1, environment: "production", status: "success", durationMs: 22000, triggerSource: "Inbound voice", propertyId: "prop.hillside", stepsExecuted: 5, stepsTotal: 7, llmTokensUsed: 2800, costUsd: 0.019, objectsModified: [
        { objectType: "resident", objectId: "R-1085", objectLabel: "Mike Rivera", action: "read" },
        { objectType: "work_order", objectId: "WO-7898", objectLabel: "Non-urgent work order — A/C filter, Unit 410", action: "created" },
        { objectType: "message", objectId: "SMS-9920", objectLabel: "Next-day confirmation to +1-555-0177", action: "sent" },
      ]},
    ],
    changeHistory: [
      { id: "ch-4a", timestamp: "2026-06-08T13:00:00Z", userId: "user-bwong", userName: "Brian Wong", action: "created", summary: "Created After-Hours Maintenance Triage agent", versionAffected: 1 },
      { id: "ch-4b", timestamp: "2026-06-09T10:00:00Z", userId: "user-bwong", userName: "Brian Wong", action: "properties_changed", summary: "Added Hillside Apartments", diff: [{ field: "propertyIds", from: "[]", to: "[prop.hillside]" }] },
      { id: "ch-4c", timestamp: "2026-06-09T15:00:00Z", userId: "user-bwong", userName: "Brian Wong", action: "status_changed", summary: "Promoted from sandbox to live", diff: [{ field: "status", from: "sandbox", to: "live" }] },
      { id: "ch-4d", timestamp: "2026-06-21T08:00:00Z", userId: "user-jdoe", userName: "John Doe", action: "status_changed", summary: "Paused agent — reviewing emergency dispatch accuracy", diff: [{ field: "status", from: "live", to: "paused" }] },
    ],
  },
];

// ─── Style maps ───

const STATUS_STYLE: Record<AgentStatusValue, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700" },
  sandbox: { label: "Sandbox", className: "bg-amber-100 text-amber-800" },
  live: { label: "Live", className: "bg-emerald-100 text-emerald-800" },
  paused: { label: "Paused", className: "bg-slate-200 text-slate-600" },
};

const TYPE_STYLE: Record<AgentType, { label: string; icon: typeof Workflow; className: string }> = {
  deterministic: { label: "Workflow", icon: Workflow, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "ai-powered": { label: "AI Agent", icon: BrainCircuit, className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
};

function propertyName(id: string): string {
  return PMC_PROPERTY_RECORDS.find((p) => p.id === id)?.name ?? id;
}

// ─── Build animation ───

const BUILD_PHASE_STEPS = [
  { key: "analyzing", label: "Analyzing requirements", duration: 1200 },
  { key: "mapping", label: "Identifying MCP connectors & data sources", duration: 1500 },
  { key: "generating", label: "Generating workflow graph", duration: 2000 },
  { key: "validating", label: "Validating against guardrails", duration: 1200 },
  { key: "compiling", label: "Compiling deterministic logic", duration: 800 },
] as const;

type DeterministicPhase = "describing" | "building" | "built";

// Re-export workflow visualizer types for the built phase
type BuiltWorkflowNode = {
  id: string;
  type: "trigger" | "condition" | "action" | "loop" | "delay" | "end";
  label: string;
  description: string;
  mcpTool?: string;
  mcpServer?: string;
  config?: Record<string, string>;
};
type BuiltWorkflowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
};
type BuiltWorkflow = {
  name: string;
  description: string;
  triggers: string[];
  dataSources: string[];
  nodes: BuiltWorkflowNode[];
  edges: BuiltWorkflowEdge[];
};

// ─── Modal step types ───

type ModalStep =
  | { kind: "type-select" }
  | { kind: "deterministic"; forkFrom?: UnifiedAgent }
  | { kind: "ai-powered"; forkFrom?: UnifiedAgent };

// ─── Property Picker ───

function PropertyPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = PMC_PROPERTY_RECORDS.filter((p) =>
    `${p.name} ${p.city} ${p.state}`.toLowerCase().includes(search.toLowerCase())
  );
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search properties..."
          className="w-full rounded-md border border-border bg-white py-1.5 pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
        />
      </div>
      <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-md border border-border p-1">
        {filtered.map((p) => {
          const isSelected = selected.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] transition-colors ${
                isSelected ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"
              }`}
            >
              <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                isSelected ? "border-primary bg-primary text-white" : "border-border"
              }`}>
                {isSelected && <Check className="h-3 w-3" />}
              </div>
              <span className="flex-1 truncate">{p.name}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{p.city}, {p.state}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">No properties match &quot;{search}&quot;</p>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">{selected.length} of {PMC_PROPERTY_RECORDS.length} properties selected</p>
    </div>
  );
}

// ─── Agent Detail Panel (editable) ───

function AgentDetailPanel({
  agent,
  onUpdate,
  onClose,
  onNewVersion,
  onEditVersion,
}: {
  agent: UnifiedAgent;
  onUpdate: (patch: Partial<UnifiedAgent>) => void;
  onClose: () => void;
  onNewVersion: () => void;
  onEditVersion: (versionNumber: number) => void;
}) {
  const typeInfo = TYPE_STYLE[agent.type];
  const TypeIcon = typeInfo.icon;
  const statusInfo = STATUS_STYLE[agent.status];

  const [editingField, setEditingField] = useState<"name" | "description" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);

  const latestVersion = Math.max(...agent.versions.map((v) => v.versionNumber));
  const [newPropertyVersion, setNewPropertyVersion] = useState(latestVersion);

  const startEdit = (field: "name" | "description") => {
    setEditValue(field === "name" ? agent.name : agent.description);
    setEditingField(field);
  };
  const saveEdit = () => {
    if (!editingField) return;
    const trimmed = editValue.trim();
    if (!trimmed) { setEditingField(null); return; }
    onUpdate({ [editingField]: trimmed });
    setEditingField(null);
  };

  const toggleStatus = () => {
    const next: AgentStatusValue = agent.status === "live" ? "paused" : "live";
    onUpdate({ status: next });
  };

  return (
    <div className="flex max-h-[85vh] flex-col">
      {/* Header — fixed */}
      <div className="flex items-start justify-between gap-3 px-6 pb-3 pt-6">
        <div className="min-w-0 flex-1">
          {editingField === "name" ? (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingField(null); }}
                className="h-8 text-lg font-semibold"
              />
              <Button size="sm" variant="ghost" onClick={saveEdit} className="h-7 w-7 p-0"><Check className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingField(null)} className="h-7 w-7 p-0"><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <button type="button" onClick={() => startEdit("name")} className="group flex items-center gap-2 text-left">
              <h2 className="text-lg font-semibold text-foreground">{agent.name}</h2>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${typeInfo.className}`}>
              <TypeIcon className="h-3 w-3" /> {typeInfo.label}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              v{agent.activeVersion}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {(agent.status === "live" || agent.status === "paused") && (
            <button
              type="button"
              onClick={toggleStatus}
              title={agent.status === "live" ? "Pause agent" : "Resume agent"}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            >
              {agent.status === "live" ? <ToggleRight className="h-5 w-5 text-emerald-600" /> : <ToggleLeft className="h-5 w-5" />}
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-6">
        {/* Description */}
        {editingField === "description" ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-border px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit} className="h-7 text-[11px]">Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingField(null)} className="h-7 text-[11px]">Cancel</Button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => startEdit("description")} className="group w-full text-left">
            <p className="text-sm text-muted-foreground">{agent.description}</p>
            <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100">
              <Pencil className="h-3 w-3" /> Click to edit
            </span>
          </button>
        )}

        {/* Triggers */}
        {agent.triggers.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Triggers</h4>
            <div className="flex flex-wrap gap-1.5">
              {agent.triggers.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-foreground">
                  <Zap className="h-3 w-3 text-amber-500" /> {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Properties */}
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Properties ({agent.propertyIds.length})
            </h4>
            <button
              type="button"
              onClick={() => setShowPropertyPicker(!showPropertyPicker)}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10"
            >
              <Pencil className="h-3 w-3" /> {showPropertyPicker ? "Done" : "Edit"}
            </button>
          </div>
          {showPropertyPicker ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-2">
                <span className="text-[11px] font-medium text-muted-foreground">Assign new properties to:</span>
                <select
                  value={newPropertyVersion}
                  onChange={(e) => setNewPropertyVersion(Number(e.target.value))}
                  className="h-6 rounded border border-border bg-white px-1.5 text-[11px] font-medium text-foreground"
                >
                  {[...agent.versions].reverse().map((v) => (
                    <option key={v.versionNumber} value={v.versionNumber}>
                      v{v.versionNumber} — {v.description.slice(0, 40)}{v.description.length > 40 ? "..." : ""} ({v.status})
                    </option>
                  ))}
                </select>
              </div>
              <PropertyPicker
                selected={agent.propertyIds}
                onChange={(ids) => {
                  const newMap = { ...agent.propertyVersionMap };
                  for (const pid of ids) {
                    if (!newMap[pid]) newMap[pid] = newPropertyVersion;
                  }
                  for (const pid of Object.keys(newMap)) {
                    if (!ids.includes(pid)) delete newMap[pid];
                  }
                  onUpdate({ propertyIds: ids, propertyVersionMap: newMap });
                }}
              />
            </div>
          ) : agent.propertyIds.length > 0 ? (
            <ul className="space-y-1.5">
              {agent.propertyIds.map((pid) => {
                const assignedV = agent.propertyVersionMap[pid] ?? agent.activeVersion;
                const liveVersions = agent.versions.filter((v) => v.status === "live" || v.status === "sandbox");
                return (
                  <li key={pid} className="flex items-center justify-between gap-2 text-[12px] text-foreground">
                    <span className="flex items-center gap-1.5 min-w-0 truncate">
                      <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" /> {propertyName(pid)}
                    </span>
                    {liveVersions.length > 1 ? (
                      <select
                        value={assignedV}
                        onChange={(e) => {
                          const nextMap = { ...agent.propertyVersionMap, [pid]: Number(e.target.value) };
                          onUpdate({ propertyVersionMap: nextMap });
                        }}
                        className="h-6 shrink-0 rounded border border-border bg-white px-1.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {liveVersions.map((v) => (
                          <option key={v.versionNumber} value={v.versionNumber}>v{v.versionNumber}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        v{assignedV}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-2 text-center text-[11px] text-muted-foreground">
              No properties assigned.{" "}
              <button type="button" onClick={() => setShowPropertyPicker(true)} className="text-primary underline">Add properties</button>
            </p>
          )}
        </div>

        {/* Versions */}
        <div className="rounded-lg border border-border bg-white p-3">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <GitBranch className="mr-1 inline h-3 w-3" /> Versions
            </h4>
            <Button size="sm" variant="outline" onClick={onNewVersion} className="h-7 text-[11px]">
              <Plus className="mr-1 h-3 w-3" /> New Version
            </Button>
          </div>
          <div className="space-y-2">
            {[...agent.versions].reverse().map((v) => {
              const isActive = v.versionNumber === agent.activeVersion;
              const propsOnVersion = agent.propertyIds.filter(
                (pid) => (agent.propertyVersionMap[pid] ?? agent.activeVersion) === v.versionNumber
              );
              return (
                <div
                  key={v.id}
                  className={`rounded-lg border px-3 py-2 ${
                    isActive ? "border-emerald-200 bg-emerald-50/50" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      isActive ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      v{v.versionNumber}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-foreground">{v.description}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(v.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEditVersion(v.versionNumber); }}
                      className="shrink-0 rounded border border-border px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/10"
                    >
                      <Pencil className="inline mr-0.5 h-3 w-3" /> Edit
                    </button>
                    <Badge variant="outline" className={`shrink-0 rounded-full text-[9px] ${
                      v.status === "live" ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : v.status === "sandbox" ? "border-amber-300 bg-amber-50 text-amber-700"
                      : v.status === "retired" ? "border-slate-200 bg-slate-50 text-slate-500"
                      : "border-border"
                    }`}>
                      {v.status}
                    </Badge>
                  </div>
                  {propsOnVersion.length > 0 && (
                    <div className="ml-9 mt-1.5 flex flex-wrap items-center gap-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {propsOnVersion.length} {propsOnVersion.length === 1 ? "property" : "properties"}:
                      </span>
                      {propsOnVersion.map((pid) => (
                        <span key={pid} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-700">
                          {propertyName(pid)}
                        </span>
                      ))}
                    </div>
                  )}
                  {propsOnVersion.length === 0 && v.status !== "retired" && v.status !== "draft" && (
                    <p className="ml-9 mt-1 text-[10px] italic text-muted-foreground">No properties using this version</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Evals */}
        <AgentEvalsSection agent={agent} onUpdate={onUpdate} />

        {/* Execution Log */}
        <AgentExecutionLog agent={agent} />

        {/* Change History */}
        <AgentChangeHistory agent={agent} />

        {/* Run stats */}
        {agent.runsLast30d !== undefined && (
          <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-3">
            <div>
              <p className="text-xl font-semibold text-foreground">{agent.runsLast30d.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Runs (last 30 days)</p>
            </div>
            {agent.lastRunAt && (
              <div className="border-l border-border pl-4">
                <p className="text-sm font-medium text-foreground">
                  {new Date(agent.lastRunAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
                <p className="text-[10px] text-muted-foreground">Last run</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Execution Log section ───

const OBJECT_TYPE_STYLE: Record<ObjectTrace["objectType"], { label: string; color: string }> = {
  resident: { label: "Resident", color: "bg-blue-100 text-blue-700" },
  lead: { label: "Lead", color: "bg-cyan-100 text-cyan-700" },
  lease: { label: "Lease", color: "bg-indigo-100 text-indigo-700" },
  work_order: { label: "Work Order", color: "bg-amber-100 text-amber-700" },
  invoice: { label: "Invoice", color: "bg-orange-100 text-orange-700" },
  unit: { label: "Unit", color: "bg-emerald-100 text-emerald-700" },
  property: { label: "Property", color: "bg-teal-100 text-teal-700" },
  renewal_offer: { label: "Renewal", color: "bg-purple-100 text-purple-700" },
  message: { label: "Message", color: "bg-pink-100 text-pink-700" },
};

const ACTION_STYLE: Record<ObjectTrace["action"], { label: string; color: string }> = {
  read: { label: "Read", color: "text-gray-500" },
  created: { label: "Created", color: "text-emerald-600" },
  updated: { label: "Updated", color: "text-amber-600" },
  deleted: { label: "Deleted", color: "text-red-600" },
  sent: { label: "Sent", color: "text-indigo-600" },
};

function AgentExecutionLog({ agent }: { agent: UnifiedAgent }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | ExecutionLogEntry["status"]>("all");

  const logs = filterStatus === "all"
    ? agent.executionLog
    : agent.executionLog.filter((l) => l.status === filterStatus);

  const stats = useMemo(() => {
    const total = agent.executionLog.length;
    const successes = agent.executionLog.filter((l) => l.status === "success").length;
    const failures = agent.executionLog.filter((l) => l.status === "failure").length;
    const totalObjects = agent.executionLog.reduce((sum, l) => sum + l.objectsModified.length, 0);
    const writeOps = agent.executionLog.reduce((sum, l) => sum + l.objectsModified.filter((o) => o.action !== "read").length, 0);
    const avgDuration = total > 0 ? Math.round(agent.executionLog.reduce((s, l) => s + l.durationMs, 0) / total) : 0;
    const totalCost = agent.executionLog.reduce((s, l) => s + (l.costUsd ?? 0), 0);
    return { total, successes, failures, totalObjects, writeOps, avgDuration, totalCost };
  }, [agent.executionLog]);

  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <button type="button" onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-1">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Activity className="mr-1 inline h-3 w-3" /> Execution Log ({agent.executionLog.length})
        </h4>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Stats summary */}
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-center">
              <p className="text-base font-semibold text-foreground">{stats.total}</p>
              <p className="text-[9px] text-muted-foreground">Total Runs</p>
            </div>
            <div className="rounded-lg bg-emerald-50 px-2.5 py-2 text-center">
              <p className="text-base font-semibold text-emerald-700">{stats.successes}</p>
              <p className="text-[9px] text-emerald-600">Success</p>
            </div>
            <div className="rounded-lg bg-red-50 px-2.5 py-2 text-center">
              <p className="text-base font-semibold text-red-700">{stats.failures}</p>
              <p className="text-[9px] text-red-600">Failed</p>
            </div>
            <div className="rounded-lg bg-indigo-50 px-2.5 py-2 text-center">
              <p className="text-base font-semibold text-indigo-700">{stats.writeOps}</p>
              <p className="text-[9px] text-indigo-600">Write Ops</p>
            </div>
          </div>

          {stats.totalCost > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-slate-50 px-3 py-2 text-[11px]">
              <span className="text-muted-foreground">Avg duration: <strong className="text-foreground">{(stats.avgDuration / 1000).toFixed(1)}s</strong></span>
              <span className="text-muted-foreground">Total LLM cost: <strong className="text-foreground">${stats.totalCost.toFixed(3)}</strong></span>
            </div>
          )}

          {/* Status filter */}
          <div className="flex gap-1">
            {(["all", "success", "failure", "timeout", "partial"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  filterStatus === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Log entries */}
          {logs.length === 0 ? (
            <p className="py-3 text-center text-[11px] text-muted-foreground">
              {agent.executionLog.length === 0 ? "No executions yet." : "No runs match this filter."}
            </p>
          ) : (
            <div className="max-h-72 space-y-1.5 overflow-y-auto">
              {logs.map((run) => {
                const isExpanded = expandedRunId === run.id;
                return (
                  <div key={run.id} className={`rounded-lg border transition-colors ${run.status === "failure" ? "border-red-200 bg-red-50/30" : "border-border"}`}>
                    <button
                      type="button"
                      onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left"
                    >
                      {run.status === "success" ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        : run.status === "failure" ? <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                        : <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-foreground">
                            {new Date(run.runAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </span>
                          <span className="rounded bg-slate-100 px-1 py-px text-[9px] font-medium text-slate-600">v{run.version}</span>
                          <span className={`rounded px-1 py-px text-[9px] font-bold uppercase ${
                            run.environment === "production" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {run.environment}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>{run.triggerSource}</span>
                          <span>{run.stepsExecuted}/{run.stepsTotal} steps</span>
                          <span>{(run.durationMs / 1000).toFixed(1)}s</span>
                          {run.objectsModified.length > 0 && (
                            <span className="font-medium text-indigo-600">{run.objectsModified.length} objects</span>
                          )}
                          {run.costUsd != null && run.costUsd > 0 && (
                            <span>${run.costUsd.toFixed(3)}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </button>

                    {isExpanded && (
                      <div className="border-t border-dashed border-gray-200 px-3 py-2.5">
                        {run.errorMessage && (
                          <div className="mb-2 rounded bg-red-100 px-2.5 py-1.5 text-[10px] font-medium text-red-700">
                            {run.errorMessage}
                          </div>
                        )}
                        {run.propertyId && (
                          <p className="mb-2 text-[10px] text-muted-foreground">
                            <Building2 className="mr-0.5 inline h-3 w-3" /> {propertyName(run.propertyId)}
                          </p>
                        )}
                        {run.llmTokensUsed != null && (
                          <p className="mb-2 text-[10px] text-muted-foreground">
                            LLM tokens: {run.llmTokensUsed.toLocaleString()} &middot; Cost: ${(run.costUsd ?? 0).toFixed(4)}
                          </p>
                        )}
                        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">Objects Accessed / Modified</p>
                        <div className="space-y-1">
                          {run.objectsModified.map((obj, i) => {
                            const otStyle = OBJECT_TYPE_STYLE[obj.objectType];
                            const aStyle = ACTION_STYLE[obj.action];
                            return (
                              <div key={i} className="flex items-center gap-2 rounded bg-white px-2 py-1.5">
                                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase ${otStyle.color}`}>
                                  {otStyle.label}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-[10px] text-foreground">{obj.objectLabel}</span>
                                <span className={`shrink-0 text-[9px] font-semibold ${aStyle.color}`}>{aStyle.label}</span>
                              </div>
                            );
                          })}
                          {run.objectsModified.length === 0 && (
                            <p className="text-[10px] italic text-muted-foreground">No objects accessed</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Change History section ───

const CHANGE_ACTION_STYLE: Record<ChangeHistoryEntry["action"], { label: string; icon: typeof History; color: string }> = {
  created: { label: "Created", icon: Plus, color: "text-emerald-600 bg-emerald-100" },
  updated: { label: "Updated", icon: Pencil, color: "text-blue-600 bg-blue-100" },
  version_added: { label: "Version Added", icon: GitBranch, color: "text-indigo-600 bg-indigo-100" },
  status_changed: { label: "Status Changed", icon: ToggleRight, color: "text-amber-600 bg-amber-100" },
  properties_changed: { label: "Properties Changed", icon: Building2, color: "text-teal-600 bg-teal-100" },
  config_changed: { label: "Config Changed", icon: Cog, color: "text-purple-600 bg-purple-100" },
  evals_changed: { label: "Evals Changed", icon: FlaskConical, color: "text-pink-600 bg-pink-100" },
};

function AgentChangeHistory({ agent }: { agent: UnifiedAgent }) {
  const [expanded, setExpanded] = useState(false);

  const sortedHistory = [...agent.changeHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <button type="button" onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-1">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <History className="mr-1 inline h-3 w-3" /> Change History ({agent.changeHistory.length})
        </h4>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-3">
          {sortedHistory.length === 0 ? (
            <p className="py-3 text-center text-[11px] text-muted-foreground">No changes recorded.</p>
          ) : (
            <div className="relative max-h-64 overflow-y-auto">
              {/* Timeline line */}
              <div className="absolute left-[13px] top-0 bottom-0 w-px bg-gray-200" />

              <div className="space-y-0">
                {sortedHistory.map((entry, idx) => {
                  const style = CHANGE_ACTION_STYLE[entry.action];
                  const ActionIcon = style.icon;
                  const isLast = idx === sortedHistory.length - 1;

                  return (
                    <div key={entry.id} className="relative flex gap-3 pb-3">
                      {/* Timeline dot */}
                      <div className={`relative z-10 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full ${style.color}`}>
                        <ActionIcon className="h-3 w-3" />
                      </div>

                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-foreground">{entry.summary}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <User className="h-2.5 w-2.5" /> {entry.userName}
                          </span>
                          <span>&middot;</span>
                          <span>
                            {new Date(entry.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                          </span>
                          {entry.versionAffected != null && (
                            <>
                              <span>&middot;</span>
                              <span className="rounded bg-slate-100 px-1 py-px text-[9px] font-medium text-slate-600">v{entry.versionAffected}</span>
                            </>
                          )}
                        </div>

                        {entry.diff && entry.diff.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {entry.diff.map((d, di) => (
                              <div key={di} className="flex items-center gap-1.5 text-[10px]">
                                <span className="font-mono text-muted-foreground">{d.field}:</span>
                                <span className="rounded bg-red-50 px-1 py-px font-mono text-red-600 line-through">{d.from}</span>
                                <span className="text-gray-400">&rarr;</span>
                                <span className="rounded bg-emerald-50 px-1 py-px font-mono text-emerald-600">{d.to}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Evals section inside detail panel ───

function AgentEvalsSection({
  agent,
  onUpdate,
}: {
  agent: UnifiedAgent;
  onUpdate: (patch: Partial<UnifiedAgent>) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<(SimpleEval & { _accepted?: boolean; _rejected?: boolean })[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInput, setFormInput] = useState("");
  const [formExpected, setFormExpected] = useState("");
  const [formSeverity, setFormSeverity] = useState<"critical" | "major" | "minor">("major");
  const [formTags, setFormTags] = useState("");

  const [evalSource, setEvalSource] = useState<"llm" | "fallback" | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { generateEvalsForAgent } = await import("@/lib/eval-generator");
      const result = await generateEvalsForAgent({
        name: agent.name,
        description: agent.description,
        type: agent.type,
        triggers: agent.triggers.length > 0 ? agent.triggers : undefined,
      });
      setSuggestions(result.evals.map((e) => ({ ...e, _accepted: false, _rejected: false })));
      setEvalSource(result.source);
    } catch (err) {
      console.error("Eval generation failed:", err);
    } finally {
      setGenerating(false);
      setExpanded(true);
    }
  };

  const acceptSuggestion = (id: string) =>
    setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, _accepted: true, _rejected: false } : s));
  const rejectSuggestion = (id: string) =>
    setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, _rejected: true, _accepted: false } : s));
  const acceptAll = () =>
    setSuggestions((prev) => prev.map((s) => s._rejected ? s : { ...s, _accepted: true }));
  const commitAccepted = () => {
    const accepted = suggestions.filter((s) => s._accepted);
    const cleaned: SimpleEval[] = accepted.map(({ _accepted, _rejected, ...rest }) => rest);
    onUpdate({ evals: [...agent.evals, ...cleaned] });
    setSuggestions([]);
  };

  const removeEval = (id: string) => {
    onUpdate({ evals: agent.evals.filter((e) => e.id !== id) });
  };

  const resetForm = () => {
    setFormInput(""); setFormExpected(""); setFormSeverity("major"); setFormTags("");
    setEditingId(null); setShowForm(false);
  };

  const startAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (ev: SimpleEval) => {
    setFormInput(ev.input);
    setFormExpected(ev.expected);
    setFormSeverity(ev.severity);
    setFormTags(ev.tags.join(", "));
    setEditingId(ev.id);
    setShowForm(true);
  };

  const saveForm = () => {
    const trimmedInput = formInput.trim();
    const trimmedExpected = formExpected.trim();
    if (!trimmedInput || !trimmedExpected) return;

    const tags = formTags.split(",").map((t) => t.trim()).filter(Boolean);
    if (editingId) {
      onUpdate({
        evals: agent.evals.map((e) =>
          e.id === editingId ? { ...e, input: trimmedInput, expected: trimmedExpected, severity: formSeverity, tags } : e
        ),
      });
    } else {
      const newEval: SimpleEval = {
        id: `eval-manual-${Date.now()}`,
        input: trimmedInput,
        expected: trimmedExpected,
        severity: formSeverity,
        tags,
        status: "not_run",
      };
      onUpdate({ evals: [...agent.evals, newEval] });
    }
    resetForm();
  };

  const acceptedCount = suggestions.filter((s) => s._accepted).length;
  const pendingCount = suggestions.filter((s) => !s._accepted && !s._rejected).length;
  const severityColor = (s: string) =>
    s === "critical" ? "bg-red-100 text-red-700" : s === "major" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600";

  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1"
        >
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <FlaskConical className="mr-1 inline h-3 w-3" /> Evals ({agent.evals.length})
          </h4>
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>
        {expanded && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); startAdd(); }}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10"
          >
            <Plus className="h-3 w-3" /> Add Eval
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Generate button */}
          {suggestions.length === 0 && !generating && (
            <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
              <Sparkles className="h-5 w-5 shrink-0 text-indigo-500" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-indigo-900">Auto-generate evals from this agent&apos;s description</p>
                <p className="text-[10px] text-indigo-600">An LLM will analyze the prompt and suggest test cases you can review.</p>
              </div>
              <Button size="sm" onClick={handleGenerate} className="shrink-0 bg-indigo-600 text-[11px] hover:bg-indigo-700">
                Generate
              </Button>
            </div>
          )}

          {/* Generating spinner */}
          {generating && (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-6">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <p className="text-[12px] font-medium text-indigo-700">Analyzing agent configuration and generating eval cases...</p>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-2 rounded-lg border-2 border-indigo-200 bg-indigo-50/30 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-indigo-800">
                  {suggestions.length} suggested evals
                  {evalSource && <span className="ml-1 font-normal text-indigo-500">({evalSource === "llm" ? "LLM-generated" : "template-based"})</span>}
                  {acceptedCount > 0 && <span className="ml-1 font-normal text-emerald-700">({acceptedCount} accepted)</span>}
                  {pendingCount > 0 && <span className="ml-1 font-normal text-muted-foreground">({pendingCount} pending)</span>}
                </p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={acceptAll} className="text-[10px] font-medium text-indigo-600 hover:underline">
                    Accept all
                  </button>
                  {acceptedCount > 0 && (
                    <Button size="sm" onClick={commitAccepted} className="h-6 bg-emerald-600 text-[10px] hover:bg-emerald-700">
                      Add {acceptedCount} to evals
                    </Button>
                  )}
                </div>
              </div>
              <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                {suggestions.map((s) => (
                  <li
                    key={s.id}
                    className={`flex items-start gap-2 rounded-md border px-2.5 py-2 text-[11px] ${
                      s._accepted ? "border-emerald-300 bg-emerald-50" : s._rejected ? "border-slate-200 bg-slate-50 opacity-50" : "border-border bg-white"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{s.input}</p>
                      <p className="mt-0.5 text-muted-foreground">{s.expected}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${severityColor(s.severity)}`}>
                          {s.severity}
                        </span>
                        {s.tags.map((t) => (
                          <span key={t} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600">{t}</span>
                        ))}
                      </div>
                    </div>
                    {!s._accepted && !s._rejected && (
                      <div className="flex shrink-0 gap-1">
                        <button type="button" onClick={() => acceptSuggestion(s.id)} className="rounded p-1 text-emerald-600 hover:bg-emerald-100" title="Accept">
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => rejectSuggestion(s.id)} className="rounded p-1 text-red-400 hover:bg-red-100" title="Reject">
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {s._accepted && <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Add / Edit form */}
          {showForm && (
            <div className="space-y-2 rounded-lg border-2 border-primary/30 bg-primary/5 p-3">
              <p className="text-[11px] font-semibold text-foreground">
                {editingId ? "Edit Eval" : "Add Eval"}
              </p>
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">Input / Scenario</label>
                <textarea
                  value={formInput}
                  onChange={(e) => setFormInput(e.target.value)}
                  rows={2}
                  placeholder="Describe the input or scenario to test..."
                  className="w-full resize-none rounded-md border border-border px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">Expected Outcome</label>
                <textarea
                  value={formExpected}
                  onChange={(e) => setFormExpected(e.target.value)}
                  rows={2}
                  placeholder="What should the agent do or respond with?"
                  className="w-full resize-none rounded-md border border-border px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">Severity</label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as "critical" | "major" | "minor")}
                    className="h-7 w-full rounded-md border border-border bg-white px-2 text-[11px] text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="critical">Critical</option>
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">Tags (comma-separated)</label>
                  <input
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="e.g. renewal, edge-case"
                    className="h-7 w-full rounded-md border border-border px-2 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" onClick={resetForm} className="h-7 text-[11px]">Cancel</Button>
                <Button
                  size="sm"
                  onClick={saveForm}
                  disabled={!formInput.trim() || !formExpected.trim()}
                  className="h-7 text-[11px]"
                >
                  {editingId ? "Save Changes" : "Add Eval"}
                </Button>
              </div>
            </div>
          )}

          {/* Existing evals */}
          {agent.evals.length > 0 && (
            <div className="space-y-1.5">
              {agent.evals.map((ev) => (
                <div key={ev.id} className="flex items-start gap-2 rounded-md border border-border px-2.5 py-2 text-[11px]">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{ev.input}</p>
                    <p className="mt-0.5 text-muted-foreground">{ev.expected}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${severityColor(ev.severity)}`}>
                        {ev.severity}
                      </span>
                      {ev.tags.map((t) => (
                        <span key={t} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <button type="button" onClick={() => startEdit(ev)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Edit">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button type="button" onClick={() => removeEval(ev.id)} className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500" title="Remove">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {agent.evals.length === 0 && suggestions.length === 0 && !generating && !showForm && (
            <p className="py-2 text-center text-[11px] text-muted-foreground">
              No evals yet. Generate from agent description or{" "}
              <button type="button" onClick={startAdd} className="text-primary underline">add manually</button>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Deterministic Builder (inside modal) ───

function DeterministicBuilderModal({
  onComplete,
  onBack,
  forkFrom,
}: {
  onComplete: (agent: Omit<UnifiedAgent, "id" | "createdAt" | "lastRunAt" | "runsLast30d" | "executionLog" | "changeHistory">) => void;
  onBack: () => void;
  forkFrom?: UnifiedAgent;
}) {
  const isForking = !!forkFrom;
  const nextVersion = forkFrom ? Math.max(...forkFrom.versions.map((v) => v.versionNumber)) + 1 : 1;

  const [phase, setPhase] = useState<DeterministicPhase>("describing");
  const [agentName, setAgentName] = useState(forkFrom?.name ?? "");
  const [prompt, setPrompt] = useState(forkFrom?.description ?? "");
  const [versionNote, setVersionNote] = useState(isForking ? "" : "");
  const [buildStep, setBuildStep] = useState(0);
  const [builtWorkflow, setBuiltWorkflow] = useState<BuiltWorkflow | null>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "running" | "passed">("idle");
  const [testEnv, setTestEnv] = useState<"sandbox" | "production">("sandbox");
  const [selectedProperties, setSelectedProperties] = useState<string[]>(forkFrom?.propertyIds ?? []);
  const [llmSource, setLlmSource] = useState<"llm" | "fallback" | null>(null);

  const handleBuild = async () => {
    if (!prompt.trim() || !agentName.trim()) return;
    setPhase("building");
    setBuildStep(0);

    let step = 0;
    const advanceUI = () => new Promise<void>((resolve) => {
      const tick = () => {
        step++;
        if (step < BUILD_PHASE_STEPS.length) {
          setBuildStep(step);
          setTimeout(tick, BUILD_PHASE_STEPS[step].duration);
        } else {
          resolve();
        }
      };
      setTimeout(tick, BUILD_PHASE_STEPS[0].duration);
    });

    const [genResult] = await Promise.all([
      generateWorkflow(prompt.trim()),
      advanceUI(),
    ]);

    setLlmSource(genResult.source);
    setBuiltWorkflow({
      name: agentName,
      description: prompt,
      triggers: genResult.workflow.triggers ?? [],
      dataSources: genResult.workflow.dataSources ?? [],
      nodes: genResult.workflow.nodes ?? [],
      edges: genResult.workflow.edges ?? [],
    });
    setPhase("built");
  };

  const handleWorkflowChange = useCallback((updated: BuiltWorkflow) => {
    setBuiltWorkflow(updated);
  }, []);

  const handleSave = () => {
    const newVersion: AgentVersion = {
      id: `v${nextVersion}`,
      versionNumber: nextVersion,
      status: "sandbox",
      createdAt: new Date().toISOString(),
      description: versionNote.trim() || (isForking ? `Forked from v${forkFrom!.activeVersion}` : "Initial version"),
    };

    const versions = forkFrom
      ? [...forkFrom.versions, newVersion]
      : [newVersion];

    const pvMap: Record<string, number> = {};
    for (const pid of selectedProperties) {
      pvMap[pid] = forkFrom?.propertyVersionMap?.[pid] ?? nextVersion;
    }

    onComplete({
      name: agentName,
      type: "deterministic",
      description: prompt,
      status: forkFrom?.status ?? "sandbox",
      domain: forkFrom?.domain ?? "General",
      versions,
      activeVersion: nextVersion,
      propertyIds: selectedProperties,
      propertyVersionMap: pvMap,
      triggers: builtWorkflow?.triggers ?? [],
      evals: forkFrom?.evals ?? [],
    });
  };

  if (phase === "describing") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-4">
          <button type="button" onClick={onBack} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Workflow className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {isForking ? `New Version of "${forkFrom!.name}"` : "Build Deterministic Workflow"}
              </h2>
              <p className="text-[11px] text-muted-foreground">Version {nextVersion} &middot; Draft</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-xl space-y-5">
            <div>
              <label htmlFor="wf-name" className="mb-1.5 block text-sm font-medium text-foreground">Agent name</label>
              <Input id="wf-name" value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="e.g. Renewal Offer Generator" />
            </div>
            <div>
              <label htmlFor="wf-desc" className="mb-1.5 block text-sm font-medium text-foreground">Describe what this workflow should do</label>
              <textarea
                id="wf-desc"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                placeholder="e.g. Every night, scan for leases expiring within 90 days. For each one, calculate a renewal offer based on current market rent and the resident's payment history..."
                className="w-full resize-none rounded-lg border border-border bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {isForking && (
              <div>
                <label htmlFor="wf-vnote" className="mb-1.5 block text-sm font-medium text-foreground">What changed in this version?</label>
                <Input id="wf-vnote" value={versionNote} onChange={(e) => setVersionNote(e.target.value)} placeholder="e.g. Added payment history weighting" />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Properties</label>
              <PropertyPicker selected={selectedProperties} onChange={setSelectedProperties} />
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-[12px] text-emerald-800">
              <Code2 className="h-4 w-4 shrink-0" />
              AI builds deterministic code from your description using MCP connectors. The workflow runs without an LLM — same input, same output, every time.
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border px-6 py-4">
          <Button
            onClick={handleBuild}
            disabled={!prompt.trim() || !agentName.trim()}
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Cog className="mr-2 h-4 w-4" /> {isForking ? "Rebuild Workflow" : "Build Workflow"}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "building") {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          {isForking ? "Rebuilding workflow" : "Building your workflow"}
        </h2>
        <p className="mb-8 text-sm text-muted-foreground">Generating workflow graph from your description...</p>
        <div className="w-full max-w-md space-y-3">
          {BUILD_PHASE_STEPS.map((step, i) => (
            <div
              key={step.key}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all ${
                i < buildStep ? "border-emerald-200 bg-emerald-50"
                : i === buildStep ? "border-emerald-300 bg-emerald-50 shadow-sm"
                : "border-border bg-white opacity-40"
              }`}
            >
              {i < buildStep ? <Check className="h-5 w-5 text-emerald-600" />
                : i === buildStep ? <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                : <div className="h-5 w-5 rounded-full border-2 border-border" />}
              <span className={`text-sm ${i <= buildStep ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "built" && builtWorkflow) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Check className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{builtWorkflow.name}</h2>
              <p className="text-[10px] text-muted-foreground">
                v{nextVersion} &middot; {builtWorkflow.nodes.length} nodes &middot; {builtWorkflow.edges.length} connections
                {llmSource === "llm" && <span className="ml-1 text-indigo-500">&#x2022; LLM-generated</span>}
                {llmSource === "fallback" && <span className="ml-1 text-amber-500">&#x2022; Template-based</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {builtWorkflow.triggers.map((t) => (
                <Badge key={t} variant="outline" className="rounded-full border-amber-200 bg-amber-50 text-[10px] text-amber-700">
                  <Zap className="mr-0.5 h-2.5 w-2.5" /> {t}
                </Badge>
              ))}
            </div>
            <div className="flex overflow-hidden rounded-md border border-border text-[10px]">
              <button
                type="button"
                onClick={() => setTestEnv("sandbox")}
                className={`flex items-center gap-1 px-2 py-1 font-medium ${
                  testEnv === "sandbox" ? "bg-amber-50 text-amber-800" : "bg-white text-muted-foreground"
                }`}
              >
                <FlaskConical className="h-2.5 w-2.5" /> Sandbox
              </button>
              <button
                type="button"
                onClick={() => setTestEnv("production")}
                className={`flex items-center gap-1 border-l border-border px-2 py-1 font-medium ${
                  testEnv === "production" ? "bg-emerald-50 text-emerald-800" : "bg-white text-muted-foreground"
                }`}
              >
                <Rocket className="h-2.5 w-2.5" /> Production
              </button>
            </div>
            {testEnv === "sandbox" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setTestStatus("running"); setTimeout(() => setTestStatus("passed"), 3000); }}
                disabled={testStatus === "running"}
                className="h-6 border-amber-300 px-2 text-[10px] text-amber-800 hover:bg-amber-50"
              >
                {testStatus === "running" ? <Loader2 className="mr-0.5 h-2.5 w-2.5 animate-spin" /> : <TestTube className="mr-0.5 h-2.5 w-2.5" />}
                {testStatus === "running" ? "Testing..." : testStatus === "passed" ? "Re-test" : "Test"}
              </Button>
            )}
            {testStatus === "passed" && (
              <Badge variant="outline" className="rounded-full border-emerald-300 bg-emerald-50 text-[9px] text-emerald-700">
                <Check className="mr-0.5 h-2.5 w-2.5" /> Passed
              </Badge>
            )}
            <Button size="sm" onClick={handleSave} className="h-7 px-3 text-[11px]">
              <Check className="mr-1 h-3 w-3" /> Save Agent
            </Button>
          </div>
        </div>

        <div className="flex-1">
          <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading workflow visualizer...</div>}>
            <WorkflowVisualizer
              workflow={{
                name: builtWorkflow.name,
                description: builtWorkflow.description,
                nodes: builtWorkflow.nodes,
                edges: builtWorkflow.edges,
                dataSources: builtWorkflow.dataSources,
                triggers: builtWorkflow.triggers,
              }}
              onWorkflowChange={(updated) => handleWorkflowChange({
                ...builtWorkflow,
                ...updated,
              })}
              prompt={prompt}
              showIteratePanel
            />
          </Suspense>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Main Page ───

export default function AgentBuilderPage() {
  const { isR1Release } = useR1Release();
  const { isR2Release } = useR2Release();
  const isFullVersion = !isR1Release && !isR2Release;

  const [agents, setAgents] = useState<UnifiedAgent[]>(SAMPLE_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>({ kind: "type-select" });
  const [typeFilter, setTypeFilter] = useState<"all" | AgentType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AgentStatusValue>("all");

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? null,
    [agents, selectedAgentId]
  );

  const filteredAgents = useMemo(() =>
    agents.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      return true;
    }),
    [agents, typeFilter, statusFilter]
  );

  const counts = useMemo(() => ({
    total: agents.length,
    live: agents.filter((a) => a.status === "live").length,
    sandbox: agents.filter((a) => a.status === "sandbox").length,
    paused: agents.filter((a) => a.status === "paused").length,
    draft: agents.filter((a) => a.status === "draft").length,
    deterministic: agents.filter((a) => a.type === "deterministic").length,
    ai: agents.filter((a) => a.type === "ai-powered").length,
  }), [agents]);

  const openBuilder = () => {
    setModalStep({ kind: "type-select" });
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalStep({ kind: "type-select" });
  }, []);

  const updateAgent = useCallback((id: string, patch: Partial<UnifiedAgent>) => {
    setAgents((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      const changes: ChangeHistoryEntry[] = [];

      if (patch.status && patch.status !== a.status) {
        changes.push({
          id: `ch-${Date.now()}-status`,
          timestamp: new Date().toISOString(),
          userId: "user-current",
          userName: "Current User",
          action: "status_changed",
          summary: `Changed status from ${a.status} to ${patch.status}`,
          diff: [{ field: "status", from: a.status, to: patch.status }],
        });
      }

      if (patch.propertyIds && JSON.stringify(patch.propertyIds) !== JSON.stringify(a.propertyIds)) {
        const added = patch.propertyIds.filter((p) => !a.propertyIds.includes(p));
        const removed = a.propertyIds.filter((p) => !patch.propertyIds!.includes(p));
        const parts: string[] = [];
        if (added.length > 0) parts.push(`added ${added.map(propertyName).join(", ")}`);
        if (removed.length > 0) parts.push(`removed ${removed.map(propertyName).join(", ")}`);
        if (parts.length > 0) {
          changes.push({
            id: `ch-${Date.now()}-props`,
            timestamp: new Date().toISOString(),
            userId: "user-current",
            userName: "Current User",
            action: "properties_changed",
            summary: `Properties: ${parts.join("; ")}`,
            diff: [{ field: "propertyIds", from: `[${a.propertyIds.length}]`, to: `[${patch.propertyIds.length}]` }],
          });
        }
      }

      if (patch.name && patch.name !== a.name) {
        changes.push({
          id: `ch-${Date.now()}-name`,
          timestamp: new Date().toISOString(),
          userId: "user-current",
          userName: "Current User",
          action: "updated",
          summary: `Renamed agent from "${a.name}" to "${patch.name}"`,
          diff: [{ field: "name", from: a.name, to: patch.name }],
        });
      }

      if (patch.description && patch.description !== a.description) {
        changes.push({
          id: `ch-${Date.now()}-desc`,
          timestamp: new Date().toISOString(),
          userId: "user-current",
          userName: "Current User",
          action: "updated",
          summary: "Updated agent description",
        });
      }

      return {
        ...a,
        ...patch,
        changeHistory: changes.length > 0 ? [...a.changeHistory, ...changes] : a.changeHistory,
      };
    }));
  }, []);

  const handleNewVersion = useCallback((agent: UnifiedAgent) => {
    setSelectedAgentId(null);
    setModalStep({
      kind: agent.type === "deterministic" ? "deterministic" : "ai-powered",
      forkFrom: agent,
    });
    setModalOpen(true);
  }, []);

  const handleEditVersion = useCallback((agent: UnifiedAgent, _versionNumber: number) => {
    setSelectedAgentId(null);
    setModalStep({
      kind: agent.type === "deterministic" ? "deterministic" : "ai-powered",
      forkFrom: agent,
    });
    setModalOpen(true);
  }, []);

  const handleBuilderComplete = useCallback((result: Omit<UnifiedAgent, "id" | "createdAt" | "lastRunAt" | "runsLast30d" | "executionLog" | "changeHistory">) => {
    const forkFrom = modalStep.kind !== "type-select" ? modalStep.forkFrom : undefined;

    if (forkFrom) {
      setAgents((prev) => prev.map((a) => {
        if (a.id !== forkFrom.id) return a;
        const changeEntry: ChangeHistoryEntry = {
          id: `ch-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: "user-current",
          userName: "Current User",
          action: "version_added",
          summary: `Created v${result.activeVersion} — ${result.versions[result.versions.length - 1]?.description ?? "new version"}`,
          versionAffected: result.activeVersion,
        };
        return {
          ...a,
          name: result.name,
          description: result.description,
          versions: result.versions,
          activeVersion: result.activeVersion,
          propertyIds: result.propertyIds,
          propertyVersionMap: result.propertyVersionMap,
          triggers: result.triggers,
          evals: result.evals,
          changeHistory: [...a.changeHistory, changeEntry],
        };
      }));
    } else {
      const newAgent: UnifiedAgent = {
        ...result,
        id: `ua-${Date.now()}`,
        createdAt: new Date().toISOString(),
        runsLast30d: 0,
        executionLog: [],
        changeHistory: [{
          id: `ch-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: "user-current",
          userName: "Current User",
          action: "created",
          summary: `Created ${result.type === "deterministic" ? "deterministic workflow" : "AI-powered"} agent`,
          versionAffected: 1,
        }],
      };
      setAgents((prev) => [newAgent, ...prev]);
    }

    setModalOpen(false);
    setModalStep({ kind: "type-select" });
  }, [modalStep]);

  if (!isFullVersion) {
    return (
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
            Loading Agent Builder…
          </div>
        }
      >
        <LegacyAgentBuilder />
      </Suspense>
    );
  }

  return (
    <>
      <PageHeader
        title="Agent Builder"
        description="Build and manage deterministic workflows and AI-powered agents — all from one place."
        actions={
          <Button onClick={openBuilder}>
            <Plus className="mr-2 h-4 w-4" /> Build New Agent
          </Button>
        }
      />

      <TodoListBanner />

      {/* Filters & stats */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Quick stats */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-2">
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{counts.total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="h-7 w-px bg-border" />
          <div className="text-center">
            <p className="text-lg font-semibold text-emerald-700">{counts.live}</p>
            <p className="text-[10px] text-muted-foreground">Live</p>
          </div>
          <div className="h-7 w-px bg-border" />
          <div className="text-center">
            <p className="text-lg font-semibold text-amber-700">{counts.sandbox}</p>
            <p className="text-[10px] text-muted-foreground">Sandbox</p>
          </div>
        </div>

        <div className="flex-1" />

        {/* Status filter */}
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[11px] font-medium text-muted-foreground">Status:</span>
          {(["all", "live", "sandbox", "paused", "draft"] as const).map((s) => {
            const label = s === "all" ? "All" : STATUS_STYLE[s].label;
            const count = s === "all" ? counts.total : counts[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  statusFilter === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {label}{count > 0 ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[11px] font-medium text-muted-foreground">Type:</span>
          {(["all", "deterministic", "ai-powered"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setTypeFilter(f)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                typeFilter === f ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f === "all" ? "All" : f === "deterministic" ? `Workflows (${counts.deterministic})` : `AI Agents (${counts.ai})`}
            </button>
          ))}
        </div>
      </div>

      {/* Agent list */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {filteredAgents.map((agent) => {
          const status = STATUS_STYLE[agent.status];
          const typeInfo = TYPE_STYLE[agent.type];
          const TypeIcon = typeInfo.icon;

          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => setSelectedAgentId(agent.id)}
              className="group flex flex-col rounded-xl border border-border bg-white p-4 text-left transition-all hover:border-indigo-200 hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{agent.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${typeInfo.className}`}>
                      <TypeIcon className="h-3 w-3" /> {typeInfo.label}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      v{agent.activeVersion}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{agent.domain}</span>
                  </div>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
              </div>
              <p className="mb-3 line-clamp-2 text-[12px] text-muted-foreground">{agent.description}</p>
              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                {agent.triggers.slice(0, 2).map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                    <Zap className="h-3 w-3 text-amber-500" /> {t}
                  </span>
                ))}
                {agent.propertyIds.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                    <Building2 className="h-3 w-3 text-muted-foreground" /> {agent.propertyIds.length} {agent.propertyIds.length === 1 ? "property" : "properties"}
                  </span>
                )}
                {agent.runsLast30d !== undefined && agent.runsLast30d > 0 && (
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {agent.runsLast30d.toLocaleString()} runs / 30d
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {filteredAgents.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
            <Sparkles className="h-6 w-6 text-indigo-600" />
          </div>
          <p className="text-sm font-medium text-foreground">No agents match your filter</p>
          <p className="mt-1 text-[13px] text-muted-foreground">Try adjusting your filters or build a new agent.</p>
        </div>
      )}

      {/* Agent Detail Dialog */}
      <Dialog open={!!selectedAgent} onOpenChange={(v) => { if (!v) setSelectedAgentId(null); }}>
        <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
          {selectedAgent && (
            <AgentDetailPanel
              agent={selectedAgent}
              onUpdate={(patch) => updateAgent(selectedAgent.id, patch)}
              onClose={() => setSelectedAgentId(null)}
              onNewVersion={() => handleNewVersion(selectedAgent)}
              onEditVersion={(vNum) => handleEditVersion(selectedAgent, vNum)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Builder Modal */}
      <Dialog open={modalOpen} onOpenChange={(v) => { if (!v) { setModalOpen(false); setModalStep({ kind: "type-select" }); } }}>
        <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
          {modalStep.kind === "type-select" && (
            <div className="flex h-full flex-col">
              <div className="shrink-0 border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold text-foreground">Build New Agent</h2>
                <p className="text-sm text-muted-foreground">Choose the execution model that fits your use case.</p>
              </div>
              <div className="flex flex-1 items-center justify-center px-6">
                <div className="grid max-w-2xl grid-cols-2 gap-5">
                  <button
                    type="button"
                    onClick={() => setModalStep({ kind: "deterministic" })}
                    className="group flex flex-col items-start rounded-xl border-2 border-border bg-white p-5 text-left transition-all hover:border-emerald-400 hover:shadow-lg"
                  >
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100">
                      <Workflow className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">Deterministic Workflow</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                      Predictable, rule-based automation. AI builds the logic once, then it runs the same way every time.
                    </p>
                    <ul className="mt-3 space-y-1.5 text-[12px] text-muted-foreground">
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Same output every run</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> No LLM cost per execution</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Ideal for regulated processes</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Test in sandbox, promote to live</li>
                    </ul>
                    <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                      <Code2 className="h-3 w-3" /> Best for: automations, compliance, scheduled tasks
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalStep({ kind: "ai-powered" })}
                    className="group flex flex-col items-start rounded-xl border-2 border-border bg-white p-5 text-left transition-all hover:border-indigo-400 hover:shadow-lg"
                  >
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
                      <BrainCircuit className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">AI-Powered Agent</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                      Adaptive, LLM-driven intelligence. The agent reasons through each situation differently based on context.
                    </p>
                    <ul className="mt-3 space-y-1.5 text-[12px] text-muted-foreground">
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-indigo-600" /> Handles nuanced scenarios</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-indigo-600" /> Natural language conversations</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-indigo-600" /> Adapts to new situations</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-indigo-600" /> Full guardrail protection</li>
                    </ul>
                    <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">
                      <BrainCircuit className="h-3 w-3" /> Best for: conversations, complex decisions, resident interactions
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {modalStep.kind === "deterministic" && (
            <DeterministicBuilderModal
              onComplete={handleBuilderComplete}
              onBack={() => setModalStep({ kind: "type-select" })}
              forkFrom={modalStep.forkFrom}
            />
          )}

          {modalStep.kind === "ai-powered" && (
            <div className="flex h-full flex-col">
              <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-4">
                <button type="button" onClick={() => setModalStep({ kind: "type-select" })} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <BrainCircuit className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      {modalStep.forkFrom ? `New Version of "${modalStep.forkFrom.name}"` : "Build AI-Powered Agent"}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      {modalStep.forkFrom
                        ? `Version ${Math.max(...modalStep.forkFrom.versions.map((v) => v.versionNumber)) + 1} · Forked from v${modalStep.forkFrom.activeVersion}`
                        : "Version 1 · Full agent builder"
                      }
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                      Loading agent builder…
                    </div>
                  }
                >
                  <CustomAgentBuilder initialView="new" onClose={closeModal} />
                </Suspense>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
