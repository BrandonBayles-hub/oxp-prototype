"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  FileSignature,
  Gauge,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Settings,
  Target,
  Users,
  Wrench,
  X,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useEscalations } from "@/lib/escalations-context";
import { useAgents } from "@/lib/agents-context";
import { useWorkflows } from "@/lib/workflows-context";
import { useWorkforce } from "@/lib/workforce-context";
import { useRole, isPropertyInScope } from "@/lib/role-context";
import { EscalationDetailSheet } from "@/components/escalation-detail-sheet";
import { ConversationDetailSheet } from "@/components/conversation-detail-sheet";
import { LIVE_CONVERSATIONS } from "@/lib/live-conversations-data";
import { ValueYoureMissingBanner } from "@/components/value-youre-missing-banner";
import { cn } from "@/lib/utils";
import { ContractGate } from "@/components/contract-overlay";
import { useContract } from "@/lib/contract-context";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ═══════════════════════════════════════════════════════════════════════
   Mock chart data for metric detail modals
   ═══════════════════════════════════════════════════════════════════════ */

const REVENUE_TREND = [
  { week: "Week 1", revenue: 12000 }, { week: "Week 2", revenue: 18500 },
  { week: "Week 3", revenue: 24000 }, { week: "Week 4", revenue: 28000 },
  { week: "Week 5", revenue: 31500 }, { week: "Week 6", revenue: 36000 },
  { week: "Week 7", revenue: 38500 }, { week: "Week 8", revenue: 42000 },
];

const HOURS_SAVED_BREAKDOWN = [
  { category: "Conversations", hours: 142 },
  { category: "Rent Collection", hours: 68 },
  { category: "Tours Scheduled", hours: 54 },
  { category: "Leases Signed", hours: 48 },
  { category: "Renewals", hours: 42 },
  { category: "Other", hours: 32 },
];

const TOURS_TREND = [
  { week: "W1", value: 72 }, { week: "W2", value: 81 }, { week: "W3", value: 88 },
  { week: "W4", value: 95 }, { week: "W5", value: 102 }, { week: "W6", value: 108 },
  { week: "W7", value: 116 }, { week: "W8", value: 124 },
];
const LEASES_TREND = [
  { week: "W1", value: 18 }, { week: "W2", value: 21 }, { week: "W3", value: 24 },
  { week: "W4", value: 26 }, { week: "W5", value: 29 }, { week: "W6", value: 31 },
  { week: "W7", value: 34 }, { week: "W8", value: 37 },
];
const RENEWALS_TREND = [
  { week: "W1", value: 12 }, { week: "W2", value: 15 }, { week: "W3", value: 17 },
  { week: "W4", value: 19 }, { week: "W5", value: 22 }, { week: "W6", value: 24 },
  { week: "W7", value: 26 }, { week: "W8", value: 28 },
];
const RENT_TREND = [
  { week: "W1", value: 164000 }, { week: "W2", value: 172000 }, { week: "W3", value: 181000 },
  { week: "W4", value: 189000 }, { week: "W5", value: 198000 }, { week: "W6", value: 205000 },
  { week: "W7", value: 212000 }, { week: "W8", value: 218000 },
];
const CONVERSATIONS_TREND = [
  { week: "W1", value: 1120 }, { week: "W2", value: 1240 }, { week: "W3", value: 1380 },
  { week: "W4", value: 1450 }, { week: "W5", value: 1560 }, { week: "W6", value: 1640 },
  { week: "W7", value: 1730 }, { week: "W8", value: 1847 },
];

/* ── Per-property data for metric detail dialogs ── */

const PROPERTIES_LIST = ["Property A", "Property B", "Property C"] as const;
type PropertyKey = "all" | (typeof PROPERTIES_LIST)[number];

const REVENUE_BY_PROPERTY: Record<PropertyKey, {
  total: string; totalRaw: number; avgPerAgent: string; perConversation: string; perConversationTrend: string;
  projected: string; trend: { week: string; revenue: number }[];
  agents: { name: string; amount: string; pct: string; detail: string; trend: string }[];
}> = {
  all: {
    total: "$42K", totalRaw: 42000, avgPerAgent: "$10.5K", perConversation: "$22.74", perConversationTrend: "+$3.20 from last month",
    projected: "$84K",
    trend: REVENUE_TREND,
    agents: [
      { name: "Leasing AI", amount: "$18.4K", pct: "44%", detail: "37 leases × $497 avg commission", trend: "+12%" },
      { name: "Payments AI", amount: "$12.2K", pct: "29%", detail: "$218K collected, recovered $12.2K in late fees", trend: "+6%" },
      { name: "Renewal AI", amount: "$8.1K", pct: "19%", detail: "28 renewals with avg $289 rent increase", trend: "+15%" },
      { name: "Compliance Agent", amount: "$3.3K", pct: "8%", detail: "3 HUD claims identified, $14.2K recoverable", trend: "+22%" },
    ],
  },
  "Property A": {
    total: "$18.6K", totalRaw: 18600, avgPerAgent: "$4.7K", perConversation: "$26.12", perConversationTrend: "+$4.10 from last month",
    projected: "$37.2K",
    trend: REVENUE_TREND.map((d) => ({ week: d.week, revenue: Math.round(d.revenue * 0.44) })),
    agents: [
      { name: "Leasing AI", amount: "$8.2K", pct: "44%", detail: "16 leases × $513 avg commission", trend: "+14%" },
      { name: "Payments AI", amount: "$5.4K", pct: "29%", detail: "$92K collected, recovered $5.4K in late fees", trend: "+8%" },
      { name: "Renewal AI", amount: "$3.5K", pct: "19%", detail: "12 renewals with avg $292 rent increase", trend: "+18%" },
      { name: "Compliance Agent", amount: "$1.5K", pct: "8%", detail: "1 HUD claim identified, $6.2K recoverable", trend: "+20%" },
    ],
  },
  "Property B": {
    total: "$14.2K", totalRaw: 14200, avgPerAgent: "$3.6K", perConversation: "$21.30", perConversationTrend: "+$2.80 from last month",
    projected: "$28.4K",
    trend: REVENUE_TREND.map((d) => ({ week: d.week, revenue: Math.round(d.revenue * 0.34) })),
    agents: [
      { name: "Leasing AI", amount: "$6.1K", pct: "43%", detail: "12 leases × $508 avg commission", trend: "+10%" },
      { name: "Payments AI", amount: "$4.2K", pct: "30%", detail: "$74K collected, recovered $4.2K in late fees", trend: "+5%" },
      { name: "Renewal AI", amount: "$2.8K", pct: "20%", detail: "9 renewals with avg $311 rent increase", trend: "+12%" },
      { name: "Compliance Agent", amount: "$1.1K", pct: "8%", detail: "1 HUD claim identified, $4.8K recoverable", trend: "+24%" },
    ],
  },
  "Property C": {
    total: "$9.2K", totalRaw: 9200, avgPerAgent: "$2.3K", perConversation: "$19.80", perConversationTrend: "+$2.40 from last month",
    projected: "$18.4K",
    trend: REVENUE_TREND.map((d) => ({ week: d.week, revenue: Math.round(d.revenue * 0.22) })),
    agents: [
      { name: "Leasing AI", amount: "$4.1K", pct: "45%", detail: "9 leases × $456 avg commission", trend: "+9%" },
      { name: "Payments AI", amount: "$2.6K", pct: "28%", detail: "$52K collected, recovered $2.6K in late fees", trend: "+4%" },
      { name: "Renewal AI", amount: "$1.8K", pct: "20%", detail: "7 renewals with avg $257 rent increase", trend: "+13%" },
      { name: "Compliance Agent", amount: "$0.7K", pct: "8%", detail: "1 HUD claim identified, $3.2K recoverable", trend: "+21%" },
    ],
  },
};

const HOURS_BY_PROPERTY: Record<PropertyKey, {
  total: string; totalNum: number; fte: string; costSavings: string; projectedMonthly: string; projectedSavings: string;
  breakdown: { category: string; hours: number }[];
  table: { task: string; volume: string; time: string; agent: string; hours: string }[];
  trend: { week: string; value: number }[];
}> = {
  all: {
    total: "386 hrs", totalNum: 386, fte: "9.7 FTE", costSavings: "$11.6K", projectedMonthly: "772 hrs", projectedSavings: "$23.2K",
    breakdown: HOURS_SAVED_BREAKDOWN,
    table: [
      { task: "Conversations handled", volume: "1,847", time: "~4.6 min each", agent: "Leasing, Payments, Renewal AI", hours: "142 hrs" },
      { task: "Rent collection follow-ups", volume: "412 accounts", time: "~10 min each", agent: "Payments AI", hours: "68 hrs" },
      { task: "Tours scheduled", volume: "124 tours", time: "~26 min each", agent: "Leasing AI", hours: "54 hrs" },
      { task: "Leases processed & signed", volume: "37 leases", time: "~78 min each", agent: "Leasing AI", hours: "48 hrs" },
      { task: "Renewals generated & sent", volume: "28 renewals", time: "~90 min each", agent: "Renewal AI", hours: "42 hrs" },
      { task: "Other automated tasks", volume: "Various", time: "—", agent: "All agents", hours: "32 hrs" },
    ],
    trend: [
      { week: "W1", value: 210 }, { week: "W2", value: 238 }, { week: "W3", value: 265 },
      { week: "W4", value: 292 }, { week: "W5", value: 318 }, { week: "W6", value: 342 },
      { week: "W7", value: 364 }, { week: "W8", value: 386 },
    ],
  },
  "Property A": {
    total: "168 hrs", totalNum: 168, fte: "4.2 FTE", costSavings: "$5.0K", projectedMonthly: "336 hrs", projectedSavings: "$10.1K",
    breakdown: [
      { category: "Conversations", hours: 62 }, { category: "Rent Collection", hours: 30 },
      { category: "Tours Scheduled", hours: 25 }, { category: "Leases Signed", hours: 22 },
      { category: "Renewals", hours: 18 }, { category: "Other", hours: 11 },
    ],
    table: [
      { task: "Conversations handled", volume: "784", time: "~4.7 min each", agent: "Leasing, Payments, Renewal AI", hours: "62 hrs" },
      { task: "Rent collection follow-ups", volume: "178", time: "~10 min each", agent: "Payments AI", hours: "30 hrs" },
      { task: "Tours scheduled", volume: "52", time: "~29 min each", agent: "Leasing AI", hours: "25 hrs" },
      { task: "Leases processed & signed", volume: "16", time: "~82 min each", agent: "Leasing AI", hours: "22 hrs" },
      { task: "Renewals generated & sent", volume: "12", time: "~90 min each", agent: "Renewal AI", hours: "18 hrs" },
      { task: "Other automated tasks", volume: "Various", time: "—", agent: "All agents", hours: "11 hrs" },
    ],
    trend: [
      { week: "W1", value: 92 }, { week: "W2", value: 104 }, { week: "W3", value: 115 },
      { week: "W4", value: 127 }, { week: "W5", value: 138 }, { week: "W6", value: 149 },
      { week: "W7", value: 158 }, { week: "W8", value: 168 },
    ],
  },
  "Property B": {
    total: "132 hrs", totalNum: 132, fte: "3.3 FTE", costSavings: "$4.0K", projectedMonthly: "264 hrs", projectedSavings: "$7.9K",
    breakdown: [
      { category: "Conversations", hours: 48 }, { category: "Rent Collection", hours: 24 },
      { category: "Tours Scheduled", hours: 18 }, { category: "Leases Signed", hours: 16 },
      { category: "Renewals", hours: 14 }, { category: "Other", hours: 12 },
    ],
    table: [
      { task: "Conversations handled", volume: "628", time: "~4.6 min each", agent: "Leasing, Payments, Renewal AI", hours: "48 hrs" },
      { task: "Rent collection follow-ups", volume: "142", time: "~10 min each", agent: "Payments AI", hours: "24 hrs" },
      { task: "Tours scheduled", volume: "41", time: "~26 min each", agent: "Leasing AI", hours: "18 hrs" },
      { task: "Leases processed & signed", volume: "12", time: "~80 min each", agent: "Leasing AI", hours: "16 hrs" },
      { task: "Renewals generated & sent", volume: "9", time: "~93 min each", agent: "Renewal AI", hours: "14 hrs" },
      { task: "Other automated tasks", volume: "Various", time: "—", agent: "All agents", hours: "12 hrs" },
    ],
    trend: [
      { week: "W1", value: 72 }, { week: "W2", value: 82 }, { week: "W3", value: 91 },
      { week: "W4", value: 100 }, { week: "W5", value: 109 }, { week: "W6", value: 117 },
      { week: "W7", value: 125 }, { week: "W8", value: 132 },
    ],
  },
  "Property C": {
    total: "86 hrs", totalNum: 86, fte: "2.2 FTE", costSavings: "$2.6K", projectedMonthly: "172 hrs", projectedSavings: "$5.2K",
    breakdown: [
      { category: "Conversations", hours: 32 }, { category: "Rent Collection", hours: 14 },
      { category: "Tours Scheduled", hours: 11 }, { category: "Leases Signed", hours: 10 },
      { category: "Renewals", hours: 10 }, { category: "Other", hours: 9 },
    ],
    table: [
      { task: "Conversations handled", volume: "435", time: "~4.4 min each", agent: "Leasing, Payments, Renewal AI", hours: "32 hrs" },
      { task: "Rent collection follow-ups", volume: "92", time: "~9 min each", agent: "Payments AI", hours: "14 hrs" },
      { task: "Tours scheduled", volume: "31", time: "~21 min each", agent: "Leasing AI", hours: "11 hrs" },
      { task: "Leases processed & signed", volume: "9", time: "~67 min each", agent: "Leasing AI", hours: "10 hrs" },
      { task: "Renewals generated & sent", volume: "7", time: "~86 min each", agent: "Renewal AI", hours: "10 hrs" },
      { task: "Other automated tasks", volume: "Various", time: "—", agent: "All agents", hours: "9 hrs" },
    ],
    trend: [
      { week: "W1", value: 46 }, { week: "W2", value: 52 }, { week: "W3", value: 59 },
      { week: "W4", value: 65 }, { week: "W5", value: 71 }, { week: "W6", value: 76 },
      { week: "W7", value: 81 }, { week: "W8", value: 86 },
    ],
  },
};

