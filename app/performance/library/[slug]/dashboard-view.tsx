"use client";

import type React from "react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Area,
  AreaChart,
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
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronsUpDown,
  Maximize2,
  MessageSquare,
  Minus,
  Search,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type { EliDashboard, DashboardBlock } from "@/lib/eli-library";
import { RENEWALS_ESCALATION_DETAILS } from "@/lib/eli-library";

const MOCK_PROPERTIES = [
  "Cedar Hills", "Hillside Living", "Jamison Apartments", "Lakewood",
  "Maple Court", "Oak Terrace", "Parkview Flats", "Pine Valley",
  "Summit Ridge", "The Beacon",
];

const PROPERTY_COLORS = [
  "hsl(200 65% 45%)", "hsl(340 60% 55%)", "hsl(160 40% 50%)",
  "hsl(45 85% 50%)", "hsl(280 30% 55%)", "hsl(25 75% 55%)",
  "hsl(220 40% 60%)", "hsl(0 60% 50%)", "hsl(120 35% 45%)", "hsl(270 50% 60%)",
];

const BEDROOM_COLORS = [
  "hsl(200 65% 45%)", "hsl(160 50% 45%)", "hsl(45 85% 50%)", "hsl(340 60% 55%)",
];

const DONUT_COLORS = [
  "hsl(var(--foreground))", "hsl(var(--foreground) / 0.65)",
  "hsl(var(--foreground) / 0.45)", "hsl(var(--foreground) / 0.30)",
  "hsl(var(--foreground) / 0.20)", "hsl(var(--foreground) / 0.14)",
  "hsl(var(--foreground) / 0.10)", "hsl(var(--foreground) / 0.07)",
  "hsl(var(--muted-foreground) / 0.5)", "hsl(var(--muted-foreground) / 0.3)",
];

type TimeFrame = "3mo" | "6mo" | "1yr" | "2yr" | "3yr" | "all" | "custom";

const TIME_FRAME_LABELS: Record<TimeFrame, string> = {
  "3mo": "Last 3 Months", "6mo": "Last 6 Months", "1yr": "Last 12 Months",
  "2yr": "Last 2 Years", "3yr": "Last 3 Years", all: "All Time", custom: "Custom Range",
};

function seededRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function generatePropertyData(properties: string[], months: string[], baseValue: number) {
  return months.map((month, mi) => {
    const point: Record<string, any> = { label: month };
    properties.forEach((prop, pi) => {
      const rng = seededRng((pi + 1) * 3571 + mi * 131 + prop.charCodeAt(0));
      const propOffset = (pi - properties.length / 2) * (baseValue * 0.08);
      const seasonality = Math.sin((mi / 12) * Math.PI * 2) * baseValue * 0.05;
      const noise = (rng() - 0.5) * baseValue * 0.15;
      const trend = mi * (baseValue * 0.005) * (pi % 2 === 0 ? 1 : -0.5);
      point[prop] = Math.round(baseValue + propOffset + seasonality + noise + trend);
    });
    return point;
  });
}

function getMonthCount(tf: TimeFrame) {
  if (tf === "3mo") return 3;
  if (tf === "6mo") return 6;
  if (tf === "2yr") return 24;
  if (tf === "3yr") return 36;
  if (tf === "all") return 48;
  return 12;
}

function getPeriodScale(tf: TimeFrame) {
  const months = getMonthCount(tf);
  return months / 12;
}

