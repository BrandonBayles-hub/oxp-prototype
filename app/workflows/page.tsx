"use client";

import { useState, useEffect, useRef, Suspense, lazy, useCallback, useMemo } from "react";
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
  Building2,
  Zap,
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
  ThumbsUp,
  ThumbsDown,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Activity,
  DollarSign,
  Shield,
  ExternalLink as ExternalLinkIcon,
  Cpu,
  Clock,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Crown,
  Gift,
  Filter,
  ChevronDown,
  FolderOpen,
  Calendar,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ChevronUp,
  Ban,
  MoreVertical,
  Power,
  FileText,
  ClipboardCheck,
  PenLine,
  PartyPopper,
  CircleCheck,
  CircleDot,
  Info,
} from "lucide-react";
import {
  PMC_PROPERTY_RECORDS,
  type PmcPropertyRecord,
} from "@/components/custom-agent-builder/lib/pmc-identity";
import { TodoListBanner } from "@/components/custom-agent-builder/components/TodoListBanner";
import { useR1Release } from "@/lib/r1-release-context";
import { useR2Release } from "@/lib/r2-release-context";
import { generateWorkflow } from "@/lib/workflow-generator";
import { analyzePrompt, analyzeChangeRequest, engineLabel, engineDescription, type RoutingDecision, type WorkflowEngine, type ConnectorGap } from "@/lib/workflow-router";
import { useAgentBuilderViewerRole } from "@/lib/agent-builder-viewer-role-context";
import { WorkflowEngineBadge, WorkflowEngineDot } from "@/components/workflow-engine-badge";

const CustomAgentBuilder = lazy(() => import("@/components/custom-agent-builder"));
const WorkflowVisualizer = lazy(() => import("@/components/workflow-visualizer"));
const LegacyAgentBuilder = lazy(() => import("@/components/legacy-agent-builder"));

// ─── Types ───

type AgentType = "deterministic" | "ai-powered";
type AgentStatusValue = "draft" | "sandbox" | "live" | "paused" | "disabled";

/**
 * Viewer role for demo controls.
 * - admin-with-flag: Admin user with full access — can create/edit/manage agents
 * - read-only: Users without the feature flag — can view agents but cannot create/edit
 */

type StructuredTrigger = {
  type: "event" | "schedule";
  label: string;
  event?: string;
  schedule?: string;
  time?: string;
  timezone?: string;
  frequency?: string;
  day?: string;
};

/**
 * PLG Agent Tier model.
 * - "free": deterministic agents users can build for free (up to FREE_AGENT_LIMIT)
 * - "premium": require a per-property contract
 *
 * Every client can build up to 5 deterministic (rule-based) agents at no cost.
 * AI-powered agents always require a premium plan.
 * Non-contracted properties get the free deterministic agents only.
 * Contracted properties get unlimited deterministic + AI-powered agents.
 */
type AgentTier = "free" | "premium";

const FREE_AGENT_LIMIT = 5;

/* ─── Contracting flow types ─── */

type ContractStep = "properties" | "pricing" | "sign" | "complete";

type ContractState = {
  selectedPropertyIds: string[];
  agreedToPricing: boolean;
  signerName: string;
  signerTitle: string;
  signatureDate: string;
  signed: boolean;
};

const INITIAL_CONTRACT_STATE: ContractState = {
  selectedPropertyIds: [],
  agreedToPricing: false,
  signerName: "",
  signerTitle: "",
  signatureDate: "",
  signed: false,
};

const PRICING_TABLE = [
  { tier: "Workflow (Basic)", unit: "per task executed", price: "$0.001", description: "Rule-based deterministic workflows using Entrata-native connectors." },
  { tier: "Workflow (Premium)", unit: "per task executed", price: "$0.005", description: "Workflows using external connectors (e.g., Workato-powered integrations)." },
  { tier: "AI Agent — Frontier Model", unit: "per million tokens", price: "LLM Model Cost + $0.25", description: "GPT-4, Claude, Gemini, etc. API prices passed through at the published rate plus Entrata platform fee." },
  { tier: "AI Agent — Entrata LLM or Auto", unit: "per million tokens (input / output)", price: "$0.10 / $0.25", description: "Entrata's proprietary model or auto-selected model. Input tokens at $0.10/M, output tokens at $0.25/M." },
] as const;

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
  action: "created" | "updated" | "version_added" | "version_edited" | "status_changed" | "properties_changed" | "config_changed" | "evals_changed";
  summary: string;
  details?: string;
  versionAffected?: number;
  diff?: { field: string; from: string; to: string }[];
};

type BudgetConfig = {
  monthlyBudgetPerProperty: number;
  budgetMode: "uniform" | "per-property";
  propertyBudgets: Record<string, number>;
  alertThresholdPercent: number;
  overageBehavior: "pause" | "allow-essential-only";
  billingCycleDay: number;
};

const DEFAULT_BUDGET: BudgetConfig = {
  monthlyBudgetPerProperty: 150,
  budgetMode: "uniform",
  propertyBudgets: {},
  alertThresholdPercent: 80,
  overageBehavior: "allow-essential-only",
  billingCycleDay: 1,
};

type SpendTimeframe = "mtd" | "last-month" | "ytd" | "custom";
type SpendView = "by-agent" | "by-property" | "by-day";

type MockDailySpend = { day: number; amount: number };
type MockAgentSpend = {
  agentId: string;
  agentName: string;
  agentType: AgentType;
  spend: number;
  executions: number;
  trend: "up" | "down" | "stable";
  dailySpend: MockDailySpend[];
  propertySpend: { propertyId: string; propertyName: string; spend: number }[];
  isFree?: boolean;
  wouldHaveCost?: number;
  isEssential?: boolean;
  overageSpend?: number;
};

