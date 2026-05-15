"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Users, FileText, Shield, PenTool, Power, Bot, ArrowRight, ArrowLeft, Save, Settings, X, Sparkles, CheckCircle2 } from "lucide-react";

const PROPERTY_TYPES = [
  { id: "harvest-peak", name: "Harvest Peak Capital" },
  { id: "skyline", name: "Skyline Apartments" },
  { id: "the-meridian", name: "The Meridian" },
  { id: "oakwood", name: "Oakwood Village" },
  { id: "pine-ridge", name: "Pine Ridge Estates" },
  { id: "campus-view", name: "Campus View" },
  { id: "metro-heights", name: "Metro Heights" },
  { id: "lakeside", name: "Lakeside Commons" },
  { id: "heritage", name: "Heritage Place" },
  { id: "summit", name: "Summit Towers" },
  { id: "jamison", name: "Jamison Apartments" },
];

type StageId = "guest-cards" | "applications" | "screening" | "lease-execution";

type SettingDef = {
  id: string;
  name: string;
  description: string;
  type: "toggle" | "select" | "number" | "radio";
  defaultValue: string | number | boolean;
  options?: { label: string; value: string }[];
  suffix?: string;
};

type L3SubAgent = {
  id: string;
  name: string;
  description: string;
  settingsCount: number;
  settings: SettingDef[];
};

type Stage = {
  id: StageId;
  step: number;
  name: string;
  shortDescription: string;
  icon: React.ComponentType<{ className?: string }>;
  subAgents: L3SubAgent[];
};

