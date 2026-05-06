import type { LensId, Depth, RoleId, ModelId } from "./types";
import {
  Sparkles,
  Building2,
  RefreshCw,
  CreditCard,
  Wrench,
  BookOpen,
  LineChart,
  type LucideIcon,
} from "lucide-react";

export interface LensDef {
  id: LensId;
  label: string;
  short: string;
  blurb: string;
  icon: LucideIcon;
  hue: string;
}

export const LENSES: LensDef[] = [
  {
    id: "auto",
    label: "Auto",
    short: "Auto",
    blurb: "Picks the right lens based on your question. Best default.",
    icon: Sparkles,
    hue: "#525252",
  },
  {
    id: "portfolio",
    label: "Portfolio",
    short: "Portfolio",
    blurb: "NOI, occupancy, rent growth, and exception flags across the whole book.",
    icon: LineChart,
    hue: "#3b7a9e",
  },
  {
    id: "leasing",
    label: "Leasing",
    short: "Leasing",
    blurb: "Lead-to-lease, applications, tours, conversion. Tuned to leasing data.",
    icon: Building2,
    hue: "#0f766e",
  },
  {
    id: "renewals",
    label: "Renewals",
    short: "Renewals",
    blurb: "Offer mix, acceptance rate, rent growth on renewing residents.",
    icon: RefreshCw,
    hue: "#7c3aed",
  },
  {
    id: "payments",
    label: "Payments",
    short: "Payments",
    blurb: "Delinquency, online adoption, payment plans, deposit alternatives.",
    icon: CreditCard,
    hue: "#c2410c",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    short: "Maintenance",
    blurb: "Work orders, MTTR, vendor performance, after-hours dispatch.",
    icon: Wrench,
    hue: "#0891b2",
  },
  {
    id: "accounting",
    label: "Accounting",
    short: "Accounting",
    blurb: "AP, GL, invoices, variance to budget, vendor anomalies.",
    icon: BookOpen,
    hue: "#475569",
  },
];

export const LENS_BY_ID: Record<LensId, LensDef> = LENSES.reduce(
  (acc, l) => ({ ...acc, [l.id]: l }),
  {} as Record<LensId, LensDef>,
);

export interface DepthDef {
  id: Depth;
  label: string;
  blurb: string;
  thinkMs: number;
}

export const DEPTHS: DepthDef[] = [
  {
    id: "auto",
    label: "Auto",
    blurb: "Routes between Fast and Reasoning based on the question's complexity.",
    thinkMs: 800,
  },
  {
    id: "fast",
    label: "Fast",
    blurb: "Quick answer, light reasoning. Good for lookups and status checks.",
    thinkMs: 600,
  },
  {
    id: "reasoning",
    label: "Reasoning",
    blurb: "Slower, multi-step. Cites more sources, surfaces caveats.",
    thinkMs: 1700,
  },
];

export const DEPTH_BY_ID: Record<Depth, DepthDef> = DEPTHS.reduce(
  (acc, d) => ({ ...acc, [d.id]: d }),
  {} as Record<Depth, DepthDef>,
);

export interface ModelDef {
  id: ModelId;
  label: string;
  short: string;
  provider: string;
  blurb: string;
  hue: string;
  paid?: boolean;
}

export const MODELS: ModelDef[] = [
  {
    id: "auto",
    label: "Auto",
    short: "Auto",
    provider: "Entrata",
    blurb: "Routes to the best model per question. Recommended.",
    hue: "#525252",
  },
  {
    id: "entrata-tuned",
    label: "Entrata-tuned",
    short: "Entrata-tuned",
    provider: "Entrata",
    blurb: "Our internal model fine-tuned on property operations. Cheap, fast, deeply on-domain.",
    hue: "#0f766e",
  },
  {
    id: "opus-4-7",
    label: "Claude Opus 4.7",
    short: "Opus 4.7",
    provider: "Anthropic",
    blurb: "Best overall reasoning. Use for variance analysis, multi-step compliance, board-grade answers.",
    hue: "#c2410c",
    paid: true,
  },
  {
    id: "gpt-5-5",
    label: "GPT-5.5",
    short: "GPT-5.5",
    provider: "OpenAI",
    blurb: "Strong general-purpose model. Fast on long-context portfolio queries.",
    hue: "#3b7a9e",
    paid: true,
  },
  {
    id: "kimi-k2-5",
    label: "Kimi K2.5",
    short: "Kimi K2.5",
    provider: "Moonshot",
    blurb: "Open-source. Excellent code + long-document reasoning. Good for AP / invoice work.",
    hue: "#7c3aed",
  },
];

export const MODEL_BY_ID: Record<ModelId, ModelDef> = MODELS.reduce(
  (acc, m) => ({ ...acc, [m.id]: m }),
  {} as Record<ModelId, ModelDef>,
);

export interface RoleDef {
  id: RoleId;
  label: string;
  blurb: string;
  defaultLens: LensId;
}

export const ROLES: RoleDef[] = [
  {
    id: "vp-ops",
    label: "VP of Operations",
    blurb: "Portfolio-wide. NOI, exceptions, week-over-week movement.",
    defaultLens: "portfolio",
  },
  {
    id: "regional",
    label: "Regional Manager",
    blurb: "5–20 properties. Trends, outliers, where to focus this week.",
    defaultLens: "portfolio",
  },
  {
    id: "onsite-pm",
    label: "On-site Property Manager",
    blurb: "One property. Today's leases, work orders, payments, residents.",
    defaultLens: "auto",
  },
  {
    id: "asset-mgr",
    label: "Asset Manager / Owner",
    blurb: "Underwriting vs. actual. Capital allocation. NOI per unit.",
    defaultLens: "portfolio",
  },
  {
    id: "accounting",
    label: "Accounting / AP",
    blurb: "Ledger, AP, GL, vendor anomalies, variance to budget.",
    defaultLens: "accounting",
  },
];

export const ROLE_BY_ID: Record<RoleId, RoleDef> = ROLES.reduce(
  (acc, r) => ({ ...acc, [r.id]: r }),
  {} as Record<RoleId, RoleDef>,
);
