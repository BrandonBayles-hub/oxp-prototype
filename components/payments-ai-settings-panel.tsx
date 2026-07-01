"use client"

/**
 * Payments AI — per-property settings panel.
 *
 * Renders inside the agent-roster slide-out in the "Payments AI Settings"
 * left-nav tab (replaces the PaymentsPage flyout for the agent-settings tab).
 *
 * Scope: property-level. This view is tuned for an L4 autonomous agent —
 * scenario selection lives inside each settings card, Escalation only owns
 * the categories that genuinely require a human, and Workflow guardrails
 * own the rules that keep the agent inside its rails (auto-progression,
 * plan policy, reliability / loop / drift / per-resident ceilings).
 */

import React, { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertTriangle,
  Bot,
  Calendar,
  CalendarRange,
  Clock,
  ExternalLink,
  FileWarning,
  Gavel,
  Info,
  Lock,
  MessageSquare,
  Receipt,
  ShieldCheck,
  UserMinus,
  Users,
} from "lucide-react"
import { BalanceThresholdInput } from "@/components/payments-ai/balance-threshold-input"
import { LifecycleGlossary } from "@/components/payments-ai/lifecycle-glossary"
import { ResolvedPropertySettingsStrip } from "@/components/payments-ai/resolved-property-settings-strip"
import { ScoringPreviewCard } from "@/components/payments-ai/scoring-preview-card"
import { FACTOR_SCOPE_HINTS } from "@/lib/payments-ai-eligibility"
import {
  resolvePropertySettings,
  toPropertyContext,
  type ResolvedPropertySettings,
} from "@/lib/payments-ai-property-settings"
import {
  fixedThreshold,
  type BalanceThreshold,
} from "@/lib/payments-ai-thresholds"

/* ══════════════════════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════════════════════ */

type ScenarioId = "initial" | "late" | "legal" | "pastResident"
type PresetId = "minimum" | "standard" | "high-touch" | "compliance"
type CategoryId =
  | "hostile"
  | "askHuman"
  | "unanswered"
  | "hardship"
  | "legal"
  | "disputes"
  | "operational"
type OffsetAnchor = "rent_due" | "late_fees" | "eviction" | "move_out"
type OffsetDir =
  | "before_due"
  | "after_due"
  | "on_charges_posted"
  | "before_fees"
  | "after_fees"
  | "on_late_fees"
  | "before_eviction"
  | "after_eviction"
  | "on_notice"
  | "after_charges_due"
  | "day_of_month"
  | "after_moveout"
  | "after_fmo"
type ChannelPref = "sms_only" | "email_only" | "sms_email"
type Recipients = "primary" | "primary_guarantors" | "guarantors" | "all_responsible"
type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"
type RouteTargetType = "person" | "speciality" | "group"
type ToneId = "friendly" | "professional" | "student-casual"
type DelinquencyMode = "defer" | "nudge"
type EligibilityAction = "continue" | "skip" | "route_human"
type ScoreBand = "good" | "moderate" | "poor"

type PropertyContextView = ReturnType<typeof toPropertyContext>

function propertyContextFromResolved(resolved: ResolvedPropertySettings): PropertyContextView {
  return toPropertyContext(resolved)
}

const SCORE_BANDS: { id: ScoreBand; label: string; description: string }[] = [
  { id: "good", label: "Good standing", description: "Residents with a strong payment history and few risk signals." },
  { id: "moderate", label: "Moderate risk", description: "Some late payments or minor issues; outreach may be tuned down." },
  { id: "poor", label: "High risk", description: "Chronic delinquency, returns, or violations; often skip nudges and let legal notices run." },
]

const ELIGIBILITY_ACTIONS: { value: EligibilityAction; label: string }[] = [
  { value: "continue", label: "Continue outreach" },
  { value: "skip", label: "Skip outreach" },
  { value: "route_human", label: "Route to human" },
]

type CategoryFlags = Record<CategoryId, boolean>
type DayFlags = Record<DayKey, boolean>

interface CadenceConfig {
  badge: { label: string; cls: string }
  offsetValue: number
  offsetDir: OffsetDir
  offsetAnchor: OffsetAnchor
  repeatOn: boolean
  repeatInterval: number
  maxAttempts: number
  channel: ChannelPref
  recipients: Recipients
  minOutstandingBalance: BalanceThreshold
  quietStart: number
  quietEnd: number
  days: DayFlags
  repeatHelp: string
  pauseOnReply: boolean
}

interface EscalationPreset {
  label: string
  badgeCls: string
  categories: CategoryFlags
  confidence: number
  help: string
}

/* ══════════════════════════════════════════════════════════════════════════
   Static config
   ══════════════════════════════════════════════════════════════════════════ */

const TONE_OPTIONS: { value: ToneId; label: string; helper: string }[] = [
  { value: "friendly", label: "Friendly", helper: "Warm and conversational" },
  { value: "professional", label: "Professional", helper: "Polished and businesslike" },
  { value: "student-casual", label: "Casual", helper: "Approachable and on-trend" },
]

const SCENARIOS: {
  id: ScenarioId
  title: string
  shortLabel: string
  helper: string
  outOfScope?: boolean
  outOfScopeReason?: string
}[] = [
  { id: "initial", title: "Rent Reminder", shortLabel: "Rent Reminder", helper: "Heads-up before rent is due." },
  {
    id: "late",
    title: "Delinquency",
    shortLabel: "Delinquency",
    helper: "Legal notices follow Company Settings; Payments AI can add a separate collections nudge.",
  },
  {
    id: "legal",
    title: "Pre-Collections",
    shortLabel: "Pre-Collections",
    helper: "Severely delinquent; pay-or-quit / eviction imminent.",
  },
  {
    id: "pastResident",
    title: "Past Resident Payment (PRP)",
    shortLabel: "PRP",
    helper: "Post move-out balance recovery — targets the window before collections agency handoff.",
  },
]

/** Default outreach copy per scenario. `{name}`, `{balance}`, and `{link}` are
 *  merge tags the agent fills in at send time. */
const SCENARIO_MESSAGES: Record<ScenarioId, { intro: string; repeat: string }> = {
  initial: {
    intro: "Hi {name}, this is a friendly reminder that your rent of {balance} is due soon. You can pay anytime here: {link}",
    repeat: "Hi {name}, just a quick reminder that your rent of {balance} is due. Pay here when you're ready: {link}",
  },
  late: {
    intro: "Hi {name}, your rent balance of {balance} is now past due and late fees may apply. Please pay or set up a plan here: {link}",
    repeat: "Hi {name}, your balance of {balance} is still outstanding. Avoid further fees by paying or arranging a plan here: {link}",
  },
  legal: {
    intro: "Hi {name}, your account ({balance}) has reached pre-collections. Please resolve this right away to avoid further action: {link}",
    repeat: "Hi {name}, your past-due balance of {balance} remains unresolved. Contact us or pay now to stop escalation: {link}",
  },
  pastResident: {
    intro: "Hi {name}, our records show an outstanding balance of {balance} on your former residence. You can pay it here: {link}",
    repeat: "Hi {name}, your remaining balance of {balance} is still due. Settle it anytime here to avoid collections: {link}",
  },
}

const ALL_DAYS_FALSE_SUN: DayFlags = { sun: false, mon: true, tue: true, wed: true, thu: true, fri: true, sat: true }
const WEEKDAYS_ONLY: DayFlags = { sun: false, mon: true, tue: true, wed: true, thu: true, fri: true, sat: false }

const SCENARIO_CADENCE: Record<ScenarioId, CadenceConfig> = {
  initial: {
    badge: { label: "One-time", cls: "bg-sky-100 text-sky-800" },
    offsetValue: 3,
    offsetDir: "before_due",
    offsetAnchor: "rent_due",
    repeatOn: false,
    repeatInterval: 7,
    maxAttempts: 1,
    channel: "sms_only",
    recipients: "primary",
    minOutstandingBalance: fixedThreshold(0),
    quietStart: 9,
    quietEnd: 20,
    days: ALL_DAYS_FALSE_SUN,
    repeatHelp: "One message only.",
    pauseOnReply: false,
  },
  late: {
    badge: { label: "Recurring · 3-day", cls: "bg-amber-100 text-amber-800" },
    offsetValue: 1,
    offsetDir: "after_fees",
    offsetAnchor: "late_fees",
    repeatOn: true,
    repeatInterval: 3,
    maxAttempts: 4,
    channel: "sms_only",
    recipients: "primary_guarantors",
    minOutstandingBalance: fixedThreshold(50),
    quietStart: 9,
    quietEnd: 20,
    days: ALL_DAYS_FALSE_SUN,
    repeatHelp: "Repeats every 3 days until paid, plan accepted, or max attempts reached.",
    pauseOnReply: false,
  },
  legal: {
    badge: { label: "Notice · 5-day", cls: "bg-rose-100 text-rose-800" },
    offsetValue: 16,
    offsetDir: "after_charges_due",
    offsetAnchor: "eviction",
    repeatOn: true,
    repeatInterval: 5,
    maxAttempts: 3,
    channel: "email_only",
    recipients: "all_responsible",
    minOutstandingBalance: fixedThreshold(250),
    quietStart: 10,
    quietEnd: 19,
    days: WEEKDAYS_ONLY,
    repeatHelp:
      "Repeats every 5 days. Lower frequency than late warnings; high contact at this stage looks like harassment in court.",
    pauseOnReply: true,
  },
  pastResident: {
    badge: { label: "Recurring · 7-day", cls: "bg-rose-100 text-rose-800" },
    offsetValue: 5,
    offsetDir: "after_moveout",
    offsetAnchor: "move_out",
    repeatOn: true,
    repeatInterval: 7,
    maxAttempts: 6,
    channel: "sms_email",
    recipients: "all_responsible",
    minOutstandingBalance: fixedThreshold(100),
    quietStart: 9,
    quietEnd: 20,
    days: ALL_DAYS_FALSE_SUN,
    repeatHelp:
      "Repeats every 7 days. Past residents disengage fast; multiple touches are needed before referral to collections.",
    pauseOnReply: true,
  },
}

const SCENARIO_TO_PRESET: Record<ScenarioId, PresetId> = {
  initial: "minimum",
  late: "standard",
  legal: "compliance",
  pastResident: "high-touch",
}

const OFFSET_ANCHORS: Record<OffsetAnchor, { options: { value: OffsetDir; label: string }[]; help: string }> = {
  rent_due: {
    options: [
      { value: "before_due", label: "days before rent due" },
      { value: "after_due", label: "days after rent due" },
      { value: "on_charges_posted", label: "when charges are posted" },
    ],
    help: "When the first message fires, relative to the rent due date. Choose “when charges are posted” to fire the moment the resident’s charges hit the ledger.",
  },
  late_fees: {
    options: [
      { value: "before_fees", label: "days before late fees post" },
      { value: "after_fees", label: "days after late fees post" },
      { value: "on_late_fees", label: "when late fees post" },
    ],
    help: "When the first message fires, relative to when late fees post. Choose “when late fees post” to fire the moment late fees hit the ledger.",
  },
  eviction: {
    options: [
      { value: "after_charges_due", label: "days after charges are due" },
      { value: "day_of_month", label: "day of the month" },
    ],
    help: "When the first message fires for Pre-Collections. “Days after charges are due” counts from the rent due date; “day of the month” fires on a fixed calendar day.",
  },
  move_out: {
    options: [
      { value: "after_moveout", label: "days after move-out" },
      { value: "after_fmo", label: "days after FMO" },
    ],
    help: "When the first message fires, relative to the resident's move-out. “Days after move-out” counts from the scheduled move-out date; “days after FMO” counts from the final move-out (when the unit is fully vacated and keys returned).",
  },
}

const OFFSET_PHRASE: Record<OffsetDir, string> = {
  before_due: "days before due",
  after_due: "days after due",
  on_charges_posted: "when charges are posted",
  before_fees: "days before late fees post",
  after_fees: "days after late fees post",
  on_late_fees: "when late fees post",
  before_eviction: "days before pre-collections",
  after_eviction: "days after pre-collections",
  on_notice: "when put on notice",
  after_charges_due: "days after charges are due",
  day_of_month: "day of the month",
  after_moveout: "days after move-out",
  after_fmo: "days after FMO",
}

/* ══════════════════════════════════════════════════════════════════════════
   Journey model — projects each scenario onto a single 31-day billing cycle so
   the cadence can be visualized as one timeline instead of four separate cards.

   Anchor days are fixed reference points on the cycle (rent due = day 1, late
   fees = day 6, pre-collections / notice = day 16, eviction = day 31). Each
   scenario's first message is computed from its offset relative to its anchor,
   then repeats are projected forward until the scenario's own cap or the next
   journey step — whichever comes first.
   ══════════════════════════════════════════════════════════════════════════ */

const CYCLE_DAYS = 31

/** Fixed anchor days on the billing cycle that scenarios are measured against.
 *  Charges post a few days before rent is actually due, so they are distinct
 *  events on the timeline. */
const JOURNEY_ANCHORS = {
  chargesPosted: 1,
  rentDue: 3,
  lateFees: 6,
  notice: 16,
  eviction: 31,
} as const

/** Ordered journey steps. `start` is where the scenario's outreach window opens;
 *  the next step's `start` is the hard ceiling its repeats may not cross. */
const JOURNEY_STEPS: { id: ScenarioId; start: number; ceiling: number }[] = [
  { id: "initial", start: JOURNEY_ANCHORS.rentDue, ceiling: JOURNEY_ANCHORS.lateFees },
  { id: "late", start: JOURNEY_ANCHORS.lateFees, ceiling: JOURNEY_ANCHORS.notice },
  { id: "legal", start: JOURNEY_ANCHORS.notice, ceiling: JOURNEY_ANCHORS.eviction },
  // Past-resident lives on a separate post-move-out track, not the rent cycle.
]

/** Anchor day for a given offset direction. */
function anchorDayForDir(dir: OffsetDir): number {
  switch (dir) {
    case "on_charges_posted":
      return JOURNEY_ANCHORS.chargesPosted
    case "before_due":
    case "after_due":
      return JOURNEY_ANCHORS.rentDue
    case "before_fees":
    case "after_fees":
    case "on_late_fees":
      return JOURNEY_ANCHORS.lateFees
    case "before_eviction":
    case "after_eviction":
    case "on_notice":
      return JOURNEY_ANCHORS.eviction
    case "after_charges_due":
    case "day_of_month":
      return JOURNEY_ANCHORS.rentDue
    case "after_moveout":
    case "after_fmo":
      return JOURNEY_ANCHORS.rentDue
    default:
      return JOURNEY_ANCHORS.rentDue
  }
}

