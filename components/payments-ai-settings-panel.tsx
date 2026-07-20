"use client"

/**
 * Payments AI — per-property settings panel.
 *
 * Renders inside the agent-roster slide-out in the "Payments AI Settings"
 * left-nav tab (replaces the PaymentsPage flyout for the agent-settings tab).
 *
 * Scope: property-level. This view is tuned for an L4 autonomous agent —
 * scenario selection lives inside each settings card, and Workflow guardrails
 * own the rules that keep the agent inside its rails (repayment policy,
 * eligibility scoring, context-aware timing, stop conditions, autonomy
 * ceilings). Escalation categories are hardcoded and described in the system
 * prompt (§11); they are not PM-editable settings.
 */

import React, { useCallback, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Ban,
  Calendar,
  CalendarRange,
  ChevronDown,
  Clock,
  FileWarning,
  Gavel,
  History,
  Info,
  Lock,
  MessageSquareText,
  Receipt,
  ShieldCheck,
  UserCheck,
  UserMinus,
} from "lucide-react"
import { BalanceThresholdInput } from "@/components/payments-ai/balance-threshold-input"
import { ScoringPreviewCard } from "@/components/payments-ai/scoring-preview-card"
import { FACTOR_SCOPE_HINTS, SEVERITY_BREAKPOINT_LABELS } from "@/lib/payments-ai-eligibility"
import {
  resolvePropertySettings,
  toPropertyContext,
  type ResolvedPropertySettings,
} from "@/lib/payments-ai-property-settings"
import {
  fixedThreshold,
  formatBalanceThreshold,
  type BalanceThreshold,
} from "@/lib/payments-ai-thresholds"

/* ══════════════════════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════════════════════ */

type ScenarioId = "initial" | "late" | "legal"
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
type ToneId = "friendly" | "professional" | "student-casual"
type EligibilityAction = "continue" | "skip"
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
]

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
]

/** Default outreach copy per scenario. Empty by default — the property fills
 *  these in when they enable custom text for a scenario. When left blank the
 *  platform default opener is used. */
