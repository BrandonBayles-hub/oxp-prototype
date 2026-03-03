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
  { value: "l4", label: "L4 — ELI+", level: 4 },
  { value: "l3", label: "L3 — Intelligence", level: 3 },
  { value: "l2", label: "L2 — Operational", level: 2 },
  { value: "l1", label: "L1 — ELI Essentials", level: 1 },
] as const;

export type AgentType = (typeof AGENT_TYPES)[number]["value"];

export const TYPE_LEVEL: Record<AgentType, number> = {
  l4: 4,
  l3: 3,
  l2: 2,
  l1: 1,
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
  ...(type === "l3" || type === "l4" ? {
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
  ...overrides,
});

const INITIAL_AGENTS: Agent[] = [
  // Revenue & Financial Management
  { id: "1", ...defaultAgentFields("Revenue & Financial Management", "l4", "Payments AI", "Rent, fees, payment questions", { status: "Active", vaultBinding: "SOPs: Payments, Refund policy", toolsAllowed: ["Entrata MCP", "Work orders"], guardrails: "Approval gate for refunds >$500", conversationCount: 42, resolutionRate: "88%", escalationsCount: 5, revenueImpact: "$1.2K", labels: ["Payments"] }) },
  { id: "2", ...defaultAgentFields("Revenue & Financial Management", "l2", "Payments Intelligence", "Analyzes rent collection patterns, late payment trends, and fee optimization opportunities across your portfolio.", { labels: ["Payments"], prompt: "Analyze rent collection data across all properties. Identify delinquency trends, late fee patterns, and revenue leakage. Flag accounts showing signs of payment difficulty early so we can intervene before they become delinquent.", goal: "Reduce delinquency rate by 15% and identify $50K+ in recoverable revenue per quarter.", dataSources: ["Entrata Ledger", "Payment History", "Resident Accounts"], analysisFrequency: "Weekly", insightsGenerated: 47, recommendationsActedOn: 18, lastInsightAt: "2026-02-18T14:30:00Z", recentInsights: [{ title: "Late payment spike at Property B", summary: "Property B has seen a 23% increase in late payments over the past 30 days, primarily in units 200-300. Consider targeted outreach or flexible payment plan offers.", at: "2026-02-18T14:30:00Z" }, { title: "Fee waiver ROI positive", summary: "Waiving late fees for first-time offenders resulted in 89% on-time payment the following month. Recommend expanding this policy.", at: "2026-02-15T09:00:00Z" }, { title: "Auto-pay adoption opportunity", summary: "34% of residents who pay on time are not on auto-pay. Targeted enrollment campaign could reduce processing costs by $2.1K/month.", at: "2026-02-10T11:15:00Z" }] }) },
  { id: "3", ...defaultAgentFields("Revenue & Financial Management", "l1", "Payments Operations", "Automated payment processing, reconciliation, and ledger posting. Runs nightly to match payments to charges and flag discrepancies.", { labels: ["Payments"], runsCompleted: 142, lastRunAt: "2026-02-20T03:00:00Z", lastRunStatus: "success", errorCount: 3, avgRunDuration: "4m 12s", schedule: "Daily at 3:00 AM" }) },
  // Leasing & Marketing
  { id: "4", ...defaultAgentFields("Leasing & Marketing", "l4", "Leasing AI", "Tours, applications, lease questions", { status: "Off", scope: "Property A, B", vaultBinding: "SOPs: Leasing, Fair housing", channels: ["Chat", "SMS", "Portal"], toolsAllowed: ["Entrata MCP", "Lease lookup"], guardrails: "Required-docs: screening policy", conversationCount: 89, resolutionRate: "92%", escalationsCount: 7, revenueImpact: "$8.4K", labels: ["Leasing"] }) },
  { id: "5", ...defaultAgentFields("Leasing & Marketing", "l2", "Leasing Intelligence", "Scores incoming leads, analyzes marketing channel performance, and identifies pipeline bottlenecks to optimize conversion.", { labels: ["Leasing"], prompt: "Evaluate all active leads across properties. Score by engagement, qualification, and likelihood to convert. Identify which marketing channels drive the highest quality leads and where prospects drop off in the funnel.", goal: "Improve lead-to-lease conversion rate by 20% and reduce cost-per-lease by identifying underperforming channels.", dataSources: ["Entrata CRM", "Lead Activity", "Marketing Spend"], analysisFrequency: "Daily", insightsGenerated: 83, recommendationsActedOn: 31, lastInsightAt: "2026-02-19T16:00:00Z", recentInsights: [{ title: "ILS leads underperforming", summary: "Leads from Apartments.com have a 6% conversion rate vs 18% from Google Ads. Cost-per-lease is 3.2x higher. Consider reallocating $1,500/mo budget.", at: "2026-02-19T16:00:00Z" }, { title: "Tour no-show pattern", summary: "42% of tour no-shows occur on Mondays. Recommend adding SMS confirmation 2 hours before and offering virtual tour as fallback.", at: "2026-02-17T10:30:00Z" }] }) },
  { id: "6", ...defaultAgentFields("Leasing & Marketing", "l1", "Leasing Operations", "Processes applications, runs screening, executes leases, and coordinates move-in tasks automatically.", { labels: ["Leasing"], runsCompleted: 89, lastRunAt: "2026-02-20T08:15:00Z", lastRunStatus: "success", errorCount: 1, avgRunDuration: "2m 45s", schedule: "On new application" }) },
  // Resident Relations & Retention
  { id: "7", ...defaultAgentFields("Resident Relations & Retention", "l4", "Renewal AI", "Renewal conversations and retention", { vaultBinding: "SOPs: Renewal, Lease terms", guardrails: "Controlled phrasing (Voice)", conversationCount: 56, resolutionRate: "94%", escalationsCount: 3, revenueImpact: "$5.1K", labels: ["Resident relations"] }) },
  { id: "8", ...defaultAgentFields("Resident Relations & Retention", "l2", "Renewal Intelligence", "Predicts churn risk, analyzes resident satisfaction drivers, and identifies retention opportunities before lease expiration.", { labels: ["Resident relations"], prompt: "Identify residents at risk of non-renewal by analyzing payment patterns, maintenance request frequency, satisfaction survey data, and lease expiration dates. Prioritize outreach recommendations by churn probability and unit value.", goal: "Achieve 85% renewal rate and identify at-risk residents 90+ days before lease expiration.", dataSources: ["Entrata Leases", "Maintenance Requests", "Survey Results"], analysisFrequency: "Weekly", insightsGenerated: 36, recommendationsActedOn: 14, lastInsightAt: "2026-02-17T08:00:00Z", recentInsights: [{ title: "12 residents at high churn risk", summary: "12 residents with leases expiring in 60 days have submitted 3+ maintenance requests and no renewal intent. Personal outreach recommended.", at: "2026-02-17T08:00:00Z" }, { title: "Amenity usage correlates with renewals", summary: "Residents who use the fitness center 2+ times/week renew at 94% vs 71% for non-users. Consider promoting amenity access in retention offers.", at: "2026-02-12T14:00:00Z" }] }) },
  { id: "9", ...defaultAgentFields("Resident Relations & Retention", "l1", "Renewal Operations", "Sends renewal offers, generates lease documents, schedules follow-ups, and processes renewal executions.", { labels: ["Resident relations"], runsCompleted: 67, lastRunAt: "2026-02-19T10:00:00Z", lastRunStatus: "success", errorCount: 0, avgRunDuration: "1m 30s", schedule: "Daily at 10:00 AM" }) },
  // Operations & Maintenance
  { id: "10", ...defaultAgentFields("Operations & Maintenance", "l4", "Maintenance AI", "Work orders, follow-up, scheduling", { vaultBinding: "SOPs: Maintenance escalation", channels: ["Chat", "Voice"], toolsAllowed: ["Entrata MCP", "Work orders"], conversationCount: 78, resolutionRate: "89%", escalationsCount: 8, revenueImpact: "$3.2K", labels: ["Maintenance"] }) },
  { id: "11", ...defaultAgentFields("Operations & Maintenance", "l2", "Maintenance Intelligence", "Identifies preventive maintenance opportunities, analyzes vendor performance, and predicts equipment failures before they happen.", { labels: ["Maintenance"], prompt: "Review all maintenance data including work order history, equipment age, vendor response times, and cost per repair. Identify recurring issues that indicate equipment replacement would be cheaper than continued repairs. Score vendors by responsiveness, cost, and resident satisfaction.", goal: "Reduce emergency work orders by 30% through preventive maintenance and save 15% on vendor costs through performance-based selection.", dataSources: ["Work Orders", "Vendor Invoices", "Equipment Registry"], analysisFrequency: "Weekly", insightsGenerated: 29, recommendationsActedOn: 11, lastInsightAt: "2026-02-16T13:00:00Z", recentInsights: [{ title: "HVAC failure pattern detected", summary: "Units 101-110 at Property A have the same HVAC model (installed 2018). Three failures in the past month suggest batch replacement would save $8K vs continued spot repairs.", at: "2026-02-16T13:00:00Z" }, { title: "Vendor response time degrading", summary: "ABC Plumbing average response time has increased from 4h to 11h over 90 days. SLA breach rate is now 35%. Consider backup vendor.", at: "2026-02-11T09:30:00Z" }] }) },
  { id: "12", ...defaultAgentFields("Operations & Maintenance", "l1", "Maintenance Operations", "Dispatches work orders to vendors, tracks SLA compliance, sends resident updates, and closes completed orders.", { labels: ["Maintenance"], runsCompleted: 234, lastRunAt: "2026-02-20T07:30:00Z", lastRunStatus: "success", errorCount: 7, avgRunDuration: "3m 05s", schedule: "On new work order" }) },
  // Risk Management & Compliance
  { id: "13", ...defaultAgentFields("Risk Management & Compliance", "l3", "Compliance Monitoring Agent", "Policy answers and fair housing guidance", { vaultBinding: "SOPs: Fair housing, Screening", guardrails: "Required-docs: screening policy", conversationCount: 33, resolutionRate: "91%", escalationsCount: 6, revenueImpact: "$1.8K", labels: ["Compliance", "Policy"] }) },
  { id: "14", ...defaultAgentFields("Risk Management & Compliance", "l2", "Compliance Intelligence", "Monitors compliance posture across properties, identifies policy gaps, and flags audit risks before they become violations.", { labels: ["Compliance"], prompt: "Audit all property operations for fair housing compliance, screening consistency, and documentation completeness. Identify patterns where policies are applied inconsistently across properties or staff. Flag any interactions or decisions that could create legal exposure.", goal: "Maintain 100% fair housing compliance and identify policy inconsistencies within 24 hours of occurrence.", dataSources: ["Screening Results", "Lease Applications", "Communication Logs", "SOP Vault"], analysisFrequency: "Daily", insightsGenerated: 52, recommendationsActedOn: 22, lastInsightAt: "2026-02-19T07:00:00Z", recentInsights: [{ title: "Screening criteria inconsistency", summary: "Property C applied different income requirements to 3 applicants last week. This creates fair housing risk. Recommend retraining staff on standardized criteria.", at: "2026-02-19T07:00:00Z" }, { title: "SOP gap: emotional support animals", summary: "No SOP currently covers the reasonable accommodation process for emotional support animals. This is a high-risk gap given 4 requests in the past month.", at: "2026-02-14T11:00:00Z" }] }) },
  { id: "15", ...defaultAgentFields("Risk Management & Compliance", "l1", "Compliance Operations", "Runs applicant screening, verifies documentation completeness, and archives records for audit readiness.", { labels: ["Compliance", "Policy"], runsCompleted: 112, lastRunAt: "2026-02-20T06:00:00Z", lastRunStatus: "success", errorCount: 2, avgRunDuration: "5m 20s", schedule: "On new application" }) },
  // Additional agents
  { id: "16", ...defaultAgentFields("Revenue & Financial Management", "l2", "Revenue Analytics", "Tracks revenue trends, occupancy-to-revenue ratios, and identifies pricing optimization opportunities.", { status: "Off", labels: ["Payments"], prompt: "Analyze monthly revenue data across all properties and identify trends, anomalies, and pricing optimization opportunities.", goal: "Identify $25K+ in annual revenue upside through pricing and fee optimization.", dataSources: ["Entrata Ledger", "Market Comps"], analysisFrequency: "Monthly", insightsGenerated: 11, recommendationsActedOn: 4, lastInsightAt: "2026-01-15T10:00:00Z", recentInsights: [{ title: "Rent increase opportunity at Property A", summary: "Market comps show Property A is $85/mo below avg for comparable units. A 3-5% increase at renewal would generate $18K/yr additional revenue with minimal churn risk.", at: "2026-01-15T10:00:00Z" }, { title: "Amenity fee underpriced", summary: "Pet fees are $25/mo vs market avg of $45/mo. 62 units have pets — adjusting to $40/mo adds $11K/yr.", at: "2026-01-02T09:00:00Z" }] }) },
  { id: "18", ...defaultAgentFields("Leasing & Marketing", "l2", "Marketing Analytics", "Evaluates marketing campaign performance, ad spend ROI, and ILS listing effectiveness.", { labels: ["Leasing"], prompt: "Compare marketing spend to lead volume and conversion across channels. Identify which listings and campaigns drive the best ROI.", goal: "Reduce cost-per-lead by 25% while maintaining lead volume.", dataSources: ["Marketing Spend", "Lead Sources", "ILS Performance"], analysisFrequency: "Weekly", insightsGenerated: 12, recommendationsActedOn: 5, lastInsightAt: "2026-02-18T09:00:00Z", recentInsights: [{ title: "Social media outperforming ILS", summary: "Instagram tours generate leads at $8/lead vs $34/lead on ILS platforms. Recommend shifting 30% of ILS budget to social.", at: "2026-02-18T09:00:00Z" }] }) },
  { id: "20", ...defaultAgentFields("Resident Relations & Retention", "l2", "Satisfaction Insights", "Analyzes NPS scores, survey responses, and review sentiment to surface resident satisfaction drivers.", { labels: ["Resident relations"], prompt: "Aggregate resident survey data, online reviews, and NPS scores. Identify common themes in positive and negative feedback and correlate with property-level actions.", goal: "Improve average NPS from 42 to 55 within 6 months by acting on top detractor themes.", dataSources: ["Survey Results", "Online Reviews", "NPS Data"], analysisFrequency: "Monthly", insightsGenerated: 8, recommendationsActedOn: 3, lastInsightAt: "2026-02-01T10:00:00Z", recentInsights: [{ title: "Noise complaints driving low NPS", summary: "Noise is the #1 detractor theme at Property A (mentioned in 38% of negative reviews). Quiet hours enforcement and soundproofing upgrades recommended.", at: "2026-02-01T10:00:00Z" }] }) },
  { id: "22", ...defaultAgentFields("Operations & Maintenance", "l2", "Vendor Performance", "Scores vendors on response time, cost, quality, and resident satisfaction to inform procurement decisions.", { labels: ["Maintenance"], prompt: "Rank all active vendors by response time, cost per work order, callback rate, and resident satisfaction. Identify vendors consistently missing SLAs and recommend alternatives.", goal: "Ensure all vendors maintain <4hr response time SLA and <5% callback rate.", dataSources: ["Work Orders", "Vendor Invoices", "Resident Feedback"], analysisFrequency: "Monthly", insightsGenerated: 15, recommendationsActedOn: 6, lastInsightAt: "2026-02-13T08:00:00Z", recentInsights: [{ title: "Top performer: XYZ Electric", summary: "XYZ Electric has 2.1hr avg response, 0% callback rate, and 4.8/5 resident rating. Consider expanding their scope to all properties.", at: "2026-02-13T08:00:00Z" }] }) },
  { id: "24", ...defaultAgentFields("Risk Management & Compliance", "l2", "Audit Dashboard", "Tracks compliance metrics, audit readiness scores, and identifies documentation gaps across properties.", { labels: ["Compliance"], prompt: "Score each property on audit readiness: document completeness, screening consistency, fair housing training currency, and incident response documentation. Flag properties below 80% readiness.", goal: "Maintain 95%+ audit readiness score across all properties.", dataSources: ["SOP Vault", "Training Records", "Screening Logs"], analysisFrequency: "Weekly", insightsGenerated: 21, recommendationsActedOn: 9, lastInsightAt: "2026-02-17T07:00:00Z", recentInsights: [{ title: "Property D audit readiness: 72%", summary: "Property D is missing updated fair housing training certificates for 3 staff members and has no documented pet policy. Address before Q2 audit.", at: "2026-02-17T07:00:00Z" }] }) },
  // L3 agents — cross-functional orchestration
  { id: "26", ...defaultAgentFields("Revenue & Financial Management", "l3", "Revenue Orchestrator", "Coordinates pricing, renewals, and leasing agents to maximize portfolio revenue. Adjusts rent pricing recommendations based on real-time occupancy, market comps, and renewal pipeline data across all properties.", { labels: ["Payments", "Leasing", "Resident relations"], prompt: "Monitor real-time occupancy, lease expiration pipeline, and market comp data across all properties. Coordinate with Leasing AI, Renewal AI, and Payments Intelligence to optimize rent pricing, concession offers, and renewal terms. Balance occupancy targets with revenue growth goals.", goal: "Maximize portfolio NOI by dynamically adjusting pricing strategy across leasing, renewals, and collections.", dataSources: ["Entrata Ledger", "Market Comps", "Lease Pipeline", "Renewal Data"], analysisFrequency: "Daily", insightsGenerated: 62, recommendationsActedOn: 28, lastInsightAt: "2026-02-20T08:00:00Z", recentInsights: [{ title: "Concession strategy adjustment", summary: "Property A occupancy is 94% — recommend pulling back the 1-month-free concession on new leases. Property C at 88% should increase concession to $500 off first month to fill 6 vacant units.", at: "2026-02-20T08:00:00Z" }, { title: "Renewal pricing vs new lease gap", summary: "Renewal rates at Property B are $120/mo below new lease rates. Closing this gap by 50% on upcoming renewals would add $43K/yr with minimal churn risk based on market position.", at: "2026-02-18T10:00:00Z" }] }) },
  { id: "27", ...defaultAgentFields("Operations & Maintenance", "l3", "Property Operations Orchestrator", "Coordinates maintenance, compliance, and resident relations agents to manage property operations holistically. Balances work order priority with resident satisfaction, vendor capacity, and budget constraints.", { labels: ["Maintenance", "Compliance", "Resident relations"], prompt: "Oversee all operational workflows across properties. Coordinate Maintenance AI work order routing with vendor capacity and budget. Align compliance checks with operational actions. Escalate cross-functional issues that require human judgment.", goal: "Maintain 95%+ resident satisfaction while keeping operational costs within budget and ensuring full compliance.", dataSources: ["Work Orders", "Vendor Schedules", "Budget Data", "Compliance Logs", "Resident Feedback"], analysisFrequency: "Daily", insightsGenerated: 41, recommendationsActedOn: 19, lastInsightAt: "2026-02-19T14:00:00Z", recentInsights: [{ title: "Unit turn bottleneck at Property A", summary: "5 units are past target turn date due to vendor backlog. Maintenance AI is dispatching but plumbing vendor is at capacity. Recommend activating backup vendor for 3 units to avoid $8K in vacancy loss.", at: "2026-02-19T14:00:00Z" }, { title: "Resident satisfaction dip correlated with delayed WOs", summary: "Properties with avg work order completion >48hrs see 12-point NPS drop. Properties B and D are trending above this threshold. Prioritize their open WO queue.", at: "2026-02-16T09:00:00Z" }] }) },
  // L2 Entrata automation agents
  { id: "28", ...defaultAgentFields("Resident Relations & Retention", "l2", "Renewal Offer Generation", "Automatically generates and sends renewal offers based on lease expiration dates, market comps, and retention strategy.", { status: "Active", labels: ["Resident relations"], prompt: "Monitor upcoming lease expirations and generate personalized renewal offers based on unit market value, resident history, and retention goals.", goal: "Ensure 100% of expiring leases receive a timely renewal offer at least 90 days before expiration.", dataSources: ["Entrata Leases", "Market Comps", "Resident Accounts"], analysisFrequency: "Daily", insightsGenerated: 34, recommendationsActedOn: 22, lastInsightAt: "2026-02-20T09:00:00Z", recentInsights: [{ title: "18 renewal offers sent this week", summary: "Generated and sent 18 renewal offers across 3 properties. Average proposed increase of 3.2% aligned with market comps.", at: "2026-02-20T09:00:00Z" }] }) },
  { id: "29", ...defaultAgentFields("Leasing & Marketing", "l2", "Auto Move-In", "Automates the move-in process including welcome communications, key assignments, utility setup reminders, and first-day checklists.", { status: "Active", labels: ["Leasing"], prompt: "Coordinate all move-in tasks for new residents: generate welcome packets, assign keys and parking, trigger utility setup reminders, and confirm move-in date.", goal: "Ensure 100% of move-ins are fully prepared with zero missed steps.", dataSources: ["Entrata Leases", "Resident Accounts"], analysisFrequency: "Daily", insightsGenerated: 19, recommendationsActedOn: 15, lastInsightAt: "2026-02-19T11:00:00Z", recentInsights: [{ title: "6 move-ins scheduled this week", summary: "All 6 upcoming move-ins have welcome packets, parking assignments, and utility reminders completed. No action needed.", at: "2026-02-19T11:00:00Z" }] }) },
  { id: "30", ...defaultAgentFields("Leasing & Marketing", "l2", "Move-In Reviews", "Reviews completed move-ins for quality assurance, verifying all documentation, deposits, and unit readiness steps were completed.", { status: "Active", labels: ["Leasing"], prompt: "Audit each completed move-in for documentation completeness, deposit collection, unit inspection sign-off, and welcome communication delivery. Flag any gaps.", goal: "Achieve 100% move-in documentation compliance and identify process gaps within 24 hours.", dataSources: ["Entrata Leases", "Resident Accounts", "Work Orders"], analysisFrequency: "Daily", insightsGenerated: 12, recommendationsActedOn: 8, lastInsightAt: "2026-02-18T15:00:00Z", recentInsights: [{ title: "1 move-in missing inspection sign-off", summary: "Unit 207 at Property B moved in without a documented unit inspection. Flag for follow-up with on-site team.", at: "2026-02-18T15:00:00Z" }] }) },
  { id: "31", ...defaultAgentFields("Resident Relations & Retention", "l2", "Auto Move-Out", "Automates the move-out process including notice processing, final inspections, deposit calculations, and unit turnover initiation.", { status: "Off", labels: ["Resident relations"], prompt: "Process move-out notices, schedule final inspections, calculate security deposit returns, and initiate unit turnover workflows.", goal: "Reduce move-out processing time by 50% and ensure deposit returns meet regulatory deadlines.", dataSources: ["Entrata Leases", "Resident Accounts", "Work Orders"], analysisFrequency: "Daily" }) },
  { id: "32", ...defaultAgentFields("Revenue & Financial Management", "l2", "Finalize Bill Pay Payments", "Processes and finalizes bill pay transactions, reconciles payments against ledger entries, and flags discrepancies.", { status: "Off", labels: ["Payments"], prompt: "Review and finalize pending bill pay payments. Match incoming payments to resident ledger charges and flag any discrepancies for manual review.", goal: "Achieve same-day payment posting with <1% discrepancy rate.", dataSources: ["Entrata Ledger", "Payment History"], analysisFrequency: "Daily" }) },
  { id: "33", ...defaultAgentFields("Resident Relations & Retention", "l2", "Bulk Place on Notice", "Processes bulk notice placements for lease violations, non-renewals, or compliance actions across multiple units.", { status: "Off", labels: ["Resident relations", "Compliance"], prompt: "Generate and deliver bulk notices for lease violations, non-renewal decisions, or required compliance communications. Ensure proper documentation and delivery tracking.", goal: "Process all required notices within regulatory timelines with 100% delivery confirmation.", dataSources: ["Entrata Leases", "Resident Accounts", "Communication Logs"], analysisFrequency: "Weekly" }) },
  { id: "34", ...defaultAgentFields("Revenue & Financial Management", "l2", "Gross Rent Change Agent", "Manages bulk rent adjustments across units based on market analysis, renewal terms, and portfolio pricing strategy.", { status: "Off", labels: ["Payments"], prompt: "Execute gross rent changes across specified units based on approved pricing strategies. Validate changes against market comps and flag outliers for review.", goal: "Ensure all rent changes are applied accurately and within approved variance thresholds.", dataSources: ["Entrata Ledger", "Market Comps", "Lease Data"], analysisFrequency: "Monthly" }) },
  { id: "35", ...defaultAgentFields("Leasing & Marketing", "l2", "Bulk Lead Reassignment", "Reassigns leads in bulk based on agent availability, property assignments, and workload balancing rules.", { status: "Off", labels: ["Leasing"], prompt: "Redistribute leads across leasing agents based on current workload, availability, and property specialization. Ensure no leads go unassigned for more than 2 hours.", goal: "Maintain equitable lead distribution with <2hr assignment SLA.", dataSources: ["Entrata CRM", "Lead Activity"], analysisFrequency: "Daily" }) },
  { id: "36", ...defaultAgentFields("Leasing & Marketing", "l2", "Lead Source Assignment", "Automatically assigns incoming leads to the appropriate leasing agent based on lead source, property, and routing rules.", { status: "Off", labels: ["Leasing"], prompt: "Route incoming leads to the correct leasing agent based on lead source channel, target property, and configured assignment rules. Track assignment speed and coverage.", goal: "Achieve <15min lead assignment time with 100% routing accuracy.", dataSources: ["Entrata CRM", "Lead Sources"], analysisFrequency: "Daily" }) },
  { id: "37", ...defaultAgentFields("Leasing & Marketing", "l2", "Application Approval Agent", "Reviews rental applications against screening criteria, verifies documentation, and routes for approval or denial.", { status: "Off", labels: ["Leasing", "Compliance"], prompt: "Review submitted applications against configured screening criteria including income, credit, rental history, and background checks. Route qualified applications for approval and flag incomplete or disqualifying applications.", goal: "Reduce application processing time to <24hrs while maintaining 100% screening criteria compliance.", dataSources: ["Entrata CRM", "Screening Results", "Lease Applications"], analysisFrequency: "Daily" }) },
  { id: "38", ...defaultAgentFields("Leasing & Marketing", "l2", "Generate Quote from Entrata", "Generates rental quotes from Entrata based on unit availability, pricing rules, concessions, and prospect preferences.", { status: "Off", labels: ["Leasing"], prompt: "Pull real-time unit availability and pricing from Entrata. Generate personalized rental quotes based on prospect preferences, move-in date, lease term, and applicable concessions.", goal: "Deliver accurate rental quotes within minutes of prospect inquiry.", dataSources: ["Entrata CRM", "Lease Data", "Market Comps"], analysisFrequency: "Daily" }) },
  { id: "39", ...defaultAgentFields("Leasing & Marketing", "l2", "Lease Approval & Countersign", "Manages the lease approval workflow and automates countersigning once all conditions are met.", { status: "Off", labels: ["Leasing", "Compliance"], prompt: "Monitor pending leases for approval readiness. Verify all required documents, screening results, and deposit payments are complete. Route for countersign when all conditions are satisfied.", goal: "Reduce lease execution time from approval to countersign to <4hrs.", dataSources: ["Entrata CRM", "Lease Data", "Screening Results"], analysisFrequency: "Daily" }) },
  { id: "40", ...defaultAgentFields("Revenue & Financial Management", "l2", "Move to Unclaimed Property", "Identifies resident deposits and credits that have exceeded the statutory holding period and moves them to unclaimed property status for state reporting.", { status: "Off", labels: ["Payments", "Compliance"], prompt: "Scan all resident accounts for deposits, prepayments, and credit balances that have exceeded the applicable state dormancy period. Flag accounts for unclaimed property processing and generate the required state-specific reporting files.", goal: "Achieve 100% compliance with state unclaimed property deadlines and eliminate manual account review.", dataSources: ["Entrata Ledger", "Resident Accounts", "Deposit Records"], analysisFrequency: "Monthly" }) },
  { id: "41", ...defaultAgentFields("Revenue & Financial Management", "l2", "Reverse Void Payment", "Processes payment reversals and voids, reconciles affected ledger entries, and notifies residents of updated account balances.", { status: "Off", labels: ["Payments"], prompt: "Review flagged payments marked for reversal or void. Validate the reversal reason, update ledger entries, recalculate account balances, and generate resident notifications for affected accounts.", goal: "Process all payment reversals within 24 hours with zero ledger discrepancies.", dataSources: ["Entrata Ledger", "Payment History", "Resident Accounts"], analysisFrequency: "Daily" }) },
  { id: "42", ...defaultAgentFields("Risk Management & Compliance", "l2", "LIHTC XML Reporting", "Generates Low-Income Housing Tax Credit compliance reports in the required XML format for state and federal submission.", { status: "Off", labels: ["Compliance"], prompt: "Compile resident income certifications, unit rent data, and utility allowances into LIHTC-compliant XML reports. Validate all data against HUD requirements and flag missing or inconsistent records before submission.", goal: "Generate audit-ready LIHTC XML reports with zero data validation errors.", dataSources: ["Resident Accounts", "Income Certifications", "Lease Data", "Utility Allowances"], analysisFrequency: "Monthly" }) },
  { id: "43", ...defaultAgentFields("Leasing & Marketing", "l2", "Tiered Screening", "Applies tiered screening criteria to applicants based on property-specific rules, income bands, and risk profiles.", { status: "Off", labels: ["Leasing", "Compliance"], prompt: "Evaluate applicants against tiered screening matrices that vary by property, unit type, and applicant risk profile. Apply the correct screening tier based on income-to-rent ratio, credit band, and rental history. Route edge cases for manual review.", goal: "Ensure 100% consistent screening criteria application with <4hr turnaround on screening decisions.", dataSources: ["Entrata CRM", "Screening Results", "Lease Applications"], analysisFrequency: "Daily" }) },
  { id: "44", ...defaultAgentFields("Leasing & Marketing", "l2", "Map Display Activator", "Manages property listing visibility on map-based ILS platforms by activating, deactivating, and optimizing map pin placements.", { status: "Off", labels: ["Leasing"], prompt: "Monitor ILS map display status for all properties. Activate map pins for properties with available units and deactivate for fully occupied properties. Optimize listing placement based on search ranking data and competitive positioning.", goal: "Maximize map visibility for properties with vacancy while eliminating spend on fully occupied properties.", dataSources: ["Entrata CRM", "ILS Performance", "Lead Sources"], analysisFrequency: "Daily" }) },
  { id: "45", ...defaultAgentFields("Operations & Maintenance", "l2", "Home Warranty Batch Entry", "Processes home warranty claims in batch, matches warranty coverage to work orders, and submits claims to warranty providers.", { status: "Off", labels: ["Maintenance"], prompt: "Review open and completed work orders against active home warranty policies. Batch eligible repairs into warranty claims, attach required documentation, and submit to the appropriate warranty provider for reimbursement.", goal: "Capture 100% of warranty-eligible repairs and reduce reimbursement turnaround to <14 days.", dataSources: ["Work Orders", "Warranty Policies", "Vendor Invoices"], analysisFrequency: "Weekly" }) },
  { id: "46", ...defaultAgentFields("Resident Relations & Retention", "l2", "Tenant Health Bulk Update", "Performs bulk updates to tenant health scores based on payment history, maintenance requests, lease compliance, and engagement signals.", { status: "Off", labels: ["Resident relations"], prompt: "Recalculate tenant health scores across all active leases using payment timeliness, maintenance request frequency, lease violation history, and communication responsiveness. Flag residents whose scores have changed significantly for proactive outreach.", goal: "Maintain real-time tenant health scores with weekly refresh and flag at-risk residents within 24 hours of score decline.", dataSources: ["Resident Accounts", "Payment History", "Maintenance Requests", "Communication Logs"], analysisFrequency: "Weekly" }) },
  { id: "47", ...defaultAgentFields("Operations & Maintenance", "l2", "Job Budget Approval", "Reviews and approves maintenance job budgets based on property budgets, vendor quotes, and historical cost benchmarks.", { status: "Off", labels: ["Maintenance"], prompt: "Evaluate submitted job budgets against property operating budgets, historical cost data for similar work, and current vendor quotes. Auto-approve jobs within threshold and escalate over-budget requests with cost comparison analysis.", goal: "Reduce budget approval turnaround to <4 hours while keeping maintenance spend within 5% of budget.", dataSources: ["Work Orders", "Vendor Invoices", "Budget Data"], analysisFrequency: "Daily" }) },
  { id: "48", ...defaultAgentFields("Revenue & Financial Management", "l2", "Reforecasting Agent", "Reforecasts revenue and expense projections based on actuals-to-date, lease pipeline changes, and market condition shifts.", { status: "Off", labels: ["Payments"], prompt: "Compare year-to-date actuals against original budget projections. Incorporate lease pipeline changes, occupancy trends, and market condition updates to generate revised revenue and expense forecasts for the remainder of the fiscal year.", goal: "Deliver monthly reforecasts within 3 business days of month-end close with <2% variance from actuals.", dataSources: ["Entrata Ledger", "Lease Pipeline", "Market Comps", "Budget Data"], analysisFrequency: "Monthly" }) },
];

const L2_OPS_DATA: Record<string, Pick<Agent, "runsCompleted" | "errorCount" | "avgRunDuration" | "lastRunAt" | "lastRunStatus" | "schedule">> = {
  "2":  { runsCompleted: 47,  errorCount: 2, avgRunDuration: "3m 45s",  lastRunAt: "2026-02-18T14:30:00Z", lastRunStatus: "success", schedule: "Weekly on Tuesdays" },
  "5":  { runsCompleted: 83,  errorCount: 4, avgRunDuration: "5m 20s",  lastRunAt: "2026-02-19T16:00:00Z", lastRunStatus: "success", schedule: "Daily at 4:00 PM" },
  "8":  { runsCompleted: 36,  errorCount: 1, avgRunDuration: "4m 10s",  lastRunAt: "2026-02-17T08:00:00Z", lastRunStatus: "success", schedule: "Weekly on Mondays" },
  "11": { runsCompleted: 29,  errorCount: 2, avgRunDuration: "6m 15s",  lastRunAt: "2026-02-16T13:00:00Z", lastRunStatus: "success", schedule: "Weekly on Sundays" },
  "14": { runsCompleted: 52,  errorCount: 3, avgRunDuration: "7m 30s",  lastRunAt: "2026-02-19T07:00:00Z", lastRunStatus: "success", schedule: "Daily at 7:00 AM" },
  "16": { runsCompleted: 11,  errorCount: 0, avgRunDuration: "8m 45s",  lastRunAt: "2026-01-15T10:00:00Z", lastRunStatus: "success", schedule: "Monthly on the 15th" },
  "18": { runsCompleted: 12,  errorCount: 1, avgRunDuration: "4m 55s",  lastRunAt: "2026-02-18T09:00:00Z", lastRunStatus: "success", schedule: "Weekly on Tuesdays" },
  "20": { runsCompleted: 8,   errorCount: 0, avgRunDuration: "5m 30s",  lastRunAt: "2026-02-01T10:00:00Z", lastRunStatus: "success", schedule: "Monthly on the 1st" },
  "22": { runsCompleted: 15,  errorCount: 1, avgRunDuration: "6m 00s",  lastRunAt: "2026-02-13T08:00:00Z", lastRunStatus: "success", schedule: "Monthly on the 13th" },
  "24": { runsCompleted: 21,  errorCount: 0, avgRunDuration: "5m 10s",  lastRunAt: "2026-02-17T07:00:00Z", lastRunStatus: "success", schedule: "Weekly on Mondays" },
  "28": { runsCompleted: 34,  errorCount: 1, avgRunDuration: "2m 30s",  lastRunAt: "2026-02-20T09:00:00Z", lastRunStatus: "success", schedule: "Daily at 9:00 AM" },
  "29": { runsCompleted: 19,  errorCount: 0, avgRunDuration: "1m 45s",  lastRunAt: "2026-02-19T11:00:00Z", lastRunStatus: "success", schedule: "Daily at 11:00 AM" },
  "30": { runsCompleted: 12,  errorCount: 1, avgRunDuration: "3m 15s",  lastRunAt: "2026-02-18T15:00:00Z", lastRunStatus: "success", schedule: "Daily at 3:00 PM" },
};

for (const agent of INITIAL_AGENTS) {
  if (agent.type === "l2" && L2_OPS_DATA[agent.id]) {
    Object.assign(agent, L2_OPS_DATA[agent.id]);
  }
}

type AgentsContextValue = {
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  addAgent: (agent: Omit<Agent, "id">) => void;
  updateAgent: (id: string, updates: Partial<Omit<Agent, "id">>) => void;
  agentsEnabledCount: number;
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
          const merged = parsed.map((stored: Agent) => {
            const defaults = defaultsById.get(stored.id);
            const migrated = { ...(defaults ?? {}), ...stored };
            if (defaults) migrated.type = defaults.type;
            if (migrated.status === "Training") migrated.status = "Active";
            return migrated;
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

  const agentsEnabledCount = agents.filter((a) => a.status === "Active").length;

  return (
    <AgentsContext.Provider value={{ agents, setAgents, addAgent, updateAgent, agentsEnabledCount }}>
      {children}
    </AgentsContext.Provider>
  );
}

export function useAgents() {
  const ctx = useContext(AgentsContext);
  if (!ctx) throw new Error("useAgents must be used within AgentsProvider");
  return ctx;
}
