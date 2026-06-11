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
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  Loader2,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------------
// Static config — illustrative prototype data
// -----------------------------------------------------------------------------

const PROPERTIES = [
  "Cedar Hills",
  "Hillside Living",
  "Jamison Apartments",
  "Lakewood",
  "Maple Court",
  "Oak Terrace",
  "Parkview Flats",
  "Pine Valley",
  "Summit Ridge",
  "The Beacon",
] as const;
type Property = (typeof PROPERTIES)[number];

const REMINDER_CHANNELS = ["SMS", "Email", "Phone", "In-Person"] as const;
type ReminderChannel = (typeof REMINDER_CHANNELS)[number];

const LANGUAGES = ["English", "Spanish", "Other"] as const;
type Language = (typeof LANGUAGES)[number];

const PAYMENT_TYPES = ["ACH", "Credit Card", "Debit Card", "Money Order"] as const;
type PaymentType = (typeof PAYMENT_TYPES)[number];

const CHANNEL_COLORS: Record<ReminderChannel, string> = {
  SMS: "#a855f7",
  Email: "#0ea5e9",
  Phone: "#f97316",
  "In-Person": "#22c55e",
};

const LANGUAGE_COLORS: Record<Language, string> = {
  English: "#0f172a",
  Spanish: "#64748b",
  Other: "#cbd5e1",
};

const PERIOD_OPTIONS = [
  { id: "3m", label: "Last 3 Months", months: 3 },
  { id: "6m", label: "Last 6 Months", months: 6 },
  { id: "12m", label: "Last 12 Months", months: 12 },
  { id: "2y", label: "Last 2 Years", months: 24 },
  { id: "3y", label: "Last 3 Years", months: 36 },
  { id: "all", label: "All Time", months: 48 },
] as const;
type PeriodId = (typeof PERIOD_OPTIONS)[number]["id"] | "custom";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface FilterState {
  periodId: PeriodId;
  customFrom: string;
  customTo: string;
  properties: Set<string>;
  channels: Set<string>;
  languages: Set<string>;
  paymentTypes: Set<string>;
}

interface PeriodScaledMetrics {
  // Section 1 — Overall Payment Performance
  totalOrganizations: number;
  totalOrganizationsDelta: number;
  totalProperties: number;
  totalPropertiesDelta: number;
  totalActiveUnits: number;
  totalActiveUnitsDelta: number;
  pctRentCollected: number;
  pctRentCollectedDelta: number;
  rentPayments: number;
  rentCharges: number;
  latePayersTrend: { label: string; value: number }[];
  topCollected: { property: string; value: number }[];
  bottomCollected: { property: string; value: number }[];

  // Section 2 — Payments AI Impact
  savingsOfficeHours: number;
  savingsOfficeHoursDelta: number;
  avgLatePayers: number;
  totalRemindersSent: number;
  totalRemindersDeltaPct: number;
  fullyAutomatedPct: number;
  fullyAutomatedDeltaPts: number;
  savingsDetail: { property: string; value: string }[];
  monthlyCollectionTrend: { month: string; baseline: number; current: number }[];

  // Section 3 — Messaging Analysis
  residentsNoPhone: number;
  phoneOptOuts: number;
  emailOptOuts: number;
  officeEscalationReasons: { reason: string; count: number }[];
  languagePreference: { name: Language; value: number; count: number }[];
  remindersByChannel: { channel: ReminderChannel; count: number }[];
}

// -----------------------------------------------------------------------------
// Mock data generator (period-aware)
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

const BASE_3Y = {
  totalOrganizations: 98,
  totalProperties: 842,
  totalActiveUnits: 34_120,
  pctRentCollected: 94.2,
  rentPayments: 2_400_000,
  rentCharges: 2_540_000,
  savingsOfficeHours: 127_840,
  avgLatePayers: 142,
  totalRemindersSent: 42_180,
  fullyAutomatedPct: 89,
  residentsNoPhone: 1842,
  phoneOptOutsPct: 3.2,
  emailOptOutsPct: 1.8,
} as const;

