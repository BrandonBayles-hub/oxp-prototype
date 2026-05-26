// Entrata report catalog used by the Report Analyzer module.
//
// In production this will be sourced from the user's actual report-permission
// set in Entrata. For the prototype we hand-curate a realistic spread of
// reports an Operations team would actually have access to. Each entry carries
// just enough metadata for the module's catalog UI: an icon, a one-line
// description, run cadence, and a synthetic "last run" timestamp.

import {
  Banknote,
  Building2,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileSpreadsheet,
  Gauge,
  Globe,
  HeartHandshake,
  Home,
  Landmark,
  LayoutDashboard,
  LineChart,
  ListChecks,
  MailWarning,
  Megaphone,
  PieChart,
  Receipt,
  Scale,
  ShieldAlert,
  Sparkles,
  Star,
  Truck,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type ReportCategory =
  | "financial"
  | "operational"
  | "leasing"
  | "maintenance"
  | "marketing"
  | "resident";

export type ReportFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "on-demand";

export interface ReportDef {
  id: string;
  /** Short numeric/series id shown as monospace metadata, e.g. "FIN-014". */
  code: string;
  name: string;
  description: string;
  category: ReportCategory;
  frequency: ReportFrequency;
  icon: LucideIcon;
  /** Hand-crafted relative timestamp string ("2h ago", "Yesterday"). */
  lastRun: string;
  /** Optional flag to surface in the "recently analyzed" chip strip. */
  recent?: boolean;
}

export interface ReportCategoryDef {
  id: ReportCategory;
  label: string;
  /** A single accent hue per category, used sparingly on group headers. */
  hue: string;
  /** One-line orientation copy shown when the group is collapsed. */
  blurb: string;
}

export const REPORT_CATEGORIES: ReportCategoryDef[] = [
  {
    id: "financial",
    label: "Financial",
    hue: "#0f766e",
    blurb: "P&L, variance, AR aging, ledger.",
  },
  {
    id: "operational",
    label: "Operational",
    hue: "#3b7a9e",
    blurb: "Box scores, occupancy, make-ready.",
  },
  {
    id: "leasing",
    label: "Leasing",
    hue: "#7c3aed",
    blurb: "Funnel, applications, expirations.",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    hue: "#0891b2",
    blurb: "Work orders, MTTR, vendor spend.",
  },
  {
    id: "marketing",
    label: "Marketing",
    hue: "#c2410c",
    blurb: "Sources, cost-per-lead, pacing.",
  },
  {
    id: "resident",
    label: "Resident",
    hue: "#a16207",
    blurb: "Satisfaction, NPS, violations.",
  },
];

export const REPORT_CATEGORY_BY_ID: Record<ReportCategory, ReportCategoryDef> =
  REPORT_CATEGORIES.reduce(
    (acc, c) => ({ ...acc, [c.id]: c }),
    {} as Record<ReportCategory, ReportCategoryDef>,
  );

// ---------------------------------------------------------------------------
// The catalog. Order within a category matters — most-used reports first.
// ---------------------------------------------------------------------------

export const REPORTS: ReportDef[] = [
  // ── Financial ──────────────────────────────────────────────────────────
  {
    id: "noi-variance",
    code: "FIN-014",
    name: "NOI Variance Report",
    description: "Actual NOI vs. budget by property, with line-item drill-down.",
    category: "financial",
    frequency: "monthly",
    icon: LineChart,
    lastRun: "2h ago",
    recent: true,
  },
  {
    id: "rent-roll",
    code: "FIN-001",
    name: "Rent Roll",
    description: "Active leases with charges, occupancy, and term remaining.",
    category: "financial",
    frequency: "daily",
    icon: FileSpreadsheet,
    lastRun: "Today, 6:00 AM",
    recent: true,
  },
  {
    id: "ar-aging",
    code: "FIN-022",
    name: "AR Aging Report",
    description: "Outstanding balances bucketed by 0/30/60/90+ day delinquency.",
    category: "financial",
    frequency: "weekly",
    icon: Wallet,
    lastRun: "Yesterday",
    recent: true,
  },
  {
    id: "income-statement",
    code: "FIN-005",
    name: "Income Statement",
    description: "P&L by property and consolidated, with prior-period comparison.",
    category: "financial",
    frequency: "monthly",
    icon: FileBarChart,
    lastRun: "Apr 30",
  },
  {
    id: "cash-flow",
    code: "FIN-018",
    name: "Cash Flow Report",
    description: "Operating, investing, and financing cash flows by period.",
    category: "financial",
    frequency: "monthly",
    icon: Banknote,
    lastRun: "Apr 30",
  },
  {
    id: "trial-balance",
    code: "FIN-031",
    name: "Trial Balance",
    description: "GL trial balance with debit/credit totals by account.",
    category: "financial",
    frequency: "monthly",
    icon: Scale,
    lastRun: "Apr 30",
  },
  {
    id: "general-ledger",
    code: "FIN-008",
    name: "General Ledger",
    description: "Full GL transactions, filterable by account, period, vendor.",
    category: "financial",
    frequency: "on-demand",
    icon: Landmark,
    lastRun: "3d ago",
  },
  {
    id: "delinquency",
    code: "FIN-027",
    name: "Delinquency Detail",
    description: "Resident-level past-due, with payment plan and collections status.",
    category: "financial",
    frequency: "weekly",
    icon: CreditCard,
    lastRun: "Monday",
  },
  {
    id: "ap-aging",
    code: "FIN-019",
    name: "AP Aging",
    description: "Open vendor invoices by age bucket, with anomaly flags.",
    category: "financial",
    frequency: "weekly",
    icon: Receipt,
    lastRun: "Yesterday",
  },

  // ── Operational ────────────────────────────────────────────────────────
  {
    id: "box-score",
    code: "OPS-002",
    name: "Box Score",
    description: "Daily property KPIs — occupancy, leases, MTTR, delinquency.",
    category: "operational",
    frequency: "daily",
    icon: LayoutDashboard,
    lastRun: "Today, 7:00 AM",
  },
  {
    id: "occupancy",
    code: "OPS-006",
    name: "Occupancy Report",
    description: "Physical and economic occupancy, with 30/60/90-day trend.",
    category: "operational",
    frequency: "daily",
    icon: Gauge,
    lastRun: "Today, 7:00 AM",
  },
  {
    id: "make-ready",
    code: "OPS-014",
    name: "Make-Ready Report",
    description: "Units in turn, days vacant, and turn-cost vs. standard.",
    category: "operational",
    frequency: "weekly",
    icon: Home,
    lastRun: "Monday",
  },
  {
    id: "move-in-out",
    code: "OPS-022",
    name: "Move-In / Move-Out Report",
    description: "Scheduled and completed moves with deposit reconciliation.",
    category: "operational",
    frequency: "weekly",
    icon: Truck,
    lastRun: "2d ago",
  },
  {
    id: "notice-vacate",
    code: "OPS-031",
    name: "Notice to Vacate",
    description: "Residents who have given notice, with replacement readiness.",
    category: "operational",
    frequency: "weekly",
    icon: MailWarning,
    lastRun: "Yesterday",
  },
  {
    id: "vacancy-detail",
    code: "OPS-009",
    name: "Vacancy Detail",
    description: "Unit-level vacancy with days-vacant and pricing recommendations.",
    category: "operational",
    frequency: "daily",
    icon: Building2,
    lastRun: "Today, 7:00 AM",
  },

  // ── Leasing ────────────────────────────────────────────────────────────
  {
    id: "leasing-funnel",
    code: "LEA-003",
    name: "Lead-to-Lease Funnel",
    description: "Full conversion funnel from lead source through signed lease.",
    category: "leasing",
    frequency: "weekly",
    icon: PieChart,
    lastRun: "Monday",
  },
  {
    id: "tour-conversion",
    code: "LEA-011",
    name: "Tour Conversion",
    description: "Tours scheduled, completed, and converted to applications.",
    category: "leasing",
    frequency: "weekly",
    icon: ClipboardList,
    lastRun: "Monday",
  },
  {
    id: "applications",
    code: "LEA-018",
    name: "Application Pipeline",
    description: "Applications in flight by stage, with approval rate and SLA.",
    category: "leasing",
    frequency: "daily",
    icon: ListChecks,
    lastRun: "Today, 7:00 AM",
  },
  {
    id: "lease-expirations",
    code: "LEA-024",
    name: "Lease Expirations",
    description: "Expiring leases by month, with renewal status and rent change.",
    category: "leasing",
    frequency: "monthly",
    icon: FileBarChart,
    lastRun: "Apr 30",
  },
  {
    id: "renewal-status",
    code: "LEA-029",
    name: "Renewal Status",
    description: "Offer mix, acceptance rate, and rent growth on renewals.",
    category: "leasing",
    frequency: "weekly",
    icon: HeartHandshake,
    lastRun: "Monday",
  },
  {
    id: "concessions",
    code: "LEA-036",
    name: "Concessions Report",
    description: "Discounts and free-rent given, by property and lease type.",
    category: "leasing",
    frequency: "monthly",
    icon: Sparkles,
    lastRun: "Apr 30",
  },

  // ── Maintenance ────────────────────────────────────────────────────────
  {
    id: "open-work-orders",
    code: "MNT-001",
    name: "Open Work Orders",
    description: "All open WOs by property, age, and priority — including AI-handled.",
    category: "maintenance",
    frequency: "daily",
    icon: Wrench,
    lastRun: "Today, 7:00 AM",
  },
  {
    id: "mttr",
    code: "MNT-008",
    name: "MTTR by Category",
    description: "Mean time to repair by issue type, property, and vendor.",
    category: "maintenance",
    frequency: "weekly",
    icon: Gauge,
    lastRun: "Monday",
  },
  {
    id: "vendor-spend",
    code: "MNT-014",
    name: "Vendor Spend",
    description: "YTD spend by vendor, with anomaly flags and trend.",
    category: "maintenance",
    frequency: "monthly",
    icon: Banknote,
    lastRun: "Apr 30",
  },
  {
    id: "make-ready-perf",
    code: "MNT-019",
    name: "Make-Ready Performance",
    description: "Turn time and cost vs. standard, with vendor comparison.",
    category: "maintenance",
    frequency: "weekly",
    icon: ShieldAlert,
    lastRun: "Monday",
  },

  // ── Marketing ──────────────────────────────────────────────────────────
  {
    id: "source-performance",
    code: "MKT-002",
    name: "Source Performance",
    description: "Lead and lease attribution by marketing source.",
    category: "marketing",
    frequency: "monthly",
    icon: PieChart,
    lastRun: "Apr 30",
  },
  {
    id: "cost-per-lead",
    code: "MKT-007",
    name: "Cost Per Lead",
    description: "CPL by source and channel, with conversion-quality weighting.",
    category: "marketing",
    frequency: "monthly",
    icon: Megaphone,
    lastRun: "Apr 30",
  },
  {
    id: "website-traffic",
    code: "MKT-012",
    name: "Website Traffic",
    description: "Sessions, bounce rate, and contact-form submissions.",
    category: "marketing",
    frequency: "weekly",
    icon: Globe,
    lastRun: "Monday",
  },

  // ── Resident ───────────────────────────────────────────────────────────
  {
    id: "resident-satisfaction",
    code: "RES-003",
    name: "Resident Satisfaction",
    description: "Survey scores by property, with verbatim comment themes.",
    category: "resident",
    frequency: "monthly",
    icon: Star,
    lastRun: "Apr 30",
  },
  {
    id: "nps",
    code: "RES-008",
    name: "NPS by Property",
    description: "NPS trend, detractor concentration, and tenure correlation.",
    category: "resident",
    frequency: "quarterly",
    icon: Users,
    lastRun: "Q1 2026",
  },
  {
    id: "lease-violations",
    code: "RES-014",
    name: "Lease Violations",
    description: "Violations by type, property, and severity, with cure status.",
    category: "resident",
    frequency: "weekly",
    icon: ShieldAlert,
    lastRun: "Monday",
  },
];

export const REPORT_BY_ID: Record<string, ReportDef> = REPORTS.reduce(
  (acc, r) => ({ ...acc, [r.id]: r }),
  {},
);

// ---------------------------------------------------------------------------
// Pre-baked starter prompts shown when a user opens a report in the analyzer.
// Generic prompts work for every report; the most-popular reports get
// hand-tailored ones that reference their actual columns and dimensions.
// ---------------------------------------------------------------------------

export const GENERIC_STARTERS: string[] = [
  "Summarize this report in 5 bullets",
  "Find anomalies and flag the top 3",
  "Compare this period to the previous one",
  "Generate an executive summary I can email",
];

export const REPORT_STARTERS: Record<string, string[]> = {
  "noi-variance": [
    "Which line item is the biggest variance driver?",
    "Compare Tampa Bay to the rest of the Southeast region",
    "Is the variance on the revenue or expense side?",
    "Draft talking points for an LP update on this report",
  ],
  "rent-roll": [
    "Which units are at risk of non-renewal?",
    "Show me the top 10 highest-rent residents",
    "Flag any leases expiring in the next 30 days",
    "Generate a one-page summary for the regional",
  ],
  "ar-aging": [
    "Who's behind on rent more than 30 days?",
    "Compare aging this month vs. last month",
    "Estimate write-off risk by property",
    "Draft reminder emails for the top 5 delinquent residents",
  ],
  "leasing-funnel": [
    "Where in the funnel is leasing leaking the most?",
    "Compare conversion rate by source",
    "Project next month's leases at current pace",
    "Highlight the property with the worst tour-to-app rate",
  ],
  "open-work-orders": [
    "Which property has the worst MTTR right now?",
    "Show me overdue emergency work orders",
    "Compare in-house vs. vendor turnaround",
    "Summarize what changed in the last 7 days",
  ],
};

export function startersFor(reportId: string): string[] {
  return REPORT_STARTERS[reportId] ?? GENERIC_STARTERS;
}