/** Day the first message fires, projected onto the 31-day cycle. */
function firstMessageDay(s: Pick<ScenarioSettings, "offsetValue" | "offsetDir">): number {
  const anchor = anchorDayForDir(s.offsetDir)
  switch (s.offsetDir) {
    case "before_due":
    case "before_fees":
    case "before_eviction":
      return clampDay(anchor - s.offsetValue)
    case "after_due":
    case "after_fees":
    case "after_eviction":
    case "after_charges_due":
    case "after_moveout":
    case "after_fmo":
      return clampDay(anchor + s.offsetValue)
    case "day_of_month":
      return clampDay(s.offsetValue)
    case "on_charges_posted":
    case "on_late_fees":
    case "on_notice":
      return anchor
    default:
      return anchor
  }
}

function clampDay(d: number): number {
  return Math.max(1, Math.min(CYCLE_DAYS, Math.round(d)))
}

/** The next journey step's start day — the ceiling this scenario can't repeat past. */
function nextStepStart(scenario: ScenarioId): number | null {
  const idx = JOURNEY_STEPS.findIndex((s) => s.id === scenario)
  if (idx === -1) return null
  const next = JOURNEY_STEPS[idx + 1]
  return next ? next.start : null
}

/**
 * Project a scenario's send days onto the cycle, capped by maxAttempts AND by
 * the next journey step's start day (repeats can't bleed into the next stage).
 */
function projectSendDays(s: Pick<ScenarioSettings, "offsetValue" | "offsetDir" | "repeatOn" | "repeatInterval" | "maxAttempts">, scenario: ScenarioId): number[] {
  const first = firstMessageDay(s)
  const days = [first]
  if (s.repeatOn) {
    const ceil = nextStepStart(scenario)
    const hardCeil = ceil != null ? ceil - 1 : CYCLE_DAYS
    let next = first + s.repeatInterval
    while (days.length < s.maxAttempts && next <= hardCeil) {
      days.push(next)
      next += s.repeatInterval
    }
  }
  return days
}

const RECIPIENTS_HELP: Record<Recipients, string> = {
  primary: "Only the primary lease holder receives this scenario.",
  primary_guarantors: "Both the primary lease holder and any guarantors are looped in.",
  guarantors: "Sent only to guarantors; useful for late-stage collections.",
  all_responsible: "Sent to every party on the lease: primary residents and guarantors.",
}

const CATEGORIES: { id: CategoryId; label: string; description: string }[] = [
  {
    id: "hostile",
    label: "Hostile sentiment",
    description: "Hand off if the resident is profane, escalated, or repeatedly frustrated.",
  },
  {
    id: "askHuman",
    label: "Asks for a human",
    description: "Hand off the moment the resident explicitly asks to speak with a person.",
  },
  {
    id: "unanswered",
    label: "Agent can't answer the question",
    description: "Hand off when the agent's confidence in its draft reply falls below this threshold.",
  },
  {
    id: "hardship",
    label: "Hardship & safety signals",
    description: "Job loss, illness, abuse, military deployment, habitability claims.",
  },
  {
    id: "legal",
    label: "Legal & compliance mentions",
    description: "Attorney, court, bankruptcy, SCRA, VAWA, fair-housing accommodation.",
  },
  {
    id: "disputes",
    label: "Complex payment disputes",
    description:
      "Contested balances, structural disputes, or claims the agent can't resolve from the ledger. Simple payment lookups stay in-agent.",
  },
  {
    id: "operational",
    label: "Operational issues",
    description: "Wrong contact, moved out, lease ended, multiple ledger matches.",
  },
]

/**
 * Routing targets. A trigger can route to one of three target types:
 *   - person: a named individual on the property or org chart
 *   - speciality: a role / skill (anyone with that title)
 *   - group: a team or pool of people
 */
const ROUTING_PERSONS: { id: string; label: string }[] = [
  { id: "jane-smith", label: "Jane Smith, Property Manager" },
  { id: "alex-chen", label: "Alex Chen, Regional Manager" },
  { id: "maria-lopez", label: "Maria Lopez, Resident Services Lead" },
  { id: "david-park", label: "David Park, Accounting Lead" },
  { id: "sarah-johnson", label: "Sarah Johnson, Legal Counsel" },
  { id: "michael-torres", label: "Michael Torres, Tier-2 Support Lead" },
]

const ROUTING_SPECIALITIES: { id: string; label: string }[] = [
  { id: "property-manager", label: "Property Manager" },
  { id: "regional-manager", label: "Regional Manager" },
  { id: "legal-counsel", label: "Legal Counsel" },
  { id: "accountant", label: "Accountant" },
  { id: "leasing-specialist", label: "Leasing Specialist" },
  { id: "compliance-officer", label: "Compliance Officer" },
]

const ROUTING_GROUPS: { id: string; label: string }[] = [
  { id: "property-team", label: "Property Team" },
  { id: "resident-services", label: "Resident Services" },
  { id: "collections-team", label: "Collections Team" },
  { id: "accounting-team", label: "Accounting Team" },
  { id: "tier-2-support", label: "Tier-2 Support" },
  { id: "legal-team", label: "Legal Team" },
  { id: "leasing-team", label: "Leasing Team" },
]

const ROUTING_OPTIONS: Record<RouteTargetType, { id: string; label: string }[]> = {
  person: ROUTING_PERSONS,
  speciality: ROUTING_SPECIALITIES,
  group: ROUTING_GROUPS,
}

const ROUTING_TYPE_LABEL: Record<RouteTargetType, string> = {
  person: "Person",
  speciality: "Speciality",
  group: "Group",
}

const CAT_ROUTING_DEFAULTS: Record<CategoryId, { targetType: RouteTargetType; targetId: string; slaHours: number }> = {
  hostile: { targetType: "speciality", targetId: "property-manager", slaHours: 1 },
  askHuman: { targetType: "group", targetId: "property-team", slaHours: 1 },
  unanswered: { targetType: "group", targetId: "tier-2-support", slaHours: 2 },
  hardship: { targetType: "group", targetId: "resident-services", slaHours: 4 },
  legal: { targetType: "speciality", targetId: "legal-counsel", slaHours: 1 },
  disputes: { targetType: "group", targetId: "accounting-team", slaHours: 8 },
  operational: { targetType: "speciality", targetId: "property-manager", slaHours: 8 },
}

const ESCALATION_PRESETS: Record<PresetId, EscalationPreset> = {
  minimum: {
    label: "Minimum floor",
    badgeCls: "bg-zinc-100 text-zinc-700",
    categories: {
      hostile: true, askHuman: true, unanswered: false,
      hardship: true, legal: true, disputes: false, operational: false,
    },
    confidence: 70,
    help: "Only the legally and ethically required hand-offs; the lowest setting an autonomous agent should ever run with.",
  },
  standard: {
    label: "Standard collections",
    badgeCls: "bg-sky-100 text-sky-800",
    categories: {
      hostile: true, askHuman: true, unanswered: true,
      hardship: false, legal: false, disputes: false, operational: true,
    },
    confidence: 70,
    help: "Hostility, hand-off requests, low-confidence replies, and operational ambiguity escalate to the property team.",
  },
  "high-touch": {
    label: "High-touch / hardship-aware",
    badgeCls: "bg-amber-100 text-amber-800",
    categories: {
      hostile: true, askHuman: true, unanswered: true,
      hardship: true, legal: true, disputes: true, operational: true,
    },
    confidence: 60,
    help: "Lower thresholds across all categories; best for hardship-prone portfolios.",
  },
  compliance: {
    label: "Compliance-heavy",
    badgeCls: "bg-emerald-100 text-emerald-800",
    categories: {
      hostile: true, askHuman: true, unanswered: true,
      hardship: true, legal: true, disputes: true, operational: true,
    },
    confidence: 75,
    help: "All triggers on with stricter legal routing; best for risk-sensitive operators.",
  },
}