type AgentCostSummary = {
  currentMonthSpend: number;
  avgCostPerExecution: number;
  executionsThisMonth: number;
  projectedMonthlySpend: number;
  costTrend: "up" | "down" | "stable";
  wouldHaveCost?: number;
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
  propertyGroupIds?: string[];
  propertyVersionMap: Record<string, number>;
  triggers: StructuredTrigger[];
  evals: SimpleEval[];
  lastRunAt?: string;
  runsLast30d?: number;
  executionLog: ExecutionLogEntry[];
  changeHistory: ChangeHistoryEntry[];
  engineType?: WorkflowEngine;
  agentTier?: AgentTier;
  contractedPropertyIds?: string[];
  isEssential?: boolean;
  costSummary?: AgentCostSummary;
  aiContext?: {
    prompt?: string;
    guardrails?: string;
    classification?: string;
    skillIds?: string[];
    dataIds?: string[];
    structuredGuardrails?: Array<{ label: string; enabled: boolean }>;
  };
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
    engineType: "entrata-native",
    createdAt: "2026-05-15T10:00:00Z",
    versions: [
      { id: "v1", versionNumber: 1, status: "retired", createdAt: "2026-05-15T10:00:00Z", description: "Initial version — basic renewal scan" },
      { id: "v2", versionNumber: 2, status: "live", createdAt: "2026-06-01T14:30:00Z", description: "Added payment history weighting and escalation logic" },
    ],
    activeVersion: 2,
    propertyIds: ["prop.hillside", "prop.jamison"],
    propertyVersionMap: { "prop.hillside": 2, "prop.jamison": 1 },
    agentTier: "free",
    triggers: [
      { type: "schedule", label: "Daily at 2:00 AM", schedule: "daily", time: "02:00", timezone: "America/Chicago", frequency: "daily" },
      { type: "event", label: "Lease Expiration Approaching", event: "lease_expiring_90d" },
    ],
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
    engineType: "entrata-native",
    createdAt: "2026-06-10T09:00:00Z",
    versions: [
      { id: "v1", versionNumber: 1, status: "sandbox", createdAt: "2026-06-10T09:00:00Z", description: "Initial build — threshold-based detection" },
    ],
    activeVersion: 1,
    propertyIds: [],
    propertyVersionMap: {},
    agentTier: "premium",
    triggers: [{ type: "event", label: "Invoice Created", event: "invoice_created" }],
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
    aiContext: {
      prompt: "You are a helpful resident inquiry agent for Entrata-managed properties. You answer questions about leases, payments, maintenance requests, and community policies. When a resident asks about their balance, look up their ledger. When they report a maintenance issue, create a work order. Always verify resident identity before sharing account information. If you cannot answer a question or the situation seems urgent, escalate to a human agent.",
      guardrails: "Never share other residents' information. Do not provide legal advice. Do not make promises about timelines. Always comply with Fair Housing Act. Escalate threats or legal language immediately.",
      classification: "L4",
      skillIds: ["residents.get_resident", "residents.get_balance", "accounting.get_resident_ledger", "maintenance.create_work_order", "comms.send_sms", "comms.send_email"],
      dataIds: ["data.resident_profile", "data.resident_accounts", "data.lease_docs", "data.comms_history", "data.property_knowledge", "data.policies"],
      structuredGuardrails: [
        { label: "Fair Housing compliance", enabled: true },
        { label: "PII protection", enabled: true },
        { label: "No legal advice", enabled: true },
        { label: "Escalate threats", enabled: true },
        { label: "Verify identity before account access", enabled: true },
      ],
    },
    versions: [
      { id: "v1", versionNumber: 1, status: "retired", createdAt: "2026-05-20T11:00:00Z", description: "Initial — basic Q&A with lease and payment data" },
      { id: "v2", versionNumber: 2, status: "retired", createdAt: "2026-06-05T09:00:00Z", description: "Added maintenance request creation via MCP" },
      { id: "v3", versionNumber: 3, status: "live", createdAt: "2026-06-18T16:00:00Z", description: "Added community policy knowledge base and escalation rules" },
    ],
    activeVersion: 3,
    propertyIds: ["prop.hillside", "prop.jamison", "prop.oakmont"],
    propertyVersionMap: { "prop.hillside": 3, "prop.jamison": 3, "prop.oakmont": 2 },
    agentTier: "premium",
    triggers: [
      { type: "event", label: "Inbound SMS Received", event: "inbound_sms" },
      { type: "event", label: "Inbound Chat Message", event: "inbound_chat" },
    ],
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
    aiContext: {
      prompt: "You are an after-hours maintenance triage agent. When a resident calls or texts after 6 PM, you classify the urgency of their maintenance issue. For emergencies (water leaks, gas smells, no heat in winter, electrical hazards), immediately create an emergency work order and dispatch a vendor. For non-urgent issues (clogged drain, broken blinds, appliance issues), create a standard work order for next business day and confirm with the resident.",
      guardrails: "Always treat gas smells and flooding as emergencies regardless of resident description. Never tell a resident to fix electrical issues themselves. If unsure about urgency, default to emergency classification. Always send confirmation SMS after creating a work order.",
      classification: "L4",
      skillIds: ["maintenance.create_work_order", "maintenance.dispatch_vendor", "maintenance.get_work_order", "residents.get_resident", "comms.send_sms"],
      dataIds: ["data.resident_profile", "data.work_orders", "data.workorder_history", "data.problems_catalog", "data.property_info"],
      structuredGuardrails: [
        { label: "Default to emergency when uncertain", enabled: true },
        { label: "No DIY electrical advice", enabled: true },
        { label: "Always confirm via SMS", enabled: true },
        { label: "PII protection", enabled: true },
      ],
    },
    versions: [
      { id: "v1", versionNumber: 1, status: "live", createdAt: "2026-06-08T13:00:00Z", description: "Voice + SMS triage with vendor dispatch" },
    ],
    activeVersion: 1,
    propertyIds: ["prop.hillside"],
    propertyVersionMap: { "prop.hillside": 1 },
    agentTier: "premium",
    triggers: [{ type: "event", label: "Inbound Voice Call (After Hours)", event: "inbound_voice_after_hours" }],
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
  // ─── Pre-seeded AI Agent Examples (10 diverse use cases from operator research) ───
  {
    id: "ua-5",
    name: "Move-in Checklist Coordinator",
    type: "ai-powered",
    description: "Proactively reaches out to residents 14 days before their move-in date to walk them through the move-in checklist — collecting pet registration, parking assignments, renter's insurance, utility transfers, key pickup scheduling, and emergency contacts via conversational SMS.",
    status: "live",
    domain: "Leasing",
    createdAt: "2026-05-28T09:00:00Z",
    aiContext: {
      prompt: "You are a Move-in Checklist Coordinator for Entrata-managed properties. You proactively contact incoming residents 14 days before their move-in date to help them complete all pre-move-in requirements.\n\n## Core Responsibilities\n- Send an initial welcome SMS introducing yourself and the checklist\n- Track completion of each checklist item: pet registration, vehicle/parking, renter's insurance, utility setup, emergency contacts, key pickup slot\n- Send gentle follow-up reminders every 3 days for incomplete items\n- Answer questions about the property, move-in process, and policies\n- Schedule key pickup appointments during office hours\n\n## Conversation Guidelines\n- Be warm, welcoming, and excited about their upcoming move\n- Keep messages concise — no more than 2-3 sentences per SMS\n- If a resident says they'll handle something later, acknowledge and follow up after 3 days\n- Reference specific property details (pet policies, parking rules, office hours) from the knowledge base\n\n## Escalation Rules\n- Escalate to leasing staff if: resident wants to cancel/change move-in date, renter's insurance deadline is 48hrs away and not submitted, resident reports accessibility needs requiring unit modifications\n- Never make promises about unit condition or specific amenity availability",
      guardrails: "Never share other residents' move-in dates or unit assignments. Do not provide legal interpretations of the lease. Always verify resident identity before discussing their specific unit details. Escalate immediately if a resident mentions disability accommodations that may need ADA compliance review.",
      classification: "L4",
      skillIds: ["residents.get_resident", "residents.get_lease", "leasing.get_property", "leasing.property_policies", "leasing.property_hours", "comms.send_sms", "comms.get_thread"],
      dataIds: ["data.resident_profile", "data.lease_docs", "data.property_knowledge", "data.policies", "data.amenities", "data.property_info"],
      structuredGuardrails: [
        { label: "PII protection", enabled: true },
        { label: "Fair Housing compliance", enabled: true },
        { label: "No lease interpretation", enabled: true },
        { label: "Verify identity", enabled: true },
      ],
    },
    versions: [
      { id: "v1", versionNumber: 1, status: "live", createdAt: "2026-05-28T09:00:00Z", description: "SMS-based move-in checklist with 14-day lead time" },
    ],
    activeVersion: 1,
    propertyIds: ["prop.hillside", "prop.jamison"],
    propertyVersionMap: { "prop.hillside": 1, "prop.jamison": 1 },
    agentTier: "premium",
    triggers: [{ type: "event", label: "Lease Signed (14 Days Before Move-In)", event: "lease_signed_pre_movein" }],
    evals: [],
    lastRunAt: "2026-06-22T09:00:00Z",
    runsLast30d: 23,
    executionLog: [],
    changeHistory: [
      { id: "ch-5a", timestamp: "2026-05-28T09:00:00Z", userId: "user-asmith", userName: "Alice Smith", action: "created", summary: "Created Move-in Checklist Coordinator", versionAffected: 1 },
    ],
  },
  {
    id: "ua-6",
    name: "Renewal Offer Optimizer",
    type: "ai-powered",
    description: "Analyzes resident payment history, lease tenure, market rent comparisons, and property occupancy to generate personalized renewal offers. Automatically adjusts offer terms based on resident retention risk and sends offers with personalized messaging.",
    status: "live",
    domain: "Renewals",
    createdAt: "2026-05-18T14:00:00Z",
    aiContext: {
      prompt: "You are a Renewal Offer Optimizer for Entrata-managed properties. When a resident's lease expiration date falls within 90 days, you generate an optimized, personalized renewal offer.\n\n## Analysis Framework\n1. Pull the resident's full payment history — on-time rate, average days to pay, any NSF/late history\n2. Check lease tenure — residents with 2+ years get preferential pricing consideration\n3. Compare current rent to market rent for the same unit type\n4. Factor in current property occupancy — higher vacancy = more aggressive retention offers\n5. Score the resident's retention risk (0-100) based on these factors\n\n## Offer Generation Rules\n- High-value residents (on-time >95%, tenure >2yr): Offer at or below current rent, include loyalty perks\n- Standard residents (on-time 80-95%): Offer at market rent with 1-2% discount for early renewal\n- At-risk residents (on-time <80% or short tenure): Offer at market rent, no discount, shorter term options\n- Never offer below the property's floor rent set by management\n\n## Communication\n- Draft a personalized email highlighting their time at the property and the specific offer\n- Include a clear call-to-action with a deadline (21 days from offer date)\n- If no response within 7 days, send a follow-up SMS\n- If no response within 14 days, escalate to the renewals coordinator",
      guardrails: "Never disclose the retention risk score to the resident. Do not share other residents' renewal terms. Always comply with local rent regulation laws where applicable. Offers must stay within the property's configured min/max rent boundaries. Escalate any resident mentioning legal representation.",
      classification: "L3",
      skillIds: ["renewals.get_expiring_leases", "renewals.create_renewal_offer", "renewals.get_market_rent", "renewals.get_resident_history", "residents.get_resident", "residents.get_lease", "comms.send_email", "comms.send_sms"],
      dataIds: ["data.rent_roll", "data.resident_accounts", "data.resident_profile", "data.lease_docs", "data.pricing_availability"],
      structuredGuardrails: [
        { label: "Rent regulation compliance", enabled: true },
        { label: "PII protection", enabled: true },
        { label: "No score disclosure", enabled: true },
        { label: "Respect rent floor/ceiling", enabled: true },
      ],
    },
    versions: [
      { id: "v1", versionNumber: 1, status: "retired", createdAt: "2026-05-18T14:00:00Z", description: "Basic renewal offer with payment history analysis" },
      { id: "v2", versionNumber: 2, status: "live", createdAt: "2026-06-10T11:00:00Z", description: "Added occupancy-aware pricing and SMS follow-up" },
    ],
    activeVersion: 2,
    propertyIds: ["prop.hillside", "prop.jamison", "prop.oakmont"],
    propertyVersionMap: { "prop.hillside": 2, "prop.jamison": 2, "prop.oakmont": 2 },
    agentTier: "premium",
    triggers: [{ type: "schedule", label: "Daily at 7:00 AM", schedule: "daily", time: "07:00", timezone: "America/Chicago", frequency: "daily" }],
    evals: [],
    lastRunAt: "2026-06-22T07:00:00Z",
    runsLast30d: 89,
    executionLog: [],
    changeHistory: [
      { id: "ch-6a", timestamp: "2026-05-18T14:00:00Z", userId: "user-jdoe", userName: "John Doe", action: "created", summary: "Created Renewal Offer Optimizer", versionAffected: 1 },
    ],
  },
  {
    id: "ua-7",
    name: "Portfolio Performance Analyst",
    type: "ai-powered",
    description: "Runs weekly analysis across multiple property reports — occupancy rates, delinquency trends, renewal conversion, maintenance response times — and produces an executive summary with actionable recommendations for regional managers.",
    status: "sandbox",
    domain: "Operations",
    createdAt: "2026-06-12T10:00:00Z",
    aiContext: {
      prompt: "You are a Portfolio Performance Analyst for Entrata-managed properties. Every week, you analyze key operational metrics across the assigned portfolio and produce an executive summary for regional managers.\n\n## Metrics to Analyze\n1. Occupancy rate — current vs. target, trend over past 4 weeks\n2. Delinquency — total past-due balance, number of delinquent residents, avg days past-due\n3. Renewal conversion — offers sent vs. accepted vs. declined, avg rent increase achieved\n4. Maintenance — open work orders, avg resolution time, emergency vs. standard ratio\n5. Leasing pipeline — new leads, tours scheduled, applications submitted, conversion rates\n\n## Analysis Approach\n- Compare each property to portfolio average and highlight outliers (>1 std deviation)\n- Identify week-over-week trends (improving, declining, stable)\n- Cross-reference metrics for root causes (e.g., high delinquency + low renewal conversion may indicate pricing issues)\n\n## Output\n- Send a structured email to the regional manager with: executive summary (3-5 bullet points), property-by-property scorecards, top 3 recommended actions with expected impact\n- Flag any property requiring immediate attention (e.g., occupancy below 90%, delinquency above 5%)",
      guardrails: "Never include resident PII in the summary reports. Always present data in aggregate. Do not make staffing recommendations. Recommendations should focus on operational changes, not personnel actions. Flag but do not speculate on causes outside the data.",
      classification: "L3",
      skillIds: ["leasing.get_properties", "leasing.get_property", "renewals.get_expiring_leases", "accounting.get_resident_ledger", "maintenance.list_work_orders", "comms.send_email"],
      dataIds: ["data.rent_roll", "data.resident_accounts", "data.work_orders", "data.lead_profile", "data.pricing_availability", "data.property_info"],
      structuredGuardrails: [
        { label: "Aggregate data only", enabled: true },
        { label: "No staffing recommendations", enabled: true },
        { label: "PII protection", enabled: true },
      ],
    },
    versions: [
      { id: "v1", versionNumber: 1, status: "sandbox", createdAt: "2026-06-12T10:00:00Z", description: "Weekly portfolio analysis with email reports" },
    ],
    activeVersion: 1,
    propertyIds: ["prop.hillside", "prop.jamison", "prop.oakmont"],
    propertyVersionMap: { "prop.hillside": 1, "prop.jamison": 1, "prop.oakmont": 1 },
    agentTier: "premium",
    triggers: [{ type: "schedule", label: "Weekly on Monday at 6:00 AM", schedule: "weekly", time: "06:00", timezone: "America/Chicago", frequency: "weekly", day: "Monday" }],
    evals: [],
    runsLast30d: 0,
    executionLog: [],
    changeHistory: [
      { id: "ch-7a", timestamp: "2026-06-12T10:00:00Z", userId: "user-jdoe", userName: "John Doe", action: "created", summary: "Created Portfolio Performance Analyst", versionAffected: 1 },
    ],
  },
  {
    id: "ua-8",
    name: "Tour Prep Reminder",
    type: "ai-powered",
    description: "Messages leasing agents 1 hour before each scheduled tour with key lead details — preferred unit types, budget range, move-in timeline, previous tour history, and personalized talking points based on the lead's stated priorities.",
    status: "live",
    domain: "Leasing",
    createdAt: "2026-06-01T08:00:00Z",
    aiContext: {
      prompt: "You are a Tour Prep Reminder agent for Entrata-managed properties. One hour before each scheduled tour, you send the assigned leasing agent a comprehensive briefing via SMS.\n\n## Briefing Contents\n1. Lead name and contact info\n2. Preferred unit type, bedroom/bath count, and budget\n3. Desired move-in date and lease term\n4. Number of occupants, pets, vehicles\n5. Previous interactions — past tours, emails, calls, and key notes\n6. Available units matching their criteria (top 3 with pricing)\n7. Current specials or promotions that apply\n8. 2-3 personalized talking points based on the lead's stated priorities\n\n## Communication Rules\n- Send exactly 1 hour before the tour start time\n- Keep the message scannable — use bullet points and short lines\n- Highlight any deal-breakers (e.g., lead has a large dog but property has breed restrictions)\n- If no leasing agent is assigned, send to the property's default leasing email\n\n## Tone\n- Quick, professional, internally focused (this goes to staff, not the prospect)\n- Lead with the most actionable information first",
      guardrails: "This agent messages staff only, never prospects. Do not include screening results or credit information. Do not include discriminatory notes or preferences that violate Fair Housing. If lead notes contain problematic language, omit those notes and flag for manager review.",
      classification: "L3",
      skillIds: ["leasing.search_leads", "leasing.get_lead", "leasing.list_lead_activities", "leasing.get_tour", "leasing.available_units", "leasing.property_specials", "leasing.get_floorplans", "comms.send_sms"],
      dataIds: ["data.lead_profile", "data.tour_schedule", "data.leasing_agent_directory", "data.floorplans", "data.pricing_availability", "data.property_info"],
      structuredGuardrails: [
        { label: "Staff-only communication", enabled: true },
        { label: "Fair Housing compliance", enabled: true },
        { label: "No screening data", enabled: true },
        { label: "PII protection", enabled: true },
      ],
    },
    versions: [
      { id: "v1", versionNumber: 1, status: "live", createdAt: "2026-06-01T08:00:00Z", description: "SMS briefing with lead details and unit matches" },
    ],
    activeVersion: 1,
    propertyIds: ["prop.hillside", "prop.jamison"],
    propertyVersionMap: { "prop.hillside": 1, "prop.jamison": 1 },
    agentTier: "premium",
    triggers: [{ type: "event", label: "Scheduled Tour (1 Hour Before)", event: "tour_reminder_1hr" }],
    evals: [],
    lastRunAt: "2026-06-22T13:00:00Z",
    runsLast30d: 156,
    executionLog: [],
    changeHistory: [
      { id: "ch-8a", timestamp: "2026-06-01T08:00:00Z", userId: "user-asmith", userName: "Alice Smith", action: "created", summary: "Created Tour Prep Reminder agent", versionAffected: 1 },
    ],
  },
  {
    id: "ua-9",
    name: "Vendor Spend Analyzer",
    type: "ai-powered",
    description: "Analyzes vendor invoice history across the portfolio to identify cost-saving opportunities — flags vendors with above-market pricing, highlights spend concentration risks, and recommends competitive bidding for high-volume service categories.",
    status: "sandbox",
    domain: "Accounting",
    createdAt: "2026-06-15T11:00:00Z",
    aiContext: {
      prompt: "You are a Vendor Spend Analyzer for Entrata-managed properties. You analyze vendor invoicing patterns across the portfolio to identify cost-saving opportunities.\n\n## Analysis Framework\n1. Aggregate vendor spend by category (plumbing, HVAC, electrical, landscaping, cleaning, etc.)\n2. Compare vendor pricing for similar work across properties\n3. Identify vendors whose average invoice amount is >15% above the category median\n4. Flag properties with vendor concentration risk (>60% of category spend with one vendor)\n5. Highlight categories where competitive bidding could reduce costs\n\n## Reporting\n- Generate a monthly spend analysis report for the operations team\n- Rank top 5 cost-saving opportunities with estimated annual savings\n- Include vendor performance context (don't just flag high cost — note if the vendor also has fastest response times or highest satisfaction)\n\n## Recommendations\n- Suggest specific actions: renegotiate, add backup vendor, request competitive bids\n- Estimate savings as a range, not a single number\n- Never recommend removing a vendor without considering service quality metrics",
      guardrails: "Do not share one vendor's pricing with another vendor. Analysis is for internal management only. Do not make recommendations on vendor contract terms — flag for procurement review instead. Consider seasonal patterns before flagging anomalies.",
      classification: "L3",
      skillIds: ["accounting.get_invoice", "maintenance.list_work_orders", "leasing.get_properties", "comms.send_email"],
      dataIds: ["data.invoice_ledger", "data.work_orders", "data.property_info", "data.fee_schedule", "data.vcr_invoice"],
      structuredGuardrails: [
        { label: "Internal use only", enabled: true },
        { label: "No vendor-to-vendor disclosure", enabled: true },
        { label: "Seasonal adjustment", enabled: true },
      ],
    },
    versions: [
      { id: "v1", versionNumber: 1, status: "sandbox", createdAt: "2026-06-15T11:00:00Z", description: "Monthly spend analysis with savings recommendations" },
    ],
    activeVersion: 1,
    propertyIds: ["prop.hillside", "prop.jamison", "prop.oakmont"],
    propertyVersionMap: { "prop.hillside": 1, "prop.jamison": 1, "prop.oakmont": 1 },
    agentTier: "premium",
    triggers: [{ type: "schedule", label: "Monthly on the 1st at 5:00 AM", schedule: "monthly", time: "05:00", timezone: "America/Chicago", frequency: "monthly", day: "1st" }],
    evals: [],
    runsLast30d: 0,
    executionLog: [],
    changeHistory: [
      { id: "ch-9a", timestamp: "2026-06-15T11:00:00Z", userId: "user-bwong", userName: "Brian Wong", action: "created", summary: "Created Vendor Spend Analyzer", versionAffected: 1 },
    ],
  },
  {
    id: "ua-10",
    name: "Technician Work Order Briefer",
    type: "ai-powered",
    description: "Sends maintenance technicians a detailed SMS briefing each morning with their assigned work orders — including unit access codes, resident contact info, issue history for the unit, required parts/tools, and priority sequencing for the day.",
    status: "live",
    domain: "Maintenance",
    createdAt: "2026-06-05T07:00:00Z",
    aiContext: {
      prompt: "You are a Technician Work Order Briefer for Entrata-managed properties. Each morning at 7:00 AM, you compile and send each assigned maintenance technician a daily briefing via SMS.\n\n## Briefing Contents (per work order)\n1. Priority level and any SLA deadlines\n2. Unit number, building, and access instructions\n3. Resident name and preferred contact method\n4. Issue description and resident's own words about the problem\n5. Unit maintenance history — recent work orders for the same unit (last 6 months)\n6. Likely parts/tools needed based on the issue category\n7. Recommended sequence for the day (prioritized by urgency, then geographic proximity)\n\n## Communication Rules\n- Send one consolidated message per technician, not one per work order\n- Keep the format scannable with clear section breaks\n- For emergency work orders, send an immediate alert rather than waiting for the morning batch\n- If the resident has noted access restrictions (pets, security system), highlight prominently\n\n## Special Considerations\n- If a work order has been open >7 days, flag it as overdue\n- If the same unit has had 3+ work orders in 30 days, note the pattern for the technician",
      guardrails: "Do not include resident financial information (balance, payment history). Only share the resident's name and contact info that is necessary for service access. Do not send briefings to off-duty or out-of-office technicians. If a work order involves a bed bug or pest issue, always include PPE reminder.",
      classification: "L3",
      skillIds: ["maintenance.list_work_orders", "maintenance.get_work_order", "residents.get_resident", "leasing.get_unit", "comms.send_sms"],
      dataIds: ["data.work_orders", "data.workorder_history", "data.resident_profile", "data.problems_catalog", "data.locations_map", "data.property_info"],
      structuredGuardrails: [
        { label: "No financial data to techs", enabled: true },
        { label: "Minimum necessary PII", enabled: true },
        { label: "PPE reminders for pest issues", enabled: true },
      ],
    },
    versions: [
      { id: "v1", versionNumber: 1, status: "live", createdAt: "2026-06-05T07:00:00Z", description: "Daily morning SMS briefing with prioritized work orders" },
    ],
    activeVersion: 1,
    propertyIds: ["prop.hillside"],
    propertyVersionMap: { "prop.hillside": 1 },
    agentTier: "premium",
    triggers: [{ type: "schedule", label: "Daily at 7:00 AM", schedule: "daily", time: "07:00", timezone: "America/Chicago", frequency: "daily" }],
    evals: [],
    lastRunAt: "2026-06-22T07:00:00Z",
    runsLast30d: 30,
    executionLog: [],
    changeHistory: [
      { id: "ch-10a", timestamp: "2026-06-05T07:00:00Z", userId: "user-bwong", userName: "Brian Wong", action: "created", summary: "Created Technician Work Order Briefer", versionAffected: 1 },
    ],
  },
  {
    id: "ua-11",
    name: "Delinquency Outreach Agent",
    type: "ai-powered",
    description: "Proactively contacts residents with past-due balances via SMS to understand their situation, offer payment plan options, share payment portal links, and escalate to collections or property management based on configurable thresholds.",
    status: "live",
    domain: "Accounting",
    createdAt: "2026-05-25T10:00:00Z",
    aiContext: {
      prompt: "You are a Delinquency Outreach Agent for Entrata-managed properties. You proactively contact residents who have past-due balances to help resolve their accounts.\n\n## Outreach Cadence\n- Day 3 past-due: Friendly reminder SMS with balance and payment link\n- Day 7: Follow-up offering to discuss payment plan options\n- Day 14: Formal notice with payment arrangement deadline\n- Day 21+: Escalate to collections coordinator\n\n## Conversation Approach\n- Always lead with empathy — residents may be experiencing hardship\n- Ask if there are circumstances affecting their ability to pay\n- Present available options: full payment, payment plan (2-3 installments), or connect with financial assistance resources\n- Provide the direct payment portal link in every message\n\n## Payment Plans\n- For balances under $500: Offer 2-installment plan\n- For balances $500-$2,000: Offer 3-installment plan over 60 days\n- For balances over $2,000: Escalate to property manager for custom arrangement\n\n## Escalation\n- If resident mentions legal action, SCRA/military status, or requests formal dispute, immediately escalate\n- If resident reports domestic violence or safety concerns, escalate to management with urgency flag\n- After 3 unreturned messages, stop automated outreach and escalate",
      guardrails: "Comply with FDCPA guidelines at all times. Do not contact residents before 8 AM or after 9 PM local time. Never threaten eviction or legal action. Do not discuss another resident's account. If resident mentions bankruptcy, immediately stop collection activity and escalate to legal. Always identify yourself as an automated assistant, never impersonate a human staff member.",
      classification: "L4",
      skillIds: ["residents.get_resident", "residents.get_balance", "accounting.get_resident_ledger", "comms.send_sms", "comms.get_thread", "residents.post_note"],
      dataIds: ["data.resident_profile", "data.resident_accounts", "data.comms_history", "data.lease_docs"],
      structuredGuardrails: [
        { label: "FDCPA compliance", enabled: true },
        { label: "Contact hour restrictions", enabled: true },
        { label: "No eviction threats", enabled: true },
        { label: "PII protection", enabled: true },
        { label: "Bot disclosure", enabled: true },
      ],
    },
    versions: [
      { id: "v1", versionNumber: 1, status: "live", createdAt: "2026-05-25T10:00:00Z", description: "SMS outreach with payment plan offers and escalation" },
    ],
    activeVersion: 1,
    propertyIds: ["prop.hillside", "prop.jamison"],
    propertyVersionMap: { "prop.hillside": 1, "prop.jamison": 1 },
    agentTier: "premium",
    triggers: [{ type: "schedule", label: "Daily at 10:00 AM", schedule: "daily", time: "10:00", timezone: "America/Chicago", frequency: "daily" }],
    evals: [],
    lastRunAt: "2026-06-22T10:00:00Z",
    runsLast30d: 112,
    executionLog: [],
    changeHistory: [
      { id: "ch-11a", timestamp: "2026-05-25T10:00:00Z", userId: "user-jdoe", userName: "John Doe", action: "created", summary: "Created Delinquency Outreach Agent", versionAffected: 1 },
    ],
  },
  {
    id: "ua-12",
    name: "Leasing Voice Agent",
    type: "ai-powered",
    description: "Handles inbound leasing calls — answers property questions, checks unit availability, schedules tours, captures lead information, and qualifies prospects based on income requirements and move-in timeline. Transfers to a human for application-stage questions.",
    status: "draft",
    domain: "Leasing",
    createdAt: "2026-06-18T09:00:00Z",
    aiContext: {
      prompt: "You are a Leasing Voice Agent for Entrata-managed properties. You handle inbound calls from prospective residents interested in renting.\n\n## Core Capabilities\n1. Answer property questions — amenities, pet policies, parking, utilities, neighborhood, office hours\n2. Check real-time unit availability and pricing for the caller's preferred unit type and move-in date\n3. Schedule tours — offer available time slots and book directly\n4. Capture lead information — name, email, phone, move-in date, budget, unit preferences\n5. Pre-qualify — ask about household size and income range to check against the property's 2.5x rent requirement\n\n## Voice Guidelines\n- Speak naturally and conversationally — avoid sounding scripted\n- Keep responses brief on the phone — no more than 2-3 sentences before pausing\n- Use the prospect's name after they provide it\n- If they ask a question you don't know, say \"Let me connect you with a leasing specialist\" rather than guessing\n\n## Qualification\n- If income appears below 2.5x the target unit's rent, mention that income documentation will be required and avoid discouraging the prospect\n- Never deny someone based on voice, accent, or perceived demographics\n\n## Transfer Rules\n- Transfer to a human leasing agent for: application status questions, lease negotiation, roommate situations, requests for ADA accommodations, or any complex financial questions",
      guardrails: "Strict Fair Housing Act compliance — never ask about race, religion, national origin, familial status, disability, sex, or sexual orientation. Do not quote exact pricing that might change — always say 'starting from' or 'currently listed at.' Never guarantee unit availability. Do not discuss other applicants or their status. Record a note of every call and its outcome.",
      classification: "L4",
      skillIds: ["leasing.search_leads", "leasing.capture_lead", "leasing.available_units", "leasing.get_tour_schedule", "leasing.schedule_tour", "leasing.get_floorplans", "leasing.property_amenities", "leasing.property_policies", "leasing.property_hours", "leasing.property_contact", "leasing.fee_catalog", "comms.warm_transfer"],
      dataIds: ["data.lead_profile", "data.tour_schedule", "data.floorplans", "data.pricing_availability", "data.property_knowledge", "data.amenities", "data.policies", "data.fee_schedule"],
      structuredGuardrails: [
        { label: "Fair Housing compliance", enabled: true },
        { label: "No guaranteed availability", enabled: true },
        { label: "No discriminatory screening", enabled: true },
        { label: "PII protection", enabled: true },
        { label: "Call note logging", enabled: true },
      ],
    },
    versions: [
      { id: "v1", versionNumber: 1, status: "draft", createdAt: "2026-06-18T09:00:00Z", description: "Voice-first leasing with tour scheduling and lead capture" },
    ],
    activeVersion: 1,
    propertyIds: [],
    propertyVersionMap: {},
    agentTier: "premium",
    triggers: [{ type: "event", label: "Inbound Voice Call (Leasing Line)", event: "inbound_voice_leasing" }],
    evals: [],
    runsLast30d: 0,
    executionLog: [],
    changeHistory: [
      { id: "ch-12a", timestamp: "2026-06-18T09:00:00Z", userId: "user-asmith", userName: "Alice Smith", action: "created", summary: "Created Leasing Voice Agent — draft for pilot", versionAffected: 1 },
    ],
  },
  {
    id: "ua-13",
    name: "Move-Out Coordinator",
    type: "ai-powered",
    description: "Manages the end-to-end move-out process — confirms move-out date, schedules pre-move-out inspection, provides cleaning/repair expectations, tracks key return and forwarding address collection, and initiates deposit disposition calculation.",
    status: "sandbox",
    domain: "Residents",
    createdAt: "2026-06-11T15:00:00Z",
    aiContext: {
      prompt: "You are a Move-Out Coordinator for Entrata-managed properties. When a resident submits a notice to vacate, you manage the entire move-out process through completion.\n\n## Process Steps\n1. Confirm receipt of notice and verify the move-out date\n2. Send the move-out guide with cleaning expectations and damage charges schedule\n3. Schedule the pre-move-out inspection (7 days before move-out) — offer available time slots\n4. Send reminders at 14 days, 7 days, and 3 days before move-out\n5. Collect forwarding address for deposit refund and final statement\n6. Confirm key/fob return instructions and deadline\n7. After move-out, trigger the deposit disposition workflow\n\n## Communication\n- Use SMS as the primary channel, email for document-heavy communications\n- Be empathetic — residents may be leaving due to difficult circumstances\n- Answer questions about the deposit return timeline (state-specific deadlines)\n- Provide a clear breakdown of what constitutes normal wear vs. chargeable damage\n\n## Escalation\n- If resident disputes the move-out date, escalate to property manager\n- If resident mentions early termination or lease break, escalate immediately\n- If resident threatens to withhold keys or refuses inspection, escalate to management",
      guardrails: "Do not provide legal advice about breaking a lease or deposit disputes. Follow state-specific deposit return timelines. Do not make promises about deposit refund amounts before the inspection. If resident mentions they are military (SCRA) or a victim of domestic violence, escalate to management for proper handling.",
      classification: "L4",
      skillIds: ["residents.get_resident", "residents.get_lease", "leasing.get_property", "comms.send_sms", "comms.send_email", "comms.get_thread", "residents.post_note"],
      dataIds: ["data.resident_profile", "data.lease_docs", "data.property_knowledge", "data.comms_history", "data.policies"],
      structuredGuardrails: [
        { label: "State deposit law compliance", enabled: true },
        { label: "No deposit promises", enabled: true },
        { label: "SCRA/DV escalation", enabled: true },
        { label: "PII protection", enabled: true },
      ],
    },
    versions: [
      { id: "v1", versionNumber: 1, status: "sandbox", createdAt: "2026-06-11T15:00:00Z", description: "Full move-out lifecycle with SMS/email coordination" },
    ],
    activeVersion: 1,
    propertyIds: ["prop.hillside"],
    propertyVersionMap: { "prop.hillside": 1 },
    agentTier: "premium",
    triggers: [{ type: "event", label: "Notice to Vacate Submitted", event: "notice_to_vacate" }],
    evals: [],
    runsLast30d: 0,
    executionLog: [],
    changeHistory: [
      { id: "ch-13a", timestamp: "2026-06-11T15:00:00Z", userId: "user-jdoe", userName: "John Doe", action: "created", summary: "Created Move-Out Coordinator", versionAffected: 1 },
    ],
  },
  {
    id: "ua-14",
    name: "Resident Retention Watchdog",
    type: "ai-powered",
    description: "Monitors early warning signals that a resident may not renew — repeated maintenance complaints, late payments starting, negative survey responses, or reduced portal engagement — and alerts the property manager with a retention action plan.",
    status: "draft",
    domain: "Renewals",
    createdAt: "2026-06-20T16:00:00Z",
    aiContext: {
      prompt: "You are a Resident Retention Watchdog for Entrata-managed properties. You continuously monitor resident behavior patterns to identify those at risk of not renewing their lease.\n\n## Risk Signals (weighted)\n1. Maintenance frustration — 3+ work orders in 30 days, or any WO open >14 days (weight: 30%)\n2. Payment pattern shift — resident who was consistently on-time starts paying late (weight: 25%)\n3. Communication sentiment — negative tone in recent messages or complaints (weight: 20%)\n4. Engagement drop — resident portal login frequency declined >50% month-over-month (weight: 15%)\n5. Market comparison — resident's current rent is >10% above market for similar units (weight: 10%)\n\n## Retention Score\n- Calculate a 0-100 retention risk score based on weighted signals\n- Score 0-30: Low risk — no action needed\n- Score 31-60: Moderate risk — send proactive check-in to property manager\n- Score 61-80: High risk — generate retention action plan\n- Score 81-100: Critical risk — immediate alert to property manager and renewals team\n\n## Action Plans\n- For maintenance-driven risk: Recommend priority service recovery, personal follow-up from PM\n- For payment-driven risk: Suggest early renewal conversation with concession options\n- For market-driven risk: Recommend pre-emptive renewal offer at competitive rate\n- Always include specific data points that triggered the alert",
      guardrails: "Never share the retention risk score or signals directly with the resident. This is an internal management tool only. Do not make retention promises without management approval. Do not use engagement metrics to penalize residents. Focus recommendations on improving the resident experience, not pressuring renewal.",
      classification: "L3",
      skillIds: ["residents.get_resident", "residents.get_lease", "residents.get_balance", "renewals.get_resident_history", "renewals.get_market_rent", "maintenance.list_work_orders", "comms.send_email"],
      dataIds: ["data.resident_profile", "data.resident_accounts", "data.rent_roll", "data.work_orders", "data.comms_history", "data.lease_docs"],
      structuredGuardrails: [
        { label: "Internal use only", enabled: true },
        { label: "No score disclosure", enabled: true },
        { label: "No retention pressure", enabled: true },
        { label: "PII protection", enabled: true },
      ],
    },
    versions: [
      { id: "v1", versionNumber: 1, status: "draft", createdAt: "2026-06-20T16:00:00Z", description: "Multi-signal retention risk scoring with action plans" },
    ],
    activeVersion: 1,
    propertyIds: [],
    propertyVersionMap: {},
    agentTier: "premium",
    triggers: [{ type: "schedule", label: "Weekly on Wednesday at 8:00 AM", schedule: "weekly", time: "08:00", timezone: "America/Chicago", frequency: "weekly", day: "Wednesday" }],
    evals: [],
    runsLast30d: 0,
    executionLog: [],
    changeHistory: [
      { id: "ch-14a", timestamp: "2026-06-20T16:00:00Z", userId: "user-asmith", userName: "Alice Smith", action: "created", summary: "Created Resident Retention Watchdog — draft for review", versionAffected: 1 },
    ],
  },
  {
    id: "ua-15",
    name: "Late Fee Auto-Poster",
    type: "deterministic",
    description: "Posts late fees to resident ledgers automatically when rent is unpaid after the grace period, sends a courtesy notice via email, and logs the charge for accounting.",
    status: "live",
    domain: "Accounting",
    engineType: "entrata-native",
    createdAt: "2026-05-20T08:00:00Z",
    versions: [
      { id: "v1", versionNumber: 1, status: "live", createdAt: "2026-05-20T08:00:00Z", description: "Auto-post late fees after 5-day grace period" },
    ],
    activeVersion: 1,
    propertyIds: ["prop.hillside", "prop.jamison", "prop.oakmont"],
    propertyVersionMap: { "prop.hillside": 1, "prop.jamison": 1, "prop.oakmont": 1 },
    agentTier: "free",
    triggers: [{ type: "schedule", label: "Daily at 6:00 AM", schedule: "daily", time: "06:00", timezone: "America/Chicago", frequency: "daily" }],
    evals: [],
    lastRunAt: "2026-06-22T06:00:00Z",
    runsLast30d: 45,
    executionLog: [],
    changeHistory: [
      { id: "ch-15a", timestamp: "2026-05-20T08:00:00Z", userId: "user-jdoe", userName: "John Doe", action: "created", summary: "Created Late Fee Auto-Poster", versionAffected: 1 },
    ],
  },
  {
    id: "ua-16",
    name: "Work Order Follow-Up Notifier",
    type: "deterministic",
    description: "Sends a follow-up email to residents 24 hours after a work order is marked complete, asking them to confirm the issue is resolved or reopen the ticket.",
    status: "live",
    domain: "Maintenance",
    engineType: "entrata-native",
    createdAt: "2026-05-25T11:00:00Z",
    versions: [
      { id: "v1", versionNumber: 1, status: "live", createdAt: "2026-05-25T11:00:00Z", description: "Post-completion follow-up with satisfaction check" },
    ],
    activeVersion: 1,
    propertyIds: ["prop.hillside", "prop.jamison"],
    propertyVersionMap: { "prop.hillside": 1, "prop.jamison": 1 },
    agentTier: "free",
    triggers: [{ type: "event", label: "Work Order Completed", event: "work_order_completed" }],
    evals: [],
    lastRunAt: "2026-06-21T15:30:00Z",
    runsLast30d: 38,
    executionLog: [],
    changeHistory: [
      { id: "ch-16a", timestamp: "2026-05-25T11:00:00Z", userId: "user-asmith", userName: "Alice Smith", action: "created", summary: "Created Work Order Follow-Up Notifier", versionAffected: 1 },
    ],
  },
  {
    id: "ua-17",
    name: "Lease Expiration Reminder",
    type: "deterministic",
    description: "Sends automated email reminders to residents at 90, 60, and 30 days before lease expiration, prompting them to begin the renewal process or notify of intent to vacate.",
    status: "live",
    domain: "Renewals",
    engineType: "entrata-native",
    createdAt: "2026-06-01T09:00:00Z",
    versions: [
      { id: "v1", versionNumber: 1, status: "live", createdAt: "2026-06-01T09:00:00Z", description: "Three-stage reminder at 90/60/30 days" },
    ],
    activeVersion: 1,
    propertyIds: ["prop.hillside", "prop.oakmont"],
    propertyVersionMap: { "prop.hillside": 1, "prop.oakmont": 1 },
    agentTier: "free",
    triggers: [{ type: "schedule", label: "Daily at 7:00 AM", schedule: "daily", time: "07:00", timezone: "America/Chicago", frequency: "daily" }],
    evals: [],
    lastRunAt: "2026-06-22T07:00:00Z",
    runsLast30d: 29,
    executionLog: [],
    changeHistory: [
      { id: "ch-17a", timestamp: "2026-06-01T09:00:00Z", userId: "user-jdoe", userName: "John Doe", action: "created", summary: "Created Lease Expiration Reminder", versionAffected: 1 },
    ],
  },
];

