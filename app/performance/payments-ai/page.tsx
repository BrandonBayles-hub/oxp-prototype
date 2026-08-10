"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { ArrowLeft, Info, Loader2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  CHART_GRID_STROKE,
  DeltaPill,
  EscalationsSection,
  SERIES_NEUTRAL,
  ReportFilterBar,
  ReportPageHeader,
  ReportSection,
  SectionBanner,
  SegmentedToggle,
  StatCard,
  StatGrid,
  useReportScope,
  monthsForPeriod,
  selectionRatio,
  seriesColor,
  seriesColorMap,
  serializeFilters,
  type ReportFilters,
  type ReportViewMode,
  type Tone,
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

function buildMonthlyTrend(
  seed: number,
  baseStart: number,
  baseEnd: number,
  currentStart: number,
  currentEnd: number,
  perPropertySpread = 30,
): MonthlyPoint[] {
  const rand = seedRand(seed);
  const data: MonthlyPoint[] = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const baseline = baseStart + (baseEnd - baseStart) * t + (rand() - 0.5) * 0.8;
    const current = currentStart + (currentEnd - currentStart) * t + (rand() - 0.5) * 0.8;
    const perProperty = {} as Record<Property, number>;
    PROPERTIES.forEach((p, idx) => {
      const offset = (idx - PROPERTIES.length / 2) * (perPropertySpread / PROPERTIES.length);
      perProperty[p] = +(current + offset + (rand() - 0.5) * (perPropertySpread / 6)).toFixed(2);
    });
    data.push({
      month: MONTH_LABELS[i],
      monthIdx: i,
      current: +current.toFixed(2),
      baseline: +baseline.toFixed(2),
      perProperty,
    });
  }
  return data;
}

// Section 1 — Overall Collection Performance
const pctRentCollectedTrend = buildMonthlyTrend(701, 89.4, 90.1, 92.1, 94.6, 6);
const totalCollectedTrend = buildMonthlyTrend(702, 1800, 1900, 2100, 2450, 250);
const latePayersTrend = buildMonthlyTrend(703, 210, 200, 172, 138, 60);

// Section 2 — On-Time Collections Efficacy (NEW)
const onTimeRateTrend = buildMonthlyTrend(710, 88.8, 89.3, 91.6, 94.6, 5);

// Section 3 — Automation & Staff Time Freed (NEW)
const deflectionRateTrend = buildMonthlyTrend(720, 52.1, 54.0, 64.2, 70.1, 15);
const staffHoursSavedTrend = buildMonthlyTrend(721, 900, 950, 1600, 1900, 300);

// Section 5 — Escalations
const escalationResolutionTrend = buildMonthlyTrend(730, 4.6, 4.4, 3.6, 3.1, 1.2);

// Bar / donut static data ----------------------------------------------------

const topTenCollected: { label: string; value: number }[] = [
  { label: "Summit Ridge", value: 98.4 },
  { label: "Hillside Living", value: 97.2 },
  { label: "The Beacon", value: 96.8 },
  { label: "Parkview Flats", value: 96.1 },
  { label: "Jamison Apts", value: 95.8 },
];

const bottomTenCollected: { label: string; value: number }[] = [
  { label: "Lakewood", value: 88.2 },
  { label: "Maple Court", value: 89.1 },
  { label: "Cedar Hills", value: 90.4 },
  { label: "Pine Valley", value: 91.2 },
  { label: "Oak Terrace", value: 91.8 },
];

const daysToPayDistribution = [
  { bucket: "0–3 days", count: 18420 },
  { bucket: "4–7 days", count: 8640 },
  { bucket: "8–14 days", count: 3120 },
  { bucket: "15–30 days", count: 1420 },
  { bucket: "30+ days", count: 520 },
];

const firstPaymentRecoveryFunnel = [
  { stage: "Charges posted (delinquent day 1)", value: 3820 },
  { stage: "Reminder sent by AI", value: 3746 },
  { stage: "Opened / engaged", value: 2418 },
  { stage: "Paid within 7 days", value: 1984 },
];

const agingBucketRecovery = [
  { bucket: "0–30 days", amount: 486000 },
  { bucket: "31–60 days", amount: 214000 },
  { bucket: "61–90 days", amount: 96000 },
  { bucket: "90+ days", amount: 42000 },
];

const autoResolvedVsEscalated = [
  { name: "Auto-resolved", value: 8640, color: seriesColor(0)},
  { name: "Escalated to office", value: 3980, color: seriesColor(1)},
];

const scenarioLoad = [
  { name: "Initial reminders", value: 24180, color: seriesColor(0)},
  { name: "Delinquency (late)", value: 12420, color: seriesColor(1)},
  { name: "Pre-collections (legal)", value: 3260, color: seriesColor(2)},
];

const autonomousActionsTaken = [
  { label: "Reminders sent", value: 42180 },
  { label: "Fees auto-waived (under cap)", value: 1284 },
  { label: "Repayment plans proposed", value: 1240 },
  { label: "One-time payments accepted", value: 3620 },
  { label: "Recurring payments set up", value: 1124 },
];

const handoffsByScenario = [
  { label: "Initial reminders", value: 486 },
  { label: "Delinquency (late)", value: 2418 },
  { label: "Pre-collections (legal)", value: 1076 },
];

const languagePreference = [
  { name: "English", value: 84, count: 35476, color: seriesColor(0)},
  { name: "Spanish", value: 14, count: 5911, color: seriesColor(1)},
  { name: "Other", value: 2, count: 793, color: seriesColor(2)},
];

const escalationReasons = [
  { reason: "Payment Settlement", count: 286 },
  { reason: "Balance Breakdown", count: 198 },
  { reason: "Ask to Contact", count: 142 },
  { reason: "Other", count: 98 },
  { reason: "General Info", count: 86 },
  { reason: "Payment Assistance", count: 72 },
  { reason: "Maintenance", count: 48 },
  { reason: "Technical Problems", count: 32 },
];

const savingsFromOfficeHoursDetails = [
  { property: "Hillside Living", amount: "$32,180" },
  { property: "Jamison Apartments", amount: "$28,420" },
  { property: "The Beacon", amount: "$24,120" },
  { property: "Parkview Flats", amount: "$21,840" },
  { property: "Summit Ridge", amount: "$21,280" },
];

const latePayersMonthlyBar = latePayersTrend.map((d) => ({
  month: d.month,
  count: Math.round(d.current),
}));

