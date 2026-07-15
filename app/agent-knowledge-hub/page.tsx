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

import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  FROZEN_COL_BG,
  FROZEN_COL_BG_HOVER,
  V2SearchInput,
  SingleSelectPill,
  V2SortHeader,
  V2_SEGMENTED_ON,
  useStickyScroll,
} from "@/components/v2";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge, AiStatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { PropertySelector } from "@/components/property-filter";
import { PROPERTY_FILTER_DATA } from "@/lib/voice-properties";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { nameInitials } from "@/lib/avatar-utils";
import {
  generateGapConversationLogs,
  conversationChannelIcon,
  countLogTraceSteps,
  ConversationDetailView,
  type ConversationLog,
} from "@/app/agent-roster/conversation-log";
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
  Upload,
  Map as MapIcon,
  GitBranch,
  Pin,
  SignalHigh,
  SignalMedium,
  SignalLow,
  Pencil,
  Archive,
  X as XIcon,
  ArrowLeft,
  History,
  Quote,
  MessageSquare,
  MessageCircle,
  Mail,
  Phone,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronRight,
  Info,
  FileText,
  Loader2,
  BookOpen,
  LayoutGrid,
  Boxes,
  DoorOpen,
  Check,
  Library,
  Bot,
  Settings2,
  Box,
  BarChart3,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useVault, type VaultItem } from "@/lib/vault-context";
import {
  SEED_ENTRIES,
  normalizeEntryType,
  type EntryType,
  type EntryStatus,
  type EntrySource,
  type CategoryGroup,
  type MirrorCategory,
  type HubCategory,
  type Category,
  type AgentName,
  type KnowledgeVersion,
  type PropertyLocationTargets,
  type KnowledgeEntry,
} from "@/lib/knowledge-hub-data";

/* ──────────────────────────────────────────────────────────────
 * 1) Types
 * ──────────────────────────────────────────────────────────── */

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
  /** Properties whose escalation conversations surfaced this gap. Drives the
   *  scope chip on the card and prefills the draft's property targeting. */
  sourceProperties: string[];
  /** Set when the gap spans most/all of the portfolio — the answer is a
   *  portfolio-level policy rather than a single-property fact. */
  portfolioWide?: boolean;
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
  /** Agents that should use this knowledge — prefilled when editing or drafting from a gap/suggestion. */
  agents?: AgentName[];
  /** Location targeting prefilled when editing an existing property-scoped entry. */
  appliesTo?: PropertyLocationTargets;
  /** Scope prefilled when editing — preserves whether the entry is property- or portfolio-level. */
  scope?: "portfolio" | "property";
  /** The property an existing property-scoped entry belongs to (preserved on edit). */
  property?: string;
  /** When set, submitting edits this existing entry in place (new version) instead of creating a new row. */
  editId?: string;
}

type LevelFilter = "all" | "portfolio" | "property";
type TypeFilter = "all" | EntryType;
type StatusFilter = "all" | "approved" | "in_review" | "archived";
type AgentFilter = "all" | AgentName;
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
  general: {
    label: "Knowledge",
    plural: "Knowledge",
    icon: Library,
    badge: "bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-200",
    accent: "bg-teal-50/60 border-teal-200",
    usageVerb: "used",
    blurb:
      "A body of knowledge the AI uses when responding — from a single fact to a full write-up. Once assigned to an agent, it's that agent's source of truth.",
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

/* Maps an entry's granular status onto the coarse buckets used by the status
 * filter dropdown. "All" means all active knowledge — archived entries are
 * excluded unless explicitly requested. "Approved" covers live entries
 * (approved + active guardrails); "In review" covers anything awaiting approval. */
function matchesStatusFilter(
  status: EntryStatus,
  filter: "all" | "approved" | "in_review" | "archived"
): boolean {
  switch (filter) {
    case "all":
      // Archived entries are retired from the working list; they only surface
      // when the author explicitly filters for "Archived".
      return status !== "archived";
    case "approved":
      return status === "approved" || status === "suppressed";
    case "in_review":
      return status === "in_review" || status === "draft";
    case "archived":
      return status === "archived";
  }
}

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
  general: { label: "General knowledge", group: "hub_only", icon: Library },
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
  "general",
  "wayfinding",
  "local_context",
  "seasonal",
  "escalation_rules",
  "guardrails",
];

const IMPACT_META: Record<
  KnowledgeGap["impact"],
  { label: string; cls: string; icon: typeof SignalHigh }
> = {
  high: { label: "High impact", cls: "bg-red-50 text-red-800 ring-1 ring-inset ring-red-200", icon: SignalHigh },
  medium: { label: "Medium impact", cls: "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200", icon: SignalMedium },
  low: { label: "Low impact", cls: "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200", icon: SignalLow },
};

const TYPE_DEFAULT_CATEGORY: Record<EntryType, Category> = {
  general: "general",
  suppression: "guardrails",
};

/* ──────────────────────────────────────────────────────────────
 * Version Two — chip helpers + sort fields
 * CLAUDE.md status hue ladder + chip-border rule. Display chips use a
 * tonal fill with NO border (the fill is the shape); the legacy ring
 * palettes above stay untouched so Full/R1/R2 render byte-for-byte.
 *   approved = success (live) · in_review = warning (pending) ·
 *   suppressed = info (active guardrail) · draft / archived = muted.
 * ──────────────────────────────────────────────────────────── */
function v2StatusChipClass(status: EntryStatus): string {
  switch (status) {
    case "approved":
      return "bg-status-success text-status-success-foreground";
    case "in_review":
      return "bg-status-warning text-status-warning-foreground";
    case "suppressed":
      return "bg-status-info text-status-info-foreground";
    case "draft":
    case "archived":
      return "bg-muted text-muted-foreground";
  }
}

function v2ImpactChipClass(impact: KnowledgeGap["impact"]): string {
  switch (impact) {
    case "high":
      return "bg-status-error text-status-error-foreground";
    case "medium":
      return "bg-status-warning text-status-warning-foreground";
    case "low":
      return "bg-muted text-muted-foreground";
  }
}

/* Conversation-log chips for the V2 gap conversations modal. Outcome maps to
 * the hue ladder (resolved = a completed outcome → success; escalated = pending
 * action → warning; pending = neutral). Sentiment only flags the negative case
 * (status-error) — positive/neutral stay muted so we don't decoratively burn
 * the success hue on "positive" (CLAUDE.md: success = completed outcomes only). */