function computeKpiForPeriod(block: DashboardBlock, timeFrame: TimeFrame): { value: string; sub: string; delta?: { direction: "up" | "down" | "flat"; label: string } } {
  const cfg = block.config ?? {};
  if (!cfg.periodAware) return { value: String(block.mockValue ?? "—"), sub: block.mockSub ?? "", delta: block.mockDelta };

  const base: number = cfg.baseValue ?? 0;
  const unit: string = cfg.unit ?? "";
  const prefix: string = cfg.prefix ?? "";
  const scale = cfg.scaleWithPeriod ? getPeriodScale(timeFrame) : 1;
  const months = getMonthCount(timeFrame);
  const rng = seededRng(block.order * 997 + months * 31);
  const jitter = 1 + (rng() - 0.5) * 0.06;

  let computed = base * scale * jitter;

  let formatted: string;
  if (unit === "$M") {
    formatted = computed >= 1_000_000 ? `$${(computed / 1_000_000).toFixed(2)}M` : `$${Math.round(computed / 1000)}K`;
  } else if (unit === "%" || unit === "pts") {
    formatted = `${prefix}${computed.toFixed(1)}${unit}`;
  } else if (unit === "days" || unit === "hrs" || unit === "sec") {
    formatted = `${prefix}${computed.toFixed(1)} ${unit}`;
  } else {
    formatted = `${prefix}${computed >= 1000 ? Math.round(computed).toLocaleString() : computed.toFixed(computed < 10 ? 1 : 0)}`;
  }

  const sub = cfg.subTemplate ?? block.mockSub ?? "";
  const delta = cfg.deltaLabel ? { direction: (cfg.deltaDir ?? "up") as "up" | "down" | "flat", label: cfg.deltaLabel } : block.mockDelta;

  return { value: formatted, sub, delta };
}

// ─── Time Frame Filter ───────────────────────────────────────────────────────

