"use client";

/**
 * Agent Knowledge Hub
 * ───────────────────
 * Per-property, unstructured knowledge base for AI property-management agents.
 * Built from AGENT-KNOWLEDGE-HUB-BUILD-SPEC.md.
 *
 * Layout (single-file by project convention):
 *   1) Types
 *   2) Meta (label/icon/color maps)
 *   3) Seed data
 *   4) Helper sub-components (badges, chips, sections)
 *   5) Tab views (Knowledge / Knowledge Gaps / Suggested)
 *   6) Add Knowledge dialog (type picker + type-specific form)
 *   7) Entry detail sheet
 *   8) Page (state owner)
 */

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { PropertySelector } from "@/components/property-filter";
import { PROPERTY_FILTER_DATA } from "@/lib/voice-properties";
import {
  Plus,
  Search,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Wand2,
  ShieldAlert,
  ShieldOff,
  ListChecks,
  Layers,
  Building2,
  Home,
  MapPin,
  Calendar,
  Clock,
  Tag,
  HelpCircle,
  PawPrint,
  Car,
  DollarSign,
  ScrollText,
  Map as MapIcon,
  GitBranch,
  Pin,
  Pencil,
  Archive,
  X as XIcon,
  ArrowLeft,
  History,
  Quote,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────
 * 1) Types
 * ──────────────────────────────────────────────────────────── */

type EntryType = "factual" | "clarification" | "suppression" | "procedure";
type EntryStatus = "approved" | "in_review" | "draft" | "suppressed" | "archived";
type EntrySource = "manual" | "ai_suggested" | "from_conversation" | "pms";
type CategoryGroup = "pms_mirror" | "hub_only";

type MirrorCategory =
  | "pricing"
  | "policies"
  | "amenities"
  | "pet_rules"
  | "parking"
  | "specials"
  | "office_hours"
  | "faqs";
type HubCategory =
  | "wayfinding"
  | "local_context"
  | "seasonal"
  | "escalation_rules"
  | "guardrails";
type Category = MirrorCategory | HubCategory;

type AgentName = "Leasing AI" | "Renewals AI" | "Maintenance AI" | "Payments AI";

interface KnowledgeVersion {
  version: number;
  date: string;
  author: string;
  note: string;
  /** Snapshot of the entry's content at this version (when available). */
  title?: string;
  body?: string;
}

interface KnowledgeEntry {
  id: string;
  type: EntryType;
  group: CategoryGroup;
  category: Category;
  title: string;
  body: string;
  status: EntryStatus;
  source: EntrySource;
  scope: "portfolio" | "property";
  overridesPortfolio?: { label: string; portfolioValue: string };
  owner: string;
  version: number;
  history: KnowledgeVersion[];
  usageCount: number;
  updatedAt: string;
  agents: AgentName[];
  expiresAt?: string;
  entrataSetting?: { name: string; value: string };
  suppressReason?: string;
  redirectMessage?: string;
  triggers?: string[];
  steps?: string[];
  tag?: string;
}

interface KnowledgeGap {
  id: string;
  question: string;
  impact: "high" | "medium" | "low";
  escalations: number;
  staffAnswer: string;
  conflicting?: boolean;
  conflictNote?: string;
  suggestedType: EntryType;
  suggestedCategory: Category;
  agent: AgentName;
  lastSeen: string;
}

interface SuggestedEntry {
  id: string;
  source: "from_conversation" | "ai_inferred";
  proposedTitle: string;
  proposedBody: string;
  suggestedType: EntryType;
  suggestedCategory: Category;
  confidence: number;
  evidence: string;
  agent: AgentName;
  date: string;
}

interface AddPrefill {
  type: EntryType;
  category: Category;
  title: string;
  body: string;
  origin?: string;
  /** When set, submitting edits this existing entry in place (new version) instead of creating a new row. */
  editId?: string;
}

type LevelFilter = "all" | "portfolio" | "property";
type TypeFilter = "all" | EntryType;
type ViewState = "normal" | "loading" | "error" | "empty";

/* ──────────────────────────────────────────────────────────────
 * 2) Meta — label/icon/color maps
 * ──────────────────────────────────────────────────────────── */

const TYPE_META: Record<
  EntryType,
  {
    label: string;
    plural: string;
    icon: typeof Sparkles;
    badge: string; // tailwind classes for the type badge
    accent: string; // soft tint background for emphasis blocks
    usageVerb: string; // "used" | "blocked" | "triggered"
    blurb: string; // shown on the type picker
  }
> = {
  factual: {
    label: "Factual",
    plural: "Factual",
    icon: CheckCircle2,
    badge: "bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200",
    accent: "bg-blue-50/60 border-blue-200",
    usageVerb: "used",
    blurb: "A true thing the AI can share — wayfinding, dimensions, amenities, local context.",
  },
  clarification: {
    label: "Clarification",
    plural: "Clarifications",
    icon: Wand2,
    badge: "bg-purple-50 text-purple-800 ring-1 ring-inset ring-purple-200",
    accent: "bg-purple-50/60 border-purple-200",
    usageVerb: "used",
    blurb: "The PMS says one thing — the real answer differs. The AI prefers this.",
  },
  suppression: {
    label: "Guardrail",
    plural: "Guardrails",
    icon: ShieldAlert,
    badge: "bg-red-50 text-red-800 ring-1 ring-inset ring-red-200",
    accent: "bg-red-50/60 border-red-200",
    usageVerb: "blocked",
    blurb: "A topic the AI must NOT discuss — with a redirect for the prospect.",
  },
  procedure: {
    label: "Procedure",
    plural: "Procedures",
    icon: ListChecks,
    badge: "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200",
    accent: "bg-amber-50/60 border-amber-200",
    usageVerb: "triggered",
    blurb: "Named triggers + ordered steps for sensitive situations and escalations.",
  },
};

const STATUS_META: Record<
  EntryStatus,
  { label: string; cls: string }
> = {
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200" },
  in_review: { label: "In review", cls: "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200" },
  draft: { label: "Draft", cls: "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200" },
  suppressed: { label: "Suppressed", cls: "bg-red-50 text-red-800 ring-1 ring-inset ring-red-200" },
  archived: { label: "Archived", cls: "bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-200" },
};

const SOURCE_LABEL: Record<EntrySource, string> = {
  manual: "Manual",
  ai_suggested: "AI-suggested",
  from_conversation: "From conversation",
  pms: "PMS",
};

const CATEGORY_META: Record<
  Category,
  { label: string; group: CategoryGroup; icon: typeof Sparkles }
> = {
  pricing: { label: "Pricing", group: "pms_mirror", icon: DollarSign },
  policies: { label: "Policies", group: "pms_mirror", icon: ScrollText },
  amenities: { label: "Amenities", group: "pms_mirror", icon: Sparkles },
  pet_rules: { label: "Pet rules", group: "pms_mirror", icon: PawPrint },
  parking: { label: "Parking", group: "pms_mirror", icon: Car },
  specials: { label: "Specials", group: "pms_mirror", icon: Tag },
  office_hours: { label: "Office hours", group: "pms_mirror", icon: Clock },
  faqs: { label: "FAQs", group: "pms_mirror", icon: HelpCircle },
  wayfinding: { label: "Wayfinding", group: "hub_only", icon: MapPin },
  local_context: { label: "Local context", group: "hub_only", icon: MapIcon },
  seasonal: { label: "Seasonal", group: "hub_only", icon: Calendar },
  escalation_rules: { label: "Escalation rules", group: "hub_only", icon: GitBranch },
  guardrails: { label: "Guardrails", group: "hub_only", icon: ShieldOff },
};

const MIRROR_CATEGORIES: MirrorCategory[] = [
  "pricing",
  "policies",
  "amenities",
  "pet_rules",
  "parking",
  "specials",
  "office_hours",
  "faqs",
];
const HUB_CATEGORIES: HubCategory[] = [
  "wayfinding",
  "local_context",
  "seasonal",
  "escalation_rules",
  "guardrails",
];

const IMPACT_META: Record<
  KnowledgeGap["impact"],
  { label: string; cls: string }
> = {
  high: { label: "High impact", cls: "bg-red-50 text-red-800 ring-1 ring-inset ring-red-200" },
  medium: { label: "Medium impact", cls: "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200" },
  low: { label: "Low impact", cls: "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200" },
};

const TYPE_DEFAULT_CATEGORY: Record<EntryType, Category> = {
  factual: "faqs",
  clarification: "pricing",
  suppression: "guardrails",
  procedure: "escalation_rules",
};

const DEFAULT_PROPERTY = "Sunset Ridge Apartments";

/* ──────────────────────────────────────────────────────────────
 * 3) Seed data
 * ──────────────────────────────────────────────────────────── */

