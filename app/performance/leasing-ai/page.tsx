"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, Info, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  CHART_GRID_STROKE,
  EscalationsSection,
  ExportCsvButton,
  MetricTrendDrillIn,
  ReportFilterBar,
  ReportPageHeader,
  SectionBanner,
  SegmentedToggle,
  StatCard,
  buildSeededMetricTrend,
  buildWeightedCategoryTrends,
  DAY_OF_WEEK_TREND_WEIGHTS,
  HOUR_BUCKET_TREND_WEIGHTS,
  exportAgentMetricCsv,
  monthsForPeriod,
  selectionRatio,
  seriesColor,
  seriesColorMap,
  useReportScope,
  type ReportFilters,
  type ReportViewMode,
} from "@/components/performance";

// -----------------------------------------------------------------------------
// Static config (illustrative prototype data)
// -----------------------------------------------------------------------------

const PROPERTIES = [
  "Cedar Hills",
  "Hillside Living",
  "Jamison Apartments",
  "Lakewood",
  "Maple Court",
  "Oak Terrace",
  "Parkview Flats",
  "Pine Valley",
  "Summit Ridge",
  "The Beacon",
] as const;

type Property = (typeof PROPERTIES)[number];

type ReportVersion = "original" | "jvm" | "golden";

const REPORT_VERSION_OPTIONS = [
  { value: "original", label: "Original" },
  { value: "jvm", label: "Alpha Launch" },
  { value: "golden", label: "Golden Prototype" },
] as const;

/** Property series colors come from the shared ordered palette so a given
 *  property keeps the same color on every report it appears in. */
const PROPERTY_COLORS: Record<Property, string> = seriesColorMap(PROPERTIES);

// Vivid categorical palette used to color single-series bar charts and donuts.
const CHART_PALETTE = [
  seriesColor(0), // blue
  seriesColor(1), // emerald
  seriesColor(2), // amber
  seriesColor(5), // red
  seriesColor(3), // violet
  seriesColor(4), // cyan
  seriesColor(5), // pink
  seriesColor(6), // lime
];

// -----------------------------------------------------------------------------
// Trend data helpers
// -----------------------------------------------------------------------------

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function seedRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface MonthlyPoint {
  month: string;
  monthIdx: number;
  current: number;
  baseline: number;
  perProperty: Record<Property, number>;
}

function buildMonthlyTrend(seed: number, baseStart: number, baseEnd: number, currentStart: number, currentEnd: number, perPropertySpread = 30) {
  const rand = seedRand(seed);
  const data: MonthlyPoint[] = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const baseline = baseStart + (baseEnd - baseStart) * t + (rand() - 0.5) * 0.8;
    const current = currentStart + (currentEnd - currentStart) * t + (rand() - 0.5) * 0.8;
    const perProperty = {} as Record<Property, number>;
    PROPERTIES.forEach((p, idx) => {
      const offset = (idx - PROPERTIES.length / 2) * (perPropertySpread / PROPERTIES.length);
      perProperty[p] = Math.round(current + offset + (rand() - 0.5) * (perPropertySpread / 6));
    });
    data.push({
      month: MONTH_LABELS[i],
      monthIdx: i,
      current: Math.round(current),
      baseline: Math.round(baseline),
      perProperty,
    });
  }
  return data;
}

const conversionRateTrend = buildMonthlyTrend(111, 9, 10, 11, 14, 6);
const signedLeasesTrend = buildMonthlyTrend(212, 140, 150, 160, 200, 90);
const rentAtSigningTrend = buildMonthlyTrend(313, 1740, 1760, 1790, 1840, 200);
const fullyAutomatedTrend = buildMonthlyTrend(414, 36, 40, 42, 48, 18);
const escalationResolutionTrend = buildMonthlyTrend(515, 2.6, 2.7, 2.7, 3.1, 0.7);

const conversionByBedrooms = MONTH_LABELS.map((m, i) => {
  const t = i / 11;
  return {
    month: m,
    "Studio": Math.round(8 + 5 * t + (i % 2) * 0.5),
    "1 BR": Math.round(11 + 5 * t + (i % 3) * 0.4),
    "2 BR": Math.round(13 + 5 * t + (i % 2) * 0.3),
    "3 BR": Math.round(15 + 5 * t + (i % 3) * 0.2),
  };
});

const rentAtSigningDistribution = [
  { bucket: "<$1.2K", count: 168 },
  { bucket: "$1.2–1.5K", count: 312 },
  { bucket: "$1.5–1.8K", count: 580 },
  { bucket: "$1.8–2.1K", count: 482 },
  { bucket: "$2.1–2.4K", count: 248 },
  { bucket: "$2.4K+", count: 130 },
];

const lostLeadReasons = [
  { reason: "Price", count: 482 },
  { reason: "Unit Unavailable", count: 318 },
  { reason: "Slow Response", count: 196 },
  { reason: "Moved Elsewhere", count: 168 },
  { reason: "Income / Credit", count: 124 },
  { reason: "Other", count: 142 },
];

const leadSourceMix = [
  { name: "ILS / Listing Sites", value: 38, count: 4012, color: seriesColor(0)},
  { name: "Property Website", value: 27, count: 2854, color: seriesColor(1)},
  { name: "Referral", value: 14, count: 1480, color: seriesColor(2)},
  { name: "Walk-in / Drive-by", value: 11, count: 1162, color: seriesColor(3)},
  { name: "Paid Search", value: 10, count: 1056, color: seriesColor(4)},
];

const leasingFunnel = [
  { stage: "Leads", count: 10564 },
  { stage: "Qualified", count: 6840 },
  { stage: "Tours Scheduled", count: 4128 },
  { stage: "Tours Completed", count: 3260 },
  { stage: "Applications", count: 2410 },
  { stage: "Approved", count: 2080 },
  { stage: "Signed", count: 1920 },
];

const termLengthVolume = [
  { term: "Month-to-Month", count: 86 },
  { term: "6 Months", count: 142 },
  { term: "9 Months", count: 168 },
  { term: "12 Months", count: 1320 },
  { term: "14 Months", count: 142 },
  { term: "15+ Months", count: 62 },
];

const applicationStatus = [
  { status: "Approved", count: 2080 },
  { status: "Pending Review", count: 184 },
  { status: "Conditional", count: 96 },
  { status: "Denied", count: 50 },
];

const leadEngagement = MONTH_LABELS.map((m, i) => {
  const t = i / 11;
  return {
    month: m,
    "Engaged %": Math.round(48 + 12 * t + (i % 2) * 0.5),
    "No Response %": Math.round(48 - 8 * t + (i % 2) * 0.4),
    "Opted Out %": Math.round(4 - 2 * t + (i % 3) * 0.2),
  };
});

const escalationReasons = [
  { reason: "Pricing Question", count: 174 },
  { reason: "Application Status", count: 138 },
  { reason: "Tour Scheduling", count: 92 },
  { reason: "Unit Availability", count: 64 },
  { reason: "Income Verification", count: 32 },
  { reason: "Other", count: 14 },
];

const outreachChannelMix = [
  { name: "SMS", value: 65, count: 15210, color: seriesColor(0)},
  { name: "Email", value: 35, count: 8190, color: seriesColor(1)},
];

// -----------------------------------------------------------------------------
// AI Operational Health data (DEV-298594)
// -----------------------------------------------------------------------------

const earlyTakeoverTrend = buildMonthlyTrend(616, 16, 18, 13, 12, 8);
const handoffRateTrend = buildMonthlyTrend(717, 28, 26, 22, 18, 10);
const taskResolutionTrend = buildMonthlyTrend(818, 72, 76, 84, 91, 12);
const medianResolutionTrend = buildMonthlyTrend(919, 14, 13, 8, 5, 4);

const handoffReasons = [
  { reason: "Complex Question", count: 216 },
  { reason: "Explicit Request", count: 159 },
  { reason: "Complaint", count: 82 },
  { reason: "System Error", count: 57 },
];

const pendingKnowledgeCategories = [
  { category: "Pet Policy Details", count: 48 },
  { category: "Parking Specifics", count: 34 },
  { category: "Income Requirements", count: 27 },
  { category: "Deposit Breakdown", count: 22 },
  { category: "Lease Term Options", count: 18 },
];

const taskStatusBreakdown = [
  { status: "Resolved on Time", count: 443 },
  { status: "Resolved (Late)", count: 33 },
  { status: "Open", count: 29 },
  { status: "Overdue", count: 9 },
];

// -----------------------------------------------------------------------------
// Agent Adoption data (DEV-301196)
// -----------------------------------------------------------------------------

const followUpRateTrend    = buildMonthlyTrend(1010, 58, 62, 64, 68,  8);
const taskCompletionTrend  = buildMonthlyTrend(1111, 71, 75, 78, 82,  7);
const medianResponseTrend  = buildMonthlyTrend(1212,  5.4, 4.6, 3.8, 2.4, 1.2);
const adoptionScoreTrend   = buildMonthlyTrend(1313, 59, 63, 67, 74, 10);

const adoptionTaskAging = [
  { bucket: "Due today",  count: 8,  fill: seriesColor(2) },
  { bucket: "1 day",      count: 12, fill: seriesColor(2) },
  { bucket: "2–3 days",   count: 14, fill: seriesColor(5) },
  { bucket: "4–7 days",   count: 9,  fill: seriesColor(5) },
  { bucket: "8+ days",    count: 4,  fill: seriesColor(5) },
];