function v2OutcomeChipClass(outcome: ConversationLog["outcome"]): string {
  switch (outcome) {
    case "resolved":
      return "bg-status-success text-status-success-foreground";
    case "escalated":
      return "bg-status-warning text-status-warning-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function v2SentimentChipClass(sentiment: ConversationLog["sentiment"]): string {
  return sentiment === "negative"
    ? "bg-status-error text-status-error-foreground"
    : "bg-muted text-muted-foreground";
}

/* V2-local channel icon for the gap conversations modal. The shared
 * conversationChannelIcon maps SMS → Phone (that's a call, not a text); here SMS
 * gets a chat-bubble (MessageCircle) and Voice gets the actual Phone. Kept local
 * so the agent-roster screen's shared helper stays untouched. */
function v2ChannelIcon(channel: ConversationLog["channel"]) {
  if (channel === "SMS") return <MessageCircle className="h-2.5 w-2.5" />;
  if (channel === "Email") return <Mail className="h-2.5 w-2.5" />;
  if (channel === "Voice") return <Phone className="h-2.5 w-2.5" />;
  return <MessageSquare className="h-2.5 w-2.5" />;
}

type KhSortField = "title" | "type" | "category" | "scope" | "status";

/* ── Rich-text body normalization ─────────────────────────────────
 * V2 authors knowledge in a Tiptap rich-text editor, so newly written
 * bodies are HTML. Legacy/seed bodies are plain text with `\n\n`
 * paragraph breaks. These helpers let both shapes coexist: render any
 * body as prose HTML, and flatten any body back to plain text for
 * previews + the keyword classifier.
 * ──────────────────────────────────────────────────────────────── */

/** True when the string already carries rich-text markup we authored. */
function isHtmlBody(s: string): boolean {
  return /<(p|ul|ol|li|br|strong|em|u|h[1-6]|blockquote|div|span)[\s/>]/i.test(s);
}

/** Normalize a stored body into HTML for prose rendering (wraps plain text). */
function bodyToHtml(body: string): string {
  if (!body) return "";
  if (isHtmlBody(body)) return body;
  const escape = (t: string) =>
    t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return body
    .split(/\n{2,}/)
    .map((para) => `<p>${escape(para).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

/* ── Expiry date <input type="date"> bridge ───────────────────────
 * Entries store the expiry as a friendly string ("Jul 15, 2026") for display.
 * A native date picker needs an ISO `yyyy-MM-dd` value, so these convert
 * between the two without changing the stored/display format. */
function friendlyToIsoDate(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoToFriendlyDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Flatten a body (HTML or plain text) to plain text for previews + classify. */
function bodyToPlainText(body: string): string {
  if (!body) return "";
  if (!isHtmlBody(body)) return body;
  return body
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Lightweight, keyword-driven classifier that "synthesizes" what kind of
 * knowledge the author wrote so the form can pre-pick a type. This is a
 * prototype stand-in for a real LLM classification call: it scans the title +
 * body for guardrail signals and classifies the entry as either a suppression
 * guardrail or plain knowledge.
 */
function classifyKnowledge(
  title: string,
  body: string
): { type: EntryType; rationale: string } {
  const text = `${title}\n${body}`.toLowerCase();
  const has = (...needles: string[]) => needles.some((n) => text.includes(n));

  // Guardrail / suppression — the AI should NOT discuss something.
  if (
    has(
      "don't discuss",
      "do not discuss",
      "don't mention",
      "do not mention",
      "never say",
      "never mention",
      "not discuss",
      "must not",
      "can't share",
      "cannot share",
      "avoid discussing",
      "under legal review",
      "legal review",
      "off-limits",
      "off limits",
      "suppress",
      "do not speculate",
      "redirect to",
      "hand off"
    )
  ) {
    return {
      type: "suppression",
      rationale: "Mentions a topic the AI should avoid or redirect away from.",
    };
  }

  return {
    type: "general",
    rationale: "Knowledge the AI can draw on when responding to residents and prospects.",
  };
}

const DEFAULT_PROPERTY = "Sunset Ridge Apartments";
// Sentinel for the V2 property filter's "all properties" state (nothing
// narrowed yet). Legacy always carries a concrete property, so this value
// never reaches the legacy code paths.
const ALL_PROPERTIES = "__all_properties__";

/* ──────────────────────────────────────────────────────────────
 * 3) Seed data
 * ──────────────────────────────────────────────────────────── */

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
    suggestedType: "general",
    suggestedCategory: "amenities",
    // Property-specific amenity — only the one property that actually has chargers.
    sourceProperties: ["Sunset Ridge Apartments"],
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
    suggestedType: "general",
    suggestedCategory: "pricing",
    // Pure portfolio policy — one uniform answer everywhere, no property override.
    sourceProperties: [],
    portfolioWide: true,
  },
  {
    id: "g-3",
    question: "Do you offer short-term or month-to-month leases?",
    impact: "medium",
    escalations: 5,
    agent: "Leasing AI",
    lastSeen: "2 days ago",
    staffAnswer: "Minimum term is 7 months. Month-to-month is available after the initial term at a $300/mo premium.",
    suggestedType: "general",
    suggestedCategory: "policies",
    // Clustered at a handful of properties, not the whole portfolio.
    sourceProperties: ["Metro Heights", "Downtown Lofts", "Summit Park"],
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
    suggestedType: "general",
    suggestedCategory: "policies",
    sourceProperties: ["Victoria Place"],
  },
];

const SEED_SUGGESTIONS: SuggestedEntry[] = [
  {
    id: "s-1",
    source: "from_conversation",
    proposedTitle: "Self-guided tours available after hours",
    proposedBody:
      "Prospects can book a self-guided tour 8am–8pm daily; they check in at the call box with a code texted 15 min before.",
    suggestedType: "general",
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
    suggestedType: "general",
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
    suggestedType: "general",
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

function TypeBadge({ type, v2 = false }: { type: EntryType; v2?: boolean }) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  return (
    <Pill className={v2 ? "bg-muted text-muted-foreground" : meta.badge}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Pill>
  );
}

function StatusBadge({ status, v2 = false }: { status: EntryStatus; v2?: boolean }) {
  const meta = STATUS_META[status];
  return <Pill className={v2 ? v2StatusChipClass(status) : meta.cls}>{meta.label}</Pill>;
}

function LevelBadge({ scope, v2 = false }: { scope: KnowledgeEntry["scope"]; v2?: boolean }) {
  if (scope === "portfolio") {
    return (
      <Pill
        className={
          v2
            ? "bg-muted text-muted-foreground"
            : "bg-indigo-50 text-indigo-800 ring-1 ring-inset ring-indigo-200"
        }
      >
        <Building2 className="h-3 w-3" />
        Portfolio
        <span className={cn("ml-1 italic font-normal", v2 ? "text-muted-foreground/80" : "text-indigo-700/80")}>
          inherited
        </span>
      </Pill>
    );
  }
  return (
    <Pill
      className={
        v2 ? "bg-muted text-muted-foreground" : "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200"
      }
    >
      <Pin className="h-3 w-3" />
      Property
    </Pill>
  );
}

type GapImpactFilter = "all" | KnowledgeGap["impact"];

/** Header-level impact filter for the Knowledge gaps list. Mirrors the Knowledge
 *  tab's Scope filter / the Playbooks "My Tasks" stat chips: standalone
 *  label+count chips, the selected one taking the light bordered treatment. */
function GapImpactSegmented({
  value,
  onChange,
  counts,
}: {
  value: GapImpactFilter;
  onChange: (v: GapImpactFilter) => void;
  counts: Record<GapImpactFilter, number>;
}) {
  const options: { value: GapImpactFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter gaps by impact">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "border-border bg-background text-foreground shadow-sm"
                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span className="font-medium">{opt.label}</span>
            <span className="font-semibold tabular-nums text-foreground">{counts[opt.value]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** A gap resolves to exactly one scope — portfolio OR property — matching the
 *  two options in the draft/upload form, so it's a single chip:
 *   • portfolio   → "Portfolio-wide"      (Building2)
 *   • one property → that property's name  (MapPin)
 *   • a few        → "N properties" w/ the full list in a tooltip (MapPin)
 *  Mirrors LevelBadge's icon language (Building2 = portfolio, MapPin = property). */
function GapScopeChip({ gap }: { gap: KnowledgeGap }) {
  const list = gap.sourceProperties;
  const portfolio = gap.portfolioWide;
  const Icon = portfolio ? Building2 : MapPin;
  const label = portfolio
    ? "Portfolio-wide"
    : list.length === 1
      ? list[0]
      : `${list.length} properties`;
  const chip = (
    <Pill className="bg-muted text-muted-foreground">
      <Icon className="h-3 w-3" />
      <span className="max-w-[12rem] truncate">{label}</span>
    </Pill>
  );
  // Only the collapsed "N properties" label needs the full list spelled out.
  if (portfolio || list.length <= 1) return chip;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{chip}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-xs text-xs leading-relaxed">
          {list.join(", ")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function OverridesBadge({ v2 = false }: { v2?: boolean }) {
  return (
    <Pill
      className={
        v2
          ? "bg-status-warning text-status-warning-foreground"
          : "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200"
      }
    >
      <Layers className="h-3 w-3" />
      Overrides portfolio
    </Pill>
  );
}

function ImpactBadge({ impact, v2 = false }: { impact: KnowledgeGap["impact"]; v2?: boolean }) {
  const meta = IMPACT_META[impact];
  const Icon = meta.icon;
  return (
    <Pill className={v2 ? v2ImpactChipClass(impact) : meta.cls}>
      {v2 && <Icon className="h-3 w-3" />}
      {meta.label}
    </Pill>
  );
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

const ALL_AGENTS: AgentName[] = [
  "Leasing AI",
  "Renewals AI",
  "Maintenance AI",
  "Payments AI",
];

const AGENT_TONE: Record<AgentName, string> = {
  "Leasing AI": "bg-indigo-50 text-indigo-700 ring-indigo-200",
  "Renewals AI": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Maintenance AI": "bg-sky-50 text-sky-700 ring-sky-200",
  "Payments AI": "bg-amber-50 text-amber-800 ring-amber-200",
};

function AgentChip({
  agent,
  v2 = false,
  className,
}: {
  agent: AgentName;
  v2?: boolean;
  /** Shape/style override — e.g. `rounded-full` to match a pill-family meta row. */
  className?: string;
}) {
  // V2: ELI/AI brand chip (matches the Workforce AI label chip) — warm bg +
  // eli-purple border (the one display-chip border exception, CLAUDE.md rule #2)
  // with the ELI cube on a black circle (rule #1, cube-as-agent-avatar).
  if (v2) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-eli-purple/30 bg-eli-warm-bg px-1.5 py-0.5 text-xxs font-medium text-eli-warm-bg-foreground", className)}>
        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/eli-cube.svg" alt="" className="h-2 w-2" />
        </span>
        {agent}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        AGENT_TONE[agent]
      )}
    >
      {agent}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Property location targeting — mock Entrata floor plans / unit
 * types / units that a property-scoped entry can be narrowed to.
 * ──────────────────────────────────────────────────────────── */

const FLOOR_PLANS: string[] = [
  "A1 · Studio",
  "A2 · Studio Deluxe",
  "B1 · 1 Bed / 1 Bath",
  "B2 · 1 Bed + Den",
  "C1 · 2 Bed / 2 Bath",
  "C2 · 2 Bed Townhome",
  "D1 · 3 Bed / 2 Bath",
];

const UNIT_TYPES: string[] = [
  "Studio",
  "1 Bedroom",
  "2 Bedroom",
  "3 Bedroom",
  "Townhome",
  "Live/Work Loft",
];

const UNITS: string[] = [
  "Bldg A · 101",
  "Bldg A · 102",
  "Bldg A · 103",
  "Bldg A · 201",
  "Bldg A · 202",
  "Bldg B · 110",
  "Bldg B · 111",
  "Bldg B · 210",
  "Bldg B · 305",
  "Bldg C · 120",
  "Bldg C · 121",
  "Bldg C · 220",
  "Bldg C · 320",
  "Bldg D · 130",
  "Bldg D · 230",
  "Bldg D · 330",
];

type LocationKind = "floorPlan" | "unitType" | "unit";

const LOCATION_CONFIG: Record<
  LocationKind,
  {
    label: string;
    plural: string;
    icon: React.ComponentType<{ className?: string }>;
    options: string[];
    tone: string;
    chipTone: string;
  }
> = {
  floorPlan: {
    label: "Floor plan",
    plural: "floor plans",
    icon: LayoutGrid,
    options: FLOOR_PLANS,
    tone: "bg-sky-50 text-sky-700 ring-sky-200",
    chipTone: "bg-sky-50 text-sky-700 ring-sky-200",
  },
  unitType: {
    label: "Unit type",
    plural: "unit types",
    icon: Boxes,
    options: UNIT_TYPES,
    tone: "bg-violet-50 text-violet-700 ring-violet-200",
    chipTone: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  unit: {
    label: "Unit",
    plural: "units",
    icon: DoorOpen,
    options: UNITS,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    chipTone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
};

/**
 * A pill-styled trigger (mirrors the agent chips) that opens a searchable,
 * multi-select checklist of locations of one kind (floor plans / unit types /
 * units). Selected entries surface as removable chips beside it.
 */
function LocationMultiSelect({
  kind,
  selected,
  onToggle,
}: {
  kind: LocationKind;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const cfg = LOCATION_CONFIG[kind];
  const Icon = cfg.icon;
  const count = selected.length;
  const filtered = cfg.options.filter((o) =>
    o.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="dialog"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium shadow-sm transition-all hover:shadow",
            count > 0
              ? cn("ring-1 ring-inset border-transparent", cfg.tone)
              : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {cfg.label}
          {count > 0 ? (
            <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-semibold text-foreground">
              {count}
            </span>
          ) : (
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="border-b border-border p-2">
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${cfg.plural}…`}
              className="h-7 w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No {cfg.plural} match “{query}”.
            </p>
          ) : (
            filtered.map((o) => {
              const checked = selected.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => onToggle(o)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background"
                    )}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{o}</span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Removable chip representing one selected location target. */
function LocationChip({
  kind,
  value,
  onRemove,
}: {
  kind: LocationKind;
  value: string;
  onRemove: () => void;
}) {
  const cfg = LOCATION_CONFIG[kind];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        cfg.chipTone
      )}
    >
      <Icon className="h-3 w-3" />
      {value}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${value}`}
        className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
      >
        <XIcon className="h-3 w-3" />
      </button>
    </span>
  );
}

/** Read-only variant of a location chip used in the entry detail view. */
function LocationChipStatic({ kind, value }: { kind: LocationKind; value: string }) {
  const cfg = LOCATION_CONFIG[kind];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        cfg.chipTone
      )}
    >
      <Icon className="h-3 w-3" />
      {value}
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
  // Ported from OXP-Version-Two: this branch always renders the Version Two
  // Knowledge Hub design (the V2-context toggle system is not present here).
  const isV2 = true;

  // V2 defaults the property filter to "all properties" (narrow on demand);
  // legacy keeps the single concrete default it always had.
  const [property, setProperty] = useState<string>(
    isV2 ? ALL_PROPERTIES : DEFAULT_PROPERTY
  );
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [agentFilter, setAgentFilter] = useState<AgentFilter>("all");

  // Add flow
  const [addOpen, setAddOpen] = useState(false);
  const [addPrefill, setAddPrefill] = useState<AddPrefill | null>(null);
  // Gap currently being turned into a canonical answer. Only removed from the
  // gaps list once the answer is actually saved — never on cancel / click-out.
  const [pendingGapId, setPendingGapId] = useState<string | null>(null);

  // Detail sheet
  const [selected, setSelected] = useState<KnowledgeEntry | null>(null);

  // V2 grid sort (the canonical frozen-column grid replaces the card list).
  const [sortField, setSortField] = useState<KhSortField | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const toggleSort = (field: KhSortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Derived counts (use full entries set, not filtered, for the cascade strip)
  const portfolioTotal = entries.filter((e) => e.scope === "portfolio").length;
  const propertyTotal = entries.filter(
    (e) =>
      e.scope === "property" &&
      (property === ALL_PROPERTIES || (e.property ?? DEFAULT_PROPERTY) === property)
  ).length;
  const propertyOverrides = entries.filter((e) => !!e.overridesPortfolio).length;
  const pendingReviewCount = entries.filter((e) => e.status === "in_review").length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (!matchesStatusFilter(e.status, statusFilter)) return false;
      if (agentFilter !== "all" && !e.agents.includes(agentFilter)) return false;
      if (q.length === 0) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q) ||
        CATEGORY_META[e.category].label.toLowerCase().includes(q)
      );
    });
  }, [entries, search, typeFilter, statusFilter, agentFilter]);

  const portfolioFiltered = filtered.filter((e) => e.scope === "portfolio");
  const propertyFiltered = filtered.filter(
    (e) =>
      e.scope === "property" &&
      (property === ALL_PROPERTIES || (e.property ?? DEFAULT_PROPERTY) === property)
  );

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
    statusFilter !== "all" ||
    agentFilter !== "all";

  // V2 grid rows — the cascade collapses into a Scope filter (levelFilter), so
  // portfolio + property entries merge into one flat, sortable table.
  const v2GridRows = useMemo(() => {
    const base = [
      ...(showPortfolio ? portfolioFiltered : []),
      ...(showProperty ? propertyFiltered : []),
    ];
    if (!sortField) return base;
    const dir = sortDir === "asc" ? 1 : -1;
    const val = (e: KnowledgeEntry): string => {
      switch (sortField) {
        case "title":
          return e.title.toLowerCase();
        case "type":
          return TYPE_META[e.type].label.toLowerCase();
        case "category":
          return CATEGORY_META[e.category].label.toLowerCase();
        case "scope":
          return e.scope;
        case "status":
          return STATUS_META[e.status].label.toLowerCase();
      }
    };
    return [...base].sort((a, b) => val(a).localeCompare(val(b)) * dir);
  }, [showPortfolio, showProperty, portfolioFiltered, propertyFiltered, sortField, sortDir]);

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
          appliesTo: e.appliesTo,
          agents: e.agents,
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
    // V2 only: carry the gap's provenance into the draft — a portfolio-wide gap
    // becomes a portfolio entry; a single-property gap preselects that property.
    // A gap spanning a few properties stays property-scoped but leaves the
    // property choice to the user (the form targets one property at a time).
    const portfolio = g.portfolioWide;
    const singleProperty = !portfolio && g.sourceProperties.length === 1;
    openAdd({
      type: g.suggestedType,
      category: g.suggestedCategory,
      title: g.question,
      body: g.staffAnswer,
      agents: [g.agent],
      ...(isV2
        ? {
            scope: portfolio ? "portfolio" : "property",
            property: singleProperty ? g.sourceProperties[0] : undefined,
          }
        : {}),
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
      agents: [s.agent],
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
    setAgentFilter("all");
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
    <>
      {isV2 ? (
        <KnowledgeHubV2
          tab={tab}
          setTab={setTab}
          gaps={gaps}
          gridRows={v2GridRows}
          sortField={sortField}
          sortDir={sortDir}
          onSort={toggleSort}
          search={search}
          setSearch={setSearch}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          agentFilter={agentFilter}
          setAgentFilter={setAgentFilter}
          levelFilter={levelFilter}
          setLevelFilter={setLevelFilter}
          property={property}
          setProperty={setProperty}
          portfolioTotal={portfolioTotal}
          propertyTotal={propertyTotal}
          pendingReviewEntries={entries.filter((e) => e.status === "in_review")}
          filtersActive={filtersActive}
          onClearFilters={clearFilters}
          onSelectEntry={setSelected}
          onAdd={() => openAdd(null)}
          onDismissGap={dismissGap}
          onDraftGap={draftFromGap}
        />
      ) : (
    <div className="space-y-6 pb-12">
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
              <p className="font-medium text-red-900">Couldn&apos;t load property knowledge</p>
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
            agentFilter={agentFilter}
            setAgentFilter={setAgentFilter}
            pendingReviewCount={pendingReviewCount}
            onClearFilters={clearFilters}
            onSelectEntry={setSelected}
            onAdd={() => openAdd(null)}
          />
        </TabsContent>

        <TabsContent value="gaps" className="space-y-4">
          <GapsTab gaps={gaps} onDismiss={dismissGap} onDraft={draftFromGap} propertyName={property} />
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
    </div>
      )}

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
        property={property === ALL_PROPERTIES ? DEFAULT_PROPERTY : property}
        propertyPreselected={property !== ALL_PROPERTIES}
        onSubmit={submitNewEntry}
        v2={isV2}
      />

      <EntryDetailSheet
        entry={selected}
        v2={isV2}
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
          agents: e.agents,
          appliesTo: e.appliesTo,
          scope: e.scope,
          property: e.property,
          origin: `Editing v${e.version} · last updated ${e.updatedAt}`,
          });
        }}
      />
    </>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Version Two — secondary-nav rail + canonical frozen-column grid
 * Gated by `isV2`; the legacy card layout above is untouched.
 * ──────────────────────────────────────────────────────────── */

interface KnowledgeHubV2Props {
  tab: string;
  setTab: (v: string) => void;
  gaps: KnowledgeGap[];
  gridRows: KnowledgeEntry[];
  sortField: KhSortField | null;
  sortDir: "asc" | "desc";
  onSort: (f: KhSortField) => void;
  search: string;
  setSearch: (v: string) => void;
  typeFilter: TypeFilter;
  setTypeFilter: (v: TypeFilter) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (v: StatusFilter) => void;
  agentFilter: AgentFilter;
  setAgentFilter: (v: AgentFilter) => void;
  levelFilter: LevelFilter;
  setLevelFilter: (v: LevelFilter) => void;
  property: string;
  setProperty: (v: string) => void;
  portfolioTotal: number;
  propertyTotal: number;
  pendingReviewEntries: KnowledgeEntry[];
  filtersActive: boolean;
  onClearFilters: () => void;
  onSelectEntry: (e: KnowledgeEntry) => void;
  onAdd: () => void;
  onDismissGap: (id: string) => void;
  onDraftGap: (g: KnowledgeGap) => void;
}

function KnowledgeHubV2(props: KnowledgeHubV2Props) {
  const {
    tab,
    setTab,
    gaps,
    gridRows,
    sortField,
    sortDir,
    onSort,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    agentFilter,
    setAgentFilter,
    levelFilter,
    setLevelFilter,
    property,
    setProperty,
    portfolioTotal,
    propertyTotal,
    pendingReviewEntries,
    filtersActive,
    onClearFilters,
    onSelectEntry,
    onAdd,
    onDismissGap,
    onDraftGap,
  } = props;

  const { stickyScrollProps } = useStickyScroll();
  const activeLabel = tab === "gaps" ? "Knowledge Gaps" : "Knowledge";

  const navItems = [
    { id: "knowledge", label: "Knowledge" },
    { id: "gaps", label: "Knowledge Gaps", count: gaps.length || undefined },
  ];

  return (
    <div className="flex min-h-0 flex-1">
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hover scrollbar-gutter-stable">
        <div className="px-4 py-5 sm:px-6 lg:px-8">
          <h1 className="sr-only">{activeLabel}</h1>

          <div className="space-y-5">
              {/* Awaiting Review — a review queue mirroring the SOPs & Knowledge
                  "Awaiting Review" card: each row opens the entry detail where
                  Approve lives, closing the review loop (not a filter toggle). */}
              {pendingReviewEntries.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      Awaiting Review
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xxs font-semibold leading-none text-primary-foreground">
                        {pendingReviewEntries.length}
                      </span>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      New and edited knowledge starts in review — approve it before the AI draws on it.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="scrollbar-hide overflow-y-auto" style={{ maxHeight: "248px" }}>
                      <ul className="flex flex-col gap-2">
                        {pendingReviewEntries.map((e) => {
                          const TypeIcon = TYPE_META[e.type].icon;
                          return (
                            <li key={e.id}>
                              <button
                                type="button"
                                onClick={() => onSelectEntry(e)}
                                className="flex w-full gap-3 rounded-lg border border-border bg-muted/50 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted"
                              >
                                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                                  <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="truncate text-sm font-medium text-foreground" title={e.title}>
                                      {e.title}
                                    </span>
                                    <span
                                      className={cn(
                                        "shrink-0 rounded-full px-1.5 py-0.5 text-xxs font-medium",
                                        v2StatusChipClass(e.status)
                                      )}
                                    >
                                      {STATUS_META[e.status].label}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="truncate">
                                      {e.scope === "portfolio" ? "Portfolio" : (e.property ?? DEFAULT_PROPERTY)}
                                    </span>
                                    <span aria-hidden>·</span>
                                    <span className="truncate">{CATEGORY_META[e.category].label}</span>
                                    <span aria-hidden>·</span>
                                    <span>v{e.version}</span>
                                    {e.updatedAt && (
                                      <>
                                        <span aria-hidden>·</span>
                                        <span className="truncate">{e.updatedAt}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 self-center text-muted-foreground/50" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Knowledge / Knowledge Gaps view switcher — moved inline from the
                  left rail. Segmented "toggle" family per CLAUDE.md (light-blue
                  on-state), sitting below Awaiting Review and above the scope row. */}
              <div className="inline-flex h-9 items-center gap-0.5 rounded-lg border border-input bg-background p-0.5">
                {navItems.map((item) => {
                  const active = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setTab(item.id)}
                      className={cn(
                        "inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
                        active ? V2_SEGMENTED_ON : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {item.label}
                      {item.count != null && (
                        <span
                          className={cn(
                            "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-xxs font-semibold leading-none",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {tab === "knowledge" ? (
                <div className="space-y-5">
              {/* Scope — the Portfolio→Property cascade promoted to a quick-filter
                  row, matching the Playbooks "My Tasks" stat chips: standalone
                  label + count chips, the selected one taking the light bordered
                  treatment. Awaiting Review sits above it (the review queue isn't
                  scoped/filtered); the rest of the toolbar hugs the table below. */}
              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    { value: "all", label: "All levels", count: portfolioTotal + propertyTotal },
                    { value: "portfolio", label: "Portfolio", count: portfolioTotal },
                    { value: "property", label: "Property", count: propertyTotal },
                  ] as { value: LevelFilter; label: string; count: number }[]
                ).map((opt) => {
                  const isActive = levelFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setLevelFilter(opt.value)}
                      className={cn(
                        "inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "border-border bg-background text-foreground shadow-sm"
                          : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <span className="font-medium">{opt.label}</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {opt.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Toolbar + grid, grouped so the rest of the toolbar (CTA, search,
                  property + filter pills) hugs the table. Scope lives in the
                  segmented control up top. */}
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Button size="sm" className="h-9 shrink-0 gap-1.5" onClick={onAdd}>
                    <Plus className="h-4 w-4" />
                    Add knowledge
                  </Button>
                  <V2SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Search knowledge"
                    className="sm:w-64"
                  />
                  <PropertySelector
                    data={PROPERTY_FILTER_DATA}
                    defaultDropdownOption="Property List"
                    triggerWidthClassName="h-7 w-auto max-w-[13rem] gap-1.5 rounded-full border-input px-2.5 text-xs font-medium hover:bg-muted/50 hover:text-foreground"
                    panelHeight={460}
                    selectedPropertyIds={property === ALL_PROPERTIES ? [] : [property]}
                    onSelectedIdsChange={(ids) =>
                      setProperty(ids.length ? ids[ids.length - 1] : ALL_PROPERTIES)
                    }
                  />
                  <SingleSelectPill
                    label="Type"
                    value={typeFilter}
                    defaultValue="all"
                    onChange={(v) => setTypeFilter(v as TypeFilter)}
                    options={[
                      { value: "all", label: "All types" },
                      { value: "general", label: TYPE_META.general.label, icon: TYPE_META.general.icon },
                      { value: "suppression", label: TYPE_META.suppression.label, icon: TYPE_META.suppression.icon },
                    ]}
                  />
                  <SingleSelectPill
                    label="Agent"
                    value={agentFilter}
                    defaultValue="all"
                    onChange={(v) => setAgentFilter(v as AgentFilter)}
                    options={[
                      { value: "all", label: "All agents" },
                      ...ALL_AGENTS.map((a) => ({ value: a, label: a })),
                    ]}
                  />
                  <SingleSelectPill
                    label="Status"
                    value={statusFilter}
                    defaultValue="all"
                    onChange={(v) => setStatusFilter(v as StatusFilter)}
                    options={[
                      { value: "all", label: "All statuses" },
                      { value: "approved", label: "Approved" },
                      { value: "in_review", label: "In review" },
                      { value: "archived", label: "Archived" },
                    ]}
                  />
                  {filtersActive && (
                    <button
                      type="button"
                      onClick={onClearFilters}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                    >
                      <XIcon className="h-3.5 w-3.5 shrink-0" />
                      Clear
                    </button>
                  )}
                </div>
              {gridRows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-10 text-center">
                  <p className="text-sm font-medium text-foreground">
                    {filtersActive ? "No knowledge matches your filters" : "No knowledge added yet"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {filtersActive
                      ? "Try adjusting the type, scope, agent, status, or search query."
                      : "Add the unstructured details on top of PMS data — wayfinding, local context, quirks, and guardrails."}
                  </p>
                  {filtersActive ? (
                    <Button variant="outline" size="sm" className="mt-3" onClick={onClearFilters}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button size="sm" className="mt-3 gap-1.5" onClick={onAdd}>
                      <Plus className="h-4 w-4" />
                      Add knowledge
                    </Button>
                  )}
                </div>
              ) : (
                <div {...stickyScrollProps} className="overflow-x-auto scrollbar-hover">
                  <table className="escalations-table table-borderless w-full min-w-[920px] table-fixed">
                    <thead>
                      <tr className="group/head bg-muted/30">
                        <V2SortHeader<KhSortField>
                          field="title"
                          label="Title"
                          sortField={sortField}
                          sortDir={sortDir}
                          onSort={onSort}
                          className={cn("w-[30%]", "sticky-col sticky left-0 z-20", FROZEN_COL_BG)}
                        />
                        <V2SortHeader<KhSortField> field="scope" label="Scope" sortField={sortField} sortDir={sortDir} onSort={onSort} className="w-[11%]" />
                        <V2SortHeader<KhSortField> field="type" label="Type" sortField={sortField} sortDir={sortDir} onSort={onSort} className="w-[15%]" />
                        <V2SortHeader<KhSortField> field="category" label="Category" sortField={sortField} sortDir={sortDir} onSort={onSort} className="w-[14%]" />
                        <th className="w-[18%] whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Agents
                        </th>
                        <V2SortHeader<KhSortField> field="status" label="Status" sortField={sortField} sortDir={sortDir} onSort={onSort} className="w-[12%]" />
                      </tr>
                    </thead>
                    <tbody>
                      {gridRows.map((e) => {
                        const TypeIcon = TYPE_META[e.type].icon;
                        return (
                          <tr
                            key={e.id}
                            onClick={() => onSelectEntry(e)}
                            tabIndex={0}
                            onKeyDown={(ev) => {
                              if (ev.target !== ev.currentTarget) return;
                              if (ev.key === "Enter" || ev.key === " ") {
                                ev.preventDefault();
                                onSelectEntry(e);
                              }
                            }}
                            aria-label={`Open ${e.title}`}
                            className="group cursor-pointer table-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                          >
                            <td
                              className={cn(
                                "sticky-col sticky left-0 z-10 px-4 py-3.5 transition-colors",
                                FROZEN_COL_BG,
                                FROZEN_COL_BG_HOVER
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-2.5">
                                <TooltipProvider delayDuration={150}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
                                        <TypeIcon className="h-3.5 w-3.5" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-xs">
                                      <p className="font-medium text-foreground">{TYPE_META[e.type].label}</p>
                                      <p className="mt-0.5 text-xs text-muted-foreground">{TYPE_META[e.type].blurb}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                                  <span
                                    className="max-w-[16rem] truncate text-sm font-medium text-foreground"
                                    title={e.title}
                                  >
                                    {e.title}
                                  </span>
                                  {e.overridesPortfolio && (
                                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">
                                      Override
                                    </span>
                                  )}
                                </span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5">
                              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                {e.scope === "portfolio" ? "Portfolio" : (e.property ?? DEFAULT_PROPERTY)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5">
                              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                {TYPE_META[e.type].label}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5">
                              <span className="inline-flex items-center text-xs text-muted-foreground">
                                {CATEGORY_META[e.category].label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              {e.agents.length ? (
                                <div className="flex flex-wrap items-center gap-1">
                                  {e.agents.slice(0, 2).map((a) => (
                                    <AgentChip key={a} agent={a} v2 />
                                  ))}
                                  {e.agents.length > 2 && (
                                    <TooltipProvider delayDuration={150}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span
                                            tabIndex={0}
                                            onClick={(ev) => ev.stopPropagation()}
                                            className="cursor-default rounded text-xxs text-muted-foreground underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                          >
                                            +{e.agents.length - 2}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" align="start" className="text-xs">
                                          <span className="mb-1 block font-medium text-foreground">
                                            More ELI+ agents
                                          </span>
                                          <ul className="space-y-1">
                                            {e.agents.slice(2).map((a) => (
                                              <li key={a} className="flex items-center gap-1.5">
                                                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-black">
                                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                                  <img src="/eli-cube.svg" alt="" className="h-2 w-2" />
                                                </span>
                                                {a}
                                              </li>
                                            ))}
                                          </ul>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">{"\u2014"}</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5">
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                  v2StatusChipClass(e.status)
                                )}
                              >
                                {STATUS_META[e.status].label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              </div>
            </div>
          ) : (
            <GapsTab
              gaps={gaps}
              onDismiss={onDismissGap}
              onDraft={onDraftGap}
              propertyName={property === ALL_PROPERTIES ? DEFAULT_PROPERTY : property}
              v2
            />
          )}
          </div>
        </div>
      </div>
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
  statusFilter: StatusFilter;
  setStatusFilter: (v: StatusFilter) => void;
  agentFilter: AgentFilter;
  setAgentFilter: (v: AgentFilter) => void;
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
    agentFilter,
    setAgentFilter,
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

      {/* Toolbar: type filter + agent/status dropdowns + search */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 pb-3">
        <SegmentedRow<TypeFilter>
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: "all", label: "All" },
            { value: "general", label: TYPE_META.general.plural },
            { value: "suppression", label: TYPE_META.suppression.plural },
          ]}
        />
        <div className="flex items-center gap-2">
          <Select
            value={agentFilter}
            onValueChange={(v) => setAgentFilter(v as AgentFilter)}
          >
            <SelectTrigger
              className={cn(
                "h-9 w-[150px]",
                agentFilter !== "all" && "border-foreground/30 bg-muted/50"
              )}
            >
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agents</SelectItem>
              {ALL_AGENTS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger
              className={cn(
                "h-9 w-[140px]",
                statusFilter !== "all" && "border-foreground/30 bg-muted/50"
              )}
            >
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="in_review">In review</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative ml-auto min-w-[220px] flex-1 sm:flex-initial sm:w-72">
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
            Try adjusting the level, type, agent, status, or search query.
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onClearFilters}>
            Clear filters
          </Button>
        </div>
      )}

      {/* Portfolio first, then property — both honor levelFilter */}
      {totalFilteredAcross > 0 && (
        <div className="space-y-8 pt-1">
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
        </div>
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
  // Three visual states: active (selected filter), dimmed (other one is selected), idle (no filter).
  // Neutral palette — the portfolio/property distinction reads from the icon + label.
  const tile = active
    ? "border-foreground/40 bg-muted ring-1 ring-foreground/10 shadow-sm"
    : dimmed
    ? "border-border bg-card opacity-60 hover:opacity-100"
    : "border-border bg-card hover:border-foreground/30 hover:bg-muted/50";

  const iconTile = active
    ? "bg-foreground text-background"
    : "bg-muted text-muted-foreground";

  const labelText = "text-foreground";

  const countTile = active
    ? "bg-foreground text-background"
    : "bg-muted text-foreground";

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
  const HeaderIcon = isPortfolio ? Building2 : Home;
  const label = isPortfolio
    ? "Portfolio knowledge"
    : `Property knowledge — ${property}`;
  const sub = isPortfolio
    ? "Inherited by every property"
    : "Specific to this property · property overrides win";
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <HeaderIcon className="h-4 w-4 text-muted-foreground/70" aria-hidden />
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground">
          {entries.length} {entries.length === 1 ? "item" : "items"}
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground/80">{sub}</span>
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
  const HeaderIcon = isPortfolio ? Building2 : Home;
  const label = isPortfolio ? "Portfolio knowledge" : `Property knowledge — ${property}`;
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <HeaderIcon className="h-4 w-4 text-muted-foreground/70" aria-hidden />
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground">0 items</span>
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
  propertyName,
  v2 = false,
}: {
  gaps: KnowledgeGap[];
  onDismiss: (id: string) => void;
  onDraft: (g: KnowledgeGap) => void;
  propertyName: string;
  v2?: boolean;
}) {
  const [impactFilter, setImpactFilter] = useState<GapImpactFilter>("all");
  // Session-only dismissal — the banner resurfaces on reload (not persisted).
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  const sorted = [...gaps].sort((a, b) => {
    const order: Record<KnowledgeGap["impact"], number> = { high: 0, medium: 1, low: 2 };
    if (order[a.impact] !== order[b.impact]) return order[a.impact] - order[b.impact];
    return b.escalations - a.escalations;
  });

  const impactCounts = useMemo<Record<GapImpactFilter, number>>(
    () => ({
      all: gaps.length,
      high: gaps.filter((g) => g.impact === "high").length,
      medium: gaps.filter((g) => g.impact === "medium").length,
      low: gaps.filter((g) => g.impact === "low").length,
    }),
    [gaps],
  );

  const visible = impactFilter === "all" ? sorted : sorted.filter((g) => g.impact === impactFilter);

  return (
    <>
      {v2 ? (
        // Proper section header (title + precise description) leading the
        // Knowledge Gaps surface, replacing the old dashed alert box.
        <div className="mb-6">
          <h2 className="section-title mb-1">Knowledge Gaps</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Questions the AI escalated, ranked by impact. Approve a staff answer as
            canonical knowledge and the AI handles it next time.
          </p>

          {showInfoBanner && (
            // Portfolio-vs-Property knowledge explainer (previously only in a
            // header tooltip), surfaced below the section header as a dismissable
            // blue info banner. Style mirrors the Workforce "Connect your HR
            // software" banner. Session-only.
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-status-info-border bg-status-info px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-status-info-foreground/20 bg-status-info-border">
                <Info className="h-4 w-4 text-[hsl(207_73%_15%)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Portfolio vs. property knowledge</p>
                <p className="text-xs leading-relaxed text-status-info-foreground">
                  <span className="font-semibold">Portfolio knowledge</span> comes from corporate and
                  applies everywhere. <span className="font-semibold">Property knowledge</span> is set
                  here and overrides it where they differ.
                </p>
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                className="shrink-0 rounded-md p-1 text-status-info-foreground transition-colors hover:bg-status-info-foreground/10"
                onClick={() => setShowInfoBanner(false)}
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Impact filter — lets the user focus the list on the most urgent gaps first. */}
          {gaps.length > 0 && (
            <div className="mt-4">
              <GapImpactSegmented value={impactFilter} onChange={setImpactFilter} counts={impactCounts} />
            </div>
          )}
        </div>
      ) : (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-md bg-red-100 p-1.5 text-red-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <p className="text-sm text-muted-foreground">
              Escalations the AI couldn&apos;t resolve, clustered by question and ranked by impact. Turn the
              answers your staff already give into canonical knowledge — and the escalations drop.
            </p>
          </CardContent>
        </Card>
      )}

      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <CheckCircle2 className={cn("h-5 w-5", v2 ? "text-status-success-foreground" : "text-emerald-600")} />
            {sorted.length === 0 ? (
              <>
                <p className="text-sm font-medium text-foreground">No open knowledge gaps</p>
                <p className="text-sm text-muted-foreground">
                  Every recent escalation has a canonical answer. Nice.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">
                  No {impactFilter}-impact gaps
                </p>
                <button
                  type="button"
                  onClick={() => setImpactFilter("all")}
                  className="text-sm text-primary hover:underline"
                >
                  Show all gaps
                </button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={v2 ? "space-y-5" : "space-y-3"}>
          {visible.map((g) => (
            <GapCard
              key={g.id}
              gap={g}
              onDismiss={() => onDismiss(g.id)}
              onDraft={() => onDraft(g)}
              propertyName={propertyName}
              v2={v2}
            />
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
  propertyName,
  v2 = false,
}: {
  gap: KnowledgeGap;
  onDismiss: () => void;
  onDraft: () => void;
  propertyName: string;
  v2?: boolean;
}) {
  const TypeIcon = TYPE_META[gap.suggestedType].icon;
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  return (
    <Card>
      {v2 ? (
        <CardContent className="space-y-4 p-4">
          {/* Hero — the unanswered question leads as the card's subject line and
              keeps the full row width (it only wraps if genuinely long). The
              triage meta lives on its own row beneath, flush to the card's left
              edge under the icon bubble, so it never squeezes the question. */}
          <div>
            <div className="flex items-center gap-3">
              <SectionIconBubble icon={HelpCircle} />
              <p className="min-w-0 flex-1 text-base font-semibold leading-snug text-foreground">
                {gap.question}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
              {/* Impact severity and the escalation volume that drives it
                  are one signal, so they share a single pill */}
              <Pill className={v2ImpactChipClass(gap.impact)}>
                {(() => {
                  const ImpactIcon = IMPACT_META[gap.impact].icon;
                  return <ImpactIcon className="h-3 w-3" />;
                })()}
                {IMPACT_META[gap.impact].label}
                <span className="opacity-60" aria-hidden>·</span>
                <span className="tabular-nums">
                  {gap.escalations} escalation{gap.escalations === 1 ? "" : "s"}
                </span>
              </Pill>
              <AgentChip agent={gap.agent} v2 className="rounded-full" />
              {/* Scope of the gap — which property/properties the
                  escalations came from (Building2 = portfolio-wide) */}
              <GapScopeChip gap={gap} />
              <span className="text-muted-foreground/50" aria-hidden>·</span>
              <span>last seen {gap.lastSeen}</span>
            </div>
          </div>

          {/* Evidence — staff answer is quiet supporting context, not a success
              state (green freed for true success semantics per CLAUDE.md). A
              contradiction lives inside this same section, divided off and
              flagged in warning amber, so the answer + its caveat read as one. */}
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex items-start gap-2">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  How your staff answered
                </p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{gap.staffAnswer}</p>
              </div>
            </div>

            {gap.conflicting && (
              <div className="mt-3 flex items-start gap-2 border-t border-border pt-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-foreground" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
                    Contradicting answers
                  </p>
                  <p className="mt-0.5 text-sm text-foreground">{gap.conflictNote}</p>
                </div>
              </div>
            )}
          </div>

          {/* Suggested type/category is drafting-time detail (shown in the
              draft flow), so it's omitted here to keep the triage card clean. */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
            <Button variant="ghost" size="sm" onClick={() => setShowConversations(true)}>
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              View conversations
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmDismiss(true)}>
              Dismiss
            </Button>
            <Button size="sm" onClick={onDraft}>
              {/* ELI drafts the answer — brand cube marks the AI action (CLAUDE.md #1) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/eli-cube.svg" alt="" className="mr-1.5 h-4 w-4" />
              Draft Canonical Answer
            </Button>
          </div>
        </CardContent>
      ) : (
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ImpactBadge impact={gap.impact} v2={v2} />
          <span className="text-xs font-medium text-foreground">
            {gap.escalations} escalation{gap.escalations === 1 ? "" : "s"}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <AgentChip agent={gap.agent} v2={v2} />
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">last seen {gap.lastSeen}</span>
        </div>

        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-start gap-2">
            <Quote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm font-semibold leading-snug text-foreground">{gap.question}</p>
          </div>
        </div>

        <div
          className={cn(
            "rounded-lg border p-3",
            v2
              ? "border-status-success-border bg-status-success/50"
              : "border-emerald-200 bg-emerald-50/50"
          )}
        >
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wide",
              v2 ? "text-status-success-foreground" : "text-emerald-800"
            )}
          >
            How your staff answered
          </p>
          <p className={cn("mt-1 text-sm", v2 ? "text-foreground" : "text-emerald-950/90")}>
            {gap.staffAnswer}
          </p>
        </div>

        {gap.conflicting && (
          <div
            className={cn(
              "rounded-lg border p-3",
              v2 ? "border-status-warning-border bg-status-warning/70" : "border-amber-200 bg-amber-50/70"
            )}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  v2 ? "text-status-warning-foreground" : "text-amber-700"
                )}
              />
              <div>
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-wide",
                    v2 ? "text-status-warning-foreground" : "text-amber-900"
                  )}
                >
                  Contradicting answers
                </p>
                <p className={cn("mt-0.5 text-sm", v2 ? "text-foreground" : "text-amber-900/90")}>
                  {gap.conflictNote}
                </p>
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
                  v2 ? "bg-muted text-muted-foreground" : TYPE_META[gap.suggestedType].badge
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
            <Button variant="ghost" size="sm" onClick={() => setShowConversations(true)}>
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
      )}

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

      <GapConversationsDialog
        open={showConversations}
        onOpenChange={setShowConversations}
        gap={gap}
        propertyName={propertyName}
        v2={v2}
      />
    </Card>
  );
}

/**
 * Popup showing the specific conversations behind a knowledge gap. It reuses
 * the agent roster's real conversation logs and the exact transcript + trace
 * drill-down (ConversationDetailView) — effectively a filtered-down version of
 * the roster's History & Logging screen for just this gap's agent.
 */
function GapConversationsDialog({
  open,
  onOpenChange,
  gap,
  propertyName,
  v2 = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  gap: KnowledgeGap;
  propertyName: string;
  v2?: boolean;
}) {
  const rosterAgent = gap.agent === "Renewals AI" ? "Renewal AI" : gap.agent;
  const logs = useMemo(
    () =>
      generateGapConversationLogs({
        question: gap.question,
        agentName: rosterAgent,
        count: gap.escalations,
        propertyName,
      }),
    [rosterAgent, propertyName, gap.escalations, gap.question]
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = logs.find((l) => l.id === selectedId) ?? null;

  useEffect(() => {
    if (!open) setSelectedId(null);
  }, [open]);

  const outcomeBadge = (o: ConversationLog["outcome"]) =>
    o === "resolved"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : o === "escalated"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-zinc-100 text-zinc-500 border-zinc-200";
  const sentimentBadge = (s: ConversationLog["sentiment"]) =>
    s === "positive"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : s === "negative"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-zinc-100 text-zinc-500 border-zinc-200";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="block w-[97vw] max-w-6xl h-[90vh] gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Conversations behind this gap</DialogTitle>
        {selected ? (
          <div className="h-full">
            <ConversationDetailView
              log={selected}
              agentName={rosterAgent}
              onBack={() => setSelectedId(null)}
            />
          </div>
        ) : v2 ? (
          <div className="flex h-full flex-col">
            {/* Canonical V2 modal header: no leading title icon, text-lg title +
                muted description, explicit close. The gap question drops below as
                neutral evidence (bg-muted/40), matching the triage card. */}
            <div className="shrink-0 border-b border-border px-6 pt-6 pb-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold leading-snug text-foreground">
                    Conversations behind this gap
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {logs.length} {gap.agent} conversation{logs.length === 1 ? "" : "s"} where this
                    question came up without a canonical answer.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close"
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <SectionIconBubble icon={Quote} />
                <p className="min-w-0 text-sm font-semibold leading-snug text-foreground">{gap.question}</p>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2 scrollbar-hover">
              <div className="divide-y divide-border">
                {logs.map((log) => (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => setSelectedId(log.id)}
                    className="group flex w-full items-center gap-4 px-2 py-4 text-left transition-colors hover:bg-muted/50"
                  >
                    <Avatar className="h-9 w-9 ring-1 ring-border">
                      <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                        {nameInitials(log.residentName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        <p className="mr-1 text-sm font-semibold text-foreground">{log.residentName}</p>
                        <Pill className="bg-muted text-muted-foreground">
                          {v2ChannelIcon(log.channel)}
                          {log.channel}
                        </Pill>
                        <Pill className={v2OutcomeChipClass(log.outcome)}>{log.outcome}</Pill>
                        <Pill className={v2SentimentChipClass(log.sentiment)}>{log.sentiment}</Pill>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {log.topic} — {log.summary}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xxs text-muted-foreground">
                        <span>{log.startedAt}</span>
                        <span>{log.turns} turns</span>
                        <span>{log.duration}</span>
                        <span>{countLogTraceSteps(log, rosterAgent)} trace steps</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="shrink-0 border-b border-border px-6 py-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-foreground" />
                <h2 className="text-base font-semibold text-foreground">Conversations behind this gap</h2>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {logs.length} {gap.agent} conversation{logs.length === 1 ? "" : "s"} where this
                question came up without a canonical answer.
              </p>
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
                <Quote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-sm font-semibold leading-snug text-foreground">{gap.question}</p>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-3">
                {logs.map((log) => (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => setSelectedId(log.id)}
                    className="group flex w-full items-center gap-4 rounded-xl border border-border bg-white p-4 text-left transition-all hover:border-zinc-400 hover:shadow-md"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{log.residentName}</p>
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {conversationChannelIcon(log.channel)}
                          {log.channel}
                        </span>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${outcomeBadge(log.outcome)}`}>
                          {log.outcome}
                        </span>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${sentimentBadge(log.sentiment)}`}>
                          {log.sentiment}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {log.topic} — {log.summary}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground/70">
                        <span>{log.startedAt}</span>
                        <span>{log.turns} turns</span>
                        <span>{log.duration}</span>
                        <span>{countLogTraceSteps(log, rosterAgent)} trace steps</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group block w-full overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-foreground/20"
    >
      <div className="min-w-0 flex-1">
        {/* Top region — icon tile + title + meta line + body + right rail */}
        <div className="flex items-start gap-3 px-4 py-3">
          <div
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
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
              <span className="font-medium text-foreground/70">{meta.label}</span>
              <span className="text-muted-foreground/40">·</span>
              <CategoryChip category={entry.category} />
            </div>
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
              {entry.body}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {entry.status !== "approved" && <StatusBadge status={entry.status} />}
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Bottom region — only shown when there's linkage to surface
            (agents for property entries, or an expiry). */}
        {(entry.expiresAt || (isProperty && entry.agents.length > 0)) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/60 bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
            {entry.expiresAt && (
              <span className="inline-flex items-center gap-1 text-orange-700">
                <Calendar className="h-3 w-3" />
                expires {entry.expiresAt}
              </span>
            )}
            {isProperty && entry.agents.length > 0 && (
              <>
                {entry.expiresAt && <span className="text-muted-foreground/50">·</span>}
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
          </div>
        )}
      </div>
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────
 * 8b) SOP / Policy → Knowledge generation
 *     Mirrors the "Create playbook from a document" flow: pick an
 *     approved SOP/policy from the vault, parse its procedures, and
 *     pre-fill a knowledge entry for the user to review.
 * ──────────────────────────────────────────────────────────── */

function approvalBadgeClass(status: string) {
  switch (status) {
    case "approved":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200";
    case "review":
    case "needs_review":
      return "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200";
    default:
      return "bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-200";
  }
}

function approvalLabel(status: string) {
  switch (status) {
    case "approved":
      return "Approved";
    case "review":
    case "needs_review":
      return "Needs review";
    default:
      return status;
  }
}

function keywordFallbackBody(lower: string, name: string, typeLabel: string): string {
  if (lower.includes("deposit")) {
    return `Summarized from the ${typeLabel} "${name}":\n\n• Security deposits are returned per state-specific timelines (default 30 days).\n• Itemized deductions must be documented with receipts.\n• Disputes are escalated to the property manager.\n\nReview and adjust before saving.`;
  }
  if (lower.includes("fair housing") || lower.includes("discrimin")) {
    return `Summarized from the ${typeLabel} "${name}":\n\n• Treat all applicants and residents equally regardless of protected class.\n• Never steer prospects toward or away from units based on personal characteristics.\n• Escalate any fair-housing concern to a manager.\n\nReview and adjust before saving.`;
  }
  if (lower.includes("maintenance") || lower.includes("escalation")) {
    return `Summarized from the ${typeLabel} "${name}":\n\n• Emergency maintenance (flooding, gas, no heat) is escalated immediately.\n• Routine requests are logged and scheduled within standard SLAs.\n• Keep the resident updated on status and timing.\n\nReview and adjust before saving.`;
  }
  if (lower.includes("refund") || lower.includes("payment")) {
    return `Summarized from the ${typeLabel} "${name}":\n\n• Refunds follow approval thresholds; large amounts require manager sign-off.\n• Standard refunds are processed within 5 business days of approval.\n• Don't commit to specific amounts without approval.\n\nReview and adjust before saving.`;
  }
  return `Summarized from the ${typeLabel} "${name}". Review the document's procedures and capture the key facts the AI should know, then save.`;
}