const SCENARIO_MESSAGES: Record<ScenarioId, { emailSubject: string; emailCustomText: string; smsCustomText: string }> = {
  initial: { emailSubject: "", emailCustomText: "", smsCustomText: "" },
  late: { emailSubject: "", emailCustomText: "", smsCustomText: "" },
  legal: { emailSubject: "", emailCustomText: "", smsCustomText: "" },
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

/** Nine anchor events that define the collection lifecycle, from charge
 *  posting in the prior month through the balance being handed to a
 *  third-party collections agency. */
type JourneyEventKey =
  | "chargesPosted"
  | "rentDue"
  | "firstDelinquencyNotice"
  | "lateFees"
  | "secondDelinquencyNotice"
  | "eviction"
  | "financialMoveout"
  | "firstCollectionsNotice"
  | "balanceSentToCollections"

/** Numeric day (relative to rent-due = day 0) for each event. Charges Posted
 *  uses `chargesPostedStart` / `chargesPostedEnd` for the track pill when the
 *  posting window spans multiple days; a single posting day shows a marker only. */
type JourneyAnchors = Record<JourneyEventKey, number> & {
  chargesPostedStart: number
  chargesPostedEnd: number
}

/** Convert a day-of-prior-month (1..31) to a signed offset relative to rent
 *  due (day 0). The 31st of the prior month = day -1 (the day before the 1st
 *  of the current month). */
function priorMonthDayToOffset(day: number, monthLen = 31): number {
  return -(monthLen - day + 1)
}

/** Derive the 9 anchor event days for a property from its resolved settings. */
function deriveJourneyAnchors(resolved: ResolvedPropertySettings): JourneyAnchors {
  const chargesPostedStart = priorMonthDayToOffset(resolved.chargesPostedStartDay)
  const chargesPostedEnd = priorMonthDayToOffset(resolved.chargesPostedEndDay)
  const rentDue = 0
  const firstDelinquencyNotice = rentDue + resolved.delinquencyBeginDays
  const lateFees = rentDue + (resolved.lateFeeDay - resolved.rentDueDay)
  const secondDelinquencyNotice = firstDelinquencyNotice + resolved.secondDelinquencyDaysAfterFirst
  const eviction = secondDelinquencyNotice + resolved.evictionDaysAfterFinalDelinquency
  const financialMoveout = eviction + resolved.financialMoveoutDaysAfterEviction
  const firstCollectionsNotice = financialMoveout + resolved.firstCollectionsNoticeDaysAfterFmo
  const balanceSentToCollections =
    firstCollectionsNotice + resolved.balanceToCollectionsDaysAfterFirstCollectionsNotice
  return {
    chargesPosted: chargesPostedStart,
    chargesPostedStart,
    chargesPostedEnd,
    rentDue,
    firstDelinquencyNotice,
    lateFees,
    secondDelinquencyNotice,
    eviction,
    financialMoveout,
    firstCollectionsNotice,
    balanceSentToCollections,
  }
}

/** Ordered journey steps on the shared axis. `start` is where the scenario's
 *  outreach window opens; the next step's `start` is the hard ceiling its
 *  repeats may not cross. */
function makeJourneySteps(a: JourneyAnchors): { id: ScenarioId; start: number; ceiling: number }[] {
  return [
    { id: "initial", start: a.rentDue, ceiling: a.lateFees },
    { id: "late", start: a.lateFees, ceiling: a.secondDelinquencyNotice },
    { id: "legal", start: a.secondDelinquencyNotice, ceiling: a.financialMoveout },
  ]
}

/** Which anchor event a given offset direction is measured against. */
function anchorDayForDir(dir: OffsetDir, a: JourneyAnchors): number {
  switch (dir) {
    case "on_charges_posted":
      return a.chargesPostedStart
    case "before_due":
    case "after_due":
      return a.rentDue
    case "before_fees":
    case "after_fees":
    case "on_late_fees":
      return a.lateFees
    case "before_eviction":
    case "after_eviction":
    case "on_notice":
      return a.eviction
    case "after_charges_due":
    case "day_of_month":
      return a.rentDue
    case "after_moveout":
    case "after_fmo":
      return a.financialMoveout
    default:
      return a.rentDue
  }
}

/** Day the first message fires on the signed axis. */
function firstMessageDay(
  s: Pick<ScenarioSettings, "offsetValue" | "offsetDir">,
  a: JourneyAnchors,
): number {
  const anchor = anchorDayForDir(s.offsetDir, a)
  const clamp = (d: number) => clampToAxis(d, a)
  switch (s.offsetDir) {
    case "before_due":
    case "before_fees":
    case "before_eviction":
      return clamp(anchor - s.offsetValue)
    case "after_due":
    case "after_fees":
    case "after_eviction":
    case "after_charges_due":
    case "after_moveout":
    case "after_fmo":
      return clamp(anchor + s.offsetValue)
    case "day_of_month":
      // "day_of_month" interprets offsetValue as day-of-cycle (1..31). On the
      // signed axis, day-of-cycle N corresponds to (N - rentDueDay) relative
      // to rent due. Property defaults have rentDue = 1st, so day N = day
      // (N - 1) on the axis.
      return clamp(s.offsetValue - 1)
    case "on_charges_posted":
    case "on_late_fees":
    case "on_notice":
      return anchor
    default:
      return anchor
  }
}

function clampToAxis(d: number, a: JourneyAnchors): number {
  return Math.max(a.chargesPostedStart, Math.min(a.balanceSentToCollections, Math.round(d)))
}

/** The next journey step's start day — the ceiling this scenario can't repeat past. */
function nextStepStart(scenario: ScenarioId, a: JourneyAnchors): number | null {
  const steps = makeJourneySteps(a)
  const idx = steps.findIndex((s) => s.id === scenario)
  if (idx === -1) return null
  const next = steps[idx + 1]
  return next ? next.start : null
}

/**
 * Project a scenario's send days onto the shared axis, capped by maxAttempts
 * AND by the next journey step's start day (repeats can't bleed into the next
 * stage).
 */
function projectSendDays(
  s: Pick<ScenarioSettings, "offsetValue" | "offsetDir" | "repeatOn" | "repeatInterval" | "maxAttempts">,
  scenario: ScenarioId,
  a: JourneyAnchors,
): number[] {
  const first = firstMessageDay(s, a)
  const days = [first]
  if (s.repeatOn) {
    const ceil = nextStepStart(scenario, a)
    const hardCeil = ceil != null ? ceil - 1 : a.balanceSentToCollections
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

/**
 * Escalation categories are hardcoded as always-on. ELI+ hands off to a
 * property manager whenever any of these fire — hostile sentiment,
 * ask-for-human, hardship/safety signals, legal & compliance mentions,
 * complex payment disputes, and operational issues. Low-confidence
 * replies also escalate, but there is no configurable confidence floor.
 * These categories are described in the system prompt (§11), not exposed
 * as PM-editable settings.
 */

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
 * Settings owned by a single scenario. Each of the three scenarios keeps an
 * independent copy in `PanelState.scenarioStore`. The flat fields on PanelState
 * mirror the *currently selected* scenario so the existing card components can
 * keep reading `state.<field>` unchanged.
 */
interface ScenarioSettings {
  // Whether this scenario is active. When off, the agent runs no outreach
  // or cadence for this scenario at all.
  enabled: boolean
  // Agent identity — per-scenario tone
  agentPersonaTone: ToneId
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
  // Customizable outreach copy for this scenario. Email custom text is
  // included in the body of the reminder email; SMS custom text is appended
  // to the bottom of the standard SMS reminder.
  customTextEnabled: boolean
  emailSubject: string
  emailCustomText: string
  smsCustomText: string
}

/** Keys on PanelState that are scenario-scoped (mirrored to/from the store). */
const SCENARIO_SCOPED_KEYS: (keyof ScenarioSettings)[] = [
  "enabled",
  "agentPersonaTone",
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
  "customTextEnabled",
  "emailSubject",
  "emailCustomText",
  "smsCustomText",
]

interface PanelState extends ScenarioSettings {
  scenario: ScenarioId
  // Agent identity (property-wide branding)
  agentDisplayName: string
  // Per-scenario settings store — source of truth for each scenario.
  scenarioStore: Record<ScenarioId, ScenarioSettings>
  // Property-wide holiday send policy. Channel, quiet hours, and days of week
  // are configured per scenario in Cadence.
  defaultSendOnHolidays: boolean
  // Repayment agreements — property-wide guardrails for agent-created plans
  repaymentOfferAllowed: boolean
  repaymentOfferEnabled: boolean
  repaymentRequireGoodStanding: boolean
  repaymentMinBalance: BalanceThreshold
  repaymentMaxBalance: BalanceThreshold
  /** When the first installment of an ELI+-created plan may begin. */
  repaymentStartMonth: "current" | "next"
  planMaxMonthsAutomated: number
  planRequireApprovalAmount: number
  // When on, ELI+ may create a plan whose final installment falls after the
  // resident's lease end date. When off (default), such plans escalate.
  planAllowExceedLeaseEnd: boolean
  // When on, ELI+ may create a new repayment agreement even if the resident
  // already has one on file. When off (default), any repayment request from
  // a resident with an existing plan escalates to a human.
  planAllowWithActiveAgreement: boolean
  // Resident eligibility scoring — property-wide factors + per-scenario rules
  eligibilityEnabled: boolean
  eligibilityFactors: {
    latePayments: { enabled: boolean; weight: number; severity: [number, number, number, number] }
    paymentFailures: { enabled: boolean; weight: number; severity: [number, number, number, number] }
    violations: { enabled: boolean; weight: number; severity: [number, number, number, number] }
  }
  eligibilityThresholdModerate: number
  eligibilityThresholdPoor: number
  eligibilityRules: Record<ScenarioId, Record<ScoreBand, EligibilityAction>>
  // Context-aware timing rules — ELI+ always reads payment history and prior
  // staff / Payments AI conversations; these rules tune what to do with them.
  escalateExpectedPayDate: boolean
  escalateExpectedPayDateThresholdDays: number
  respectTypicalPayDay: boolean
  typicalPayDayMinHistoryMonths: number
  onTimePayerGraceEnabled: boolean
  onTimePayerGraceDays: number
  onTimePayerMinRate: number
  // Stop conditions — property-wide, applies to every scenario. Exception:
  // `pauseOnMoveOut` only applies to Rent Reminder + Delinquency (Pre-Collections
  // is post-move-out by definition and has its own move-out handling).
  pauseOnExpectedPayDate: boolean
  pauseOnMoveOut: boolean
  // Workflow guardrails — Reliability guards (property-wide)
  toolFailureCap: number
  loopGuardCount: number
  // Workflow guardrails — Autonomy ceilings (property-wide)
  shareFlexAvailability: boolean
  acceptOneTimePayments: boolean
  setupRecurringPayments: boolean
}

function makeEligibilityRulesDefault(): Record<ScenarioId, Record<ScoreBand, EligibilityAction>> {
  return {
    initial: { good: "skip", moderate: "continue", poor: "skip" },
    late: { good: "continue", moderate: "continue", poor: "skip" },
    legal: { good: "skip", moderate: "skip", poor: "skip" },
  }
}

/** Build the default scenario-scoped settings for a single scenario. */
function makeScenarioSettings(scenario: ScenarioId): ScenarioSettings {
  const c = SCENARIO_CADENCE[scenario]
  const meta = SCENARIOS.find((s) => s.id === scenario)
  return {
    enabled: !meta?.outOfScope,
    agentPersonaTone: "professional",
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
    customTextEnabled: false,
    emailSubject: SCENARIO_MESSAGES[scenario].emailSubject,
    emailCustomText: SCENARIO_MESSAGES[scenario].emailCustomText,
    smsCustomText: SCENARIO_MESSAGES[scenario].smsCustomText,
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
  }
}

/** Which scenario-scoped keys belong to each editable area. Used to decide
 *  which areas a bulk save should apply ("only the sections you touched"). */
const CADENCE_KEYS: (keyof ScenarioSettings)[] = [
  "enabled", "offsetValue", "offsetDir", "offsetAnchor", "repeatOn", "repeatInterval",
  "maxAttempts", "recipients", "minOutstandingBalance",
  "channel", "quietStart", "quietEnd", "days",
]
const MESSAGING_KEYS: (keyof ScenarioSettings)[] = [
  "customTextEnabled",
  "emailSubject",
  "emailCustomText",
  "smsCustomText",
]
const DELIVERY_DEFAULT_KEYS: (keyof PanelState)[] = ["defaultSendOnHolidays"]
const REPAYMENT_KEYS: (keyof PanelState)[] = [
  "repaymentOfferAllowed", "repaymentOfferEnabled", "repaymentRequireGoodStanding", "repaymentMinBalance", "repaymentMaxBalance",
  "repaymentStartMonth", "planMaxMonthsAutomated", "planRequireApprovalAmount",
  "planAllowExceedLeaseEnd", "planAllowWithActiveAgreement",
]
const ELIGIBILITY_KEYS: (keyof PanelState)[] = [
  "eligibilityEnabled", "eligibilityFactors", "eligibilityThresholdModerate",
  "eligibilityThresholdPoor", "eligibilityRules",
]
const CONTEXT_OUTREACH_KEYS: (keyof PanelState)[] = [
  "escalateExpectedPayDate", "escalateExpectedPayDateThresholdDays",
  "respectTypicalPayDay", "typicalPayDayMinHistoryMonths",
  "onTimePayerGraceEnabled", "onTimePayerGraceDays", "onTimePayerMinRate",
]
const STOP_CONDITION_KEYS: (keyof PanelState)[] = [
  "pauseOnExpectedPayDate", "pauseOnMoveOut",
]
const GUARDRAIL_KEYS: (keyof PanelState)[] = [
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
  if (scenarioKeysDiffer(MESSAGING_KEYS)) out.push("Custom text")
  if (panelKeysDiffer(REPAYMENT_KEYS)) out.push("Repayment agreements")
  if (panelKeysDiffer(ELIGIBILITY_KEYS)) out.push("Resident eligibility")
  if (panelKeysDiffer(CONTEXT_OUTREACH_KEYS)) out.push("Context-aware outreach")
  if (panelKeysDiffer(STOP_CONDITION_KEYS) || panelKeysDiffer(GUARDRAIL_KEYS)) out.push("Guardrails")
  return out
}

/* ══════════════════════════════════════════════════════════════════════════
   Bulk-edit change diff (granular)
   ══════════════════════════════════════════════════════════════════════════ */

/** A single setting-level change for the bulk confirmation summary. */
type ChangeRow = {
  scope: string
  scenario?: ScenarioId
  setting: string
  oldValue: string
  newValue: string
}

const yesNo = (v: boolean) => (v ? "On" : "Off")
const enabledLabel = (v: boolean) => (v ? "Enabled" : "Disabled")
const scenarioTitle = (sid: ScenarioId) =>
  SCENARIOS.find((s) => s.id === sid)?.title ?? sid

const DAY_LOOKUP: Record<DayKey, string> = {
  sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat",
}

function formatDays(d: DayFlags): string {
  const on = (["sun","mon","tue","wed","thu","fri","sat"] as DayKey[]).filter((k) => d[k])
  if (on.length === 7) return "Every day"
  if (on.length === 0) return "No days"
  return on.map((k) => DAY_LOOKUP[k]).join(", ")
}

const OFFSET_ANCHOR_LABELS: Record<OffsetAnchor, string> = {
  rent_due: "Rent due date",
  late_fees: "Late fees post",
  eviction: "Charges due (Pre-Collections)",
  move_out: "Move-out",
}
const CHANNEL_LABELS: Record<ChannelPref, string> = {
  sms_only: "SMS only",
  email_only: "Email only",
  sms_email: "SMS + Email",
}
const RECIPIENT_LABELS: Record<Recipients, string> = {
  primary: "Primary lease holder",
  primary_guarantors: "Primary + guarantors",
  guarantors: "Guarantors only",
  all_responsible: "All responsible parties",
}
const ELIGIBILITY_ACTION_LABELS: Record<EligibilityAction, string> = {
  continue: "Continue outreach",
  skip: "Skip outreach",
}
const SCORE_BAND_LABELS: Record<ScoreBand, string> = {
  good: "Good",
  moderate: "Moderate",
  poor: "Poor",
}
const ELIGIBILITY_FACTOR_LABELS: Record<keyof PanelState["eligibilityFactors"], string> = {
  latePayments: "Late payments",
  paymentFailures: "Payment failures",
  violations: "Lease violations",
}

const formatThreshold = (t: BalanceThreshold) => formatBalanceThreshold(t)

/** Per-key label + formatter for scenario-scoped fields.  Keys not listed here
 *  are skipped from the diff summary. */
const SCENARIO_FIELD_META: {
  [K in keyof ScenarioSettings]?: {
    scope: "Cadence" | "Custom text"
    label: string
    format: (v: ScenarioSettings[K]) => string
  }
} = {
  enabled:              { scope: "Cadence",     label: "Scenario",                       format: enabledLabel },
  offsetValue:          { scope: "Cadence",     label: "First message offset",           format: (v) => `${v} day${v === 1 ? "" : "s"}` },
  offsetDir:            { scope: "Cadence",     label: "First message timing",           format: (v) => OFFSET_PHRASE[v] ?? String(v) },
  offsetAnchor:         { scope: "Cadence",     label: "First message anchor",           format: (v) => OFFSET_ANCHOR_LABELS[v] ?? String(v) },
  repeatOn:             { scope: "Cadence",     label: "Repeat messages",                format: yesNo },
  repeatInterval:       { scope: "Cadence",     label: "Repeat every",                   format: (v) => `${v} day${v === 1 ? "" : "s"}` },
  maxAttempts:          { scope: "Cadence",     label: "Max messages",                   format: (v) => `${v}` },
  channel:              { scope: "Cadence",     label: "Channel",                        format: (v) => CHANNEL_LABELS[v] ?? String(v) },
  recipients:           { scope: "Cadence",     label: "Recipients",                     format: (v) => RECIPIENT_LABELS[v] ?? String(v) },
  minOutstandingBalance:{ scope: "Cadence",     label: "Only reach out when balance due is at least", format: formatThreshold },
  quietStart:           { scope: "Cadence",     label: "Quiet hours start",              format: formatHour },
  quietEnd:             { scope: "Cadence",     label: "Quiet hours end",                format: formatHour },
  days:                 { scope: "Cadence",     label: "Send days",                      format: formatDays },
  emailSubject:         { scope: "Custom text", label: "Email subject",                  format: (v) => (v ? `"${v}"` : "(empty)") },
  emailCustomText:      { scope: "Custom text", label: "Email custom text",              format: (v) => (v ? `"${v}"` : "(empty)") },
  smsCustomText:        { scope: "Custom text", label: "SMS custom text",                format: (v) => (v ? `"${v}"` : "(empty)") },
  customTextEnabled:    { scope: "Custom text", label: "Custom text",                    format: yesNo },
}

/** Per-key label + formatter for property-wide fields.  Keys not listed here
 *  are skipped from the diff summary. */
const PANEL_FIELD_META: {
  [K in keyof PanelState]?: {
    scope: string
    label: string
    format: (v: PanelState[K]) => string
  }
} = {
  defaultSendOnHolidays:          { scope: "Cadence",            label: "Send on federal holidays",                              format: yesNo },
  // Payment actions — repayment agreements
  repaymentOfferAllowed:          { scope: "Payment actions",    label: "Allow ELI+ to offer repayment agreements",              format: yesNo },
  repaymentOfferEnabled:          { scope: "Payment actions",    label: "Allow ELI+ to create repayment agreements",             format: yesNo },
  repaymentRequireGoodStanding:   { scope: "Payment actions",    label: "Require good standing",                                 format: yesNo },
  repaymentMinBalance:            { scope: "Payment actions",    label: "Minimum balance for repayment agreement",               format: formatThreshold },
  repaymentMaxBalance:            { scope: "Payment actions",    label: "Maximum balance for repayment agreement",               format: formatThreshold },
  repaymentStartMonth:            { scope: "Payment actions",    label: "Start repayments in",                                   format: (v) => (v === "next" ? "Next month" : "Current month") },
  planMaxMonthsAutomated:         { scope: "Payment actions",    label: "ELI+ can create plans up to",                           format: (v) => `${v} month${v === 1 ? "" : "s"}` },
  planRequireApprovalAmount:      { scope: "Payment actions",    label: "Require approval above",                                format: (v) => `$${v.toLocaleString()}` },
  planAllowExceedLeaseEnd:        { scope: "Payment actions",    label: "Allow repayment plans to exceed lease end date",        format: yesNo },
  planAllowWithActiveAgreement:   { scope: "Payment actions",    label: "Allow ELI+ to create plans when an active plan is on file", format: yesNo },
  // Payment actions — payments
  shareFlexAvailability:          { scope: "Payment actions",    label: "Allow ELI+ to share Flex availability",                 format: yesNo },
  acceptOneTimePayments:          { scope: "Payment actions",    label: "Allow ELI+ to accept one-time payments",                format: yesNo },
  setupRecurringPayments:         { scope: "Payment actions",    label: "Allow ELI+ to set up recurring payments",               format: yesNo },
  // Resident eligibility
  eligibilityEnabled:             { scope: "Resident eligibility", label: "Score model",                                         format: enabledLabel },
  eligibilityThresholdModerate:   { scope: "Resident eligibility", label: "Moderate score threshold",                            format: (v) => `${v}` },
  eligibilityThresholdPoor:       { scope: "Resident eligibility", label: "Poor score threshold",                                format: (v) => `${v}` },
  // Context awareness
  escalateExpectedPayDate:        { scope: "Context awareness",  label: "Escalate near expected pay date",                       format: yesNo },
  escalateExpectedPayDateThresholdDays: { scope: "Context awareness", label: "Expected pay date window",                         format: (v) => `${v} day${v === 1 ? "" : "s"}` },
  respectTypicalPayDay:           { scope: "Context awareness",  label: "Respect typical pay day",                               format: yesNo },
  typicalPayDayMinHistoryMonths:  { scope: "Context awareness",  label: "Typical pay day — minimum history",                     format: (v) => `${v} month${v === 1 ? "" : "s"}` },
  onTimePayerGraceEnabled:        { scope: "Context awareness",  label: "On-time payer grace",                                   format: yesNo },
  onTimePayerGraceDays:           { scope: "Context awareness",  label: "On-time payer grace window",                            format: (v) => `${v} day${v === 1 ? "" : "s"}` },
  onTimePayerMinRate:             { scope: "Context awareness",  label: "On-time payer minimum on-time rate",                    format: (v) => `${v}%` },
  // Stop conditions
  pauseOnExpectedPayDate:         { scope: "Stop conditions",    label: "Pause when resident supplies an expected pay date",     format: yesNo },
  pauseOnMoveOut:                 { scope: "Stop conditions",    label: "Pause on move-out",                                     format: yesNo },
}

/** Order of scopes in the confirmation dialog. Any scope not listed appears
 *  after these, in first-seen order. */
const SCOPE_ORDER: string[] = [
  "Cadence",
  "Custom text",
  "Payment actions",
  "Resident eligibility",
  "Context awareness",
  "Stop conditions",
]

function pushRow<K extends keyof ScenarioSettings>(
  out: ChangeRow[],
  scenario: ScenarioId,
  key: K,
  oldVal: ScenarioSettings[K],
  newVal: ScenarioSettings[K],
) {
  const meta = SCENARIO_FIELD_META[key]
  if (!meta) return
  if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return
  out.push({
    scope: meta.scope,
    scenario,
    setting: meta.label,
    oldValue: meta.format(oldVal),
    newValue: meta.format(newVal),
  })
}

function pushPanelRow<K extends keyof PanelState>(
  out: ChangeRow[],
  key: K,
  oldVal: PanelState[K],
  newVal: PanelState[K],
) {
  const meta = PANEL_FIELD_META[key]
  if (!meta) return
  if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return
  out.push({
    scope: meta.scope,
    setting: meta.label,
    oldValue: meta.format(oldVal),
    newValue: meta.format(newVal),
  })
}

/** Build the granular per-setting diff between two panel snapshots.  Consumed
 *  by the bulk-edit confirmation dialog so PMs can review each change (with
 *  scenario context, old value, and new value) before applying to N
 *  properties. */
function computeChangeRows(current: PanelState, pristine: PanelState): ChangeRow[] {
  const rows: ChangeRow[] = []
  const scenarioIds: ScenarioId[] = Object.keys(current.scenarioStore) as ScenarioId[]

  // Per-scenario cadence + custom text
  for (const sid of scenarioIds) {
    const a = current.scenarioStore[sid]
    const b = pristine.scenarioStore[sid]
    if (!a || !b) continue
    for (const key of Object.keys(SCENARIO_FIELD_META) as (keyof ScenarioSettings)[]) {
      pushRow(rows, sid, key, b[key], a[key])
    }
  }

  // Property-wide fields
  for (const key of Object.keys(PANEL_FIELD_META) as (keyof PanelState)[]) {
    pushPanelRow(rows, key, pristine[key], current[key])
  }

  // Resident eligibility — factor weights + enablement (flattened)
  for (const factorKey of Object.keys(current.eligibilityFactors) as (keyof PanelState["eligibilityFactors"])[]) {
    const a = current.eligibilityFactors[factorKey]
    const b = pristine.eligibilityFactors[factorKey]
    if (a.enabled !== b.enabled) {
      rows.push({
        scope: "Resident eligibility",
        setting: `${ELIGIBILITY_FACTOR_LABELS[factorKey]} — factor`,
        oldValue: enabledLabel(b.enabled),
        newValue: enabledLabel(a.enabled),
      })
    }
    if (a.weight !== b.weight) {
      rows.push({
        scope: "Resident eligibility",
        setting: `${ELIGIBILITY_FACTOR_LABELS[factorKey]} — weight`,
        oldValue: `${b.weight}%`,
        newValue: `${a.weight}%`,
      })
    }
  }

  // Resident eligibility — per-scenario per-band actions
  for (const sid of scenarioIds) {
    const scenarioRulesA = current.eligibilityRules[sid]
    const scenarioRulesB = pristine.eligibilityRules[sid]
    if (!scenarioRulesA || !scenarioRulesB) continue
    for (const band of Object.keys(scenarioRulesA) as ScoreBand[]) {
      if (scenarioRulesA[band] !== scenarioRulesB[band]) {
        rows.push({
          scope: "Resident eligibility",
          scenario: sid,
          setting: `${SCORE_BAND_LABELS[band]} score → action`,
          oldValue: ELIGIBILITY_ACTION_LABELS[scenarioRulesB[band]] ?? scenarioRulesB[band],
          newValue: ELIGIBILITY_ACTION_LABELS[scenarioRulesA[band]] ?? scenarioRulesA[band],
        })
      }
    }
  }

  return rows
}

/** Group change rows by scope, preserving SCOPE_ORDER first. */
function groupChangeRows(rows: ChangeRow[]): { scope: string; rows: ChangeRow[] }[] {
  const byScope = new Map<string, ChangeRow[]>()
  for (const r of rows) {
    if (!byScope.has(r.scope)) byScope.set(r.scope, [])
    byScope.get(r.scope)!.push(r)
  }
  const ordered: { scope: string; rows: ChangeRow[] }[] = []
  for (const scope of SCOPE_ORDER) {
    const rs = byScope.get(scope)
    if (rs && rs.length) {
      ordered.push({ scope, rows: rs })
      byScope.delete(scope)
    }
  }
  for (const [scope, rs] of byScope.entries()) {
    ordered.push({ scope, rows: rs })
  }
  return ordered
}

function makeInitialState(): PanelState {
  const store = makeScenarioStore()
  return {
    scenario: "initial",
    agentDisplayName: "Eli",
    scenarioStore: store,
    ...store.initial,
    // Off by default: don't message on holidays; push to next business day.
    defaultSendOnHolidays: false,
    repaymentOfferAllowed: true,
    repaymentOfferEnabled: true,
    repaymentRequireGoodStanding: true,
    repaymentMinBalance: fixedThreshold(50),
    repaymentMaxBalance: fixedThreshold(5000),
    repaymentStartMonth: "current",
    planMaxMonthsAutomated: 3,
    planRequireApprovalAmount: 2000,
    // Default off: escalate plans that would run past the lease end date.
    planAllowExceedLeaseEnd: false,
    // Default off: escalate any plan request from a resident with an active
    // plan on file. Property may opt in.
    planAllowWithActiveAgreement: false,
    eligibilityEnabled: true,
    eligibilityFactors: {
      latePayments: { enabled: true, weight: 40, severity: [30, 55, 75, 100] },
      paymentFailures: { enabled: true, weight: 35, severity: [40, 65, 85, 100] },
      violations: { enabled: true, weight: 25, severity: [50, 80, 100, 100] },
    },
    eligibilityThresholdModerate: 35,
    eligibilityThresholdPoor: 65,
    eligibilityRules: makeEligibilityRulesDefault(),
    escalateExpectedPayDate: true,
    escalateExpectedPayDateThresholdDays: 7,
    respectTypicalPayDay: true,
    typicalPayDayMinHistoryMonths: 3,
    onTimePayerGraceEnabled: true,
    onTimePayerGraceDays: 3,
    onTimePayerMinRate: 90,
    // Stop conditions — property-wide. `pauseOnMoveOut` is scoped in-code to
    // Rent Reminder + Delinquency (Pre-Collections handles move-out separately).
    pauseOnExpectedPayDate: true,
    pauseOnMoveOut: true,
    toolFailureCap: 3,
    loopGuardCount: 4,
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

type DetailTab = "guardrails" | "changelog"

export function PaymentsAISettingsPanel({
  propertyName,
  propertyId,
  agentDisplayLabel = "Payments AI",
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
  const journeyAnchors = useMemo(
    () => deriveJourneyAnchors(resolvedSettings),
    [resolvedSettings],
  )
  const [state, setState] = useState<PanelState>(() => makeInitialState())
  const [pristine, setPristine] = useState<PanelState>(() => makeInitialState())
  const [detailTab, setDetailTab] = useState<DetailTab>("guardrails")
  // Bulk-edit confirmation dialog: opens on "Apply to N properties" so the PM
  // can review each changed setting (with scenario, old value, new value)
  // before we notify the host to apply.
  const [confirmOpen, setConfirmOpen] = useState(false)

  const dirty = useMemo(() => JSON.stringify(state) !== JSON.stringify(pristine), [state, pristine])

  const update = <K extends keyof PanelState>(key: K, value: PanelState[K]) =>
    setState((s) => ({ ...s, [key]: value }))

  // Fold the in-flight scenario edits into the store so change detection sees
  // the current selection's edits.
  const syncedState = useMemo(
    () => ({ ...state, scenarioStore: { ...state.scenarioStore, [state.scenario]: extractScenarioSettings(state) } }),
    [state],
  )

  // Which of the four editable areas changed vs the opening snapshot. Drives
  // the "only the sections you touched" bulk apply.
  const changedSections = useMemo(
    () => computeChangedSections(syncedState, pristine),
    [syncedState, pristine],
  )

  // Granular per-setting diff used by the bulk confirmation dialog.
  const changeRows = useMemo(
    () => computeChangeRows(syncedState, pristine),
    [syncedState, pristine],
  )

  const handleSave = () => {
    if (bulkMode) {
      setConfirmOpen(true)
      return
    }
    setState(syncedState)
    setPristine(syncedState)
  }
  const handleConfirmBulkApply = () => {
    onBulkApply?.(changedSections)
    setConfirmOpen(false)
  }
  const handleCancelBulkApply = () => setConfirmOpen(false)
  const handleDiscard = () => setState(pristine)

  const handleScenarioChange = (scenario: ScenarioId) =>
    setState((s) => switchScenario(scenario, s))

  const handleScenarioEnabledToggle = (enabled: boolean) => {
    const meta = SCENARIOS.find((s) => s.id === state.scenario)
    if (meta?.outOfScope) return
    setState((s) => ({ ...s, enabled }))
  }

  const handleScenarioMessageChange = (
    scenarioId: ScenarioId,
    field: "emailSubject" | "emailCustomText" | "smsCustomText",
    value: string,
  ) => {
    setState((prev) => {
      const stored =
        scenarioId === prev.scenario ? extractScenarioSettings(prev) : prev.scenarioStore[scenarioId]
      const nextScenarioSettings = { ...stored, [field]: value }
      const scenarioStore = { ...prev.scenarioStore, [scenarioId]: nextScenarioSettings }
      if (scenarioId === prev.scenario) {
        return { ...prev, [field]: value, scenarioStore }
      }
      return { ...prev, scenarioStore }
    })
  }

  const handleCustomTextEnabledToggle = (scenarioId: ScenarioId, enabled: boolean) => {
    setState((prev) => {
      const stored =
        scenarioId === prev.scenario ? extractScenarioSettings(prev) : prev.scenarioStore[scenarioId]
      const nextScenarioSettings = { ...stored, customTextEnabled: enabled }
      const scenarioStore = { ...prev.scenarioStore, [scenarioId]: nextScenarioSettings }
      if (scenarioId === prev.scenario) {
        return { ...prev, customTextEnabled: enabled, scenarioStore }
      }
      return { ...prev, scenarioStore }
    })
  }

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
                  <strong>{propertyName}</strong>. Pick a scenario in the tab bar; it stays pinned while you tune that
                  scenario&apos;s cadence and messaging.</>
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
                    : "Change any Guardrails setting below. Only the areas you change will be applied."}
                </p>
              </div>
            </div>
          )}
          {/* Single-column layout: two primary tabs — Guardrails (which hosts
              per-scenario Cadence, Custom Text, the property-wide Collection
              journey, and property-wide guardrails) and Change Log
              (property-wide audit trail). Per-scenario blocks inside Cadence
              dim when the active scenario is disabled; property-wide blocks
              never dim. */}
          <div className="min-w-0 flex-1 space-y-4">
            <DetailTabBar active={detailTab} onChange={setDetailTab} />

            <div className="space-y-6">
              {detailTab === "guardrails" && (
                <>
                  <CadenceSection
                    state={state}
                    update={update}
                    propertyContext={propertyContext}
                    avgRent={resolvedSettings.avgRent}
                    anchors={journeyAnchors}
                    scenarioStore={state.scenarioStore}
                    onScenarioChange={handleScenarioChange}
                    onScenarioEnabledToggle={handleScenarioEnabledToggle}
                  />

                  <CustomTextSection
                    activeScenario={state.scenario}
                    scenarioStore={state.scenarioStore}
                    current={state}
                    onMessageChange={handleScenarioMessageChange}
                    onCustomTextEnabledToggle={handleCustomTextEnabledToggle}
                  />

                  <JourneyTimeline
                    store={state.scenarioStore}
                    current={state}
                    active={state.scenario}
                    onChange={handleScenarioChange}
                    propertyContext={propertyContext}
                    resolvedSettings={resolvedSettings}
                    anchors={journeyAnchors}
                  />

                  <SectionShell
                    icon={Receipt}
                    title="Payment actions"
                    description="What actions ELI+ can take on the resident's balance during a conversation — creating repayment agreements, running one-time full-balance payments, enrolling recurring payments, and sharing Flex availability."
                  >
                    <div className="space-y-4">
                      <p className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-1.5 text-xs text-amber-900">
                        ELI+ will only offer repayment agreements when repayment agreements are allowed in your property settings.
                      </p>
                      <RepaymentAgreementsSection state={state} update={update} avgRent={resolvedSettings.avgRent} />
                      <div className="grid gap-4 md:grid-cols-2">
                        <PaymentActionsSection state={state} update={update} />
                        <FlexAvailabilitySection state={state} update={update} />
                      </div>
                    </div>
                  </SectionShell>

                  <SectionShell
                    icon={UserCheck}
                    title="Resident eligibility"
                    description="Score residents from payment history and route outreach by scenario based on risk band. When on, ELI+ computes a score from the factors below and applies per-scenario rules before sending outreach."
                  >
                    <p className="mb-4 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-1.5 text-xs text-amber-900">
                      Compliance note: eligibility scoring may be subject to fair-housing rules and company policy. Review with legal before enabling in production.
                    </p>
                    <ResidentEligibilitySection state={state} update={update} activeScenario={state.scenario} />
                  </SectionShell>

                  <SectionShell
                    icon={History}
                    title="Context awareness"
                    description="How ELI+ uses payment history and prior conversation context (staff, manager, and Payments AI threads) when deciding to reach out or escalate."
                  >
                    <ContextAwareOutreachSection state={state} update={update} propertyContext={propertyContext} />
                  </SectionShell>

                  <SectionShell
                    icon={Ban}
                    title="Stop conditions"
                    description="When ELI+ should stop the cadence and hold further outreach. Property-wide — these apply to every scenario unless noted otherwise."
                  >
                    <StopConditionsSection state={state} update={update} />
                  </SectionShell>
                </>
              )}
              {detailTab === "changelog" && (
                <ChangeLogSection propertyName={propertyName} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <FooterActionBar dirty={dirty} onSave={handleSave} onDiscard={handleDiscard} bulkMode={bulkMode} bulkCount={bulkCount} />

      {/* Bulk-edit confirmation dialog — appears when the PM clicks
          "Apply to N properties" so they can review each change before
          committing. */}
      {bulkMode && (
        <BulkApplyConfirmDialog
          open={confirmOpen}
          onCancel={handleCancelBulkApply}
          onConfirm={handleConfirmBulkApply}
          bulkCount={bulkCount}
          rows={changeRows}
        />
      )}
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
   Detail tab bar — switches the settings pane between Cadence (per-scenario),
   Guardrails (property-wide guardrails + per-scenario custom messaging at the
   bottom), and Change Log (property-wide audit trail). Only one tall section
   renders at a time.
   ══════════════════════════════════════════════════════════════════════════ */

const DETAIL_TABS: { id: DetailTab; label: string; icon: typeof Clock }[] = [
  { id: "guardrails", label: "Guardrails", icon: ShieldCheck },
  { id: "changelog", label: "Change Log", icon: History },
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
  collapsible = false,
  defaultOpen = true,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  title: string
  /** Short context for the section. Shown only in the on-hover (i) tooltip to
   *  reduce visual noise — never rendered as a visible paragraph. */
  description: string
  hint?: string
  headerAction?: React.ReactNode
  /** When true, the header includes a chevron toggle and the body can be hidden. */
  collapsible?: boolean
  /** Initial open state when `collapsible` is true. Defaults to open. */
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  // Fold description + hint into a single tooltip so the header stays clean.
  const tip = [description, hint].filter(Boolean).join(" ")
  const [open, setOpen] = useState(defaultOpen)
  const isOpen = collapsible ? open : true
  const bodyId = collapsible ? `${title.toLowerCase().replace(/\s+/g, "-")}-body` : undefined
  const HeaderTag: "button" | "div" = collapsible ? "button" : "div"
  const headerProps = collapsible
    ? {
        type: "button" as const,
        onClick: () => setOpen((v) => !v),
        "aria-expanded": isOpen,
        "aria-controls": bodyId,
      }
    : {}
  return (
    <section className="rounded-xl border border-border bg-white">
      <HeaderTag
        {...headerProps}
        className={cn(
          "flex w-full items-center gap-3 px-5 py-4 text-left",
          isOpen && "border-b border-border",
          collapsible && "cursor-pointer select-none hover:bg-muted/40",
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {tip && <InfoHint label={tip} />}
          </div>
        </div>
        {headerAction && (
          <div className="shrink-0 self-center" onClick={(e) => e.stopPropagation()}>
            {headerAction}
          </div>
        )}
        {collapsible && (
          <ChevronDown
            aria-hidden
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              isOpen ? "rotate-0" : "-rotate-90",
            )}
          />
        )}
      </HeaderTag>
      {isOpen && (
        <div id={bodyId} className="px-5 py-5">
          {children}
        </div>
      )}
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
}: {
  scenario: ScenarioId
  enabled: boolean
  onToggle: (enabled: boolean) => void
}) {
  const meta = SCENARIOS.find((s) => s.id === scenario)
  const title = meta?.title ?? "Scenario"
  const enabledDescription =
    scenario === "initial"
      ? "Standard Rent Reminders will no longer be sent. Payments AI now handles all rent-reminder outreach for this property."
      : scenario === "late" || scenario === "legal"
        ? "Payments AI will not change your legal notices. This scenario controls a separate collections nudge. Standard delinquency and collections notices will continue to be sent per your Delinquency and Collections policies."
        : "The agent runs this scenario's cadence and messaging as configured below."
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
              ? enabledDescription
              : "The agent will not run any outreach or cadence for this scenario. Its settings are saved but inactive."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-center">
          <span className="text-xs font-medium text-muted-foreground">{enabled ? "On" : "Off"}</span>
          <ToggleSwitch checked={enabled} onChange={onToggle} disabled={meta?.outOfScope} />
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Collection journey — event-based track with 9 lifecycle anchor events.
   Each scenario band spans the days it can send outreach; dots inside the
   band mark individual projected send days.
   ══════════════════════════════════════════════════════════════════════════ */

/** Visual identity for each scenario's marks on the timeline. */
const SCENARIO_TIMELINE_META: Record<ScenarioId, { dot: string; ring: string; text: string; soft: string; band: string }> = {
  initial: { dot: "bg-sky-500", ring: "ring-sky-300", text: "text-sky-700", soft: "bg-sky-100", band: "bg-sky-200" },
  late: { dot: "bg-amber-500", ring: "ring-amber-300", text: "text-amber-700", soft: "bg-amber-100", band: "bg-amber-200" },
  legal: { dot: "bg-rose-500", ring: "ring-rose-300", text: "text-rose-700", soft: "bg-rose-100", band: "bg-rose-200" },
}

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

/** Signed axis day → number of days past rent due, for hover labels. */
function axisDayLabel(day: number): string {
  if (day === 0) return "Day of rent due"
  if (day > 0) return `Day +${day} (post rent due)`
  return `Day ${day} (pre rent due)`
}

type JourneyEventDef = {
  key: JourneyEventKey
  label: string
  icon: typeof Calendar
  dateLabel: (r: ResolvedPropertySettings) => string
  sourceSetting?: string
  isRange?: boolean
}

const JOURNEY_EVENT_DEFS: JourneyEventDef[] = [
  {
    key: "chargesPosted",
    label: "Charges Posted",
    icon: Receipt,
    dateLabel: (r) => `${r.chargesPostedStartDay}${ordinalSuffix(r.chargesPostedStartDay)} of the prior month`,
    sourceSetting: "Rent Charge Date",
  },
  {
    key: "rentDue",
    label: "Rent Due",
    icon: Calendar,
    dateLabel: (r) => `${r.rentDueDay}${ordinalSuffix(r.rentDueDay)} of month`,
  },
  {
    key: "firstDelinquencyNotice",
    label: "1st Delinquency Notice",
    icon: AlertTriangle,
    dateLabel: (r) => `${r.delinquencyBeginDays} day${r.delinquencyBeginDays === 1 ? "" : "s"} after rent due`,
    sourceSetting: "Delinquency Notices",
  },
  {
    key: "lateFees",
    label: "Daily Late Fees Begin",
    icon: FileWarning,
    dateLabel: (r) => `${r.lateFeeDay}${ordinalSuffix(r.lateFeeDay)} of month`,
    sourceSetting: "Late Fee Policy",
  },
  {
    key: "secondDelinquencyNotice",
    label: "2nd Delinquency Notice",
    icon: AlertTriangle,
    dateLabel: (r) => `${r.secondDelinquencyDaysAfterFirst} days after 1st notice`,
    sourceSetting: "Delinquency Notices",
  },
  {
    key: "eviction",
    label: "Eviction Begins",
    icon: Gavel,
    dateLabel: (r) => `${r.evictionDaysAfterFinalDelinquency} days after final delinquency notice`,
    sourceSetting: "Eviction Date",
  },
  {
    key: "financialMoveout",
    label: "Financial Moveout",
    icon: UserMinus,
    dateLabel: (r) => `${r.financialMoveoutDaysAfterEviction} days after eviction begins`,
  },
  {
    key: "firstCollectionsNotice",
    label: "1st Collections Notice",
    icon: AlertTriangle,
    dateLabel: (r) => `${r.firstCollectionsNoticeDaysAfterFmo} days after financial moveout`,
    sourceSetting: "Collections Policy",
  },
  {
    key: "balanceSentToCollections",
    label: "Balance Sent to Collections",
    icon: Gavel,
    dateLabel: (r) => `${r.balanceToCollectionsDaysAfterFirstCollectionsNotice} days after 1st collections notice`,
  },
]

/** Three phase-chunked sections on the journey track. Each phase gets its own
 *  fixed slice of the horizontal width and a proportional day sub-axis inside
 *  it. This solves the "linear day scaling wastes half the axis" problem: the
 *  9 events fit into three named columns with breathing room, while scenario
 *  bands still flow smoothly across phase boundaries via the global percent
 *  function below. */
type PhaseKey = "preRentDue" | "delinquency" | "postMoveout"
type PhaseDef = {
  key: PhaseKey
  label: string
  dayStart: number
  dayEnd: number
  widthPct: number
  events: JourneyEventKey[]
}

function buildPhases(a: JourneyAnchors): PhaseDef[] {
  return [
    {
      key: "preRentDue",
      label: "Before rent due",
      dayStart: a.chargesPostedStart - 2,
      dayEnd: a.rentDue,
      widthPct: 16,
      events: ["chargesPosted", "rentDue"],
    },
    {
      key: "delinquency",
      label: "Delinquency & eviction cycle",
      dayStart: a.rentDue,
      dayEnd: a.eviction,
      widthPct: 42,
      events: ["firstDelinquencyNotice", "lateFees", "secondDelinquencyNotice", "eviction"],
    },
    {
      key: "postMoveout",
      label: "Post move-out & collections",
      dayStart: a.eviction,
      dayEnd: a.balanceSentToCollections + 4,
      widthPct: 42,
      events: ["financialMoveout", "firstCollectionsNotice", "balanceSentToCollections"],
    },
  ]
}

/** Map any signed day to a global percent across the phase-chunked axis.
 *  Days outside the axis are clamped to the nearest phase edge, so scenario
 *  bands that overshoot still render inside the visible track. */
function dayToPhasePct(day: number, phases: PhaseDef[]): number {
  let cumulative = 0
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i]
    const isLast = i === phases.length - 1
    if (day <= phase.dayEnd || isLast) {
      const clamped = Math.max(phase.dayStart, Math.min(phase.dayEnd, day))
      const span = phase.dayEnd - phase.dayStart
      const within = span > 0 ? (clamped - phase.dayStart) / span : 0
      return cumulative + within * phase.widthPct
    }
    cumulative += phase.widthPct
  }
  return cumulative
}

function JourneyTimeline({
  store,
  current,
  active,
  onChange,
  propertyContext,
  resolvedSettings,
  anchors,
}: {
  store: Record<ScenarioId, ScenarioSettings>
  current: PanelState
  active: ScenarioId
  onChange: (s: ScenarioId) => void
  propertyContext: PropertyContextView
  resolvedSettings: ResolvedPropertySettings
  anchors: JourneyAnchors
}) {
  void propertyContext
  const steps = useMemo(() => makeJourneySteps(anchors), [anchors])
  const phases = useMemo(() => buildPhases(anchors), [anchors])
  const dayPct = useCallback((day: number) => dayToPhasePct(day, phases), [phases])

  // Cumulative x-position (in %) at each internal phase boundary. Used to draw
  // the dashed vertical dividers between phases in the axis row and in each
  // scenario-band row.
  const phaseBoundaries = useMemo(() => {
    const out: number[] = []
    let acc = 0
    for (let i = 0; i < phases.length - 1; i++) {
      acc += phases[i].widthPct
      out.push(acc)
    }
    return out
  }, [phases])

  const settingsFor = (id: ScenarioId): ScenarioSettings =>
    id === active ? extractScenarioSettings(current) : store[id]

  const cycleRows: ScenarioId[] = ["initial", "late", "legal"]

  return (
    <SectionShell
      icon={CalendarRange}
      title="Collection journey"
      description="The full lifecycle from charge posting through balance sent to collections. Nine anchor events, derived from Property Settings."
      hint="Numbered ①–⑨ markers plot each event on the axis — hover a marker for the event name, date, and source setting. The axis is split into three phases (Before Rent Due / Delinquency & Eviction Cycle / Post Move-Out & Collections) with proportional day scales so tightly-clustered events get breathing room. Attached beneath the axis, three thin scenario ribbons show when Rent Reminder, Delinquency, and Pre-Collections messages fire — dots mark each projected send day, and the active scenario is emphasized."
      collapsible
    >
      <TooltipProvider delayDuration={200}>
        <div className="space-y-4">
          {/* Axis block — the label column (w-24) is empty here; it stays in
             sync with a matching label column that used to live on separate
             scenario band rows. Even now that the scenario tracks are
             attached to the axis as ribbons, the spacer keeps room for a
             future left-hand annotation column and preserves the alignment
             of the phase columns. */}
          <div className="flex w-full items-stretch gap-3 px-2">
            <div className="w-24 shrink-0" aria-hidden />
            <div className="relative flex-1">
              {/* Scenario legend chips — the timeline itself is
                 visualization-only; scenario switching lives in the
                 ScenarioTabBar above the Cadence card. These chips just
                 map each ribbon color to its scenario name and flag any
                 scenario that is currently disabled. */}
              <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px]">
                {cycleRows.map((id) => {
                  const s = settingsFor(id)
                  const meta = SCENARIO_TIMELINE_META[id]
                  const scenarioMeta = SCENARIOS.find((x) => x.id === id)
                  const isActive = id === active
                  return (
                    <span key={id} className="inline-flex items-center gap-1">
                      <span
                        className={cn(
                          "inline-block h-2 w-2 shrink-0 rounded-full",
                          s.enabled ? meta.dot : "bg-zinc-300",
                        )}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "font-medium",
                          s.enabled
                            ? isActive
                              ? meta.text
                              : "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {scenarioMeta?.shortLabel}
                        {!s.enabled && " (off)"}
                      </span>
                    </span>
                  )
                })}
              </div>

              {/* Phase-header row */}
              <div className="relative flex h-12 items-end text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {phases.map((p, i) => {
                  const dayCount = p.dayEnd - p.dayStart
                  return (
                    <div
                      key={p.key}
                      className={cn(
                        "relative flex flex-col justify-end px-2 pb-1",
                        i > 0 && "border-l border-dashed border-zinc-300",
                      )}
                      style={{ width: `${p.widthPct}%` }}
                    >
                      <span className="block leading-tight text-foreground">{p.label}</span>
                      <span className="block text-[9px] font-normal normal-case tracking-normal text-muted-foreground/80">
                        {dayCount} day{dayCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Axis line with numbered markers (①–⑨), Charges Posted range
                 pill, and phase dividers. Numbers replace the icon-in-dot
                 because 3 events share AlertTriangle and 2 share Gavel — the
                 icon alone can't disambiguate. Full label + date + source
                 setting appear on hover. */}
              <div className="relative mt-2 h-10">
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-zinc-200" aria-hidden />

                {anchors.chargesPostedEnd > anchors.chargesPostedStart && (
                  <div
                    className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full border border-zinc-300 bg-zinc-100"
                    style={{
                      left: `${dayPct(anchors.chargesPostedStart)}%`,
                      width: `${Math.max(dayPct(anchors.chargesPostedEnd) - dayPct(anchors.chargesPostedStart), 0.5)}%`,
                    }}
                    aria-hidden
                  />
                )}

                {phaseBoundaries.map((pct) => (
                  <div
                    key={pct}
                    className="absolute inset-y-0 border-l border-dashed border-zinc-300"
                    style={{ left: `${pct}%` }}
                    aria-hidden
                  />
                ))}

                {JOURNEY_EVENT_DEFS.map((e, i) => {
                  const day = anchors[e.key]
                  return (
                    <Tooltip key={e.key}>
                      <TooltipTrigger asChild>
                        <span
                          className="absolute top-1/2 z-10 inline-flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-help items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white"
                          style={{ left: `${dayPct(day)}%` }}
                          aria-label={`${i + 1}. ${e.label}`}
                        >
                          {i + 1}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        <div className="font-semibold">
                          {i + 1}. {e.label}
                        </div>
                        <div className="mt-0.5 text-muted-foreground">{e.dateLabel(resolvedSettings)}</div>
                        <div className="mt-1 text-[10px] text-muted-foreground">{axisDayLabel(day)}</div>
                        {e.sourceSetting && (
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            Source: <span className="font-medium text-foreground">{e.sourceSetting}</span>
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>

              {/* Attached scenario ribbons — one thin colored bar per
                 scenario stacked directly under the axis line so scenario
                 message events read as part of the same timeline as the
                 numbered ①–⑨ lifecycle events. Not clickable; scenario
                 switching is handled by ScenarioTabBar above the Cadence
                 card. Positioning uses the same dayPct() as the axis
                 markers, so ribbons and numbered dots line up exactly. */}
              <div className="relative mt-1 flex flex-col gap-0.5">
                {cycleRows.map((id) => {
                  const s = settingsFor(id)
                  const meta = SCENARIO_TIMELINE_META[id]
                  const scenarioMeta = SCENARIOS.find((x) => x.id === id)
                  const step = steps.find((x) => x.id === id)!
                  const sendDays = s.enabled ? projectSendDays(s, id, anchors) : []
                  const isActive = id === active
                  const bandStart = sendDays.length > 0 ? sendDays[0] : step.start
                  const bandEnd =
                    sendDays.length > 0
                      ? Math.max(sendDays[sendDays.length - 1], bandStart)
                      : step.ceiling
                  const bandLeftPct = dayPct(bandStart)
                  const bandWidthPct = Math.max(dayPct(bandEnd) - bandLeftPct, 0.6)
                  return (
                    <div
                      key={id}
                      className={cn("relative h-1.5", !isActive && "opacity-80")}
                      aria-label={`${scenarioMeta?.shortLabel} scenario track`}
                    >
                      <div
                        className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-zinc-100"
                        aria-hidden
                      />
                      {phaseBoundaries.map((pct) => (
                        <div
                          key={pct}
                          className="absolute inset-y-0 border-l border-dashed border-zinc-200"
                          style={{ left: `${pct}%` }}
                          aria-hidden
                        />
                      ))}
                      {s.enabled && sendDays.length > 0 && (
                        <>
                          <div
                            className={cn(
                              "absolute inset-y-0 rounded-full",
                              meta.band,
                              isActive && "ring-1 ring-inset",
                              isActive && meta.ring,
                            )}
                            style={{ left: `${bandLeftPct}%`, width: `${bandWidthPct}%` }}
                            aria-hidden
                          />
                          {sendDays.map((d, idx) => (
                            <span
                              key={idx}
                              className={cn(
                                "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white",
                                idx === 0 ? "h-2.5 w-2.5" : "h-1.5 w-1.5",
                                meta.dot,
                              )}
                              style={{ left: `${dayPct(d)}%` }}
                              title={`${scenarioMeta?.shortLabel}: ${axisDayLabel(d)}${idx === 0 ? " (first message)" : " (repeat)"}`}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <JourneyOverlapWarning store={store} current={current} active={active} anchors={anchors} />
        </div>
      </TooltipProvider>
    </SectionShell>
  )
}

/**
 * Detects scenarios whose projected message days collide on the same cycle day.
 */
function JourneyOverlapWarning({
  store,
  current,
  active,
  anchors,
}: {
  store: Record<ScenarioId, ScenarioSettings>
  current: PanelState
  active: ScenarioId
  anchors: JourneyAnchors
}) {
  const settingsFor = (id: ScenarioId) => (id === active ? extractScenarioSettings(current) : store[id])
  const byDay = new Map<number, ScenarioId[]>()
  makeJourneySteps(anchors).forEach((step) => {
    const s = settingsFor(step.id)
    if (!s.enabled) return
    projectSendDays(s, step.id, anchors).forEach((d) => {
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
              {axisDayLabel(day)}: {ids.map(label).join(" + ")} would both send. The agent sends only the later-stage message
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
   Sticky so it stays visible while the Cadence / Custom Text blocks scroll.
   The active scenario is clearly highlighted.
   ══════════════════════════════════════════════════════════════════════════ */

/** One-line cadence summary for a scenario, shown under each rail item. */
function scenarioCadenceSummary(s: ScenarioSettings): string {
  const phrase = OFFSET_PHRASE[s.offsetDir] ?? "days"
  const opener = s.offsetDir === "on_charges_posted" ? phrase : `${s.offsetValue} ${phrase}`
  if (!s.repeatOn) return `${opener} · one-time`
  return `${opener} · every ${s.repeatInterval}d`
}

/* ══════════════════════════════════════════════════════════════════════════
   Scenario tab bar — horizontal, sits at the top of the Cadence card inside
   the Guardrails tab, immediately followed by the per-scenario enable banner.
   It drives the active scenario for Cadence controls. Custom Text is a
   separate block below Cadence and highlights the matching scenario row.
   Not rendered on Change Log.
   ══════════════════════════════════════════════════════════════════════════ */

function ScenarioTabBar({
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
        role="tablist"
        aria-label="Scenario"
        className="flex flex-wrap items-stretch gap-2 rounded-xl border border-border bg-white p-2 transition-colors"
      >
        <div className="flex items-center px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Editing scenario
        </div>
        {SCENARIOS.map((s) => {
          const active = scenario === s.id
          const settings = active ? extractScenarioSettings(current) : store[s.id]
          const enabled = settings.enabled
          const outOfScope = s.outOfScope
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(s.id)}
              className={cn(
                "flex-1 min-w-[160px] rounded-lg border px-3 py-1.5 text-left transition-all",
                active
                  ? outOfScope
                    ? "border-rose-300 bg-rose-50 text-rose-950 ring-1 ring-rose-200/60"
                    : "border-purple-400 bg-purple-100 text-purple-950 ring-1 ring-purple-300/50"
                  : "border-border bg-white text-foreground hover:border-zinc-400 hover:bg-zinc-50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                      outOfScope ? "bg-rose-400" : enabled ? "bg-emerald-500" : "bg-zinc-400",
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "truncate whitespace-nowrap text-sm font-semibold leading-tight",
                      !enabled && !outOfScope && "opacity-60",
                    )}
                  >
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
              <div
                className={cn(
                  "mt-0.5 truncate text-[10px] font-medium tabular-nums",
                  active
                    ? outOfScope
                      ? "text-rose-800/70"
                      : "text-purple-800/70"
                    : "text-zinc-500",
                  !enabled && !outOfScope && "opacity-70",
                )}
              >
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
   Custom Text — per-scenario intro copy with optional enablement
   ══════════════════════════════════════════════════════════════════════════ */

function CustomTextSection({
  activeScenario,
  scenarioStore,
  current,
  onMessageChange,
  onCustomTextEnabledToggle,
}: {
  activeScenario: ScenarioId
  scenarioStore: Record<ScenarioId, ScenarioSettings>
  current: PanelState
  onMessageChange: (
    scenarioId: ScenarioId,
    field: "emailSubject" | "emailCustomText" | "smsCustomText",
    value: string,
  ) => void
  onCustomTextEnabledToggle: (scenarioId: ScenarioId, enabled: boolean) => void
}) {
  const settingsFor = (id: ScenarioId) =>
    id === activeScenario ? extractScenarioSettings(current) : scenarioStore[id]

  const inputClass =
    "w-full rounded-md border border-border bg-white px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20"
  const textareaClass =
    "w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20"

  return (
    <SectionShell
      icon={MessageSquareText}
      title="Custom Text"
      description="Customize the email subject, email body copy, and SMS copy the agent sends for each scenario. Turn custom text off to use the platform default for that cadence."
      hint="Email custom text is included in the body of the reminder email. SMS custom text is appended to the bottom of the standard SMS reminder. When custom text is off, the platform default is used."
    >
      <div className="space-y-4">
        {SCENARIOS.map((s) => {
          const settings = settingsFor(s.id)
          const outOfScope = s.outOfScope
          const showFields = settings.customTextEnabled && !outOfScope
          return (
            <div
              key={s.id}
              className="rounded-lg border border-border/60 bg-white p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="flex min-w-0 items-center gap-2 text-xs font-semibold text-foreground">
                  <span
                    className={cn(
                      "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                      settings.enabled ? "bg-emerald-500" : "bg-zinc-400",
                    )}
                    aria-hidden
                  />
                  {s.title}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[10px] font-medium text-muted-foreground">Enable Custom Text</span>
                  <ToggleSwitch
                    checked={settings.customTextEnabled}
                    disabled={outOfScope}
                    onChange={(v) => onCustomTextEnabledToggle(s.id, v)}
                  />
                </div>
              </div>
              {showFields && (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Email subject
                    </label>
                    <input
                      type="text"
                      value={settings.emailSubject}
                      onChange={(e) => onMessageChange(s.id, "emailSubject", e.target.value)}
                      aria-label={`${s.title} email subject`}
                      className={cn(inputClass, "mt-1.5")}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Email custom text
                    </label>
                    <textarea
                      value={settings.emailCustomText}
                      onChange={(e) => onMessageChange(s.id, "emailCustomText", e.target.value)}
                      rows={3}
                      aria-label={`${s.title} email custom text`}
                      className={cn(textareaClass, "mt-1.5")}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      SMS custom text
                    </label>
                    <textarea
                      value={settings.smsCustomText}
                      onChange={(e) => onMessageChange(s.id, "smsCustomText", e.target.value)}
                      rows={3}
                      aria-label={`${s.title} SMS custom text`}
                      className={cn(textareaClass, "mt-1.5")}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Repayment agreements
   ══════════════════════════════════════════════════════════════════════════ */

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
      title="Allow ELI+ to offer repayment agreements"
      description="Whether Payments AI may present repayment plans as an option during resident conversations. When off, ELI+ does not mention repayment agreements as an option."
      masterToggle={
        <ToggleSwitch
          checked={state.repaymentOfferAllowed}
          onChange={(v) => update("repaymentOfferAllowed", v)}
        />
      }
    >
      {state.repaymentOfferAllowed ? (
        <div className="space-y-4">
          <GuardrailRule
            layout="row"
            title="Allow ELI+ to create repayment agreements"
            description="When on, ELI+ can create structured repayment plans on the property's behalf within the balance and term limits below. Residents outside these rails are directed to pay in full or escalated to staff."
          >
            <ToggleSwitch
              checked={state.repaymentOfferEnabled}
              onChange={(v) => update("repaymentOfferEnabled", v)}
            />
          </GuardrailRule>

          {state.repaymentOfferEnabled ? (
            <div className="grid gap-x-4 gap-y-1 md:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Eligibility
                </p>
                <div className="mt-1 divide-y divide-border/40">
                  <GuardrailRule
                    layout="row"
                    title="Minimum balance"
                    description="Below this, ELI+ asks for payment in full instead of offering a plan."
                  >
                    <BalanceThresholdInput
                      value={state.repaymentMinBalance}
                      onChange={(v) => update("repaymentMinBalance", v)}
                      avgRent={avgRent}
                      className="space-y-0.5"
                    />
                  </GuardrailRule>
                  <GuardrailRule
                    layout="row"
                    title="Maximum balance"
                    description="Above this, ELI+ escalates to a human before proposing terms."
                  >
                    <BalanceThresholdInput
                      value={state.repaymentMaxBalance}
                      onChange={(v) => update("repaymentMaxBalance", v)}
                      avgRent={avgRent}
                      className="space-y-0.5"
                    />
                  </GuardrailRule>
                  <GuardrailRule
                    layout="row"
                    title="Require good standing"
                    description="Only residents without chronic delinquency or recent violations are eligible for an ELI+-created repayment agreement."
                  >
                    <ToggleSwitch
                      checked={state.repaymentRequireGoodStanding}
                      onChange={(v) => update("repaymentRequireGoodStanding", v)}
                    />
                  </GuardrailRule>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Offer terms
                </p>
                <div className="mt-1 divide-y divide-border/40">
                  <GuardrailRule
                    layout="row"
                    title="Start repayments in"
                    description="When the first installment of an ELI+-created plan may begin — the current calendar month or the next one."
                  >
                    <Select
                      value={state.repaymentStartMonth}
                      onValueChange={(v) => update("repaymentStartMonth", v as "current" | "next")}
                    >
                      <SelectTrigger className="h-8 w-[140px] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Current month</SelectItem>
                        <SelectItem value="next">Next month</SelectItem>
                      </SelectContent>
                    </Select>
                  </GuardrailRule>
                  <GuardrailRule
                    layout="row"
                    title="ELI+ can create plans up to"
                    description="Maximum plan duration ELI+ can commit to on its own. Longer plans require a human approver."
                  >
                    <div className="flex items-center gap-1.5 text-sm">
                      <Input
                        type="number"
                        min={1}
                        max={12}
                        value={state.planMaxMonthsAutomated}
                        onChange={(e) => update("planMaxMonthsAutomated", Math.max(1, Number(e.target.value) || 1))}
                        className="h-8 w-16 text-sm"
                      />
                      <span className="text-muted-foreground">months</span>
                    </div>
                  </GuardrailRule>
                  <GuardrailRule
                    layout="row"
                    title="Approval when plan total exceeds"
                    description="Dollar threshold above which ELI+ routes the plan to a human for sign-off."
                  >
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min={0}
                        step={100}
                        value={state.planRequireApprovalAmount}
                        onChange={(e) => update("planRequireApprovalAmount", Math.max(0, Number(e.target.value) || 0))}
                        className="h-8 w-24 text-sm"
                      />
                    </div>
                  </GuardrailRule>
                  <GuardrailRule
                    layout="row"
                    title="Allow repayment plans to exceed lease end date"
                    description="When on, ELI+ may create a plan whose final installment falls after the resident's lease end date. When off (default), those plans escalate to a human."
                  >
                    <ToggleSwitch
                      checked={state.planAllowExceedLeaseEnd}
                      onChange={(v) => update("planAllowExceedLeaseEnd", v)}
                    />
                  </GuardrailRule>
                  <GuardrailRule
                    layout="row"
                    title="Allow ELI+ to create repayment agreements when active repayment agreement is already on file"
                    description="When on, ELI+ may create a new plan for a resident who already has one on file, as long as every other guardrail passes. When off (default), any plan request from a resident with an existing agreement escalates to a human instead."
                  >
                    <ToggleSwitch
                      checked={state.planAllowWithActiveAgreement}
                      onChange={(v) => update("planAllowWithActiveAgreement", v)}
                    />
                  </GuardrailRule>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
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
      description="Control whether ELI+ can mention Flex flexible rent payment options during resident conversations."
    >
      <GuardrailRule
        layout="row"
        title="Allow ELI+ to share Flex availability"
        description="When on, ELI+ may tell eligible residents that Flex is available at this property. When off, Flex is never mentioned unless a human takes over the conversation."
      >
        <ToggleSwitch
          checked={state.shareFlexAvailability}
          onChange={(v) => update("shareFlexAvailability", v)}
        />
      </GuardrailRule>
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
      title="Automated payments"
      description="Control which payment flows ELI+ can complete on its own during resident conversations. Both flows use a pre-selected payment method on file (priority: saved credit card, then saved debit card, then saved eCheck). The resident authorizes the action in-conversation by supplying their last name and unit number; if no payment method is on file, ELI+ routes the resident to the portal or a human."
    >
      <div className="divide-y divide-border/40">
        <GuardrailRule
          layout="row"
          title="Allow ELI+ to accept one-time payments"
          description="When on, ELI+ can prompt the resident to submit a one-time payment for the total outstanding balance using the pre-selected payment method on file. The resident authorizes by replying with their last name and unit number, and the charge runs immediately for the full balance."
        >
          <ToggleSwitch
            checked={state.acceptOneTimePayments}
            onChange={(v) => update("acceptOneTimePayments", v)}
          />
        </GuardrailRule>
        <GuardrailRule
          layout="row"
          title="Allow ELI+ to set up recurring payments"
          description="When on, ELI+ can prompt the resident to enroll in a recurring auto-payment for the total balance due on the 1st of each month, drawn from the pre-selected payment method on file. The resident authorizes by replying with their last name and unit number; the schedule continues until the resident cancels it or moves out. ELI+ never proactively pitches auto-pay; it only offers this flow when the resident explicitly asks to set up auto-pay, or as a one-line follow-up immediately after the resident successfully completes a one-time payment through 'Allow ELI+ to accept one-time payments' in the same conversation."
        >
          <ToggleSwitch
            checked={state.setupRecurringPayments}
            onChange={(v) => update("setupRecurringPayments", v)}
          />
        </GuardrailRule>
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
  anchors,
  scenarioStore,
  onScenarioChange,
  onScenarioEnabledToggle,
}: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
  propertyContext: PropertyContextView
  avgRent: number
  anchors: JourneyAnchors
  scenarioStore: Record<ScenarioId, ScenarioSettings>
  onScenarioChange: (s: ScenarioId) => void
  onScenarioEnabledToggle: (enabled: boolean) => void
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
  const journeySteps = useMemo(() => makeJourneySteps(anchors), [anchors])
  const ceilingDay = useMemo(() => nextStepStart(state.scenario, anchors), [state.scenario, anchors])
  const projectedDays = useMemo(
    () => projectSendDays(state, state.scenario, anchors),
    [state.offsetValue, state.offsetDir, state.repeatOn, state.repeatInterval, state.maxAttempts, state.scenario, anchors],
  )
  const lastDay = projectedDays[projectedDays.length - 1]
  // The user asked for more repeats than fit before the next stage.
  const repeatsClamped =
    state.repeatOn &&
    ceilingDay != null &&
    projectedDays.length < state.maxAttempts &&
    lastDay + state.repeatInterval >= ceilingDay
  const nextStepLabel =
    ceilingDay != null
      ? SCENARIOS.find((s) => s.id === journeySteps[journeySteps.findIndex((x) => x.id === state.scenario) + 1]?.id)?.shortLabel
      : null

  // Per-scenario delivery window for this cadence.
  const eff = { channel: state.channel, quietStart: state.quietStart, quietEnd: state.quietEnd, days: state.days }

  const isDelinquency = state.scenario === "late"

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
        <ScenarioTabBar
          scenario={state.scenario}
          store={scenarioStore}
          current={state}
          onChange={onScenarioChange}
        />
        <ScenarioEnableBanner
          scenario={state.scenario}
          enabled={state.enabled}
          onToggle={onScenarioEnabledToggle}
        />
        <div
          className={cn(
            "space-y-5 transition-opacity",
            !state.enabled && "pointer-events-none select-none opacity-50",
          )}
          aria-disabled={!state.enabled}
        >
        <div className="grid items-start gap-6 lg:grid-cols-2">
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
                    ? ` Repeats stop before ${axisDayLabel(ceilingDay).toLowerCase()}${nextStepLabel ? ` (when ${nextStepLabel} begins)` : ""}.`
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
                  begins on {axisDayLabel(ceilingDay!).toLowerCase()}. Later repeats are dropped so this scenario doesn&apos;t
                  overlap the next stage. Shorten the repeat interval or move the start earlier to fit more.
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
                label="Only reach out when balance due is at least:"
              />
            </div>

          </div>

          {/* ─── Column 2: Delivery Window ─── */}
          <div className="space-y-4">
            <div className="flex items-center border-b border-border pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Delivery window
              </span>
            </div>

          <div className="space-y-5">
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
                onValueChange={(v) => update("channel", v as ChannelPref)}
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
                  onValueChange={(v) => update("quietStart", Number(v))}
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
                  onValueChange={(v) => update("quietEnd", Number(v))}
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
                        update("days", { ...eff.days, [d.id]: !on })
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
              {state.defaultSendOnHolidays && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Messages send on holidays and other blocked days as scheduled.
                </p>
              )}
            </div>
          </div>
          </div>
        </div>
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

/* ══════════════════════════════════════════════════════════════════════════
   Change log section — property-wide audit trail of Payments AI setting edits
   ══════════════════════════════════════════════════════════════════════════ */

type ChangeLogEntry = {
  id: string
  timestamp: string
  user: { name: string; role: string }
  scope: "Cadence" | "Custom text" | "Guardrails"
  /** Present for scenario-scoped changes. Omitted for property-wide settings. */
  scenario?: ScenarioId
  setting: string
  oldValue: string
  newValue: string
}

const CHANGE_LOG_ENTRIES: ChangeLogEntry[] = [
  {
    id: "cl-2",
    timestamp: "2026-06-30T11:08:00-06:00",
    user: { name: "James Kim", role: "Property Manager" },
    scope: "Cadence",
    scenario: "late",
    setting: "First message offset",
    oldValue: "3 days after rent due",
    newValue: "5 days after rent due",
  },
  {
    id: "cl-3",
    timestamp: "2026-06-28T09:17:00-06:00",
    user: { name: "Priya Shah", role: "AR Analyst" },
    scope: "Guardrails",
    setting: "Escalate expected payment date threshold",
    oldValue: "10 or more days after rent is due",
    newValue: "7 or more days after rent is due",
  },
  {
    id: "cl-4",
    timestamp: "2026-06-27T16:55:00-06:00",
    user: { name: "Melissa Ortega", role: "Regional Manager" },
    scope: "Guardrails",
    setting: "Tool-call failure cap",
    oldValue: "5 consecutive failures",
    newValue: "3 consecutive failures",
  },
  {
    id: "cl-5",
    timestamp: "2026-06-25T13:24:00-06:00",
    user: { name: "James Kim", role: "Property Manager" },
    scope: "Custom text",
    scenario: "initial",
    setting: "Intro message",
    oldValue: "Hi {resident_first_name}, this is a friendly reminder your rent is due soon.",
    newValue: "Hi {resident_first_name} — your rent for {month} is due on the {rent_due_day}. Let me know if you'd like help paying.",
  },
  {
    id: "cl-6",
    timestamp: "2026-06-24T10:03:00-06:00",
    user: { name: "Priya Shah", role: "AR Analyst" },
    scope: "Guardrails",
    setting: "Repayment agreements — max months (automated)",
    oldValue: "3 months",
    newValue: "4 months",
  },
  {
    id: "cl-8",
    timestamp: "2026-06-20T08:12:00-06:00",
    user: { name: "James Kim", role: "Property Manager" },
    scope: "Cadence",
    scenario: "late",
    setting: "Quiet hours",
    oldValue: "8:00 PM – 8:00 AM",
    newValue: "9:00 PM – 8:00 AM",
  },
]

function formatChangeLogTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  const timeStr = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  return `${dateStr} · ${timeStr}`
}

const CHANGE_LOG_SCOPE_STYLES: Record<ChangeLogEntry["scope"], string> = {
  "Cadence": "bg-sky-100 text-sky-800",
  "Custom text": "bg-violet-100 text-violet-800",
  "Guardrails": "bg-emerald-100 text-emerald-800",
}

const CHANGE_LOG_SCENARIO_STYLES: Record<ScenarioId, string> = {
  initial: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  late: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  legal: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
}

function ChangeLogSection({ propertyName }: { propertyName: string }) {
  return (
    <SectionShell
      icon={History}
      title="Change log"
      description={`Audit trail of Payments AI setting edits for ${propertyName}. Shows who changed what, when, and from what value.`}
      hint="Property-wide history. Most recent changes appear first."
    >
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">Setting</th>
              <th className="whitespace-nowrap px-3 py-2 font-semibold">Changed by</th>
              <th className="whitespace-nowrap px-3 py-2 font-semibold">Changed on</th>
              <th className="px-3 py-2 font-semibold">Changed from</th>
              <th className="px-3 py-2 font-semibold">Changed to</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {CHANGE_LOG_ENTRIES.map((entry) => (
              <tr key={entry.id} className="align-top">
                <td className="px-3 py-3">
                  <div className="text-sm font-medium text-foreground">{entry.setting}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        CHANGE_LOG_SCOPE_STYLES[entry.scope],
                      )}
                    >
                      {entry.scope}
                    </span>
                    {entry.scenario && entry.scope !== "Guardrails" && (
                      <span
                        className={cn(
                          "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          CHANGE_LOG_SCENARIO_STYLES[entry.scenario],
                        )}
                      >
                        {SCENARIOS.find((s) => s.id === entry.scenario)?.shortLabel ?? entry.scenario}
                      </span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <div className="text-sm font-medium text-foreground">{entry.user.name}</div>
                  <div className="text-[11px] text-muted-foreground">{entry.user.role}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground tabular-nums">
                  {formatChangeLogTimestamp(entry.timestamp)}
                </td>
                <td className="px-3 py-3 text-xs leading-relaxed text-muted-foreground line-through decoration-rose-300/70">
                  {entry.oldValue}
                </td>
                <td className="px-3 py-3 text-xs font-medium leading-relaxed text-foreground">
                  {entry.newValue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Prototype data — a production change log will pull from the same audit stream that powers Entrata's other admin activity logs.
      </p>
    </SectionShell>
  )
}

function ContextAwareOutreachSection({
  state,
  update,
}: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
  propertyContext: PropertyContextView
}) {
  return (
    <GuardrailSubsection
      title="Context-aware outreach"
      description="Payments AI always reads the resident's payment history and prior conversations (staff, manager, and Payments AI threads) before each send. These rules tune what to do with that context — when to suppress a nudge, when to escalate, and how much grace to give reliable payers."
      scope="global"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <GuardrailRule
            layout="stack"
            title="Typical pay day"
            description="Do not nudge until the resident's usual pay day in the cycle has passed without payment."
            hint="Example: if the resident usually pays on the 2nd, ELI+ waits until the 3rd (or later) before sending a reminder, unless they already committed to a different date."
          >
            <GuardrailRule
              layout="row"
              title="Respect typical pay day"
              description="Suppresses nudges until after the inferred pay day when the balance is still open."
            >
              <ToggleSwitch
                checked={state.respectTypicalPayDay}
                onChange={(v) => update("respectTypicalPayDay", v)}
              />
            </GuardrailRule>
            {state.respectTypicalPayDay && (
              <div className="flex flex-wrap items-center gap-1.5 pl-2 text-xs">
                <span className="text-muted-foreground">Require ≥</span>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={state.typicalPayDayMinHistoryMonths}
                  onChange={(e) =>
                    update("typicalPayDayMinHistoryMonths", Math.max(1, Math.min(24, Number(e.target.value) || 1)))
                  }
                  className="h-7 w-14 text-xs"
                />
                <span className="text-muted-foreground">months of history</span>
              </div>
            )}
          </GuardrailRule>

          <GuardrailRule
            layout="stack"
            title="On-time payer grace"
            description="Give residents with strong payment history extra days before the first nudge when they are only slightly late."
            hint="When on-time rate meets the threshold, ELI+ waits N days after typical pay day before sending the first reminder."
          >
            <GuardrailRule
              layout="row"
              title="Enable on-time payer grace"
              description="Residents at or above the on-time rate threshold get additional grace days before early-cycle reminders."
            >
              <ToggleSwitch
                checked={state.onTimePayerGraceEnabled}
                onChange={(v) => update("onTimePayerGraceEnabled", v)}
              />
            </GuardrailRule>
            {state.onTimePayerGraceEnabled && (
              <div className="flex flex-wrap items-center gap-1.5 pl-2 text-xs">
                <span className="text-muted-foreground">Rate ≥</span>
                <Input
                  type="number"
                  min={50}
                  max={100}
                  value={state.onTimePayerMinRate}
                  onChange={(e) =>
                    update("onTimePayerMinRate", Math.max(50, Math.min(100, Number(e.target.value) || 90)))
                  }
                  className="h-7 w-14 text-xs"
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
                  className="h-7 w-14 text-xs"
                />
                <span className="text-muted-foreground">
                  {state.onTimePayerGraceDays === 1 ? "day" : "days"}
                </span>
              </div>
            )}
          </GuardrailRule>
        </div>

        <div className="space-y-3">
          <GuardrailRule
            layout="stack"
            title="Escalate expected payment date"
            description="If a resident signals they will pay too far in the future, route to a property manager instead of continuing automated outreach."
            hint="Example: resident replies 'I can pay on the 25th' — if that exceeds the threshold, ELI+ hands off to a manager rather than deferring outreach."
          >
            <GuardrailRule
              layout="row"
              title="Escalate expected payment date"
              description="Applies across all scenarios that captured a committed pay date."
            >
              <ToggleSwitch
                checked={state.escalateExpectedPayDate}
                onChange={(v) => update("escalateExpectedPayDate", v)}
              />
            </GuardrailRule>
            {state.escalateExpectedPayDate && (
              <div className="flex flex-wrap items-center gap-1.5 pl-2 text-xs">
                <span className="text-muted-foreground">Escalate when resident signals they will pay</span>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={state.escalateExpectedPayDateThresholdDays}
                  onChange={(e) =>
                    update(
                      "escalateExpectedPayDateThresholdDays",
                      Math.max(1, Math.min(60, Number(e.target.value) || 7)),
                    )
                  }
                  className="h-7 w-14 text-xs"
                />
                <span className="text-muted-foreground">
                  or more {state.escalateExpectedPayDateThresholdDays === 1 ? "day" : "days"} after rent is due
                </span>
              </div>
            )}
          </GuardrailRule>
        </div>
      </div>
    </GuardrailSubsection>
  )
}

function StopConditionsSection({
  state,
  update,
}: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
}) {
  return (
    <GuardrailSubsection
      title="Cadence stops"
      description="When ELI+ should stop the cadence and hold further outreach. Property-wide — these apply to every scenario unless noted otherwise."
      scope="global"
    >
      <div className="space-y-3">
        <GuardrailRule
          layout="row"
          title="Pause sequence when resident shares an expected payment date"
          description="If the resident commits to a date they'll pay by, hold further outreach until that date passes (then resume if still unpaid)."
        >
          <ToggleSwitch
            checked={state.pauseOnExpectedPayDate}
            onChange={(v) => update("pauseOnExpectedPayDate", v)}
          />
        </GuardrailRule>
        <GuardrailRule
          layout="row"
          title="Pause sequence once resident moves out"
          description="Once the resident's move-out date has passed on the lease, ELI+ stops automated payment outreach for that resident. Any remaining balance is handled through move-out charge workflows."
        >
          <ToggleSwitch
            checked={state.pauseOnMoveOut}
            onChange={(v) => update("pauseOnMoveOut", v)}
          />
        </GuardrailRule>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {STOP_CHIPS_LOCKED.map((chip) => (
          <LockedStopChip key={chip} label={chip} />
        ))}
        <InfoHint label="Locked stop conditions are mandatory; they fire regardless of cadence settings." />
      </div>
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
    { key: "paymentFailures" as const, label: "Returned payments & chargebacks" },
    { key: "violations" as const, label: "Lease violations" },
  ]

  const setFactor = (
    key: keyof PanelState["eligibilityFactors"],
    patch: Partial<{ enabled: boolean; weight: number; severity: [number, number, number, number] }>,
  ) => {
    update("eligibilityFactors", {
      ...state.eligibilityFactors,
      [key]: { ...state.eligibilityFactors[key], ...patch },
    })
  }

  const setSeverityAt = (
    key: keyof PanelState["eligibilityFactors"],
    idx: 0 | 1 | 2 | 3,
    value: number,
  ) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value) || 0))
    const current = state.eligibilityFactors[key].severity
    const next: [number, number, number, number] = [
      current[0],
      current[1],
      current[2],
      current[3],
    ]
    next[idx] = clamped
    setFactor(key, { severity: next })
  }

  const [severityOpen, setSeverityOpen] = useState(false)

  const setRule = (scenario: ScenarioId, band: ScoreBand, action: EligibilityAction) => {
    update("eligibilityRules", {
      ...state.eligibilityRules,
      [scenario]: { ...state.eligibilityRules[scenario], [band]: action },
    })
  }

  return (
    <GuardrailSubsection
      title="Score model & per-scenario rules"
      description="Score residents from payment history and route outreach by scenario based on risk band. When on, ELI+ computes a score from the factors below and applies per-scenario rules before sending outreach."
      scope="phase"
      masterToggle={
        <ToggleSwitch checked={state.eligibilityEnabled} onChange={(v) => update("eligibilityEnabled", v)} />
      }
    >
      {state.eligibilityEnabled ? (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="space-y-3">
            <GuardrailRule
              layout="stack"
              title="Score factors"
              description="Property-wide signals that contribute to a resident risk score."
              hint="Toggle each factor on or off and set its weight. Higher combined scores push residents into moderate or poor bands."
            >
              <div className="divide-y divide-border/40">
                {factorEntries.map((f) => {
                  const factor = state.eligibilityFactors[f.key]
                  return (
                    <div key={f.key} className="flex items-center justify-between gap-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <ToggleSwitch checked={factor.enabled} onChange={(v) => setFactor(f.key, { enabled: v })} />
                        <span className="text-sm text-foreground">{f.label}</span>
                        <InfoHint label={FACTOR_SCOPE_HINTS[f.key]} />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
            </GuardrailRule>

            <GuardrailRule
              layout="row"
              title="Band thresholds"
              description="Score at which a resident enters the Moderate and Poor bands. Everything below Moderate is Good."
            >
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Moderate ≥</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={state.eligibilityThresholdModerate}
                  onChange={(e) => update("eligibilityThresholdModerate", Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="h-7 w-14 text-xs"
                />
                <span className="text-muted-foreground">· Poor ≥</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={state.eligibilityThresholdPoor}
                  onChange={(e) => update("eligibilityThresholdPoor", Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="h-7 w-14 text-xs"
                />
              </div>
            </GuardrailRule>

            <div className="rounded-md border border-border/60">
              <button
                type="button"
                onClick={() => setSeverityOpen((v) => !v)}
                aria-expanded={severityOpen}
                aria-controls="severity-editor-body"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/40"
              >
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                    severityOpen ? "rotate-0" : "-rotate-90",
                  )}
                />
                <span className="flex flex-1 items-center gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Score factor severity
                  </span>
                  <InfoHint
                    label="Sub-score (0–100) contributed at each event count. Saturates at 4+ events. Sub-scores combine into the composite via factor weights above."
                  />
                </span>
                {!severityOpen && (
                  <span className="text-[10px] text-muted-foreground">Customize</span>
                )}
              </button>
              {severityOpen && (
                <div id="severity-editor-body" className="border-t border-border/60 px-2 py-2">
                  <div className="-mx-2 overflow-x-auto px-2">
                    <table className="w-full min-w-[380px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-border/60 text-muted-foreground">
                          <th className="w-40 py-1.5 pr-2 font-semibold">Factor</th>
                          {SEVERITY_BREAKPOINT_LABELS.map((label) => (
                            <th key={label} className="px-1 py-1.5 text-center font-semibold">
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {factorEntries.map((f) => {
                          const factor = state.eligibilityFactors[f.key]
                          return (
                            <tr key={f.key} className="border-b border-border/40 last:border-none">
                              <td className="w-40 py-1.5 pr-2 text-foreground">{f.label}</td>
                              {([0, 1, 2, 3] as const).map((idx) => (
                                <td key={idx} className="px-1 py-1.5 text-center">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    disabled={!factor.enabled}
                                    value={factor.severity[idx]}
                                    onChange={(e) => setSeverityAt(f.key, idx, Number(e.target.value))}
                                    className="mx-auto h-7 w-14 text-center text-xs"
                                  />
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
                    Higher values push residents toward the Moderate and Poor bands faster. Between count breakpoints the ramp interpolates linearly.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            <GuardrailRule
              layout="stack"
              title="Per-scenario rules by score band"
              description="What ELI+ does for each scenario when a resident falls in a score band."
              hint="Example: skip Delinquency nudges for chronic repeat-offenders and let the legal notice path run; skip Pre-Collections outreach for residents already in good standing."
            >
              <div className="-mx-2 overflow-x-auto px-2">
                <table className="w-full min-w-[440px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground">
                      <th className="w-24 py-1.5 pr-2 font-semibold">Scenario</th>
                      {SCORE_BANDS.map((b) => (
                        <th key={b.id} className="px-1 py-1.5 font-semibold">
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
                      <tr key={s.id} className="border-b border-border/40 last:border-none">
                        <td className="w-24 py-1.5 pr-2 font-medium text-foreground">{s.shortLabel}</td>
                        {SCORE_BANDS.map((b) => (
                          <td key={b.id} className="px-1 py-1.5">
                            <Select
                              value={state.eligibilityRules[s.id][b.id]}
                              onValueChange={(v) => setRule(s.id, b.id, v as EligibilityAction)}
                            >
                              <SelectTrigger className="h-7 min-w-0 px-2 text-xs">
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
              scenarioRules={state.eligibilityRules[activeScenario]}
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Off — outreach runs for every resident without a scoring check.
        </p>
      )}
    </GuardrailSubsection>
  )
}

function GuardrailSubsection({
  title,
  description,
  scope,
  masterToggle,
  children,
}: {
  title: string
  description: string
  scope?: "global" | "phase"
  /** Optional control rendered at the far right of the header row (typically
   *  a ToggleSwitch that gates the subsection body). */
  masterToggle?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-white">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <InfoHint label={description} />}
        {masterToggle && (
          <div className="ml-auto shrink-0">{masterToggle}</div>
        )}
      </div>
      <div className="border-t border-border/60 px-3 py-2.5">{children}</div>
    </div>
  )
}

/**
 * A single rule inside a `GuardrailSubsection`. Two visual layouts:
 *
 * - `row` (default): flat label + (i) hint on the left, control on the right.
 *   No border, no card. For single-line settings.
 * - `stack`: bordered mini-card with a header row of label + (i) hint and a
 *   grouped body. For grouped settings (nested toggle + inputs, small tables).
 */
function GuardrailRule({
  title,
  description,
  hint,
  layout = "row",
  className,
  children,
}: {
  title: string
  /** Folded into the on-hover (i) tooltip together with `hint`. */
  description: string
  hint?: string
  layout?: "row" | "stack"
  className?: string
  children: React.ReactNode
}) {
  const tip = [description, hint].filter(Boolean).join(" ")
  if (layout === "row") {
    return (
      <div className={cn("flex flex-wrap items-center justify-between gap-3 py-1", className)}>
        <span className="flex min-w-0 items-center gap-1.5 text-sm text-foreground">
          {title}
          {tip && <InfoHint label={tip} />}
        </span>
        <div className="shrink-0">{children}</div>
      </div>
    )
  }
  return (
    <div className={cn("rounded-md border border-border/60 p-2", className)}>
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        {tip && <InfoHint label={tip} />}
      </div>
      <div className="mt-2 space-y-2">{children}</div>
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
   Bulk-edit confirmation dialog
   ══════════════════════════════════════════════════════════════════════════ */

function BulkApplyConfirmDialog({
  open,
  onCancel,
  onConfirm,
  bulkCount,
  rows,
}: {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  bulkCount: number
  rows: ChangeRow[]
}) {
  const grouped = useMemo(() => groupChangeRows(rows), [rows])
  const totalChanges = rows.length
  const propertyLabel = `${bulkCount} ${bulkCount === 1 ? "property" : "properties"}`

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="text-base">Confirm bulk edit</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Review the {totalChanges} {totalChanges === 1 ? "change" : "changes"} before applying to {propertyLabel}.
            Per-property settings you didn&apos;t change will be left as-is.
          </p>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {totalChanges === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No changes to apply.
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <div key={group.scope}>
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.scope}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      · {group.rows.length} {group.rows.length === 1 ? "change" : "changes"}
                    </span>
                  </div>
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {group.rows.map((r, idx) => (
                      <li key={`${group.scope}-${idx}`} className="px-3 py-2.5 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{r.setting}</span>
                          {r.scenario && (
                            <Badge variant="gray" className="shrink-0">
                              {scenarioTitle(r.scenario)}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground line-through decoration-muted-foreground/60">
                            {r.oldValue}
                          </span>
                          <span aria-hidden="true">→</span>
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
                            {r.newValue}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border px-6 py-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={totalChanges === 0}>
            Apply to {propertyLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