const SEED_ENTRIES: KnowledgeEntry[] = [
  {
    id: "e-1",
    type: "clarification",
    group: "pms_mirror",
    category: "pet_rules",
    title: "Pet rent waived for current employees",
    body:
      "Pet rent is $35/mo in the PMS, but waived for current employees as a perk. Verify employment first via HR portal before quoting.",
    status: "approved",
    source: "manual",
    scope: "property",
    owner: "J. Ruiz",
    version: 3,
    history: [
      {
        version: 3,
        date: "May 12, 2026",
        author: "J. Ruiz",
        note: "Added HR-portal verification step.",
        title: "Pet rent waived for current employees",
        body: "Pet rent is $35/mo in the PMS, but waived for current employees as a perk. Verify employment first via HR portal before quoting.",
      },
      {
        version: 2,
        date: "Apr 02, 2026",
        author: "J. Ruiz",
        note: "Clarified that this is a perk, not a discount.",
        title: "Pet rent waived for current employees",
        body: "Pet rent is $35/mo in the PMS, but waived for current employees as a perk.",
      },
      {
        version: 1,
        date: "Feb 18, 2026",
        author: "J. Ruiz",
        note: "Submitted for review.",
        title: "Pet rent waived for employees",
        body: "Pet rent is waived for current employees.",
      },
    ],
    usageCount: 41,
    updatedAt: "May 12, 2026",
    agents: ["Leasing AI", "Renewals AI"],
    entrataSetting: { name: "Pet rent (monthly)", value: "$35.00" },
  },
  {
    id: "e-2",
    type: "factual",
    group: "pms_mirror",
    category: "parking",
    title: "Guest parking — portfolio standard",
    body:
      "Guests may park in any unmarked spot. No permit required. Overnight parking is allowed up to 3 consecutive nights.",
    status: "approved",
    source: "pms",
    scope: "portfolio",
    owner: "Corporate",
    version: 2,
    history: [
      {
        version: 2,
        date: "Mar 22, 2026",
        author: "Corporate",
        note: "Extended overnight allowance from 1 to 3 nights.",
        title: "Guest parking — portfolio standard",
        body: "Guests may park in any unmarked spot. No permit required. Overnight parking is allowed up to 3 consecutive nights.",
      },
      {
        version: 1,
        date: "Jan 06, 2026",
        author: "Corporate",
        note: "Initial portfolio standard.",
        title: "Guest parking — portfolio standard",
        body: "Guests may park in any unmarked spot. No permit required. Overnight parking is allowed for 1 night.",
      },
    ],
    usageCount: 27,
    updatedAt: "Mar 22, 2026",
    agents: ["Leasing AI"],
  },
  {
    id: "e-3",
    type: "factual",
    group: "pms_mirror",
    category: "parking",
    title: "Guest parking requires a permit at this property",
    body:
      "The lot is shared with ground-floor retail, so guests must get a permit from the office. No overnight guest parking.",
    status: "approved",
    source: "manual",
    scope: "property",
    owner: "J. Ruiz",
    version: 1,
    history: [
      {
        version: 1,
        date: "Apr 18, 2026",
        author: "J. Ruiz",
        note: "Submitted for review.",
        title: "Guest parking requires a permit at this property",
        body: "The lot is shared with ground-floor retail, so guests must get a permit from the office. No overnight guest parking.",
      },
    ],
    usageCount: 14,
    updatedAt: "Apr 18, 2026",
    agents: ["Leasing AI"],
    overridesPortfolio: {
      label: "Guest parking — portfolio standard",
      portfolioValue:
        "Guests may park in any unmarked spot. No permit required. Overnight allowed up to 3 consecutive nights.",
    },
  },
  {
    id: "e-4",
    type: "factual",
    group: "hub_only",
    category: "wayfinding",
    title: "Main office entrance is around the back",
    body:
      "Main entrance is around the back, off the Camelback Rd lot. The front door is locked, staff-only. Tell prospects to park in the lot, not the street — street parking is metered M–F 8a–6p.",
    status: "approved",
    source: "manual",
    scope: "property",
    owner: "J. Ruiz",
    version: 2,
    history: [
      {
        version: 2,
        date: "May 02, 2026",
        author: "J. Ruiz",
        note: "Added street-parking detail.",
        title: "Main office entrance is around the back",
        body: "Main entrance is around the back, off the Camelback Rd lot. The front door is locked, staff-only. Tell prospects to park in the lot, not the street — street parking is metered M–F 8a–6p.",
      },
      {
        version: 1,
        date: "Feb 11, 2026",
        author: "J. Ruiz",
        note: "Submitted for review.",
        title: "Main office entrance is around the back",
        body: "Main entrance is around the back, off the Camelback Rd lot. The front door is locked, staff-only.",
      },
    ],
    usageCount: 240,
    updatedAt: "May 02, 2026",
    agents: ["Leasing AI", "Maintenance AI"],
  },
  {
    id: "e-5",
    type: "factual",
    group: "hub_only",
    category: "amenities",
    title: 'Bedroom window heights (A1 floor plan)',
    body:
      'In the A1 one-bedroom, the window sill sits 30" off the floor and the window is 48" tall. Prospects ask to check if nightstands fit.',
    status: "approved",
    source: "manual",
    scope: "property",
    owner: "M. Chen",
    version: 1,
    history: [
      {
        version: 1,
        date: "Mar 04, 2026",
        author: "M. Chen",
        note: "Submitted for review.",
        title: "Bedroom window heights (A1 floor plan)",
        body: 'In the A1 one-bedroom, the window sill sits 30" off the floor and the window is 48" tall. Prospects ask to check if nightstands fit.',
      },
    ],
    usageCount: 12,
    updatedAt: "Mar 04, 2026",
    agents: ["Leasing AI"],
  },
  {
    id: "e-6",
    type: "suppression",
    group: "hub_only",
    category: "guardrails",
    title: "Don't discuss the property smoking policy",
    body: "Smoking policy is under legal review. The AI must not state or speculate on the current policy.",
    status: "suppressed",
    source: "manual",
    scope: "property",
    owner: "Legal / Corporate",
    version: 1,
    history: [
      {
        version: 1,
        date: "Jun 01, 2026",
        author: "Legal / Corporate",
        note: "Suppression activated pending legal review.",
        title: "Don't discuss the property smoking policy",
        body: "Smoking policy is under legal review. The AI must not state or speculate on the current policy.",
      },
    ],
    usageCount: 12,
    updatedAt: "Jun 01, 2026",
    agents: ["Leasing AI", "Renewals AI"],
    suppressReason:
      "Under legal review pending a city ordinance change. No agent should state the policy until counsel signs off.",
    redirectMessage:
      "Great question — let me connect you with a leasing agent who can give you the most up-to-date details.",
  },
  {
    id: "e-7",
    type: "procedure",
    group: "hub_only",
    category: "escalation_rules",
    title: "March water leak — units 305–315",
    body: "Anyone asking about the March water leak in units 305–315 should be handled with care — don't give specifics.",
    status: "approved",
    source: "manual",
    scope: "property",
    owner: "M. Chen",
    version: 2,
    history: [
      {
        version: 2,
        date: "Apr 28, 2026",
        author: "M. Chen",
        note: "Added the 'tag the conversation' step.",
        title: "March water leak — units 305–315",
        body: "Anyone asking about the March water leak in units 305–315 should be handled with care — don't give specifics. Acknowledge, apologize, hand off to the onsite team within the hour, and tag the conversation 'water-leak' for legal review.",
      },
      {
        version: 1,
        date: "Mar 30, 2026",
        author: "M. Chen",
        note: "Submitted for review.",
        title: "March water leak — units 305–315",
        body: "Anyone asking about the March water leak in units 305–315 should be handled with care — don't give specifics. Acknowledge, apologize, and hand off to the onsite team within the hour.",
      },
    ],
    usageCount: 7,
    updatedAt: "Apr 28, 2026",
    agents: ["Maintenance AI", "Leasing AI"],
    triggers: ["water leak", "units 305-315", "mold", "ceiling damage"],
    tag: "water-leak",
    steps: [
      "Don't answer with specifics about cause, scope, or repair status.",
      "Acknowledge warmly and apologize for the inconvenience.",
      "Hand off to the onsite team within the hour.",
      "Tag the conversation 'water-leak' so legal can review.",
    ],
  },
  {
    id: "e-8",
    type: "factual",
    group: "hub_only",
    category: "seasonal",
    title: "Pool closed for resurfacing",
    body:
      "Pool closed for resurfacing Jun 10 – Jul 15. Hot tub and gym remain open. Give the reopening date and apologize for the inconvenience.",
    status: "approved",
    source: "manual",
    scope: "property",
    owner: "J. Ruiz",
    version: 1,
    history: [
      {
        version: 1,
        date: "Jun 08, 2026",
        author: "J. Ruiz",
        note: "Submitted for review.",
        title: "Pool closed for resurfacing",
        body: "Pool closed for resurfacing Jun 10 – Jul 15. Hot tub and gym remain open. Give the reopening date and apologize for the inconvenience.",
      },
    ],
    usageCount: 34,
    updatedAt: "Jun 08, 2026",
    expiresAt: "Jul 15, 2026",
    agents: ["Leasing AI", "Maintenance AI"],
  },
  {
    id: "e-9",
    type: "factual",
    group: "hub_only",
    category: "wayfinding",
    title: "Resident gate code procedure",
    body:
      "Residents get the gate code at move-in via the welcome email. Never give prospects the code — direct them to the call box (#2201).",
    status: "in_review",
    source: "manual",
    scope: "property",
    owner: "A. Patel",
    version: 1,
    history: [
      {
        version: 1,
        date: "Jun 14, 2026",
        author: "A. Patel",
        note: "Submitted for review.",
        title: "Resident gate code procedure",
        body: "Residents get the gate code at move-in via the welcome email. Never give prospects the code — direct them to the call box (#2201).",
      },
    ],
    usageCount: 0,
    updatedAt: "Jun 14, 2026",
    agents: ["Leasing AI", "Maintenance AI"],
  },
  {
    id: "e-10",
    type: "factual",
    group: "hub_only",
    category: "local_context",
    title: "Closest coffee + walk-up breakfast",
    body:
      "Cartel Roasting Co. (5 min walk, north on Central). Matt's Big Breakfast is 10 min by car. Prospects on tours often ask.",
    status: "approved",
    source: "from_conversation",
    scope: "property",
    owner: "M. Chen",
    version: 1,
    history: [
      {
        version: 1,
        date: "Apr 11, 2026",
        author: "M. Chen",
        note: "Approved from a conversation suggestion.",
        title: "Closest coffee + walk-up breakfast",
        body: "Cartel Roasting Co. (5 min walk, north on Central). Matt's Big Breakfast is 10 min by car. Prospects on tours often ask.",
      },
    ],
    usageCount: 18,
    updatedAt: "Apr 11, 2026",
    agents: ["Leasing AI"],
  },
];