/**
 * Short, friendly explainer shown at the top of an entry. Clarifies that
 * knowledge saved here is the agent's source of truth — once assigned, the
 * agent treats it as the final say, overriding conflicting system settings.
 */
function SourceOfTruthHint({ className }: { className?: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xxs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              className
            )}
          >
            <Info className="h-3.5 w-3.5" />
            The agent&apos;s source of truth
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-xs text-xs leading-relaxed">
          Anything you save here and assign to an agent becomes that agent&apos;s source of
          truth. When responding, the agent treats it as the final say — it overrides any
          conflicting settings elsewhere in the system.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Google Drive brand mark (inline SVG — brand logo exception, see CLAUDE.md). */
function GoogleDriveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 87.3 78" className={className} aria-hidden="true">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47" />
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
  );
}

/** Mock Google Drive file listing for the "Import from Google Drive" picker. */
const GOOGLE_DRIVE_FILES: {
  id: string;
  name: string;
  kindLabel: string;
  owner: string;
  modified: string;
}[] = [
  { id: "gd1", name: "Resident Handbook 2026.pdf", kindLabel: "PDF", owner: "me", modified: "2 days ago" },
  { id: "gd2", name: "Pet Policy — West Region.docx", kindLabel: "Google Doc", owner: "me", modified: "Apr 18, 2026" },
  { id: "gd3", name: "Parking & Garage Rules.docx", kindLabel: "Google Doc", owner: "Jordan Vance", modified: "Mar 30, 2026" },
  { id: "gd4", name: "Move-in Checklist.pdf", kindLabel: "PDF", owner: "me", modified: "Mar 2, 2026" },
  { id: "gd5", name: "Maintenance Escalation SOP.docx", kindLabel: "Google Doc", owner: "Priya Shah", modified: "Feb 11, 2026" },
  { id: "gd6", name: "Security Deposit Policy.pdf", kindLabel: "PDF", owner: "me", modified: "Jan 24, 2026" },
];