/* ── Per-property data for outcome metric dialogs ── */

type ToursPropertyData = {
  total: number; trendText: string; trendVariant: "positive" | "negative"; showRate: string; showRateTrend: string; showRateVariant: "positive" | "negative";
  tourToLease: string; tourToLeaseTrend: string; tourToLeaseVariant: "positive" | "negative"; avgBooking: string;
  trend: { week: string; value: number }[];
  alert: { title: string; body: string } | null;
};

const TOURS_BY_PROPERTY: Record<PropertyKey, ToursPropertyData> = {
  all: {
    total: 124, trendText: "−6 from last week", trendVariant: "negative", showRate: "78%", showRateTrend: "+5% from last month", showRateVariant: "positive",
    tourToLease: "34%", tourToLeaseTrend: "+3% from last month", tourToLeaseVariant: "positive", avgBooking: "2.3 min",
    trend: TOURS_TREND,
    alert: { title: "Tours are down 6 from last week", body: "Lead response times have increased at Property C. Review the Leasing AI response settings and ensure lead sources are connected and routing correctly." },
  },
  "Property A": {
    total: 52, trendText: "+2 from last week", trendVariant: "positive", showRate: "82%", showRateTrend: "+6% from last month", showRateVariant: "positive",
    tourToLease: "38%", tourToLeaseTrend: "+4% from last month", tourToLeaseVariant: "positive", avgBooking: "2.1 min",
    trend: TOURS_TREND.map((d) => ({ week: d.week, value: Math.round(d.value * 0.42) })),
    alert: null,
  },
  "Property B": {
    total: 41, trendText: "Flat from last week", trendVariant: "positive", showRate: "76%", showRateTrend: "+4% from last month", showRateVariant: "positive",
    tourToLease: "32%", tourToLeaseTrend: "+2% from last month", tourToLeaseVariant: "positive", avgBooking: "2.4 min",
    trend: TOURS_TREND.map((d) => ({ week: d.week, value: Math.round(d.value * 0.33) })),
    alert: null,
  },
  "Property C": {
    total: 31, trendText: "−8 from last week", trendVariant: "negative", showRate: "74%", showRateTrend: "−2% from last month", showRateVariant: "negative",
    tourToLease: "29%", tourToLeaseTrend: "−1% from last month", tourToLeaseVariant: "negative", avgBooking: "2.6 min",
    trend: TOURS_TREND.map((d) => ({ week: d.week, value: Math.round(d.value * 0.25) })),
    alert: { title: "Tours are down 8 from last week at Property C", body: "Lead response times have increased significantly. Review the Leasing AI response settings and ensure lead sources are connected and routing correctly." },
  },
};

type LeasesPropertyData = {
  total: number; trendText: string; trendVariant: "positive" | "negative"; avgTime: string; avgTimeTrend: string;
  revenue: string; avgCommission: string; leadToLease: string; leadToLeaseTrend: string; leadToLeaseVariant: "positive" | "negative";
  trend: { week: string; value: number }[];
};

const LEASES_BY_PROPERTY: Record<PropertyKey, LeasesPropertyData> = {
  all: {
    total: 37, trendText: "+5 from last week", trendVariant: "positive", avgTime: "3.2 days", avgTimeTrend: "-1.8 days from manual",
    revenue: "$18.4K", avgCommission: "$497", leadToLease: "18%", leadToLeaseTrend: "+4% vs industry avg", leadToLeaseVariant: "positive",
    trend: LEASES_TREND,
  },
  "Property A": {
    total: 16, trendText: "+3 from last week", trendVariant: "positive", avgTime: "2.8 days", avgTimeTrend: "-2.2 days from manual",
    revenue: "$8.2K", avgCommission: "$513", leadToLease: "21%", leadToLeaseTrend: "+7% vs industry avg", leadToLeaseVariant: "positive",
    trend: LEASES_TREND.map((d) => ({ week: d.week, value: Math.round(d.value * 0.43) })),
  },
  "Property B": {
    total: 12, trendText: "+2 from last week", trendVariant: "positive", avgTime: "3.4 days", avgTimeTrend: "-1.6 days from manual",
    revenue: "$6.1K", avgCommission: "$508", leadToLease: "17%", leadToLeaseTrend: "+3% vs industry avg", leadToLeaseVariant: "positive",
    trend: LEASES_TREND.map((d) => ({ week: d.week, value: Math.round(d.value * 0.32) })),
  },
  "Property C": {
    total: 9, trendText: "Flat from last week", trendVariant: "negative", avgTime: "3.6 days", avgTimeTrend: "-1.4 days from manual",
    revenue: "$4.1K", avgCommission: "$456", leadToLease: "14%", leadToLeaseTrend: "Flat vs industry avg", leadToLeaseVariant: "negative",
    trend: LEASES_TREND.map((d) => ({ week: d.week, value: Math.round(d.value * 0.24) })),
  },
};

type RenewalsPropertyData = {
  total: number; retentionRate: string; accepted: number; acceptanceRate: string; avgIncrease: string; avgIncreasePct: string;
  annualUplift: string; trend: { week: string; value: number }[];
  trendVariant: "positive" | "negative";
};

const RENEWALS_BY_PROPERTY: Record<PropertyKey, RenewalsPropertyData> = {
  all: {
    total: 28, retentionRate: "92%", accepted: 22, acceptanceRate: "79%", avgIncrease: "$289/mo", avgIncreasePct: "3.2%",
    annualUplift: "$76.3K", trend: RENEWALS_TREND, trendVariant: "positive",
  },
  "Property A": {
    total: 12, retentionRate: "94%", accepted: 10, acceptanceRate: "83%", avgIncrease: "$310/mo", avgIncreasePct: "3.4%",
    annualUplift: "$37.2K", trend: RENEWALS_TREND.map((d) => ({ week: d.week, value: Math.round(d.value * 0.43) })), trendVariant: "positive",
  },
  "Property B": {
    total: 9, retentionRate: "91%", accepted: 7, acceptanceRate: "78%", avgIncrease: "$275/mo", avgIncreasePct: "3.1%",
    annualUplift: "$23.1K", trend: RENEWALS_TREND.map((d) => ({ week: d.week, value: Math.round(d.value * 0.32) })), trendVariant: "positive",
  },
  "Property C": {
    total: 7, retentionRate: "88%", accepted: 5, acceptanceRate: "71%", avgIncrease: "$268/mo", avgIncreasePct: "2.9%",
    annualUplift: "$16.1K", trend: RENEWALS_TREND.map((d) => ({ week: d.week, value: Math.round(d.value * 0.25) })), trendVariant: "negative",
  },
};

type RentPropertyData = {
  collected: string; collectionRate: string; collectionRateVariant: "positive" | "negative"; autoPay: string; autoPayTrend: string;
  lateFeesRecovered: string; delinquencyRate: string; delinquencyVariant: "positive" | "negative"; delinquencyTrend: string;
  trend: { week: string; value: number }[];
  alert: { title: string; body: string } | null;
};

const RENT_BY_PROPERTY: Record<PropertyKey, RentPropertyData> = {
  all: {
    collected: "$218K", collectionRate: "90.6%", collectionRateVariant: "negative", autoPay: "68%", autoPayTrend: "+4% from last month",
    lateFeesRecovered: "$12.2K", delinquencyRate: "4.2%", delinquencyVariant: "negative", delinquencyTrend: "+1.5% from last quarter",
    trend: RENT_TREND,
    alert: { title: "Collection rate dropped to 90.6% — down 1.2% from last month", body: "Property C has the highest delinquency rate at 4.2%. Consider increasing Payments AI follow-up frequency and reviewing late-payment reminder schedules." },
  },
  "Property A": {
    collected: "$92K", collectionRate: "98.1%", collectionRateVariant: "positive", autoPay: "74%", autoPayTrend: "+5% from last month",
    lateFeesRecovered: "$5.4K", delinquencyRate: "1.9%", delinquencyVariant: "positive", delinquencyTrend: "−0.3% from last quarter",
    trend: RENT_TREND.map((d) => ({ week: d.week, value: Math.round(d.value * 0.42) })),
    alert: null,
  },
  "Property B": {
    collected: "$74K", collectionRate: "97.4%", collectionRateVariant: "positive", autoPay: "66%", autoPayTrend: "+3% from last month",
    lateFeesRecovered: "$4.2K", delinquencyRate: "2.6%", delinquencyVariant: "positive", delinquencyTrend: "−0.1% from last quarter",
    trend: RENT_TREND.map((d) => ({ week: d.week, value: Math.round(d.value * 0.34) })),
    alert: null,
  },
  "Property C": {
    collected: "$52K", collectionRate: "95.8%", collectionRateVariant: "negative", autoPay: "58%", autoPayTrend: "+2% from last month",
    lateFeesRecovered: "$2.6K", delinquencyRate: "4.2%", delinquencyVariant: "negative", delinquencyTrend: "+1.5% from last quarter",
    trend: RENT_TREND.map((d) => ({ week: d.week, value: Math.round(d.value * 0.24) })),
    alert: { title: "Collection rate at 95.8% — delinquency rate 4.2%", body: "Property C has the highest delinquency in the portfolio. Consider increasing Payments AI follow-up frequency and reviewing late-payment reminder schedules." },
  },
};

