"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
import { ValueYoureMissingBanner } from "@/components/value-youre-missing-banner";
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
import { ThumbsUp, ThumbsDown, MessageSquare, CheckCircle, XCircle, Pencil, FileText, ChevronDown, ArrowRight, Calendar, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DeltaPill, type Tone } from "@/components/performance";
import { cn } from "@/lib/utils";
import { useAgents } from "@/lib/agents-context";
import { useEscalations } from "@/lib/escalations-context";
import { useWorkforce } from "@/lib/workforce-context";
import { useFeedback, type FeedbackStatus } from "@/lib/feedback-context";
import { useConversations } from "@/lib/conversations-context";
import { useRole } from "@/lib/role-context";

const PERIODS = ["Last 7 days", "Last 30 days", "Last 90 days"];

const HEALTH_METRICS = [
  { id: "renewal", label: "Renewal rate", value: "72%", sub: "vs 68% last period" },
  { id: "occupancy", label: "Occupancy", value: "94%", sub: "portfolio avg" },
  { id: "rent_growth", label: "Rent growth", value: "3.2%", sub: "YoY" },
  { id: "cost_per_lease", label: "Cost per lease", value: "$1,840", sub: "portfolio" },
  { id: "wo_resolution", label: "Work order resolution", value: "94%", sub: "7d" },
  { id: "delinquency", label: "Delinquency", value: "2.1%", sub: "portfolio avg" },
  { id: "turnover", label: "Turnover", value: "38%", sub: "annualized" },
  { id: "time_to_lease", label: "Time-to-lease", value: "18 days", sub: "avg new lease" },
  { id: "resident_satisfaction", label: "Resident satisfaction", value: "4.2/5", sub: "survey avg" },
  { id: "preventative_maint", label: "Preventative maintenance", value: "61%", sub: "of total WOs" },
];


function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface TrendAnchors {
  conversations: number;
  escalationRate: number;
  agentPct: number;
  humanPct: number;
}

function useTrendData(period: string, anchors: TrendAnchors) {
  const points = period === "Last 7 days" ? 7 : period === "Last 30 days" ? 30 : 90;
  return useMemo(() => {
    const rand = seededRandom(42 + points);
    const data = [];
    for (let i = points - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const t = i / Math.max(points - 1, 1);

      data.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        fullDate: d.toISOString().slice(0, 10),
        conversations: Math.round(
          anchors.conversations * (0.7 + 0.3 * (1 - t)) + Math.sin(i * 0.5) * 3 + rand() * 4
        ),
        escalationRate: Math.round(
          (anchors.escalationRate * (1.3 - 0.3 * (1 - t)) + (i % 3) * 0.3 + rand() * 0.6) * 10
        ) / 10,
        agent: Math.round(anchors.agentPct * (0.9 + 0.1 * (1 - t)) + rand() * 3),
        human: Math.round(anchors.humanPct * (1.1 - 0.1 * (1 - t)) + rand() * 2),
        renewal: Math.round((70 + (i % 4) + rand() * 2) * 10) / 10,
        occupancy: Math.round((93 + (i % 2) + rand() * 1) * 10) / 10,
      });
    }

    const last = data[data.length - 1];
    if (last) {
      last.conversations = anchors.conversations;
      last.escalationRate = anchors.escalationRate;
      last.agent = anchors.agentPct;
      last.human = anchors.humanPct;
    }

    return data;
  }, [points, anchors.conversations, anchors.escalationRate, anchors.agentPct, anchors.humanPct]);
}