const adoptionPropertyRows = [
  { property: "Riverside Apartments", score: 81, followUp: 74, taskRate: 88, medianHrs: 1.8, emailsSent: 312, smsSent: 201, callsDialed: 78, overdue: 9,  status: "Strong" },
  { property: "Sunset Ridge",         score: 77, followUp: 70, taskRate: 84, medianHrs: 2.1, emailsSent: 248, smsSent: 167, callsDialed: 61, overdue: 11, status: "Strong" },
  { property: "Oak Ridge Townhomes",  score: 68, followUp: 61, taskRate: 79, medianHrs: 3.2, emailsSent: 187, smsSent: 124, callsDialed: 44, overdue: 21, status: "Watch" },
  { property: "Harbor View Complex",  score: 44, followUp: 48, taskRate: 61, medianHrs: 5.7, emailsSent: 98,  smsSent: 67,  callsDialed: 22, overdue: 17, status: "Coaching" },
  { property: "Maple Court",          score: 32, followUp: 41, taskRate: 55, medianHrs: 7.4, emailsSent: 64,  smsSent: 38,  callsDialed: 11, overdue: 23, status: "At Risk" },
  { property: "Clearwater Heights",   score: 71, followUp: 65, taskRate: 81, medianHrs: 2.8, emailsSent: 193, smsSent: 141, callsDialed: 52, overdue: 14, status: "Watch" },
  { property: "The Beacon",           score: 84, followUp: 77, taskRate: 90, medianHrs: 1.5, emailsSent: 328, smsSent: 219, callsDialed: 82, overdue: 7,  status: "Strong" },
  { property: "Lakewood",             score: 29, followUp: 38, taskRate: 52, medianHrs: 8.1, emailsSent: 58,  smsSent: 31,  callsDialed: 9,  overdue: 27, status: "At Risk" },
];

const adoptionOutboundTrend = MONTH_LABELS.map((m, i) => {
  const t = i / 11;
  return {
    month: m,
    Emails: Math.round(38 + 14 * t + (i % 2) * 1.5),
    SMS:    Math.round(24 + 9  * t + (i % 3) * 1.0),
    Calls:  Math.round(9  + 4  * t + (i % 2) * 0.6),
  };
});

const agentActivityRows = [
  { agent: "Maria Santos",   property: "Riverside Apartments", emailsSent: 89,  smsSent: 54, prospectsAssisted: 24, resolvedTasks: 48, callsDialed: 19 },
  { agent: "James Okafor",   property: "Riverside Apartments", emailsSent: 72,  smsSent: 41, prospectsAssisted: 19, resolvedTasks: 38, callsDialed: 14 },
  { agent: "Sofia Reyes",    property: "Sunset Ridge",         emailsSent: 81,  smsSent: 49, prospectsAssisted: 22, resolvedTasks: 44, callsDialed: 17 },
  { agent: "Priya Nair",     property: "Oak Ridge Townhomes",  emailsSent: 44,  smsSent: 27, prospectsAssisted: 12, resolvedTasks: 21, callsDialed: 8  },
  { agent: "Derek Walsh",    property: "Harbor View Complex",  emailsSent: 21,  smsSent: 14, prospectsAssisted: 7,  resolvedTasks: 12, callsDialed: 4  },
  { agent: "Aisha Coleman",  property: "The Beacon",           emailsSent: 101, smsSent: 63, prospectsAssisted: 28, resolvedTasks: 55, callsDialed: 23 },
  { agent: "Marcus Webb",    property: "Clearwater Heights",   emailsSent: 68,  smsSent: 44, prospectsAssisted: 17, resolvedTasks: 31, callsDialed: 12 },
  { agent: "Lena Park",      property: "Oak Ridge Townhomes",  emailsSent: 39,  smsSent: 23, prospectsAssisted: 9,  resolvedTasks: 18, callsDialed: 6  },
  { agent: "Trevor Mills",   property: "Maple Court",          emailsSent: 29,  smsSent: 17, prospectsAssisted: 6,  resolvedTasks: 14, callsDialed: 4  },
  { agent: "Camille Dubois", property: "Lakewood",             emailsSent: 18,  smsSent: 11, prospectsAssisted: 3,  resolvedTasks: 9,  callsDialed: 2  },
];

// -----------------------------------------------------------------------------
// Period slicing — limits trend data to the selected period
// -----------------------------------------------------------------------------

function sliceTrend<T extends { monthIdx: number }>(data: T[], months: number): T[] {
  return data.slice(Math.max(0, data.length - months));
}

// -----------------------------------------------------------------------------
// Atomic UI primitives
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Filters
//
// Period / Properties / view-mode controls come from the shared ReportFilterBar
// so the bar has the same controls, order, defaults and position on every
// report. Only the property list is page-specific.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Trend chart — switches between baseline+current vs per-property lines
// -----------------------------------------------------------------------------