const SEED_GAPS: KnowledgeGap[] = [
  {
    id: "g-1",
    question: "Are there EV chargers on site?",
    impact: "high",
    escalations: 18,
    agent: "Leasing AI",
    lastSeen: "2 hours ago",
    staffAnswer:
      "Yes — 4 Level-2 chargers in the garage on P1, $0.20/kWh billed to the resident. First-come, no reserved spots.",
    suggestedType: "factual",
    suggestedCategory: "amenities",
  },
  {
    id: "g-2",
    question: "Can I pay rent with a credit card?",
    impact: "high",
    escalations: 9,
    agent: "Payments AI",
    lastSeen: "5 hours ago",
    staffAnswer: "Credit card accepted in the portal with a 2.95% fee. ACH is free.",
    conflicting: true,
    conflictNote: "Staff disagree: 3 said 'yes, with a fee', 6 said 'no, ACH only'. Resolve before publishing.",
    suggestedType: "clarification",
    suggestedCategory: "pricing",
  },
  {
    id: "g-3",
    question: "Do you offer short-term or month-to-month leases?",
    impact: "medium",
    escalations: 5,
    agent: "Leasing AI",
    lastSeen: "2 days ago",
    staffAnswer: "Minimum term is 7 months. Month-to-month is available after the initial term at a $300/mo premium.",
    suggestedType: "factual",
    suggestedCategory: "policies",
  },
  {
    id: "g-4",
    question: "What's the SLA for an after-hours plumbing leak?",
    impact: "low",
    escalations: 3,
    agent: "Maintenance AI",
    lastSeen: "4 days ago",
    staffAnswer:
      "After-hours emergencies: a tech is on-site within 90 minutes. Anything containable (slow drip) is queued for the next morning.",
    suggestedType: "factual",
    suggestedCategory: "policies",
  },
];

const SEED_SUGGESTIONS: SuggestedEntry[] = [
  {
    id: "s-1",
    source: "from_conversation",
    proposedTitle: "Self-guided tours available after hours",
    proposedBody:
      "Prospects can book a self-guided tour 8am–8pm daily; they check in at the call box with a code texted 15 min before.",
    suggestedType: "factual",
    suggestedCategory: "faqs",
    confidence: 0.92,
    agent: "Leasing AI",
    date: "1 hour ago",
    evidence:
      "Generated from 4 leasing conversations this week where the agent answered after-hours tour questions consistently with the same details.",
  },
  {
    id: "s-2",
    source: "ai_inferred",
    proposedTitle: "Renewal offers go out 90 days before lease end",
    proposedBody:
      "The agent repeatedly cited a 60-day window, but staff corrected it to 90 days in 3 conversations. Suggest updating to 90 days.",
    suggestedType: "clarification",
    suggestedCategory: "policies",
    confidence: 0.78,
    agent: "Renewals AI",
    date: "yesterday",
    evidence:
      "Inferred from 3 Renewals AI handoffs where staff corrected the renewal-window timing. PMS lease-renewal flag is set to 90 days.",
  },
  {
    id: "s-3",
    source: "from_conversation",
    proposedTitle: "Package room hours and overflow policy",
    proposedBody:
      "Package room: 6a–10p with fob access. Oversized packages held at the leasing office during business hours. After 7 days, returned to sender.",
    suggestedType: "factual",
    suggestedCategory: "amenities",
    confidence: 0.86,
    agent: "Leasing AI",
    date: "yesterday",
    evidence: "Synthesized from 6 prospect/resident conversations in the past 10 days.",
  },
];

/* ──────────────────────────────────────────────────────────────
 * 4) Helper sub-components — small badges, chips, pills
 * ──────────────────────────────────────────────────────────── */

function Pill({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

function TypeBadge({ type }: { type: EntryType }) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  return (
    <Pill className={meta.badge}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Pill>
  );
}

function StatusBadge({ status }: { status: EntryStatus }) {
  const meta = STATUS_META[status];
  return <Pill className={meta.cls}>{meta.label}</Pill>;
}

function LevelBadge({ scope }: { scope: KnowledgeEntry["scope"] }) {
  if (scope === "portfolio") {
    return (
      <Pill className="bg-indigo-50 text-indigo-800 ring-1 ring-inset ring-indigo-200">
        <Building2 className="h-3 w-3" />
        Portfolio
        <span className="ml-1 italic font-normal text-indigo-700/80">inherited</span>
      </Pill>
    );
  }
  return (
    <Pill className="bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200">
      <Pin className="h-3 w-3" />
      Property
    </Pill>
  );
}

function OverridesBadge() {
  return (
    <Pill className="bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200">
      <Layers className="h-3 w-3" />
      Overrides portfolio
    </Pill>
  );
}

function ImpactBadge({ impact }: { impact: KnowledgeGap["impact"] }) {
  const meta = IMPACT_META[impact];
  return <Pill className={meta.cls}>{meta.label}</Pill>;
}

function CategoryChip({ category }: { category: Category }) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function AgentChip({ agent }: { agent: AgentName }) {
  const tone =
    agent === "Leasing AI"
      ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
      : agent === "Renewals AI"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : agent === "Payments AI"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : "bg-sky-50 text-sky-700 ring-sky-200";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        tone
      )}
    >
      {agent}
    </span>
  );
}