type ConversationsPropertyData = {
  total: string; totalNum: number; trendText: string; trendVariant: "positive" | "negative"; resolved: string; avgResponse: string; satisfaction: string; satisfactionTrend: string;
  trend: { week: string; value: number }[];
  byAgent: { name: string; count: number; pct: string; res: string }[];
  byChannel: { channel: string; count: number; pct: string }[];
};

const CONVERSATIONS_BY_PROPERTY: Record<PropertyKey, ConversationsPropertyData> = {
  all: {
    total: "1,847", totalNum: 1847, trendText: "+12% from last week", trendVariant: "positive", resolved: "89%", avgResponse: "8 sec", satisfaction: "4.6/5", satisfactionTrend: "+0.3 from last quarter",
    trend: CONVERSATIONS_TREND,
    byAgent: [
      { name: "Leasing AI", count: 682, pct: "37%", res: "92%" }, { name: "Payments AI", count: 524, pct: "28%", res: "88%" },
      { name: "Renewal AI", count: 389, pct: "21%", res: "94%" }, { name: "Compliance Agent", count: 252, pct: "14%", res: "91%" },
    ],
    byChannel: [{ channel: "Chat", count: 923, pct: "50%" }, { channel: "Portal", count: 556, pct: "30%" }, { channel: "SMS", count: 258, pct: "14%" }, { channel: "Voice", count: 110, pct: "6%" }],
  },
  "Property A": {
    total: "784", totalNum: 784, trendText: "+14% from last week", trendVariant: "positive", resolved: "92%", avgResponse: "6 sec", satisfaction: "4.7/5", satisfactionTrend: "+0.4 from last quarter",
    trend: CONVERSATIONS_TREND.map((d) => ({ week: d.week, value: Math.round(d.value * 0.42) })),
    byAgent: [
      { name: "Leasing AI", count: 290, pct: "37%", res: "94%" }, { name: "Payments AI", count: 220, pct: "28%", res: "90%" },
      { name: "Renewal AI", count: 165, pct: "21%", res: "95%" }, { name: "Compliance Agent", count: 109, pct: "14%", res: "93%" },
    ],
    byChannel: [{ channel: "Chat", count: 392, pct: "50%" }, { channel: "Portal", count: 235, pct: "30%" }, { channel: "SMS", count: 110, pct: "14%" }, { channel: "Voice", count: 47, pct: "6%" }],
  },
  "Property B": {
    total: "628", totalNum: 628, trendText: "+11% from last week", trendVariant: "positive", resolved: "88%", avgResponse: "9 sec", satisfaction: "4.5/5", satisfactionTrend: "+0.2 from last quarter",
    trend: CONVERSATIONS_TREND.map((d) => ({ week: d.week, value: Math.round(d.value * 0.34) })),
    byAgent: [
      { name: "Leasing AI", count: 232, pct: "37%", res: "91%" }, { name: "Payments AI", count: 176, pct: "28%", res: "87%" },
      { name: "Renewal AI", count: 132, pct: "21%", res: "93%" }, { name: "Compliance Agent", count: 88, pct: "14%", res: "90%" },
    ],
    byChannel: [{ channel: "Chat", count: 314, pct: "50%" }, { channel: "Portal", count: 188, pct: "30%" }, { channel: "SMS", count: 88, pct: "14%" }, { channel: "Voice", count: 38, pct: "6%" }],
  },
  "Property C": {
    total: "435", totalNum: 435, trendText: "+8% from last week", trendVariant: "positive", resolved: "85%", avgResponse: "12 sec", satisfaction: "4.4/5", satisfactionTrend: "+0.2 from last quarter",
    trend: CONVERSATIONS_TREND.map((d) => ({ week: d.week, value: Math.round(d.value * 0.24) })),
    byAgent: [
      { name: "Leasing AI", count: 160, pct: "37%", res: "88%" }, { name: "Payments AI", count: 128, pct: "29%", res: "84%" },
      { name: "Renewal AI", count: 92, pct: "21%", res: "92%" }, { name: "Compliance Agent", count: 55, pct: "13%", res: "88%" },
    ],
    byChannel: [{ channel: "Chat", count: 217, pct: "50%" }, { channel: "Portal", count: 133, pct: "31%" }, { channel: "SMS", count: 60, pct: "14%" }, { channel: "Voice", count: 25, pct: "6%" }],
  },
};

/* ═══════════════════════════════════════════════════════════════════════
   Dashboard card visibility configuration (admin-only settings)
   ═══════════════════════════════════════════════════════════════════════ */

const ALL_METRIC_CARDS = [
  { id: "revenue-impact", label: "Revenue Impact", section: "primary" },
  { id: "active-agents", label: "Active Agents", section: "primary" },
  { id: "hours-saved", label: "Hours Saved", section: "primary" },
  { id: "tours-scheduled", label: "Tours Scheduled", section: "outcome" },
  { id: "leases-signed", label: "Leases Signed", section: "outcome" },
  { id: "renewals-generated", label: "Renewals Generated", section: "outcome" },
  { id: "work-orders-closed", label: "Work Orders Closed", section: "outcome" },
  { id: "rent-collected", label: "Rent Collected", section: "outcome" },
  { id: "conversations-handled", label: "Conversations Handled", section: "outcome" },
] as const;

type MetricCardId = (typeof ALL_METRIC_CARDS)[number]["id"];

const USER_GROUPS = [
  { id: "regional", label: "Regional Managers" },
  { id: "property", label: "Property Managers" },
  { id: "leasing", label: "Leasing" },
  { id: "maintenance", label: "Maintenance" },
  { id: "accounting", label: "Accounting" },
] as const;

type UserGroupId = (typeof USER_GROUPS)[number]["id"];

const MOCK_USERS = [
  { id: "u-1", name: "Sarah Chen", group: "property" as UserGroupId },
  { id: "u-2", name: "Marcus Johnson", group: "maintenance" as UserGroupId },
  { id: "u-3", name: "Amanda Rivera", group: "leasing" as UserGroupId },
  { id: "u-4", name: "David Park", group: "regional" as UserGroupId },
  { id: "u-5", name: "Jennifer Lopez", group: "accounting" as UserGroupId },
  { id: "u-6", name: "Brian Walsh", group: "property" as UserGroupId },
  { id: "u-7", name: "Priya Sharma", group: "leasing" as UserGroupId },
] as const;

type DashboardConfig = Record<string, MetricCardId[]>;

const STORAGE_KEY_DASHBOARD_CONFIG = "oxp-dashboard-card-config";

const DEFAULT_ALL_VISIBLE: MetricCardId[] = ALL_METRIC_CARDS.map((c) => c.id);

function loadDashboardConfig(): DashboardConfig {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DASHBOARD_CONFIG);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveDashboardConfig(config: DashboardConfig) {
  try { localStorage.setItem(STORAGE_KEY_DASHBOARD_CONFIG, JSON.stringify(config)); } catch { /* noop */ }
}

function getVisibleCards(config: DashboardConfig, targetId: string): MetricCardId[] {
  return config[targetId] ?? DEFAULT_ALL_VISIBLE;
}

function TrendChart({ data, dataKey, color, valuePrefix, format }: {
  data: { week: string; value: number }[];
  dataKey?: string;
  color: string;
  valuePrefix?: string;
  format?: (v: number) => string;
}) {
  const fmt = format ?? ((v: number) => `${valuePrefix ?? ""}${v.toLocaleString()}`);
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => fmt(v)} />
          <Tooltip formatter={(v: number) => [fmt(v), ""]} labelClassName="text-xs" />
          <Area type="monotone" dataKey={dataKey ?? "value"} stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

type KpiTrend = "positive" | "neutral" | "negative";

type InsightAction = { label: string; href: string; primary?: boolean };
type Insight = {
  id: string;
  icon: keyof typeof INSIGHT_ICON_MAP;
  iconBg: string;
  iconColor: string;
  title: string;
  agent: string;
  time: string;
  category: string;
  actions: InsightAction[];
};

const INSIGHT_ICON_MAP = {
  dollar: DollarSign,
  arrow: ArrowRight,
  alert: AlertCircle,
  clock: Clock,
} as const;

const COMMAND_CENTER_INSIGHTS: Insight[] = [
  {
    id: "ins-1",
    icon: "dollar",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    title: '3 HUD Special Claims identified — <strong class="text-foreground">$14,200 recoverable</strong>',
    agent: "HUD Special Claims Agent",
    time: "2 hours ago",
    category: "Compliance",
    actions: [
      { label: "Review Claims", href: "/escalations", primary: true },
      { label: "Dismiss", href: "#" },
      { label: "View Trace", href: "/governance" },
    ],
  },
  {
    id: "ins-2",
    icon: "arrow",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    title: '7 month-to-month leases need repricing — <strong class="text-foreground">$2,100/mo</strong> revenue opportunity',
    agent: "Rent Optimization Agent",
    time: "4 hours ago",
    category: "Renewals",
    actions: [
      { label: "Review Pricing", href: "/performance", primary: true },
      { label: "Send to Renewals AI", href: "/agent-roster?agent=7" },
      { label: "View Trace", href: "/governance" },
    ],
  },
  {
    id: "ins-3",
    icon: "alert",
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
    title: 'Vendor spend anomaly: Unit 204 charges <strong class="text-green-600">42% above</strong> comparable work orders',
    agent: "Spend Analysis Agent",
    time: "6 hours ago",
    category: "Accounting",
    actions: [
      { label: "Review Analysis", href: "/escalations", primary: true },
      { label: "View Trace", href: "/governance" },
    ],
  },
  {
    id: "ins-4",
    icon: "clock",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
    title: "2 compliance deadlines approaching: security deposit returns for Units 118, 305",
    agent: "Compliance Monitor Agent",
    time: "1 hour ago",
    category: "Compliance",
    actions: [
      { label: "Review Deadlines", href: "/escalations", primary: true },
      { label: "Auto-process Returns", href: "/workflows" },
    ],
  },
];

const IC_PERSONA = { name: "Sarah", fullName: "Sarah Chen", property: "Property A" };

const IC_TIPS = [
  {
    title: "Respond within 15 minutes",
    body: "Residents who get a response within 15 min report 2x higher satisfaction than those who wait an hour.",
  },
  {
    title: "Use the reply field to instruct the AI",
    body: "When you resolve an escalation, leave a reply. The AI learns from your guidance and handles similar cases next time.",
  },
  {
    title: "Add labels for better routing",
    body: "Tagging escalations with the right labels ensures future similar issues get routed to the right person automatically.",
  },
  {
    title: "Check for overdue items first",
    body: "Items past their due date affect SLA metrics. Prioritize red badges before working new items.",
  },
];

