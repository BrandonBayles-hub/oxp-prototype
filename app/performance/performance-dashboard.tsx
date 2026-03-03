"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
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

const PROPERTIES = ["All properties", "Property A", "Property B", "Property C"];
const PERIODS = ["Last 7 days", "Last 30 days", "Last 90 days"];

const WORKFORCE_METRICS = [
  { id: "conversations", label: "Conversations", value: "142", sub: "7d", unit: "" },
  { id: "escalation_rate", label: "Escalation Rate", value: "4%", sub: "vs 4% last period", unit: "" },
  { id: "agent_vs_human", label: "Agent / Human", value: "78% / 22%", sub: "task distribution", unit: "" },
  { id: "labor_displaced", label: "Labor Displaced", value: "24 hrs", sub: "7d", unit: "" },
  { id: "effective_capacity", label: "Effective Capacity", value: "12.2 FTE", sub: "humans + agents", unit: "" },
  { id: "revenue_impact", label: "Revenue Impact (AI)", value: "$12.4K", sub: "7d", unit: "" },
];

function useTrendData(period: string) {
  const points = period === "Last 7 days" ? 7 : period === "Last 30 days" ? 30 : 14;
  return useMemo(() => {
    const data = [];
    for (let i = points - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      data.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        fullDate: d.toISOString().slice(0, 10),
        conversations: Math.round(18 + Math.sin(i * 0.5) * 4 + Math.random() * 6),
        escalationRate: Math.round((3.2 + (i % 3) * 0.4 + Math.random() * 0.8) * 10) / 10,
        agent: Math.round(75 + (i % 5) + Math.random() * 4),
        human: Math.round(22 + (i % 3) + Math.random() * 2),
        renewal: Math.round((70 + (i % 4) + Math.random() * 2) * 10) / 10,
        occupancy: Math.round((93 + (i % 2) + Math.random() * 1) * 10) / 10,
      });
    }
    return data;
  }, [points]);
}

const INSIGHTS = [
  { id: "1", type: "trajectory", text: "Occupancy down at Property A (92%). Leasing resolution rate is low there — consider enabling Leasing AI or reviewing SOPs.", action: "View Agent Roster", href: "/agent-roster" },
  { id: "2", type: "causation", text: "Renewal rate up 4 pts vs last period. Renewal AI handling 78% of renewal conversations; handoff to staff for complex cases.", action: null, href: null },
  { id: "3", type: "trajectory", text: "Cost per lease above portfolio target. Review lead response time and Leasing AI coverage at high-cost properties.", action: "View Workforce", href: "/workforce" },
];

const HEALTH_METRICS = [
  { id: "renewal", label: "Renewal rate", value: "72%", sub: "vs 68% last period" },
  { id: "occupancy", label: "Occupancy", value: "94%", sub: "portfolio avg" },
  { id: "rent_growth", label: "Rent growth", value: "3.2%", sub: "YoY" },
  { id: "cost_per_lease", label: "Cost per lease", value: "$1,840", sub: "portfolio" },
  { id: "wo_resolution", label: "Work order resolution", value: "94%", sub: "7d" },
];

const conversationsChartConfig = { conversations: { label: "Conversations", color: "hsl(var(--chart-1))" } } satisfies ChartConfig;
const escalationChartConfig = { escalationRate: { label: "Escalation %", color: "hsl(var(--chart-2))" } } satisfies ChartConfig;
const agentHumanChartConfig = { agent: { label: "Agent", color: "hsl(var(--chart-1))" }, human: { label: "Human", color: "hsl(var(--chart-2))" } } satisfies ChartConfig;
const healthChartConfig = { renewal: { label: "Renewal %", color: "hsl(var(--chart-1))" }, occupancy: { label: "Occupancy %", color: "hsl(var(--chart-2))" } } satisfies ChartConfig;

export function PerformanceDashboard() {
  const [propertyFilter, setPropertyFilter] = useState("All properties");
  const [period, setPeriod] = useState("Last 7 days");
  const trendData = useTrendData(period);

  return (
    <>
      <PageHeader title="Performance" description="How output is affecting outcome — insights, correlation, and trajectory. Not just BI." />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)} className="select-base w-auto min-w-[11rem]">
          {PROPERTIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="select-base w-auto min-w-[11rem]">
          {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <section className="mb-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {WORKFORCE_METRICS.map((m) => (
            <Card key={m.id} className="border-border/60">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs font-medium tracking-wider text-muted-foreground">{m.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold tracking-tight text-foreground">{m.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Conversations</CardTitle>
            <CardDescription>Resolved over time ({period})</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={conversationsChartConfig} className="min-h-[200px] w-full">
              <AreaChart data={trendData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="conversations" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.3} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Escalation rate</CardTitle>
            <CardDescription>Trend vs last period</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={escalationChartConfig} className="min-h-[200px] w-full">
              <LineChart data={trendData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="escalationRate" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Task distribution</CardTitle>
            <CardDescription>Agent vs human share over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={agentHumanChartConfig} className="min-h-[200px] w-full">
              <BarChart data={trendData} margin={{ left: 12, right: 12 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="agent" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="human" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} stackId="a" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">PM health</CardTitle>
            <CardDescription>Renewal rate & occupancy (portfolio)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={healthChartConfig} className="min-h-[200px] w-full">
              <LineChart data={trendData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={28} domain={[60, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="renewal" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="Renewal %" />
                <Line type="monotone" dataKey="occupancy" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Occupancy %" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="section-title mb-4">Key PM health metrics</h2>
        <p className="mb-4 text-sm text-muted-foreground">Sourced from Entrata (or data layer). Property-management KPIs alongside workforce metrics.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {HEALTH_METRICS.map((m) => (
            <Card key={m.id} className="border-border/60">
              <CardContent className="pt-5">
                <p className="text-xs font-medium tracking-wider text-muted-foreground">{m.label}</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{m.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="section-title mb-4">Insights & trajectory</h2>
        <p className="mb-4 text-sm text-muted-foreground">Why metrics moved and how to change trajectory — not only raw BI.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INSIGHTS.map((i) => (
            <Card key={i.id} className="border-border/60">
              <CardContent className="pt-5">
                <p className="text-sm font-normal leading-relaxed text-foreground">{i.text}</p>
                {i.action && i.href && <Link href={i.href} className="mt-3 inline-block text-sm font-medium text-foreground underline hover:no-underline">{i.action} →</Link>}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
