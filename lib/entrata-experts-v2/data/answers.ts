import type {
  AssistantMessage,
  Artifact,
  Citation,
  LensId,
  TraceStep,
  Scope,
  Depth,
} from "../types";
import {
  propertiesForScope,
  type Property,
} from "./portfolio";
import { formatCurrency, formatPercent } from "../format";

interface IntentDef {
  id: string;
  label: string;
  lens: LensId;
  keywords: RegExp[];
  description: string;
}

export const INTENTS: IntentDef[] = [
  {
    id: "delinquency",
    label: "Why is delinquency up?",
    lens: "payments",
    keywords: [/delinqu/i, /past[-\s]?due/i, /collect/i, /unpaid rent/i, /arrears/i],
    description: "Residents behind on rent, by property and by aging bucket.",
  },
  {
    id: "occupancy",
    label: "What's our occupancy?",
    lens: "portfolio",
    keywords: [/occupanc/i, /vacant/i, /vacancy/i, /how full/i],
    description: "Current physical occupancy and 30-day trend.",
  },
  {
    id: "noi-variance",
    label: "Where are we vs. budget on NOI?",
    lens: "portfolio",
    keywords: [/noi/i, /net operating/i, /vs\.? budget/i, /variance/i, /underperform/i],
    description: "NOI per unit vs. underwriting / budget, with outliers.",
  },
  {
    id: "leasing-pace",
    label: "How is leasing pacing this week?",
    lens: "leasing",
    keywords: [/leas(e|ing)/i, /tour/i, /application/i, /apps this/i, /pace/i, /pipeline/i],
    description: "Apps, tours, and signed leases week-to-date.",
  },
  {
    id: "renewals",
    label: "How are renewals going?",
    lens: "renewals",
    keywords: [/renew/i, /retention/i, /lease end/i, /move[-\s]?out/i],
    description: "Renewal acceptance rate, mix, and rent growth on renewals.",
  },
  {
    id: "maintenance-status",
    label: "What's the work-order picture?",
    lens: "maintenance",
    keywords: [/work[-\s]?order/i, /maintenance/i, /mttr/i, /turn time/i, /repair/i, /service request/i],
    description: "Open work orders, MTTR, after-hours coverage, vendor mix.",
  },
  {
    id: "ap-anomaly",
    label: "Any AP / vendor anomalies this month?",
    lens: "accounting",
    keywords: [/invoice/i, /vendor/i, /ap /i, /accounts? payable/i, /gl /i, /general ledger/i, /budget variance/i],
    description: "Invoices flagged for review, vendor outliers, GL coding exceptions.",
  },
  {
    id: "online-pay",
    label: "How is online payment adoption?",
    lens: "payments",
    keywords: [/online pay/i, /ach adoption/i, /autopay/i, /pay portal/i],
    description: "Online payment adoption and offline payment risk.",
  },
  {
    id: "outliers",
    label: "Which properties need attention?",
    lens: "portfolio",
    keywords: [/outlier/i, /attention/i, /worst/i, /flag/i, /red/i, /problem/i],
    description: "Properties tripping at least one threshold across leasing, payments, or maintenance.",
  },
  {
    id: "weekend-summary",
    label: "What happened over the weekend?",
    lens: "auto",
    keywords: [/weekend/i, /overnight/i, /since friday/i, /this morning/i, /catch me up/i, /what.?s new/i],
    description: "Cross-lens digest of work done autonomously.",
  },
];

