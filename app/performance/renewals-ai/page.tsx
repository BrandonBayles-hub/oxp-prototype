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
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Calendar, ChevronDown, Search, X } from "lucide-react";
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

const renewalRateTrend = buildMonthlyTrend(101, 67, 68, 69, 75, 40);
const totalRenewalsTrend = buildMonthlyTrend(202, 188, 192, 200, 215, 100);
const rentIncreaseTrend = buildMonthlyTrend(303, 4.2, 4.3, 4.5, 5.0, 1.5);
const fullyAutomatedTrend = buildMonthlyTrend(404, 50, 52, 54, 62, 20);
const escalationResolutionTrend = buildMonthlyTrend(505, 2.9, 3.0, 3.0, 3.4, 0.8);

const renewalRateByBedrooms = MONTH_LABELS.map((m, i) => {
  const t = i / 11;
  return {
    month: m,
    "Studio": Math.round(60 + 4 * t + (i % 2) * 0.5),
    "1 BR": Math.round(66 + 4 * t + (i % 3) * 0.4),
    "2 BR": Math.round(71 + 4 * t + (i % 2) * 0.3),
    "3 BR": Math.round(75 + 4 * t + (i % 3) * 0.2),
  };
});

const rentIncreaseDistribution = [
  { bucket: "0–2%", count: 312 },
  { bucket: "2–4%", count: 580 },
  { bucket: "4–6%", count: 842 },
  { bucket: "6–8%", count: 410 },
  { bucket: "8–10%", count: 162 },
  { bucket: "10%+", count: 112 },
];

const nonRenewalReasons = [
  { reason: "Price", count: 410 },
  { reason: "Relocating", count: 286 },
  { reason: "Buying Home", count: 184 },
  { reason: "Roommate Changes", count: 96 },
  { reason: "Maintenance Issues", count: 78 },
  { reason: "Other", count: 142 },
];

const renewalIntent = [
  { name: "Wants to Renew", value: 64, count: 1842, color: "#1f2937" },
  { name: "Considering", value: 14, count: 412, color: "#4b5563" },
  { name: "Does Not Want to Renew", value: 11, count: 318, color: "#6b7280" },
  { name: "Needs Different Unit", value: 4, count: 124, color: "#9ca3af" },
  { name: "New Lease Questions", value: 6, count: 186, color: "#d1d5db" },
];

const termLengthVolume = [
  { term: "Month-to-Month", count: 162 },
  { term: "6 Months", count: 286 },
  { term: "9 Months", count: 198 },
  { term: "12 Months", count: 1480 },
  { term: "14 Months", count: 168 },
  { term: "15+ Months", count: 124 },
];

const residentEngagement = MONTH_LABELS.map((m, i) => {
  const t = i / 11;
  return {
    month: m,
    "Engaged %": Math.round(52 + 8 * t + (i % 2) * 0.5),
    "No Response %": Math.round(44 - 6 * t + (i % 2) * 0.4),
    "Opted Out %": Math.round(4 - 2 * t + (i % 3) * 0.2),
  };
});

const escalationReasons = [
  { reason: "Pricing Question", count: 148 },
  { reason: "Lease Terms", count: 96 },
  { reason: "Unit Transfer", count: 72 },
  { reason: "Maintenance", count: 50 },
  { reason: "Contact Office", count: 28 },
  { reason: "Technical", count: 12 },
];

