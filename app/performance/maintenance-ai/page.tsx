"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import {
  DeltaPill,
  EscalationsSection,
  ReportFilterBar,
  ReportPageHeader,
  SectionBanner,
  StatCard,
  useReportScope,
  legendLabel,
  formatMonthLabel,
  monthsForPeriod,
  CHART_GRID_STROKE,
  STATUS_FILL,
  URGENCY_BADGE,
  seriesColor,
  seriesColorMap,
  serializeFilters,
  type ExtraFilter,
  type Urgency,
  type ReportFilters,
} from "@/components/performance";

// -----------------------------------------------------------------------------
// Static config — illustrative prototype data
// -----------------------------------------------------------------------------

const PROPERTIES = [
  "Ashford Crescent Oaks",
  "Bearkat Cottages",
  "Courtyard Apartments",
  "Harvest Peak Heights",
  "Maverick Trails Apartments",
  "Stonewater at the Riverbend",
  "Summerville Station",
  "Sunset Ridge",
  "The Landing at Briarcliff",
  "The Residences at Newbury",
  "Trails at Corinthian Creek",
  "Wayfare — Cumberland",
  "Westland Apts — Bldg 2",
  "Westland Apts — Bldg 5",
] as const;
type Property = (typeof PROPERTIES)[number];

const TECHNICIANS = [
  "Allen, Marcus",
  "Brooks, Tasha",
  "Diaz, Eduardo",
  "Greene, Lila",
  "Khan, Imran",
  "Murphy, Devin",
  "Park, Hyun",
  "Rivera, Sam",
  "Stein, Carla",
  "Wong, Daniel",
] as const;

// "Assigned to" filter options — "Unassigned" sits first, directly below "All".
const ASSIGNED_TO_OPTIONS = ["Unassigned", ...TECHNICIANS] as const;

const VENDORS = [
  "ABC Plumbing Co.",
  "BrightSpark Electric",
  "Cypress HVAC",
  "MetroAppliance Repair",
  "ProGlass Glaziers",
  "ShieldRoofing Services",
  "TurfPro Landscaping",
] as const;

const FLOOR_PLANS = [
  "Studio",
  "1BR / 1BA",
  "2BR / 1BA",
  "2BR / 2BA",
  "3BR / 2BA",
  "Townhome",
] as const;

const WORK_ORDER_SOURCES = [
  "Maintenance AI",
  "API",
  "Resident Portal",
  "Homebody",
  "Entrata Web",
  "Entrata Facilities App",
] as const;
type WorkOrderSource = (typeof WORK_ORDER_SOURCES)[number];

const SOURCE_COLORS: Record<WorkOrderSource, string> =
  seriesColorMap(WORK_ORDER_SOURCES);

type EliSource = "SMS" | "Chat" | "Voice";

/** ELI channels are categories, not statuses — ordered shared palette. */
const AI_COMPONENT_COLORS: Record<EliSource, string> = seriesColorMap([
  "SMS",
  "Chat",
  "Voice",
] as const);

type Priority = "Emergency" | "High" | "Medium" | "Low" | "Preventative";

/**
 * Priority is an urgency ladder, so its colors must rank monotonically:
 * breach → warning → info → settled. Previously "Low" was green, which reads
 * as a completed/good outcome rather than as low urgency, and Emergency/High/
 * Medium spanned three separate saturated hue families.
 */
const PRIORITY_URGENCY: Record<Priority, Urgency> = {
  Emergency: "breach",
  High: "warning",
  Medium: "warning",
  Low: "muted",
  Preventative: "info",
};

const PRIORITY_BADGE: Record<Priority, string> = {
  Emergency: URGENCY_BADGE.breach,
  High: URGENCY_BADGE.warning,
  Medium: URGENCY_BADGE.warning,
  Low: URGENCY_BADGE.muted,
  Preventative: URGENCY_BADGE.info,
};

/**
 * Chart fills for the same ladder, in the same rank order.
 *
 * These carry white labels inside the priority bar, so each is dark enough to
 * clear WCAG AA against white at 12px (measured 6.62 / 6.28 / 5.77 / 5.84 /
 * 6.45 against a 4.5:1 requirement).
 */
const PRIORITY_COLOR: Record<Priority, string> = {
  Emergency: "hsl(357 64% 42%)",
  High: "hsl(25 85% 33%)",
  Medium: "hsl(43 90% 27%)",
  Low: "hsl(222 14% 42%)",
  Preventative: "hsl(207 65% 36%)",
};

type SliceDimension = "status" | "priority" | "source";

type WorkOrderStatus =
  | "Open"
  | "In Progress"
  | "Scheduled"
  | "Awaiting Parts"
  | "Suspended"
  | "Work Completed"
  | "Completed"
  | "Closed"
  | "Cancelled";

/**
 * Status is a lifecycle, not a category: in-flight states are informational,
 * blocked states warn, finished states settle, and closed/cancelled recede.
 * Previously these nine statuses spanned eight different hue families, so no
 * single color meant anything.
 */
const STATUS_BADGE: Record<WorkOrderStatus, string> = {
  Open: URGENCY_BADGE.info,
  "In Progress": URGENCY_BADGE.info,
  Scheduled: URGENCY_BADGE.info,
  "Awaiting Parts": URGENCY_BADGE.warning,
  Suspended: URGENCY_BADGE.warning,
  "Work Completed": URGENCY_BADGE.settled,
  Completed: URGENCY_BADGE.settled,
  Closed: URGENCY_BADGE.muted,
  Cancelled: URGENCY_BADGE.muted,
};

interface WorkOrderRow {
  id: string;
  source: EliSource;
  property: string;
  unit: string;
  resident: string;
  priority: Priority;
  category: string;
  problem: string;
  location: string;
  description: string;
  dateTime: string;
  status: WorkOrderStatus;
  assignedTo: string;
  assignedOn: string;
}

interface MessageLogRow {
  woId: string | null;
  woCreated: boolean;
  source: EliSource;
  property: string;
  resident: string;
  direction: "Incoming" | "Outgoing";
  dateTime: string;
  message: string;
  description: string;
  sessionId: string;
}

/**
 * Maintenance carries four dimensions the other agents do not. They live in
 * the shared filter state's `extras` map and render behind the filter bar's
 * "More filters" disclosure, so the bar keeps the same two primary controls
 * (Period, Properties) as every other report instead of wrapping onto a
 * second row.
 */
const MAINTENANCE_EXTRA_FILTERS: ExtraFilter[] = [
  { id: "technicians", label: "Assigned to", options: ASSIGNED_TO_OPTIONS },
  { id: "vendors", label: "Assigned vendor", options: VENDORS },
  { id: "floorPlans", label: "Floorplan", options: FLOOR_PLANS },
  { id: "sources", label: "Work order source", options: WORK_ORDER_SOURCES },
];

const MAINTENANCE_EXTRA_DEFAULTS = {
  technicians: ASSIGNED_TO_OPTIONS,
  vendors: VENDORS,
  floorPlans: FLOOR_PLANS,
  sources: WORK_ORDER_SOURCES,
};

/** Read an extras dimension, defaulting to "everything selected". */
function extraSet(filters: ReportFilters, id: keyof typeof MAINTENANCE_EXTRA_DEFAULTS): Set<string> {
  return filters.extras[id] ?? new Set(MAINTENANCE_EXTRA_DEFAULTS[id]);
}