/** Draft a knowledge entry from an uploaded / Drive file (filename-driven). */
function generateKnowledgeFromExternalSource(fileName: string): {
  title: string;
  body: string;
  category: Category;
} {
  const baseName = fileName.replace(/\.[^./\\]+$/, "");
  const lower = fileName.toLowerCase();
  const body = keywordFallbackBody(lower, baseName, "document");
  const category: Category = lower.includes("parking")
    ? "parking"
    : lower.includes("pet")
    ? "pet_rules"
    : "policies";
  return { title: baseName, body, category };
}

/**
 * Warm "generate from a document" affordance (CLAUDE.md rule #2 — Eli content).
 * Offers the three knowledge sources: an existing SOP/policy, an uploaded file,
 * or a Google Drive import. Reused by both the compose step and the edit form.
 */
function GenerateSourcesCard({
  onSop,
  onFile,
  onDrive,
}: {
  onSop: () => void;
  onFile: (fileName: string) => void;
  onDrive: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const options = [
    {
      key: "sop",
      label: "SOP or policy",
      desc: "From Policies & SOPs",
      icon: <ScrollText className="h-4 w-4 text-eli-purple" />,
      onClick: onSop,
    },
    {
      key: "upload",
      label: "Upload a document",
      desc: "PDF, Word, or text",
      icon: <Upload className="h-4 w-4 text-eli-purple" />,
      onClick: () => fileInputRef.current?.click(),
    },
    {
      key: "drive",
      label: "Google Drive",
      desc: "Import from Drive",
      icon: <GoogleDriveIcon className="h-4 w-4" />,
      onClick: onDrive,
    },
  ];
  return (
    <div className="rounded-lg border border-eli-purple/30 bg-eli-warm-bg p-3 text-eli-warm-bg-foreground">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
          <img src="/eli-cube.svg" alt="" width={20} height={20} className="h-5 w-5 shrink-0" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Generate from a document</p>
          <p className="text-xxs text-muted-foreground">
            Let Eli turn an existing source into a knowledge entry.
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={opt.onClick}
            className="flex items-center gap-2.5 rounded-lg border border-input bg-background px-3 py-2.5 text-left transition-colors hover:border-eli-purple/40 hover:bg-muted/50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background">
              {opt.icon}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">{opt.label}</span>
              <span className="block truncate text-xxs text-muted-foreground">{opt.desc}</span>
            </span>
          </button>
        ))}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md,.rtf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file.name);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Parses a vault document into a draft knowledge entry (title, body, category). */