function buildMetricsForPeriod(months: number, filters: FilterState): PeriodScaledMetrics {
  const scale = months / 36;
  const propertyScale =
    filters.properties.size === 0 ? 0 : filters.properties.size / PROPERTIES.length;
  const channelScale =
    filters.channels.size === 0 ? 0 : filters.channels.size / REMINDER_CHANNELS.length;
  const languageScale =
    filters.languages.size === 0 ? 0 : filters.languages.size / LANGUAGES.length;

  const adjusted = Math.max(0.01, scale * propertyScale);
  const reminderAdjusted = Math.max(0.01, adjusted * channelScale * languageScale);

  const scaleInt = (n: number) => Math.max(0, Math.round(n * adjusted));
  const scaleReminderInt = (n: number) => Math.max(0, Math.round(n * reminderAdjusted));
  const scalePct = (n: number) =>
    Math.max(0, +(n * (0.9 + 0.1 * propertyScale)).toFixed(1));

  // Late payers — 12-month trend (always shown as monthly bars)
  const latePayersTrend = (() => {
    const rand = seedRand(401 + months);
    const data: { label: string; value: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const dateRef = new Date();
      dateRef.setMonth(dateRef.getMonth() - (11 - i));
      const label = MONTH_LABELS[dateRef.getMonth()];
      const base = 180 + Math.sin(i * 0.7) * 30 + rand() * 18;
      data.push({ label, value: Math.round(base * (0.6 + 0.4 * propertyScale)) });
    }
    return data;
  })();

  // Top / Bottom 10 — use static list, filtered to selected properties + scale by propertyScale
  const TOP_PROPS = [
    { property: "Summit Ridge", value: 98.4 },
    { property: "Hillside Living", value: 97.2 },
    { property: "The Beacon", value: 96.8 },
    { property: "Parkview Flats", value: 96.1 },
    { property: "Jamison Apts", value: 95.8 },
  ];
  const BOTTOM_PROPS = [
    { property: "Lakewood", value: 88.2 },
    { property: "Maple Court", value: 89.1 },
    { property: "Cedar Hills", value: 90.4 },
    { property: "Pine Valley", value: 91.2 },
    { property: "Oak Terrace", value: 91.8 },
  ];

  // Monthly collection trend
  const monthlyCollectionTrend = (() => {
    const data: PeriodScaledMetrics["monthlyCollectionTrend"] = [];
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const dateRef = new Date();
      dateRef.setMonth(dateRef.getMonth() - (11 - i));
      const label = MONTH_LABELS[dateRef.getMonth()];
      data.push({
        month: label,
        baseline: +(89 + (i % 3) * 0.3).toFixed(1),
        current: +(89 + 5.5 * t + Math.sin(t * Math.PI) * 0.6).toFixed(1),
      });
    }
    return data;
  })();

  // Office escalation reasons
  const officeEscalationReasons = [
    { reason: "Late Payment Settlement", count: scaleInt(286) },
    { reason: "Balance Breakdown", count: scaleInt(198) },
    { reason: "Ask to Contact", count: scaleInt(142) },
    { reason: "Other", count: scaleInt(98) },
    { reason: "General Info", count: scaleInt(86) },
    { reason: "Payment Assistance", count: scaleInt(72) },
    { reason: "Maintenance", count: scaleInt(48) },
    { reason: "Technical Problems", count: scaleInt(32) },
  ];

  const languagePreference: PeriodScaledMetrics["languagePreference"] = [
    { name: "English", value: 84, count: scaleReminderInt(35_431) },
    { name: "Spanish", value: 14, count: scaleReminderInt(5_905) },
    { name: "Other", value: 2, count: scaleReminderInt(844) },
  ];

  const remindersByChannel: PeriodScaledMetrics["remindersByChannel"] = [
    { channel: "SMS", count: scaleReminderInt(28_240) },
    { channel: "Email", count: scaleReminderInt(11_420) },
    { channel: "Phone", count: scaleReminderInt(1_840) },
    { channel: "In-Person", count: scaleReminderInt(680) },
  ];

  const savingsDetail: PeriodScaledMetrics["savingsDetail"] = [
    { property: "Hillside Living", value: "$32,180" },
    { property: "Jamison Apartments", value: "$28,420" },
    { property: "The Beacon", value: "$24,120" },
    { property: "Parkview Flats", value: "$21,840" },
    { property: "Summit Ridge", value: "$21,280" },
  ];

  return {
    totalOrganizations: Math.max(1, Math.round(BASE_3Y.totalOrganizations * (0.65 + 0.35 * propertyScale))),
    totalOrganizationsDelta: 8,
    totalProperties: Math.max(0, Math.round(BASE_3Y.totalProperties * propertyScale)),
    totalPropertiesDelta: 62,
    totalActiveUnits: Math.round(BASE_3Y.totalActiveUnits * (0.6 + 0.4 * propertyScale)),
    totalActiveUnitsDelta: 1840,
    pctRentCollected: scalePct(BASE_3Y.pctRentCollected),
    pctRentCollectedDelta: 2.1,
    rentPayments: Math.round(BASE_3Y.rentPayments * adjusted),
    rentCharges: Math.round(BASE_3Y.rentCharges * adjusted),
    latePayersTrend,
    topCollected: TOP_PROPS,
    bottomCollected: BOTTOM_PROPS,

    savingsOfficeHours: Math.round(BASE_3Y.savingsOfficeHours * adjusted),
    savingsOfficeHoursDelta: 18000,
    avgLatePayers: BASE_3Y.avgLatePayers,
    totalRemindersSent: scaleReminderInt(BASE_3Y.totalRemindersSent),
    totalRemindersDeltaPct: 12,
    fullyAutomatedPct: BASE_3Y.fullyAutomatedPct,
    fullyAutomatedDeltaPts: 4,
    savingsDetail,
    monthlyCollectionTrend,

    residentsNoPhone: scaleInt(BASE_3Y.residentsNoPhone),
    phoneOptOuts: BASE_3Y.phoneOptOutsPct,
    emailOptOuts: BASE_3Y.emailOptOutsPct,
    officeEscalationReasons,
    languagePreference,
    remindersByChannel,
  };
}