// -----------------------------------------------------------------------------
// Mock data generators (period-aware)
// -----------------------------------------------------------------------------

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function seedRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface PeriodScaledMetrics {
  // Section 1 KPIs
  openWorkOrders: number;
  overdueWorkOrders: number;
  unassignedWorkOrders: number;
  priorityCounts: Record<Priority, number>;
  statusByMonth: {
    label: string;
    Open: number;
    Completed: number;
    Overdue: number;
    Submitted: number;
    Unassigned: number;
  }[];
  bySource: { name: WorkOrderSource; value: number; count: number }[];
  avgDaysBySource: { source: WorkOrderSource; days: number }[];

  // Section 2 — Maintenance AI Impact
  workOrdersResolved: number;
  withinSlaPct: number;
  totalUnitsUsingAi: number;
  unitsDeltaAbsolute: number;
  unitsAiUsageRate: number;
  unitsAiUsageDelta: number;
  eliSubmittedWorkOrders: number;
  eliSubmittedDeltaPct: number;
  workOrdersDeflected: number;
  workOrdersDeflectedPct: number;
  workOrdersDeflectedDelta: number;
  monthlyAiWoSubmitted: { month: string; baseline: number; current: number }[];

  aiOriginOpen: number;
  aiOriginCompleted: number;
  aiOriginCancelled: number;
  aiOriginAvgDays: number;
  aiOriginTotal: number;
  aiStatusDistribution: { name: string; value: number; color: string }[];
  priorityDistribution: { name: string; value: number; color: string }[];
  componentDistribution: { name: string; value: number; color: string }[];

  // Section 3 — Conversational analysis
  woByAiComponent: { source: EliSource; count: number }[];
  totalMessagesReceived: number;
  smsReceived: number;
  chatReceived: number;
  totalMessagesSent: number;
  receivedToSentRatio: string;
  incomingPerDay: { date: string; count: number }[];
  incomingGranularity: "day" | "week" | "month";

  // Escalations
  escalationRate: string;
  totalEscalations: string;
  openEscalations: string;
  resolvedEscalations: string;
  avgEscalationResolutionDays: string;
  escalationReasons: { reason: string; count: number }[];
  escalationResolutionTrend: { month: string; days: number }[];
}

const BASE_3Y = {
  openWorkOrders: 916910,
  overdueWorkOrders: 270830,
  unassignedWorkOrders: 904320,
  priorityCounts: {
    Emergency: 2148,
    High: 17421,
    Medium: 585919,
    Low: 273256,
    Preventative: 38170,
  },
  workOrdersResolved: 4186,
  totalUnitsUsingAi: 28420,
  unitsAiUsageRate: 64.2,
  eliSubmittedWorkOrders: 4842,
  workOrdersDeflectedPct: 31.4,
  workOrdersDeflected: 2218,
  aiOriginOpen: 184,
  aiOriginCompleted: 2871,
  aiOriginCancelled: 642,
  aiOriginAvgDays: 4.2,
  smsCount: 2438,
  chatCount: 1812,
  voiceCount: 592,
  totalMessagesReceived: 18204,
  totalMessagesSent: 16489,
  totalEscalations: 268,
  avgEscalationResolutionDays: 3.4,
} as const;

const BASE_ESCALATION_REASONS = [
  { reason: "Parts Unavailable", count: 78 },
  { reason: "Access / Entry Issue", count: 61 },
  { reason: "Vendor Required", count: 49 },
  { reason: "Resident Dissatisfied", count: 38 },
  { reason: "Safety / Emergency", count: 24 },
  { reason: "Technical Problem", count: 18 },
];

const SOURCE_PERCENTAGES: Record<WorkOrderSource, number> = {
  "Maintenance AI": 11.0,
  API: 2.8,
  "Resident Portal": 20.3,
  Homebody: 15.3,
  "Entrata Web": 28.2,
  "Entrata Facilities App": 22.4,
};

const AVG_DAYS_BY_SOURCE: Record<WorkOrderSource, number> = {
  "Maintenance AI": 4.2,
  API: 5.8,
  "Resident Portal": 4.5,
  Homebody: 3.9,
  "Entrata Web": 5.2,
  "Entrata Facilities App": 3.4,
};

