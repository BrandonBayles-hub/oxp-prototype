export type EliAgentSlug =
  | "bi-eli-leasing-ai"
  | "bi-eli-renewals-ai"
  | "bi-eli-maintenance-ai"
  | "bi-eli-payments-ai";

export type BlockType =
  | "section-header"
  | "kpi-card"
  | "sparkline-strip"
  | "combo-chart-dual"
  | "line-chart"
  | "multi-line-chart"
  | "bar-chart"
  | "multi-bar-chart"
  | "stacked-bar-chart"
  | "horizontal-bar"
  | "forecast-bar"
  | "donut-chart"
  | "combo-chart"
  | "combo-stacked"
  | "funnel-chart"
  | "treemap"
  | "word-cloud"
  | "heatmap-calendar"
  | "choropleth-map"
  | "pivot-table"
  | "data-table";

export type BlockWidth =
  | "full"
  | "half"
  | "third"
  | "quarter"
  | "fifth"
  | "two-thirds"
  | "three-quarters";

export interface DashboardBlock {
  type: BlockType;
  width: BlockWidth;
  title?: string;
  order: number;
  config: Record<string, any>;
  mockValue?: string | number;
  mockDelta?: { direction: "up" | "down" | "flat"; label: string };
  mockSub?: string;
  mockRows?: Array<{ label: string; value: number | string }>;
  mockSlices?: Array<{ label: string; value: number }>;
  mockStages?: Array<{ label: string; value: number }>;
  mockTrend?: Array<{ label: string; value: number; baseline?: number }>;
  mockMultiTrend?: Array<{
    label: string;
    values: Record<string, number>;
  }>;
  mockStacks?: Array<{
    label: string;
    segments: Array<{ name: string; value: number }>;
    lineValue?: number;
  }>;
  mockHeatmap?: {
    weeks: Array<Array<{ label: number | string; value: number | null }>>;
    total: number | string;
  };
  mockTreemap?: Array<{ label: string; value: number; pct: number }>;
  mockWordCloud?: Array<{ label: string; weight: number }>;
  mockMapRegions?: Array<{ code: string; label: string; value: number }>;
  mockPivot?: {
    columns: string[];
    rows: Array<Array<string | number>>;
    subtitle?: string;
  };
  mockSparklines?: Array<{
    label: string;
    value: string;
    sub?: string;
    values: number[];
  }>;
  mockDualSeries?: {
    labels: string[];
    bars: Array<{ name: string; values: number[] }>;
    line: { name: string; values: number[] };
  };
  mockTableRows?: Array<Record<string, any>>;
  mockTableColumns?: Array<{ key: string; label: string; format: string }>;
}