function usePerformanceMetrics(selectedKey: string, isAll: boolean) {
  const { agents } = useAgents();
  const { items } = useEscalations();
  const { members } = useWorkforce();
  const { items: feedbackItems } = useFeedback();

  return useMemo(() => {
    const selected = new Set(selectedKey ? selectedKey.split("|") : []);
    const useAll = isAll || selected.size === 0;
    const scopedAgents = useAll
      ? agents
      : agents.filter((a) => a.scope === "All properties" || Array.from(selected).some((p) => a.scope.includes(p)));
    const scopedItems = useAll
      ? items
      : items.filter((i) => i.property === "Portfolio" || selected.has(i.property));

    const activeAgents = scopedAgents.filter((a) => a.status === "Active");
    const autonomousAgents = scopedAgents.filter((a) => a.type === "autonomous");
    const totalConversations = autonomousAgents.reduce((s, a) => s + a.conversationCount, 0);
    const totalEscalations = autonomousAgents.reduce((s, a) => s + a.escalationsCount, 0);
    const escalationRate = totalConversations > 0
      ? Math.round((totalEscalations / totalConversations) * 100)
      : 0;

    const humanCount = members.filter((m) => m.type === "human").length;
    const agentCount = members.filter((m) => m.type === "agent").length;
    const totalMembers = humanCount + agentCount;
    const agentPct = totalMembers > 0 ? Math.round((agentCount / totalMembers) * 100) : 0;
    const humanPct = totalMembers > 0 ? 100 - agentPct : 0;

    const revenueImpactAgents = autonomousAgents.filter((a) => a.revenueImpact && a.revenueImpact !== "—");
    const totalRevenueRaw = revenueImpactAgents.reduce((s, a) => {
      const match = a.revenueImpact.match(/\$?([\d.]+)K?/i);
      if (!match) return s;
      const val = parseFloat(match[1]);
      return s + (a.revenueImpact.includes("K") ? val * 1000 : val);
    }, 0);
    const totalRevenue = totalRevenueRaw >= 1000
      ? `$${(totalRevenueRaw / 1000).toFixed(1)}K`
      : `$${totalRevenueRaw.toFixed(0)}`;

    const laborDisplacedHrs = Math.round(totalConversations * 0.17);
    const effectiveCapacity = (humanCount + activeAgents.length * 0.8).toFixed(1);
    const unitsPerStaffWithAi = humanCount > 0 ? Math.round((humanCount + activeAgents.length * 0.8) * 10) : 0;
    const unitsPerStaffWithout = humanCount > 0 ? humanCount * 10 : 0;

    const openEscalations = scopedItems.filter((i) => i.status !== "Done").length;
    const doneEscalations = scopedItems.filter((i) => i.status === "Done").length;
    const resolutionRate = scopedItems.length > 0
      ? Math.round((doneEscalations / scopedItems.length) * 100)
      : 0;

    type BucketAggregate = { conversations: number; escalations: number; revenueRaw: number; resolutionRates: number[]; names: string[] };
    const byBucket: Record<string, BucketAggregate> = {};
    for (const a of autonomousAgents) {
      const key = a.bucket;
      if (!byBucket[key]) byBucket[key] = { conversations: 0, escalations: 0, revenueRaw: 0, resolutionRates: [], names: [] };
      byBucket[key].conversations += a.conversationCount;
      byBucket[key].escalations += a.escalationsCount;
      byBucket[key].names.push(a.name);
      const rr = parseFloat(a.resolutionRate);
      if (!isNaN(rr)) byBucket[key].resolutionRates.push(rr);
      const rm = a.revenueImpact.match(/\$?([\d.]+)K?/i);
      if (rm) {
        const v = parseFloat(rm[1]);
        byBucket[key].revenueRaw += a.revenueImpact.includes("K") ? v * 1000 : v;
      }
    }

    const BUCKET_TO_TEAM: Record<string, string> = {
      "Leasing & Marketing": "Leasing & Marketing",
      "Operations & Maintenance": "Operations & Maintenance",
      "Revenue & Financial Management": "Revenue & Financial",
      "Resident Relations & Retention": "Resident Relations",
    };
    const humansByTeam: Record<string, number> = {};
    for (const m of members) {
      if (m.type === "human") humansByTeam[m.team] = (humansByTeam[m.team] || 0) + 1;
    }
    const humanBenchmarks: Record<string, { conversations: number; resolutionRate: number }> = {};
    const rand = seededRandom(77);
    for (const [bucket, team] of Object.entries(BUCKET_TO_TEAM)) {
      const staffCount = humansByTeam[team] || 1;
      const aiConvos = byBucket[bucket]?.conversations || 0;
      humanBenchmarks[bucket] = {
        conversations: Math.round(aiConvos * (0.3 + rand() * 0.15) * staffCount / Math.max(staffCount, 1)),
        resolutionRate: Math.round(68 + rand() * 14),
      };
    }

    const impactByType = Object.entries(byBucket)
      .map(([bucket, agg]) => {
        const hb = humanBenchmarks[bucket];
        return {
          agentType: bucket.split(" & ")[0],
          conversations: agg.conversations,
          resolutionRate: agg.resolutionRates.length > 0 ? `${Math.round(agg.resolutionRates.reduce((a, b) => a + b, 0) / agg.resolutionRates.length)}%` : "—",
          revenueImpact: agg.revenueRaw >= 1000 ? `$${(agg.revenueRaw / 1000).toFixed(1)}K` : `$${agg.revenueRaw.toFixed(0)}`,
          humanConversations: hb?.conversations ?? 0,
          humanResolutionRate: hb ? `${hb.resolutionRate}%` : "—",
        };
      })
      .sort((a, b) => b.conversations - a.conversations);

    const topAgents = [...autonomousAgents]
      .filter((a) => a.conversationCount > 0)
      .sort((a, b) => b.conversationCount - a.conversationCount)
      .slice(0, 3)
      .map((a) => ({
        name: a.name,
        conversations: a.conversationCount,
        resolutionRate: a.resolutionRate,
        revenueImpact: a.revenueImpact,
      }));

    const disabledAutonomous = autonomousAgents.filter((a) => a.status !== "Active");
    const insights: { id: string; text: string; action: string | null; href: string | null }[] = [];
    if (disabledAutonomous.length > 0) {
      insights.push({
        id: "disabled-agents",
        text: `${disabledAutonomous.length} autonomous agent${disabledAutonomous.length > 1 ? "s" : ""} (${disabledAutonomous.map((a) => a.name).join(", ")}) ${disabledAutonomous.length > 1 ? "are" : "is"} not active. Enabling ${disabledAutonomous.length > 1 ? "them" : "it"} could expand coverage and reduce staff workload.`,
        action: "View Agent Roster",
        href: "/agent-roster",
      });
    }
    if (escalationRate > 5) {
      insights.push({
        id: "high-esc",
        text: `Escalation rate is ${escalationRate}% — above the 5% target. Review SOPs and agent training to bring it down.`,
        action: "View Escalations",
        href: "/escalations",
      });
    }
    if (openEscalations > 3) {
      insights.push({
        id: "open-esc",
        text: `${openEscalations} escalations are still open. Clear the backlog to keep response times low and improve resolution rate.`,
        action: "View Escalations",
        href: "/escalations",
      });
    }
    if (insights.length === 0) {
      insights.push({
        id: "healthy",
        text: "All agents are active and escalation rate is within target. Keep monitoring weekly to maintain trajectory.",
        action: null,
        href: null,
      });
    }

    const positiveCount = feedbackItems.filter((f) => f.rating === "positive").length;
    const agentAccuracy = feedbackItems.length > 0
      ? Math.round((positiveCount / feedbackItems.length) * 100)
      : 0;

    const agentCostRaw = totalConversations * 0.12;
    const laborCostRaw = laborDisplacedHrs * 22;
    const costSavings = laborCostRaw - agentCostRaw;
    const formatCost = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${Math.round(v)}`;

    const efficiencyMetrics = [
      { id: "conversations", label: "Conversations", value: String(totalConversations), sub: "all agents" },
      { id: "escalation_rate", label: "Escalation Rate", value: `${escalationRate}%`, sub: `${totalEscalations} of ${totalConversations}` },
      { id: "agent_accuracy", label: "Agent Accuracy", value: feedbackItems.length > 0 ? `${agentAccuracy}%` : "—", sub: `from ${feedbackItems.length} feedback ratings` },
      { id: "agent_vs_human", label: "Agent / Human", value: `${agentPct}% / ${humanPct}%`, sub: "workforce distribution" },
      { id: "labor_displaced", label: "Labor Displaced", value: `${laborDisplacedHrs} hrs`, sub: "estimated" },
      { id: "effective_capacity", label: "Effective Capacity", value: `${effectiveCapacity} FTE`, sub: "humans + agents" },
      { id: "units_with_ai", label: "Units per staff (with AI)", value: String(unitsPerStaffWithAi), sub: "portfolio" },
      { id: "units_without_ai", label: "Units per staff (without AI)", value: String(unitsPerStaffWithout), sub: "baseline comparison" },
    ];

    const renewalAgents = autonomousAgents.filter((a) => a.bucket.includes("Resident Relations") || a.bucket.includes("Retention"));
    const leasingAgents = autonomousAgents.filter((a) => a.bucket.includes("Leasing"));
    const maintenanceAgents = autonomousAgents.filter((a) => a.bucket.includes("Operations") || a.bucket.includes("Maintenance"));
    const revenueAgents = autonomousAgents.filter((a) => a.bucket.includes("Revenue") || a.bucket.includes("Financial"));

    const resolvedConvos = (agts: typeof autonomousAgents) =>
      agts.reduce((s, a) => s + Math.round(a.conversationCount * (parseFloat(a.resolutionRate) || 0) / 100), 0);

    const recoveredFees = resolvedConvos(revenueAgents) * 8.5;
    const coldLeadConversions = Math.round(resolvedConvos(leasingAgents) * 0.12) * 75;
    const renewalSaves = Math.round(resolvedConvos(renewalAgents) * 0.08) * 120;
    const hiddenRevenueTotal = recoveredFees + coldLeadConversions + renewalSaves;

    const hiddenParts: string[] = [];
    if (recoveredFees > 0) hiddenParts.push(`${formatCost(recoveredFees)} recovered fees`);
    if (coldLeadConversions > 0) hiddenParts.push(`${formatCost(coldLeadConversions)} lead conversions`);
    if (renewalSaves > 0) hiddenParts.push(`${formatCost(renewalSaves)} renewal saves`);
    const hiddenSub = hiddenParts.length > 0 ? hiddenParts.join(" + ") : "no activity yet";

    const totalAiValue = totalRevenueRaw + Math.max(costSavings, 0);
    const assetMetrics = [
      { id: "total_ai_value", label: "Total AI Value", value: formatCost(totalAiValue), sub: `${formatCost(totalRevenueRaw)} asset revenue + ${formatCost(Math.max(costSavings, 0))} labor savings`, change: null },
      { id: "hidden_revenue", label: "Hidden revenue found", value: hiddenRevenueTotal > 0 ? formatCost(hiddenRevenueTotal) : "—", sub: hiddenSub, change: null },
      { id: "cost_vs_labor", label: "Agent cost vs labor", value: costSavings > 0 ? `${formatCost(costSavings)} saved` : "—", sub: `est. ${formatCost(agentCostRaw)} agent vs ${formatCost(laborCostRaw)} labor`, change: null },
    ];

    const renewalConvos = renewalAgents.reduce((s, a) => s + a.conversationCount, 0);
    const renewalShare = totalConversations > 0 ? Math.round((renewalConvos / totalConversations) * 100) : 0;
    const renewalActive = renewalAgents.filter((a) => a.status === "Active");
    const renewalAvgResolution = renewalActive.length > 0
      ? Math.round(renewalActive.reduce((s, a) => s + (parseFloat(a.resolutionRate) || 0), 0) / renewalActive.length)
      : 0;
    const leasingActive = leasingAgents.filter((a) => a.status === "Active");
    const leasingAvgResolution = leasingActive.length > 0
      ? Math.round(leasingActive.reduce((s, a) => s + (parseFloat(a.resolutionRate) || 0), 0) / leasingActive.length)
      : 0;
    const leasingConvos = leasingAgents.reduce((s, a) => s + a.conversationCount, 0);
    const maintenanceActive = maintenanceAgents.filter((a) => a.status === "Active");
    const maintenanceAvgResolution = maintenanceActive.length > 0
      ? Math.round(maintenanceActive.reduce((s, a) => s + (parseFloat(a.resolutionRate) || 0), 0) / maintenanceActive.length)
      : 0;
    const maintenanceConvos = maintenanceAgents.reduce((s, a) => s + a.conversationCount, 0);

    const renewalBucket = byBucket["Resident Relations & Retention"];
    const leasingBucket = byBucket["Leasing & Marketing"];
    const maintenanceBucket = byBucket["Operations & Maintenance"];

    const PER_CONVO_VALUE: Record<string, number> = { renewals: 91, leasing: 95, maintenance: 41 };
    const POTENTIAL_VALUES: Record<string, string> = { renewals: "~$12K/yr", leasing: "~$8K/yr", maintenance: "~$3K/yr" };
    function bucketValue(bucket: BucketAggregate | undefined, convos: number, area: string): { value: string; sub: string } {
      const raw = bucket?.revenueRaw ?? 0;
      if (raw > 0) {
        return { value: raw >= 1000 ? `$${(raw / 1000).toFixed(1)}K` : `$${Math.round(raw)}`, sub: "attributed revenue" };
      }
      if (convos > 0) {
        const est = convos * (PER_CONVO_VALUE[area] ?? 50);
        return { value: est >= 1000 ? `$${(est / 1000).toFixed(1)}K` : `$${Math.round(est)}`, sub: "est. revenue impact" };
      }
      return { value: POTENTIAL_VALUES[area] ?? "—", sub: "potential" };
    }

    const renewalVal = bucketValue(renewalBucket, renewalConvos, "renewals");
    const leasingVal = bucketValue(leasingBucket, leasingConvos, "leasing");
    const maintenanceVal = bucketValue(maintenanceBucket, maintenanceConvos, "maintenance");

    const assetValueChain: {
      id: string;
      area: string;
      active: boolean;
      steps: { label: string; detail: string }[];
      value: string;
      valueSub: string;
    }[] = [
      {
        id: "renewals",
        area: "Renewals",
        active: renewalConvos > 0,
        steps: renewalConvos > 0
          ? [
              { label: "AI work", detail: `${renewalConvos} conversations at ${renewalAvgResolution}% resolution` },
              { label: "Outcome", detail: "Renewal rate 72% (+4 pts vs last period)" },
              { label: "Asset impact", detail: `${renewalSaves > 0 ? formatCost(renewalSaves) + " in saved turnover costs · " : ""}est. 2–3 fewer vacancies per year` },
            ]
          : [
              { label: "Not active", detail: "Enable Renewal AI to automate retention" },
              { label: "Potential", detail: "Similar properties see +4 pts renewal rate" },
              { label: "Potential value", detail: "~$12K/yr in avoided vacancy & turn costs" },
            ],
        value: renewalVal.value,
        valueSub: renewalVal.sub,
      },
      {
        id: "leasing",
        area: "Leasing",
        active: leasingActive.length > 0,
        steps: leasingActive.length > 0
          ? [
              { label: "AI work", detail: `${leasingConvos} inquiries resolved at ${leasingAvgResolution}% rate` },
              { label: "Outcome", detail: `Cost per lease $1,840 · time-to-lease 18 days` },
              { label: "Asset impact", detail: `${coldLeadConversions > 0 ? formatCost(coldLeadConversions) + " from converted leads · " : ""}avg 5 fewer vacant days per unit` },
            ]
          : [
              { label: "Not active", detail: "Enable Leasing AI to improve conversions" },
              { label: "Potential", detail: "Reduce time-to-lease and cost per acquisition" },
              { label: "Potential value", detail: "~$8K/yr in reduced vacancy days" },
            ],
        value: leasingVal.value,
        valueSub: leasingVal.sub,
      },
      {
        id: "maintenance",
        area: "Maintenance",
        active: maintenanceActive.length > 0,
        steps: maintenanceActive.length > 0
          ? [
              { label: "AI work", detail: `${maintenanceConvos} work orders triaged at ${maintenanceAvgResolution}% resolution` },
              { label: "Outcome", detail: "WO resolution 94% · satisfaction 4.2/5" },
              { label: "Asset impact", detail: `${recoveredFees > 0 ? formatCost(recoveredFees) + " in recovered fees · " : ""}4.2/5 satisfaction supports 72% renewal rate` },
            ]
          : [
              { label: "Not active", detail: "Enable Maintenance AI to automate triage" },
              { label: "Potential", detail: "Reduce backlog and improve resident experience" },
              { label: "Potential value", detail: "Supports renewal rate and retention" },
            ],
        value: maintenanceVal.value,
        valueSub: maintenanceVal.sub,
      },
    ];

    const outcomeNarratives = [
      {
        id: "renewals",
        label: "Renewals",
        text: renewalConvos > 0
          ? `Renewal agents are handling ${renewalShare}% of conversations \u2192 renewal rate +4 pts vs last period. Handoff to staff for complex cases.`
          : "No renewal conversations yet. Enable Renewal AI to start automating resident retention.",
      },
      {
        id: "leasing",
        label: "Leasing",
        text: leasingActive.length > 0
          ? `Leasing agents averaging ${leasingAvgResolution}% resolution rate. ${leasingAvgResolution < 80 ? "Resolution is below target \u2014 review SOPs or enable Leasing AI at more properties to improve conversions." : "On track \u2014 strong resolution driving down cost per lease."}`
          : "No active leasing agents. Enabling Leasing AI could improve conversions and time-to-lease.",
      },
      {
        id: "maintenance",
        label: "Maintenance",
        text: maintenanceActive.length > 0
          ? `Maintenance agents at ${maintenanceAvgResolution}% resolution rate. AI triage and follow-up are reducing backlog and improving resident experience.`
          : "No active maintenance agents. Enable Maintenance AI to automate triage and reduce work order backlog.",
      },
    ];

    return { efficiencyMetrics, assetMetrics, impactByType, topAgents, insights, outcomeNarratives, assetValueChain, totalConversations, escalationRate, agentPct, humanPct };
  }, [agents, items, members, feedbackItems, selectedKey, isAll]);
}

const conversationsChartConfig = { conversations: { label: "Conversations", color: "hsl(var(--chart-1))" } } satisfies ChartConfig;
const escalationChartConfig = { escalationRate: { label: "Escalation %", color: "hsl(var(--chart-2))" } } satisfies ChartConfig;
const agentHumanChartConfig = { agent: { label: "Agent", color: "hsl(var(--chart-1))" }, human: { label: "Human", color: "hsl(var(--chart-2))" } } satisfies ChartConfig;
const healthChartConfig = { renewal: { label: "Renewal %", color: "hsl(var(--chart-1))" }, occupancy: { label: "Occupancy %", color: "hsl(var(--chart-2))" } } satisfies ChartConfig;

const AI_ONLY_EFFICIENCY_IDS = new Set([
  "agent_accuracy",
  "agent_vs_human",
  "labor_displaced",
  "effective_capacity",
  "units_with_ai",
  "units_without_ai",
]);

function PeriodPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm",
          open ? "border-primary/50 ring-1 ring-primary/20" : "border-border",
        )}
      >
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Period:</span>
        <span className="font-semibold text-foreground">{value}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-[14rem] rounded-md border border-border bg-popover p-1 shadow-lg">
            {PERIODS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={cn(
                  "block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted",
                  value === opt && "bg-muted font-medium",
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PropertiesPicker({
  options,
  selected,
  setSelected,
}: {
  options: string[];
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allSelected = options.length > 0 && selected.size === options.length;
  const label =
    allSelected || selected.size === 0
      ? "All"
      : `${selected.size} selected`;

  const filtered = options.filter((p) =>
    p.toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(p: string) {
    const next = new Set(selected);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setSelected(next);
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(options));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm",
          open ? "border-primary/50 ring-1 ring-primary/20" : "border-border",
        )}
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
                    checked={selected.has(p)}
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

export default function PerformancePage() {
  const { role } = useRole();
  const { filteredItems: conversations } = useConversations();
  const isPropertyRole = role === "property";

  const propertyOptions = useMemo(() => {
    const set = new Set(conversations.map((c) => c.property));
    return Array.from(set).sort();
  }, [conversations]);

  const [period, setPeriod] = useState("Last 7 days");
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedProperties((prev) => (prev.size === 0 ? new Set(propertyOptions) : prev));
  }, [propertyOptions]);

  const allSelected = propertyOptions.length > 0 && selectedProperties.size === propertyOptions.length;
  const selectedKey = useMemo(
    () => Array.from(selectedProperties).sort().join("|"),
    [selectedProperties],
  );
  const perf = usePerformanceMetrics(selectedKey, allSelected);
  const trendData = useTrendData(period, {
    conversations: perf.totalConversations,
    escalationRate: perf.escalationRate,
    agentPct: perf.agentPct,
    humanPct: perf.humanPct,
  });

  const visibleEfficiency = isPropertyRole
    ? perf.efficiencyMetrics.filter((m) => !AI_ONLY_EFFICIENCY_IDS.has(m.id))
    : perf.efficiencyMetrics;

  // Temporarily hidden per design review — code retained for easy restore.
  const showValueBanner = false;
  const showAssetImpact = false;

  return (
    <>
      <PageHeader
        title="Performance"
        description="How output is affecting outcome — insights, correlation, and trajectory. Not just BI."
      />


      {showValueBanner && !isPropertyRole && <ValueYoureMissingBanner />}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <PeriodPicker value={period} onChange={setPeriod} />
        <PropertiesPicker
          options={propertyOptions}
          selected={selectedProperties}
          setSelected={setSelectedProperties}
        />
      </div>

      {showAssetImpact && !isPropertyRole && (
        <section className="mb-8">
          <h2 className="section-title mb-4">Asset & revenue impact</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {perf.assetMetrics.map((m) => (
              <Card key={m.id} className="border-border/60">
                <CardHeader className="pb-0">
                  <CardDescription className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {m.label}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2 pb-5">
                  <p className="text-4xl font-bold tracking-tight text-foreground">{m.value}</p>
                  {m.change && (
                    <p className="mt-1 text-sm font-medium text-emerald-600">{m.change}</p>
                  )}
                  {!m.change && (
                    <p className="mt-1 text-sm text-muted-foreground">{m.sub}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Property and portfolio health</CardTitle>
            <CardDescription>Key property management KPIs (portfolio)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {HEALTH_METRICS.map((m) => (
                <div key={m.id} className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5">
                  <p className="text-xs font-medium tracking-wider text-muted-foreground">{m.label}</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{m.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{m.sub}</p>
                </div>
              ))}
            </div>
            <p className="mb-2 text-xs font-medium tracking-wider text-muted-foreground">Renewal & occupancy trend</p>
            <ChartContainer config={healthChartConfig} className="h-[120px] w-full">
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

      {!isPropertyRole && (
        <section className="mb-8">
          <h2 className="section-title mb-4">How AI is driving value</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {perf.assetValueChain.map((chain) => {
              if (chain.id === "renewals") {
                return <RenewalsImpactCard key={chain.id} />;
              }
              if (chain.id === "leasing") {
                return <LeasingImpactCard key={chain.id} />;
              }
              if (chain.id === "maintenance") {
                return <MaintenanceImpactCard key={chain.id} />;
              }
              return (
                <Card key={chain.id} className={`border-border/60 ${!chain.active ? "opacity-70" : ""}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-1.5 text-base">
                        {chain.active && <img src="/eli-cube.svg" alt="" width={16} height={16} className="shrink-0" />}
                        {chain.area}
                      </CardTitle>
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">{chain.value}</p>
                        <p className="text-[10px] text-muted-foreground">{chain.valueSub}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {chain.steps.map((step, idx) => (
                        <div key={step.label} className="flex items-start gap-2">
                          {idx > 0 && (
                            <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/60" />
                          )}
                          {idx === 0 && (
                            <div className="mt-0.5 h-3 w-3 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{step.label}</p>
                            <p className="text-sm text-foreground">{step.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {!chain.active && (
                      <Link href="/agent-roster" className="mt-3 inline-block text-xs font-medium text-foreground underline hover:no-underline">
                        Enable in Agent Roster →
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            <PaymentsImpactCard />
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="section-title mb-4">Efficiency & capacity</h2>
        <div className={`grid gap-4 sm:grid-cols-2 ${isPropertyRole ? "lg:grid-cols-2" : "lg:grid-cols-4"}`}>
          {visibleEfficiency.map((m) => (
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

      <section className="mb-8">
        <h2 className="section-title mb-4">Trends</h2>
        <div className={`grid gap-6 ${isPropertyRole ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
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
          {!isPropertyRole && (
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
          )}
        </div>
      </section>

      {!isPropertyRole && (
        <section className="mb-8">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Agent performance</CardTitle>
              <CardDescription>By agent type — conversations and resolution</CardDescription>
            </CardHeader>
            <CardContent>
              {perf.topAgents.length > 0 ? (
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  {perf.topAgents.map((agent, idx) => (
                    <Link key={agent.name} href="/agent-roster" className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/60">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
                        <span className="font-medium text-foreground">{agent.name}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Conversations</p>
                          <p className="text-sm font-semibold text-foreground">{agent.conversations}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Resolution</p>
                          <p className="text-sm font-semibold text-foreground">{agent.resolutionRate}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mb-4 text-center text-sm text-muted-foreground">
                  No agents with conversations yet.{" "}
                  <Link href="/agent-roster" className="font-medium text-foreground underline hover:no-underline">
                    Configure agents
                  </Link>
                </p>
              )}
              <p className="mb-2 text-xs font-medium tracking-wider text-muted-foreground">AI vs human — performance by type</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 text-left font-medium text-muted-foreground">Type</th>
                      <th className="pb-2 pl-6 text-left font-medium text-muted-foreground" colSpan={2}>Conversations</th>
                      <th className="pb-2 pl-6 text-left font-medium text-muted-foreground whitespace-nowrap" colSpan={2}>Resolution rate</th>
                    </tr>
                    <tr className="border-b border-border/40">
                      <th className="pb-1.5" />
                      <th className="pb-1.5 pl-6 pr-2 w-[3.5rem] text-left text-[10px] font-medium text-muted-foreground">AI</th>
                      <th className="pb-1.5 pr-12 w-[3.5rem] text-left text-[10px] font-medium text-muted-foreground">Human</th>
                      <th className="pb-1.5 pl-6 pr-2 w-[3.5rem] text-left text-[10px] font-medium text-muted-foreground">AI</th>
                      <th className="pb-1.5 pr-12 w-[3.5rem] text-left text-[10px] font-medium text-muted-foreground">Human</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perf.impactByType.length > 0 ? (
                      perf.impactByType.map((row) => (
                        <tr key={row.agentType} className="border-b border-border/60">
                          <td className="py-2 font-medium text-foreground">{row.agentType}</td>
                          <td className="py-2 pl-6 pr-2 text-left text-foreground">{row.conversations}</td>
                          <td className="py-2 pr-12 text-left text-muted-foreground">{row.humanConversations}</td>
                          <td className="py-2 pl-6 pr-2 text-left text-foreground">{row.resolutionRate}</td>
                          <td className="py-2 pr-12 text-left text-muted-foreground">{row.humanResolutionRate}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                          No agent performance data yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="mb-8">
        <h2 className="section-title mb-4">Insights & next steps</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {perf.outcomeNarratives.map((n) => (
            <Card key={n.id} className="border-border/60">
              <CardContent className="pt-5">
                <p className="text-xs font-medium tracking-wider text-muted-foreground">{n.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{n.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {!isPropertyRole && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {perf.insights.map((i) => (
              <Card key={i.id} className="border-border/60 bg-muted/30">
                <CardContent className="pt-5">
                  <p className="text-sm leading-relaxed text-foreground">{i.text}</p>
                  {i.action && i.href && (
                    <Link href={i.href} className="mt-3 inline-block text-sm font-medium text-foreground underline hover:no-underline">
                      {i.action} →
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {!isPropertyRole && <FeedbackReviewSection />}
    </>
  );
}

/**
 * AgentImpactCard — one headline stat per agent.
 *
 * These cards previously stacked three multi-part before→after comparisons
 * each. In a 264px column the value block (whitespace-nowrap) won all the
 * space and crushed the label column to as little as 5px, wrapping labels one
 * character per line; row heights ranged 51–145px and the longer agent names
 * pushed "View dashboard" onto a second line. Twelve-ish chunks per card on a
 * page of otherwise glanceable cards read as noise.
 *
 * The card's job is to make someone want to open the dashboard, not to be the
 * dashboard. So: the single most compelling number, a short descriptor, the
 * lift it represents, and the link. Uniform by construction — every card is
 * the same shape, so the four compare at a glance.
 */
function AgentImpactCard({
  agent,
  href,
  value,
  label,
  delta,
  deltaTone = "positive",
  context,
}: {
  agent: string;
  href: string;
  /** The headline number. */
  value: string;
  /** What the number is — kept to a few words so it never wraps to 4 lines. */
  label: string;
  /** The lift this agent produced, e.g. "+10 pts vs before ELI+". */
  delta?: string;
  deltaTone?: Tone;
  /** One short supporting clause. */
  context?: string;
}) {
  return (
    <Card className="relative flex h-full flex-col overflow-hidden border-border/60 transition-colors hover:border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-eli-purple/70 via-eli-pink/60 to-eli-purple/40"
      />
      <CardContent className="flex flex-1 flex-col px-4 pb-4 pt-5">
        <div className="flex items-center gap-1.5">
          <img src="/eli-cube.svg" alt="" width={16} height={16} className="shrink-0" />
          <span className="text-sm font-semibold text-foreground">{agent}</span>
        </div>

        <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums text-foreground">
          {value}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-xs font-medium text-foreground/80">{label}</p>
          {delta ? <DeltaPill value={delta} tone={deltaTone} /> : null}
        </div>
        {context ? (
          <p className="mt-1 text-xs text-muted-foreground">{context}</p>
        ) : null}

        <Link
          href={href}
          className="mt-auto inline-flex w-fit items-center gap-1 pt-4 text-xs font-medium text-foreground underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View dashboard
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * One headline metric per agent — the number most likely to make someone open
 * the full report. The rest of the detail lives on the agent page.
 */
function RenewalsImpactCard() {
  return (
    <AgentImpactCard
      agent="Renewals"
      href="/performance/renewals-ai"
      value="74%"
      label="Renewal rate"
      delta="+10 pts"
      deltaTone="positive"
      context="Up from 64% before ELI+"
    />
  );
}

function LeasingImpactCard() {
  return (
    <AgentImpactCard
      agent="Leasing"
      href="/performance/leasing-ai"
      value="11,745"
      label="Tours booked by ELI+"
      context="From 75,526 conversations this period"
    />
  );
}

function MaintenanceImpactCard() {
  return (
    <AgentImpactCard
      agent="Maintenance"
      href="/performance/maintenance-ai"
      value="4.2d"
      label="Avg days to complete"
      delta="2.6d faster"
      deltaTone="positive"
      context="Down from 6.8d before ELI+"
    />
  );
}

function PaymentsImpactCard() {
  return (
    <AgentImpactCard
      agent="Payments"
      href="/performance/payments-ai"
      value="94.2%"
      label="Rent collected on time"
      delta="+3.2 pts"
      deltaTone="positive"
      context="Up from 91.0% before ELI+"
    />
  );
}

const STATUS_LABELS: Record<FeedbackStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  new: { label: "New", variant: "destructive" },
  reviewed: { label: "Reviewed", variant: "secondary" },
  prompt_updated: { label: "Prompt updated", variant: "default" },
  sop_updated: { label: "SOP updated", variant: "default" },
  dismissed: { label: "Dismissed", variant: "outline" },
  escalated: { label: "Escalated", variant: "destructive" },
};

function FeedbackReviewSection() {
  const { items, updateStatus } = useFeedback();
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<"all" | FeedbackStatus>("all");

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);
  const newCount = items.filter((i) => i.status === "new").length;
  const negativeCount = items.filter((i) => i.rating === "negative").length;

  return (
    <section className="mb-8">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-lg border border-border/60 px-4 py-3 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-3">
          <h2 className="section-title">Feedback review</h2>
          <span className="text-sm text-muted-foreground">
            {items.length} total{newCount > 0 && <> &middot; <span className="font-medium text-foreground">{newCount} need review</span></>}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-4">
          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <Card className="border-border/60">
              <CardContent className="flex items-center gap-3 pt-5">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-lg font-semibold">{items.length}</p>
                  <p className="text-xs text-muted-foreground">Total feedback</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="flex items-center gap-3 pt-5">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-lg font-semibold">{negativeCount}</p>
                  <p className="text-xs text-muted-foreground">Negative</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="flex items-center gap-3 pt-5">
                <ThumbsDown className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-lg font-semibold">{newCount}</p>
                  <p className="text-xs text-muted-foreground">Needs review</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="flex items-center gap-3 pt-5">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-lg font-semibold">{items.filter((i) => i.status !== "new").length}</p>
                  <p className="text-xs text-muted-foreground">Triaged</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {(["all", "new", "reviewed", "prompt_updated", "sop_updated", "dismissed"] as const).map((f) => (
              <button
                key={f}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === f ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "All" : STATUS_LABELS[f].label}
                {f === "new" && newCount > 0 && <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white">{newCount}</span>}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No feedback items match this filter.</p>
            )}
            {filtered.map((item) => {
              const sl = STATUS_LABELS[item.status];
              return (
                <Card key={item.id} className="border-border/60">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {item.rating === "positive" ? (
                          <ThumbsUp className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ThumbsDown className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{item.agentName}</span>
                          <Badge variant={sl.variant} className="text-[10px]">{sl.label}</Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">&ldquo;{item.messageText}&rdquo;</p>
                        {item.comment && (
                          <p className="mt-1 text-xs text-foreground"><strong>Comment:</strong> {item.comment}</p>
                        )}
                        {item.status === "new" && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <button
                              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] font-medium hover:bg-muted/80"
                              onClick={() => updateStatus(item.id, "prompt_updated")}
                            >
                              <Pencil className="h-2.5 w-2.5" /> Edit prompt
                            </button>
                            <button
                              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] font-medium hover:bg-muted/80"
                              onClick={() => updateStatus(item.id, "sop_updated")}
                            >
                              <FileText className="h-2.5 w-2.5" /> Update SOP
                            </button>
                            <button
                              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] font-medium hover:bg-muted/80"
                              onClick={() => updateStatus(item.id, "reviewed")}
                            >
                              <CheckCircle className="h-2.5 w-2.5" /> Mark reviewed
                            </button>
                            <button
                              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] font-medium hover:bg-muted/80"
                              onClick={() => updateStatus(item.id, "dismissed")}
                            >
                              <XCircle className="h-2.5 w-2.5" /> Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