const STAGES: Stage[] = [
  {
    id: "guest-cards",
    step: 1,
    name: "Guest Cards",
    shortDescription: "Manages the prospect intake funnel — guest card field configuration, lead detail...",
    icon: Users,
    subAgents: [
      { id: "gc-fields", name: "Guest Card Fields", description: "Configure which fields appear on the guest card — contact info requirements, lead source, agent assignment, move-in date, contact method, and notes.", settingsCount: 5, settings: [
        { id: "gc-require-phone-email", name: "Require Phone & Email", description: "Require both phone and email on guest card.", type: "toggle", defaultValue: false },
        { id: "gc-require-lead-source", name: "Require Lead Source", description: "Require lead source selection.", type: "toggle", defaultValue: false },
        { id: "gc-require-agent", name: "Require Agent for New Lead", description: "Require agent assignment for new leads.", type: "toggle", defaultValue: false },
        { id: "gc-require-movein", name: "Require Move-In Date", description: "Require move-in date on guest card.", type: "toggle", defaultValue: false },
        { id: "gc-require-notes", name: "Require Notes", description: "Require notes field completion.", type: "toggle", defaultValue: false },
      ]},
      { id: "gc-advanced", name: "Guest Card Advanced Settings", description: "Advanced guest card configuration — require move-in date, floor plan, bedroom and bathroom preferences on the legacy add-lead screen.", settingsCount: 4, settings: [
        { id: "gc-adv-movein", name: "Require Move-In Date (Legacy)", description: "Require move-in date on the legacy add-lead screen.", type: "toggle", defaultValue: false },
        { id: "gc-adv-floorplan", name: "Require Floor Plan", description: "Require floor plan selection on guest card.", type: "toggle", defaultValue: false },
        { id: "gc-adv-bedrooms", name: "Require Bedrooms", description: "Require bedroom preference on guest card.", type: "toggle", defaultValue: false },
        { id: "gc-adv-bathrooms", name: "Require Bathrooms", description: "Require bathroom preference on guest card.", type: "toggle", defaultValue: false },
      ]},
      { id: "gc-tours", name: "Tour Types & Availability", description: "Control which tour types are available on the prospect portal — agent-led tours, self-guided tours, and virtual tours.", settingsCount: 3, settings: [
        { id: "gc-tour-agent", name: "Enable Agent-Led Tours", description: "Allow prospects to schedule agent-led property tours.", type: "toggle", defaultValue: true },
        { id: "gc-tour-self", name: "Enable Self-Guided Tours", description: "Allow prospects to schedule self-guided property tours.", type: "toggle", defaultValue: true },
        { id: "gc-tour-virtual", name: "Enable Virtual Tours", description: "Allow prospects to take virtual property tours.", type: "toggle", defaultValue: false },
      ]},
      { id: "gc-id-verify", name: "Tour ID Verification", description: "Checkpoint ID verification for self-guided and in-person tours — requires prospect identity confirmation before granting property access.", settingsCount: 3, settings: [
        { id: "gc-id-selfguided", name: "Require ID for Self-Guided Tours", description: "Require identity verification before self-guided tour access.", type: "toggle", defaultValue: true },
        { id: "gc-id-inperson", name: "Require ID for In-Person Tours", description: "Require identity verification before in-person tour access.", type: "toggle", defaultValue: false },
        { id: "gc-id-method", name: "Verification Method", description: "Method used for identity verification.", type: "select", defaultValue: "photo_id", options: [{ label: "Photo ID Upload", value: "photo_id" }, { label: "SMS Verification", value: "sms" }, { label: "Both", value: "both" }] },
      ]},
      { id: "gc-scheduling", name: "Lead Scheduling & Follow-Up", description: "Automate lead follow-up scheduling — new lead response times, tour reminders, no-show handling, and prospect re-engagement sequences.", settingsCount: 4, settings: [
        { id: "gc-sched-response", name: "New Lead Response Time", description: "Maximum time before a new lead receives first contact.", type: "select", defaultValue: "15min", options: [{ label: "5 minutes", value: "5min" }, { label: "15 minutes", value: "15min" }, { label: "30 minutes", value: "30min" }, { label: "1 hour", value: "1hr" }] },
        { id: "gc-sched-reminder", name: "Tour Reminder", description: "Send automated tour reminders before scheduled tours.", type: "toggle", defaultValue: true },
        { id: "gc-sched-noshow", name: "No-Show Follow-Up", description: "Automatically follow up with prospects who miss scheduled tours.", type: "toggle", defaultValue: true },
        { id: "gc-sched-reengage", name: "Re-Engagement Sequence", description: "Automatically re-engage cold prospects after inactivity.", type: "toggle", defaultValue: false },
      ]},
      { id: "gc-comms", name: "Communications", description: "Prospect and tour communications — tour confirmations, reminders, no-show follow-ups, and lead nurture sequences.", settingsCount: 4, settings: [
        { id: "gc-comm-confirm", name: "Tour Confirmation", description: "Send tour confirmation to prospect after scheduling.", type: "toggle", defaultValue: true },
        { id: "gc-comm-reminder", name: "Tour Reminder", description: "Send reminder before scheduled tour.", type: "toggle", defaultValue: true },
        { id: "gc-comm-noshow", name: "No-Show Follow-Up", description: "Send follow-up after missed tour.", type: "toggle", defaultValue: true },
        { id: "gc-comm-nurture", name: "Lead Nurture Sequence", description: "Automated nurture email sequence for new leads.", type: "toggle", defaultValue: false },
      ]},
    ],
  },
  {
    id: "applications",
    step: 2,
    name: "Applications",
    shortDescription: "Automates configurable application workflows — routing, co-applicant coordination...",
    icon: FileText,
    subAgents: [
      { id: "app-avail", name: "Check Availability & Unit Selection", description: "Control whether prospects pick a floorplan, a unit space, or both during the application — and whether either selection is required.", settingsCount: 5, settings: [
        { id: "app-avail-floorplan", name: "Show Floor Plan Selection", description: "Allow prospects to select a floor plan during application.", type: "toggle", defaultValue: true },
        { id: "app-avail-unit", name: "Show Unit Space Selection", description: "Allow prospects to select a specific unit during application.", type: "toggle", defaultValue: true },
        { id: "app-avail-require-fp", name: "Require Floor Plan Selection", description: "Require floor plan selection to proceed with application.", type: "toggle", defaultValue: false },
        { id: "app-avail-require-unit", name: "Require Unit Selection", description: "Require specific unit selection to proceed.", type: "toggle", defaultValue: false },
        { id: "app-avail-waitlist", name: "Enable Waitlist", description: "Allow prospects to join a waitlist when preferred units are unavailable.", type: "toggle", defaultValue: true },
      ]},
      { id: "app-lifecycle", name: "Application Lifecycle Management", description: "Handle cancellations, archival, and reopens — enforce property-level policies and ensure clean state transitions.", settingsCount: 4, settings: [
        { id: "app-lc-autocancel", name: "Auto-Cancel After Inactivity", description: "Automatically cancel applications after a period of inactivity.", type: "toggle", defaultValue: true },
        { id: "app-lc-canceldays", name: "Inactivity Days Before Cancel", description: "Number of days of inactivity before auto-cancellation.", type: "number", defaultValue: 30, suffix: "days" },
        { id: "app-lc-archive", name: "Auto-Archive Cancelled Applications", description: "Automatically archive applications after cancellation.", type: "toggle", defaultValue: true },
        { id: "app-lc-reopen", name: "Allow Application Reopen", description: "Allow cancelled applications to be reopened.", type: "toggle", defaultValue: true },
      ]},
      { id: "app-pricing", name: "Pricing & Fees", description: "Application fees, payment methods, pet charges, deposit alternatives, fee disclosures, and dynamic pricing configuration.", settingsCount: 7, settings: [
        { id: "app-fee-amount", name: "Application Fee Amount", description: "Base application fee charged to each applicant.", type: "number", defaultValue: 50, suffix: "USD" },
        { id: "app-fee-payment", name: "Payment Methods", description: "Accepted payment methods for application fees.", type: "select", defaultValue: "all", options: [{ label: "All Methods", value: "all" }, { label: "Credit/Debit Only", value: "card" }, { label: "ACH Only", value: "ach" }] },
        { id: "app-fee-pet", name: "Pet Deposit", description: "Pet deposit amount.", type: "number", defaultValue: 250, suffix: "USD" },
        { id: "app-fee-petrent", name: "Monthly Pet Rent", description: "Monthly pet rent charge.", type: "number", defaultValue: 35, suffix: "USD/mo" },
        { id: "app-fee-deposit-alt", name: "Deposit Alternatives", description: "Enable deposit alternative programs (surety bonds, deposit insurance).", type: "toggle", defaultValue: false },
        { id: "app-fee-disclosure", name: "Fee Disclosures", description: "Show all required fee disclosures per local regulations.", type: "toggle", defaultValue: true },
        { id: "app-fee-promo", name: "Promotional Pricing", description: "Enable promotional pricing and concessions.", type: "toggle", defaultValue: false },
      ]},
      { id: "app-holds", name: "Unit Holds & Reservations", description: "Reserve units during the application process — hold duration, rentable items, and unit status transitions.", settingsCount: 2, settings: [
        { id: "app-hold-duration", name: "Hold Duration", description: "Maximum hours a unit can be held during the application process.", type: "number", defaultValue: 48, suffix: "hours" },
        { id: "app-hold-autorelease", name: "Auto-Release on Expiry", description: "Automatically release held units back to available inventory when hold expires.", type: "toggle", defaultValue: true },
      ]},
      { id: "app-portal", name: "Portal Display & Configuration", description: "Online application portal settings — enable/disable, affordable housing, exit links, and multi-factor authentication.", settingsCount: 4, settings: [
        { id: "app-portal-enable", name: "Enable Online Applications", description: "Enable the online application portal for prospects.", type: "toggle", defaultValue: true },
        { id: "app-portal-affordable", name: "Affordable Housing Mode", description: "Display affordable housing unit rules and income qualifications.", type: "toggle", defaultValue: false },
        { id: "app-portal-exit", name: "Show Exit Links", description: "Display exit links on the application portal.", type: "toggle", defaultValue: true },
        { id: "app-portal-mfa", name: "Multi-Factor Authentication", description: "Require MFA for application submission and document access.", type: "toggle", defaultValue: false },
      ]},
    ],
  },
  {
    id: "screening",
    step: 3,
    name: "Screening",
    shortDescription: "Automates applicant screening — orchestrates background checks, credit pulls, in...",
    icon: Shield,
    subAgents: [
      { id: "scr-auto", name: "Screening Automation", description: "Automated screening triggers, approval/denial actions, and conditional approval configuration.", settingsCount: 5, settings: [
        { id: "scr-auto-trigger", name: "Auto-Trigger Screening", description: "Automatically trigger screening when application is submitted.", type: "toggle", defaultValue: true },
        { id: "scr-auto-approve", name: "Auto-Approve Threshold", description: "Score threshold above which applications are auto-approved.", type: "number", defaultValue: 700 },
        { id: "scr-auto-deny", name: "Auto-Deny Threshold", description: "Score threshold below which applications are auto-denied.", type: "number", defaultValue: 500 },
        { id: "scr-auto-conditional", name: "Enable Conditional Approval", description: "Allow conditional approval for borderline applicants.", type: "toggle", defaultValue: true },
        { id: "scr-auto-coapplicant", name: "Screen All Co-Applicants", description: "Automatically screen all co-applicants on the application.", type: "toggle", defaultValue: true },
      ]},
      { id: "scr-settings", name: "Screening Settings", description: "Adverse-action letter visibility, the asset-as-income rule with its months divisor, and the rent-to-income calculation method.", settingsCount: 3, settings: [
        { id: "scr-set-adverse", name: "Show Adverse Action Letter", description: "Display adverse-action letter to denied applicants.", type: "toggle", defaultValue: true },
        { id: "scr-set-asset-months", name: "Asset-as-Income Months Divisor", description: "Number of months to divide assets by when calculating income.", type: "number", defaultValue: 12, suffix: "months" },
        { id: "scr-set-rti-method", name: "Rent-to-Income Calculation", description: "Method used to calculate rent-to-income ratio.", type: "select", defaultValue: "gross", options: [{ label: "Gross Income", value: "gross" }, { label: "Net Income", value: "net" }, { label: "Combined Household", value: "combined" }] },
      ]},
    ],
  },
  {
    id: "lease-execution",
    step: 4,
    name: "Lease Execution Agent",
    shortDescription: "Owns the lease execution surface in Property Settings — controls how leases are...",
    icon: PenTool,
    subAgents: [
      { id: "lease-auto", name: "Lease Automation", description: "Master dropdown plus its document auto-generation dependent — meaningful only when the master is set to combine_lease_with_online_application.", settingsCount: 1, settings: [
        { id: "lease-auto-mode", name: "Lease Generation Mode", description: "Controls how lease documents are generated in relation to the online application.", type: "select", defaultValue: "combine", options: [{ label: "Combine Lease with Online Application", value: "combine" }, { label: "Separate Lease Generation", value: "separate" }, { label: "Manual Only", value: "manual" }] },
      ]},
      { id: "lease-settings", name: "Lease Settings", description: "Signing flow, e-sign provider, renters-insurance gating, rounding behaviour, and document-handling toggles for the lease lifecycle.", settingsCount: 14, settings: [
        { id: "lease-signing-flow", name: "Signing Flow", description: "Order in which parties sign the lease.", type: "select", defaultValue: "resident_first", options: [{ label: "Resident Signs First", value: "resident_first" }, { label: "Agent Signs First", value: "agent_first" }, { label: "Simultaneous", value: "simultaneous" }] },
        { id: "lease-esign", name: "E-Sign Provider", description: "Electronic signature provider for lease execution.", type: "select", defaultValue: "entrata", options: [{ label: "Entrata E-Sign", value: "entrata" }, { label: "DocuSign", value: "docusign" }, { label: "BlueInk", value: "blueink" }] },
        { id: "lease-insurance", name: "Require Renters Insurance", description: "Gate lease execution on proof of renters insurance.", type: "toggle", defaultValue: false },
        { id: "lease-rounding", name: "Rent Rounding", description: "Round rent amounts to the nearest dollar.", type: "toggle", defaultValue: true },
        { id: "lease-auto-counter", name: "Auto-Countersign", description: "Automatically countersign leases after resident signature.", type: "toggle", defaultValue: false },
        { id: "lease-addenda", name: "Auto-Attach Addenda", description: "Automatically attach required addenda to lease documents.", type: "toggle", defaultValue: true },
        { id: "lease-watermark", name: "Draft Watermark", description: "Show watermark on draft lease documents.", type: "toggle", defaultValue: true },
        { id: "lease-versioning", name: "Document Versioning", description: "Track document versions across lease revisions.", type: "toggle", defaultValue: true },
        { id: "lease-welcome", name: "Welcome Communication", description: "Send welcome email on lease execution.", type: "toggle", defaultValue: true },
        { id: "lease-movein-checklist", name: "Move-In Checklist", description: "Auto-generate move-in checklist for new residents.", type: "toggle", defaultValue: true },
        { id: "lease-utility", name: "Utility Setup Reminder", description: "Send utility setup reminders before move-in.", type: "toggle", defaultValue: true },
        { id: "lease-parking", name: "Auto-Assign Parking", description: "Automatically assign parking based on lease terms.", type: "toggle", defaultValue: false },
        { id: "lease-inspection", name: "Move-In Inspection", description: "Schedule move-in inspection for each new resident.", type: "toggle", defaultValue: true },
        { id: "lease-key", name: "Key Handoff Process", description: "Enable digital key handoff scheduling.", type: "toggle", defaultValue: false },
      ]},
    ],
  },
];