function TimeFrameFilter({ value, onChange }: { value: TimeFrame; onChange: (tf: TimeFrame) => void }) {
  const [open, setOpen] = useState(false);
  const [customActive, setCustomActive] = useState(value === "custom");
  const [customStart, setCustomStart] = useState("2025-06");
  const [customEnd, setCustomEnd] = useState("2026-05");

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium shadow-sm hover:bg-accent transition-colors">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Period:</span>
        <span className="font-semibold">{value === "custom" ? `${customStart} – ${customEnd}` : TIME_FRAME_LABELS[value]}</span>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-card p-1 shadow-lg">
            {(Object.keys(TIME_FRAME_LABELS) as TimeFrame[]).filter((k) => k !== "custom").map((tf) => (
              <button key={tf} onClick={() => { setCustomActive(false); onChange(tf); setOpen(false); }}
                className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent", value === tf && !customActive && "bg-accent font-medium")}>
                {value === tf && !customActive ? <Check className="h-3 w-3" /> : <span className="w-3" />}
                {TIME_FRAME_LABELS[tf]}
              </button>
            ))}
            <div className="my-1 border-t border-border" />
            <button onClick={() => setCustomActive(!customActive)}
              className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent", customActive && "bg-accent font-medium")}>
              <div className={cn("flex h-4 w-4 items-center justify-center rounded border", customActive ? "border-foreground bg-foreground text-background" : "border-muted-foreground")}>
                {customActive && <Check className="h-3 w-3" />}
              </div>
              Custom Range
            </button>
            {customActive && (
              <div className="px-2 pb-2 pt-1">
                <div className="flex items-center gap-2">
                  <input type="month" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-[110px] rounded border border-border bg-background px-2 py-1 text-xs" />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input type="month" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-[110px] rounded border border-border bg-background px-2 py-1 text-xs" />
                </div>
                <button onClick={() => { onChange("custom"); setOpen(false); }} className="mt-2 w-full rounded bg-foreground px-2 py-1 text-xs font-medium text-background hover:bg-foreground/90">
                  Apply Custom Range
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Property Filter ─────────────────────────────────────────────────────────

function PropertyFilter({ selected, onChange }: { selected: string[]; onChange: (p: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const allSelected = selected.length === MOCK_PROPERTIES.length;
  const filtered = MOCK_PROPERTIES.filter((p) => p.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium shadow-sm hover:bg-accent transition-colors">
        <span className="text-muted-foreground">Properties:</span>
        <span className="font-semibold">{allSelected ? "All" : selected.length === 0 ? "None" : selected.length <= 2 ? selected.join(", ") : `${selected.length} selected`}</span>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-card shadow-lg">
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="Search properties..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded border border-border bg-background py-1.5 pl-7 pr-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-foreground/20" autoFocus />
              </div>
            </div>
            <div className="p-1">
              <button onClick={() => onChange(allSelected ? [] : [...MOCK_PROPERTIES])} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                <div className={cn("flex h-4 w-4 items-center justify-center rounded border", allSelected ? "border-foreground bg-foreground text-background" : "border-muted-foreground")}>
                  {allSelected && <Check className="h-3 w-3" />}
                </div>
                <span className="font-medium">All Properties</span>
              </button>
              <div className="my-1 border-t border-border" />
              <div className="max-h-60 overflow-y-auto">
                {filtered.map((prop) => {
                  const checked = selected.includes(prop);
                  return (
                    <button key={prop} onClick={() => onChange(checked ? selected.filter((p) => p !== prop) : [...selected, prop])}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                      <div className={cn("flex h-4 w-4 items-center justify-center rounded border", checked ? "border-foreground bg-foreground text-background" : "border-muted-foreground")}>
                        {checked && <Check className="h-3 w-3" />}
                      </div>
                      <span>{prop}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── View Mode Toggle ────────────────────────────────────────────────────────

function ViewModeToggle({ mode, onChange }: { mode: "global" | "per-property"; onChange: (m: "global" | "per-property") => void }) {
  return (
    <div className="inline-flex rounded-md border border-border bg-muted p-0.5">
      <button onClick={() => onChange("global")} className={cn("rounded px-3 py-1.5 text-xs font-medium transition-colors", mode === "global" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>Global View</button>
      <button onClick={() => onChange("per-property")} className={cn("rounded px-3 py-1.5 text-xs font-medium transition-colors", mode === "per-property" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>Per-Property</button>
    </div>
  );
}

// ─── Full-Screen Modal ───────────────────────────────────────────────────────

function FullScreenModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-[90vw] max-w-[1200px] rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <div className="h-[70vh]">{children}</div>
      </div>
    </div>
  );
}

// ─── Chart Card Wrapper ──────────────────────────────────────────────────────

function ChartCard({ block, children, viewMode, selectedProperties, timeFrame }: {
  block: DashboardBlock; children: React.ReactNode; viewMode: "global" | "per-property"; selectedProperties: string[]; timeFrame: TimeFrame;
}) {
  const [fullScreen, setFullScreen] = useState(false);
  const showPerProperty = viewMode === "per-property" && block.type === "line-chart" && !block.config?.multiSeries;

  const renderChart = () => showPerProperty
    ? <PerPropertyLineChart block={block} properties={selectedProperties} timeFrame={timeFrame} />
    : children;

  return (
    <>
      <Card className={cn(WIDTH_CLASS[block.width], "group relative")}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{block.title}</CardTitle>
            <button onClick={() => setFullScreen(true)} className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent" title="View full screen">
              <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </CardHeader>
        <CardContent>{renderChart()}</CardContent>
      </Card>
      {fullScreen && (
        <FullScreenModal title={block.title ?? ""} onClose={() => setFullScreen(false)}>
          {showPerProperty ? <PerPropertyLineChart block={block} properties={selectedProperties} timeFrame={timeFrame} className="h-full" /> : <div className="h-full">{children}</div>}
        </FullScreenModal>
      )}
    </>
  );
}

// ─── Per-Property Multi-Line Chart ───────────────────────────────────────────

function PerPropertyLineChart({ block, properties, timeFrame, className }: {
  block: DashboardBlock; properties: string[]; timeFrame: TimeFrame; className?: string;
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const monthCount = getMonthCount(timeFrame);
  const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const months = Array.from({ length: monthCount }, (_, i) => allMonths[i % 12]);
  const baseTrend = block.mockTrend ?? [];
  const baseAvg = baseTrend.length > 0 ? baseTrend.reduce((s, d) => s + d.value, 0) / baseTrend.length : 50;
  const visibleProps = properties.filter((p) => !hidden.has(p));
  const data = generatePropertyData(visibleProps, months, baseAvg);
  const chartConfig: ChartConfig = Object.fromEntries(properties.map((prop, i) => [prop, { label: prop, color: PROPERTY_COLORS[i % PROPERTY_COLORS.length] }]));

  return (
    <div className={cn("w-full", className)}>
      <ChartContainer config={chartConfig} className="w-full min-h-[180px]">
        <LineChart data={data} margin={{ left: 0, right: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} />
          <YAxis tickLine={false} axisLine={false} fontSize={10} width={40} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {visibleProps.map((prop) => {
            const i = properties.indexOf(prop);
            return <Line key={prop} dataKey={prop} stroke={PROPERTY_COLORS[i % PROPERTY_COLORS.length]} strokeWidth={2} dot={false} type="monotone" />;
          })}
        </LineChart>
      </ChartContainer>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {properties.map((prop) => {
          const i = properties.indexOf(prop);
          const isHidden = hidden.has(prop);
          return (
            <button key={prop} onClick={() => setHidden((prev) => { const n = new Set(prev); if (n.has(prop)) n.delete(prop); else n.add(prop); return n; })}
              className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all",
                isHidden ? "border-border bg-muted text-muted-foreground line-through opacity-60" : "border-transparent bg-accent text-foreground")}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isHidden ? "hsl(var(--muted-foreground))" : PROPERTY_COLORS[i % PROPERTY_COLORS.length] }} />
              {prop}
              {!isHidden && <X className="ml-0.5 h-2.5 w-2.5 opacity-60" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Bedroom Trend Multi-Line Chart ──────────────────────────────────────────

function BedroomTrendChart({ block, timeFrame }: { block: DashboardBlock; timeFrame: TimeFrame }) {
  const monthCount = getMonthCount(timeFrame);
  const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const months = Array.from({ length: monthCount }, (_, i) => allMonths[i % 12]);
  const series = (block.config?.series as string[]) ?? ["Studio", "1 BR", "2 BR", "3 BR"];

  const isEngagement = block.title?.includes("Engagement");

  const data = months.map((month, mi) => {
    const point: Record<string, any> = { label: month };
    if (isEngagement) {
      const rng = seededRng(mi * 89 + monthCount + 7777);
      const optOut = Math.round((5.5 + mi * 0.04 + (rng() - 0.5) * 0.6) * 10) / 10;
      const engaged = Math.round((52 + mi * 0.5 + (rng() - 0.5) * 1.2) * 10) / 10;
      const noResponse = Math.round((100 - engaged - optOut) * 10) / 10;
      point[series[0]] = engaged;
      point[series[1]] = noResponse;
      point[series[2]] = optOut;
    } else {
      series.forEach((s, bi) => {
        const rng = seededRng((bi + 1) * 2347 + mi * 89 + monthCount);
        point[s] = Math.round((78 - bi * 5 + (rng() - 0.5) * 6 + mi * 0.3) * 10) / 10;
      });
    }
    return point;
  });
  const chartConfig: ChartConfig = Object.fromEntries(series.map((s, i) => [s, { label: s, color: BEDROOM_COLORS[i % BEDROOM_COLORS.length] }]));
  const yDomain: [number, number] = isEngagement ? [0, 70] : [50, 90];

  return (
    <ChartContainer config={chartConfig} className="w-full min-h-[180px]">
      <LineChart data={data} margin={{ left: 0, right: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} />
        <YAxis tickLine={false} axisLine={false} fontSize={10} width={36} domain={yDomain} tickFormatter={(v) => `${v}%`} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend />
        {series.map((s, i) => <Line key={s} dataKey={s} stroke={BEDROOM_COLORS[i % BEDROOM_COLORS.length]} strokeWidth={2} dot={false} type="monotone" />)}
      </LineChart>
    </ChartContainer>
  );
}

// ─── Utility Components ──────────────────────────────────────────────────────

function DeltaChip({ delta }: { delta: NonNullable<DashboardBlock["mockDelta"]> }) {
  const Icon = delta.direction === "up" ? ArrowUpRight : delta.direction === "down" ? ArrowDownRight : Minus;
  const color = delta.direction === "up" ? "text-green-600" : delta.direction === "down" ? "text-red-500" : "text-muted-foreground";
  return <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", color)}><Icon className="h-3 w-3" />{delta.label}</span>;
}

const WIDTH_CLASS: Record<string, string> = {
  full: "col-span-12", half: "col-span-12 sm:col-span-6",
  third: "col-span-12 sm:col-span-6 lg:col-span-4", quarter: "col-span-6 sm:col-span-3",
  fifth: "col-span-6 sm:col-span-4 lg:col-span-2 xl:col-span-[2.4]",
  "two-thirds": "col-span-12 lg:col-span-8", "three-quarters": "col-span-12 lg:col-span-9",
};

function compactNumber(v: number, currency = false): string {
  const prefix = currency ? "$" : "";
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `${prefix}${(v / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${prefix}${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}${(v / 1_000).toFixed(0)}K`;
  return `${prefix}${v}`;
}

// ─── Block Renderers ─────────────────────────────────────────────────────────

function KpiTile({ block, standalone = false, onClick, timeFrame = "1yr" }: { block: DashboardBlock; standalone?: boolean; onClick?: () => void; timeFrame?: TimeFrame }) {
  const drillable = block.config?.drillable && onClick;
  const kpi = computeKpiForPeriod(block, timeFrame);
  return (
    <div role={drillable ? "button" : undefined} tabIndex={drillable ? 0 : undefined} onClick={drillable ? onClick : undefined}
      onKeyDown={drillable ? (e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); } : undefined}
      className={cn("rounded-lg border border-border bg-card px-3 py-2.5", standalone && "flex h-full flex-col justify-center",
        drillable && "cursor-pointer transition-colors hover:bg-muted/40 hover:border-foreground/20")}>
      <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {block.title}{drillable && <span className="ml-1 text-[9px] text-primary/60">▸ drill in</span>}
      </p>
      <div className="mt-0.5 flex items-baseline gap-2">
        <p className={cn("font-semibold tracking-tight leading-tight", standalone ? "text-3xl" : "text-xl")}>{kpi.value}</p>
        {kpi.delta && <DeltaChip delta={kpi.delta} />}
      </div>
      {kpi.sub && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{kpi.sub}</p>}
      {block.config?.formula && <p className="mt-1 text-[10px] italic text-muted-foreground/70">{block.config.formula}</p>}
    </div>
  );
}

function KpiRow({ blocks, onDrillEscalations, timeFrame = "1yr" }: { blocks: DashboardBlock[]; onDrillEscalations?: () => void; timeFrame?: TimeFrame }) {
  const cols = blocks.length >= 5 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
    : blocks.length === 4 ? "grid-cols-2 lg:grid-cols-4"
    : blocks.length === 3 ? "grid-cols-1 sm:grid-cols-3"
    : blocks.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1";
  return (
    <div className={cn("col-span-12 grid gap-2", cols)}>
      {blocks.map((b) => <KpiTile key={b.order} block={b} onClick={b.config?.drillable ? onDrillEscalations : undefined} timeFrame={timeFrame} />)}
    </div>
  );
}

function KpiHeroBlock({ block, timeFrame = "1yr" }: { block: DashboardBlock; timeFrame?: TimeFrame }) {
  const kpi = computeKpiForPeriod(block, timeFrame);
  return (
    <Card className={cn(WIDTH_CLASS[block.width])}>
      <CardContent className="py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{block.title}</p>
        <div className="mt-1 flex items-baseline gap-3">
          <p className="text-3xl font-bold tracking-tight">{kpi.value}</p>
          {kpi.delta && <DeltaChip delta={kpi.delta} />}
        </div>
        {kpi.sub && <p className="text-xs text-muted-foreground">{kpi.sub}</p>}
        {block.config?.formula && <p className="mt-1 text-[10px] italic text-muted-foreground/70">{block.config.formula}</p>}
      </CardContent>
    </Card>
  );
}

function SectionHeaderBlock({ block }: { block: DashboardBlock }) {
  return (
    <div className="col-span-12 -mx-1 mt-3 mb-1 rounded bg-neutral-200/60 px-3 py-2">
      <h3 className="text-lg font-semibold tracking-tight text-neutral-800">{block.config.title}</h3>
      {block.config.subtitle && <p className="text-xs text-muted-foreground">{block.config.subtitle}</p>}
    </div>
  );
}

function LineChartBlock({ block, viewMode, selectedProperties, timeFrame }: {
  block: DashboardBlock; viewMode: "global" | "per-property"; selectedProperties: string[]; timeFrame: TimeFrame;
}) {
  if (block.config?.multiSeries) {
    return <ChartCard block={block} viewMode={viewMode} selectedProperties={selectedProperties} timeFrame={timeFrame}><BedroomTrendChart block={block} timeFrame={timeFrame} /></ChartCard>;
  }

  const monthCount = getMonthCount(timeFrame);
  const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fullTrend = block.mockTrend ?? [];
  const baseAvg = fullTrend.length > 0 ? fullTrend.reduce((s, d) => s + d.value, 0) / fullTrend.length : 50;

  const hideBaseline = block.config?.noBaseline === true;

  const data = Array.from({ length: monthCount }, (_, i) => {
    const rng = seededRng((block.order ?? 0) * 997 + i * 31 + monthCount);
    const noise = (rng() - 0.5) * baseAvg * 0.12;
    const trend = i * (baseAvg * 0.008);
    const point: { label: string; value: number; baseline?: number } = {
      label: allMonths[i % 12],
      value: Math.round((baseAvg + noise + trend) * 10) / 10,
    };
    if (!hideBaseline) {
      point.baseline = Math.round((baseAvg * 0.88 + (rng() - 0.5) * baseAvg * 0.04) * 10) / 10;
    }
    return point;
  });

  const chartConfig: ChartConfig = hideBaseline
    ? { value: { label: block.title ?? "Value", color: "hsl(var(--foreground))" } }
    : { value: { label: "Current", color: "hsl(var(--foreground))" }, baseline: { label: "Pre-AI Baseline", color: "hsl(var(--muted-foreground) / 0.3)" } };

  const globalChart = (
    <ChartContainer config={chartConfig} className="h-full min-h-[180px] w-full">
      <AreaChart data={data} margin={{ left: 0, right: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} />
        <YAxis tickLine={false} axisLine={false} fontSize={10} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {!hideBaseline && <Legend />}
        {!hideBaseline && <Area dataKey="baseline" stroke="var(--color-baseline)" fill="hsl(var(--muted-foreground) / 0.05)" strokeWidth={1} dot={false} type="monotone" name="Pre-AI Baseline" />}
        <Area dataKey="value" stroke="var(--color-value)" fill="hsl(var(--foreground) / 0.06)" strokeWidth={2} dot={false} type="monotone" name={hideBaseline ? (block.title ?? "Value") : "Current"} />
      </AreaChart>
    </ChartContainer>
  );

  return <ChartCard block={block} viewMode={viewMode} selectedProperties={selectedProperties} timeFrame={timeFrame}>{globalChart}</ChartCard>;
}

function BarChartBlock({ block, viewMode, selectedProperties, timeFrame }: {
  block: DashboardBlock; viewMode: "global" | "per-property"; selectedProperties: string[]; timeFrame: TimeFrame;
}) {
  const scale = getPeriodScale(timeFrame);
  const data = (block.mockRows ?? []).map((item, idx) => {
    const raw = typeof item.value === "string" ? parseFloat(item.value) || 0 : item.value;
    const rng = seededRng((block.order ?? 0) * 113 + idx * 7 + getMonthCount(timeFrame));
    const jitter = 1 + (rng() - 0.5) * 0.08;
    return { label: item.label, value: Math.round(raw * scale * jitter) };
  });
  const maxVal = data.reduce((m, d) => Math.max(m, Math.abs(d.value || 0)), 0);
  const isCurrency = maxVal >= 100_000;
  const chartConfig: ChartConfig = { value: { label: block.title ?? "Value", color: "hsl(var(--foreground))" } };

  return (
    <ChartCard block={block} viewMode={viewMode} selectedProperties={selectedProperties} timeFrame={timeFrame}>
      <ChartContainer config={chartConfig} className="h-full min-h-[180px] w-full">
        <BarChart data={data} margin={{ left: 0, right: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={9} interval={0} angle={-30} textAnchor="end" height={50} />
          <YAxis tickLine={false} axisLine={false} fontSize={10} width={36} tickFormatter={(v) => compactNumber(Number(v), isCurrency)} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" fill="hsl(var(--foreground) / 0.7)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

function DonutChartBlock({ block, viewMode, selectedProperties, timeFrame }: {
  block: DashboardBlock; viewMode: "global" | "per-property"; selectedProperties: string[]; timeFrame: TimeFrame;
}) {
  const scale = getPeriodScale(timeFrame);
  const slices = (block.mockSlices ?? []).map((s, idx) => {
    const rng = seededRng((block.order ?? 0) * 211 + idx * 13 + getMonthCount(timeFrame));
    const jitter = 1 + (rng() - 0.5) * 0.06;
    return { label: s.label, value: Math.round(s.value * scale * jitter) };
  });
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const chartConfig: ChartConfig = Object.fromEntries(slices.map((s, i) => [s.label, { label: s.label, color: DONUT_COLORS[i % DONUT_COLORS.length] }]));

  return (
    <ChartCard block={block} viewMode={viewMode} selectedProperties={selectedProperties} timeFrame={timeFrame}>
      <div className="flex h-full min-h-[240px] items-center gap-6">
        <ChartContainer config={chartConfig} className="h-full w-1/2">
          <PieChart>
            <Pie data={slices} cx="50%" cy="50%" innerRadius="40%" outerRadius="85%" paddingAngle={2} dataKey="value" nameKey="label">
              {slices.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
        <div className="space-y-3 text-sm">
          {slices.map((s, i) => {
            const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
            return (
              <div key={s.label} className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                <span className="text-muted-foreground">{s.label}</span>
                <span className="ml-auto font-semibold tabular-nums">{pct}%</span>
                <span className="text-muted-foreground tabular-nums">({s.value.toLocaleString()})</span>
              </div>
            );
          })}
        </div>
      </div>
    </ChartCard>
  );
}

function FunnelBlock({ block, viewMode, selectedProperties, timeFrame }: {
  block: DashboardBlock; viewMode: "global" | "per-property"; selectedProperties: string[]; timeFrame: TimeFrame;
}) {
  const stages = block.mockStages ?? [];
  const max = stages[0]?.value ?? 1;
  return (
    <ChartCard block={block} viewMode={viewMode} selectedProperties={selectedProperties} timeFrame={timeFrame}>
      <div className="space-y-2">
        {stages.map((stage) => {
          const pct = (stage.value / max) * 100;
          return (
            <div key={stage.label}>
              <div className="mb-0.5 flex items-center justify-between text-sm">
                <span className="font-medium">{stage.label}</span>
                <span className="tabular-nums text-muted-foreground">{stage.value.toLocaleString()}<span className="ml-1 text-xs">{pct < 100 ? `${pct.toFixed(0)}%` : ""}</span></span>
              </div>
              <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-foreground/70" style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

function DataTableBlock({ block, viewMode, selectedProperties, timeFrame }: {
  block: DashboardBlock; viewMode: "global" | "per-property"; selectedProperties: string[]; timeFrame: TimeFrame;
}) {
  const rows = block.mockRows ?? [];
  return (
    <ChartCard block={block} viewMode={viewMode} selectedProperties={selectedProperties} timeFrame={timeFrame}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label} className="border-b border-muted last:border-0">
                <td className="py-1.5 pr-2 text-xs text-muted-foreground w-6 tabular-nums">{i + 1}</td>
                <td className="py-1.5 pr-4 font-medium">{row.label}</td>
                <td className="py-1.5 text-right tabular-nums text-muted-foreground">{String(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

// ─── Block Router ────────────────────────────────────────────────────────────

function NonKpiBlock({ block, viewMode, selectedProperties, timeFrame }: {
  block: DashboardBlock; viewMode: "global" | "per-property"; selectedProperties: string[]; timeFrame: TimeFrame;
}) {
  switch (block.type) {
    case "section-header": return <SectionHeaderBlock block={block} />;
    case "line-chart": return <LineChartBlock block={block} viewMode={viewMode} selectedProperties={selectedProperties} timeFrame={timeFrame} />;
    case "bar-chart": case "combo-chart": return <BarChartBlock block={block} viewMode={viewMode} selectedProperties={selectedProperties} timeFrame={timeFrame} />;
    case "donut-chart": return <DonutChartBlock block={block} viewMode={viewMode} selectedProperties={selectedProperties} timeFrame={timeFrame} />;
    case "funnel-chart": return <FunnelBlock block={block} viewMode={viewMode} selectedProperties={selectedProperties} timeFrame={timeFrame} />;
    case "data-table": return <DataTableBlock block={block} viewMode={viewMode} selectedProperties={selectedProperties} timeFrame={timeFrame} />;
    default: return null;
  }
}

function renderBlocks(blocks: DashboardBlock[], viewMode: "global" | "per-property", selectedProperties: string[], timeFrame: TimeFrame, onDrillEscalations?: () => void): React.ReactNode[] {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const output: React.ReactNode[] = [];
  let kpiBuffer: DashboardBlock[] = [];

  const flush = () => {
    if (kpiBuffer.length === 0) return;
    if (kpiBuffer.length === 1) {
      const b = kpiBuffer[0];
      output.push(<div key={`kpi-${b.order}`} className={cn(WIDTH_CLASS[b.width])}><KpiTile block={b} standalone onClick={b.config?.drillable ? onDrillEscalations : undefined} timeFrame={timeFrame} /></div>);
    } else {
      output.push(<KpiRow key={`kpi-row-${kpiBuffer[0].order}`} blocks={kpiBuffer} onDrillEscalations={onDrillEscalations} timeFrame={timeFrame} />);
    }
    kpiBuffer = [];
  };

  for (const block of sorted) {
    if (block.type === "kpi-card") {
      if (block.width === "full") { flush(); output.push(<KpiHeroBlock key={block.order} block={block} timeFrame={timeFrame} />); }
      else { kpiBuffer.push(block); }
    } else {
      flush();
      output.push(<NonKpiBlock key={block.order} block={block} viewMode={viewMode} selectedProperties={selectedProperties} timeFrame={timeFrame} />);
    }
  }
  flush();
  return output;
}

// ─── Escalation Drill-Down ───────────────────────────────────────────────────

function EscalationDrillDown({ onClose }: { onClose: () => void }) {
  const data = RENEWALS_ESCALATION_DETAILS;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-12 overflow-y-auto">
      <div className="relative w-full max-w-6xl mx-4 mb-12 bg-card rounded-xl border shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Total Escalations — Detail View</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{data.length} escalations · {data.filter(d => d.resolvedOn).length} resolved · {data.filter(d => !d.resolvedOn).length} open</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Property</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Resident</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Unit</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Escalation Reason</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Generated On</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Resolved On</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Response Time</th>
                <th className="px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Conversation</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.conversationId} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium whitespace-nowrap">{row.property}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{row.resident}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{row.unit}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap"><span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full border bg-muted/40">{row.reason}</span></td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">{row.generatedOn}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">
                    {row.resolvedOn ? <span className="text-muted-foreground">{row.resolvedOn}</span> : <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">Open</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums">
                    {row.responseTimeHrs != null ? <span className={cn(row.responseTimeHrs > 4 ? "text-red-500 font-medium" : "text-muted-foreground")}>{row.responseTimeHrs.toFixed(1)} hrs</span> : <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <a href={`/conversations?id=${row.conversationId}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><MessageSquare className="h-3.5 w-3.5" />View</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t bg-muted/10 text-[11px] text-muted-foreground rounded-b-xl">Showing {data.length} most recent escalations. Response times over 4 hours are highlighted.</div>
      </div>
    </div>
  );
}

// ─── Main Dashboard View ─────────────────────────────────────────────────────

export function LibraryDashboardView({
  dashboard: d,
  backHref = "/performance/library",
  backLabel = "Back to ELI+ Legacy Library",
  toolbar,
}: {
  dashboard: EliDashboard;
  backHref?: string;
  backLabel?: string;
  toolbar?: React.ReactNode;
}) {
  const [selectedProperties, setSelectedProperties] = useState<string[]>([...MOCK_PROPERTIES]);
  const [viewMode, setViewMode] = useState<"global" | "per-property">("global");
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("1yr");
  const [showEscalationDrill, setShowEscalationDrill] = useState(false);

  return (
    <>
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      {toolbar}

      <PageHeader
        title={<span className="inline-flex items-center gap-2">
          {d.iconSrc && <Image src={d.iconSrc} alt="" width={20} height={20} className="shrink-0" />}
          {d.title}{d.titleSuffix && ` ${d.titleSuffix}`}
        </span>}
        description={d.description}
      />

      {/* Filter Bar */}
      <section className="mb-4 flex flex-wrap items-center gap-3">
        <TimeFrameFilter value={timeFrame} onChange={setTimeFrame} />
        <PropertyFilter selected={selectedProperties} onChange={setSelectedProperties} />
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
        {selectedProperties.length < MOCK_PROPERTIES.length && (
          <span className="text-xs text-muted-foreground">Showing data for {selectedProperties.length} of {MOCK_PROPERTIES.length} properties</span>
        )}
      </section>

      <div className="grid grid-cols-12 gap-3" key={timeFrame}>
        {renderBlocks(d.blocks, viewMode, selectedProperties, timeFrame, () => setShowEscalationDrill(true))}
      </div>

      {showEscalationDrill && <EscalationDrillDown onClose={() => setShowEscalationDrill(false)} />}

      <div className="mt-6 rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        This is a prototype dashboard. Data is illustrative and does not reflect live property metrics. Baseline represents pre-AI performance for comparison. All metrics reflect the selected time period.
      </div>
    </>
  );
}
