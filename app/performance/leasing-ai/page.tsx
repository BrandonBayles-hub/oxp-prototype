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
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Calendar, ChevronDown, Search, X, AlertCircle, CheckCircle2, Clock, Building2, Mail, MessageSquare, Phone, Bot, CalendarClock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

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

const PROPERTY_COLORS: Record<Property, string> = {
  "Cedar Hills": "#3b82f6",
  "Hillside Living": "#10b981",
  "Jamison Apartments": "#f59e0b",
  "Lakewood": "#ef4444",
  "Maple Court": "#8b5cf6",
  "Oak Terrace": "#ec4899",
  "Parkview Flats": "#06b6d4",
  "Pine Valley": "#84cc16",
  "Summit Ridge": "#f97316",
  "The Beacon": "#a855f7",
};

// Vivid categorical palette used to color single-series bar charts and donuts.
const CHART_PALETTE = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
];

const PERIOD_OPTIONS = [
  { id: "3m", label: "Last 3 Months", months: 3 },
  { id: "6m", label: "Last 6 Months", months: 6 },
  { id: "12m", label: "Last 12 Months", months: 12 },
  { id: "2y", label: "Last 2 Years", months: 24 },
  { id: "3y", label: "Last 3 Years", months: 36 },
  { id: "all", label: "All Time", months: 36 },
] as const;

type PeriodId = (typeof PERIOD_OPTIONS)[number]["id"] | "custom";

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
  { name: "ILS / Listing Sites", value: 38, count: 4012, color: "#3b82f6" },
  { name: "Property Website", value: 27, count: 2854, color: "#10b981" },
  { name: "Referral", value: 14, count: 1480, color: "#f59e0b" },
  { name: "Walk-in / Drive-by", value: 11, count: 1162, color: "#8b5cf6" },
  { name: "Paid Search", value: 10, count: 1056, color: "#06b6d4" },
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
  { name: "SMS", value: 65, count: 15210, color: "#3b82f6" },
  { name: "Email", value: 35, count: 8190, color: "#8b5cf6" },
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

const channelPerformance = [
  { channel: "Chat", conversations: 8420, aiResolution: 87, handoffRate: 13, responseTimeSec: 6, leadToTour: 41 },
  { channel: "SMS", conversations: 6840, aiResolution: 83, handoffRate: 17, responseTimeSec: 9, leadToTour: 39 },
  { channel: "Email", conversations: 4210, aiResolution: 79, handoffRate: 21, responseTimeSec: 28, leadToTour: 34 },
  { channel: "ILS", conversations: 2980, aiResolution: 76, handoffRate: 24, responseTimeSec: 45, leadToTour: 31 },
  { channel: "Voice", conversations: 950, aiResolution: 61, handoffRate: 39, responseTimeSec: 3, leadToTour: 44 },
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
  { bucket: "Due today",  count: 8,  fill: "#f59e0b" },
  { bucket: "1 day",      count: 12, fill: "#f59e0b" },
  { bucket: "2–3 days",   count: 14, fill: "#ef4444" },
  { bucket: "4–7 days",   count: 9,  fill: "#dc2626" },
  { bucket: "8+ days",    count: 4,  fill: "#991b1b" },
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
// Conversation Funnel data (REQ-19.2) — 6-state drop-off, sliceable by
// property, date range, channel, and lead source. Illustrative prototype data.
// -----------------------------------------------------------------------------

const CONV_FUNNEL_STAGES = [
  { key: "INITIAL_CONTACT", label: "Initial Contact" },
  { key: "QUALIFYING", label: "Qualifying" },
  { key: "UNIT_MATCHING", label: "Unit Matching" },
  { key: "TOUR_SCHEDULING", label: "Tour Scheduling" },
  { key: "TOUR_CONFIRMED", label: "Tour Confirmed" },
  { key: "APPLICATION", label: "Application" },
] as const;

// Base stage counts: all channels/sources/properties, full period.
const CONV_FUNNEL_BASE = [10564, 6840, 5180, 4128, 3260, 2410];

// Entry volume (INITIAL_CONTACT) by channel and by lead source — scales the
// funnel when a single channel / source is selected.
const CONV_CHANNEL_ENTRY: Record<string, number> = {
  Chat: 3200, SMS: 2600, Email: 1800, ILS: 1900, Voice: 1064,
};
const CONV_SOURCE_ENTRY: Record<string, number> = {
  "ILS / Listing Sites": 4012, "Property Website": 2854, Referral: 1480,
  "Walk-in / Drive-by": 1162, "Paid Search": 1056,
};

// Per-transition retention multipliers (relative to the base curve) so drop-off
// differs by channel / source — the point of REQ-19.2 reportability.
const CONV_CHANNEL_RETENTION: Record<string, number> = {
  Chat: 1.06, SMS: 1.02, Email: 0.96, ILS: 0.92, Voice: 1.10,
};
const CONV_SOURCE_RETENTION: Record<string, number> = {
  "ILS / Listing Sites": 0.97, "Property Website": 1.05, Referral: 1.12,
  "Walk-in / Drive-by": 1.08, "Paid Search": 0.94,
};

const CONV_CHANNELS = ["Chat", "SMS", "Email", "ILS", "Voice"];
const CONV_SOURCES = Object.keys(CONV_SOURCE_ENTRY);

// Color ramp across the 6 stages (cool -> warm) for the funnel bars.
const CONV_STAGE_COLORS = ["#3b82f6", "#0ea5e9", "#06b6d4", "#14b8a6", "#10b981", "#22c55e"];

// -----------------------------------------------------------------------------
// Period slicing — limits trend data to the selected period
// -----------------------------------------------------------------------------

function sliceTrend<T extends { monthIdx: number }>(data: T[], months: number): T[] {
  return data.slice(Math.max(0, data.length - months));
}

// -----------------------------------------------------------------------------
// Atomic UI primitives
// -----------------------------------------------------------------------------

type Tone = "positive" | "negative" | "neutral";

function DeltaPill({ value, tone }: { value: string; tone: Tone }) {
  const Icon = tone === "negative" ? ArrowDownRight : ArrowUpRight;
  const cls =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
      ? "text-rose-600"
      : "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", cls)}>
      <Icon className="h-3 w-3" />
      {value}
    </span>
  );
}

