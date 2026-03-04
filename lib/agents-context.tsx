"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export const AGENT_BUCKETS = [
  "Revenue & Financial Management",
  "Leasing & Marketing",
  "Resident Relations & Retention",
  "Operations & Maintenance",
  "Risk Management & Compliance",
] as const;

export const AGENT_TYPES = [
  { value: "fully_autonomous", label: "L5 · Autonomous", level: 5 },
  { value: "autonomous", label: "L4 · Conversational", level: 4 },
  { value: "efficiency", label: "L3 · Processing at Scale", level: 3 },
  { value: "intelligence", label: "L2 · Operational Efficiency", level: 2 },
  { value: "operations", label: "L1 · ELI Essentials", level: 1 },
] as const;

export type AgentType = (typeof AGENT_TYPES)[number]["value"];

export const TYPE_LEVEL: Record<AgentType, number> = {
  fully_autonomous: 5,
  autonomous: 4,
  efficiency: 3,
  intelligence: 2,
  operations: 1,
};

export type Agent = {
  id: string;
  name: string;
  description: string;
  status: string;
  bucket: string;
  type: AgentType;
  scope: string;
  vaultBinding: string;
  /** Document IDs from Vault this agent is bound to (source of truth) */
  vaultDocIds?: string[];
  channels: string[];
  toolsAllowed: string[];
  guardrails: string;
  conversationCount: number;
  resolutionRate: string;
  escalationsCount: number;
  revenueImpact: string;
  /** Routing labels: escalations with these labels can be associated or routed to this agent */
  labels?: string[];

  /** Intelligence agent fields */
  prompt?: string;
  goal?: string;
  dataSources?: string[];
  analysisFrequency?: string;
  insightsGenerated?: number;
  recommendationsActedOn?: number;
  lastInsightAt?: string;
  recentInsights?: { title: string; summary: string; at: string }[];

  /** Operations agent fields */
  runsCompleted?: number;
  lastRunAt?: string;
  lastRunStatus?: "success" | "error" | "skipped";
  errorCount?: number;
  avgRunDuration?: string;
  schedule?: string;

  /** Prompt version history for tracking changes over time */
  promptHistory?: { version: number; prompt: string; changedAt: string; changedBy: string; note?: string }[];

  /** Pending config changes (staged, not yet live) */
  pendingChanges?: {
    prompt?: string;
    goal?: string;
    analysisFrequency?: string;
    systemPrompt?: string;
    changedAt: string;
    changedBy?: string;
  };

  /** Autonomous agent (ELI+) fields */
  systemPrompt?: string;
  persona?: string;
  maxSteps?: number;
  fairHousingEnabled?: boolean;
  escalationKeywords?: string[];
  escalationDefault?: string;
  confidenceThreshold?: number;
  toolsRequireApproval?: string[];
  requiredDocIds?: string[];
  deploymentMode?: string;
  prohibitedPhrases?: string[];
  requiredDisclosures?: string[];
  slaFirstResponseMinutes?: number;
  slaResolutionHours?: number;
  slaBusinessHoursOnly?: boolean;
};

const STORAGE_KEY = "janet-poc-agents";

const defaultAgentFields = (
  bucket: string,
  type: AgentType,
  name: string,
  description: string,
  overrides: Partial<Agent> = {}
): Omit<Agent, "id"> => ({
  name,
  description,
  status: "Active",
  bucket,
  type,
  scope: "All properties",
  vaultBinding: "",
  channels: ["Chat", "Portal"],
  toolsAllowed: ["Entrata MCP"],
  guardrails: "None",
  conversationCount: 0,
  resolutionRate: "—",
  escalationsCount: 0,
  revenueImpact: "—",
  labels: [],
  ...(type === "autonomous" ? {
    persona: "professional",
    maxSteps: 10,
    fairHousingEnabled: true,
    escalationKeywords: [],
    escalationDefault: "agent_handles",
    confidenceThreshold: 70,
    deploymentMode: "active",
    slaFirstResponseMinutes: 15,
    slaResolutionHours: 24,
    slaBusinessHoursOnly: true,
  } : {}),
  ...(type === "intelligence" && overrides.prompt ? {
    promptHistory: [
      { version: 1, prompt: "Initial analysis setup.", changedAt: "2026-01-15T10:00:00Z", changedBy: "System", note: "Agent created" },
      { version: 2, prompt: overrides.prompt.slice(0, 100) + (overrides.prompt.length > 100 ? "…" : ""), changedAt: "2026-02-01T09:00:00Z", changedBy: "Admin", note: "Refined analysis focus" },
    ],
  } : {}),
  ...overrides,
});