function buildMetricsForPeriod(months: number, filters: ReportFilters): PeriodScaledMetrics {
  const scale = months / 36;
  const propertyScale =
    filters.properties.size === 0
      ? 0
      : filters.properties.size / PROPERTIES.length;
  const sources = extraSet(filters, "sources");
  const sourceScale =
    sources.size === 0 ? 0 : sources.size / WORK_ORDER_SOURCES.length;

  const adjusted = Math.max(0.01, scale * propertyScale * sourceScale);

  const scaleInt = (n: number) => Math.max(0, Math.round(n * adjusted));
  const scalePct = (n: number) => Math.max(0, +(n * (0.85 + 0.15 * propertyScale)).toFixed(1));

  const priorityCounts = {
    Emergency: scaleInt(BASE_3Y.priorityCounts.Emergency),
    High: scaleInt(BASE_3Y.priorityCounts.High),
    Medium: scaleInt(BASE_3Y.priorityCounts.Medium),
    Low: scaleInt(BASE_3Y.priorityCounts.Low),
    Preventative: scaleInt(BASE_3Y.priorityCounts.Preventative),
  };

  // Status by month — historical heavily Completed, recent heavily Open.
  // Shows the most recent months in the selected period (capped at 13),
  // ordered oldest → most recent.
  const statusByMonth = (() => {
    const rand = seedRand(101 + months);
    const data: PeriodScaledMetrics["statusByMonth"] = [];
    const count = Math.min(months, 13);
    for (let i = 0; i < count; i++) {
      const monthOffset = count - 1 - i;
      const t = i / Math.max(count - 1, 1);
      const total = 700000 + rand() * 200000;
      const completedRatio = 0.85 - 0.7 * t;
      const openRatio = 0.05 + 0.45 * t;
      const overdueRatio = 0.06 + 0.1 * t;
      const submittedRatio = 0.02 + 0.05 * t;
      const unassignedRatio = 0.06 + 0.08 * t;
      const labelDate = new Date();
      labelDate.setMonth(labelDate.getMonth() - monthOffset);
      // Shared formatter: this chart used ISO "2026-07" while the AI-submitted
      // chart on the same page used "Jul '26".
      const label = formatMonthLabel(labelDate);
      data.push({
        label,
        Completed: Math.round(total * completedRatio * adjusted),
        Open: Math.round(total * openRatio * adjusted),
        Overdue: Math.round(total * overdueRatio * adjusted),
        Submitted: Math.round(total * submittedRatio * adjusted),
        Unassigned: Math.round(total * unassignedRatio * adjusted),
      });
    }
    // Oldest months first, most recent at the end — matches the other charts.
    return data;
  })();

  const includedSources = WORK_ORDER_SOURCES.filter((s) => sources.has(s));
  const totalSourcePctIncluded = includedSources.reduce(
    (s, src) => s + SOURCE_PERCENTAGES[src],
    0,
  );
  const totalWoForSource = scaleInt(160000);
  const bySource: PeriodScaledMetrics["bySource"] = includedSources.map((src) => {
    const pct =
      totalSourcePctIncluded > 0
        ? (SOURCE_PERCENTAGES[src] / totalSourcePctIncluded) * 100
        : 0;
    return {
      name: src,
      value: +pct.toFixed(1),
      count: Math.round(totalWoForSource * (SOURCE_PERCENTAGES[src] / 100)),
    };
  });

  const avgDaysBySource: PeriodScaledMetrics["avgDaysBySource"] = includedSources.map(
    (src) => ({
      source: src,
      days: AVG_DAYS_BY_SOURCE[src],
    }),
  );

  // Section 2 — AI Impact (driven primarily by selected period)
  const aiPeriodScale = Math.max(0.05, (months / 12) * propertyScale);

  const workOrdersResolved = Math.round(BASE_3Y.workOrdersResolved * aiPeriodScale);
  const eliSubmittedWorkOrders = Math.max(
    workOrdersResolved,
    Math.round(BASE_3Y.eliSubmittedWorkOrders * aiPeriodScale),
  );
  const workOrdersDeflectedPct = scalePct(BASE_3Y.workOrdersDeflectedPct);
  const workOrdersDeflected = Math.round(
    (eliSubmittedWorkOrders * workOrdersDeflectedPct) / 100,
  );

  const totalUnitsUsingAi = Math.round(BASE_3Y.totalUnitsUsingAi * (0.6 + 0.4 * propertyScale));
  const unitsAiUsageRate = scalePct(BASE_3Y.unitsAiUsageRate);
  const monthlyAiWoSubmitted = (() => {
    const data: PeriodScaledMetrics["monthlyAiWoSubmitted"] = [];
    // One point per month across the selected period, oldest → most recent.
    const monthCount = Math.max(1, months);
    for (let i = 0; i < monthCount; i++) {
      const t = monthCount === 1 ? 1 : i / (monthCount - 1);
      const dateRef = new Date();
      dateRef.setMonth(dateRef.getMonth() - (monthCount - 1 - i));
      const label = formatMonthLabel(dateRef);
      data.push({
        month: label,
        baseline: Math.round(300 + (i % 4) * 12),
        current: Math.round(300 + 200 * Math.sin((t + 0.2) * Math.PI) + t * 80),
      });
    }
    return data;
  })();

  const aiOriginOpen = Math.round(BASE_3Y.aiOriginOpen * aiPeriodScale);
  const aiOriginCompleted = Math.round(BASE_3Y.aiOriginCompleted * aiPeriodScale);
  const aiOriginCancelled = Math.round(BASE_3Y.aiOriginCancelled * aiPeriodScale);
  // An average shouldn't scale with volume, but it should still reflect the
  // window being measured — leaving it a pure constant made it the one AI-impact
  // figure that never moved under the filters.
  const aiOriginAvgDays = +(
    BASE_3Y.aiOriginAvgDays *
    (1 + (seedRand(4242 + months + Math.round(propertyScale * 100))() - 0.5) * 0.12)
  ).toFixed(1);
  const aiOriginTotal = eliSubmittedWorkOrders;

  const aiStatusDistribution = [
    { name: "Completed", value: aiOriginCompleted, color: seriesColor(0)},
    { name: "Cancelled", value: aiOriginCancelled, color: seriesColor(1)},
    {
      name: "In Progress",
      value: Math.round(aiOriginCompleted * 0.18),
      color: seriesColor(2),
    },
    { name: "Open", value: aiOriginOpen, color: seriesColor(3)},
  ];

  // Section 3 — conversational
  const compScale = Math.max(0.05, (months / 12) * propertyScale);
  const smsCount = Math.round(BASE_3Y.smsCount * compScale);
  const chatCount = Math.round(BASE_3Y.chatCount * compScale);
  const voiceCount = Math.round(BASE_3Y.voiceCount * compScale);

  // AI-origin priority breakdown — scaled from total priority mix, weighted to the AI workload.
  const totalPriorityRaw = (
    Object.keys(BASE_3Y.priorityCounts) as Priority[]
  ).reduce((s, k) => s + BASE_3Y.priorityCounts[k], 0);
  const priorityDistribution: { name: string; value: number; color: string }[] = (
    Object.keys(BASE_3Y.priorityCounts) as Priority[]
  ).map((p) => {
    const share = totalPriorityRaw > 0 ? BASE_3Y.priorityCounts[p] / totalPriorityRaw : 0;
    return {
      name: p,
      value: Math.max(0, Math.round(aiOriginTotal * share)),
      color: PRIORITY_COLOR[p],
    };
  });

  const componentDistribution: { name: string; value: number; color: string }[] = [
    { name: "SMS", value: smsCount, color: seriesColor(0)},
    { name: "Chat", value: chatCount, color: seriesColor(1)},
    { name: "Voice", value: voiceCount, color: seriesColor(2)},
  ];

  const totalMessagesReceived = Math.round(BASE_3Y.totalMessagesReceived * compScale);
  const totalMessagesSent = Math.round(BASE_3Y.totalMessagesSent * compScale);
  const smsReceived = Math.round(totalMessagesReceived * 0.62);
  const chatReceived = totalMessagesReceived - smsReceived;
  const receivedToSentRatio =
    totalMessagesSent > 0
      ? `${(totalMessagesReceived / totalMessagesSent).toFixed(2)}:1`
      : "—";

  // Incoming message traffic rolls up based on the selected range:
  //   ≤ 3 months → daily · > 3 and < 12 months → weekly · ≥ 12 months → monthly
  const incomingGranularity: "day" | "week" | "month" =
    months <= 3 ? "day" : months < 12 ? "week" : "month";
  const incomingPerDay = (() => {
    const rand = seedRand(317 + months);
    const out: PeriodScaledMetrics["incomingPerDay"] = [];
    const dailyBase = () => Math.round(115 + rand() * 50);

    if (incomingGranularity === "day") {
      const days = Math.min(92, Math.round(months * 30));
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        out.push({
          date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          count: dailyBase(),
        });
      }
    } else if (incomingGranularity === "week") {
      const weeks = Math.max(1, Math.round(months * 4.345));
      for (let i = 0; i < weeks; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (weeks - 1 - i) * 7);
        out.push({
          date: `Wk of ${d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}`,
          count: dailyBase() * 7,
        });
      }
    } else {
      for (let i = 0; i < months; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - (months - 1 - i));
        out.push({
          date: `${MONTH_LABELS[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`,
          count: dailyBase() * 30,
        });
      }
    }
    return out;
  })();

  // Escalations — derived from the same AI-period scale used for the rest of
  // the AI impact metrics, so the numbers respond to period/property filters.
  const escalationRand = seedRand(5150 + months + Math.round(propertyScale * 100));
  const escalationJitter = () => 1 + (escalationRand() - 0.5) * 0.08;
  const totalEscalations = Math.max(1, Math.round(BASE_3Y.totalEscalations * aiPeriodScale * escalationJitter()));
  const openEscalations = Math.max(0, Math.round(totalEscalations * 0.1 * escalationJitter()));
  const resolvedEscalations = Math.max(0, totalEscalations - openEscalations);
  const escalationRate = +(12.6 * escalationJitter()).toFixed(1);
  const avgEscalationResolutionDays = +(
    BASE_3Y.avgEscalationResolutionDays * escalationJitter()
  ).toFixed(1);
  const escalationReasonScale = Math.max(0.05, aiPeriodScale);
  const escalationReasons = BASE_ESCALATION_REASONS.map((item, i) => ({
    ...item,
    count: Math.round(item.count * escalationReasonScale * (1 + (seedRand(6001 + i + months)() - 0.5) * 0.08)),
  }));
  const escalationResolutionTrend = (() => {
    const rand = seedRand(6501 + months);
    const data: PeriodScaledMetrics["escalationResolutionTrend"] = [];
    const count = Math.min(months, 13);
    for (let i = 0; i < count; i++) {
      const monthOffset = count - 1 - i;
      const t = i / Math.max(count - 1, 1);
      const dateRef = new Date();
      dateRef.setMonth(dateRef.getMonth() - monthOffset);
      const days = avgEscalationResolutionDays * (1.25 - 0.35 * t) + (rand() - 0.5) * 0.4;
      data.push({ month: formatMonthLabel(dateRef), days: +Math.max(0.5, days).toFixed(1) });
    }
    return data;
  })();

  return {
    openWorkOrders: scaleInt(BASE_3Y.openWorkOrders),
    overdueWorkOrders: scaleInt(BASE_3Y.overdueWorkOrders),
    unassignedWorkOrders: scaleInt(BASE_3Y.unassignedWorkOrders),
    priorityCounts,
    statusByMonth,
    bySource,
    avgDaysBySource,

    workOrdersResolved,
    withinSlaPct: 94,
    totalUnitsUsingAi,
    unitsDeltaAbsolute: 1240,
    unitsAiUsageRate,
    unitsAiUsageDelta: 4.1,
    eliSubmittedWorkOrders,
    eliSubmittedDeltaPct: 18,
    workOrdersDeflected,
    workOrdersDeflectedPct,
    workOrdersDeflectedDelta: 6.2,
    monthlyAiWoSubmitted,

    aiOriginOpen,
    aiOriginCompleted,
    aiOriginCancelled,
    aiOriginAvgDays,
    aiOriginTotal,
    aiStatusDistribution,
    priorityDistribution,
    componentDistribution,

    woByAiComponent: [
      { source: "SMS", count: smsCount },
      { source: "Chat", count: chatCount },
      { source: "Voice", count: voiceCount },
    ],
    totalMessagesReceived,
    smsReceived,
    chatReceived,
    totalMessagesSent,
    receivedToSentRatio,
    incomingPerDay,
    incomingGranularity,

    escalationRate: `${escalationRate}%`,
    totalEscalations: totalEscalations.toLocaleString(),
    openEscalations: openEscalations.toLocaleString(),
    resolvedEscalations: resolvedEscalations.toLocaleString(),
    avgEscalationResolutionDays: `${avgEscalationResolutionDays}`,
    escalationReasons,
    escalationResolutionTrend,
  };
}