export default function CommandCenterPage() {
  const { role } = useRole();
  return (
    <ContractGate featureName="the Agent Command Center">
      {role === "ic" ? <ICCommandCenter /> : <AdminCommandCenter />}
    </ContractGate>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   IC Command Center — personal queue-focused view
   ═══════════════════════════════════════════════════════════════════════ */

function ICCommandCenter() {
  const { items } = useEscalations();
  const [selectedEscalationId, setSelectedEscalationId] = useState<string | null>(null);

  const myItems = items.filter((i) => i.assignee === IC_PERSONA.name);
  const myOpenItems = myItems.filter((i) => i.status !== "Done");
  const myResolvedCount = myItems.filter((i) => i.status === "Done").length;
  const now = new Date();
  const myOverdueCount = myOpenItems.filter((i) => i.dueAt && new Date(i.dueAt) < now).length;
  const myUrgentCount = myOpenItems.filter((i) => i.priority === "urgent" || i.priority === "high").length;

  const selectedEscalation = selectedEscalationId
    ? items.find((i) => i.id === selectedEscalationId) ?? null
    : null;

  const kpis: Array<{
    label: string;
    value: React.ReactNode;
    icon: React.ComponentType<{ className?: string }>;
    trendText: string;
    trendVariant: KpiTrend;
  }> = [
    {
      label: "My Open Items",
      value: myOpenItems.length,
      icon: AlertCircle,
      trendText: myUrgentCount > 0 ? `${myUrgentCount} urgent` : "None urgent",
      trendVariant: myUrgentCount > 0 ? "negative" : "positive",
    },
    {
      label: "Resolved This Week",
      value: myResolvedCount,
      icon: CheckCircle2,
      trendText: myResolvedCount > 0 ? "Keep it up" : "Get started",
      trendVariant: myResolvedCount > 0 ? "positive" : "neutral",
    },
    {
      label: "Avg Response Time",
      value: "18 min",
      icon: Clock,
      trendText: "−3 min from last week",
      trendVariant: "positive",
    },
    {
      label: "My Resolution Rate",
      value: "91%",
      icon: Target,
      trendText: "+2 pts from last week",
      trendVariant: "positive",
    },
  ];

  return (
    <>
      <PageHeader
        title={`Hi ${IC_PERSONA.fullName}`}
        description={`Here's your queue for today. You have ${myOpenItems.length} open item${myOpenItems.length !== 1 ? "s" : ""}${myOverdueCount > 0 ? ` — ${myOverdueCount} overdue` : ""}.`}
      />

      {/* Personal KPI cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, trendText, trendVariant }) => (
          <Card key={label} className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-0 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 py-1.5">
              <span className="text-xl font-semibold tracking-tight">{value}</span>
            </CardContent>
            <CardFooter className="px-4 pb-4 pt-0">
              <p
                className={cn(
                  "text-xs",
                  trendVariant === "positive" && "text-green-600 dark:text-green-400",
                  trendVariant === "negative" && "text-red-600 dark:text-red-400",
                  trendVariant === "neutral" && "text-muted-foreground"
                )}
              >
                {trendText}
              </p>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* My Queue — full-width primary section */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>My Queue</CardTitle>
            <CardDescription>
              {myOpenItems.length} open
              {myUrgentCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400"> · {myUrgentCount} urgent</span>
              )}
              {myOverdueCount > 0 && (
                <span className="text-red-600 dark:text-red-400"> · {myOverdueCount} overdue</span>
              )}
              {" · "}
              <Link href="/escalations" className="underline hover:no-underline">View all escalations</Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myOpenItems.length > 0 ? (
              <div className="scrollbar-hide overflow-y-auto" style={{ maxHeight: "440px" }}>
                <ul className="flex flex-col gap-2">
                  {myOpenItems.map((row) => {
                    const isOverdue = row.dueAt && new Date(row.dueAt) < now;
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedEscalationId(row.id)}
                          className="flex h-[72px] w-full flex-col justify-center rounded-lg border border-border bg-gray-100 p-3 text-left transition-colors hover:border-primary/40 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="truncate text-sm font-medium text-foreground" title={row.name ?? row.summary}>
                              {row.name ?? row.summary}
                            </span>
                            {(isOverdue || row.priority === "urgent" || row.priority === "high") && (
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                  isOverdue && "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
                                  !isOverdue && row.priority === "urgent" && "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
                                  !isOverdue && row.priority === "high" && "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                                )}
                              >
                                {isOverdue ? "Overdue" : row.priority === "urgent" ? "Urgent" : "High"}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{row.escalatedByAgent ?? row.category}</span>
                            {row.property && (
                              <>
                                <span aria-hidden>·</span>
                                <span className="truncate">{row.property}</span>
                              </>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="mb-3 h-8 w-8 text-green-500" />
                <p className="text-sm font-medium text-foreground">All caught up!</p>
                <p className="mt-1 text-xs text-muted-foreground">No open items in your queue right now.</p>
              </div>
            )}
          </CardContent>
          {myOpenItems.length > 10 && (
            <CardFooter>
              <Button asChild variant="outline" size="sm">
                <Link href="/escalations">
                  View all
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Tips & Coaching */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Tips
            </CardTitle>
            <CardDescription>
              Best practices for working your queue effectively.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {IC_TIPS.map((tip) => (
                <li key={tip.title} className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-sm font-medium text-foreground">{tip.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{tip.body}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <EscalationDetailSheet
        item={selectedEscalation}
        open={!!selectedEscalationId}
        onOpenChange={(o) => !o && setSelectedEscalationId(null)}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Admin / Regional Manager Command Center (original view)
   ═══════════════════════════════════════════════════════════════════════ */

function AdminCommandCenter() {
  const { items } = useEscalations();
  const { agents, agentsEnabledCount } = useAgents();
  const { recipes } = useWorkflows();
  const { role, roleProperties } = useRole();
  const { r1Mode } = useContract();
  const isPropertyManager = role === "property";
  const isRegionalManager = role === "regional";
  const openItems = items.filter((i) => i.status !== "Done");
  const openCount = openItems.length;
  const now = new Date();
  const overdueCount = openItems.filter((i) => i.dueAt && new Date(i.dueAt) < now).length;
  const urgentCount = openItems.filter((i) => i.priority === "urgent" || i.priority === "high").length;
  const byCategory = openItems.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {});
  const byProperty = openItems.reduce<Record<string, number>>((acc, i) => {
    acc[i.property] = (acc[i.property] || 0) + 1;
    return acc;
  }, {});
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const topProperty = Object.entries(byProperty).sort((a, b) => b[1] - a[1])[0];
  const atTopProperty = openItems.filter((i) => i.property === topProperty?.[0]);
  const byCategoryAtTopProperty = atTopProperty.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {});
  const topCategoryAtTopProperty = Object.entries(byCategoryAtTopProperty).sort((a, b) => b[1] - a[1])[0];
  const escalationsHref =
    topCategory && topCategory[1] > 0
      ? `/escalations?category=${encodeURIComponent(topCategory[0])}`
      : "/escalations";
  type KpiCard = {
    label: string;
    value: React.ReactNode;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    trendText?: string;
    trendVariant?: KpiTrend;
    cta?: {
      message: string;
      buttonLabel: string;
      buttonHref: string;
    };
  };

  const primaryKpis: KpiCard[] = [
    ...(!isPropertyManager && !isRegionalManager ? [{ label: "Revenue Impact", value: "$42K", href: "/performance", icon: DollarSign, trendText: "+8% since last week", trendVariant: "positive" as const }] : []),
    { label: "Active Agents", value: agentsEnabledCount, href: "/agent-roster", icon: Users, trendText: "+1 since last week", trendVariant: "positive" as const },
    { label: "Hours Saved", value: "386 hrs", href: "/performance", icon: Clock, trendText: "+42 hrs from last week", trendVariant: "positive" as const },
  ];

  const outcomeKpis: KpiCard[] = [
    { label: "Tours Scheduled", value: "124", href: "/performance", icon: CalendarCheck, trendText: "−6 from last week", trendVariant: "negative" as const },
    { label: "Leases Signed", value: "37", href: "/performance", icon: FileSignature, trendText: "+5 from last week", trendVariant: "positive" as const },
    { label: "Renewals Generated", value: "28", href: "/performance", icon: RefreshCw, trendText: "92% retention rate", trendVariant: "positive" as const },
    { label: "Work Orders Closed", value: "—", href: "/agent-roster", icon: Wrench, cta: { message: "Clients with Maintenance AI see a 15% faster work order resolution time", buttonLabel: "Enable Maintenance AI", buttonHref: "/agent-roster?agent=10" } },
    { label: "Rent Collected", value: "$218K", href: "/performance", icon: DollarSign, trendText: "90.6% collected · Down 1.2% from last month", trendVariant: "negative" as const },
    { label: "Conversations Handled", value: "1,847", href: "/live-conversations", icon: MessageSquare, trendText: "+12% from last week", trendVariant: "positive" as const },
  ];

  // HIDDEN: Effective Capacity & Open Escalations cards — uncomment to restore
  // const operationalKpis: KpiCard[] = [
  //   ...(!isPropertyManager ? [{ label: "Effective Capacity", value: "12.2 FTE", href: "/performance", icon: Gauge, trendText: "+0.5 FTE from last week", trendVariant: "positive" as const }] : []),
  //   { label: "Open Escalations", value: openCount, href: escalationsHref, icon: AlertCircle, trendText: "Up 3 from last week", trendVariant: "negative" as const },
  // ];

  const [metricDetail, setMetricDetail] = useState<string | null>(null);
  const [metricPropertyFilter, setMetricPropertyFilter] = useState<PropertyKey>("all");
  const closeMetricDetail = (open: boolean) => { if (!open) { setMetricDetail(null); setMetricPropertyFilter("all"); } };
  const [showMaintenanceCta, setShowMaintenanceCta] = useState(false);

  const isAdmin = role === "admin";
  const [showCardSettings, setShowCardSettings] = useState(false);
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>({});
  const [settingsTarget, setSettingsTarget] = useState<string>("regional");
  const [settingsTab, setSettingsTab] = useState<"groups" | "users">("groups");

  useEffect(() => { setDashboardConfig(loadDashboardConfig()); }, []);

  const targetVisibleCards = useMemo(
    () => getVisibleCards(dashboardConfig, settingsTarget),
    [dashboardConfig, settingsTarget],
  );

  const toggleCard = useCallback((cardId: MetricCardId) => {
    setDashboardConfig((prev) => {
      const current = getVisibleCards(prev, settingsTarget);
      const next = current.includes(cardId)
        ? current.filter((id) => id !== cardId)
        : [...current, cardId];
      const updated = { ...prev, [settingsTarget]: next };
      saveDashboardConfig(updated);
      return updated;
    });
  }, [settingsTarget]);

  const myVisibleCards = useMemo(() => {
    const roleKey = role as string;
    return getVisibleCards(dashboardConfig, roleKey);
  }, [dashboardConfig, role]);

  const visiblePrimaryKpis = primaryKpis.filter((kpi) => {
    const cardId = kpi.label.toLowerCase().replace(/ /g, "-") as MetricCardId;
    return myVisibleCards.includes(cardId);
  });

  const visibleOutcomeKpis = outcomeKpis.filter((kpi) => {
    const cardId = kpi.label.toLowerCase().replace(/ /g, "-") as MetricCardId;
    return myVisibleCards.includes(cardId);
  });
  const [selectedEscalationId, setSelectedEscalationId] = useState<string | null>(null);
  const selectedEscalation = selectedEscalationId
    ? items.find((i) => i.id === selectedEscalationId) ?? null
    : null;
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const activeAgentsList = agents.filter((a) => a.status === "Active");
  const revData = REVENUE_BY_PROPERTY[metricPropertyFilter];
  const hoursData = HOURS_BY_PROPERTY[metricPropertyFilter];
  const toursData = TOURS_BY_PROPERTY[metricPropertyFilter];
  const leasesData = LEASES_BY_PROPERTY[metricPropertyFilter];
  const renewalsData = RENEWALS_BY_PROPERTY[metricPropertyFilter];
  const rentData = RENT_BY_PROPERTY[metricPropertyFilter];
  const convoData = CONVERSATIONS_BY_PROPERTY[metricPropertyFilter];
  const filteredAgents = useMemo(() => {
    if (metricPropertyFilter === "all") return activeAgentsList;
    return activeAgentsList.filter((a) => a.scope === "All properties" || a.scope.includes(metricPropertyFilter));
  }, [activeAgentsList, metricPropertyFilter]);
  const { humanMembers } = useWorkforce();
  const displayList = openItems.slice(0, 10);

  const allTeamAgents = [
    { id: "ta-1", name: "Leasing AI", activity: "47 active conversations · 12 tours scheduled today", metric: "34%", metricLabel: "conversion", properties: ["Property A", "Property B"] },
    { id: "ta-2", name: "Payments AI", activity: "$23.4K collected this week · 89 active follow-ups", metric: "$23.4K", metricLabel: "this week", properties: ["All properties"] },
    { id: "ta-3", name: "Renewals AI", activity: "12 offers outstanding · 8 accepted this week", metric: "92%", metricLabel: "retention", properties: ["All properties"] },
    { id: "ta-4", name: "Maintenance AI", activity: "8 work orders in progress · avg 4.2hr resolution", metric: "4.2hr", metricLabel: "avg resolve", properties: ["Property A", "Property B", "Property C"] },
  ];

  const allTeamStaff = [
    { id: "ts-1", name: "Sarah Chen", role: "Community Manager", activity: "Reviewing 3 escalations", metric: "3", metricLabel: "escalations", properties: ["Property A"] },
    { id: "ts-2", name: "Marcus Johnson", role: "Maintenance Lead", activity: "On-site at Building C", metric: "5", metricLabel: "active WOs", properties: ["Property B", "Property C"] },
    { id: "ts-3", name: "Amanda Rivera", role: "Leasing Consultant", activity: "2 tours this afternoon", metric: "2", metricLabel: "tours", properties: ["Property A", "Property B"] },
  ];

  const teamAgents = allTeamAgents.filter((a) => a.properties.some((p) => isPropertyInScope(p, roleProperties)));
  const teamStaff = allTeamStaff.filter((s) => s.properties.some((p) => isPropertyInScope(p, roleProperties)));

  const liveConversations = LIVE_CONVERSATIONS;

  return (
    <>
      <PageHeader
        title="Command Center"
        description="What needs doing and how the workforce is performing. Orchestrate the workforce and focus effort—with insights on where to look."
      />
      <ValueYoureMissingBanner />

      {/* ── Impact Metrics Section (R1 coming-soon overlay when in R1 mode) ── */}
      <div className="relative">
        <div className={cn(r1Mode && "pointer-events-none select-none opacity-50")}>
          {/* ── Row 1: Primary KPIs — Revenue Impact, Active Agents, Hours Saved ── */}
          {isAdmin && (
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCardSettings(true)}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Settings className="h-3.5 w-3.5" />
                Configure Dashboard
              </button>
            </div>
          )}
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePrimaryKpis.map(({ label, value, icon: Icon, trendText, trendVariant }) => (
              <button key={label} type="button" className="text-left" onClick={() => setMetricDetail(label)}>
                <Card className="h-full cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-0 pt-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardHeader>
                  {trendText && (
                    <CardContent className="px-4 pt-1.5 pb-0">
                      <span className={cn("text-2xl font-bold tracking-tight", trendVariant === "positive" && "text-green-600 dark:text-green-400", trendVariant === "negative" && "text-red-600 dark:text-red-400", (trendVariant === "neutral" || trendVariant == null) && "text-muted-foreground")}>{trendText}</span>
                    </CardContent>
                  )}
                  <CardFooter className="px-4 pb-4 pt-1">
                    <p className="text-sm font-medium text-foreground">{value}</p>
                  </CardFooter>
                </Card>
              </button>
            ))}
          </div>

          {/* ── Row 2: Outcome Metrics — what AI agents are achieving ── */}
          {visibleOutcomeKpis.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Outcomes Achieved by AI Agents</p>
            <div className={cn("grid gap-4 sm:grid-cols-2 md:grid-cols-3", visibleOutcomeKpis.length >= 6 ? "lg:grid-cols-6" : visibleOutcomeKpis.length >= 5 ? "lg:grid-cols-5" : visibleOutcomeKpis.length >= 4 ? "lg:grid-cols-4" : visibleOutcomeKpis.length === 3 ? "lg:grid-cols-3" : visibleOutcomeKpis.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-1")}>
              {visibleOutcomeKpis.map(({ label, value, icon: Icon, trendText, trendVariant, cta }) => (
                cta ? (
                  <button key={label} type="button" className="text-left" onClick={() => setShowMaintenanceCta(true)}>
                    <Card className="relative h-full cursor-pointer overflow-hidden border-dashed border-muted-foreground/30 bg-muted/10 transition-colors hover:border-primary/40 hover:bg-muted/20">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-0 pt-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                      </CardHeader>
                      <CardContent className="px-4 pb-3 pt-2">
                        <div className="mb-2 flex items-center gap-1.5">
                          <Image src="/eli-plus-cube.svg" alt="ELI+" width={16} height={16} className="shrink-0" />
                          <span className="text-[10px] font-semibold text-foreground">ELI+ Maintenance AI</span>
                        </div>
                        <p className="text-[11px] leading-snug text-muted-foreground">{cta.message}</p>
                        <span className="mt-2.5 flex h-7 w-full items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground shadow-sm">
                          {cta.buttonLabel}
                        </span>
                      </CardContent>
                    </Card>
                  </button>
                ) : (
                  <button key={label} type="button" className="text-left" onClick={() => setMetricDetail(label)}>
                    <Card className="h-full cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/30">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-0 pt-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </CardHeader>
                      {trendText && (
                        <CardContent className="px-4 pt-1 pb-0">
                          <span className={cn("text-lg font-bold tracking-tight", trendVariant === "positive" && "text-green-600 dark:text-green-400", trendVariant === "negative" && "text-red-600 dark:text-red-400", (trendVariant === "neutral" || trendVariant == null) && "text-muted-foreground")}>{trendText}</span>
                        </CardContent>
                      )}
                      <CardFooter className="px-4 pb-3 pt-0.5">
                        <p className="text-xs font-medium text-foreground">{value}</p>
                      </CardFooter>
                    </Card>
                  </button>
                )
              ))}
            </div>
          </div>
          )}
        </div>

        {r1Mode && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/40 dark:bg-gray-950/40">
            <div className="w-full max-w-md rounded-xl border border-blue-200 bg-white px-6 py-5 text-center shadow-xl dark:border-blue-800 dark:bg-gray-900">
              <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">Coming Soon</span>
              <h3 className="mt-3 text-base font-semibold text-foreground">Impact Metrics</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                See exactly how your AI workforce is driving results — revenue generated, staff hours reclaimed, and outcomes achieved across leasing, renewals, maintenance, and more.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* HIDDEN: Row 3 Operational — Effective Capacity & Open Escalations — uncomment to restore
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {operationalKpis.map(({ label, value, href, icon: Icon, trendText, trendVariant }) => (
          label === "Open Escalations" ? (
            <Link key={label} href={href}>
              <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-0 pt-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                </CardHeader>
                {trendText && (
                  <CardContent className="px-4 pt-1.5 pb-0">
                    <span className={cn("text-xl font-bold tracking-tight", trendVariant === "positive" && "text-green-600 dark:text-green-400", trendVariant === "negative" && "text-red-600 dark:text-red-400", (trendVariant === "neutral" || trendVariant == null) && "text-muted-foreground")}>{trendText}</span>
                  </CardContent>
                )}
                <CardFooter className="px-4 pb-4 pt-1">
                  <p className="text-sm font-medium text-foreground">{value}</p>
                </CardFooter>
              </Card>
            </Link>
          ) : (
            <button key={label} type="button" className="text-left" onClick={() => setMetricDetail(label)}>
              <Card className="h-full cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-0 pt-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                </CardHeader>
                {trendText && (
                  <CardContent className="px-4 pt-1.5 pb-0">
                    <span className={cn("text-xl font-bold tracking-tight", trendVariant === "positive" && "text-green-600 dark:text-green-400", trendVariant === "negative" && "text-red-600 dark:text-red-400", (trendVariant === "neutral" || trendVariant == null) && "text-muted-foreground")}>{trendText}</span>
                  </CardContent>
                )}
                <CardFooter className="px-4 pb-4 pt-1">
                  <p className="text-sm font-medium text-foreground">{value}</p>
                </CardFooter>
              </Card>
            </button>
          )
        ))}
      </div>
      */}

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        {/* Needs Attention — minimal cards: escalation, agent, property; click opens detail sheet to action */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Needs Attention</CardTitle>
            <CardDescription>
              {openCount} open
              {urgentCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400"> · {urgentCount} urgent</span>
              )}
              {overdueCount > 0 && (
                <span className="text-red-600 dark:text-red-400"> · {overdueCount} overdue</span>
              )}
              {" · "}
              <Link href={escalationsHref} className="underline hover:no-underline">View all</Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {openCount > 0 ? (
              <div className="scrollbar-hide overflow-y-auto" style={{ maxHeight: "248px" }}>
                <ul className="flex flex-col gap-2">
                  {displayList.map((row) => {
                    const isOverdue = row.dueAt && new Date(row.dueAt) < now;
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedEscalationId(row.id)}
                          className="flex h-[72px] w-full flex-col justify-center rounded-lg border border-border bg-gray-100 p-3 text-left transition-colors hover:border-primary/40 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="truncate text-sm font-medium text-foreground" title={row.name ?? row.summary}>
                              {row.name ?? row.summary}
                            </span>
                            {(isOverdue || row.priority === "urgent" || row.priority === "high") && (
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                  isOverdue && "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
                                  !isOverdue && row.priority === "urgent" && "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
                                  !isOverdue && row.priority === "high" && "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                                )}
                              >
                                {isOverdue ? "Overdue" : row.priority === "urgent" ? "Urgent" : "High"}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{row.escalatedByAgent ?? row.category}</span>
                            {row.property && (
                              <>
                                <span aria-hidden>·</span>
                                <span className="truncate">{row.property}</span>
                              </>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">All caught up.</p>
            )}
          </CardContent>
          {openCount > 0 && openCount > displayList.length && (
            <CardFooter>
              <Button asChild variant="outline" size="sm">
                <Link href={escalationsHref}>
                  View all
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Live Conversations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              Live Conversations
            </CardTitle>
            <CardDescription>
              {liveConversations.length} active across 3 properties
              {" · "}
              <Link href="/live-conversations" className="underline hover:no-underline">View all</Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="scrollbar-hide overflow-y-auto" style={{ maxHeight: "248px" }}>
              <ul className="flex flex-col gap-2">
                {liveConversations.map((conv) => {
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  const preview = lastMsg?.text ?? "";
                  const previewTruncated = preview.length > 55 ? preview.slice(0, 52) + "..." : preview;
                  return (
                    <li key={conv.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedConversationId(conv.id)}
                        className="flex h-[72px] w-full items-center gap-3 rounded-lg border border-border bg-gray-100 p-3 text-left transition-colors hover:border-primary/40 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                          {conv.resident.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {conv.resident}
                            {conv.unit && <span className="font-normal text-muted-foreground"> · {conv.unit}</span>}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            &ldquo;{previewTruncated}&rdquo;
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-semibold text-red-500">ELI+ {conv.agent}</p>
                          <p className="text-[10px] text-muted-foreground">{conv.time}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm">
              <Link href="/live-conversations">
                View all
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Your Team */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                  </span>
                  Your Team
                </CardTitle>
                <CardDescription>Staff and autonomous agents who own outcomes</CardDescription>
              </div>
              <span className="text-xs text-muted-foreground">
                {agentsEnabledCount} agents · {teamStaff.length} staff
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Autonomous Agents
              </p>
              <ul className="divide-y divide-border">
                {teamAgents.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Image src="/eli-plus-cube.svg" alt="ELI+" width={20} height={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        ELI+ {a.name}
                        <span className="ml-1.5 inline-flex items-center rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white">AI</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{a.activity}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">{a.metric}</p>
                      <p className="text-[10px] text-muted-foreground">{a.metricLabel}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Property Staff
              </p>
              <ul className="divide-y divide-border">
                {teamStaff.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                      {s.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.role} · {s.activity}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-foreground">{s.metric}</p>
                      <p className="text-[10px] text-muted-foreground">{s.metricLabel}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm">
              <Link href="/workforce">
                View workforce
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Insights & Recommendations (R1 coming-soon overlay when in R1 mode) */}
        <div className="relative lg:col-span-2">
          <div className={cn(r1Mode && "pointer-events-none select-none opacity-50")}>
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                      </span>
                      Insights &amp; Recommendations
                      <span className="text-sm font-normal text-muted-foreground">— Intelligence agents have formed intent</span>
                    </CardTitle>
                  </div>
                  <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
                    {COMMAND_CENTER_INSIGHTS.length} pending
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {COMMAND_CENTER_INSIGHTS.map((insight) => {
                    const IconComp = INSIGHT_ICON_MAP[insight.icon];
                    return (
                      <li key={insight.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                        <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", insight.iconBg)}>
                          <IconComp className={cn("h-4 w-4", insight.iconColor)} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground" dangerouslySetInnerHTML={{ __html: insight.title }} />
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {insight.agent}
                            <span className="mx-1.5">·</span>
                            {insight.time}
                            <span className="mx-1.5">·</span>
                            {insight.category}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {insight.actions.map((action) => (
                              <Link key={action.label} href={action.href}>
                                <Button
                                  variant={action.primary ? "outline" : "ghost"}
                                  size="sm"
                                  className={cn(
                                    "h-7 rounded-full px-3 text-xs",
                                    action.primary
                                      ? "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {action.label}
                                </Button>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </div>

          {r1Mode && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/40 dark:bg-gray-950/40">
              <div className="w-full max-w-md rounded-xl border border-blue-200 bg-white px-6 py-5 text-center shadow-xl dark:border-blue-800 dark:bg-gray-900">
                <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">Coming Soon</span>
                <h3 className="mt-3 text-base font-semibold text-foreground">Insights &amp; Recommendations</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  AI-generated insights that surface opportunities, flag risks, and recommend actions — so your team knows exactly where to focus for the greatest impact.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Maintenance AI CTA Modal ── */}
      <Dialog open={showMaintenanceCta} onOpenChange={(o) => !o && setShowMaintenanceCta(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Image src="/eli-plus-cube.svg" alt="ELI+" width={36} height={36} />
              <div>
                <DialogTitle className="text-xl">ELI+ Maintenance AI</DialogTitle>
                <DialogDescription>Autonomous work order management for your properties</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">What Maintenance AI does</p>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />Automatically triages and dispatches work orders to the right vendor</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />Follows up with residents on scheduling and completion</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />Tracks SLA compliance and escalates overdue orders</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />Handles resident communication via chat and voice 24/7</li>
              </ul>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-950/30">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">Impact from similar properties</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">15%</p>
                  <p className="text-[11px] text-green-600 dark:text-green-400">Faster resolution</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">4.2 hr</p>
                  <p className="text-[11px] text-green-600 dark:text-green-400">Avg resolve time</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">92%</p>
                  <p className="text-[11px] text-green-600 dark:text-green-400">Resident satisfaction</p>
                </div>
              </div>
            </div>
            <Button asChild size="lg" className="w-full font-semibold">
              <Link href="/agent-roster?agent=10">Set Up ELI+ Maintenance AI</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dashboard Card Settings (admin only) ── */}
      <Dialog open={showCardSettings} onOpenChange={(o) => !o && setShowCardSettings(false)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl"><Settings className="h-5 w-5" /> Dashboard Configuration</DialogTitle>
            <DialogDescription>Choose which metric cards are visible on the command center for specific users or groups.</DialogDescription>
          </DialogHeader>
          <Tabs value={settingsTab} onValueChange={(v) => { setSettingsTab(v as "groups" | "users"); setSettingsTarget(v === "groups" ? "regional" : MOCK_USERS[0].id); }} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="groups">Groups</TabsTrigger>
              <TabsTrigger value="users">Individual Users</TabsTrigger>
            </TabsList>

            <TabsContent value="groups" className="mt-4">
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground">Select Group</label>
                <Select value={settingsTarget} onValueChange={setSettingsTarget}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {USER_GROUPS.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Members</p>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {MOCK_USERS.filter((u) => u.group === settingsTarget).map((u) => (
                  <span key={u.id} className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground">{u.name}</span>
                ))}
                {MOCK_USERS.filter((u) => u.group === settingsTarget).length === 0 && (
                  <span className="text-[11px] text-muted-foreground">No users in this group</span>
                )}
              </div>
              <div className="space-y-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary Metrics</p>
                {ALL_METRIC_CARDS.filter((c) => c.section === "primary").map((card) => (
                  <div key={card.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                    <span className="text-sm font-medium text-foreground">{card.label}</span>
                    <Switch checked={targetVisibleCards.includes(card.id)} onCheckedChange={() => toggleCard(card.id)} />
                  </div>
                ))}
                <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outcome Metrics</p>
                {ALL_METRIC_CARDS.filter((c) => c.section === "outcome").map((card) => (
                  <div key={card.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                    <span className="text-sm font-medium text-foreground">{card.label}</span>
                    <Switch checked={targetVisibleCards.includes(card.id)} onCheckedChange={() => toggleCard(card.id)} />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="users" className="mt-4">
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground">Select User</label>
                <Select value={settingsTarget} onValueChange={setSettingsTarget}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOCK_USERS.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(() => {
                  const user = MOCK_USERS.find((u) => u.id === settingsTarget);
                  const group = user ? USER_GROUPS.find((g) => g.id === user.group) : null;
                  return user && group ? (
                    <p className="mt-1.5 text-[11px] text-muted-foreground">Group: {group.label}</p>
                  ) : null;
                })()}
              </div>
              <div className="space-y-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary Metrics</p>
                {ALL_METRIC_CARDS.filter((c) => c.section === "primary").map((card) => (
                  <div key={card.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                    <span className="text-sm font-medium text-foreground">{card.label}</span>
                    <Switch checked={targetVisibleCards.includes(card.id)} onCheckedChange={() => toggleCard(card.id)} />
                  </div>
                ))}
                <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outcome Metrics</p>
                {ALL_METRIC_CARDS.filter((c) => c.section === "outcome").map((card) => (
                  <div key={card.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                    <span className="text-sm font-medium text-foreground">{card.label}</span>
                    <Switch checked={targetVisibleCards.includes(card.id)} onCheckedChange={() => toggleCard(card.id)} />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ── Metric Detail Modals ── */}
      <Dialog open={metricDetail === "Revenue Impact"} onOpenChange={closeMetricDetail}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl"><DollarSign className="h-6 w-6 text-green-600" /> Revenue Impact</DialogTitle>
            <DialogDescription>Total revenue attributed to AI agent activity{metricPropertyFilter === "all" ? " across your portfolio" : ` at ${metricPropertyFilter}`} over the past 8 weeks.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Property:</span>
            <Select value={metricPropertyFilter} onValueChange={(v) => setMetricPropertyFilter(v as PropertyKey)}>
              <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {PROPERTIES_LIST.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4">
            <div className="mb-6 grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-xs font-medium text-muted-foreground">Total Revenue Impact</p>
                <p className="mt-1 text-3xl font-bold tracking-tight">{revData.total}</p>
                <p className="mt-0.5 text-xs text-green-600">+8% since last week</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-xs font-medium text-muted-foreground">Avg Revenue per Agent</p>
                <p className="mt-1 text-2xl font-bold tracking-tight">{revData.avgPerAgent}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Across {revData.agents.length} revenue-generating agents</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-xs font-medium text-muted-foreground">Revenue per Conversation</p>
                <p className="mt-1 text-2xl font-bold tracking-tight">{revData.perConversation}</p>
                <p className="mt-0.5 text-xs text-green-600">{revData.perConversationTrend}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-xs font-medium text-muted-foreground">Projected Monthly</p>
                <p className="mt-1 text-2xl font-bold tracking-tight">{revData.projected}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Based on current 8-week trend</p>
              </div>
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revenue Growth Trend</p>
            <TrendChart data={revData.trend.map((d) => ({ week: d.week, value: d.revenue }))} color="hsl(142.1, 76.2%, 36.3%)" format={(v) => `$${(v / 1000).toFixed(1)}K`} />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revenue by Agent</p>
                <ul className="space-y-3">
                  {revData.agents.map((a) => (
                    <li key={a.name} className="rounded-md border border-border/50 bg-muted/10 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Image src="/eli-plus-cube.svg" alt="" width={16} height={16} />
                          <span className="text-sm font-medium text-foreground">{a.name}</span>
                        </span>
                        <span className="text-sm font-bold text-foreground">{a.amount} <span className="text-xs font-normal text-muted-foreground">({a.pct})</span></span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{a.detail}</span>
                        <span className="text-xs text-green-600">{a.trend}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {metricPropertyFilter === "all" && (
                <div className="rounded-lg border border-border p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revenue by Property</p>
                  <ul className="space-y-3">
                    {[
                      { name: "Property A", amount: "$18.6K", units: "120 units", occupancy: "94%", trend: "+11%" },
                      { name: "Property B", amount: "$14.2K", units: "95 units", occupancy: "91%", trend: "+7%" },
                      { name: "Property C", amount: "$9.2K", units: "80 units", occupancy: "88%", trend: "+4%" },
                    ].map((p) => (
                      <li key={p.name} className="rounded-md border border-border/50 bg-muted/10 p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{p.name}</span>
                          <span className="text-sm font-bold text-foreground">{p.amount}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{p.units} · {p.occupancy} occupancy</span>
                          <span className="text-xs text-green-600">{p.trend}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={metricDetail === "Active Agents"} onOpenChange={closeMetricDetail}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl"><Users className="h-6 w-6" /> Active Agents</DialogTitle>
            <DialogDescription>{filteredAgents.length} AI agents currently active{metricPropertyFilter === "all" ? " across your properties" : ` at ${metricPropertyFilter}`}, organized by function.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Property:</span>
            <Select value={metricPropertyFilter} onValueChange={(v) => setMetricPropertyFilter(v as PropertyKey)}>
              <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {PROPERTIES_LIST.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs font-medium text-muted-foreground">Total Active</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">{filteredAgents.length}</p>
              <p className="mt-0.5 text-xs text-green-600">+1 since last week</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs font-medium text-muted-foreground">Total Conversations</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{filteredAgents.reduce((sum, a) => sum + a.conversationCount, 0).toLocaleString()}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{metricPropertyFilter === "all" ? "Across all active agents" : `At ${metricPropertyFilter}`}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs font-medium text-muted-foreground">Avg Resolution Rate</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{(() => { const rates = filteredAgents.filter((a) => a.resolutionRate !== "—").map((a) => parseFloat(a.resolutionRate)); return rates.length ? `${Math.round(rates.reduce((s, r) => s + r, 0) / rates.length)}%` : "—"; })()}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Weighted average</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{metricPropertyFilter === "all" ? "All Active Agents" : `Active Agents at ${metricPropertyFilter}`}</p>
            <ul className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredAgents.map((a) => (
                <li key={a.id}>
                  <Link href={`/agent-roster?agent=${a.id}`} className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-muted/30">
                    <Image src="/eli-plus-cube.svg" alt="ELI+" width={20} height={20} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.bucket} · {a.type.toUpperCase()} · {a.scope}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 text-right">
                      {a.conversationCount > 0 && <div><p className="text-sm font-semibold text-foreground">{a.conversationCount}</p><p className="text-[10px] text-muted-foreground">conversations</p></div>}
                      {a.resolutionRate !== "—" && <div><p className="text-sm font-semibold text-green-600">{a.resolutionRate}</p><p className="text-[10px] text-muted-foreground">resolution</p></div>}
                      {a.revenueImpact !== "—" && <div><p className="text-sm font-semibold text-foreground">{a.revenueImpact}</p><p className="text-[10px] text-muted-foreground">revenue</p></div>}
                    </div>
                    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">Active</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={metricDetail === "Hours Saved"} onOpenChange={closeMetricDetail}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl"><Clock className="h-6 w-6" /> Hours Saved</DialogTitle>
            <DialogDescription>Staff hours saved by AI agents handling tasks autonomously{metricPropertyFilter === "all" ? "" : ` at ${metricPropertyFilter}`} — calculated from actual agent activity this period.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Property:</span>
            <Select value={metricPropertyFilter} onValueChange={(v) => setMetricPropertyFilter(v as PropertyKey)}>
              <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {PROPERTIES_LIST.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4">
            <div className="mb-6 grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-xs font-medium text-muted-foreground">Total Hours Saved</p>
                <p className="mt-1 text-3xl font-bold tracking-tight">{hoursData.total}</p>
                <p className="mt-0.5 text-xs text-green-600">+42 hrs from last week</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-xs font-medium text-muted-foreground">FTE Equivalent</p>
                <p className="mt-1 text-2xl font-bold tracking-tight">{hoursData.fte}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">At 40 hrs/week</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-xs font-medium text-muted-foreground">Estimated Cost Savings</p>
                <p className="mt-1 text-2xl font-bold tracking-tight">{hoursData.costSavings}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">At $30/hr avg labor cost</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-xs font-medium text-muted-foreground">Projected Monthly</p>
                <p className="mt-1 text-2xl font-bold tracking-tight">{hoursData.projectedMonthly}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{hoursData.projectedSavings} in savings</p>
              </div>
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weekly Hours Saved Trend</p>
            <TrendChart data={hoursData.trend} color="hsl(221.2, 83.2%, 53.3%)" format={(v) => `${v} hrs`} />
            <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hours Saved by Category</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursData.breakdown} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} className="text-muted-foreground" width={120} />
                  <Tooltip formatter={(v: number) => [`${v} hrs`, ""]} />
                  <Bar dataKey="hours" fill="hsl(221.2, 83.2%, 53.3%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 rounded-lg border border-border p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Calculation Details</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-xs text-muted-foreground"><th className="pb-2 text-left font-medium">Task Category</th><th className="pb-2 text-left font-medium">Volume</th><th className="pb-2 text-left font-medium">Time per Task</th><th className="pb-2 text-left font-medium">Agent</th><th className="pb-2 text-right font-medium">Hours Saved</th></tr></thead>
                  <tbody className="divide-y divide-border/50">
                    {hoursData.table.map((row) => (
                      <tr key={row.task}><td className="py-2 text-foreground">{row.task}</td><td className="py-2 text-muted-foreground">{row.volume}</td><td className="py-2 text-muted-foreground">{row.time}</td><td className="py-2 text-muted-foreground">{row.agent}</td><td className="py-2 text-right font-medium text-foreground">{row.hours}</td></tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="border-t border-border font-semibold"><td className="pt-2 text-foreground" colSpan={4}>Total</td><td className="pt-2 text-right text-foreground">{hoursData.total}</td></tr></tfoot>
                </table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={metricDetail === "Tours Scheduled"} onOpenChange={closeMetricDetail}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl"><CalendarCheck className="h-6 w-6" /> Tours Scheduled</DialogTitle>
            <DialogDescription>Tours scheduled autonomously by Leasing AI{metricPropertyFilter === "all" ? " across all properties" : ` at ${metricPropertyFilter}`}.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Property:</span>
            <Select value={metricPropertyFilter} onValueChange={(v) => setMetricPropertyFilter(v as PropertyKey)}>
              <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {PROPERTIES_LIST.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4">
            {toursData.alert && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-sm font-semibold text-red-800 dark:text-red-200">{toursData.alert.title}</p>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">{toursData.alert.body}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href="/agent-roster?agent=1" className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700">
                        Review Leasing AI Settings <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <Link href="/performance" className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                        View Lead Sources
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="mb-6 grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Total Tours</p><p className="mt-1 text-3xl font-bold tracking-tight">{toursData.total}</p><p className={cn("mt-0.5 text-xs", toursData.trendVariant === "positive" ? "text-green-600" : "text-red-600")}>{toursData.trendText}</p></div>
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Show Rate</p><p className="mt-1 text-2xl font-bold tracking-tight">{toursData.showRate}</p><p className={cn("mt-0.5 text-xs", toursData.showRateVariant === "positive" ? "text-green-600" : "text-red-600")}>{toursData.showRateTrend}</p></div>
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Tour-to-Lease</p><p className="mt-1 text-2xl font-bold tracking-tight">{toursData.tourToLease}</p><p className={cn("mt-0.5 text-xs", toursData.tourToLeaseVariant === "positive" ? "text-green-600" : "text-red-600")}>{toursData.tourToLeaseTrend}</p></div>
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Avg Booking Time</p><p className="mt-1 text-2xl font-bold tracking-tight">{toursData.avgBooking}</p><p className="mt-0.5 text-xs text-muted-foreground">vs 18 min manual</p></div>
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">8-Week Trend</p>
            <TrendChart data={toursData.trend} color="hsl(221.2, 83.2%, 53.3%)" />
            {metricPropertyFilter === "all" && (
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { name: "Property A", tours: 52, show: "82%", conv: "38%", variant: "positive" as const },
                  { name: "Property B", tours: 41, show: "76%", conv: "32%", variant: "positive" as const },
                  { name: "Property C", tours: 31, show: "74%", conv: "29%", variant: "negative" as const },
                ].map((p) => (
                  <div key={p.name} className={cn("rounded-lg border p-4", p.variant === "negative" ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20" : "border-border")}>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    {p.variant === "negative" && <p className="mt-0.5 text-[10px] font-semibold text-red-600">Needs attention</p>}
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Tours</span><span className="font-medium text-foreground">{p.tours}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Show rate</span><span className="font-medium text-foreground">{p.show}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Conversion</span><span className="font-medium text-foreground">{p.conv}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={metricDetail === "Leases Signed"} onOpenChange={closeMetricDetail}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl"><FileSignature className="h-6 w-6" /> Leases Signed</DialogTitle>
            <DialogDescription>Leases signed with AI-assisted lead nurturing{metricPropertyFilter === "all" ? "" : ` at ${metricPropertyFilter}`}.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Property:</span>
            <Select value={metricPropertyFilter} onValueChange={(v) => setMetricPropertyFilter(v as PropertyKey)}>
              <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {PROPERTIES_LIST.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4">
            <div className="mb-6 grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Leases Signed</p><p className="mt-1 text-3xl font-bold tracking-tight">{leasesData.total}</p><p className={cn("mt-0.5 text-xs", leasesData.trendVariant === "positive" ? "text-green-600" : "text-red-600")}>{leasesData.trendText}</p></div>
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Avg Time to Lease</p><p className="mt-1 text-2xl font-bold tracking-tight">{leasesData.avgTime}</p><p className="mt-0.5 text-xs text-green-600">{leasesData.avgTimeTrend}</p></div>
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Revenue from New Leases</p><p className="mt-1 text-2xl font-bold tracking-tight">{leasesData.revenue}</p><p className="mt-0.5 text-xs text-muted-foreground">Avg {leasesData.avgCommission} commission</p></div>
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Lead-to-Lease Rate</p><p className="mt-1 text-2xl font-bold tracking-tight">{leasesData.leadToLease}</p><p className={cn("mt-0.5 text-xs", leasesData.leadToLeaseVariant === "positive" ? "text-green-600" : "text-red-600")}>{leasesData.leadToLeaseTrend}</p></div>
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">8-Week Trend</p>
            <TrendChart data={leasesData.trend} color="hsl(262, 83.3%, 57.8%)" />
            {metricPropertyFilter === "all" && (
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { name: "Property A", leases: 16, avgRent: "$1,850", time: "2.8 days", variant: "positive" as const },
                  { name: "Property B", leases: 12, avgRent: "$1,720", time: "3.4 days", variant: "positive" as const },
                  { name: "Property C", leases: 9, avgRent: "$1,640", time: "3.6 days", variant: "negative" as const },
                ].map((p) => (
                  <div key={p.name} className={cn("rounded-lg border p-4", p.variant === "negative" ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20" : "border-border")}>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    {p.variant === "negative" && <p className="mt-0.5 text-[10px] font-semibold text-red-600">Flat growth</p>}
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Leases</span><span className="font-medium text-foreground">{p.leases}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Avg rent</span><span className="font-medium text-foreground">{p.avgRent}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Time to lease</span><span className="font-medium text-foreground">{p.time}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={metricDetail === "Renewals Generated"} onOpenChange={closeMetricDetail}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl"><RefreshCw className="h-6 w-6" /> Renewals Generated</DialogTitle>
            <DialogDescription>Renewal offers generated, sent, and accepted through Renewal AI{metricPropertyFilter === "all" ? "" : ` at ${metricPropertyFilter}`}.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Property:</span>
            <Select value={metricPropertyFilter} onValueChange={(v) => setMetricPropertyFilter(v as PropertyKey)}>
              <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {PROPERTIES_LIST.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4">
            <div className="mb-6 grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Renewals Generated</p><p className="mt-1 text-3xl font-bold tracking-tight">{renewalsData.total}</p><p className={cn("mt-0.5 text-xs", renewalsData.trendVariant === "positive" ? "text-green-600" : "text-red-600")}>{renewalsData.retentionRate} retention rate</p></div>
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Accepted</p><p className="mt-1 text-2xl font-bold tracking-tight">{renewalsData.accepted}</p><p className="mt-0.5 text-xs text-muted-foreground">{renewalsData.acceptanceRate} acceptance rate</p></div>
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Avg Rent Increase</p><p className="mt-1 text-2xl font-bold tracking-tight">{renewalsData.avgIncrease}</p><p className="mt-0.5 text-xs text-green-600">{renewalsData.avgIncreasePct} avg increase</p></div>
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Annual Revenue Uplift</p><p className="mt-1 text-2xl font-bold tracking-tight">{renewalsData.annualUplift}</p><p className="mt-0.5 text-xs text-muted-foreground">From accepted renewals</p></div>
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">8-Week Trend</p>
            <TrendChart data={renewalsData.trend} color="hsl(24.6, 95%, 53.1%)" />
            {metricPropertyFilter === "all" && (
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { name: "Property A", sent: 12, accepted: 10, avgIncrease: "$310", variant: "positive" as const },
                  { name: "Property B", sent: 9, accepted: 7, avgIncrease: "$275", variant: "positive" as const },
                  { name: "Property C", sent: 7, accepted: 5, avgIncrease: "$268", variant: "negative" as const },
                ].map((p) => (
                  <div key={p.name} className={cn("rounded-lg border p-4", p.variant === "negative" ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20" : "border-border")}>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    {p.variant === "negative" && <p className="mt-0.5 text-[10px] font-semibold text-red-600">Below target retention</p>}
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Offers sent</span><span className="font-medium text-foreground">{p.sent}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Accepted</span><span className="font-medium text-foreground">{p.accepted}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Avg increase</span><span className="font-medium text-foreground">{p.avgIncrease}/mo</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={metricDetail === "Rent Collected"} onOpenChange={closeMetricDetail}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl"><DollarSign className="h-6 w-6" /> Rent Collected</DialogTitle>
            <DialogDescription>Rent collected through AI-assisted payment reminders{metricPropertyFilter === "all" ? "" : ` at ${metricPropertyFilter}`}.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Property:</span>
            <Select value={metricPropertyFilter} onValueChange={(v) => setMetricPropertyFilter(v as PropertyKey)}>
              <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {PROPERTIES_LIST.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4">
            {rentData.alert && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-sm font-semibold text-red-800 dark:text-red-200">{rentData.alert.title}</p>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">{rentData.alert.body}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href="/agent-roster?agent=2" className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700">
                        Review Payments AI Settings <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <Link href="/escalations" className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                        View Delinquent Accounts
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="mb-6 grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Total Collected</p><p className="mt-1 text-3xl font-bold tracking-tight">{rentData.collected}</p><p className={cn("mt-0.5 text-xs", rentData.collectionRateVariant === "positive" ? "text-green-600" : "text-red-600")}>{rentData.collectionRate} collection rate</p></div>
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Auto-Pay Enrolled</p><p className="mt-1 text-2xl font-bold tracking-tight">{rentData.autoPay}</p><p className="mt-0.5 text-xs text-green-600">{rentData.autoPayTrend}</p></div>
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Late Fees Recovered</p><p className="mt-1 text-2xl font-bold tracking-tight">{rentData.lateFeesRecovered}</p><p className="mt-0.5 text-xs text-muted-foreground">Via automated follow-ups</p></div>
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Delinquency Rate</p><p className="mt-1 text-2xl font-bold tracking-tight">{rentData.delinquencyRate}</p><p className={cn("mt-0.5 text-xs", rentData.delinquencyVariant === "positive" ? "text-green-600" : "text-red-600")}>{rentData.delinquencyTrend}</p></div>
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">8-Week Collection Trend</p>
            <TrendChart data={rentData.trend} color="hsl(142.1, 76.2%, 36.3%)" format={(v) => `$${(v / 1000).toFixed(0)}K`} />
            {metricPropertyFilter === "all" && (
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { name: "Property A", collected: "$92K", rate: "98.1%", delinquent: "1.9%", variant: "positive" as const },
                  { name: "Property B", collected: "$74K", rate: "97.4%", delinquent: "2.6%", variant: "positive" as const },
                  { name: "Property C", collected: "$52K", rate: "95.8%", delinquent: "4.2%", variant: "negative" as const },
                ].map((p) => (
                  <div key={p.name} className={cn("rounded-lg border p-4", p.variant === "negative" ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20" : "border-border")}>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    {p.variant === "negative" && <p className="mt-0.5 text-[10px] font-semibold text-red-600">High delinquency — needs attention</p>}
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Collected</span><span className="font-medium text-foreground">{p.collected}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Collection rate</span><span className={cn("font-medium", p.variant === "positive" ? "text-green-600" : "text-red-600")}>{p.rate}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Delinquency</span><span className={cn("font-medium", p.variant === "negative" ? "text-red-600" : "text-foreground")}>{p.delinquent}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={metricDetail === "Conversations Handled"} onOpenChange={closeMetricDetail}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl"><MessageSquare className="h-6 w-6" /> Conversations Handled</DialogTitle>
            <DialogDescription>Total conversations handled autonomously by AI agents{metricPropertyFilter === "all" ? " across all channels" : ` at ${metricPropertyFilter}`}.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Property:</span>
            <Select value={metricPropertyFilter} onValueChange={(v) => setMetricPropertyFilter(v as PropertyKey)}>
              <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {PROPERTIES_LIST.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4">
            <div className="mb-6 grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Total Conversations</p><p className="mt-1 text-3xl font-bold tracking-tight">{convoData.total}</p><p className={cn("mt-0.5 text-xs", convoData.trendVariant === "positive" ? "text-green-600" : "text-red-600")}>{convoData.trendText}</p></div>
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Fully Resolved by AI</p><p className="mt-1 text-2xl font-bold tracking-tight">{convoData.resolved}</p><p className="mt-0.5 text-xs text-muted-foreground">Without human escalation</p></div>
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Avg Response Time</p><p className="mt-1 text-2xl font-bold tracking-tight">{convoData.avgResponse}</p><p className="mt-0.5 text-xs text-muted-foreground">vs 47 min for staff</p></div>
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Satisfaction Score</p><p className="mt-1 text-2xl font-bold tracking-tight">{convoData.satisfaction}</p><p className="mt-0.5 text-xs text-green-600">{convoData.satisfactionTrend}</p></div>
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">8-Week Trend</p>
            <TrendChart data={convoData.trend} color="hsl(221.2, 83.2%, 53.3%)" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">By Agent</p>
                <ul className="space-y-2">
                  {convoData.byAgent.map((a) => (
                    <li key={a.name} className="flex items-center justify-between rounded-md border border-border/50 bg-muted/10 p-2.5">
                      <span className="flex items-center gap-2"><Image src="/eli-plus-cube.svg" alt="" width={14} height={14} /><span className="text-sm text-foreground">{a.name}</span></span>
                      <span className="text-sm"><span className="font-medium text-foreground">{a.count}</span> <span className="text-xs text-muted-foreground">({a.pct}) · {a.res} resolved</span></span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">By Channel</p>
                <ul className="space-y-2">
                  {convoData.byChannel.map((c) => (
                    <li key={c.channel} className="flex items-center justify-between rounded-md border border-border/50 bg-muted/10 p-2.5">
                      <span className="text-sm text-foreground">{c.channel}</span>
                      <span className="text-sm"><span className="font-medium text-foreground">{c.count}</span> <span className="text-xs text-muted-foreground">({c.pct})</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* HIDDEN: Effective Capacity detail dialog — uncomment to restore
      <Dialog open={metricDetail === "Effective Capacity"} onOpenChange={(o) => !o && setMetricDetail(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl"><Gauge className="h-6 w-6" /> Effective Capacity</DialogTitle>
            <DialogDescription>Combined workforce capacity from human staff and AI agents, measured in full-time equivalents (FTE).</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="mb-6 grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Total Capacity</p><p className="mt-1 text-3xl font-bold tracking-tight">12.2 FTE</p><p className="mt-0.5 text-xs text-green-600">+0.5 FTE from last week</p></div>
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Human Staff</p><p className="mt-1 text-2xl font-bold tracking-tight">{humanMembers.length}.0 FTE</p><p className="mt-0.5 text-xs text-muted-foreground">{humanMembers.length} team members</p></div>
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">AI Agent Capacity</p><p className="mt-1 text-2xl font-bold tracking-tight">8.2 FTE</p><p className="mt-0.5 text-xs text-muted-foreground">4 agents running 24/7</p></div>
              <div className="rounded-lg border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">Capacity Multiplier</p><p className="mt-1 text-2xl font-bold tracking-tight">{(12.2 / humanMembers.length).toFixed(1)}x</p><p className="mt-0.5 text-xs text-green-600">AI amplifies your team</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Human Staff</p>
                <ul className="space-y-2.5">
                  {humanMembers.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 rounded-md border border-border/50 bg-muted/10 p-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                        {m.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">1.0 FTE</p>
                        <p className="text-[10px] text-muted-foreground">40 hrs/week</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex justify-between rounded-md bg-muted/30 p-2.5 text-sm font-semibold">
                  <span className="text-muted-foreground">Staff Subtotal</span>
                  <span className="text-foreground">{humanMembers.length}.0 FTE</span>
                </div>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Agents</p>
                <ul className="space-y-2.5">
                  {[
                    { name: "Leasing AI", hours: "24/7 availability", fte: "3.2", weekly: "128 hrs/week", tasks: "Tours, applications, lease signing" },
                    { name: "Payments AI", hours: "24/7 availability", fte: "2.4", weekly: "96 hrs/week", tasks: "Collections, follow-ups, processing" },
                    { name: "Renewal AI", hours: "24/7 availability", fte: "1.8", weekly: "72 hrs/week", tasks: "Offers, negotiations, execution" },
                    { name: "Compliance Agent", hours: "Business hours", fte: "0.8", weekly: "32 hrs/week", tasks: "Policy, fair housing, screening" },
                  ].map((a) => (
                    <li key={a.name} className="rounded-md border border-border/50 bg-muted/10 p-2.5">
                      <div className="flex items-center gap-3">
                        <Image src="/eli-plus-cube.svg" alt="" width={16} height={16} className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.tasks}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">{a.fte} FTE</p>
                          <p className="text-[10px] text-muted-foreground">{a.weekly}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex justify-between rounded-md bg-muted/30 p-2.5 text-sm font-semibold">
                  <span className="text-muted-foreground">AI Subtotal</span>
                  <span className="text-foreground">8.2 FTE</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      */}

      <EscalationDetailSheet
        item={selectedEscalation}
        open={!!selectedEscalationId}
        onOpenChange={(o) => !o && setSelectedEscalationId(null)}
      />

      <ConversationDetailSheet
        conversation={
          selectedConversationId
            ? liveConversations.find((c) => c.id === selectedConversationId) ?? null
            : null
        }
        open={!!selectedConversationId}
        onOpenChange={(o) => !o && setSelectedConversationId(null)}
      />
    </>
  );
}
