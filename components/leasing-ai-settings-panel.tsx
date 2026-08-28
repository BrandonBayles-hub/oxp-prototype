"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  MessageSquare,
  ListChecks,
  Plus,
  Trash2,
  Lock,
  AlertTriangle,
  Info,
  HelpCircle,
  Home,
  ShieldCheck,
  ListOrdered,
  GripVertical,
  Link as LinkIcon,
  Mail,
  MessageSquareText,
  Bell,
  Pencil,
  History,
  ClipboardList,
  MoreHorizontal,
  Layers,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/* ══════════════════════════════════════════════════════════════════════════
   Conversation modes
   ══════════════════════════════════════════════════════════════════════════ */

type ConversationModeId = "maximize-tour" | "maximize-application"

interface ConversationMode {
  id: ConversationModeId
  name: string
  description: string
  cadenceLabel: string
  conversionGoal: "schedule_tours" | "drive_applications" | "answer_questions"
  requiresConventionalNoAffordable: boolean
}

const CONVERSATION_MODES: ConversationMode[] = [
  {
    id: "maximize-tour",
    name: "Maximize Tour Mode",
    description:
      "The bot proactively offers available tours and invites the prospect to take a tour. An application is only offered if the prospect asks.",
    cadenceLabel: "Maximize Tour cadence",
    conversionGoal: "schedule_tours",
    requiresConventionalNoAffordable: false,
  },
  {
    id: "maximize-application",
    name: "Maximize Application Mode",
    description:
      "The bot proactively shares the application link and invites the prospect to apply. Tours are only offered if the prospect asks.",
    cadenceLabel: "Application Mode cadence",
    conversionGoal: "drive_applications",
    requiresConventionalNoAffordable: true,
  },
]

const DEFAULT_MODE: ConversationModeId = "maximize-tour"

type LeasingSettingsTab = "settings" | "pre-tour-nurture" | "post-tour-nurture"

interface PreTourContactPoint {
  id: string
  event: string
  actions: string[]
}

