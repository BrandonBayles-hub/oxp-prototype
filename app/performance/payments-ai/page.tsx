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
import { ArrowLeft, Loader2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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
  { name: "Auto-resolved", value: 8640, color: seriesColor(0) },
  { name: "Escalated to office", value: 3980, color: "hsl(222 12% 62%)" },
];

const scenarioLoad = [
  { name: "Initial reminders", value: 24180, color: seriesColor(0) },
  { name: "Delinquency (late)", value: 12420, color: SERIES_NEUTRAL },
  { name: "Pre-collections (legal)", value: 3260, color: "hsl(222 12% 62%)" },
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
  { name: "English", value: 84, count: 35476, color: seriesColor(0) },
  { name: "Spanish", value: 14, count: 5911, color: SERIES_NEUTRAL },
  { name: "Other", value: 2, count: 793, color: "hsl(222 12% 62%)" },
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
    <span className="inline-flex shrink-0 items-center rounded-full border border-eli-purple/30 bg-eli-warm-bg px-1.5 py-0.5 text-xxs font-medium uppercase tracking-wider text-eli-warm-bg-foreground">
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
// Page
// -----------------------------------------------------------------------------

export default function PaymentsAiDashboardPage() {
  const [filters, setFilters, scope] = useReportScope(PROPERTIES);
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
        showViewToggle
      />

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
          <StatCard label="% of rent collected" value={kpi.pctRentCollected} delta="+2.1 pts" sub="collection rate" />
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
            label="% Rent collected"
            value={kpi.pctRentCollected}
            delta="+2.1 pts"
            sub="of billed rent collected · selected period"
          />
          <StatCard
            label="Total rent collected"
            value={kpi.totalCollected}
            delta="+8%"
            sub="collected this period"
            action={<NewChip />}
          />
          <StatCard
            label="Total rent charged"
            value={kpi.totalCharged}
            delta="+7%"
            sub="billed this period"
            action={<NewChip />}
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
          action={<NewChip />}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            label="On-time payment rate"
            value={kpi.onTimeRate}
            delta="+2.1 pts"
            sub="of billed rent paid before late fees posted"
            action={<NewChip />}
          />
          <StatCard
            label="Expected payment date kept rate"
            value={kpi.payDateKeptRate}
            delta="+6.8 pts"
            sub="of AI-captured pay-date commitments honored"
            action={<NewChip />}
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
          action={<NewChip />}
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)]">
          <Card>
            <CardContent className="px-5 py-4">
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xxs font-semibold uppercase tracking-wider text-muted-foreground">
                  Staff hours saved
                </p>
                <NewChip />
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
              action={<NewChip />}
            />
            <StatCard
              label="After-hours coverage"
              value={kpi.afterHoursCoverage}
              delta="+2.4 pts"
              sub="of AI interactions handled outside office hours"
              action={<NewChip />}
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
            action: <NewChip />,
          },
          { label: "Total escalations", value: kpi.totalEscalations, sub: "escalated to staff", action: <NewChip /> },
          { label: "Open escalations", value: kpi.openEscalations, sub: "pending resolution", action: <NewChip /> },
          {
            label: "Resolved",
            value: kpi.resolvedEscalations,
            delta: "89% resolution",
            deltaTone: "positive",
            sub: "resolved by staff",
            action: <NewChip />,
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
    </div>
  );
}