// -----------------------------------------------------------------------------
// Mock Maintenance AI work order detail rows
// -----------------------------------------------------------------------------

const WORK_ORDER_ROWS: WorkOrderRow[] = [
  {
    id: "166836",
    source: "Chat",
    property: "Summerville Station",
    unit: "J-102",
    resident: "David McMurtry",
    priority: "Medium",
    category: "General",
    problem: "Trash Removal",
    location: "Unit",
    description:
      "Resident reports trash chute on 3rd floor jammed; bag stuck near hopper.",
    dateTime: "2026-02-22 14:18",
    status: "In Progress",
    assignedTo: "Brooks, Tasha",
    assignedOn: "2026-02-22 16:02",
  },
  {
    id: "4689",
    source: "SMS",
    property: "Trails at Corinthian Creek",
    unit: "A-205",
    resident: "Jerry Harris",
    priority: "Medium",
    category: "Appliances",
    problem: "Dishwasher",
    location: "Kitchen",
    description:
      "Dishwasher fails to drain; standing water at end of cycle. Likely clogged drain line.",
    dateTime: "2026-02-22 09:42",
    status: "Scheduled",
    assignedTo: "Diaz, Eduardo",
    assignedOn: "2026-02-22 11:30",
  },
  {
    id: "6854571",
    source: "Chat",
    property: "Stonewater at the Riverbend",
    unit: "B-330",
    resident: "Robert Garcia",
    priority: "Medium",
    category: "Windows",
    problem: "Screens",
    location: "Living Room",
    description:
      "Living room window screen torn at lower corner; lets bugs in at night.",
    dateTime: "2026-02-21 18:05",
    status: "Open",
    assignedTo: "Unassigned",
    assignedOn: "—",
  },
  {
    id: "10237108",
    source: "Chat",
    property: "Wayfare — Cumberland",
    unit: "C-1003",
    resident: "Emilee McGuire",
    priority: "High",
    category: "General",
    problem: "Exterior Door Knob/Lock",
    location: "Patio",
    description:
      "Patio sliding door lock won't latch; security concern flagged.",
    dateTime: "2026-02-22 12:30",
    status: "Awaiting Parts",
    assignedTo: "Park, Hyun",
    assignedOn: "2026-02-22 14:55",
  },
  {
    id: "422719",
    source: "Chat",
    property: "Bearkat Cottages",
    unit: "3-C",
    resident: "Alex Argueta",
    priority: "Medium",
    category: "Walls",
    problem: "Walls",
    location: "Bathroom",
    description: "Drywall scuff and small hole near vanity. Cosmetic patch and paint.",
    dateTime: "2026-02-20 15:48",
    status: "Scheduled",
    assignedTo: "Stein, Carla",
    assignedOn: "2026-02-21 08:11",
  },
  {
    id: "6853168",
    source: "SMS",
    property: "The Residences at Newbury",
    unit: "G-7210",
    resident: "TSeyHaye Preaster",
    priority: "Medium",
    category: "Plumbing",
    problem: "Sink",
    location: "Bathroom",
    description: "Bathroom sink slow drain; resident has tried plunger with no improvement.",
    dateTime: "2026-02-20 11:14",
    status: "In Progress",
    assignedTo: "Allen, Marcus",
    assignedOn: "2026-02-20 12:40",
  },
  {
    id: "6853166",
    source: "SMS",
    property: "The Landing at Briarcliff",
    unit: "D-401",
    resident: "Barbara Reres",
    priority: "High",
    category: "Appliances",
    problem: "Refrigerator",
    location: "Kitchen",
    description: "Refrigerator not cooling — internal temperature 52°F. Risk of food spoilage.",
    dateTime: "2026-02-20 19:22",
    status: "In Progress",
    assignedTo: "MetroAppliance Repair",
    assignedOn: "2026-02-20 20:10",
  },
  {
    id: "18217563",
    source: "Chat",
    property: "Courtyard Apartments",
    unit: "5651-C",
    resident: "Samyra Drawhorn",
    priority: "Medium",
    category: "Plumbing",
    problem: "Drain",
    location: "Bathroom",
    description: "Tub drain backing up after showers. Possible hair clog in P-trap.",
    dateTime: "2026-02-19 08:50",
    status: "Scheduled",
    assignedTo: "ABC Plumbing Co.",
    assignedOn: "2026-02-19 10:35",
  },
  {
    id: "13443085",
    source: "Chat",
    property: "Ashford Crescent Oaks",
    unit: "E-317",
    resident: "Sara Ali",
    priority: "Low",
    category: "Exterior",
    problem: "Exterior Lighting",
    location: "Exterior",
    description: "Walkway light by unit entrance flickering at night. Likely bulb or photocell.",
    dateTime: "2026-02-18 21:10",
    status: "Completed",
    assignedTo: "BrightSpark Electric",
    assignedOn: "2026-02-19 09:00",
  },
  {
    id: "13443086",
    source: "SMS",
    property: "Ashford Crescent Oaks",
    unit: "E-317",
    resident: "Sara Ali",
    priority: "Medium",
    category: "Exterior",
    problem: "Exterior Lighting",
    location: "Exterior",
    description:
      "Follow-up: second walkway lamp now also out. Recommend re-lamping the run.",
    dateTime: "2026-02-18 21:24",
    status: "Open",
    assignedTo: "Unassigned",
    assignedOn: "—",
  },
  {
    id: "166828",
    source: "Chat",
    property: "Maverick Trails Apartments",
    unit: "B-221",
    resident: "Tommie Gainey",
    priority: "Medium",
    category: "Appliances",
    problem: "Refrigerator",
    location: "Kitchen",
    description: "Refrigerator door seal split; cold air escapes. Replace gasket.",
    dateTime: "2026-02-18 13:55",
    status: "Awaiting Parts",
    assignedTo: "MetroAppliance Repair",
    assignedOn: "2026-02-18 15:20",
  },
  {
    id: "188204",
    source: "Voice",
    property: "Westland Apts — Bldg 5",
    unit: "G-934",
    resident: "Sam Rivera",
    priority: "Emergency",
    category: "HVAC",
    problem: "Air Conditioning",
    location: "Living Room",
    description: "AC not cooling below 78°F. Resident is heat-sensitive; flagged Life & Safety.",
    dateTime: "2026-02-17 16:40",
    status: "In Progress",
    assignedTo: "Cypress HVAC",
    assignedOn: "2026-02-17 17:05",
  },
  {
    id: "188205",
    source: "Chat",
    property: "Harvest Peak Heights",
    unit: "A-1402",
    resident: "Priya Singh",
    priority: "Preventative",
    category: "HVAC",
    problem: "Filter Change",
    location: "Unit",
    description: "Quarterly filter swap (MERV-11). Routine PM cycle.",
    dateTime: "2026-02-16 09:00",
    status: "Scheduled",
    assignedTo: "Murphy, Devin",
    assignedOn: "2026-02-16 10:18",
  },
  {
    id: "188210",
    source: "Voice",
    property: "Sunset Ridge",
    unit: "C-208",
    resident: "Marcus Allen",
    priority: "Emergency",
    category: "Plumbing",
    problem: "Water Heater Leak",
    location: "Utility Closet",
    description:
      "Active water heater drip-pan overflow; resident shut off supply valve. Same-day dispatch.",
    dateTime: "2026-02-16 07:22",
    status: "Completed",
    assignedTo: "ABC Plumbing Co.",
    assignedOn: "2026-02-16 08:05",
  },
];