const AGENT_COST_DATA: Record<string, { isEssential: boolean; costSummary: AgentCostSummary }> = {
  "ua-1": { isEssential: true, costSummary: { currentMonthSpend: 0, avgCostPerExecution: 0.69, executionsThisMonth: 62, projectedMonthlySpend: 0, costTrend: "stable", wouldHaveCost: 42.80 } },
  "ua-2": { isEssential: true, costSummary: { currentMonthSpend: 78.50, avgCostPerExecution: 0.37, executionsThisMonth: 212, projectedMonthlySpend: 117.75, costTrend: "down" } },
  "ua-3": { isEssential: false, costSummary: { currentMonthSpend: 127.40, avgCostPerExecution: 0.069, executionsThisMonth: 1847, projectedMonthlySpend: 191.10, costTrend: "up" } },
  "ua-4": { isEssential: false, costSummary: { currentMonthSpend: 85.20, avgCostPerExecution: 0.12, executionsThisMonth: 710, projectedMonthlySpend: 127.80, costTrend: "up" } },
  "ua-5": { isEssential: false, costSummary: { currentMonthSpend: 31.60, avgCostPerExecution: 0.22, executionsThisMonth: 144, projectedMonthlySpend: 47.40, costTrend: "stable" } },
  "ua-6": { isEssential: true, costSummary: { currentMonthSpend: 156.30, avgCostPerExecution: 0.52, executionsThisMonth: 301, projectedMonthlySpend: 234.45, costTrend: "up" } },
  "ua-7": { isEssential: false, costSummary: { currentMonthSpend: 62.10, avgCostPerExecution: 0.28, executionsThisMonth: 222, projectedMonthlySpend: 93.15, costTrend: "down" } },
  "ua-8": { isEssential: false, costSummary: { currentMonthSpend: 44.90, avgCostPerExecution: 0.15, executionsThisMonth: 299, projectedMonthlySpend: 67.35, costTrend: "stable" } },
  "ua-9": { isEssential: false, costSummary: { currentMonthSpend: 73.80, avgCostPerExecution: 0.41, executionsThisMonth: 180, projectedMonthlySpend: 110.70, costTrend: "up" } },
  "ua-10": { isEssential: false, costSummary: { currentMonthSpend: 28.40, avgCostPerExecution: 0.19, executionsThisMonth: 150, projectedMonthlySpend: 42.60, costTrend: "stable" } },
  "ua-11": { isEssential: false, costSummary: { currentMonthSpend: 95.60, avgCostPerExecution: 0.32, executionsThisMonth: 299, projectedMonthlySpend: 143.40, costTrend: "up" } },
  "ua-12": { isEssential: false, costSummary: { currentMonthSpend: 0, avgCostPerExecution: 0, executionsThisMonth: 0, projectedMonthlySpend: 0, costTrend: "stable" } },
  "ua-13": { isEssential: false, costSummary: { currentMonthSpend: 0, avgCostPerExecution: 0, executionsThisMonth: 0, projectedMonthlySpend: 0, costTrend: "stable" } },
  "ua-14": { isEssential: false, costSummary: { currentMonthSpend: 0, avgCostPerExecution: 0, executionsThisMonth: 0, projectedMonthlySpend: 0, costTrend: "stable" } },
  "ua-15": { isEssential: false, costSummary: { currentMonthSpend: 0, avgCostPerExecution: 0.45, executionsThisMonth: 45, projectedMonthlySpend: 0, costTrend: "stable", wouldHaveCost: 20.25 } },
  "ua-16": { isEssential: false, costSummary: { currentMonthSpend: 0, avgCostPerExecution: 0.32, executionsThisMonth: 38, projectedMonthlySpend: 0, costTrend: "stable", wouldHaveCost: 12.16 } },
  "ua-17": { isEssential: false, costSummary: { currentMonthSpend: 0, avgCostPerExecution: 0.55, executionsThisMonth: 29, projectedMonthlySpend: 0, costTrend: "stable", wouldHaveCost: 15.95 } },
};

const ENRICHED_AGENTS: UnifiedAgent[] = SAMPLE_AGENTS.map((a) => ({
  ...a,
  ...(AGENT_COST_DATA[a.id] ?? {}),
}));

// ─── Style maps ───

const STATUS_STYLE: Record<AgentStatusValue, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700" },
  sandbox: { label: "Sandbox", className: "bg-amber-100 text-amber-800" },
  live: { label: "Live", className: "bg-emerald-100 text-emerald-800" },
  paused: { label: "Paused", className: "bg-slate-200 text-slate-600" },
  disabled: { label: "Disabled", className: "bg-red-50 text-red-600 border border-red-200" },
};

const TYPE_STYLE: Record<AgentType, { label: string; icon: typeof Workflow; className: string }> = {
  deterministic: { label: "Workflow", icon: Workflow, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "ai-powered": { label: "AI Agent", icon: BrainCircuit, className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
};

function propertyName(id: string): string {
  return PMC_PROPERTY_RECORDS.find((p) => p.id === id)?.name ?? id;
}

// ─── Trigger display helpers ───

function formatTriggerChip(t: StructuredTrigger): { prefix: string; detail: string } {
  if (t.type === "event") {
    return { prefix: "Event", detail: t.label };
  }
  const tz = t.timezone ? ` ${formatTimezoneShort(t.timezone)}` : "";
  return { prefix: "Schedule", detail: `${t.label}${tz}` };
}

const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)", short: "ET" },
  { value: "America/Chicago", label: "Central Time (CT)", short: "CT" },
  { value: "America/Denver", label: "Mountain Time (MT)", short: "MT" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)", short: "PT" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)", short: "AKT" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)", short: "HT" },
];

function formatTimezoneShort(tz: string): string {
  return US_TIMEZONES.find((t) => t.value === tz)?.short ?? tz;
}

function inferStructuredTrigger(triggerStr: string): StructuredTrigger {
  const lower = triggerStr.toLowerCase();
  const scheduleKeywords = ["daily", "weekly", "monthly", "nightly", "every", "at ", "am", "pm"];
  const isSchedule = scheduleKeywords.some((kw) => lower.includes(kw));
  if (isSchedule) {
    return { type: "schedule", label: triggerStr, schedule: triggerStr, timezone: "America/Chicago" };
  }
  return { type: "event", label: triggerStr, event: triggerStr.toLowerCase().replace(/\s+/g, "_") };
}

// ─── Property Groups ───

type PropertyGroup = {
  id: string;
  name: string;
  type: "system" | "custom" | "smart";
  propertyIds: string[];
};

const PROPERTY_GROUPS: PropertyGroup[] = [
  { id: "pg-all", name: "All Properties", type: "system", propertyIds: PMC_PROPERTY_RECORDS.map((p) => p.id) },
  { id: "pg-class-a", name: "Class A Properties", type: "custom", propertyIds: ["prop.hillside", "prop.summit", "prop.lakewood", "prop.brookfield", "prop.sterling"] },
  { id: "pg-class-b", name: "Class B Properties", type: "custom", propertyIds: ["prop.jamison", "prop.cedarpoint", "prop.oakcrest", "prop.pinehurst", "prop.ridgeview"] },
  { id: "pg-student", name: "Student Housing", type: "custom", propertyIds: ["prop.university", "prop.campus"] },
  { id: "pg-senior", name: "Senior Living", type: "custom", propertyIds: ["prop.seniorgarden", "prop.goldenoak"] },
  { id: "pg-southwest", name: "Southwest Region", type: "custom", propertyIds: ["prop.desertsprings", "prop.mesaview", "prop.saguaro"] },
  { id: "pg-northeast", name: "Northeast Region", type: "custom", propertyIds: ["prop.hillside", "prop.summit", "prop.brookfield", "prop.sterling", "prop.lakewood"] },
  { id: "pg-high-occupancy", name: "High Occupancy (>95%)", type: "smart", propertyIds: ["prop.hillside", "prop.lakewood", "prop.sterling"] },
];

// ─── Build animation ───

const BUILD_PHASE_STEPS = [
  { key: "analyzing", label: "Analyzing requirements", duration: 1200 },
  { key: "mapping", label: "Identifying MCP connectors & data sources", duration: 1500 },
  { key: "generating", label: "Generating workflow graph", duration: 2000 },
  { key: "validating", label: "Validating against guardrails", duration: 1200 },
  { key: "compiling", label: "Compiling deterministic logic", duration: 800 },
] as const;

type DeterministicPhase = "describing" | "routing" | "connectors-unavailable" | "building" | "built";

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

type ForkMode = "new-version" | "edit";

type ModalStep =
  | { kind: "type-select" }
  | { kind: "deterministic"; forkFrom?: UnifiedAgent; forkMode?: ForkMode; freeOnly?: boolean }
  | { kind: "ai-powered"; forkFrom?: UnifiedAgent; forkMode?: ForkMode };

// ─── Property Picker ───