// -----------------------------------------------------------------------------
// Mock detail rows — Late payer detail table
// -----------------------------------------------------------------------------

interface LatePayerRow {
  resident: string;
  property: string;
  unit: string;
  balance: string;
  daysLate: number;
  status: "Reminder Sent" | "Promise to Pay" | "Escalated" | "Resolved";
  channel: ReminderChannel;
  language: Language;
  lastContact: string;
}

const STATUS_BADGE: Record<LatePayerRow["status"], string> = {
  "Reminder Sent": "bg-sky-50 text-sky-700 ring-sky-200",
  "Promise to Pay": "bg-amber-50 text-amber-700 ring-amber-200",
  Escalated: "bg-rose-50 text-rose-700 ring-rose-200",
  Resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const LATE_PAYER_ROWS: LatePayerRow[] = [
  {
    resident: "Aisha Patel",
    property: "Hillside Living",
    unit: "A-204",
    balance: "$1,420",
    daysLate: 6,
    status: "Promise to Pay",
    channel: "SMS",
    language: "English",
    lastContact: "2026-06-09 14:12",
  },
  {
    resident: "Carlos Mendoza",
    property: "Jamison Apartments",
    unit: "B-118",
    balance: "$1,180",
    daysLate: 4,
    status: "Reminder Sent",
    channel: "SMS",
    language: "Spanish",
    lastContact: "2026-06-10 09:08",
  },
  {
    resident: "Daniel Hong",
    property: "The Beacon",
    unit: "C-302",
    balance: "$1,640",
    daysLate: 9,
    status: "Escalated",
    channel: "Email",
    language: "English",
    lastContact: "2026-06-08 18:42",
  },
  {
    resident: "Emily Carter",
    property: "Parkview Flats",
    unit: "D-410",
    balance: "$1,260",
    daysLate: 3,
    status: "Reminder Sent",
    channel: "SMS",
    language: "English",
    lastContact: "2026-06-10 11:20",
  },
  {
    resident: "Fatima Rahman",
    property: "Summit Ridge",
    unit: "E-509",
    balance: "$1,540",
    daysLate: 5,
    status: "Promise to Pay",
    channel: "SMS",
    language: "Other",
    lastContact: "2026-06-09 16:55",
  },
  {
    resident: "Greg Lawson",
    property: "Lakewood",
    unit: "F-603",
    balance: "$1,820",
    daysLate: 12,
    status: "Escalated",
    channel: "Phone",
    language: "English",
    lastContact: "2026-06-07 10:14",
  },
  {
    resident: "Hannah Kim",
    property: "Cedar Hills",
    unit: "G-712",
    balance: "$1,340",
    daysLate: 2,
    status: "Resolved",
    channel: "Email",
    language: "English",
    lastContact: "2026-06-10 13:00",
  },
  {
    resident: "Isabel Romero",
    property: "Oak Terrace",
    unit: "H-805",
    balance: "$1,720",
    daysLate: 8,
    status: "Promise to Pay",
    channel: "SMS",
    language: "Spanish",
    lastContact: "2026-06-08 12:35",
  },
];

// -----------------------------------------------------------------------------
// Atomic UI
// -----------------------------------------------------------------------------

type Tone = "positive" | "negative" | "neutral";

function DeltaPill({ value, tone }: { value: string; tone: Tone }) {
  const Icon = tone === "negative" ? ArrowDownRight : ArrowUpRight;
  const cls =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-rose-600"
        : "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", cls)}>
      <Icon className="h-3 w-3" />
      {value}
    </span>
  );
}