const perPropertyCollectionTable = [
  { property: "Hillside Living", collected: "97.2%", chargedM: "$486K", collectedM: "$472K" },
  { property: "Jamison Apartments", collected: "95.8%", chargedM: "$418K", collectedM: "$400K" },
  { property: "The Beacon", collected: "96.8%", chargedM: "$392K", collectedM: "$379K" },
  { property: "Parkview Flats", collected: "94.1%", chargedM: "$358K", collectedM: "$337K" },
  { property: "Summit Ridge", collected: "98.4%", chargedM: "$342K", collectedM: "$337K" },
  { property: "Cedar Hills", collected: "90.4%", chargedM: "$298K", collectedM: "$269K" },
  { property: "Oak Terrace", collected: "91.8%", chargedM: "$276K", collectedM: "$253K" },
  { property: "Pine Valley", collected: "91.2%", chargedM: "$254K", collectedM: "$232K" },
  { property: "Maple Court", collected: "89.1%", chargedM: "$228K", collectedM: "$203K" },
  { property: "Lakewood", collected: "88.2%", chargedM: "$216K", collectedM: "$191K" },
];

// -----------------------------------------------------------------------------
// Period slicing
// -----------------------------------------------------------------------------

function sliceTrend<T extends { monthIdx: number }>(data: T[], months: number): T[] {
  return data.slice(Math.max(0, data.length - months));
}

// -----------------------------------------------------------------------------
// Atomic UI primitives
// -----------------------------------------------------------------------------

function NewChip() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-eli-purple/30 bg-eli-warm-bg px-1.5 py-0.5 text-xxs font-medium text-eli-warm-bg-foreground">
      New
    </span>
  );
}

function CardTitleRow({ title, isNew }: { title: string; isNew?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{title}</span>
      {isNew && <NewChip />}
    </span>
  );
}

function LoadingBanner() {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground" />
      Refreshing data based on your filter selection…
    </div>
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
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: PROPERTY_COLORS[p] }}
          />
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
// Trend chart — switches between baseline+current vs per-property lines
// -----------------------------------------------------------------------------

