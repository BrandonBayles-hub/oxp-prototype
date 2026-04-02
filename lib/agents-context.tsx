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

  /** New Relic usage telemetry (mock) */
  weeklyUsage?: number;
  trendDirection?: "up" | "down" | "flat";
};

const STORAGE_KEY = "janet-poc-agents-v8";

function seedUsage(name: string, status: string, type: AgentType): { weeklyUsage: number; trendDirection: "up" | "down" | "flat" } {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  h = Math.abs(h);
  const base = status === "Active" ? 120 + (h % 880) : status === "Off" ? 0 : h % 40;
  const typeBoost = type === "autonomous" ? 1.6 : type === "efficiency" ? 1.3 : type === "operations" ? 1.1 : 1;
  const weeklyUsage = Math.round(base * typeBoost);
  const trendDirection: "up" | "down" | "flat" = weeklyUsage === 0 ? "flat" : h % 5 < 3 ? "up" : h % 5 === 3 ? "flat" : "down";
  return { weeklyUsage, trendDirection };
}

const defaultAgentFields = (
  bucket: string,
  type: AgentType,
  name: string,
  description: string,
  overrides: Partial<Agent> = {}
): Omit<Agent, "id"> => {
  const status = overrides.status ?? "Off";
  const usage = seedUsage(name, status, type);
  return {
  name,
  description,
  status: "Off",
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
  ...usage,
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
};
};

