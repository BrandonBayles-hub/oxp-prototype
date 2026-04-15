"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

/* ── Types ── */

export type SummaryCardData = {
  label: string;
  value: string;
  subtext: string;
  subtextVariant?: "positive" | "negative" | "neutral";
};

export type AlertData = {
  title: string;
  description: string;
  actions: { label: string; href: string; primary?: boolean }[];
};

export type ChartData = {
  title: string;
  data: { name: string; value: number }[];
  valuePrefix?: string;
  color?: string;
};

export type ListBreakdownItem = {
  name: string;
  detail: string;
  value: string;
  percentage?: string;
  trend?: string;
  trendVariant?: "positive" | "negative";
  iconSrc?: string;
};

export type AgentListItem = {
  name: string;
  detail: string;
  metrics: { label: string; value: string; variant?: "positive" | "negative" }[];
  status: string;
  iconSrc?: string;
};

export type PropertyGridItem = {
  name: string;
  highlight?: string;
  stats: { label: string; value: string }[];
};

export type BreakdownSection =
  | { type: "list"; title: string; items: ListBreakdownItem[] }
  | { type: "agent-list"; title: string; agents: AgentListItem[] }
  | { type: "property-grid"; items: PropertyGridItem[] };

export type PropertyOverride = {
  summaryCards: SummaryCardData[];
  chartMultiplier?: number;
  alert?: AlertData | null;
};

export type MetricDetailConfig = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  summaryCards: SummaryCardData[];
  alert?: AlertData;
  chart?: ChartData;
  breakdownLayout?: "side-by-side" | "stacked";
  breakdowns: BreakdownSection[];
  byProperty?: Record<string, PropertyOverride>;
};

/* ── Component ── */

export function MetricDetailDialog({
  config,
  open,
  onOpenChange,
}: {
  config: MetricDetailConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [property, setProperty] = useState("all");

  useEffect(() => {
    setProperty("all");
  }, [config?.title]);

  if (!config) return null;

  const Icon = config.icon;
  const po = property !== "all" ? config.byProperty?.[property] : undefined;
  const summaryCards = po?.summaryCards ?? config.summaryCards;
  const activeAlert = po ? (po.alert === null ? undefined : (po.alert ?? config.alert)) : config.alert;
  const chartData = config.chart
    ? {
        ...config.chart,
        data: po?.chartMultiplier
          ? config.chart.data.map((d) => ({ ...d, value: Math.round(d.value * po.chartMultiplier!) }))
          : config.chart.data,
      }
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Icon className="h-6 w-6 text-foreground" />
          <DialogTitle className="text-xl font-semibold">{config.title}</DialogTitle>
        </div>
        <DialogDescription>{config.description}</DialogDescription>

        {/* Property filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Property:</span>
          <Select value={property} onValueChange={setProperty}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              <SelectItem value="a">Hillside Living</SelectItem>
              <SelectItem value="b">Jamison Apartments</SelectItem>
              <SelectItem value="c">Property C</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Alert / CTA for negative trends */}
        {activeAlert && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <div className="flex items-start gap-3">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  We&apos;ve noticed an area where there may be room for improvement. Here are some suggestions to help.
                </p>
                <p className="mt-2 font-semibold text-amber-900 dark:text-amber-200">{activeAlert.title}</p>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">{activeAlert.description}</p>
                <div className="mt-3 flex gap-2">
                  {activeAlert.actions.map((action) => (
                    <Button
                      key={action.label}
                      asChild
                      variant={action.primary ? "default" : "outline"}
                      size="sm"
                      className={action.primary ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
                    >
                      <Link href={action.href}>
                        {action.label} <span aria-hidden>&rarr;</span>
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div className={cn(
          "grid gap-4",
          summaryCards.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"
        )}>
          {summaryCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-2xl font-bold">{card.value}</p>
                <p
                  className={cn(
                    "mt-1 text-xs",
                    card.subtextVariant === "positive" && "text-green-600 dark:text-green-400",
                    card.subtextVariant === "negative" && "text-amber-600 dark:text-amber-400",
                    (!card.subtextVariant || card.subtextVariant === "neutral") &&
                      "text-muted-foreground"
                  )}
                >
                  {card.subtext}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart */}
        {chartData && (
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {chartData.title}
            </p>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 89.8%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) =>
                      chartData.valuePrefix
                        ? `${chartData.valuePrefix}${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v}`
                        : String(v)
                    }
                  />
                  <Tooltip
                    formatter={(v: number) => [
                      chartData.valuePrefix
                        ? `${chartData.valuePrefix}${v.toLocaleString()}`
                        : v.toLocaleString(),
                      "",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={chartData.color ?? "#22c55e"}
                    fill={`${chartData.color ?? "#22c55e"}20`}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Breakdowns */}
        <div className={cn(
          config.breakdownLayout === "side-by-side" ? "grid gap-4 lg:grid-cols-2" : "space-y-4"
        )}>
          {config.breakdowns.map((section, idx) => {
            if (section.type === "list") return <ListBreakdown key={idx} section={section} />;
            if (section.type === "agent-list") return <AgentListBreakdown key={idx} section={section} />;
            if (section.type === "property-grid") return <PropertyGrid key={idx} section={section} />;
            return null;
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Breakdown sub-components ── */

function ListBreakdown({ section }: { section: Extract<BreakdownSection, { type: "list" }> }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {section.title}
        </p>
        <ul className="divide-y divide-border">
          {section.items.map((item) => (
            <li key={item.name} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                {item.iconSrc && (
                  <img src={item.iconSrc} alt="" width={20} height={20} className="shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">
                  {item.value}
                  {item.percentage && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({item.percentage})
                    </span>
                  )}
                </p>
                {item.trend && (
                  <p
                    className={cn(
                      "text-xs",
                      item.trendVariant === "positive" && "text-green-600 dark:text-green-400",
                      item.trendVariant === "negative" && "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {item.trend}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function AgentListBreakdown({
  section,
}: {
  section: Extract<BreakdownSection, { type: "agent-list" }>;
}) {
  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {section.title}
      </p>
      <div className="scrollbar-hide max-h-[340px] space-y-2 overflow-y-auto">
        {section.agents.map((agent) => (
          <div
            key={agent.name}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
          >
            <img
              src={agent.iconSrc ?? "/eli-cube.svg"}
              alt=""
              width={24}
              height={24}
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{agent.name}</p>
              <p className="text-xs text-muted-foreground">{agent.detail}</p>
            </div>
            <div className="flex items-center gap-4">
              {agent.metrics.map((m) => (
                <div key={m.label} className="text-right">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      m.variant === "positive" && "text-green-600 dark:text-green-400",
                      m.variant === "negative" && "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {m.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
              <Badge
                variant={agent.status === "Active" ? "default" : "secondary"}
                className={cn(
                  "text-[10px]",
                  agent.status === "Active" &&
                    "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
                )}
              >
                {agent.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PropertyGrid({
  section,
}: {
  section: Extract<BreakdownSection, { type: "property-grid" }>;
}) {
  return (
    <div className={cn("grid gap-4", section.items.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
      {section.items.map((prop) => (
        <Card key={prop.name} className={prop.highlight ? "border-amber-200 dark:border-amber-900" : ""}>
          <CardContent className="p-4">
            <p className="text-sm font-semibold">{prop.name}</p>
            {prop.highlight && (
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{prop.highlight}</p>
            )}
            <div className="mt-2 space-y-1">
              {prop.stats.map((s) => (
                <div key={s.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
