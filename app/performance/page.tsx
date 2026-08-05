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
import { PageTop } from "@/components/app-shell/page-top";
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
import { ThumbsUp, ThumbsDown, MessageSquare, CheckCircle, XCircle, Pencil, FileText, ChevronDown, ChevronRight, ArrowRight, Calendar, Search, Library } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ALL_REPORT_PROPERTIES,
  CHART_GRID_STROKE,
  ChartTitleRow,
  SectionBanner,
  TYPE,
  DeltaPill,
  ReportFilterBar,
  SERIES_NEUTRAL,
  formatMonthLabel,
  monthsForPeriod,
  periodLabel,
  selectionRatio,
  seriesColor,
  useReportScope,
  type Tone,
} from "@/components/performance";
import { cn } from "@/lib/utils";
import { useAgents } from "@/lib/agents-context";
import { useEscalations } from "@/lib/escalations-context";
import { useWorkforce } from "@/lib/workforce-context";
import { useFeedback, type FeedbackStatus } from "@/lib/feedback-context";
import { useConversations } from "@/lib/conversations-context";
import { useRole } from "@/lib/role-context";

/**
 * Portfolio health tiles.
 *
 * These are rates and averages, so they do NOT scale with the window — a
 * renewal rate shouldn't double because you asked for twice as long. They do
 * re-derive under the active scope, because a report that shows byte-identical
 * portfolio figures for "Cedar Hills, last 3 months" and "all properties, 3
 * years" is telling the user it re-scoped when it did not.
 */
function buildHealthMetrics(months: number, propertyRatio: number) {
  const rand = seededRandom(311 + months * 7 + Math.round(propertyRatio * 100));
  const drift = (band: number) => 1 + (rand() - 0.5) * band;
  const pct = (base: number, d = 1) => `${(base * drift(0.08)).toFixed(d)}%`;

  return [
    { id: "renewal", label: "Renewal rate", value: pct(72, 0), sub: "vs 68% last period" },
    { id: "occupancy", label: "Occupancy", value: pct(94, 0), sub: "portfolio avg" },
    { id: "rent_growth", label: "Rent growth", value: pct(3.2), sub: "YoY" },
    {
      id: "cost_per_lease",
      label: "Cost per lease",
      value: `$${Math.round(1840 * drift(0.12)).toLocaleString()}`,
      sub: "portfolio",
    },
    { id: "wo_resolution", label: "Work order resolution", value: pct(94, 0), sub: "7d" },
    { id: "delinquency", label: "Delinquency", value: pct(2.1), sub: "portfolio avg" },
    { id: "turnover", label: "Turnover", value: pct(38, 0), sub: "annualized" },
    {
      id: "time_to_lease",
      label: "Time-to-lease",
      value: `${Math.round(18 * drift(0.18))} days`,
      sub: "avg new lease",
    },
    {
      id: "resident_satisfaction",
      label: "Resident satisfaction",
      value: `${(4.2 * drift(0.06)).toFixed(1)}/5`,
      sub: "survey avg",
    },
    { id: "preventative_maint", label: "Preventative maintenance", value: pct(61, 0), sub: "of total WOs" },
  ];
}

/**
 * Seeded PRNG (Lehmer / MINSTD).
 *
 * The generator is warmed up before first use: for any small seed the first
 * output lands around 0.008 regardless of the seed (1165 -> 0.0091,
 * 1048 -> 0.0082, 968 -> 0.0076), so whichever value consumed the first draw
 * was effectively constant. That pinned the Renewals headline at the same
 * figure under every filter combination while its siblings moved.
 */
function seededRandom(seed: number) {
  let s = (seed % 2147483646) + 1;
  const next = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  for (let i = 0; i < 8; i++) next();
  return next;
}

interface TrendAnchors {
  conversations: number;
  escalationRate: number;
  agentPct: number;
  humanPct: number;
}

/**
 * Monthly trend points for the selected period.
 *
 * Was a fixed 7/30/90 *daily* series driven by this page's own period
 * vocabulary. Now that the overview shares the reports' month-based period
 * filter, it plots one point per month on the same ascending `Mon 'YY` axis the
 * four agent reports use — so the time axis means the same thing everywhere.
 */