function TrendChart({
  data,
  view,
  selected,
  yDomain,
  yTickFormatter,
  height = 240,
}: {
  data: MonthlyPoint[];
  view: ReportViewMode;
  selected: Set<string>;
  yDomain?: [number, number];
  yTickFormatter?: (v: number) => string;
  height?: number;
}) {
  if (view === "global") {
    const config = {
      baseline: { label: "Pre-AI Baseline", color: "hsl(222 12% 62%)" },
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
              width={44}
              domain={yDomain ?? [0, "auto"]}
              tickFormatter={yTickFormatter}
            />
            <ChartTooltip content={<ChartTooltipContent className="min-w-[12rem]" />} />
            <Line
              type="monotone"
              dataKey="baseline"
              stroke={"hsl(222 12% 62%)"}
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
            <span className="h-0.5 w-4 bg-slate-900" />
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
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={44}
          domain={yDomain ?? [0, "auto"]}
          tickFormatter={yTickFormatter}
        />
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

// -----------------------------------------------------------------------------
// Donut with legend
// -----------------------------------------------------------------------------

function DonutWithLegend({
  data,
  formatRow,
}: {
  data: { name: string; value: number; count?: number; color: string }[];
  formatRow?: (d: { name: string; value: number; count?: number }) => string;
}) {
  const total = data.reduce((s, d) => s + (d.count ?? d.value), 0);
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="h-[180px] w-[180px] shrink-0">
        <ChartContainer config={{}} className="!aspect-auto h-full w-full">
          <PieChart>
            <Pie
              data={data}
              dataKey={data[0]?.count !== undefined ? "count" : "value"}
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
        {data.map((d) => {
          const showPct =
            d.count !== undefined && total > 0
              ? `${Math.round((d.count / total) * 100)}%`
              : `${d.value}%`;
          return (
            <div key={d.name} className="flex items-center gap-3 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span className="flex-1 text-foreground">{d.name}</span>
              <span className="font-semibold text-foreground tabular-nums">
                {formatRow ? formatRow(d) : showPct}
              </span>
              {d.count !== undefined && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  ({d.count.toLocaleString()})
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Simple funnel — horizontal bars, each shrinking
// -----------------------------------------------------------------------------

function FunnelChart({ stages }: { stages: { stage: string; value: number }[] }) {
  const max = stages[0]?.value ?? 1;
  return (
    <div className="space-y-2">
      {stages.map((s) => {
        const pct = (s.value / max) * 100;
        return (
          <div key={s.stage}>
            <div className="mb-0.5 flex items-center justify-between text-sm">
              <span className="font-medium">{s.stage}</span>
              <span className="tabular-nums text-muted-foreground">
                {s.value.toLocaleString()}
                <span className="ml-1 text-xs">{pct < 100 ? `${pct.toFixed(0)}%` : ""}</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-foreground/70"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Compact number formatting
// -----------------------------------------------------------------------------

function compactCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

// -----------------------------------------------------------------------------
// Billboard stat card (Alpha / Golden)
// -----------------------------------------------------------------------------

type MetricTooltip = {
  customer: string;
  engineering: string;
};

function distributeCounts(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const counts = weights.map((weight) => Math.floor((total * weight) / weightSum));
  let remainder = total - counts.reduce((sum, count) => sum + count, 0);
  for (let i = 0; remainder > 0; i += 1, remainder -= 1) {
    counts[i % counts.length] += 1;
  }
  return counts;
}

function BillboardStatCard({
  label,
  value,
  sub,
  channels,
  tooltip,
}: {
  label: string;
  value: string;
  sub: string;
  channels: { label: string; value: string }[];
  tooltip?: MetricTooltip;
}) {
  return (
    <Card className="flex h-full flex-col border-border/60">
      <CardContent className="flex flex-1 items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xxs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            {tooltip && (
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
            )}
          </div>
          <p className="mt-2 text-4xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-1 text-xs font-normal text-muted-foreground">{sub}</p>
        </div>
        {channels.length > 0 && (
          <div className="grid shrink-0 gap-x-4 gap-y-2 border-l border-border pl-4" style={{ gridTemplateColumns: `repeat(${Math.min(channels.length, 3)}, auto)` }}>
            {channels.map((ch) => (
              <div key={ch.label} className="flex flex-col items-center">
                <span className="text-sm font-semibold tabular-nums text-foreground">{ch.value}</span>
                <span className="text-xxs text-muted-foreground">{ch.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function PaymentsAiDashboardPage() {
  const [filters, setFilters, scope] = useReportScope(PROPERTIES);
  const [reportVersion, setReportVersion] = useState<ReportVersion>("original");
  const [loading, setLoading] = useState(false);
  const isFirstRender = useRef(true);
  const filtersKey = useMemo(() => serializeFilters(filters), [filters]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, [filtersKey]);

  const months = useMemo(() => monthsForPeriod(filters.periodId), [filters.periodId]);

  const pctCollectedData = useMemo(() => sliceTrend(pctRentCollectedTrend, months), [months]);
  const totalCollectedData = useMemo(() => sliceTrend(totalCollectedTrend, months), [months]);
  const latePayersData = useMemo(() => sliceTrend(latePayersTrend, months), [months]);
  const onTimeRateData = useMemo(() => sliceTrend(onTimeRateTrend, months), [months]);
  const deflectionData = useMemo(() => sliceTrend(deflectionRateTrend, months), [months]);
  const staffHoursData = useMemo(() => sliceTrend(staffHoursSavedTrend, months), [months]);
  const escalationResolutionData = useMemo(
    () => sliceTrend(escalationResolutionTrend, months),
    [months],
  );

  /**
   * Every headline number on this page was a hardcoded string literal sitting
   * under a Period/Properties filter, so changing the scope moved the charts
   * but left all 14 KPIs frozen — the report told the user it had re-scoped
   * when it had not.
   *
   * Volume metrics scale with both the period length and the share of the
   * portfolio selected; rate metrics stay in their band and only drift, since
   * a collection *rate* should not balloon just because the window is longer.
   */
  const kpi = useMemo(() => {
    const periodScale = months / 12;
    const propertyScale = selectionRatio(filters.properties, PROPERTIES.length);
    const volume = periodScale * propertyScale;

    const rand = seedRand(8888 + months + filters.properties.size);
    const drift = () => 1 + (rand() - 0.5) * 0.05;

    const count = (base: number) => Math.round(base * volume * drift()).toLocaleString();
    const rate = (base: number, digits = 1) => `${(base * drift()).toFixed(digits)}%`;
    const money = (base: number) => {
      const v = base * volume * drift();
      return v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2)}M` : `$${Math.round(v / 1000)}K`;
    };

    const collectedRate = 94.2 * drift();
    const charged = 2_540_000 * volume * drift();
    const collected = charged * (collectedRate / 100);
    const fmtM = (v: number) => `$${(v / 1_000_000).toFixed(2)}M`;

    return {
      // Portfolio scope — these follow the property selection, not the period.
      totalOrganizations: Math.max(1, Math.round(98 * propertyScale)).toLocaleString(),
      totalProperties: Math.max(1, Math.round(842 * propertyScale)).toLocaleString(),
      totalActiveUnits: Math.max(1, Math.round(34_120 * propertyScale)).toLocaleString(),

      pctRentCollected: `${collectedRate.toFixed(1)}%`,
      totalCollected: fmtM(collected),
      totalCharged: fmtM(charged),
      collectedVsCharged: `${fmtM(collected)} / ${fmtM(charged)}`,
      savingsOfficeHours: `$${Math.round(127_840 * volume * drift()).toLocaleString()}`,
      latePayers: Math.max(0, Math.round(142 * propertyScale * drift())).toLocaleString(),
      onTimeRate: rate(94.2),
      payDateKeptRate: rate(82.4),
      deflectionRate: rate(68.4),
      afterHoursCoverage: rate(38.6),
      residentsNoPhone: count(1_842),
      phoneOptOuts: rate(3.2),
      emailOptOuts: rate(1.8),
      totalReminders: count(42_180),
      escalationRate: rate(12.4),
      totalEscalations: count(406),
      openEscalations: count(42),
      resolvedEscalations: count(364),
    };
  }, [months, filters.properties]);

  const alphaKpi = useMemo(() => {
    const rand = seedRand(7777 + months);
    const jitter = () => 1 + (rand() - 0.5) * 0.08;
    const scale = months / 12;
    const fmt = (n: number) => Math.round(n).toLocaleString();

    const totalMessagesCount = Math.round(13300 * scale * jitter());
    const smsCount = Math.round(totalMessagesCount * (9200 / 13300));
    const emailCount = totalMessagesCount - smsCount;
    const totalMessages = totalMessagesCount.toLocaleString();
    const smsSent = smsCount.toLocaleString();
    const emailsSent = emailCount.toLocaleString();

    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayCounts = distributeCounts(totalMessagesCount, [2100, 2350, 2200, 2050, 1900, 1400, 950]);
    const dayVolumes = dayLabels
      .map((label, index) => ({ label, count: dayCounts[index] }))
      .sort((a, b) => b.count - a.count);

    const hourBucketLabels = ["12a–4a", "4a–8a", "8a–12p", "12p–4p", "4p–8p", "8p–12a"];
    const hourBucketCounts = distributeCounts(totalMessagesCount, [640, 1800, 4850, 3400, 2500, 860]);
    const hourBuckets = hourBucketLabels
      .map((label, index) => ({ label, count: hourBucketCounts[index] }))
      .sort((a, b) => b.count - a.count);

    // Peak hour sits inside the busiest 4-hour bucket (approx 45% of that bucket).
    const topHourLabel = "10 AM";
    const topHourCount = Math.max(1, Math.round(hourBuckets[0].count * 0.45));

    return {
      totalMessages,
      smsSent,
      emailsSent,
      topDay: dayVolumes[0],
      dayBreakdown: dayVolumes.slice(1),
      topHour: { label: topHourLabel, count: topHourCount },
      hourBuckets,
      escalationRate: `${(12.4 * jitter()).toFixed(1)}%`,
      totalEscalations: fmt(406 * scale * jitter()),
      openEscalations: String(Math.round(42 * scale * jitter())),
      resolvedEscalations: fmt(364 * scale * jitter()),
      optOutRate: `${(3.2 * jitter()).toFixed(1)}%`,
      smsOptOut: `${(3.8 * jitter()).toFixed(1)}%`,
      emailOptOut: `${(2.4 * jitter()).toFixed(1)}%`,
      avgAgentResponseTime: `< ${(7 * jitter()).toFixed(0)} sec`,
      smsAgentTime: `< ${(6 * jitter()).toFixed(0)} sec`,
      emailAgentTime: `< ${(9 * jitter()).toFixed(0)} sec`,
      responseRate: `${(34.6 * jitter()).toFixed(1)}%`,
      smsResponseRate: `${(38.2 * jitter()).toFixed(1)}%`,
      emailResponseRate: `${(28.4 * jitter()).toFixed(1)}%`,
      avgResidentResponseTime: `${(5.1 * jitter()).toFixed(1)} hrs`,
      smsResidentTime: `${(3.6 * jitter()).toFixed(1)} hrs`,
      emailResidentTime: `${(7.8 * jitter()).toFixed(1)} hrs`,
      onTimeRate: `${(94.2 * jitter()).toFixed(1)}%`,
      deflectionRate: `${(68.4 * jitter()).toFixed(1)}%`,
    };
  }, [months]);

  const METRIC_TOOLTIPS = {
    totalMessages: {
      customer: "Total messages sent by this agent for the filtered time period and properties.",
      engineering:
        "Each message sent by super agent is tagged by super agent to the originating sub-agent(s). If a single message was triggered by multiple sub-agents, it counts toward each sub-agent. Make sure we can break down the metric by communication channel since that is also displayed.",
    },
    messagesByDay: {
      customer: "How many messages this agent sent on each day of the week for the filtered time period and properties.",
      engineering:
        "Count messages tagged to this sub-agent, grouped by day-of-week of send time (using each property's local timezone). The seven day counts MUST sum exactly to Total Messages Sent for the same filter scope (sub-agent + period + properties).",
    },
    messagesByHour: {
      customer:
        "How many messages this agent sent during each part of the day for the filtered time period and properties. Times use each property's local timezone.",
      engineering:
        "Bucket message send timestamps into 4-hour windows using each property's local timezone (so 3:55 PM Mountain and 3:55 PM Central both land in 12p–4p). The six bucket counts MUST sum exactly to Total Messages Sent for the same filter scope (sub-agent + period + properties).",
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
        "When this agent reaches out first (for example, a rent reminder or payment due notification), how often the resident replies within 48 hours.",
      engineering:
        "Denominator = proactive outreach messages initiated by this sub-agent in filter scope. Numerator = those that received ≥1 resident reply within 48 hours of the outreach. Break down by channel of the proactive message.",
    },
    residentResponseTime: {
      customer:
        "For residents who replied within 48 hours of a proactive message from this agent, the average time it took them to reply.",
      engineering:
        "Uses the same dataset as Resident Response Rate Within 48 Hours (proactive outreach messages that received a resident reply within 48 hours). Compute the average (not median) elapsed time from delivery of the proactive message to the resident's reply. This value must never exceed 48 hours because the cohort is limited to replies within that window. Break down by channel.",
    },
    paymentCollectionSpeed: {
      customer:
        "How often residents pay on time when this agent is helping with payment outreach for the filtered time period and properties.",
      engineering:
        "On-time payment rate for the filtered resident/property/period cohort touched by Payments AI. Supporting deflection rate = payment issues resolved without staff escalation ÷ total payment conversations in scope.",
    },
  } as const satisfies Record<string, MetricTooltip>;

  const alphaStats = [
    {
      label: "Total Messages Sent",
      value: alphaKpi.totalMessages,
      sub: "SMS and email message volume",
      channels: [
        { label: "SMS", value: alphaKpi.smsSent },
        { label: "Email", value: alphaKpi.emailsSent },
      ],
      tooltip: METRIC_TOOLTIPS.totalMessages,
    },
    {
      label: "Messages Sent by Day",
      value: `${alphaKpi.topDay.count.toLocaleString()}`,
      sub: `peak day: ${alphaKpi.topDay.label}`,
      channels: alphaKpi.dayBreakdown.map((d) => ({ label: d.label, value: d.count.toLocaleString() })),
      tooltip: METRIC_TOOLTIPS.messagesByDay,
    },
    {
      label: "Messages Sent by Hour",
      value: `${alphaKpi.topHour.count.toLocaleString()}`,
      sub: `peak hour: ${alphaKpi.topHour.label}`,
      channels: alphaKpi.hourBuckets.map((h) => ({ label: h.label, value: h.count.toLocaleString() })),
      tooltip: METRIC_TOOLTIPS.messagesByHour,
    },
    {
      label: "Escalation Rate",
      value: alphaKpi.escalationRate,
      sub: "of AI contacts escalated",
      channels: [
        { label: "Total", value: alphaKpi.totalEscalations },
        { label: "Open", value: alphaKpi.openEscalations },
        { label: "Resolved", value: alphaKpi.resolvedEscalations },
      ],
      tooltip: METRIC_TOOLTIPS.escalationRate,
    },
    {
      label: "Opt Out Rate",
      value: alphaKpi.optOutRate,
      sub: "opted out of AI messaging",
      channels: [
        { label: "SMS", value: alphaKpi.smsOptOut },
        { label: "Email", value: alphaKpi.emailOptOut },
      ],
      tooltip: METRIC_TOOLTIPS.optOutRate,
    },
    {
      label: "Average Agent Response Time",
      value: alphaKpi.avgAgentResponseTime,
      sub: "resident message to agent reply",
      channels: [
        { label: "SMS", value: alphaKpi.smsAgentTime },
        { label: "Email", value: alphaKpi.emailAgentTime },
      ],
      tooltip: METRIC_TOOLTIPS.agentResponseTime,
    },
    {
      label: "Resident Response Rate Within 48 Hours",
      value: alphaKpi.responseRate,
      sub: "across all channels",
      channels: [
        { label: "SMS", value: alphaKpi.smsResponseRate },
        { label: "Email", value: alphaKpi.emailResponseRate },
      ],
      tooltip: METRIC_TOOLTIPS.residentResponseRate,
    },
    {
      label: "Resident Response Time",
      value: alphaKpi.avgResidentResponseTime,
      sub: "average time to reply",
      channels: [
        { label: "SMS", value: alphaKpi.smsResidentTime },
        { label: "Email", value: alphaKpi.emailResidentTime },
      ],
      tooltip: METRIC_TOOLTIPS.residentResponseTime,
    },
    {
      label: "Payment Collection Speed",
      value: alphaKpi.onTimeRate,
      sub: "on-time payment rate",
      tooltip: METRIC_TOOLTIPS.paymentCollectionSpeed,
      channels: [{ label: "Deflection rate", value: alphaKpi.deflectionRate }],
    },
  ];

  return (
    <div className="-mt-2">
      <ReportPageHeader
        agent="Payments AI"
        description="Collection rates and delinquency recovery, plus the reminders ELI+ handled"
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
          }}
          options={REPORT_VERSION_OPTIONS}
          aria-label="Payments AI report version"
        />
      </div>

      {reportVersion === "original" ? (
        <>

      {loading && <LoadingBanner />}

      {/* ============================================================ */}
      {/* ELI+ Metrics Dashboard                                        */}
      {/* ============================================================ */}
      <section className="mb-6">
        <SectionBanner
          title="ELI+ Metrics Dashboard"
          description="Activation, collections, and savings headline"
        />

        <StatCard
          size="hero"
          className="mb-3"
          label="On-time payment rate"
          value={kpi.onTimeRate}
          delta="+2.1 pts vs prior"
          deltaTone="positive"
          sub="selected period"
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total organizations" value={kpi.totalOrganizations} delta="+8" sub="activated" />
          <StatCard label="Total properties" value={kpi.totalProperties} delta="+62" sub="properties" />
          <StatCard label="Total active units" value={kpi.totalActiveUnits} delta="+1,840" sub="units" />
          <StatCard label="Rent collected" value={kpi.pctRentCollected} delta="+2.1 pts" sub="collection rate" />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Late Payers (After Grace Period)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="!aspect-auto h-[240px] w-full">
                <BarChart data={latePayersMonthlyBar} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} domain={[0, 260]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <StatCard
            label="Rent payments / charges / % collected"
            value={kpi.collectedVsCharged}
            sub="payments vs charges"
          />
        </div>
      </section>

      {/* ============================================================ */}
      {/* Savings from Office Hours                                       */}
      {/* ============================================================ */}
      <section className="mb-6">
        <StatCard
          label="Savings from office hours"
          value={kpi.savingsOfficeHours}
          delta="+$18K"
          sub="estimated savings · last 30 days"
        />

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top 10 — % Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="!aspect-auto h-[200px] w-full">
                <BarChart data={topTenCollected} margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={4} fontSize={10} angle={-20} textAnchor="end" height={30} interval={0} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={4} width={36} domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={10} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${v}%`} />} />
                  <Bar dataKey="value" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Bottom 10 — % Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="!aspect-auto h-[200px] w-full">
                <BarChart data={bottomTenCollected} margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={4} fontSize={10} angle={-20} textAnchor="end" height={30} interval={0} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={4} width={36} domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={10} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${v}%`} />} />
                  <Bar dataKey="value" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-3 border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Savings from Office Hours — Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {savingsFromOfficeHoursDetails.map((row) => (
                <div key={row.property} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
                  <span className="text-foreground">{row.property}</span>
                  <span className="tabular-nums font-medium text-foreground">{row.amount}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ============================================================ */}
      {/* Section 1 — Overall Collection Performance                    */}
      {/* ============================================================ */}
      <section className="mb-6">
        <SectionBanner
          title="Overall Collection Performance"
          description="Key collection metrics across all properties — independent of AI usage"
          action={<NewChip />}
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Rent collected"
            value={kpi.pctRentCollected}
            delta="+2.1 pts"
            sub="of billed rent collected · selected period"
          />
          <StatCard
            label="Total rent collected"
            action={<NewChip />}
            value={kpi.totalCollected}
            delta="+8%"
            sub="collected this period"
          />
          <StatCard
            label="Total rent charged"
            action={<NewChip />}
            value={kpi.totalCharged}
            delta="+7%"
            sub="billed this period"
          />
          <StatCard
            lowerIsBetter
            label="Late payers (after grace)"
            value={kpi.latePayers}
            delta="-9"
            sub="avg per property"
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                <CardTitleRow title="% Rent Collected — Monthly Trend" isNew />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={pctCollectedData}
                view={filters.view}
                selected={filters.properties}
                yDomain={filters.view === "global" ? [80, 100] : [80, 100]}
                yTickFormatter={(v) => `${v}%`}
              />
              <PropertyChips state={filters} setState={setFilters} />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                <CardTitleRow title="Total Rent Collected — Monthly Trend" isNew />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={totalCollectedData}
                view={filters.view}
                selected={filters.properties}
                yDomain={filters.view === "global" ? [1500, 2700] : [1500, 2800]}
                yTickFormatter={(v) => `$${v}K`}
              />
              <PropertyChips state={filters} setState={setFilters} />
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                <CardTitleRow title="Late Payers (After Grace) — Monthly Trend" isNew />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={latePayersData}
                view={filters.view}
                selected={filters.properties}
                yDomain={filters.view === "global" ? [0, 260] : [0, 320]}
              />
              <PropertyChips state={filters} setState={setFilters} />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                <CardTitleRow title="Collection Rate Comparison" isNew />
              </CardTitle>
              <p className="text-xs text-muted-foreground">Current vs. baseline (pre-AI) for selected period</p>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={pctCollectedData}
                view={filters.view}
                selected={filters.properties}
                yDomain={[80, 100]}
                yTickFormatter={(v) => `${v}%`}
              />
              <PropertyChips state={filters} setState={setFilters} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Section 2 — On-Time Collections Efficacy                      */}
      {/* ============================================================ */}
      <section className="mb-6">
        <SectionBanner
          title="On-Time Collections Efficacy"
          description="Is the AI actually shifting residents to pay on time?"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            label="On-time payment rate"
            value={kpi.onTimeRate}
            delta="+2.1 pts"
            sub="of billed rent paid before late fees posted"
          />
          <StatCard
            label="Expected payment date kept rate"
            value={kpi.payDateKeptRate}
            delta="+6.8 pts"
            sub="of AI-captured pay-date commitments honored"
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                <CardTitleRow title="On-Time Payment Rate — Monthly Trend" isNew />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={onTimeRateData}
                view={filters.view}
                selected={filters.properties}
                yDomain={filters.view === "global" ? [80, 100] : [80, 100]}
                yTickFormatter={(v) => `${v}%`}
              />
              <PropertyChips state={filters} setState={setFilters} />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                <CardTitleRow title="Days-to-Pay Distribution" isNew />
              </CardTitle>
              <p className="text-xs text-muted-foreground">Days after rent due date until payment posted</p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="!aspect-auto h-[240px] w-full">
                <BarChart data={daysToPayDistribution} margin={{ left: 8, right: 12, top: 8, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} angle={-20} textAnchor="end" height={40} interval={0} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={44} tickFormatter={(v) => v.toLocaleString()} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mt-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                <CardTitleRow title="First-Payment Recovery Funnel" isNew />
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Charges posted → AI reminder → engagement → paid within 7 days
              </p>
            </CardHeader>
            <CardContent>
              <FunnelChart stages={firstPaymentRecoveryFunnel} />
            </CardContent>
          </Card>
        </div>

        <div className="mt-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                <CardTitleRow title="Aging Bucket Recovery ($ recovered)" isNew />
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Delinquent balances the AI helped bring current, by aging bucket
              </p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="!aspect-auto h-[220px] w-full">
                <BarChart data={agingBucketRecovery} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={48} tickFormatter={compactCurrency} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => compactCurrency(Number(v))} />} />
                  <Bar dataKey="amount" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Section 3 — Automation & Staff Time Freed                     */}
      {/* ============================================================ */}
      <section className="mb-6">
        <SectionBanner
          title="Automation & Staff Time Freed"
          description="What did the AI actually do without a human?"
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)]">
          <Card>
            <CardContent className="px-5 py-4">
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xxs font-semibold text-muted-foreground">
                  Staff hours saved
                </p>
              </div>
              <p className="mt-1 text-4xl font-bold tracking-tight text-foreground">
                {loading ? "…" : "1,842"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                hours saved · +240 vs prior period
              </p>
              <p className="mt-0.5 text-xxs italic text-muted-foreground/80">
                18,420 messages × 6 min avg manual handling ÷ 60
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Deflection rate"
              value={kpi.deflectionRate}
              delta="+4.2 pts"
              sub="of resident payment conversations fully AI-resolved"
            />
            <StatCard
              label="After-hours coverage"
              value={kpi.afterHoursCoverage}
              delta="+2.4 pts"
              sub="of AI interactions handled outside office hours"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                <CardTitleRow title="Deflection Rate — Monthly Trend" isNew />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={deflectionData}
                view={filters.view}
                selected={filters.properties}
                yDomain={filters.view === "global" ? [40, 80] : [40, 90]}
                yTickFormatter={(v) => `${v}%`}
              />
              <PropertyChips state={filters} setState={setFilters} />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                <CardTitleRow title="Staff Hours Saved — Monthly Trend" isNew />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={staffHoursData}
                view={filters.view}
                selected={filters.properties}
                yDomain={filters.view === "global" ? [700, 2200] : [700, 2400]}
              />
              <PropertyChips state={filters} setState={setFilters} />
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                <CardTitleRow title="Auto-Resolved vs. Escalated" isNew />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DonutWithLegend
                data={autoResolvedVsEscalated.map((d) => ({ ...d, count: d.value }))}
              />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                <CardTitleRow title="Scenario Load Distribution" isNew />
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Where the AI is spending its time across initial / late / legal cadences
              </p>
            </CardHeader>
            <CardContent>
              <DonutWithLegend
                data={scenarioLoad.map((d) => ({ ...d, count: d.value }))}
              />
            </CardContent>
          </Card>
        </div>

        <div className="mt-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                <CardTitleRow title="Autonomous Actions Taken by Type" isNew />
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Actions the AI executed without a human — maps to the guardrails in Payments AI Settings
              </p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="!aspect-auto h-[240px] w-full">
                <BarChart data={autonomousActionsTaken} margin={{ left: 8, right: 12, top: 8, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} angle={-15} textAnchor="end" height={40} interval={0} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={48} tickFormatter={(v) => v.toLocaleString()} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mt-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                <CardTitleRow title="Handoffs to Office by Scenario" isNew />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="!aspect-auto h-[220px] w-full">
                <BarChart data={handoffsByScenario} margin={{ left: 8, right: 12, top: 8, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Section 4 — Messaging                                          */}
      {/* ============================================================ */}
      <section className="mb-6">
        <SectionBanner
          title="Messaging"
          description="Reminder volume, response rates, and opt-outs"
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Residents with no phone"
            value={kpi.residentsNoPhone}
            sub="no phone on file"
          />
          <StatCard label="Phone opt-outs" value={kpi.phoneOptOuts} sub="opt-out rate" />
          <StatCard label="Email opt-outs" value={kpi.emailOptOuts} sub="opt-out rate" />
          <StatCard
            label="Total reminders sent"
            value={kpi.totalReminders}
            delta="+12%"
            sub="SMS + email"
          />
        </div>

        <div className="mt-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Office Escalation Reasons</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="!aspect-auto h-[260px] w-full">
                <BarChart data={escalationReasons} margin={{ left: 8, right: 12, top: 8, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="reason" tickLine={false} axisLine={false} tickMargin={8} angle={-25} textAnchor="end" height={60} interval={0} fontSize={10} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mt-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Language Preference</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutWithLegend data={languagePreference} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Section 5 — Escalations                                       */}
      {/* ============================================================ */}
      <EscalationsSection
        description="Escalation rate, volume, resolution status, and reasons"
        stats={[
          {
            label: "Escalation rate",
            value: kpi.escalationRate,
            delta: "-1.8 pts",
            deltaTone: "positive",
            sub: "of AI conversations escalated",
          },
          { label: "Total escalations", value: kpi.totalEscalations, sub: "escalated to staff" },
          { label: "Open escalations", value: kpi.openEscalations, sub: "pending resolution" },
          {
            label: "Resolved",
            value: kpi.resolvedEscalations,
            delta: "89% resolution",
            deltaTone: "positive",
            sub: "resolved by staff",
          },
        ]}
      >
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              <CardTitleRow title="Avg Escalation Resolution Time — Trend" isNew />
            </CardTitle>
            <p className="text-xs text-muted-foreground">Days from escalation created to resolved</p>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={escalationResolutionData}
              view={filters.view}
              selected={filters.properties}
              yDomain={filters.view === "global" ? [0, 6] : [0, 7]}
            />
            <PropertyChips state={filters} setState={setFilters} />
          </CardContent>
        </Card>
      </EscalationsSection>

      {/* ============================================================ */}
      {/* Section 6 — Appendix                                          */}
      {/* ============================================================ */}
      <section className="mb-6">
        <SectionBanner
          title="Appendix"
          description="Detailed property-level and daily breakdowns"
        />

        <div className="mb-3 max-w-xs">
          <StatCard label="Avg late payers" value={kpi.latePayers} sub="per property avg" />
        </div>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Rent Payments / Charges / % Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground">Property</th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground">Charged</th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground">Collected</th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground">% Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {perPropertyCollectionTable.map((r) => (
                    <tr key={r.property} className="border-b border-muted last:border-0">
                      <td className="px-2 py-1.5 text-foreground">{r.property}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{r.chargedM}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{r.collectedM}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-medium text-foreground">{r.collected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <p className="mb-4 mt-2 border-t border-border pt-3 text-xs text-muted-foreground">
        This is a prototype dashboard. Data is illustrative and does not reflect live property
        metrics. Baseline represents pre-AI performance for comparison. All metrics reflect the
        selected time period.
      </p>

        </>
      ) : null}

      {(reportVersion === "jvm" || reportVersion === "golden") ? (
        <>
          {loading && <LoadingBanner />}

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

          {/* Existing sections from Original below the billboard cards */}
          <section className="mb-6">
            <SectionBanner
              title="ELI+ Metrics Dashboard"
              description="Activation, collections, and savings headline"
            />

            <StatCard
              size="hero"
              className="mb-3"
              label="On-time payment rate"
              value={kpi.onTimeRate}
              delta="+2.1 pts vs prior"
              deltaTone="positive"
              sub="selected period"
            />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total organizations" value={kpi.totalOrganizations} delta="+8" sub="activated" />
              <StatCard label="Total properties" value={kpi.totalProperties} delta="+62" sub="properties" />
              <StatCard label="Total active units" value={kpi.totalActiveUnits} delta="+1,840" sub="units" />
              <StatCard label="Rent collected" value={kpi.pctRentCollected} delta="+2.1 pts" sub="collection rate" />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Late Payers (After Grace Period)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="!aspect-auto h-[240px] w-full">
                    <BarChart data={latePayersMonthlyBar} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} domain={[0, 260]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <StatCard
                label="Rent payments / charges / % collected"
                value={kpi.collectedVsCharged}
                sub="payments vs charges"
              />
            </div>
          </section>

          <section className="mb-6">
            <StatCard
              label="Savings from office hours"
              value={kpi.savingsOfficeHours}
              delta="+$18K"
              sub="estimated savings · last 30 days"
            />

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top 10 — % Collected</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="!aspect-auto h-[200px] w-full">
                    <BarChart data={topTenCollected} margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={4} fontSize={10} angle={-20} textAnchor="end" height={30} interval={0} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={4} width={36} domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={10} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${v}%`} />} />
                      <Bar dataKey="value" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Bottom 10 — % Collected</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="!aspect-auto h-[200px] w-full">
                    <BarChart data={bottomTenCollected} margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={4} fontSize={10} angle={-20} textAnchor="end" height={30} interval={0} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={4} width={36} domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={10} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${v}%`} />} />
                      <Bar dataKey="value" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-3 border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Savings from Office Hours — Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {savingsFromOfficeHoursDetails.map((row) => (
                    <div key={row.property} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
                      <span className="text-foreground">{row.property}</span>
                      <span className="tabular-nums font-medium text-foreground">{row.amount}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="mb-6">
            <SectionBanner
              title="Overall Collection Performance"
              description="Key collection metrics across all properties — independent of AI usage"
              action={<NewChip />}
            />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Rent collected" value={kpi.pctRentCollected} delta="+2.1 pts" sub="of billed rent collected · selected period" />
              <StatCard label="Total rent collected" action={<NewChip />} value={kpi.totalCollected} delta="+8%" sub="collected this period" />
              <StatCard label="Total rent charged" action={<NewChip />} value={kpi.totalCharged} delta="+7%" sub="billed this period" />
              <StatCard lowerIsBetter label="Late payers (after grace)" value={kpi.latePayers} delta="-9" sub="avg per property" />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm"><CardTitleRow title="% Rent Collected — Monthly Trend" isNew /></CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendChart data={pctCollectedData} view={filters.view} selected={filters.properties} yDomain={filters.view === "global" ? [80, 100] : [80, 100]} yTickFormatter={(v) => `${v}%`} />
                  <PropertyChips state={filters} setState={setFilters} />
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm"><CardTitleRow title="Total Rent Collected — Monthly Trend" isNew /></CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendChart data={totalCollectedData} view={filters.view} selected={filters.properties} yDomain={filters.view === "global" ? [1500, 2700] : [1500, 2800]} yTickFormatter={(v) => `$${v}K`} />
                  <PropertyChips state={filters} setState={setFilters} />
                </CardContent>
              </Card>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm"><CardTitleRow title="Late Payers (After Grace) — Monthly Trend" isNew /></CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendChart data={latePayersData} view={filters.view} selected={filters.properties} yDomain={filters.view === "global" ? [0, 260] : [0, 320]} />
                  <PropertyChips state={filters} setState={setFilters} />
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm"><CardTitleRow title="Collection Rate Comparison" isNew /></CardTitle>
                  <p className="text-xs text-muted-foreground">Current vs. baseline (pre-AI) for selected period</p>
                </CardHeader>
                <CardContent>
                  <TrendChart data={pctCollectedData} view={filters.view} selected={filters.properties} yDomain={[80, 100]} yTickFormatter={(v) => `${v}%`} />
                  <PropertyChips state={filters} setState={setFilters} />
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="mb-6">
            <SectionBanner title="On-Time Collections Efficacy" description="Is the AI actually shifting residents to pay on time?" />

            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard label="On-time payment rate" value={kpi.onTimeRate} delta="+2.1 pts" sub="of billed rent paid before late fees posted" />
              <StatCard label="Expected payment date kept rate" value={kpi.payDateKeptRate} delta="+6.8 pts" sub="of AI-captured pay-date commitments honored" />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm"><CardTitleRow title="On-Time Payment Rate — Monthly Trend" isNew /></CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendChart data={onTimeRateData} view={filters.view} selected={filters.properties} yDomain={filters.view === "global" ? [80, 100] : [80, 100]} yTickFormatter={(v) => `${v}%`} />
                  <PropertyChips state={filters} setState={setFilters} />
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm"><CardTitleRow title="Days-to-Pay Distribution" isNew /></CardTitle>
                  <p className="text-xs text-muted-foreground">Days after rent due date until payment posted</p>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="!aspect-auto h-[240px] w-full">
                    <BarChart data={daysToPayDistribution} margin={{ left: 8, right: 12, top: 8, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                      <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} angle={-20} textAnchor="end" height={40} interval={0} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} width={44} tickFormatter={(v) => v.toLocaleString()} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <div className="mt-3">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm"><CardTitleRow title="First-Payment Recovery Funnel" isNew /></CardTitle>
                  <p className="text-xs text-muted-foreground">Charges posted → AI reminder → engagement → paid within 7 days</p>
                </CardHeader>
                <CardContent>
                  <FunnelChart stages={firstPaymentRecoveryFunnel} />
                </CardContent>
              </Card>
            </div>

            <div className="mt-3">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm"><CardTitleRow title="Aging Bucket Recovery ($ recovered)" isNew /></CardTitle>
                  <p className="text-xs text-muted-foreground">Delinquent balances the AI helped bring current, by aging bucket</p>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="!aspect-auto h-[220px] w-full">
                    <BarChart data={agingBucketRecovery} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                      <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} width={48} tickFormatter={compactCurrency} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(v) => compactCurrency(Number(v))} />} />
                      <Bar dataKey="amount" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="mb-6">
            <SectionBanner title="Automation & Staff Time Freed" description="What did the AI actually do without a human?" />

            <div className="grid gap-3 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)]">
              <Card>
                <CardContent className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <p className="flex-1 text-xxs font-semibold text-muted-foreground">Staff hours saved</p>
                  </div>
                  <p className="mt-1 text-4xl font-bold tracking-tight text-foreground">{loading ? "…" : "1,842"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">hours saved · +240 vs prior period</p>
                  <p className="mt-0.5 text-xxs italic text-muted-foreground/80">18,420 messages × 6 min avg manual handling ÷ 60</p>
                </CardContent>
              </Card>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Deflection rate" value={kpi.deflectionRate} delta="+4.2 pts" sub="of resident payment conversations fully AI-resolved" />
                <StatCard label="After-hours coverage" value={kpi.afterHoursCoverage} delta="+2.4 pts" sub="of AI interactions handled outside office hours" />
              </div>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm"><CardTitleRow title="Deflection Rate — Monthly Trend" isNew /></CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendChart data={deflectionData} view={filters.view} selected={filters.properties} yDomain={filters.view === "global" ? [40, 80] : [40, 90]} yTickFormatter={(v) => `${v}%`} />
                  <PropertyChips state={filters} setState={setFilters} />
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm"><CardTitleRow title="Staff Hours Saved — Monthly Trend" isNew /></CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendChart data={staffHoursData} view={filters.view} selected={filters.properties} yDomain={filters.view === "global" ? [700, 2200] : [700, 2400]} />
                  <PropertyChips state={filters} setState={setFilters} />
                </CardContent>
              </Card>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm"><CardTitleRow title="Auto-Resolved vs. Escalated" isNew /></CardTitle>
                </CardHeader>
                <CardContent>
                  <DonutWithLegend data={autoResolvedVsEscalated.map((d) => ({ ...d, count: d.value }))} />
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm"><CardTitleRow title="Scenario Load Distribution" isNew /></CardTitle>
                  <p className="text-xs text-muted-foreground">Where the AI is spending its time across initial / late / legal cadences</p>
                </CardHeader>
                <CardContent>
                  <DonutWithLegend data={scenarioLoad.map((d) => ({ ...d, count: d.value }))} />
                </CardContent>
              </Card>
            </div>

            <div className="mt-3">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm"><CardTitleRow title="Autonomous Actions Taken by Type" isNew /></CardTitle>
                  <p className="text-xs text-muted-foreground">Actions the AI executed without a human — maps to the guardrails in Payments AI Settings</p>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="!aspect-auto h-[240px] w-full">
                    <BarChart data={autonomousActionsTaken} margin={{ left: 8, right: 12, top: 8, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} angle={-15} textAnchor="end" height={40} interval={0} fontSize={11} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} width={48} tickFormatter={(v) => v.toLocaleString()} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <div className="mt-3">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm"><CardTitleRow title="Handoffs to Office by Scenario" isNew /></CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="!aspect-auto h-[220px] w-full">
                    <BarChart data={handoffsByScenario} margin={{ left: 8, right: 12, top: 8, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="mb-6">
            <SectionBanner title="Messaging" description="Reminder volume, response rates, and opt-outs" />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Residents with no phone" value={kpi.residentsNoPhone} sub="no phone on file" />
              <StatCard label="Phone opt-outs" value={kpi.phoneOptOuts} sub="opt-out rate" />
              <StatCard label="Email opt-outs" value={kpi.emailOptOuts} sub="opt-out rate" />
              <StatCard label="Total reminders sent" value={kpi.totalReminders} delta="+12%" sub="SMS + email" />
            </div>

            <div className="mt-3">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Office Escalation Reasons</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="!aspect-auto h-[260px] w-full">
                    <BarChart data={escalationReasons} margin={{ left: 8, right: 12, top: 8, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                      <XAxis dataKey="reason" tickLine={false} axisLine={false} tickMargin={8} angle={-25} textAnchor="end" height={60} interval={0} fontSize={10} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <div className="mt-3">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Language Preference</CardTitle>
                </CardHeader>
                <CardContent>
                  <DonutWithLegend data={languagePreference} />
                </CardContent>
              </Card>
            </div>
          </section>

          <EscalationsSection
            description="Escalation rate, volume, resolution status, and reasons"
            stats={[
              { label: "Escalation rate", value: kpi.escalationRate, delta: "-1.8 pts", deltaTone: "positive", sub: "of AI conversations escalated" },
              { label: "Total escalations", value: kpi.totalEscalations, sub: "escalated to staff" },
              { label: "Open escalations", value: kpi.openEscalations, sub: "pending resolution" },
              { label: "Resolved", value: kpi.resolvedEscalations, delta: "89% resolution", deltaTone: "positive", sub: "resolved by staff" },
            ]}
          >
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm"><CardTitleRow title="Avg Escalation Resolution Time — Trend" isNew /></CardTitle>
                <p className="text-xs text-muted-foreground">Days from escalation created to resolved</p>
              </CardHeader>
              <CardContent>
                <TrendChart data={escalationResolutionData} view={filters.view} selected={filters.properties} yDomain={filters.view === "global" ? [0, 6] : [0, 7]} />
                <PropertyChips state={filters} setState={setFilters} />
              </CardContent>
            </Card>
          </EscalationsSection>

          <section className="mb-6">
            <SectionBanner title="Appendix" description="Detailed property-level and daily breakdowns" />

            <div className="mb-3 max-w-xs">
              <StatCard label="Avg late payers" value={kpi.latePayers} sub="per property avg" />
            </div>

            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Rent Payments / Charges / % Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-2 py-2 text-left font-medium text-muted-foreground">Property</th>
                        <th className="px-2 py-2 text-right font-medium text-muted-foreground">Charged</th>
                        <th className="px-2 py-2 text-right font-medium text-muted-foreground">Collected</th>
                        <th className="px-2 py-2 text-right font-medium text-muted-foreground">% Collected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perPropertyCollectionTable.map((r) => (
                        <tr key={r.property} className="border-b border-muted last:border-0">
                          <td className="px-2 py-1.5 text-foreground">{r.property}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{r.chargedM}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{r.collectedM}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums font-medium text-foreground">{r.collected}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>

          <p className="mb-4 mt-2 border-t border-border pt-3 text-xs text-muted-foreground">
            This is a prototype dashboard. Data is illustrative and does not reflect live property
            metrics. Baseline represents pre-AI performance for comparison. All metrics reflect the
            selected time period.
          </p>
        </>
      ) : null}

    </div>
  );
}