function KpiCard({
  label,
  value,
  delta,
  deltaTone = "positive",
  sub,
  subItalic,
  action,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: Tone;
  sub?: string;
  subItalic?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {action}
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {delta && <DeltaPill value={delta} tone={deltaTone} />}
        </div>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        {subItalic && (
          <p className="mt-0.5 text-[11px] italic text-muted-foreground/80">{subItalic}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SectionBanner({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3 rounded-md bg-muted/60 px-4 py-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Filters
// -----------------------------------------------------------------------------

type ViewMode = "global" | "perProperty";

interface FiltersState {
  periodId: PeriodId;
  customFrom: string;
  customTo: string;
  selected: Set<Property>;
  view: ViewMode;
}

function PeriodPicker({
  state,
  setState,
}: {
  state: FiltersState;
  setState: (s: FiltersState) => void;
}) {
  const [open, setOpen] = useState(false);

  const label =
    state.periodId === "custom"
      ? "Custom Range"
      : PERIOD_OPTIONS.find((p) => p.id === state.periodId)?.label ?? "Last 12 Months";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm",
          open ? "border-amber-400 ring-1 ring-amber-200" : "border-border",
        )}
      >
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Period:</span>
        <span className="font-semibold text-foreground">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-[16rem] rounded-md border border-border bg-popover p-1 shadow-lg">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setState({ ...state, periodId: opt.id });
                  setOpen(false);
                }}
                className={cn(
                  "block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted",
                  state.periodId === opt.id && "bg-muted font-medium",
                )}
              >
                {opt.label}
              </button>
            ))}
            <div className="mt-1 border-t border-border pt-2">
              <label className="flex items-center gap-2 px-3 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={state.periodId === "custom"}
                  onChange={(e) =>
                    setState({ ...state, periodId: e.target.checked ? "custom" : "12m" })
                  }
                  className="h-4 w-4 rounded border-border"
                />
                Custom Range
              </label>
              {state.periodId === "custom" && (
                <div className="space-y-2 px-3 pb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="month"
                      value={state.customFrom}
                      onChange={(e) => setState({ ...state, customFrom: e.target.value })}
                      className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="month"
                      value={state.customTo}
                      onChange={(e) => setState({ ...state, customTo: e.target.value })}
                      className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="w-full rounded-md bg-foreground py-1.5 text-xs font-medium text-background hover:bg-foreground/90"
                  >
                    Apply Custom Range
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PropertiesPicker({
  state,
  setState,
}: {
  state: FiltersState;
  setState: (s: FiltersState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allSelected = state.selected.size === PROPERTIES.length;
  const label = allSelected
    ? "All"
    : state.selected.size === 0
    ? "None"
    : `${state.selected.size} selected`;

  const filtered = PROPERTIES.filter((p) =>
    p.toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(p: Property) {
    const next = new Set(state.selected);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setState({ ...state, selected: next });
  }

  function toggleAll() {
    setState({
      ...state,
      selected: allSelected ? new Set() : new Set(PROPERTIES),
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
      >
        <span className="text-muted-foreground">Properties:</span>
        <span className="font-semibold text-foreground">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-[18rem] rounded-md border border-border bg-popover p-2 shadow-lg">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search properties..."
                className="w-full rounded-md border border-border bg-background pl-7 pr-2 py-1.5 text-sm"
              />
            </div>
            <div className="max-h-[16rem] overflow-y-auto">
              <label className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm font-medium">All Properties</span>
              </label>
              {filtered.map((p) => (
                <label key={p} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={state.selected.has(p)}
                    onChange={() => toggle(p)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm">{p}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ViewToggle({ state, setState }: { state: FiltersState; setState: (s: FiltersState) => void }) {
  return (
    <div className="inline-flex rounded-md border border-border bg-background p-0.5">
      {(["global", "perProperty"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setState({ ...state, view: v })}
          className={cn(
            "rounded px-3 py-1 text-xs font-medium transition-colors",
            state.view === v
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {v === "global" ? "Global View" : "Per-Property"}
        </button>
      ))}
    </div>
  );
}

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
  view: ViewMode;
  selected: Set<Property>;
  yDomain?: [number, number];
  height?: number;
}) {
  if (view === "global") {
    const config = {
      baseline: { label: "Pre-AI Baseline", color: "#cbd5e1" },
      current: { label: "Current", color: "#2563eb" },
    } satisfies ChartConfig;
    return (
      <div>
        <ChartContainer config={config} className="!aspect-auto w-full" style={{ height }}>
          <LineChart data={data} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
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
              stroke="#cbd5e1"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
        <div className="mt-1 flex items-center justify-center gap-4 text-[11px]">
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
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
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
  state: FiltersState;
  setState: (s: FiltersState) => void;
}) {
  if (state.view !== "perProperty") return null;
  const list = PROPERTIES.filter((p) => state.selected.has(p));
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
              const next = new Set(state.selected);
              next.delete(p);
              setState({ ...state, selected: next });
            }}
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Remove ${p}`}
          >
            <X className="h-3 w-3" />
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

const SELECT_CLS =
  "rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-200";

// -----------------------------------------------------------------------------
// Conversation Funnel section (REQ-19.2)
// -----------------------------------------------------------------------------

function ConversationFunnelSection() {
  const [property, setProperty] = useState<string>("All");
  const [periodId, setPeriodId] = useState<string>("12m");
  const [channel, setChannel] = useState<string>("All");
  const [source, setSource] = useState<string>("All");

  const { rows, entry, overallConv, biggestDrop } = useMemo(() => {
    // Base per-transition retention ratios from the all-up curve.
    const baseRet = CONV_FUNNEL_BASE.slice(1).map((c, i) => c / CONV_FUNNEL_BASE[i]);

    // Entry volume from the selected channel / source.
    let entryVol = CONV_FUNNEL_BASE[0];
    if (channel !== "All" && source !== "All") {
      entryVol = Math.round(CONV_CHANNEL_ENTRY[channel] * (CONV_SOURCE_ENTRY[source] / CONV_FUNNEL_BASE[0]));
    } else if (channel !== "All") {
      entryVol = CONV_CHANNEL_ENTRY[channel];
    } else if (source !== "All") {
      entryVol = CONV_SOURCE_ENTRY[source];
    }

    // Property + date scaling (illustrative volume only — does not alter drop-off).
    if (property !== "All") entryVol = Math.round(entryVol / PROPERTIES.length);
    const months = PERIOD_OPTIONS.find((p) => p.id === periodId)?.months ?? 12;
    entryVol = Math.max(1, Math.round(entryVol * (months / 12)));

    // Retention modifier from channel + source, clamped so we never exceed ~98%.
    const chanMod = channel !== "All" ? CONV_CHANNEL_RETENTION[channel] : 1;
    const srcMod = source !== "All" ? CONV_SOURCE_RETENTION[source] : 1;

    const counts = [entryVol];
    for (let i = 0; i < baseRet.length; i++) {
      const ret = Math.min(0.98, baseRet[i] * chanMod * srcMod);
      counts.push(Math.round(counts[i] * ret));
    }

    let worst = { label: "", pct: 0 };
    const built = CONV_FUNNEL_STAGES.map((s, i) => {
      const count = counts[i];
      const pctOfEntry = entryVol > 0 ? (count / entryVol) * 100 : 0;
      const dropPct = i > 0 && counts[i - 1] > 0 ? (1 - count / counts[i - 1]) * 100 : 0;
      if (i > 0 && dropPct > worst.pct) worst = { label: `${CONV_FUNNEL_STAGES[i - 1].label} → ${s.label}`, pct: dropPct };
      return { key: s.key, label: s.label, count, pctOfEntry, dropPct };
    });

    const conv = entryVol > 0 ? (counts[counts.length - 1] / entryVol) * 100 : 0;
    return { rows: built, entry: entryVol, overallConv: conv, biggestDrop: worst };
  }, [property, periodId, channel, source]);

  return (
    <section className="mb-6">
      <SectionBanner
        title="Conversation Funnel"
        description="Drop-off at each conversation-state transition, from first contact to application. Reportable by property, date range, channel, and lead source (REQ-19.2)."
      />

      {/* Filter bar — property, date range, channel, lead source */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-border/60 bg-muted/30 px-3 py-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Property</span>
          <select value={property} onChange={(e) => setProperty(e.target.value)} className={SELECT_CLS}>
            <option value="All">All properties</option>
            {PROPERTIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date range</span>
          <select value={periodId} onChange={(e) => setPeriodId(e.target.value)} className={SELECT_CLS}>
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Channel</span>
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className={SELECT_CLS}>
            <option value="All">All channels</option>
            {CONV_CHANNELS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Lead source</span>
          <select value={source} onChange={(e) => setSource(e.target.value)} className={SELECT_CLS}>
            <option value="All">All sources</option>
            {CONV_SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Summary KPIs */}
      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <KpiCard label="Entered funnel" value={entry.toLocaleString()} sub="Initial Contact volume" />
        <KpiCard
          label="Overall conversion"
          value={`${overallConv.toFixed(1)}%`}
          sub="Initial Contact → Application"
        />
        <KpiCard
          label="Biggest drop-off"
          value={`${biggestDrop.pct.toFixed(1)}%`}
          deltaTone="negative"
          sub={biggestDrop.label || "—"}
        />
      </div>

      {/* Funnel */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">State-Transition Drop-Off</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={r.key} className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-xs font-medium text-foreground">{r.label}</div>
                <div className="relative h-7 flex-1 overflow-hidden rounded bg-muted/40">
                  <div
                    className="flex h-full items-center rounded px-2 text-[11px] font-semibold text-white tabular-nums"
                    style={{ width: `${Math.max(r.pctOfEntry, 6)}%`, backgroundColor: CONV_STAGE_COLORS[i] }}
                  >
                    {r.count.toLocaleString()}
                  </div>
                </div>
                <div className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {r.pctOfEntry.toFixed(0)}%
                </div>
                <div className="w-28 shrink-0 text-right">
                  {i > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-rose-600 tabular-nums">
                      <ArrowDownRight className="h-3 w-3" />
                      {r.dropPct.toFixed(1)}% drop
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-end gap-6 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
            <span>Bar width = % of Initial Contact</span>
            <span className="inline-flex items-center gap-1 text-rose-600">
              <ArrowDownRight className="h-3 w-3" /> step drop-off vs. previous state
            </span>
          </div>
        </CardContent>
      </Card>

      <p className="mt-2 text-[11px] italic text-muted-foreground/80">
        Illustrative prototype data. Channel and lead-source selections vary the drop-off curve; property and date-range
        selections scale volume only.
      </p>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Domo Replica data — illustrative prototype figures mirroring the production
// Domo dashboard structure. All numbers are synthetic.
// -----------------------------------------------------------------------------

const DOMO_OVERVIEW = {
  customersActivated: 4,
  totalProperties: 14,
  totalActiveUnits: 3200,
  gcToTourRate: 28.4,
  leadsToAppStarted: 187,
  leadsToAppCompleted: 142,
  gcToAppStartedDays: 6.2,
  gcToAppCompletedDays: 11.8,
};

const DOMO_GC_TOUR_MONTHLY = MONTH_LABELS.map((m, i) => ({
  month: m,
  rate: Math.round(22 + 8 * (i / 11) + (i % 2 === 0 ? 1.2 : -0.6)),
}));

const DOMO_CHATBOT_VOICE = {
  chatbotConversations: 1842,
  leadsFromChatbot: 312,
  voiceConversations: 950,
  leadsFromVoice: 218,
};

const DOMO_COMMS = {
  smsReceived: 2380,
  smsSent: 5378,
  emailsSent: 4456,
  emailsReceived: 962,
  smsResponseRate: 44.3,
  emailResponseRate: 21.6,
  savedHoursSms: 179,
  savedHoursEmail: 148,
  phoneOptOuts: 86,
  phoneOptOutRatio: 1.6,
  emailOptOuts: 124,
  emailOptOutRatio: 2.8,
  leadResponseTimeFirstMsgSec: 14,
  gcToFirstOutgoingMsgSec: 38,
  leadResponseTimeFirstMsg: "14 sec",
  leasingAgentEarlyTakeover: 12.4,
  savingsFromOfficeHours: 327,
};

const DOMO_SENT_SMS_VS_EMAIL = [
  { name: "SMS", value: 55, count: 5378, color: "#3b82f6" },
  { name: "Email", value: 45, count: 4456, color: "#8b5cf6" },
];

const DOMO_RECV_SMS_VS_EMAIL = [
  { name: "SMS", value: 71, count: 2380, color: "#3b82f6" },
  { name: "Email", value: 29, count: 962, color: "#8b5cf6" },
];

const DOMO_LEADS = {
  activationDate: "Sep 19, 2024",
  totalLeads: 4404,
  managedByEli: 3862,
  managedPct: 87.7,
  leasingAgentBeforeTour: 614,
  voiceCallsPotentialLeads: 347,
  chatbotLeads: 312,
};

const DOMO_MANAGED_LEADS_PIE = [
  { name: "ELI+ Leasing Agent", value: Math.round((DOMO_LEADS.managedByEli / DOMO_LEADS.totalLeads) * 100), count: DOMO_LEADS.managedByEli, color: "#be123c" },
  { name: "Site Leasing Agent", value: Math.round(((DOMO_LEADS.totalLeads - DOMO_LEADS.managedByEli) / DOMO_LEADS.totalLeads) * 100), count: DOMO_LEADS.totalLeads - DOMO_LEADS.managedByEli, color: "#6b21a8" },
];

const DOMO_AGENT_BEFORE_TOUR_PIE = [
  { name: "ELI+", value: Math.round((DOMO_LEADS.leasingAgentBeforeTour / (DOMO_LEADS.leasingAgentBeforeTour + 1638)) * 100), count: DOMO_LEADS.leasingAgentBeforeTour, color: "#be123c" },
  { name: "Site Agents", value: Math.round((1638 / (DOMO_LEADS.leasingAgentBeforeTour + 1638)) * 100), count: 1638, color: "#6b21a8" },
];

const DOMO_LEADS_MONTHLY = MONTH_LABELS.map((m, i) => ({
  month: m,
  leads: Math.round(280 + 90 * (i / 11) + (i % 3 === 0 ? 40 : -10)),
}));

const DOMO_LEADS_PER_CHANNEL = [
  { channel: "SMS", count: 1640 },
  { channel: "Email", count: 1120 },
  { channel: "ILS", count: 842 },
  { channel: "Voice", count: 490 },
  { channel: "Chatbot", count: 312 },
];

const DOMO_LEADS_PER_SOURCE = [
  { source: "ILS / Listing Sites", count: 1670 },
  { source: "Property Website", count: 1184 },
  { source: "Referral", count: 614 },
  { source: "Walk-in / Drive-by", count: 482 },
  { source: "Paid Search", count: 454 },
];

const DOMO_LEAD_JOURNEY = [
  { stage: "Guest Card Created", count: 4404, pct: 100 },
  { stage: "First Message Sent", count: 4120, pct: 93.6 },
  { stage: "Lead Responded", count: 1812, pct: 41.1 },
  { stage: "Tour Scheduled", count: 1252, pct: 28.4 },
  { stage: "Tour Completed", count: 986, pct: 22.4 },
  { stage: "Application Started", count: 187, pct: 4.2 },
  { stage: "Application Completed", count: 142, pct: 3.2 },
  { stage: "Lease Signed", count: 118, pct: 2.7 },
];

const DOMO_ESCALATIONS = {
  total: 480,
  pctOfLeads: 10.9,
  voiceTransferPct: 38.9,
  voiceTransferCount: 185,
};

const DOMO_ESCALATION_REASONS = [
  { reason: "Ask to contact office", count: 142 },
  { reason: "Technical issue", count: 116 },
  { reason: "No availability of preferred unit", count: 89 },
  { reason: "Pricing question", count: 72 },
  { reason: "Policy question", count: 38 },
  { reason: "Amenities question", count: 23 },
];

const DOMO_TOURS = {
  guidedDuring: 222,
  guidedOutside: 197,
  selfDuring: 91,
  selfOutside: 139,
  messageSentAfterTour: 842,
};

const DOMO_LEADS_FUNNEL_AFTER_TOUR = [
  { stage: "Guest Card Completed", count: 108600, color: "#f97316" },
  { stage: "Application Started", count: 17900, color: "#f59e0b" },
  { stage: "Application Completed", count: 5330, color: "#eab308" },
  { stage: "Application Approved", count: 6000, color: "#84cc16" },
  { stage: "Lease Started", count: 1350, color: "#22c55e" },
  { stage: "Lease Completed", count: 5690, color: "#06b6d4" },
  { stage: "Lease Approved", count: 2370, color: "#8b5cf6" },
];

// -----------------------------------------------------------------------------
// Domo Replica section
// -----------------------------------------------------------------------------

function DomoReplicaSection() {
  return (
    <section className="mb-6">
      {/* ---- Overview / Top-Level KPIs ---- */}
      <div className="mb-3 flex items-center gap-2">
        <Building2 className="h-3.5 w-3.5 text-blue-500" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overview / Top-Level KPIs</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Total Properties with Leasing AI" value={String(DOMO_OVERVIEW.totalProperties)} sub="activated properties" />
        <KpiCard label="Total Active Units" value={DOMO_OVERVIEW.totalActiveUnits.toLocaleString()} sub="across all activated properties" />
        <KpiCard label="Conversion Rate Guest Card to Tour" value={`${DOMO_OVERVIEW.gcToTourRate}%`} sub="guest cards that scheduled a tour" />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Leads Converted to Application Started" value={`${((DOMO_OVERVIEW.leadsToAppStarted / DOMO_LEADS.totalLeads) * 100).toFixed(1)}%`} sub={`${DOMO_OVERVIEW.leadsToAppStarted} of ${DOMO_LEADS.totalLeads.toLocaleString()} leads`} />
        <KpiCard label="Leads Converted to Application Completed" value={`${((DOMO_OVERVIEW.leadsToAppCompleted / DOMO_LEADS.totalLeads) * 100).toFixed(1)}%`} sub={`${DOMO_OVERVIEW.leadsToAppCompleted} of ${DOMO_LEADS.totalLeads.toLocaleString()} leads`} />
        <KpiCard label="Guest Card To App Started — Days" value={`${DOMO_OVERVIEW.gcToAppStartedDays} days`} sub="avg days from guest card to app start" />
        <KpiCard label="Guest Card To App Completed — Days" value={`${DOMO_OVERVIEW.gcToAppCompletedDays} days`} sub="avg days from guest card to app complete" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-1">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Conversion Rate Guest Card to Tour — Monthly</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ rate: { label: "GC → Tour %", color: "#2563eb" } }}
              className="!aspect-auto h-[240px] w-full"
            >
              <LineChart data={DOMO_GC_TOUR_MONTHLY} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} domain={[0, 40]} tickFormatter={(v) => `${v}%`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="rate" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* ---- Chatbot & Voice ---- */}
      <div className="mb-3 mt-5 flex items-center gap-2">
        <Bot className="h-3.5 w-3.5 text-violet-500" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chatbot & Voice</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Lead Conversion in Chatbot" value={DOMO_CHATBOT_VOICE.chatbotConversations.toLocaleString()} sub="number of chatbot conversations" />
        <KpiCard label="Leads Created by Chatbot" value={String(DOMO_CHATBOT_VOICE.leadsFromChatbot)} sub="guest cards from chatbot" />
        <KpiCard label="Num of Voice Conversations" value={DOMO_CHATBOT_VOICE.voiceConversations.toLocaleString()} sub="total voice conversations" />
        <KpiCard label="Leads Created by Voice" value={String(DOMO_CHATBOT_VOICE.leadsFromVoice)} sub="guest cards from voice" />
      </div>

      {/* ---- Communication ---- */}
      <div className="mb-3 mt-5 flex items-center gap-2">
        <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Communication</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="SMS Sent" value={DOMO_COMMS.smsSent.toLocaleString()} sub="outbound SMS messages" />
        <KpiCard label="SMS Received" value={DOMO_COMMS.smsReceived.toLocaleString()} sub="inbound SMS messages" />
        <KpiCard label="Emails Sent" value={DOMO_COMMS.emailsSent.toLocaleString()} sub="outbound emails" />
        <KpiCard label="Emails Received" value={DOMO_COMMS.emailsReceived.toLocaleString()} sub="inbound emails" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sent SMS vs. Sent Email</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutWithLegend data={DOMO_SENT_SMS_VS_EMAIL} />
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Received SMS vs. Received Emails</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutWithLegend data={DOMO_RECV_SMS_VS_EMAIL} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="SMS Response Rate" value={`${DOMO_COMMS.smsResponseRate}%`} sub="of SMS sent that got a reply" />
        <KpiCard label="Email Response Rate" value={`${DOMO_COMMS.emailResponseRate}%`} sub="of emails sent that got a reply" />
        <KpiCard label="Saved Hours — SMS" value={`${DOMO_COMMS.savedHoursSms} hrs`} sub="estimated staff time saved" />
        <KpiCard label="Saved Hours — Email" value={`${DOMO_COMMS.savedHoursEmail} hrs`} sub="estimated staff time saved" />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Phone Opt-Outs" value={String(DOMO_COMMS.phoneOptOuts)} sub="prospects opting out of phone" />
        <KpiCard label="Phone Opt-Out Ratio" value={`${DOMO_COMMS.phoneOptOutRatio}%`} sub="of total leads" />
        <KpiCard label="Email Opt-Outs" value={String(DOMO_COMMS.emailOptOuts)} sub="prospects opting out of email" />
        <KpiCard label="Email Opt-Out Ratio" value={`${DOMO_COMMS.emailOptOutRatio}%`} sub="of total leads" />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Lead Response Time to First Message" value={DOMO_COMMS.leadResponseTimeFirstMsg} sub={`${DOMO_COMMS.leadResponseTimeFirstMsgSec} seconds`} />
        <KpiCard label="Time From Guest Card to First Outgoing Message" value={`${DOMO_COMMS.gcToFirstOutgoingMsgSec} sec`} sub="guest card creation to first AI message" />
        <KpiCard label="Leasing Agent Early Takeover" value={`${DOMO_COMMS.leasingAgentEarlyTakeover}%`} sub="staff taking over before AI requests help" />
        <KpiCard label="Savings from Office Hours" value={`${DOMO_COMMS.savingsFromOfficeHours} hrs`} sub="after-hours conversations handled by AI" />
      </div>

      {/* ---- Leads & Activity ---- */}
      <div className="mb-3 mt-5 flex items-center gap-2">
        <ArrowUpRight className="h-3.5 w-3.5 text-amber-500" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leads & Activity</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Activation Date" value={DOMO_LEADS.activationDate} sub="first customer activated" />
        <KpiCard label="Leads" value={DOMO_LEADS.totalLeads.toLocaleString()} sub="total leads in period" />
        <KpiCard label="Leads Managed by ELI+" value={DOMO_LEADS.managedByEli.toLocaleString()} sub="AI-managed leads" />
        <KpiCard label="Chatbot Leads" value={String(DOMO_LEADS.chatbotLeads)} sub="leads from chatbot" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Managed Leads %</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutWithLegend data={DOMO_MANAGED_LEADS_PIE} />
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Leasing Agent Before Tour</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutWithLegend data={DOMO_AGENT_BEFORE_TOUR_PIE} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Number of Voice Calls — Potential Leads" value={String(DOMO_LEADS.voiceCallsPotentialLeads)} sub="voice calls from potential leads" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Leads over Time (by Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ leads: { label: "Leads", color: "#2563eb" } }}
              className="!aspect-auto h-[240px] w-full"
            >
              <LineChart data={DOMO_LEADS_MONTHLY} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="leads" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Leads per Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="!aspect-auto h-[240px] w-full">
              <BarChart data={DOMO_LEADS_PER_CHANNEL} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="channel" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="#374151" radius={[2, 2, 0, 0]}>
                  {DOMO_LEADS_PER_CHANNEL.map((_, i) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Leads per Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="!aspect-auto h-[240px] w-full">
              <BarChart data={DOMO_LEADS_PER_SOURCE} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis type="category" dataKey="source" tickLine={false} axisLine={false} tickMargin={8} width={140} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="#374151" radius={[0, 2, 2, 0]}>
                  {DOMO_LEADS_PER_SOURCE.map((_, i) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lead Journey Table</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stage</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Count</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">% of Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {DOMO_LEAD_JOURNEY.map((row, i) => (
                    <tr key={row.stage} className={cn("border-b border-border/60 last:border-0", i % 2 === 1 && "bg-muted/20")}>
                      <td className="px-4 py-2.5 font-medium text-foreground">{row.stage}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{row.count.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        <span className={cn("font-medium", row.pct >= 20 ? "text-emerald-600" : row.pct >= 5 ? "text-amber-600" : "text-muted-foreground")}>
                          {row.pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---- Escalations ---- */}
      <div className="mb-3 mt-5 flex items-center gap-2">
        <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Escalations</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="# Office Escalations" value={String(DOMO_ESCALATIONS.total)} sub="escalated to the leasing office" />
        <KpiCard label="Escalations % of Total Leads" value={`${DOMO_ESCALATIONS.pctOfLeads}%`} sub="of all leads" />
        <KpiCard label="Voice Call % Transferred to Office" value={`${DOMO_ESCALATIONS.voiceTransferPct}%`} sub="of voice conversations" />
        <KpiCard label="Voice Calls Transferred to Office" value={String(DOMO_ESCALATIONS.voiceTransferCount)} sub="escalated voice calls" />
      </div>

      <div className="mt-3">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Escalation Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="!aspect-auto h-[260px] w-full">
              <BarChart data={DOMO_ESCALATION_REASONS} margin={{ left: 8, right: 12, top: 8, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="reason" tickLine={false} axisLine={false} tickMargin={8} angle={-25} textAnchor="end" height={60} interval={0} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {DOMO_ESCALATION_REASONS.map((_, i) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* ---- Tours ---- */}
      <div className="mb-3 mt-5 flex items-center gap-2">
        <CalendarClock className="h-3.5 w-3.5 text-amber-500" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tours</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Guided Tours During Office Hours" value={String(DOMO_TOURS.guidedDuring)} sub="guided, during office hours" />
        <KpiCard label="Guided Tours Outside Office Hours" value={String(DOMO_TOURS.guidedOutside)} sub="guided, after hours" />
        <KpiCard label="Self Guided Tours During Office Hours" value={String(DOMO_TOURS.selfDuring)} sub="self-guided, during office hours" />
        <KpiCard label="Self Guided Tours Outside Office Hours" value={String(DOMO_TOURS.selfOutside)} sub="self-guided, after hours" />
      </div>

      <div className="mt-3">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Leads Funnel — Message Sent After Tour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {DOMO_LEADS_FUNNEL_AFTER_TOUR.map((row) => (
                <div key={row.stage} className="flex items-center gap-3 text-sm">
                  <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: row.color }} />
                  <span className="flex-1 text-foreground">{row.stage}</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {row.count >= 1000 ? `${(row.count / 1000).toFixed(row.count >= 10000 ? 1 : 2)}K` : row.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </section>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function LeasingAiDashboardPage() {
  const [filters, setFilters] = useState<FiltersState>({
    periodId: "12m",
    customFrom: "2025-06",
    customTo: "2026-05",
    selected: new Set(PROPERTIES),
    view: "global",
  });

  const months = useMemo(() => {
    if (filters.periodId === "custom") return 12;
    return PERIOD_OPTIONS.find((p) => p.id === filters.periodId)?.months ?? 12;
  }, [filters.periodId]);

  const conversionRateData = useMemo(() => sliceTrend(conversionRateTrend, months), [months]);
  const signedLeasesData = useMemo(() => sliceTrend(signedLeasesTrend, months), [months]);
  const rentAtSigningData = useMemo(() => sliceTrend(rentAtSigningTrend, months), [months]);
  const fullyAutomatedData = useMemo(() => sliceTrend(fullyAutomatedTrend, months), [months]);
  const escalationResolutionData = useMemo(() => sliceTrend(escalationResolutionTrend, months), [months]);
  const earlyTakeoverData = useMemo(() => sliceTrend(earlyTakeoverTrend, months), [months]);
  const handoffRateData = useMemo(() => sliceTrend(handoffRateTrend, months), [months]);
  const taskResolutionData = useMemo(() => sliceTrend(taskResolutionTrend, months), [months]);
  const medianResolutionData = useMemo(() => sliceTrend(medianResolutionTrend, months), [months]);

  return (
    <div className="-mt-2">
      <Link
        href="/performance"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Performance
      </Link>

      <header className="mb-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <img src="/eli-cube.svg" alt="" width={22} height={22} />
          ELI+ Leasing AI — Performance & Impact
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Leasing performance across all properties plus AI-driven lead engagement, application throughput, and outreach analytics
        </p>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <PeriodPicker state={filters} setState={setFilters} />
        <PropertiesPicker state={filters} setState={setFilters} />
        <ViewToggle state={filters} setState={setFilters} />
      </div>

      <DomoReplicaSection />

      {/* ============================================================ */}
      {/* Section 1b — Agent Adoption (DEV-301196)                      */}
      {/* ============================================================ */}
      <section className="mb-6">
        <SectionBanner
          title="Agent Adoption"
          description="Human engagement, task follow-through, and AI handoff responsiveness across onsite teams"
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
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Agent</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Property</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Emails Sent</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">SMS Sent</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Prospects Assisted</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Resolved Tasks</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Calls Dialed</th>
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

        {/* KPI row 1 — score + engagement */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Agent Adoption Score"
            value="74 / 100"
            delta="+3 pts"
            deltaTone="positive"
            sub="Portfolio avg · Strong ≥ 80 · Watch 60–79 · At Risk < 40"
          />
          <KpiCard
            label="Human follow-up rate"
            value="68%"
            delta="-4 pts"
            deltaTone="negative"
            sub="AI handoffs followed up by staff · target 75%"
          />
          <KpiCard
            label="Task completion rate"
            value="82%"
            delta="+2 pts"
            deltaTone="positive"
            sub="AI-generated tasks completed · target 80%"
          />
          <KpiCard
            label="Median time to first action"
            value="2.4 hrs"
            delta="-0.7 hrs"
            deltaTone="positive"
            sub="after AI handoff · SLA target 3.1 hrs"
          />
        </div>

        {/* KPI row 2 — outbound + tasks */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard label="Emails sent"  value="1,247" delta="+12%" sub="human outbound emails" />
          <KpiCard label="SMS sent"     value="843"   delta="-3%"  deltaTone="negative" sub="human outbound SMS" />
          <KpiCard label="Calls dialed" value="291"   delta="+8%"  sub="human outbound calls" />
          <KpiCard
            label="Agent-assisted prospects"
            value="312 (71%)"
            delta="+6 pts"
            deltaTone="positive"
            sub="of 439 active prospects touched by staff"
          />
          <KpiCard
            label="Overdue tasks"
            value="47"
            delta="+14"
            deltaTone="negative"
            sub="open tasks past SLA deadline"
          />
        </div>

      </section>

      {/* ============================================================ */}
      {/* Section 1 — AI Operational Health (DEV-298594)               */}
      {/* ============================================================ */}
      <section className="mb-6">
        <SectionBanner
          title="AI Operational Health"
          description="Human behavior signals, knowledge gaps, task resolution, and channel performance — operational metrics that reveal AI trust, configuration health, and team accountability"
        />

        {/* 4a — Human Behavior Signals */}
        <div className="mb-3 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Human Behavior Signals</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Early Takeover Rate"
            value="12.4%"
            delta="-3.8 pts"
            deltaTone="positive"
            sub="humans taking over before AI requests help"
            subItalic="Target ≤10% · Yellow 10–25% · Red >25%"
          />
          <KpiCard
            label="AI Handoff Rate"
            value="18.2%"
            delta="-4.1 pts"
            deltaTone="positive"
            sub="AI-initiated escalations to human"
            subItalic="Target ≤15% · Yellow 15–30% · Red >30%"
          />
          <KpiCard
            label="Top Handoff Reason"
            value="Complex Q"
            sub="42% of handoffs — AI couldn't handle"
            subItalic="vs. 31% explicit request, 16% complaint"
          />
          <KpiCard
            label="Conversations Fully Resolved"
            value="81.8%"
            delta="+4.1 pts"
            sub="handled end-to-end by AI, no human"
            subItalic="Inverse of handoff rate"
          />
        </div>


        {/* Task Resolution */}
        <div className="mb-3 mt-5 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Task Resolution</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Task Resolution Rate"
            value="91.3%"
            delta="+5.2 pts"
            sub="AI-generated tasks resolved this period"
            subItalic="Target ≥90% · Yellow 75–90% · Red <75%"
          />
          <KpiCard
            label="SLA Resolution Rate"
            value="84.6%"
            delta="+3.8 pts"
            sub="tasks resolved within SLA (24h default)"
          />
          <KpiCard
            label="Overdue Tasks"
            value="9"
            deltaTone="negative"
            sub="past SLA threshold, not yet resolved"
          />
          <KpiCard
            label="Median Resolution Time"
            value="5.2 hrs"
            delta="-2.6 hrs"
            deltaTone="positive"
            sub="task creation to resolution"
            subItalic="vs. 7.8h prior period"
          />
        </div>


        {/* Channel Performance */}
        <div className="mb-3 mt-5 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Communication Performance by Channel</p>
        </div>

        <Card className="border-border/60">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Channel</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Conversations</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AI Resolution</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Handoff Rate</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avg Response</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Lead-to-Tour</th>
                  </tr>
                </thead>
                <tbody>
                  {channelPerformance.map((row, i) => (
                    <tr key={row.channel} className={cn("border-b border-border/60 last:border-0", i % 2 === 0 ? "" : "bg-muted/20")}>
                      <td className="px-4 py-2.5 font-medium text-foreground">{row.channel}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{row.conversations.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        <span className={cn("font-medium", row.aiResolution >= 85 ? "text-emerald-600" : row.aiResolution >= 75 ? "text-amber-600" : "text-rose-600")}>
                          {row.aiResolution}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        <span className={cn("font-medium", row.handoffRate <= 15 ? "text-emerald-600" : row.handoffRate <= 30 ? "text-amber-600" : "text-rose-600")}>
                          {row.handoffRate}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {row.responseTimeSec < 60 ? `${row.responseTimeSec}s` : `${Math.round(row.responseTimeSec / 60)}m`}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        <span className={cn("font-medium", row.leadToTour >= 35 ? "text-emerald-600" : row.leadToTour >= 20 ? "text-amber-600" : "text-rose-600")}>
                          {row.leadToTour}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </section>

      <ConversationFunnelSection />

      <p className="mb-4 mt-2 border-t border-border pt-3 text-xs text-muted-foreground">
        This is a prototype dashboard. Data is illustrative and does not reflect live property metrics. Baseline represents pre-AI performance for comparison. All metrics reflect the selected time period.
      </p>
    </div>
  );
}