const DAY_LABELS: { id: DayKey; label: string }[] = [
  { id: "sun", label: "Sun" }, { id: "mon", label: "Mon" }, { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" }, { id: "thu", label: "Thu" }, { id: "fri", label: "Fri" }, { id: "sat", label: "Sat" },
]

const QUIET_HOUR_OPTIONS: { value: number; label: string }[] = [
  { value: 6, label: "6:00 AM" }, { value: 7, label: "7:00 AM" }, { value: 8, label: "8:00 AM" },
  { value: 9, label: "9:00 AM" }, { value: 10, label: "10:00 AM" }, { value: 11, label: "11:00 AM" },
  { value: 12, label: "12:00 PM" }, { value: 13, label: "1:00 PM" }, { value: 17, label: "5:00 PM" },
  { value: 18, label: "6:00 PM" }, { value: 19, label: "7:00 PM" }, { value: 20, label: "8:00 PM" },
  { value: 21, label: "9:00 PM" }, { value: 22, label: "10:00 PM" },
]

/* ══════════════════════════════════════════════════════════════════════════
   State
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Settings owned by a single scenario. Each of the four scenarios keeps an
 * independent copy in `PanelState.scenarioStore`. The flat fields on PanelState
 * mirror the *currently selected* scenario so the existing card components can
 * keep reading `state.<field>` unchanged.
 */
interface ScenarioSettings {
  // Whether this scenario is active. When off, the agent runs no outreach,
  // escalation, or cadence for this scenario at all.
  enabled: boolean
  // Agent identity — per-scenario tone
  agentPersonaTone: ToneId
  // Escalation
  preset: PresetId | "custom"
  categories: CategoryFlags
  confidence: number
  routing: Record<CategoryId, { targetType: RouteTargetType; targetId: string; slaHours: number }>
  // Cadence
  offsetValue: number
  offsetDir: OffsetDir
  offsetAnchor: OffsetAnchor
  repeatOn: boolean
  repeatInterval: number
  maxAttempts: number
  channel: ChannelPref
  recipients: Recipients
  minOutstandingBalance: BalanceThreshold
  quietStart: number
  quietEnd: number
  days: DayFlags
  // When false, this scenario inherits the property-wide delivery window
  // (channel + quiet hours + days). When true, it uses its own values above.
  deliveryOverride: boolean
  // Customizable outreach copy for this scenario.
  introMessage: string
  repeatMessage: string
  pauseOnReply: boolean
  pauseOnPreCollections: boolean
  pauseOnEviction: boolean
  // Stop outreach once the resident commits to an expected payment date.
  pauseOnExpectedPayDate: boolean
  // Delinquency-only: defer to property legal notices vs run a Payments AI nudge.
  delinquencyMode: DelinquencyMode
  // Delinquency-only: small-balance reminder (balances under max, above floor).
  smallBalanceReminderOn: boolean
  smallBalanceMax: BalanceThreshold
  smallBalanceFloor: BalanceThreshold
}

/** Keys on PanelState that are scenario-scoped (mirrored to/from the store). */
const SCENARIO_SCOPED_KEYS: (keyof ScenarioSettings)[] = [
  "enabled",
  "agentPersonaTone",
  "preset",
  "categories",
  "confidence",
  "routing",
  "offsetValue",
  "offsetDir",
  "offsetAnchor",
  "repeatOn",
  "repeatInterval",
  "maxAttempts",
  "channel",
  "recipients",
  "minOutstandingBalance",
  "quietStart",
  "quietEnd",
  "days",
  "deliveryOverride",
  "introMessage",
  "repeatMessage",
  "pauseOnReply",
  "pauseOnPreCollections",
  "pauseOnEviction",
  "pauseOnExpectedPayDate",
  "delinquencyMode",
  "smallBalanceReminderOn",
  "smallBalanceMax",
  "smallBalanceFloor",
]

interface PanelState extends ScenarioSettings {
  scenario: ScenarioId
  // Agent identity (property-wide branding)
  agentDisplayName: string
  // Per-scenario settings store — source of truth for each scenario.
  scenarioStore: Record<ScenarioId, ScenarioSettings>
  // Property-wide delivery window defaults. Scenarios inherit these unless
  // they turn on their own per-scenario override (deliveryOverride).
  defaultChannel: ChannelPref
  defaultQuietStart: number
  defaultQuietEnd: number
  defaultDays: DayFlags
  // When false, messages that land on a holiday/blocked day are pushed to the
  // next available business day instead of being sent on the holiday.
  defaultSendOnHolidays: boolean
  // Repayment agreements — property-wide guardrails for agent-negotiated plans
  repaymentOfferEnabled: boolean
  repaymentRequireGoodStanding: boolean
  repaymentMinBalance: BalanceThreshold
  repaymentMaxBalance: BalanceThreshold
  repaymentMinDownPercent: number
  planMaxMonthsAutomated: number
  planRequireApprovalAmount: number
  planRequireApprovalSecondInYear: boolean
  // Resident eligibility scoring — property-wide factors + per-scenario rules
  eligibilityEnabled: boolean
  eligibilityFactors: {
    latePayments: { enabled: boolean; weight: number }
    returnedPayments: { enabled: boolean; weight: number }
    chargebacks: { enabled: boolean; weight: number }
    violations: { enabled: boolean; weight: number }
    complaints: { enabled: boolean; weight: number }
  }
  eligibilityThresholdModerate: number
  eligibilityThresholdPoor: number
  eligibilityRules: Record<ScenarioId, Record<ScoreBand, EligibilityAction>>
  // Context-aware outreach — payment history + conversation signals (property-wide)
  contextAwareOutreachEnabled: boolean
  usePaymentHistoryContext: boolean
  useConversationContext: boolean
  useStaffManagerThreads: boolean
  usePaymentsAIThreads: boolean
  deferOnCommittedPayDate: boolean
  committedPayDateFollowUpDays: number
  committedPayDateMaxDeferDays: number
  committedPayDateEscalateBeyondMax: boolean
  respectTypicalPayDay: boolean
  typicalPayDayMinHistoryMonths: number
  onTimePayerGraceEnabled: boolean
  onTimePayerGraceDays: number
  onTimePayerMinRate: number
  // Workflow guardrails — Reliability guards (property-wide)
  toolFailureCap: number
  loopGuardCount: number
  // Workflow guardrails — Autonomy ceilings (property-wide)
  feeWaiverAutoApproveCap: number
  driftPercentThreshold: number
  shareFlexAvailability: boolean
  acceptOneTimePayments: boolean
  setupRecurringPayments: boolean
}

function makeRoutingDefaults(): PanelState["routing"] {
  const out = {} as PanelState["routing"]
  ;(Object.keys(CAT_ROUTING_DEFAULTS) as CategoryId[]).forEach((cat) => {
    const d = CAT_ROUTING_DEFAULTS[cat]
    out[cat] = { targetType: d.targetType, targetId: d.targetId, slaHours: d.slaHours }
  })
  return out
}

function makeEligibilityRulesDefault(): Record<ScenarioId, Record<ScoreBand, EligibilityAction>> {
  return {
    initial: { good: "skip", moderate: "continue", poor: "skip" },
    late: { good: "continue", moderate: "continue", poor: "skip" },
    legal: { good: "skip", moderate: "skip", poor: "skip" },
    pastResident: { good: "continue", moderate: "route_human", poor: "skip" },
  }
}

/** Build the default scenario-scoped settings for a single scenario. */
function makeScenarioSettings(scenario: ScenarioId): ScenarioSettings {
  const c = SCENARIO_CADENCE[scenario]
  const presetId = SCENARIO_TO_PRESET[scenario]
  const p = ESCALATION_PRESETS[presetId]
  const meta = SCENARIOS.find((s) => s.id === scenario)
  return {
    enabled: !meta?.outOfScope,
    agentPersonaTone: "professional",
    preset: presetId,
    categories: { ...p.categories },
    confidence: p.confidence,
    routing: makeRoutingDefaults(),
    offsetValue: c.offsetValue,
    offsetDir: c.offsetDir,
    offsetAnchor: c.offsetAnchor,
    repeatOn: c.repeatOn,
    repeatInterval: c.repeatInterval,
    maxAttempts: c.maxAttempts,
    channel: c.channel,
    recipients: c.recipients,
    minOutstandingBalance: c.minOutstandingBalance,
    quietStart: c.quietStart,
    quietEnd: c.quietEnd,
    days: { ...c.days },
    // Inherit the property-wide delivery window by default; scenarios opt into
    // their own channel / quiet hours / days only when they truly differ.
    deliveryOverride: false,
    introMessage: SCENARIO_MESSAGES[scenario].intro,
    repeatMessage: SCENARIO_MESSAGES[scenario].repeat,
    pauseOnReply: c.pauseOnReply,
    // Default: a scenario pauses once the resident progresses to a later stage.
    // Pre-Collections itself is already at that stage, so it only pauses on eviction.
    pauseOnPreCollections: scenario === "initial" || scenario === "late",
    pauseOnEviction: scenario === "initial" || scenario === "late" || scenario === "legal",
    // On by default: if a resident commits to a pay date, hold further outreach.
    pauseOnExpectedPayDate: true,
    delinquencyMode: "nudge",
    smallBalanceReminderOn: scenario === "late",
    smallBalanceMax: fixedThreshold(100),
    smallBalanceFloor: fixedThreshold(10),
  }
}

/** Pull the scenario-scoped fields out of the flat working state. */
function extractScenarioSettings(s: PanelState): ScenarioSettings {
  const out = {} as ScenarioSettings
  SCENARIO_SCOPED_KEYS.forEach((k) => {
    // @ts-expect-error indexed assignment across the shared key set
    out[k] = s[k]
  })
  return out
}

/**
 * Switch the active scenario. Persists the currently-edited scenario's values
 * back into the store, then hydrates the flat working fields from the target
 * scenario's stored values. Property-wide fields are untouched.
 */
function switchScenario(scenario: ScenarioId, prev: PanelState): PanelState {
  const store = { ...prev.scenarioStore, [prev.scenario]: extractScenarioSettings(prev) }
  const next = store[scenario]
  return { ...prev, ...next, scenario, scenarioStore: store }
}

function makeScenarioStore(): Record<ScenarioId, ScenarioSettings> {
  return {
    initial: makeScenarioSettings("initial"),
    late: makeScenarioSettings("late"),
    legal: makeScenarioSettings("legal"),
    pastResident: makeScenarioSettings("pastResident"),
  }
}

/** Which scenario-scoped keys belong to each editable area. Used to decide
 *  which areas a bulk save should apply ("only the sections you touched"). */
const CADENCE_KEYS: (keyof ScenarioSettings)[] = [
  "enabled", "offsetValue", "offsetDir", "offsetAnchor", "repeatOn", "repeatInterval",
  "maxAttempts", "recipients", "minOutstandingBalance", "deliveryOverride",
  "channel", "quietStart", "quietEnd", "days",
  "pauseOnExpectedPayDate", "pauseOnReply", "pauseOnEviction",
  "delinquencyMode", "smallBalanceReminderOn", "smallBalanceMax", "smallBalanceFloor",
]
const ESCALATION_KEYS: (keyof ScenarioSettings)[] = ["preset", "categories", "confidence", "routing"]
const MESSAGING_KEYS: (keyof ScenarioSettings)[] = ["introMessage", "repeatMessage"]
const DELIVERY_DEFAULT_KEYS: (keyof PanelState)[] = ["defaultChannel", "defaultQuietStart", "defaultQuietEnd", "defaultDays", "defaultSendOnHolidays"]
const REPAYMENT_KEYS: (keyof PanelState)[] = [
  "repaymentOfferEnabled", "repaymentRequireGoodStanding", "repaymentMinBalance", "repaymentMaxBalance",
  "repaymentMinDownPercent", "planMaxMonthsAutomated", "planRequireApprovalAmount",
  "planRequireApprovalSecondInYear",
]
const ELIGIBILITY_KEYS: (keyof PanelState)[] = [
  "eligibilityEnabled", "eligibilityFactors", "eligibilityThresholdModerate",
  "eligibilityThresholdPoor", "eligibilityRules",
]
const CONTEXT_OUTREACH_KEYS: (keyof PanelState)[] = [
  "contextAwareOutreachEnabled", "usePaymentHistoryContext", "useConversationContext",
  "useStaffManagerThreads", "usePaymentsAIThreads",
  "deferOnCommittedPayDate", "committedPayDateFollowUpDays",
  "committedPayDateMaxDeferDays", "committedPayDateEscalateBeyondMax",
  "respectTypicalPayDay", "typicalPayDayMinHistoryMonths",
  "onTimePayerGraceEnabled", "onTimePayerGraceDays", "onTimePayerMinRate",
]
const GUARDRAIL_KEYS: (keyof PanelState)[] = [
  "toolFailureCap", "loopGuardCount", "feeWaiverAutoApproveCap", "driftPercentThreshold",
  "shareFlexAvailability", "acceptOneTimePayments", "setupRecurringPayments",
]

/** Compare two panel states and return the human-readable areas that differ. */
function computeChangedSections(a: PanelState, b: PanelState): string[] {
  const out: string[] = []
  const scenarioKeysDiffer = (keys: (keyof ScenarioSettings)[]) =>
    (Object.keys(a.scenarioStore) as ScenarioId[]).some((sid) =>
      keys.some((k) => JSON.stringify(a.scenarioStore[sid][k]) !== JSON.stringify(b.scenarioStore[sid][k])),
    )
  const panelKeysDiffer = (keys: (keyof PanelState)[]) =>
    keys.some((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]))

  if (scenarioKeysDiffer(CADENCE_KEYS) || panelKeysDiffer(DELIVERY_DEFAULT_KEYS)) out.push("Cadence")
  if (scenarioKeysDiffer(ESCALATION_KEYS)) out.push("Escalation")
  if (scenarioKeysDiffer(MESSAGING_KEYS)) out.push("Custom Messaging")
  if (panelKeysDiffer(REPAYMENT_KEYS)) out.push("Repayment agreements")
  if (panelKeysDiffer(ELIGIBILITY_KEYS)) out.push("Resident eligibility")
  if (panelKeysDiffer(CONTEXT_OUTREACH_KEYS)) out.push("Context-aware outreach")
  if (panelKeysDiffer(GUARDRAIL_KEYS)) out.push("Guardrails")
  return out
}

