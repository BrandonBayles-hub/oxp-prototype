"use client";

import type React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Minus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
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

const DONUT_COLORS = [
  "hsl(var(--foreground))",
  "hsl(var(--foreground) / 0.65)",
  "hsl(var(--foreground) / 0.45)",
  "hsl(var(--foreground) / 0.30)",
  "hsl(var(--foreground) / 0.20)",
  "hsl(var(--foreground) / 0.14)",
  "hsl(var(--foreground) / 0.10)",
  "hsl(var(--foreground) / 0.07)",
  "hsl(var(--muted-foreground) / 0.5)",
  "hsl(var(--muted-foreground) / 0.3)",
];

function DeltaChip({
  delta,
}: {
  delta: NonNullable<DashboardBlock["mockDelta"]>;
}) {
  const Icon =
    delta.direction === "up"
      ? ArrowUpRight
      : delta.direction === "down"
        ? ArrowDownRight
        : Minus;
  const color =
    delta.direction === "up"
      ? "text-green-600"
      : delta.direction === "down"
        ? "text-red-500"
        : "text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        color,
      )}
    >
      <Icon className="h-3 w-3" />
      {delta.label}
    </span>
  );
}

const WIDTH_CLASS: Record<string, string> = {
  full: "col-span-12",
  half: "col-span-12 sm:col-span-6",
  third: "col-span-12 sm:col-span-6 lg:col-span-4",
  quarter: "col-span-6 sm:col-span-3",
  fifth: "col-span-6 sm:col-span-4 lg:col-span-2 xl:col-span-[2.4]",
  "two-thirds": "col-span-12 lg:col-span-8",
  "three-quarters": "col-span-12 lg:col-span-9",
};

const SERIES_COLORS = [
  "hsl(200 65% 45%)",
  "hsl(280 30% 55%)",
  "hsl(340 60% 55%)",
  "hsl(45 85% 55%)",
  "hsl(160 40% 50%)",
  "hsl(220 40% 60%)",
  "hsl(25 75% 55%)",
];

function KpiTile({
  block,
  standalone = false,
}: {
  block: DashboardBlock;
  standalone?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card px-3 py-2.5",
        standalone && "flex h-full flex-col justify-center",
      )}
    >
      <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {block.title}
      </p>
      <div className="mt-0.5 flex items-baseline gap-2">
        <p
          className={cn(
            "font-semibold tracking-tight leading-tight",
            standalone ? "text-3xl" : "text-xl",
          )}
        >
          {String(block.mockValue ?? "—")}
        </p>
        {block.mockDelta && <DeltaChip delta={block.mockDelta} />}
      </div>
      {block.mockSub && (
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {block.mockSub}
        </p>
      )}
    </div>
  );
}

function KpiRow({ blocks }: { blocks: DashboardBlock[] }) {
  const cols =
    blocks.length >= 5
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      : blocks.length === 4
        ? "grid-cols-2 lg:grid-cols-4"
        : blocks.length === 3
          ? "grid-cols-1 sm:grid-cols-3"
          : blocks.length === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1";
  return (
    <div className={cn("col-span-12 grid gap-2", cols)}>
      {blocks.map((b) => (
        <KpiTile key={b.order} block={b} />
      ))}
    </div>
  );
}