const outreachChannelMix = [
  { name: "SMS", value: 70, count: 12840, color: "#1f2937" },
  { name: "Email", value: 30, count: 5580, color: "#9ca3af" },
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
      current: { label: "Current", color: "#0f172a" },
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
              stroke="#0f172a"
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
// Page
// -----------------------------------------------------------------------------

export default function RenewalsAiDashboardPage() {
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

  const renewalRateData = useMemo(() => sliceTrend(renewalRateTrend, months), [months]);
  const totalRenewalsData = useMemo(() => sliceTrend(totalRenewalsTrend, months), [months]);
  const rentIncreaseData = useMemo(() => sliceTrend(rentIncreaseTrend, months), [months]);
  const fullyAutomatedData = useMemo(() => sliceTrend(fullyAutomatedTrend, months), [months]);
  const escalationResolutionData = useMemo(() => sliceTrend(escalationResolutionTrend, months), [months]);

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
          ELI+ Renewals AI — Performance & Impact
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Renewal performance across all properties plus AI-driven time savings, financial impact, and outreach analytics
        </p>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <PeriodPicker state={filters} setState={setFilters} />
        <PropertiesPicker state={filters} setState={setFilters} />
        <ViewToggle state={filters} setState={setFilters} />
      </div>

      {/* ============================================================ */}
      {/* Section 1 — Overall Renewal Performance                       */}
      {/* ============================================================ */}
      <section className="mb-6">
        <SectionBanner
          title="Overall Renewal Performance"
          description="Key renewal metrics across all properties — independent of AI usage"
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Renewal rate"
            value="74%"
            delta="+4 pts"
            sub="of eligible residents renewed · selected period"
          />
          <KpiCard
            label="3-month renewal rate"
            value="71.2%"
            delta="+2.8 pts"
            sub="rolling 3-month average"
          />
          <KpiCard label="Residents up for renewal" value="3,264" sub="expiring in next 90 days" />
          <KpiCard
            label="Renewed residents"
            value="2,418"
            delta="+14%"
            sub="renewed this period"
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Renewal Rate — Monthly Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={renewalRateData}
                view={filters.view}
                selected={filters.selected}
                yDomain={filters.view === "global" ? [0, 80] : [0, 100]}
              />
              <PropertyChips state={filters} setState={setFilters} />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Renewals — Monthly Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={totalRenewalsData}
                view={filters.view}
                selected={filters.selected}
                yDomain={filters.view === "global" ? [0, 220] : [0, 300]}
              />
              <PropertyChips state={filters} setState={setFilters} />
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Avg rent increase at renewal"
            value="+4.8%"
            delta="+0.6 pts"
            sub="$52 avg monthly increase"
          />
          <KpiCard
            label="Incremental annual revenue"
            value="$1.51M"
            delta="+$184K"
            sub="from renewal rent increases"
          />
          <KpiCard
            label="Avoided turnover costs"
            value="$2.14M"
            delta="+$320K"
            sub="est. savings from retained residents"
            subItalic="$5,000 avg turnover cost × 428 retained leases"
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Avg % Rent Increase at Renewal — Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={rentIncreaseData}
                view={filters.view}
                selected={filters.selected}
                yDomain={filters.view === "global" ? [0, 8] : [0, 8]}
              />
              <PropertyChips state={filters} setState={setFilters} />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Rent Increase Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="!aspect-auto h-[240px] w-full">
                <BarChart data={rentIncreaseDistribution} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} angle={-30} textAnchor="end" height={40} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#374151" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Avg days to renew"
            value="9.2"
            delta="-4.9 days"
            deltaTone="positive"
            sub="days from offer generated to signed"
          />
          <KpiCard
            label="Avg days before lease end"
            value="68"
            delta="+12 days"
            sub="days before expiration renewal is finalized"
          />
          <KpiCard
            label="Renewals signed 60+ days early"
            value="72%"
            delta="+8 pts"
            sub="of renewals finalized 60+ days before expiry"
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Renewal Rate by Bedrooms — Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  Studio: { label: "Studio", color: "#3b82f6" },
                  "1 BR": { label: "1 BR", color: "#10b981" },
                  "2 BR": { label: "2 BR", color: "#f59e0b" },
                  "3 BR": { label: "3 BR", color: "#ef4444" },
                }}
                className="!aspect-auto h-[260px] w-full"
              >
                <LineChart data={renewalRateByBedrooms} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} domain={[50, 90]} tickFormatter={(v) => `${v}%`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="Studio" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="1 BR" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="2 BR" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="3 BR" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Reasons for Non-Renewal</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="!aspect-auto h-[260px] w-full">
                <BarChart data={nonRenewalReasons} margin={{ left: 8, right: 12, top: 8, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="reason" tickLine={false} axisLine={false} tickMargin={8} angle={-30} textAnchor="end" height={50} interval={0} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#374151" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Renewal Intent Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutWithLegend data={renewalIntent} />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Renewals Signed by Term Length (Volume)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="!aspect-auto h-[220px] w-full">
                <BarChart data={termLengthVolume} margin={{ left: 8, right: 12, top: 8, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="term" tickLine={false} axisLine={false} tickMargin={8} angle={-30} textAnchor="end" height={50} interval={0} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#374151" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Section 2 — Renewals AI Impact                               */}
      {/* ============================================================ */}
      <section className="mb-6">
        <SectionBanner
          title="Renewals AI Impact"
          description="Time savings, automation metrics, and AI-driven value for properties using Renewals AI"
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Staff hours saved"
            value="1,842"
            delta="+240 hrs"
            sub="hours saved by AI automation"
            subItalic="18,420 messages × 6 min avg manual handling ÷ 60"
          />
          <KpiCard
            label="Avg days to renew (AI)"
            value="9.2"
            delta="-4.9 days faster"
            deltaTone="positive"
            sub="vs 14.1 days without AI"
          />
          <KpiCard
            label="Renewal rate lift (AI vs non-AI)"
            value="+8.2 pts"
            delta="+8.2 pts"
            sub="AI-managed: 78% vs non-AI: 69.8%"
          />
          <KpiCard
            label="Fully automated renewals"
            value="62%"
            delta="+8 pts"
            sub="1,499 of 2,418 renewals completed with zero human intervention"
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Fully Automated Renewals — Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={fullyAutomatedData}
                view={filters.view}
                selected={filters.selected}
                yDomain={filters.view === "global" ? [0, 65] : [0, 100]}
              />
              <PropertyChips state={filters} setState={setFilters} />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resident Engagement Breakdown — Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  "Engaged %": { label: "Engaged %", color: "#3b82f6" },
                  "No Response %": { label: "No Response %", color: "#10b981" },
                  "Opted Out %": { label: "Opted Out %", color: "#f59e0b" },
                }}
                className="!aspect-auto h-[240px] w-full"
              >
                <LineChart data={residentEngagement} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} domain={[0, 70]} tickFormatter={(v) => `${v}%`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="Engaged %" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="No Response %" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Opted Out %" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label="Total outreach messages"
            value="18,420"
            delta="+12%"
            sub="AI-sent messages"
          />
          <KpiCard label="SMS sent" value="12,840" delta="+8%" sub="outbound SMS" />
          <KpiCard label="Emails sent" value="5,580" delta="+18%" sub="outbound emails" />
          <KpiCard
            label="Resident response rate"
            value="38.4%"
            delta="+2.1 pts"
            sub="responded to AI outreach"
          />
          <KpiCard
            label="Avg AI response time"
            value="< 8 sec"
            delta="-2 sec"
            sub="from resident message to AI reply"
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <KpiCard
            label="Avg resident response time"
            value="4.2 hrs"
            delta="-1.4 hrs"
            sub="from AI message to resident reply"
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Outreach Channel Mix</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutWithLegend data={outreachChannelMix} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Section 3 — Escalations                                      */}
      {/* ============================================================ */}
      <section className="mb-6">
        <SectionBanner
          title="Escalations"
          description="Escalation rate, volume, resolution status, and response times"
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Escalation rate"
            value="12.4%"
            delta="-1.8 pts"
            deltaTone="positive"
            sub="of AI contacts escalated"
          />
          <KpiCard
            label="Total escalations · drill in"
            value="406"
            sub="escalated to staff"
            action={
              <Link href="/escalations" className="text-[10px] font-medium text-foreground underline underline-offset-2 hover:no-underline">
                Drill in →
              </Link>
            }
          />
          <KpiCard label="Open escalations" value="42" sub="pending resolution" />
          <KpiCard
            label="Resolved"
            value="364"
            delta="89% resolution"
            deltaTone="positive"
            sub="resolved by staff"
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Escalation Reasons</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="!aspect-auto h-[260px] w-full">
                <BarChart data={escalationReasons} margin={{ left: 8, right: 12, top: 8, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="reason" tickLine={false} axisLine={false} tickMargin={8} angle={-30} textAnchor="end" height={50} interval={0} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#374151" radius={[2, 2, 0, 0]} />
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
                selected={filters.selected}
                yDomain={filters.view === "global" ? [0, 4] : [0, 5]}
              />
              <PropertyChips state={filters} setState={setFilters} />
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