export interface EliDashboard {
  slug: EliAgentSlug | string;
  title: string;
  titleSuffix?: string;
  description: string;
  iconSrc?: string;
  headlineKpi: { label: string; value: string; sub: string };
  blocks: DashboardBlock[];
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function mockTrend(seed: number, base: number, variance: number, points = 12): Array<{ label: string; value: number; baseline?: number }> {
  const rng = seededRandom(seed);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months.slice(0, points).map((m) => ({
    label: m,
    value: Math.round(base + (rng() - 0.3) * variance),
    baseline: Math.round(base * 0.82 + (rng() - 0.5) * variance * 0.3),
  }));
}

// ─── LEASING AI (50 blocks) ───────────────────────────────────────────────────

const LEASING_AI_BLOCKS: DashboardBlock[] = [
  { type: "section-header", width: "full", order: 1, config: { title: "ELI+ Metrics Dashboard", subtitle: "Activation, conversion headline, and chatbot + voice leads" } },
  { type: "kpi-card", width: "third", title: "Customers With Leasing AI", order: 2, config: {}, mockValue: "142", mockSub: "activated organizations", mockDelta: { direction: "up", label: "+12" } },
  { type: "kpi-card", width: "third", title: "Total Properties with Leasing AI", order: 3, config: {}, mockValue: "1,284", mockSub: "properties activated", mockDelta: { direction: "up", label: "+86" } },
  { type: "kpi-card", width: "third", title: "Total Active Units", order: 4, config: {}, mockValue: "48,320", mockSub: "units on platform", mockDelta: { direction: "up", label: "+2,140" } },
  { type: "kpi-card", width: "half", title: "Guest Card → Tour Conversion", order: 5, config: {}, mockValue: "34.2%", mockSub: "conversion rate", mockDelta: { direction: "up", label: "+3.1 pts" } },
  { type: "kpi-card", width: "half", title: "Leads → Application Started", order: 6, config: {}, mockValue: "22.1%", mockSub: "conversion rate", mockDelta: { direction: "up", label: "+1.8 pts" } },
  { type: "line-chart", width: "full", title: "Guest Card → Tour Conversion — Monthly", order: 7, config: {}, mockTrend: mockTrend(201, 32, 8) },
  { type: "kpi-card", width: "half", title: "Chatbot Conversations", order: 8, config: {}, mockValue: "18,412", mockSub: "total conversations", mockDelta: { direction: "up", label: "+14%" } },
  { type: "kpi-card", width: "half", title: "Leads Created by Chatbot", order: 9, config: {}, mockValue: "4,218", mockSub: "chatbot-generated leads", mockDelta: { direction: "up", label: "+9%" } },
  { type: "kpi-card", width: "half", title: "Voice Conversations", order: 10, config: {}, mockValue: "6,842", mockSub: "voice interactions", mockDelta: { direction: "up", label: "+22%" } },
  { type: "kpi-card", width: "half", title: "Leads Created by Voice", order: 11, config: {}, mockValue: "1,890", mockSub: "voice-generated leads", mockDelta: { direction: "up", label: "+18%" } },
  { type: "section-header", width: "full", order: 12, config: { title: "Communication", subtitle: "SMS, email, and response-rate analytics" } },
  { type: "kpi-card", width: "quarter", title: "SMS Received", order: 13, config: {}, mockValue: "24,180", mockSub: "inbound SMS", mockDelta: { direction: "up", label: "+11%" } },
  { type: "kpi-card", width: "quarter", title: "SMS Sent", order: 14, config: {}, mockValue: "31,420", mockSub: "outbound SMS", mockDelta: { direction: "up", label: "+8%" } },
  { type: "kpi-card", width: "quarter", title: "Emails Sent", order: 15, config: {}, mockValue: "12,840", mockSub: "outbound emails", mockDelta: { direction: "up", label: "+5%" } },
  { type: "kpi-card", width: "quarter", title: "Emails Received", order: 16, config: {}, mockValue: "8,920", mockSub: "inbound emails", mockDelta: { direction: "up", label: "+3%" } },
  { type: "donut-chart", width: "half", title: "Sent SMS vs Sent Email", order: 17, config: {}, mockSlices: [{ label: "SMS", value: 31420 }, { label: "Email", value: 12840 }] },
  { type: "donut-chart", width: "half", title: "Received SMS vs Received Email", order: 18, config: {}, mockSlices: [{ label: "SMS", value: 24180 }, { label: "Email", value: 8920 }] },
  { type: "kpi-card", width: "half", title: "SMS Avg Response Rate", order: 19, config: {}, mockValue: "42.8%", mockSub: "of SMS received a reply", mockDelta: { direction: "up", label: "+2.1 pts" } },
  { type: "kpi-card", width: "half", title: "Email Avg Response Rate", order: 20, config: {}, mockValue: "18.4%", mockSub: "of emails received a reply", mockDelta: { direction: "down", label: "−0.3 pts" } },
  { type: "kpi-card", width: "half", title: "Saved Hours — SMS", order: 21, config: {}, mockValue: "1,284", mockSub: "staff hours saved", mockDelta: { direction: "up", label: "+180 hrs" } },
  { type: "kpi-card", width: "half", title: "Saved Hours — Email", order: 22, config: {}, mockValue: "642", mockSub: "staff hours saved", mockDelta: { direction: "up", label: "+86 hrs" } },
  { type: "kpi-card", width: "quarter", title: "Phone OptOut Ratio", order: 23, config: {}, mockValue: "2.1%", mockSub: "of contacts", mockDelta: { direction: "down", label: "−0.2 pts" } },
  { type: "kpi-card", width: "quarter", title: "Phone OptOuts", order: 24, config: {}, mockValue: "312", mockSub: "total opt-outs" },
  { type: "kpi-card", width: "quarter", title: "Email OptOuts", order: 25, config: {}, mockValue: "186", mockSub: "total opt-outs" },
  { type: "kpi-card", width: "quarter", title: "Email OptOut Ratio", order: 26, config: {}, mockValue: "1.4%", mockSub: "of contacts", mockDelta: { direction: "down", label: "−0.1 pts" } },
  { type: "kpi-card", width: "full", title: "Savings from Office Hours", order: 27, config: {}, mockValue: "$186,420", mockSub: "estimated cost savings · last 30 days", mockDelta: { direction: "up", label: "+$24K" } },
  { type: "data-table", width: "full", title: "Savings from Office Hours — Details", order: 28, config: {}, mockRows: [
    { label: "Hillside Living", value: "$42,180" }, { label: "Jamison Apartments", value: "$38,920" },
    { label: "The Beacon", value: "$31,440" }, { label: "Parkview Flats", value: "$28,120" },
    { label: "Summit Ridge", value: "$24,380" }, { label: "Other (15)", value: "$21,380" },
  ] },
  { type: "data-table", width: "full", title: "Activation Date", order: 29, config: {}, mockRows: [
    { label: "Hillside Living", value: "Jan 2026" }, { label: "Jamison Apartments", value: "Feb 2026" },
    { label: "The Beacon", value: "Feb 2026" }, { label: "Parkview Flats", value: "Mar 2026" },
  ] },
  { type: "line-chart", width: "full", title: "Leads Over Time", order: 30, config: {}, mockTrend: mockTrend(301, 420, 120) },
  { type: "kpi-card", width: "full", title: "Total Leads", order: 31, config: {}, mockValue: "6,108", mockSub: "all channels · last 30 days", mockDelta: { direction: "up", label: "+12%" } },
  { type: "kpi-card", width: "third", title: "Voice Potential Leads", order: 32, config: {}, mockValue: "1,890", mockSub: "voice channel", mockDelta: { direction: "up", label: "+18%" } },
  { type: "donut-chart", width: "third", title: "Leads per Channel", order: 33, config: {}, mockSlices: [{ label: "Chat", value: 4218 }, { label: "Voice", value: 1890 }] },
  { type: "kpi-card", width: "third", title: "Chatbot Leads", order: 34, config: {}, mockValue: "4,218", mockSub: "chat channel", mockDelta: { direction: "up", label: "+9%" } },
  { type: "data-table", width: "full", title: "Leads per Source", order: 35, config: {}, mockRows: [
    { label: "Zillow", value: "1,842" }, { label: "Property Website", value: "1,284" },
    { label: "Apartments.com", value: "986" }, { label: "Online Listing", value: "624" },
    { label: "Paid Search", value: "412" }, { label: "Apartment List", value: "318" },
    { label: "Live/Work in Area", value: "214" }, { label: "Greystar.com", value: "186" },
    { label: "Paid Display", value: "124" }, { label: "Local Internet", value: "68" },
    { label: "Apartment Locator", value: "32" }, { label: "Unknown", value: "18" },
  ] },
  { type: "section-header", width: "full", order: 36, config: { title: "Escalations", subtitle: "Office escalation reasons, volume, and voice transfer metrics" } },
  { type: "donut-chart", width: "full", title: "Escalation Reasons", order: 37, config: {}, mockSlices: [
    { label: "Ask to Contact Office", value: 312 }, { label: "Policies", value: 186 },
    { label: "Application Issue", value: 142 }, { label: "Technical Issue", value: 98 },
    { label: "Other", value: 86 }, { label: "Furnish", value: 64 },
    { label: "Pricing", value: 52 }, { label: "Amenities", value: 38 },
    { label: "Unsubscribed", value: 24 }, { label: "Awaiting Lease", value: 18 },
  ] },
  { type: "kpi-card", width: "half", title: "Office Escalations", order: 38, config: {}, mockValue: "1,020", mockSub: "total escalations", mockDelta: { direction: "down", label: "−8%" } },
  { type: "kpi-card", width: "half", title: "Escalations % of Total Leads", order: 39, config: {}, mockValue: "16.7%", mockSub: "escalation rate", mockDelta: { direction: "down", label: "−1.2 pts" } },
  { type: "kpi-card", width: "half", title: "Voice Calls % Transferred to Office", order: 40, config: {}, mockValue: "24.8%", mockSub: "of voice calls", mockDelta: { direction: "down", label: "−2.1 pts" } },
  { type: "kpi-card", width: "half", title: "Voice Calls Transferred to Office", order: 41, config: {}, mockValue: "469", mockSub: "total transfers" },
  { type: "kpi-card", width: "half", title: "Guided Tours During Office Hours", order: 42, config: {}, mockValue: "412", mockSub: "tours booked", mockDelta: { direction: "up", label: "+14%" } },
  { type: "kpi-card", width: "half", title: "Guided Tours Outside Office Hours", order: 43, config: {}, mockValue: "200", mockSub: "after-hours tours", mockDelta: { direction: "up", label: "+32%" } },
  { type: "kpi-card", width: "half", title: "Self-Guided Tours (Office Hours)", order: 44, config: {}, mockValue: "186", mockSub: "self-guided", mockDelta: { direction: "up", label: "+18%" } },
  { type: "kpi-card", width: "half", title: "Self-Guided Tours (After Hours)", order: 45, config: {}, mockValue: "142", mockSub: "after-hours self-guided", mockDelta: { direction: "up", label: "+24%" } },
  { type: "funnel-chart", width: "full", title: "Leads Funnel — Message Sent After Tour", order: 46, config: {}, mockStages: [
    { label: "Guest Card Completed", value: 6108 },
    { label: "Application Started", value: 2842 },
    { label: "Application Completed", value: 2180 },
    { label: "Application Approved", value: 1920 },
    { label: "Lease Started", value: 1640 },
    { label: "Lease Completed", value: 1284 },
    { label: "Lease Approved", value: 1142 },
  ] },
  { type: "section-header", width: "full", order: 47, config: { title: "Appendix" } },
  { type: "kpi-card", width: "half", title: "Converted to Application Started", order: 48, config: {}, mockValue: "46.5%", mockSub: "of guest cards", mockDelta: { direction: "up", label: "+2.8 pts" } },
  { type: "kpi-card", width: "half", title: "Lead to Leases Approved", order: 49, config: {}, mockValue: "18.7%", mockSub: "end-to-end conversion", mockDelta: { direction: "up", label: "+1.4 pts" } },
];

// ─── PAYMENTS AI (26 blocks) ────────────────────────────────────────────────

const PAYMENTS_AI_BLOCKS: DashboardBlock[] = [
  { type: "section-header", width: "full", order: 1, config: { title: "ELI+ Metrics Dashboard", subtitle: "Activation, collections, and savings headline" } },
  { type: "kpi-card", width: "third", title: "Total Organizations", order: 2, config: {}, mockValue: "98", mockSub: "activated", mockDelta: { direction: "up", label: "+8" } },
  { type: "kpi-card", width: "third", title: "Total Properties", order: 3, config: {}, mockValue: "842", mockSub: "properties", mockDelta: { direction: "up", label: "+62" } },
  { type: "kpi-card", width: "third", title: "Total Active Units", order: 4, config: {}, mockValue: "34,120", mockSub: "units", mockDelta: { direction: "up", label: "+1,840" } },
  { type: "kpi-card", width: "third", title: "% of Rent Collected", order: 5, config: {}, mockValue: "94.2%", mockSub: "collection rate", mockDelta: { direction: "up", label: "+2.1 pts" } },
  { type: "bar-chart", width: "third", title: "Late Payers (After Grace Period)", order: 6, config: {}, mockTrend: mockTrend(401, 180, 60) },
  { type: "kpi-card", width: "third", title: "Rent Payments / Charges / % Collected", order: 7, config: {}, mockValue: "$2.4M / $2.54M", mockSub: "payments vs charges" },
  { type: "kpi-card", width: "full", title: "Savings from Office Hours", order: 8, config: {}, mockValue: "$127,840", mockSub: "estimated savings · last 30 days", mockDelta: { direction: "up", label: "+$18K" } },
  { type: "bar-chart", width: "half", title: "Top 10 — % Collected", order: 9, config: {}, mockRows: [
    { label: "Summit Ridge", value: 98.4 }, { label: "Hillside Living", value: 97.2 },
    { label: "The Beacon", value: 96.8 }, { label: "Parkview Flats", value: 96.1 },
    { label: "Jamison Apts", value: 95.8 },
  ] },
  { type: "bar-chart", width: "half", title: "Bottom 10 — % Collected", order: 10, config: {}, mockRows: [
    { label: "Lakewood", value: 88.2 }, { label: "Maple Court", value: 89.1 },
    { label: "Cedar Hills", value: 90.4 }, { label: "Pine Valley", value: 91.2 },
    { label: "Oak Terrace", value: 91.8 },
  ] },
  { type: "data-table", width: "full", title: "Savings from Office Hours — Details", order: 11, config: {}, mockRows: [
    { label: "Hillside Living", value: "$32,180" }, { label: "Jamison Apartments", value: "$28,420" },
    { label: "The Beacon", value: "$24,120" }, { label: "Parkview Flats", value: "$21,840" },
    { label: "Summit Ridge", value: "$21,280" },
  ] },
  { type: "section-header", width: "full", order: 12, config: { title: "Messaging", subtitle: "Reminder volume, response rates, and opt-outs" } },
  { type: "kpi-card", width: "quarter", title: "Residents with No Phone", order: 13, config: {}, mockValue: "1,842", mockSub: "no phone on file" },
  { type: "kpi-card", width: "quarter", title: "Phone Opt Outs", order: 14, config: {}, mockValue: "3.2%", mockSub: "opt-out rate" },
  { type: "kpi-card", width: "quarter", title: "Email Opt Outs", order: 15, config: {}, mockValue: "1.8%", mockSub: "opt-out rate" },
  { type: "kpi-card", width: "quarter", title: "Total Reminders Sent", order: 16, config: {}, mockValue: "42,180", mockSub: "SMS + email", mockDelta: { direction: "up", label: "+12%" } },
  { type: "bar-chart", width: "full", title: "Office Escalation Reasons", order: 18, config: {}, mockRows: [
    { label: "Late Payment Settlement", value: 286 }, { label: "Balance Breakdown", value: 198 },
    { label: "Ask to Contact", value: 142 }, { label: "Other", value: 98 },
    { label: "General Info", value: 86 }, { label: "Payment Assistance", value: 72 },
    { label: "Maintenance", value: 48 }, { label: "Technical Problems", value: 32 },
  ] },
  { type: "donut-chart", width: "full", title: "Language Preference", order: 19, config: {}, mockSlices: [
    { label: "English", value: 84 }, { label: "Spanish", value: 14 }, { label: "Other", value: 2 },
  ] },
  { type: "section-header", width: "full", order: 20, config: { title: "Appendix", subtitle: "Detailed property-level and daily breakdowns" } },
  { type: "kpi-card", width: "quarter", title: "Avg Late Payers", order: 21, config: {}, mockValue: "142", mockSub: "per property avg" },
  { type: "data-table", width: "full", title: "Rent Payments / Charges / % Collected", order: 22, config: {}, mockRows: [
    { label: "Hillside Living", value: "97.2%" }, { label: "Jamison Apartments", value: "95.8%" },
    { label: "The Beacon", value: "96.8%" }, { label: "Parkview Flats", value: "94.1%" },
  ] },
];

// ─── MAINTENANCE AI (20 blocks) ─────────────────────────────────────────────

const MAINTENANCE_AI_BLOCKS: DashboardBlock[] = [
  { type: "section-header", width: "full", order: 1, config: { title: "Maintenance", subtitle: "Activation and work order headline metrics" } },
  { type: "kpi-card", width: "third", title: "Total Units Using AI", order: 2, config: {}, mockValue: "28,420", mockSub: "units on platform", mockDelta: { direction: "up", label: "+1,240" } },
  { type: "kpi-card", width: "third", title: "Units AI Usage Rate", order: 3, config: {}, mockValue: "64.2%", mockSub: "of total units", mockDelta: { direction: "up", label: "+4.1 pts" } },
  { type: "kpi-card", width: "third", title: "ELI+ Submitted Work Orders", order: 4, config: {}, mockValue: "4,842", mockSub: "AI-submitted WOs", mockDelta: { direction: "up", label: "+18%" } },
  { type: "line-chart", width: "full", title: "Monthly Trends — Work Orders Submitted", order: 5, config: {}, mockTrend: mockTrend(501, 400, 120) },
  { type: "kpi-card", width: "third", title: "Open Work Orders", order: 6, config: {}, mockValue: "312", mockSub: "currently open", mockDelta: { direction: "down", label: "−14%" } },
  { type: "kpi-card", width: "third", title: "Completed Work Orders", order: 7, config: {}, mockValue: "4,186", mockSub: "completed this period", mockDelta: { direction: "up", label: "+22%" } },
  { type: "kpi-card", width: "third", title: "Cancelled Work Orders", order: 8, config: {}, mockValue: "344", mockSub: "cancelled", mockDelta: { direction: "down", label: "−6%" } },
  { type: "kpi-card", width: "full", title: "ELI+ Avg Days to Complete WO", order: 9, config: {}, mockValue: "1.4", mockSub: "days average · vs 2.8 days baseline", mockDelta: { direction: "down", label: "−1.4 days" } },
  { type: "donut-chart", width: "full", title: "Work Order Status Distribution", order: 10, config: {}, mockSlices: [
    { label: "Completed", value: 4186 }, { label: "Cancelled", value: 344 },
    { label: "New", value: 142 }, { label: "Awaiting Parts", value: 86 },
    { label: "In Progress", value: 84 },
  ] },
  { type: "data-table", width: "full", title: "ELI+ Work Orders", order: 11, config: {}, mockRows: [
    { label: "Hillside Living", value: "1,284 submitted · 1,186 completed" },
    { label: "Jamison Apartments", value: "986 submitted · 912 completed" },
    { label: "The Beacon", value: "842 submitted · 786 completed" },
    { label: "Parkview Flats", value: "624 submitted · 580 completed" },
  ] },
  { type: "kpi-card", width: "third", title: "WOs Created by SMS", order: 12, config: {}, mockValue: "2,418", mockSub: "SMS-initiated", mockDelta: { direction: "up", label: "+24%" } },
  { type: "donut-chart", width: "third", title: "ELI+ Source", order: 13, config: {}, mockSlices: [
    { label: "SMS", value: 2418 }, { label: "Chat", value: 1842 }, { label: "Unknown", value: 582 },
  ] },
  { type: "kpi-card", width: "third", title: "WOs Created by Chat", order: 14, config: {}, mockValue: "1,842", mockSub: "chat-initiated", mockDelta: { direction: "up", label: "+18%" } },
  { type: "kpi-card", width: "third", title: "Messages Received", order: 15, config: {}, mockValue: "12,480", mockSub: "inbound messages", mockDelta: { direction: "up", label: "+11%" } },
  { type: "kpi-card", width: "third", title: "Messages Sent", order: 16, config: {}, mockValue: "18,240", mockSub: "outbound messages", mockDelta: { direction: "up", label: "+8%" } },
  { type: "kpi-card", width: "third", title: "Received / Sent Ratio", order: 17, config: {}, mockValue: "0.68", mockSub: "ratio" },
  { type: "data-table", width: "full", title: "Conversation Analysis", order: 18, config: {}, mockRows: [
    { label: "Hillside Living", value: "4,218 in · 6,120 out · 42% response" },
    { label: "Jamison Apartments", value: "3,186 in · 4,840 out · 38% response" },
    { label: "The Beacon", value: "2,842 in · 4,120 out · 44% response" },
  ] },
  { type: "line-chart", width: "full", title: "Incoming Messages per Day", order: 19, config: {}, mockTrend: mockTrend(502, 140, 50) },
];

// ─── RENEWALS AI (25 blocks) ────────────────────────────────────────────────

const RENEWALS_AI_BLOCKS: DashboardBlock[] = [
  { type: "section-header", width: "full", order: 1, config: { title: "ELI+ Renewals AI Report", subtitle: "Renewal outcomes, outreach volume, and escalations" } },
  { type: "kpi-card", width: "third", title: "Renewed Residents", order: 2, config: {}, mockValue: "2,418", mockSub: "residents renewed", mockDelta: { direction: "up", label: "+14%" } },
  { type: "line-chart", width: "third", title: "Total Renewed Residents Over Month", order: 3, config: {}, mockTrend: mockTrend(601, 200, 60) },
  { type: "kpi-card", width: "third", title: "Renewal Ratio", order: 4, config: {}, mockValue: "74%", mockSub: "renewal rate", mockDelta: { direction: "up", label: "+4 pts" } },
  { type: "line-chart", width: "third", title: "Renewed / Contacted Over Month", order: 5, config: {}, mockTrend: mockTrend(602, 72, 12) },
  { type: "kpi-card", width: "third", title: "3 Month Renewal Ratio", order: 6, config: {}, mockValue: "71.2%", mockSub: "3-month average", mockDelta: { direction: "up", label: "+2.8 pts" } },
  { type: "kpi-card", width: "third", title: "Residents Up for Renewal", order: 7, config: {}, mockValue: "3,264", mockSub: "upcoming renewals" },
  { type: "kpi-card", width: "third", title: "Avg Days to Renew", order: 8, config: {}, mockValue: "9.2", mockSub: "vs 14.1 baseline", mockDelta: { direction: "down", label: "−4.9 days" } },
  { type: "section-header", width: "full", order: 9, config: { title: "Staff Time Saved", subtitle: "Hours saved and reminder volume" } },
  { type: "kpi-card", width: "full", title: "Staff Time Saved (Hours)", order: 10, config: {}, mockValue: "1,842", mockSub: "staff hours saved", mockDelta: { direction: "up", label: "+240 hrs" } },
  { type: "kpi-card", width: "half", title: "Total Reminder Messages", order: 11, config: {}, mockValue: "18,420", mockSub: "messages sent", mockDelta: { direction: "up", label: "+12%" } },
  { type: "donut-chart", width: "half", title: "SMS vs Email", order: 12, config: {}, mockSlices: [{ label: "SMS", value: 12840 }, { label: "Email", value: 5580 }] },
  { type: "kpi-card", width: "third", title: "SMS Sent", order: 13, config: {}, mockValue: "12,840", mockSub: "outbound SMS", mockDelta: { direction: "up", label: "+8%" } },
  { type: "line-chart", width: "third", title: "SMS Sent Over Months", order: 14, config: {}, mockTrend: mockTrend(603, 1080, 300) },
  { type: "kpi-card", width: "third", title: "Resident Response Rate", order: 15, config: {}, mockValue: "38.4%", mockSub: "response rate", mockDelta: { direction: "up", label: "+2.1 pts" } },
  { type: "line-chart", width: "full", title: "Response Rate Over Months", order: 16, config: {}, mockTrend: mockTrend(604, 36, 8) },
  { type: "bar-chart", width: "full", title: "Reasons for Non-Renewal", order: 17, config: {}, mockRows: [
    { label: "Price", value: 412 }, { label: "Moving", value: 286 },
    { label: "Buying", value: 184 }, { label: "Other", value: 142 },
  ] },
  { type: "section-header", width: "full", order: 18, config: { title: "Escalations", subtitle: "Escalation rate, volume, and resolution status" } },
  { type: "kpi-card", width: "quarter", title: "Escalation Rate", order: 19, config: {}, mockValue: "12.4%", mockSub: "of contacted", mockDelta: { direction: "down", label: "−1.8 pts" } },
  { type: "kpi-card", width: "quarter", title: "Total Escalations", order: 20, config: {}, mockValue: "406", mockSub: "escalations" },
  { type: "kpi-card", width: "quarter", title: "Open", order: 21, config: {}, mockValue: "42", mockSub: "open escalations" },
  { type: "kpi-card", width: "quarter", title: "Resolved", order: 22, config: {}, mockValue: "364", mockSub: "resolved", mockDelta: { direction: "up", label: "+89%" } },
  { type: "donut-chart", width: "full", title: "Renewal Intents", order: 23, config: {}, mockSlices: [
    { label: "Wants to Renew", value: 1842 }, { label: "Other", value: 412 },
    { label: "Does Not Want to Renew", value: 318 }, { label: "New Lease Questions", value: 186 },
    { label: "Needs Different Apt", value: 124 }, { label: "Technical Problems", value: 42 },
  ] },
  { type: "donut-chart", width: "full", title: "Renewals Intent Distribution", order: 24, config: {}, mockSlices: [
    { label: "Does Not Renew", value: 318 }, { label: "Considering", value: 412 },
  ] },
];

export const ELI_DASHBOARDS: Record<EliAgentSlug, EliDashboard> = {
  "bi-eli-leasing-ai": {
    slug: "bi-eli-leasing-ai",
    title: "ELI+ Leasing AI",
    titleSuffix: "— Impact",
    description: "ELI+ Leasing AI performance dashboard — layout mirrors the Domo ELI+ | Leasing AI report (14 pages)",
    iconSrc: "/eli-cube.svg",
    headlineKpi: { label: "Signed leases", value: "1,142", sub: "last 30 days · +18% vs prior" },
    blocks: LEASING_AI_BLOCKS,
  },
  "bi-eli-payments-ai": {
    slug: "bi-eli-payments-ai",
    title: "ELI+ Payments AI",
    titleSuffix: "— Impact",
    description: "ELI+ Payments agent performance, collection impact, and delinquency reduction — mirrors the Domo ELI+ | Payments AI report",
    iconSrc: "/eli-cube.svg",
    headlineKpi: { label: "On-time payment rate", value: "94.2%", sub: "last 30 days · +2.1 pts vs prior" },
    blocks: PAYMENTS_AI_BLOCKS,
  },
  "bi-eli-maintenance-ai": {
    slug: "bi-eli-maintenance-ai",
    title: "ELI+ Maintenance AI",
    titleSuffix: "— Impact",
    description: "ELI+ Maintenance agent performance, work order routing, and resolution analytics — mirrors the Domo ELI+ | Maintenance AI report",
    iconSrc: "/eli-cube.svg",
    headlineKpi: { label: "Work orders resolved", value: "4,186", sub: "last 30 days · 94% within SLA" },
    blocks: MAINTENANCE_AI_BLOCKS,
  },
  "bi-eli-renewals-ai": {
    slug: "bi-eli-renewals-ai",
    title: "ELI+ Renewals AI",
    titleSuffix: "— Impact",
    description: "ELI+ Renewals agent performance, renewal rate impact, and offer analytics — mirrors the Domo ELI+ | Renewals AI report",
    iconSrc: "/eli-cube.svg",
    headlineKpi: { label: "Renewal rate", value: "74%", sub: "last 30 days · +4 pts vs prior" },
    blocks: RENEWALS_AI_BLOCKS,
  },
};

export const ELI_DASHBOARD_ORDER: EliAgentSlug[] = [
  "bi-eli-leasing-ai",
  "bi-eli-renewals-ai",
  "bi-eli-maintenance-ai",
  "bi-eli-payments-ai",
];

export function getDashboard(slug: string): EliDashboard | null {
  return ELI_DASHBOARDS[slug as EliAgentSlug] ?? null;
}

export function getSparklineValues(seed: number, count = 12): number[] {
  const rng = seededRandom(seed);
  const values: number[] = [];
  let v = 50;
  for (let i = 0; i < count; i++) {
    v = Math.max(10, Math.min(90, v + (rng() - 0.45) * 20));
    values.push(Math.round(v));
  }
  return values;
}
