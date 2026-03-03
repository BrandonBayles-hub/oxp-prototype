"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
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
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ArrowRight, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/role-context";
import { ContractGate, R1ComingSoon } from "@/components/contract-overlay";

const ALL_PROPERTIES = ["All properties", "Property A", "Property B", "Property C"];
const PERIODS = ["Last 7 days", "Last 30 days", "Last 90 days"];

// Efficiency & capacity (staff time saved)
const EFFICIENCY_METRICS = [
  { id: "conversations", label: "Conversations", value: "142", sub: "7d" },
  { id: "escalation_rate", label: "Escalation Rate", value: "4%", sub: "−1.2 pts since last period" },
  { id: "agent_vs_human", label: "Task Distribution", value: "78% / 22%", sub: "agent vs human" },
  { id: "labor_displaced", label: "Labor Displaced", value: "24 hrs", sub: "7d" },
  { id: "effective_capacity", label: "Effective Capacity", value: "12.2 FTE", sub: "humans + agents" },
  { id: "units_with_ai", label: "Units per staff (with AI)", value: "48", sub: "portfolio" },
  { id: "units_without_ai", label: "Units per staff (without AI)", value: "38", sub: "baseline comparison" },
];

type Trend = "positive" | "neutral" | "negative";

const KEY_HEALTH_METRICS: { id: string; label: string; value: string; trendText: string; trend: Trend }[] = [
  { id: "renewal_rate", label: "Renewal Rate", value: "72%", trendText: "+4 pts from last period", trend: "positive" },
  { id: "occupancy", label: "Occupancy", value: "94%", trendText: "Same as last period", trend: "neutral" },
  { id: "cost_per_lease", label: "Cost Per Lease", value: "$1,840", trendText: "−2% from last period", trend: "positive" },
];

const AI_VALUE_METRICS: { id: string; label: string; value: string; trendText: string; trend: Trend }[] = [
  { id: "hours_saved", label: "Hours Saved (7d)", value: "142", trendText: "+12% from last period", trend: "positive" },
  { id: "units_per_staff", label: "Units Per Staff", value: "48", trendText: "+4 from last period", trend: "positive" },
  { id: "renewal_lift", label: "Renewal Lift vs Prior", value: "+4 pts", trendText: "Improving", trend: "positive" },
  { id: "ai_outcomes", label: "AI-Influenced Outcomes (7d)", value: "28", trendText: "Same as last period", trend: "neutral" },
];

// Asset & revenue impact
const ASSET_METRICS: { id: string; label: string; value: string; sub: string; trend?: Trend }[] = [
  { id: "total_ai_value", label: "Total AI Value", value: "$12.3K", sub: "$11.3K asset revenue + $1.0K labor savings" },
  { id: "hidden_revenue", label: "Hidden Revenue Found", value: "$1.4K", sub: "$315 recovered fees + $600 lead conversions + $480 renewal saves" },
  { id: "agent_cost_vs_labor", label: "Agent Cost vs Labor", value: "$1.0K saved", sub: "est. $34 agent vs $1.1K labor" },
];

const ASSET_VALUE_DRIVERS = [
  {
    id: "renewals",
    agent: "Renewals",
    value: "$5.1K",
    valueLabel: "attributed revenue",
    aiWork: "56 conversations at 94% resolution",
    outcome: "Renewal rate 72% (+4 pts vs last period)",
    assetImpact: "$480 in saved turnover costs · est. 2–3 fewer vacancies per year",
  },
  {
    id: "leasing",
    agent: "Leasing",
    value: "$7.4K",
    valueLabel: "est. revenue impact",
    aiWork: "78 inquiries resolved at 89% rate",
    outcome: "Cost per lease $1,840 · time-to-lease 18 days",
    assetImpact: "$600 from converted leads · avg 5 fewer vacant days per unit",
  },
  {
    id: "maintenance",
    agent: "Maintenance",
    value: "$3.2K",
    valueLabel: "attributed revenue",
    aiWork: "78 work orders triaged at 89% resolution",
    outcome: "WO resolution 94% · satisfaction 4.2/5",
    assetImpact: "$315 in recovered fees · 4.2/5 satisfaction supports 72% renewal rate",
  },
];