type L4Job = {
  id: string;
  name: string;
  description: string;
};

type L4StageConfig = {
  description: string;
  capabilities: string[];
  impactMetrics: { value: string; label: string }[];
  jobs: L4Job[];
  settings: { id: string; name: string; description: string; type: "toggle" | "select"; defaultValue: string | boolean; options?: { label: string; value: string }[] }[];
};

const L4_STAGE_CONFIG: Record<StageId, L4StageConfig> = {
  "guest-cards": {
    description: "Autonomously qualifies inbound leads, auto-creates guest cards from multi-channel inquiries, and triages prospects to the right tour type based on intent signals.",
    capabilities: [
      "Auto-capture leads from email, chat, phone, and web — no manual guest card entry",
      "AI-powered lead scoring prioritizes high-intent prospects for immediate follow-up",
      "Smart tour matching recommends the best tour type based on prospect behavior",
      "24/7 instant response to new inquiries — no leads fall through the cracks",
    ],
    impactMetrics: [
      { value: "49%", label: "Reduction in cancelled applications" },
      { value: "38%", label: "Increase in applications by early adopters" },
      { value: "99%", label: "Conversations handled autonomously" },
    ],
    jobs: [
      { id: "l4-gc-conversations", name: "Lead Conversations", description: "Engages prospects via chat, SMS, and voice 24/7 — qualifies leads, answers questions about units, pricing, and amenities, and auto-creates guest cards." },
      { id: "l4-gc-tour-booking", name: "Tour Booking", description: "Schedules and confirms tours automatically based on prospect preferences and leasing team availability — handles rescheduling and sends reminders." },
    ],
    settings: [
      { id: "l4-gc-auto-capture", name: "Auto-Capture Leads", description: "Automatically create guest cards from inbound inquiries across all channels.", type: "toggle", defaultValue: true },
      { id: "l4-gc-lead-score", name: "AI Lead Scoring", description: "Score and prioritize leads based on intent signals and engagement.", type: "toggle", defaultValue: true },
      { id: "l4-gc-tour-match", name: "Smart Tour Matching", description: "Recommend optimal tour types based on prospect profile and availability.", type: "toggle", defaultValue: true },
      { id: "l4-gc-response-mode", name: "Response Mode", description: "How Leasing AI handles new lead responses.", type: "select", defaultValue: "autonomous", options: [{ label: "Fully Autonomous", value: "autonomous" }, { label: "Draft for Review", value: "draft" }, { label: "Notify Only", value: "notify" }] },
    ],
  },
  "applications": {
    description: "Guides prospects through the application flow end-to-end — nudges incomplete applications, coordinates co-applicants, and resolves blockers without staff intervention.",
    capabilities: [
      "Proactive nudges recover 40% of abandoned applications automatically",
      "Co-applicant coordination handled via automated outreach and status tracking",
      "Real-time blocker detection resolves missing documents and payment issues",
      "Reduces average application completion time from 3 days to under 4 hours",
    ],
    impactMetrics: [
      { value: "40%", label: "Abandoned applications recovered" },
      { value: "4 hrs", label: "Average time to completed application" },
      { value: "85%", label: "Reduction in staff follow-up tasks" },
    ],
    jobs: [
      { id: "l4-app-guidance", name: "Application Guidance", description: "Walks prospects through the application step-by-step — answers questions, nudges incomplete submissions, and resolves blockers like missing documents or payment issues." },
      { id: "l4-app-coapplicant-coord", name: "Co-Applicant Coordination", description: "Manages co-applicant outreach, tracks submission status for each party, and sends automated reminders to keep the application moving." },
    ],
    settings: [
      { id: "l4-app-nudge", name: "Application Nudges", description: "Automatically follow up on incomplete or stalled applications.", type: "toggle", defaultValue: true },
      { id: "l4-app-coapplicant", name: "Co-Applicant Coordination", description: "Autonomously manage co-applicant outreach, reminders, and status.", type: "toggle", defaultValue: true },
      { id: "l4-app-blocker", name: "Blocker Resolution", description: "Detect and resolve application blockers (missing docs, payment issues).", type: "toggle", defaultValue: true },
      { id: "l4-app-escalation", name: "Escalation Threshold", description: "When to escalate unresolved issues to staff.", type: "select", defaultValue: "48hr", options: [{ label: "After 24 hours", value: "24hr" }, { label: "After 48 hours", value: "48hr" }, { label: "After 72 hours", value: "72hr" }, { label: "Never (always autonomous)", value: "never" }] },
    ],
  },
  "screening": {
    description: "Orchestrates the full screening pipeline — triggers checks, interprets results against property criteria, and routes decisions to approval, conditional, or denial pathways.",
    capabilities: [
      "Instant screening decisions — no staff review needed for clear approve/deny cases",
      "Conditional approval logic handles edge cases with configurable deposit rules",
      "Adverse-action compliance automated with jurisdiction-aware letter generation",
      "Co-applicant screening parallelized to eliminate sequential processing delays",
    ],
    impactMetrics: [
      { value: "< 2 min", label: "Average screening decision time" },
      { value: "95%", label: "Decisions made without staff intervention" },
      { value: "100%", label: "Adverse-action compliance rate" },
    ],
    jobs: [
      { id: "l4-scr-decisions", name: "Screening Decisions", description: "Interprets screening results against property criteria and auto-routes to approval, conditional approval, or denial — no staff review needed for clear-cut cases." },
      { id: "l4-scr-compliance", name: "Adverse-Action Compliance", description: "Generates jurisdiction-aware adverse-action notices automatically and ensures full compliance with fair housing and consumer protection regulations." },
    ],
    settings: [
      { id: "l4-scr-auto-decide", name: "Autonomous Decisions", description: "Auto-approve or deny clear-cut applications without staff review.", type: "toggle", defaultValue: true },
      { id: "l4-scr-conditional", name: "Conditional Logic", description: "Handle borderline cases with automated deposit or guarantor requirements.", type: "toggle", defaultValue: true },
      { id: "l4-scr-adverse", name: "Adverse-Action Automation", description: "Generate and send compliant adverse-action notices automatically.", type: "toggle", defaultValue: true },
      { id: "l4-scr-override", name: "Override Policy", description: "How staff overrides are handled.", type: "select", defaultValue: "allowed", options: [{ label: "Always Allowed", value: "allowed" }, { label: "Manager Approval Required", value: "manager" }, { label: "Locked (No Overrides)", value: "locked" }] },
    ],
  },
  "lease-execution": {
    description: "Drives lease execution to completion — generates documents, manages the signing ceremony, coordinates move-in logistics, and triggers post-execution workflows.",
    capabilities: [
      "Lease documents generated and sent for signature within minutes of approval",
      "Smart signing orchestration adapts to resident availability and preferences",
      "Move-in coordination automated — inspections, keys, utilities, and welcome comms",
      "Reduces lease execution cycle from 5 days to under 24 hours on average",
    ],
    impactMetrics: [
      { value: "< 24 hrs", label: "Average lease execution cycle" },
      { value: "80%", label: "Reduction in manual document prep" },
      { value: "3x", label: "Faster move-in coordination" },
    ],
    jobs: [
      { id: "l4-lease-docs", name: "Document Generation & Signing", description: "Auto-generates lease documents upon approval and orchestrates the full signing ceremony — manages the signing order, sends reminders, and handles countersignatures." },
      { id: "l4-lease-movein-coord", name: "Move-In Coordination", description: "Coordinates all move-in logistics autonomously — schedules inspections, manages key handoff, triggers utility setup reminders, and sends welcome communications." },
    ],
    settings: [
      { id: "l4-lease-auto-gen", name: "Auto-Generate Leases", description: "Automatically generate lease documents upon screening approval.", type: "toggle", defaultValue: true },
      { id: "l4-lease-sign-orchestrate", name: "Signing Orchestration", description: "Manage the end-to-end signing flow including reminders and follow-ups.", type: "toggle", defaultValue: true },
      { id: "l4-lease-movein", name: "Move-In Automation", description: "Coordinate inspections, key handoff, and utility setup automatically.", type: "toggle", defaultValue: true },
      { id: "l4-lease-gen-timing", name: "Generation Timing", description: "When lease documents are generated.", type: "select", defaultValue: "on_approval", options: [{ label: "Immediately on Approval", value: "on_approval" }, { label: "Next Business Day", value: "next_day" }, { label: "Manual Trigger", value: "manual" }] },
    ],
  },
};

