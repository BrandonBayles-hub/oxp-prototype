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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

// -----------------------------------------------------------------------------
// Domo Replica data — illustrative prototype figures mirroring the production
// Domo dashboard structure. All numbers are synthetic.
// -----------------------------------------------------------------------------

const DOMO_ESCALATIONS = {
  total: 480,
  pctOfLeads: 10.9,
  voiceTransferPct: 38.9,
  voiceTransferCount: 185,
};

// Four categories sum to ~10,386 to align with the Tours Booked KPI.
const DOMO_TOURS = {
  guidedDuring: 3552,
  guidedOutside: 3152,
  selfDuring: 1456,
  selfOutside: 2226,
  messageSentAfterTour: 842,
};

// -----------------------------------------------------------------------------
// Lead Capture & Tours (committed v1 metrics) — daily per-property data
// -----------------------------------------------------------------------------

const LEAD_CAPTURE_METRICS = [
  { key: "sessions", label: "Sessions Captured" },
  { key: "guestCards", label: "Total Guest Cards Created" },
  { key: "guestCardsEli", label: "Leads Managed by ELI+" },
  { key: "toursBooked", label: "Tours Booked" },
] as const;

type LeadCaptureMetricKey = (typeof LEAD_CAPTURE_METRICS)[number]["key"];

// Lead source is already captured today; channel capture is targeted for
// phase 1 per engineering grooming (2026-07-09).
const LEAD_SOURCE_SHARES = [
  { name: "ILS / Listing Sites", share: 0.38, color: "#3b82f6" },
  { name: "Property Website", share: 0.27, color: "#10b981" },
  { name: "Referral", share: 0.14, color: "#f59e0b" },
  { name: "Walk-in / Drive-by", share: 0.11, color: "#8b5cf6" },
  { name: "Paid Search", share: 0.10, color: "#06b6d4" },
];

const LEAD_CHANNEL_SHARES = [
  { name: "Chat", share: 0.34, color: "#3b82f6" },
  { name: "SMS", share: 0.24, color: "#10b981" },
  { name: "Email", share: 0.17, color: "#f59e0b" },
  { name: "ILS", share: 0.15, color: "#8b5cf6" },
  { name: "Voice", share: 0.10, color: "#06b6d4" },
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

function sumLeadCaptureCounts(days: LeadCaptureDailyPoint[], selected: Set<Property>): LeadCaptureDailyCounts {
  const totals: LeadCaptureDailyCounts = { sessions: 0, guestCards: 0, guestCardsEli: 0, toursBooked: 0 };
  for (const day of days) {
    for (const p of selected) {
      const c = day.perProperty[p];
      totals.sessions += c.sessions;
      totals.guestCards += c.guestCards;
      totals.guestCardsEli += c.guestCardsEli;
      totals.toursBooked += c.toursBooked;
    }
  }
  return totals;
}

function LeadCaptureSection({ filters, months }: { filters: FiltersState; months: number }) {
  const [metric, setMetric] = useState<LeadCaptureMetricKey>("guestCards");
  const [grouping, setGrouping] = useState<TrendGrouping>("month");

  const days = useMemo(() => sliceLeadCaptureDaily(months), [months]);
  const totals = useMemo(() => sumLeadCaptureCounts(days, filters.selected), [days, filters.selected]);

  const chartData = useMemo(() => {
    const daily = days.map((day) => {
      let value = 0;
      for (const p of filters.selected) {
        value += day.perProperty[p][metric];
      }
      return { date: day.date, value };
    });
    return groupTrendData(daily, grouping);
  }, [days, filters.selected, metric, grouping]);

  const metricLabel = LEAD_CAPTURE_METRICS.find((m) => m.key === metric)?.label ?? "";

  const sourceData = LEAD_SOURCE_SHARES.map((s) => ({ ...s, count: Math.round(totals.guestCards * s.share) }));
  const channelData = LEAD_CHANNEL_SHARES.map((c) => ({ ...c, count: Math.round(totals.guestCards * c.share) }));

  const funnelRows = [
    { label: "Sessions Captured", count: totals.sessions, color: "#3b82f6", pct: 100 },
    { label: "Guest Cards Created", count: totals.guestCards, color: "#10b981", pct: totals.sessions > 0 ? Math.round((totals.guestCards / totals.sessions) * 100) : 0 },
    { label: "Tours Booked", count: totals.toursBooked, color: "#f59e0b", pct: totals.sessions > 0 ? Math.round((totals.toursBooked / totals.sessions) * 100) : 0 },
  ];

  return (
    <section className="mb-6">
      {/* ---- Lead to Tour ---- */}
      <div className="mb-3 flex items-center gap-2">
        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead to Tour</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Sessions Captured" value={totals.sessions.toLocaleString()} sub="selected period" />
        <KpiCard label="Total Guest Cards Created" value={totals.guestCards.toLocaleString()} sub="all sources, selected period" />
        <KpiCard label="Leads Managed by ELI+" value={totals.guestCardsEli.toLocaleString()} sub={`${totals.guestCards > 0 ? Math.round((totals.guestCardsEli / totals.guestCards) * 100) : 0}% of all guest cards`} />
        <KpiCard label="Tours Booked" value={totals.toursBooked.toLocaleString()} sub="selected period" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sessions → Guest Cards → Tours</CardTitle>
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
            <p className="pt-1 text-[11px] italic text-muted-foreground/80">Conversion shown as % of sessions captured</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Guest Cards by Lead Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ count: { label: "Guest Cards", color: "#3b82f6" } }}
              className="!aspect-auto h-[200px] w-full"
            >
              <BarChart data={sourceData} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
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
            <CardTitle className="text-sm">Guest Cards by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ count: { label: "Guest Cards", color: "#3b82f6" } }}
              className="!aspect-auto h-[200px] w-full"
            >
              <BarChart data={channelData} margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
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
            config={{ value: { label: metricLabel, color: "#2563eb" } }}
            className="!aspect-auto h-[280px] w-full"
          >
            <LineChart data={chartData} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={48} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={42} tickFormatter={(v) => Number(v).toLocaleString()} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
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