function KpiCard({
  label,
  value,
  delta,
  deltaTone = "positive",
  sub,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: Tone;
  sub?: string;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="px-4 py-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {delta && <DeltaPill value={delta} tone={deltaTone} />}
        </div>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SectionBanner({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3 rounded-md bg-muted/60 px-4 py-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

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

function formatCurrencyCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// -----------------------------------------------------------------------------
// Filter UI — Period picker + multi-select
// -----------------------------------------------------------------------------

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  width = "11rem",
  searchable = false,
}: {
  label: string;
  options: readonly string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  width?: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allSelected = selected.size === options.length;
  const buttonLabel = allSelected
    ? "All"
    : selected.size === 0
      ? "None"
      : `${selected.size} selected`;

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(o: string) {
    const next = new Set(selected);
    if (next.has(o)) next.delete(o);
    else next.add(o);
    onChange(next);
  }

  function toggleAll() {
    onChange(allSelected ? new Set() : new Set(options));
  }

  return (
    <div className="relative" style={{ minWidth: width }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
      >
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-semibold text-foreground">{buttonLabel}</span>
        <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-[18rem] rounded-md border border-border bg-popover p-2 shadow-lg">
            {searchable && (
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  className="w-full rounded-md border border-border bg-background pl-7 pr-2 py-1.5 text-sm"
                />
              </div>
            )}
            <div className="max-h-[18rem] overflow-y-auto">
              <label className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm font-medium">All</span>
              </label>
              {filtered.map((o) => (
                <label
                  key={o}
                  className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(o)}
                    onChange={() => toggle(o)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm">{o}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PeriodPicker({
  state,
  setState,
}: {
  state: FilterState;
  setState: (s: FilterState) => void;
}) {
  const [open, setOpen] = useState(false);
  const label =
    state.periodId === "custom"
      ? "Custom Range"
      : (PERIOD_OPTIONS.find((p) => p.id === state.periodId)?.label ?? "Last 12 Months");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm",
          open ? "border-amber-400 ring-1 ring-amber-200" : "border-border",
        )}
      >
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Period:</span>
        <span className="font-semibold text-foreground">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-[16rem] rounded-md border border-border bg-popover p-1 shadow-lg">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setState({ ...state, periodId: opt.id });
                  setOpen(false);
                }}
                className={cn(
                  "block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted",
                  state.periodId === opt.id && "bg-muted font-medium",
                )}
              >
                {opt.label}
              </button>
            ))}
            <div className="mt-1 border-t border-border pt-2">
              <label className="flex items-center gap-2 px-3 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={state.periodId === "custom"}
                  onChange={(e) =>
                    setState({
                      ...state,
                      periodId: e.target.checked ? "custom" : "12m",
                    })
                  }
                  className="h-4 w-4 rounded border-border"
                />
                Custom Range
              </label>
              {state.periodId === "custom" && (
                <div className="space-y-2 px-3 pb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="month"
                      value={state.customFrom}
                      onChange={(e) =>
                        setState({ ...state, customFrom: e.target.value })
                      }
                      className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="month"
                      value={state.customTo}
                      onChange={(e) =>
                        setState({ ...state, customTo: e.target.value })
                      }
                      className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="w-full rounded-md bg-foreground py-1.5 text-xs font-medium text-background hover:bg-foreground/90"
                  >
                    Apply Custom Range
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

function serializeFilters(f: FilterState) {
  return {
    periodId: f.periodId,
    customFrom: f.customFrom,
    customTo: f.customTo,
    properties: Array.from(f.properties).sort(),
    channels: Array.from(f.channels).sort(),
    languages: Array.from(f.languages).sort(),
    paymentTypes: Array.from(f.paymentTypes).sort(),
  };
}

export default function PaymentsAiDashboardPage() {
  const [filters, setFilters] = useState<FilterState>({
    periodId: "12m",
    customFrom: "2025-06",
    customTo: "2026-05",
    properties: new Set(PROPERTIES),
    channels: new Set(REMINDER_CHANNELS),
    languages: new Set(LANGUAGES),
    paymentTypes: new Set(PAYMENT_TYPES),
  });
  const [loading, setLoading] = useState(false);
  const filtersKey = useMemo(
    () => JSON.stringify(serializeFilters(filters)),
    [filters],
  );
  const isFirstRender = useRef(true);

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
    if (filters.periodId === "custom") return 12;
    return PERIOD_OPTIONS.find((p) => p.id === filters.periodId)?.months ?? 12;
  }, [filters.periodId]);

  const metrics = useMemo(
    () => buildMetricsForPeriod(months, filters),
    [months, filters],
  );

  return (
    <div className="-mt-2">
      <Link
        href="/performance"
        className="mb-4 inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Performance
      </Link>

      <header className="mb-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <img src="/eli-cube.svg" alt="" width={22} height={22} />
          ELI+ Payments AI — Performance & Impact
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ELI+ Payments agent performance, collection impact, and delinquency reduction — mirrors the Domo ELI+ | Payments AI report.
        </p>
      </header>

      {/* Sticky global filter bar */}
      <div className="sticky top-0 z-30 -mx-6 mb-5 border-b border-border bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker state={filters} setState={setFilters} />
          <MultiSelect
            label="Properties"
            options={PROPERTIES}
            selected={filters.properties}
            onChange={(s) => setFilters({ ...filters, properties: s })}
            searchable
            width="11rem"
          />
          <MultiSelect
            label="Reminder channel"
            options={REMINDER_CHANNELS}
            selected={filters.channels}
            onChange={(s) => setFilters({ ...filters, channels: s })}
            width="13rem"
          />
          <MultiSelect
            label="Language"
            options={LANGUAGES}
            selected={filters.languages}
            onChange={(s) => setFilters({ ...filters, languages: s })}
            width="11rem"
          />
          <MultiSelect
            label="Payment type"
            options={PAYMENT_TYPES}
            selected={filters.paymentTypes}
            onChange={(s) => setFilters({ ...filters, paymentTypes: s })}
            width="12rem"
          />
        </div>
      </div>

      {loading && <LoadingBanner />}

      {/* =========================================================== */}
      {/* Section 1 — Overall Payment Performance                     */}
      {/* =========================================================== */}
      <section className="mb-6">
        <SectionBanner
          title="Overall Payment Performance"
          description="Activation footprint, collections rate, and delinquency trend across the portfolio"
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)]">
          {/* Left: activation KPI stack */}
          <div className="grid gap-3">
            <KpiCard
              label="Total organizations"
              value={loading ? "…" : metrics.totalOrganizations.toLocaleString()}
              delta={`+${metrics.totalOrganizationsDelta}`}
              sub="activated on Payments AI"
            />
            <KpiCard
              label="Total properties"
              value={loading ? "…" : metrics.totalProperties.toLocaleString()}
              delta={`+${metrics.totalPropertiesDelta}`}
              sub="properties on platform"
            />
            <KpiCard
              label="Total active units"
              value={loading ? "…" : metrics.totalActiveUnits.toLocaleString()}
              delta={`+${metrics.totalActiveUnitsDelta.toLocaleString()}`}
              sub="units on platform"
            />
          </div>

          {/* Right: late payers trend chart */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Late Payers (After Grace Period) — Last 12 Months</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <ChartContainer
                  config={{ value: { label: "Late payers", color: "#0f172a" } }}
                  className="!aspect-auto h-[260px] w-full"
                >
                  <BarChart
                    data={metrics.latePayersTrend}
                    margin={{ left: 8, right: 12, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="#0f172a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top 10 — % Collected</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <PropertyBars data={metrics.topCollected} positive />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Bottom 10 — % Collected</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <PropertyBars data={metrics.bottomCollected} positive={false} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Rent Payments / Charges / % Collected</CardTitle>
              <p className="text-xs text-muted-foreground">
                Selected-period totals — payments collected vs total charges billed.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-border/60 bg-muted/40 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Payments collected
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                    {loading ? "…" : formatCurrencyCompact(metrics.rentPayments)}
                  </p>
                </div>
                <div className="rounded-md border border-border/60 bg-muted/40 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Total charges
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                    {loading ? "…" : formatCurrencyCompact(metrics.rentCharges)}
                  </p>
                </div>
                <div className="rounded-md border border-border/60 bg-muted/40 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    % collected
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="text-2xl font-bold tracking-tight text-foreground">
                      {loading ? "…" : `${metrics.pctRentCollected}%`}
                    </p>
                    <DeltaPill value={`+${metrics.pctRentCollectedDelta} pts`} tone="positive" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* =========================================================== */}
      {/* Section 2 — Payments AI Impact                              */}
      {/* =========================================================== */}
      <section className="mb-6">
        <SectionBanner
          title="Payments AI Impact"
          description="AI-specific collection lift, office-hours savings, and reminder automation"
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)]">
          <Card className="border-border/60 bg-gradient-to-br from-emerald-50 to-background">
            <CardContent className="px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                % of Rent Collected
              </p>
              <p className="mt-1 text-4xl font-bold tracking-tight text-foreground">
                {loading ? "…" : `${metrics.pctRentCollected}%`}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Last 30 days · +{metrics.pctRentCollectedDelta} pts vs prior period
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              label="Savings from office hours"
              value={loading ? "…" : formatCurrencyCompact(metrics.savingsOfficeHours)}
              delta={`+${formatCurrencyCompact(metrics.savingsOfficeHoursDelta)}`}
              deltaTone="positive"
              sub="estimated office savings"
            />
            <KpiCard
              label="Avg late payers / property"
              value={loading ? "…" : metrics.avgLatePayers.toLocaleString()}
              delta="-44"
              deltaTone="positive"
              sub="vs 186 baseline"
            />
            <KpiCard
              label="Total reminders sent"
              value={loading ? "…" : metrics.totalRemindersSent.toLocaleString()}
              delta={`+${metrics.totalRemindersDeltaPct}%`}
              deltaTone="positive"
              sub="SMS + email + phone"
            />
            <KpiCard
              label="Fully automated"
              value={loading ? "…" : `${metrics.fullyAutomatedPct}%`}
              delta={`+${metrics.fullyAutomatedDeltaPts} pts`}
              deltaTone="positive"
              sub="reminders without office handoff"
            />
          </div>
        </div>

        <div className="mt-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Monthly Trends — % of Rent Collected</CardTitle>
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
                    baseline: { label: "Pre-AI baseline", color: "#94a3b8" },
                    current: { label: "Current", color: "#0f172a" },
                  }}
                  className="!aspect-auto h-[240px] w-full"
                >
                  <LineChart
                    data={metrics.monthlyCollectionTrend}
                    margin={{ left: 8, right: 12, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={42}
                      domain={[85, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="baseline"
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="current"
                      stroke="#0f172a"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Savings from Office Hours — Details</CardTitle>
              <p className="text-xs text-muted-foreground">
                Estimated savings by property — based on reduced office-hour resident interactions.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Property
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        Estimated Savings
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.savingsDetail.map((row) => (
                      <tr key={row.property} className="border-t border-border/60">
                        <td className="px-3 py-2 text-foreground">{row.property}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* =========================================================== */}
      {/* Section 3 — Messaging Analysis                              */}
      {/* =========================================================== */}
      <section className="mb-6">
        <SectionBanner
          title="Messaging Analysis & Trends"
          description="Reminder volume, channel mix, opt-outs, and office escalation reasons"
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Residents with no phone"
            value={loading ? "…" : metrics.residentsNoPhone.toLocaleString()}
            sub="no phone on file"
          />
          <KpiCard
            label="Phone opt-outs"
            value={loading ? "…" : `${metrics.phoneOptOuts}%`}
            sub="opt-out rate"
          />
          <KpiCard
            label="Email opt-outs"
            value={loading ? "…" : `${metrics.emailOptOuts}%`}
            sub="opt-out rate"
          />
          <KpiCard
            label="Avg late payers / property"
            value={loading ? "…" : metrics.avgLatePayers.toLocaleString()}
            sub="portfolio average"
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)]">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Reminders Sent by Channel</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <ChannelDonut data={metrics.remindersByChannel} />
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Office Escalation Reasons</CardTitle>
              <p className="text-xs text-muted-foreground">
                Reasons residents escalated past the AI reminder workflow to office staff.
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <ChartContainer
                  config={{ count: { label: "Escalations", color: "#0f172a" } }}
                  className="!aspect-auto h-[260px] w-full"
                >
                  <BarChart
                    data={metrics.officeEscalationReasons}
                    margin={{ left: 8, right: 12, top: 8, bottom: 36 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="reason"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      fontSize={10}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={36}
                      tickFormatter={(v) => formatCompact(Number(v))}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Language Preference</CardTitle>
              <p className="text-xs text-muted-foreground">
                Resident-preferred language for collection reminders.
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <LanguageDonut data={metrics.languagePreference} />
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Late Payer Detail</CardTitle>
              <p className="text-xs text-muted-foreground">
                Residents past grace period — current status, balance, and last contact.
              </p>
            </CardHeader>
            <CardContent>
              <LatePayerTable rows={LATE_PAYER_ROWS} />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function PropertyBars({
  data,
  positive,
}: {
  data: { property: string; value: number }[];
  positive: boolean;
}) {
  const fill = positive ? "#0f172a" : "#94a3b8";
  return (
    <ChartContainer
      config={{ value: { label: "% collected", color: fill } }}
      className="!aspect-auto h-[220px] w-full"
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 8, right: 32, top: 8, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          domain={[80, 100]}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="property"
          tickLine={false}
          axisLine={false}
          width={130}
          fontSize={11}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => (
                <span className="font-mono tabular-nums">{value}%</span>
              )}
            />
          }
        />
        <Bar dataKey="value" fill={fill} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

function ChannelDonut({ data }: { data: { channel: ReminderChannel; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="h-[180px] w-[180px] shrink-0">
        <ChartContainer config={{}} className="!aspect-auto h-full w-full">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="channel"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={1}
            >
              {data.map((d) => (
                <Cell key={d.channel} fill={CHANNEL_COLORS[d.channel]} />
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
            <div key={d.channel} className="flex items-baseline gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: CHANNEL_COLORS[d.channel] }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{d.channel}</p>
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

function LanguageDonut({
  data,
}: {
  data: { name: Language; value: number; count: number }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="h-[180px] w-[180px] shrink-0">
        <ChartContainer config={{}} className="!aspect-auto h-full w-full">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={1}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={LANGUAGE_COLORS[d.name]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-3 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: LANGUAGE_COLORS[d.name] }}
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

function LatePayerTable({ rows }: { rows: LatePayerRow[] }) {
  const [statusFilter, setStatusFilter] = useState<Set<LatePayerRow["status"]>>(
    new Set(["Reminder Sent", "Promise to Pay", "Escalated", "Resolved"]),
  );
  const [sortKey, setSortKey] = useState<keyof LatePayerRow>("daysLate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: keyof LatePayerRow) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleStatus(s: LatePayerRow["status"]) {
    const next = new Set(statusFilter);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setStatusFilter(next);
  }

  const filtered = useMemo(() => {
    const arr = rows.filter((r) => statusFilter.has(r.status));
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === bv) return 0;
      return (av > bv ? 1 : -1) * (sortDir === "asc" ? 1 : -1);
    });
    return arr;
  }, [rows, statusFilter, sortKey, sortDir]);

  const COLS: { key: keyof LatePayerRow; label: string }[] = [
    { key: "resident", label: "Resident" },
    { key: "property", label: "Property" },
    { key: "unit", label: "Unit" },
    { key: "balance", label: "Balance" },
    { key: "daysLate", label: "Days Late" },
    { key: "status", label: "Status" },
    { key: "channel", label: "Channel" },
    { key: "language", label: "Language" },
    { key: "lastContact", label: "Last Contact" },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Status
        </p>
        {(["Reminder Sent", "Promise to Pay", "Escalated", "Resolved"] as const).map((s) => (
          <label key={s} className="inline-flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={statusFilter.has(s)}
              onChange={() => toggleStatus(s)}
              className="h-3.5 w-3.5 rounded border-border"
            />
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                STATUS_BADGE[s],
              )}
            >
              {s}
            </span>
          </label>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[860px] text-xs">
          <thead className="bg-muted/40">
            <tr>
              {COLS.map((col) => (
                <th
                  key={col.key}
                  className="cursor-pointer whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground hover:bg-muted/60"
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
            {filtered.map((r, i) => (
              <tr key={`${r.resident}-${i}`} className="border-t border-border/60 align-top">
                <td className="px-3 py-2 text-foreground">{r.resident}</td>
                <td className="px-3 py-2 text-foreground">{r.property}</td>
                <td className="px-3 py-2">{r.unit}</td>
                <td className="px-3 py-2 tabular-nums">{r.balance}</td>
                <td className="px-3 py-2 tabular-nums">{r.daysLate}</td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                      STATUS_BADGE[r.status],
                    )}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2">{r.channel}</td>
                <td className="px-3 py-2">{r.language}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                  {r.lastContact}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={COLS.length}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  No late payers match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