function SegmentedRow<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-lg bg-muted p-0.5", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
          {typeof opt.count === "number" && (
            <span
              className={cn(
                "rounded-full px-1.5 py-px text-[10px] font-semibold",
                value === opt.value ? "bg-muted text-foreground" : "bg-background/60 text-muted-foreground"
              )}
            >
              {opt.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * 5) Page (state owner — full implementation)
 * ──────────────────────────────────────────────────────────── */

export default function AgentKnowledgeHubPage() {
  const [property, setProperty] = useState<string>(DEFAULT_PROPERTY);
  const [tab, setTab] = useState<string>("knowledge");
  const [viewState, setViewState] = useState<ViewState>("normal");

  // Mutable state (in-memory for the prototype)
  const [entries, setEntries] = useState<KnowledgeEntry[]>(SEED_ENTRIES);
  const [gaps, setGaps] = useState<KnowledgeGap[]>(SEED_GAPS);
  const [suggestions, setSuggestions] = useState<SuggestedEntry[]>(SEED_SUGGESTIONS);

  // Knowledge tab filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_review">("all");

  // Add flow
  const [addOpen, setAddOpen] = useState(false);
  const [addPrefill, setAddPrefill] = useState<AddPrefill | null>(null);
  // Gap currently being turned into a canonical answer. Only removed from the
  // gaps list once the answer is actually saved — never on cancel / click-out.
  const [pendingGapId, setPendingGapId] = useState<string | null>(null);

  // Detail sheet
  const [selected, setSelected] = useState<KnowledgeEntry | null>(null);

  // Derived counts (use full entries set, not filtered, for the cascade strip)
  const portfolioTotal = entries.filter((e) => e.scope === "portfolio").length;
  const propertyTotal = entries.filter((e) => e.scope === "property").length;
  const propertyOverrides = entries.filter((e) => !!e.overridesPortfolio).length;
  const pendingReviewCount = entries.filter((e) => e.status === "in_review").length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (statusFilter === "in_review" && e.status !== "in_review") return false;
      if (q.length === 0) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q) ||
        CATEGORY_META[e.category].label.toLowerCase().includes(q)
      );
    });
  }, [entries, search, typeFilter, statusFilter]);

  const portfolioFiltered = filtered.filter((e) => e.scope === "portfolio");
  const propertyFiltered = filtered.filter((e) => e.scope === "property");

  // Visible-after-level-filter (the cascade tiles act as scope filters)
  const showPortfolio = levelFilter === "all" || levelFilter === "portfolio";
  const showProperty = levelFilter === "all" || levelFilter === "property";
  const totalFilteredAcross =
    (showPortfolio ? portfolioFiltered.length : 0) +
    (showProperty ? propertyFiltered.length : 0);
  const filtersActive =
    search.trim().length > 0 ||
    typeFilter !== "all" ||
    levelFilter !== "all" ||
    statusFilter !== "all";

  // ── Action handlers ────────────────────────────────────────────
  const openAdd = (prefill?: AddPrefill | null) => {
    setAddPrefill(prefill ?? null);
    setAddOpen(true);
  };

  const submitNewEntry = (e: KnowledgeEntry) => {
    setEntries((prev) => {
      const existing = prev.find((x) => x.id === e.id);
      if (existing) {
        // Edit-in-place: keep the same row, bump the version, and append history
        // rather than creating a duplicate entry.
        const nextVersion = existing.version + 1;
        const updated: KnowledgeEntry = {
          ...existing,
          type: e.type,
          group: e.group,
          category: e.category,
          title: e.title,
          body: e.body,
          scope: e.scope,
          status: "in_review",
          owner: "You",
          version: nextVersion,
          updatedAt: "Just now",
          expiresAt: e.expiresAt,
          entrataSetting: e.entrataSetting,
          suppressReason: e.suppressReason,
          redirectMessage: e.redirectMessage,
          triggers: e.triggers,
          steps: e.steps,
          tag: e.tag,
          history: [
            {
              version: nextVersion,
              date: new Date().toLocaleDateString(),
              author: "You",
              note: "Edited — submitted for review.",
              title: e.title,
              body: e.body,
            },
            ...existing.history,
          ],
        };
        return prev.map((x) => (x.id === e.id ? updated : x));
      }
      return [e, ...prev];
    });
    // Only now that the answer is saved do we resolve the originating gap.
    if (pendingGapId) {
      dismissGap(pendingGapId);
      setPendingGapId(null);
    }
    setTab("knowledge");
  };

  const dismissGap = (id: string) => setGaps((prev) => prev.filter((g) => g.id !== id));

  const draftFromGap = (g: KnowledgeGap) => {
    setPendingGapId(g.id);
    openAdd({
      type: g.suggestedType,
      category: g.suggestedCategory,
      title: g.question,
      body: g.staffAnswer,
      origin: `Drafted from ${g.escalations} escalation${g.escalations === 1 ? "" : "s"} (last seen ${g.lastSeen})`,
    });
  };

  const suggestionSourceLabel = (s: SuggestedEntry) =>
    s.source === "from_conversation" ? "From conversation" : "AI-inferred";

  const approveSuggestion = (s: SuggestedEntry) => {
    const entrySource: EntrySource =
      s.source === "from_conversation" ? "from_conversation" : "ai_suggested";
    const newEntry: KnowledgeEntry = {
      id: `e-${Date.now()}`,
      type: s.suggestedType,
      group: CATEGORY_META[s.suggestedCategory].group,
      category: s.suggestedCategory,
      title: s.proposedTitle,
      body: s.proposedBody,
      status: "approved",
      source: entrySource,
      scope: "property",
      owner: "You (approved)",
      version: 1,
      history: [
        { version: 1, date: new Date().toLocaleDateString(), author: "You", note: `Approved from ${suggestionSourceLabel(s)} suggestion.` },
      ],
      usageCount: 0,
      updatedAt: "Just now",
      agents: [s.agent],
    };
    setEntries((prev) => [newEntry, ...prev]);
    setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
  };

  const editSuggestion = (s: SuggestedEntry) => {
    openAdd({
      type: s.suggestedType,
      category: s.suggestedCategory,
      title: s.proposedTitle,
      body: s.proposedBody,
      origin: `From ${suggestionSourceLabel(s)} suggestion (${Math.round(s.confidence * 100)}% confidence)`,
    });
    setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
  };

  const rejectSuggestion = (id: string) =>
    setSuggestions((prev) => prev.filter((x) => x.id !== id));

  const archiveEntry = (id: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "archived" as EntryStatus } : e))
    );
    setSelected(null);
  };

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setLevelFilter("all");
    setStatusFilter("all");
  };

  // Approve a pending entry (review loop)
  const approveEntry = (id: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: "approved" as EntryStatus,
              version: e.version + 1,
              updatedAt: "Just now",
              history: [
                {
                  version: e.version + 1,
                  date: new Date().toLocaleDateString(),
                  author: "You",
                  note: "Approved.",
                  title: e.title,
                  body: e.body,
                },
                ...e.history,
              ],
            }
          : e
      )
    );
    // Reflect the change in the detail sheet without dismissing it.
    setSelected((prev) =>
      prev && prev.id === id
        ? {
            ...prev,
            status: "approved",
            version: prev.version + 1,
            updatedAt: "Just now",
            history: [
              {
                version: prev.version + 1,
                date: new Date().toLocaleDateString(),
                author: "You",
                note: "Approved.",
                title: prev.title,
                body: prev.body,
              },
              ...prev.history,
            ],
          }
        : prev
    );
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="page-content space-y-6 pb-12">
      <PageHeader
        title="Agent Knowledge Hub"
        description={
          <span className="inline-flex items-center gap-1.5">
            What the agents know about this property — beyond property settings.
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="How knowledge levels work"
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="max-w-xs text-xs leading-relaxed">
                  <span className="font-medium text-foreground">Portfolio knowledge</span> is set by
                  corporate and inherited everywhere.{" "}
                  <span className="font-medium text-foreground">Property knowledge</span> is added here
                  and overrides the portfolio default where they differ.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <PropertySelector
              data={PROPERTY_FILTER_DATA}
              defaultDropdownOption="Property List"
              triggerWidthClassName="h-10 w-[240px] font-medium"
              panelHeight={460}
              selectedPropertyIds={[property]}
              onSelectedIdsChange={(ids) => {
                const added = ids.find((id) => id !== property);
                if (added) setProperty(added);
              }}
            />
            <Button size="lg" onClick={() => openAdd(null)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add knowledge
            </Button>
            {/* Discreet view-state simulator (per spec §8) — hidden for now, re-enable when needed */}
            {/* <Select value={viewState} onValueChange={(v) => setViewState(v as ViewState)}>
              <SelectTrigger className="h-9 w-[120px] text-xs text-muted-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">View: Normal</SelectItem>
                <SelectItem value="loading">View: Loading</SelectItem>
                <SelectItem value="error">View: Error</SelectItem>
                <SelectItem value="empty">View: Empty</SelectItem>
              </SelectContent>
            </Select> */}
          </div>
        }
      />

      {viewState === "error" && (
        <Card className="border-red-200 bg-red-50/60">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
            <div className="flex-1">
              <p className="font-medium text-red-900">Couldn't load property knowledge</p>
              <p className="text-red-800/80">Something went wrong reaching the knowledge service. Try again.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setViewState("normal")}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="gaps">
            Knowledge Gaps
            {gaps.length > 0 && (
              <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                {gaps.length}
              </span>
            )}
          </TabsTrigger>
          {/* Suggested tab — hidden for now, re-enable when needed */}
          {/* <TabsTrigger value="suggested">
            Suggested
            {suggestions.length > 0 && (
              <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-100 px-1.5 text-[10px] font-semibold text-purple-800 ring-1 ring-inset ring-purple-200">
                {suggestions.length}
              </span>
            )}
          </TabsTrigger> */}
        </TabsList>

        <TabsContent value="knowledge" className="space-y-4">
          <KnowledgeTab
            viewState={viewState}
            entries={entries}
            portfolioFiltered={portfolioFiltered}
            propertyFiltered={propertyFiltered}
            portfolioTotal={portfolioTotal}
            propertyTotal={propertyTotal}
            showPortfolio={showPortfolio}
            showProperty={showProperty}
            totalFilteredAcross={totalFilteredAcross}
            filtersActive={filtersActive}
            property={property}
            search={search}
            setSearch={setSearch}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            levelFilter={levelFilter}
            setLevelFilter={setLevelFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            pendingReviewCount={pendingReviewCount}
            onClearFilters={clearFilters}
            onSelectEntry={setSelected}
            onAdd={() => openAdd(null)}
          />
        </TabsContent>

        <TabsContent value="gaps" className="space-y-4">
          <GapsTab gaps={gaps} onDismiss={dismissGap} onDraft={draftFromGap} />
        </TabsContent>

        {/* Suggested tab content — hidden for now, re-enable when needed */}
        {/* <TabsContent value="suggested" className="space-y-4">
          <SuggestedTab
            suggestions={suggestions}
            onApprove={approveSuggestion}
            onEdit={editSuggestion}
            onReject={rejectSuggestion}
          />
        </TabsContent> */}
      </Tabs>

      <AddKnowledgeDialog
        open={addOpen}
        onOpenChange={(v) => {
          setAddOpen(v);
          if (!v) {
            setAddPrefill(null);
            // Closed without saving (cancel / click-outside) — leave the gap untouched.
            setPendingGapId(null);
          }
        }}
        prefill={addPrefill}
        property={property}
        onSubmit={submitNewEntry}
      />

      <EntryDetailSheet
        entry={selected}
        onClose={() => setSelected(null)}
        onArchive={archiveEntry}
        onApprove={approveEntry}
        onEdit={(e) => {
          setSelected(null);
          openAdd({
            editId: e.id,
            type: e.type,
            category: e.category,
            title: e.title,
            body: e.body,
            origin: `Editing v${e.version} · last updated ${e.updatedAt}`,
          });
        }}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * 6) KnowledgeTab — coverage card, filters, two grouped sections
 * ──────────────────────────────────────────────────────────── */

interface KnowledgeTabProps {
  viewState: ViewState;
  entries: KnowledgeEntry[];
  portfolioFiltered: KnowledgeEntry[];
  propertyFiltered: KnowledgeEntry[];
  portfolioTotal: number;
  propertyTotal: number;
  showPortfolio: boolean;
  showProperty: boolean;
  totalFilteredAcross: number;
  filtersActive: boolean;
  property: string;
  search: string;
  setSearch: (v: string) => void;
  typeFilter: TypeFilter;
  setTypeFilter: (v: TypeFilter) => void;
  levelFilter: LevelFilter;
  setLevelFilter: (v: LevelFilter) => void;
  statusFilter: "all" | "in_review";
  setStatusFilter: (v: "all" | "in_review") => void;
  pendingReviewCount: number;
  onClearFilters: () => void;
  onSelectEntry: (e: KnowledgeEntry) => void;
  onAdd: () => void;
}

function KnowledgeTab(props: KnowledgeTabProps) {
  const {
    viewState,
    entries,
    portfolioFiltered,
    propertyFiltered,
    portfolioTotal,
    propertyTotal,
    showPortfolio,
    showProperty,
    totalFilteredAcross,
    filtersActive,
    property,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    levelFilter,
    setLevelFilter,
    statusFilter,
    setStatusFilter,
    pendingReviewCount,
    onClearFilters,
    onSelectEntry,
    onAdd,
  } = props;

  if (viewState === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
        <div className="h-10 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  // True-empty (no knowledge whatsoever)
  if (viewState === "empty" || entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <div className="rounded-full bg-muted p-3 text-muted-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="max-w-md space-y-1">
            <p className="text-base font-semibold text-foreground">No knowledge added yet</p>
            <p className="text-sm text-muted-foreground">
              The AI starts from PMS data. Add the unstructured details on top — wayfinding, local
              context, building quirks, seasonal notes, and guardrails.
            </p>
          </div>
          <Button size="sm" onClick={onAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add knowledge
          </Button>
        </CardContent>
      </Card>
    );
  }

  const toggleLevel = (next: "portfolio" | "property") =>
    setLevelFilter(levelFilter === next ? "all" : next);

  return (
    <div className="space-y-4">
      {/* Pending review banner — actionable callout doubles as a filter */}
      <PendingReviewBanner
        count={pendingReviewCount}
        active={statusFilter === "in_review"}
        onToggle={() =>
          setStatusFilter(statusFilter === "in_review" ? "all" : "in_review")
        }
      />

      {/* Cascade — the level distinction is visualized AND clickable */}
      <CascadeStrip
        property={property}
        portfolioCount={portfolioTotal}
        propertyCount={propertyTotal}
        levelFilter={levelFilter}
        onTogglePortfolio={() => toggleLevel("portfolio")}
        onToggleProperty={() => toggleLevel("property")}
        onShowAll={() => setLevelFilter("all")}
      />

      {/* Toolbar: search + type filter */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 pb-3">
        <SegmentedRow<TypeFilter>
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: "all", label: "All" },
            { value: "factual", label: TYPE_META.factual.plural },
            { value: "clarification", label: TYPE_META.clarification.plural },
            { value: "suppression", label: TYPE_META.suppression.plural },
            { value: "procedure", label: TYPE_META.procedure.plural },
          ]}
        />
        <div className="relative ml-auto min-w-[260px] flex-1 sm:flex-initial sm:w-80">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search title, body, or category"
            className="h-9 pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filtered-empty — distinct from true-empty */}
      {totalFilteredAcross === 0 && filtersActive && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium text-foreground">No knowledge matches your filters</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting the level, type, or search query.
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onClearFilters}>
            Clear filters
          </Button>
        </div>
      )}

      {/* Portfolio first, then property — both honor levelFilter */}
      {totalFilteredAcross > 0 && (
        <>
          {showPortfolio &&
            (portfolioFiltered.length > 0 ? (
              <LevelSection
                level="portfolio"
                entries={portfolioFiltered}
                onSelectEntry={onSelectEntry}
              />
            ) : (
              <EmptyLevel level="portfolio" />
            ))}
          {showProperty &&
            (propertyFiltered.length > 0 ? (
              <LevelSection
                level="property"
                property={property}
                entries={propertyFiltered}
                onSelectEntry={onSelectEntry}
              />
            ) : (
              <EmptyLevel level="property" property={property} />
            ))}
        </>
      )}
    </div>
  );
}

