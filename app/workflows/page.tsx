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
  DollarSign,
  Shield,
  ExternalLink as ExternalLinkIcon,
  Cpu,
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
import { WorkflowEngineBadge, WorkflowEngineDot } from "@/components/workflow-engine-badge";

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
  action: "created" | "updated" | "version_added" | "version_edited" | "status_changed" | "properties_changed" | "config_changed" | "evals_changed";
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
  engineType?: WorkflowEngine;
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
    engineType: "entrata-native",
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
    triggers: ["On new lease signed (14 days before move-in)"],
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
    triggers: ["Daily at 7:00 AM (lease expiration < 90 days)"],
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
    triggers: ["Every Monday at 6:00 AM"],
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
    triggers: ["1 hour before scheduled tour"],
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
    triggers: ["Monthly on the 1st at 5:00 AM"],
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
    triggers: ["Daily at 7:00 AM"],
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
    triggers: ["Daily at 10:00 AM (residents with balance > 0 and > 3 days past-due)"],
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
    triggers: ["Inbound voice call (leasing line)"],
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
    triggers: ["On notice to vacate submitted"],
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
    triggers: ["Weekly on Wednesday at 8:00 AM"],
    evals: [],
    runsLast30d: 0,
    executionLog: [],
    changeHistory: [
      { id: "ch-14a", timestamp: "2026-06-20T16:00:00Z", userId: "user-asmith", userName: "Alice Smith", action: "created", summary: "Created Resident Retention Watchdog — draft for review", versionAffected: 1 },
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
  | { kind: "deterministic"; forkFrom?: UnifiedAgent; forkMode?: ForkMode }
  | { kind: "ai-powered"; forkFrom?: UnifiedAgent; forkMode?: ForkMode };

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
            {agent.engineType && agent.type === "deterministic" && (
              <WorkflowEngineBadge engine={agent.engineType} size="sm" />
            )}
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
        triggers: agent.triggers.length > 0 ? agent.triggers : undefined,
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
  forkFrom,
  forkMode,
}: {
  onComplete: (agent: Omit<UnifiedAgent, "id" | "createdAt" | "lastRunAt" | "runsLast30d" | "executionLog" | "changeHistory">) => void;
  onBack: () => void;
  forkFrom?: UnifiedAgent;
  forkMode?: ForkMode;
}) {
  const isForking = !!forkFrom;
  const isEditing = forkMode === "edit";
  const nextVersion = isEditing
    ? forkFrom!.activeVersion
    : forkFrom ? Math.max(...forkFrom.versions.map((v) => v.versionNumber)) + 1 : 1;

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
  const [routingDecision, setRoutingDecision] = useState<RoutingDecision | null>(null);
  const [routingAnimating, setRoutingAnimating] = useState(false);
  const [routingThinkingStep, setRoutingThinkingStep] = useState(0);
  const [featureRequestSubmitted, setFeatureRequestSubmitted] = useState(false);

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

  const handleAcceptConversion = () => {
    if (conversionBanner.decision) {
      setRoutingDecision(conversionBanner.decision);
    }
    setConversionBanner({ show: false, changeRequest: "", decision: null });
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
      triggers: builtWorkflow?.triggers ?? [],
      evals: forkFrom?.evals ?? [],
      engineType: routingDecision?.engine ?? "entrata-native",
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <ExternalLinkIcon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">This workflow requires Workato</h2>
                <p className="text-[11px] text-muted-foreground">
                  Your request involves {extSystemNames.length > 0 ? extSystemNames.join(", ") : "external systems"} — which {extSystemNames.length === 1 ? "is" : "are"} outside of Entrata.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-6">
            <div className="mx-auto w-full max-w-md space-y-5">
              <div className="rounded-xl border-2 border-orange-200 bg-orange-50/40 p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100">
                  <ExternalLinkIcon className="h-7 w-7 text-orange-600" />
                </div>
                <WorkflowEngineBadge engine="workato" size="lg" />
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                  {rd.reasoning}
                </p>

                {extSystemNames.length > 0 && (
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {extSystemNames.map((name, i) => (
                      <span key={i} className="rounded-full border border-orange-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-orange-700">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-amber-600" />
                    <span className="text-[12px] font-semibold text-amber-800">Estimated cost</span>
                  </div>
                  <div className="flex items-center gap-3 text-[12px]">
                    <span className="font-bold text-amber-800">{rd.costImpact.monthlyEstimate}</span>
                    <span className="text-amber-500">|</span>
                    <span className="text-amber-700">{rd.costImpact.perTaskEstimate}/task</span>
                  </div>
                </div>
                <p className="mt-1.5 text-[10px] text-amber-600">{rd.costImpact.explanation}</p>
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
              <Button onClick={handleBuild} className="flex-1 bg-orange-600 text-white hover:bg-orange-700">
                <Cog className="mr-2 h-4 w-4" /> Build with Workato
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
              <h2 className="text-sm font-semibold text-foreground">Ready to build natively</h2>
              <p className="text-[11px] text-muted-foreground">Everything in your request can be handled by Entrata.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6">
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

            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-2.5 text-[12px] text-emerald-800">
              <Shield className="h-4 w-4 shrink-0 text-emerald-600" />
              No additional costs — runs entirely on Entrata infrastructure with full data sovereignty.
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
              <Button variant="outline" onClick={onBack} className="flex-1">
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
            {routingDecision?.engine === "entrata-native" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setRoutingDecision({
                    ...routingDecision,
                    engine: "workato",
                    reasoning: "Manually converted to Workato by user — the entire workflow will run on Workato's platform.",
                    externalSystems: ["User-selected"],
                    costImpact: {
                      label: "Workato licensing required",
                      monthlyEstimate: "~$325/mo",
                      perTaskEstimate: "~$0.02–$0.05/task",
                      explanation: "The entire workflow runs on Workato, which charges a platform fee plus per-connector costs.",
                    },
                  });
                }}
                className="h-6 border-orange-300 px-2 text-[10px] text-orange-700 hover:bg-orange-50"
              >
                <ExternalLinkIcon className="mr-0.5 h-2.5 w-2.5" /> Move to Workato
              </Button>
            )}
            <Button size="sm" onClick={handleSave} className="h-7 px-3 text-[11px]">
              <Check className="mr-1 h-3 w-3" /> Save Agent
            </Button>
          </div>
        </div>

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
                    Entrata cannot fulfill this request natively
                  </p>
                  <p className="mt-0.5 text-[11px] text-orange-700">
                    Your requested change (&ldquo;{conversionBanner.changeRequest.slice(0, 80)}
                    {conversionBanner.changeRequest.length > 80 ? "..." : ""}&rdquo;)
                    requires <strong>{extLabel}</strong>, which is outside of Entrata. To proceed, the entire workflow
                    will move to Workato ({conversionBanner.decision.costImpact.monthlyEstimate}/month estimated).
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAcceptConversion}
                      className="h-6 bg-orange-600 px-3 text-[10px] text-white hover:bg-orange-700"
                    >
                      Move to Workato
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDismissConversion}
                      className="h-6 border-orange-300 px-3 text-[10px] text-orange-700 hover:bg-orange-100"
                      title={`The ${extLabel} step will not be added. The remaining workflow stays on Entrata Native.`}
                    >
                      Keep Native (without {extSystems.length === 1 ? extSystems[0] : "external"} step)
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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
          triggers: payload.triggers ?? a.triggers,
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
          triggers: payload.triggers ?? a.triggers,
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
        triggers: payload.triggers ?? [],
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
                    {agent.engineType && agent.type === "deterministic" && (
                      <WorkflowEngineDot engine={agent.engineType} />
                    )}
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
                      triggerDescriptions: modalStep.forkFrom.triggers,
                    } : undefined}
                  />
                </Suspense>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