export function classifyIntent(prompt: string): IntentDef {
  const scored = INTENTS.map((i) => {
    const score = i.keywords.reduce((s, rx) => s + (rx.test(prompt) ? 1 : 0), 0);
    return { intent: i, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (scored.length > 0) return scored[0].intent;
  return INTENTS.find((i) => i.id === "weekend-summary")!;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function citation(
  id: string,
  label: string,
  source: string,
  type: Citation["type"],
): Citation {
  return { id, label, source, type, deeplink: `entrata://${type}/${id}` };
}

interface AnswerBuild {
  body: string;
  citations: Citation[];
  artifacts: Artifact[];
  trace: TraceStep[];
  followUps: string[];
  confidence: AssistantMessage["confidence"];
  outcome: AssistantMessage["outcome"];
}

function answerDelinquency(props: Property[]): AnswerBuild {
  const sorted = [...props].sort((a, b) => b.delinquencyPct - a.delinquencyPct);
  const worst = sorted[0];
  const totalDelinquent = props.reduce((s, p) => s + p.units * (p.delinquencyPct / 100), 0);
  const totalUnits = props.reduce((s, p) => s + p.units, 0);
  const overall = (totalDelinquent / totalUnits) * 100;
  const dollars = totalDelinquent * 1450;

  const cites: Citation[] = [
    citation("c-delq-roll", "Delinquency Roll · Apr 27", `${worst.name} · Delinquency Aging Report (Apr 27, 2026)`, "report"),
    citation("c-ledger", "Resident Ledger Sample", "Resident ledger entries with balance > $0 (last 30d)", "ledger"),
    citation("c-pol", "Late Fee Policy v3.2", "Wynbrook Living · Late Fee + Repayment Policy v3.2", "policy"),
  ];

  const body = `Delinquency across the selected scope is **${formatPercent(overall, 1)}**[#1], representing roughly **${formatCurrency(dollars, { compact: true })}** in unpaid rent across ${Math.round(totalDelinquent)} units[#2]. The biggest contributor is **${worst.name}** at ${formatPercent(worst.delinquencyPct, 1)}[#1] — about ${Math.round(worst.units * (worst.delinquencyPct / 100))} of ${worst.units} units.\n\nThe pattern is concentrated in the 31–60 day bucket, which is what you'd expect after the April 5 grace period closed[#3]. Payments AI has already issued first-touch reminders to all of them; the next escalation step (manager review) is queued for ${worst.shortName} on Tuesday.`;

  const art: Artifact = {
    id: "a-delq",
    kind: "table",
    title: "Delinquency by property",
    subtitle: "Sorted by % of rent unpaid · As of Apr 27",
    columns: ["Property", "Units", "% delinquent", "Est. unpaid"],
    rows: sorted.map((p) => [
      p.shortName,
      p.units,
      formatPercent(p.delinquencyPct, 1),
      formatCurrency(p.units * (p.delinquencyPct / 100) * 1450, { compact: true }),
    ]),
  };

  return {
    body,
    citations: cites,
    artifacts: [art],
    trace: [
      { label: "Classified intent", detail: "delinquency · payments lens", durationMs: 110 },
      { label: "Pulled delinquency aging", detail: `${props.length} properties · Apr 27`, cited: ["c-delq-roll"], durationMs: 380 },
      { label: "Joined to resident ledger", detail: "balance > $0, 30d window", cited: ["c-ledger"], durationMs: 220 },
      { label: "Cross-checked late-fee policy", cited: ["c-pol"], durationMs: 90 },
      { label: "Composed answer", durationMs: 240 },
    ],
    followUps: [
      `Show me only ${worst.shortName}'s 60+ day balances`,
      "Draft a portfolio-wide reminder note for residents 1–30 days late",
      "Promote this to a Monday morning insight",
    ],
    confidence: "high",
    outcome: "answered",
  };
}

function answerOccupancy(props: Property[]): AnswerBuild {
  const total = props.reduce((s, p) => s + p.units, 0);
  const occ = props.reduce((s, p) => s + p.units * (p.occupancyPct / 100), 0);
  const overall = (occ / total) * 100;
  const sorted = [...props].sort((a, b) => a.occupancyPct - b.occupancyPct);
  const lowest = sorted[0];

  const cites: Citation[] = [
    citation("c-occ-snap", "Occupancy Snapshot · Apr 27", "Daily Occupancy Snapshot (Apr 27, 2026)", "report"),
    citation("c-rent-roll", "Rent Roll · Apr 27", "Live Rent Roll Export (Apr 27, 2026)", "report"),
  ];

  const body = `Physical occupancy is **${formatPercent(overall, 1)}**[#1] across ${total.toLocaleString()} ${
    props.some((p) => p.segment === "student") ? "units / beds" : "units"
  }. Five of your six properties are above 94%[#2]; the one to watch is **${lowest.name}** at ${formatPercent(lowest.occupancyPct, 1)}[#1] — ${Math.round(lowest.units * (1 - lowest.occupancyPct / 100))} vacant units against ${lowest.appsThisWeek} apps in flight this week.`;

  const art: Artifact = {
    id: "a-occ",
    kind: "kpi-strip",
    title: "Occupancy at a glance",
    subtitle: "Sorted by occupancy descending",
    kpis: [...props]
      .sort((a, b) => b.occupancyPct - a.occupancyPct)
      .map((p) => ({
        label: p.shortName,
        value: formatPercent(p.occupancyPct, 1),
        delta: `${p.units} ${p.segment === "student" ? "beds" : "units"}`,
        tone:
          p.occupancyPct >= 96 ? "good" : p.occupancyPct >= 93 ? "info" : "warn",
      })),
  };

  return {
    body,
    citations: cites,
    artifacts: [art],
    trace: [
      { label: "Classified intent", detail: "occupancy · portfolio lens", durationMs: 90 },
      { label: "Read occupancy snapshot", cited: ["c-occ-snap"], durationMs: 240 },
      { label: "Cross-referenced rent roll", cited: ["c-rent-roll"], durationMs: 280 },
      { label: "Composed answer + KPI strip", durationMs: 200 },
    ],
    followUps: [
      `Show ${lowest.shortName}'s 30-day occupancy trend`,
      "Where are we losing residents this month?",
      "Compare student vs. conventional pacing",
    ],
    confidence: "high",
    outcome: "answered",
  };
}

function answerNoiVariance(props: Property[]): AnswerBuild {
  const sorted = [...props].sort(
    (a, b) => a.ytdNoiPerUnit - a.ytdNoiBudgetPerUnit - (b.ytdNoiPerUnit - b.ytdNoiBudgetPerUnit),
  );
  const worst = sorted[0];
  const best = sorted[sorted.length - 1];

  const cites: Citation[] = [
    citation("c-pnl", "P&L · Mar 2026", "Property-level P&L statements (March close, 4/19/2026)", "report"),
    citation("c-budget", "Budget v2 · 2026", "Approved 2026 Operating Budget (v2, Jan 2026)", "report"),
    citation("c-renewals", "Renewals Trend", "Renewals acceptance + rent growth, trailing 90d", "report"),
  ];

  const body = `On a YTD-per-unit basis, the portfolio is running **${formatCurrency(
    props.reduce((s, p) => s + p.ytdNoiPerUnit - p.ytdNoiBudgetPerUnit, 0) / props.length,
    { compact: true },
  )} vs. budget on average**[#1][#2]. Two properties are dragging the number: **${worst.name}** is **${formatCurrency(
    worst.ytdNoiPerUnit - worst.ytdNoiBudgetPerUnit,
    { compact: true },
  )} below budget per unit**[#1] (concession spend + slower renewals are the biggest line items)[#3]. **${best.name}** is the standout at **${formatCurrency(
    best.ytdNoiPerUnit - best.ytdNoiBudgetPerUnit,
    { compact: true },
  )} above budget**[#1].`;

  const art: Artifact = {
    id: "a-noi-bar",
    kind: "bar-chart",
    title: "NOI per unit vs. budget",
    subtitle: "YTD through March close",
    series: [
      {
        name: "$ vs. budget per unit",
        data: sorted.map((p) => ({
          x: p.shortName,
          y: p.ytdNoiPerUnit - p.ytdNoiBudgetPerUnit,
        })),
      },
    ],
  };

  return {
    body,
    citations: cites,
    artifacts: [art],
    trace: [
      { label: "Classified intent", detail: "noi-variance · portfolio lens", durationMs: 120 },
      { label: "Loaded property P&Ls", cited: ["c-pnl"], durationMs: 480 },
      { label: "Loaded approved budget", cited: ["c-budget"], durationMs: 220 },
      { label: "Cross-checked renewal performance", cited: ["c-renewals"], durationMs: 310 },
      { label: "Composed variance breakdown", durationMs: 280 },
    ],
    followUps: [
      `Why is ${worst.shortName} below budget?`,
      "Show concessions spend by property",
      "Schedule this analysis as a weekly digest",
    ],
    confidence: "high",
    outcome: "answered",
  };
}

function answerLeasingPace(props: Property[]): AnswerBuild {
  const sortedByLeases = [...props].sort((a, b) => b.leasesThisWeek - a.leasesThisWeek);
  const totalApps = props.reduce((s, p) => s + p.appsThisWeek, 0);
  const totalTours = props.reduce((s, p) => s + p.toursThisWeek, 0);
  const totalLeases = props.reduce((s, p) => s + p.leasesThisWeek, 0);

  const cites: Citation[] = [
    citation("c-leasing", "Leasing Funnel · WTD", "Leasing funnel report — week of Apr 21, 2026", "report"),
    citation("c-eli", "ELI+ Conversation Log", "ELI+ tour-booking conversations, last 7 days", "ticket"),
  ];

  const body = `Week-to-date you've taken **${totalApps} apps**, hosted **${totalTours} tours**, and signed **${totalLeases} leases** across the portfolio[#1]. The strongest property is **${sortedByLeases[0].name}** with ${sortedByLeases[0].leasesThisWeek} signs[#1]; ELI+ booked **${Math.round(totalTours * 0.41)} of the ${totalTours} tours** without a human ever picking up the phone[#2].`;

  const art: Artifact = {
    id: "a-funnel",
    kind: "table",
    title: "Leasing funnel · this week",
    subtitle: "Apr 21 – Apr 27",
    columns: ["Property", "Apps", "Tours", "Leases", "App→Lease"],
    rows: sortedByLeases.map((p) => [
      p.shortName,
      p.appsThisWeek,
      p.toursThisWeek,
      p.leasesThisWeek,
      p.appsThisWeek > 0 ? formatPercent((p.leasesThisWeek / p.appsThisWeek) * 100, 0) : "—",
    ]),
  };

  return {
    body,
    citations: cites,
    artifacts: [art],
    trace: [
      { label: "Classified intent", detail: "leasing-pace · leasing lens", durationMs: 100 },
      { label: "Pulled funnel report", cited: ["c-leasing"], durationMs: 320 },
      { label: "Joined ELI+ conversation log", cited: ["c-eli"], durationMs: 280 },
      { label: "Composed funnel summary", durationMs: 200 },
    ],
    followUps: [
      "Which lead source is converting best?",
      "Show me apps stuck > 5 days",
      "Draft a Friday note to the regionals",
    ],
    confidence: "high",
    outcome: "answered",
  };
}

function answerRenewals(props: Property[]): AnswerBuild {
  const sorted = [...props].sort((a, b) => a.renewalsAcceptancePct - b.renewalsAcceptancePct);
  const lowest = sorted[0];
  const avg = props.reduce((s, p) => s + p.renewalsAcceptancePct, 0) / props.length;
  const isStudentHeavy = props.filter((p) => p.segment === "student").length >= props.length / 2;

  const cites: Citation[] = [
    citation("c-renew-tape", "Renewals Tape · trailing 90d", "Renewal offers tape + outcomes (last 90 days)", "report"),
    citation("c-segment", "Segment Benchmarks", "Wynbrook segment benchmarks (conventional + student)", "policy"),
  ];

  const body = `Trailing-90-day renewal acceptance is **${formatPercent(avg, 1)}** across the selected scope[#1]${
    isStudentHeavy
      ? ". Student properties run lower than conventional by design — academic year cycles drive natural turnover[#2]."
      : ""
  } The drag is **${lowest.name}** at ${formatPercent(lowest.renewalsAcceptancePct, 1)}[#1]; the pattern there is concession-loaded offers expiring after the resident has already been shopping for two weeks. Renewals AI has flagged **${Math.max(
    1,
    Math.round(lowest.units * 0.04),
  )} offers** that should be re-issued at a different price point this week.`;

  const art: Artifact = {
    id: "a-renew-bar",
    kind: "bar-chart",
    title: "Renewal acceptance · trailing 90d",
    subtitle: "Sorted by acceptance % ascending",
    series: [
      {
        name: "Acceptance %",
        data: sorted.map((p) => ({ x: p.shortName, y: p.renewalsAcceptancePct })),
      },
    ],
  };

  return {
    body,
    citations: cites,
    artifacts: [art],
    trace: [
      { label: "Classified intent", detail: "renewals · renewals lens", durationMs: 110 },
      { label: "Loaded renewals tape", cited: ["c-renew-tape"], durationMs: 410 },
      { label: "Applied segment benchmarks", cited: ["c-segment"], durationMs: 130 },
      { label: "Composed acceptance breakdown", durationMs: 220 },
    ],
    followUps: [
      `Re-issue ${lowest.shortName} flagged offers at a lower step`,
      "Show me renewals with > 3% rent growth",
      "Compare renewal pacing student vs. conventional",
    ],
    confidence: "high",
    outcome: "answered",
  };
}

function answerMaintenanceStatus(props: Property[]): AnswerBuild {
  const sorted = [...props].sort((a, b) => b.workOrderMTTRDays - a.workOrderMTTRDays);
  const worst = sorted[0];
  const best = sorted[sorted.length - 1];
  const totalOpen = props.reduce((s, p) => s + p.workOrdersOpen, 0);

  const cites: Citation[] = [
    citation("c-wo", "Work Order Queue", "Open work order queue (live)", "work-order"),
    citation("c-vendor", "Vendor Dispatch Log", "After-hours vendor dispatch log (trailing 30d)", "report"),
  ];

  const avgMttr = props.reduce((s, p) => s + p.workOrderMTTRDays, 0) / props.length;
  const body = `There are **${totalOpen} open work orders** across the selected scope[#1] with an average MTTR of **${avgMttr.toFixed(1)} days**. **${best.name}** is the fastest at ${best.workOrderMTTRDays.toFixed(1)} days[#1]; **${worst.name}** is the slowest at ${worst.workOrderMTTRDays.toFixed(1)} days. Maintenance AI dispatched **${Math.round(totalOpen * 0.34)} after-hours requests** to your on-call vendor over the weekend without paging the on-site team[#2].`;

  const art: Artifact = {
    id: "a-mttr",
    kind: "bar-chart",
    title: "Mean time to resolution",
    subtitle: "Days · trailing 30d · sorted slowest first",
    series: [
      {
        name: "MTTR (days)",
        data: sorted.map((p) => ({ x: p.shortName, y: p.workOrderMTTRDays })),
      },
    ],
  };

  return {
    body,
    citations: cites,
    artifacts: [art],
    trace: [
      { label: "Classified intent", detail: "maintenance-status · maintenance lens", durationMs: 100 },
      { label: "Pulled work order queue", cited: ["c-wo"], durationMs: 290 },
      { label: "Joined vendor dispatch log", cited: ["c-vendor"], durationMs: 310 },
      { label: "Composed maintenance summary", durationMs: 220 },
    ],
    followUps: [
      `Show ${worst.shortName} open WOs aged > 5 days`,
      "Which vendor has the fastest closeouts?",
      "Promote this to a Monday morning insight",
    ],
    confidence: "high",
    outcome: "answered",
  };
}

function answerApAnomaly(props: Property[]): AnswerBuild {
  const flaggedCount = Math.max(2, Math.round(props.length * 1.3));
  const dollars = flaggedCount * 4400 + 1230;
  const cites: Citation[] = [
    citation("c-inv-q", "Invoice Review Queue", "Invoices in 'review' status, trailing 30d", "ledger"),
    citation("c-vendor-hist", "Vendor History", "Vendor history file — pricing + cadence baseline", "report"),
    citation("c-coa", "Chart of Accounts", "Wynbrook 2026 GL account map (v4)", "policy"),
  ];

  const body = `Invoice Processing AI has flagged **${flaggedCount} invoices for review** in the selected scope[#1], totaling roughly **${formatCurrency(
    dollars,
    { compact: true },
  )}**. The most common reason is line items priced **>15% above the trailing-90-day average** for that vendor[#2]; the second most common is a GL code that doesn't match the vendor's history at that property[#3]. None of these are blockers — they're sitting awaiting your approval.`;

  const art: Artifact = {
    id: "a-ap",
    kind: "table",
    title: "Flagged invoices",
    subtitle: "Awaiting review · sorted by amount desc",
    columns: ["Vendor", "Property", "Amount", "Reason"],
    rows: [
      ["Sun State HVAC", "Westshore", "$8,420", "+22% vs. 90d avg"],
      ["Pinnacle Landscaping", "Tampa Bay", "$5,180", "Cadence anomaly (2 invoices in 1wk)"],
      ["GreenLeaf Pest", "Charlotte", "$4,910", "+18% vs. 90d avg"],
      ["BrightTurn Make-Ready", "LoHi", "$4,300", "GL mismatch · routed to 5810 not 5410"],
      ["Apex Plumbing", "Cat Quarter", "$3,950", "+16% vs. 90d avg"],
      ["MetroLock Locksmith", "Sun Devil", "$2,940", "New vendor · no history"],
    ],
  };

  return {
    body,
    citations: cites,
    artifacts: [art],
    trace: [
      { label: "Classified intent", detail: "ap-anomaly · accounting lens", durationMs: 130 },
      { label: "Read invoice review queue", cited: ["c-inv-q"], durationMs: 380 },
      { label: "Compared to vendor history", cited: ["c-vendor-hist"], durationMs: 410 },
      { label: "Cross-checked GL coding", cited: ["c-coa"], durationMs: 180 },
      { label: "Composed anomaly list", durationMs: 240 },
    ],
    followUps: [
      "Approve the GL-mismatch ones in bulk",
      "Show me vendors trending up >10% this quarter",
      "Send the HVAC anomaly to Greg for review",
    ],
    confidence: "high",
    outcome: "answered",
  };
}

function answerOnlinePay(props: Property[]): AnswerBuild {
  const sorted = [...props].sort((a, b) => a.onlinePaymentPct - b.onlinePaymentPct);
  const lowest = sorted[0];
  const avg = props.reduce((s, p) => s + p.onlinePaymentPct, 0) / props.length;

  const cites: Citation[] = [
    citation("c-online", "Online Pay Adoption Snapshot", "Online payment adoption snapshot (Apr 27, 2026)", "report"),
  ];

  const body = `**${formatPercent(avg, 1)} of rent is paid online** across the selected scope[#1]. The lag is **${lowest.name}** at ${formatPercent(
    lowest.onlinePaymentPct,
    1,
  )}[#1] — about ${Math.round(lowest.units * (1 - lowest.onlinePaymentPct / 100))} residents still pay by check, which correlates strongly with delinquency.`;

  const art: Artifact = {
    id: "a-online",
    kind: "kpi-strip",
    title: "Online payment adoption",
    subtitle: "Sorted descending",
    kpis: [...props]
      .sort((a, b) => b.onlinePaymentPct - a.onlinePaymentPct)
      .map((p) => ({
        label: p.shortName,
        value: formatPercent(p.onlinePaymentPct, 1),
        tone: p.onlinePaymentPct >= 85 ? "good" : p.onlinePaymentPct >= 78 ? "info" : "warn",
      })),
  };

  return {
    body,
    citations: cites,
    artifacts: [art],
    trace: [
      { label: "Classified intent", detail: "online-pay · payments lens", durationMs: 110 },
      { label: "Loaded adoption snapshot", cited: ["c-online"], durationMs: 250 },
      { label: "Composed adoption summary", durationMs: 180 },
    ],
    followUps: [
      `Draft an autopay-promo note for ${lowest.shortName} check-payers`,
      "Compare adoption student vs. conventional",
    ],
    confidence: "medium",
    outcome: "answered",
  };
}

function answerOutliers(props: Property[]): AnswerBuild {
  const flags: { property: Property; reasons: string[] }[] = props.map((p) => {
    const r: string[] = [];
    if (p.delinquencyPct > 6) r.push(`Delinquency ${formatPercent(p.delinquencyPct, 1)}`);
    if (p.occupancyPct < 95) r.push(`Occupancy ${formatPercent(p.occupancyPct, 1)}`);
    if (p.workOrderMTTRDays > 2.5) r.push(`MTTR ${p.workOrderMTTRDays.toFixed(1)} days`);
    if (p.ytdNoiPerUnit < p.ytdNoiBudgetPerUnit) r.push(`NOI ${formatCurrency(p.ytdNoiPerUnit - p.ytdNoiBudgetPerUnit, { compact: true })} vs. budget`);
    if (p.renewalsAcceptancePct < 50 && p.segment === "conventional") r.push(`Renewal acceptance ${formatPercent(p.renewalsAcceptancePct, 1)}`);
    return { property: p, reasons: r };
  }).filter((x) => x.reasons.length > 0);

  const cites: Citation[] = [
    citation("c-thresholds", "Exception Thresholds", "Wynbrook portfolio thresholds (delinquency, occupancy, MTTR, NOI, renewals)", "policy"),
    citation("c-snap", "Daily Snapshot", "Daily portfolio snapshot (Apr 27, 2026)", "report"),
  ];

  const body = `${flags.length} of ${props.length} properties tripped at least one threshold today[#1][#2]. The pattern: **${flags[0]?.property.name ?? "—"}** has ${flags[0]?.reasons.length ?? 0} exceptions and is the one I'd open first this morning.`;

  const art: Artifact = {
    id: "a-outliers",
    kind: "table",
    title: "Properties needing attention",
    subtitle: "Sorted by exception count",
    columns: ["Property", "Exceptions", "Why"],
    rows: flags
      .sort((a, b) => b.reasons.length - a.reasons.length)
      .map((f) => [f.property.shortName, f.reasons.length, f.reasons.join(" · ")]),
  };

  return {
    body,
    citations: cites,
    artifacts: [art],
    trace: [
      { label: "Loaded portfolio snapshot", cited: ["c-snap"], durationMs: 280 },
      { label: "Applied exception thresholds", cited: ["c-thresholds"], durationMs: 140 },
      { label: "Composed outlier list", durationMs: 200 },
    ],
    followUps: [
      flags[0] ? `Open ${flags[0].property.shortName} in detail` : "Show me green-flagged properties",
      "Schedule this as a Monday digest",
    ],
    confidence: "high",
    outcome: "answered",
  };
}

function answerWeekendSummary(props: Property[]): AnswerBuild {
  const totalWO = props.reduce((s, p) => s + p.workOrdersOpen, 0);
  const apps = props.reduce((s, p) => s + p.appsThisWeek, 0);
  const tours = props.reduce((s, p) => s + p.toursThisWeek, 0);
  const leases = props.reduce((s, p) => s + p.leasesThisWeek, 0);

  const cites: Citation[] = [
    citation("c-eli-w", "ELI+ Weekend Log", "ELI+ conversation log (Sat–Sun)", "ticket"),
    citation("c-mai-w", "Maintenance AI Dispatch Log", "Maintenance AI weekend dispatch log", "work-order"),
    citation("c-pai-w", "Payments AI Run Log", "Payments AI weekend retry + reminder log", "report"),
  ];

  const body = `Here's what got done while you were off:\n\n• **ELI+** handled **${Math.round(tours * 0.62)} prospect conversations** and booked **${Math.round(tours * 0.34)} tours** across the portfolio[#1]\n• **Maintenance AI** dispatched **${Math.round(totalWO * 0.34)} after-hours work orders** to your on-call vendors without paging on-site staff[#2]\n• **Payments AI** retried **${Math.round(apps * 1.2)} failed ACH attempts** and recovered **${formatCurrency(apps * 1450 * 0.7, { compact: true })}** before Monday[#3]\n• ${leases} new leases were signed week-to-date.\n\nNothing today needs your judgment before 9 AM. The one thing worth surfacing: a resident at ${pick(props).shortName} asked for a concession ELI+ wouldn't grant — it's queued for review with the recommended response.`;

  const art: Artifact = {
    id: "a-weekend",
    kind: "kpi-strip",
    title: "Work done autonomously this weekend",
    subtitle: "Sat 12:01 AM – Mon 7:00 AM",
    kpis: [
      { label: "Conversations", value: `${Math.round(tours * 0.62)}`, delta: "ELI+", tone: "info" },
      { label: "Tours booked", value: `${Math.round(tours * 0.34)}`, delta: "ELI+", tone: "good" },
      { label: "WOs dispatched", value: `${Math.round(totalWO * 0.34)}`, delta: "Maint. AI", tone: "good" },
      { label: "Recovered", value: formatCurrency(apps * 1450 * 0.7, { compact: true }), delta: "Payments AI", tone: "good" },
    ],
  };

  return {
    body,
    citations: cites,
    artifacts: [art],
    trace: [
      { label: "Cross-lens digest", detail: "auto · pulled from 4 product agents", durationMs: 180 },
      { label: "Read ELI+ log", cited: ["c-eli-w"], durationMs: 290 },
      { label: "Read Maintenance AI dispatch log", cited: ["c-mai-w"], durationMs: 270 },
      { label: "Read Payments AI run log", cited: ["c-pai-w"], durationMs: 260 },
      { label: "Composed Monday-morning narrative", durationMs: 320 },
    ],
    followUps: [
      "Show me the concession the agent declined",
      "Draft a 'work done this weekend' note to ownership",
      "Promote this digest to every Monday at 7am",
    ],
    confidence: "high",
    outcome: "answered",
  };
}

function answerRefused(prompt: string): AnswerBuild {
  return {
    body: `I can't answer that with the data I have on this scope. ${
      /resident.*name|tenant.*name|ssn|social/i.test(prompt)
        ? "Resident PII is gated by your company's policy — I can show you aggregates and patterns, but not individual residents in this surface."
        : "It looks like your question needs data from a system I'm not connected to in this scope. I've logged it so your admin can see the gap."
    }`,
    citations: [],
    artifacts: [],
    trace: [
      { label: "Classified intent", detail: "out-of-scope / refused" },
      { label: "Checked guardrail policy", durationMs: 80 },
      { label: "Logged knowledge gap", durationMs: 30 },
    ],
    followUps: [
      "Ask about aggregate trends instead",
      "Promote this question to a feature request",
    ],
    confidence: "low",
    outcome: "refused",
  };
}

export interface ComposeArgs {
  prompt: string;
  lens: LensId;
  depth: Depth;
  scope: Scope;
}

export function compose(args: ComposeArgs): {
  message: Omit<AssistantMessage, "id" | "createdAt">;
  intentId: string;
} {
  const intent = classifyIntent(args.prompt);
  const props = propertiesForScope(args.scope.id);
  const resolvedLens: LensId = args.lens === "auto" ? intent.lens : args.lens;

  const isRefused = /(?:resident|tenant)\s+(?:name|email|phone|address|ssn|social)/i.test(args.prompt);

  let build: AnswerBuild;
  if (isRefused) {
    build = answerRefused(args.prompt);
  } else {
    switch (intent.id) {
      case "delinquency":
        build = answerDelinquency(props); break;
      case "occupancy":
        build = answerOccupancy(props); break;
      case "noi-variance":
        build = answerNoiVariance(props); break;
      case "leasing-pace":
        build = answerLeasingPace(props); break;
      case "renewals":
        build = answerRenewals(props); break;
      case "maintenance-status":
        build = answerMaintenanceStatus(props); break;
      case "ap-anomaly":
        build = answerApAnomaly(props); break;
      case "online-pay":
        build = answerOnlinePay(props); break;
      case "outliers":
        build = answerOutliers(props); break;
      default:
        build = answerWeekendSummary(props);
    }
  }

  if (args.depth === "reasoning" && !isRefused) {
    build.trace.push({
      label: "Double-checked against company policy",
      detail: "Verified against guardrails (fair housing, late-fee, concession ceilings)",
      durationMs: 280,
    });
  }

  return {
    intentId: isRefused ? "refused" : intent.id,
    message: {
      role: "assistant",
      body: build.body,
      lens: resolvedLens,
      depth: args.depth,
      model: "auto",
      scope: args.scope,
      citations: build.citations,
      artifacts: build.artifacts,
      trace: build.trace,
      confidence: build.confidence,
      outcome: build.outcome,
      followUps: build.followUps,
    },
  };
}

export const SUGGESTED_PROMPTS: Record<string, string[]> = {
  "vp-ops": [
    "What happened over the weekend?",
    "Which properties need attention this morning?",
    "Where are we vs. budget on NOI?",
    "How is renewal acceptance trending?",
  ],
  regional: [
    "Show me leasing pace for my region this week",
    "Which property is dragging on delinquency?",
    "How is work order MTTR across my portfolio?",
    "Catch me up on what shipped this weekend",
  ],
  "onsite-pm": [
    "What's my open work order picture?",
    "How is my leasing funnel this week?",
    "Anything in my AP review queue?",
    "Who is behind on rent at my property?",
  ],
  "asset-mgr": [
    "NOI per unit vs. underwriting",
    "Which properties are tripping thresholds?",
    "Show concessions spend by property",
    "Compare student vs. conventional performance",
  ],
  accounting: [
    "Any AP anomalies this week?",
    "Show me invoices flagged for review",
    "Which vendors are trending up >10%?",
    "Online payment adoption by property",
  ],
};