const INITIAL_AGENTS: Agent[] = [
  // Revenue & Financial Management — autonomous, intelligence, operations
  { id: "1", ...defaultAgentFields("Revenue & Financial Management", "autonomous", "Payments AI", "Rent, fees, payment questions", { status: "Off", vaultBinding: "SOPs: Payments, Refund policy", toolsAllowed: ["Entrata MCP", "Work orders"], guardrails: "Approval gate for refunds >$500", conversationCount: 42, resolutionRate: "88%", escalationsCount: 5, revenueImpact: "$1.2K", labels: ["Payments"] }) },
  // L2 · Operational Efficiency — Revenue & Financial Management (35)
  { id: "100", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Activate & Sync Templates", "Push changes from a budget template to multiple linked budgets in one operation.", { status: "Active", labels: ["Accounting"] }) },
  { id: "101", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Advance Period Select All AP Agent", "Select all checkbox automatically in AP period closing module of AP Payment.", { status: "Active", labels: ["Accounting"] }) },
  { id: "102", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "AP Advance Checklist Bulk Completion", "User selects post month and properties, clicks Load Properties, then deploys the agent. The agent checks all unchecked AP advance checklist items across all loaded properties.", { status: "Coming Soon", labels: ["Accounting"] }) },
  { id: "103", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "AP Closing Checklist Bulk Completion", "User selects post month and properties, clicks Load Properties, then deploys the agent. The agent checks all unchecked AP closing checklist items across all loaded properties.", { status: "Active", labels: ["Accounting"] }) },
  { id: "104", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Approve for Payment", "Approve selected invoices for payment in bulk, moving them through the AP approval workflow.", { status: "Active", labels: ["Accounting"] }) },
  { id: "105", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "AR Advance Checklist Bulk Completion", "With the agent, the human performs the setup: they select the post month, select properties (default: all), and click Load Properties to populate the checklist. They deploy the agent.", { status: "Active", labels: ["Accounting"] }) },
  { id: "106", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "AR Lock Checklist Bulk Completion", "Human selects post month and properties, loads them, agent checks all AR checklist items across all properties, human reviews and clicks Lock AR.", { status: "Active", labels: ["Accounting"] }) },
  { id: "107", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Auto Revise FMO", "Automate FMO revisions when residents pay after FMO.", { status: "Active", labels: ["Accounting"] }) },
  { id: "108", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Batch Post Late Fees", "Post calculated late fees across all eligible leases in bulk for selected properties and billing periods.", { status: "Active", labels: ["Accounting"] }) },
  { id: "109", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Bulk Budget Export", "The user selects which budgets to export (e.g. by fiscal year, property, or portfolio) and deploys the agent.", { status: "Active", labels: ["Accounting"] }) },
  { id: "110", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Bulk JE Creation from Manual Templates", "Generate journal entries in bulk from selected manual templates.", { status: "Active", labels: ["Accounting"] }) },
  { id: "111", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Bulk Submit Worksheets for Approval", "Submit multiple budget worksheets for approval in a single operation.", { status: "Active", labels: ["Accounting"] }) },
  { id: "112", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Cancel Expired Customer Invoices", "Cancel all expired customer invoices for selected properties and date ranges in a single action.", { status: "Active", labels: ["Accounting"] }) },
  { id: "113", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Complete GL Advance Checklist", "User selects post month and properties, clicks Load Properties, then deploys the agent. The agent checks all unchecked GL advance checklist items across all loaded properties.", { status: "Active", labels: ["Accounting"] }) },
  { id: "114", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Copy Priorities to All Properties", "Synchronize charge code priority ordering from a source property to multiple target properties.", { status: "Active", labels: ["Accounting"] }) },
  { id: "115", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Create Draw Request", "Create and submit draw requests for multiple jobs with configured defaults in one operation.", { status: "Active", labels: ["Accounting"] }) },
  { id: "116", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Create Journal Entries from Template", "Create journal entry templates in bulk from selected posted journal entries.", { status: "Active", labels: ["Accounting"] }) },
  { id: "117", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Create Purchase Order from Contract", "Add purchase orders to existing contracts by pre-populating from the contract and routing for approval.", { status: "Active", labels: ["Accounting"] }) },
  { id: "118", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Draw Update Documentation", "The user selects which draws need updated docs (e.g. \"draws with payment after last generate\" or a list) and deploys the agent.", { status: "Active", labels: ["Accounting"] }) },
  { id: "119", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Fee Transparency Enablement", "Enable fee transparency settings across multiple properties in a single operation.", { status: "Active", labels: ["Accounting"] }) },
  { id: "120", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Generate Draw Document", "Generate, download, or email draw documents across multiple draw requests at once.", { status: "Active", labels: ["Accounting"] }) },
  { id: "121", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "GL Closing Checklist Bulk Completion", "User selects post month and properties, clicks Load Properties, then deploys the agent. The agent checks all unchecked GL closing checklist items across all loaded properties.", { status: "Active", labels: ["Accounting"] }) },
  { id: "122", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Job Budget Approval", "Submit job budgets for approval across multiple selected jobs in a single action.", { status: "Active", labels: ["Accounting"] }) },
  { id: "123", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Month-to-Month Rent Increases", "Process month-to-month rent increases across eligible leases in bulk.", { status: "Active", labels: ["Accounting"] }) },
  { id: "124", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Post Deposit Interest Bulk", "Calculate and post deposit interest for residents across selected properties in bulk.", { status: "Active", labels: ["Accounting"] }) },
  { id: "125", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Post Recurring Charges", "Post recurring scheduled charges across all properties in a single action.", { status: "Active", labels: ["Accounting"] }) },
  { id: "126", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Purchase Orders > Receive Items", "Receive remaining quantities on approved existing purchase orders in bulk.", { status: "Coming Soon", labels: ["Accounting"] }) },
  { id: "127", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Reforecast Budgets", "Run the re-forecast action across multiple advanced budgets with consistent settings.", { status: "Active", labels: ["Accounting"] }) },
  { id: "128", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Report Generation", "The Bulk Report Generation Agent generates multiple selected report instances sequentially from the Company Reports page. The user selects the instances they want to generate, can apply a Property Groups and/or Period filter override, and deploys the agent. The agent then processes each report.", { status: "Active", labels: ["Accounting"] }) },
  { id: "129", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Reverse Void Payments", "Reverse void payments in bulk across selected transactions.", { status: "Active", labels: ["Accounting"] }) },
  { id: "130", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Revin Portfolio Setup Assistant", "Scaling Revenue Intelligence across your portfolio shouldn’t mean repeating setup for every property. The Portfolio Setup Assistant clones your proven configuration, unit groups, pricing constraints, and optimization settings from one property to many, so you go live faster with confidence.", { status: "Active", labels: ["Accounting"] }) },
  { id: "131", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Revin Unit Type Set-Up Assistant", "Stop configuring every unit type from scratch. Your Intelligent Settings Assistant learns your pricing strategy, turn costs, vacancy loss, rent constraints, and expiration rules - and applies it across your portfolio in seconds. You stay in control and the system does the heavy lifting.", { status: "Active", labels: ["Accounting"] }) },
  { id: "132", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Scheduled Charge Approvals", "Approve scheduled charges in bulk, moving pending charges through the approval workflow.", { status: "Active", labels: ["Accounting"] }) },
  { id: "133", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Unapprove for Payment", "Unapprove selected invoices for payment in bulk, moving them through the AP approval workflow.", { status: "Active", labels: ["Accounting"] }) },
  { id: "134", ...defaultAgentFields("Revenue & Financial Management", "intelligence", "Unapprove for Payment", "Unapprove selected invoices for payment in bulk, moving them through the AP approval workflow.", { status: "Active", labels: ["Accounting"] }) },
  { id: "3", ...defaultAgentFields("Revenue & Financial Management", "operations", "Payments Operations", "Automated payment processing, reconciliation, and ledger posting. Runs nightly to match payments to charges and flag discrepancies.", { labels: ["Payments"], runsCompleted: 142, lastRunAt: "2026-02-20T03:00:00Z", lastRunStatus: "success", errorCount: 3, avgRunDuration: "4m 12s", schedule: "Daily at 3:00 AM" }) },
  // Leasing & Marketing
  { id: "4", ...defaultAgentFields("Leasing & Marketing", "autonomous", "Leasing AI", "Tours, applications, lease questions", { status: "Active", scope: "Hillside Living, Jamison Apartments", vaultBinding: "SOPs: Leasing, Fair housing", channels: ["Chat", "SMS", "Portal"], toolsAllowed: ["Entrata MCP", "Lease lookup"], guardrails: "Required-docs: screening policy", conversationCount: 89, resolutionRate: "92%", escalationsCount: 7, revenueImpact: "$8.4K", labels: ["Leasing"] }) },
  // L2 · Operational Efficiency — Leasing & Marketing (22)
  { id: "200", ...defaultAgentFields("Leasing & Marketing", "intelligence", "30-Days Inactive Leads Cancel", "Cancels leads after 30 days of inactivity to keep dashboards organized and up to date.", { status: "Active", labels: ["Leasing"] }) },
  { id: "201", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Approve Applications", "Approve rental applications in bulk, moving qualified applicants through the leasing pipeline.", { status: "Active", labels: ["Leasing"] }) },
  { id: "202", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Approve Screening Decisions", "Automatically match screening results to pre-configured decision criteria.", { status: "Active", labels: ["Leasing"] }) },
  { id: "203", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Bulk Add-On Request Approval", "Automatically processes pending add-on approval requests and generates lease addenda in bulk, eliminating the need to approve each request one by one.", { status: "Active", labels: ["Leasing"] }) },
  { id: "204", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Bulk Countersign Leases", "Approve leases in bulk, accelerating the lease execution process.", { status: "Active", labels: ["Leasing"] }) },
  { id: "205", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Bulk Map Settings Sync", "Copies your preferred map view and filter settings from one property to others across your portfolio in a single action.", { status: "Active", labels: ["Leasing"] }) },
  { id: "206", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Bulk PetScreening Activation", "Enables PetScreening across multiple properties at once using a configure-once, apply-to-many approach instead of setting up each property individually.", { status: "Active", labels: ["Leasing"] }) },
  { id: "207", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Bulk PetScreening Follow-Up", "Sends pet screening completion reminders to all pending applicants on the PetScreening Not Progressing dashboard with one click instead of one at a time.", { status: "Active", labels: ["Leasing"] }) },
  { id: "208", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Copy Footer & Global Information", "Copy footer content and global information across your ProspectPortal property websites.", { status: "Active", labels: ["Leasing"] }) },
  { id: "209", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Copy Theme Settings", "Copy theme settings across ProspectPortal property websites for consistent branding.", { status: "Active", labels: ["Leasing"] }) },
  { id: "210", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Copy Widgets to Websites", "Copy widgets from one website to other ProspectPortal property websites to maintain a consistent layout.", { status: "Active", labels: ["Leasing"] }) },
  { id: "211", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Countersign Individual Docs", "Countersign ad-hoc documents in bulk, completing the signing workflow.", { status: "Active", labels: ["Leasing"] }) },
  { id: "212", ...defaultAgentFields("Leasing & Marketing", "intelligence", "ELI Call Analysis Scorecard", "This agent analyzes your scorecards and provides feedback to help make your questions more model and user-friendly. ELI Call Analysis product required for agent use.", { status: "Active", labels: ["Leasing"] }) },
  { id: "213", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Mapping Intelligence Chat Starter", "Opens a pre-filled support chat with Maps.AI for map requests, automatically providing your identity and request details so you can skip the manual setup.", { status: "Active", labels: ["Leasing"] }) },
  { id: "214", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Marketing Price Update", "Set marketing listing prices and descriptions for multiple homes at once.", { status: "Active", labels: ["Leasing"] }) },
  { id: "215", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Populate Journey Settings", "Configure journey call-to-action elements across ProspectPortal property websites.", { status: "Active", labels: ["Leasing"] }) },
  { id: "216", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Send Invitation", "Send rental application invitations to multiple prospects at once.", { status: "Active", labels: ["Leasing"] }) },
  { id: "217", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Start Applications", "Initiate rental applications for multiple prospects in a single action.", { status: "Active", labels: ["Leasing"] }) },
  { id: "218", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Subscribe to Facebook Page", "Agent automates bulk enablement of Facebook Page Syndication. Entrata will keep the property data on your Facebook page up to date after enablement. Facebook account must first be configured in property settings.", { status: "Active", labels: ["Leasing"] }) },
  { id: "219", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Subscribe to Google My Business", "Agent automates bulk enablement of Google Business Profile (GBP) Syndication. Entrata will keep the property data on your GBP up to date after enablement. Google account must first be configured in property settings.", { status: "Active", labels: ["Leasing"] }) },
  { id: "220", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Subscribe to Yext Local Directories", "Agent automates bulk enablement of Yext Local Directory Syndication. Entrata will keep the property data on various directories up to date through Yext after enablement.", { status: "Active", labels: ["Leasing"] }) },
  { id: "221", ...defaultAgentFields("Leasing & Marketing", "intelligence", "Update Insurance Enforcement Settings", "From a property's Insurance Enforcement section, open the custom modal to select multiple properties and one setting/value. The agent GETs each property's insurance page in memory, merges the chosen value into the form data, and POSTs to the update API (no dialog or tab reload).", { status: "Active", labels: ["Leasing"] }) },
  { id: "6", ...defaultAgentFields("Leasing & Marketing", "operations", "Leasing Operations", "Processes applications, runs screening, executes leases, and coordinates move-in tasks automatically.", { labels: ["Leasing"], runsCompleted: 89, lastRunAt: "2026-02-20T08:15:00Z", lastRunStatus: "success", errorCount: 1, avgRunDuration: "2m 45s", schedule: "On new application" }) },
  // Resident Relations & Retention
  { id: "7", ...defaultAgentFields("Resident Relations & Retention", "autonomous", "Renewal AI", "Renewal conversations and retention", { status: "Active", vaultBinding: "SOPs: Renewal, Lease terms", guardrails: "Controlled phrasing (Voice)", conversationCount: 56, resolutionRate: "94%", escalationsCount: 3, revenueImpact: "$5.1K", labels: ["Resident relations"] }) },
  // L2 · Operational Efficiency — Resident Relations & Retention (22)
  { id: "300", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Anchor Tenant Bulk Update", "Update anchor tenant designation across multiple tenants in a single action.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "301", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Annual Revenue Range Bulk Update", "Update the annual revenue range for multiple commercial tenants at once.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "302", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Bulk Move-In", "Process multiple move-ins simultaneously, completing the workflow for each resident.", { status: "Coming Soon", labels: ["Resident relations"] }) },
  { id: "303", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Business License Bulk Update", "Apply business license details to multiple commercial tenants in a single action.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "304", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Contact Type Bulk Update", "Set contact types across multiple commercial tenant records at once.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "305", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Expired Offer Extension", "Extend the expiration date on multiple expired renewal offers at once.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "306", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Generate Certifications", "Apply gross rent changes across multiple affordable units to reflect updated rent schedules.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "307", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Generate Recertification Notices", "Send recertification notices to residents in bulk ahead of affordable housing compliance deadlines.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "308", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Growth Stage Bulk Update", "Update the growth stage classification for multiple commercial tenants at once.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "309", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Is a Franchise Bulk Update", "Update franchise status for multiple commercial tenants in a single action.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "310", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Lease Type Update", "Update lease type for multiple commercial tenants in a single operation.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "311", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Legal Structure Bulk Update", "Update the legal structure for multiple commercial tenants at once.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "312", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Move-In Auto-Process", "Auto-process move-in workflows, completing each step without manual intervention.", { status: "Coming Soon", labels: ["Resident relations"] }) },
  { id: "313", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Move-In Reviews Auto-Process", "Automatically review and process move-in records, validating required items.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "314", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Move-Out Auto-Process", "Auto-process move-out workflows, completing each step without manual intervention.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "315", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Non-Renewal Notice Email", "Send non-renewal notice emails to multiple residents at once.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "316", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Non-Renewal Notice Print", "Generate printable non-renewal notices for multiple residents at once.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "317", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Ownership Structure Update", "Update ownership structure details for multiple commercial tenants in a single action.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "318", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Renewal Offer Creation", "Create renewal offers for multiple expiring leases in a single operation.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "319", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Tenant Health Update", "Update tenant health scores for multiple commercial tenants at once.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "320", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Transfer Move-In", "Auto-process the move-in side of unit transfers.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "321", ...defaultAgentFields("Resident Relations & Retention", "intelligence", "Transfer Move-Out", "Auto-process the move-out side of unit transfers.", { status: "Active", labels: ["Resident relations"] }) },
  { id: "9", ...defaultAgentFields("Resident Relations & Retention", "operations", "Renewal Operations", "Sends renewal offers, generates lease documents, schedules follow-ups, and processes renewal executions.", { labels: ["Resident relations"], runsCompleted: 67, lastRunAt: "2026-02-19T10:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "1m 30s", schedule: "Daily at 10:00 AM" }) },
  // Operations & Maintenance
  { id: "10", ...defaultAgentFields("Operations & Maintenance", "autonomous", "Maintenance AI", "Work orders, follow-up, scheduling", { status: "Off", vaultBinding: "SOPs: Maintenance escalation", channels: ["Chat", "Voice"], toolsAllowed: ["Entrata MCP", "Work orders"], conversationCount: 78, resolutionRate: "89%", escalationsCount: 8, revenueImpact: "$3.2K", labels: ["Maintenance"] }) },
  // L2 · Operational Efficiency — Operations & Maintenance (14)
  { id: "400", ...defaultAgentFields("Operations & Maintenance", "intelligence", "Add Baseline Images to Inspections", "Automatically pulls images from the baseline inspection into the current inspection.", { status: "Active", labels: ["Maintenance"] }) },
  { id: "401", ...defaultAgentFields("Operations & Maintenance", "intelligence", "Add Home Warranty Agent", "Enter warranty details for multiple homes at once with consistent information.", { status: "Active", labels: ["Maintenance"] }) },
  { id: "402", ...defaultAgentFields("Operations & Maintenance", "intelligence", "Bulk Enable Property Maps", "Enable interactive map display settings across multiple properties at once.", { status: "Coming Soon", labels: ["Maintenance"] }) },
  { id: "403", ...defaultAgentFields("Operations & Maintenance", "intelligence", "Bulk Home Rented Agent", "Update the rental status for multiple lots at once to reflect current occupancy.", { status: "Active", labels: ["Maintenance"] }) },
  { id: "404", ...defaultAgentFields("Operations & Maintenance", "intelligence", "Complete Make Readies", "Automatically completes make readies that already have all subtasks complete.", { status: "Active", labels: ["Maintenance"] }) },
  { id: "405", ...defaultAgentFields("Operations & Maintenance", "intelligence", "Installation Complete Update", "Mark home installations as complete across multiple records in a single action.", { status: "Active", labels: ["Maintenance"] }) },
  { id: "406", ...defaultAgentFields("Operations & Maintenance", "intelligence", "Inventory Status Update - Version 3", "Manage student housing inventory, automating bed and room allocation across units.", { status: "Active", labels: ["Maintenance"] }) },
  { id: "407", ...defaultAgentFields("Operations & Maintenance", "intelligence", "Inventory Status Update - Version 4", "Manage student housing inventory, automating bed and room allocation across units.", { status: "Active", labels: ["Maintenance"] }) },
  { id: "408", ...defaultAgentFields("Operations & Maintenance", "intelligence", "Lifecycle Status Update", "Update lifecycle status for multiple manufactured homes to reflect current stage changes.", { status: "Active", labels: ["Maintenance"] }) },
  { id: "409", ...defaultAgentFields("Operations & Maintenance", "intelligence", "Lot Address Sync Agent", "Synchronize lot addresses with property address records for consistency.", { status: "Active", labels: ["Maintenance"] }) },
  { id: "410", ...defaultAgentFields("Operations & Maintenance", "intelligence", "New/Used Update", "The user selects which homes to update (from the Home Management listing) and the target New/Used value. The agent opens each home, enters edit mode, selects the value, saves, and moves to the next.", { status: "Active", labels: ["Maintenance"] }) },
  { id: "411", ...defaultAgentFields("Operations & Maintenance", "intelligence", "Suite Address Sync Agent", "Synchronize suite addresses with property records for consistency across commercial properties.", { status: "Active", labels: ["Maintenance"] }) },
  { id: "412", ...defaultAgentFields("Operations & Maintenance", "intelligence", "Suite Sub-Type Bulk Update", "Updates all selected suites to a chosen sub-type.", { status: "Active", labels: ["Maintenance"] }) },
  { id: "413", ...defaultAgentFields("Operations & Maintenance", "intelligence", "Update Home Condition Agent", "The user selects which homes to update and the target Condition value. The agent opens each home, enters edit mode, selects the value in the Condition dropdown, saves, and moves to the next.", { status: "Active", labels: ["Maintenance"] }) },
  { id: "12", ...defaultAgentFields("Operations & Maintenance", "operations", "Maintenance Operations", "Dispatches work orders to vendors, tracks SLA compliance, sends resident updates, and closes completed orders.", { labels: ["Maintenance"], runsCompleted: 234, lastRunAt: "2026-02-20T07:30:00Z", lastRunStatus: "success", errorCount: 7, avgRunDuration: "3m 05s", schedule: "On new work order" }) },
  // Risk Management & Compliance
  { id: "500", ...defaultAgentFields("Risk Management & Compliance", "operations", "AI Settings", "Currently AI settings allow users to set preferred words. These will allow users to set preferred words to replace words. For example, instead of 'tenant' use 'resident'. This list of words will then be taken into account where ELI is used to generate content i.e. blog, email and review responses.", { status: "Active", labels: ["Compliance"] }) },
  // L3 · Efficiency — Orchestrators
  { id: "31", ...defaultAgentFields("Operations & Maintenance", "efficiency", "Property Operations Orchestrator", "Coordinates maintenance workflows, vendor assignments, and unit turn scheduling across properties.", { labels: ["Maintenance"], runsCompleted: 112, lastRunAt: "2026-02-20T07:00:00Z", lastRunStatus: "success", errorCount: 3, avgRunDuration: "5m 15s", schedule: "Daily at 7:00 AM" }) },
  // Placeholder agents (so "View all" is visible and list looks populated)
  { id: "17", ...defaultAgentFields("Revenue & Financial Management", "operations", "Fees & Refunds Ops", "Processes fee waivers, refund requests, and ledger adjustments based on approval rules.", { labels: ["Payments"], runsCompleted: 56, lastRunAt: "2026-02-19T14:00:00Z", lastRunStatus: "success", errorCount: 1, avgRunDuration: "1m 15s", schedule: "On fee waiver request" }) },
  { id: "19", ...defaultAgentFields("Leasing & Marketing", "operations", "Move-in Coordinator", "Schedules move-ins, generates welcome packets, assigns parking, and triggers utility setup reminders.", { labels: ["Leasing"], runsCompleted: 34, lastRunAt: "2026-02-20T09:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "2m 00s", schedule: "On lease execution" }) },
  { id: "21", ...defaultAgentFields("Resident Relations & Retention", "operations", "Move-out Coordinator", "Processes move-out notices, schedules inspections, calculates deposit returns, and initiates unit turnover.", { labels: ["Resident relations"], runsCompleted: 28, lastRunAt: "2026-02-19T16:00:00Z", lastRunStatus: "success", errorCount: 2, avgRunDuration: "3m 30s", schedule: "On move-out notice" }) },
  { id: "23", ...defaultAgentFields("Operations & Maintenance", "operations", "After-hours Dispatch", "Routes after-hours emergency work orders to on-call vendors and sends resident status updates.", { labels: ["Maintenance"], runsCompleted: 19, lastRunAt: "2026-02-19T23:45:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "45s", schedule: "On emergency work order (after 6 PM)" }) },
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