// -----------------------------------------------------------------------------
// Mock conversation analysis rows
// -----------------------------------------------------------------------------

const MESSAGE_LOG_ROWS: MessageLogRow[] = [
  {
    woId: "WO-104821",
    woCreated: true,
    source: "SMS",
    property: "Westland Apts — Bldg 2",
    resident: "Jordan Lee",
    direction: "Incoming",
    dateTime: "2026-02-26 09:12",
    message: "Kitchen faucet dripping steadily since last night.",
    description: "Plumbing — kitchen sink faucet leaking continuously. Resident reports drip began at ~03:00; replace cartridge or worn cartridge.",
    sessionId: "AS-2026022609-b181",
  },
  {
    woId: "WO-104821",
    woCreated: true,
    source: "SMS",
    property: "Westland Apts — Bldg 2",
    resident: "Maintenance AI",
    direction: "Outgoing",
    dateTime: "2026-02-26 09:13",
    message: "Thanks — I've logged a work order. A technician will reach out within 24 hours.",
    description: "Plumbing — kitchen sink faucet leaking continuously. Resident reports drip began at ~03:00; replace cartridge or worn cartridge.",
    sessionId: "AS-2026022609-b181",
  },
  {
    woId: "WO-104902",
    woCreated: true,
    source: "Chat",
    property: "Westland Apts — Bldg 5",
    resident: "Sam Rivera",
    direction: "Incoming",
    dateTime: "2026-02-25 16:40",
    message: "AC not cooling below 78°.",
    description: "HVAC — AC unable to cool below 78°F. Possible refrigerant or filter issue; thermostat checked.",
    sessionId: "AS-2026022516-c204",
  },
  {
    woId: null,
    woCreated: false,
    source: "Chat",
    property: "Harvest Peak Heights",
    resident: "Ana Morales",
    direction: "Incoming",
    dateTime: "2026-02-25 11:08",
    message: "My garbage disposal isn't turning on.",
    description: "—",
    sessionId: "AS-2026022511-b203",
  },
  {
    woId: null,
    woCreated: false,
    source: "Chat",
    property: "Harvest Peak Heights",
    resident: "Maintenance AI",
    direction: "Outgoing",
    dateTime: "2026-02-25 11:09",
    message: "Try pressing the red reset button on the underside of the disposal, then flip the wall-switch. Most disposals trip after a jam.",
    description: "—",
    sessionId: "AS-2026022511-b203",
  },
  {
    woId: null,
    woCreated: false,
    source: "Chat",
    property: "Harvest Peak Heights",
    resident: "Ana Morales",
    direction: "Incoming",
    dateTime: "2026-02-25 11:14",
    message: "That worked, thank you!",
    description: "—",
    sessionId: "AS-2026022511-b203",
  },
];

// -----------------------------------------------------------------------------
// Atomic UI
// -----------------------------------------------------------------------------

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toLocaleString();
}

function formatCompactShort(n: number): string {
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
}

// -----------------------------------------------------------------------------
// Multi-select filter dropdown
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Skeleton — replaces inner content briefly when filters change
// -----------------------------------------------------------------------------

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

