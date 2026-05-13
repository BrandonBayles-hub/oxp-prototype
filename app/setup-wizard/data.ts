import {
  ArrowRight,
  Banknote,
  Clock,
  Database,
  FileText,
  Globe,
  MessageCircle,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Zap,
} from "lucide-react";

import type {
  ActivationTrigger,
  Bucket,
  FeeSchedule,
  MigrationMeta,
  MigrationType,
  Property,
  PropertyReceipt,
  QueueItem,
} from "./types";

export const CUSTOMER = {
  name: "Pinecrest Communities",
  contractSignedDaysAgo: 5,
  origin: "Yardi Voyager",
  vertical: "Conventional + Student",
  state: "California",
};

export const FEE_SCHEDULE: FeeSchedule = {
  application: 75,
  admin: 250,
  latePct: 5,
  lateGraceDays: 5,
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const formatCurrency = (amount: number) => currency.format(amount);

export const formatFeeSchedule = (fee: FeeSchedule) =>
  `${formatCurrency(fee.application)} app · ${formatCurrency(fee.admin)} admin · ${fee.latePct}% late (${fee.lateGraceDays}-day grace)`;

/**
 * All migration types share a slate-neutral chip — they're informational, not
 * action-required. Differentiation comes from the colored dot. Amber is reserved
 * exclusively for action-required signals (Needs confirmation, First in locale).
 */
const NEUTRAL_CHIP = "border-slate-300 bg-slate-50 text-slate-700";

export const MIGRATION_TYPE_META: Record<MigrationType, MigrationMeta> = {
  standard: {
    label: "Standard",
    chipClass: NEUTRAL_CHIP,
    dotClass: "bg-slate-400",
    helper: "Standard add-on flow.",
  },
  takeover: {
    label: "Takeover",
    chipClass: NEUTRAL_CHIP,
    dotClass: "bg-orange-500",
    helper: "Pre-configure now; activates at legal close.",
  },
  notd: {
    label: "NOTD",
    chipClass: NEUTRAL_CHIP,
    dotClass: "bg-indigo-500",
    helper: "Accounting reset — operations stay the same.",
  },
  "lease-up": {
    label: "Lease-Up",
    chipClass: NEUTRAL_CHIP,
    dotClass: "bg-sky-500",
    helper: "Resident-facing setup held until occupancy.",
  },
  acquisition: {
    label: "Acquisition",
    chipClass: NEUTRAL_CHIP,
    dotClass: "bg-violet-500",
    helper: "Copy from prior environment via E-form.",
  },
};

/**
 * 12 add-on properties — 3 of each major migration type, plus diversification
 * on progress, anchor dates, locale flags, and just-added state. Real source
 * = contract + property events.
 */
export const PROPERTIES_ADD_ON: Property[] = [
  {
    id: "ap1",
    name: "Cedar Vista",
    city: "Phoenix",
    state: "AZ",
    units: 234,
    vertical: "Conventional",
    progress: 100,
    state_label: "Ready",
    addedDaysAgo: 8,
    migrationType: "standard",
    productCount: 4,
    migrationConfirmed: true,
  },
  {
    id: "ap2",
    name: "Birch Ridge",
    city: "Charlotte",
    state: "NC",
    units: 238,
    vertical: "Conventional",
    progress: 60,
    state_label: "Configuring",
    addedDaysAgo: 5,
    migrationType: "takeover",
    anchorDateLabel: "Close: May 15",
    productCount: 4,
    migrationConfirmed: true,
  },
  {
    id: "ap3",
    name: "Aspen Trail",
    city: "Chicago",
    state: "IL",
    units: 246,
    vertical: "Conventional",
    progress: 30,
    state_label: "Configuring",
    addedDaysAgo: 5,
    migrationType: "lease-up",
    anchorDateLabel: "Occupancy: TBD",
    newLocale: "Illinois",
    productCount: 5,
    migrationConfirmed: false,
  },
  {
    id: "ap4",
    name: "Pine Ridge",
    city: "Sacramento",
    state: "CA",
    units: 192,
    vertical: "Conventional",
    progress: 20,
    state_label: "Just added",
    addedDaysAgo: 0,
    migrationType: "notd",
    anchorDateLabel: "Transfer: variable",
    productCount: 3,
    migrationConfirmed: false,
  },
  {
    id: "ap5",
    name: "Maple Court",
    city: "Denver",
    state: "CO",
    units: 184,
    vertical: "Conventional",
    progress: 85,
    state_label: "Configuring",
    addedDaysAgo: 6,
    migrationType: "standard",
    productCount: 4,
    migrationConfirmed: true,
  },
  {
    id: "ap6",
    name: "Willow Lane",
    city: "Austin",
    state: "TX",
    units: 220,
    vertical: "Conventional",
    progress: 70,
    state_label: "Configuring",
    addedDaysAgo: 5,
    migrationType: "standard",
    productCount: 4,
    migrationConfirmed: true,
  },
  {
    id: "ap7",
    name: "Oak Hollow",
    city: "Raleigh",
    state: "NC",
    units: 256,
    vertical: "Conventional",
    progress: 45,
    state_label: "Configuring",
    addedDaysAgo: 4,
    migrationType: "takeover",
    anchorDateLabel: "Close: May 22",
    productCount: 4,
    migrationConfirmed: true,
  },
  {
    id: "ap8",
    name: "Sage Brook",
    city: "Boise",
    state: "ID",
    units: 168,
    vertical: "Conventional",
    progress: 90,
    state_label: "Configuring",
    addedDaysAgo: 7,
    migrationType: "takeover",
    anchorDateLabel: "Close: June 1",
    productCount: 4,
    migrationConfirmed: true,
  },
  {
    id: "ap9",
    name: "Linden Park",
    city: "Tampa",
    state: "FL",
    units: 312,
    vertical: "Conventional",
    progress: 50,
    state_label: "Configuring",
    addedDaysAgo: 5,
    migrationType: "lease-up",
    anchorDateLabel: "Occupancy: July 30",
    productCount: 5,
    migrationConfirmed: true,
  },
  {
    id: "ap10",
    name: "Juniper Yards",
    city: "Reno",
    state: "NV",
    units: 198,
    vertical: "Conventional",
    progress: 25,
    state_label: "Configuring",
    addedDaysAgo: 3,
    migrationType: "lease-up",
    anchorDateLabel: "Occupancy: Aug 14",
    productCount: 5,
    migrationConfirmed: true,
  },
  {
    id: "ap11",
    name: "Elm Crossing",
    city: "Salt Lake City",
    state: "UT",
    units: 210,
    vertical: "Conventional",
    progress: 100,
    state_label: "Ready",
    addedDaysAgo: 9,
    migrationType: "notd",
    anchorDateLabel: "Transfer: May 10",
    productCount: 3,
    migrationConfirmed: true,
  },
  {
    id: "ap12",
    name: "Hawthorn Place",
    city: "Kansas City",
    state: "MO",
    units: 176,
    vertical: "Conventional",
    progress: 80,
    state_label: "Configuring",
    addedDaysAgo: 5,
    migrationType: "notd",
    anchorDateLabel: "Transfer: May 18",
    productCount: 3,
    migrationConfirmed: true,
  },
];

export const PROPERTIES_NEW_LOGO: Property[] = [
  {
    id: "p1",
    name: "Alder Ridge",
    city: "Seattle",
    state: "WA",
    units: 218,
    vertical: "Conventional",
    progress: 35,
    state_label: "Configuring",
    addedDaysAgo: 5,
    migrationType: "standard",
    productCount: 6,
    migrationConfirmed: true,
  },
  {
    id: "p2",
    name: "Cedar Yards",
    city: "Portland",
    state: "OR",
    units: 246,
    vertical: "Conventional",
    progress: 35,
    state_label: "Configuring",
    addedDaysAgo: 5,
    migrationType: "standard",
    productCount: 6,
    migrationConfirmed: true,
  },
  {
    id: "p3",
    name: "Chestnut Crossing",
    city: "San Diego",
    state: "CA",
    units: 230,
    vertical: "Conventional",
    progress: 35,
    state_label: "Configuring",
    addedDaysAgo: 5,
    migrationType: "standard",
    productCount: 6,
    migrationConfirmed: true,
  },
];

export const QUEUE_NEW_LOGO: QueueItem[] = [
  {
    id: "approve-late-fee",
    title: "Approve Late Fee",
    context:
      "We inferred 5% / 5-day grace from your rent roll. Two reports disagree on grace period (3 vs 5 days).",
    ownerRole: "Primary contact",
    cta: "Start",
    urgency: "now",
    devPhase: "P1",
    scope: "cohort",
    estimateLabel: "~2 min",
  },
  {
    id: "pick-template",
    title: "Pick Template",
    context:
      "Conventional · West Coast (84% match) and Student · Sacramento (76% match). Auto-applies in 24h if untouched.",
    ownerRole: "Primary contact",
    cta: "Start",
    urgency: "now",
    devPhase: "P1",
    scope: "cohort",
    estimateLabel: "~5 min",
  },
];

/**
 * Add-on queue. Step 1 (confirm) and Step 2 (template) are surfaced
 * separately by the page; the rest is a single urgency-ranked list.
 */
export const QUEUE_ADD_ON: QueueItem[] = [
  {
    id: "confirm-migration",
    title: "Confirm Property Type & Date",
    context:
      "We don't have migration type or projected migration date in the contract. Pick Standard / Takeover / NOTD / Lease-Up / Acquisition for each property and confirm the date — everything else gates on this.",
    ownerRole: "Primary contact",
    cta: "Start",
    urgency: "now",
    devPhase: "P1",
    scope: "cohort",
    completedIds: [
      "ap1",
      "ap2",
      "ap5",
      "ap6",
      "ap7",
      "ap8",
      "ap9",
      "ap10",
      "ap11",
      "ap12",
    ],
    trigger: "Required first",
    estimateLabel: "~2 min",
  },
  {
    id: "pick-template-addon",
    title: "Pick Settings Template",
    context:
      "Conventional · West Coast (88% match). Auto-applies in 24h if untouched. Aspen Trail's IL compliance review must finish before the template fully locks.",
    ownerRole: "Primary contact",
    cta: "Start",
    urgency: "now",
    devPhase: "P1",
    scope: "cohort",
    estimateLabel: "~5 min",
  },
  {
    id: "review-deltas",
    title: "Review Settings",
    context:
      "Pet policy, parking fee, and trash service vary across the cohort. Pick once or override per property.",
    ownerRole: "Operations",
    cta: "Start",
    urgency: "now",
    devPhase: "P2",
    scope: "cohort",
    completedIds: ["ap1", "ap11"],
    estimateLabel: "~5 min",
  },
  {
    id: "plaid-banking",
    title: "Connect Banking",
    context:
      "Each property needs its own bank account. Plaid handles the per-property mapping. Lease-Up properties are held until occupancy.",
    ownerRole: "Accounting",
    cta: "Start",
    urgency: "now",
    devPhase: "P1",
    scope: "property",
    appliesToIds: [
      "ap1",
      "ap2",
      "ap5",
      "ap6",
      "ap7",
      "ap8",
      "ap11",
      "ap12",
    ],
    completedIds: ["ap1", "ap5", "ap11"],
    trigger: "Banking required",
    estimateLabel: "~3 min",
  },
  {
    id: "schedule-takeover",
    title: "Schedule Takeover Activation",
    context:
      "Configure now, activate at legal close. Nothing turns on for residents until the date you pick.",
    ownerRole: "Operations",
    cta: "Start",
    urgency: "now",
    devPhase: "P1",
    scope: "property",
    appliesToIds: ["ap2", "ap7", "ap8"],
    completedIds: ["ap8"],
    trigger: "Takeover scheduling",
    estimateLabel: "~2 min",
  },
  {
    id: "confirm-occupancy",
    title: "Confirm Occupancy Date",
    context:
      "Resident-facing setup (banking, utilities, screening) is held until you confirm the certificate-of-occupancy date.",
    ownerRole: "Operations",
    cta: "Start",
    urgency: "now",
    devPhase: "P1",
    scope: "property",
    appliesToIds: ["ap3", "ap9", "ap10"],
    completedIds: ["ap9"],
    trigger: "Lease-Up gating",
    estimateLabel: "~1 min",
  },
  {
    id: "il-compliance",
    title: "Illinois Compliance Review",
    context:
      "First property in Illinois for this portfolio. Screening rules, late-fee caps, and utility billing differ from your other states — quick review before configuration finishes.",
    ownerRole: "Compliance",
    cta: "Start",
    urgency: "now",
    devPhase: "P1",
    scope: "property",
    appliesToIds: ["ap3"],
    trigger: "First in Illinois",
    estimateLabel: "~10 min",
  },
  {
    id: "notd-accounting",
    title: "Confirm Transfer Date & AR",
    context:
      "NOTD reset only — operations stay the same. Tell us the transfer date and whether AR was purchased from the prior owner.",
    ownerRole: "Accounting",
    cta: "Start",
    urgency: "soon",
    devPhase: "P1",
    scope: "property",
    appliesToIds: ["ap4", "ap11", "ap12"],
    completedIds: ["ap11", "ap12"],
    trigger: "NOTD accounting reset",
    estimateLabel: "~3 min",
  },
];

export const ACTIVATION_TRIGGERS: ActivationTrigger[] = [
  {
    id: "merchant",
    title: "Bind merchant account → property",
    detail: "Plaid merchant ID associated with each property's billing entity.",
    icon: Banknote,
  },
  {
    id: "domain",
    title: "Attach your domain to the website",
    detail: "Domain DNS verified and pointed at the new property site.",
    icon: Globe,
  },
  {
    id: "ils",
    title: "Subscribe to ILS portals",
    detail: "Listings published to your ILS feeds.",
    icon: Send,
  },
  {
    id: "vanity",
    title: "Order vanity numbers",
    detail: "Tracking numbers provisioned and routed.",
    icon: MessageCircle,
  },
  {
    id: "leasing-center",
    title: "Set leasing center routing",
    detail: "After-hours and overflow routing applied per property.",
    icon: ArrowRight,
  },
  {
    id: "eli",
    title: "Activate ELI agents",
    detail: "Leasing AI workflow turned on once leasing center routing is live.",
    icon: Sparkles,
  },
  {
    id: "lease-packet",
    title: "Bind lease addenda → packet",
    detail: "Property-specific addenda mapped to the lease packet.",
    icon: FileText,
  },
  {
    id: "transmission",
    title: "Subscribe transmission vendors",
    detail: "API access enabled for any transmission vendors on contract.",
    icon: Database,
  },
  {
    id: "auto-post",
    title: "Turn on auto-post settings",
    detail: "Recurring postings, late fees, and reconciliation jobs enabled.",
    icon: Zap,
  },
];

const SOURCE_REFERENCE = "Pinecrest North (reference property)";

/**
 * Per-property receipts — what we already did + where it came from.
 * Keyed off migration type (and locale flag for compliance reviews).
 */
export function getPropertyReceipts(
  p: Property,
  bucket: Bucket,
): PropertyReceipt[] {
  if (bucket !== "add-on") {
    return [
      {
        id: "address",
        label: "Property address",
        value: `${p.city}, ${p.state}`,
        sourceLabel: "Sales handoff",
        sourceIcon: FileText,
        confidence: 100,
        editable: true,
      },
      {
        id: "units",
        label: "Unit count",
        value: `${p.units} units`,
        sourceLabel: "Yardi rent roll",
        sourceIcon: Database,
        confidence: 100,
        editable: true,
      },
      {
        id: "vertical",
        label: "Vertical",
        value: p.vertical,
        sourceLabel: "Yardi rent roll",
        sourceIcon: Database,
        confidence: 96,
        editable: true,
      },
      {
        id: "fee",
        label: "Fee schedule",
        value: formatFeeSchedule(FEE_SCHEDULE),
        sourceLabel: "Yardi rent roll + website",
        sourceIcon: Database,
        confidence: 94,
        editable: true,
      },
      {
        id: "coa",
        label: "Chart of accounts",
        value: "Mapped to Entrata default + 12 custom GLs",
        sourceLabel: "Yardi GL trial balance",
        sourceIcon: Database,
        confidence: 92,
        editable: true,
      },
      {
        id: "branding",
        label: "Brand & logo",
        value: "Pulled from pinecrestcommunities.com",
        sourceLabel: "Your website",
        sourceIcon: Globe,
        confidence: 88,
        editable: true,
      },
    ];
  }

  const base: PropertyReceipt[] = [
    {
      id: "address",
      label: "Property address",
      value: `${p.city}, ${p.state}`,
      sourceLabel: "Add-on contract",
      sourceIcon: FileText,
      confidence: 100,
      editable: true,
    },
    {
      id: "units",
      label: "Unit count",
      value: `${p.units} units`,
      sourceLabel: "Add-on contract",
      sourceIcon: FileText,
      confidence: 100,
      editable: true,
    },
    {
      id: "vertical",
      label: "Vertical",
      value: p.vertical,
      sourceLabel: SOURCE_REFERENCE,
      sourceIcon: Settings,
      confidence: 98,
      editable: true,
    },
    {
      id: "branding",
      label: "Brand & logo",
      value: "Pulled from pinecrestcommunities.com",
      sourceLabel: "Your website",
      sourceIcon: Globe,
      confidence: 88,
      editable: true,
    },
    {
      id: "products",
      label: "Active products",
      value: "Entrata Core, Lease Execution, ResidentPay, Bill Pay",
      sourceLabel: "Add-on contract",
      sourceIcon: FileText,
      confidence: 100,
      editable: false,
    },
  ];

  const standardOps: PropertyReceipt[] = [
    {
      id: "fee",
      label: "Fee schedule",
      value: formatFeeSchedule(FEE_SCHEDULE),
      sourceLabel: SOURCE_REFERENCE,
      sourceIcon: Settings,
      confidence: 92,
      editable: true,
    },
    {
      id: "coa",
      label: "Chart of accounts",
      value: "Inherited (Entrata default + 12 custom GLs)",
      sourceLabel: SOURCE_REFERENCE,
      sourceIcon: Database,
      confidence: 95,
      editable: true,
    },
    {
      id: "users",
      label: "Property contacts",
      value: "3 users seated · 2 named owners",
      sourceLabel: "HRIS + sales handoff",
      sourceIcon: UserCheck,
      confidence: 90,
      editable: true,
    },
  ];

  const migrationRows: Record<MigrationType, PropertyReceipt[]> = {
    standard: standardOps,
    takeover: [
      ...standardOps,
      {
        id: "activation",
        label: "Activation scheduled",
        value: `${p.anchorDateLabel ?? "Pending close date"} — nothing turns on for residents until then.`,
        sourceLabel: "Takeover scheduling",
        sourceIcon: Clock,
        confidence: 100,
        editable: true,
      },
    ],
    notd: [
      {
        id: "ops",
        label: "Operations carry over",
        value:
          "Fee schedule, COA, users, and policies inherited from prior owner. NOTD only resets accounting.",
        sourceLabel: "Prior Entrata environment",
        sourceIcon: Settings,
        confidence: 96,
        editable: true,
      },
      {
        id: "ar-question",
        label: "AR purchased?",
        value: "Pending — affects whether prior balances import or reset.",
        sourceLabel: "Awaiting your input",
        sourceIcon: Database,
        confidence: 0,
        editable: true,
      },
      {
        id: "transfer",
        label: "Transfer date",
        value:
          p.anchorDateLabel ?? "Variable — confirm to schedule activation.",
        sourceLabel: "NOTD scheduling",
        sourceIcon: Clock,
        confidence: 80,
        editable: true,
      },
    ],
    "lease-up": [
      {
        id: "fee-leaseup",
        label: "Fee schedule",
        value: formatFeeSchedule(FEE_SCHEDULE),
        sourceLabel: SOURCE_REFERENCE,
        sourceIcon: Settings,
        confidence: 92,
        editable: true,
      },
      {
        id: "coa-leaseup",
        label: "Chart of accounts",
        value: "Inherited (Entrata default + 12 custom GLs)",
        sourceLabel: SOURCE_REFERENCE,
        sourceIcon: Database,
        confidence: 95,
        editable: true,
      },
      {
        id: "occupancy-gate",
        label: "Resident-facing setup",
        value: `Held until occupancy. ${p.anchorDateLabel ?? "Confirm CO date to release."}`,
        sourceLabel: "Lease-Up gating",
        sourceIcon: Clock,
        confidence: 100,
        editable: true,
      },
    ],
    acquisition: [
      ...standardOps,
      {
        id: "eform",
        label: "E-form copy status",
        value:
          "Awaiting E-form — once received, we copy what we can and flag what needs manual entry.",
        sourceLabel: "Acquisition path",
        sourceIcon: FileText,
        confidence: 60,
        editable: true,
      },
    ],
  };

  const localeRows: PropertyReceipt[] = p.newLocale
    ? [
        {
          id: "locale-compliance",
          label: `${p.newLocale} compliance review`,
          value: `First property in ${p.newLocale} for this portfolio. Screening, late-fee caps, and utility billing differ — review before configuration locks.`,
          sourceLabel: "Regional compliance database",
          sourceIcon: ShieldCheck,
          confidence: 100,
          editable: true,
        },
      ]
    : [];

  if (p.state_label === "Just added") {
    return [
      {
        id: "ref-applied",
        label: "Inheriting cohort settings",
        value: "Applying your existing portfolio settings now.",
        sourceLabel: SOURCE_REFERENCE,
        sourceIcon: Settings,
        confidence: 100,
        editable: false,
      },
      ...base,
      ...migrationRows[p.migrationType],
      ...localeRows,
    ];
  }

  return [...base, ...migrationRows[p.migrationType], ...localeRows];
}
