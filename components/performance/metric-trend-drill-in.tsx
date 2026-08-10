"use client";

import { ArrowLeft } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { CHART_GRID_STROKE, monthLabelsForPeriod, seriesColor } from "@/components/performance/tokens";
import { legendLabel } from "@/components/performance/chart-legend";

export type MetricTrendPoint = {
  month: string;
  value: number;
};

export type MetricTrendSeries = {
  key: string;
  label: string;
  color: string;
  points: MetricTrendPoint[];
};

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

function seededRand(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** Deterministic monthly trend for Golden Prototype metric drill-ins. */
export function buildSeededMetricTrend({
  seed,
  months,
  start,
  end,
  integer = false,
}: {
  seed: string;
  months: number;
  start: number;
  end: number;
  integer?: boolean;
}): MetricTrendPoint[] {
  const rand = seededRand(hashSeed(seed));
  const labels = monthLabelsForPeriod(Math.max(1, months));
  return labels.map((month, i) => {
    const t = labels.length <= 1 ? 1 : i / (labels.length - 1);
    const raw = start + (end - start) * t + (rand() - 0.5) * Math.max(Math.abs(end - start) * 0.12, 0.4);
    const value = integer ? Math.max(0, Math.round(raw)) : Math.round(raw * 10) / 10;
    return { month, value };
  });
}

function formatTick(value: number, suffix?: string) {
  if (suffix === "%") return `${value}%`;
  if (suffix === "sec") return `${value}s`;
  if (suffix === "hrs" || suffix === "hours") return `${value}h`;
  if (suffix === "days") return `${value}d`;
  if (Math.abs(value) >= 1000) return `${Math.round(value / 100) / 10}k`;
  return String(value);
}

export function MetricTrendDrillIn({
  title,
  description,
  currentValue,
  unitSuffix,
  series,
  onBack,
}: {
  title: string;
  description?: string;
  currentValue?: string;
  unitSuffix?: string;
  series: MetricTrendSeries[];
  onBack: () => void;
}) {
  const primary = series[0];
  const multi = series.length > 1;

  const chartData = primary.points.map((point, index) => {
    const row: Record<string, string | number> = { month: point.month };
    for (const s of series) {
      row[s.key] = s.points[index]?.value ?? 0;
    }
    return row;
  });

  const config = series.reduce<ChartConfig>((acc, s) => {
    acc[s.key] = { label: s.label, color: s.color };
    return acc;
  }, {});

  return (
    <section className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Button>
        {currentValue ? (
          <p className="text-sm text-muted-foreground">
            Current period: <span className="font-semibold text-foreground">{currentValue}</span>
          </p>
        ) : null}
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Trend over the selected filter period for this metric.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <ChartContainer config={config} className="!aspect-auto h-[340px] w-full">
            {multi ? (
              <LineChart data={chartData} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={44}
                  tickFormatter={(v: number) => formatTick(v, unitSuffix)}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                {series.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
                  formatter={legendLabel}
                />
              </LineChart>
            ) : (
              <AreaChart data={chartData} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id={`metric-fill-${primary.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={primary.color || seriesColor(0)} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={primary.color || seriesColor(0)} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={44}
                  tickFormatter={(v: number) => formatTick(v, unitSuffix)}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey={primary.key}
                  stroke={primary.color || seriesColor(0)}
                  fill={`url(#metric-fill-${primary.key})`}
                  strokeWidth={2}
                />
              </AreaChart>
            )}
          </ChartContainer>
        </CardContent>
      </Card>
    </section>
  );
}