function KpiHeroBlock({ block }: { block: DashboardBlock }) {
  return (
    <Card className={cn(WIDTH_CLASS[block.width])}>
      <CardContent className="py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {block.title}
        </p>
        <div className="mt-1 flex items-baseline gap-3">
          <p className="text-3xl font-bold tracking-tight">
            {String(block.mockValue ?? "—")}
          </p>
          {block.mockDelta && <DeltaChip delta={block.mockDelta} />}
        </div>
        {block.mockSub && (
          <p className="text-xs text-muted-foreground">{block.mockSub}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SectionHeaderBlock({ block }: { block: DashboardBlock }) {
  return (
    <div className="col-span-12 -mx-1 mt-3 mb-1 rounded bg-neutral-200/60 px-3 py-2">
      <h3 className="text-lg font-semibold tracking-tight text-neutral-800">
        {block.config.title}
      </h3>
      {block.config.subtitle && (
        <p className="text-xs text-muted-foreground">{block.config.subtitle}</p>
      )}
    </div>
  );
}

function LineChartBlock({ block }: { block: DashboardBlock }) {
  const chartConfig: ChartConfig = {
    value: { label: "Current", color: "hsl(var(--foreground))" },
    baseline: {
      label: "Baseline",
      color: "hsl(var(--muted-foreground) / 0.3)",
    },
  };
  const data = block.mockTrend ?? [];

  return (
    <Card className={cn(WIDTH_CLASS[block.width])}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{block.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-full min-h-[180px] w-full">
          <AreaChart data={data} margin={{ left: 0, right: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} />
            <YAxis tickLine={false} axisLine={false} fontSize={10} width={40} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {data[0]?.baseline !== undefined && (
              <Area
                dataKey="baseline"
                stroke="var(--color-baseline)"
                fill="hsl(var(--muted-foreground) / 0.05)"
                strokeWidth={1}
                dot={false}
                type="monotone"
              />
            )}
            <Area
              dataKey="value"
              stroke="var(--color-value)"
              fill="hsl(var(--foreground) / 0.06)"
              strokeWidth={2}
              dot={false}
              type="monotone"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function compactNumber(v: number, currency = false): string {
  const prefix = currency ? "$" : "";
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `${prefix}${(v / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${prefix}${(v / 1_000_000).toFixed(0)}M`;
  if (abs >= 1_000) return `${prefix}${(v / 1_000).toFixed(0)}K`;
  return `${prefix}${v}`;
}

function BarChartBlock({ block }: { block: DashboardBlock }) {
  const data = (block.mockRows ?? block.mockTrend ?? []).map((item) => ({
    label: "label" in item ? item.label : "",
    value: typeof item.value === "string" ? parseFloat(item.value) || 0 : item.value,
  }));
  const maxVal = data.reduce((m, d) => Math.max(m, Math.abs(d.value || 0)), 0);
  const isCurrency = maxVal >= 100_000;

  const chartConfig: ChartConfig = {
    value: { label: block.title ?? "Value", color: "hsl(var(--foreground))" },
  };

  return (
    <Card className={cn(WIDTH_CLASS[block.width])}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{block.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-full min-h-[180px] w-full">
          <BarChart data={data} margin={{ left: 0, right: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              fontSize={9}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={10}
              width={36}
              tickFormatter={(v) => compactNumber(Number(v), isCurrency)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="value"
              fill="hsl(var(--foreground) / 0.7)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function DonutChartBlock({ block }: { block: DashboardBlock }) {
  const slices = block.mockSlices ?? [];
  const chartConfig: ChartConfig = Object.fromEntries(
    slices.map((s, i) => [
      s.label,
      { label: s.label, color: DONUT_COLORS[i % DONUT_COLORS.length] },
    ]),
  );

  return (
    <Card className={cn(WIDTH_CLASS[block.width])}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{block.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <ChartContainer config={chartConfig} className="h-[160px] w-[160px] shrink-0">
          <PieChart>
            <Pie
              data={slices}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
              nameKey="label"
            >
              {slices.map((_, i) => (
                <Cell
                  key={i}
                  fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
        <div className="space-y-1 text-xs">
          {slices.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length],
                }}
              />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="ml-auto font-medium tabular-nums">
                {s.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelBlock({ block }: { block: DashboardBlock }) {
  const stages = block.mockStages ?? [];
  const max = stages[0]?.value ?? 1;

  return (
    <Card className={cn(WIDTH_CLASS[block.width])}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{block.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {stages.map((stage) => {
            const pct = (stage.value / max) * 100;
            return (
              <div key={stage.label}>
                <div className="mb-0.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{stage.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {stage.value.toLocaleString()}
                    <span className="ml-1 text-xs">
                      {pct < 100 ? `${pct.toFixed(0)}%` : ""}
                    </span>
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
      </CardContent>
    </Card>
  );
}

function DataTableBlock({ block }: { block: DashboardBlock }) {
  const rows = block.mockRows ?? [];
  return (
    <Card className={cn(WIDTH_CLASS[block.width])}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{block.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-muted last:border-0"
                >
                  <td className="py-1.5 pr-4 font-medium">{row.label}</td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                    {String(row.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function NonKpiBlock({ block }: { block: DashboardBlock }) {
  switch (block.type) {
    case "section-header":
      return <SectionHeaderBlock block={block} />;
    case "line-chart":
      return <LineChartBlock block={block} />;
    case "bar-chart":
    case "combo-chart":
      return <BarChartBlock block={block} />;
    case "donut-chart":
      return <DonutChartBlock block={block} />;
    case "funnel-chart":
      return <FunnelBlock block={block} />;
    case "data-table":
      return <DataTableBlock block={block} />;
    default:
      return null;
  }
}

function renderBlocks(blocks: DashboardBlock[]): React.ReactNode[] {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const output: React.ReactNode[] = [];
  let kpiBuffer: DashboardBlock[] = [];

  const flush = () => {
    if (kpiBuffer.length === 0) return;
    if (kpiBuffer.length === 1) {
      const b = kpiBuffer[0];
      output.push(
        <div key={`kpi-${b.order}`} className={cn(WIDTH_CLASS[b.width])}>
          <KpiTile block={b} standalone />
        </div>,
      );
    } else {
      output.push(
        <KpiRow key={`kpi-row-${kpiBuffer[0].order}`} blocks={kpiBuffer} />,
      );
    }
    kpiBuffer = [];
  };

  for (const block of sorted) {
    if (block.type === "kpi-card") {
      if (block.width === "full") {
        flush();
        output.push(<KpiHeroBlock key={block.order} block={block} />);
      } else {
        kpiBuffer.push(block);
      }
    } else {
      flush();
      output.push(<NonKpiBlock key={block.order} block={block} />);
    }
  }
  flush();
  return output;
}

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
        title={
          <span className="inline-flex items-center gap-2">
            {d.iconSrc && (
              <Image
                src={d.iconSrc}
                alt=""
                width={20}
                height={20}
                className="shrink-0"
              />
            )}
            {d.title}
            {d.titleSuffix && ` ${d.titleSuffix}`}
          </span>
        }
        description={d.description}
      />

      <section className="mb-5">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {d.headlineKpi.label}
            </p>
            <p className="text-3xl font-bold tracking-tight">
              {d.headlineKpi.value}
            </p>
            <p className="text-xs text-muted-foreground">
              {d.headlineKpi.sub}
            </p>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-12 gap-3">{renderBlocks(d.blocks)}</div>

      <div className="mt-6 rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        This is a prototype dashboard. Data is illustrative and does not reflect
        live property metrics.
      </div>
    </>
  );
}