export function LeadToLeaseSettings({ isActive, onToggleActive }: { isActive: boolean; onToggleActive: () => void }) {
  const [activeStageId, setActiveStageId] = useState<StageId>("guest-cards");
  const [activeTab, setActiveTab] = useState<"setup" | "compare">("setup");
  const [selectedProperty, setSelectedProperty] = useState("harvest-peak");
  const [openSubAgentId, setOpenSubAgentId] = useState<string | null>(null);
  const [enabledAgents, setEnabledAgents] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    STAGES.flatMap((s) => s.subAgents).forEach((a) => { init[a.id] = true; });
    return init;
  });
  const [l4Enabled, setL4Enabled] = useState(false);
  const [l4FlyoutStage, setL4FlyoutStage] = useState<StageId | null>(null);

  const activeStage = STAGES.find((s) => s.id === activeStageId)!;
  const selectedProp = PROPERTY_TYPES.find((p) => p.id === selectedProperty);
  const openSubAgent = openSubAgentId ? activeStage.subAgents.find((a) => a.id === openSubAgentId) : null;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-10 pt-10 pb-10 bg-gradient-to-b from-zinc-50/80 to-white relative">
        <button
          type="button"
          onClick={onToggleActive}
          title={isActive ? "Deactivate agent" : "Activate agent"}
          className={`absolute top-3 right-3 flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors opacity-60 hover:opacity-100 ${
            isActive
              ? "border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
          }`}
        >
          <Power className="h-3 w-3" />
          {isActive ? "Turn Off" : "Turn On"}
        </button>
        <div className="flex items-center gap-5 mb-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7c3aed]/10 shadow-sm">
            <img src="/eli-cube.svg" alt="" width={30} height={30} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-[28px] font-bold text-foreground tracking-tight">Autonomous Leasing+</h1>
              <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-[11px] font-medium text-muted-foreground">L5 · Autonomous</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isActive ? "bg-[#B3FFCC] text-black" : "bg-zinc-200 text-zinc-500"}`}>
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-[15px] text-muted-foreground mt-1.5 max-w-3xl leading-relaxed">
              Unified leasing intelligence — orchestrates application processing, screening decisions, lease execution, and resident communications through coordinated autonomous agents.
            </p>
          </div>
        </div>

        {/* Pipeline timeline */}
        <div className="relative flex items-stretch gap-0 mt-10 mb-1">

          {STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isCurrent = activeStageId === stage.id;
            const isPast = stage.step < (STAGES.find((s) => s.id === activeStageId)?.step ?? 1);
            const isLast = idx === STAGES.length - 1;
            return (
              <div key={stage.id} className="flex items-stretch flex-1 min-w-0 relative z-10">
                <button
                  type="button"
                  onClick={() => { setActiveStageId(stage.id); setOpenSubAgentId(null); }}
                  className={`relative flex-1 rounded-2xl border-2 px-6 py-7 text-left transition-all ${
                    isCurrent
                      ? "border-[#7c3aed] bg-gradient-to-br from-[#7c3aed]/10 to-[#7c3aed]/5 shadow-lg shadow-[#7c3aed]/15 scale-[1.03]"
                      : "border-border bg-white hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-sm"
                  }`}
                >
                  <div className={`absolute -top-3.5 left-5 rounded-full px-4 py-1.5 text-[11px] font-bold tracking-wider uppercase ${
                    isCurrent
                      ? "bg-[#7c3aed] text-white shadow-sm shadow-[#7c3aed]/30"
                      : "bg-zinc-200 text-zinc-500"
                  }`}>
                    Stage {stage.step}
                  </div>
                  <div className="flex items-start gap-4 mt-2.5">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      isCurrent
                        ? "bg-[#7c3aed]/15 text-[#7c3aed]"
                        : "bg-zinc-100 text-zinc-400"
                    }`}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-base font-bold leading-tight ${
                        isCurrent ? "text-[#7c3aed]" : isPast ? "text-foreground" : "text-foreground"
                      }`}>{stage.name}</p>
                      <p className="text-[13px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{stage.shortDescription}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-2.5">
                    <img src="/eli-cube.svg" alt="" width={15} height={15} />
                    <span className={`text-xs font-semibold ${isCurrent ? "text-[#7c3aed]" : "text-muted-foreground"}`}>
                      {stage.subAgents.length} L3
                    </span>
                    <span className="text-zinc-300">·</span>
                    <img src="/eli-cube.svg" alt="" width={15} height={15} />
                    <span className={`text-xs font-semibold ${isCurrent ? "text-[#7c3aed]" : "text-muted-foreground"}`}>
                      {L4_STAGE_CONFIG[stage.id].jobs.length} L4
                    </span>
                  </div>
                </button>
                {!isLast && (
                  <div className="flex items-center px-3.5 shrink-0 z-20">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full shadow-sm bg-gradient-to-r from-[#7c3aed]/25 to-[#7c3aed]/15">
                      <ArrowRight className="h-5 w-5 text-[#7c3aed]" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs row with property selector */}
      <div className="shrink-0 flex items-center justify-between border-b border-border px-8 bg-zinc-50/50">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => { setActiveTab("setup"); setOpenSubAgentId(null); }}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors rounded-t-md ${
              activeTab === "setup"
                ? "text-foreground bg-white border border-b-0 border-border -mb-px"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Setup & Configure Sub Agents
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("compare"); setOpenSubAgentId(null); }}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors rounded-t-md ${
              activeTab === "compare"
                ? "text-foreground bg-white border border-b-0 border-border -mb-px"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Compare Properties
          </button>
        </div>

        {/* Property selector */}
        <div className="flex items-center gap-2.5 py-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Property</span>
          <select
            value={selectedProperty}
            onChange={(e) => { setSelectedProperty(e.target.value); setOpenSubAgentId(null); }}
            className="h-8 rounded-lg border border-border bg-white pl-3 pr-8 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed] cursor-pointer appearance-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
          >
            {PROPERTY_TYPES.map((prop) => (
              <option key={prop.id} value={prop.id}>{prop.name}</option>
            ))}
          </select>
          <span className="rounded-full bg-[#7c3aed] px-2 py-0.5 text-[10px] font-bold text-white leading-none">{PROPERTY_TYPES.length}</span>
        </div>
      </div>

      {/* Main content — full width */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === "setup" ? (
          openSubAgent ? (
            <SubAgentSettingsView
              agent={openSubAgent}
              propertyName={selectedProp?.name ?? ""}
              onBack={() => setOpenSubAgentId(null)}
            />
          ) : (
            <div className="px-8 py-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground">{selectedProp?.name}</h2>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{activeStage.subAgents.length} L3 agents</span>
                  <span className="text-emerald-600 font-medium">{activeStage.subAgents.length} published</span>
                </div>
              </div>

              <div className="space-y-3">
                {activeStage.subAgents.map((agent) => {
                  const isAgentEnabled = enabledAgents[agent.id] ?? true;
                  return (
                    <div
                      key={agent.id}
                      className="w-full rounded-xl border border-border bg-white overflow-hidden transition-all hover:shadow-sm hover:border-zinc-300"
                    >
                      <div className="flex items-center justify-between px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setOpenSubAgentId(agent.id)}
                          className="flex items-start gap-3 min-w-0 flex-1 text-left"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm font-semibold text-foreground">{agent.name}</span>
                              <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">L3 Agent</span>
                              <span className="rounded-full bg-[#7c3aed]/10 px-2 py-0.5 text-[10px] font-semibold text-[#7c3aed]">
                                {agent.settingsCount} setting{agent.settingsCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">{agent.description}</p>
                          </div>
                        </button>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          <div className="flex items-center gap-2.5">
                            {isAgentEnabled ? (
                              <div className="flex items-center gap-1.5">
                                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#7c3aed]/10">
                                  <img src="/eli-cube.svg" alt="" width={14} height={14} />
                                </div>
                                <span className="text-xs font-semibold text-[#7c3aed]">Agent</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100">
                                  <Users className="h-3.5 w-3.5 text-zinc-500" />
                                </div>
                                <span className="text-xs font-medium text-zinc-500">Manual</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEnabledAgents((prev) => ({ ...prev, [agent.id]: !prev[agent.id] }));
                              }}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${isAgentEnabled ? "bg-[#7c3aed]" : "bg-zinc-300"}`}
                            >
                              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${isAgentEnabled ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                            </button>
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Eli+ Leasing AI — L4 Job rows */}
                {L4_STAGE_CONFIG[activeStageId].jobs.map((job) => (
                  <div
                    key={job.id}
                    className={`w-full rounded-xl border-2 overflow-hidden transition-all hover:shadow-sm ${
                      l4Enabled
                        ? "border-[#7c3aed]/40 bg-gradient-to-r from-[#7c3aed]/[0.03] to-white"
                        : "border-dashed border-zinc-300 bg-zinc-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setL4FlyoutStage(activeStageId)}
                        className="flex items-start gap-3 min-w-0 flex-1 text-left"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] mt-0.5">
                          <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-semibold text-foreground">{job.name}</span>
                            <span className="rounded-full bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-2 py-0.5 text-[9px] font-bold text-white tracking-wide">L4</span>
                            <span className="rounded-full border border-[#7c3aed]/20 bg-[#7c3aed]/5 px-2 py-0.5 text-[10px] font-medium text-[#7c3aed]">Eli+ Leasing AI</span>
                            {!l4Enabled && (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Add-on</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">{job.description}</p>
                        </div>
                      </button>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <div className="flex items-center gap-2.5">
                          {l4Enabled ? (
                            <div className="flex items-center gap-1.5">
                              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#7c3aed]/10">
                                <img src="/eli-cube.svg" alt="" width={14} height={14} />
                              </div>
                              <span className="text-xs font-semibold text-[#7c3aed]">Agent</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100">
                                <Users className="h-3.5 w-3.5 text-zinc-500" />
                              </div>
                              <span className="text-xs font-medium text-zinc-500">Manual</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!l4Enabled) {
                                setL4FlyoutStage(activeStageId);
                              } else {
                                setL4Enabled(false);
                              }
                            }}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${l4Enabled ? "bg-[#7c3aed]" : "bg-zinc-300"}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${l4Enabled ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                          </button>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Compare View</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Side-by-side comparison of settings across property types is coming soon. This will let you diff configurations between verticals and quickly spot inconsistencies.
            </p>
          </div>
        )}
      </div>

      {/* L4 Value Prop Dialog (when not enabled) */}
      {l4FlyoutStage && !l4Enabled && (
        <L4ValuePropDialog
          stageId={l4FlyoutStage}
          onEnable={() => { setL4Enabled(true); setL4FlyoutStage(null); }}
          onClose={() => setL4FlyoutStage(null)}
        />
      )}

      {/* L4 Settings Flyout (when enabled) */}
      {l4FlyoutStage && l4Enabled && (
        <L4SettingsFlyout
          stageId={l4FlyoutStage}
          onClose={() => setL4FlyoutStage(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Eli+ Leasing AI L4 Flyout
// ---------------------------------------------------------------------------

function L4ValuePropDialog({ stageId, onEnable, onClose }: { stageId: StageId; onEnable: () => void; onClose: () => void }) {
  const config = L4_STAGE_CONFIG[stageId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="p-6 pb-0">
          <div className="flex items-center gap-3">
            <img src="/eli-cube.svg" alt="" width={32} height={32} />
            <div>
              <h2 className="text-base font-semibold text-foreground">ELI+ Leasing AI</h2>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
          </div>
        </div>

        <div className="px-6 pt-4">
          <div className="rounded-lg border border-border p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">What Leasing AI does</p>
            <ul className="space-y-2">
              {config.capabilities.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="px-6 pt-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">Impact from similar properties</p>
            <div className={`grid gap-4 text-center ${config.impactMetrics.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
              {config.impactMetrics.map((m) => (
                <div key={m.label}>
                  <p className="text-xs text-muted-foreground/60 mb-0.5">up to</p>
                  <p className="text-xl font-bold text-foreground">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6">
          <button
            type="button"
            onClick={onEnable}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            Set Up ELI+ Leasing AI
          </button>
        </div>
      </div>
    </div>
  );
}

function L4SettingsFlyout({ stageId, onClose }: { stageId: StageId; onClose: () => void }) {
  const config = L4_STAGE_CONFIG[stageId];
  const stage = STAGES.find((s) => s.id === stageId)!;
  const [l4Values, setL4Values] = useState<Record<string, string | boolean>>(() => {
    const init: Record<string, string | boolean> = {};
    config.settings.forEach((s) => { init[s.id] = s.defaultValue; });
    return init;
  });
  const [saveToast, setSaveToast] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#6d28d9]">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">Eli+ Leasing AI</h2>
                  <span className="rounded-full bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-2 py-0.5 text-[9px] font-bold text-white tracking-wide">L4</span>
                  <span className="rounded-full bg-[#B3FFCC] px-2 py-0.5 text-[10px] font-semibold text-black">Active</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{stage.name} Stage Settings</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="rounded-xl bg-gradient-to-br from-[#7c3aed]/5 to-transparent border border-[#7c3aed]/15 p-4 mb-6">
            <p className="text-xs text-muted-foreground leading-relaxed">{config.description}</p>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-zinc-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Setting</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Value</th>
                </tr>
              </thead>
              <tbody>
                {config.settings.map((setting) => (
                  <tr key={setting.id} className="border-b border-border/50 last:border-b-0">
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-foreground">{setting.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{setting.description}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {setting.type === "toggle" ? (
                        <button
                          type="button"
                          onClick={() => setL4Values((prev) => ({ ...prev, [setting.id]: !prev[setting.id] }))}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${l4Values[setting.id] ? "bg-emerald-500" : "bg-zinc-300"}`}
                        >
                          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${l4Values[setting.id] ? "translate-x-[22px]" : "translate-x-[3px]"}`} />
                        </button>
                      ) : (
                        <select
                          value={l4Values[setting.id] as string}
                          onChange={(e) => setL4Values((prev) => ({ ...prev, [setting.id]: e.target.value }))}
                          className="h-9 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30"
                        >
                          {setting.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="shrink-0 border-t border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {saveToast && <span className="text-xs font-medium text-emerald-600">Saved</span>}
          </div>
          <button
            type="button"
            onClick={() => { setSaveToast(true); setTimeout(() => setSaveToast(false), 2000); }}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-agent settings view (matches L3 property settings pattern)
// ---------------------------------------------------------------------------

function SubAgentSettingsView({ agent, propertyName, onBack }: { agent: L3SubAgent; propertyName: string; onBack: () => void }) {
  const [values, setValues] = useState<Record<string, string | number | boolean>>(() => {
    const init: Record<string, string | number | boolean> = {};
    agent.settings.forEach((s) => { init[s.id] = s.defaultValue; });
    return init;
  });
  const [saveToast, setSaveToast] = useState(false);

  const updateValue = (id: string, value: string | number | boolean) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-8 pt-5 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to all properties
        </button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-foreground">{propertyName}</h2>
              <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Conventional</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {agent.name} settings for this property
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saveToast && (
              <span className="text-xs font-medium text-emerald-600">Saved</span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
        <div className="mb-5">
          <div className="flex items-center gap-2.5 mb-1">
            <img src="/eli-cube.svg" alt="" width={18} height={18} />
            <h3 className="text-base font-semibold text-foreground">{agent.name}</h3>
            <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">L3 Agent</span>
            <span className="rounded-full bg-[#7c3aed]/10 px-2 py-0.5 text-[10px] font-semibold text-[#7c3aed]">
              {agent.settingsCount} setting{agent.settingsCount !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">{agent.description}</p>
        </div>

        {/* Settings table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-zinc-50">
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Setting</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {agent.settings.map((setting) => (
                <tr key={setting.id} className="border-b border-border/50 last:border-b-0">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-foreground">{setting.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
                  </td>
                  <td className="px-5 py-4">
                    {setting.type === "toggle" ? (
                      values[setting.id] ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#7c3aed]/10">
                            <img src="/eli-cube.svg" alt="" width={14} height={14} />
                          </div>
                          <span className="text-xs font-semibold text-[#7c3aed]">Agent</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100">
                            <Users className="h-3.5 w-3.5 text-zinc-500" />
                          </div>
                          <span className="text-xs font-medium text-zinc-500">Manual</span>
                        </div>
                      )
                    ) : setting.type === "select" ? (
                      <select
                        value={values[setting.id] as string}
                        onChange={(e) => updateValue(setting.id, e.target.value)}
                        className="h-9 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-300"
                      >
                        {setting.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : setting.type === "number" ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={values[setting.id] as number}
                          onChange={(e) => updateValue(setting.id, parseInt(e.target.value) || 0)}
                          className="h-9 w-24 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-300"
                        />
                        {setting.suffix && <span className="text-xs text-muted-foreground">{setting.suffix}</span>}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-zinc-50 transition-colors"
                    >
                      <Settings className="h-3 w-3" />
                      Configure
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