const PRE_TOUR_NURTURE_CONTACT_POINTS: PreTourContactPoint[] = [
  { id: "guest-card-completed", event: "Guest Card Completed", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "no-tour-24h", event: "No Tour Scheduled – 24 Hours After Guest Card Completion", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "no-tour-48h", event: "No Tour Scheduled – 48 Hours After Guest Card Completion", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "no-tour-72h", event: "No Tour Scheduled – 72 Hours After Guest Card Completion", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "no-tour-7d", event: "No Tour Scheduled – 7 Days After Guest Card Completion", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "appt-onsite", event: "Appointment Scheduled by Onsite Staff", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "appt-leasing-center", event: "Appointment Scheduled – from Leasing Center", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "scheduled-prospect-portal", event: "Scheduled Tour – from Prospect Portal", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "virtual-tour-scheduled", event: "Virtual Tour Scheduled", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "self-guided-tour-scheduled", event: "Self-Guided Tour Scheduled", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "appointment-reminder", event: "Appointment Reminder", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "self-guided-tour-reminder", event: "Self-Guided Tour Reminder", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "self-guided-tour-rescheduled", event: "Self-Guided Tour Rescheduled", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "tour-canceled", event: "Tour Canceled – No New Tour Scheduled", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "tour-outcome-not-recorded", event: "Tour Outcome Not Recorded", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
]

const POST_TOUR_NURTURE_CONTACT_POINTS: PreTourContactPoint[] = [
  { id: "tour-completed", event: "Tour Completed", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "self-guided-tour-completed", event: "Self-Guided Tour Completed", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "tour-completed-no-app-2h", event: "Tour Completed – No Application After 2 Hours", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "tour-completed-no-app-48h", event: "Tour Completed – No Application After 48 Hours", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "tour-completed-no-app-6d", event: "Tour Completed – No Application After 6 Days", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "tour-completed-no-app-12d", event: "Tour Completed – No Application After 12 Days", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "multiple-tours-no-app", event: "Multiple Tours Completed – No Application", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "rental-application-invitation", event: "Rental Application Invitation", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "application-started-prospect-portal", event: "Application Started – from Prospect Portal", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
  { id: "post-tour-human-follow-up", event: "Post-Tour Human Follow-Up Needed", actions: ["Automatic Email", "Automated Text Message", "Manual Contact"] },
]

const LEGACY_MODE_MAP: Record<string, ConversationModeId> = {
  "tour-first": "maximize-tour",
  "application-first": "maximize-application",
  "qualification-first": "maximize-tour",
  "maximize-guest-card": "maximize-tour",
}

function normalizeModeId(id: string | undefined): ConversationModeId {
  if (!id) return DEFAULT_MODE
  if (CONVERSATION_MODES.some((m) => m.id === id)) return id as ConversationModeId
  return LEGACY_MODE_MAP[id] ?? DEFAULT_MODE
}

/* ══════════════════════════════════════════════════════════════════════════
   Tour priority
   ══════════════════════════════════════════════════════════════════════════ */

type TourType = "agent" | "self_guided" | "virtual"

const TOUR_TYPE_LABELS: Record<TourType, string> = {
  agent: "Agent Tour",
  self_guided: "Self-Guided Tour",
  virtual: "Virtual Tour",
}

const DEFAULT_TOUR_PRIORITY: TourType[] = ["agent", "self_guided", "virtual"]

const VIRTUAL_TOUR_URL_ERROR =
  "Please enter a complete HTTP/HTTPS URL (e.g., http://example.com or https://example.com)"

function validateVirtualTourLink(raw: string): string | null {
  const value = raw.trim()
  if (!value) return VIRTUAL_TOUR_URL_ERROR
  try {
    const url = new URL(value)
    if (url.protocol !== "http:" && url.protocol !== "https:") return VIRTUAL_TOUR_URL_ERROR
    if (!url.hostname.includes(".")) return VIRTUAL_TOUR_URL_ERROR
    return null
  } catch {
    return VIRTUAL_TOUR_URL_ERROR
  }
}

function normalizeTourPriority(raw: string[] | undefined): TourType[] {
  if (!raw || raw.length === 0) return DEFAULT_TOUR_PRIORITY
  const seen = new Set<TourType>()
  const ordered = raw.filter((t): t is TourType => t in TOUR_TYPE_LABELS && !seen.has(t as TourType) && (seen.add(t as TourType), true))
  // Append any tour types missing from the saved payload so the list is always complete.
  for (const t of DEFAULT_TOUR_PRIORITY) if (!seen.has(t)) ordered.push(t)
  return ordered
}

/* ══════════════════════════════════════════════════════════════════════════
   Pre-qualification — types, constants, defaults
   ══════════════════════════════════════════════════════════════════════════ */

type ConversationStart = "affordable_first" | "market_first"

type AffordableProgramType = "hud" | "tax_credit" | "home" | "public_housing" | "rural_development"

const AFFORDABLE_PROGRAM_TYPES: Array<{ value: AffordableProgramType; label: string }> = [
  { value: "hud", label: "HUD" },
  { value: "tax_credit", label: "Tax Credit" },
  { value: "home", label: "HOME" },
  { value: "public_housing", label: "Public Housing" },
  { value: "rural_development", label: "Rural Development" },
]

interface AffordableSettings {
  programType: AffordableProgramType
  affordablePrograms: AffordableProgram[]
  vouchersAccepted: boolean
  disabilityRequirement: boolean
  // Terminology controls
  programDisplayName: string
  avoidTerms: string
  approvedPhrase: string
  // Compliance-approved outcome messaging
  outcomeMessages: Record<string, string>
  // Adjustable income margin
  incomeMargin: string
  marginAction: "needs_review" | "handoff" | "soft_message"
  // Age requirement (optional)
  ageRestricted: boolean
  minimumAge: string
  ageQuestionWording: string
  fullStudentSection: boolean
  // Required documentation
  requiredDocuments: string[]
}

interface AffordableProgram {
  programType: AffordableProgramType
  incomeLimits: string[]
  vouchersAccepted: boolean
  disabilityRequirement: boolean
  programDisplayName: string
  avoidTerms: string
  approvedPhrase: string
  outcomeMessages: Record<string, string>
  incomeMargin: string
  marginAction: "needs_review" | "handoff" | "soft_message"
  ageRestricted: boolean
  minimumAge: string
  ageQuestionWording: string
  fullStudentSection: boolean
  requiredDocuments: string[]
  postQualificationGoals: PreQualGoal[]
}

const PROGRAM_PERSON_LABELS = Array.from({ length: 10 }, (_, index) => `${index + 1} person`)

function blankIncomeLimits() {
  return PROGRAM_PERSON_LABELS.map(() => "")
}

function affordableProgramLabel(programType: AffordableProgramType) {
  return AFFORDABLE_PROGRAM_TYPES.find((type) => type.value === programType)?.label ?? programType
}

type PreQualResult =
  | "qualified"
  | "over_income"
  | "under_income"
  | "unit_ineligible"
  | "potentially_qualified"
  | "in_progress"

type TourGoal = "offer" | "if_asked" | "none"
type ApplicationGoal = "offer" | "if_asked" | "none"

interface PreQualGoal {
  result: PreQualResult
  tour: TourGoal
  application: ApplicationGoal
  waitlist: TourGoal
  offerMarketRate: boolean
}

/* ── Deterministic pre-qualification: two supported criteria, three outcomes ── */

type TourPolicy = "proactive" | "on_request" | "blocked"
type ApplicationPolicy = "proactive" | "on_request" | "blocked"

/* ── Stance presets for prospects who don't meet the requirements ── */

type UnqualifiedStance = "continue" | "step_back" | "stop"

interface StanceConfig {
  label: string
  description: string
  tour: TourPolicy
  application: ApplicationPolicy
}

const UNQUALIFIED_STANCE_ORDER: UnqualifiedStance[] = ["continue", "step_back", "stop"]

const UNQUALIFIED_STANCES: Record<UnqualifiedStance, StanceConfig> = {
  continue: {
    label: "Continue",
    description: "ELI+ mentions the requirements aren\u2019t met, but tours and applications stay fully available.",
    tour: "proactive",
    application: "proactive",
  },
  step_back: {
    label: "Slow down",
    description: "ELI+ stops suggesting tours and applications, but will book or share them if the prospect asks.",
    tour: "on_request",
    application: "on_request",
  },
  stop: {
    label: "Stop",
    description: "No tours or application link, even if the prospect asks. The leasing team takes it from here.",
    tour: "blocked",
    application: "blocked",
  },
}

function validateIncomeMultiplier(raw: string): string | null {
  if (!raw.trim()) return "A multiplier is required when this criterion is enabled."
  const n = Number(raw)
  if (!Number.isFinite(n)) return "Enter a numeric value."
  if (n < 1 || n > 10) return "Enter a value between 1.0 and 10.0."
  if (Math.abs(n * 10 - Math.round(n * 10)) > 1e-9) return "Use increments of 0.1."
  return null
}

function validateCreditScore(raw: string): string | null {
  if (!raw.trim()) return "A minimum score is required when this criterion is enabled."
  const n = Number(raw)
  if (!Number.isFinite(n)) return "Enter a numeric value."
  if (!Number.isInteger(n)) return "Whole numbers only."
  if (n < 300 || n > 850) return "Enter a value between 300 and 850."
  return null
}

function formatMultiplier(raw: string): string {
  if (validateIncomeMultiplier(raw) !== null) return "\u2014"
  return String(Math.round(Number(raw) * 10) / 10)
}

function formatScore(raw: string): string {
  return validateCreditScore(raw) === null ? String(Number(raw)) : "\u2014"
}

const PREQUAL_RESULT_LABELS: Record<PreQualResult, string> = {
  qualified: "Qualified",
  over_income: "Over-income",
  under_income: "Under-income",
  unit_ineligible: "Unit-ineligible",
  potentially_qualified: "Potentially qualified",
  in_progress: "In progress",
}

const PREQUAL_RESULT_BADGE: Record<PreQualResult, string> = {
  qualified: "bg-emerald-100 text-emerald-800",
  over_income: "bg-amber-100 text-amber-800",
  under_income: "bg-red-100 text-red-700",
  unit_ineligible: "bg-amber-100 text-amber-800",
  potentially_qualified: "bg-blue-100 text-blue-800",
  in_progress: "bg-zinc-100 text-zinc-600",
}

const TOUR_GOAL_LABELS: Record<TourGoal, string> = {
  offer: "Proactively offer",
  if_asked: "Only if asked",
  none: "Do not offer",
}

const APP_GOAL_LABELS: Record<ApplicationGoal, string> = {
  offer: "Proactively share",
  if_asked: "Only if asked",
  none: "Do not share",
}

const DEFAULT_PREQUAL_GOALS: PreQualGoal[] = [
  { result: "qualified",             tour: "offer",    application: "offer",    waitlist: "none",     offerMarketRate: false },
  { result: "over_income",           tour: "none",     application: "none",     waitlist: "if_asked", offerMarketRate: true },
  { result: "under_income",          tour: "if_asked", application: "none",     waitlist: "offer",    offerMarketRate: false },
  { result: "unit_ineligible",       tour: "if_asked", application: "none",     waitlist: "if_asked", offerMarketRate: true },
  { result: "potentially_qualified", tour: "offer",    application: "offer",    waitlist: "none",     offerMarketRate: false },
  { result: "in_progress",           tour: "none",     application: "none",     waitlist: "none",     offerMarketRate: false },
]

const DEFAULT_OUTCOME_MESSAGES = {
  over_income: "Based on what you shared, your estimated income may be above the limit for this affordable unit. Final eligibility is determined during the application review.",
  under_income: "Based on the information provided, you may not meet the initial income criteria for this program. Final eligibility is determined through the formal application and compliance review.",
}

function makeDefaultAffordableProgram(programType: AffordableProgramType): AffordableProgram {
  return {
    programType,
    incomeLimits: blankIncomeLimits(),
    vouchersAccepted: false,
    disabilityRequirement: false,
    programDisplayName: "",
    avoidTerms: "",
    approvedPhrase: "",
    outcomeMessages: { ...DEFAULT_OUTCOME_MESSAGES },
    incomeMargin: "",
    marginAction: "needs_review",
    ageRestricted: false,
    minimumAge: "",
    ageQuestionWording: "",
    fullStudentSection: false,
    requiredDocuments: ["Government-issued ID", "4 most recent pay stubs", "Bank statements"],
    postQualificationGoals: DEFAULT_PREQUAL_GOALS.map((goal) => ({ ...goal })),
  }
}


/* ══════════════════════════════════════════════════════════════════════════
   Property mock-data shim
   ══════════════════════════════════════════════════════════════════════════ */

interface DerivedPropertyData {
  vertical: "Conventional" | "Student" | "Affordable"
  affordable: { lihtc: boolean; section8: boolean; mixedIncome: boolean }
}

const PROPERTY_PROFILES: Record<string, Partial<DerivedPropertyData>> = {
  "Aspen Heights":           { vertical: "Conventional" },
  "14th North Parkway":      { vertical: "Conventional" },
  "The Rails on Main":       { vertical: "Conventional" },
  "Summit View at Lakewood": { vertical: "Student" },
  "Bellamy Place":           { vertical: "Conventional" },
  "Ivy Gate Residences":     { vertical: "Affordable",   affordable: { lihtc: true, section8: true, mixedIncome: false } },
  "Copper Ridge":            { vertical: "Conventional" },
  "Harborstone Landing":     { vertical: "Conventional" },
  "Harvest Peak Capital":    { vertical: "Conventional" },
  "Skyline Apartments":      { vertical: "Conventional" },
  "The Meridian":            { vertical: "Conventional" },
  "Oakwood Village":         { vertical: "Conventional" },
  "Pine Ridge Estates":      { vertical: "Conventional" },
  "Campus View":             { vertical: "Student" },
  "Metro Heights":           { vertical: "Conventional" },
  "Lakeside Commons":        { vertical: "Conventional" },
  "Heritage Place":          { vertical: "Affordable",   affordable: { lihtc: true, section8: false, mixedIncome: true } },
  "Summit Towers":           { vertical: "Conventional" },
  "Jamison Apartments":      { vertical: "Conventional" },
}

function deriveProperty(name: string): DerivedPropertyData {
  const profile = PROPERTY_PROFILES[name] ?? {}
  return {
    vertical: profile.vertical ?? "Conventional",
    affordable: profile.affordable ?? { lihtc: false, section8: false, mixedIncome: false },
  }
}

function isApplicationModeEligible(derived: DerivedPropertyData): boolean {
  const hasAffordableUnits =
    derived.affordable.lihtc || derived.affordable.section8 || derived.affordable.mixedIncome
  return derived.vertical === "Conventional" && !hasAffordableUnits
}

/* ══════════════════════════════════════════════════════════════════════════
   Settings state
   ══════════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════════
   Leasing Questions — conversation requirements
   ══════════════════════════════════════════════════════════════════════════ */

type QuestionTypeId =
  | "name" | "email" | "phone"
  | "move_in_date" | "floor_plan" | "bedrooms" | "bathrooms" | "preferred_unit"
  | "rent_range" | "floor" | "desired_amenities" | "furnishing_options"
  | "occupants"
  | "lead_source"
  | "current_address" | "reason_for_move_out" | "date_of_birth" | "gender" | "preferred_language"

interface QuestionCategory {
  label: string
  questions: { id: QuestionTypeId; label: string }[]
}

const QUESTION_LIBRARY: QuestionCategory[] = [
  { label: "Contact Information", questions: [
    { id: "name", label: "Name" },
    { id: "email", label: "Email" },
    { id: "phone", label: "Phone" },
  ] },
  { label: "Move Preferences", questions: [
    { id: "move_in_date", label: "Move-in Date" },
    { id: "floor_plan", label: "Floor Plan" },
    { id: "bedrooms", label: "Bedrooms" },
    { id: "bathrooms", label: "Bathrooms" },
    { id: "preferred_unit", label: "Preferred Unit" },
  ] },
  { label: "Budget & Home Preferences", questions: [
    { id: "rent_range", label: "Rent Range/Budget" },
    { id: "floor", label: "Floor" },
    { id: "desired_amenities", label: "Desired Amenities" },
    { id: "furnishing_options", label: "Furnishing Options" },
  ] },
  { label: "Household", questions: [
    { id: "occupants", label: "Occupants" },
  ] },
  { label: "Lead Information", questions: [
    { id: "lead_source", label: "Lead Source" },
  ] },
  { label: "Personal Information", questions: [
    { id: "current_address", label: "Current Address" },
    { id: "reason_for_move_out", label: "Reason for Move-Out" },
    { id: "date_of_birth", label: "Date of Birth" },
    { id: "gender", label: "Gender" },
    { id: "preferred_language", label: "Preferred Language" },
  ] },
]

const QUESTION_LABELS = Object.fromEntries(
  QUESTION_LIBRARY.flatMap((category) => category.questions.map((q) => [q.id, q.label])),
) as Record<QuestionTypeId, string>

type LeasingStageId = "before_chat" | "before_pricing" | "before_tour" | "before_application"
/**
 * required  — cannot bypass; the agent keeps asking / blocks the gate until answered.
 * preferred — persistent but bypassable; the agent re-asks after resistance, then
 *             advances once `bypassAfter` unsuccessful attempts are reached.
 * optional  — asked once, but never blocks progress.
 */
type QuestionRequirement = "required" | "preferred" | "optional"
type BypassAttempts = 1 | 2 | 3
type GroupMode = "all" | "any" | "preferred" | "optional"

const REQUIREMENT_LABELS: Record<QuestionRequirement, string> = {
  required: "Required",
  preferred: "Preferred",
  optional: "Optional",
}

const DEFAULT_BYPASS_ATTEMPTS: BypassAttempts = 2

interface StageQuestion {
  id: string
  type: QuestionTypeId
  requirement: QuestionRequirement
  groupId: string | null
  /** Only meaningful when requirement is "preferred": how many times the agent
   *  re-asks after resistance before advancing without an answer. */
  bypassAfter?: BypassAttempts
  /** Locked questions are mandatory: they can't be removed, ungrouped, or moved
   *  to another group, and their requirement can't be changed. */
  locked?: boolean
}

interface StageGroup {
  id: string
  label: string
  mode: GroupMode
  /** Only meaningful when mode is "preferred": how many times the agent re-asks
   *  the group after resistance before advancing. */
  bypassAfter?: BypassAttempts
  /** Locked groups are mandatory when the stage is on: they can't be deleted or
   *  renamed and their mode is fixed. */
  locked?: boolean
}

interface LeasingStageConfig {
  enabled: boolean
  questions: StageQuestion[]
  groups: StageGroup[]
}

const GROUP_MODE_LABELS: Record<GroupMode, string> = {
  all: "Require all",
  any: "Require any 1",
  preferred: "Preferred",
  optional: "Optional group",
}

const GROUP_MODE_DESCRIPTIONS: Record<GroupMode, string> = {
  all: "Every required question in this group must be answered.",
  any: "The agent needs any one answer in this group to satisfy the requirement.",
  preferred: "The agent asks for these persistently, then continues after the set number of attempts.",
  optional: "Questions are asked in order, but the group never blocks progress.",
}

interface LeasingStageMeta {
  id: LeasingStageId
  title: string
  description: string
  behavior: string
}

const LEASING_STAGES: LeasingStageMeta[] = [
  {
    id: "before_chat",
    title: "Before Chat Starts",
    description: "Collect information before the agent begins the normal conversation.",
    behavior: "When on, the agent asks these questions before answering property, pricing, availability, tour, or application questions. Example: if Name is required and the prospect asks “Do you allow pets?”, the agent requests the required info first.",
  },
  {
    id: "before_pricing",
    title: "Before Showing Pricing & Availability",
    description: "Collect qualifying information before revealing specific pricing or availability.",
    behavior: "The agent can answer general questions first, but won't share available homes, units, rent, lease-term pricing, or availability dates until required fields are collected.",
  },
  {
    id: "before_tour",
    title: "Before Showing Tour Options",
    description: "Collect what the prospect is looking for before the agent shows specific tour options.",
    behavior: "The agent can talk about touring generally, but won't surface specific tour options or times until required fields are collected. Preferred questions are re-asked after resistance, then bypassed.",
  },
  {
    id: "before_application",
    title: "Before Application Invitation",
    description: "Information required before the agent proactively invites the prospect to apply or shares an application link.",
    behavior: "When on, the agent won't extend an application invitation until required fields are collected.",
  },
]

let leasingQuestionIdCounter = 0
function makeQuestionId() {
  leasingQuestionIdCounter += 1
  return `lq_${Date.now().toString(36)}_${leasingQuestionIdCounter}`
}

function makeDefaultLeasingStages(): Record<LeasingStageId, LeasingStageConfig> {
  // Deterministic ids so the initial state and pristine snapshot match exactly
  // (a random id here would flag the form dirty on mount).
  const q = (stage: LeasingStageId, i: number, type: QuestionTypeId, requirement: QuestionRequirement): StageQuestion => ({
    id: `${stage}-${i}`, type, requirement, groupId: null,
  })
  return {
    before_chat: {
      enabled: false,
      groups: [],
      questions: [
        q("before_chat", 1, "name", "required"),
        q("before_chat", 2, "phone", "required"),
        q("before_chat", 3, "email", "optional"),
      ],
    },
    before_pricing: {
      enabled: true,
      groups: [{ id: "before_pricing-layout", label: "Layout", mode: "any", locked: true }],
      questions: [
        { id: "before_pricing-movein", type: "move_in_date", requirement: "required", groupId: null, locked: true },
        { id: "before_pricing-1", type: "floor_plan", requirement: "required", groupId: "before_pricing-layout", locked: true },
        { id: "before_pricing-2", type: "bedrooms", requirement: "required", groupId: "before_pricing-layout", locked: true },
      ],
    },
    before_tour: {
      enabled: true,
      groups: [{ id: "before_tour-layout", label: "Layout", mode: "any" }],
      questions: [
        { id: "before_tour-1", type: "floor_plan", requirement: "required", groupId: "before_tour-layout" },
        { id: "before_tour-2", type: "bedrooms", requirement: "required", groupId: "before_tour-layout" },
        { id: "before_tour-3", type: "move_in_date", requirement: "preferred", groupId: null, bypassAfter: 2 },
      ],
    },
    before_application: {
      enabled: false,
      groups: [],
      questions: [
        q("before_application", 1, "move_in_date", "required"),
        q("before_application", 2, "bedrooms", "required"),
        q("before_application", 3, "occupants", "required"),
        q("before_application", 4, "rent_range", "optional"),
      ],
    },
  }
}

interface PanelState {
  agentName: string
  conversationMode: ConversationModeId
  requireGuestCard: boolean
  tourPriority: TourType[]
  virtualTourLink: string
  externalSelfGuidedTourLink: string
  externalAgentGuidedTourLink: string
  preQualEnabled: boolean
  incomeEnabled: boolean
  incomeMultiplier: string
  creditEnabled: boolean
  creditMinScore: string
  unqualifiedStance: UnqualifiedStance
  affordableFlowEnabled: boolean
  conversationStart: ConversationStart
  affordableSettings: AffordableSettings
  preQualGoals: PreQualGoal[]
  leasingStages: Record<LeasingStageId, LeasingStageConfig>
}

function makeDefaultState(agentDisplayLabel = "Leasing AI"): PanelState {
  return {
    agentName: agentDisplayLabel,
    conversationMode: DEFAULT_MODE,
    requireGuestCard: false,
    tourPriority: DEFAULT_TOUR_PRIORITY,
    virtualTourLink: "",
    externalSelfGuidedTourLink: "",
    externalAgentGuidedTourLink: "",
    preQualEnabled: false,
    incomeEnabled: true,
    incomeMultiplier: "3.0",
    creditEnabled: false,
    creditMinScore: "600",
    unqualifiedStance: "step_back",
    affordableFlowEnabled: false,
    conversationStart: "market_first",
    affordableSettings: {
      programType: "hud",
      affordablePrograms: [],
      vouchersAccepted: false, disabilityRequirement: false,
      programDisplayName: "", avoidTerms: "", approvedPhrase: "",
      outcomeMessages: {
        over_income: "Based on what you shared, your estimated income may be above the limit for this affordable unit. Final eligibility is determined during the application review.",
        under_income: "Based on the information provided, you may not meet the initial income criteria for this program. Final eligibility is determined through the formal application and compliance review.",
      },
      incomeMargin: "", marginAction: "needs_review",
      ageRestricted: false, minimumAge: "", ageQuestionWording: "", fullStudentSection: false,
      requiredDocuments: ["Government-issued ID", "4 most recent pay stubs", "Bank statements"],
    },
    preQualGoals: DEFAULT_PREQUAL_GOALS,
    leasingStages: makeDefaultLeasingStages(),
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   Public component
   ══════════════════════════════════════════════════════════════════════════ */

interface Props {
  propertyName: string
  agentDisplayLabel?: string
  /** Accepted for compatibility with the OXP agent-roster integration. */
  simulationCount?: number
  /** Accepted for compatibility with the OXP agent-roster integration. */
  onOpenSimulation?: () => void
}

export function LeasingAISettingsPanel({
  propertyName,
  agentDisplayLabel = "Leasing AI",
}: Props) {
  const initialAgentDisplayLabel = agentDisplayLabel.trim() || "Leasing AI"
  const derived = useMemo(() => deriveProperty(propertyName), [propertyName])
  const appModeEligible = useMemo(() => isApplicationModeEligible(derived), [derived])

  const [state, setState] = useState<PanelState>(() => makeDefaultState(initialAgentDisplayLabel))
  const [pristine, setPristine] = useState<PanelState>(() => makeDefaultState(initialAgentDisplayLabel))
  const [backendStatus, setBackendStatus] = useState<"idle" | "ok" | "error">("idle")
  const [activeTab, setActiveTab] = useState<LeasingSettingsTab>("settings")
  const resolvedAgentDisplayLabel = state.agentName.trim() || initialAgentDisplayLabel

  const CHATBOT_API = "http://localhost:8000"

  useEffect(() => {
    fetch(`${CHATBOT_API}/sales-mode`)
      .then((res) => { if (res.ok) return res.json(); throw new Error() })
      .then((data: {
        agent_display_name?: string
        mode_id?: string
        tour_priority?: string[]
        virtual_tour_link?: string
        external_self_guided_tour_link?: string
        external_agent_guided_tour_link?: string
        prequalification_enabled?: boolean
        conversation_start?: string
        vouchers_accepted?: boolean
        disability_requirement?: boolean
        full_student_section?: boolean
        program_type?: string
        affordable_programs?: Array<{
          program_type?: string
          income_limits?: unknown
          vouchers_accepted?: boolean
          disability_requirement?: boolean
          program_display_name?: string
          avoid_terms?: string
          approved_phrase?: string
          outcome_messages?: Record<string, string>
          income_margin?: string
          margin_action?: string
          age_restricted?: boolean
          minimum_age?: string
          age_question_wording?: string
          full_student_section?: boolean
          required_documents?: string[]
          post_qualification_goals?: Array<{ result: string; tour: string; application: string; waitlist?: string; offer_market_rate: boolean }>
        }>
        prequalification_criteria?: {
          income?: { enabled?: boolean; multiplier?: number | string }
          credit?: { enabled?: boolean; min_score?: number | string }
        }
        prequalification_actions?: { outcome?: string; tour?: string; application?: string }[]
        prequalification_goals?: { result: string; tour: string; application: string; waitlist?: string; offer_market_rate: boolean }[]
        leasing_questions?: Record<LeasingStageId, LeasingStageConfig>
      }) => {
        const defaults = makeDefaultState(initialAgentDisplayLabel)
        const loaded: Partial<PanelState> = {
          agentName: data.agent_display_name?.trim() || initialAgentDisplayLabel,
          conversationMode: normalizeModeId(data.mode_id),
          tourPriority: normalizeTourPriority(data.tour_priority),
          virtualTourLink: data.virtual_tour_link ?? "",
          externalSelfGuidedTourLink: data.external_self_guided_tour_link ?? "",
          externalAgentGuidedTourLink: data.external_agent_guided_tour_link ?? "",
          preQualEnabled: Boolean(data.prequalification_enabled),
          conversationStart: (data.conversation_start as ConversationStart) ?? "market_first",
          affordableSettings: {
            ...defaults.affordableSettings,
            programType: AFFORDABLE_PROGRAM_TYPES.some((type) => type.value === data.program_type)
              ? data.program_type as AffordableProgramType
              : defaults.affordableSettings.programType,
            affordablePrograms: (data.affordable_programs ?? []).flatMap((program) => {
              const programType = program.program_type as AffordableProgramType
              if (!AFFORDABLE_PROGRAM_TYPES.some((type) => type.value === programType)) return []
              const defaultsForProgram = makeDefaultAffordableProgram(programType)
              const incomeLimits = Array.isArray(program.income_limits)
                ? program.income_limits.slice(0, PROGRAM_PERSON_LABELS.length).map((value) => String(value ?? ""))
                : blankIncomeLimits()
              return [{
                ...defaultsForProgram,
                incomeLimits: [...incomeLimits, ...blankIncomeLimits()].slice(0, PROGRAM_PERSON_LABELS.length),
                vouchersAccepted: Boolean(program.vouchers_accepted),
                disabilityRequirement: Boolean(program.disability_requirement),
                programDisplayName: program.program_display_name ?? "",
                avoidTerms: program.avoid_terms ?? "",
                approvedPhrase: program.approved_phrase ?? "",
                outcomeMessages: { ...defaultsForProgram.outcomeMessages, ...(program.outcome_messages ?? {}) },
                incomeMargin: program.income_margin ?? "",
                marginAction: (program.margin_action as AffordableProgram["marginAction"]) ?? defaultsForProgram.marginAction,
                ageRestricted: Boolean(program.age_restricted),
                minimumAge: program.minimum_age ?? "",
                ageQuestionWording: program.age_question_wording ?? "",
                fullStudentSection: Boolean(program.full_student_section),
                requiredDocuments: program.required_documents ?? defaultsForProgram.requiredDocuments,
                postQualificationGoals: program.post_qualification_goals?.map((goal) => ({
                  result: goal.result as PreQualResult,
                  tour: goal.tour as TourGoal,
                  application: goal.application as ApplicationGoal,
                  waitlist: (goal.waitlist as TourGoal) ?? "none",
                  offerMarketRate: Boolean(goal.offer_market_rate),
                })) ?? defaultsForProgram.postQualificationGoals,
              }]
            }),
            vouchersAccepted: Boolean(data.vouchers_accepted),
            disabilityRequirement: Boolean(data.disability_requirement),
            fullStudentSection: Boolean(data.full_student_section),
          },
        }
        if (data.prequalification_criteria) {
          const inc = data.prequalification_criteria.income
          if (inc) {
            loaded.incomeEnabled = Boolean(inc.enabled)
            if (inc.multiplier != null) loaded.incomeMultiplier = String(inc.multiplier)
          }
          const cred = data.prequalification_criteria.credit
          if (cred) {
            loaded.creditEnabled = Boolean(cred.enabled)
            if (cred.min_score != null) loaded.creditMinScore = String(cred.min_score)
          }
        }
        if (data.prequalification_actions && data.prequalification_actions.length > 0) {
          const dnm = data.prequalification_actions.find((a) => a.outcome === "does_not_meet")
          if (dnm) {
            loaded.unqualifiedStance =
              dnm.tour === "blocked" ? "stop" : dnm.tour === "on_request" ? "step_back" : "continue"
          }
        }
        if (data.prequalification_goals && data.prequalification_goals.length > 0) {
          loaded.preQualGoals = data.prequalification_goals.map((g) => ({
            result: g.result as PreQualResult,
            tour: g.tour as TourGoal,
            application: g.application as ApplicationGoal,
            waitlist: (g.waitlist as TourGoal) ?? "none",
            offerMarketRate: Boolean(g.offer_market_rate),
          }))
        }
        if (data.leasing_questions) {
          loaded.leasingStages = { ...defaults.leasingStages, ...data.leasing_questions }
        }
        setState((s) => ({ ...s, ...loaded }))
        setPristine((s) => ({ ...s, ...loaded }))
        setBackendStatus("ok")
      })
      .catch(() => setBackendStatus("error"))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAgentDisplayLabel])

  useEffect(() => {
    if (!appModeEligible && state.conversationMode === "maximize-application") {
      setState((s) => ({ ...s, conversationMode: DEFAULT_MODE }))
    }
  }, [appModeEligible, state.conversationMode])

  const dirty = JSON.stringify(state) !== JSON.stringify(pristine)
  const update = <K extends keyof PanelState>(key: K, value: PanelState[K]) =>
    setState((s) => ({ ...s, [key]: value }))

  const saveBlockers = useMemo(() => {
    const blockers: string[] = []
    if (state.virtualTourLink.trim().length > 0) {
      const err = validateVirtualTourLink(state.virtualTourLink)
      if (err) blockers.push(`Virtual Tour Link: ${err}`)
    }
    if (state.externalSelfGuidedTourLink.trim().length > 0) {
      const err = validateVirtualTourLink(state.externalSelfGuidedTourLink)
      if (err) blockers.push(`External Self-Guided Tour Link: ${err}`)
    }
    if (state.externalAgentGuidedTourLink.trim().length > 0) {
      const err = validateVirtualTourLink(state.externalAgentGuidedTourLink)
      if (err) blockers.push(`External Agent Guided Tour Link: ${err}`)
    }
    if (!state.preQualEnabled) return blockers
    if (!state.incomeEnabled && !state.creditEnabled)
      blockers.push("Pre-qualification requires at least one enabled criterion.")
    if (state.incomeEnabled) {
      const err = validateIncomeMultiplier(state.incomeMultiplier)
      if (err) blockers.push(`Income-to-rent requirement: ${err}`)
    }
    if (state.creditEnabled) {
      const err = validateCreditScore(state.creditMinScore)
      if (err) blockers.push(`Credit-score requirement: ${err}`)
    }
    return blockers
  }, [state.virtualTourLink, state.externalSelfGuidedTourLink, state.externalAgentGuidedTourLink, state.preQualEnabled, state.incomeEnabled, state.incomeMultiplier, state.creditEnabled, state.creditMinScore])

  const syncToBackend = useCallback((s: PanelState) => {
    const activeMode = CONVERSATION_MODES.find((m) => m.id === s.conversationMode)
    const activeAffordableProgram = s.affordableSettings.affordablePrograms.find((program) => program.programType === s.affordableSettings.programType)
    fetch(`${CHATBOT_API}/sales-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode_id: s.conversationMode,
        agent_display_name: s.agentName.trim() || initialAgentDisplayLabel,
        mode_name: activeMode?.name ?? s.conversationMode,
        conversion_goal: activeMode?.conversionGoal ?? "schedule_tours",
        tour_priority: s.tourPriority,
        virtual_tour_link: s.virtualTourLink.trim() || undefined,
        external_self_guided_tour_link: s.externalSelfGuidedTourLink.trim() || undefined,
        external_agent_guided_tour_link: s.externalAgentGuidedTourLink.trim() || undefined,
        prequalification_enabled: s.preQualEnabled,
        conversation_start: s.preQualEnabled ? s.conversationStart : undefined,
        program_type: s.preQualEnabled ? s.affordableSettings.programType : undefined,
        affordable_programs: s.preQualEnabled
          ? s.affordableSettings.affordablePrograms.map((program) => ({
              program_type: program.programType,
              income_limits: program.incomeLimits,
              vouchers_accepted: program.vouchersAccepted,
              disability_requirement: program.disabilityRequirement,
              program_display_name: program.programDisplayName,
              avoid_terms: program.avoidTerms,
              approved_phrase: program.approvedPhrase,
              outcome_messages: program.outcomeMessages,
              income_margin: program.incomeMargin,
              margin_action: program.marginAction,
              age_restricted: program.ageRestricted,
              minimum_age: program.minimumAge,
              age_question_wording: program.ageQuestionWording,
              full_student_section: program.fullStudentSection,
              required_documents: program.requiredDocuments,
              post_qualification_goals: program.postQualificationGoals.map((goal) => ({ result: goal.result, tour: goal.tour, application: goal.application, waitlist: goal.waitlist, offer_market_rate: goal.offerMarketRate })),
            }))
          : [],
        vouchers_accepted: s.preQualEnabled ? activeAffordableProgram?.vouchersAccepted : undefined,
        disability_requirement: s.preQualEnabled ? activeAffordableProgram?.disabilityRequirement : undefined,
        full_student_section: s.preQualEnabled ? activeAffordableProgram?.fullStudentSection : undefined,
        prequalification_criteria: s.preQualEnabled
          ? {
              income: { enabled: s.incomeEnabled, multiplier: s.incomeEnabled ? Number(s.incomeMultiplier) : undefined },
              credit: { enabled: s.creditEnabled, min_score: s.creditEnabled ? Number(s.creditMinScore) : undefined },
            }
          : undefined,
        prequalification_actions: s.preQualEnabled
          ? [
              { outcome: "meets", tour: "proactive", application: "proactive" },
              {
                outcome: "does_not_meet",
                tour: UNQUALIFIED_STANCES[s.unqualifiedStance].tour,
                application: UNQUALIFIED_STANCES[s.unqualifiedStance].application,
              },
            ]
          : [],
        prequalification_goals: s.preQualEnabled
          ? (activeAffordableProgram?.postQualificationGoals ?? s.preQualGoals).map((g) => ({ result: g.result, tour: g.tour, application: g.application, waitlist: g.waitlist, offer_market_rate: g.offerMarketRate }))
          : [],
        leasing_questions: s.leasingStages,
      }),
    })
      .then(() => setBackendStatus("ok"))
      .catch(() => setBackendStatus("error"))
  }, [])

  const handleSave = () => {
    if (saveBlockers.length > 0) return
    setPristine(state)
    syncToBackend(state)
  }
  const handleDiscard = () => setState(pristine)

  return (
    <div className="flex h-full flex-col relative">
      <header className="border-b border-border bg-white px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{resolvedAgentDisplayLabel} Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure how {resolvedAgentDisplayLabel} guides prospects at <strong>{propertyName}</strong>.
              Set the conversation mode and optional pre-qualification flow for this property.
            </p>
          </div>
          <Badge variant="gray" className="shrink-0">
            <Lock className="mr-1 h-3 w-3" />
            Property scope
          </Badge>
        </div>
        <div className="mt-5 flex items-center gap-1 border-b border-border/80">
          {([
            { id: "settings" as LeasingSettingsTab, label: "Settings" },
            { id: "pre-tour-nurture" as LeasingSettingsTab, label: "Pre-tour nurture" },
            { id: "post-tour-nurture" as LeasingSettingsTab, label: "Post-tour nurture" },
          ]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-zinc-900" />
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 pb-32 pt-6">
        {activeTab === "settings" ? (
          <div className="mx-auto max-w-3xl space-y-8">
            <GroupHeading label={`${resolvedAgentDisplayLabel} Settings`} />
            <SectionAgentIdentity state={state} update={update} />
            <SectionConversationMode state={state} update={update} appModeEligible={appModeEligible} agentDisplayLabel={resolvedAgentDisplayLabel} />
            <SectionTourPriority state={state} update={update} />
            <SectionVirtualTourLink state={state} update={update} />
            <SectionPreQualification state={state} update={update} />
            <SectionAffordable state={state} update={update} setState={setState} />
            <GroupHeading label="Leasing Questions" />
            <SectionLeasingQuestions state={state} setState={setState} />
          </div>
        ) : (
          <div className="mx-auto max-w-6xl">
            {activeTab === "pre-tour-nurture" ? (
              <PreTourNurtureTab />
            ) : (
              <PostTourNurtureTab />
            )}
          </div>
        )}
      </div>

      <FooterActionBar dirty={dirty} blockers={saveBlockers} onSave={handleSave} onDiscard={handleDiscard} backendStatus={backendStatus} />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Group heading
   ══════════════════════════════════════════════════════════════════════════ */

function GroupHeading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="flex-1 border-t border-border" />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Agent identity
   ══════════════════════════════════════════════════════════════════════════ */

function SectionAgentIdentity({ state, update }: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
}) {
  return (
    <SectionShell
      icon={ShieldCheck}
      title="Agent Name"
      description="Choose the display name shown for this leasing agent in the ELI+ settings experience."
    >
      <div className="space-y-2">
        <Input
          value={state.agentName}
          onChange={(e) => update("agentName", e.target.value)}
          placeholder="Enter agent name"
          aria-label="Agent name"
          className="h-9 text-sm"
        />
        <p className="text-[11px] text-muted-foreground">
          Use a custom name if you want this agent to appear as something other than ELI+.
        </p>
      </div>
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Section shell
   ══════════════════════════════════════════════════════════════════════════ */

function SectionShell({ icon: Icon, title, description, headerAction, children }: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  title: string
  description: string
  headerAction?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-white">
      <div className="flex items-start gap-3 border-b border-border px-5 py-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {headerAction && <div className="shrink-0 self-center">{headerAction}</div>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Conversation Mode
   ══════════════════════════════════════════════════════════════════════════ */

function SectionConversationMode({ state, update, appModeEligible, agentDisplayLabel }: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
  appModeEligible: boolean
  agentDisplayLabel: string
}) {
  return (
    <SectionShell
      icon={MessageSquare}
      title="Conversation Mode"
      description={`Choose how ${agentDisplayLabel} prioritizes and converts prospects at this property.`}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CONVERSATION_MODES.map((m) => {
            const active = state.conversationMode === m.id
            const blocked = m.requiresConventionalNoAffordable && !appModeEligible
            return (
              <button
                key={m.id}
                type="button"
                disabled={blocked}
                onClick={() => !blocked && update("conversationMode", m.id)}
                className={cn(
                  "rounded-lg border px-4 py-4 text-left text-xs transition-all",
                  blocked
                    ? "cursor-not-allowed border-dashed border-border bg-zinc-50 opacity-60"
                    : active
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                      : "border-border bg-white text-foreground hover:border-zinc-400",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold leading-snug">{m.name}</span>
                  {m.id === "maximize-tour" && <Badge variant="gray" className="text-[9px]">Default</Badge>}
                </div>
                <div className={cn("mt-1.5 text-[11px] leading-snug", active ? "text-white/75" : "text-muted-foreground")}>
                  {m.description}
                </div>
                {blocked && (
                  <div className="mt-2 flex items-start gap-1 text-[10px] font-medium text-amber-700">
                    <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                    Conventional, non-affordable only
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Require Guest Card checkbox */}
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="require-guest-card"
            checked={state.requireGuestCard}
            onCheckedChange={(checked) => update("requireGuestCard", checked === true)}
          />
          <label htmlFor="require-guest-card" className="text-xs font-medium text-foreground cursor-pointer select-none">
            Require Guest Card Information to chat
          </label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-[11px]">
                Warning: enabling this setting will require the prospect to provide first name, last name, and a phone number before the chatbot will answer any question.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Tour Priority
   ══════════════════════════════════════════════════════════════════════════ */

function SectionTourPriority({ state, update }: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= state.tourPriority.length) return
    const next = [...state.tourPriority]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    update("tourPriority", next)
  }

  const resetDrag = () => {
    setDragIndex(null)
    setOverIndex(null)
  }

  return (
    <SectionShell
      icon={ListOrdered}
      title="Tour Priority"
      description="Top card is the highest priority, bottom card is the lowest. Drag to reorder the tour types ELI+ offers first."
    >
      <div className="space-y-2">
        {state.tourPriority.map((tour, i) => {
          const isDragging = dragIndex === i
          const isDropTarget = overIndex === i && dragIndex !== null && dragIndex !== i
          return (
            <div
              key={tour}
              draggable
              tabIndex={0}
              role="button"
              aria-label={`${TOUR_TYPE_LABELS[tour]}, priority ${i + 1} of ${state.tourPriority.length}. Use arrow up or down to reorder.`}
              onDragStart={(e) => {
                setDragIndex(i)
                e.dataTransfer.effectAllowed = "move"
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
                setOverIndex(i)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragIndex !== null) move(dragIndex, i)
                resetDrag()
              }}
              onDragEnd={resetDrag}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault()
                  move(i, i - 1)
                } else if (e.key === "ArrowDown") {
                  e.preventDefault()
                  move(i, i + 1)
                }
              }}
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-white px-4 py-3.5 transition-all cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900",
                isDragging && "opacity-50",
                isDropTarget
                  ? "border-zinc-900 ring-1 ring-zinc-900"
                  : "border-border hover:border-zinc-400",
              )}
            >
              <GripVertical className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
              <span className="text-sm font-medium text-foreground">{TOUR_TYPE_LABELS[tour]}</span>
            </div>
          )
        })}
      </div>
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Virtual Tour Link
   ══════════════════════════════════════════════════════════════════════════ */

function SectionVirtualTourLink({ state, update }: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
}) {
  const virtualError = state.virtualTourLink.trim().length > 0 ? validateVirtualTourLink(state.virtualTourLink) : null
  const selfGuidedError = state.externalSelfGuidedTourLink.trim().length > 0 ? validateVirtualTourLink(state.externalSelfGuidedTourLink) : null
  const agentGuidedError = state.externalAgentGuidedTourLink.trim().length > 0 ? validateVirtualTourLink(state.externalAgentGuidedTourLink) : null

  return (
    <SectionShell
      icon={LinkIcon}
      title="External Tour Links"
      description="Input a URL for a Virtual Tour, if you want the agent to share the link immediately upon request."
      headerAction={
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="About external tour links" className="text-muted-foreground transition-colors hover:text-foreground">
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs px-3.5 py-3">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                If a URL exists for one of these external tour links, the agent will default to that link when booking that tour type.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Virtual Tour Link</p>
          <div className="relative">
            <LinkIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="url"
              inputMode="url"
              value={state.virtualTourLink}
              onChange={(e) => update("virtualTourLink", e.target.value)}
              placeholder="Enter virtual tour link"
              aria-label="Virtual tour link"
              aria-invalid={virtualError !== null}
              className={cn("h-9 pl-8 text-xs", virtualError && "border-red-400 focus-visible:ring-red-400")}
            />
          </div>
          {virtualError && <p className="mt-1.5 text-[10px] font-medium text-red-600">{virtualError}</p>}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">External Self-Guided Tour Link</p>
          <div className="relative">
            <LinkIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="url"
              inputMode="url"
              value={state.externalSelfGuidedTourLink}
              onChange={(e) => update("externalSelfGuidedTourLink", e.target.value)}
              placeholder="Enter external self-guided tour link"
              aria-label="External self-guided tour link"
              aria-invalid={selfGuidedError !== null}
              className={cn("h-9 pl-8 text-xs", selfGuidedError && "border-red-400 focus-visible:ring-red-400")}
            />
          </div>
          {selfGuidedError && <p className="mt-1.5 text-[10px] font-medium text-red-600">{selfGuidedError}</p>}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">External Agent Guided Tour Link</p>
          <div className="relative">
            <LinkIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="url"
              inputMode="url"
              value={state.externalAgentGuidedTourLink}
              onChange={(e) => update("externalAgentGuidedTourLink", e.target.value)}
              placeholder="Enter external agent guided tour link"
              aria-label="External agent guided tour link"
              aria-invalid={agentGuidedError !== null}
              className={cn("h-9 pl-8 text-xs", agentGuidedError && "border-red-400 focus-visible:ring-red-400")}
            />
          </div>
          {agentGuidedError && <p className="mt-1.5 text-[10px] font-medium text-red-600">{agentGuidedError}</p>}
        </div>
      </div>
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Pre-tour nurture
   ══════════════════════════════════════════════════════════════════════════ */

function PreTourNurtureTab() {
  const [editingPoint, setEditingPoint] = useState<PreTourContactPoint | null>(null)
  const [historyPoint, setHistoryPoint] = useState<PreTourContactPoint | null>(null)

  return (
    <>
      <div className="mb-5">
        <h3 className="text-xl font-bold text-foreground">Pre-tour nurture</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Review and manage the contact points used to nurture prospects before a tour is booked or completed.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)_88px] bg-zinc-700 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white">
          <div>Event</div>
          <div>Action(s)</div>
          <div className="text-right"> </div>
        </div>
        <div>
          {PRE_TOUR_NURTURE_CONTACT_POINTS.map((point, index) => (
            <div
              key={point.id}
              className={cn(
                "grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)_88px] gap-4 px-4 py-4",
                index !== PRE_TOUR_NURTURE_CONTACT_POINTS.length - 1 && "border-b border-border",
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{point.event}</p>
              </div>
              <div className="space-y-2">
                {point.actions.map((action) => (
                  <ActionSummary key={action} action={action} />
                ))}
              </div>
              <div className="flex items-start justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPoint(point)}
                  className="rounded-md p-1.5 text-amber-500 transition-colors hover:bg-amber-50 hover:text-amber-600"
                  aria-label={`Edit ${point.event}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryPoint(point)}
                  className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label={`View edit history for ${point.event}`}
                >
                  <History className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <PreTourNurtureEditDialog point={editingPoint} onOpenChange={(open) => !open && setEditingPoint(null)} />
      <PreTourNurtureHistoryDialog point={historyPoint} onOpenChange={(open) => !open && setHistoryPoint(null)} />
    </>
  )
}

function PostTourNurtureTab() {
  const [editingPoint, setEditingPoint] = useState<PreTourContactPoint | null>(null)
  const [historyPoint, setHistoryPoint] = useState<PreTourContactPoint | null>(null)

  return (
    <>
      <div className="mb-5">
        <h3 className="text-xl font-bold text-foreground">Post-tour nurture</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Review and manage the contact points used to follow up with prospects after a tour has been completed.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)_88px] bg-zinc-700 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white">
          <div>Event</div>
          <div>Action(s)</div>
          <div className="text-right"> </div>
        </div>
        <div>
          {POST_TOUR_NURTURE_CONTACT_POINTS.map((point, index) => (
            <div
              key={point.id}
              className={cn(
                "grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)_88px] gap-4 px-4 py-4",
                index !== POST_TOUR_NURTURE_CONTACT_POINTS.length - 1 && "border-b border-border",
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{point.event}</p>
              </div>
              <div className="space-y-2">
                {point.actions.map((action) => (
                  <ActionSummary key={action} action={action} />
                ))}
              </div>
              <div className="flex items-start justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPoint(point)}
                  className="rounded-md p-1.5 text-amber-500 transition-colors hover:bg-amber-50 hover:text-amber-600"
                  aria-label={`Edit ${point.event}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryPoint(point)}
                  className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label={`View edit history for ${point.event}`}
                >
                  <History className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <PreTourNurtureEditDialog point={editingPoint} onOpenChange={(open) => !open && setEditingPoint(null)} />
      <PreTourNurtureHistoryDialog point={historyPoint} onOpenChange={(open) => !open && setHistoryPoint(null)} />
    </>
  )
}

function ActionSummary({ action }: { action: string }) {
  const config =
    action === "Automatic Email"
      ? {
          icon: Mail,
          iconClass: "text-amber-500",
          secondary: "Entrata Default | View Preview",
          tertiary: "To: Prospects",
        }
      : action === "Automated Text Message"
        ? {
            icon: MessageSquareText,
            iconClass: "text-sky-500",
            secondary: "Prospect nurture SMS enabled",
            tertiary: "To: Prospects",
          }
        : {
            icon: Bell,
            iconClass: "text-amber-500",
            secondary: "Schedule a manual follow-up",
            tertiary: "Assigned to onsite team",
          }

  const Icon = config.icon

  return (
    <div className="flex items-start gap-2">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.iconClass)} />
      <div>
        <p className="text-sm text-foreground">{action}</p>
        <p className="text-xs text-muted-foreground">{config.secondary}</p>
        <p className="text-xs text-muted-foreground">{config.tertiary}</p>
      </div>
    </div>
  )
}

function PreTourNurtureEditDialog({
  point,
  onOpenChange,
}: {
  point: PreTourContactPoint | null
  onOpenChange: (open: boolean) => void
}) {
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [textEnabled, setTextEnabled] = useState(true)
  const [manualEnabled, setManualEnabled] = useState(true)

  useEffect(() => {
    if (!point) return
    setEmailEnabled(point.actions.includes("Automatic Email"))
    setTextEnabled(point.actions.includes("Automated Text Message"))
    setManualEnabled(point.actions.includes("Manual Contact"))
  }, [point])

  return (
    <Dialog open={point !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0 sm:max-w-6xl">
        {point && (
          <>
            <DialogHeader className="border-b border-border bg-zinc-800 px-6 py-4 text-left">
              <DialogTitle className="text-xl font-semibold text-white">{point.event}</DialogTitle>
              <DialogDescription className="text-zinc-300">
                Edit the nurture actions associated with this pre-tour contact point.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 px-6 py-6 lg:grid-cols-3">
              <EditActionCard
                checked={emailEnabled}
                onCheckedChange={setEmailEnabled}
                title="Send an Automated Email"
                icon={Mail}
                accent="text-amber-500"
              >
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Email Template:</label>
                  <div className="rounded-md border border-border bg-zinc-50 px-3 py-2 text-sm text-muted-foreground">
                    Prospect Tour Nurture Template
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Edit Email</Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground">Revert To Default Template</Button>
                  </div>
                </div>
              </EditActionCard>

              <EditActionCard
                checked={textEnabled}
                onCheckedChange={setTextEnabled}
                title="Send an Automated Text Message"
                icon={MessageSquareText}
                accent="text-sky-500"
              >
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Text Message:</label>
                  <div className="rounded-md border border-border bg-zinc-50 px-3 py-2 text-sm text-muted-foreground">
                    Hi there! We noticed you haven&apos;t booked your tour yet. Here&apos;s the next best step to keep things moving.
                  </div>
                  <Button variant="outline" size="sm">Merge Fields</Button>
                </div>
              </EditActionCard>

              <EditActionCard
                checked={manualEnabled}
                onCheckedChange={setManualEnabled}
                title="Schedule a Manual Contact"
                icon={Bell}
                accent="text-amber-500"
              >
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Instructions:</label>
                  <textarea
                    rows={7}
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    defaultValue="Call the prospect and confirm whether they still want help scheduling a tour."
                  />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-xs font-medium text-foreground">Consider Overdue After:</span>
                    <Input className="h-9 w-16 text-sm" defaultValue="1" />
                    <span>Business Hours</span>
                  </div>
                </div>
              </EditActionCard>
            </div>
            <DialogFooter className="border-t border-border px-6 py-4">
              <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button size="sm" onClick={() => onOpenChange(false)}>Save Event</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditActionCard({
  checked,
  onCheckedChange,
  title,
  icon: Icon,
  accent,
  children,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  title: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
        <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
        <Icon className={cn("h-4 w-4", accent)} />
        <p className="text-sm font-medium text-foreground">{title}</p>
      </div>
      {children}
    </div>
  )
}

function PreTourNurtureHistoryDialog({
  point,
  onOpenChange,
}: {
  point: PreTourContactPoint | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={point !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit History</DialogTitle>
          <DialogDescription>
            Recent edits for {point?.event ?? "this contact point"}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {[
            "Updated manual contact instructions on July 22, 2026 at 9:14 AM",
            "Adjusted automated text message copy on July 20, 2026 at 2:41 PM",
            "Enabled automated email on July 18, 2026 at 11:03 AM",
          ].map((entry) => (
            <div key={entry} className="rounded-lg border border-border bg-zinc-50 px-4 py-3 text-sm text-foreground">
              {entry}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Pre-qualification
   ══════════════════════════════════════════════════════════════════════════ */

function SectionPreQualification({ state, update }: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
}) {
  const incomeError = state.incomeEnabled ? validateIncomeMultiplier(state.incomeMultiplier) : null
  const creditError = state.creditEnabled ? validateCreditScore(state.creditMinScore) : null
  const noCriteria = !state.incomeEnabled && !state.creditEnabled

  return (
    <SectionShell
      icon={ListChecks}
      title="Pre-qualification"
      description="When enabled, ELI+ asks new prospects whether they expect to meet each enabled requirement before proceeding. Outcomes are evaluated deterministically — no rules to build or order."
      headerAction={
        <label className="flex cursor-pointer items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">
            {state.preQualEnabled ? "On" : "Off"}
          </span>
          <Checkbox
            checked={state.preQualEnabled}
            onCheckedChange={(v) => update("preQualEnabled", v === true)}
          />
        </label>
      }
    >
      {!state.preQualEnabled ? (
        <div className="flex items-start gap-2 rounded-lg border border-dashed border-border bg-zinc-50/40 px-3 py-3">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">
            Pre-qualification is off. The agent proceeds straight into the selected conversation mode
            without qualifying the prospect. Toggle on to configure application requirements and actions by outcome.
          </p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Application requirements ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-foreground">Application requirements</p>
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="About application requirements" className="text-muted-foreground transition-colors hover:text-foreground">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs px-3.5 py-3">
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Enable either criterion or both — at least one must be enabled while pre-qualification is on.
                      Disabled criteria are never asked about and never affect the result.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {noCriteria && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <p className="text-[11px] font-medium text-amber-900">
                  At least one criterion must be enabled while pre-qualification is on. Enable the income or credit requirement to save.
                </p>
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-2">
              {/* Income requirement card */}
              <div className={cn("rounded-lg border p-4", state.incomeEnabled ? "border-border bg-white" : "border-dashed border-border bg-zinc-50/40")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-foreground">Income-to-rent requirement</p>
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" aria-label="About the income-to-rent requirement" className="text-muted-foreground transition-colors hover:text-foreground">
                              <HelpCircle className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs px-3.5 py-3">
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                              ELI+ will ask whether the prospect expects their gross monthly household income to meet
                              this requirement. It will not ask for documents or verify income.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Minimum gross monthly household income</p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground">{state.incomeEnabled ? "On" : "Off"}</span>
                    <Checkbox checked={state.incomeEnabled} onCheckedChange={(v) => update("incomeEnabled", v === true)} />
                  </label>
                </div>
                {state.incomeEnabled && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={1}
                        max={10}
                        step={0.1}
                        value={state.incomeMultiplier}
                        onChange={(e) => update("incomeMultiplier", e.target.value)}
                        aria-label="Minimum gross monthly household income multiplier"
                        className={cn("h-8 w-24 text-xs", incomeError && "border-red-400 focus-visible:ring-red-400")}
                      />
                      <span className="text-xs font-medium text-foreground">× monthly rent</span>
                    </div>
                    {incomeError && <p className="text-[10px] font-medium text-red-600">{incomeError}</p>}
                    <div className="rounded-md border border-border bg-zinc-50/60 px-3 py-2 text-[11px] text-foreground">
                      Applicants generally need gross monthly household income of at least{" "}
                      <span className="font-semibold">{formatMultiplier(state.incomeMultiplier)}×</span> the monthly rent.
                    </div>
                  </div>
                )}
              </div>

              {/* Credit requirement card */}
              <div className={cn("rounded-lg border p-4", state.creditEnabled ? "border-border bg-white" : "border-dashed border-border bg-zinc-50/40")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-foreground">Credit-score requirement</p>
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" aria-label="About the credit-score requirement" className="text-muted-foreground transition-colors hover:text-foreground">
                              <HelpCircle className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs px-3.5 py-3">
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                              ELI+ will ask whether the prospect expects to meet this minimum. It will not request a
                              credit report or perform a credit check.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Minimum expected credit score</p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground">{state.creditEnabled ? "On" : "Off"}</span>
                    <Checkbox checked={state.creditEnabled} onCheckedChange={(v) => update("creditEnabled", v === true)} />
                  </label>
                </div>
                {state.creditEnabled && (
                  <div className="mt-3 space-y-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={300}
                      max={850}
                      step={1}
                      value={state.creditMinScore}
                      onChange={(e) => update("creditMinScore", e.target.value)}
                      aria-label="Minimum expected credit score"
                      className={cn("h-8 w-24 text-xs", creditError && "border-red-400 focus-visible:ring-red-400")}
                    />
                    {creditError && <p className="text-[10px] font-medium text-red-600">{creditError}</p>}
                    <div className="rounded-md border border-border bg-zinc-50/60 px-3 py-2 text-[11px] text-foreground">
                      Applicants generally need a minimum credit score of{" "}
                      <span className="font-semibold">{formatScore(state.creditMinScore)}</span>.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── If a prospect doesn't meet the requirements ── */}
          <div className="space-y-3 border-t border-border pt-5">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-foreground">If a prospect doesn&apos;t meet the requirements&hellip;</p>
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="How outcomes are determined" className="text-muted-foreground transition-colors hover:text-foreground">
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-sm space-y-2.5 px-3.5 py-3">
                      <p className="text-[11px] font-semibold text-foreground">How this works</p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        ELI+ asks whether the prospect expects to meet each enabled requirement. Prospects answer
                        &ldquo;Yes, I expect to meet it,&rdquo; &ldquo;No, I do not expect to meet it,&rdquo;
                        &ldquo;I&apos;m not sure,&rdquo; or &ldquo;Prefer not to answer.&rdquo; Prospects are never
                        asked for an exact income or credit score.
                      </p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        If every enabled requirement gets a &ldquo;Yes,&rdquo; the conversation simply continues with
                        the selected conversation mode. Any other answer — &ldquo;No,&rdquo; &ldquo;I&apos;m not
                        sure,&rdquo; &ldquo;Prefer not to answer,&rdquo; or incomplete — applies the stance you choose
                        here: Continue, Slow down, or Stop.
                      </p>
                      <p className="text-[10px] leading-snug text-muted-foreground">
                        &ldquo;Prefer not to answer&rdquo; is treated the same as &ldquo;I&apos;m not sure&rdquo; but
                        retained as a distinct response for analytics. When only one criterion is enabled, only that
                        criterion is evaluated.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Prospects who meet the requirements continue with the selected conversation mode — nothing to
                configure. When requirements aren&apos;t met, ELI+ always lets the prospect know. Choose what happens
                next:
              </p>
            </div>
            <div role="radiogroup" aria-label="Behavior when a prospect doesn't meet the requirements" className="space-y-2">
              {UNQUALIFIED_STANCE_ORDER.map((id) => {
                const stance = UNQUALIFIED_STANCES[id]
                const active = state.unqualifiedStance === id
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => update("unqualifiedStance", id)}
                    className={cn(
                      "w-full rounded-lg border px-4 py-3 text-left transition-all",
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                        : "border-border bg-white text-foreground hover:border-zinc-400",
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={cn("mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border", active ? "border-white" : "border-zinc-400")}>
                        {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      <div>
                        <p className="text-xs font-semibold leading-snug">{stance.label}</p>
                        <p className={cn("mt-0.5 text-[11px] leading-snug", active ? "text-white/75" : "text-muted-foreground")}>
                          {stance.description}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">
              &ldquo;Stop next steps&rdquo; blocks tour recommendations, tour slots, self-scheduling links, the
              tour-booking action, and prevents ELI+ from providing or exposing the application link.
            </p>
          </div>

        </div>
      )}
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Affordable qualification
   ══════════════════════════════════════════════════════════════════════════ */

function SectionAffordable({ state, update, setState }: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
  setState: React.Dispatch<React.SetStateAction<PanelState>>
}) {
  // ── Affordable settings shorthand ──
  const aff = state.affordableSettings
  const setAff = (patch: Partial<AffordableSettings>) =>
    setState((s) => ({ ...s, affordableSettings: { ...s.affordableSettings, ...patch } }))
  const selectedProgram = aff.affordablePrograms.find((program) => program.programType === aff.programType)
  const [programDraft, setProgramDraft] = useState<AffordableProgram>(() => selectedProgram ?? makeDefaultAffordableProgram(aff.programType))

  useEffect(() => {
    setProgramDraft(selectedProgram ?? makeDefaultAffordableProgram(aff.programType))
  }, [aff.programType, aff.affordablePrograms])

  const setProgramField = <K extends keyof AffordableProgram>(key: K, value: AffordableProgram[K]) => {
    setProgramDraft((draft) => ({ ...draft, [key]: value }))
  }

  // ── Post-qualification goals are stored on the selected program ──
  const goalFor = (result: PreQualResult): PreQualGoal =>
    programDraft.postQualificationGoals.find((g) => g.result === result) ?? { result, tour: "none", application: "none", waitlist: "none", offerMarketRate: false }

  const setGoalField = (result: PreQualResult, patch: Partial<PreQualGoal>) => {
    const exists = programDraft.postQualificationGoals.some((g) => g.result === result)
    const next = exists
      ? programDraft.postQualificationGoals.map((g) => (g.result === result ? { ...g, ...patch } : g))
      : [...programDraft.postQualificationGoals, { ...goalFor(result), ...patch }]
    setProgramField("postQualificationGoals", next)
  }

  const saveProgram = () => {
    const nextProgram: AffordableProgram = { ...programDraft, programType: aff.programType }
    const nextPrograms = selectedProgram
      ? aff.affordablePrograms.map((program) => (program.programType === aff.programType ? nextProgram : program))
      : [...aff.affordablePrograms, nextProgram]
    setAff({ affordablePrograms: nextPrograms })
  }

  const moveProgram = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= aff.affordablePrograms.length) return
    const nextPrograms = [...aff.affordablePrograms]
    const [moved] = nextPrograms.splice(index, 1)
    nextPrograms.splice(nextIndex, 0, moved)
    setAff({ affordablePrograms: nextPrograms })
  }

  const removeProgram = (programType: AffordableProgramType) => {
    setAff({ affordablePrograms: aff.affordablePrograms.filter((program) => program.programType !== programType) })
  }

  return (
    <SectionShell
      icon={Home}
      title="Affordable qualification"
      description="Configure affordable program inputs, eligibility requirements, compliance messaging, documentation, and post-qualification actions."
      headerAction={
        <label className="flex cursor-pointer items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">
            {state.affordableFlowEnabled ? "On" : "Off"}
          </span>
          <Checkbox
            checked={state.affordableFlowEnabled}
            onCheckedChange={(v) => update("affordableFlowEnabled", v === true)}
          />
        </label>
      }
    >
      {!state.affordableFlowEnabled ? (
        <div className="flex items-start gap-2 rounded-lg border border-dashed border-border bg-zinc-50/40 px-3 py-3">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">
            Affordable qualification is off. Toggle on to configure program inputs, eligibility requirements,
            terminology, compliance messaging, and affordable post-qualification actions.
          </p>
        </div>
      ) : (
              <div className="space-y-5">
                {/* Program input */}
                <div className="rounded-lg border border-border bg-zinc-50/40 p-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Program Type</label>
                    <Select value={aff.programType} onValueChange={(value) => setAff({ programType: value as AffordableProgramType })}>
                      <SelectTrigger className="h-8 bg-white text-xs">
                        <SelectValue placeholder="Select a program type" />
                      </SelectTrigger>
                      <SelectContent>
                        {AFFORDABLE_PROGRAM_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="text-xs">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Select the affordable program that these qualification inputs apply to.</p>
                  </div>
                </div>

                {/* Affordable program input grid */}
                <div className="space-y-2 border-t border-border pt-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-foreground">Program inputs</p>
                      <p className="text-[10px] text-muted-foreground">Enter the income limit for each household size, then save this program.</p>
                    </div>
                    <Button size="sm" className="h-7 shrink-0 text-[11px]" onClick={saveProgram}>
                      <Plus className="mr-1 h-3 w-3" />{selectedProgram ? "Update program" : "Save program"}
                    </Button>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-border bg-white">
                    <table className="w-full min-w-[900px] table-fixed text-xs">
                      <thead>
                        <tr className="border-b border-border bg-zinc-50/60">
                          {PROGRAM_PERSON_LABELS.map((label) => (
                            <th key={label} className="px-2 py-2 text-center text-[10px] font-semibold normal-case text-muted-foreground">
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {programDraft.incomeLimits.map((value, index) => (
                            <td key={PROGRAM_PERSON_LABELS[index]} className="p-1.5">
                              <Input
                                value={value}
                                onChange={(event) => {
                                  const next = [...programDraft.incomeLimits]
                                  next[index] = event.target.value
                                  setProgramField("incomeLimits", next)
                                }}
                                placeholder="Input"
                                aria-label={`${PROGRAM_PERSON_LABELS[index]} income limit`}
                                className="h-8 px-2 text-xs"
                              />
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Saved program priority list */}
                <div className="space-y-2 border-t border-border pt-4">
                  <div>
                    <p className="text-xs font-medium text-foreground">Affordable Programs</p>
                    <p className="text-[10px] text-muted-foreground">Programs are offered in this order. Use the arrows to dynamically prioritize them.</p>
                  </div>
                  {aff.affordablePrograms.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-3 py-3 text-[11px] text-muted-foreground">
                      Saved programs will appear here.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {aff.affordablePrograms.map((program, index) => (
                        <div key={program.programType} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-muted-foreground">{index + 1}</span>
                          <span className="flex-1 text-xs font-medium text-foreground">{affordableProgramLabel(program.programType)}</span>
                          <span className="text-[10px] text-muted-foreground">{program.incomeLimits.filter(Boolean).length}/10 inputs</span>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-sm" onClick={() => moveProgram(index, -1)} disabled={index === 0} aria-label={`Move ${affordableProgramLabel(program.programType)} up`}>
                            ↑
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-sm" onClick={() => moveProgram(index, 1)} disabled={index === aff.affordablePrograms.length - 1} aria-label={`Move ${affordableProgramLabel(program.programType)} down`}>
                            ↓
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeProgram(program.programType)} aria-label={`Remove ${affordableProgramLabel(program.programType)}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Eligibility settings */}
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-xs font-medium text-foreground">Eligibility settings</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-white p-3 hover:border-zinc-400">
                      <Checkbox checked={programDraft.vouchersAccepted} onCheckedChange={(v) => setProgramField("vouchersAccepted", v === true)} className="mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Vouchers accepted</p>
                        <p className="text-[10px] text-muted-foreground">Voucher holders may bypass income rejection.</p>
                      </div>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-white p-3 hover:border-zinc-400">
                      <Checkbox checked={programDraft.disabilityRequirement} onCheckedChange={(v) => setProgramField("disabilityRequirement", v === true)} className="mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Disability Requirement</p>
                        <p className="text-[10px] text-muted-foreground">Require a qualifying disability for this program.</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Tax Credit-only settings */}
                {aff.programType === "tax_credit" && (
                  <div className="space-y-3 border-t border-border pt-4">
                    <div>
                      <p className="text-xs font-medium text-foreground">Tax Credit Only</p>
                      <p className="text-[10px] text-muted-foreground">These inputs apply only to Tax Credit programs.</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-foreground">Adjustable income margin</p>
                      <p className="text-[10px] text-muted-foreground">Apply a buffer around income thresholds. Borderline prospects are routed to review instead of a hard qualified/unqualified answer.</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-foreground">Qualification margin</label>
                          <Input value={programDraft.incomeMargin} onChange={(e) => setProgramField("incomeMargin", e.target.value)} placeholder="e.g. 5%" className="h-8 text-xs" />
                          <p className="text-[10px] text-muted-foreground">Prospects within this margin are treated as borderline.</p>
                        </div>
                      </div>
                    </div>
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-white p-3 hover:border-zinc-400">
                      <Checkbox checked={programDraft.fullStudentSection} onCheckedChange={(v) => setProgramField("fullStudentSection", v === true)} className="mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Full Student Section</p>
                        <p className="text-[10px] text-muted-foreground">Apply the full-time student rule when evaluating Tax Credit eligibility.</p>
                      </div>
                    </label>
                  </div>
                )}

                {/* Age requirement (optional) */}
                <div className="space-y-2 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">Age requirement</p>
                      <p className="text-[10px] text-muted-foreground">Enable for age-restricted communities (e.g. senior housing).</p>
                    </div>
                    <Checkbox checked={programDraft.ageRestricted} onCheckedChange={(v) => setProgramField("ageRestricted", v === true)} />
                  </div>
                  {programDraft.ageRestricted && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Minimum age</label>
                        <Input value={programDraft.minimumAge} onChange={(e) => setProgramField("minimumAge", e.target.value)} placeholder="e.g. 62" className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Question wording</label>
                        <Input value={programDraft.ageQuestionWording} onChange={(e) => setProgramField("ageQuestionWording", e.target.value)} placeholder="e.g. Does at least one household member meet the 62+ age requirement?" className="h-8 text-xs" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Terminology controls */}
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-xs font-medium text-foreground">Affordable terminology</p>
                  <p className="text-[10px] text-muted-foreground">Control the language ELI+ uses when describing the affordable program. Sensitive branding and regulatory considerations apply.</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">Program display name</label>
                      <Input value={programDraft.programDisplayName} onChange={(e) => setProgramField("programDisplayName", e.target.value)} placeholder="e.g. Essential Housing" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">Avoid these terms</label>
                      <Input value={programDraft.avoidTerms} onChange={(e) => setProgramField("avoidTerms", e.target.value)} placeholder="e.g. low-income, subsidized" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">Approved phrase</label>
                      <Input value={programDraft.approvedPhrase} onChange={(e) => setProgramField("approvedPhrase", e.target.value)} placeholder="e.g. income-restricted apartment homes" className="h-8 text-xs" />
                    </div>
                  </div>
                </div>

                {/* Compliance-approved outcome messaging */}
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-xs font-medium text-foreground">Compliance-approved messaging</p>
                  <p className="text-[10px] text-muted-foreground">Configure what ELI+ tells the prospect for each outcome. Avoids free-form language that may create compliance exposure.</p>
                  <div className="space-y-3">
                    {(["over_income", "under_income"] as const).map((outcome) => (
                      <div key={outcome} className="space-y-1">
                        <label className="text-xs font-medium text-foreground">
                          {outcome === "over_income" ? "Over-income explanation" : "Under-income explanation"}
                        </label>
                        <textarea
                          value={programDraft.outcomeMessages[outcome] ?? ""}
                          onChange={(e) => setProgramField("outcomeMessages", { ...programDraft.outcomeMessages, [outcome]: e.target.value })}
                          placeholder="Enter compliance-approved messaging for this outcome..."
                          className="w-full rounded-md border border-border bg-white px-3 py-2 text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          rows={3}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Required documentation */}
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-xs font-medium text-foreground">Required documentation</p>
                  <p className="text-[10px] text-muted-foreground">Documents the prospect may need for the application or certification. ELI+ shares this checklist after qualification or when the prospect asks how to apply.</p>
                  <div className="space-y-2">
                    {programDraft.requiredDocuments.map((doc, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={doc}
                          onChange={(e) => {
                            const next = [...programDraft.requiredDocuments]
                            next[i] = e.target.value
                            setProgramField("requiredDocuments", next)
                          }}
                          className="h-8 flex-1 text-xs"
                        />
                        <button
                          onClick={() => setProgramField("requiredDocuments", programDraft.requiredDocuments.filter((_, idx) => idx !== i))}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          aria-label={`Remove document ${i + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <Button size="sm" variant="ghost" className="h-7 text-[11px]"
                      onClick={() => setProgramField("requiredDocuments", [...programDraft.requiredDocuments, ""])}>
                      <Plus className="mr-1 h-3 w-3" />Add document
                    </Button>
                  </div>
                </div>

                {/* Conversation flow start */}
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-xs font-medium text-foreground">Conversation flow start</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {([
                      { id: "affordable_first" as ConversationStart, title: "Start with Affordable Units", desc: "Opens offering affordable units. Falls back to market-rate if unqualified.", icon: Home },
                      { id: "market_first" as ConversationStart, title: "Start with Market Rate Units", desc: "Opens offering market-rate. Switches to affordable if asked or inventory runs out.", icon: ShieldCheck },
                    ]).map((opt) => {
                      const active = state.conversationStart === opt.id
                      return (
                        <button key={opt.id} type="button" onClick={() => update("conversationStart", opt.id)}
                          className={cn("rounded-lg border px-3 py-3 text-left text-xs transition-all",
                            active ? "border-zinc-900 bg-zinc-900 text-white shadow-sm" : "border-border bg-white text-foreground hover:border-zinc-400")}>
                          <div className="flex items-center gap-2">
                            <opt.icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-white" : "text-muted-foreground")} />
                            <span className="font-semibold">{opt.title}</span>
                          </div>
                          <p className={cn("mt-1 text-[10px] leading-snug", active ? "text-white/75" : "text-muted-foreground")}>{opt.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Post-qualification actions (affordable only) */}
                <div className="space-y-2 border-t border-border pt-4">
                  <div>
                    <p className="text-xs font-medium text-foreground">Post-qualification actions</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Configure what ELI+ may offer for each affordable qualification outcome.
                    </p>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-zinc-50/60">
                          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Outcome</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tour</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Application</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Waitlist</th>
                          <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Market-rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(["qualified", "over_income", "under_income"] as PreQualResult[]).map((result) => {
                          const g = goalFor(result)
                          return (
                            <tr key={result} className="border-b border-border/50 last:border-0 hover:bg-zinc-50/40 transition-colors">
                              <td className="px-3 py-2">
                                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", PREQUAL_RESULT_BADGE[result])}>
                                  {PREQUAL_RESULT_LABELS[result]}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <Select value={g.tour} onValueChange={(v) => setGoalField(result, { tour: v as TourGoal })}>
                                  <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {(Object.keys(TOUR_GOAL_LABELS) as TourGoal[]).map((t) => <SelectItem key={t} value={t} className="text-xs">{TOUR_GOAL_LABELS[t]}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-3 py-2">
                                <Select value={g.application} onValueChange={(v) => setGoalField(result, { application: v as ApplicationGoal })}>
                                  <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {(Object.keys(APP_GOAL_LABELS) as ApplicationGoal[]).map((a) => <SelectItem key={a} value={a} className="text-xs">{APP_GOAL_LABELS[a]}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-3 py-2">
                                <Select value={g.waitlist ?? "none"} onValueChange={(v) => setGoalField(result, { waitlist: v as TourGoal })}>
                                  <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="offer" className="text-xs">Proactively offer</SelectItem>
                                    <SelectItem value="if_asked" className="text-xs">Only if asked</SelectItem>
                                    <SelectItem value="none" className="text-xs">Do not offer</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Checkbox checked={g.offerMarketRate} onCheckedChange={(v) => setGoalField(result, { offerMarketRate: v === true })} />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
      )}
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Leasing Questions (Conversation Requirements)
   ══════════════════════════════════════════════════════════════════════════ */

function SectionLeasingQuestions({ state, setState }: {
  state: PanelState
  setState: React.Dispatch<React.SetStateAction<PanelState>>
}) {
  const updateStage = (
    stageId: LeasingStageId,
    updater: (config: LeasingStageConfig) => LeasingStageConfig,
  ) =>
    setState((s) => ({
      ...s,
      leasingStages: { ...s.leasingStages, [stageId]: updater(s.leasingStages[stageId]) },
    }))

  return (
    <>
      <p className="-mt-4 text-sm text-muted-foreground">
        Configure what information {state.agentName.trim() || "the leasing agent"} should collect at
        different stages of the conversation. Each stage acts as a gate.{" "}
        <span className="font-medium text-foreground">Required</span> blocks the gated action until the
        information is collected;{" "}
        <span className="font-medium text-foreground">Preferred</span> keeps asking after resistance,
        then advances once the set number of attempts is reached; and{" "}
        <span className="font-medium text-foreground">Optional</span> is asked but never blocks progress.
      </p>
      {LEASING_STAGES.map((meta) => (
        <LeasingStageCard
          key={meta.id}
          meta={meta}
          config={state.leasingStages[meta.id]}
          onChange={(updater) => updateStage(meta.id, updater)}
        />
      ))}
    </>
  )
}

function LeasingStageCard({ meta, config, onChange }: {
  meta: LeasingStageMeta
  config: LeasingStageConfig
  onChange: (updater: (config: LeasingStageConfig) => LeasingStageConfig) => void
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const prune = (c: LeasingStageConfig): LeasingStageConfig => {
    const used = new Set(c.questions.map((q) => q.groupId).filter(Boolean) as string[])
    return { ...c, groups: c.groups.filter((g) => used.has(g.id)) }
  }

  const setEnabled = (enabled: boolean) => onChange((c) => ({ ...c, enabled }))

  const addQuestion = (type: QuestionTypeId) =>
    onChange((c) => ({
      ...c,
      questions: [...c.questions, { id: makeQuestionId(), type, requirement: "required", groupId: null }],
    }))

  const removeQuestion = (id: string) =>
    onChange((c) => {
      if (c.questions.find((q) => q.id === id)?.locked) return c
      return prune({ ...c, questions: c.questions.filter((q) => q.id !== id) })
    })

  const setRequirement = (id: string, requirement: QuestionRequirement) =>
    onChange((c) => ({
      ...c,
      questions: c.questions.map((q) =>
        q.id === id
          ? { ...q, requirement, bypassAfter: requirement === "preferred" ? (q.bypassAfter ?? DEFAULT_BYPASS_ATTEMPTS) : q.bypassAfter }
          : q,
      ),
    }))

  const setBypassAfter = (id: string, bypassAfter: BypassAttempts) =>
    onChange((c) => ({
      ...c,
      questions: c.questions.map((q) => (q.id === id ? { ...q, bypassAfter } : q)),
    }))

  const moveByIndex = (from: number, to: number) =>
    onChange((c) => {
      if (from === to || to < 0 || to >= c.questions.length) return c
      const next = [...c.questions]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return { ...c, questions: next }
    })

  const createGroupWith = (questionId: string) =>
    onChange((c) => {
      const gid = makeQuestionId()
      return {
        ...c,
        groups: [...c.groups, { id: gid, label: `Group ${c.groups.length + 1}`, mode: "any" as GroupMode }],
        questions: c.questions.map((q) => (q.id === questionId ? { ...q, groupId: gid } : q)),
      }
    })

  const assignToGroup = (questionId: string, gid: string) =>
    onChange((c) => {
      if (c.questions.find((q) => q.id === questionId)?.locked) return c
      return {
        ...c,
        questions: c.questions.map((q) => (q.id === questionId ? { ...q, groupId: gid } : q)),
      }
    })

  const ungroup = (questionId: string) =>
    onChange((c) => {
      if (c.questions.find((q) => q.id === questionId)?.locked) return c
      return prune({
        ...c,
        questions: c.questions.map((q) => (q.id === questionId ? { ...q, groupId: null } : q)),
      })
    })

  const setGroupMode = (gid: string, mode: GroupMode) =>
    onChange((c) => ({
      ...c,
      groups: c.groups.map((g) =>
        g.id === gid
          ? { ...g, mode, bypassAfter: mode === "preferred" ? (g.bypassAfter ?? DEFAULT_BYPASS_ATTEMPTS) : g.bypassAfter }
          : g,
      ),
    }))

  const setGroupBypassAfter = (gid: string, bypassAfter: BypassAttempts) =>
    onChange((c) => ({ ...c, groups: c.groups.map((g) => (g.id === gid ? { ...g, bypassAfter } : g)) }))

  const setGroupLabel = (gid: string, label: string) =>
    onChange((c) => ({ ...c, groups: c.groups.map((g) => (g.id === gid ? { ...g, label } : g)) }))

  const removeGroup = (gid: string) =>
    onChange((c) => {
      if (c.groups.find((g) => g.id === gid)?.locked) return c
      return {
        ...c,
        groups: c.groups.filter((g) => g.id !== gid),
        questions: c.questions.map((q) => (q.groupId === gid ? { ...q, groupId: null } : q)),
      }
    })

  const reorderGroupMember = (gid: string, memberIndex: number, dir: -1 | 1) =>
    onChange((c) => {
      const positions = c.questions.map((q, i) => ({ q, i })).filter((x) => x.q.groupId === gid).map((x) => x.i)
      const a = positions[memberIndex]
      const b = positions[memberIndex + dir]
      if (a == null || b == null) return c
      const next = [...c.questions]
      ;[next[a], next[b]] = [next[b], next[a]]
      return { ...c, questions: next }
    })

  const usedTypes = new Set(config.questions.map((q) => q.type))
  const requiredCount = config.questions.filter((q) => q.requirement === "required").length
  const preferredCount = config.questions.filter((q) => q.requirement === "preferred").length

  // Build ordered render slots: a lone question, or a group (positioned by its
  // first member). Members of a group always render together regardless of
  // their exact positions in the underlying array.
  type Slot =
    | { kind: "question"; question: StageQuestion; index: number }
    | { kind: "group"; group: StageGroup; members: { question: StageQuestion; index: number }[] }
  const slots: Slot[] = []
  const seenGroups = new Set<string>()
  config.questions.forEach((question, index) => {
    if (question.groupId) {
      if (seenGroups.has(question.groupId)) return
      seenGroups.add(question.groupId)
      const group = config.groups.find((g) => g.id === question.groupId)
      if (!group) {
        slots.push({ kind: "question", question, index })
        return
      }
      const members = config.questions
        .map((q, i) => ({ question: q, index: i }))
        .filter((x) => x.question.groupId === question.groupId)
      slots.push({ kind: "group", group, members })
    } else {
      slots.push({ kind: "question", question, index })
    }
  })

  return (
    <SectionShell
      icon={ClipboardList}
      title={meta.title}
      description={meta.description}
      headerAction={
        <div className="flex items-center gap-2.5">
          <span className="text-xxs font-medium uppercase tracking-wider text-muted-foreground">
            {config.enabled ? "On" : "Off"}
          </span>
          <Switch
            checked={config.enabled}
            onCheckedChange={setEnabled}
            aria-label={`Turn ${meta.title} ${config.enabled ? "off" : "on"}`}
          />
        </div>
      }
    >
      {!config.enabled ? (
        <p className="text-xs text-muted-foreground">
          This stage is off — {meta.behavior} Turn it on to configure the questions collected here.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-[11px] leading-relaxed text-muted-foreground">{meta.behavior}</p>
          </div>

          {config.questions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
              No questions yet. Add one below to collect it at this stage.
            </p>
          ) : (
            <div className="space-y-2">
              {slots.map((slot) => {
                if (slot.kind === "question") {
                  const { question, index } = slot
                  return (
                    <QuestionRow
                      key={question.id}
                      question={question}
                      priority={index + 1}
                      grouped={false}
                      groups={config.groups}
                      draggable
                      isDragging={dragId === question.id}
                      isDropTarget={overId === question.id && dragId !== null && dragId !== question.id}
                      onDragStart={() => setDragId(question.id)}
                      onDragOverRow={() => setOverId(question.id)}
                      onDropRow={() => {
                        if (dragId && dragId !== question.id) {
                          const from = config.questions.findIndex((q) => q.id === dragId)
                          if (from !== -1) moveByIndex(from, index)
                        }
                        setDragId(null)
                        setOverId(null)
                      }}
                      onDragEnd={() => {
                        setDragId(null)
                        setOverId(null)
                      }}
                      onSetRequirement={(r) => setRequirement(question.id, r)}
                      onSetBypassAfter={(n) => setBypassAfter(question.id, n)}
                      onRemove={() => removeQuestion(question.id)}
                      onMoveUp={() => moveByIndex(index, index - 1)}
                      onMoveDown={() => moveByIndex(index, index + 1)}
                      onCreateGroup={() => createGroupWith(question.id)}
                      onAssignGroup={(gid) => assignToGroup(question.id, gid)}
                      onUngroup={() => ungroup(question.id)}
                    />
                  )
                }
                const { group, members } = slot
                return (
                  <div key={group.id} className="rounded-lg border border-border bg-muted/30 p-2.5">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        {group.locked ? (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            {group.label}
                            <Lock className="h-3 w-3 text-muted-foreground" aria-label="Required group" />
                          </span>
                        ) : (
                          <Input
                            value={group.label}
                            onChange={(e) => setGroupLabel(group.id, e.target.value)}
                            aria-label="Group name"
                            className="h-7 w-40 text-xs"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {group.locked ? (
                          <>
                            <Badge variant="gray">{GROUP_MODE_LABELS[group.mode]}</Badge>
                            {group.mode === "preferred" && (
                              <Badge variant="gray">Ask {group.bypassAfter ?? DEFAULT_BYPASS_ATTEMPTS}&times;</Badge>
                            )}
                          </>
                        ) : (
                          <>
                            <Select value={group.mode} onValueChange={(v) => setGroupMode(group.id, v as GroupMode)}>
                              <SelectTrigger className="h-7 w-[9.5rem] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.keys(GROUP_MODE_LABELS) as GroupMode[]).map((m) => (
                                  <SelectItem key={m} value={m} className="text-xs">
                                    {GROUP_MODE_LABELS[m]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {group.mode === "preferred" && (
                              <AttemptsSelect
                                value={group.bypassAfter ?? DEFAULT_BYPASS_ATTEMPTS}
                                onChange={(n) => setGroupBypassAfter(group.id, n)}
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => removeGroup(group.id)}
                              aria-label="Ungroup all"
                              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white hover:text-foreground"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="mb-2 px-0.5 text-[10px] leading-relaxed text-muted-foreground">
                      {GROUP_MODE_DESCRIPTIONS[group.mode]}
                    </p>
                    <div className="space-y-2">
                      {members.map((member, memberIndex) => (
                        <QuestionRow
                          key={member.question.id}
                          question={member.question}
                          priority={memberIndex + 1}
                          grouped
                          requirementDisabled={group.mode !== "all"}
                          groups={config.groups}
                          onSetRequirement={(r) => setRequirement(member.question.id, r)}
                          onSetBypassAfter={(n) => setBypassAfter(member.question.id, n)}
                          onRemove={() => removeQuestion(member.question.id)}
                          onMoveUp={() => reorderGroupMember(group.id, memberIndex, -1)}
                          onMoveDown={() => reorderGroupMember(group.id, memberIndex, 1)}
                          onCreateGroup={() => createGroupWith(member.question.id)}
                          onAssignGroup={(gid) => assignToGroup(member.question.id, gid)}
                          onUngroup={() => ungroup(member.question.id)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-0.5">
            <AddQuestionPopover usedTypes={usedTypes} onAdd={addQuestion} />
            <span className="text-[11px] text-muted-foreground">
              {config.questions.length} question{config.questions.length === 1 ? "" : "s"}
              {requiredCount > 0 ? ` · ${requiredCount} required` : ""}
              {preferredCount > 0 ? ` · ${preferredCount} preferred` : ""}
            </span>
          </div>
        </div>
      )}
    </SectionShell>
  )
}

function RequirementToggle({ value, onChange, disabled }: {
  value: QuestionRequirement
  onChange: (value: QuestionRequirement) => void
  disabled?: boolean
}) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 rounded-md border border-input bg-background p-0.5",
        disabled && "pointer-events-none opacity-50",
      )}
      role="group"
      aria-label="Requirement"
    >
      {(["required", "preferred", "optional"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          aria-pressed={value === opt}
          onClick={() => onChange(opt)}
          className={cn(
            "rounded px-2.5 py-1 text-xxs font-medium transition-colors",
            value === opt
              ? "bg-[hsl(207_73%_95%)] text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {REQUIREMENT_LABELS[opt]}
        </button>
      ))}
    </div>
  )
}

function AttemptsSelect({ value, onChange }: {
  value: BypassAttempts
  onChange: (value: BypassAttempts) => void
}) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v) as BypassAttempts)}>
      <SelectTrigger className="h-7 w-[5.75rem] gap-1 text-xxs" aria-label="Attempts before the agent bypasses this question">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {([1, 2, 3] as BypassAttempts[]).map((n) => (
          <SelectItem key={n} value={String(n)} className="text-xs">
            Ask {n}&times;
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function QuestionRow({
  question,
  priority,
  grouped,
  requirementDisabled,
  groups,
  draggable,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragOverRow,
  onDropRow,
  onDragEnd,
  onSetRequirement,
  onSetBypassAfter,
  onRemove,
  onMoveUp,
  onMoveDown,
  onCreateGroup,
  onAssignGroup,
  onUngroup,
}: {
  question: StageQuestion
  priority: number
  grouped: boolean
  requirementDisabled?: boolean
  groups: StageGroup[]
  draggable?: boolean
  isDragging?: boolean
  isDropTarget?: boolean
  onDragStart?: () => void
  onDragOverRow?: () => void
  onDropRow?: () => void
  onDragEnd?: () => void
  onSetRequirement: (value: QuestionRequirement) => void
  onSetBypassAfter: (value: BypassAttempts) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onCreateGroup: () => void
  onAssignGroup: (groupId: string) => void
  onUngroup: () => void
}) {
  const locked = question.locked
  const assignableGroups = groups.filter((g) => g.id !== question.groupId && !g.locked)
  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? (e) => { e.dataTransfer.effectAllowed = "move"; onDragStart?.() } : undefined}
      onDragOver={draggable ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; onDragOverRow?.() } : undefined}
      onDrop={draggable ? (e) => { e.preventDefault(); onDropRow?.() } : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-white px-3 py-2.5 transition-all",
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
        isDropTarget ? "border-zinc-900 ring-1 ring-zinc-900" : "border-border",
      )}
    >
      <GripVertical
        className={cn("h-4 w-4 shrink-0", draggable ? "text-zinc-400" : "text-zinc-300")}
        aria-hidden
      />
      <span className="w-5 shrink-0 text-center text-xxs font-medium tabular-nums text-muted-foreground">
        {priority}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium text-foreground">
        <span className="truncate">{QUESTION_LABELS[question.type]}</span>
        {locked && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Required — can't be removed" />
              </TooltipTrigger>
              <TooltipContent side="top" className="px-2.5 py-1.5">
                <p className="text-[11px] text-muted-foreground">Required — can&apos;t be removed</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        <RequirementToggle value={question.requirement} onChange={onSetRequirement} disabled={requirementDisabled || locked} />
        {question.requirement === "preferred" && !requirementDisabled && !locked && (
          <AttemptsSelect value={question.bypassAfter ?? DEFAULT_BYPASS_ATTEMPTS} onChange={onSetBypassAfter} />
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Options for ${QUESTION_LABELS[question.type]}`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={onMoveUp}>Move up</DropdownMenuItem>
          <DropdownMenuItem onClick={onMoveDown}>Move down</DropdownMenuItem>
          {!locked && (
            <>
              <DropdownMenuSeparator />
              {!grouped && <DropdownMenuItem onClick={onCreateGroup}>New group with this</DropdownMenuItem>}
              {assignableGroups.map((g) => (
                <DropdownMenuItem key={g.id} onClick={() => onAssignGroup(g.id)}>
                  Move to {g.label}
                </DropdownMenuItem>
              ))}
              {grouped && <DropdownMenuItem onClick={onUngroup}>Remove from group</DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onRemove} className="text-red-600 focus:text-red-600">
                Remove question
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function AddQuestionPopover({ usedTypes, onAdd }: {
  usedTypes: Set<QuestionTypeId>
  onAdd: (type: QuestionTypeId) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add question
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-80 w-72 overflow-y-auto p-1.5">
        {QUESTION_LIBRARY.map((category) => (
          <div key={category.label} className="mb-1.5 last:mb-0">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {category.label}
            </p>
            {category.questions.map((q) => {
              const used = usedTypes.has(q.id)
              return (
                <button
                  key={q.id}
                  type="button"
                  disabled={used}
                  onClick={() => {
                    onAdd(q.id)
                    setOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    used
                      ? "cursor-not-allowed text-muted-foreground/60"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <span>{q.label}</span>
                  {used && <span className="text-[10px] text-muted-foreground">Added</span>}
                </button>
              )
            })}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Sticky footer
   ══════════════════════════════════════════════════════════════════════════ */

function FooterActionBar({ dirty, blockers = [], onSave, onDiscard, backendStatus = "idle" }: { dirty: boolean; blockers?: string[]; onSave: () => void; onDiscard: () => void; backendStatus?: "idle" | "ok" | "error" }) {
  return (
    <footer className={cn("sticky bottom-0 inset-x-0 border-t bg-white px-8 py-3 transition-all",
      dirty ? "border-amber-200 bg-amber-50" : "border-border")}>
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          {blockers.length > 0
            ? <span className="font-medium text-red-700"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> {blockers[0]}</span>
            : dirty
              ? <span className="font-medium text-amber-900"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> Unsaved changes — won&apos;t take effect until saved.</span>
              : <span className="text-muted-foreground">No pending changes</span>}
          {backendStatus !== "idle" && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${backendStatus === "ok" ? "bg-emerald-400" : "bg-red-400"}`} />
              {backendStatus === "ok" ? "Chatbot connected" : "Chatbot offline"}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDiscard} disabled={!dirty}>Discard</Button>
          <Button size="sm" onClick={onSave} disabled={!dirty || blockers.length > 0}>Save changes</Button>
        </div>
      </div>
    </footer>
  )
}