function TrendChart({
  data,
  view,
  selected,
  yDomain,
  height = 240,
}: {
  data: MonthlyPoint[];
  view: ReportViewMode;
  selected: Set<string>;
  yDomain?: [number, number];
  height?: number;
}) {
  if (view === "global") {
    const config = {
      baseline: { label: "Pre-AI Baseline", color: "hsl(222 10% 78%)" },
      current: { label: "Current", color: seriesColor(0) },
    } satisfies ChartConfig;
    return (
      <div>
        <ChartContainer config={config} className="!aspect-auto w-full" style={{ height }}>
          <LineChart data={data} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={32}
              domain={yDomain ?? [0, "auto"]}
            />
            <ChartTooltip content={<ChartTooltipContent className="min-w-[12rem]" />} />
            <Line
              type="monotone"
              dataKey="baseline"
              stroke={"hsl(222 10% 78%)"}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke={seriesColor(0)}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
        <div className="mt-1 flex items-center justify-center gap-4 text-xxs">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="h-px w-4 border-t border-dashed border-slate-400" />
            Pre-AI Baseline
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-blue-600" />
            <span className="font-medium text-foreground">Current</span>
          </span>
        </div>
      </div>
    );
  }

  const visibleProps = PROPERTIES.filter((p) => selected.has(p));
  const flat = data.map((d) => {
    const row: Record<string, number | string> = { month: d.month };
    for (const p of visibleProps) row[p] = d.perProperty[p];
    return row;
  });
  const config = Object.fromEntries(
    visibleProps.map((p) => [p, { label: p, color: PROPERTY_COLORS[p] }]),
  ) satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="!aspect-auto w-full" style={{ height }}>
      <LineChart data={flat} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} domain={yDomain ?? [0, "auto"]} />
        <ChartTooltip content={<ChartTooltipContent className="min-w-[14rem]" />} />
        {visibleProps.map((p) => (
          <Line
            key={p}
            type="monotone"
            dataKey={p}
            stroke={PROPERTY_COLORS[p]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

function PropertyChips({
  state,
  setState,
}: {
  state: ReportFilters;
  setState: (s: ReportFilters) => void;
}) {
  if (state.view !== "perProperty") return null;
  const list = PROPERTIES.filter((p) => state.properties.has(p));
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {list.map((p) => (
        <span
          key={p}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs"
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PROPERTY_COLORS[p] }} />
          {p}
          <button
            type="button"
            onClick={() => {
              const next = new Set(state.properties);
              next.delete(p);
              setState({ ...state, properties: next });
            }}
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Remove ${p}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Donut chart used for renewal intent + outreach mix
// -----------------------------------------------------------------------------

function DonutWithLegend({
  data,
  formatRow,
}: {
  data: { name: string; value: number; count: number; color: string }[];
  formatRow?: (d: { name: string; value: number; count: number }) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="h-[180px] w-[180px] shrink-0">
        <ChartContainer config={{}} className="!aspect-auto h-full w-full">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={1}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-3 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="flex-1 text-foreground">{d.name}</span>
            <span className="font-semibold text-foreground tabular-nums">
              {formatRow ? formatRow(d) : `${d.value}%`}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              ({d.count.toLocaleString()})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Beta KPIs — customer reporting (figures sourced from the Leasing AI beta report)
// -----------------------------------------------------------------------------
//
// Numbers marked REAL come directly from "Leasing AI beta KPIs" (Noah Properties,
// BMW Management, Topanga, Campbell Communities). Fields the report does not break
// out — property/unit counts, leads-by-source, tour office-hour splits,
// Voice/Chatbot lead counts, and (for Topanga/Campbell) escalation totals — are
// illustrative estimates so the prototype renders end-to-end.

interface ChannelStat {
  sent: number;
  received: number;
}

interface BetaFunnel {
  guestCardCompleted: number; // REAL
  archivedOrCancelled: number; // REAL (deducted)
  applicationStarted: number; // REAL
}

interface NamedCount {
  name: string;
  count: number;
}

interface BetaCustomer {
  id: string;
  name: string;
  period: string;
  periodDays: number;
  months: string[];
  properties: string[]; // est
  units: number; // est
  leadsByProperty: NamedCount[]; // est split, sums to total leads
  leadsTotal: number; // REAL for Campbell, est elsewhere
  leadsRespondedToIntro: number; // est
  leadsBySource: NamedCount[]; // est
  leadsFromVoice: number; // est
  leadsFromChatbot: number; // est (chatbot not released in reporting period)
  sms: ChannelStat; // REAL
  email: ChannelStat; // REAL
  voice: ChannelStat; // est
  funnel: BetaFunnel;
  conversionPct: number; // REAL (as reported)
  toursGuidedDuring: number; // est
  toursGuidedOutside: number; // est
  toursSelfDuring: number; // est
  toursSelfOutside: number; // est
  toursVirtual: number; // est
  escalationsTotal: number; // REAL (Noah, BMW) / est (Topanga, Campbell)
  escalationsEstimated: boolean;
  escalationReasons: NamedCount[]; // categories REAL, counts est
}


const BETA_CUSTOMERS: BetaCustomer[] = [
  {
    id: "noah",
    name: "Noah Properties",
    period: "Sep 19 – Dec 31, 2024",
    periodDays: 103,
    months: ["Sep", "Oct", "Nov", "Dec"],
    properties: ["Maple Court", "Oak Terrace", "Pine Valley", "Cedar Hills", "The Beacon", "Summit Ridge"],
    units: 1420,
    leadsByProperty: [
      { name: "Maple Court", count: 360 },
      { name: "Oak Terrace", count: 330 },
      { name: "Pine Valley", count: 300 },
      { name: "Cedar Hills", count: 290 },
      { name: "The Beacon", count: 280 },
      { name: "Summit Ridge", count: 260 },
    ],
    leadsTotal: 1820,
    leadsRespondedToIntro: 619,
    leadsBySource: [
      { name: "ILS / Listing Sites", count: 690 },
      { name: "Property Website", count: 470 },
      { name: "Referral", count: 250 },
      { name: "Walk-in / Drive-by", count: 230 },
      { name: "Paid Search", count: 180 },
    ],
    leadsFromVoice: 0,
    leadsFromChatbot: 0,
    sms: { sent: 2026, received: 699 },
    email: { sent: 1850, received: 223 },
    voice: { sent: 420, received: 185 },
    funnel: { guestCardCompleted: 1515, archivedOrCancelled: 565, applicationStarted: 64 },
    conversionPct: 7,
    toursGuidedDuring: 96,
    toursGuidedOutside: 88,
    toursSelfDuring: 41,
    toursSelfOutside: 63,
    toursVirtual: 34,
    escalationsTotal: 203,
    escalationsEstimated: false,
    escalationReasons: [
      { name: "Technical issues", count: 84 },
      { name: "No availability of preferred unit", count: 52 },
      { name: "Pricing question", count: 28 },
      { name: "Policies", count: 22 },
      { name: "Amenities question", count: 17 },
    ],
  },
  {
    id: "bmw",
    name: "BMW Management",
    period: "Activation – Dec 31, 2024",
    periodDays: 92,
    months: ["Oct", "Nov", "Dec"],
    properties: ["Riverside Apartments", "Sunset Ridge", "Harbor View Complex"],
    units: 560,
    leadsByProperty: [
      { name: "Riverside Apartments", count: 190 },
      { name: "Sunset Ridge", count: 160 },
      { name: "Harbor View Complex", count: 120 },
    ],
    leadsTotal: 470,
    leadsRespondedToIntro: 160,
    leadsBySource: [
      { name: "ILS / Listing Sites", count: 170 },
      { name: "Property Website", count: 120 },
      { name: "Referral", count: 70 },
      { name: "Walk-in / Drive-by", count: 60 },
      { name: "Paid Search", count: 50 },
    ],
    leadsFromVoice: 0,
    leadsFromChatbot: 0,
    sms: { sent: 685, received: 495 },
    email: { sent: 362, received: 147 },
    voice: { sent: 156, received: 89 },
    funnel: { guestCardCompleted: 389, archivedOrCancelled: 245, applicationStarted: 17 },
    conversionPct: 12,
    toursGuidedDuring: 38,
    toursGuidedOutside: 31,
    toursSelfDuring: 14,
    toursSelfOutside: 22,
    toursVirtual: 12,
    escalationsTotal: 74,
    escalationsEstimated: false,
    escalationReasons: [
      { name: "Policies issues", count: 22 },
      { name: "Amenities question", count: 19 },
      { name: "No availability of preferred unit", count: 14 },
      { name: "Technical issue", count: 11 },
      { name: "Pricing question", count: 8 },
    ],
  },
  {
    id: "topanga",
    name: "Topanga",
    period: "Activation – Feb 18, 2025",
    periodDays: 60,
    months: ["Jan", "Feb"],
    properties: ["Topanga Village"],
    units: 240,
    leadsByProperty: [{ name: "Topanga Village", count: 220 }],
    leadsTotal: 220,
    leadsRespondedToIntro: 92,
    leadsBySource: [
      { name: "ILS / Listing Sites", count: 84 },
      { name: "Property Website", count: 56 },
      { name: "Referral", count: 32 },
      { name: "Walk-in / Drive-by", count: 28 },
      { name: "Paid Search", count: 20 },
    ],
    leadsFromVoice: 18,
    leadsFromChatbot: 0,
    sms: { sent: 1354, received: 425 },
    email: { sent: 142, received: 6 },
    voice: { sent: 95, received: 42 },
    funnel: { guestCardCompleted: 187, archivedOrCancelled: 87, applicationStarted: 33 },
    conversionPct: 33,
    toursGuidedDuring: 30,
    toursGuidedOutside: 26,
    toursSelfDuring: 12,
    toursSelfOutside: 18,
    toursVirtual: 9,
    escalationsTotal: 41,
    escalationsEstimated: true,
    escalationReasons: [
      { name: "Technical issue", count: 18 },
      { name: "No availability of preferred unit", count: 9 },
      { name: "Pricing question", count: 6 },
      { name: "Policies", count: 5 },
      { name: "Amenities question", count: 3 },
    ],
  },
  {
    id: "campbell",
    name: "Campbell Communities",
    period: "Dec 19, 2024 – Feb 17, 2025",
    periodDays: 60,
    months: ["Dec", "Jan", "Feb"],
    properties: ["Clearwater Heights", "Lakewood", "Oak Ridge Townhomes", "Hillside Living"],
    units: 980,
    leadsByProperty: [
      { name: "Clearwater Heights", count: 540 },
      { name: "Lakewood", count: 500 },
      { name: "Oak Ridge Townhomes", count: 470 },
      { name: "Hillside Living", count: 384 },
    ],
    leadsTotal: 1894,
    leadsRespondedToIntro: 720,
    leadsBySource: [
      { name: "ILS / Listing Sites", count: 720 },
      { name: "Property Website", count: 480 },
      { name: "Referral", count: 280 },
      { name: "Walk-in / Drive-by", count: 234 },
      { name: "Paid Search", count: 180 },
    ],
    leadsFromVoice: 34,
    leadsFromChatbot: 0,
    sms: { sent: 1313, received: 761 },
    email: { sent: 2102, received: 586 },
    voice: { sent: 280, received: 134 },
    funnel: { guestCardCompleted: 1519, archivedOrCancelled: 455, applicationStarted: 73 },
    conversionPct: 7,
    toursGuidedDuring: 58,
    toursGuidedOutside: 52,
    toursSelfDuring: 24,
    toursSelfOutside: 36,
    toursVirtual: 18,
    escalationsTotal: 162,
    escalationsEstimated: true,
    escalationReasons: [
      { name: "Ask to contact", count: 47 },
      { name: "No availability of preferred unit", count: 38 },
      { name: "Technical issue", count: 31 },
      { name: "Pricing question", count: 24 },
      { name: "Policies", count: 22 },
    ],
  },
];

function buildAllBeta(customers: BetaCustomer[]): BetaCustomer {
  const sum = (fn: (c: BetaCustomer) => number) => customers.reduce((acc, c) => acc + fn(c), 0);
  const mergeNamed = (fn: (c: BetaCustomer) => NamedCount[]) => {
    const map = new Map<string, number>();
    customers.forEach((c) => fn(c).forEach((r) => map.set(r.name, (map.get(r.name) ?? 0) + r.count)));
    return Array.from(map, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  };
  return {
    id: "all",
    name: "All beta customers",
    period: "Sep 2024 – Feb 2025",
    periodDays: 152,
    months: ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"],
    properties: customers.flatMap((c) => c.properties),
    units: sum((c) => c.units),
    leadsByProperty: customers.flatMap((c) => c.leadsByProperty),
    leadsTotal: sum((c) => c.leadsTotal),
    leadsRespondedToIntro: sum((c) => c.leadsRespondedToIntro),
    leadsBySource: mergeNamed((c) => c.leadsBySource),
    leadsFromVoice: sum((c) => c.leadsFromVoice),
    leadsFromChatbot: sum((c) => c.leadsFromChatbot),
    sms: { sent: sum((c) => c.sms.sent), received: sum((c) => c.sms.received) },
    email: { sent: sum((c) => c.email.sent), received: sum((c) => c.email.received) },
    voice: { sent: sum((c) => c.voice.sent), received: sum((c) => c.voice.received) },
    funnel: {
      guestCardCompleted: sum((c) => c.funnel.guestCardCompleted),
      archivedOrCancelled: sum((c) => c.funnel.archivedOrCancelled),
      applicationStarted: sum((c) => c.funnel.applicationStarted),
    },
    conversionPct: 0, // recomputed from funnel at render
    toursGuidedDuring: sum((c) => c.toursGuidedDuring),
    toursGuidedOutside: sum((c) => c.toursGuidedOutside),
    toursSelfDuring: sum((c) => c.toursSelfDuring),
    toursSelfOutside: sum((c) => c.toursSelfOutside),
    toursVirtual: sum((c) => c.toursVirtual),
    escalationsTotal: sum((c) => c.escalationsTotal),
    escalationsEstimated: true,
    escalationReasons: mergeNamed((c) => c.escalationReasons),
  };
}

const BETA_ALL = buildAllBeta(BETA_CUSTOMERS);


// -----------------------------------------------------------------------------
// Beta KPIs section
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Domo Replica data — illustrative prototype figures mirroring the production
// Domo dashboard structure. All numbers are synthetic.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Lead Capture & Tours (committed v1 metrics) — daily per-property data
// -----------------------------------------------------------------------------

const LEAD_CAPTURE_METRICS = [
  { key: "sessions", label: "Conversations" },
  { key: "guestCards", label: "Total Guest Cards Created by ELI+" },
  { key: "toursBooked", label: "Tours Book by ELI+" },
] as const;

type LeadCaptureMetricKey = (typeof LEAD_CAPTURE_METRICS)[number]["key"];

// Lead source is already captured today; channel capture is targeted for
// phase 1 per engineering grooming (2026-07-09).
const LEAD_SOURCE_SHARES = [
  { name: "ILS / Listing Sites", share: 0.38, color: seriesColor(0)},
  { name: "Property Website", share: 0.27, color: seriesColor(1)},
  { name: "Referral", share: 0.14, color: seriesColor(2)},
  { name: "Walk-in / Drive-by", share: 0.11, color: seriesColor(3)},
  { name: "Paid Search", share: 0.10, color: seriesColor(4)},
];

const LEAD_CHANNEL_SHARES = [
  { name: "Chat", share: 0.4, color: seriesColor(0)},
  { name: "SMS", share: 0.28, color: seriesColor(1)},
  { name: "Email", share: 0.2, color: seriesColor(2)},
  { name: "Voice", share: 0.12, color: seriesColor(3)},
];

interface LeadCaptureDailyCounts {
  sessions: number;
  guestCards: number;
  guestCardsEli: number;
  toursBooked: number;
}

interface LeadCaptureDailyPoint {
  date: string;  // ISO yyyy-mm-dd
  label: string; // "Jul 8"
  perProperty: Record<Property, LeadCaptureDailyCounts>;
}

const LEAD_CAPTURE_TOTAL_DAYS = 36 * 30; // 3 years of daily data
const LEAD_CAPTURE_END_DATE = new Date(2026, 6, 8);

const leadCaptureDailyData: LeadCaptureDailyPoint[] = (() => {
  const rand = seedRand(20260708);
  const data: LeadCaptureDailyPoint[] = [];
  for (let d = 0; d < LEAD_CAPTURE_TOTAL_DAYS; d++) {
    const date = new Date(LEAD_CAPTURE_END_DATE);
    date.setDate(date.getDate() - (LEAD_CAPTURE_TOTAL_DAYS - 1 - d));
    const growth = 1 + 0.5 * (d / LEAD_CAPTURE_TOTAL_DAYS);   // slow volume growth over 3 years
    const dow = date.getDay();
    const weekday = dow === 0 ? 0.55 : dow === 6 ? 0.75 : 1;  // weekend dip
    const perProperty = {} as Record<Property, LeadCaptureDailyCounts>;
    PROPERTIES.forEach((p, idx) => {
      const propBase = 3 + (idx % 5) * 1.4; // property-size variation
      const guestCards = Math.max(0, Math.round(propBase * growth * weekday + (rand() - 0.5) * 3));
      const sessions = Math.round(guestCards * (2.1 + rand() * 0.8));
      const guestCardsEli = Math.round(guestCards * (0.8 + rand() * 0.12));
      const toursBooked = Math.round(guestCards * (0.32 + rand() * 0.14));
      perProperty[p] = { sessions, guestCards, guestCardsEli, toursBooked };
    });
    data.push({
      date: date.toISOString().slice(0, 10),
      label: `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`,
      perProperty,
    });
  }
  return data;
})();

function sliceLeadCaptureDaily(months: number): LeadCaptureDailyPoint[] {
  const days = Math.min(months * 30, LEAD_CAPTURE_TOTAL_DAYS);
  return leadCaptureDailyData.slice(LEAD_CAPTURE_TOTAL_DAYS - days);
}

// -----------------------------------------------------------------------------
// Trend grouping — aggregates daily points into day / week / month buckets
// -----------------------------------------------------------------------------

type TrendGrouping = "day" | "week" | "month";

const TREND_GROUPING_OPTIONS: { key: TrendGrouping; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

function groupTrendData(
  points: { date: string; value: number }[],
  grouping: TrendGrouping,
): { label: string; value: number }[] {
  if (grouping === "day") {
    return points.map((p) => {
      const d = new Date(p.date + "T00:00:00");
      return { label: `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`, value: p.value };
    });
  }
  const buckets = new Map<string, { label: string; value: number }>();
  for (const p of points) {
    const d = new Date(p.date + "T00:00:00");
    let key: string;
    let label: string;
    if (grouping === "week") {
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // week starts Monday
      key = `${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`;
      label = `${MONTH_LABELS[monday.getMonth()]} ${monday.getDate()}`;
    } else {
      key = `${d.getFullYear()}-${d.getMonth()}`;
      label = `${MONTH_LABELS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
    }
    const bucket = buckets.get(key);
    if (bucket) bucket.value += p.value;
    else buckets.set(key, { label, value: p.value });
  }
  return Array.from(buckets.values());
}

function TrendGroupingSelect({ value, onChange }: { value: TrendGrouping; onChange: (g: TrendGrouping) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TrendGrouping)}>
      <SelectTrigger className="h-8 w-[110px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {TREND_GROUPING_OPTIONS.map((o) => (
          <SelectItem key={o.key} value={o.key} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function sumLeadCaptureCounts(days: LeadCaptureDailyPoint[], selected: Set<string>): LeadCaptureDailyCounts {
  const totals: LeadCaptureDailyCounts = { sessions: 0, guestCards: 0, guestCardsEli: 0, toursBooked: 0 };
  for (const day of days) {
    for (const p of selected) {
      const c = day.perProperty[p as Property];
      totals.sessions += c.sessions;
      totals.guestCards += c.guestCards;
      totals.guestCardsEli += c.guestCardsEli;
      totals.toursBooked += c.toursBooked;
    }
  }
  return totals;
}

function LeadCaptureSection({ filters, months }: { filters: ReportFilters; months: number }) {
  const [metric, setMetric] = useState<LeadCaptureMetricKey>("guestCards");
  const [grouping, setGrouping] = useState<TrendGrouping>("month");

  const days = useMemo(() => sliceLeadCaptureDaily(months), [months]);
  const totals = useMemo(() => sumLeadCaptureCounts(days, filters.properties), [days, filters.properties]);

  const chartData = useMemo(() => {
    const daily = days.map((day) => {
      let value = 0;
      for (const p of filters.properties) {
        value += day.perProperty[p as Property][metric];
      }
      return { date: day.date, value };
    });
    return groupTrendData(daily, grouping);
  }, [days, filters.properties, metric, grouping]);

  const metricLabel = LEAD_CAPTURE_METRICS.find((m) => m.key === metric)?.label ?? "";

  const sourceData = LEAD_SOURCE_SHARES.map((s) => ({ ...s, count: Math.round(totals.guestCards * s.share) }));
  const channelData = LEAD_CHANNEL_SHARES.map((c) => ({ ...c, count: Math.round(totals.guestCardsEli * c.share) }));

  const funnelRows = [
    { label: "Conversations", count: totals.sessions, color: seriesColor(0), pct: 100 },
    { label: "Guest Cards Created", count: totals.guestCards, color: seriesColor(1), pct: totals.sessions > 0 ? Math.round((totals.guestCards / totals.sessions) * 100) : 0 },
    { label: "Tours Book by ELI+", count: totals.toursBooked, color: seriesColor(2), pct: totals.sessions > 0 ? Math.round((totals.toursBooked / totals.sessions) * 100) : 0 },
  ];

  return (
    <section className="mb-6">
      <SectionBanner
        title="Lead to Tour"
        description="Conversations, guest cards, and tours captured by ELI+ during the selected period"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Conversations" value={totals.sessions.toLocaleString()} sub="selected period" />
        <StatCard label="Total guest cards created by ELI+" value={totals.guestCards.toLocaleString()} sub="selected period" />
        <StatCard label="Tours book by ELI+" value={totals.toursBooked.toLocaleString()} sub="selected period" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Conversations → Guest Cards → Tours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnelRows.map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {row.count.toLocaleString()} <span className="ml-1 font-normal text-muted-foreground">({row.pct}%)</span>
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted">
                  <div className="h-2.5 rounded-full" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
                </div>
              </div>
            ))}
            <p className="pt-1 text-xxs italic text-muted-foreground/80">Conversion shown as % of conversations</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Guest Cards by Lead Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ count: { label: "Guest Cards", color: seriesColor(0) } }}
              className="!aspect-auto h-[200px] w-full"
            >
              <BarChart data={sourceData} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_STROKE} />
                <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => Number(v).toLocaleString()} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={118} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {sourceData.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Guest Cards by ELI+ Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ count: { label: "Guest Cards", color: seriesColor(0) } }}
              className="!aspect-auto h-[200px] w-full"
            >
              <BarChart data={channelData} margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={42} tickFormatter={(v) => Number(v).toLocaleString()} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {channelData.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-3 border-border/60">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm">Trend — {metricLabel}</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={metric} onValueChange={(v) => setMetric(v as LeadCaptureMetricKey)}>
                <SelectTrigger className="h-8 w-[280px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {LEAD_CAPTURE_METRICS.map((m) => (
                    <SelectItem key={m.key} value={m.key} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TrendGroupingSelect value={grouping} onChange={setGrouping} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{ value: { label: metricLabel, color: seriesColor(0) } }}
            className="!aspect-auto h-[280px] w-full"
          >
            <LineChart data={chartData} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={48} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={42} tickFormatter={(v) => Number(v).toLocaleString()} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="value" stroke={seriesColor(0)} strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Communication Channels — daily per-property conversation counts
// -----------------------------------------------------------------------------

const COMM_CHANNEL_METRICS = [
  { key: "voice", label: "Voice Conversations" },
  { key: "sms", label: "SMS Conversations" },
  { key: "email", label: "Email Conversations" },
  { key: "chat", label: "Chat Conversations" },
] as const;

type CommChannelMetricKey = (typeof COMM_CHANNEL_METRICS)[number]["key"];

interface CommChannelDailyCounts {
  voice: number;
  sms: number;
  email: number;
  chat: number;
}

interface CommChannelDailyPoint {
  date: string;  // ISO yyyy-mm-dd
  label: string; // "Jul 8"
  perProperty: Record<Property, CommChannelDailyCounts>;
}

const commChannelDailyData: CommChannelDailyPoint[] = (() => {
  const rand = seedRand(20260709);
  const data: CommChannelDailyPoint[] = [];
  for (let d = 0; d < LEAD_CAPTURE_TOTAL_DAYS; d++) {
    const date = new Date(LEAD_CAPTURE_END_DATE);
    date.setDate(date.getDate() - (LEAD_CAPTURE_TOTAL_DAYS - 1 - d));
    const growth = 1 + 0.5 * (d / LEAD_CAPTURE_TOTAL_DAYS);   // slow volume growth over 3 years
    const dow = date.getDay();
    const weekday = dow === 0 ? 0.55 : dow === 6 ? 0.75 : 1;  // weekend dip
    const perProperty = {} as Record<Property, CommChannelDailyCounts>;
    PROPERTIES.forEach((p, idx) => {
      const propBase = 3 + (idx % 5) * 1.4; // property-size variation
      const volume = propBase * growth * weekday;
      const chat = Math.max(0, Math.round(volume * 2.4 + (rand() - 0.5) * 4));
      const sms = Math.max(0, Math.round(volume * 1.7 + (rand() - 0.5) * 3));
      const email = Math.max(0, Math.round(volume * 1.2 + (rand() - 0.5) * 3));
      const voice = Math.max(0, Math.round(volume * 0.7 + (rand() - 0.5) * 2));
      perProperty[p] = { voice, sms, email, chat };
    });
    data.push({
      date: date.toISOString().slice(0, 10),
      label: `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`,
      perProperty,
    });
  }
  return data;
})();

function sliceCommChannelDaily(months: number): CommChannelDailyPoint[] {
  const days = Math.min(months * 30, LEAD_CAPTURE_TOTAL_DAYS);
  return commChannelDailyData.slice(LEAD_CAPTURE_TOTAL_DAYS - days);
}

function CommunicationChannelsSection({ filters, months }: { filters: ReportFilters; months: number }) {
  const [metric, setMetric] = useState<CommChannelMetricKey>("voice");
  const [grouping, setGrouping] = useState<TrendGrouping>("month");

  const days = useMemo(() => sliceCommChannelDaily(months), [months]);

  const totals = useMemo(() => {
    const t: CommChannelDailyCounts = { voice: 0, sms: 0, email: 0, chat: 0 };
    for (const day of days) {
      for (const p of filters.properties) {
        const c = day.perProperty[p as Property];
        t.voice += c.voice;
        t.sms += c.sms;
        t.email += c.email;
        t.chat += c.chat;
      }
    }
    return t;
  }, [days, filters.properties]);

  const chartData = useMemo(() => {
    const daily = days.map((day) => {
      let value = 0;
      for (const p of filters.properties) {
        value += day.perProperty[p as Property][metric];
      }
      return { date: day.date, value };
    });
    return groupTrendData(daily, grouping);
  }, [days, filters.properties, metric, grouping]);

  const metricLabel = COMM_CHANNEL_METRICS.find((m) => m.key === metric)?.label ?? "";

  return (
    <>
      <div className="mt-5">
        <SectionBanner
          title="Communication Channels"
          description="Voice, SMS, email, and chat conversations handled by ELI+ during the selected period"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Voice conversations" value={totals.voice.toLocaleString()} sub="selected period" />
        <StatCard label="SMS conversations" value={totals.sms.toLocaleString()} sub="selected period" />
        <StatCard label="Email conversations" value={totals.email.toLocaleString()} sub="selected period" />
        <StatCard label="Chat conversations" value={totals.chat.toLocaleString()} sub="selected period" />
      </div>

      <Card className="mt-3 border-border/60">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm">Trend — {metricLabel}</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={metric} onValueChange={(v) => setMetric(v as CommChannelMetricKey)}>
                <SelectTrigger className="h-8 w-[280px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {COMM_CHANNEL_METRICS.map((m) => (
                    <SelectItem key={m.key} value={m.key} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TrendGroupingSelect value={grouping} onChange={setGrouping} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{ value: { label: metricLabel, color: seriesColor(0) } }}
            className="!aspect-auto h-[280px] w-full"
          >
            <LineChart data={chartData} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={48} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={42} tickFormatter={(v) => Number(v).toLocaleString()} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="value" stroke={seriesColor(0)} strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  );
}

// -----------------------------------------------------------------------------
// Section daily trend — reusable daily-series generator + trend card matching
// the Lead to Tour daily trend chart
// -----------------------------------------------------------------------------

interface SectionTrendMetric {
  key: string;
  label: string;
  factor: number; // share of daily property volume attributed to this metric
}

interface SectionTrendDailyPoint {
  date: string;  // ISO yyyy-mm-dd
  label: string; // "Jul 8"
  perProperty: Record<Property, Record<string, number>>;
}

function buildSectionDailySeries(seed: number, metrics: SectionTrendMetric[]): SectionTrendDailyPoint[] {
  const rand = seedRand(seed);
  const data: SectionTrendDailyPoint[] = [];
  for (let d = 0; d < LEAD_CAPTURE_TOTAL_DAYS; d++) {
    const date = new Date(LEAD_CAPTURE_END_DATE);
    date.setDate(date.getDate() - (LEAD_CAPTURE_TOTAL_DAYS - 1 - d));
    const growth = 1 + 0.5 * (d / LEAD_CAPTURE_TOTAL_DAYS);   // slow volume growth over 3 years
    const dow = date.getDay();
    const weekday = dow === 0 ? 0.55 : dow === 6 ? 0.75 : 1;  // weekend dip
    const perProperty = {} as Record<Property, Record<string, number>>;
    PROPERTIES.forEach((p, idx) => {
      const propBase = 3 + (idx % 5) * 1.4; // property-size variation
      const volume = propBase * growth * weekday;
      const counts: Record<string, number> = {};
      for (const m of metrics) {
        // Unrounded per-property values; rounding happens at aggregation so
        // low-volume metrics still produce a sensible portfolio-level line.
        counts[m.key] = Math.max(0, volume * m.factor * (0.8 + rand() * 0.4));
      }
      perProperty[p] = counts;
    });
    data.push({
      date: date.toISOString().slice(0, 10),
      label: `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`,
      perProperty,
    });
  }
  return data;
}

const TOURS_TREND_METRICS: SectionTrendMetric[] = [
  { key: "guidedDuring", label: "Guided Tours During Office Hours", factor: 0.132 },
  { key: "guidedOutside", label: "Guided Tours Outside Office Hours", factor: 0.117 },
  { key: "selfDuring", label: "Self Guided Tours During Office Hours", factor: 0.054 },
  { key: "selfOutside", label: "Self Guided Tours Outside Office Hours", factor: 0.082 },
];
const toursTrendData = buildSectionDailySeries(20260710, TOURS_TREND_METRICS);

const ESCALATIONS_TREND_METRICS: SectionTrendMetric[] = [
  { key: "officeEscalations", label: "# Office Escalations", factor: 0.018 },
  { key: "voiceTransfers", label: "Voice Calls Transferred to Office", factor: 0.007 },
];
const escalationsTrendData = buildSectionDailySeries(20260711, ESCALATIONS_TREND_METRICS);

function SectionDailyTrendCard({
  metrics,
  data,
  filters,
  months,
}: {
  metrics: SectionTrendMetric[];
  data: SectionTrendDailyPoint[];
  filters: ReportFilters;
  months: number;
}) {
  const [metric, setMetric] = useState<string>(metrics[0].key);
  const [grouping, setGrouping] = useState<TrendGrouping>("month");

  const days = useMemo(() => {
    const count = Math.min(months * 30, LEAD_CAPTURE_TOTAL_DAYS);
    return data.slice(LEAD_CAPTURE_TOTAL_DAYS - count);
  }, [data, months]);

  const chartData = useMemo(() => {
    const daily = days.map((day) => {
      let value = 0;
      for (const p of filters.properties) {
        value += day.perProperty[p as Property][metric];
      }
      return { date: day.date, value };
    });
    // Round after grouping so low-volume metrics aggregate sensibly.
    return groupTrendData(daily, grouping).map((pt) => ({ ...pt, value: Math.round(pt.value) }));
  }, [days, filters.properties, metric, grouping]);

  const metricLabel = metrics.find((m) => m.key === metric)?.label ?? "";

  return (
    <Card className="mt-3 border-border/60">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Trend — {metricLabel}</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger className="h-8 w-[280px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {metrics.map((m) => (
                  <SelectItem key={m.key} value={m.key} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TrendGroupingSelect value={grouping} onChange={setGrouping} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{ value: { label: metricLabel, color: seriesColor(0) } }}
          className="!aspect-auto h-[280px] w-full"
        >
          <LineChart data={chartData} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={48} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={42} tickFormatter={(v) => Number(v).toLocaleString()} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="value" stroke={seriesColor(0)} strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Domo Replica section
// -----------------------------------------------------------------------------

function DomoReplicaSection({ filters, months }: { filters: ReportFilters; months: number }) {
  const kpi = useMemo(() => {
    const periodScale = months / 12;
    const propertyScale = selectionRatio(filters.properties, PROPERTIES.length);
    const volume = periodScale * propertyScale;

    const rand = seedRand(31415 + months + filters.properties.size);
    const drift = () => 1 + (rand() - 0.5) * 0.05;

    const count = (base: number) => Math.round(base * volume * drift()).toLocaleString();
    const rate = (base: number, digits = 1) => `${(base * drift()).toFixed(digits)}%`;

    return {
      guidedDuring: count(3552),
      guidedOutside: count(3152),
      selfDuring: count(1456),
      selfOutside: count(2226),
      escalationsTotal: count(480),
      escalationsPctOfLeads: rate(10.9),
      voiceTransferPct: rate(38.9),
      voiceTransferCount: count(185),
    };
  }, [months, filters.properties]);

  return (
    <section className="mb-6">
      <SectionBanner
        title="Tours"
        description="Guided and self-guided tour volume, split by office hours"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Guided tours during office hours" value={kpi.guidedDuring} sub="guided, during office hours" />
        <StatCard label="Guided tours outside office hours" value={kpi.guidedOutside} sub="guided, after hours" />
        <StatCard label="Self guided tours during office hours" value={kpi.selfDuring} sub="self-guided, during office hours" />
        <StatCard label="Self guided tours outside office hours" value={kpi.selfOutside} sub="self-guided, after hours" />
      </div>

      <SectionDailyTrendCard metrics={TOURS_TREND_METRICS} data={toursTrendData} filters={filters} months={months} />

      <div className="mt-5">
        <SectionBanner
          title="Office Handoffs"
          description="Leads and voice calls transferred to the leasing office — distinct from the AI-conversation escalations below"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Office escalations" value={kpi.escalationsTotal} sub="escalated to the leasing office" />
        <StatCard label="Escalations % of total leads" value={kpi.escalationsPctOfLeads} sub="of all leads" />
        <StatCard label="Voice call % transferred to office" value={kpi.voiceTransferPct} sub="of voice conversations" />
        <StatCard label="Voice calls transferred to office" value={kpi.voiceTransferCount} sub="escalated voice calls" />
      </div>

      <SectionDailyTrendCard metrics={ESCALATIONS_TREND_METRICS} data={escalationsTrendData} filters={filters} months={months} />

      <CommunicationChannelsSection filters={filters} months={months} />

    </section>
  );
}

// -----------------------------------------------------------------------------
// Escalations section (human resolution outcomes, derived from office
// escalation volume above — a different concept from "Office Escalations",
// which tracks handoff-to-office volume, not resolution status)
// -----------------------------------------------------------------------------

function EscalationsOverviewSection({
  filters,
  months,
  escalationResolutionData,
}: {
  filters: ReportFilters;
  months: number;
  escalationResolutionData: ReturnType<typeof sliceTrend<MonthlyPoint>>;
}) {
  const kpi = useMemo(() => {
    const periodScale = months / 12;
    const propertyScale = selectionRatio(filters.properties, PROPERTIES.length);
    const volume = periodScale * propertyScale;

    const rand = seedRand(9001 + months + filters.properties.size);
    const drift = () => 1 + (rand() - 0.5) * 0.05;

    const count = (base: number) => Math.round(base * volume * drift()).toLocaleString();
    const total = Math.round(480 * volume * drift());
    const open = Math.round(total * 0.11);
    const resolved = total - open;

    return {
      escalationRate: `${(10.9 * drift()).toFixed(1)}%`,
      totalEscalations: total.toLocaleString(),
      openEscalations: open.toLocaleString(),
      resolvedEscalations: resolved.toLocaleString(),
    };
  }, [months, filters.properties]);

  return (
    <EscalationsSection
      stats={[
        { label: "Escalation rate", value: kpi.escalationRate, delta: "-1.8 pts", lowerIsBetter: true, sub: "of AI conversations escalated" },
        { label: "Total escalations", value: kpi.totalEscalations, sub: "escalated to staff" },
        { label: "Open escalations", value: kpi.openEscalations, sub: "pending resolution" },
        { label: "Resolved", value: kpi.resolvedEscalations, delta: "89% resolution", deltaTone: "positive", sub: "resolved by staff" },
      ]}
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Escalation Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="!aspect-auto h-[260px] w-full">
              <BarChart data={escalationReasons} margin={{ left: 8, right: 12, top: 8, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="reason" tickLine={false} axisLine={false} tickMargin={8} angle={-30} textAnchor="end" height={50} interval={0} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg Escalation Resolution Time — Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={escalationResolutionData}
              view={filters.view}
              selected={filters.properties}
              yDomain={filters.view === "global" ? [0, 4] : [0, 5]}
            />
          </CardContent>
        </Card>
      </div>
    </EscalationsSection>
  );
}

// -----------------------------------------------------------------------------
// Billboard Stat Card (local — uses 2-column max for leasing's 4-channel layout)
// -----------------------------------------------------------------------------

type MetricTooltip = {
  customer: string;
  engineering: string;
};

function BillboardStatCard({
  label,
  value,
  sub,
  channels,
  tooltip,
  onSelect,
  onExport,
}: {
  label: string;
  value: string;
  sub: string;
  channels: { label: string; value: string }[];
  tooltip?: MetricTooltip;
  onSelect?: () => void;
  onExport?: () => void;
}) {
  const channelColumns = Math.min(channels.length, 2);
  const singleChannelRow = channels.length > 0 && channels.length <= channelColumns;
  return (
    <Card
      className={`billboard-stat flex h-full flex-col border-border/60 ${onSelect ? "cursor-pointer transition-colors hover:border-foreground/30 hover:bg-muted/20" : ""}`}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
    >
      <CardContent className="flex flex-1 flex-col gap-1 p-0 px-5 py-3">
        <div className="flex items-center gap-1.5">
          <p className="min-w-0 flex-1 text-xxs font-semibold uppercase tracking-wide text-muted-foreground leading-none">
            {label}
          </p>
          {tooltip && (
            <span className="shrink-0" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="inline-flex shrink-0 text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-96 space-y-3 p-3 text-xs leading-relaxed text-popover-foreground" side="top" align="start">
                  <div>
                    <p className="mb-1 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">
                      What this shows
                    </p>
                    <p>{tooltip.customer}</p>
                  </div>
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5">
                    <p className="mb-1 text-xxs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                      Engineering notes — do not show to customers
                    </p>
                    <p className="text-foreground/90">{tooltip.engineering}</p>
                  </div>
                </PopoverContent>
              </Popover>
            </span>
          )}
          {onExport ? (
            <span className="shrink-0">
              <ExportCsvButton onExport={onExport} size="icon" label={`Export ${label} CSV`} />
            </span>
          ) : null}
        </div>
        <div className={channels.length > 0 ? "billboard-stat__metrics" : "min-w-0"}>
          <div className="min-w-0">
            <p className="billboard-stat__value text-foreground">{value}</p>
            <p className="mt-1 text-xs font-normal leading-snug text-muted-foreground">{sub}</p>
          </div>
          {channels.length > 0 && (
            <div className={`billboard-stat__channels ${singleChannelRow ? "items-center" : "items-start"}`}>
              <div
                className="billboard-stat__channel-grid content-start"
                style={{ ["--billboard-cols"]: String(channelColumns) } as Record<string, string>}
              >
                {channels.map((ch) => (
                  <div key={ch.label} className="flex min-w-0 flex-col items-center text-center">
                    <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">{ch.value}</span>
                    <span className="max-w-[4.5rem] text-xxs leading-tight text-muted-foreground">{ch.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Distribute `total` across `weights` so the parts always sum exactly to `total`. */
function distributeCounts(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const counts = weights.map((weight) => Math.floor((total * weight) / weightSum));
  let remainder = total - counts.reduce((sum, count) => sum + count, 0);
  for (let i = 0; remainder > 0; i += 1, remainder -= 1) {
    counts[i % counts.length] += 1;
  }
  return counts;
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function LeasingAiDashboardPage() {
  const [filters, setFilters, scope] = useReportScope(PROPERTIES);
  const [reportVersion, setReportVersion] = useState<ReportVersion>("jvm");
  const [goldenDrillIn, setGoldenDrillIn] = useState<string | null>(null);

  const months = useMemo(() => monthsForPeriod(filters.periodId), [filters.periodId]);

  const conversionRateData = useMemo(() => sliceTrend(conversionRateTrend, months), [months]);
  const signedLeasesData = useMemo(() => sliceTrend(signedLeasesTrend, months), [months]);
  const rentAtSigningData = useMemo(() => sliceTrend(rentAtSigningTrend, months), [months]);
  const fullyAutomatedData = useMemo(() => sliceTrend(fullyAutomatedTrend, months), [months]);
  const escalationResolutionData = useMemo(() => sliceTrend(escalationResolutionTrend, months), [months]);
  const earlyTakeoverData = useMemo(() => sliceTrend(earlyTakeoverTrend, months), [months]);
  const handoffRateData = useMemo(() => sliceTrend(handoffRateTrend, months), [months]);
  const taskResolutionData = useMemo(() => sliceTrend(taskResolutionTrend, months), [months]);
  const medianResolutionData = useMemo(() => sliceTrend(medianResolutionTrend, months), [months]);

  const alphaKpi = useMemo(() => {
    const rand = seedRand(5555 + months);
    const jitter = () => 1 + (rand() - 0.5) * 0.08;
    const scale = months / 12;
    const fmt = (n: number) => Math.round(n).toLocaleString();

    // Single source of truth — day/hour/channel breakdowns must sum to this.
    const totalMessagesCount = Math.round((4200 + 6800 + 8400 + 3600) * scale * jitter());
    const [voiceCount, chatCount, smsCount, emailCount] = distributeCounts(
      totalMessagesCount,
      [4200, 6800, 8400, 3600],
    );
    const totalMessages = totalMessagesCount.toLocaleString();
    const voiceSent = voiceCount.toLocaleString();
    const chatSent = chatCount.toLocaleString();
    const smsSent = smsCount.toLocaleString();
    const emailsSent = emailCount.toLocaleString();

    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayCounts = distributeCounts(totalMessagesCount, [3200, 3480, 3100, 2950, 2700, 2100, 1470]);
    const dayVolumes = dayLabels
      .map((label, index) => ({ label, count: dayCounts[index] }))
      .sort((a, b) => b.count - a.count);

    const hourBucketLabels = ["12a–4a", "4a–8a", "8a–12p", "12p–4p", "4p–8p", "8p–12a"];
    const hourBucketCounts = distributeCounts(totalMessagesCount, [920, 2400, 6200, 4600, 3500, 1180]);
    const hourBuckets = hourBucketLabels
      .map((label, index) => ({ label, count: hourBucketCounts[index] }))
      .sort((a, b) => b.count - a.count);

    // Peak hour sits inside the busiest 4-hour bucket (approx 45% of that bucket).
    const topHourLabel = "10 AM";
    const topHourCount = Math.max(1, Math.round(hourBuckets[0].count * 0.45));

    return {
      totalMessages,
      voiceSent, chatSent, smsSent, emailsSent,
      topDay: dayVolumes[0],
      dayBreakdown: dayVolumes.slice(1),
      topHour: { label: topHourLabel, count: topHourCount },
      hourBuckets,
      escalationRate: `${(11.2 * jitter()).toFixed(1)}%`,
      totalEscalations: fmt(380 * scale * jitter()),
      openEscalations: String(Math.round(38 * scale * jitter())),
      resolvedEscalations: fmt(342 * scale * jitter()),
      optOutRate: `${(3.8 * jitter()).toFixed(1)}%`,
      voiceOptOut: `${(2.1 * jitter()).toFixed(1)}%`,
      chatOptOut: `${(3.4 * jitter()).toFixed(1)}%`,
      smsOptOut: `${(4.2 * jitter()).toFixed(1)}%`,
      emailOptOut: `${(5.1 * jitter()).toFixed(1)}%`,
      avgAgentResponseTime: `< ${(6 * jitter()).toFixed(0)} sec`,
      voiceResponseTime: `< ${(4 * jitter()).toFixed(0)} sec`,
      chatResponseTime: `< ${(5 * jitter()).toFixed(0)} sec`,
      smsResponseTime: `< ${(7 * jitter()).toFixed(0)} sec`,
      emailResponseTime: `< ${(10 * jitter()).toFixed(0)} sec`,
      responseRate: `${(41.2 * jitter()).toFixed(1)}%`,
      voiceResponseRate: `${(62.4 * jitter()).toFixed(1)}%`,
      chatResponseRate: `${(48.1 * jitter()).toFixed(1)}%`,
      smsResponseRate: `${(38.6 * jitter()).toFixed(1)}%`,
      emailResponseRate: `${(24.8 * jitter()).toFixed(1)}%`,
      avgResidentResponseTime: `${(3.8 * jitter()).toFixed(1)} hrs`,
      voiceResidentTime: `${(0.1 * jitter()).toFixed(1)} hrs`,
      chatResidentTime: `${(1.2 * jitter()).toFixed(1)} hrs`,
      smsResidentTime: `${(3.4 * jitter()).toFixed(1)} hrs`,
      emailResidentTime: `${(8.2 * jitter()).toFixed(1)} hrs`,
      avgDaysToConvert: `${(4.6 * jitter()).toFixed(1)} days`,
      conversionRate: `${(32.8 * jitter()).toFixed(1)}%`,
    };
  }, [months]);

  const METRIC_TOOLTIPS = {
    totalMessages: {
      customer: "Total messages sent by this agent for the filtered time period and properties.",
      engineering:
        "Each message sent by super agent is tagged by super agent to the originating sub-agent(s). If a single message was triggered by multiple sub-agents, it counts toward each sub-agent. Make sure we can break down the metric by communication channel since that is also displayed. Voice is counted differently from text channels: each completed voice conversation counts as exactly one message (not per turn/utterance), because voice is not tracked at the same message/turn granularity as SMS, chat, or email.",
    },
    messagesByDay: {
      customer:
        "Which day of the week this agent sent the most messages, plus how the rest of the week compares, for the filtered time period and properties.",
      engineering:
        "Count messages tagged to this sub-agent, grouped by day-of-week of send time (using each property's local timezone). The headline is the peak weekday (label + count). The seven day counts MUST sum exactly to Total Messages Sent for the same filter scope (sub-agent + period + properties). Voice conversations count as one message each.",
    },
    messagesByHour: {
      customer:
        "Which hour of the day this agent sent the most messages, plus volume by time-of-day window, for the filtered time period and properties. Times use each property's local timezone.",
      engineering:
        "Bucket message send timestamps into 4-hour windows using each property's local timezone (so 3:55 PM Mountain and 3:55 PM Central both land in 12p–4p). The headline is the single peak hour within the busiest window. The six bucket counts MUST sum exactly to Total Messages Sent for the same filter scope (sub-agent + period + properties). Voice conversations count as one message each.",
    },
    escalationRate: {
      customer: "The percentage of conversations with this agent that needed a team member to step in.",
      engineering:
        "Nexus escalations only — count only escalations in Nexus where a human needs to get involved. Formula: conversations with ≥1 such escalation ÷ total conversations for this sub-agent in the filter scope. A conversation with multiple escalations counts once. Also surface total / open / resolved escalation counts for the same scope.",
    },
    optOutRate: {
      customer:
        "How often residents opted out of messaging after hearing from this agent. We only count an opt-out when this agent sent the most recent message to that resident in the 48 hours before they opted out.",
      engineering:
        "Find STOP/opt-out events (SMS or email). For each, look up ONLY the most recent agent message sent to that resident within the prior 48 hours. Attribute the opt-out ONLY to the sub-agent(s) tagged on that most recent message. If no agent message exists in that window, exclude the opt-out. Break down by channel.",
    },
    agentResponseTime: {
      customer: "On average, how long it takes residents to get a reply after they message this agent.",
      engineering:
        "Measure per conversational turn. For each resident message → agent reply pair, compute elapsed time until the resident actually receives the reply (not when the sub-agent handed the reply to super agent). If a conversation goes back and forth 10 times, include all 10 response times in the average. Exclude turns where a blocking escalation was created (human takes over). Exclude resident messages that have not yet received an agent response — those turns cannot be measured and must not be included in the average.",
    },
    residentResponseRate: {
      customer:
        "When this agent reaches out first (for example, a tour confirmation or application follow-up), how often the resident replies within 48 hours.",
      engineering:
        "Denominator = proactive outreach messages initiated by this sub-agent in filter scope. Numerator = those that received ≥1 resident reply within 48 hours of the outreach. Break down by SMS and Email only (Chat and Voice are excluded from this metric's channel split).",
    },
    residentResponseTime: {
      customer:
        "For residents who replied within 48 hours of a proactive message from this agent, the average time it took them to reply.",
      engineering:
        "Uses the same dataset as Resident Response Rate Within 48 Hours (proactive outreach messages that received a resident reply within 48 hours). Compute the average (not median) elapsed time from delivery of the proactive message to the resident's reply. This value must never exceed 48 hours because the cohort is limited to replies within that window. Break down by SMS and Email only (Chat and Voice are excluded from this metric's channel split).",
    },
    leadConversionSpeed: {
      customer:
        "On average, how many days it takes for a lead this agent worked to convert into a signed lease.",
      engineering:
        "Average days from first qualified lead/prospect engagement attributed to Leasing AI to signed-lease event within filter scope. Supporting metric: conversion rate = signed leases ÷ leads in the same cohort. Break down attribution carefully when multiple channels touched the lead.",
    },
  } as const satisfies Record<string, MetricTooltip>;

  const alphaStats = [
    { label: "Total Messages Sent", value: alphaKpi.totalMessages, sub: "across all channels", tooltip: METRIC_TOOLTIPS.totalMessages, channels: [{ label: "Voice", value: alphaKpi.voiceSent }, { label: "Chat", value: alphaKpi.chatSent }, { label: "SMS", value: alphaKpi.smsSent }, { label: "Email", value: alphaKpi.emailsSent }] },
    { label: "Messages Sent by Day", value: alphaKpi.topDay.label, sub: `${alphaKpi.topDay.count.toLocaleString()} messages · peak day`, tooltip: METRIC_TOOLTIPS.messagesByDay, channels: alphaKpi.dayBreakdown.map((d) => ({ label: d.label, value: d.count.toLocaleString() })) },
    { label: "Messages Sent by Hour", value: alphaKpi.topHour.label, sub: `${alphaKpi.topHour.count.toLocaleString()} messages · peak hour`, tooltip: METRIC_TOOLTIPS.messagesByHour, channels: alphaKpi.hourBuckets.map((h) => ({ label: h.label, value: h.count.toLocaleString() })) },
    { label: "Escalation Rate", value: alphaKpi.escalationRate, sub: "of AI contacts escalated", tooltip: METRIC_TOOLTIPS.escalationRate, channels: [{ label: "Total", value: alphaKpi.totalEscalations }, { label: "Open", value: alphaKpi.openEscalations }, { label: "Resolved", value: alphaKpi.resolvedEscalations }] },
    { label: "Opt Out Rate", value: alphaKpi.optOutRate, sub: "opted out of AI messaging", tooltip: METRIC_TOOLTIPS.optOutRate, channels: [{ label: "Voice", value: alphaKpi.voiceOptOut }, { label: "SMS", value: alphaKpi.smsOptOut }, { label: "Email", value: alphaKpi.emailOptOut }] },
    { label: "Average Agent Response Time", value: alphaKpi.avgAgentResponseTime, sub: "prospect message to agent reply", tooltip: METRIC_TOOLTIPS.agentResponseTime, channels: [{ label: "Voice", value: alphaKpi.voiceResponseTime }, { label: "Chat", value: alphaKpi.chatResponseTime }, { label: "SMS", value: alphaKpi.smsResponseTime }, { label: "Email", value: alphaKpi.emailResponseTime }] },
    { label: "Resident Response Rate Within 48 Hours", value: alphaKpi.responseRate, sub: "SMS and email outreach", tooltip: METRIC_TOOLTIPS.residentResponseRate, channels: [{ label: "SMS", value: alphaKpi.smsResponseRate }, { label: "Email", value: alphaKpi.emailResponseRate }] },
    { label: "Resident Response Time", value: alphaKpi.avgResidentResponseTime, sub: "average time to reply · SMS & email", tooltip: METRIC_TOOLTIPS.residentResponseTime, channels: [{ label: "SMS", value: alphaKpi.smsResidentTime }, { label: "Email", value: alphaKpi.emailResidentTime }] },
    { label: "Lead Conversion Speed", value: alphaKpi.avgDaysToConvert, sub: "average days to signed lease", tooltip: METRIC_TOOLTIPS.leadConversionSpeed, channels: [{ label: "Conversion rate", value: alphaKpi.conversionRate }] },
  ];

  const goldenDrillConfigs = useMemo(() => {
    const configs: Record<
      string,
      {
        title: string;
        description: string;
        currentValue: string;
        unitSuffix?: string;
        series: { key: string; label: string; color: string; points: ReturnType<typeof buildSeededMetricTrend> }[];
      }
    > = {};

    const add = (
      label: string,
      opts: {
        description: string;
        currentValue: string;
        unitSuffix?: string;
        start: number;
        end: number;
        integer?: boolean;
        seed?: string;
      },
    ) => {
      configs[label] = {
        title: label,
        description: opts.description,
        currentValue: opts.currentValue,
        unitSuffix: opts.unitSuffix,
        series: [
          {
            key: "value",
            label,
            color: seriesColor(0),
            points: buildSeededMetricTrend({
              seed: opts.seed ?? `leasing-${label}`,
              months,
              start: opts.start,
              end: opts.end,
              integer: opts.integer,
            }),
          },
        ],
      };
    };

    add("Total Messages Sent", {
      description: "Total messages sent by Leasing AI over the selected period.",
      currentValue: alphaKpi.totalMessages,
      start: 1800,
      end: 3200,
      integer: true,
    });
    configs["Messages Sent by Day"] = {
      title: "Messages Sent by Day",
      description:
        "Monthly message volume by day of week. The current peak weekday is called out above; compare how each weekday trends across the selected period.",
      currentValue: `Peak day: ${alphaKpi.topDay.label} · ${alphaKpi.topDay.count.toLocaleString()} messages`,
      series: buildWeightedCategoryTrends({
        seedPrefix: "leasing-messages-by-day",
        months,
        categories: [...DAY_OF_WEEK_TREND_WEIGHTS],
        totalStart: 14000,
        totalEnd: 24000,
      }),
    };
    configs["Messages Sent by Hour"] = {
      title: "Messages Sent by Hour",
      description:
        "Monthly message volume by 4-hour window (property-local time). The current peak hour is called out above; lines show each time-of-day bucket over the selected period.",
      currentValue: `Peak hour: ${alphaKpi.topHour.label} · ${alphaKpi.topHour.count.toLocaleString()} messages`,
      series: buildWeightedCategoryTrends({
        seedPrefix: "leasing-messages-by-hour",
        months,
        categories: [...HOUR_BUCKET_TREND_WEIGHTS],
        totalStart: 14000,
        totalEnd: 24000,
      }),
    };
    add("Escalation Rate", {
      description: "Share of conversations that needed a human in Nexus.",
      currentValue: alphaKpi.escalationRate,
      unitSuffix: "%",
      start: 13,
      end: 10,
    });
    add("Opt Out Rate", {
      description: "Opt-out rate attributed to Leasing AI over time.",
      currentValue: alphaKpi.optOutRate,
      unitSuffix: "%",
      start: 5.2,
      end: 3.8,
    });
    add("Average Agent Response Time", {
      description: "Average agent response time (seconds) across answered turns.",
      currentValue: alphaKpi.avgAgentResponseTime,
      unitSuffix: "sec",
      start: 10,
      end: 6,
      integer: true,
    });
    add("Resident Response Rate Within 48 Hours", {
      description: "Share of proactive outreach messages that got a reply within 48 hours.",
      currentValue: alphaKpi.responseRate,
      unitSuffix: "%",
      start: 32,
      end: 41,
    });
    add("Resident Response Time", {
      description: "Average resident reply time among the 48-hour responder cohort.",
      currentValue: alphaKpi.avgResidentResponseTime,
      unitSuffix: "hrs",
      start: 5.2,
      end: 3.8,
    });
    add("Lead Conversion Speed", {
      description: "Average days from first Leasing AI engagement to signed lease.",
      currentValue: alphaKpi.avgDaysToConvert,
      unitSuffix: "days",
      start: 6.5,
      end: 4.6,
    });

    return configs;
  }, [months, alphaKpi]);

  const activeGoldenDrill = goldenDrillIn ? goldenDrillConfigs[goldenDrillIn] : null;

  return (
    <div className="-mt-2">
      <ReportPageHeader
        agent="Leasing AI"
        description="Lead conversion and application throughput, plus the outreach ELI+ handled"
      />

      <ReportFilterBar
        filters={filters}
        onChange={setFilters}
        properties={PROPERTIES}
        unmatchedProperties={scope.unmatched}
        showViewToggle={reportVersion === "original"}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-amber-500/50 bg-amber-500/5 px-4 py-3">
        <div>
          <p className="text-xxs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Developer tool — do not ship to customers
          </p>
          <p className="text-xs font-semibold text-foreground">Report Version</p>
          <p className="text-xxs text-muted-foreground">
            Prototype-only switch between Original, Alpha Launch, and Golden Prototype layouts.
          </p>
        </div>
        <SegmentedToggle
          value={reportVersion}
          onChange={(next) => {
            setReportVersion(next);
            setGoldenDrillIn(null);
          }}
          options={REPORT_VERSION_OPTIONS}
          aria-label="Leasing AI report version"
        />
      </div>

      {reportVersion === "original" ? (
        <>
      <LeadCaptureSection filters={filters} months={months} />

      <DomoReplicaSection filters={filters} months={months} />

      <EscalationsOverviewSection
        filters={filters}
        months={months}
        escalationResolutionData={escalationResolutionData}
      />

      {/* ============================================================ */}
      {/* Section 1b — Agent Adoption (DEV-301196)                      */}
      {/* ============================================================ */}
      <section className="mb-6">
        <SectionBanner
          title="Agent Adoption"
          description="Staff outreach activity — emails, SMS, prospects assisted, and resolved tasks by agent"
        />

        {/* Agent activity table */}
        <div className="mb-4">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Agent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-2.5 text-left text-xxs font-semibold text-muted-foreground">Agent</th>
                      <th className="px-4 py-2.5 text-left text-xxs font-semibold text-muted-foreground">Property</th>
                      <th className="px-4 py-2.5 text-right text-xxs font-semibold text-muted-foreground">Emails Sent</th>
                      <th className="px-4 py-2.5 text-right text-xxs font-semibold text-muted-foreground">SMS Sent</th>
                      <th className="px-4 py-2.5 text-right text-xxs font-semibold text-muted-foreground">Prospects Assisted</th>
                      <th className="px-4 py-2.5 text-right text-xxs font-semibold text-muted-foreground">Resolved Tasks</th>
                      <th className="px-4 py-2.5 text-right text-xxs font-semibold text-muted-foreground">Calls Dialed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentActivityRows.map((row) => (
                      <tr key={row.agent} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">{row.agent}</td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{row.property}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{row.emailsSent}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{row.smsSent}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{row.prospectsAssisted}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{row.resolvedTasks}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{row.callsDialed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

      </section>
        </>
      ) : null}

      {reportVersion === "jvm" ? (
        <>
          <section className="mb-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {alphaStats.map((stat) => (
                <BillboardStatCard
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  sub={stat.sub}
                  channels={stat.channels}
                  tooltip={stat.tooltip}
                />
              ))}
            </div>
          </section>

          <LeadCaptureSection filters={filters} months={months} />

          <DomoReplicaSection filters={filters} months={months} />

          <EscalationsOverviewSection
            filters={filters}
            months={months}
            escalationResolutionData={escalationResolutionData}
          />

          <section className="mb-6">
            <SectionBanner
              title="Agent Adoption"
              description="Staff outreach activity — emails, SMS, prospects assisted, and resolved tasks by agent"
            />
            <div className="mb-4">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Agent Activity</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="px-4 py-2.5 text-left text-xxs font-semibold text-muted-foreground">Agent</th>
                          <th className="px-4 py-2.5 text-left text-xxs font-semibold text-muted-foreground">Property</th>
                          <th className="px-4 py-2.5 text-right text-xxs font-semibold text-muted-foreground">Emails Sent</th>
                          <th className="px-4 py-2.5 text-right text-xxs font-semibold text-muted-foreground">SMS Sent</th>
                          <th className="px-4 py-2.5 text-right text-xxs font-semibold text-muted-foreground">Prospects Assisted</th>
                          <th className="px-4 py-2.5 text-right text-xxs font-semibold text-muted-foreground">Resolved Tasks</th>
                          <th className="px-4 py-2.5 text-right text-xxs font-semibold text-muted-foreground">Calls Dialed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentActivityRows.map((row) => (
                          <tr key={row.agent} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">{row.agent}</td>
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{row.property}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{row.emailsSent}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{row.smsSent}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{row.prospectsAssisted}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{row.resolvedTasks}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{row.callsDialed}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      ) : null}

      {reportVersion === "golden" ? (
        <>
          {activeGoldenDrill ? (
            <MetricTrendDrillIn
              title={activeGoldenDrill.title}
              description={activeGoldenDrill.description}
              currentValue={activeGoldenDrill.currentValue}
              unitSuffix={activeGoldenDrill.unitSuffix}
              series={activeGoldenDrill.series}
              onBack={() => setGoldenDrillIn(null)}
              onExport={() =>
                exportAgentMetricCsv({ agent: "leasing", metric: activeGoldenDrill.title })
              }
            />
          ) : (
            <>
              <section className="mb-6">
                <p className="mb-3 text-xs text-muted-foreground">
                  Click any metric card to open its trend. Export conversation-level CSV from inside each drill-in.
                </p>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {alphaStats.map((stat) => (
                    <BillboardStatCard
                      key={stat.label}
                      label={stat.label}
                      value={stat.value}
                      sub={stat.sub}
                      channels={stat.channels}
                      tooltip={stat.tooltip}
                      onSelect={() => setGoldenDrillIn(stat.label)}
                    />
                  ))}
                </div>
              </section>

              <LeadCaptureSection filters={filters} months={months} />

              <DomoReplicaSection filters={filters} months={months} />

              <EscalationsOverviewSection
                filters={filters}
                months={months}
                escalationResolutionData={escalationResolutionData}
              />

              <section className="mb-6">
                <SectionBanner
                  title="Agent Adoption"
                  description="Staff outreach activity — emails, SMS, prospects assisted, and resolved tasks by agent"
                />
                <div className="mb-4">
                  <Card className="border-border/60">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Agent Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/40">
                              <th className="px-4 py-2.5 text-left text-xxs font-semibold text-muted-foreground">Agent</th>
                              <th className="px-4 py-2.5 text-left text-xxs font-semibold text-muted-foreground">Property</th>
                              <th className="px-4 py-2.5 text-right text-xxs font-semibold text-muted-foreground">Emails Sent</th>
                              <th className="px-4 py-2.5 text-right text-xxs font-semibold text-muted-foreground">SMS Sent</th>
                              <th className="px-4 py-2.5 text-right text-xxs font-semibold text-muted-foreground">Prospects Assisted</th>
                              <th className="px-4 py-2.5 text-right text-xxs font-semibold text-muted-foreground">Resolved Tasks</th>
                              <th className="px-4 py-2.5 text-right text-xxs font-semibold text-muted-foreground">Calls Dialed</th>
                            </tr>
                          </thead>
                          <tbody>
                            {agentActivityRows.map((row) => (
                              <tr key={row.agent} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">{row.agent}</td>
                                <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{row.property}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{row.emailsSent}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{row.smsSent}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{row.prospectsAssisted}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{row.resolvedTasks}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{row.callsDialed}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>
            </>
          )}
        </>
      ) : null}



      <p className="mb-4 mt-2 border-t border-border pt-3 text-xs text-muted-foreground">
        This is a prototype dashboard. Data is illustrative and does not reflect live property metrics. Baseline represents pre-AI performance for comparison. All metrics reflect the selected time period.
      </p>
    </div>
  );
}