function LoadingBanner() {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground" />
      Refreshing data based on your filter selection…
    </div>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function MaintenanceAiDashboardPage() {
  const [filters, setFilters, scope] = useReportScope(PROPERTIES, MAINTENANCE_EXTRA_DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [sliceBy, setSliceBy] = useState<SliceDimension>("status");
  const filtersKey = useMemo(
    () => JSON.stringify(serializeFilters(filters)),
    [filters],
  );
  const isFirstRender = useRef(true);

  // Trigger a brief skeleton whenever the filter fingerprint changes (skip mount)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, [filtersKey]);

  const months = useMemo(() => {
    return monthsForPeriod(filters.periodId);
  }, [filters.periodId]);

  const metrics = useMemo(
    () => buildMetricsForPeriod(months, filters),
    [months, filters],
  );

  return (
    <div className="-mt-2">
      <ReportPageHeader
        agent="Maintenance AI"
        description="Work order volume, routing and resolution times, plus the requests ELI+ deflected"
      />

      <ReportFilterBar
        filters={filters}
        onChange={setFilters}
        properties={PROPERTIES}
        unmatchedProperties={scope.unmatched}
        extraFilters={MAINTENANCE_EXTRA_FILTERS}
      />

      {loading && <LoadingBanner />}

      {/* =========================================================== */}
      {/* Section 1 — Overall Work Order Performance                  */}
      {/* =========================================================== */}
      

      {/* =========================================================== */}
      {/* Section 2 — Maintenance AI Impact                           */}
      {/* =========================================================== */}
      <section className="mb-6">
        <SectionBanner
          title="Maintenance AI Impact"
          description="AI-specific metrics and value for properties using Maintenance AI"
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)]">
          <Card>
            <CardContent className="px-5 py-4">
              <p className="text-xxs font-semibold uppercase tracking-wider text-muted-foreground">
                Work Orders Resolved
              </p>
              <p className="mt-1 text-4xl font-bold tracking-tight text-foreground">
                {loading ? "…" : metrics.workOrdersResolved.toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Last 30 days · {metrics.withinSlaPct}% within SLA
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Total units using AI"
              value={loading ? "…" : metrics.totalUnitsUsingAi.toLocaleString()}
              delta={`+${metrics.unitsDeltaAbsolute.toLocaleString()}`}
              deltaTone="positive"
              sub="units on platform"
            />
            <StatCard
              label="Units AI usage rate"
              value={loading ? "…" : `${metrics.unitsAiUsageRate}%`}
              delta={`+${metrics.unitsAiUsageDelta} pts`}
              deltaTone="positive"
              sub="of total units"
            />
            <StatCard
              label="Maintenance AI submitted work orders"
              value={loading ? "…" : metrics.eliSubmittedWorkOrders.toLocaleString()}
              delta={`+${metrics.eliSubmittedDeltaPct}%`}
              deltaTone="positive"
              sub="AI-submitted WOs"
            />
            <StatCard
              label="Work orders deflected"
              value={loading ? "…" : `${metrics.workOrdersDeflectedPct}%`}
              delta={`+${metrics.workOrdersDeflectedDelta} pts`}
              deltaTone="positive"
              sub={`${metrics.workOrdersDeflected.toLocaleString()} deflected · self-service`}
            />
          </div>
        </div>

        <div className="mt-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Monthly Trends — Work Orders Submitted</CardTitle>
              <p className="text-xs text-muted-foreground">
                Baseline (pre-AI) vs Current — hover to compare values for the month.
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[240px] w-full" />
              ) : (
                <ChartContainer
                  config={{
                    baseline: { label: "Pre-AI baseline", color: "hsl(222 10% 78%)" },
                    current: { label: "Current", color: seriesColor(0) },
                  }}
                  className="!aspect-auto h-[240px] w-full"
                >
                  <LineChart
                    data={metrics.monthlyAiWoSubmitted}
                    margin={{ left: 8, right: 12, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={36}
                      domain={[0, 600]}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="baseline"
                      stroke={"hsl(222 12% 62%)"}
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="current"
                      stroke={seriesColor(0)}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Open work orders"
            value={loading ? "…" : metrics.aiOriginOpen.toLocaleString()}
            sub="AI origin · selected period"
          />
          <StatCard
            label="Completed work orders"
            value={loading ? "…" : metrics.aiOriginCompleted.toLocaleString()}
            sub="AI origin · selected period"
          />
          <StatCard
            label="Cancelled work orders"
            value={loading ? "…" : metrics.aiOriginCancelled.toLocaleString()}
            sub="AI origin · selected period"
          />
          <StatCard
            label="Avg days to complete"
            value={loading ? "…" : `${metrics.aiOriginAvgDays}`}
            sub="Maintenance AI origin"
          />
          <StatCard
            label="Total work orders"
            value={loading ? "…" : metrics.aiOriginTotal.toLocaleString()}
            sub="Maintenance AI origin"
          />
        </div>

        <div className="mt-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Work Order Status Distribution</CardTitle>
              <p className="text-xs text-muted-foreground">
                AI-origin work orders broken out by workflow status. Slice the pie by priority or source using the controls on the right.
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <DistributionPanel
                  statusData={metrics.aiStatusDistribution}
                  priorityData={metrics.priorityDistribution}
                  sourceData={metrics.componentDistribution}
                  sliceBy={sliceBy}
                  setSliceBy={setSliceBy}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Maintenance AI Work Order Detail</CardTitle>
              <p className="text-xs text-muted-foreground">
                Maintenance AI–originated work orders. Filter by priority and status; sort by clicking column headers.
              </p>
            </CardHeader>
            <CardContent>
              <EliWorkOrderTable rows={WORK_ORDER_ROWS} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* =========================================================== */}
      {/* Section 2b — Escalations                                    */}
      {/* =========================================================== */}
      <EscalationsSection
        stats={[
          {
            label: "Escalation rate",
            value: loading ? "…" : metrics.escalationRate,
            sub: "of AI-originated work orders escalated",
          },
          {
            label: "Total escalations",
            value: loading ? "…" : metrics.totalEscalations,
            sub: "escalated to staff",
          },
          {
            label: "Open escalations",
            value: loading ? "…" : metrics.openEscalations,
            sub: "pending resolution",
          },
          {
            label: "Resolved",
            value: loading ? "…" : metrics.resolvedEscalations,
            sub: "resolved by staff",
          },
        ]}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Escalation Reasons</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <ChartContainer config={{}} className="!aspect-auto h-[260px] w-full">
                  <BarChart data={metrics.escalationReasons} margin={{ left: 8, right: 12, top: 8, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                    <XAxis dataKey="reason" tickLine={false} axisLine={false} tickMargin={8} angle={-30} textAnchor="end" height={50} interval={0} fontSize={10} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Avg Escalation Resolution Time — Trend</CardTitle>
              <p className="text-xs text-muted-foreground">Days from escalation created to resolved</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[240px] w-full" />
              ) : (
                <ChartContainer config={{}} className="!aspect-auto h-[240px] w-full">
                  <LineChart data={metrics.escalationResolutionTrend} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="days" stroke={seriesColor(0)} strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </EscalationsSection>

      {/* =========================================================== */}
      {/* Section 3 — Conversational Messaging Analysis               */}
      {/* =========================================================== */}
      <section className="mb-6">
        <SectionBanner
          title="Conversational Messaging Analysis & Trends"
          description="Resident interaction volume, AI message handling, and per-day traffic"
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)]">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Work Orders Created by SMS, Chat, and Voice</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <AiComponentDonut data={metrics.woByAiComponent} />
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label="Messages received (SMS + Chat)"
              value={loading ? "…" : metrics.totalMessagesReceived.toLocaleString()}
              sub={`${metrics.smsReceived.toLocaleString()} SMS · ${metrics.chatReceived.toLocaleString()} Chat`}
            />
            <StatCard
              label="Messages sent (Maintenance AI)"
              value={loading ? "…" : metrics.totalMessagesSent.toLocaleString()}
              sub="AI-authored outbound replies"
            />
            <StatCard
              label="Received → sent ratio"
              value={loading ? "…" : metrics.receivedToSentRatio}
              sub="messages received per AI reply"
            />
          </div>
        </div>

        <div className="mt-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Conversation Analysis</CardTitle>
              <p className="text-xs text-muted-foreground">
                Per-turn detail with source, direction, AI-generated description (when a work order was created), and the analysis session id that ties multi-turn conversations together.
              </p>
            </CardHeader>
            <CardContent>
              <ConversationAnalysisTable rows={MESSAGE_LOG_ROWS} />
            </CardContent>
          </Card>
        </div>

        <div className="mt-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {metrics.incomingGranularity === "day"
                  ? "Incoming Messages per Day"
                  : metrics.incomingGranularity === "week"
                    ? "Incoming Messages per Week"
                    : "Incoming Messages per Month"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <ChartContainer
                  config={{ count: { label: "Incoming messages", color: seriesColor(0) } }}
                  className="!aspect-auto h-[200px] w-full"
                >
                  <LineChart
                    data={metrics.incomingPerDay}
                    margin={{ left: 8, right: 12, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={36}
                      domain={[0, "auto"]}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke={seriesColor(0)}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mb-6">
        <SectionBanner
          title="Overall Work Order Performance"
          description="Key work order metrics across all submission sources"
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)]">
          {/* Left: KPI stack */}
          <div className="grid gap-3">
            <StatCard
              label="Open Work Orders"
              value={loading ? "…" : formatCompact(metrics.openWorkOrders)}
              sub="opened during selected period"
            />
            <StatCard
              label="Overdue Open Work Orders"
              value={loading ? "…" : formatCompact(metrics.overdueWorkOrders)}
              sub="past target completion date"
              deltaTone="negative"
            />
            <StatCard
              label="Unassigned Open Work Orders"
              value={loading ? "…" : formatCompact(metrics.unassignedWorkOrders)}
              sub="open without an assigned tech"
            />
          </div>

          {/* Right: priority counter + stacked bar */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Work Order Status Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <PriorityCounter
                counts={metrics.priorityCounts}
                loading={loading}
              />
              <div className="mt-4">
                {loading ? (
                  <Skeleton className="h-[260px] w-full" />
                ) : (
                  <ChartContainer
                    config={{
                      Completed: { label: "Completed", color: STATUS_FILL.completed },
                      Open: { label: "Open", color: STATUS_FILL.open },
                      Overdue: { label: "Overdue", color: STATUS_FILL.overdue },
                      Submitted: { label: "Submitted", color: STATUS_FILL.inProgress },
                      Unassigned: { label: "Unassigned", color: STATUS_FILL.unassigned },
                    }}
                    className="!aspect-auto h-[260px] w-full"
                  >
                    <BarChart
                      data={metrics.statusByMonth}
                      margin={{ left: 8, right: 12, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={56}
                        tickFormatter={(v: number) => formatCompactShort(v)}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="Completed" stackId="a" fill={STATUS_FILL.completed} />
                      <Bar dataKey="Open" stackId="a" fill={STATUS_FILL.open} />
                      <Bar dataKey="Overdue" stackId="a" fill={STATUS_FILL.overdue} />
                      <Bar dataKey="Submitted" stackId="a" fill={STATUS_FILL.inProgress} />
                      <Bar dataKey="Unassigned" stackId="a" fill={STATUS_FILL.unassigned} />
                      <Legend
                        verticalAlign="bottom"
                        iconType="square"
                        wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
            formatter={legendLabel}
          />
                    </BarChart>
                  </ChartContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Work Orders by Source</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <SourceDonut data={metrics.bySource} />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Average Days to Complete by Source</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <AvgDaysBySource data={metrics.avgDaysBySource} />
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Section 1 sub-components
// -----------------------------------------------------------------------------

const PRIORITY_ORDER: Priority[] = ["Emergency", "High", "Medium", "Low", "Preventative"];

function PriorityCounter({
  counts,
  loading,
}: {
  counts: Record<Priority, number>;
  loading: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="grid grid-cols-[140px_repeat(5,minmax(0,1fr))] bg-slate-900 text-white text-xs">
        <div className="px-3 py-2 font-medium">Open Work Order Priority</div>
        {PRIORITY_ORDER.map((p) => (
          <div
            key={p}
            className="px-2 py-2 text-center font-medium uppercase tracking-wide"
            style={{ backgroundColor: PRIORITY_COLOR[p] }}
          >
            {p}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[140px_repeat(5,minmax(0,1fr))] bg-slate-700 text-white text-xs">
        <div className="px-3 py-2 font-medium"># Work Orders</div>
        {PRIORITY_ORDER.map((p) => (
          <div key={p} className="px-2 py-2 text-center font-semibold tabular-nums">
            {loading ? "…" : counts[p].toLocaleString()}
          </div>
        ))}
      </div>
    </div>
  );
}

function SourceDonut({
  data,
}: {
  data: { name: WorkOrderSource; value: number; count: number }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="h-[200px] w-[200px] shrink-0">
        <ChartContainer config={{}} className="!aspect-auto h-full w-full">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={1}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={SOURCE_COLORS[d.name]} />
              ))}
            </Pie>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                    const count =
                      (item?.payload as { count?: number } | undefined)?.count ?? 0;
                    return (
                      <div className="flex items-center justify-between gap-4">
                        <span>{String(name)}</span>
                        <span className="font-mono tabular-nums">
                          {value}% · {count.toLocaleString()}
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
          </PieChart>
        </ChartContainer>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-3 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: SOURCE_COLORS[d.name] }}
            />
            <span className="flex-1 text-foreground">{d.name}</span>
            <span className="font-semibold text-foreground tabular-nums">
              {d.value}%
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

function AvgDaysBySource({
  data,
}: {
  data: { source: WorkOrderSource; days: number }[];
}) {
  return (
    <ChartContainer config={{}} className="!aspect-auto h-[260px] w-full">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 8, right: 32, top: 8, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_STROKE} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(v) => `${v}d`}
          domain={[0, "auto"]}
        />
        <YAxis
          type="category"
          dataKey="source"
          tickLine={false}
          axisLine={false}
          width={140}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => (
                <span className="font-mono tabular-nums">{value}d</span>
              )}
            />
          }
        />
        <Bar dataKey="days" radius={[0, 4, 4, 0]}>
          {data.map((d) => (
            <Cell key={d.source} fill={SOURCE_COLORS[d.source]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// -----------------------------------------------------------------------------
// Section 2 sub-components
// -----------------------------------------------------------------------------

const SLICE_OPTIONS: { id: SliceDimension; label: string }[] = [
  { id: "status", label: "Status" },
  { id: "priority", label: "Priority" },
  { id: "source", label: "Source" },
];

function DistributionPanel({
  statusData,
  priorityData,
  sourceData,
  sliceBy,
  setSliceBy,
}: {
  statusData: { name: string; value: number; color: string }[];
  priorityData: { name: string; value: number; color: string }[];
  sourceData: { name: string; value: number; color: string }[];
  sliceBy: SliceDimension;
  setSliceBy: (s: SliceDimension) => void;
}) {
  const active =
    sliceBy === "priority"
      ? priorityData
      : sliceBy === "source"
        ? sourceData
        : statusData;
  const total = active.reduce((s, d) => s + d.value, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_180px]">
      <div className="flex flex-col items-center justify-center gap-3 py-2">
        <div className="h-[260px] w-full max-w-[320px]">
          <ChartContainer config={{}} className="!aspect-auto h-full w-full">
            <PieChart>
              <Pie
                data={active}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={108}
                paddingAngle={1}
              >
                {active.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      const pct =
                        total > 0
                          ? Math.round((Number(value) / total) * 100)
                          : 0;
                      return (
                        <div className="flex items-center justify-between gap-4">
                          <span>{String(name)}</span>
                          <span className="font-mono tabular-nums">
                            {Number(value).toLocaleString()} · {pct}%
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
            </PieChart>
          </ChartContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs">
          {active.map((d) => (
            <span key={d.name} className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-foreground">{d.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {d.value.toLocaleString()}
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 border-l border-border/60 pl-5">
        <p className="mb-1 text-xxs font-semibold uppercase tracking-wider text-muted-foreground">
          Slice by
        </p>
        {SLICE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSliceBy(opt.id)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-left text-sm transition-colors",
              sliceBy === opt.id
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-foreground hover:bg-muted/60",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function EliWorkOrderTable({ rows }: { rows: WorkOrderRow[] }) {
  const [priorityFilter, setPriorityFilter] = useState<Set<Priority>>(
    new Set(PRIORITY_ORDER),
  );
  const STATUSES_IN_TABLE = useMemo(
    () => Array.from(new Set(rows.map((r) => r.status))) as WorkOrderStatus[],
    [rows],
  );
  const [statusFilter, setStatusFilter] = useState<Set<WorkOrderStatus>>(
    new Set(STATUSES_IN_TABLE),
  );
  const [sortKey, setSortKey] = useState<keyof WorkOrderRow>("dateTime");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const filtered = useMemo(() => {
    const arr = rows
      .filter((r) => priorityFilter.has(r.priority))
      .filter((r) => statusFilter.has(r.status));
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === bv) return 0;
      return (av > bv ? 1 : -1) * (sortDir === "asc" ? 1 : -1);
    });
    return arr;
  }, [rows, priorityFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function toggleSort(key: keyof WorkOrderRow) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function togglePriority(p: Priority) {
    const next = new Set(priorityFilter);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setPriorityFilter(next);
    setPage(1);
  }
  function toggleStatus(s: WorkOrderStatus) {
    const next = new Set(statusFilter);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setStatusFilter(next);
    setPage(1);
  }

  /**
   * Fourteen columns at a hard 1200px minimum made this table scroll
   * horizontally at every width we support, including 1440 — the triage
   * columns (priority, status, who) sat off-screen behind a scrollbar.
   *
   * `hide` drops the descriptive columns first as width tightens; the
   * identity + triage columns are always present. Detail that leaves the
   * table is still reachable by opening the work order.
   */
  const COLS: { key: keyof WorkOrderRow; label: string; hide?: string }[] = [
    { key: "id", label: "Work Order ID" },
    { key: "source", label: "Source", hide: "hidden lg:table-cell" },
    { key: "property", label: "Property" },
    { key: "unit", label: "Unit" },
    { key: "resident", label: "Resident Name", hide: "hidden lg:table-cell" },
    { key: "priority", label: "Priority" },
    { key: "category", label: "Category", hide: "hidden xl:table-cell" },
    { key: "problem", label: "Problem", hide: "hidden 2xl:table-cell" },
    { key: "location", label: "Location", hide: "hidden 2xl:table-cell" },
    { key: "description", label: "Description", hide: "hidden 2xl:table-cell" },
    { key: "dateTime", label: "Date and Time" },
    { key: "status", label: "Status" },
    { key: "assignedTo", label: "Assigned To", hide: "hidden lg:table-cell" },
    { key: "assignedOn", label: "Assigned On", hide: "hidden 2xl:table-cell" },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start gap-4">
        <div className="min-w-[12rem]">
          <p className="mb-1.5 text-xxs font-semibold uppercase tracking-wider text-muted-foreground">
            Priority filter
          </p>
          <div className="flex flex-col gap-1">
            {PRIORITY_ORDER.map((p) => (
              <label
                key={p}
                className="inline-flex items-center gap-2 text-xs"
              >
                <input
                  type="checkbox"
                  checked={priorityFilter.has(p)}
                  onChange={() => togglePriority(p)}
                  className="h-3.5 w-3.5 rounded border-border"
                />
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xxs font-medium ring-1 ring-inset",
                    PRIORITY_BADGE[p],
                  )}
                >
                  {p}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="min-w-[12rem]">
          <p className="mb-1.5 text-xxs font-semibold uppercase tracking-wider text-muted-foreground">
            Status filter
          </p>
          <div className="flex flex-col gap-1">
            {STATUSES_IN_TABLE.map((s) => (
              <label
                key={s}
                className="inline-flex items-center gap-2 text-xs"
              >
                <input
                  type="checkbox"
                  checked={statusFilter.has(s)}
                  onChange={() => toggleStatus(s)}
                  className="h-3.5 w-3.5 rounded border-border"
                />
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xxs font-medium ring-1 ring-inset",
                    STATUS_BADGE[s],
                  )}
                >
                  {s}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[720px] text-xs">
          <thead className="bg-muted/40">
            <tr>
              {COLS.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "cursor-pointer whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground hover:bg-muted/60",
                    col.hide,
                  )}
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      <span aria-hidden>{sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id} className="border-t border-border/60 align-top">
                <td className="px-3 py-2 font-mono text-foreground">{r.id}</td>
                <td className="hidden px-3 py-2 lg:table-cell">{r.source}</td>
                <td className="px-3 py-2 text-foreground">{r.property}</td>
                <td className="px-3 py-2">{r.unit}</td>
                <td className="hidden px-3 py-2 lg:table-cell">{r.resident}</td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xxs font-medium ring-1 ring-inset",
                      PRIORITY_BADGE[r.priority],
                    )}
                  >
                    {r.priority}
                  </span>
                </td>
                <td className="hidden px-3 py-2 xl:table-cell">{r.category}</td>
                <td className="hidden px-3 py-2 2xl:table-cell">{r.problem}</td>
                <td className="hidden px-3 py-2 2xl:table-cell">{r.location}</td>
                <td className="hidden max-w-[20rem] px-3 py-2 text-muted-foreground 2xl:table-cell">
                  {r.description}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{r.dateTime}</td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xxs font-medium ring-1 ring-inset",
                      STATUS_BADGE[r.status],
                    )}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="hidden px-3 py-2 lg:table-cell">{r.assignedTo}</td>
                <td className="hidden whitespace-nowrap px-3 py-2 text-muted-foreground 2xl:table-cell">
                  {r.assignedOn}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={COLS.length}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  No work orders match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {Math.min(filtered.length, (safePage - 1) * PAGE_SIZE + 1)}–
          {Math.min(filtered.length, safePage * PAGE_SIZE)} of {filtered.length}
        </span>
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
            className="rounded-md border border-border bg-background px-2 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
            className="rounded-md border border-border bg-background px-2 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Section 3 sub-components
// -----------------------------------------------------------------------------

function AiComponentDonut({ data }: { data: { source: EliSource; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="h-[180px] w-[180px] shrink-0">
        <ChartContainer config={{}} className="!aspect-auto h-full w-full">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="source"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={1}
            >
              {data.map((d) => (
                <Cell key={d.source} fill={AI_COMPONENT_COLORS[d.source]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {data.map((d) => {
          const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : "0.0";
          return (
            <div key={d.source} className="flex items-baseline gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: AI_COMPONENT_COLORS[d.source] }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Created via {d.source}</p>
                <p className="text-base font-bold text-foreground">
                  {d.count.toLocaleString()}{" "}
                  <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConversationAnalysisTable({ rows }: { rows: MessageLogRow[] }) {
  /**
   * Column visibility is declared once and consumed by both the header and the
   * body, so the two cannot drift out of alignment. Identity, outcome and the
   * message itself are always present; supporting detail drops first as width
   * tightens rather than pushing every column behind a horizontal scrollbar.
   */
  const COLS: {
    label: string;
    hide?: string;
    className?: string;
    cell: (r: MessageLogRow) => React.ReactNode;
  }[] = [
    {
      label: "Work Order ID",
      className: "font-mono text-foreground",
      cell: (r) => r.woId ?? "\u2014",
    },
    {
      label: "Work Order Created",
      cell: (r) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xxs font-medium ring-1 ring-inset",
            r.woCreated ? URGENCY_BADGE.settled : URGENCY_BADGE.muted,
          )}
        >
          {r.woCreated ? "Yes" : "No"}
        </span>
      ),
    },
    { label: "Source", hide: "hidden lg:table-cell", cell: (r) => r.source },
    { label: "Property", className: "text-foreground", cell: (r) => r.property },
    { label: "Resident", hide: "hidden lg:table-cell", cell: (r) => r.resident },
    { label: "Direction", cell: (r) => r.direction },
    {
      label: "Date and Time",
      className: "whitespace-nowrap text-muted-foreground",
      cell: (r) => r.dateTime,
    },
    {
      label: "Message",
      className: "max-w-[20rem] text-foreground",
      cell: (r) => r.message,
    },
    {
      label: "Description",
      hide: "hidden 2xl:table-cell",
      className: "max-w-[20rem] text-muted-foreground",
      cell: (r) => r.description,
    },
    {
      label: "Analysis Session ID",
      hide: "hidden 2xl:table-cell",
      className: "whitespace-nowrap font-mono text-muted-foreground",
      cell: (r) => r.sessionId,
    },
  ];

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[720px] text-xs">
        <thead className="bg-muted/40">
          <tr>
            {COLS.map((c) => (
              <th
                key={c.label}
                className={cn(
                  "whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground",
                  c.hide,
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.sessionId}-${i}`} className="border-t border-border/60 align-top">
              {COLS.map((c) => (
                <td key={c.label} className={cn("px-3 py-2", c.hide, c.className)}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