const INITIAL_AGENTS: Agent[] = [
  // Revenue & Financial Management — autonomous, intelligence, operations
  { id: "1", ...defaultAgentFields("Revenue & Financial Management", "autonomous", "Payments AI", "Rent, fees, payment questions", { status: "Off", vaultBinding: "SOPs: Payments, Refund policy", toolsAllowed: ["Entrata MCP", "Work orders"], guardrails: "Approval gate for refunds >$500", conversationCount: 42, resolutionRate: "88%", escalationsCount: 5, revenueImpact: "$1.2K", labels: ["Payments"] }) },
  { id: "2", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Payments Intelligence", "Analyzes rent collection patterns, late payment trends, and fee optimization opportunities across your portfolio.", { labels: ["Payments"], prompt: "Analyze rent collection data across all properties. Identify delinquency trends, late fee patterns, and revenue leakage. Flag accounts showing signs of payment difficulty early so we can intervene before they become delinquent.", goal: "Reduce delinquency rate by 15% and identify $50K+ in recoverable revenue per quarter.", dataSources: ["Entrata Ledger", "Payment History", "Resident Accounts"], analysisFrequency: "Weekly", insightsGenerated: 47, recommendationsActedOn: 18, lastInsightAt: "2026-02-18T14:30:00Z", recentInsights: [{ title: "Late payment spike at Property B", summary: "Property B has seen a 23% increase in late payments over the past 30 days, primarily in units 200-300. Consider targeted outreach or flexible payment plan offers.", at: "2026-02-18T14:30:00Z" }, { title: "Fee waiver ROI positive", summary: "Waiving late fees for first-time offenders resulted in 89% on-time payment the following month. Recommend expanding this policy.", at: "2026-02-15T09:00:00Z" }, { title: "Auto-pay adoption opportunity", summary: "34% of residents who pay on time are not on auto-pay. Targeted enrollment campaign could reduce processing costs by $2.1K/month.", at: "2026-02-10T11:15:00Z" }] }) },
  { id: "3", ...defaultAgentFields("Revenue & Financial Management", "operations", "Payments Operations", "Automated payment processing, reconciliation, and ledger posting. Runs nightly to match payments to charges and flag discrepancies.", { labels: ["Payments"], runsCompleted: 142, lastRunAt: "2026-02-20T03:00:00Z", lastRunStatus: "success", errorCount: 3, avgRunDuration: "4m 12s", schedule: "Daily at 3:00 AM" }) },
  // Leasing & Marketing
  { id: "4", ...defaultAgentFields("Leasing & Marketing", "autonomous", "Leasing AI", "Tours, applications, lease questions", { scope: "Property A, B", vaultBinding: "SOPs: Leasing, Fair housing", channels: ["Chat", "SMS", "Portal"], toolsAllowed: ["Entrata MCP", "Lease lookup"], guardrails: "Required-docs: screening policy", conversationCount: 89, resolutionRate: "92%", escalationsCount: 7, revenueImpact: "$8.4K", labels: ["Leasing"] }) },
  { id: "5", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Leasing Intelligence", "Scores incoming leads, analyzes marketing channel performance, and identifies pipeline bottlenecks to optimize conversion.", { labels: ["Leasing"], prompt: "Evaluate all active leads across properties. Score by engagement, qualification, and likelihood to convert. Identify which marketing channels drive the highest quality leads and where prospects drop off in the funnel.", goal: "Improve lead-to-lease conversion rate by 20% and reduce cost-per-lease by identifying underperforming channels.", dataSources: ["Entrata CRM", "Lead Activity", "Marketing Spend"], analysisFrequency: "Daily", insightsGenerated: 83, recommendationsActedOn: 31, lastInsightAt: "2026-02-19T16:00:00Z", recentInsights: [{ title: "ILS leads underperforming", summary: "Leads from Apartments.com have a 6% conversion rate vs 18% from Google Ads. Cost-per-lease is 3.2x higher. Consider reallocating $1,500/mo budget.", at: "2026-02-19T16:00:00Z" }, { title: "Tour no-show pattern", summary: "42% of tour no-shows occur on Mondays. Recommend adding SMS confirmation 2 hours before and offering virtual tour as fallback.", at: "2026-02-17T10:30:00Z" }] }) },
  { id: "6", ...defaultAgentFields("Leasing & Marketing", "operations", "Leasing Operations", "Processes applications, runs screening, executes leases, and coordinates move-in tasks automatically.", { labels: ["Leasing"], runsCompleted: 89, lastRunAt: "2026-02-20T08:15:00Z", lastRunStatus: "success", errorCount: 1, avgRunDuration: "2m 45s", schedule: "On new application" }) },
  // Resident Relations & Retention
  { id: "7", ...defaultAgentFields("Resident Relations & Retention", "autonomous", "Renewal AI", "Renewal conversations and retention", { vaultBinding: "SOPs: Renewal, Lease terms", guardrails: "Controlled phrasing (Voice)", conversationCount: 56, resolutionRate: "94%", escalationsCount: 3, revenueImpact: "$5.1K", labels: ["Resident relations"] }) },
  { id: "8", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Renewal Intelligence", "Predicts churn risk, analyzes resident satisfaction drivers, and identifies retention opportunities before lease expiration.", { labels: ["Resident relations"], prompt: "Identify residents at risk of non-renewal by analyzing payment patterns, maintenance request frequency, satisfaction survey data, and lease expiration dates. Prioritize outreach recommendations by churn probability and unit value.", goal: "Achieve 85% renewal rate and identify at-risk residents 90+ days before lease expiration.", dataSources: ["Entrata Leases", "Maintenance Requests", "Survey Results"], analysisFrequency: "Weekly", insightsGenerated: 36, recommendationsActedOn: 14, lastInsightAt: "2026-02-17T08:00:00Z", recentInsights: [{ title: "12 residents at high churn risk", summary: "12 residents with leases expiring in 60 days have submitted 3+ maintenance requests and no renewal intent. Personal outreach recommended.", at: "2026-02-17T08:00:00Z" }, { title: "Amenity usage correlates with renewals", summary: "Residents who use the fitness center 2+ times/week renew at 94% vs 71% for non-users. Consider promoting amenity access in retention offers.", at: "2026-02-12T14:00:00Z" }] }) },
  { id: "9", ...defaultAgentFields("Resident Relations & Retention", "operations", "Renewal Operations", "Sends renewal offers, generates lease documents, schedules follow-ups, and processes renewal executions.", { labels: ["Resident relations"], runsCompleted: 67, lastRunAt: "2026-02-19T10:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "1m 30s", schedule: "Daily at 10:00 AM" }) },
  // Operations & Maintenance
  { id: "10", ...defaultAgentFields("Operations & Maintenance", "autonomous", "Maintenance AI", "Work orders, follow-up, scheduling", { status: "Off", vaultBinding: "SOPs: Maintenance escalation", channels: ["Chat", "Voice"], toolsAllowed: ["Entrata MCP", "Work orders"], conversationCount: 78, resolutionRate: "89%", escalationsCount: 8, revenueImpact: "$3.2K", labels: ["Maintenance"] }) },
  { id: "11", ...defaultAgentFields("Operations & Maintenance", "intelligence", "Maintenance Intelligence", "Identifies preventive maintenance opportunities, analyzes vendor performance, and predicts equipment failures before they happen.", { labels: ["Maintenance"], prompt: "Review all maintenance data including work order history, equipment age, vendor response times, and cost per repair. Identify recurring issues that indicate equipment replacement would be cheaper than continued repairs. Score vendors by responsiveness, cost, and resident satisfaction.", goal: "Reduce emergency work orders by 30% through preventive maintenance and save 15% on vendor costs through performance-based selection.", dataSources: ["Work Orders", "Vendor Invoices", "Equipment Registry"], analysisFrequency: "Weekly", insightsGenerated: 29, recommendationsActedOn: 11, lastInsightAt: "2026-02-16T13:00:00Z", recentInsights: [{ title: "HVAC failure pattern detected", summary: "Units 101-110 at Property A have the same HVAC model (installed 2018). Three failures in the past month suggest batch replacement would save $8K vs continued spot repairs.", at: "2026-02-16T13:00:00Z" }, { title: "Vendor response time degrading", summary: "ABC Plumbing average response time has increased from 4h to 11h over 90 days. SLA breach rate is now 35%. Consider backup vendor.", at: "2026-02-11T09:30:00Z" }] }) },
  { id: "12", ...defaultAgentFields("Operations & Maintenance", "operations", "Maintenance Operations", "Dispatches work orders to vendors, tracks SLA compliance, sends resident updates, and closes completed orders.", { labels: ["Maintenance"], runsCompleted: 234, lastRunAt: "2026-02-20T07:30:00Z", lastRunStatus: "success", errorCount: 7, avgRunDuration: "3m 05s", schedule: "On new work order" }) },
  // Risk Management & Compliance
  { id: "14", ...defaultAgentFields("Risk Management & Compliance", "intelligence", "Compliance Intelligence", "Monitors compliance posture across properties, identifies policy gaps, and flags audit risks before they become violations.", { labels: ["Compliance"], prompt: "Audit all property operations for fair housing compliance, screening consistency, and documentation completeness. Identify patterns where policies are applied inconsistently across properties or staff. Flag any interactions or decisions that could create legal exposure.", goal: "Maintain 100% fair housing compliance and identify policy inconsistencies within 24 hours of occurrence.", dataSources: ["Screening Results", "Lease Applications", "Communication Logs", "SOP Vault"], analysisFrequency: "Daily", insightsGenerated: 52, recommendationsActedOn: 22, lastInsightAt: "2026-02-19T07:00:00Z", recentInsights: [{ title: "Screening criteria inconsistency", summary: "Property C applied different income requirements to 3 applicants last week. This creates fair housing risk. Recommend retraining staff on standardized criteria.", at: "2026-02-19T07:00:00Z" }, { title: "SOP gap: emotional support animals", summary: "No SOP currently covers the reasonable accommodation process for emotional support animals. This is a high-risk gap given 4 requests in the past month.", at: "2026-02-14T11:00:00Z" }] }) },
  { id: "15", ...defaultAgentFields("Risk Management & Compliance", "operations", "Compliance Operations", "Runs applicant screening, verifies documentation completeness, and archives records for audit readiness.", { labels: ["Compliance", "Policy"], runsCompleted: 112, lastRunAt: "2026-02-20T06:00:00Z", lastRunStatus: "success", errorCount: 2, avgRunDuration: "5m 20s", schedule: "On new application" }) },
  // L3 · Efficiency — Orchestrators
  { id: "30", ...defaultAgentFields("Revenue & Financial Management", "efficiency", "Revenue Orchestrator", "Coordinates revenue workflows across leasing, renewals, and collections to maximize portfolio NOI.", { status: "Active", labels: ["Payments", "Leasing"], runsCompleted: 87, lastRunAt: "2026-02-20T06:00:00Z", lastRunStatus: "success", errorCount: 1, avgRunDuration: "6m 30s", schedule: "Daily at 6:00 AM" }) },
  { id: "31", ...defaultAgentFields("Operations & Maintenance", "efficiency", "Property Operations Orchestrator", "Coordinates maintenance workflows, vendor assignments, and unit turn scheduling across properties.", { status: "Active", labels: ["Maintenance"], runsCompleted: 112, lastRunAt: "2026-02-20T07:00:00Z", lastRunStatus: "success", errorCount: 3, avgRunDuration: "5m 15s", schedule: "Daily at 7:00 AM" }) },
  { id: "32", ...defaultAgentFields("Risk Management & Compliance", "efficiency", "Compliance AI", "Orchestrates compliance checks across screening, fair housing, and documentation workflows to ensure audit readiness.", { status: "Active", labels: ["Compliance"], runsCompleted: 64, lastRunAt: "2026-02-20T05:30:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "4m 45s", schedule: "Daily at 5:30 AM" }) },
  // Placeholder agents (so "View all" is visible and list looks populated)
  { id: "16", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Revenue Analytics", "Tracks revenue trends, occupancy-to-revenue ratios, and identifies pricing optimization opportunities.", { status: "Off", labels: ["Payments"], prompt: "Analyze monthly revenue data across all properties and identify trends, anomalies, and pricing optimization opportunities.", goal: "Identify $25K+ in annual revenue upside through pricing and fee optimization.", dataSources: ["Entrata Ledger", "Market Comps"], analysisFrequency: "Monthly", insightsGenerated: 11, recommendationsActedOn: 4, lastInsightAt: "2026-01-15T10:00:00Z", recentInsights: [{ title: "Rent increase opportunity at Property A", summary: "Market comps show Property A is $85/mo below avg for comparable units. A 3-5% increase at renewal would generate $18K/yr additional revenue with minimal churn risk.", at: "2026-01-15T10:00:00Z" }, { title: "Amenity fee underpriced", summary: "Pet fees are $25/mo vs market avg of $45/mo. 62 units have pets — adjusting to $40/mo adds $11K/yr.", at: "2026-01-02T09:00:00Z" }] }) },
  { id: "17", ...defaultAgentFields("Revenue & Financial Management", "operations", "Fees & Refunds Ops", "Processes fee waivers, refund requests, and ledger adjustments based on approval rules.", { labels: ["Payments"], runsCompleted: 56, lastRunAt: "2026-02-19T14:00:00Z", lastRunStatus: "success", errorCount: 1, avgRunDuration: "1m 15s", schedule: "On fee waiver request" }) },
  { id: "18", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Marketing Analytics", "Evaluates marketing campaign performance, ad spend ROI, and ILS listing effectiveness.", { labels: ["Leasing"], prompt: "Compare marketing spend to lead volume and conversion across channels. Identify which listings and campaigns drive the best ROI.", goal: "Reduce cost-per-lead by 25% while maintaining lead volume.", dataSources: ["Marketing Spend", "Lead Sources", "ILS Performance"], analysisFrequency: "Weekly", insightsGenerated: 12, recommendationsActedOn: 5, lastInsightAt: "2026-02-18T09:00:00Z", recentInsights: [{ title: "Social media outperforming ILS", summary: "Instagram tours generate leads at $8/lead vs $34/lead on ILS platforms. Recommend shifting 30% of ILS budget to social.", at: "2026-02-18T09:00:00Z" }] }) },
  { id: "19", ...defaultAgentFields("Leasing & Marketing", "operations", "Move-in Coordinator", "Schedules move-ins, generates welcome packets, assigns parking, and triggers utility setup reminders.", { labels: ["Leasing"], runsCompleted: 34, lastRunAt: "2026-02-20T09:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "2m 00s", schedule: "On lease execution" }) },
  { id: "20", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Satisfaction Insights", "Analyzes NPS scores, survey responses, and review sentiment to surface resident satisfaction drivers.", { labels: ["Resident relations"], prompt: "Aggregate resident survey data, online reviews, and NPS scores. Identify common themes in positive and negative feedback and correlate with property-level actions.", goal: "Improve average NPS from 42 to 55 within 6 months by acting on top detractor themes.", dataSources: ["Survey Results", "Online Reviews", "NPS Data"], analysisFrequency: "Monthly", insightsGenerated: 8, recommendationsActedOn: 3, lastInsightAt: "2026-02-01T10:00:00Z", recentInsights: [{ title: "Noise complaints driving low NPS", summary: "Noise is the #1 detractor theme at Property A (mentioned in 38% of negative reviews). Quiet hours enforcement and soundproofing upgrades recommended.", at: "2026-02-01T10:00:00Z" }] }) },
  { id: "21", ...defaultAgentFields("Resident Relations & Retention", "operations", "Move-out Coordinator", "Processes move-out notices, schedules inspections, calculates deposit returns, and initiates unit turnover.", { labels: ["Resident relations"], runsCompleted: 28, lastRunAt: "2026-02-19T16:00:00Z", lastRunStatus: "success", errorCount: 2, avgRunDuration: "3m 30s", schedule: "On move-out notice" }) },
  { id: "22", ...defaultAgentFields("Operations & Maintenance", "intelligence", "Vendor Performance", "Scores vendors on response time, cost, quality, and resident satisfaction to inform procurement decisions.", { labels: ["Maintenance"], prompt: "Rank all active vendors by response time, cost per work order, callback rate, and resident satisfaction. Identify vendors consistently missing SLAs and recommend alternatives.", goal: "Ensure all vendors maintain <4hr response time SLA and <5% callback rate.", dataSources: ["Work Orders", "Vendor Invoices", "Resident Feedback"], analysisFrequency: "Monthly", insightsGenerated: 15, recommendationsActedOn: 6, lastInsightAt: "2026-02-13T08:00:00Z", recentInsights: [{ title: "Top performer: XYZ Electric", summary: "XYZ Electric has 2.1hr avg response, 0% callback rate, and 4.8/5 resident rating. Consider expanding their scope to all properties.", at: "2026-02-13T08:00:00Z" }] }) },
  { id: "23", ...defaultAgentFields("Operations & Maintenance", "operations", "After-hours Dispatch", "Routes after-hours emergency work orders to on-call vendors and sends resident status updates.", { labels: ["Maintenance"], status: "Active", runsCompleted: 19, lastRunAt: "2026-02-19T23:45:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "45s", schedule: "On emergency work order (after 6 PM)" }) },
  { id: "24", ...defaultAgentFields("Risk Management & Compliance", "intelligence", "Audit Dashboard", "Tracks compliance metrics, audit readiness scores, and identifies documentation gaps across properties.", { labels: ["Compliance"], prompt: "Score each property on audit readiness: document completeness, screening consistency, fair housing training currency, and incident response documentation. Flag properties below 80% readiness.", goal: "Maintain 95%+ audit readiness score across all properties.", dataSources: ["SOP Vault", "Training Records", "Screening Logs"], analysisFrequency: "Weekly", insightsGenerated: 21, recommendationsActedOn: 9, lastInsightAt: "2026-02-17T07:00:00Z", recentInsights: [{ title: "Property D audit readiness: 72%", summary: "Property D is missing updated fair housing training certificates for 3 staff members and has no documented pet policy. Address before Q2 audit.", at: "2026-02-17T07:00:00Z" }] }) },
  { id: "25", ...defaultAgentFields("Risk Management & Compliance", "operations", "Document Review", "Runs automated policy and document review checks, flags expired SOPs, and generates audit-ready reports.", { labels: ["Compliance", "Policy"], runsCompleted: 45, lastRunAt: "2026-02-20T05:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "6m 10s", schedule: "Weekly on Mondays" }) },
  // L2 · Operational — Accounting (Revenue & Financial Management)
  { id: "40", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Batch Post Late Fees", "Identifies overdue balances and posts late fees in batch across all properties based on configurable rules and grace periods.", { labels: ["Accounting"], runsCompleted: 312, lastRunAt: "2026-02-20T02:00:00Z", lastRunStatus: "success", errorCount: 2, avgRunDuration: "3m 20s", schedule: "Daily at 2:00 AM" }) },
  { id: "41", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Bulk Vendor Status Update", "Synchronizes vendor statuses across properties, deactivates stale vendors, and flags vendors requiring re-certification.", { labels: ["Accounting"], runsCompleted: 89, lastRunAt: "2026-02-19T22:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "2m 45s", schedule: "Weekly on Sundays" }) },
  { id: "42", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Cancel Expired Customer Invoices", "Scans open invoices past their expiration window and cancels them with proper audit trail and ledger adjustments.", { labels: ["Accounting"], runsCompleted: 156, lastRunAt: "2026-02-20T03:30:00Z", lastRunStatus: "success", errorCount: 1, avgRunDuration: "1m 50s", schedule: "Daily at 3:30 AM" }) },
  { id: "43", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Full Vendor Sync Pipeline", "Runs end-to-end vendor data synchronization between Entrata and external accounting systems, reconciling discrepancies.", { labels: ["Accounting"], runsCompleted: 67, lastRunAt: "2026-02-20T01:00:00Z", lastRunStatus: "success", errorCount: 3, avgRunDuration: "8m 15s", schedule: "Daily at 1:00 AM" }) },
  { id: "44", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Generate Customer Invoices", "Creates and posts monthly customer invoices based on lease terms, recurring charges, and utility allocations.", { labels: ["Accounting"], runsCompleted: 245, lastRunAt: "2026-02-20T04:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "5m 30s", schedule: "1st of each month" }) },
  { id: "45", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Import Vendor Accounts", "Imports new vendor records from external systems, validates tax IDs and payment details, and creates Entrata vendor profiles.", { labels: ["Accounting"], runsCompleted: 34, lastRunAt: "2026-02-18T10:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "2m 10s", schedule: "On new vendor submission" }) },
  { id: "46", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Invite Vendors", "Sends onboarding invitations to new vendors with setup instructions, compliance requirements, and portal access credentials.", { labels: ["Accounting"], runsCompleted: 28, lastRunAt: "2026-02-17T14:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "45s", schedule: "On vendor approval" }) },
  { id: "47", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Sync Vendor Locations", "Maps vendor service areas to property locations and updates coverage assignments across the portfolio.", { labels: ["Accounting"], runsCompleted: 52, lastRunAt: "2026-02-19T20:00:00Z", lastRunStatus: "success", errorCount: 1, avgRunDuration: "1m 30s", schedule: "Weekly on Fridays" }) },
  { id: "48", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Sync Vendor Entities", "Synchronizes vendor entity structures, parent-child relationships, and consolidated billing configurations.", { labels: ["Accounting"], runsCompleted: 41, lastRunAt: "2026-02-19T21:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "2m 00s", schedule: "Weekly on Fridays" }) },
  { id: "49", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Vendor Property Sync Refresh", "Refreshes vendor-to-property assignments and updates service scope based on contract terms and property changes.", { labels: ["Accounting"], runsCompleted: 38, lastRunAt: "2026-02-19T19:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "1m 15s", schedule: "Weekly on Thursdays" }) },
  { id: "50", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "AP Advance Checklist Bulk Completion", "Processes accounts payable advance checklists in bulk, validating approvals, coding, and documentation completeness.", { labels: ["Accounting"], runsCompleted: 78, lastRunAt: "2026-02-20T06:00:00Z", lastRunStatus: "success", errorCount: 1, avgRunDuration: "4m 00s", schedule: "Daily at 6:00 AM" }) },
  { id: "51", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "AP Closing Checklist Bulk Completion", "Runs month-end AP closing checklists across all entities, flagging incomplete items and auto-completing verified steps.", { labels: ["Accounting"], runsCompleted: 24, lastRunAt: "2026-02-01T08:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "6m 45s", schedule: "Last business day of month" }) },
  { id: "52", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Activate & Sync Templates", "Activates accounting templates across properties and synchronizes chart of accounts, GL codes, and reporting structures.", { labels: ["Accounting"], runsCompleted: 19, lastRunAt: "2026-02-15T10:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "3m 30s", schedule: "On template update" }) },
  { id: "53", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Approve for Payment", "Reviews pending payment batches against approval rules, budget thresholds, and duplicate detection before releasing for payment.", { labels: ["Accounting"], runsCompleted: 198, lastRunAt: "2026-02-20T07:00:00Z", lastRunStatus: "success", errorCount: 2, avgRunDuration: "2m 30s", schedule: "Daily at 7:00 AM" }) },
  { id: "54", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Bulk Asset Creation from Cost Codes", "Creates fixed asset records from capital expenditure cost codes, auto-classifying depreciation schedules and useful life.", { labels: ["Accounting"], runsCompleted: 15, lastRunAt: "2026-02-10T09:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "3m 15s", schedule: "On capital expenditure posting" }) },
  { id: "55", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Bulk Budget Export", "Exports approved budgets across all properties and entities to external accounting systems and reporting platforms.", { labels: ["Accounting"], runsCompleted: 12, lastRunAt: "2026-02-05T08:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "4m 00s", schedule: "On budget approval" }) },
  { id: "56", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Bulk JE Creation from Manual Templates", "Generates journal entries in bulk from pre-configured manual templates, applying property and period mappings automatically.", { labels: ["Accounting"], runsCompleted: 48, lastRunAt: "2026-02-20T05:00:00Z", lastRunStatus: "success", errorCount: 1, avgRunDuration: "3m 45s", schedule: "Monthly on 1st" }) },
  { id: "57", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Bulk JE Template Creation", "Creates standardized journal entry templates across entities based on recurring transaction patterns and GL structures.", { labels: ["Accounting"], runsCompleted: 8, lastRunAt: "2026-01-20T10:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "2m 00s", schedule: "On template request" }) },
  { id: "58", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Bulk Submit Worksheets", "Submits completed accounting worksheets in bulk for review and approval, validating totals and cross-referencing GL balances.", { labels: ["Accounting"], runsCompleted: 36, lastRunAt: "2026-02-20T06:30:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "2m 15s", schedule: "Daily at 6:30 AM" }) },
  // L2 · Operational — Leasing (Leasing & Marketing)
  { id: "60", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Application Reminder Send", "Sends automated reminders to applicants with incomplete or pending applications, tracking response rates and follow-up cadence.", { labels: ["Leasing"], runsCompleted: 267, lastRunAt: "2026-02-20T08:00:00Z", lastRunStatus: "success", errorCount: 1, avgRunDuration: "1m 30s", schedule: "Daily at 8:00 AM" }) },
  { id: "61", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Approve Applications", "Reviews completed applications against approval criteria, income verification, and credit thresholds to auto-approve or flag for review.", { labels: ["Leasing"], runsCompleted: 189, lastRunAt: "2026-02-20T09:00:00Z", lastRunStatus: "success", errorCount: 2, avgRunDuration: "2m 15s", schedule: "On application completion" }) },
  { id: "62", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Bulk Lead Reassignment", "Redistributes unworked or aging leads across leasing agents based on availability, performance, and property assignment.", { labels: ["Leasing"], runsCompleted: 45, lastRunAt: "2026-02-19T14:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "1m 45s", schedule: "Daily at 2:00 PM" }) },
  { id: "63", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Bulk Skip Screening Type", "Applies screening type overrides in bulk for pre-approved applicant categories such as corporate housing or employee transfers.", { labels: ["Leasing"], runsCompleted: 22, lastRunAt: "2026-02-18T11:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "50s", schedule: "On bulk override request" }) },
  { id: "64", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Contact Point Copy", "Copies contact point configurations across properties to standardize communication preferences and routing rules.", { labels: ["Leasing"], runsCompleted: 16, lastRunAt: "2026-02-14T10:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "1m 00s", schedule: "On configuration update" }) },
  { id: "65", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Duplicate Lead Merge", "Identifies and merges duplicate lead records across sources, preserving activity history and deduplicating contact information.", { labels: ["Leasing"], runsCompleted: 134, lastRunAt: "2026-02-20T02:00:00Z", lastRunStatus: "success", errorCount: 3, avgRunDuration: "4m 30s", schedule: "Daily at 2:00 AM" }) },
  { id: "66", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Generate Quote from Entrata", "Pulls real-time unit availability and pricing to generate personalized lease quotes for prospects based on their preferences.", { labels: ["Leasing"], runsCompleted: 312, lastRunAt: "2026-02-20T10:00:00Z", lastRunStatus: "success", errorCount: 1, avgRunDuration: "30s", schedule: "On quote request" }) },
  { id: "67", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Lead Nurture Sequence Enrollment", "Enrolls new and unresponsive leads into automated nurture sequences based on lead score, source, and engagement history.", { labels: ["Leasing"], runsCompleted: 178, lastRunAt: "2026-02-20T07:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "1m 15s", schedule: "Daily at 7:00 AM" }) },
  { id: "68", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Lead Source Assignment", "Attributes incoming leads to their originating marketing source and campaign for accurate ROI tracking and channel optimization.", { labels: ["Leasing"], runsCompleted: 423, lastRunAt: "2026-02-20T06:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "45s", schedule: "On new lead creation" }) },
  { id: "69", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Bulk Countersign Leases", "Countersigns executed leases in bulk after verifying all required signatures, addenda, and compliance documentation are complete.", { labels: ["Leasing"], runsCompleted: 87, lastRunAt: "2026-02-20T08:30:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "2m 30s", schedule: "Daily at 8:30 AM" }) },
  { id: "70", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Process Screening", "Submits applicant screening requests, monitors results, and routes completed screenings to the appropriate approval workflow.", { labels: ["Leasing"], runsCompleted: 201, lastRunAt: "2026-02-20T09:15:00Z", lastRunStatus: "success", errorCount: 2, avgRunDuration: "3m 00s", schedule: "On screening request" }) },
  { id: "71", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Reinitiate Stuck Screenings", "Detects screening requests stuck in pending status and reinitiates them with the screening provider after validation.", { labels: ["Leasing"], runsCompleted: 34, lastRunAt: "2026-02-19T16:00:00Z", lastRunStatus: "success", errorCount: 1, avgRunDuration: "1m 45s", schedule: "Every 4 hours" }) },
  { id: "72", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Screening Condition Templates Update All Rates", "Updates screening condition templates with current rate tables, fee structures, and threshold values across all properties.", { labels: ["Leasing"], runsCompleted: 8, lastRunAt: "2026-02-01T10:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "2m 00s", schedule: "On rate table update" }) },
  { id: "73", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Approve Screening Decisions", "Reviews screening results against property-specific criteria and auto-approves, conditionally approves, or flags for manual review.", { labels: ["Leasing"], runsCompleted: 198, lastRunAt: "2026-02-20T09:30:00Z", lastRunStatus: "success", errorCount: 1, avgRunDuration: "1m 30s", schedule: "On screening completion" }) },
  { id: "74", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Send Invitation", "Sends lease signing invitations to approved applicants with document links, move-in instructions, and deadline reminders.", { labels: ["Leasing"], runsCompleted: 156, lastRunAt: "2026-02-20T10:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "40s", schedule: "On application approval" }) },
  { id: "75", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Start Applications", "Initiates application workflows for qualified prospects, pre-populating known information and sending application links.", { labels: ["Leasing"], runsCompleted: 234, lastRunAt: "2026-02-20T10:30:00Z", lastRunStatus: "success", errorCount: 1, avgRunDuration: "35s", schedule: "On prospect qualification" }) },
  { id: "76", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Stale Lead Archival", "Identifies leads with no activity beyond the configurable stale threshold and archives them to maintain pipeline hygiene.", { labels: ["Leasing"], runsCompleted: 67, lastRunAt: "2026-02-20T01:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "2m 45s", schedule: "Weekly on Mondays" }) },
  { id: "77", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Tiered Screening Continue", "Advances applicants through multi-tier screening workflows, triggering the next screening level based on prior results.", { labels: ["Leasing"], runsCompleted: 89, lastRunAt: "2026-02-20T09:45:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "1m 10s", schedule: "On tier completion" }) },
  { id: "78", ...defaultAgentFields("Leasing & Marketing", "intelligence", "SMS Auto Opt-in", "Processes SMS opt-in requests from prospects and residents, updating communication preferences and compliance records.", { labels: ["Leasing"], runsCompleted: 345, lastRunAt: "2026-02-20T10:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "20s", schedule: "On opt-in request" }) },
  { id: "79", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Tour No-Show Logging", "Detects missed tour appointments, logs no-show records, and triggers follow-up sequences to re-engage prospects.", { labels: ["Leasing"], runsCompleted: 112, lastRunAt: "2026-02-20T07:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "1m 00s", schedule: "Daily at 7:00 AM" }) },
  { id: "80", ...defaultAgentFields("Leasing & Marketing", "intelligence", "eSign Invitation Send", "Sends electronic signature invitations for lease documents, tracking delivery status, opens, and completion rates.", { labels: ["Leasing"], runsCompleted: 178, lastRunAt: "2026-02-20T11:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "25s", schedule: "On document ready" }) },
  { id: "81", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Default Scorecard Association", "Associates default scoring templates to new properties and unit types, ensuring consistent lead and applicant evaluation criteria.", { labels: ["Leasing"], runsCompleted: 14, lastRunAt: "2026-02-12T09:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "1m 30s", schedule: "On property onboarding" }) },
];

type AgentsContextValue = {
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  addAgent: (agent: Omit<Agent, "id">) => void;
  updateAgent: (id: string, updates: Partial<Omit<Agent, "id">>) => void;
  suspendAll: () => void;
  agentsEnabledCount: number;
  /** True when all agents have been emergency-suspended */
  emergencySuspended: boolean;
};

const AgentsContext = createContext<AgentsContextValue | null>(null);

export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const defaultsById = new Map(INITIAL_AGENTS.map((a) => [a.id, a]));
          const validTypes = new Set(AGENT_TYPES.map((t) => t.value));
          const merged = parsed.map((stored: Agent) => {
            const defaults = defaultsById.get(stored.id);
            const fixStatus = (s: string) => s === "Training" ? "Active" : s;
            if (!defaults) {
              if (!validTypes.has(stored.type)) {
                return { ...stored, type: "operations" as AgentType, status: fixStatus(stored.status) };
              }
              return { ...stored, status: fixStatus(stored.status) };
            }
            return {
              ...defaults,
              ...stored,
              type: defaults.type,
              bucket: defaults.bucket,
              status: defaults.status === "Off" ? ("Off" as const) : fixStatus(stored.status),
            };
          });
          const existingIds = new Set(parsed.map((a: Agent) => a.id));
          const missing = INITIAL_AGENTS.filter((a) => !existingIds.has(a.id));
          setAgents(missing.length > 0 ? [...merged, ...missing] : merged);
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
    } catch {
      // ignore
    }
  }, [agents, mounted]);

  const addAgent = useCallback((agent: Omit<Agent, "id">) => {
    setAgents((prev) => [...prev, { ...agent, id: String(Date.now()) }]);
  }, []);

  const updateAgent = useCallback((id: string, updates: Partial<Omit<Agent, "id">>) => {
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }, []);

  const suspendAll = useCallback(() => {
    setAgents((prev) => prev.map((a) => a.status === "Active" ? { ...a, status: "Suspended" } : a));
  }, []);

  const agentsEnabledCount = agents.filter((a) => a.status === "Active").length;
  const emergencySuspended = agents.length > 0 && agents.every((a) => a.status === "Suspended" || a.status === "Off");

  return (
    <AgentsContext.Provider value={{ agents, setAgents, addAgent, updateAgent, suspendAll, agentsEnabledCount, emergencySuspended }}>
      {children}
    </AgentsContext.Provider>
  );
}

export function useAgents() {
  const ctx = useContext(AgentsContext);
  if (!ctx) throw new Error("useAgents must be used within AgentsProvider");
  return ctx;
}