function generateKnowledgeFromDocument(doc: VaultItem): {
  title: string;
  body: string;
  category: Category;
} {
  const name = doc.fileName;
  const lower = name.toLowerCase();
  const typeLabel = doc.documentType === "policy" ? "policy" : "SOP";

  const points: string[] = [];
  if (doc.body) {
    for (const raw of doc.body.split("\n")) {
      const line = raw
        .replace(/^[\s]*[●○■◦•\-*]+\s*/, "")
        .replace(/^\d+[.)]\s*/, "")
        .trim();
      if (line.length < 12 || line.length > 180) continue;
      // Skip ALL-CAPS section headers (e.g. "SCOPE", "ELIGIBILITY").
      if (line === line.toUpperCase() && line.split(" ").length <= 4) continue;
      points.push(line);
      if (points.length >= 8) break;
    }
  }

  const body =
    points.length >= 3
      ? `Key points from the ${typeLabel} "${name}":\n\n` +
        points.map((p) => `• ${p}`).join("\n")
      : keywordFallbackBody(lower, name, typeLabel);

  const category: Category =
    lower.includes("parking")
      ? "parking"
      : lower.includes("pet")
      ? "pet_rules"
      : "policies";

  return { title: name, body, category };
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
  propertyPreselected = true,
  onSubmit,
  v2 = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefill: AddPrefill | null;
  property: string;
  /**
   * Whether `property` reflects an explicit selection vs. a fallback default.
   * When false (e.g. the page is on "all properties"), a new entry starts with
   * no property chosen so the form prompts the author to pick one.
   */
  propertyPreselected?: boolean;
  onSubmit: (e: KnowledgeEntry) => void;
  v2?: boolean;
}) {
  const [step, setStep] = useState<
    "compose" | "analyzing" | "form" | "selectDoc" | "driveDoc" | "generating"
  >(prefill ? "form" : "compose");
  const [type, setType] = useState<EntryType>(
    prefill ? normalizeEntryType(prefill.type) : "general"
  );
  // How the current type was chosen — drives the form's "AI-detected" affordance.
  const [typeSource, setTypeSource] = useState<"auto" | "manual">(
    prefill ? "manual" : "auto"
  );
  const [detectRationale, setDetectRationale] = useState<string>("");

  // SOP / Policy → knowledge generation
  const { documents } = useVault();
  const [docSearch, setDocSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState<string>("all");
  const [selectedDoc, setSelectedDoc] = useState<VaultItem | null>(null);
  const [sourceDoc, setSourceDoc] = useState<VaultItem | null>(null);
  // Google Drive import picker
  const [driveSearch, setDriveSearch] = useState("");
  const filteredDriveFiles = useMemo(() => {
    const q = driveSearch.trim().toLowerCase();
    return GOOGLE_DRIVE_FILES.filter((f) => !q || f.name.toLowerCase().includes(q));
  }, [driveSearch]);

  const sopPolicyDocs = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    return documents.filter((d) => {
      if (d.type !== "file") return false;
      if (d.isTemplate) return false;
      if (d.approvalStatus !== "approved") return false;
      if (d.documentType !== "sop" && d.documentType !== "policy") return false;
      if (docTypeFilter !== "all" && d.documentType !== docTypeFilter) return false;
      if (q && !d.fileName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [documents, docSearch, docTypeFilter]);

  // Form fields
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [body, setBody] = useState(prefill?.body ?? "");
  const [category, setCategory] = useState<Category>(
    prefill?.category ?? TYPE_DEFAULT_CATEGORY[type]
  );
  const [scope, setScope] = useState<KnowledgeEntry["scope"]>(prefill?.scope ?? "property");
  // Which property a property-scoped entry belongs to. Editable in the form so
  // the author isn't locked to whatever the page is currently filtered to. A new
  // entry with no preselected property starts empty so the author must pick one.
  const [entryProperty, setEntryProperty] = useState<string>(
    prefill?.property ?? (propertyPreselected ? property : "")
  );
  const [agents, setAgents] = useState<AgentName[]>(prefill?.agents ?? []);
  const [expiresAt, setExpiresAt] = useState<string>("");

  // Location targeting (only meaningful when scope === "property").
  const [floorPlans, setFloorPlans] = useState<string[]>(prefill?.appliesTo?.floorPlans ?? []);
  const [unitTypes, setUnitTypes] = useState<string[]>(prefill?.appliesTo?.unitTypes ?? []);
  const [units, setUnits] = useState<string[]>(prefill?.appliesTo?.units ?? []);
  const hasLocations = floorPlans.length + unitTypes.length + units.length > 0;

  const toggleAgent = (a: AgentName) =>
    setAgents((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );

  const toggleLocation =
    (setter: React.Dispatch<React.SetStateAction<string[]>>) => (value: string) =>
      setter((prev) =>
        prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
      );

  const clearLocations = () => {
    setFloorPlans([]);
    setUnitTypes([]);
    setUnits([]);
  };

  // Suppression
  const [suppressReason, setSuppressReason] = useState("");
  const [redirectMessage, setRedirectMessage] = useState("");

  // Procedure

  // Whenever the dialog opens, normalize its state from the current prefill.
  // A prefill (e.g. drafting from a gap) carries a known type, so we skip the
  // type-picker and jump straight to the filled-in form.
  useEffect(() => {
    if (!open) return;
    setStep(prefill ? "form" : "compose");
    setType(prefill ? normalizeEntryType(prefill.type) : "general");
    setTypeSource(prefill ? "manual" : "auto");
    setDetectRationale("");
    setTitle(prefill?.title ?? "");
    setBody(prefill?.body ?? "");
    setCategory(
      prefill?.category ??
        TYPE_DEFAULT_CATEGORY[prefill ? normalizeEntryType(prefill.type) : "general"]
    );
    setScope(prefill?.scope ?? "property");
    setEntryProperty(prefill?.property ?? (propertyPreselected ? property : ""));
    setAgents(prefill?.agents ?? []);
    setFloorPlans(prefill?.appliesTo?.floorPlans ?? []);
    setUnitTypes(prefill?.appliesTo?.unitTypes ?? []);
    setUnits(prefill?.appliesTo?.units ?? []);
    setExpiresAt("");
    setSuppressReason("");
    setRedirectMessage("");
    setDocSearch("");
    setDocTypeFilter("all");
    setSelectedDoc(null);
    setSourceDoc(null);
    setDriveSearch("");
  }, [open, prefill, property, propertyPreselected]);

  const reset = () => {
    setStep(prefill ? "form" : "compose");
    setType(prefill ? normalizeEntryType(prefill.type) : "general");
    setTypeSource(prefill ? "manual" : "auto");
    setDetectRationale("");
    setTitle(prefill?.title ?? "");
    setBody(prefill?.body ?? "");
    setCategory(
      prefill?.category ??
        TYPE_DEFAULT_CATEGORY[prefill ? normalizeEntryType(prefill.type) : "general"]
    );
    setScope(prefill?.scope ?? "property");
    setEntryProperty(prefill?.property ?? (propertyPreselected ? property : ""));
    setAgents(prefill?.agents ?? []);
    setFloorPlans(prefill?.appliesTo?.floorPlans ?? []);
    setUnitTypes(prefill?.appliesTo?.unitTypes ?? []);
    setUnits(prefill?.appliesTo?.units ?? []);
    setExpiresAt("");
    setSuppressReason("");
    setRedirectMessage("");
    setDocSearch("");
    setDocTypeFilter("all");
    setSelectedDoc(null);
    setSourceDoc(null);
    setDriveSearch("");
  };

  const canAnalyze = title.trim().length > 0 && body.trim().length > 0;

  // Step 1 → 2: "synthesize" the entry to determine its type, then reveal the
  // remaining fields. Runs a brief analyzing animation before classifying.
  const runAnalysis = () => {
    if (!canAnalyze) return;
    setStep("analyzing");
    setTimeout(() => {
      const { type: detected, rationale } = classifyKnowledge(title, v2 ? bodyToPlainText(body) : body);
      setType(detected);
      setCategory(TYPE_DEFAULT_CATEGORY[detected]);
      setTypeSource("auto");
      setDetectRationale(rationale);
      setStep("form");
    }, 1500);
  };

  // Author overrides the detected type from inside the form.
  const changeType = (t: EntryType) => {
    setType(t);
    setCategory(TYPE_DEFAULT_CATEGORY[t]);
    setTypeSource("manual");
  };

  // Re-run detection against the current (possibly edited) title + body.
  const reanalyzeType = () => {
    const { type: detected, rationale } = classifyKnowledge(title, v2 ? bodyToPlainText(body) : body);
    setType(detected);
    setCategory(TYPE_DEFAULT_CATEGORY[detected]);
    setTypeSource("auto");
    setDetectRationale(rationale);
  };

  // Confirm a document and "generate" a knowledge draft from it.
  const handleConfirmDoc = (doc: VaultItem) => {
    setSelectedDoc(doc);
    setStep("generating");
    setTimeout(() => {
      const draft = generateKnowledgeFromDocument(doc);
      const { type: detected, rationale } = classifyKnowledge(draft.title, draft.body);
      setTitle(draft.title);
      setBody(draft.body);
      setType(detected);
      setCategory(draft.category);
      setTypeSource("auto");
      setDetectRationale(rationale);
      setSourceDoc(doc);
      setStep("form");
    }, 2200);
  };

  // Upload / Google Drive → "ingest" the file and generate a draft. Mirrors the
  // SOP/policy flow: a synthetic source doc drives the generating animation and
  // the form's provenance banner.
  const runExternalGeneration = (fileName: string, kind: "upload" | "drive") => {
    const synthetic: VaultItem = {
      id: `ext-${Date.now()}`,
      fileName,
      documentType: "policy",
      property: "—",
      approvalStatus: "approved",
      trainedOn: "",
      modified: "Just now",
      owner: kind === "drive" ? "Google Drive" : "Uploaded file",
      type: "file",
    };
    setSelectedDoc(synthetic);
    setStep("generating");
    setTimeout(() => {
      const draft = generateKnowledgeFromExternalSource(fileName);
      const { type: detected, rationale } = classifyKnowledge(draft.title, draft.body);
      setTitle(draft.title);
      setBody(draft.body);
      setType(detected);
      setCategory(draft.category);
      setTypeSource("auto");
      setDetectRationale(rationale);
      setSourceDoc(synthetic);
      setStep("form");
    }, 2200);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const canSubmit =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (scope !== "property" || entryProperty.trim().length > 0);

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
      property: scope === "property" ? entryProperty : undefined,
      appliesTo:
        scope === "property" && (floorPlans.length || unitTypes.length || units.length)
          ? { floorPlans, unitTypes, units }
          : undefined,
      owner: "You",
      version: 1,
      history: [
        {
          version: 1,
          date: new Date().toLocaleDateString(),
          author: "You",
          note: sourceDoc
            ? `Generated from "${sourceDoc.fileName}" and submitted for review.`
            : "Submitted for review.",
          title: title.trim(),
          body: body.trim(),
        },
      ],
      usageCount: 0,
      updatedAt: "Just now",
      agents,
      expiresAt: expiresAt.trim() || undefined,
      suppressReason: type === "suppression" ? suppressReason.trim() || undefined : undefined,
      redirectMessage: type === "suppression" ? redirectMessage.trim() || undefined : undefined,
    };
    onSubmit(newEntry);
    handleClose(false);
  };

  const meta = TYPE_META[type];
  const Icon = meta.icon;
  const isEdit = !!prefill?.editId;

  /* ── Version Two — centered Dialog with the three-region shell (pinned
   * header + scrollable body + pinned footer). Editing stays a focused modal so
   * it reads as a distinct mode from the side-sheet viewing experience. The
   * legacy centered Dialog below is left byte-for-byte for Full/R1/R2. ── */
  if (v2) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="flex max-h-[88vh] h-[75vh] w-[75vw] max-w-[75vw] flex-col gap-0 overflow-hidden p-0">
          {step === "compose" && (
            <>
              <div className="shrink-0 border-b border-border px-6 pt-6 pb-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <DialogTitle className="text-lg font-semibold leading-snug">
                      Add knowledge
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-sm text-muted-foreground">
                      Start with the basics — write it in plain language and we&apos;ll figure out
                      the rest.
                    </DialogDescription>
                    <div className="mt-2">
                      <SourceOfTruthHint />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    aria-label="Close"
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5 scrollbar-hover">
                {/* Generate-from-document — ELI affordance (warm treatment, rule #2).
                    Three sources: an existing SOP/policy, an uploaded file, or Google Drive. */}
                <GenerateSourcesCard
                  onSop={() => setStep("selectDoc")}
                  onFile={(name) => runExternalGeneration(name, "upload")}
                  onDrive={() => setStep("driveDoc")}
                />

                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Short, plain-language title"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        runAnalysis();
                      }
                    }}
                  />
                </div>

                <div className="flex min-h-0 flex-1 flex-col space-y-1">
                  <Label>Knowledge</Label>
                  <RichTextEditor
                    content={bodyToHtml(body)}
                    onChange={(html) => setBody(html === "<p></p>" ? "" : html)}
                    placeholder="Plain language is fine — bullets, a sentence, or a full write-up. Paste as much as you need — from a few lines to thousands. The AI turns it into natural answers."
                    className="flex flex-1 flex-col [&_.ProseMirror]:min-h-[42vh] [&_.ProseMirror]:flex-1 [&_.ProseMirror]:overflow-y-auto"
                  />
                </div>

                <p className="flex items-center gap-1.5 text-xxs text-muted-foreground">
                  <Box className="h-3.5 w-3.5 text-eli-purple" />
                  Next, we&apos;ll suggest a type (Knowledge or Guardrail)
                  and the rest of the details.
                </p>
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-background px-6 py-4">
                <Button variant="ghost" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
                <Button onClick={runAnalysis} disabled={!canAnalyze}>
                  Continue
                  <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}

          {(step === "analyzing" || step === "generating") && (
            <>
              <div className="shrink-0 border-b border-border px-6 pt-6 pb-5">
                <DialogTitle className="text-lg font-semibold leading-snug">
                  {step === "analyzing" ? "Analyzing your knowledge" : "Generating knowledge"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  {step === "analyzing" ? (
                    "Determining the best type and category for this entry…"
                  ) : (
                    <>
                      Analyzing{" "}
                      <span className="font-medium text-foreground">{selectedDoc?.fileName}</span>{" "}
                      and extracting the key facts…
                    </>
                  )}
                </DialogDescription>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
                <div className="relative flex items-center justify-center">
                  <div className="absolute h-20 w-20 animate-ping rounded-full bg-eli-purple/10" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-eli-warm-bg">
                    <Sparkles className="h-7 w-7 animate-pulse text-eli-purple" />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-sm font-medium text-foreground">
                    {step === "analyzing" ? "Synthesizing…" : "Generating knowledge…"}
                  </p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    {step === "analyzing" ? (
                      "Reading what you wrote to suggest a type and set up the right fields."
                    ) : (
                      <>
                        Analyzing{" "}
                        <span className="font-medium text-foreground">{selectedDoc?.fileName}</span>{" "}
                        and turning its procedures into a knowledge entry.
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-eli-purple [animation-delay:0ms]" />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-eli-purple [animation-delay:150ms]" />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-eli-purple [animation-delay:300ms]" />
                </div>
              </div>
            </>
          )}

          {step === "selectDoc" && (
            <>
              <div className="shrink-0 border-b border-border px-6 pt-6 pb-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <DialogTitle className="text-lg font-semibold leading-snug">
                      Select an SOP or policy
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-sm text-muted-foreground">
                      Choose a document from Policies &amp; SOPs to generate this knowledge entry
                      from.
                    </DialogDescription>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    aria-label="Close"
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-5 scrollbar-hover">
                <div className="flex items-center gap-2">
                  <V2SearchInput
                    value={docSearch}
                    onChange={setDocSearch}
                    placeholder="Search documents"
                    className="relative flex-1"
                  />
                  <SingleSelectPill
                    label="Type"
                    value={docTypeFilter}
                    defaultValue="all"
                    onChange={setDocTypeFilter}
                    options={[
                      { value: "all", label: "All types" },
                      { value: "sop", label: "SOP" },
                      { value: "policy", label: "Policy" },
                    ]}
                  />
                </div>

                {sopPolicyDocs.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-lg border border-border py-12 text-muted-foreground">
                    <FileText className="h-8 w-8 opacity-30" />
                    <p className="text-sm">No approved SOPs or policies match your search.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {sopPolicyDocs.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => handleConfirmDoc(row)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-medium text-foreground">
                                {row.fileName}
                              </span>
                              {row.version && (
                                <Badge variant="secondary" className="px-1.5 py-0 text-xxs">
                                  v{row.version}
                                </Badge>
                              )}
                            </span>
                            <span className="mt-0.5 flex items-center gap-1.5 text-xxs text-muted-foreground">
                              <span className="capitalize">{row.documentType}</span>
                              <span>·</span>
                              <span className="truncate">{row.property}</span>
                              <span>·</span>
                              <span>{row.modified}</span>
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-background px-6 py-4">
                <Button variant="outline" onClick={() => setStep("form")}>
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Back
                </Button>
                <Button variant="ghost" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
              </div>
            </>
          )}

          {step === "driveDoc" && (
            <>
              <div className="shrink-0 border-b border-border px-6 pt-6 pb-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <DialogTitle className="text-lg font-semibold leading-snug">
                      Import from Google Drive
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-sm text-muted-foreground">
                      Choose a file from your connected Drive to generate this knowledge entry
                      from.
                    </DialogDescription>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    aria-label="Close"
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-5 scrollbar-hover">
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <GoogleDriveIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate text-xs text-muted-foreground">
                      Connected as{" "}
                      <span className="font-medium text-foreground">harvestpeak@gmail.com</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-xxs text-muted-foreground">
                    {GOOGLE_DRIVE_FILES.length} files
                  </span>
                </div>

                <V2SearchInput
                  value={driveSearch}
                  onChange={setDriveSearch}
                  placeholder="Search Drive"
                  className="relative"
                />

                {filteredDriveFiles.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-lg border border-border py-12 text-muted-foreground">
                    <GoogleDriveIcon className="h-8 w-8 opacity-40" />
                    <p className="text-sm">No Drive files match your search.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {filteredDriveFiles.map((f) => (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => runExternalGeneration(f.name, "drive")}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {f.name}
                            </span>
                            <span className="mt-0.5 flex items-center gap-1.5 text-xxs text-muted-foreground">
                              <span>{f.kindLabel}</span>
                              <span>·</span>
                              <span className="truncate">{f.owner}</span>
                              <span>·</span>
                              <span>{f.modified}</span>
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-background px-6 py-4">
                <Button variant="outline" onClick={() => setStep(prefill ? "form" : "compose")}>
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Back
                </Button>
                <Button variant="ghost" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
              </div>
            </>
          )}

          {step === "form" && (
            <>
              <div className="shrink-0 border-b border-border px-6 pt-6 pb-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <DialogTitle className="text-lg font-semibold leading-snug">
                      {isEdit ? "Edit" : "New"} {meta.label.toLowerCase()} entry
                    </DialogTitle>
                    <DialogDescription className="mt-0.5 text-sm text-muted-foreground">
                      Will be sent for review and used by the AI once approved.
                    </DialogDescription>
                    <div className="mt-2">
                      <SourceOfTruthHint />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    aria-label="Close"
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 scrollbar-hover">
                {sourceDoc && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-eli-purple/30 bg-eli-warm-bg p-2.5 text-xs text-eli-warm-bg-foreground">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <AiStatusBadge status="ELI Generated" />
                      <span className="min-w-0">
                        From {sourceDoc.fileName} — review and edit before saving.
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep("selectDoc")}
                      className="shrink-0 font-medium text-eli-purple underline-offset-2 hover:underline"
                    >
                      Change document
                    </button>
                  </div>
                )}

                {prefill?.origin && (
                  <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Origin:</span> {prefill.origin}
                  </div>
                )}

                {/* Source the content from a document — available while editing too. */}
                <GenerateSourcesCard
                  onSop={() => setStep("selectDoc")}
                  onFile={(name) => runExternalGeneration(name, "upload")}
                  onDrive={() => setStep("driveDoc")}
                />

                {/* Type panel — neutral surface; AI classification marked with a provenance badge */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                      <Icon className="h-4 w-4 text-foreground" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground">{meta.label}</span>
                        {typeSource === "auto" && !prefill && (
                          <AiStatusBadge status="ELI Suggested" />
                        )}
                      </div>
                      <p className="text-xxs text-muted-foreground">
                        {typeSource === "auto" && detectRationale ? detectRationale : meta.blurb}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!prefill && (
                      <button
                        type="button"
                        onClick={reanalyzeType}
                        className="inline-flex items-center gap-1 text-xxs font-medium text-eli-purple hover:text-eli-purple/80"
                      >
                        <Box className="h-3.5 w-3.5" />
                        Re-analyze
                      </button>
                    )}
                    <Select value={type} onValueChange={(v) => changeType(v as EntryType)}>
                      <SelectTrigger className="h-8 w-40 bg-background text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TYPE_META) as EntryType[]).map((t) => (
                          <SelectItem key={t} value={t}>
                            {TYPE_META[t].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Core content — title, the knowledge body, and its category are
                    one conceptual unit, so they share a single section. */}
                <div className="space-y-4 rounded-lg border border-border bg-muted/40 p-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Title</Label>
                    <Input
                      className="bg-background shadow-none"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Short, plain-language title"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Category</Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                      <SelectTrigger className="w-full bg-background sm:max-w-[280px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 pt-1.5 pb-1 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">
                          Property / Portfolio information
                        </div>
                        {MIRROR_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {CATEGORY_META[c].label}
                          </SelectItem>
                        ))}
                        <div className="px-2 pt-2 pb-1 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">
                          Additional information and context
                        </div>
                        {HUB_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {CATEGORY_META[c].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">
                      {type === "suppression" ? "What topic should the AI not discuss?" : "Knowledge"}
                    </Label>
                    <RichTextEditor
                      content={bodyToHtml(body)}
                      onChange={(html) => setBody(html === "<p></p>" ? "" : html)}
                      placeholder="Plain language is fine — bullets, a sentence, or a full write-up. The AI turns it into natural answers."
                      className="[&_.ProseMirror]:min-h-[260px] [&_.ProseMirror]:overflow-y-auto"
                    />
                  </div>
                </div>

                {type === "suppression" && (
                  <div className="space-y-2 rounded-lg border border-status-error-border bg-status-error p-3">
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

                <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Which agents use this?</Label>
                    <button
                      type="button"
                      className="text-xxs font-medium text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setAgents(agents.length === ALL_AGENTS.length ? [] : [...ALL_AGENTS])
                      }
                    >
                      {agents.length === ALL_AGENTS.length ? "Clear all" : "Select all"}
                    </button>
                  </div>
                  <p className="text-xxs text-muted-foreground">
                    Pick the agents allowed to use this knowledge. Only selected agents will see it.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {ALL_AGENTS.map((a) => {
                      const active = agents.includes(a);
                      return (
                        <button
                          key={a}
                          type="button"
                          onClick={() => toggleAgent(a)}
                          role="checkbox"
                          aria-checked={active}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium shadow-sm transition-all hover:shadow",
                            active
                              ? "border-eli-purple/30 bg-eli-warm-bg text-eli-warm-bg-foreground"
                              : "border-input bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                              active
                                ? "border-eli-purple bg-eli-purple text-white"
                                : "border-muted-foreground/40 bg-transparent"
                            )}
                          >
                            {active && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                          </span>
                          {a}
                        </button>
                      );
                    })}
                  </div>
                  {agents.length === 0 && (
                    <p className="flex items-center gap-1 pt-0.5 text-xxs text-status-warning-foreground">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      No agents selected — no agent will use this entry yet.
                    </p>
                  )}
                </div>

                <div className="space-y-2.5 rounded-lg border border-border bg-muted/40 p-3">
                  <div>
                    <Label className="text-sm">Where does this apply?</Label>
                    <p className="text-xxs text-muted-foreground">
                      Choose how broadly this knowledge applies.
                    </p>
                  </div>

                  <div
                    role="radiogroup"
                    aria-label="Where does this apply?"
                    className="flex max-w-md divide-x divide-input overflow-hidden rounded-md border border-input shadow-sm"
                  >
                    {(
                      [
                        {
                          value: "property" as const,
                          icon: MapPin,
                          title: "At a property",
                          subtitle: entryProperty || "Select a property",
                        },
                        {
                          value: "portfolio" as const,
                          icon: Building2,
                          title: "Whole portfolio",
                          subtitle: "Every property",
                        },
                      ]
                    ).map((opt) => {
                      const active = scope === opt.value;
                      const OptIcon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setScope(opt.value)}
                          role="radio"
                          aria-checked={active}
                          className={cn(
                            "flex flex-1 basis-0 items-start gap-2 p-2.5 text-left transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
                            active
                              ? "bg-[hsl(207_73%_95%)] dark:bg-[hsl(207_73%_20%)]"
                              : "bg-background hover:bg-muted/50"
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                              active
                                ? "bg-[hsl(207_73%_88%)] text-[hsl(207_73%_28%)] dark:bg-[hsl(207_73%_30%)] dark:text-[hsl(207_73%_85%)]"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            <OptIcon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold text-foreground">
                              {opt.title}
                            </span>
                            <span className="block truncate text-xxs text-muted-foreground">
                              {opt.subtitle}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {scope === "portfolio" && (
                    <p className="flex items-center gap-1.5 rounded-md bg-status-info px-2.5 py-1.5 text-xxs text-status-info-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      Applies across every property in the portfolio.
                    </p>
                  )}

                  {scope === "property" && (
                    <div className="space-y-3 rounded-md border border-border bg-background p-2.5">
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          <span className="text-destructive">*</span>Property
                        </Label>
                        <PropertySelector
                          data={PROPERTY_FILTER_DATA}
                          defaultDropdownOption="Property List"
                          triggerWidthClassName="h-9 w-full sm:max-w-[280px] justify-between gap-1.5 rounded-md border-input px-3 text-sm font-normal hover:bg-muted/50"
                          panelHeight={420}
                          selectedPropertyIds={entryProperty ? [entryProperty] : []}
                          onSelectedIdsChange={(ids) => {
                            if (ids.length) setEntryProperty(ids[ids.length - 1]);
                          }}
                        />
                      </div>

                      {entryProperty && (
                      <div className="space-y-2 border-t border-border/60 pt-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">
                            Property locations{" "}
                            <span className="font-normal text-muted-foreground">(optional)</span>
                          </Label>
                          {hasLocations && (
                            <button
                              type="button"
                              className="text-xxs font-medium text-muted-foreground hover:text-foreground"
                              onClick={clearLocations}
                            >
                              Clear all
                            </button>
                          )}
                        </div>
                        <p className="text-xxs text-muted-foreground">
                          Narrow this knowledge to specific floor plans, unit types, or units within{" "}
                          {entryProperty}.
                        </p>

                        <div className="flex flex-wrap gap-2">
                          <LocationMultiSelect
                            kind="floorPlan"
                            selected={floorPlans}
                            onToggle={toggleLocation(setFloorPlans)}
                          />
                          <LocationMultiSelect
                            kind="unitType"
                            selected={unitTypes}
                            onToggle={toggleLocation(setUnitTypes)}
                          />
                          <LocationMultiSelect
                            kind="unit"
                            selected={units}
                            onToggle={toggleLocation(setUnits)}
                          />
                        </div>

                        {hasLocations && (
                          <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-2">
                            {floorPlans.map((v) => (
                              <LocationChip
                                key={`fp-${v}`}
                                kind="floorPlan"
                                value={v}
                                onRemove={() => toggleLocation(setFloorPlans)(v)}
                              />
                            ))}
                            {unitTypes.map((v) => (
                              <LocationChip
                                key={`ut-${v}`}
                                kind="unitType"
                                value={v}
                                onRemove={() => toggleLocation(setUnitTypes)(v)}
                              />
                            ))}
                            {units.map((v) => (
                              <LocationChip
                                key={`u-${v}`}
                                kind="unit"
                                value={v}
                                onRemove={() => toggleLocation(setUnits)(v)}
                              />
                            ))}
                          </div>
                        )}

                        {hasLocations ? (
                          <p className="flex items-start gap-1 text-xxs text-muted-foreground">
                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            Applies only to the selected locations — not the entire property.
                          </p>
                        ) : (
                          <p className="flex items-start gap-1 text-xxs text-muted-foreground">
                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            No specific locations selected — this knowledge applies to the entire
                            property.
                          </p>
                        )}
                      </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Expires (optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={friendlyToIsoDate(expiresAt)}
                      onChange={(e) => setExpiresAt(isoToFriendlyDate(e.target.value))}
                      className="w-auto"
                    />
                    {expiresAt && (
                      <button
                        type="button"
                        onClick={() => setExpiresAt("")}
                        className="text-xxs font-medium text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-background px-6 py-4">
                {!prefill && (
                  <Button variant="outline" onClick={() => setStep("compose")}>
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
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[96vw] max-w-6xl max-h-[94vh] overflow-y-auto">
        {step === "compose" && (
          <>
            <DialogHeader>
              <DialogTitle>Add knowledge</DialogTitle>
              <DialogDescription>
                Start with the basics — write it in plain language and we&apos;ll figure out the
                rest.
              </DialogDescription>
            </DialogHeader>

            {/* Generate-from-document shortcut */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
                <BookOpen className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  Add knowledge from an SOP or policy
                </p>
                <p className="text-xs text-muted-foreground">
                  Generate this entry from an existing document&apos;s procedures.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep("selectDoc")}
                className="ml-auto shrink-0 gap-1.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
                <img src="/eli-cube.svg" alt="" width={16} height={16} className="shrink-0" />
                Generate from document
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short, plain-language title"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      runAnalysis();
                    }
                  }}
                />
              </div>

              <div className="space-y-1">
                <Label>Knowledge</Label>
                {v2 ? (
                  <RichTextEditor
                    content={bodyToHtml(body)}
                    onChange={(html) => setBody(html === "<p></p>" ? "" : html)}
                    placeholder="Plain language is fine — bullets, a sentence, or a full write-up. Paste as much as you need — from a few lines to thousands. The AI turns it into natural answers."
                    className="[&_.ProseMirror]:min-h-[440px] [&_.ProseMirror]:h-[58vh] [&_.ProseMirror]:overflow-y-auto"
                  />
                ) : (
                  <textarea
                    className="min-h-[440px] h-[58vh] w-full rounded-md border border-border bg-background p-2 text-sm"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Plain language is fine — bullets, a sentence, or a full write-up. Paste as much as you need — from a few lines to thousands. The AI turns it into natural answers."
                  />
                )}
              </div>

              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Next, we&apos;ll suggest a type (Knowledge or Guardrail)
                and the rest of the details.
              </p>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={runAnalysis} disabled={!canAnalyze}>
                Continue
                <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "analyzing" && (
          <>
            <DialogHeader>
              <DialogTitle>Analyzing your knowledge</DialogTitle>
              <DialogDescription>
                Determining the best type and category for this entry…
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center gap-6 py-16">
              <div className="relative flex items-center justify-center">
                <div className="absolute h-20 w-20 animate-ping rounded-full bg-primary/10" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-7 w-7 animate-pulse text-primary" />
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-sm font-medium text-foreground">Synthesizing…</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Reading what you wrote to suggest a type and set up the right fields.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
              </div>
            </div>
          </>
        )}

        {step === "selectDoc" && (
          <>
            <DialogHeader>
              <DialogTitle>Select an SOP or policy</DialogTitle>
              <DialogDescription>
                Choose a document from Policies &amp; SOPs to generate this knowledge entry from.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="Search documents"
                  className="h-9 pl-8"
                />
              </div>
              <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="sop">SOP</SelectItem>
                  <SelectItem value="policy">Policy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-[52vh] overflow-y-auto rounded-lg border border-border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Property
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Approval
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Modified
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sopPolicyDocs.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
                      onClick={() => handleConfirmDoc(row)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleConfirmDoc(row);
                        }
                      }}
                    >
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        <span className="inline-flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          </span>
                          <span className="truncate text-sm">{row.fileName}</span>
                          {row.version && (
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                              v{row.version}
                            </Badge>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm capitalize text-muted-foreground">
                        {row.documentType}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground">{row.property}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                            approvalBadgeClass(row.approvalStatus)
                          )}
                        >
                          {approvalLabel(row.approvalStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground">{row.modified}</td>
                    </tr>
                  ))}
                  {sopPolicyDocs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <FileText className="h-8 w-8 opacity-30" />
                          <p className="text-sm">No approved SOPs or policies match your search.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("form")}>
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back
              </Button>
              <Button variant="ghost" onClick={() => handleClose(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "generating" && (
          <>
            <DialogHeader>
              <DialogTitle>Generating knowledge</DialogTitle>
              <DialogDescription>
                Analyzing{" "}
                <span className="font-medium text-foreground">{selectedDoc?.fileName}</span> and
                extracting the key facts…
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center gap-6 py-16">
              <div className="relative flex items-center justify-center">
                <div className="absolute h-20 w-20 animate-ping rounded-full bg-primary/10" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-7 w-7 animate-pulse text-primary" />
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-sm font-medium text-foreground">Generating knowledge…</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Analyzing{" "}
                  <span className="font-medium text-foreground">{selectedDoc?.fileName}</span> and
                  turning its procedures into a knowledge entry.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
              </div>
            </div>
          </>
        )}

        {step === "form" && (
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

            {sourceDoc && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs text-emerald-900">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    <span className="font-semibold">Generated from</span> {sourceDoc.fileName} —
                    review and edit before saving.
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setStep("selectDoc")}
                  className="shrink-0 font-medium text-emerald-800 underline-offset-2 hover:underline"
                >
                  Change document
                </button>
              </div>
            )}

            {prefill?.origin && (
              <div className="rounded-md border border-purple-200 bg-purple-50/60 p-2.5 text-xs text-purple-900">
                <span className="font-semibold">Origin:</span> {prefill.origin}
              </div>
            )}

            <div className="space-y-3">
              <div
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-md border p-3",
                  meta.accent
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      meta.badge
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground">
                        {meta.label}
                      </span>
                      {typeSource === "auto" && !prefill && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          <Sparkles className="h-2.5 w-2.5" />
                          AI-detected
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {typeSource === "auto" && detectRationale
                        ? detectRationale
                        : meta.blurb}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!prefill && (
                    <button
                      type="button"
                      onClick={reanalyzeType}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      <Sparkles className="h-3 w-3" />
                      Re-analyze
                    </button>
                  )}
                  <Select value={type} onValueChange={(v) => changeType(v as EntryType)}>
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_META) as EntryType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_META[t].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short, plain-language title" />
              </div>

              <div className="space-y-1">
                <Label>{type === "suppression" ? "What topic should the AI not discuss?" : "Knowledge"}</Label>
                {v2 ? (
                  <RichTextEditor
                    content={bodyToHtml(body)}
                    onChange={(html) => setBody(html === "<p></p>" ? "" : html)}
                    placeholder="Plain language is fine — bullets, a sentence, or a full write-up. The AI turns it into natural answers."
                    className="[&_.ProseMirror]:min-h-[260px] [&_.ProseMirror]:overflow-y-auto"
                  />
                ) : (
                  <textarea
                    className="min-h-[260px] w-full rounded-md border border-border bg-background p-2 text-sm"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Plain language is fine — bullets, a sentence, or a full write-up. The AI turns it into natural answers."
                  />
                )}
              </div>

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

              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Property / Portfolio information
                    </div>
                    {MIRROR_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_META[c].label}
                      </SelectItem>
                    ))}
                    <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Additional information and context
                    </div>
                    {HUB_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_META[c].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Which agents use this?</Label>
                  <button
                    type="button"
                    className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setAgents(agents.length === ALL_AGENTS.length ? [] : [...ALL_AGENTS])
                    }
                  >
                    {agents.length === ALL_AGENTS.length ? "Clear all" : "Select all"}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Pick the agents allowed to use this knowledge. Only selected agents will see it.
                </p>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {ALL_AGENTS.map((a) => {
                    const active = agents.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleAgent(a)}
                        aria-pressed={active}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          active
                            ? cn("ring-1 ring-inset border-transparent", AGENT_TONE[a])
                            : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                        )}
                      >
                        {active ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        {a}
                      </button>
                    );
                  })}
                </div>
                {agents.length === 0 && (
                  <p className="flex items-center gap-1 pt-0.5 text-[11px] text-amber-700">
                    <AlertTriangle className="h-3 w-3" />
                    No agents selected — no agent will use this entry yet.
                  </p>
                )}
              </div>

              <div className="space-y-2.5 rounded-md border border-border bg-muted/30 p-3">
                <div>
                  <Label className="text-sm">Where does this apply?</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Choose how broadly this knowledge applies.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        value: "property" as const,
                        icon: Pin,
                        title: "This property",
                        subtitle: property,
                      },
                      {
                        value: "portfolio" as const,
                        icon: Building2,
                        title: "Whole portfolio",
                        subtitle: "Every property",
                      },
                    ]
                  ).map((opt) => {
                    const active = scope === opt.value;
                    const OptIcon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setScope(opt.value)}
                        aria-pressed={active}
                        className={cn(
                          "flex items-start gap-2 rounded-md border p-2.5 text-left transition-colors",
                          active
                            ? "border-primary bg-primary/5 ring-1 ring-inset ring-primary/30"
                            : "border-border bg-background hover:border-foreground/30"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                            active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}
                        >
                          <OptIcon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-foreground">
                            {opt.title}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {opt.subtitle}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {scope === "portfolio" && (
                  <p className="flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1.5 text-[11px] text-indigo-800">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    Applies across every property in the portfolio.
                  </p>
                )}

                {scope === "property" && (
                  <div className="space-y-2 rounded-md border border-border bg-background p-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">
                        Property locations{" "}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      {hasLocations && (
                        <button
                          type="button"
                          className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                          onClick={clearLocations}
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Narrow this knowledge to specific floor plans, unit types, or units within{" "}
                      {property}.
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <LocationMultiSelect
                        kind="floorPlan"
                        selected={floorPlans}
                        onToggle={toggleLocation(setFloorPlans)}
                      />
                      <LocationMultiSelect
                        kind="unitType"
                        selected={unitTypes}
                        onToggle={toggleLocation(setUnitTypes)}
                      />
                      <LocationMultiSelect
                        kind="unit"
                        selected={units}
                        onToggle={toggleLocation(setUnits)}
                      />
                    </div>

                    {hasLocations && (
                      <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-2">
                        {floorPlans.map((v) => (
                          <LocationChip
                            key={`fp-${v}`}
                            kind="floorPlan"
                            value={v}
                            onRemove={() => toggleLocation(setFloorPlans)(v)}
                          />
                        ))}
                        {unitTypes.map((v) => (
                          <LocationChip
                            key={`ut-${v}`}
                            kind="unitType"
                            value={v}
                            onRemove={() => toggleLocation(setUnitTypes)(v)}
                          />
                        ))}
                        {units.map((v) => (
                          <LocationChip
                            key={`u-${v}`}
                            kind="unit"
                            value={v}
                            onRemove={() => toggleLocation(setUnits)(v)}
                          />
                        ))}
                      </div>
                    )}

                    {hasLocations ? (
                      <p className="flex items-start gap-1 text-[11px] text-amber-700">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        Applies only to the selected locations — not the entire property.
                      </p>
                    ) : (
                      <p className="flex items-start gap-1 text-[11px] text-amber-700">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        No specific locations selected — this knowledge applies to the entire
                        property.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label>Expires (optional)</Label>
                <Input
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  placeholder="e.g. Jul 15, 2026"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              {!prefill && (
                <Button variant="outline" onClick={() => setStep("compose")}>
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
  v2 = false,
}: {
  entry: KnowledgeEntry | null;
  onClose: () => void;
  onArchive: (id: string) => void;
  onApprove: (id: string) => void;
  onEdit: (e: KnowledgeEntry) => void;
  v2?: boolean;
}) {
  const open = !!entry;

  // V2 — right-side drawer (Staff Profile anatomy) instead of the centered dialog.
  if (v2) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="right"
          className="flex w-[75vw] flex-col gap-0 overflow-hidden p-0 sm:w-[75vw] sm:max-w-[75vw]"
        >
          {entry && (
            <EntryDetail
              entry={entry}
              onArchive={onArchive}
              onApprove={onApprove}
              onEdit={onEdit}
              onClose={onClose}
              v2
            />
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="block w-[96vw] max-w-6xl max-h-[94vh] gap-0 overflow-y-auto p-0">
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
  v2 = false,
}: {
  entry: KnowledgeEntry;
  onArchive: (id: string) => void;
  onApprove: (id: string) => void;
  onEdit: (e: KnowledgeEntry) => void;
  onClose: () => void;
  v2?: boolean;
}) {
  const meta = TYPE_META[entry.type];
  const cat = CATEGORY_META[entry.category];
  const CatIcon = cat.icon;
  const isInReview = entry.status === "in_review";

  /* Level + inheritance and Used-by-agents are rendered as variables so V2 can
   * hoist them above the (often long) Knowledge body without pushing them far
   * down the drawer. Legacy keeps them in their original positions below. */
  // Property-scoped entries must name the actual property (and, where targeted,
  // the floor plans / unit types / units) so the reader can tell exactly what
  // this knowledge governs instead of a generic "this property".
  const detailPropertyName = entry.property ?? DEFAULT_PROPERTY;
  const levelInheritanceSection = (
    <Section title="Level + inheritance" icon={Layers} v2={v2}>
      {entry.scope === "portfolio" ? (
        <p className="text-sm text-muted-foreground">
          Set by corporate. Every property inherits this; a property entry can override it.
        </p>
      ) : entry.overridesPortfolio ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{detailPropertyName}</span> overrides a portfolio default.
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
            {v2 ? (
              <div
                className="prose prose-sm mt-1 max-w-none text-sm text-amber-950/90 [&_*]:text-amber-950/90"
                dangerouslySetInnerHTML={{ __html: bodyToHtml(entry.body) }}
              />
            ) : (
              <p className="mt-1 text-sm text-amber-950/90">{entry.body}</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Added at <span className="font-medium text-foreground">{detailPropertyName}</span> only. Not inherited from corporate.
        </p>
      )}
    </Section>
  );

  const usedByAgentsSection =
    entry.agents.length > 0 ? (
      <Section title="Used by agents" icon={Bot} cube v2={v2}>
        <div className="flex flex-wrap gap-1.5">
          {entry.agents.map((a) => (
            <AgentChip key={a} agent={a} v2={v2} />
          ))}
        </div>
      </Section>
    ) : null;

  const appliesToSection =
    entry.scope === "property" ? (
      <Section title="Applies to" icon={MapPin} v2={v2}>
        {(() => {
          const at = entry.appliesTo;
          const targeted =
            at && (at.floorPlans.length || at.unitTypes.length || at.units.length);
          if (!targeted) {
            return (
              <p className="text-sm text-muted-foreground">
                All of <span className="font-medium text-foreground">{detailPropertyName}</span> — no specific floor plans, unit types, or units.
              </p>
            );
          }
          return (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Specific locations at <span className="font-medium text-foreground">{detailPropertyName}</span> — not the entire property:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {at!.floorPlans.map((v) => (
                  <LocationChipStatic key={`d-fp-${v}`} kind="floorPlan" value={v} />
                ))}
                {at!.unitTypes.map((v) => (
                  <LocationChipStatic key={`d-ut-${v}`} kind="unitType" value={v} />
                ))}
                {at!.units.map((v) => (
                  <LocationChipStatic key={`d-u-${v}`} kind="unit" value={v} />
                ))}
              </div>
            </div>
          );
        })()}
      </Section>
    ) : null;

  return (
    <>
      <div
        className={
          v2
            ? "shrink-0 border-b border-border px-6 pt-6 pb-5"
            : "border-b border-border p-5"
        }
      >
        {v2 ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="text-lg font-semibold leading-snug">
                {entry.title}
              </DialogTitle>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            {/* Badges sit below the title in V2 */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <LevelBadge scope={entry.scope} v2={v2} />
              {entry.overridesPortfolio && <OverridesBadge v2={v2} />}
              <TypeBadge type={entry.type} v2={v2} />
              <StatusBadge status={entry.status} v2={v2} />
            </div>
            {/* V2 shows only the category here (usage moved to its own section
                below); when the category just restates the type badge above
                (e.g. "General Knowledge" type + "General knowledge" category)
                it's kept sr-only so the dialog still has an accessible description. */}
            <DialogDescription
              className={cn(
                "mt-2 inline-flex flex-wrap items-center gap-1.5",
                cat.label.toLowerCase() === meta.label.toLowerCase() && "sr-only"
              )}
            >
              <CatIcon className="h-3.5 w-3.5" />
              <span>{cat.label}</span>
            </DialogDescription>
            <div className="mt-2">
              <SourceOfTruthHint />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <LevelBadge scope={entry.scope} v2={v2} />
                {entry.overridesPortfolio && <OverridesBadge v2={v2} />}
                <TypeBadge type={entry.type} v2={v2} />
                <StatusBadge status={entry.status} v2={v2} />
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
          </>
        )}

        {isInReview && (
          v2 ? (
            <div
              role="status"
              className="mt-4 flex items-center gap-3 rounded-xl border border-status-warning-border bg-status-warning px-3 py-2.5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[hsl(42_90%_48%)] bg-[hsl(44_92%_80%)] text-zinc-700 dark:border-[hsl(43_80%_42%)] dark:bg-[hsl(43_70%_22%)] dark:text-zinc-200">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Pending your review</p>
                <p className="mt-0.5 text-xs leading-snug text-status-warning-foreground/90">
                  The AI won&apos;t draw on this entry until it&apos;s approved.
                </p>
              </div>
            </div>
          ) : (
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
          )
        )}
      </div>

      <div
        className={
          v2
            ? "flex-1 space-y-7 overflow-y-auto px-6 py-5 scrollbar-hover"
            : "space-y-5 p-5"
        }
      >
        {/* V2 hoists Level + inheritance, Used-by-agents and Applies-to above the Knowledge body */}
        {v2 && levelInheritanceSection}
        {v2 && usedByAgentsSection}
        {v2 && appliesToSection}

        {/* Body */}
        <Section
          title={entry.type === "suppression" ? "What's suppressed" : "Knowledge"}
          icon={entry.type === "suppression" ? ShieldOff : BookOpen}
          v2={v2}
        >
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            {v2 ? (
              <div
                className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: bodyToHtml(entry.body) }}
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{entry.body}</p>
            )}
          </div>
        </Section>

        {/* Level + inheritance (legacy position) */}
        {!v2 && levelInheritanceSection}

        {/* Clarification tie-back */}
        {entry.entrataSetting && (
          <Section title="Overrides a PMS setting" icon={Settings2} v2={v2}>
            <div className="rounded-md border border-purple-200 bg-purple-50/50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-900">
                {entry.entrataSetting.name}
              </p>
              <p className="mt-1 text-sm text-purple-950/90">
                PMS value: <span className="font-semibold">{entry.entrataSetting.value}</span>
              </p>
              <p className="mt-2 text-xs text-purple-900/80">
                When prospects ask about this, the AI prefers this entry over the raw PMS value.
              </p>
            </div>
          </Section>
        )}

        {/* Suppression details */}
        {entry.type === "suppression" && (
          <>
            {entry.suppressReason && (
              <Section title="Why suppress (internal)" icon={ShieldAlert} v2={v2}>
                <div className="rounded-md border border-red-200 bg-red-50/50 p-3 text-sm text-red-950/90">
                  {entry.suppressReason}
                </div>
              </Section>
            )}
            {entry.redirectMessage && (
              <Section title="The AI says instead (prospect-facing)" icon={MessageSquare} v2={v2}>
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

        {/* Procedure details — retained for entries migrated from the old
            "procedure" type that still carry structured triggers/steps. */}
        {(!!entry.triggers?.length || !!entry.steps?.length || !!entry.tag) && (
          <Section title="Procedure" icon={ListChecks} v2={v2}>
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
          <Section title="Expires" icon={Clock} v2={v2}>
            <p className="inline-flex items-center gap-1.5 text-sm text-orange-800">
              <Calendar className="h-3.5 w-3.5" />
              {entry.expiresAt}
            </p>
          </Section>
        )}

        {/* Used by agents (legacy position) */}
        {!v2 && usedByAgentsSection}

        {/* Location targeting (legacy position) */}
        {!v2 && appliesToSection}

        {/* Version history */}
        <Section title="Version history" icon={History} v2={v2}>
          <VersionHistory
            history={entry.history}
            currentTitle={entry.title}
            currentBody={entry.body}
            v2={v2}
          />
        </Section>

        {/* Usage — V2 surfaces the usage stat as its own section (it lived in the
            header description for legacy). Temporarily hidden per request; flip
            this back to `v2 &&` to restore it. */}
        {false && v2 && (
          <Section title="Usage" icon={BarChart3} v2={v2}>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">
                {entry.usageCount}×
              </span>{" "}
              {meta.usageVerb} by AI agents in total.
            </p>
          </Section>
        )}

        {/* Source / owner footnote */}
        <p className="text-[11px] text-muted-foreground">
          Source: {SOURCE_LABEL[entry.source]} · Owner: {entry.owner} · Last updated {entry.updatedAt}
        </p>
      </div>

      <div
        className={
          v2
            ? "shrink-0 flex justify-end gap-2 border-t border-border bg-background px-6 py-4"
            : "sticky bottom-0 flex justify-end gap-2 border-t border-border bg-background/95 p-4 backdrop-blur"
        }
      >
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Archive className="mr-1.5 h-3.5 w-3.5" />
              {entry.type === "suppression" ? "Lift guardrail" : "Archive"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {entry.type === "suppression" ? "Lift this guardrail?" : "Archive this entry?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {entry.type === "suppression"
                  ? "The AI will be allowed to discuss this topic again, and this guardrail will be removed from the knowledge list. You can find it later under the Archived filter."
                  : "This entry will be removed from the knowledge list and the AI will stop using it. You can find it later under the Archived filter."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onArchive(entry.id)}>
                {entry.type === "suppression" ? "Lift guardrail" : "Archive"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button variant="outline" size="sm" onClick={() => onEdit(entry)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
        {isInReview && (
          <Button
            size="sm"
            className={cn(!v2 && "bg-emerald-600 text-white hover:bg-emerald-700")}
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

/**
 * Canonical V2 section glyph. In this knowledge drawer the section bodies sit on
 * a white surface, so the bubbles take a gray fill (`bg-muted`) rather than the
 * `bg-background` used in member-detail-sheet-v2. Pass `cube` to render the ELI
 * cube (used for the AI-agent section) instead of a Lucide icon.
 */
function SectionIconBubble({ icon: Icon, cube = false }: { icon?: LucideIcon; cube?: boolean }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
      {cube ? (
        // eslint-disable-next-line @next/next/no-img-element -- static public asset
        <img src="/eli-cube.svg" alt="" width={16} height={16} className="h-4 w-4 shrink-0" />
      ) : (
        Icon && <Icon className="h-4 w-4 text-foreground" />
      )}
    </span>
  );
}

function Section({
  title,
  icon,
  cube = false,
  v2 = false,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  cube?: boolean;
  v2?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      {v2 ? (
        <div className="flex items-center gap-2.5">
          {(cube || icon) && <SectionIconBubble icon={icon} cube={cube} />}
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        </div>
      ) : (
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h4>
      )}
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
  v2 = false,
}: {
  version: KnowledgeVersion | null;
  isCurrent: boolean;
  onClose: () => void;
  v2?: boolean;
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
                      {v2 ? (
                        <div
                          className="prose prose-sm mt-1 max-w-none text-sm leading-relaxed text-foreground dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: bodyToHtml(version.body) }}
                        />
                      ) : (
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {version.body}
                        </p>
                      )}
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
  v2 = false,
}: {
  history: KnowledgeVersion[];
  currentTitle: string;
  currentBody: string;
  v2?: boolean;
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
        v2={v2}
      />
    </div>
  );
}