/* Pending-review action banner — closes the review loop.
   - Hidden when the queue is empty AND the filter isn't active.
   - When count > 0: amber banner with a "Review now" toggle.
   - When the filter is active: emerald-tinted banner with "Show all" to clear. */
function PendingReviewBanner({
  count,
  active,
  onToggle,
}: {
  count: number;
  active: boolean;
  onToggle: () => void;
}) {
  if (count === 0 && !active) return null;

  if (active) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          <div>
            <p className="text-sm font-medium text-emerald-900">
              Showing {count} {count === 1 ? "entry" : "entries"} pending review
            </p>
            <p className="text-xs text-emerald-800/80">
              Open any entry and tap <span className="font-semibold">Approve</span> to start using it.
              Until then, the AI won&apos;t draw on it.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100"
          onClick={onToggle}
        >
          Show all entries
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div>
          <p className="text-sm font-medium text-amber-900">
            {count} {count === 1 ? "entry is" : "entries are"} pending review
          </p>
          <p className="text-xs text-amber-800/80">
            New and edited knowledge starts in review. Approve it before the AI starts using it.
          </p>
        </div>
      </div>
      <Button size="sm" className="shrink-0" onClick={onToggle}>
        Review now
        <ChevronRight className="ml-1 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* Cascade strip — bigger, more pronounced, clickable scope filter
   Mirrors the Voice/Brand cascade pattern but for the two-level model. */
function CascadeStrip({
  property,
  portfolioCount,
  propertyCount,
  levelFilter,
  onTogglePortfolio,
  onToggleProperty,
  onShowAll,
}: {
  property: string;
  portfolioCount: number;
  propertyCount: number;
  levelFilter: LevelFilter;
  onTogglePortfolio: () => void;
  onToggleProperty: () => void;
  onShowAll: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <CascadeTile
        tone="portfolio"
        active={levelFilter === "portfolio"}
        dimmed={levelFilter === "property"}
        icon={Building2}
        label="Portfolio"
        sub="Set by corporate · inherited everywhere"
        count={portfolioCount}
        onClick={onTogglePortfolio}
      />
      <ChevronRight
        className={cn(
          "h-5 w-5 shrink-0 transition-colors",
          levelFilter === "all" ? "text-muted-foreground/50" : "text-muted-foreground/30"
        )}
        aria-hidden
      />
      <CascadeTile
        tone="property"
        active={levelFilter === "property"}
        dimmed={levelFilter === "portfolio"}
        icon={Home}
        label={`Property — ${property}`}
        sub="Specific to this property"
        count={propertyCount}
        onClick={onToggleProperty}
      />
      {levelFilter !== "all" && (
        <button
          type="button"
          onClick={onShowAll}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <XIcon className="h-3 w-3" />
          Show both levels
        </button>
      )}
    </div>
  );
}

function CascadeTile({
  tone,
  active,
  dimmed,
  icon: Icon,
  label,
  sub,
  count,
  onClick,
}: {
  tone: "portfolio" | "property";
  active: boolean;
  dimmed: boolean;
  icon: typeof Building2;
  label: string;
  sub: string;
  count: number;
  onClick: () => void;
}) {
  const isPortfolio = tone === "portfolio";

  // Three visual states: active (selected filter), dimmed (other one is selected), idle (no filter).
  const tile = active
    ? isPortfolio
      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/25 shadow-sm"
      : "border-orange-500 bg-orange-50 ring-2 ring-orange-500/25 shadow-sm"
    : dimmed
    ? "border-border bg-card opacity-60 hover:opacity-100"
    : isPortfolio
    ? "border-blue-200 bg-blue-50/40 hover:border-blue-400 hover:bg-blue-50"
    : "border-orange-200 bg-orange-50/40 hover:border-orange-400 hover:bg-orange-50";

  const iconTile = active
    ? isPortfolio
      ? "bg-blue-600 text-white"
      : "bg-orange-600 text-white"
    : isPortfolio
    ? "bg-blue-100 text-blue-700"
    : "bg-orange-100 text-orange-700";

  const labelText = isPortfolio ? "text-blue-950" : "text-orange-950";

  const countTile = active
    ? isPortfolio
      ? "bg-blue-600 text-white"
      : "bg-orange-600 text-white"
    : isPortfolio
    ? "bg-blue-100 text-blue-900"
    : "bg-orange-100 text-orange-900";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
        tile
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
          iconTile
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-semibold leading-none", labelText)}>{label}</span>
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums leading-none",
              countTile
            )}
          >
            {count}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </button>
  );
}

