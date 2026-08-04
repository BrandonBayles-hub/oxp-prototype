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
import { ConsoleBreadcrumb } from "@/components/eli-console/console-breadcrumb";
import {
  DeltaPill,
  SectionBanner,
  StatCard,
  StatGrid,
  seriesColor,
} from "@/components/performance";
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

/**
 * Donut slice colours come from the shared ordered palette.
 *
 * This was a ten-step monochrome ramp of foreground alphas ending at 0.07,
 * so on a ten-slice donut the last five slices were indistinguishable from
 * each other and nearly invisible against the card.
 */
const DONUT_COLORS = Array.from({ length: 10 }, (_, i) => seriesColor(i));

function DeltaChip({
  delta,
  lowerIsBetter,
}: {
  delta: NonNullable<DashboardBlock["mockDelta"]>;
  lowerIsBetter?: boolean;
}) {
  // Direction is a fact about the number; whether it is GOOD is a property of
  // the metric. Reading tone off the arrow painted every decrease red, so
  // "Cancelled work orders -6%" and "Avg days to renew -4.9 days" — both wins —
  // were reported as losses.
  // Labels already carry their own sign, and it may be a Unicode minus
  // (U+2212) rather than an ASCII hyphen. Strip whichever is there before
  // re-applying one, so a "down" delta doesn't render as "-−0.3 pts".
  const bare = delta.label.replace(/^[+\-\u2212\u2013]\s*/, "");
  const signed =
    delta.direction === "up"
      ? `+${bare}`
      : delta.direction === "down"
        ? `\u2212${bare}`
        : bare;
  return <DeltaPill value={signed} lowerIsBetter={lowerIsBetter} />;
}

const WIDTH_CLASS: Record<string, string> = {
  full: "col-span-12",
  half: "col-span-12 sm:col-span-6",
  third: "col-span-12 sm:col-span-6 lg:col-span-4",
  quarter: "col-span-6 sm:col-span-3",
  fifth: "col-span-6 sm:col-span-4 lg:col-span-2",
  "two-thirds": "col-span-12 lg:col-span-8",
  "three-quarters": "col-span-12 lg:col-span-9",
};

function KpiTile({
  block,
  standalone = false,
}: {
  block: DashboardBlock;
  standalone?: boolean;
}) {
  return (
    <StatCard
      className={cn(standalone && "h-full")}
      size={standalone ? "hero" : "compact"}
      label={block.title ?? ""}
      value={String(block.mockValue ?? "\u2014")}
      delta={block.mockDelta?.label}
      lowerIsBetter={block.lowerIsBetter}
      sub={block.mockSub}
    />
  );
}

function KpiRow({ blocks }: { blocks: DashboardBlock[] }) {
  const columns = blocks.length >= 5 ? 5 : blocks.length === 4 ? 4 : blocks.length === 3 ? 3 : 2;
  return (
    <StatGrid columns={columns} className="col-span-12">
      {blocks.map((b) => (
        <KpiTile key={b.order} block={b} />
      ))}
    </StatGrid>
  );
}
function KpiHeroBlock({ block }: { block: DashboardBlock }) {
  return (
    <div className={cn(WIDTH_CLASS[block.width])}>
      <KpiTile block={block} standalone />
    </div>
  );
}
function SectionHeaderBlock({ block }: { block: DashboardBlock }) {
  return (
    <div className="col-span-12 mt-3">
      <SectionBanner title={block.config.title} description={block.config.subtitle} />
    </div>
  );
}
function LineChartBlock({ block }: { block: DashboardBlock }) {
  const chartConfig: ChartConfig = {
    value: { label: "Current", color: seriesColor(0) },
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
              fill={seriesColor(0)}
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
    value: { label: block.title ?? "Value", color: seriesColor(0) },
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
              fontSize={10}
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
              fill={seriesColor(0)}
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
      {/* The breadcrumb replaces the old "Back to …" link: it navigates out of
          the dashboard the same way, and unlike a back link it also says where
          you are. It is this page's only way back now that the Performance tab
          strip is limited to the two top-level destinations. */}
      <ConsoleBreadcrumb
        root={{ label: "Performance", href: "/performance" }}
        parents={[{ label: "ELI+ Legacy Library", href: backHref }]}
        page={d.title}
        className="mb-3"
      />

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

      {/* Below the title, matching where the four agent reports put their bar.
          Above it the control read as page chrome rather than as the scope the
          numbers underneath were computed under. */}
      {toolbar}

      <section className="mb-5">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xxs font-semibold uppercase tracking-wider text-muted-foreground">
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