function PropertyPicker({
  selected,
  onChange,
  disabled = false,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [showGroups, setShowGroups] = useState(false);
  const filtered = PMC_PROPERTY_RECORDS.filter((p) =>
    `${p.name} ${p.city} ${p.state}`.toLowerCase().includes(search.toLowerCase())
  );
  const toggle = (id: string) => {
    if (disabled) return;
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const selectAll = () => {
    if (disabled) return;
    onChange(PMC_PROPERTY_RECORDS.map((p) => p.id));
  };
  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };
  const applyGroup = (group: PropertyGroup) => {
    if (disabled) return;
    const merged = new Set([...selected, ...group.propertyIds]);
    onChange(Array.from(merged));
    setShowGroups(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search properties..."
            disabled={disabled}
            className="w-full rounded-md border border-border bg-white py-1.5 pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
          />
        </div>
        <button
          type="button"
          onClick={selectAll}
          disabled={disabled}
          className="rounded-md border border-border px-2 py-1.5 text-[10px] font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          Select All
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={disabled}
          className="rounded-md border border-border px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          Clear All
        </button>
      </div>

      {/* Property groups dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setShowGroups(!showGroups)}
          disabled={disabled}
          className="flex w-full items-center justify-between rounded-md border border-dashed border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
        >
          <span className="flex items-center gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" /> Apply Property Group
          </span>
          <ChevronDown className={`h-3 w-3 transition-transform ${showGroups ? "rotate-180" : ""}`} />
        </button>
        {showGroups && (
          <div className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-white shadow-lg">
            {PROPERTY_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => applyGroup(g)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] transition-colors hover:bg-muted"
              >
                <span className="flex items-center gap-2">
                  <FolderOpen className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium text-foreground">{g.name}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{g.type}</span>
                </span>
                <span className="text-[10px] text-muted-foreground">{g.propertyIds.length} properties</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-md border border-border p-1">
        {filtered.map((p) => {
          const isSelected = selected.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              disabled={disabled}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] transition-colors disabled:opacity-50 ${
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
  onDelete,
  onNewVersion,
  onEditVersion,
  canEdit = true,
}: {
  agent: UnifiedAgent;
  onUpdate: (patch: Partial<UnifiedAgent>) => void;
  onClose: () => void;
  onDelete: () => void;
  onNewVersion: () => void;
  onEditVersion: (versionNumber: number) => void;
  canEdit?: boolean;
}) {
  const typeInfo = TYPE_STYLE[agent.type];
  const TypeIcon = typeInfo.icon;
  const statusInfo = STATUS_STYLE[agent.status];

  const [editingField, setEditingField] = useState<"name" | "description" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showActionsMenu) return;
    const handler = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) setShowActionsMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showActionsMenu]);

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
            {agent.engineType && agent.type === "deterministic" && (
              <WorkflowEngineBadge engine={agent.engineType} size="sm" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {(agent.status === "live" || agent.status === "paused") && canEdit && (
            <button
              type="button"
              onClick={toggleStatus}
              title={agent.status === "live" ? "Pause agent" : "Resume agent"}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            >
              {agent.status === "live" ? <ToggleRight className="h-5 w-5 text-emerald-600" /> : <ToggleLeft className="h-5 w-5" />}
            </button>
          )}
          {canEdit && (
            <div className="relative" ref={actionsMenuRef}>
              <button type="button" onClick={() => setShowActionsMenu((p) => !p)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" title="More actions">
                <MoreVertical className="h-4 w-4" />
              </button>
              {showActionsMenu && (
                <div className="absolute right-0 z-50 mt-1 w-48 rounded-lg border border-border bg-white py-1 shadow-lg">
                  {agent.status === "disabled" ? (
                    <button type="button" onClick={() => { onUpdate({ status: "paused" }); setShowActionsMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50">
                      <Power className="h-4 w-4" /> Re-enable Agent
                    </button>
                  ) : (
                    <button type="button" onClick={() => { onUpdate({ status: "disabled" }); setShowActionsMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-700 hover:bg-amber-50">
                      <Ban className="h-4 w-4" /> Disable Agent
                    </button>
                  )}
                  <div className="my-1 h-px bg-border" />
                  <button type="button" onClick={() => { setConfirmDelete(true); setShowActionsMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" /> Delete Agent
                  </button>
                </div>
              )}
            </div>
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

        {/* Cost & Essential */}
        {agent.costSummary && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cost This Month</h4>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onUpdate({ isEssential: !agent.isEssential })}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                    agent.isEssential
                      ? "border border-amber-300 bg-amber-50 text-amber-700"
                      : "border border-border bg-white text-muted-foreground hover:bg-slate-50"
                  }`}
                >
                  <Shield className="h-3 w-3" />
                  {agent.isEssential ? "Essential" : "Mark Essential"}
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded bg-white px-2 py-1.5 text-center">
                <p className="text-[14px] font-bold text-foreground">${agent.costSummary.currentMonthSpend.toFixed(2)}</p>
                <p className="text-[8px] text-muted-foreground">Current spend</p>
              </div>
              <div className="rounded bg-white px-2 py-1.5 text-center">
                <p className="text-[14px] font-bold text-foreground">${agent.costSummary.avgCostPerExecution.toFixed(3)}</p>
                <p className="text-[8px] text-muted-foreground">Avg/execution</p>
              </div>
              <div className="rounded bg-white px-2 py-1.5 text-center">
                <p className={`text-[14px] font-bold ${agent.costSummary.costTrend === "up" ? "text-red-600" : agent.costSummary.costTrend === "down" ? "text-emerald-600" : "text-foreground"}`}>
                  ${agent.costSummary.projectedMonthlySpend.toFixed(2)}
                </p>
                <p className="text-[8px] text-muted-foreground">Projected</p>
              </div>
            </div>
            {agent.isEssential && (
              <p className="mt-2 text-[9px] text-amber-600">
                <Shield className="mr-0.5 inline h-2.5 w-2.5" /> This agent will continue running even if the monthly budget is exceeded. Overage costs will be billed.
              </p>
            )}
          </div>
        )}

        {/* Triggers */}
        {agent.triggers.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Triggers ({agent.triggers.length})</h4>
            <div className="space-y-1.5">
              {agent.triggers.map((t, i) => {
                const { prefix, detail } = formatTriggerChip(t);
                return (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${t.type === "event" ? "bg-amber-100" : "bg-blue-100"}`}>
                      {t.type === "event" ? <Zap className="h-3 w-3 text-amber-600" /> : <Clock className="h-3 w-3 text-blue-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-foreground">{detail}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {prefix}{t.timezone ? ` · ${US_TIMEZONES.find((tz) => tz.value === t.timezone)?.label ?? t.timezone}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
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
            {canEdit && (
              <Button size="sm" variant="outline" onClick={onNewVersion} className="h-7 text-[11px]">
                <Plus className="mr-1 h-3 w-3" /> New Version
              </Button>
            )}
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
                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onEditVersion(v.versionNumber); }}
                        className="shrink-0 rounded border border-border px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/10"
                      >
                        <Pencil className="inline mr-0.5 h-3 w-3" /> Edit
                      </button>
                    )}
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

      {/* Disabled banner */}
      {agent.status === "disabled" && (
        <div className="shrink-0 border-t border-red-200 bg-red-50 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-[12px] font-semibold text-red-700">Agent Disabled</p>
                <p className="text-[10px] text-red-600">This agent is not running. Re-enable it to resume operations.</p>
              </div>
            </div>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => onUpdate({ status: "paused" })} className="border-red-200 text-red-700 hover:bg-red-100">
                <Power className="mr-1.5 h-3 w-3" /> Re-enable
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="w-[420px] rounded-xl border border-border bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-foreground">Delete &quot;{agent.name}&quot;?</p>
                <p className="text-[12px] text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>
            <p className="mb-4 text-[12px] text-muted-foreground">
              The agent and all its versions will be permanently removed from your Agent Builder. Historical execution data will be retained for auditing purposes.
            </p>
            {agent.agentTier === "free" && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-[11px] font-semibold text-amber-800">This is a free agent</p>
                <p className="text-[10px] text-amber-700">Deleting a free agent will open up a free slot. You can designate another eligible deterministic agent as free from your agent list.</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={() => { setConfirmDelete(false); onDelete(); }}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete Agent
              </Button>
            </div>
          </div>
        </div>
      )}
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
  version_edited: { label: "Version Edited", icon: Pencil, color: "text-orange-600 bg-orange-100" },
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
        triggers: agent.triggers.length > 0 ? agent.triggers.map((t) => t.label) : undefined,
        prompt: agent.aiContext?.prompt,
        guardrails: agent.aiContext?.guardrails,
        classification: agent.aiContext?.classification,
        skillIds: agent.aiContext?.skillIds,
        structuredGuardrails: agent.aiContext?.structuredGuardrails,
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
  onClose,
  forkFrom,
  forkMode,
}: {
  onComplete: (agent: Omit<UnifiedAgent, "id" | "createdAt" | "lastRunAt" | "runsLast30d" | "executionLog" | "changeHistory">) => void;
  onBack?: () => void;
  onClose?: () => void;
  forkFrom?: UnifiedAgent;
  forkMode?: ForkMode;
}) {
  const isForking = !!forkFrom;
  const isEditing = forkMode === "edit";
  const nextVersion = isEditing
    ? forkFrom!.activeVersion
    : forkFrom ? Math.max(...forkFrom.versions.map((v) => v.versionNumber)) + 1 : 1;

  const startsAtWorkflow = (isEditing || isForking) && forkFrom;
  const [phase, setPhase] = useState<DeterministicPhase>(startsAtWorkflow ? "built" : "describing");
  const [agentName, setAgentName] = useState(forkFrom?.name ?? "");
  const [prompt, setPrompt] = useState(forkFrom?.description ?? "");
  const [versionNote, setVersionNote] = useState(isForking ? "" : "");
  const [buildStep, setBuildStep] = useState(0);
  const [builtWorkflow, setBuiltWorkflow] = useState<BuiltWorkflow | null>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "running" | "passed">("idle");
  const [testEnv, setTestEnv] = useState<"sandbox" | "production">("sandbox");
  const [selectedProperties, setSelectedProperties] = useState<string[]>(forkFrom?.propertyIds ?? []);
  const [llmSource, setLlmSource] = useState<"llm" | "fallback" | null>(null);
  const [routingDecision, setRoutingDecision] = useState<RoutingDecision | null>(null);
  const [routingAnimating, setRoutingAnimating] = useState(false);
  const [routingThinkingStep, setRoutingThinkingStep] = useState(0);
  const [featureRequestSubmitted, setFeatureRequestSubmitted] = useState(false);
  const [showPropertyPickerInBuild, setShowPropertyPickerInBuild] = useState(false);
  const [additionalTriggers, setAdditionalTriggers] = useState<StructuredTrigger[]>([]);
  const [showAddTrigger, setShowAddTrigger] = useState(false);
  const [newTriggerType, setNewTriggerType] = useState<"event" | "schedule">("event");
  const [newTriggerLabel, setNewTriggerLabel] = useState("");
  const [newTriggerTimezone, setNewTriggerTimezone] = useState("America/Chicago");

  const editRanRef = useRef(false);
  useEffect(() => {
    if (editRanRef.current) return;
    if (startsAtWorkflow && prompt.trim()) {
      editRanRef.current = true;
      void (async () => {
        const genResult = await generateWorkflow(prompt.trim());

        setLlmSource(genResult.source);
        setBuiltWorkflow({
          name: agentName,
          description: prompt,
          triggers: genResult.workflow.triggers ?? [],
          dataSources: genResult.workflow.dataSources ?? [],
          nodes: genResult.workflow.nodes ?? [],
          edges: genResult.workflow.edges ?? [],
        });
        setRoutingDecision({
          engine: forkFrom?.engineType ?? "entrata-native",
          confidence: 1,
          matches: [],
          entrataCount: 0,
          workatoCount: 0,
          reasoning: "Loaded from existing agent",
          costImpact: { label: "", monthlyEstimate: "", perTaskEstimate: "", explanation: "" },
          externalSystems: [],
          source: "fallback",
          connectorGaps: [],
        });
        setPhase("built");
      })();
    }
  }, []);

  const handleAnalyze = async () => {
    if (!prompt.trim() || !agentName.trim()) return;
    setRoutingAnimating(true);
    setRoutingThinkingStep(0);

    const thinkingSteps = [
      "Reading your workflow description...",
      "Analyzing against Entrata MCP capabilities...",
      "Checking for external system requirements...",
      "Determining optimal execution engine...",
    ];
    let stepIdx = 0;
    const thinkingInterval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, thinkingSteps.length - 1);
      setRoutingThinkingStep(stepIdx);
    }, 1500);

    try {
      const decision = await analyzePrompt(prompt.trim());
      clearInterval(thinkingInterval);
      setRoutingDecision(decision);
      setRoutingAnimating(false);

      if (decision.connectorGaps.length > 0) {
        setPhase("connectors-unavailable");
      } else {
        setPhase("routing");
      }
    } catch (err) {
      console.error("Routing analysis failed:", err);
      clearInterval(thinkingInterval);
      setRoutingAnimating(false);
    }
  };

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

  const visualizerWorkflow = useMemo(() => {
    if (!builtWorkflow) return null;
    return {
      name: builtWorkflow.name,
      description: builtWorkflow.description,
      nodes: builtWorkflow.nodes,
      edges: builtWorkflow.edges,
      dataSources: builtWorkflow.dataSources,
      triggers: builtWorkflow.triggers,
    };
  }, [builtWorkflow]);

  const [conversionBanner, setConversionBanner] = useState<{
    show: boolean;
    changeRequest: string;
    decision: RoutingDecision | null;
  }>({ show: false, changeRequest: "", decision: null });

  const handleIterationRequest = useCallback(async (changeRequest: string): Promise<"proceed" | "convert"> => {
    if (!routingDecision || routingDecision.engine !== "entrata-native") return "proceed";

    try {
      const recheck = await analyzeChangeRequest(prompt, changeRequest);
      if (recheck.engine !== "entrata-native") {
        setConversionBanner({ show: true, changeRequest, decision: recheck });
        return "convert";
      }
    } catch {
      // If re-analysis fails, proceed normally
    }
    return "proceed";
  }, [prompt, routingDecision]);

  const handleAcceptConversion = async () => {
    if (conversionBanner.decision) {
      setRoutingDecision(conversionBanner.decision);
      const combinedPrompt = `${prompt}\n\nAdditional requirement: ${conversionBanner.changeRequest}`;
      setPrompt(combinedPrompt);
      setConversionBanner({ show: false, changeRequest: "", decision: null });

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
        generateWorkflow(combinedPrompt.trim()),
        advanceUI(),
      ]);

      setLlmSource(genResult.source);
      setBuiltWorkflow({
        name: agentName,
        description: combinedPrompt,
        triggers: genResult.workflow.triggers ?? [],
        dataSources: genResult.workflow.dataSources ?? [],
        nodes: genResult.workflow.nodes ?? [],
        edges: genResult.workflow.edges ?? [],
      });
      setPhase("built");
    } else {
      setConversionBanner({ show: false, changeRequest: "", decision: null });
    }
  };

  const handleDismissConversion = () => {
    setConversionBanner({ show: false, changeRequest: "", decision: null });
  };

  const handleSave = () => {
    let versions: AgentVersion[];
    if (isEditing && forkFrom) {
      versions = forkFrom.versions;
    } else {
      const newVersion: AgentVersion = {
        id: `v${nextVersion}`,
        versionNumber: nextVersion,
        status: "sandbox",
        createdAt: new Date().toISOString(),
        description: versionNote.trim() || (isForking ? `Forked from v${forkFrom!.activeVersion}` : "Initial version"),
      };
      versions = forkFrom
        ? [...forkFrom.versions, newVersion]
        : [newVersion];
    }

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
      activeVersion: isEditing ? forkFrom!.activeVersion : nextVersion,
      propertyIds: selectedProperties,
      propertyVersionMap: pvMap,
      agentTier: forkFrom?.agentTier ?? "free",
      triggers: [
        ...(builtWorkflow?.triggers ?? []).map((t) => inferStructuredTrigger(t)),
        ...additionalTriggers,
      ],
      evals: forkFrom?.evals ?? [],
      engineType: routingDecision?.engine ?? "entrata-native",
    });
  };

  if (phase === "describing") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-4">
          {onBack && <button type="button" onClick={onBack} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Workflow className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {isEditing
                  ? `Edit "${forkFrom!.name}" v${forkFrom!.activeVersion}`
                  : isForking
                    ? `New Version of "${forkFrom!.name}"`
                    : "Build Deterministic Workflow"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {isEditing
                  ? `Editing version ${forkFrom!.activeVersion}`
                  : `Version ${nextVersion} · Draft`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-xl space-y-5">
            <div>
              <label htmlFor="wf-name" className="mb-1.5 block text-sm font-medium text-foreground">Agent name</label>
              {isForking ? (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2.5">
                  <span className="text-sm text-foreground">{agentName}</span>
                  <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Inherited</span>
                </div>
              ) : (
                <Input id="wf-name" value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="e.g. Renewal Offer Generator" />
              )}
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

            {/* Additional Triggers (multi-trigger support) */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Additional Triggers (optional)</label>
                <button
                  type="button"
                  onClick={() => setShowAddTrigger(!showAddTrigger)}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
                >
                  <Plus className="h-3 w-3" /> Add Trigger
                </button>
              </div>
              <p className="mb-2 text-[11px] text-muted-foreground">
                The AI will detect triggers from your description. Add more here if you want the same workflow to fire on multiple events.
              </p>
              {additionalTriggers.length > 0 && (
                <div className="mb-2 space-y-1.5">
                  {additionalTriggers.map((t, i) => {
                    const { prefix, detail } = formatTriggerChip(t);
                    return (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2">
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${t.type === "event" ? "bg-amber-100" : "bg-blue-100"}`}>
                          {t.type === "event" ? <Zap className="h-2.5 w-2.5 text-amber-600" /> : <Clock className="h-2.5 w-2.5 text-blue-600" />}
                        </div>
                        <span className="flex-1 text-[12px]"><strong>{prefix}:</strong> {detail}</span>
                        <button type="button" onClick={() => setAdditionalTriggers((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {showAddTrigger && (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={newTriggerType}
                      onChange={(e) => setNewTriggerType(e.target.value as "event" | "schedule")}
                      className="h-8 rounded-md border border-border bg-white px-2 text-[12px]"
                    >
                      <option value="event">Event</option>
                      <option value="schedule">Schedule</option>
                    </select>
                    <Input
                      value={newTriggerLabel}
                      onChange={(e) => setNewTriggerLabel(e.target.value)}
                      placeholder={newTriggerType === "event" ? "e.g. Move In Performed" : "e.g. Daily at 9:00 AM"}
                      className="h-8 flex-1 text-[12px]"
                    />
                  </div>
                  {newTriggerType === "schedule" && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      <select
                        value={newTriggerTimezone}
                        onChange={(e) => setNewTriggerTimezone(e.target.value)}
                        className="h-7 flex-1 rounded-md border border-border bg-white px-2 text-[11px]"
                      >
                        {US_TIMEZONES.map((tz) => (
                          <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!newTriggerLabel.trim()) return;
                        const trigger: StructuredTrigger = newTriggerType === "event"
                          ? { type: "event", label: newTriggerLabel.trim(), event: newTriggerLabel.trim().toLowerCase().replace(/\s+/g, "_") }
                          : { type: "schedule", label: newTriggerLabel.trim(), schedule: newTriggerLabel.trim(), timezone: newTriggerTimezone };
                        setAdditionalTriggers((prev) => [...prev, trigger]);
                        setNewTriggerLabel("");
                        setShowAddTrigger(false);
                      }}
                      className="h-7 text-[11px]"
                    >
                      Add
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddTrigger(false)} className="h-7 text-[11px]">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-[12px] text-emerald-800">
              <Code2 className="h-4 w-4 shrink-0" />
              AI builds deterministic code from your description using MCP connectors. The workflow runs without an LLM — same input, same output, every time.
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border px-6 py-4">
          {routingAnimating ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50/50 px-4 py-3">
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                  <BrainCircuit className="h-5 w-5 text-indigo-600 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-indigo-900">AI is analyzing your request...</p>
                  <p className="text-[11px] text-indigo-600 transition-all duration-300">
                    {[
                      "Reading your workflow description...",
                      "Analyzing against Entrata MCP capabilities...",
                      "Checking for external system requirements...",
                      "Determining optimal execution engine...",
                    ][routingThinkingStep]}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleAnalyze}
              disabled={!prompt.trim() || !agentName.trim()}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Cog className="mr-2 h-4 w-4" /> {isForking ? "Rebuild Workflow" : "Build Workflow"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (phase === "routing" && routingDecision) {
    const rd = routingDecision;
    const entrataMatches = rd.matches.filter((m) => m.source === "entrata");
    const workatoMatches = rd.matches.filter((m) => m.source === "workato");
    const extSystemNames = rd.externalSystems.length > 0
      ? rd.externalSystems
      : workatoMatches.map((m) => m.externalSystem ?? m.name);

    if (rd.engine === "workato") {
      return (
        <div className="flex h-full flex-col">
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-4">
            <button type="button" onClick={() => setPhase("describing")} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <ExternalLinkIcon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">This workflow requires Premium</h2>
                <p className="text-[11px] text-muted-foreground">
                  Your request involves {extSystemNames.length > 0 ? extSystemNames.join(", ") : "external systems"} — which {extSystemNames.length === 1 ? "is" : "are"} outside of Entrata.
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto w-full max-w-md space-y-5">
              <div className="rounded-xl border-2 border-violet-200 bg-violet-50/40 p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
                  <ExternalLinkIcon className="h-7 w-7 text-violet-600" />
                </div>
                <WorkflowEngineBadge engine="workato" size="lg" />
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                  {rd.reasoning}
                </p>

                {extSystemNames.length > 0 && (
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {extSystemNames.map((name, i) => (
                      <span key={i} className="rounded-full border border-violet-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-violet-700">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-violet-200 bg-violet-50/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-violet-600" />
                  <span className="text-[12px] font-semibold text-violet-800">Premium plan required</span>
                </div>
                <p className="mt-1 text-[11px] text-violet-700">
                  Agents using external connectors require a Premium plan. Your first 5 deterministic agents are free — this one uses a Premium slot.
                </p>
              </div>

              {rd.source === "llm" && (
                <p className="text-center text-[10px] text-muted-foreground">
                  <span className="mr-1 inline-flex items-center gap-0.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-600">AI-analyzed</span>
                  {Math.round(rd.confidence * 100)}% confidence
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-border px-6 py-4">
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setPhase("describing")} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Adjust Description
              </Button>
              <Button onClick={handleBuild} className="flex-1 bg-violet-600 text-white hover:bg-violet-700">
                <Cog className="mr-2 h-4 w-4" /> Build with Premium
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-4">
          <button type="button" onClick={() => setPhase("describing")} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Ready to build</h2>
              <p className="text-[11px] text-muted-foreground">Everything in your request can be handled by Entrata.</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto w-full max-w-md space-y-5">
            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
                <Shield className="h-7 w-7 text-emerald-600" />
              </div>
              <WorkflowEngineBadge engine="entrata-native" size="lg" />
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                {rd.reasoning}
              </p>

              {entrataMatches.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                  {entrataMatches.map((m, i) => (
                    <span key={i} className="rounded-full border border-emerald-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                      {m.name}{m.mcpTool ? ` (${m.mcpTool})` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-2.5 text-[12px] text-emerald-800">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="font-semibold">Included in your plan</span>
              </div>
              <p className="mt-1 text-[11px] text-emerald-700">
                Your first 5 deterministic agents are free. Additional agents and AI-powered agents require a premium plan.
              </p>
            </div>

            {rd.source === "llm" && (
              <p className="text-center text-[10px] text-muted-foreground">
                <span className="mr-1 inline-flex items-center gap-0.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-600">AI-analyzed</span>
                {Math.round(rd.confidence * 100)}% confidence
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-border px-6 py-4">
          <Button onClick={handleBuild} className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
            <Cog className="mr-2 h-4 w-4" /> Build Workflow
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "connectors-unavailable" && routingDecision) {
    const gaps = routingDecision.connectorGaps;
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-4">
          <button type="button" onClick={() => setPhase("describing")} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Connectors Not Yet Available</h2>
              <p className="text-[11px] text-muted-foreground">
                Your workflow requires Entrata capabilities we haven&apos;t built connectors for yet.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="mx-auto w-full max-w-lg space-y-5">
            {featureRequestSubmitted ? (
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-emerald-900">Feature Request Submitted</h3>
                <p className="mt-2 text-sm text-emerald-700">
                  Thank you! Our engineering team has been notified of your request for the following connectors:
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {gaps.map((gap, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-800">
                      <Cpu className="h-3 w-3" />
                      {gap.name}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-[12px] text-emerald-600">
                  We&apos;ll notify you when these connectors become available. In the meantime, you can build other workflows with our existing connectors.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-xl border-2 border-amber-200 bg-amber-50/40 p-6">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
                    <Cpu className="h-7 w-7 text-amber-600" />
                  </div>
                  <h3 className="text-center text-base font-semibold text-amber-900">
                    Missing Connectors
                  </h3>
                  <p className="mt-2 text-center text-[13px] leading-relaxed text-muted-foreground">
                    {routingDecision.reasoning}
                  </p>

                  <div className="mt-5 space-y-2.5">
                    {gaps.map((gap, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border border-amber-200 bg-white px-4 py-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100">
                          <XCircle className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-amber-900">{gap.name}</p>
                          <p className="text-[11px] text-amber-700">{gap.description}</p>
                          <Badge variant="outline" className="mt-1 border-amber-200 text-[9px] text-amber-600">{gap.category}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3">
                  <p className="text-[12px] leading-relaxed text-slate-700">
                    These are Entrata-internal capabilities that our team is planning to build.
                    Submit a feature request to let us know this is important to you, and we&apos;ll
                    prioritize it accordingly.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-border px-6 py-4">
          {featureRequestSubmitted ? (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setPhase("describing"); setFeatureRequestSubmitted(false); }} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Build a Different Workflow
              </Button>
              <Button variant="outline" onClick={onClose ?? onBack} className="flex-1">
                Close
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setPhase("describing")} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Adjust Description
              </Button>
              <Button
                onClick={() => setFeatureRequestSubmitted(true)}
                className="flex-1 bg-amber-600 text-white hover:bg-amber-700"
              >
                <Zap className="mr-2 h-4 w-4" /> Submit Feature Request
              </Button>
            </div>
          )}
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

  if (phase === "built" && !builtWorkflow) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
        <h2 className="mb-1 text-lg font-semibold text-foreground">Loading workflow...</h2>
        <p className="text-sm text-muted-foreground">Generating the workflow graph from the existing description</p>
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
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">{builtWorkflow.name}</h2>
                {routingDecision && <WorkflowEngineBadge engine={routingDecision.engine} size="sm" />}
              </div>
              <p className="text-[10px] text-muted-foreground">
                v{nextVersion} &middot; {builtWorkflow.nodes.length} nodes &middot; {builtWorkflow.edges.length} connections
                {llmSource === "llm" && <span className="ml-1 text-indigo-500">&#x2022; LLM-generated</span>}
                {llmSource === "fallback" && <span className="ml-1 text-amber-500">&#x2022; Template-based</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {builtWorkflow.triggers.map((t, i) => {
                const isScheduled = typeof t === "string" && /\d+:\d+\s*(AM|PM)/i.test(t);
                const tzAbbrev = newTriggerTimezone === "America/Chicago" ? "CT"
                  : newTriggerTimezone === "America/New_York" ? "ET"
                  : newTriggerTimezone === "America/Denver" ? "MT"
                  : newTriggerTimezone === "America/Los_Angeles" ? "PT"
                  : newTriggerTimezone === "America/Anchorage" ? "AKT"
                  : newTriggerTimezone === "Pacific/Honolulu" ? "HT"
                  : newTriggerTimezone.split("/").pop()?.replace(/_/g, " ") ?? "";
                return (
                  <Badge key={i} variant="outline" className="rounded-full border-amber-200 bg-amber-50 text-[10px] text-amber-700">
                    <Zap className="mr-0.5 h-2.5 w-2.5" /> {t}{isScheduled && tzAbbrev ? ` ${tzAbbrev}` : ""}
                  </Badge>
                );
              })}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPropertyPickerInBuild(!showPropertyPickerInBuild)}
              className="h-6 px-2 text-[10px]"
            >
              <Building2 className="mr-0.5 h-2.5 w-2.5" />
              {selectedProperties.length} Properties
              <ChevronDown className={`ml-0.5 h-2.5 w-2.5 transition-transform ${showPropertyPickerInBuild ? "rotate-180" : ""}`} />
            </Button>
            <Button size="sm" onClick={handleSave} className="h-7 px-3 text-[11px]">
              <Check className="mr-1 h-3 w-3" /> Save Agent
            </Button>
          </div>
        </div>

        {showPropertyPickerInBuild && (
          <div className="shrink-0 border-b border-border px-4 py-3">
            <div className="mx-auto max-w-md">
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Building2 className="mr-1 inline h-3 w-3" /> Properties
              </h4>
              <PropertyPicker selected={selectedProperties} onChange={setSelectedProperties} />
            </div>
          </div>
        )}

        {conversionBanner.show && conversionBanner.decision && (() => {
          const extSystems = conversionBanner.decision.externalSystems;
          const extLabel = extSystems.length > 0 ? extSystems.join(", ") : "external systems";
          return (
            <div className="shrink-0 border-b border-orange-200 bg-orange-50 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100">
                  <ExternalLinkIcon className="h-4 w-4 text-orange-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-orange-900">
                    Entrata cannot fulfill this request with Basic
                  </p>
                  <p className="mt-0.5 text-[11px] text-orange-700">
                    Your requested change (&ldquo;{conversionBanner.changeRequest.slice(0, 80)}
                    {conversionBanner.changeRequest.length > 80 ? "..." : ""}&rdquo;)
                    requires <strong>{extLabel}</strong>, which is outside of Entrata. To proceed, the workflow
                    will upgrade to Premium ({conversionBanner.decision.costImpact.monthlyEstimate}/month estimated).
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAcceptConversion}
                      className="h-6 bg-violet-600 px-3 text-[10px] text-white hover:bg-violet-700"
                    >
                      Upgrade to Premium
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDismissConversion}
                      className="h-6 border-orange-300 px-3 text-[10px] text-orange-700 hover:bg-orange-100"
                      title={`The ${extLabel} step will not be added. The remaining workflow stays on Basic.`}
                    >
                      Keep Basic (without {extSystems.length === 1 ? extSystems[0] : "external"} step)
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="min-h-0 flex-1">
          <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading workflow visualizer...</div>}>
            <WorkflowVisualizer
              workflow={visualizerWorkflow ?? {
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
              onIterationRequest={routingDecision?.engine === "entrata-native" ? handleIterationRequest : undefined}
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

  const [agents, setAgents] = useState<UnifiedAgent[]>(ENRICHED_AGENTS);
  const [budgetConfig, setBudgetConfig] = useState<BudgetConfig>(DEFAULT_BUDGET);
  const [showBudgetSettings, setShowBudgetSettings] = useState(false);
  const [showSpendAnalytics, setShowSpendAnalytics] = useState(false);
  const [showContractFlow, setShowContractFlow] = useState(false);
  const [contractState, setContractState] = useState<ContractState>(INITIAL_CONTRACT_STATE);
  const [contractStep, setContractStep] = useState<ContractStep>("properties");
  const [spendTimeframe, setSpendTimeframe] = useState<SpendTimeframe>("mtd");
  const [spendView, setSpendView] = useState<SpendView>("by-agent");
  const [drilldownAgentId, setDrilldownAgentId] = useState<string | null>(null);
  const [drilldownPropertyId, setDrilldownPropertyId] = useState<string | null>(null);
  const [budgetPropertySearch, setBudgetPropertySearch] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>({ kind: "type-select" });
  const [typeFilter, setTypeFilter] = useState<"all" | AgentType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AgentStatusValue>("all");
  const { viewerRole, canCreate, canEdit, isContracted, contractedPropertyIds, addContractedProperties, clearContract } = useAgentBuilderViewerRole();

  const freeAgents = useMemo(() => agents.filter((a) => a.agentTier === "free" && a.type === "deterministic"), [agents]);
  const freeAgentsUsed = freeAgents.filter((a) => a.status !== "draft").length;

  const contractedProperties = useMemo(() => PMC_PROPERTY_RECORDS.filter((p) => contractedPropertyIds.includes(p.id)), [contractedPropertyIds]);
  const totalProperties = contractedProperties.length;
  const totalMonthlyBudget = budgetConfig.budgetMode === "uniform"
    ? budgetConfig.monthlyBudgetPerProperty * totalProperties
    : contractedProperties.reduce((sum, p) => sum + (budgetConfig.propertyBudgets[p.id] ?? budgetConfig.monthlyBudgetPerProperty), 0);
  const totalCurrentSpend = agents.reduce((sum, a) => sum + (a.costSummary?.currentMonthSpend ?? 0), 0);
  const totalProjectedSpend = agents.reduce((sum, a) => sum + (a.costSummary?.projectedMonthlySpend ?? 0), 0);
  const budgetUsedPercent = totalMonthlyBudget > 0 ? (totalCurrentSpend / totalMonthlyBudget) * 100 : 0;
  const budgetAtRisk = budgetUsedPercent >= budgetConfig.alertThresholdPercent;
  const essentialAgentCount = agents.filter((a) => a.isEssential).length;
  const essentialSpend = agents.filter((a) => a.isEssential).reduce((sum, a) => sum + (a.costSummary?.currentMonthSpend ?? 0), 0);
  const freeAgentSavings = agents.filter((a) => a.agentTier === "free").reduce((sum, a) => sum + (a.costSummary?.wouldHaveCost ?? 0), 0);
  const freeAgentRuns = agents.filter((a) => a.agentTier === "free").reduce((sum, a) => sum + (a.costSummary?.executionsThisMonth ?? 0), 0);

  const timeframeLabel = spendTimeframe === "mtd" ? "Month to Date" : spendTimeframe === "last-month" ? "Last Month" : spendTimeframe === "ytd" ? "Year to Date" : "Custom Range";
  const timeframeMultiplier = spendTimeframe === "last-month" ? 1.4 : spendTimeframe === "ytd" ? 6.2 : 1;
  const daysInPeriod = spendTimeframe === "mtd" ? 22 : spendTimeframe === "last-month" ? 30 : spendTimeframe === "ytd" ? 173 : 22;

  const mockAgentSpend: MockAgentSpend[] = useMemo(() =>
    agents.filter((a) => a.costSummary && (a.costSummary.currentMonthSpend > 0 || (a.agentTier === "free" && (a.costSummary.executionsThisMonth ?? 0) > 0))).map((a) => {
      const isFree = a.agentTier === "free";
      const actualCost = isFree ? 0 : (a.costSummary?.currentMonthSpend ?? 0);
      const hypotheticalCost = isFree ? (a.costSummary?.wouldHaveCost ?? 0) : 0;
      const baseSpend = actualCost * timeframeMultiplier;
      const baseHypothetical = hypotheticalCost * timeframeMultiplier;
      return {
        agentId: a.id,
        agentName: a.name,
        agentType: a.type,
        spend: baseSpend,
        executions: Math.round((a.costSummary?.executionsThisMonth ?? 0) * timeframeMultiplier),
        trend: a.costSummary?.costTrend ?? "stable",
        isFree,
        isEssential: a.isEssential ?? false,
        wouldHaveCost: isFree ? baseHypothetical : undefined,
        dailySpend: Array.from({ length: Math.min(daysInPeriod, 30) }, (_, i) => ({
          day: i + 1,
          amount: isFree ? +((baseHypothetical) / daysInPeriod * (0.6 + Math.random() * 0.8)).toFixed(2) : +(baseSpend / daysInPeriod * (0.6 + Math.random() * 0.8)).toFixed(2),
        })),
        propertySpend: a.propertyIds.map((pid) => {
          const prop = PMC_PROPERTY_RECORDS.find((p) => p.id === pid);
          const share = 1 / Math.max(a.propertyIds.length, 1);
          const spendBase = isFree ? baseHypothetical : baseSpend;
          return {
            propertyId: pid,
            propertyName: prop?.name ?? pid,
            spend: +(spendBase * share * (0.7 + Math.random() * 0.6)).toFixed(2),
          };
        }),
      };
    }).sort((a, b) => {
      if (a.isFree && !b.isFree) return 1;
      if (!a.isFree && b.isFree) return -1;
      return b.spend - a.spend;
    }),
    [agents, timeframeMultiplier, daysInPeriod]
  );

  const totalSpendForPeriod = mockAgentSpend.reduce((s, a) => s + a.spend, 0);
  const maxAgentSpend = Math.max(...mockAgentSpend.map((a) => a.spend), 1);

  const propertyOverage = useMemo(() => {
    const propTotals = new Map<string, { name: string; totalSpend: number; budget: number; essentialSpend: number }>();
    for (const as of mockAgentSpend) {
      if (as.isFree) continue;
      for (const ps of as.propertySpend) {
        const existing = propTotals.get(ps.propertyId) ?? {
          name: ps.propertyName,
          totalSpend: 0,
          budget: budgetConfig.budgetMode === "uniform"
            ? budgetConfig.monthlyBudgetPerProperty * timeframeMultiplier
            : (budgetConfig.propertyBudgets[ps.propertyId] ?? budgetConfig.monthlyBudgetPerProperty) * timeframeMultiplier,
          essentialSpend: 0,
        };
        existing.totalSpend += ps.spend;
        if (as.isEssential) existing.essentialSpend += ps.spend;
        propTotals.set(ps.propertyId, existing);
      }
    }
    const result = new Map<string, { name: string; totalSpend: number; budget: number; overage: number; essentialSpend: number }>();
    for (const [pid, data] of propTotals) {
      const overage = Math.max(data.totalSpend - data.budget, 0);
      result.set(pid, { ...data, overage });
    }
    return result;
  }, [mockAgentSpend, budgetConfig, timeframeMultiplier]);

  const totalOverage = useMemo(
    () => Array.from(propertyOverage.values()).reduce((s, p) => s + p.overage, 0),
    [propertyOverage]
  );
  const propertiesOverBudget = useMemo(
    () => Array.from(propertyOverage.values()).filter((p) => p.overage > 0).length,
    [propertyOverage]
  );

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
    disabled: agents.filter((a) => a.status === "disabled").length,
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

  const deleteAgent = useCallback((id: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== id));
    setSelectedAgentId(null);
  }, []);

  const handleNewVersion = useCallback((agent: UnifiedAgent) => {
    setSelectedAgentId(null);
    setModalStep({
      kind: agent.type === "deterministic" ? "deterministic" : "ai-powered",
      forkFrom: agent,
      forkMode: "new-version",
    });
    setModalOpen(true);
  }, []);

  const handleEditVersion = useCallback((agent: UnifiedAgent, _versionNumber: number) => {
    setSelectedAgentId(null);
    setModalStep({
      kind: agent.type === "deterministic" ? "deterministic" : "ai-powered",
      forkFrom: agent,
      forkMode: "edit",
    });
    setModalOpen(true);
  }, []);

  const handleBuilderComplete = useCallback((result: Omit<UnifiedAgent, "id" | "createdAt" | "lastRunAt" | "runsLast30d" | "executionLog" | "changeHistory">) => {
    const forkFrom = modalStep.kind !== "type-select" ? modalStep.forkFrom : undefined;
    const forkMode = modalStep.kind !== "type-select" ? modalStep.forkMode : undefined;

    if (forkFrom && forkMode === "edit") {
      setAgents((prev) => prev.map((a) => {
        if (a.id !== forkFrom.id) return a;
        const changeEntry: ChangeHistoryEntry = {
          id: `ch-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: "user-current",
          userName: "Current User",
          action: "version_edited",
          summary: `Edited v${a.activeVersion}`,
          versionAffected: a.activeVersion,
        };
        return {
          ...a,
          name: result.name,
          description: result.description,
          propertyIds: result.propertyIds,
          propertyVersionMap: result.propertyVersionMap,
          triggers: result.triggers,
          evals: result.evals,
          engineType: result.engineType ?? a.engineType,
          changeHistory: [...a.changeHistory, changeEntry],
        };
      }));
    } else if (forkFrom) {
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
          engineType: result.engineType ?? a.engineType,
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

  const handleAiAgentCreated = useCallback((payload: {
    name: string;
    description: string;
    status: string;
    prompt?: string;
    guardrails?: string;
    classification?: string;
    skillIds?: string[];
    structuredGuardrails?: Array<{ label: string; enabled: boolean }>;
    triggers?: string[];
    versionDescription?: string;
  }) => {
    const forkFrom = modalStep.kind === "ai-powered" ? modalStep.forkFrom : undefined;
    const forkMode = modalStep.kind === "ai-powered" ? modalStep.forkMode : undefined;

    if (forkFrom && forkMode === "edit") {
      setAgents((prev) => prev.map((a) => {
        if (a.id !== forkFrom.id) return a;
        const changeEntry: ChangeHistoryEntry = {
          id: `ch-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: "user-current",
          userName: "Current User",
          action: "version_edited",
          summary: `Edited v${a.activeVersion}`,
          versionAffected: a.activeVersion,
        };
        return {
          ...a,
          name: payload.name,
          description: payload.description,
          triggers: payload.triggers ? payload.triggers.map((t) => inferStructuredTrigger(t)) : a.triggers,
          aiContext: {
            ...a.aiContext,
            prompt: payload.prompt ?? a.aiContext?.prompt,
            guardrails: payload.guardrails ?? a.aiContext?.guardrails,
            classification: payload.classification ?? a.aiContext?.classification,
            skillIds: payload.skillIds ?? a.aiContext?.skillIds,
            structuredGuardrails: payload.structuredGuardrails ?? a.aiContext?.structuredGuardrails,
          },
          changeHistory: [...a.changeHistory, changeEntry],
        };
      }));
    } else if (forkFrom && forkMode === "new-version") {
      setAgents((prev) => prev.map((a) => {
        if (a.id !== forkFrom.id) return a;
        const nextVersion = Math.max(...a.versions.map((v) => v.versionNumber)) + 1;
        const vDesc = payload.versionDescription?.trim() || `Version ${nextVersion}`;
        const newVersion: AgentVersion = {
          id: `v${nextVersion}`,
          versionNumber: nextVersion,
          status: payload.status === "live" ? "live" : "sandbox",
          createdAt: new Date().toISOString(),
          description: vDesc,
        };
        const changeEntry: ChangeHistoryEntry = {
          id: `ch-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: "user-current",
          userName: "Current User",
          action: "version_added",
          summary: `Created v${nextVersion} — ${vDesc}`,
          versionAffected: nextVersion,
        };
        return {
          ...a,
          name: payload.name,
          description: payload.description,
          versions: [...a.versions, newVersion],
          activeVersion: nextVersion,
          triggers: payload.triggers ? payload.triggers.map((t) => inferStructuredTrigger(t)) : a.triggers,
          aiContext: {
            ...a.aiContext,
            prompt: payload.prompt ?? a.aiContext?.prompt,
            guardrails: payload.guardrails ?? a.aiContext?.guardrails,
            classification: payload.classification ?? a.aiContext?.classification,
            skillIds: payload.skillIds ?? a.aiContext?.skillIds,
            structuredGuardrails: payload.structuredGuardrails ?? a.aiContext?.structuredGuardrails,
          },
          changeHistory: [...a.changeHistory, changeEntry],
        };
      }));
    } else {
      const newAgent: UnifiedAgent = {
        id: `ua-${Date.now()}`,
        name: payload.name,
        type: "ai-powered",
        description: payload.description,
        status: payload.status === "live" ? "live" : "sandbox",
        domain: "General",
        versions: [{
          id: "v1",
          versionNumber: 1,
          status: payload.status === "live" ? "live" : "sandbox",
          createdAt: new Date().toISOString(),
          description: "Initial version",
        }],
        activeVersion: 1,
        propertyIds: [],
        propertyVersionMap: {},
        agentTier: "premium",
        triggers: payload.triggers ? payload.triggers.map((t) => inferStructuredTrigger(t)) : [],
        evals: [],
        createdAt: new Date().toISOString(),
        runsLast30d: 0,
        executionLog: [],
        changeHistory: [{
          id: `ch-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: "user-current",
          userName: "Current User",
          action: "created",
          summary: "Created AI-powered agent",
          versionAffected: 1,
        }],
        aiContext: {
          prompt: payload.prompt,
          guardrails: payload.guardrails,
          classification: payload.classification,
          skillIds: payload.skillIds,
          structuredGuardrails: payload.structuredGuardrails,
        },
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
          canCreate ? (
            <Button onClick={openBuilder}>
              <Plus className="mr-2 h-4 w-4" /> Build New Agent
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
              <Lock className="h-3.5 w-3.5" />
              <span>Read-only access — contact your admin to enable agent creation</span>
            </div>
          )
        }
      />

      {/* <TodoListBanner /> */}

      {/* PLG: Free agent allowance banner */}
      <div className="mb-4 rounded-lg border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
                <Gift className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-violet-900">
                  Free Agents: {Math.min(freeAgentsUsed, FREE_AGENT_LIMIT)} / {FREE_AGENT_LIMIT} used
                </p>
                <p className="text-[11px] text-violet-600">
                  {freeAgentsUsed >= FREE_AGENT_LIMIT
                    ? "You've used all free agents. Contact sales to unlock unlimited agents for your properties."
                    : `${FREE_AGENT_LIMIT - freeAgentsUsed} free deterministic agent${FREE_AGENT_LIMIT - freeAgentsUsed !== 1 ? "s" : ""} remaining.`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-2 w-32 overflow-hidden rounded-full bg-violet-200">
                <div className="rounded-full bg-violet-600 transition-all" style={{ width: `${Math.min(100, (freeAgentsUsed / FREE_AGENT_LIMIT) * 100)}%` }} />
              </div>
              {freeAgentsUsed < FREE_AGENT_LIMIT ? (
                <Button size="sm" onClick={() => { setModalStep({ kind: "deterministic", freeOnly: true }); setModalOpen(true); }} className="h-7 bg-violet-600 text-[11px] text-white hover:bg-violet-700">
                  <Plus className="mr-1 h-3 w-3" /> Build New Agent
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => { if (isContracted) { setShowBudgetSettings(true); } else { setContractStep("properties"); setContractState({ ...INITIAL_CONTRACT_STATE, selectedPropertyIds: [...contractedPropertyIds] }); setShowContractFlow(true); } }} className="h-7 border-violet-300 text-[11px] text-violet-700 hover:bg-violet-50">
                  <Crown className="mr-1 h-3 w-3" /> Upgrade
                </Button>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-start gap-2 rounded-md border border-violet-100 bg-white/70 px-3 py-2 text-[10px] text-violet-700">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              <strong>How free agents work:</strong> Every client can build up to {FREE_AGENT_LIMIT} deterministic (rule-based) agents at no cost — configure triggers, actions, and conditions to automate any workflow you need.
              {isContracted
                ? "Your properties are contracted for unlimited deterministic and AI-powered agents with usage-based billing."
                : `AI-powered agents and additional deterministic agents beyond ${FREE_AGENT_LIMIT} require upgrading to a usage-based plan. Upgrade is self-service — no sales call needed.`}
            </span>
          </div>
        </div>

      {/* Non-contracted spend summary — show $0 spend but highlight savings */}
      {canEdit && !isContracted && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-gradient-to-r from-slate-50 to-gray-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                <DollarSign className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-900">Total Spend: $0.00</p>
                <p className="text-[11px] text-slate-500">Free tier — no usage charges</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setContractStep("properties"); setContractState({ ...INITIAL_CONTRACT_STATE, selectedPropertyIds: [...contractedPropertyIds] }); setShowContractFlow(true); }} className="h-7 border-indigo-300 text-[11px] text-indigo-700 hover:bg-indigo-50">
              <Crown className="mr-1 h-3 w-3" /> Upgrade for AI Agents & More
            </Button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <div className="rounded-md border border-white/50 bg-white/60 px-3 py-1.5 text-center">
              <p className="text-[15px] font-bold text-foreground">$0.00</p>
              <p className="text-[9px] text-muted-foreground">Spent this month</p>
            </div>
            <div className="rounded-md border border-white/50 bg-white/60 px-3 py-1.5 text-center">
              <p className="text-[15px] font-bold text-foreground">{freeAgentRuns}</p>
              <p className="text-[9px] text-muted-foreground">Free agent runs</p>
            </div>
            <div className="rounded-md border border-emerald-200/60 bg-emerald-50/60 px-3 py-1.5 text-center">
              <p className="text-[15px] font-bold text-emerald-700">${freeAgentSavings.toFixed(2)}</p>
              <p className="text-[9px] text-emerald-600">Saved with free agents</p>
            </div>
          </div>
        </div>
      )}

      {/* Budget & Billing banner — hidden for read-only users and non-contracted */}
      {canEdit && isContracted && <div className={`mb-4 rounded-lg border px-4 py-3 ${budgetAtRisk ? "border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50" : "border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${budgetAtRisk ? "bg-orange-100" : "bg-emerald-100"}`}>
              <DollarSign className={`h-5 w-5 ${budgetAtRisk ? "text-orange-600" : "text-emerald-600"}`} />
            </div>
            <div>
              <p className={`text-[13px] font-semibold ${budgetAtRisk ? "text-orange-900" : "text-emerald-900"}`}>
                Monthly Budget: ${totalCurrentSpend.toFixed(2)} / ${totalMonthlyBudget.toFixed(2)}
              </p>
              <p className={`text-[11px] ${budgetAtRisk ? "text-orange-600" : "text-emerald-600"}`}>
                {budgetUsedPercent.toFixed(0)}% used
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-2 w-32 overflow-hidden rounded-full bg-gray-200">
              <div className={`rounded-full transition-all ${budgetUsedPercent >= 90 ? "bg-red-500" : budgetAtRisk ? "bg-orange-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, budgetUsedPercent)}%` }} />
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowSpendAnalytics((v) => !v)} className={`h-7 px-3 text-[11px] ${budgetAtRisk ? "border-orange-300 text-orange-700 hover:bg-orange-50" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}>
              <BarChart3 className="mr-1 h-3 w-3" /> Spend Analysis
            </Button>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => setShowBudgetSettings(true)} className={`h-7 px-3 text-[11px] ${budgetAtRisk ? "border-orange-300 text-orange-700 hover:bg-orange-50" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}>
                <Cog className="mr-1 h-3 w-3" /> Edit Budget
              </Button>
            )}
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <div className="rounded-md border border-white/50 bg-white/60 px-3 py-1.5 text-center">
            <p className="text-[15px] font-bold text-foreground">${totalCurrentSpend.toFixed(2)}</p>
            <p className="text-[9px] text-muted-foreground">Spent this month</p>
          </div>
          <div className="rounded-md border border-white/50 bg-white/60 px-3 py-1.5 text-center">
            <p className="text-[15px] font-bold text-foreground">{totalProperties}</p>
            <p className="text-[9px] text-muted-foreground">Contracted Properties</p>
            {totalProperties < PMC_PROPERTY_RECORDS.length && (
              <button type="button" onClick={() => { setContractStep("properties"); setContractState({ ...INITIAL_CONTRACT_STATE, selectedPropertyIds: [...contractedPropertyIds] }); setShowContractFlow(true); }} className="mt-0.5 text-[8px] text-indigo-600 underline hover:text-indigo-800">
                + Add more
              </button>
            )}
          </div>
          <div className="rounded-md border border-emerald-200/60 bg-emerald-50/60 px-3 py-1.5 text-center">
            <p className="text-[15px] font-bold text-emerald-700">${freeAgentSavings.toFixed(2)}</p>
            <p className="text-[9px] text-emerald-600">Free savings ({freeAgentRuns} runs)</p>
          </div>
        </div>
      </div>}

      {/* Spend Analytics Panel — only for contracted clients */}
      {canEdit && isContracted && showSpendAnalytics && (
        <div className="mb-4 rounded-lg border border-border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-foreground">
                {drilldownAgentId ? (
                  <span className="flex items-center gap-1">
                    <button type="button" onClick={() => setDrilldownAgentId(null)} className="text-indigo-600 hover:underline">Spend Analytics</button>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <span>{agents.find((a) => a.id === drilldownAgentId)?.name ?? "Agent"}</span>
                  </span>
                ) : drilldownPropertyId ? (
                  <span className="flex items-center gap-1">
                    <button type="button" onClick={() => setDrilldownPropertyId(null)} className="text-indigo-600 hover:underline">Spend Analytics</button>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <span>{PMC_PROPERTY_RECORDS.find((p) => p.id === drilldownPropertyId)?.name ?? "Property"}</span>
                  </span>
                ) : "Spend Analytics"}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {!drilldownAgentId && !drilldownPropertyId && (
                <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
                  {(["by-agent", "by-day", "by-property"] as const).map((v) => (
                    <button key={v} type="button" onClick={() => setSpendView(v)} className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${spendView === v ? "bg-indigo-600 text-white" : "text-muted-foreground hover:bg-muted"}`}>
                      {v === "by-agent" ? "By Agent" : v === "by-day" ? "By Day" : "By Property"}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
                {(["mtd", "last-month", "ytd"] as const).map((tf) => (
                  <button key={tf} type="button" onClick={() => setSpendTimeframe(tf)} className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${spendTimeframe === tf ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}>
                    {tf === "mtd" ? "MTD" : tf === "last-month" ? "Last Month" : "YTD"}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { setShowSpendAnalytics(false); setDrilldownAgentId(null); setDrilldownPropertyId(null); }} className="rounded p-1 text-muted-foreground hover:bg-muted">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {drilldownAgentId ? (() => {
            const agentData = mockAgentSpend.find((a) => a.agentId === drilldownAgentId);
            if (!agentData) return <p className="text-sm text-muted-foreground">No data available.</p>;
            const maxPropSpend = Math.max(...agentData.propertySpend.map((p) => p.spend), 1);
            return (
              <div>
                {agentData.isFree && (
                  <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white">Free Agent</span>
                      <span className="text-[10px] text-emerald-800">This agent runs at no cost as part of your free allocation.</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                      <span className="text-emerald-700">You&apos;ve saved</span>
                      <span className="text-[14px] font-bold text-emerald-800">${(agentData.wouldHaveCost ?? 0).toFixed(2)}</span>
                      <span className="text-emerald-700">this period</span>
                    </div>
                  </div>
                )}
                <div className="mb-3 grid grid-cols-3 gap-3">
                  <div className={`rounded-lg border px-3 py-2 text-center ${agentData.isFree ? "border-emerald-200 bg-emerald-50/50" : "border-border bg-slate-50"}`}>
                    {agentData.isFree ? (
                      <>
                        <p className="text-[16px] font-bold text-emerald-700">$0.00</p>
                        <p className="text-[10px] text-muted-foreground/60 line-through">${(agentData.wouldHaveCost ?? 0).toFixed(2)}</p>
                      </>
                    ) : (
                      <p className="text-[16px] font-bold text-foreground">${agentData.spend.toFixed(2)}</p>
                    )}
                    <p className="text-[9px] text-muted-foreground">{agentData.isFree ? "Would have cost" : `Total spend (${timeframeLabel})`}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-center">
                    <p className="text-[16px] font-bold text-foreground">{agentData.executions.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">Executions</p>
                  </div>
                  <div className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-center">
                    <p className="text-[16px] font-bold text-foreground">{agentData.propertySpend.length}</p>
                    <p className="text-[9px] text-muted-foreground">Properties</p>
                  </div>
                </div>
                <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">{agentData.isFree ? "Usage by Property (would have cost)" : "Spend by Property"}</p>
                <div className="space-y-1.5">
                  {agentData.propertySpend.sort((a, b) => b.spend - a.spend).map((ps) => (
                    <div key={ps.propertyId} className="flex items-center gap-2">
                      <span className="w-36 shrink-0 truncate text-[11px] font-medium text-foreground">{ps.propertyName}</span>
                      <div className={`relative h-5 flex-1 overflow-hidden rounded ${agentData.isFree ? "bg-emerald-50" : "bg-slate-100"}`}>
                        <div className={`absolute inset-y-0 left-0 rounded ${agentData.isFree ? "bg-emerald-200" : "bg-indigo-200"}`} style={{ width: `${(ps.spend / maxPropSpend) * 100}%` }} />
                        <span className={`relative z-10 flex h-full items-center px-2 text-[10px] font-semibold ${agentData.isFree ? "text-emerald-900 line-through" : "text-indigo-900"}`}>${ps.spend.toFixed(2)}</span>
                      </div>
                      {agentData.isFree && <span className="shrink-0 text-[9px] font-semibold text-emerald-600">Free</span>}
                    </div>
                  ))}
                </div>
                {(() => {
                  const ds = agentData.dailySpend;
                  const maxD = Math.max(...ds.map((x) => x.amount), 0.01);
                  const cW = 500; const cH = 100; const pL = 36; const pR = 6; const pT = 6; const pB = 18;
                  const pW = cW - pL - pR; const pH = cH - pT - pB;
                  const xS = ds.length > 1 ? pW / (ds.length - 1) : pW;
                  const yS = (v: number) => pT + pH - (v / maxD) * pH;
                  const pts = ds.map((d, i) => `${pL + i * xS},${yS(d.amount)}`).join(" ");
                  const areaPath = `M${pL},${yS(0)} ${ds.map((d, i) => `L${pL + i * xS},${yS(d.amount)}`).join(" ")} L${pL + (ds.length - 1) * xS},${yS(0)} Z`;
                  const lineColor = agentData.isFree ? "#10b981" : "#6366f1";
                  return (
                    <div className="mt-4">
                      <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">{agentData.isFree ? "Daily Usage (would have cost)" : "Daily Spend Trend"}</p>
                      <svg viewBox={`0 0 ${cW} ${cH}`} className="w-full" style={{ maxHeight: 120 }}>
                        {[0, 1, 2, 3].map((i) => { const v = (maxD / 3) * (3 - i); return <g key={i}><line x1={pL} y1={yS(v)} x2={cW - pR} y2={yS(v)} stroke="#e5e7eb" strokeWidth={0.5} /><text x={pL - 3} y={yS(v) + 3} textAnchor="end" fontSize={6} fill="#9ca3af">${v.toFixed(0)}</text></g>; })}
                        <path d={areaPath} fill={`url(#areaGrad-${agentData.agentId})`} opacity={0.2} />
                        <defs><linearGradient id={`areaGrad-${agentData.agentId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={lineColor} /><stop offset="100%" stopColor={lineColor} stopOpacity={0} /></linearGradient></defs>
                        <polyline points={pts} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinejoin="round" />
                        {ds.map((d, i) => <circle key={i} cx={pL + i * xS} cy={yS(d.amount)} r={2} fill={lineColor}><title>Day {d.day}: ${d.amount.toFixed(2)}{agentData.isFree ? " (free)" : ""}</title></circle>)}
                        {ds.filter((_, i) => ds.length <= 10 || i % Math.ceil(ds.length / 8) === 0 || i === ds.length - 1).map((d) => <text key={d.day} x={pL + (d.day - 1) * xS} y={cH - 3} textAnchor="middle" fontSize={6} fill="#9ca3af">{d.day}</text>)}
                      </svg>
                    </div>
                  );
                })()}
              </div>
            );
          })() : drilldownPropertyId ? (() => {
            const propRecord = PMC_PROPERTY_RECORDS.find((p) => p.id === drilldownPropertyId);
            const propAgents = mockAgentSpend.filter((a) => a.propertySpend.some((ps) => ps.propertyId === drilldownPropertyId)).map((a) => {
              const ps = a.propertySpend.find((ps2) => ps2.propertyId === drilldownPropertyId);
              return { ...a, propertySpecificSpend: ps?.spend ?? 0 };
            }).sort((a, b) => b.propertySpecificSpend - a.propertySpecificSpend);
            const totalPropertySpend = propAgents.reduce((s, a) => s + (a.isFree ? 0 : a.propertySpecificSpend), 0);
            const totalWouldHaveCost = propAgents.filter((a) => a.isFree).reduce((s, a) => s + a.propertySpecificSpend, 0);
            const totalPropertyExecs = propAgents.reduce((s, a) => s + Math.round(a.executions / Math.max(a.propertySpend.length, 1)), 0);
            const maxPAS = Math.max(...propAgents.map((a) => a.propertySpecificSpend), 1);
            const propOverageData = propertyOverage.get(drilldownPropertyId);
            const propBudget = propOverageData?.budget ?? budgetConfig.monthlyBudgetPerProperty * timeframeMultiplier;
            const propOverage = propOverageData?.overage ?? 0;
            const budgetPct = propBudget > 0 ? Math.min((totalPropertySpend / propBudget) * 100, 100) : 0;
            const overagePct = propBudget > 0 ? Math.min((propOverage / propBudget) * 100, 50) : 0;
            return (
              <div>
                <div className={`mb-3 rounded-lg border px-3 py-2 ${propOverage > 0 ? "border-orange-200 bg-orange-50/50" : "border-indigo-100 bg-indigo-50/50"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-[13px] font-semibold ${propOverage > 0 ? "text-orange-900" : "text-indigo-900"}`}>{propRecord?.name ?? drilldownPropertyId}</p>
                      <p className="text-[10px] text-muted-foreground">{propRecord?.city}, {propRecord?.state}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {propOverage > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-semibold text-orange-700">
                          <AlertTriangle className="h-2.5 w-2.5" /> Over budget
                        </span>
                      )}
                      <span className="text-[10px] text-indigo-600">{timeframeLabel}</span>
                    </div>
                  </div>
                </div>
                <div className={`mb-3 grid gap-3 ${propOverage > 0 ? "grid-cols-4" : "grid-cols-3"}`}>
                  <div className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-center">
                    <p className="text-[16px] font-bold text-foreground">${totalPropertySpend.toFixed(2)}</p>
                    <p className="text-[9px] text-muted-foreground">Total spend</p>
                  </div>
                  {propOverage > 0 && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-center">
                      <p className="text-[16px] font-bold text-orange-700">${propOverage.toFixed(2)}</p>
                      <p className="text-[9px] text-orange-600">Overage</p>
                    </div>
                  )}
                  <div className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-center">
                    <p className="text-[16px] font-bold text-foreground">{totalPropertyExecs.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">Executions</p>
                  </div>
                  <div className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-center">
                    <p className="text-[16px] font-bold text-foreground">{propAgents.length}</p>
                    <p className="text-[9px] text-muted-foreground">Active agents</p>
                  </div>
                </div>
                <div className="mb-3 rounded-lg border border-border bg-slate-50 px-3 py-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-foreground">Budget: ${propBudget.toFixed(2)}</span>
                    <span className={`text-[10px] font-semibold ${propOverage > 0 ? "text-orange-700" : "text-emerald-700"}`}>
                      {propOverage > 0 ? `${((totalPropertySpend / propBudget) * 100).toFixed(0)}% — $${propOverage.toFixed(2)} over` : `${budgetPct.toFixed(0)}% used`}
                    </span>
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className={`absolute inset-y-0 left-0 rounded-full ${propOverage > 0 ? "bg-emerald-400" : "bg-emerald-400"}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
                    {propOverage > 0 && (
                      <div className="absolute inset-y-0 rounded-full bg-orange-400" style={{ left: `${Math.min(budgetPct, 100)}%`, width: `${overagePct}%` }} />
                    )}
                  </div>
                </div>
                {propOverage > 0 && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5">
                    <AlertTriangle className="h-3 w-3 shrink-0 text-orange-600" />
                    <span className="text-[10px] text-orange-800">
                      Budget exceeded — essential agents continued running, generating <strong>${propOverage.toFixed(2)}</strong> in overage charges.
                    </span>
                  </div>
                )}
                {totalWouldHaveCost > 0 && (
                  <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5">
                    <span className="text-[10px] text-emerald-800">Free agents at this property saved <strong>${totalWouldHaveCost.toFixed(2)}</strong> this period</span>
                  </div>
                )}
                <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">Agent Usage at this Property</p>
                <div className="space-y-1">
                  {propAgents.map((pa) => (
                    <button
                      key={pa.agentId}
                      type="button"
                      onClick={() => { setDrilldownPropertyId(null); setDrilldownAgentId(pa.agentId); }}
                      className={`group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${pa.isFree ? "border border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50" : "hover:bg-slate-50"}`}
                    >
                      <span className="w-40 shrink-0 truncate text-[11px] font-medium text-foreground">{pa.agentName}</span>
                      <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-semibold ${pa.agentType === "deterministic" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-purple-200 bg-purple-50 text-purple-700"}`}>
                        {pa.agentType === "deterministic" ? "Workflow" : "AI"}
                      </span>
                      {pa.isEssential && <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-semibold text-amber-700">Essential</span>}
                      {pa.isFree ? (
                        <div className="flex flex-1 items-center gap-1.5 px-1">
                          <span className="text-[10px] text-muted-foreground/60 line-through">${pa.propertySpecificSpend.toFixed(2)}</span>
                          <span className="text-[10px] font-semibold text-emerald-700">$0.00</span>
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">Free</span>
                        </div>
                      ) : (
                        <div className="relative h-4 flex-1 overflow-hidden rounded bg-slate-100">
                          <div className={`absolute inset-y-0 left-0 rounded ${pa.agentType === "deterministic" ? "bg-blue-200" : "bg-purple-200"}`} style={{ width: `${(pa.propertySpecificSpend / maxPAS) * 100}%` }} />
                          <span className="relative z-10 flex h-full items-center px-2 text-[10px] font-semibold text-foreground">${pa.propertySpecificSpend.toFixed(2)}</span>
                        </div>
                      )}
                      <span className="shrink-0 text-[9px] text-muted-foreground">{Math.round(pa.executions / Math.max(pa.propertySpend.length, 1))} runs</span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-foreground" />
                    </button>
                  ))}
                </div>
                {(() => {
                  const AREA_COLORS_P = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];
                  const MONTH_NAMES_P = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  const today = new Date();
                  let sDate: Date;
                  if (spendTimeframe === "ytd") { sDate = new Date(today.getFullYear(), 0, 1); }
                  else if (spendTimeframe === "last-month") { sDate = new Date(today.getFullYear(), today.getMonth() - 1, 1); }
                  else { sDate = new Date(today.getFullYear(), today.getMonth(), 1); }
                  const eDate = spendTimeframe === "last-month" ? new Date(today.getFullYear(), today.getMonth(), 0) : today;
                  const tDays = Math.max(Math.ceil((eDate.getTime() - sDate.getTime()) / 86400000) + 1, 1);
                  const dlabels: { label: string }[] = Array.from({ length: tDays }, (_, i) => {
                    const d = new Date(sDate); d.setDate(d.getDate() + i);
                    return { label: `${MONTH_NAMES_P[d.getMonth()]} ${d.getDate()}` };
                  });

                  const paidAtProp = propAgents.filter((a) => !a.isFree);
                  if (paidAtProp.length === 0) return null;
                  const perAgent = paidAtProp.map((a) => {
                    const avgD = a.propertySpecificSpend / Math.max(tDays, 1);
                    return Array.from({ length: tDays }, () => +(avgD * (0.5 + Math.random())).toFixed(2));
                  });
                  const cum = perAgent.map((daily) => { let r = 0; return daily.map((v) => { r += v; return +r.toFixed(2); }); });
                  const stacked: number[][] = [];
                  for (let ai = 0; ai < paidAtProp.length; ai++) {
                    stacked[ai] = cum[ai].map((v, d) => { let b = 0; for (let k = 0; k < ai; k++) b += cum[k][d]; return b + v; });
                  }
                  const bases: number[][] = [];
                  for (let ai = 0; ai < paidAtProp.length; ai++) {
                    bases[ai] = cum[ai].map((_, d) => { let b = 0; for (let k = 0; k < ai; k++) b += cum[k][d]; return b; });
                  }
                  const gMax = Math.max(...(stacked[paidAtProp.length - 1] ?? [0]), 0.01);
                  const budgetLine = propBudget;

                  const cW = 600; const cH = 180; const pL = 44; const pR = 10; const pT = 10; const pB = 28;
                  const pW = cW - pL - pR; const pH = cH - pT - pB;
                  const xS = tDays > 1 ? pW / (tDays - 1) : pW;
                  const displayMax = Math.max(gMax, budgetLine * 1.1);
                  const yS = (v: number) => pT + pH - (v / displayMax) * pH;
                  const gLines = 4;
                  const lInterval = tDays <= 14 ? 1 : tDays <= 35 ? 3 : tDays <= 90 ? 7 : 14;

                  return (
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-muted-foreground">Cumulative Spend at Property</p>
                        {propOverage > 0 && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-semibold text-orange-700">Budget: ${propBudget.toFixed(0)}</span>}
                      </div>
                      <svg viewBox={`0 0 ${cW} ${cH}`} className="w-full" style={{ maxHeight: 220 }}>
                        {Array.from({ length: gLines + 1 }, (_, i) => {
                          const val = (displayMax / gLines) * (gLines - i);
                          const y = yS(val);
                          return (<g key={i}><line x1={pL} y1={y} x2={cW - pR} y2={y} stroke="#e5e7eb" strokeWidth={0.5} /><text x={pL - 4} y={y + 3} textAnchor="end" fontSize={6.5} fill="#9ca3af">${val.toFixed(0)}</text></g>);
                        })}
                        {budgetLine <= displayMax && (
                          <g>
                            <line x1={pL} y1={yS(budgetLine)} x2={cW - pR} y2={yS(budgetLine)} stroke="#f97316" strokeWidth={1} strokeDasharray="4 3" />
                            <text x={cW - pR + 2} y={yS(budgetLine) + 3} fontSize={6} fill="#f97316" textAnchor="start">Budget</text>
                          </g>
                        )}
                        {[...paidAtProp].reverse().map((agent, revIdx) => {
                          const ai = paidAtProp.length - 1 - revIdx;
                          const color = AREA_COLORS_P[ai % AREA_COLORS_P.length];
                          const topPts = Array.from({ length: tDays }, (_, d) => `${pL + d * xS},${yS(stacked[ai][d])}`);
                          const bottomPts = Array.from({ length: tDays }, (_, d) => `${pL + d * xS},${yS(bases[ai][d])}`).reverse();
                          return (<g key={agent.agentId}><path d={`M${topPts.join(" L")} L${bottomPts.join(" L")} Z`} fill={color} opacity={0.55} /><polyline points={topPts.join(" ")} fill="none" stroke={color} strokeWidth={1} strokeLinejoin="round" opacity={0.8} /></g>);
                        })}
                        {dlabels.map((dl, i) => {
                          if (i === 0 || i === tDays - 1 || i % lInterval === 0) {
                            return (<text key={i} x={pL + i * xS} y={cH - 4} textAnchor="middle" fontSize={6} fill="#9ca3af" transform={tDays > 35 ? `rotate(-30, ${pL + i * xS}, ${cH - 4})` : undefined}>{dl.label}</text>);
                          }
                          return null;
                        })}
                      </svg>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 px-1">
                        {paidAtProp.map((agent, ai) => (
                          <span key={agent.agentId} className="flex items-center gap-1 text-[8px] text-muted-foreground">
                            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: AREA_COLORS_P[ai % AREA_COLORS_P.length] }} />
                            <span className="max-w-[90px] truncate">{agent.agentName}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })() : spendView === "by-agent" ? (
            <div>
              <div className="mb-3 flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-semibold text-indigo-900">Paid: ${totalSpendForPeriod.toFixed(2)}</span>
                  {mockAgentSpend.some((a) => a.isFree) && (
                    <span className="text-[10px] text-emerald-600">+ ${mockAgentSpend.filter((a) => a.isFree).reduce((s, a) => s + (a.wouldHaveCost ?? 0), 0).toFixed(2)} saved (free agents)</span>
                  )}
                </div>
                <span className="text-[10px] text-indigo-600">{timeframeLabel} &middot; {mockAgentSpend.length} agents</span>
              </div>
              {totalOverage > 0 && (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-600" />
                  <span className="text-[10px] text-orange-800">
                    <strong>${totalOverage.toFixed(2)}</strong> in overage charges across <strong>{propertiesOverBudget}</strong> propert{propertiesOverBudget === 1 ? "y" : "ies"} — essential agents continued running after budget was exceeded.
                  </span>
                </div>
              )}
              <div className="space-y-1">
                {mockAgentSpend.filter((a) => !a.isFree).map((as) => {
                  const rawOverage = as.isEssential
                    ? as.propertySpend.reduce((sum, ps) => {
                        const po = propertyOverage.get(ps.propertyId);
                        if (!po || po.overage <= 0) return sum;
                        const essentialShare = po.essentialSpend > 0 ? ps.spend / po.essentialSpend : 0;
                        return sum + po.overage * essentialShare;
                      }, 0)
                    : 0;
                  const agentOverage = Math.min(rawOverage, as.spend * 0.6);
                  const baseColor = as.agentType === "deterministic" ? "bg-blue-200" : "bg-purple-200";
                  const regularSpend = as.spend - agentOverage;
                  return (
                  <button
                    key={as.agentId}
                    type="button"
                    onClick={() => setDrilldownAgentId(as.agentId)}
                    className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50"
                  >
                    <span className="w-40 shrink-0 truncate text-[11px] font-medium text-foreground" title={as.agentName}>{as.agentName}</span>
                    <div className="relative h-4 flex-1 overflow-hidden rounded bg-slate-100">
                      <div className={`absolute inset-y-0 left-0 rounded-l ${baseColor}`} style={{ width: `${(regularSpend / maxAgentSpend) * 100}%` }} />
                      {agentOverage > 0 && (
                        <div className="absolute inset-y-0 rounded-r bg-orange-400" style={{ left: `${(regularSpend / maxAgentSpend) * 100}%`, width: `${(agentOverage / maxAgentSpend) * 100}%` }} />
                      )}
                      <span className="relative z-10 flex h-full items-center px-2 text-[10px] font-semibold text-foreground">
                        ${regularSpend.toFixed(2)}{agentOverage > 0 && <span className="ml-1 text-orange-700">+ ${agentOverage.toFixed(2)} overage</span>}
                      </span>
                    </div>
                    <span className="flex shrink-0 items-center gap-0.5 text-[9px] text-muted-foreground">
                      {as.trend === "up" && <TrendingUp className="h-3 w-3 text-red-500" />}
                      {as.trend === "down" && <TrendingDown className="h-3 w-3 text-emerald-500" />}
                      {as.executions.toLocaleString()} runs
                    </span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-foreground" />
                  </button>
                  );
                })}
                {mockAgentSpend.some((a) => a.isFree) && (
                  <>
                    <div className="mt-3 mb-1.5 flex items-center gap-2">
                      <div className="h-px flex-1 bg-emerald-200" />
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">Free Agents</span>
                      <div className="h-px flex-1 bg-emerald-200" />
                    </div>
                    <p className="mb-1.5 px-1 text-[9px] text-muted-foreground">
                      These agents run at no cost. Amounts shown reflect what they would cost on a paid plan.
                    </p>
                    {mockAgentSpend.filter((a) => a.isFree).map((as) => (
                      <button
                        key={as.agentId}
                        type="button"
                        onClick={() => setDrilldownAgentId(as.agentId)}
                        className="group flex w-full items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/30 px-2 py-1.5 text-left transition-colors hover:bg-emerald-50"
                      >
                        <span className="w-40 shrink-0 truncate text-[11px] font-medium text-foreground">{as.agentName}</span>
                        <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">Free</span>
                        <div className="flex flex-1 items-center gap-1.5 px-1">
                          <span className="text-[10px] text-muted-foreground/60 line-through">${(as.wouldHaveCost ?? 0).toFixed(2)}</span>
                          <span className="text-[10px] font-semibold text-emerald-700">$0.00</span>
                        </div>
                        <span className="flex shrink-0 items-center gap-0.5 text-[9px] text-muted-foreground">
                          {as.executions.toLocaleString()} runs
                        </span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-foreground" />
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          ) : spendView === "by-day" ? (() => {
            const AREA_COLORS = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#ef4444", "#14b8a6", "#a855f7"];
            const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const today = new Date();
            let startDate: Date;
            if (spendTimeframe === "ytd") {
              startDate = new Date(today.getFullYear(), 0, 1);
            } else if (spendTimeframe === "last-month") {
              startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            } else {
              startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            }
            const endDate = spendTimeframe === "last-month"
              ? new Date(today.getFullYear(), today.getMonth(), 0)
              : today;
            const totalDays = Math.max(Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1, 1);
            const dateLabels: { date: Date; label: string }[] = [];
            for (let i = 0; i < totalDays; i++) {
              const d = new Date(startDate);
              d.setDate(d.getDate() + i);
              dateLabels.push({ date: d, label: `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}` });
            }

            const topAgents = mockAgentSpend.filter((a) => !a.isFree).slice(0, 8);
            const perAgentDaily: number[][] = topAgents.map((a) => {
              const avgDaily = a.spend / Math.max(a.dailySpend.length, 1);
              return Array.from({ length: totalDays }, () => +(avgDaily * (0.5 + Math.random())).toFixed(2));
            });

            const cumulative: number[][] = perAgentDaily.map((daily) => {
              let running = 0;
              return daily.map((v) => { running += v; return +running.toFixed(2); });
            });

            const stackedCumulative: number[][] = [];
            for (let ai = 0; ai < topAgents.length; ai++) {
              stackedCumulative[ai] = cumulative[ai].map((v, d) => {
                let below = 0;
                for (let k = 0; k < ai; k++) below += cumulative[k][d];
                return below + v;
              });
            }
            const cumulativeBaselines: number[][] = [];
            for (let ai = 0; ai < topAgents.length; ai++) {
              cumulativeBaselines[ai] = cumulative[ai].map((_, d) => {
                let below = 0;
                for (let k = 0; k < ai; k++) below += cumulative[k][d];
                return below;
              });
            }
            const globalMax = Math.max(...(stackedCumulative[topAgents.length - 1] ?? [0]), 0.01);

            const chartW = 700;
            const chartH = 210;
            const padL = 48;
            const padR = 10;
            const padT = 10;
            const padB = 30;
            const plotW = chartW - padL - padR;
            const plotH = chartH - padT - padB;
            const xStep = totalDays > 1 ? plotW / (totalDays - 1) : plotW;
            const yScale = (v: number) => padT + plotH - (v / globalMax) * plotH;
            const gridLines = 4;
            const labelInterval = totalDays <= 14 ? 1 : totalDays <= 35 ? 3 : totalDays <= 90 ? 7 : 14;

            return (
              <div>
                <div className="mb-3 flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2">
                  <span className="text-[12px] font-semibold text-indigo-900">Cumulative Spend</span>
                  <span className="text-[10px] text-indigo-600">{timeframeLabel} &middot; {topAgents.length} agents &middot; {totalDays} days</span>
                </div>
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ maxHeight: 260 }}>
                  {Array.from({ length: gridLines + 1 }, (_, i) => {
                    const val = (globalMax / gridLines) * (gridLines - i);
                    const y = yScale(val);
                    return (
                      <g key={i}>
                        <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#e5e7eb" strokeWidth={0.5} />
                        <text x={padL - 4} y={y + 3} textAnchor="end" fontSize={7} fill="#9ca3af">${val.toFixed(0)}</text>
                      </g>
                    );
                  })}
                  {[...topAgents].reverse().map((agent, revIdx) => {
                    const ai = topAgents.length - 1 - revIdx;
                    const color = AREA_COLORS[ai % AREA_COLORS.length];
                    const topPts = Array.from({ length: totalDays }, (_, d) =>
                      `${padL + d * xStep},${yScale(stackedCumulative[ai][d])}`
                    );
                    const bottomPts = Array.from({ length: totalDays }, (_, d) =>
                      `${padL + d * xStep},${yScale(cumulativeBaselines[ai][d])}`
                    ).reverse();
                    return (
                      <g key={agent.agentId}>
                        <path d={`M${topPts.join(" L")} L${bottomPts.join(" L")} Z`} fill={color} opacity={0.55} />
                        <polyline points={topPts.join(" ")} fill="none" stroke={color} strokeWidth={1} strokeLinejoin="round" opacity={0.8} />
                      </g>
                    );
                  })}
                  {Array.from({ length: totalDays }, (_, d) => {
                    const x = padL + d * xStep;
                    const topTotal = stackedCumulative[topAgents.length - 1]?.[d] ?? 0;
                    return (
                      <g key={d}>
                        <line x1={x} y1={padT} x2={x} y2={padT + plotH} stroke="transparent" strokeWidth={Math.max(xStep * 0.8, 2)}>
                          <title>{dateLabels[d].label}: ${topTotal.toFixed(2)} cumulative</title>
                        </line>
                      </g>
                    );
                  })}
                  {dateLabels.map((dl, i) => {
                    if (i === 0 || i === totalDays - 1 || i % labelInterval === 0) {
                      return (
                        <text key={i} x={padL + i * xStep} y={chartH - 6} textAnchor="middle" fontSize={6.5} fill="#9ca3af"
                          transform={totalDays > 35 ? `rotate(-30, ${padL + i * xStep}, ${chartH - 6})` : undefined}
                        >
                          {dl.label}
                        </text>
                      );
                    }
                    return null;
                  })}
                </svg>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1">
                  {topAgents.map((agent, ai) => (
                    <button key={agent.agentId} type="button" onClick={() => { setDrilldownAgentId(agent.agentId); setSpendView("by-agent"); }} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: AREA_COLORS[ai % AREA_COLORS.length] }} />
                      <span className="max-w-[100px] truncate">{agent.agentName}</span>
                      <span className="font-semibold">${agent.spend.toFixed(0)}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })() : (
            <div>
              {(() => {
                const propMap = new Map<string, { name: string; spend: number; agentCount: number }>();
                for (const as of mockAgentSpend) {
                  for (const ps of as.propertySpend) {
                    const existing = propMap.get(ps.propertyId) ?? { name: ps.propertyName, spend: 0, agentCount: 0 };
                    existing.spend += as.isFree ? 0 : ps.spend;
                    existing.agentCount++;
                    propMap.set(ps.propertyId, existing);
                  }
                }
                const propSpendList = Array.from(propMap.entries()).map(([id, v]) => {
                  const po = propertyOverage.get(id);
                  return { id, ...v, budget: po?.budget ?? budgetConfig.monthlyBudgetPerProperty * timeframeMultiplier, overage: po?.overage ?? 0 };
                }).sort((a, b) => b.spend - a.spend);
                const maxPS = Math.max(...propSpendList.map((p) => p.spend), 1);
                return (
                  <>
                    <div className="mb-3 flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] font-semibold text-indigo-900">Total: ${totalSpendForPeriod.toFixed(2)}</span>
                        {totalOverage > 0 && (
                          <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-semibold text-orange-700">
                            <AlertTriangle className="h-2.5 w-2.5" /> ${totalOverage.toFixed(2)} overage
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-indigo-600">{timeframeLabel} &middot; {propSpendList.length} properties</span>
                    </div>
                    <div className="space-y-1.5">
                      {propSpendList.map((ps) => {
                        const isOverBudget = ps.overage > 0;
                        return (
                        <button
                          key={ps.id}
                          type="button"
                          onClick={() => setDrilldownPropertyId(ps.id)}
                          className={`group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${isOverBudget ? "border border-orange-100 hover:bg-orange-50/50" : "hover:bg-slate-50"}`}
                        >
                          <span className="w-36 shrink-0 truncate text-[11px] font-medium text-foreground">{ps.name}</span>
                          <div className="relative h-5 flex-1 overflow-hidden rounded bg-slate-100">
                            {isOverBudget ? (
                              <>
                                <div className="absolute inset-y-0 left-0 rounded bg-emerald-200" style={{ width: `${((ps.spend - ps.overage) / maxPS) * 100}%` }} />
                                <div className="absolute inset-y-0 rounded bg-orange-300" style={{ left: `${((ps.spend - ps.overage) / maxPS) * 100}%`, width: `${(ps.overage / maxPS) * 100}%` }} />
                              </>
                            ) : (
                              <div className="absolute inset-y-0 left-0 rounded bg-emerald-200" style={{ width: `${(ps.spend / maxPS) * 100}%` }} />
                            )}
                            <span className={`relative z-10 flex h-full items-center px-2 text-[10px] font-semibold ${isOverBudget ? "text-orange-900" : "text-emerald-900"}`}>${ps.spend.toFixed(2)}</span>
                          </div>
                          {isOverBudget && (
                            <span className="shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-[8px] font-semibold text-orange-700">${ps.overage.toFixed(2)} over</span>
                          )}
                          <span className="shrink-0 text-[9px] text-muted-foreground">{ps.agentCount} agents</span>
                          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-foreground" />
                        </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

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
          {(["all", "live", "sandbox", "paused", "disabled", "draft"] as const).map((s) => {
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
              className={`group flex flex-col rounded-xl border p-4 text-left transition-all ${agent.status === "disabled" ? "border-red-200 bg-red-50/30 opacity-70 hover:border-red-300 hover:opacity-100" : "border-border bg-white hover:border-indigo-200 hover:shadow-md"}`}
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
                    {agent.engineType && agent.type === "deterministic" && (
                      <WorkflowEngineDot engine={agent.engineType} />
                    )}
                    {agent.agentTier && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                        agent.agentTier === "free"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : "bg-violet-50 text-violet-600 border border-violet-200"
                      }`}>
                        {agent.agentTier === "free" ? "Free" : "Premium"}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
              </div>
              <p className="mb-3 line-clamp-2 text-[12px] text-muted-foreground">{agent.description}</p>
              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                {agent.triggers.slice(0, 2).map((t, i) => {
                  const { prefix, detail } = formatTriggerChip(t);
                  return (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                      {t.type === "event" ? <Zap className="h-3 w-3 text-amber-500" /> : <Clock className="h-3 w-3 text-blue-500" />}
                      <span className="font-semibold text-muted-foreground">{prefix}:</span> {detail}
                    </span>
                  );
                })}
                {agent.propertyIds.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                    <Building2 className="h-3 w-3 text-muted-foreground" /> {agent.propertyIds.length} {agent.propertyIds.length === 1 ? "property" : "properties"}
                  </span>
                )}
                {agent.isEssential && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                    <Shield className="h-2.5 w-2.5" /> Essential
                  </span>
                )}
                <span className="ml-auto flex items-center gap-2">
                  {agent.costSummary && agent.agentTier === "free" && agent.costSummary.wouldHaveCost ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium">
                      <span className="text-muted-foreground/60 line-through">${agent.costSummary.wouldHaveCost.toFixed(2)}</span>
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">Free</span>
                      <span className="text-muted-foreground">{agent.costSummary.executionsThisMonth} runs</span>
                    </span>
                  ) : agent.costSummary && agent.costSummary.currentMonthSpend > 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
                      <DollarSign className="h-3 w-3" />{agent.costSummary.currentMonthSpend.toFixed(2)}
                      <span className="text-[8px]">MTD</span>
                      {agent.costSummary.costTrend === "up" && <span className="text-red-500">&#9650;</span>}
                      {agent.costSummary.costTrend === "down" && <span className="text-emerald-500">&#9660;</span>}
                    </span>
                  ) : null}
                  {agent.runsLast30d !== undefined && agent.runsLast30d > 0 && !(agent.agentTier === "free" && agent.costSummary?.wouldHaveCost) && (
                    <span className="text-[10px] text-muted-foreground">
                      {agent.runsLast30d.toLocaleString()} runs
                    </span>
                  )}
                </span>
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
              onDelete={() => deleteAgent(selectedAgent.id)}
              onNewVersion={() => handleNewVersion(selectedAgent)}
              onEditVersion={(vNum) => handleEditVersion(selectedAgent, vNum)}
              canEdit={canEdit}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Builder Modal */}
      <Dialog open={modalOpen} onOpenChange={(v) => { if (!v) { setModalOpen(false); setModalStep({ kind: "type-select" }); } }}>
        <DialogContent className="flex h-[85vh] max-w-[90vw] flex-col gap-0 overflow-hidden p-0">
          {modalStep.kind === "type-select" && (
            <div className="flex h-full flex-col">
              <div className="shrink-0 border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold text-foreground">Build New Agent</h2>
                <p className="text-sm text-muted-foreground">Choose the execution model that fits your use case.</p>
              </div>
              <div className="flex flex-1 items-center justify-center px-6">
                {(() => {
                  const freeRemaining = FREE_AGENT_LIMIT - freeAgentsUsed;
                  const deterministicNeedsUpgrade = !isContracted && freeRemaining <= 0;
                  const launchUpgrade = () => {
                    setModalOpen(false);
                    setContractStep("properties");
                    setContractState({ ...INITIAL_CONTRACT_STATE, selectedPropertyIds: [...contractedPropertyIds] });
                    setShowContractFlow(true);
                  };
                  return (
                    <div className="grid max-w-2xl grid-cols-2 gap-5">
                      <button
                        type="button"
                        onClick={() => {
                          if (deterministicNeedsUpgrade) {
                            launchUpgrade();
                          } else {
                            setModalStep({ kind: "deterministic" });
                          }
                        }}
                        className={`group flex flex-col items-start rounded-xl border-2 border-border bg-white p-5 text-left transition-all ${deterministicNeedsUpgrade ? "opacity-80" : "hover:border-emerald-400 hover:shadow-lg"}`}
                      >
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100">
                          <Workflow className="h-6 w-6" />
                        </div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-foreground">Deterministic Workflow</h3>
                          {deterministicNeedsUpgrade && <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px]"><Crown className="mr-0.5 h-2.5 w-2.5" /> Requires upgrade</Badge>}
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                          Predictable, rule-based automation. AI builds the logic once, then it runs the same way every time.
                        </p>
                        {!isContracted && (
                          <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${freeRemaining > 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            <Gift className="h-3 w-3" />
                            {freeRemaining > 0
                              ? `${freeRemaining} of ${FREE_AGENT_LIMIT} free agents remaining`
                              : `${FREE_AGENT_LIMIT} of ${FREE_AGENT_LIMIT} free agents used — upgrade for more`}
                          </div>
                        )}
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
                        onClick={() => {
                          if (isContracted) {
                            setModalStep({ kind: "ai-powered" });
                          } else {
                            launchUpgrade();
                          }
                        }}
                        className={`group flex flex-col items-start rounded-xl border-2 border-border bg-white p-5 text-left transition-all ${isContracted ? "hover:border-indigo-400 hover:shadow-lg" : "opacity-80"}`}
                      >
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
                          <BrainCircuit className="h-6 w-6" />
                        </div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-foreground">AI-Powered Agent</h3>
                          {!isContracted && <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px]"><Crown className="mr-0.5 h-2.5 w-2.5" /> Requires upgrade</Badge>}
                        </div>
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
                  );
                })()}
              </div>
            </div>
          )}

          {modalStep.kind === "deterministic" && (
            <DeterministicBuilderModal
              onComplete={handleBuilderComplete}
              onBack={modalStep.freeOnly ? undefined : () => setModalStep({ kind: "type-select" })}
              onClose={() => { setModalOpen(false); setModalStep({ kind: "type-select" }); }}
              forkFrom={modalStep.forkFrom}
              forkMode={modalStep.forkMode}
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
                      {modalStep.forkFrom
                        ? modalStep.forkMode === "edit"
                          ? `Edit "${modalStep.forkFrom.name}" v${modalStep.forkFrom.activeVersion}`
                          : `New Version of "${modalStep.forkFrom.name}"`
                        : "Build AI-Powered Agent"}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      {modalStep.forkFrom
                        ? modalStep.forkMode === "edit"
                          ? `Editing version ${modalStep.forkFrom.activeVersion}`
                          : `Version ${Math.max(...modalStep.forkFrom.versions.map((v) => v.versionNumber)) + 1} · Forked from v${modalStep.forkFrom.activeVersion}`
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
                  <CustomAgentBuilder
                    initialView="new"
                    onClose={closeModal}
                    onAgentCreated={handleAiAgentCreated}
                    nameReadOnly={!!modalStep.forkFrom}
                    seedData={modalStep.forkFrom ? {
                      name: modalStep.forkFrom.name,
                      description: modalStep.forkFrom.description,
                      prompt: modalStep.forkFrom.aiContext?.prompt,
                      guardrails: modalStep.forkFrom.aiContext?.guardrails,
                      classification: modalStep.forkFrom.aiContext?.classification,
                      skillIds: modalStep.forkFrom.aiContext?.skillIds,
                      dataIds: modalStep.forkFrom.aiContext?.dataIds,
                      structuredGuardrails: modalStep.forkFrom.aiContext?.structuredGuardrails,
                      triggerDescriptions: modalStep.forkFrom.triggers.map((t) => t.label),
                    } : undefined}
                  />
                </Suspense>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Budget & Billing Settings */}
      <Dialog open={showBudgetSettings} onOpenChange={setShowBudgetSettings}>
        <DialogContent className="flex max-h-[85vh] max-w-lg flex-col p-0">
          <div className="shrink-0 border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">Budget & Billing Settings</h2>
            <p className="text-sm text-muted-foreground">Configure monthly agent spending limits.</p>
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-foreground">Budget Mode</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setBudgetConfig((c) => ({ ...c, budgetMode: "uniform" }))} className={`flex-1 rounded-lg border p-2.5 text-left transition-colors ${budgetConfig.budgetMode === "uniform" ? "border-indigo-300 bg-indigo-50" : "border-border hover:bg-slate-50"}`}>
                  <p className="text-[11px] font-semibold text-foreground">Uniform Budget</p>
                  <p className="text-[9px] text-muted-foreground">Same budget for every property.</p>
                </button>
                <button type="button" onClick={() => setBudgetConfig((c) => ({ ...c, budgetMode: "per-property" }))} className={`flex-1 rounded-lg border p-2.5 text-left transition-colors ${budgetConfig.budgetMode === "per-property" ? "border-indigo-300 bg-indigo-50" : "border-border hover:bg-slate-50"}`}>
                  <p className="text-[11px] font-semibold text-foreground">Per-Property Budget</p>
                  <p className="text-[9px] text-muted-foreground">Different budget per property based on size.</p>
                </button>
              </div>
            </div>

            {(() => {
              const budgetProperties = PMC_PROPERTY_RECORDS.filter((p) => contractedPropertyIds.includes(p.id));
              const contractedCount = budgetProperties.length;
              const nonContractedCount = PMC_PROPERTY_RECORDS.length - contractedCount;
              return budgetConfig.budgetMode === "uniform" ? (
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-foreground">Monthly Budget per Property</label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <Input type="number" min={0} step={10} value={budgetConfig.monthlyBudgetPerProperty} onChange={(e) => setBudgetConfig((c) => ({ ...c, monthlyBudgetPerProperty: Number(e.target.value) }))} className="w-28 text-sm" />
                    <span className="text-[12px] text-muted-foreground">/ property / month</span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Total: ${(budgetConfig.monthlyBudgetPerProperty * contractedCount).toFixed(2)}/mo across {contractedCount} contracted properties. Unused budget does not roll over.
                  </p>
                  {nonContractedCount > 0 && (
                    <p className="mt-1 text-[10px] text-indigo-600 flex items-center gap-1">
                      <Info className="h-3 w-3" /> {nonContractedCount} properties not yet contracted — <button type="button" className="underline font-medium" onClick={() => { setShowBudgetSettings(false); setContractStep("properties"); setContractState((s) => ({ ...s, selectedPropertyIds: [...contractedPropertyIds] })); setShowContractFlow(true); }}>add properties</button>
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[12px] font-semibold text-foreground">Per-Property Budgets</label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Default: ${budgetConfig.monthlyBudgetPerProperty}</span>
                      <Input type="number" min={0} step={10} value={budgetConfig.monthlyBudgetPerProperty} onChange={(e) => setBudgetConfig((c) => ({ ...c, monthlyBudgetPerProperty: Number(e.target.value) }))} className="h-7 w-20 text-[11px]" />
                    </div>
                  </div>
                  <div className="mb-2">
                    <Input placeholder="Search properties..." value={budgetPropertySearch} onChange={(e) => setBudgetPropertySearch(e.target.value)} className="h-8 text-[11px]" />
                  </div>
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                    {budgetProperties
                      .filter((p) => !budgetPropertySearch || p.name.toLowerCase().includes(budgetPropertySearch.toLowerCase()))
                      .map((p) => {
                        const customBudget = budgetConfig.propertyBudgets[p.id];
                        const isCustom = customBudget !== undefined;
                        return (
                          <div key={p.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50">
                            <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="flex-1 truncate text-[11px] font-medium text-foreground">{p.name}</span>
                            <span className="shrink-0 text-[9px] text-muted-foreground">{p.city}, {p.state}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground">$</span>
                              <Input
                                type="number"
                                min={0}
                                step={10}
                                value={isCustom ? customBudget : budgetConfig.monthlyBudgetPerProperty}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setBudgetConfig((c) => ({ ...c, propertyBudgets: { ...c.propertyBudgets, [p.id]: val } }));
                                }}
                                className={`h-6 w-16 text-right text-[10px] ${isCustom ? "border-indigo-300 bg-indigo-50 font-semibold" : ""}`}
                              />
                            </div>
                            {isCustom && (
                              <button type="button" onClick={() => setBudgetConfig((c) => { const next = { ...c.propertyBudgets }; delete next[p.id]; return { ...c, propertyBudgets: next }; })} className="text-muted-foreground hover:text-foreground" title="Reset to default">
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Total: ${budgetProperties.reduce((sum, p) => sum + (budgetConfig.propertyBudgets[p.id] ?? budgetConfig.monthlyBudgetPerProperty), 0).toFixed(2)}/mo across {contractedCount} contracted properties.
                  </p>
                  {nonContractedCount > 0 && (
                    <p className="mt-1 text-[10px] text-indigo-600 flex items-center gap-1">
                      <Info className="h-3 w-3" /> {nonContractedCount} properties not yet contracted — <button type="button" className="underline font-medium" onClick={() => { setShowBudgetSettings(false); setContractStep("properties"); setContractState((s) => ({ ...s, selectedPropertyIds: [...contractedPropertyIds] })); setShowContractFlow(true); }}>add properties</button>
                    </p>
                  )}
                </div>
              );
            })()}

            <div>
              <label className="mb-1 block text-[12px] font-semibold text-foreground">Alert Threshold</label>
              <div className="flex items-center gap-2">
                <select className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none" value={budgetConfig.alertThresholdPercent} onChange={(e) => setBudgetConfig((c) => ({ ...c, alertThresholdPercent: Number(e.target.value) }))}>
                  <option value={50}>50%</option>
                  <option value={60}>60%</option>
                  <option value={70}>70%</option>
                  <option value={80}>80% (recommended)</option>
                  <option value={90}>90%</option>
                </select>
                <span className="text-[12px] text-muted-foreground">of budget used</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">You&apos;ll receive an alert when spending reaches this threshold.</p>
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold text-foreground">When Budget is Exceeded</label>
              <div className="space-y-2">
                <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${budgetConfig.overageBehavior === "allow-essential-only" ? "border-indigo-300 bg-indigo-50" : "border-border hover:bg-slate-50"}`}>
                  <input type="radio" name="overage" checked={budgetConfig.overageBehavior === "allow-essential-only"} onChange={() => setBudgetConfig((c) => ({ ...c, overageBehavior: "allow-essential-only" }))} className="mt-0.5" />
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">Essential agents continue (recommended)</p>
                    <p className="text-[10px] text-muted-foreground">Non-essential agents go dormant. Essential agents keep running and overage costs are billed.</p>
                  </div>
                </label>
                <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${budgetConfig.overageBehavior === "pause" ? "border-indigo-300 bg-indigo-50" : "border-border hover:bg-slate-50"}`}>
                  <input type="radio" name="overage" checked={budgetConfig.overageBehavior === "pause"} onChange={() => setBudgetConfig((c) => ({ ...c, overageBehavior: "pause" }))} className="mt-0.5" />
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">Pause all agents</p>
                    <p className="text-[10px] text-muted-foreground">All agents go dormant until the next billing cycle. No overage charges.</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-slate-50 p-3">
              <p className="mb-2 text-[11px] font-semibold text-foreground">Essential Agents</p>
              <p className="mb-2 text-[10px] text-muted-foreground">These agents keep running when budget is exceeded. Mark agents as essential from their detail view.</p>
              <div className="space-y-1">
                {agents.filter((a) => a.isEssential).length === 0 ? (
                  <p className="text-[10px] italic text-muted-foreground">No agents marked as essential.</p>
                ) : (
                  (() => {
                    const essentialAgents = agents.filter((a) => a.isEssential).sort((a, b) => (b.costSummary?.currentMonthSpend ?? 0) - (a.costSummary?.currentMonthSpend ?? 0));
                    const maxEssentialSpend = Math.max(...essentialAgents.map((a) => a.costSummary?.currentMonthSpend ?? 0), 1);
                    return essentialAgents.map((a) => {
                      const totalSpend = a.costSummary?.currentMonthSpend ?? 0;
                      const agentOverageAmt = a.propertyIds.reduce((sum, pid) => {
                        const po = propertyOverage.get(pid);
                        if (!po || po.overage <= 0) return sum;
                        const matchSpend = mockAgentSpend.find((ms) => ms.agentId === a.id);
                        const ps = matchSpend?.propertySpend.find((p) => p.propertyId === pid);
                        if (!ps || !po.essentialSpend) return sum;
                        return sum + po.overage * (ps.spend / po.essentialSpend);
                      }, 0);
                      const cappedOverage = Math.min(agentOverageAmt, totalSpend * 0.6);
                      const regularAmt = totalSpend - cappedOverage;
                      const barColor = a.type === "deterministic" ? "bg-blue-200" : "bg-purple-200";
                      return (
                        <div key={a.id} className="flex items-center gap-2 rounded bg-white px-2 py-1.5">
                          <span className="w-40 shrink-0 truncate text-[11px] font-medium text-foreground">{a.name}</span>
                          <div className="relative h-4 flex-1 overflow-hidden rounded bg-slate-100">
                            <div className={`absolute inset-y-0 left-0 rounded-l ${barColor}`} style={{ width: `${(regularAmt / maxEssentialSpend) * 100}%` }} />
                            {cappedOverage > 0 && (
                              <div className="absolute inset-y-0 rounded-r bg-orange-400" style={{ left: `${(regularAmt / maxEssentialSpend) * 100}%`, width: `${(cappedOverage / maxEssentialSpend) * 100}%` }} />
                            )}
                            <span className="relative z-10 flex h-full items-center px-2 text-[10px] font-semibold text-foreground">
                              ${regularAmt.toFixed(2)}{cappedOverage > 0 && <span className="ml-1 text-orange-700">+ ${cappedOverage.toFixed(2)} overage</span>}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2.5">
              <p className="mb-1 text-[11px] font-semibold text-blue-900">Cost breakdown by type</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-[10px]">
                  <span className="text-blue-600">Deterministic:</span>
                  <span className="ml-1 font-semibold text-blue-900">${agents.filter((a) => a.type === "deterministic").reduce((s, a) => s + (a.costSummary?.currentMonthSpend ?? 0), 0).toFixed(2)}</span>
                </div>
                <div className="text-[10px]">
                  <span className="text-blue-600">AI-powered:</span>
                  <span className="ml-1 font-semibold text-blue-900">${agents.filter((a) => a.type === "ai-powered").reduce((s, a) => s + (a.costSummary?.currentMonthSpend ?? 0), 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-3">
            <Button variant="outline" size="sm" onClick={() => setShowBudgetSettings(false)}>Cancel</Button>
            <Button size="sm" onClick={() => setShowBudgetSettings(false)} className="bg-indigo-600 text-white hover:bg-indigo-700">Save Settings</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Self-Service Contracting Flow */}
      <Dialog open={showContractFlow} onOpenChange={setShowContractFlow}>
        <DialogContent className="max-w-2xl p-0 gap-0 max-h-[90vh] flex flex-col">
          {/* Stepper header */}
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">Upgrade to AI Agent Builder</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Self-service activation — no sales call required</p>
            <div className="mt-3 flex items-center gap-1">
              {(["properties", "pricing", "sign", "complete"] as ContractStep[]).map((step, i) => {
                const labels = ["Select Properties", "Review Pricing", "Sign Agreement", "Activated"];
                const icons = [Building2, DollarSign, PenLine, PartyPopper];
                const Icon = icons[i];
                const isCurrent = contractStep === step;
                const stepOrder = ["properties", "pricing", "sign", "complete"];
                const isPast = stepOrder.indexOf(contractStep) > i;
                return (
                  <div key={step} className="flex items-center gap-1 flex-1">
                    <div className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${isCurrent ? "bg-indigo-100 text-indigo-700" : isPast ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                      {isPast ? <CircleCheck className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                      {labels[i]}
                    </div>
                    {i < 3 && <div className={`h-px flex-1 ${isPast ? "bg-green-300" : "bg-border"}`} />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Step 1: Property Selection */}
            {contractStep === "properties" && (
              <div>
                <h3 className="text-sm font-semibold text-foreground">Select properties to activate</h3>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Choose which properties will have access to AI agents and unlimited workflows. These properties will be listed on your usage agreement.
                  {contractedPropertyIds.length > 0 && ` (${contractedPropertyIds.length} already contracted)`}
                </p>
                {(() => {
                  const uncontractedProperties = PMC_PROPERTY_RECORDS.filter((p) => !contractedPropertyIds.includes(p.id));
                  const uncontractedIds = uncontractedProperties.map((p) => p.id);
                  const newSelections = contractState.selectedPropertyIds.filter((id) => !contractedPropertyIds.includes(id));
                  return (
                    <>
                      <div className="mt-3 flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setContractState((s) => ({ ...s, selectedPropertyIds: [...contractedPropertyIds, ...uncontractedIds] }))} className="h-7 text-[11px]">Select All</Button>
                        <Button size="sm" variant="outline" onClick={() => setContractState((s) => ({ ...s, selectedPropertyIds: [...contractedPropertyIds] }))} className="h-7 text-[11px]">Clear New</Button>
                        <span className="text-[11px] text-muted-foreground ml-auto">
                          {newSelections.length} new {newSelections.length === 1 ? "property" : "properties"} selected
                          {contractedPropertyIds.length > 0 && ` · ${contractedPropertyIds.length} already contracted`}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1 max-h-[300px] overflow-y-auto rounded-lg border border-border p-2">
                        {PMC_PROPERTY_RECORDS.map((p) => {
                          const alreadyContracted = contractedPropertyIds.includes(p.id);
                          const selected = contractState.selectedPropertyIds.includes(p.id);
                          return (
                            <label key={p.id} className={`flex items-center gap-3 rounded-md px-3 py-2 text-[12px] transition-colors ${alreadyContracted ? "bg-green-50/50 border border-green-200 cursor-default" : selected ? "bg-indigo-50 border border-indigo-200 cursor-pointer" : "hover:bg-muted/50 border border-transparent cursor-pointer"}`}>
                              <input
                                type="checkbox"
                                checked={selected || alreadyContracted}
                                disabled={alreadyContracted}
                                onChange={() => {
                                  if (alreadyContracted) return;
                                  setContractState((s) => ({
                                    ...s,
                                    selectedPropertyIds: selected ? s.selectedPropertyIds.filter((id) => id !== p.id) : [...s.selectedPropertyIds, p.id],
                                  }));
                                }}
                                className="h-4 w-4 rounded accent-indigo-600 disabled:opacity-50"
                              />
                              <div className="flex-1">
                                <span className="font-medium text-foreground">{p.name}</span>
                                <span className="ml-2 text-muted-foreground">{p.unitCount} units</span>
                              </div>
                              {alreadyContracted ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200 text-[9px]">Contracted</Badge>
                              ) : selected ? (
                                <CircleCheck className="h-4 w-4 text-indigo-600" />
                              ) : null}
                            </label>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
                <div className="mt-3 rounded-md border border-blue-100 bg-blue-50/50 p-2.5 flex items-start gap-2 text-[11px] text-blue-800">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                  <span>Non-selected properties will still have access to the {FREE_AGENT_LIMIT} free deterministic agents. You can add more properties to your agreement at any time.</span>
                </div>
                <div className="mt-2 rounded-md border border-indigo-100 bg-indigo-50/50 p-2.5 flex items-start gap-2 text-[11px] text-indigo-800">
                  <Cog className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                  <span><strong>After contracting:</strong> You&apos;ll configure per-property monthly budgets to control agent spending. Each contracted property gets its own budget limit that you can customize based on property size and needs.</span>
                </div>
              </div>
            )}

            {/* Step 2: Pricing Review */}
            {contractStep === "pricing" && (
              <div>
                <h3 className="text-sm font-semibold text-foreground">Usage-Based Pricing</h3>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  All pricing is usage-based with no minimum commitment. You only pay for what your agents consume. Pricing is non-negotiable and applies uniformly to all clients.
                </p>
                <div className="mt-4 space-y-3">
                  {PRICING_TABLE.map((row) => (
                    <div key={row.tier} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[13px] font-semibold text-foreground">{row.tier}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{row.description}</p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-[14px] font-bold text-indigo-700">{row.price}</p>
                          <p className="text-[10px] text-muted-foreground">{row.unit}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                  <div className="flex items-start gap-2 text-[11px] text-amber-900">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <div>
                      <p className="font-semibold">Frontier Model Pass-Through Pricing</p>
                      <p className="mt-0.5 text-amber-800/80">
                        When using OpenAI, Anthropic, Google, or other third-party LLMs, the then-current published API price is passed through plus a $0.25/million token Entrata platform fee. Prices may change as providers update their API pricing.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-border bg-slate-50 p-3">
                  <p className="text-[12px] font-semibold text-foreground">Summary for {contractState.selectedPropertyIds.filter((id) => !contractedPropertyIds.includes(id)).length} new properties{contractedPropertyIds.length > 0 ? ` (${contractedPropertyIds.length} already contracted)` : ""}</p>
                  <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                    <li className="flex items-center gap-1.5"><CircleDot className="h-3 w-3 text-indigo-500" /> Unlimited deterministic workflows on selected properties</li>
                    <li className="flex items-center gap-1.5"><CircleDot className="h-3 w-3 text-indigo-500" /> Full access to AI-powered agents</li>
                    <li className="flex items-center gap-1.5"><CircleDot className="h-3 w-3 text-indigo-500" /> Budget controls and spend analytics</li>
                    <li className="flex items-center gap-1.5"><CircleDot className="h-3 w-3 text-indigo-500" /> No minimum commitment — cancel anytime</li>
                    <li className="flex items-center gap-1.5"><CircleDot className="h-3 w-3 text-green-500" /> Free agents continue at no charge</li>
                  </ul>
                </div>

                <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-white p-3">
                  <input
                    type="checkbox"
                    checked={contractState.agreedToPricing}
                    onChange={(e) => setContractState((s) => ({ ...s, agreedToPricing: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded accent-indigo-600"
                  />
                  <span className="text-[12px] text-foreground">I acknowledge the usage-based pricing listed above and understand that charges will be based on actual consumption.</span>
                </label>
              </div>
            )}

            {/* Step 3: E-Sign */}
            {contractStep === "sign" && (
              <div>
                <h3 className="text-sm font-semibold text-foreground">Electronic Signature</h3>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Review and sign the AI Agent Builder Usage Agreement below to activate the service on your selected properties.
                </p>

                {/* Contract document */}
                <div className="mt-4 rounded-lg border border-border bg-white max-h-[280px] overflow-y-auto p-4">
                  <div className="text-center border-b border-border pb-3 mb-3">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Entrata, Inc.</p>
                    <p className="text-[14px] font-bold text-foreground mt-1">AI Agent Builder Usage Agreement</p>
                  </div>
                  <div className="space-y-3 text-[11px] text-foreground leading-relaxed">
                    <p><strong>1. Service Activation.</strong> By executing this Agreement, Client activates the Entrata AI Agent Builder (&ldquo;Service&rdquo;) on the Properties identified in Exhibit A. The Service enables Client to create, configure, and deploy automated workflow agents and AI-powered agents within the Entrata platform.</p>

                    <p><strong>2. Usage-Based Fees.</strong> Client shall pay usage-based fees as follows, calculated and invoiced monthly in arrears:</p>
                    <ul className="ml-4 space-y-1">
                      <li>&bull; <strong>Workflow (Basic):</strong> $0.001 per task executed</li>
                      <li>&bull; <strong>Workflow (Premium):</strong> $0.005 per task executed</li>
                      <li>&bull; <strong>AI Agent — Frontier Model:</strong> Then-current published API price of the selected LLM provider, plus $0.25 per million tokens (Entrata platform fee)</li>
                      <li>&bull; <strong>AI Agent — Entrata LLM / Auto:</strong> $0.10 per million input tokens; $0.25 per million output tokens</li>
                    </ul>

                    <p><strong>3. No Minimum Commitment.</strong> There is no minimum usage requirement or spend floor. Client pays only for actual usage. Client may deactivate the Service at any time through the Entrata platform.</p>

                    <p><strong>4. Budget Controls.</strong> Client may configure per-property budget limits through the Agent Builder interface. When a property&apos;s budget is exhausted, non-essential agents pause automatically. Essential agents continue operating and overages are billed at the rates above.</p>

                    <p><strong>5. Pricing Changes.</strong> Entrata may update Entrata LLM / Auto pricing upon contract renewal. Frontier model pass-through pricing reflects then-current published API prices and may change as providers adjust their rates.</p>

                    <p><strong>6. Term.</strong> This Agreement is co-terminus with Client&apos;s existing Entrata Master Services Agreement. Upon renewal, the Service continues at then-current pricing unless either party provides written notice of termination at least 30 days prior to the renewal date.</p>

                    <p><strong>7. Data and Privacy.</strong> All data processed by AI agents is governed by the existing Data Processing Addendum to Client&apos;s Master Services Agreement. Entrata does not use Client data to train models.</p>

                    <p><strong>8. Properties.</strong> This Agreement applies to the properties listed in Exhibit A ({contractState.selectedPropertyIds.filter((id) => !contractedPropertyIds.includes(id)).length} new properties{contractedPropertyIds.length > 0 ? `, plus ${contractedPropertyIds.length} previously contracted` : ""}). Client may add properties to the Service at any time through the Agent Builder interface; added properties are subject to the same pricing terms.</p>

                    <p className="mt-2 font-semibold">Exhibit A — Properties Being Activated:</p>
                    <ul className="ml-4">
                      {contractState.selectedPropertyIds.filter((id) => !contractedPropertyIds.includes(id)).map((pid) => {
                        const p = PMC_PROPERTY_RECORDS.find((pr) => pr.id === pid);
                        return <li key={pid}>&bull; {p?.name ?? pid} ({p?.unitCount ?? 0} units)</li>;
                      })}
                    </ul>
                  </div>
                </div>

                {/* Signature fields */}
                <div className="mt-4 rounded-lg border border-border bg-slate-50 p-4 space-y-3">
                  <p className="text-[11px] font-semibold text-foreground">Authorized Signatory</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">Full Name</label>
                      <Input
                        placeholder="John Doe"
                        value={contractState.signerName}
                        onChange={(e) => setContractState((s) => ({ ...s, signerName: e.target.value }))}
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">Title</label>
                      <Input
                        placeholder="Property Manager"
                        value={contractState.signerTitle}
                        onChange={(e) => setContractState((s) => ({ ...s, signerTitle: e.target.value }))}
                        className="mt-1 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground">Date</label>
                    <Input
                      type="date"
                      value={contractState.signatureDate || new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setContractState((s) => ({ ...s, signatureDate: e.target.value }))}
                      className="mt-1 w-48 text-sm"
                    />
                  </div>

                  {/* Signature pad area */}
                  <div className="rounded-lg border-2 border-dashed border-indigo-200 bg-white p-4">
                    {contractState.signed ? (
                      <div className="flex items-center gap-3">
                        <CircleCheck className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-[20px] font-serif italic text-indigo-800">{contractState.signerName}</p>
                          <p className="text-[10px] text-muted-foreground">{contractState.signerTitle} &middot; Signed electronically {contractState.signatureDate || new Date().toISOString().slice(0, 10)}</p>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        type="button"
                        disabled={!contractState.signerName.trim() || !contractState.signerTitle.trim()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContractState((s) => ({ ...s, signed: true, signatureDate: s.signatureDate || new Date().toISOString().slice(0, 10) }));
                        }}
                        className="w-full h-auto flex-col py-4 text-[13px] text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50 disabled:text-muted-foreground disabled:cursor-not-allowed"
                      >
                        <PenLine className="h-5 w-5 mb-1" />
                        Click to apply electronic signature
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {contractStep === "complete" && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <PartyPopper className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-foreground">You&apos;re all set!</h3>
                <p className="mt-2 text-[13px] text-muted-foreground text-center max-w-sm">
                  AI Agent Builder has been activated on {contractState.selectedPropertyIds.filter((id) => !contractedPropertyIds.includes(id)).length} {contractState.selectedPropertyIds.filter((id) => !contractedPropertyIds.includes(id)).length > 1 ? "new properties" : "new property"}. You can now build AI agents, create unlimited workflows, and configure per-property budgets.
                </p>
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 w-full max-w-sm">
                  <p className="text-[12px] font-semibold text-green-900 text-center">What&apos;s unlocked</p>
                  <ul className="mt-2 space-y-1.5 text-[11px] text-green-800">
                    <li className="flex items-center gap-2"><CircleCheck className="h-3.5 w-3.5 text-green-600" /> Unlimited deterministic workflows</li>
                    <li className="flex items-center gap-2"><CircleCheck className="h-3.5 w-3.5 text-green-600" /> AI-powered agent creation</li>
                    <li className="flex items-center gap-2"><CircleCheck className="h-3.5 w-3.5 text-green-600" /> Per-property budget controls</li>
                    <li className="flex items-center gap-2"><CircleCheck className="h-3.5 w-3.5 text-green-600" /> Spend analytics dashboard</li>
                    <li className="flex items-center gap-2"><CircleCheck className="h-3.5 w-3.5 text-green-600" /> Essential agent overrun protection</li>
                  </ul>
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground">
                  Agreement #{`AGR-${Date.now().toString(36).toUpperCase()}`} &middot; Signed by {contractState.signerName} &middot; {contractState.signatureDate || new Date().toISOString().slice(0, 10)}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between border-t border-border px-6 py-3">
            <div>
              {contractStep !== "properties" && contractStep !== "complete" && (
                <Button variant="outline" size="sm" onClick={() => {
                  const steps: ContractStep[] = ["properties", "pricing", "sign", "complete"];
                  const idx = steps.indexOf(contractStep);
                  if (idx > 0) setContractStep(steps[idx - 1]);
                }}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {contractStep !== "complete" && (
                <Button variant="outline" size="sm" onClick={() => setShowContractFlow(false)}>Cancel</Button>
              )}
              {contractStep === "properties" && (
                <Button size="sm" disabled={contractState.selectedPropertyIds.filter((id) => !contractedPropertyIds.includes(id)).length === 0} onClick={() => setContractStep("pricing")} className="bg-indigo-600 text-white hover:bg-indigo-700">
                  Continue <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              )}
              {contractStep === "pricing" && (
                <Button size="sm" disabled={!contractState.agreedToPricing} onClick={() => setContractStep("sign")} className="bg-indigo-600 text-white hover:bg-indigo-700">
                  Continue to Sign <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              )}
              {contractStep === "sign" && (
                <Button size="sm" disabled={!contractState.signed} onClick={() => { setContractStep("complete"); addContractedProperties(contractState.selectedPropertyIds); }} className="bg-green-600 text-white hover:bg-green-700">
                  <ClipboardCheck className="mr-1 h-3 w-3" /> Activate Service
                </Button>
              )}
              {contractStep === "complete" && (
                <Button size="sm" onClick={() => { setShowContractFlow(false); setShowBudgetSettings(true); }} className="bg-indigo-600 text-white hover:bg-indigo-700">
                  Configure Budget <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