/* Section divider — uppercase tracking-wider label, no card. Admin-insights GapList. */
function LevelSection({
  level,
  property,
  entries,
  onSelectEntry,
}: {
  level: "portfolio" | "property";
  property?: string;
  entries: KnowledgeEntry[];
  onSelectEntry: (e: KnowledgeEntry) => void;
}) {
  const isPortfolio = level === "portfolio";
  const dot = isPortfolio ? "bg-blue-500" : "bg-orange-500";
  const label = isPortfolio
    ? "Portfolio knowledge"
    : `Property knowledge — ${property}`;
  const sub = isPortfolio
    ? "Inherited by every property"
    : "Specific to this property · property overrides win";
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span className={cn("h-2 w-2 rounded-full", dot)} />
        <span className="text-sm font-bold uppercase tracking-wide text-foreground">
          {label}
        </span>
        <span className="text-muted-foreground/60">·</span>
        <span className="text-muted-foreground/80">
          {entries.length} {entries.length === 1 ? "item" : "items"}
        </span>
        <span className="text-muted-foreground/60">·</span>
        <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
          {sub}
        </span>
      </div>

      <div className="space-y-3">
        {entries.map((e) => (
          <EntryRow key={e.id} entry={e} onSelect={() => onSelectEntry(e)} />
        ))}
      </div>
    </section>
  );
}

function EmptyLevel({
  level,
  property,
}: {
  level: "portfolio" | "property";
  property?: string;
}) {
  const isPortfolio = level === "portfolio";
  const dot = isPortfolio ? "bg-blue-500" : "bg-orange-500";
  const label = isPortfolio ? "Portfolio knowledge" : `Property knowledge — ${property}`;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span className={cn("h-2 w-2 rounded-full", dot)} />
        <span className="text-sm font-bold uppercase tracking-wide text-foreground">
          {label}
        </span>
        <span className="text-muted-foreground/60">·</span>
        <span className="text-muted-foreground/80">0 items</span>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-5 text-center text-xs text-muted-foreground">
        Nothing at this level matches the current filter.
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────
 * 7) GapsTab — escalations clustered into canonical answers
 * ──────────────────────────────────────────────────────────── */

function GapsTab({
  gaps,
  onDismiss,
  onDraft,
}: {
  gaps: KnowledgeGap[];
  onDismiss: (id: string) => void;
  onDraft: (g: KnowledgeGap) => void;
}) {
  const sorted = [...gaps].sort((a, b) => {
    const order: Record<KnowledgeGap["impact"], number> = { high: 0, medium: 1, low: 2 };
    if (order[a.impact] !== order[b.impact]) return order[a.impact] - order[b.impact];
    return b.escalations - a.escalations;
  });

  return (
    <>
      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="rounded-md bg-red-100 p-1.5 text-red-700">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <p className="text-sm text-muted-foreground">
            Escalations the AI couldn't resolve, clustered by question and ranked by impact. Turn the
            answers your staff already give into canonical knowledge — and the escalations drop.
          </p>
        </CardContent>
      </Card>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="text-sm font-medium text-foreground">No open knowledge gaps</p>
            <p className="text-sm text-muted-foreground">
              Every recent escalation has a canonical answer. Nice.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((g) => (
            <GapCard key={g.id} gap={g} onDismiss={() => onDismiss(g.id)} onDraft={() => onDraft(g)} />
          ))}
        </div>
      )}
    </>
  );
}

function GapCard({
  gap,
  onDismiss,
  onDraft,
}: {
  gap: KnowledgeGap;
  onDismiss: () => void;
  onDraft: () => void;
}) {
  const TypeIcon = TYPE_META[gap.suggestedType].icon;
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ImpactBadge impact={gap.impact} />
          <span className="text-xs font-medium text-foreground">
            {gap.escalations} escalation{gap.escalations === 1 ? "" : "s"}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <AgentChip agent={gap.agent} />
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">last seen {gap.lastSeen}</span>
        </div>

        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-start gap-2">
            <Quote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm font-semibold leading-snug text-foreground">{gap.question}</p>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
            How your staff answered
          </p>
          <p className="mt-1 text-sm text-emerald-950/90">{gap.staffAnswer}</p>
        </div>

        {gap.conflicting && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
                  Contradicting answers
                </p>
                <p className="mt-0.5 text-sm text-amber-900/90">{gap.conflictNote}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              Suggested:
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  TYPE_META[gap.suggestedType].badge
                )}
              >
                <TypeIcon className="h-3 w-3" />
                {TYPE_META[gap.suggestedType].label}
              </span>
            </span>
            <span>·</span>
            <CategoryChip category={gap.suggestedCategory} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              View {gap.escalations} conversations
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmDismiss(true)}>
              Dismiss
            </Button>
            <Button size="sm" onClick={onDraft}>
              <Wand2 className="mr-1.5 h-3.5 w-3.5" />
              Draft canonical answer
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={confirmDismiss} onOpenChange={setConfirmDismiss}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dismiss this knowledge gap?</DialogTitle>
            <DialogDescription>
              Dismissing will remove this gap from the list without creating a canonical answer.
              You can&apos;t undo this.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-sm font-medium leading-snug text-foreground">{gap.question}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDismiss(false)}>
              No, keep it
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDismiss(false);
                onDismiss();
              }}
            >
              Yes, dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────
 * 8) SuggestedTab — AI candidates pending review
 * ──────────────────────────────────────────────────────────── */