const IMPACT_BY_AGENT_TYPE = [
  { agentType: "Leasing AI", conversations: 52, resolutionRate: "94%", revenueImpact: "$4.2K" },
  { agentType: "Renewal AI", conversations: 48, resolutionRate: "91%", revenueImpact: "$5.1K" },
  { agentType: "Maintenance AI", conversations: 32, resolutionRate: "88%", revenueImpact: "$2.0K" },
  { agentType: "Payments / Compliance", conversations: 10, resolutionRate: "96%", revenueImpact: "$1.1K" },
];

const TOP_AGENTS = [
  { name: "Renewal AI", conversations: 48, resolutionRate: "91%", revenueImpact: "$5.1K" },
  { name: "Leasing AI", conversations: 52, resolutionRate: "94%", revenueImpact: "$4.2K" },
  { name: "Maintenance AI", conversations: 32, resolutionRate: "88%", revenueImpact: "$2.0K" },
];

const INSIGHTS = [
  { id: "1", text: "Occupancy down at Property A (92%). Leasing resolution rate is low there — consider enabling Leasing AI or reviewing SOPs.", action: "View Agent Roster", href: "/agent-roster" },
  { id: "2", text: "Renewal rate up 4 pts vs last period. Renewal AI handling 78% of renewal conversations; handoff to staff for complex cases.", action: null, href: null },
  { id: "3", text: "Cost per lease above portfolio target. Review lead response time and Leasing AI coverage at high-cost properties.", action: "View Workforce", href: "/workforce" },
];

const HEALTH_METRICS = [
  { id: "renewal", label: "Renewal rate", value: "72%", sub: "vs 68% last period" },
  { id: "occupancy", label: "Occupancy", value: "94%", sub: "portfolio avg" },
  { id: "rent_growth", label: "Rent growth", value: "3.2%", sub: "YoY" },
  { id: "cost_per_lease", label: "Cost per lease", value: "$1,840", sub: "portfolio" },
  { id: "wo_resolution", label: "Work order resolution", value: "94%", sub: "7d" },
];

const PORTFOLIO_GOAL = { intent: "Keep", focus: "Increase yield — renewal rate and occupancy" };

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

const conversationsChartConfig = { conversations: { label: "Conversations", color: "hsl(var(--chart-1))" } } satisfies ChartConfig;
const escalationChartConfig = { escalationRate: { label: "Escalation %", color: "hsl(var(--chart-2))" } } satisfies ChartConfig;
const agentHumanChartConfig = { agent: { label: "Agent", color: "hsl(var(--chart-1))" }, human: { label: "Human", color: "hsl(var(--chart-2))" } } satisfies ChartConfig;
const healthChartConfig = { renewal: { label: "Renewal %", color: "hsl(var(--chart-1))" }, occupancy: { label: "Occupancy %", color: "hsl(var(--chart-2))" } } satisfies ChartConfig;