function CommunicationChannelsSection({ filters, months }: { filters: FiltersState; months: number }) {
  const [metric, setMetric] = useState<CommChannelMetricKey>("voice");
  const [grouping, setGrouping] = useState<TrendGrouping>("month");

  const days = useMemo(() => sliceCommChannelDaily(months), [months]);

  const totals = useMemo(() => {
    const t: CommChannelDailyCounts = { voice: 0, sms: 0, email: 0, chat: 0 };
    for (const day of days) {
      for (const p of filters.selected) {
        const c = day.perProperty[p];
        t.voice += c.voice;
        t.sms += c.sms;
        t.email += c.email;
        t.chat += c.chat;
      }
    }
    return t;
  }, [days, filters.selected]);

  const chartData = useMemo(() => {
    const daily = days.map((day) => {
      let value = 0;
      for (const p of filters.selected) {
        value += day.perProperty[p][metric];
      }
      return { date: day.date, value };
    });
    return groupTrendData(daily, grouping);
  }, [days, filters.selected, metric, grouping]);

  const metricLabel = COMM_CHANNEL_METRICS.find((m) => m.key === metric)?.label ?? "";

  return (
    <>
      {/* ---- Communication Channels ---- */}
      <div className="mb-3 mt-5 flex items-center gap-2">
        <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Communication Channels</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Voice Conversations" value={totals.voice.toLocaleString()} sub="selected period" />
        <KpiCard label="SMS Conversations" value={totals.sms.toLocaleString()} sub="selected period" />
        <KpiCard label="Email Conversations" value={totals.email.toLocaleString()} sub="selected period" />
        <KpiCard label="Chat Conversations" value={totals.chat.toLocaleString()} sub="selected period" />
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
            config={{ value: { label: metricLabel, color: "#2563eb" } }}
            className="!aspect-auto h-[280px] w-full"
          >
            <LineChart data={chartData} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={48} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={42} tickFormatter={(v) => Number(v).toLocaleString()} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
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
  filters: FiltersState;
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
      for (const p of filters.selected) {
        value += day.perProperty[p][metric];
      }
      return { date: day.date, value };
    });
    // Round after grouping so low-volume metrics aggregate sensibly.
    return groupTrendData(daily, grouping).map((pt) => ({ ...pt, value: Math.round(pt.value) }));
  }, [days, filters.selected, metric, grouping]);

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
          config={{ value: { label: metricLabel, color: "#2563eb" } }}
          className="!aspect-auto h-[280px] w-full"
        >
          <LineChart data={chartData} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={48} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={42} tickFormatter={(v) => Number(v).toLocaleString()} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Domo Replica section
// -----------------------------------------------------------------------------

function DomoReplicaSection({ filters, months }: { filters: FiltersState; months: number }) {
  return (
    <section className="mb-6">
      {/* ---- Tours ---- */}
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock className="h-3.5 w-3.5 text-amber-500" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tours</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Guided Tours During Office Hours" value={DOMO_TOURS.guidedDuring.toLocaleString()} sub="guided, during office hours" />
        <KpiCard label="Guided Tours Outside Office Hours" value={DOMO_TOURS.guidedOutside.toLocaleString()} sub="guided, after hours" />
        <KpiCard label="Self Guided Tours During Office Hours" value={DOMO_TOURS.selfDuring.toLocaleString()} sub="self-guided, during office hours" />
        <KpiCard label="Self Guided Tours Outside Office Hours" value={DOMO_TOURS.selfOutside.toLocaleString()} sub="self-guided, after hours" />
      </div>

      <SectionDailyTrendCard metrics={TOURS_TREND_METRICS} data={toursTrendData} filters={filters} months={months} />

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

      <SectionDailyTrendCard metrics={ESCALATIONS_TREND_METRICS} data={escalationsTrendData} filters={filters} months={months} />

      <CommunicationChannelsSection filters={filters} months={months} />

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

      <LeadCaptureSection filters={filters} months={months} />

      <DomoReplicaSection filters={filters} months={months} />

      {/* ============================================================ */}
      {/* Section 1b — Agent Adoption (DEV-301196)                      */}
      {/* ============================================================ */}
      <section className="mb-6">
        {/* ---- Agent Adoption ---- */}
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent Adoption</p>
        </div>

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

      </section>



      <p className="mb-4 mt-2 border-t border-border pt-3 text-xs text-muted-foreground">
        This is a prototype dashboard. Data is illustrative and does not reflect live property metrics. Baseline represents pre-AI performance for comparison. All metrics reflect the selected time period.
      </p>
    </div>
  );
}