function makeInitialState(): PanelState {
  const store = makeScenarioStore()
  return {
    scenario: "initial",
    agentDisplayName: "",
    scenarioStore: store,
    ...store.initial,
    // Property-wide delivery window defaults (sensible cross-scenario baseline).
    defaultChannel: "sms_email",
    defaultQuietStart: 9,
    defaultQuietEnd: 20,
    defaultDays: { ...ALL_DAYS_FALSE_SUN },
    // Off by default: don't message on holidays; push to next business day.
    defaultSendOnHolidays: false,
    repaymentOfferEnabled: true,
    repaymentRequireGoodStanding: true,
    repaymentMinBalance: fixedThreshold(50),
    repaymentMaxBalance: fixedThreshold(5000),
    repaymentMinDownPercent: 25,
    planMaxMonthsAutomated: 3,
    planRequireApprovalAmount: 2000,
    planRequireApprovalSecondInYear: true,
    eligibilityEnabled: true,
    eligibilityFactors: {
      latePayments: { enabled: true, weight: 30 },
      returnedPayments: { enabled: true, weight: 25 },
      chargebacks: { enabled: true, weight: 20 },
      violations: { enabled: true, weight: 15 },
      complaints: { enabled: false, weight: 10 },
    },
    eligibilityThresholdModerate: 35,
    eligibilityThresholdPoor: 65,
    eligibilityRules: makeEligibilityRulesDefault(),
    contextAwareOutreachEnabled: true,
    usePaymentHistoryContext: true,
    useConversationContext: true,
    useStaffManagerThreads: true,
    usePaymentsAIThreads: true,
    deferOnCommittedPayDate: true,
    committedPayDateFollowUpDays: 1,
    committedPayDateMaxDeferDays: 7,
    committedPayDateEscalateBeyondMax: true,
    respectTypicalPayDay: true,
    typicalPayDayMinHistoryMonths: 3,
    onTimePayerGraceEnabled: true,
    onTimePayerGraceDays: 3,
    onTimePayerMinRate: 90,
    toolFailureCap: 3,
    loopGuardCount: 4,
    feeWaiverAutoApproveCap: 50,
    driftPercentThreshold: 25,
    shareFlexAvailability: true,
    acceptOneTimePayments: true,
    setupRecurringPayments: true,
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   Public component
   ══════════════════════════════════════════════════════════════════════════ */

interface Props {
  propertyName: string
  propertyId?: string
  agentDisplayLabel?: string
  onOpenPropertySetting?: (settingName: string) => void
  /** When true, the panel edits a shared draft applied to many properties at
   *  once. The header, banner, and Save copy switch to bulk wording, and Save
   *  reports which sections changed so the host applies only those. */
  bulkMode?: boolean
  /** Number of properties a bulk save will apply to (the selected set). */
  bulkCount?: number
  /** Names of the properties the bulk edit targets (for the banner). */
  bulkPropertyNames?: string[]
  /** Group labels selected in bulk mode (e.g. Group A, Group B). */
  bulkSelectedGroupLabels?: string[]
  /** Called on Save in bulk mode with the list of changed section labels. */
  onBulkApply?: (changedSections: string[]) => void
}

type DetailTab = "cadence" | "escalation" | "messaging"
type SettingsView = "scenarios" | "guardrails"

export function PaymentsAISettingsPanel({
  propertyName,
  propertyId,
  agentDisplayLabel = "Payments AI",
  onOpenPropertySetting,
  bulkMode = false,
  bulkCount = 0,
  bulkPropertyNames = [],
  bulkSelectedGroupLabels = [],
  onBulkApply,
}: Props) {
  const resolvedSettings = useMemo(
    () => resolvePropertySettings(propertyId ?? "default", propertyName || "Property"),
    [propertyId, propertyName],
  )
  const propertyContext = useMemo(
    () => propertyContextFromResolved(resolvedSettings),
    [resolvedSettings],
  )
  const [state, setState] = useState<PanelState>(() => makeInitialState())
  const [pristine, setPristine] = useState<PanelState>(() => makeInitialState())
  const [detailTab, setDetailTab] = useState<DetailTab>("cadence")
  const [settingsView, setSettingsView] = useState<SettingsView>("scenarios")

  const dirty = useMemo(() => JSON.stringify(state) !== JSON.stringify(pristine), [state, pristine])

  const update = <K extends keyof PanelState>(key: K, value: PanelState[K]) =>
    setState((s) => ({ ...s, [key]: value }))

  // Which of the four editable areas changed vs the opening snapshot. Drives
  // the "only the sections you touched" bulk apply.
  const changedSections = useMemo(() => {
    const synced = { ...state, scenarioStore: { ...state.scenarioStore, [state.scenario]: extractScenarioSettings(state) } }
    return computeChangedSections(synced, pristine)
  }, [state, pristine])

  const handleSave = () => {
    // Fold the in-flight scenario edits into the store before snapshotting.
    const synced = { ...state, scenarioStore: { ...state.scenarioStore, [state.scenario]: extractScenarioSettings(state) } }
    if (bulkMode) {
      onBulkApply?.(changedSections)
      return
    }
    setState(synced)
    setPristine(synced)
  }
  const handleDiscard = () => setState(pristine)

  const handleScenarioChange = (scenario: ScenarioId) =>
    setState((s) => switchScenario(scenario, s))

  const handleScenarioEnabledToggle = (enabled: boolean) => {
    const meta = SCENARIOS.find((s) => s.id === state.scenario)
    if (meta?.outOfScope) return
    setState((s) => ({ ...s, enabled }))
  }

  const handlePresetChange = (preset: PresetId) => {
    const p = ESCALATION_PRESETS[preset]
    setState((s) => ({
      ...s,
      preset,
      categories: { ...p.categories },
      confidence: p.confidence,
    }))
  }

  const handleCategoryToggle = (cat: CategoryId, on: boolean) =>
    setState((s) => ({
      ...s,
      categories: { ...s.categories, [cat]: on },
      preset: "custom",
    }))

  const handleConfidenceChange = (value: number) =>
    setState((s) => ({ ...s, confidence: value, preset: "custom" }))

  const handleRoutingChange = (
    cat: CategoryId,
    patch: Partial<{ targetType: RouteTargetType; targetId: string; slaHours: number }>,
  ) =>
    setState((s) => {
      const current = s.routing[cat]
      const next = { ...current, ...patch }
      // When the type changes, snap targetId to the first option of the new
      // type so we don't render an empty select with a stale id.
      if (patch.targetType && patch.targetType !== current.targetType) {
        const opts = ROUTING_OPTIONS[patch.targetType]
        if (!opts.some((o) => o.id === next.targetId)) {
          next.targetId = opts[0]?.id ?? ""
        }
      }
      return {
        ...s,
        routing: { ...s.routing, [cat]: next },
      }
    })

  return (
    <TooltipProvider delayDuration={150}>
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="border-b border-border bg-white px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {bulkMode ? `Bulk edit — ${agentDisplayLabel} Settings` : `${agentDisplayLabel} Settings`}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {bulkMode ? (
                <>Edit a shared draft and apply it to{" "}
                  <strong>{bulkCount} selected {bulkCount === 1 ? "property" : "properties"}</strong> at once. Only the
                  sections you change are applied; everything else stays as each property has it.</>
              ) : (
                <>Configure how {agentDisplayLabel} reaches out, when it hands off, and where its autonomy ends at{" "}
                  <strong>{propertyName}</strong>. Pick a scenario on the left; it stays pinned while you tune that
                  scenario&apos;s cadence and escalation.</>
              )}
            </p>
          </div>
          <Badge variant={bulkMode ? "default" : "gray"} className="shrink-0">
            <Lock className="mr-1 h-3 w-3" />
            {bulkMode ? `Bulk · ${bulkCount} selected` : "Property scope"}
          </Badge>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 pb-32 pt-6">
        <div className="mx-auto max-w-5xl">
          {bulkMode && (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              <div>
                <p className="font-medium">Bulk edit applies to {bulkCount} selected {bulkCount === 1 ? "property" : "properties"}.</p>
                {bulkPropertyNames.length > 0 && (
                  <p className="mt-0.5 text-amber-800">
                    {bulkSelectedGroupLabels.length > 0 && (
                      <>
                        Groups: {bulkSelectedGroupLabels.join(", ")}
                        {bulkPropertyNames.length > 0 ? " · " : ""}
                      </>
                    )}
                    {bulkPropertyNames.slice(0, 5).join(", ")}
                    {bulkPropertyNames.length > 5 ? `, and ${bulkPropertyNames.length - 5} more` : ""}.
                  </p>
                )}
                <p className="mt-0.5 text-amber-800">
                  {changedSections.length > 0
                    ? `On save, these areas will be applied to every selected property: ${changedSections.join(", ")}.`
                    : "Change Cadence, Escalation, Custom Messaging, or Guardrails below. Only the areas you change will be applied."}
                </p>
              </div>
            </div>
          )}
          {/* Collection journey is a property-wide overview of where every
              scenario fires across the billing cycle, above the master-detail
              block and separated from the per-scenario rail. */}
          {!bulkMode && (
            <div className="mb-4">
              <ResolvedPropertySettingsStrip
                resolved={resolvedSettings}
                onOpenSetting={onOpenPropertySetting}
              />
            </div>
          )}
          <div className="mb-4">
            <LifecycleGlossary />
          </div>
          <div className="mb-6">
            <JourneyTimeline
              store={state.scenarioStore}
              current={state}
              active={state.scenario}
              onChange={handleScenarioChange}
              propertyContext={propertyContext}
              resolvedSettings={resolvedSettings}
            />
          </div>

          <div className="mb-4 inline-flex items-center gap-1 rounded-lg border border-border bg-zinc-100/70 p-1">
            <button
              type="button"
              onClick={() => setSettingsView("scenarios")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                settingsView === "scenarios"
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Scenarios
            </button>
            <button
              type="button"
              onClick={() => setSettingsView("guardrails")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                settingsView === "guardrails"
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Guardrails
            </button>
          </div>

          {settingsView === "guardrails" ? (
            <WorkflowGuardrailsSection
              state={state}
              update={update}
              propertyContext={propertyContext}
              avgRent={resolvedSettings.avgRent}
              activeScenario={state.scenario}
            />
          ) : (
          <div className="flex flex-row items-start gap-4">
            {/* Left sidebar: Agent identity (property-wide) sits directly above
                the Editing Scenario rail. */}
            <div className="w-56 shrink-0 space-y-4 self-start sm:sticky sm:top-0 sm:w-60">
              <AgentIdentitySection
                state={state}
                update={update}
                agentDisplayLabel={agentDisplayLabel}
              />
              <ScenarioRail
                scenario={state.scenario}
                store={state.scenarioStore}
                current={state}
                onChange={handleScenarioChange}
              />
            </div>

            <div className="min-w-0 flex-1 space-y-8">
              <ScenarioEnableBanner
                scenario={state.scenario}
                enabled={state.enabled}
                onToggle={handleScenarioEnabledToggle}
                propertyContext={propertyContext}
              />

              <div
                className={cn(
                  "space-y-6 transition-opacity",
                  !state.enabled && "pointer-events-none select-none opacity-50",
                )}
                aria-disabled={!state.enabled}
              >
                <DetailTabBar active={detailTab} onChange={setDetailTab} />

                {detailTab === "cadence" && (
                  <CadenceSection state={state} update={update} propertyContext={propertyContext} avgRent={resolvedSettings.avgRent} />
                )}
                {detailTab === "escalation" && (
                  <EscalationSection
                    state={state}
                    onPresetChange={handlePresetChange}
                    onCategoryToggle={handleCategoryToggle}
                    onConfidenceChange={handleConfidenceChange}
                    onRoutingChange={handleRoutingChange}
                    propertyContext={propertyContext}
                  />
                )}
                {detailTab === "messaging" && (
                  <MessagesSection state={state} update={update} />
                )}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <FooterActionBar dirty={dirty} onSave={handleSave} onDiscard={handleDiscard} bulkMode={bulkMode} bulkCount={bulkCount} />
    </div>
    </TooltipProvider>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Info hint — small (i) icon that reveals a setting explanation on hover.
   ══════════════════════════════════════════════════════════════════════════ */

function InfoHint({ label, className }: { label: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="More info"
          className={cn(
            "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/30",
            className,
          )}
          onClick={(e) => e.preventDefault()}
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] leading-snug">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Detail tab bar — switches the scenario detail pane between Cadence,
   Escalation, and Guardrails so only one tall section renders at a time
   (less scrolling).
   ══════════════════════════════════════════════════════════════════════════ */

const DETAIL_TABS: { id: DetailTab; label: string; icon: typeof Clock }[] = [
  { id: "cadence", label: "Cadence", icon: Clock },
  { id: "escalation", label: "Escalation", icon: Users },
  { id: "messaging", label: "Custom Messaging", icon: MessageSquare },
]

function DetailTabBar({
  active,
  onChange,
}: {
  active: DetailTab
  onChange: (t: DetailTab) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Scenario settings"
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-zinc-100/70 p-1"
    >
      {DETAIL_TABS.map((t) => {
        const isActive = active === t.id
        const Icon = t.icon
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-zinc-900 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Section shell — mirrors leasing-ai-settings-panel.tsx
   ══════════════════════════════════════════════════════════════════════════ */

function SectionShell({
  icon: Icon,
  title,
  description,
  hint,
  headerAction,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  title: string
  /** Short context for the section. Shown only in the on-hover (i) tooltip to
   *  reduce visual noise — never rendered as a visible paragraph. */
  description: string
  hint?: string
  headerAction?: React.ReactNode
  children: React.ReactNode
}) {
  // Fold description + hint into a single tooltip so the header stays clean.
  const tip = [description, hint].filter(Boolean).join(" ")
  return (
    <section className="rounded-xl border border-border bg-white">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {tip && <InfoHint label={tip} />}
          </div>
        </div>
        {headerAction && <div className="shrink-0 self-center">{headerAction}</div>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Scenario enable / disable banner — master switch for the active scenario.
   When off, all per-scenario settings below are inert.
   ══════════════════════════════════════════════════════════════════════════ */

function ScenarioEnableBanner({
  scenario,
  enabled,
  onToggle,
  propertyContext,
}: {
  scenario: ScenarioId
  enabled: boolean
  onToggle: (enabled: boolean) => void
  propertyContext: PropertyContextView
}) {
  const meta = SCENARIOS.find((s) => s.id === scenario)
  const title = meta?.title ?? "Scenario"
  const enableNotice: { icon: typeof Info; text: React.ReactNode } | null =
    enabled && scenario === "initial"
      ? {
          icon: AlertTriangle,
          text: (
            <>
              Standard Rent Reminders will no longer be sent. Payments AI now handles all
              rent-reminder outreach for this property.
            </>
          ),
        }
      : enabled && scenario === "late"
        ? {
            icon: Info,
            text: (
              <>
                Payments AI will not change your legal notices. This scenario controls a separate
                collections nudge with a different tone from the formal delinquency notices in Company
                Settings.
              </>
            ),
          }
        : enabled && scenario === "pastResident"
          ? {
              icon: Info,
              text: (
                <>
                  Past Residents will only be allowed to log in for{" "}
                  <span className="font-semibold text-foreground">{propertyContext.pastResidentLoginDays} days</span>{" "}
                  after move-out.
                </>
              ),
            }
          : null
  return (
    <section
      className={cn(
        "rounded-xl border px-5 py-4 transition-colors",
        enabled ? "border-emerald-200 bg-emerald-50/50" : "border-border bg-zinc-50",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-block h-2 w-2 shrink-0 rounded-full",
                enabled ? "bg-emerald-500" : "bg-zinc-400",
              )}
              aria-hidden
            />
            <h3 className="text-sm font-semibold text-foreground">
              {title} is {enabled ? "enabled" : "disabled"}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {enabled
              ? "The agent runs this scenario's identity, cadence, and escalation as configured below."
              : "The agent will not run any outreach, cadence, or escalation for this scenario. Its settings are saved but inactive."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-center">
          <span className="text-xs font-medium text-muted-foreground">{enabled ? "On" : "Off"}</span>
          <ToggleSwitch checked={enabled} onChange={onToggle} disabled={meta?.outOfScope} />
        </div>
      </div>
      {enableNotice && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <enableNotice.icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <p className="text-xs leading-relaxed text-amber-900">{enableNotice.text}</p>
        </div>
      )}
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Journey timeline — unified day 1–31 view of the whole rent-collection cycle.
   Shows the fixed anchor events and every scenario's projected message days on
   a single rail so PMs can see overlaps and sequencing at a glance.
   ══════════════════════════════════════════════════════════════════════════ */

/** Visual identity for each scenario's marks on the timeline. */
const SCENARIO_TIMELINE_META: Record<ScenarioId, { dot: string; ring: string; text: string; soft: string }> = {
  initial: { dot: "bg-sky-500", ring: "ring-sky-300", text: "text-sky-700", soft: "bg-sky-100" },
  late: { dot: "bg-amber-500", ring: "ring-amber-300", text: "text-amber-700", soft: "bg-amber-100" },
  legal: { dot: "bg-rose-500", ring: "ring-rose-300", text: "text-rose-700", soft: "bg-rose-100" },
  pastResident: { dot: "bg-violet-500", ring: "ring-violet-300", text: "text-violet-700", soft: "bg-violet-100" },
}

const JOURNEY_EVENTS_STATIC: { key: keyof typeof JOURNEY_ANCHORS | "prpStart"; label: string; icon: typeof Calendar }[] = [
  { key: "chargesPosted", label: "Charges posted", icon: Receipt },
  { key: "rentDue", label: "Rent due", icon: Calendar },
  { key: "lateFees", label: "Late fees post", icon: FileWarning },
  { key: "notice", label: "Put on notice / pre-collections", icon: AlertTriangle },
  { key: "eviction", label: "Collections / eviction begins", icon: Gavel },
]

function journeyAnchorsFromResolved(resolved: ResolvedPropertySettings) {
  return {
    chargesPosted: 1,
    rentDue: resolved.rentDueDay,
    lateFees: resolved.lateFeeDay,
    notice: resolved.rentDueDay + resolved.delinquencyBeginDays + 10,
    eviction: 31,
    prpStart: 0,
    prpAgency: resolved.collectionsAgencyDaysAfterMoveOut,
  }
}

function JourneyTimeline({
  store,
  current,
  active,
  onChange,
  propertyContext,
  resolvedSettings,
}: {
  store: Record<ScenarioId, ScenarioSettings>
  current: PanelState
  active: ScenarioId
  onChange: (s: ScenarioId) => void
  propertyContext: PropertyContextView
  resolvedSettings: ResolvedPropertySettings
}) {
  const anchors = journeyAnchorsFromResolved(resolvedSettings)
  const journeyEvents = JOURNEY_EVENTS_STATIC.map((e) => ({
    day: anchors[e.key],
    label: e.label,
    icon: e.icon,
  }))
  // Resolve the live settings for each scenario (active one comes from working state).
  const settingsFor = (id: ScenarioId): ScenarioSettings =>
    id === active ? extractScenarioSettings(current) : store[id]

  const days = Array.from({ length: CYCLE_DAYS }, (_, i) => i + 1)

  // Rows shown on the rent cycle (past-resident is on its own track below).
  const cycleRows = JOURNEY_STEPS.map((step) => step.id)

  return (
    <SectionShell
      icon={CalendarRange}
      title="Collection journey"
      description="One timeline for the whole billing cycle: see when every scenario reaches out, relative to the key ledger events."
      hint="A unified day 1–31 view of the rent-collection cycle. Each row is a scenario; dots are projected message days. Repeats stop before the next stage begins. Past Resident Payment runs after move-out, on its own track."
    >
      <div className="space-y-4">
        {/* Anchor-event legend */}
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {journeyEvents.map((e) => {
            const Icon = e.icon
            return (
              <div key={e.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Icon className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
                <span className="font-medium text-foreground">Day {e.day}</span>
                <span>{e.label}</span>
              </div>
            )
          })}
        </div>

        {/* Day axis */}
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="flex items-end gap-px pl-28">
              {days.map((d) => {
                const isAnchor = journeyEvents.some((e) => e.day === d)
                return (
                  <div key={d} className="flex-1 text-center">
                    <span
                      className={cn(
                        "block text-[8px] tabular-nums",
                        isAnchor ? "font-bold text-foreground" : d % 5 === 0 ? "text-muted-foreground" : "text-transparent",
                      )}
                    >
                      {d}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Anchor-event tick row */}
            <div className="relative mt-1 flex h-5 items-center gap-px pl-28">
              {days.map((d) => {
                const event = journeyEvents.find((e) => e.day === d)
                return (
                  <div key={d} className="flex flex-1 justify-center">
                    {event ? (
                      <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-900 text-white">
                        <event.icon className="h-2.5 w-2.5" aria-hidden />
                      </span>
                    ) : (
                      <span className="h-2 w-px bg-border" />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Scenario rows */}
            <div className="mt-2 space-y-1.5">
              {cycleRows.map((id) => {
                const s = settingsFor(id)
                const meta = SCENARIO_TIMELINE_META[id]
                const scenarioMeta = SCENARIOS.find((x) => x.id === id)
                const sendDays = s.enabled ? projectSendDays(s, id) : []
                const isActive = id === active
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onChange(id)}
                    className={cn(
                      "flex w-full items-center gap-px rounded-md py-1 text-left transition-colors",
                      isActive ? "bg-purple-50 ring-1 ring-purple-200" : "hover:bg-zinc-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex w-28 shrink-0 items-center gap-1.5 pl-2 pr-1 text-[11px] font-semibold",
                        s.enabled ? meta.text : "text-muted-foreground",
                      )}
                    >
                      <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", s.enabled ? meta.dot : "bg-zinc-300")} aria-hidden />
                      <span className="truncate">{scenarioMeta?.shortLabel}</span>
                    </span>
                    {days.map((d) => {
                      const hit = sendDays.includes(d)
                      const isFirst = hit && d === sendDays[0]
                      return (
                        <span key={d} className="flex flex-1 justify-center">
                          {hit ? (
                            <span
                              className={cn(
                                "inline-block rounded-full",
                                isFirst ? "h-2.5 w-2.5" : "h-2 w-2",
                                meta.dot,
                                isActive && "ring-2",
                                isActive && meta.ring,
                              )}
                              title={`${scenarioMeta?.shortLabel}: day ${d}${isFirst ? " (first message)" : " (repeat)"}`}
                            />
                          ) : (
                            <span className="inline-block h-px w-full" />
                          )}
                        </span>
                      )
                    })}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Past-resident note — separate post-move-out track */}
        <PastResidentTrackNote settings={settingsFor("pastResident")} active={active === "pastResident"} onSelect={() => onChange("pastResident")} />

        {/* Overlap warning (item 1) */}
        <JourneyOverlapWarning store={store} current={current} active={active} />
      </div>
    </SectionShell>
  )
}

/** Past Resident runs after move-out, off the rent cycle — show it as its own note. */
function PastResidentTrackNote({ settings, active, onSelect }: { settings: ScenarioSettings; active: boolean; onSelect: () => void }) {
  const meta = SCENARIO_TIMELINE_META.pastResident
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md border border-dashed px-3 py-2 text-left text-[11px] transition-colors",
        active ? "border-violet-300 bg-violet-50" : "border-border hover:bg-zinc-50",
      )}
    >
      <UserMinus className={cn("h-3.5 w-3.5 shrink-0", meta.text)} aria-hidden />
      <span className={cn("font-semibold", meta.text)}>Past Resident Payment</span>
      <span className="text-muted-foreground">
        {settings.enabled
          ? `runs on its own track after move-out: ${scenarioCadenceSummary(settings)}.`
          : "is disabled."}
      </span>
    </button>
  )
}

/**
 * Detects scenarios whose projected message days collide on the same cycle day
 * (item 1: Rent Reminder & Delinquency must not go out on the same date).
 */
function JourneyOverlapWarning({
  store,
  current,
  active,
}: {
  store: Record<ScenarioId, ScenarioSettings>
  current: PanelState
  active: ScenarioId
}) {
  const settingsFor = (id: ScenarioId) => (id === active ? extractScenarioSettings(current) : store[id])
  // Map cycle day -> scenarios that send on it (rent-cycle scenarios only).
  const byDay = new Map<number, ScenarioId[]>()
  JOURNEY_STEPS.forEach((step) => {
    const s = settingsFor(step.id)
    if (!s.enabled) return
    projectSendDays(s, step.id).forEach((d) => {
      byDay.set(d, [...(byDay.get(d) ?? []), step.id])
    })
  })
  const collisions = [...byDay.entries()].filter(([, ids]) => ids.length > 1)
  if (collisions.length === 0) return null

  const label = (id: ScenarioId) => SCENARIOS.find((s) => s.id === id)?.shortLabel ?? id
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <div className="text-xs leading-relaxed text-amber-900">
        <p className="font-semibold">Overlapping messages on the same day</p>
        <ul className="mt-1 space-y-0.5">
          {collisions.map(([day, ids]) => (
            <li key={day}>
              Day {day}: {ids.map(label).join(" + ")} would both send. The agent sends only the later-stage message
              that day to avoid double-contacting the resident. Adjust the offsets or repeat interval to separate them.
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Scenario rail — single persistent selector (item 6).
   Sticky so it stays visible while the Identity / Cadence / Escalation blocks
   scroll. The active scenario is clearly highlighted.
   ══════════════════════════════════════════════════════════════════════════ */

/** One-line cadence summary for a scenario, shown under each rail item. */
function scenarioCadenceSummary(s: ScenarioSettings): string {
  const phrase = OFFSET_PHRASE[s.offsetDir] ?? "days"
  const opener = s.offsetDir === "on_charges_posted" ? phrase : `${s.offsetValue} ${phrase}`
  if (!s.repeatOn) return `${opener} · one-time`
  return `${opener} · every ${s.repeatInterval}d`
}

function ScenarioRail({
  scenario,
  store,
  current,
  onChange,
}: {
  scenario: ScenarioId
  store: Record<ScenarioId, ScenarioSettings>
  current: PanelState
  onChange: (s: ScenarioId) => void
}) {
  return (
    <div className="w-full">
      <div
        role="radiogroup"
        aria-label="Scenario"
        className="space-y-2 rounded-xl border border-border bg-white p-2.5"
      >
        <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Editing scenario
        </p>
        {SCENARIOS.map((s) => {
          const active = scenario === s.id
          const settings = active ? extractScenarioSettings(current) : store[s.id]
          const enabled = settings.enabled
          const outOfScope = s.outOfScope
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(s.id)}
              className={cn(
                "relative w-full rounded-lg border px-3 py-2.5 text-left transition-all",
                active
                  ? outOfScope
                    ? "border-rose-300 bg-rose-50 text-rose-950 shadow-sm ring-2 ring-rose-200/60"
                    : "border-purple-400 bg-purple-100 text-purple-950 shadow-sm ring-2 ring-purple-300/50"
                  : "border-border bg-white text-foreground hover:border-zinc-400 hover:bg-zinc-50",
              )}
            >
              {active && (
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 w-1 rounded-l-lg",
                    outOfScope ? "bg-rose-500" : "bg-purple-500",
                  )}
                  aria-hidden
                />
              )}
              <div className="flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                      outOfScope ? "bg-rose-400" : enabled ? "bg-emerald-500" : "bg-zinc-400",
                    )}
                    aria-hidden
                  />
                  <span className={cn("whitespace-nowrap text-sm font-semibold leading-tight", !enabled && !outOfScope && "opacity-60")}>
                    {s.title}
                  </span>
                </span>
                {outOfScope ? (
                  <span className="shrink-0 rounded-full bg-rose-200 px-1.5 py-0.5 text-[8px] font-semibold uppercase leading-tight tracking-wide text-rose-800">
                    Out of scope
                  </span>
                ) : active ? (
                  <span className="shrink-0 rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-purple-700">
                    Editing
                  </span>
                ) : !enabled ? (
                  <span className="shrink-0 rounded-full bg-zinc-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-600">
                    Off
                  </span>
                ) : null}
              </div>
              <div className={cn("mt-0.5 text-[11px] leading-snug", active ? (outOfScope ? "text-rose-900/75" : "text-purple-900/75") : "text-muted-foreground", !enabled && !outOfScope && "opacity-70")}>
                {s.helper}
              </div>
              <div className={cn("mt-1.5 text-[10px] font-medium tabular-nums", active ? (outOfScope ? "text-rose-800/70" : "text-purple-800/70") : "text-zinc-500", !enabled && !outOfScope && "opacity-70")}>
                {outOfScope ? "Pending legal review" : enabled ? scenarioCadenceSummary(settings) : "Disabled"}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Agent identity section — name + default tone, per-property branding
   ══════════════════════════════════════════════════════════════════════════ */

function AgentIdentitySection({
  state,
  update,
  agentDisplayLabel,
}: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
  agentDisplayLabel: string
}) {
  const placeholder = `your ${agentDisplayLabel.toLowerCase().replace(/^eli\+\s*/i, "")} assistant`

  return (
    <SectionShell
      icon={Bot}
      title="Agent identity"
      description="Brand the agent. The agent always acknowledges it's AI when asked."
      hint="How the agent presents itself to residents: its display name. This is static across all scenarios. Compliance and workflow behavior are unaffected."
    >
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-foreground">Display name</label>
            <InfoHint label="The name the agent uses to refer to itself in messages. Leave blank to use the generic assistant name." />
          </div>
          <Input
            value={state.agentDisplayName}
            onChange={(e) => update("agentDisplayName", e.target.value)}
            placeholder={placeholder}
            maxLength={40}
            className="mt-1.5"
          />
        </div>
      </div>
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Escalation section
   ══════════════════════════════════════════════════════════════════════════ */

const PRESET_BUTTONS: { id: PresetId; label: string }[] = [
  { id: "minimum", label: "Minimum" },
  { id: "standard", label: "Standard" },
  { id: "high-touch", label: "High-touch" },
  { id: "compliance", label: "Compliance" },
]

function EscalationSection({
  state,
  onPresetChange,
  onCategoryToggle,
  onConfidenceChange,
  onRoutingChange,
  propertyContext,
}: {
  state: PanelState
  onPresetChange: (p: PresetId) => void
  onCategoryToggle: (c: CategoryId, on: boolean) => void
  onConfidenceChange: (v: number) => void
  onRoutingChange: (
    c: CategoryId,
    patch: Partial<{ targetType: RouteTargetType; targetId: string; slaHours: number }>,
  ) => void
  propertyContext: PropertyContextView
}) {
  const presetMeta =
    state.preset === "custom"
      ? { label: "Custom", badgeCls: "bg-zinc-100 text-zinc-800", help: "You've tuned this manually; the bundled presets no longer apply." }
      : { label: ESCALATION_PRESETS[state.preset].label, badgeCls: ESCALATION_PRESETS[state.preset].badgeCls, help: ESCALATION_PRESETS[state.preset].help }

  const activeCats = (Object.keys(state.categories) as CategoryId[]).filter((c) => state.categories[c])
  const hasActive = activeCats.length > 0

  return (
    <SectionShell
      icon={Users}
      title="Escalation"
      description="When the agent should hand a conversation to a human."
      hint="Defines the situations that pull a human in: which categories the agent escalates, its confidence threshold, and where each escalation routes."
    >
      <div className="space-y-5">
        {/* Policy preset */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Policy preset
              </label>
              <InfoHint label={presetMeta.help} />
            </div>
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", presetMeta.badgeCls)}>
              {presetMeta.label}
            </span>
          </div>
          <div className="mt-1.5 inline-flex flex-wrap items-center gap-1 rounded-md border border-border bg-white p-1 shadow-sm">
            {PRESET_BUTTONS.map((btn) => {
              const active = state.preset === btn.id
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => onPresetChange(btn.id)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    active
                      ? "bg-zinc-900 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {btn.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Category toggles */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Trigger categories
          </label>
          <div className="mt-1.5 divide-y divide-border rounded-md border border-border bg-white">
            {CATEGORIES.map((cat) => {
              const on = state.categories[cat.id]
              return (
                <div key={cat.id} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0 flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      {cat.label}
                      <InfoHint label={cat.description} />
                    </span>

                    {cat.id === "unanswered" && (
                      <div
                        className={cn(
                          "mt-2 flex flex-col gap-1.5 rounded-md border border-border bg-zinc-50/40 p-2.5 transition-opacity",
                          on ? "opacity-100" : "opacity-60",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">Confidence floor</span>
                          <span className="text-xs tabular-nums text-foreground">{state.confidence}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={state.confidence}
                          disabled={!on}
                          onChange={(e) => onConfidenceChange(Number(e.target.value))}
                          className="w-full accent-zinc-900"
                        />
                      </div>
                    )}
                  </div>
                  <ToggleSwitch checked={on} onChange={(next) => onCategoryToggle(cat.id, next)} />
                </div>
              )
            })}
          </div>
        </div>

        {/* Routing matrix */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Routing
          </label>
          <div className="mt-1.5 overflow-hidden rounded-md border border-border bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-50/60 text-left">
                  <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Trigger</th>
                  <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Routes to</th>
                  <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {hasActive ? (
                  activeCats.map((cat) => {
                    const route = state.routing[cat]
                    const label = CATEGORIES.find((c) => c.id === cat)?.label ?? cat
                    const targetOptions = ROUTING_OPTIONS[route.targetType]
                    return (
                      <tr key={cat}>
                        <td className="whitespace-nowrap px-3 py-2 align-top text-foreground">{label}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1.5">
                            <Select
                              value={route.targetType}
                              onValueChange={(v) => onRoutingChange(cat, { targetType: v as RouteTargetType })}
                            >
                              <SelectTrigger className="h-7 w-[110px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.keys(ROUTING_TYPE_LABEL) as RouteTargetType[]).map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {ROUTING_TYPE_LABEL[t]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={route.targetId}
                              onValueChange={(v) => onRoutingChange(cat, { targetId: v })}
                            >
                              <SelectTrigger className="h-7 flex-1 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {targetOptions.map((opt) => (
                                  <SelectItem key={opt.id} value={opt.id}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              value={route.slaHours}
                              onChange={(e) => onRoutingChange(cat, { slaHours: Math.max(0, Number(e.target.value) || 0) })}
                              className="h-7 w-14 text-center text-xs"
                            />
                            <span className="text-muted-foreground">h</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-xs text-muted-foreground">
                      No active triggers. Turn on a category above to configure routing.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Messages section — customizable intro + repeat outreach copy per scenario
   ══════════════════════════════════════════════════════════════════════════ */

function MessagesSection({
  state,
  update,
}: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
}) {
  return (
    <SectionShell
      icon={MessageSquare}
      title="Messages"
      description="The copy the agent sends for this scenario."
      hint="Customize the first message the agent sends and the follow-up it repeats. Use {name}, {balance}, and {link} as merge tags that fill in at send time."
    >
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Intro message
            </label>
            <InfoHint label="The first message the agent sends when this scenario fires. Merge tags {name}, {balance}, and {link} are replaced at send time." />
          </div>
          <textarea
            value={state.introMessage}
            onChange={(e) => update("introMessage", e.target.value)}
            rows={3}
            className="mt-1.5 w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20"
          />
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Repeat message
            </label>
            <InfoHint label="The follow-up message sent on each repeat after the intro. Merge tags {name}, {balance}, and {link} are replaced at send time." />
          </div>
          <textarea
            value={state.repeatMessage}
            onChange={(e) => update("repeatMessage", e.target.value)}
            rows={3}
            className="mt-1.5 w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20"
          />
        </div>

        <p className="text-[11px] text-muted-foreground">
          Merge tags: <code className="rounded bg-zinc-100 px-1 py-0.5">{"{name}"}</code>{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5">{"{balance}"}</code>{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5">{"{link}"}</code>
        </p>
      </div>
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Delinquency — legal notice display + outreach mode
   ══════════════════════════════════════════════════════════════════════════ */

function LegalNoticeScheduleCard({ propertyContext }: { propertyContext: PropertyContextView }) {
  return (
    <div className="rounded-lg border border-border bg-zinc-50/60 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-foreground">Legal notice schedule (Company Settings)</p>
            <InfoHint
              label={`Formal delinquency notices are configured in ${propertyContext.companySettingsPath}. SMS is not offered for legal notices; delivery is email and/or hand-deliver depending on jurisdiction.`}
            />
          </div>
          <p className="mt-1.5 text-sm text-foreground">{propertyContext.legalNoticeSchedule}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Delivery method: <span className="font-medium text-foreground">{propertyContext.legalNoticeDelivery}</span>
            {" · "}
            Delinquency begins: <span className="font-medium text-foreground">{propertyContext.delinquencyPolicy}</span>
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[10px] font-medium text-muted-foreground">
          <ExternalLink className="h-3 w-3" aria-hidden />
          {propertyContext.companySettingsPath}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        Payments AI does not replace these legal notices. It can run a separate, lighter-tone collections nudge
        alongside them when enabled below.
      </p>
    </div>
  )
}

function DelinquencyOutreachMode({
  mode,
  onChange,
}: {
  mode: DelinquencyMode
  onChange: (m: DelinquencyMode) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-foreground">Payments AI outreach</label>
        <InfoHint label="Choose whether Payments AI sends its own collections nudge or defers entirely to the legal notice schedule in Company Settings." />
      </div>
      <div className="inline-flex flex-wrap items-center gap-1 rounded-md border border-border bg-white p-1 shadow-sm">
        {(
          [
            { id: "defer" as const, label: "Defaults to property settings" },
            { id: "nudge" as const, label: "Payments AI nudges" },
          ] as const
        ).map((opt) => {
          const active = mode === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                "rounded px-2.5 py-1.5 text-xs font-medium transition-colors",
                active ? "bg-zinc-900 text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {mode === "defer" && (
        <p className="text-xs text-muted-foreground">
          Payments AI will not send nudges. Legal notices follow your Company Settings schedule only.
        </p>
      )}
    </div>
  )
}

function RepaymentAgreementsSection({
  state,
  update,
  avgRent,
}: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
  avgRent: number
}) {
  return (
    <GuardrailSubsection
      title="Repayment agreements & PRP"
      description="Whether Payments AI can propose structured repayment plans on the property's behalf, and the balance and term limits for agent-negotiated offers."
    >
      <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-zinc-50/40 px-3 py-2">
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
          Allow agent to offer repayment agreements
          <InfoHint label="When on, the agent can negotiate a repayment plan with eligible residents during delinquency conversations. When off, all plan requests route to a human." />
        </span>
        <ToggleSwitch
          checked={state.repaymentOfferEnabled}
          onChange={(v) => update("repaymentOfferEnabled", v)}
        />
      </div>

      {state.repaymentOfferEnabled && (
        <>
          <GuardrailRule
            title="Eligibility"
            description="Resident and balance thresholds before the agent may propose a plan."
            hint="Residents outside these rails are directed to pay in full or escalated to staff."
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <span className="flex min-w-0 items-center gap-1.5 text-sm text-foreground">
                  Require good standing
                  <InfoHint label="Only residents without chronic delinquency or recent violations are eligible for an agent-negotiated repayment agreement." />
                </span>
                <ToggleSwitch
                  checked={state.repaymentRequireGoodStanding}
                  onChange={(v) => update("repaymentRequireGoodStanding", v)}
                />
              </div>
              <BalanceThresholdInput
                label="Minimum outstanding balance"
                value={state.repaymentMinBalance}
                onChange={(v) => update("repaymentMinBalance", v)}
                avgRent={avgRent}
              />
              <p className="text-xs text-muted-foreground">
                Below this, the agent asks for payment in full instead of offering a plan.
              </p>
              <BalanceThresholdInput
                label="Maximum balance for agent negotiation"
                value={state.repaymentMaxBalance}
                onChange={(v) => update("repaymentMaxBalance", v)}
                avgRent={avgRent}
              />
              <p className="text-xs text-muted-foreground">
                Above this, the agent escalates to a human before proposing terms.
              </p>
            </div>
          </GuardrailRule>

          <GuardrailRule
            title="Offer terms"
            description="Down payment, duration, and approval rules the agent must stay within when structuring a plan."
            hint="These limits apply property-wide across delinquency and pre-collections conversations."
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Minimum down payment</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={state.repaymentMinDownPercent}
                  onChange={(e) =>
                    update("repaymentMinDownPercent", Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                  }
                  className="h-8 w-16 text-sm"
                />
                <span className="text-muted-foreground">% of balance due at plan start</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Agent can negotiate up to</span>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={state.planMaxMonthsAutomated}
                  onChange={(e) => update("planMaxMonthsAutomated", Math.max(1, Number(e.target.value) || 1))}
                  className="h-8 w-16 text-sm"
                />
                <span className="text-muted-foreground">months without approval</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Require human approval when plan total exceeds $</span>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={state.planRequireApprovalAmount}
                  onChange={(e) => update("planRequireApprovalAmount", Math.max(0, Number(e.target.value) || 0))}
                  className="h-8 w-24 text-sm"
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <span className="flex min-w-0 items-center gap-1.5 text-sm text-foreground">
                  Require approval for second plan within 12 months
                  <InfoHint label="A resident who already completed or broke a plan this year usually needs a human conversation, not another agent-negotiated plan." />
                </span>
                <ToggleSwitch
                  checked={state.planRequireApprovalSecondInYear}
                  onChange={(v) => update("planRequireApprovalSecondInYear", v)}
                />
              </div>
            </div>
          </GuardrailRule>

          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <p>
              Repayment agreement terms may be subject to state tenant law and company policy. Review balance
              thresholds and plan limits with legal before enabling agent negotiation in production.
            </p>
          </div>
        </>
      )}
    </GuardrailSubsection>
  )
}

function FlexAvailabilitySection({
  state,
  update,
}: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
}) {
  return (
    <GuardrailSubsection
      title="Flex"
      description="Control whether the agent can mention Flex flexible rent payment options during resident conversations."
    >
      <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-zinc-50/40 px-3 py-2">
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
          Allow agent to share Flex availability?
          <InfoHint label="When on, the agent may tell eligible residents that Flex is available at this property. When off, Flex is never mentioned unless a human takes over the conversation." />
        </span>
        <ToggleSwitch
          checked={state.shareFlexAvailability}
          onChange={(v) => update("shareFlexAvailability", v)}
        />
      </div>
    </GuardrailSubsection>
  )
}

function PaymentActionsSection({
  state,
  update,
}: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
}) {
  return (
    <GuardrailSubsection
      title="Payment actions"
      description="Control which payment flows the agent can complete on its own during resident conversations."
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-zinc-50/40 px-3 py-2">
          <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
            Allow the agent to accept one time payments?
            <InfoHint label="When on, the agent can walk a resident through making a single payment toward their balance. When off, the agent directs residents to the portal or escalates to staff." />
          </span>
          <ToggleSwitch
            checked={state.acceptOneTimePayments}
            onChange={(v) => update("acceptOneTimePayments", v)}
          />
        </div>
        <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-zinc-50/40 px-3 py-2">
          <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
            Allow the agent to set up recurring payments?
            <InfoHint label="When on, the agent can help residents enroll in or update autopay and recurring payment schedules. When off, recurring setup routes to the portal or a human." />
          </span>
          <ToggleSwitch
            checked={state.setupRecurringPayments}
            onChange={(v) => update("setupRecurringPayments", v)}
          />
        </div>
      </div>
    </GuardrailSubsection>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Cadence section
   ══════════════════════════════════════════════════════════════════════════ */

function CadenceSection({
  state,
  update,
  propertyContext,
  avgRent,
}: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
  propertyContext: PropertyContextView
  avgRent: number
}) {
  const anchor = OFFSET_ANCHORS[state.offsetAnchor]
  const scenarioCadence = SCENARIO_CADENCE[state.scenario]
  // Event-driven triggers fire on a ledger event — there is no day count to apply.
  const isEventTrigger =
    state.offsetDir === "on_charges_posted" ||
    state.offsetDir === "on_late_fees" ||
    state.offsetDir === "on_notice"

  // Constraint (item 3): a scenario's repeats can't bleed into the next journey
  // stage. Compute the ceiling day and how many sends actually fit before it.
  const ceilingDay = nextStepStart(state.scenario)
  const projectedDays = useMemo(
    () => projectSendDays(state, state.scenario),
    [state.offsetValue, state.offsetDir, state.repeatOn, state.repeatInterval, state.maxAttempts, state.scenario],
  )
  const firstDay = projectedDays[0]
  const lastDay = projectedDays[projectedDays.length - 1]
  // The user asked for more repeats than fit before the next stage.
  const repeatsClamped =
    state.repeatOn &&
    ceilingDay != null &&
    projectedDays.length < state.maxAttempts &&
    lastDay + state.repeatInterval >= ceilingDay
  const nextStepLabel =
    ceilingDay != null
      ? SCENARIOS.find((s) => s.id === JOURNEY_STEPS[JOURNEY_STEPS.findIndex((x) => x.id === state.scenario) + 1]?.id)?.shortLabel
      : null

  // Effective delivery window: the scenario's own values when it overrides,
  // otherwise the property-wide defaults it inherits.
  const eff = state.deliveryOverride
    ? { channel: state.channel, quietStart: state.quietStart, quietEnd: state.quietEnd, days: state.days }
    : { channel: state.defaultChannel, quietStart: state.defaultQuietStart, quietEnd: state.defaultQuietEnd, days: state.defaultDays }

  const prediction = useMemo(() => {
    const phrase = OFFSET_PHRASE[state.offsetDir] ?? "days"
    const start = formatHour(eff.quietStart)
    const end = formatHour(eff.quietEnd)
    const opener = isEventTrigger ? phrase : `${state.offsetValue} ${phrase}`
    if (!state.repeatOn) return `${opener}, between ${start} and ${end}`
    return `${opener}, then every ${state.repeatInterval} days, between ${start} and ${end}`
  }, [state.offsetValue, state.offsetDir, eff.quietStart, eff.quietEnd, state.repeatOn, state.repeatInterval, isEventTrigger])

  const isDelinquency = state.scenario === "late"
  const deferToProperty = isDelinquency && state.delinquencyMode === "defer"
  const showNudgeCadence = !isDelinquency || state.delinquencyMode === "nudge"

  const initialContactHint =
    state.scenario === "initial"
      ? `Property context: charges post ${propertyContext.rentChargeDate.toLowerCase()}; rent is due on the ${propertyContext.rentDueDate}.`
      : isDelinquency
        ? `Legal notices follow ${propertyContext.legalNoticeSchedule.toLowerCase()} via ${propertyContext.legalNoticeDelivery}. This nudge is separate from those notices.`
        : undefined

  return (
    <SectionShell
      icon={Clock}
      title="Cadence"
      description="How often the agent follows up."
      hint="Controls outreach timing for this scenario: when the first message goes out, how often it repeats, who receives it, quiet hours, and the minimum outstanding balance before the agent reaches out."
    >
      <div className="space-y-5">
        {isDelinquency && (
          <div className="space-y-4">
            <LegalNoticeScheduleCard propertyContext={propertyContext} />
            <DelinquencyOutreachMode
              mode={state.delinquencyMode}
              onChange={(m) => update("delinquencyMode", m)}
            />
          </div>
        )}

        {deferToProperty && (
          <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden />
            <p>
              Payments AI is deferring to your property&apos;s legal notice schedule. Enable &quot;Payments AI
              nudges&quot; above to configure a separate collections nudge cadence and channel preference.
            </p>
          </div>
        )}

        <div className="space-y-5">
        <div className={cn("grid items-start gap-6", showNudgeCadence ? "lg:grid-cols-2" : "lg:grid-cols-1")}>
          {showNudgeCadence && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Cadence shape
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                  scenarioCadence.badge.cls,
                )}
              >
                {scenarioCadence.badge.label}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Initial contact
                </label>
              <InfoHint
                label={
                  (initialContactHint ? `${initialContactHint} ` : "") +
                  (isEventTrigger
                    ? "The first message fires as soon as the triggering ledger event posts; no day offset applies. " + anchor.help
                    : anchor.help)
                }
              />
            </div>
            <div className="mt-1.5 flex gap-2">
              {!isEventTrigger && (
                <Input
                  type="number"
                  min={0}
                  max={45}
                  value={state.offsetValue}
                  onChange={(e) => update("offsetValue", Math.max(0, Number(e.target.value) || 0))}
                  className="flex-1"
                />
              )}
              <Select
                value={state.offsetDir}
                onValueChange={(v) => update("offsetDir", v as OffsetDir)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anchor.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Repeat
              </label>
              <InfoHint
                label={
                  scenarioCadence.repeatHelp +
                  (ceilingDay != null
                    ? ` Repeats stop before day ${ceilingDay}${nextStepLabel ? ` (when ${nextStepLabel} begins)` : ""}.`
                    : "")
                }
              />
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <ToggleSwitch checked={state.repeatOn} onChange={(v) => update("repeatOn", v)} />
              <span className="text-sm text-foreground">Repeat</span>
              <Input
                type="number"
                min={1}
                max={30}
                value={state.repeatInterval}
                disabled={!state.repeatOn}
                onChange={(e) => update("repeatInterval", Math.max(1, Number(e.target.value) || 1))}
                className="w-20"
              />
              <span className="whitespace-nowrap text-sm text-muted-foreground">days</span>
            </div>
            {repeatsClamped && (
              <div className="mt-2 flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-amber-900">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                <span>
                  Only {projectedDays.length} of {state.maxAttempts} messages fit before {nextStepLabel ?? "the next stage"}{" "}
                  begins on day {ceilingDay}. Later repeats are dropped so this scenario doesn&apos;t overlap the next stage.
                  Shorten the repeat interval or move the start earlier to fit more.
                </span>
              </div>
            )}
          </div>

            {/* Max attempts only applies when the sequence repeats, so it's
                hidden unless Repeat is on. */}
            {state.repeatOn && (
              <div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Max attempts
                  </label>
                  <InfoHint label="The agent stops after this many sends, even if the resident hasn't paid or replied." />
                </div>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={state.maxAttempts}
                  onChange={(e) => update("maxAttempts", Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1.5"
                />
              </div>
            )}

            <div>
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Send reminders to
                </label>
                <InfoHint label={RECIPIENTS_HELP[state.recipients]} />
              </div>
              <Select
                value={state.recipients}
                onValueChange={(v) => update("recipients", v as Recipients)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary residents only</SelectItem>
                  <SelectItem value="primary_guarantors">Primary residents + Guarantors</SelectItem>
                  <SelectItem value="guarantors">Guarantors only</SelectItem>
                  <SelectItem value="all_responsible">All responsible lease holders</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <BalanceThresholdInput
                value={state.minOutstandingBalance}
                onChange={(v) => update("minOutstandingBalance", v)}
                avgRent={avgRent}
                label="Outstanding balance amount — only reach out when balance due is at least:"
              />
            </div>

            {isDelinquency && showNudgeCadence && (
              <div className="rounded-md border border-border bg-zinc-50/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                    Small balance reminder
                    <InfoHint label="Send a lighter reminder for balances under the max but above the floor. Useful for utility or fee balances that don't warrant full delinquency outreach." />
                  </span>
                  <ToggleSwitch
                    checked={state.smallBalanceReminderOn}
                    onChange={(v) => update("smallBalanceReminderOn", v)}
                  />
                </div>
                {state.smallBalanceReminderOn && (
                  <div className="mt-3 space-y-3">
                    <BalanceThresholdInput
                      value={state.smallBalanceFloor}
                      onChange={(v) => update("smallBalanceFloor", v)}
                      avgRent={avgRent}
                      label="Floor"
                    />
                    <BalanceThresholdInput
                      value={state.smallBalanceMax}
                      onChange={(v) => update("smallBalanceMax", v)}
                      avgRent={avgRent}
                      label="Ceiling"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Stop conditions live in the Cadence Shape column. */}
            <div className="border-t border-border pt-4">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Stop conditions
              </label>
              <div className="mt-1.5 divide-y divide-border rounded-md border border-border bg-white">
                <div className="flex items-center justify-between gap-3 p-3">
                  <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                    Pause sequence when resident shares an expected payment date
                    <InfoHint label="If the resident commits to a date they'll pay by, hold further outreach for this scenario until that date passes (then resume if still unpaid)." />
                  </span>
                  <ToggleSwitch checked={state.pauseOnExpectedPayDate} onChange={(v) => update("pauseOnExpectedPayDate", v)} />
                </div>
                <div className="flex items-center justify-between gap-3 p-3">
                  <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                    Pause sequence on any inbound reply
                    <InfoHint label="If the resident replies, even just to ask a question, pause this cadence until a human resumes it." />
                  </span>
                  <ToggleSwitch checked={state.pauseOnReply} onChange={(v) => update("pauseOnReply", v)} />
                </div>
                <div className="flex items-center justify-between gap-3 p-3">
                  <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                    Pause sequence once resident enters eviction proceedings
                    <InfoHint label="Stop this scenario's outreach once formal eviction proceedings begin, so automated messaging doesn't conflict with the legal process." />
                  </span>
                  <ToggleSwitch checked={state.pauseOnEviction} onChange={(v) => update("pauseOnEviction", v)} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {STOP_CHIPS_LOCKED.map((chip) => (
                  <LockedStopChip key={chip} label={chip} />
                ))}
                {state.scenario === "pastResident" && <LockedStopChip label="Move-out completed" />}
                <InfoHint label="Locked stop conditions are mandatory; they fire regardless of cadence settings." />
              </div>
            </div>
          </div>
          )}

          {/* ─── Column 2: Delivery Window ─── */}
          <div className="space-y-4">
            <div className="flex items-center border-b border-border pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Delivery window
              </span>
            </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Channel, quiet hours &amp; days
                </label>
                <InfoHint label="Channel, quiet hours, and days of week the agent uses to reach residents. These are set once at the property level and shared by every scenario. Turn on Override to give this scenario its own delivery window." />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {state.deliveryOverride
                  ? "This scenario uses its own channel, quiet hours, and days."
                  : "Editing the shared property defaults. Changes apply to every scenario that inherits."}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
              Override
              <ToggleSwitch
                checked={state.deliveryOverride}
                onChange={(v) => update("deliveryOverride", v)}
              />
            </span>
          </div>

          {/* Controls stay editable in both modes: inheriting edits the shared
              property defaults; overriding edits this scenario's own values.
              The amber banner below makes the property-wide effect explicit. */}
          <div className="mt-4 space-y-5">
            {!state.deliveryOverride && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  Shared across all scenarios. Editing these changes the property
                  default for every scenario that hasn&apos;t set its own override.
                </span>
              </div>
            )}

            {/* Channel preference */}
            <div>
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Channel preference
                </label>
                <InfoHint label="Which channel the agent uses to reach the resident. “SMS Only” texts the resident, “Email Only” emails them, and “SMS & Email” sends both at once for maximum reach." />
              </div>
              <Select
                value={eff.channel}
                onValueChange={(v) =>
                  update(state.deliveryOverride ? "channel" : "defaultChannel", v as ChannelPref)
                }
              >
                <SelectTrigger className="mt-1.5 max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms_only">SMS Only</SelectItem>
                  <SelectItem value="email_only">Email Only</SelectItem>
                  <SelectItem value="sms_email">SMS &amp; Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quiet hours */}
            <div>
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Quiet hours
                </label>
                <InfoHint label="Local property time. The agent never messages outside this window." />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-muted-foreground">Allow between</span>
                <Select
                  value={String(eff.quietStart)}
                  onValueChange={(v) =>
                    update(state.deliveryOverride ? "quietStart" : "defaultQuietStart", Number(v))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUIET_HOUR_OPTIONS.map((opt) => (
                      <SelectItem key={`s-${opt.value}`} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">and</span>
                <Select
                  value={String(eff.quietEnd)}
                  onValueChange={(v) =>
                    update(state.deliveryOverride ? "quietEnd" : "defaultQuietEnd", Number(v))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUIET_HOUR_OPTIONS.map((opt) => (
                      <SelectItem key={`e-${opt.value}`} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Days of week — kept on a single row. */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Days of week
              </label>
              <div className="mt-1.5 flex flex-nowrap items-center gap-1">
                {DAY_LABELS.map((d) => {
                  const on = eff.days[d.id]
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() =>
                        update(
                          state.deliveryOverride ? "days" : "defaultDays",
                          { ...eff.days, [d.id]: !on },
                        )
                      }
                      className={cn(
                        "inline-flex h-9 flex-1 min-w-0 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                        on
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-border bg-white text-muted-foreground hover:bg-zinc-50",
                      )}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Send on holidays */}
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Send on holidays
                  <InfoHint label="When off, messages scheduled for a holiday or other blocked day are sent the next available business day instead." />
                </span>
                <ToggleSwitch
                  checked={state.defaultSendOnHolidays}
                  onChange={(v) => update("defaultSendOnHolidays", v)}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {state.defaultSendOnHolidays
                  ? "Messages send on holidays and other blocked days as scheduled."
                  : "Scheduled communications that land on a blocked day will be sent the next available business day."}
              </p>
            </div>
          </div>
          </div>
        </div>

        {/* Prediction */}
        {showNudgeCadence && (
        <div className="flex items-start gap-2 rounded-md border border-dashed border-border bg-zinc-50/40 px-3 py-2 text-xs text-muted-foreground">
          <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <div className="space-y-0.5">
            <p>
              Predicted next message: <span className="font-medium text-foreground">{prediction}</span>
            </p>
            {state.scenario !== "pastResident" && (
              <p>
                On the cycle: sends on{" "}
                <span className="font-medium text-foreground">
                  {projectedDays.length === 1 ? `day ${firstDay}` : `days ${projectedDays.join(", ")}`}
                </span>{" "}
                ({projectedDays.length} {projectedDays.length === 1 ? "message" : "messages"}).
              </p>
            )}
          </div>
        </div>
        )}
        </div>

      </div>
    </SectionShell>
  )
}

const STOP_CHIPS_LOCKED = [
  "Paid in full",
  "Resident has active auto payment",
  "Resident replied STOP",
  "Escalated to human",
]

function LockedStopChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {label}
      <span className="text-[10px] uppercase opacity-60">locked</span>
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Workflow guardrails section — L4 autonomy controls
   ══════════════════════════════════════════════════════════════════════════ */

function WorkflowGuardrailsSection({
  state,
  update,
  propertyContext,
  avgRent,
  activeScenario,
}: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
  propertyContext: PropertyContextView
  avgRent: number
  activeScenario: ScenarioId
}) {
  return (
    <SectionShell
      icon={ShieldCheck}
      title="Workflow guardrails"
      description="Rules that keep the agent inside its rails: what it can decide on its own, and when it must pause."
      hint="One centralized guardrails page for this property. Global rules apply to every scenario; phase-specific rules apply only where labeled."
      headerAction={
        <Badge variant="gray" className="text-[10px]">
          Property-wide
        </Badge>
      }
    >
      <div className="space-y-7">
        <RepaymentAgreementsSection state={state} update={update} avgRent={avgRent} />
        <FlexAvailabilitySection state={state} update={update} />
        <PaymentActionsSection state={state} update={update} />
        <ResidentEligibilitySection state={state} update={update} activeScenario={activeScenario} />
        <ContextAwareOutreachSection state={state} update={update} propertyContext={propertyContext} />

        {/* ─── Reliability guards ─── */}
        <GuardrailSubsection
          title="Reliability guards"
          description="Catch the agent before it loops or fails open."
          scope="global"
        >
          <GuardrailRule
            title="Tool-call failure cap"
            description="Pause the conversation and escalate after this many consecutive ledger or payment tool-call failures."
            hint="Stops the agent from talking to a resident when its underlying tools (ledger lookups, payment calls) keep failing; it escalates to a human instead of guessing."
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Input
                type="number"
                min={1}
                max={20}
                value={state.toolFailureCap}
                onChange={(e) => update("toolFailureCap", Math.max(1, Number(e.target.value) || 1))}
                className="h-8 w-16 text-sm"
              />
              <span className="text-muted-foreground">consecutive failures before pause</span>
            </div>
          </GuardrailRule>

          <GuardrailRule
            title="Loop / repetition guard"
            description="Pause if the agent has sent this many near-identical outbound messages with no inbound engagement."
            hint="Prevents the agent from repeatedly sending the same message into the void; after this many ignored, near-identical sends, it pauses outreach."
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Input
                type="number"
                min={1}
                max={20}
                value={state.loopGuardCount}
                onChange={(e) => update("loopGuardCount", Math.max(1, Number(e.target.value) || 1))}
                className="h-8 w-16 text-sm"
              />
              <span className="text-muted-foreground">identical messages with no engagement</span>
            </div>
          </GuardrailRule>
        </GuardrailSubsection>

        {/* ─── Autonomy ceilings ─── */}
        <GuardrailSubsection
          title="Autonomy ceilings"
          description="Spend limits and portfolio-level drift detection."
          scope="global"
        >
          <GuardrailRule
            title="Fee-waiver auto-approval ceiling"
            description="The agent can waive late fees up to this amount on its own. Above the ceiling, a human must approve."
            hint="The largest late-fee waiver the agent can grant without sign-off. Anything above this dollar amount routes to a human for approval."
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Auto-approve up to $</span>
              <Input
                type="number"
                min={0}
                step={5}
                value={state.feeWaiverAutoApproveCap}
                onChange={(e) => update("feeWaiverAutoApproveCap", Math.max(0, Number(e.target.value) || 0))}
                className="h-8 w-24 text-sm"
              />
              <span className="text-muted-foreground">per resident per cycle</span>
            </div>
          </GuardrailRule>

          <GuardrailRule
            title="Drift detection"
            description="Alert ops and freeze new outreach if the agent escalates more than this share of conversations in the last 24 hours."
            hint="A safety net for unusual behavior: if the agent is escalating an abnormally high share of conversations, ops gets alerted and new outreach freezes until reviewed."
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Alert when &gt;</span>
              <Input
                type="number"
                min={1}
                max={100}
                value={state.driftPercentThreshold}
                onChange={(e) => update("driftPercentThreshold", Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                className="h-8 w-16 text-sm"
              />
              <span className="text-muted-foreground">% of conversations escalated in last 24h</span>
            </div>
          </GuardrailRule>
        </GuardrailSubsection>
      </div>
    </SectionShell>
  )
}

function ContextAwareOutreachSection({
  state,
  update,
  propertyContext,
}: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
  propertyContext: PropertyContextView
}) {
  return (
    <GuardrailSubsection
      title="Context-aware outreach"
      description="Use each resident's payment history and prior conversations so follow-ups respect what they already told you."
      scope="global"
    >
      <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-zinc-50/40 px-3 py-2">
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
          Enable context-aware outreach
          <InfoHint label="When on, the agent analyzes ledger and conversation history before each send and adjusts cadence so repeats do not contradict what the resident already committed to or their usual pay pattern." />
        </span>
        <ToggleSwitch
          checked={state.contextAwareOutreachEnabled}
          onChange={(v) => update("contextAwareOutreachEnabled", v)}
        />
      </div>

      {state.contextAwareOutreachEnabled && (
        <>
          <GuardrailRule
            title="Signals to analyze"
            description="Which resident history the agent reads before deciding whether to send."
            hint="Payment history infers typical pay-day patterns from past ledger activity. Staff threads capture manager-resident agreements logged in Communications (Office, SMS). Payments AI threads capture prior agent outreach and resident replies."
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <span className="flex min-w-0 items-center gap-1.5 text-sm text-foreground">
                  Payment history
                  <InfoHint label="Looks at when the resident has historically paid rent and fees each cycle to infer their typical pay day." />
                </span>
                <ToggleSwitch
                  checked={state.usePaymentHistoryContext}
                  onChange={(v) => update("usePaymentHistoryContext", v)}
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <span className="flex min-w-0 items-center gap-1.5 text-sm text-foreground">
                  Staff &amp; manager threads
                  <InfoHint label="Reads Communications threads where property staff logged pay dates, payment plans, or fee adjustments — e.g. manager agreed resident pays Friday in an Office thread, so the agent defers Friday's reminder." />
                </span>
                <ToggleSwitch
                  checked={state.useStaffManagerThreads}
                  onChange={(v) => {
                    update("useStaffManagerThreads", v)
                    update(
                      "useConversationContext",
                      v || state.usePaymentsAIThreads,
                    )
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <span className="flex min-w-0 items-center gap-1.5 text-sm text-foreground">
                  Payments AI threads
                  <InfoHint label="Reads prior SMS, email, and portal messages between the resident and Payments AI for commitments like “I'll pay Friday.”" />
                </span>
                <ToggleSwitch
                  checked={state.usePaymentsAIThreads}
                  onChange={(v) => {
                    update("usePaymentsAIThreads", v)
                    update(
                      "useConversationContext",
                      v || state.useStaffManagerThreads,
                    )
                  }}
                />
              </div>
            </div>
          </GuardrailRule>

          <GuardrailRule
            title="Committed pay date"
            description="Skip outreach on a date the resident or manager already committed to pay; follow up only if payment still has not posted."
            hint="Example: manager logged “pay $825 by Friday the 14th” in an Office thread — the agent holds Friday's reminder and checks again the next business day if the balance is still open."
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                  Defer on committed pay date
                  <InfoHint label="Requires staff or Payments AI conversation history. Applies across all scenarios that would otherwise send that day." />
                </span>
                <ToggleSwitch
                  checked={state.deferOnCommittedPayDate}
                  onChange={(v) => update("deferOnCommittedPayDate", v)}
                  disabled={!state.useStaffManagerThreads && !state.usePaymentsAIThreads}
                />
              </div>
              {state.deferOnCommittedPayDate && (state.useStaffManagerThreads || state.usePaymentsAIThreads) && (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Accept deferrals up to</span>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={state.committedPayDateMaxDeferDays}
                      onChange={(e) =>
                        update("committedPayDateMaxDeferDays", Math.max(1, Math.min(60, Number(e.target.value) || 7)))
                      }
                      className="h-8 w-16 text-sm"
                    />
                    <span className="text-muted-foreground">
                      {state.committedPayDateMaxDeferDays === 1 ? "day" : "days"} past due date
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-sm text-foreground">
                      Escalate unrealistic commitment dates
                      <InfoHint label="If a resident commits to pay beyond the near-term window (e.g. “in three months”), route to a property manager instead of deferring all outreach." />
                    </span>
                    <ToggleSwitch
                      checked={state.committedPayDateEscalateBeyondMax}
                      onChange={(v) => update("committedPayDateEscalateBeyondMax", v)}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">If still unpaid, follow up</span>
                    <Input
                      type="number"
                      min={1}
                      max={7}
                      value={state.committedPayDateFollowUpDays}
                      onChange={(e) =>
                        update("committedPayDateFollowUpDays", Math.max(1, Math.min(7, Number(e.target.value) || 1)))
                      }
                      className="h-8 w-16 text-sm"
                    />
                    <span className="text-muted-foreground">
                      {state.committedPayDateFollowUpDays === 1 ? "day" : "days"} after the committed date
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Example: Jamie committing to pay on the 20th is accepted; “I&apos;ll pay in three months” triggers escalation
                    when enabled. Works with per-scenario{" "}
                    <span className="font-medium text-foreground">Pause sequence when resident shares an expected payment date</span>{" "}
                    in Cadence.
                  </p>
                </>
              )}
            </div>
          </GuardrailRule>

          <GuardrailRule
            title="Typical pay day"
            description="Do not nudge until the resident's usual pay day in the cycle has passed without payment."
            hint="Example: if the resident usually pays on the 2nd, the agent waits until the 3rd (or later) before sending a reminder, unless they already committed to a different date."
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                  Respect typical pay day
                  <InfoHint label="Requires payment history. Nudges are suppressed until after the inferred pay day when the balance is still open." />
                </span>
                <ToggleSwitch
                  checked={state.respectTypicalPayDay}
                  onChange={(v) => update("respectTypicalPayDay", v)}
                  disabled={!state.usePaymentHistoryContext}
                />
              </div>
              {state.respectTypicalPayDay && state.usePaymentHistoryContext && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Require at least</span>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    value={state.typicalPayDayMinHistoryMonths}
                    onChange={(e) =>
                      update("typicalPayDayMinHistoryMonths", Math.max(1, Math.min(24, Number(e.target.value) || 1)))
                    }
                    className="h-8 w-16 text-sm"
                  />
                  <span className="text-muted-foreground">months of payment history before inferring a pattern</span>
                </div>
              )}
            </div>
          </GuardrailRule>

          <GuardrailRule
            title="On-time payer grace"
            description="Give residents with strong payment history extra days before the first nudge when they are only slightly late."
            hint="Addresses feedback from operators: on-time payers should not be bothered for minor delays. When on-time rate meets the threshold, the agent waits N days after typical pay day before sending the first reminder."
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                  Enable on-time payer grace
                  <InfoHint label="Requires payment history. Residents at or above the on-time rate threshold get additional grace days before early-cycle reminders." />
                </span>
                <ToggleSwitch
                  checked={state.onTimePayerGraceEnabled}
                  onChange={(v) => update("onTimePayerGraceEnabled", v)}
                  disabled={!state.usePaymentHistoryContext}
                />
              </div>
              {state.onTimePayerGraceEnabled && state.usePaymentHistoryContext && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">When on-time rate is at least</span>
                  <Input
                    type="number"
                    min={50}
                    max={100}
                    value={state.onTimePayerMinRate}
                    onChange={(e) =>
                      update("onTimePayerMinRate", Math.max(50, Math.min(100, Number(e.target.value) || 90)))
                    }
                    className="h-8 w-16 text-sm"
                  />
                  <span className="text-muted-foreground">%, wait</span>
                  <Input
                    type="number"
                    min={1}
                    max={14}
                    value={state.onTimePayerGraceDays}
                    onChange={(e) =>
                      update("onTimePayerGraceDays", Math.max(1, Math.min(14, Number(e.target.value) || 3)))
                    }
                    className="h-8 w-16 text-sm"
                  />
                  <span className="text-muted-foreground">
                    {state.onTimePayerGraceDays === 1 ? "day" : "days"} after typical pay day before first nudge
                  </span>
                </div>
              )}
            </div>
          </GuardrailRule>

          <div className="rounded-lg border border-dashed border-border bg-zinc-50/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">How this affects cadence</p>
            <p className="mt-1">
              Scheduled repeats still appear on the Collection journey, but the agent skips sends that would conflict
              with a committed pay date (including agreements logged by staff), a resident who has not yet reached their
              typical pay day, or an on-time payer still within the grace window. Per-scenario{" "}
              <span className="font-medium text-foreground">Pause sequence when resident shares an expected payment date</span>{" "}
              in Cadence complements this guardrail for scenarios where conversation parsing is unavailable.
            </p>
          </div>
        </>
      )}
    </GuardrailSubsection>
  )
}

function ResidentEligibilitySection({
  state,
  update,
  activeScenario,
}: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
  activeScenario: ScenarioId
}) {
  const factorEntries = [
    { key: "latePayments" as const, label: "Late payment history" },
    { key: "returnedPayments" as const, label: "Returned payments" },
    { key: "chargebacks" as const, label: "Chargebacks" },
    { key: "violations" as const, label: "Lease violations" },
    { key: "complaints" as const, label: "Resident complaints" },
  ]

  const setFactor = (
    key: keyof PanelState["eligibilityFactors"],
    patch: Partial<{ enabled: boolean; weight: number }>,
  ) => {
    update("eligibilityFactors", {
      ...state.eligibilityFactors,
      [key]: { ...state.eligibilityFactors[key], ...patch },
    })
  }

  const setRule = (scenario: ScenarioId, band: ScoreBand, action: EligibilityAction) => {
    update("eligibilityRules", {
      ...state.eligibilityRules,
      [scenario]: { ...state.eligibilityRules[scenario], [band]: action },
    })
  }

  return (
    <GuardrailSubsection
      title="Resident eligibility"
      description="Score residents from payment history and route outreach by scenario based on risk band."
      scope="phase"
    >
      <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-zinc-50/40 px-3 py-2">
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
          Enable resident scoring
          <InfoHint label="When on, the agent computes a resident score from the factors below and applies per-scenario rules before sending outreach." />
        </span>
        <ToggleSwitch checked={state.eligibilityEnabled} onChange={(v) => update("eligibilityEnabled", v)} />
      </div>

      {state.eligibilityEnabled && (
        <>
          <GuardrailRule
            title="Score factors"
            description="Property-wide signals that contribute to a resident risk score."
            hint="Toggle each factor on or off and set its weight. Higher combined scores push residents into moderate or poor bands."
          >
            <div className="space-y-2">
              {factorEntries.map((f) => {
                const factor = state.eligibilityFactors[f.key]
                return (
                  <div key={f.key} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch checked={factor.enabled} onChange={(v) => setFactor(f.key, { enabled: v })} />
                      <span className="text-sm text-foreground">{f.label}</span>
                      <InfoHint label={FACTOR_SCOPE_HINTS[f.key]} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Weight</span>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        disabled={!factor.enabled}
                        value={factor.weight}
                        onChange={(e) => setFactor(f.key, { weight: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                        className="h-7 w-14 text-xs"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-muted-foreground">Moderate band starts at score</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={state.eligibilityThresholdModerate}
                onChange={(e) => update("eligibilityThresholdModerate", Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                className="h-8 w-16 text-sm"
              />
              <span className="text-muted-foreground">Poor band starts at</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={state.eligibilityThresholdPoor}
                onChange={(e) => update("eligibilityThresholdPoor", Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                className="h-8 w-16 text-sm"
              />
            </div>
          </GuardrailRule>

          <GuardrailRule
            title="Per-scenario rules by score band"
            description="What the agent does for each scenario when a resident falls in a score band."
            hint="Example: skip Delinquency nudges for chronic repeat-offenders and let the legal notice path run; route borderline Past Resident cases to a human."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 pr-3 font-semibold">Scenario</th>
                    {SCORE_BANDS.map((b) => (
                      <th key={b.id} className="px-2 py-2 font-semibold">
                        <span className="flex items-center gap-1">
                          {b.label}
                          <InfoHint label={b.description} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SCENARIOS.filter((s) => !s.outOfScope).map((s) => (
                    <tr key={s.id} className="border-b border-border/60">
                      <td className="py-2 pr-3 font-medium text-foreground">{s.shortLabel}</td>
                      {SCORE_BANDS.map((b) => (
                        <td key={b.id} className="px-2 py-2">
                          <Select
                            value={state.eligibilityRules[s.id][b.id]}
                            onValueChange={(v) => setRule(s.id, b.id, v as EligibilityAction)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ELIGIBILITY_ACTIONS.map((a) => (
                                <SelectItem key={a.value} value={a.value}>
                                  {a.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GuardrailRule>

          <ScoringPreviewCard
            factors={state.eligibilityFactors}
            thresholdModerate={state.eligibilityThresholdModerate}
            thresholdPoor={state.eligibilityThresholdPoor}
            scenarioLabel={SCENARIOS.find((s) => s.id === activeScenario)?.shortLabel ?? "Scenario"}
            scenarioAction={state.eligibilityRules[activeScenario].moderate}
          />

          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <p>
              Eligibility rules must comply with fair-housing requirements. Review scoring factors and band
              thresholds with legal before enabling in production. Weights are property-configurable; the scoring
              algorithm is platform-defined.
            </p>
          </div>
        </>
      )}
    </GuardrailSubsection>
  )
}

function GuardrailSubsection({
  title,
  description,
  scope,
  children,
}: {
  title: string
  description: string
  scope?: "global" | "phase"
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        {description && <InfoHint label={description} />}
        {scope === "global" && (
          <Badge variant="gray" className="ml-auto text-[9px]">
            Global — all scenarios
          </Badge>
        )}
        {scope === "phase" && (
          <Badge variant="gray" className="ml-auto text-[9px]">
            Phase-specific
          </Badge>
        )}
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  )
}

function GuardrailRule({
  title,
  description,
  hint,
  children,
}: {
  title: string
  /** Folded into the on-hover (i) tooltip together with `hint`. */
  description: string
  hint?: string
  children: React.ReactNode
}) {
  const tip = [description, hint].filter(Boolean).join(" ")
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {tip && <InfoHint label={tip} />}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Toggle switch — matches the inline switch style used in the HTML prototype
   ══════════════════════════════════════════════════════════════════════════ */

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/30 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-zinc-900" : "bg-zinc-300",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Footer
   ══════════════════════════════════════════════════════════════════════════ */

function FooterActionBar({
  dirty,
  onSave,
  onDiscard,
  bulkMode = false,
  bulkCount = 0,
}: {
  dirty: boolean
  onSave: () => void
  onDiscard: () => void
  bulkMode?: boolean
  bulkCount?: number
}) {
  return (
    <footer
      className={cn(
        "absolute inset-x-0 bottom-0 border-t bg-white px-8 py-3 transition-all",
        dirty ? "border-amber-200 bg-amber-50" : "border-border",
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <div className="text-xs">
          {dirty ? (
            <span className="font-medium text-amber-900">
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> Unsaved changes; won&apos;t take effect until saved.
            </span>
          ) : (
            <span className="text-muted-foreground">No pending changes</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDiscard} disabled={!dirty}>
            {bulkMode ? "Reset" : "Discard"}
          </Button>
          <Button size="sm" onClick={onSave} disabled={!dirty}>
            {bulkMode ? `Apply to ${bulkCount} ${bulkCount === 1 ? "property" : "properties"}` : "Save changes"}
          </Button>
        </div>
      </div>
    </footer>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════════════════════ */

function formatHour(h: number) {
  const n = Math.max(0, Math.min(23, h))
  const ampm = n >= 12 ? "PM" : "AM"
  const display = n === 0 ? 12 : n > 12 ? n - 12 : n
  return `${display}:00 ${ampm}`
}