export default function PerformancePage() {
  const { roleProperties } = useRole();
  const PROPERTIES = useMemo(() => {
    if (roleProperties === "all") return ALL_PROPERTIES;
    return ["All properties", ...roleProperties];
  }, [roleProperties]);
  const [propertyFilter, setPropertyFilter] = useState("All properties");
  const [period, setPeriod] = useState("Last 7 days");
  const trendData = useTrendData(period);

  return (
    <R1ComingSoon featureName="Performance" description="Deep analytics, ROI tracking, and performance benchmarking across all AI agents and properties.">
    <ContractGate featureName="Performance">
    <>
      <PageHeader
        title="Performance"
        description="How output is affecting outcome — insights, correlation, and trajectory. Not just BI."
      />

      {/* Combined CTA: value you're missing + suggested focus + top recommendation */}
      <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
        <CardContent className="py-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-foreground">
                You&apos;re missing value — here&apos;s where to focus
              </p>
              <p className="text-sm text-muted-foreground">
                Similar properties see more leads per week and higher revenue impact when Leasing AI (or other agents) are enabled.
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">Suggested focus:</strong> Enable Leasing AI at Property A — similar properties see +12 leads/week and $2.1K impact when it&apos;s on.
                </li>
                <li>
                  <strong className="text-foreground">Top recommendation:</strong> Occupancy is down at Property A (92%); leasing resolution rate is low there. Enable Leasing AI or review SOPs to improve.
                </li>
              </ul>
              <div className="pt-1">
                <Button asChild size="sm">
                  <Link href="/agent-roster">Configure agents</Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          className="select-base w-auto min-w-[11rem]"
        >
          {PROPERTIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="select-base w-auto min-w-[11rem]"
        >
          {PERIODS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* 1. Frame two value dimensions */}
      <section className="mb-8">
        <h2 className="section-title mb-2">Asset & revenue impact</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Outcomes that affect property value: renewals, leasing, maintenance — attributed to or influenced by agents.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {ASSET_METRICS.map((m) => (
            <Card key={m.id} className="border-border bg-white dark:bg-card">
              <CardHeader className="pb-1 pt-5">
                <CardDescription className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-5">
                <p className="text-3xl font-bold tracking-tight text-foreground">{m.value}</p>
                <p className={cn(
                  "mt-1 text-sm",
                  m.trend === "positive" && "text-green-600 dark:text-green-400",
                  m.trend === "negative" && "text-red-600 dark:text-red-400",
                  (!m.trend || m.trend === "neutral") && "text-muted-foreground",
                )}>
                  {m.sub}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <h3 className="mb-4 mt-8 text-sm font-semibold text-foreground">How AI is driving asset value</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {ASSET_VALUE_DRIVERS.map((d) => (
            <Card key={d.id} className="border-border bg-white dark:bg-card">
              <CardHeader className="pb-3 pt-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image src="/eli-plus-cube.svg" alt="ELI+" width={18} height={18} className="shrink-0" />
                    <CardTitle className="text-base font-semibold">{d.agent}</CardTitle>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tracking-tight text-foreground">{d.value}</p>
                    <p className="text-[10px] text-muted-foreground">{d.valueLabel}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AI Work</p>
                  <p className="mt-0.5 text-sm text-foreground">{d.aiWork}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <ArrowRight className="h-3 w-3" />
                    Outcome
                  </p>
                  <p className="mt-0.5 text-sm text-foreground">{d.outcome}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <ArrowRight className="h-3 w-3" />
                    Asset Impact
                  </p>
                  <p className="mt-0.5 text-sm text-foreground">{d.assetImpact}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Key Health & Value */}
      <section className="mb-8">
        <h2 className="section-title mb-2">Key health & value</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Core property-management KPIs and where AI is adding measurable value right now.
        </p>

        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Health Metrics</p>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {KEY_HEALTH_METRICS.map((m) => (
            <Card key={m.id} className="border-border/60">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs font-medium tracking-wider text-muted-foreground">
                  {m.label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold tracking-tight text-foreground">{m.value}</p>
                <p className={cn(
                  "mt-0.5 text-xs",
                  m.trend === "positive" && "text-green-600 dark:text-green-400",
                  m.trend === "negative" && "text-red-600 dark:text-red-400",
                  m.trend === "neutral" && "text-muted-foreground",
                )}>
                  {m.trendText}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Adding Value Now</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AI_VALUE_METRICS.map((m) => (
            <Card key={m.id} className="border-border/60">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs font-medium tracking-wider text-muted-foreground">
                  {m.label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold tracking-tight text-foreground">{m.value}</p>
                <p className={cn(
                  "mt-0.5 text-xs",
                  m.trend === "positive" && "text-green-600 dark:text-green-400",
                  m.trend === "negative" && "text-red-600 dark:text-red-400",
                  m.trend === "neutral" && "text-muted-foreground",
                )}>
                  {m.trendText}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="section-title mb-2">Efficiency & capacity</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Staff time saved: labor displaced, units per staff, effective capacity. Same or fewer people supporting more units.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {EFFICIENCY_METRICS.map((m) => (
            <Card key={m.id} className="border-border/60">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs font-medium tracking-wider text-muted-foreground">
                  {m.label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold tracking-tight text-foreground">{m.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 6. Real charts */}
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

      {/* 3. Work → outcome chain */}
      <section className="mb-8">
        <h2 className="section-title mb-4">How work drives outcomes</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          The link between work getting done and property outcomes. Use this to see why metrics moved and where to focus.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border/60">
            <CardContent className="pt-5">
              <p className="text-xs font-medium tracking-wider text-muted-foreground">Renewals</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">
                Renewal AI is handling 78% of renewal conversations → <strong>renewal rate +4 pts</strong> vs last period. Handoff to staff for complex cases.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-5">
              <p className="text-xs font-medium tracking-wider text-muted-foreground">Leasing</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">
                Leasing resolution rate is low at Property A → <strong>cost per lease above portfolio target</strong>. Enabling Leasing AI there could improve conversions and time-to-lease.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-5">
              <p className="text-xs font-medium tracking-wider text-muted-foreground">Maintenance</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">
                Work order resolution at 94% (7d). Maintenance AI triage and follow-up are reducing backlog and improving resident experience.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 5. New TDD metrics: impact by agent type, top performing agents */}
      <section className="mb-8">
        <h2 className="section-title mb-4">Impact by agent type</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Volume, resolution rate, and revenue impact per agent type. Use this to justify and tune AI.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left font-medium text-muted-foreground">Agent type</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">Conversations</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">Resolution rate</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">Revenue impact</th>
              </tr>
            </thead>
            <tbody>
              {IMPACT_BY_AGENT_TYPE.map((row) => (
                <tr key={row.agentType} className="border-b border-border/60">
                  <td className="py-2 font-medium text-foreground">{row.agentType}</td>
                  <td className="py-2 text-right text-foreground">{row.conversations}</td>
                  <td className="py-2 text-right text-foreground">{row.resolutionRate}</td>
                  <td className="py-2 text-right text-foreground">{row.revenueImpact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="section-title mb-4">Top performing agents</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Ranked by outcome (conversations, resolution rate, revenue impact). Drill into Agent Roster for per-agent config and performance.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {TOP_AGENTS.map((agent, idx) => (
            <Link key={agent.name} href="/agent-roster">
              <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/30">
                <CardContent className="pt-5">
                  <p className="text-xs font-medium tracking-wider text-muted-foreground">#{idx + 1}</p>
                  <p className="mt-1 font-semibold text-foreground">{agent.name}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{agent.conversations} conv · {agent.resolutionRate} resolution</p>
                  <p className="mt-0.5 text-sm font-medium text-foreground">{agent.revenueImpact} impact</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>


      {/* 5. Insights & trajectory — elevated with clear next step */}
      <section className="mb-8">
        <h2 className="section-title mb-4">Insights & trajectory</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Why metrics moved and how to change trajectory. Each insight suggests a next step where applicable.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INSIGHTS.map((i) => (
            <Card key={i.id} className="border-border/60">
              <CardContent className="pt-5">
                <p className="text-sm font-normal leading-relaxed text-foreground">{i.text}</p>
                {i.action && i.href && (
                  <Link href={i.href} className="mt-3 inline-block text-sm font-medium text-foreground underline hover:no-underline">
                    {i.action} →
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
    </ContractGate>
    </R1ComingSoon>
  );
}