function SuggestedTab({
  suggestions,
  onApprove,
  onEdit,
  onReject,
}: {
  suggestions: SuggestedEntry[];
  onApprove: (s: SuggestedEntry) => void;
  onEdit: (s: SuggestedEntry) => void;
  onReject: (id: string) => void;
}) {
  return (
    <>
      <Card className="border-purple-200 bg-purple-50/30">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="rounded-md bg-purple-100 p-1.5 text-purple-800">
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="text-sm text-muted-foreground">
            Candidates the AI proposed from real conversations and observed patterns. Review the
            evidence, then approve, edit, or reject.{" "}
            <span className="font-medium text-foreground">Nothing is used until approved.</span>
          </p>
        </CardContent>
      </Card>

      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="text-sm font-medium text-foreground">Inbox zero</p>
            <p className="text-sm text-muted-foreground">No AI suggestions waiting on review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              onApprove={() => onApprove(s)}
              onEdit={() => onEdit(s)}
              onReject={() => onReject(s.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function SuggestionCard({
  suggestion,
  onApprove,
  onEdit,
  onReject,
}: {
  suggestion: SuggestedEntry;
  onApprove: () => void;
  onEdit: () => void;
  onReject: () => void;
}) {
  const TypeIcon = TYPE_META[suggestion.suggestedType].icon;
  const sourceLabel =
    suggestion.source === "from_conversation" ? "From conversation" : "AI-inferred";
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill className="bg-purple-50 text-purple-800 ring-1 ring-inset ring-purple-200">
            <Sparkles className="h-3 w-3" />
            {sourceLabel}
          </Pill>
          <Pill
            className={cn(
              "inline-flex items-center gap-1",
              TYPE_META[suggestion.suggestedType].badge
            )}
          >
            <TypeIcon className="h-3 w-3" />
            {TYPE_META[suggestion.suggestedType].label}
          </Pill>
          <CategoryChip category={suggestion.suggestedCategory} />
          <span className="text-[11px] text-muted-foreground">·</span>
          <span className="text-[11px] font-medium text-foreground">
            {Math.round(suggestion.confidence * 100)}% confidence
          </span>
          <span className="text-[11px] text-muted-foreground">·</span>
          <AgentChip agent={suggestion.agent} />
          <span className="text-[11px] text-muted-foreground">·</span>
          <span className="text-[11px] text-muted-foreground">{suggestion.date}</span>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold leading-snug text-foreground">
            {suggestion.proposedTitle}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{suggestion.proposedBody}</p>
        </div>

        <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-900">
            Evidence
          </p>
          <p className="mt-1 text-sm text-purple-950/90">{suggestion.evidence}</p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onReject}>
            <ThumbsDown className="mr-1.5 h-3.5 w-3.5" />
            Reject
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button size="sm" onClick={onApprove}>
            <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />
            Approve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EntryRow({ entry, onSelect }: { entry: KnowledgeEntry; onSelect: () => void }) {
  const Icon = TYPE_META[entry.type].icon;
  const meta = TYPE_META[entry.type];
  const isProperty = entry.scope === "property";
  const accentStripe = isProperty ? "bg-orange-500" : "bg-blue-500";
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-stretch overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-foreground/20"
    >
      {/* Left scope accent stripe */}
      <div className={cn("w-1 shrink-0", accentStripe)} aria-hidden />

      <div className="min-w-0 flex-1">
        {/* Top region — icon tile + title + meta line + body + right rail */}
        <div className="flex items-start gap-3 px-4 py-3">
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
              meta.badge
            )}
            aria-hidden
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <h3 className="min-w-0 text-sm font-semibold leading-snug text-foreground">
                {entry.title}
              </h3>
              {entry.overridesPortfolio && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 ring-1 ring-inset ring-amber-200">
                  <Layers className="h-2.5 w-2.5" />
                  Override
                </span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
              <span className={cn("font-medium", meta.badge.split(" ").find((c) => c.startsWith("text-")))}>
                {meta.label}
              </span>
              <span>·</span>
              <CategoryChip category={entry.category} />
            </div>
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
              {entry.body}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {entry.status !== "approved" && <StatusBadge status={entry.status} />}
            <Badge variant="secondary" className="text-[10px] capitalize">
              {meta.usageVerb} {entry.usageCount}×
            </Badge>
          </div>
        </div>

        {/* Bottom region — meta + (for property) agent linkage. Mirrors the
            admin-insights gap card's muted lower panel. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/60 bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
          <span>{entry.owner}</span>
          <span className="text-muted-foreground/50">·</span>
          <span>v{entry.version}</span>
          <span className="text-muted-foreground/50">·</span>
          <span>Updated {entry.updatedAt}</span>
          {entry.expiresAt && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="inline-flex items-center gap-1 text-orange-700">
                <Calendar className="h-3 w-3" />
                expires {entry.expiresAt}
              </span>
            </>
          )}
          {isProperty && entry.agents.length > 0 && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="font-semibold uppercase tracking-wide text-muted-foreground/80">
                Used by
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {entry.agents.map((a) => (
                  <AgentChip key={a} agent={a} />
                ))}
              </div>
            </>
          )}
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────
 * 9) AddKnowledgeDialog — type picker → type-specific form
 *     Skips the picker when opened with a prefill.
 * ──────────────────────────────────────────────────────────── */

function AddKnowledgeDialog({
  open,
  onOpenChange,
  prefill,
  property,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefill: AddPrefill | null;
  property: string;
  onSubmit: (e: KnowledgeEntry) => void;
}) {
  const [step, setStep] = useState<"pick" | "form">(prefill ? "form" : "pick");
  const [type, setType] = useState<EntryType>(prefill?.type ?? "factual");

  // Form fields
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [body, setBody] = useState(prefill?.body ?? "");
  const [category, setCategory] = useState<Category>(
    prefill?.category ?? TYPE_DEFAULT_CATEGORY[type]
  );
  const [scope, setScope] = useState<KnowledgeEntry["scope"]>("property");
  const [expiresAt, setExpiresAt] = useState<string>("");

  // Clarification
  const [pmsName, setPmsName] = useState("");
  const [pmsValue, setPmsValue] = useState("");

  // Suppression
  const [suppressReason, setSuppressReason] = useState("");
  const [redirectMessage, setRedirectMessage] = useState("");

  // Procedure
  const [triggers, setTriggers] = useState("");
  const [steps, setSteps] = useState("");
  const [procTag, setProcTag] = useState("");

  // Whenever the dialog opens, normalize its state from the current prefill.
  // A prefill (e.g. drafting from a gap) carries a known type, so we skip the
  // type-picker and jump straight to the filled-in form.
  useEffect(() => {
    if (!open) return;
    setStep(prefill ? "form" : "pick");
    setType(prefill?.type ?? "factual");
    setTitle(prefill?.title ?? "");
    setBody(prefill?.body ?? "");
    setCategory(prefill?.category ?? TYPE_DEFAULT_CATEGORY[prefill?.type ?? "factual"]);
    setScope("property");
    setExpiresAt("");
    setPmsName("");
    setPmsValue("");
    setSuppressReason("");
    setRedirectMessage("");
    setTriggers("");
    setSteps("");
    setProcTag("");
  }, [open, prefill]);

  const reset = () => {
    setStep(prefill ? "form" : "pick");
    setType(prefill?.type ?? "factual");
    setTitle(prefill?.title ?? "");
    setBody(prefill?.body ?? "");
    setCategory(prefill?.category ?? TYPE_DEFAULT_CATEGORY[prefill?.type ?? "factual"]);
    setScope("property");
    setExpiresAt("");
    setPmsName("");
    setPmsValue("");
    setSuppressReason("");
    setRedirectMessage("");
    setTriggers("");
    setSteps("");
    setProcTag("");
  };

  const pickType = (t: EntryType) => {
    setType(t);
    setCategory(TYPE_DEFAULT_CATEGORY[t]);
    setStep("form");
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const canSubmit = title.trim().length > 0 && body.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const newEntry: KnowledgeEntry = {
      id: prefill?.editId ?? `e-${Date.now()}`,
      type,
      group: CATEGORY_META[category].group,
      category,
      title: title.trim(),
      body: body.trim(),
      status: "in_review",
      source: "manual",
      scope,
      owner: "You",
      version: 1,
      history: [
        {
          version: 1,
          date: new Date().toLocaleDateString(),
          author: "You",
          note: "Submitted for review.",
          title: title.trim(),
          body: body.trim(),
        },
      ],
      usageCount: 0,
      updatedAt: "Just now",
      agents: [],
      expiresAt: expiresAt.trim() || undefined,
      entrataSetting:
        type === "clarification" && pmsName.trim()
          ? { name: pmsName.trim(), value: pmsValue.trim() }
          : undefined,
      suppressReason: type === "suppression" ? suppressReason.trim() || undefined : undefined,
      redirectMessage: type === "suppression" ? redirectMessage.trim() || undefined : undefined,
      triggers:
        type === "procedure"
          ? triggers
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      steps:
        type === "procedure"
          ? steps
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      tag: type === "procedure" ? procTag.trim() || undefined : undefined,
    };
    onSubmit(newEntry);
    handleClose(false);
  };

  const meta = TYPE_META[type];
  const Icon = meta.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[96vw] max-w-5xl max-h-[92vh] overflow-y-auto">
        {step === "pick" ? (
          <>
            <DialogHeader>
              <DialogTitle>Add knowledge</DialogTitle>
              <DialogDescription>What kind of knowledge are you adding?</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(Object.keys(TYPE_META) as EntryType[]).map((t) => {
                const m = TYPE_META[t];
                const I = m.icon;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => pickType(t)}
                    className="group flex flex-col gap-1.5 rounded-lg border border-border p-3 text-left transition-colors hover:border-foreground/30 hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-md",
                          m.badge
                        )}
                      >
                        <I className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-sm font-semibold text-foreground">{m.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{m.blurb}</p>
                  </button>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => handleClose(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-md", meta.badge)}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                New {meta.label.toLowerCase()} entry
              </DialogTitle>
              <DialogDescription>
                Will be sent for review and used by the AI once approved.
              </DialogDescription>
            </DialogHeader>

            {prefill?.origin && (
              <div className="rounded-md border border-purple-200 bg-purple-50/60 p-2.5 text-xs text-purple-900">
                <span className="font-semibold">Origin:</span> {prefill.origin}
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short, plain-language title" />
              </div>

              <div className="space-y-1">
                <Label>{type === "suppression" ? "What topic should the AI not discuss?" : "Knowledge"}</Label>
                <textarea
                  className="min-h-[260px] w-full rounded-md border border-border bg-background p-2 text-sm"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Plain language is fine — bullets, a sentence, or a full write-up. The AI turns it into natural answers."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        From PMS
                      </div>
                      {MIRROR_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORY_META[c].label}
                        </SelectItem>
                      ))}
                      <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Added by your team
                      </div>
                      {HUB_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORY_META[c].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Scope</Label>
                  <Select value={scope} onValueChange={(v) => setScope(v as KnowledgeEntry["scope"])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="property">This property ({property})</SelectItem>
                      <SelectItem value="portfolio">Whole portfolio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Expires (optional)</Label>
                <Input
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  placeholder="e.g. Jul 15, 2026"
                />
              </div>

              {type === "clarification" && (
                <div className="space-y-2 rounded-md border border-purple-200 bg-purple-50/40 p-3">
                  <p className="text-xs font-semibold text-purple-900">
                    Overrides which PMS setting?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={pmsName}
                      onChange={(e) => setPmsName(e.target.value)}
                      placeholder="Setting name (e.g. Pet rent)"
                    />
                    <Input
                      value={pmsValue}
                      onChange={(e) => setPmsValue(e.target.value)}
                      placeholder="PMS value (e.g. $35.00)"
                    />
                  </div>
                </div>
              )}

              {type === "suppression" && (
                <div className="space-y-2 rounded-md border border-red-200 bg-red-50/40 p-3">
                  <div className="space-y-1">
                    <Label>Why suppress (internal only)</Label>
                    <textarea
                      className="min-h-[60px] w-full rounded-md border border-border bg-background p-2 text-sm"
                      value={suppressReason}
                      onChange={(e) => setSuppressReason(e.target.value)}
                      placeholder="The reason your team needs to know — never shown to prospects."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>What the AI says instead (prospect-facing)</Label>
                    <textarea
                      className="min-h-[60px] w-full rounded-md border border-border bg-background p-2 text-sm"
                      value={redirectMessage}
                      onChange={(e) => setRedirectMessage(e.target.value)}
                      placeholder='e.g. "Let me connect you with a leasing agent who can give you the most up-to-date details."'
                    />
                  </div>
                </div>
              )}

              {type === "procedure" && (
                <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50/40 p-3">
                  <div className="space-y-1">
                    <Label>Triggers (comma-separated)</Label>
                    <Input
                      value={triggers}
                      onChange={(e) => setTriggers(e.target.value)}
                      placeholder="water leak, units 305-315, mold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Steps (one per line)</Label>
                    <textarea
                      className="min-h-[80px] w-full rounded-md border border-border bg-background p-2 text-sm"
                      value={steps}
                      onChange={(e) => setSteps(e.target.value)}
                      placeholder={"1. Don't answer with specifics.\n2. Acknowledge warmly.\n3. Hand off to onsite team.\n4. Tag the conversation."}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Conversation tag</Label>
                    <Input value={procTag} onChange={(e) => setProcTag(e.target.value)} placeholder="e.g. water-leak" />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              {!prefill && (
                <Button variant="outline" onClick={() => setStep("pick")}>
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Back
                </Button>
              )}
              <Button variant="ghost" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                Send for review
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────────────────────────────────────
 * 10) EntryDetailSheet — right-side drawer with full entry context
 * ──────────────────────────────────────────────────────────── */

function EntryDetailSheet({
  entry,
  onClose,
  onArchive,
  onApprove,
  onEdit,
}: {
  entry: KnowledgeEntry | null;
  onClose: () => void;
  onArchive: (id: string) => void;
  onApprove: (id: string) => void;
  onEdit: (e: KnowledgeEntry) => void;
}) {
  const open = !!entry;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="block w-[96vw] max-w-5xl max-h-[92vh] gap-0 overflow-y-auto p-0">
        {entry && (
          <EntryDetail
            entry={entry}
            onArchive={onArchive}
            onApprove={onApprove}
            onEdit={onEdit}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EntryDetail({
  entry,
  onArchive,
  onApprove,
  onEdit,
  onClose,
}: {
  entry: KnowledgeEntry;
  onArchive: (id: string) => void;
  onApprove: (id: string) => void;
  onEdit: (e: KnowledgeEntry) => void;
  onClose: () => void;
}) {
  const meta = TYPE_META[entry.type];
  const cat = CATEGORY_META[entry.category];
  const CatIcon = cat.icon;
  const isInReview = entry.status === "in_review";

  return (
    <>
      <div className="border-b border-border p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <LevelBadge scope={entry.scope} />
            {entry.overridesPortfolio && <OverridesBadge />}
            <TypeBadge type={entry.type} />
            <StatusBadge status={entry.status} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <DialogTitle className="mt-3 text-lg font-semibold leading-snug">
          {entry.title}
        </DialogTitle>
        <DialogDescription className="mt-1 inline-flex flex-wrap items-center gap-1.5">
          <CatIcon className="h-3.5 w-3.5" />
          <span>{cat.label}</span>
          <span className="text-muted-foreground/60">·</span>
          <span>
            {meta.usageVerb} {entry.usageCount}× total
          </span>
        </DialogDescription>

        {isInReview && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-amber-900">Pending your review</p>
              <p className="text-xs text-amber-800/80">
                The AI won&apos;t draw on this entry until it&apos;s approved.
              </p>
            </div>
            <Button
              size="sm"
              className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => onApprove(entry.id)}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Approve
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-5 p-5">
        {/* Body */}
        <Section title={entry.type === "suppression" ? "What's suppressed" : "Knowledge"}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{entry.body}</p>
        </Section>

        {/* Level + inheritance */}
        <Section title="Level + inheritance">
          {entry.scope === "portfolio" ? (
            <p className="text-sm text-muted-foreground">
              Set by corporate. Every property inherits this; a property entry can override it.
            </p>
          ) : entry.overridesPortfolio ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This property overrides a portfolio default.
              </p>
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Portfolio default
                </p>
                <p className="mt-1 text-sm text-muted-foreground line-through decoration-zinc-400">
                  {entry.overridesPortfolio.label}: {entry.overridesPortfolio.portfolioValue}
                </p>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50/60 p-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
                  This property says instead
                </p>
                <p className="mt-1 text-sm text-amber-950/90">{entry.body}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Added at this property only. Not inherited from corporate.
            </p>
          )}
        </Section>

        {/* Clarification tie-back */}
        {entry.entrataSetting && (
          <Section title="Overrides a PMS setting">
            <div className="rounded-md border border-purple-200 bg-purple-50/50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-900">
                {entry.entrataSetting.name}
              </p>
              <p className="mt-1 text-sm text-purple-950/90">
                PMS value: <span className="font-semibold">{entry.entrataSetting.value}</span>
              </p>
              <p className="mt-2 text-xs text-purple-900/80">
                When prospects ask about this, the AI prefers the clarification over the raw PMS value.
              </p>
            </div>
          </Section>
        )}

        {/* Suppression details */}
        {entry.type === "suppression" && (
          <>
            {entry.suppressReason && (
              <Section title="Why suppress (internal)">
                <div className="rounded-md border border-red-200 bg-red-50/50 p-3 text-sm text-red-950/90">
                  {entry.suppressReason}
                </div>
              </Section>
            )}
            {entry.redirectMessage && (
              <Section title="The AI says instead (prospect-facing)">
                <div className="rounded-md border border-purple-200 bg-purple-50/50 p-3">
                  <div className="flex items-start gap-2">
                    <Quote className="mt-0.5 h-4 w-4 shrink-0 text-purple-700" />
                    <p className="text-sm italic text-purple-950/90">{entry.redirectMessage}</p>
                  </div>
                </div>
              </Section>
            )}
          </>
        )}

        {/* Procedure details */}
        {entry.type === "procedure" && (
          <Section title="Procedure">
            {entry.triggers && entry.triggers.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Triggers
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {entry.triggers.map((t) => (
                    <Pill key={t} className="bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200">
                      {t}
                    </Pill>
                  ))}
                </div>
              </div>
            )}
            {entry.steps && entry.steps.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Steps
                </p>
                <ol className="ml-5 list-decimal space-y-1 text-sm text-foreground">
                  {entry.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            )}
            {entry.tag && (
              <p className="mt-3 text-xs text-muted-foreground">
                Conversation tag: <span className="font-mono text-foreground">{entry.tag}</span>
              </p>
            )}
          </Section>
        )}

        {/* Expiry */}
        {entry.expiresAt && (
          <Section title="Expires">
            <p className="inline-flex items-center gap-1.5 text-sm text-orange-800">
              <Calendar className="h-3.5 w-3.5" />
              {entry.expiresAt}
            </p>
          </Section>
        )}

        {/* Used by agents */}
        {entry.agents.length > 0 && (
          <Section title="Used by agents">
            <div className="flex flex-wrap gap-1.5">
              {entry.agents.map((a) => (
                <AgentChip key={a} agent={a} />
              ))}
            </div>
          </Section>
        )}

        {/* Version history */}
        <Section title="Version history">
          <VersionHistory
            history={entry.history}
            currentTitle={entry.title}
            currentBody={entry.body}
          />
        </Section>

        {/* Source / owner footnote */}
        <p className="text-[11px] text-muted-foreground">
          Source: {SOURCE_LABEL[entry.source]} · Owner: {entry.owner} · Last updated {entry.updatedAt}
        </p>
      </div>

      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-background/95 p-4 backdrop-blur">
        <Button variant="outline" size="sm" onClick={() => onArchive(entry.id)}>
          <Archive className="mr-1.5 h-3.5 w-3.5" />
          {entry.type === "suppression" ? "Lift guardrail" : "Archive"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => onEdit(entry)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
        {isInReview && (
          <Button
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => onApprove(entry.id)}
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Approve
          </Button>
        )}
      </div>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div>{children}</div>
    </section>
  );
}

function VersionRow({
  v,
  isCurrent,
  onClick,
}: {
  v: KnowledgeVersion;
  isCurrent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-2 rounded-md border border-border bg-muted/30 p-2.5 text-left transition-colors hover:border-foreground/30 hover:bg-muted/60"
    >
      <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium text-foreground">
          v{v.version} <span className="text-muted-foreground">· {v.date} · {v.author}</span>
          {isCurrent && (
            <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
              Current
            </span>
          )}
        </p>
        <p className="text-muted-foreground">{v.note}</p>
      </div>
      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
    </button>
  );
}

function VersionDetailDialog({
  version,
  isCurrent,
  onClose,
}: {
  version: KnowledgeVersion | null;
  isCurrent: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!version} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        {version && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Version {version.version}
                {isCurrent && (
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                    Current
                  </span>
                )}
              </DialogTitle>
              <DialogDescription>
                {version.date} · {version.author}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  What changed
                </p>
                <p className="mt-1 text-foreground">{version.note}</p>
              </div>

              {version.title || version.body ? (
                <div className="space-y-3">
                  {version.title && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Title
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">{version.title}</p>
                    </div>
                  )}
                  {version.body && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Knowledge
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        {version.body}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs italic text-muted-foreground">
                  A full content snapshot isn&apos;t available for this version.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function VersionHistory({
  history,
  currentTitle,
  currentBody,
}: {
  history: KnowledgeVersion[];
  currentTitle: string;
  currentBody: string;
}) {
  const [showOlder, setShowOlder] = useState(false);
  const [selected, setSelected] = useState<KnowledgeVersion | null>(null);
  const sorted = [...history].sort((a, b) => b.version - a.version);
  // The newest version always reflects the entry's live content.
  const augmented = sorted.map((v, idx) =>
    idx === 0
      ? { ...v, title: v.title ?? currentTitle, body: v.body ?? currentBody }
      : v
  );
  const [latest, ...older] = augmented;

  if (!latest) return null;

  return (
    <div className="space-y-2">
      <VersionRow v={latest} isCurrent onClick={() => setSelected(latest)} />
      {older.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowOlder((s) => !s)}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                showOlder && "rotate-90"
              )}
            />
            {showOlder
              ? "Hide older versions"
              : `Show ${older.length} older version${older.length === 1 ? "" : "s"}`}
          </button>
          {showOlder && (
            <div className="space-y-2">
              {older.map((v) => (
                <VersionRow key={v.version} v={v} onClick={() => setSelected(v)} />
              ))}
            </div>
          )}
        </>
      )}

      <VersionDetailDialog
        version={selected}
        isCurrent={!!selected && selected.version === latest.version}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