function useTrendData(months: number, anchors: TrendAnchors) {
  const points = Math.max(2, Math.min(months, 36));
  return useMemo(() => {
    const rand = seededRandom(42 + points);
    const data = [];
    for (let i = points - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const t = i / Math.max(points - 1, 1);

      data.push({
        date: formatMonthLabel(d),
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

/**
 * @param propertyRatio Share of the portfolio selected (1 = all).
 * @param periodMonths  Length of the selected window.
 *
 * Volume metrics scale with both; rates are computed as ratios and so stay in
 * band on their own. Before this, the stat cards ignored the period entirely —
 * only the trend charts moved — so changing the range appeared to do nothing
 * to the numbers above them.
 *
 * Property scope is applied by real name matching against the agents' scope
 * strings and the escalation records — the seed data now covers all ten
 * portfolio properties, so a selection genuinely narrows the underlying set
 * rather than just rescaling a total. Payments AI stays portfolio-wide, so no
 * selection can produce an empty page.
 */
function usePerformanceMetrics(
  selectedKey: string,
  isAll: boolean,
  propertyRatio: number,
  periodMonths: number,
) {
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

    // Volume scales with the WINDOW only. Property scope is already applied
    // above by filtering the agent and escalation sets, so also multiplying by
    // the selected share would count the same narrowing twice.
    const scale = Math.max(0.01, periodMonths / 12);
    const scaled = (n: number) => Math.round(n * scale);

    const totalConversations = scaled(
      autonomousAgents.reduce((s, a) => s + a.conversationCount, 0),
    );
    const totalEscalations = scaled(
      autonomousAgents.reduce((s, a) => s + a.escalationsCount, 0),
    );
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
    const scaledRevenue = totalRevenueRaw * scale;
    const totalRevenue = scaledRevenue >= 1000
      ? `$${(scaledRevenue / 1000).toFixed(1)}K`
      : `$${scaledRevenue.toFixed(0)}`;

    const laborDisplacedHrs = Math.round(totalConversations * 0.17);
    const effectiveCapacity = (humanCount + activeAgents.length * 0.8).toFixed(1);
    const unitsPerStaffWithAi = humanCount > 0 ? Math.round((humanCount + activeAgents.length * 0.8) * 10) : 0;
    const unitsPerStaffWithout = humanCount > 0 ? humanCount * 10 : 0;

    const openEscalations = scaled(scopedItems.filter((i) => i.status !== "Done").length);
    const doneEscalations = scaled(scopedItems.filter((i) => i.status === "Done").length);
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
  }, [agents, items, members, feedbackItems, selectedKey, isAll, propertyRatio, periodMonths]);
}

const conversationsChartConfig = { conversations: { label: "Conversations", color: seriesColor(0) } } satisfies ChartConfig;
const escalationChartConfig = { escalationRate: { label: "Escalation %", color: seriesColor(2) } } satisfies ChartConfig;
const agentHumanChartConfig = { agent: { label: "Agent", color: seriesColor(0) }, human: { label: "Human", color: SERIES_NEUTRAL } } satisfies ChartConfig;
const healthChartConfig = {
  renewal: { label: "Renewal %", color: seriesColor(0) },
  occupancy: { label: "Occupancy %", color: seriesColor(1) },
} satisfies ChartConfig;

/**
 * Series key for the trend chart — two unlabelled lines are unreadable.
 *
 * Ordered to match how the lines stack on the plot: occupancy runs above
 * renewal at every realistic value, so listing it first lets the eye map the
 * top label to the top line without hunting.
 */
const HEALTH_TREND_SERIES = [
  { label: "Occupancy %", color: seriesColor(1) },
  { label: "Renewal %", color: seriesColor(0) },
];

export default function PerformancePage() {
  const { role } = useRole();
  const { filteredItems: conversations } = useConversations();
  const isPropertyRole = role === "property";

  const propertyOptions = useMemo(() => {
    const set = new Set(conversations.map((c) => c.property));
    return Array.from(set).sort();
  }, [conversations]);

  // Same scope object the four agent reports read, so a period or property
  // chosen here is still in effect after clicking through to an agent.
  const [filters, setFilters] = useReportScope(ALL_REPORT_PROPERTIES);
  const months = monthsForPeriod(filters.periodId);
  const propertyRatio = selectionRatio(
    filters.properties,
    ALL_REPORT_PROPERTIES.length,
  );

  const allSelected = (filters.propertySelection?.size ?? 0) === 0;
  const selectedKey = useMemo(
    () => [...filters.properties].sort().join("|"),
    [filters.properties],
  );
  const perf = usePerformanceMetrics(selectedKey, allSelected, propertyRatio, months);
  const healthMetrics = useMemo(
    () => buildHealthMetrics(months, propertyRatio),
    [months, propertyRatio],
  );
  const agentImpact = useAgentImpactValues(months, propertyRatio);
  const trendData = useTrendData(months, {
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
      <PageTop
        title="Performance"
        // The library moved out of a tab strip and into the action cluster
        // (Tyler 08/05/2026, matching 3.0) — it's a secondary archive
        // destination, not a sibling view of this page.
        linkButtons={[
          { label: "ELI+ Legacy Library", icon: Library, href: "/performance/library" },
        ]}
        description="How output is affecting outcome — insights, correlation, and trajectory. Not just BI."
      />


      {showValueBanner && !isPropertyRole && <ValueYoureMissingBanner />}

      <ReportFilterBar
        filters={filters}
        onChange={setFilters}
        properties={ALL_REPORT_PROPERTIES}
      />

      {showAssetImpact && !isPropertyRole && (
        <section className="mb-8">
          <SectionBanner title="Asset & revenue impact" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {perf.assetMetrics.map((m) => (
              <Card key={m.id} className="border-border/60">
                <CardHeader className="pb-0">
                  <CardDescription className="text-xxs font-semibold text-muted-foreground">
                    {m.label}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2 pb-5">
                  <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground">{m.value}</p>
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
              {healthMetrics.map((m) => (
                <div key={m.id} className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5">
                  <p className="text-xs font-medium tracking-wider text-muted-foreground">{m.label}</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{m.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{m.sub}</p>
                </div>
              ))}
            </div>
            <ChartTitleRow title="Renewal & occupancy trend" series={HEALTH_TREND_SERIES} />
            <ChartContainer config={healthChartConfig} className="h-[120px] w-full">
              <LineChart data={trendData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={28} domain={[60, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="renewal" stroke={seriesColor(0)} strokeWidth={2} dot={false} name="Renewal %" />
                <Line type="monotone" dataKey="occupancy" stroke={seriesColor(1)} strokeWidth={2} dot={false} name="Occupancy %" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      {!isPropertyRole && (
        <section className="mb-8">
          <SectionBanner title="How AI is driving value" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {perf.assetValueChain.map((chain) => {
              if (chain.id === "renewals") {
                return <RenewalsImpactCard key={chain.id} scope={agentImpact} />;
              }
              if (chain.id === "leasing") {
                return <LeasingImpactCard key={chain.id} scope={agentImpact} />;
              }
              if (chain.id === "maintenance") {
                return <MaintenanceImpactCard key={chain.id} scope={agentImpact} />;
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
                        <p className="text-xxs text-muted-foreground">{chain.valueSub}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {chain.steps.map((step, idx) => (
                        <div key={step.label} className="flex items-start gap-2">
                          {idx > 0 && (
                            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                          )}
                          {idx === 0 && (
                            <div className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xxs font-medium text-muted-foreground">{step.label}</p>
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
            <PaymentsImpactCard scope={agentImpact} />
          </div>
        </section>
      )}

      <section className="mb-8">
        <SectionBanner title="Efficiency & capacity" />
        <div className={`grid gap-4 sm:grid-cols-2 ${isPropertyRole ? "lg:grid-cols-2" : "lg:grid-cols-4"}`}>
          {visibleEfficiency.map((m) => (
            <Card key={m.id} className="border-border/60">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs font-medium tracking-wider text-muted-foreground">
                  {m.label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold tracking-tight tabular-nums text-foreground">{m.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <SectionBanner title="Trends" />
        <div className={`grid gap-6 ${isPropertyRole ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Conversations</CardTitle>
              <CardDescription>Resolved over time ({periodLabel(filters.periodId)})</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={conversationsChartConfig} className="min-h-[200px] w-full">
                <AreaChart data={trendData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={28} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="conversations" stroke={seriesColor(0)} fill={seriesColor(0)} fillOpacity={0.3} strokeWidth={2} />
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={28} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="escalationRate" stroke={seriesColor(2)} strokeWidth={2} dot={false} />
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
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} width={28} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="agent" fill={seriesColor(0)} radius={[2, 2, 0, 0]} stackId="a" />
                    <Bar dataKey="human" fill={SERIES_NEUTRAL} radius={[2, 2, 0, 0]} stackId="a" />
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
                      <th className="pb-2 text-left text-muted-foreground text-xs font-semibold">Type</th>
                      <th className="pb-2 pl-6 text-left text-muted-foreground text-xs font-semibold" colSpan={2}>Conversations</th>
                      <th className="pb-2 pl-6 text-left text-muted-foreground whitespace-nowrap text-xs font-semibold" colSpan={2}>Resolution rate</th>
                    </tr>
                    <tr className="border-b border-border/40">
                      <th className="pb-1.5 text-xs font-semibold" />
                      <th className="pb-1.5 pl-6 pr-2 w-[3.5rem] text-left  text-muted-foreground text-xs font-semibold">AI</th>
                      <th className="pb-1.5 pr-12 w-[3.5rem] text-left  text-muted-foreground text-xs font-semibold">Human</th>
                      <th className="pb-1.5 pl-6 pr-2 w-[3.5rem] text-left  text-muted-foreground text-xs font-semibold">AI</th>
                      <th className="pb-1.5 pr-12 w-[3.5rem] text-left  text-muted-foreground text-xs font-semibold">Human</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perf.impactByType.length > 0 ? (
                      perf.impactByType.map((row) => (
                        <tr key={row.agentType} className="border-b border-border/60">
                          <td className="py-2 font-medium text-foreground text-xs">{row.agentType}</td>
                          <td className="py-2 pl-6 pr-2 text-left text-foreground text-xs">{row.conversations}</td>
                          <td className="py-2 pr-12 text-left text-muted-foreground text-xs">{row.humanConversations}</td>
                          <td className="py-2 pl-6 pr-2 text-left text-foreground text-xs">{row.resolutionRate}</td>
                          <td className="py-2 pr-12 text-left text-muted-foreground text-xs">{row.humanResolutionRate}</td>
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
        <SectionBanner title="Insights & next steps" />

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

const AI_ONLY_EFFICIENCY_IDS = new Set([
  "agent_accuracy",
  "agent_vs_human",
  "labor_displaced",
  "effective_capacity",
  "units_with_ai",
  "units_without_ai",
]);

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
  /** The lift this agent produced, e.g. "+10 pts". */
  delta?: string;
  deltaTone?: Tone;
  /** One short supporting clause. */
  context?: string;
}) {
  return (
    <Link href={href} className="group block h-full focus-visible:outline-none">
    <Card className="relative flex h-full flex-col overflow-hidden border-border/60 transition-all group-hover:border-foreground/20 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-eli-purple/70 via-eli-pink/60 to-eli-purple/40"
      />
      <CardContent className="flex flex-1 flex-col px-4 pb-4 pt-5">
        <div className="flex items-center gap-1.5">
          <img src="/eli-cube.svg" alt="" width={16} height={16} className="shrink-0" />
          <span className="text-sm font-semibold text-foreground">{agent}</span>
          {/* Visible at rest, not only on hover: an affordance that appears
              only when the pointer is already over the target tells you
              nothing before you get there. It advances on hover to confirm
              the whole card is the link. */}
          <ChevronRight
            className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
            aria-hidden
          />
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
      </CardContent>
    </Card>
    </Link>
  );
}

/**
 * One headline metric per agent — the number most likely to make someone open
 * the full report. The rest of the detail lives on the agent page.
 */
/**
 * The four headline agent stats, derived from the active scope.
 *
 * These were fixed strings, so the page's most prominent numbers sat under a
 * filter bar and never moved. Counts scale with the window and the share of
 * the portfolio; rates and averages only drift, since neither grows because
 * the range is longer.
 */
interface AgentImpactValues {
  renewals: React.ComponentProps<typeof AgentImpactCard>;
  leasing: React.ComponentProps<typeof AgentImpactCard>;
  maintenance: React.ComponentProps<typeof AgentImpactCard>;
  payments: React.ComponentProps<typeof AgentImpactCard>;
}

function useAgentImpactValues(months: number, propertyRatio: number): AgentImpactValues {
  return useMemo(() => {
    const rand = seededRandom(909 + months * 13 + Math.round(propertyRatio * 100));
    const drift = (band = 0.06) => 1 + (rand() - 0.5) * band;
    const volume = Math.max(0.02, (months / 12) * propertyRatio);
    const count = (base: number) => Math.round(base * volume * drift()).toLocaleString();

    const renewalRate = 74 * drift();
    const collected = 94.2 * drift();
    const days = 4.2 * drift(0.1);

    return {
      renewals: {
        agent: "Renewals", href: "/performance/renewals-ai",
        value: `${renewalRate.toFixed(0)}%`, label: "Renewal rate",
        delta: `+${(renewalRate - 64).toFixed(0)} pts`, deltaTone: "positive" as Tone,
        context: "Up from 64% since adding ELI+",
      },
      leasing: {
        agent: "Leasing", href: "/performance/leasing-ai",
        value: count(11745), label: "Tours booked by ELI+",
        context: `From ${count(75526)} conversations this period`,
      },
      maintenance: {
        agent: "Maintenance", href: "/performance/maintenance-ai",
        value: `${days.toFixed(1)}d`, label: "Avg days to complete",
        delta: `${(6.8 - days).toFixed(1)}d faster`, deltaTone: "positive" as Tone,
        context: "Down from 6.8d since adding ELI+",
      },
      payments: {
        agent: "Payments", href: "/performance/payments-ai",
        value: `${collected.toFixed(1)}%`, label: "Rent collected on time",
        delta: `+${(collected - 91).toFixed(1)} pts`, deltaTone: "positive" as Tone,
        context: "Up from 91.0% since adding ELI+",
      },
    };
  }, [months, propertyRatio]);
}

function RenewalsImpactCard({ scope }: { scope: AgentImpactValues }) {
  return <AgentImpactCard {...scope.renewals} />;
}


function LeasingImpactCard({ scope }: { scope: AgentImpactValues }) {
  return <AgentImpactCard {...scope.leasing} />;
}


function MaintenanceImpactCard({ scope }: { scope: AgentImpactValues }) {
  return <AgentImpactCard {...scope.maintenance} />;
}


function PaymentsImpactCard({ scope }: { scope: AgentImpactValues }) {
  return <AgentImpactCard {...scope.payments} />;
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
          <span className={cn(TYPE.sectionHeading, "text-foreground")}>Feedback review</span>
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
                {f === "new" && newCount > 0 && <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xxs text-white">{newCount}</span>}
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
                          <Badge variant={sl.variant} className="text-xxs">{sl.label}</Badge>
                          <span className="text-xxs text-muted-foreground">
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
                              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xxs font-medium hover:bg-muted/80"
                              onClick={() => updateStatus(item.id, "prompt_updated")}
                            >
                              <Pencil className="h-2.5 w-2.5" /> Edit prompt
                            </button>
                            <button
                              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xxs font-medium hover:bg-muted/80"
                              onClick={() => updateStatus(item.id, "sop_updated")}
                            >
                              <FileText className="h-2.5 w-2.5" /> Update SOP
                            </button>
                            <button
                              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xxs font-medium hover:bg-muted/80"
                              onClick={() => updateStatus(item.id, "reviewed")}
                            >
                              <CheckCircle className="h-2.5 w-2.5" /> Mark reviewed
                            </button>
                            <button
                              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xxs font-medium hover:bg-muted/80"
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
