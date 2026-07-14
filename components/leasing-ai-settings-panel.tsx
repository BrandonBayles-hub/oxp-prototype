"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

const LEGACY_MODE_MAP: Record<string, ConversationModeId> = {
  "tour-first": "maximize-tour",
  "application-first": "maximize-application",
  "qualification-first": "maximize-tour",
}

function normalizeModeId(id: string | undefined): ConversationModeId {
  if (!id) return DEFAULT_MODE
  if (CONVERSATION_MODES.some((m) => m.id === id)) return id as ConversationModeId
  return LEGACY_MODE_MAP[id] ?? DEFAULT_MODE
}

/* ══════════════════════════════════════════════════════════════════════════
   Pre-qualification — types, constants, defaults
   ══════════════════════════════════════════════════════════════════════════ */

type ConversationStart = "affordable_first" | "market_first"

interface AffordableSettings {
  householdIncome: string
  householdSize: string
  vouchersAccepted: boolean
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
  // Required documentation
  requiredDocuments: string[]
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

interface PanelState {
  conversationMode: ConversationModeId
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
}

function makeDefaultState(): PanelState {
  return {
    conversationMode: DEFAULT_MODE,
    preQualEnabled: false,
    incomeEnabled: true,
    incomeMultiplier: "3.0",
    creditEnabled: false,
    creditMinScore: "600",
    unqualifiedStance: "step_back",
    affordableFlowEnabled: false,
    conversationStart: "market_first",
    affordableSettings: {
      householdIncome: "", householdSize: "", vouchersAccepted: false,
      programDisplayName: "", avoidTerms: "", approvedPhrase: "",
      outcomeMessages: {
        over_income: "Based on what you shared, your estimated income may be above the limit for this affordable unit. Final eligibility is determined during the application review.",
        under_income: "Based on the information provided, you may not meet the initial income criteria for this program. Final eligibility is determined through the formal application and compliance review.",
      },
      incomeMargin: "", marginAction: "needs_review",
      ageRestricted: false, minimumAge: "", ageQuestionWording: "",
      requiredDocuments: ["Government-issued ID", "4 most recent pay stubs", "Bank statements"],
    },
    preQualGoals: DEFAULT_PREQUAL_GOALS,
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
  const derived = useMemo(() => deriveProperty(propertyName), [propertyName])
  const appModeEligible = useMemo(() => isApplicationModeEligible(derived), [derived])

  const [state, setState] = useState<PanelState>(() => makeDefaultState())
  const [pristine, setPristine] = useState<PanelState>(() => makeDefaultState())
  const [backendStatus, setBackendStatus] = useState<"idle" | "ok" | "error">("idle")

  const CHATBOT_API = "http://localhost:8000"

  useEffect(() => {
    fetch(`${CHATBOT_API}/sales-mode`)
      .then((res) => { if (res.ok) return res.json(); throw new Error() })
      .then((data: {
        mode_id?: string
        prequalification_enabled?: boolean
        conversation_start?: string
        household_income?: string
        household_size?: string
        vouchers_accepted?: boolean
        prequalification_criteria?: {
          income?: { enabled?: boolean; multiplier?: number | string }
          credit?: { enabled?: boolean; min_score?: number | string }
        }
        prequalification_actions?: { outcome?: string; tour?: string; application?: string }[]
        prequalification_goals?: { result: string; tour: string; application: string; waitlist?: string; offer_market_rate: boolean }[]
      }) => {
        const defaults = makeDefaultState()
        const loaded: Partial<PanelState> = {
          conversationMode: normalizeModeId(data.mode_id),
          preQualEnabled: Boolean(data.prequalification_enabled),
          conversationStart: (data.conversation_start as ConversationStart) ?? "market_first",
          affordableSettings: {
            ...defaults.affordableSettings,
            householdIncome: data.household_income ?? "",
            householdSize: data.household_size ?? "",
            vouchersAccepted: Boolean(data.vouchers_accepted),
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
        setState((s) => ({ ...s, ...loaded }))
        setPristine((s) => ({ ...s, ...loaded }))
        setBackendStatus("ok")
      })
      .catch(() => setBackendStatus("error"))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!appModeEligible && state.conversationMode === "maximize-application") {
      setState((s) => ({ ...s, conversationMode: DEFAULT_MODE }))
    }
  }, [appModeEligible, state.conversationMode])

  const dirty = JSON.stringify(state) !== JSON.stringify(pristine)
  const update = <K extends keyof PanelState>(key: K, value: PanelState[K]) =>
    setState((s) => ({ ...s, [key]: value }))

  const saveBlockers = useMemo(() => {
    if (!state.preQualEnabled) return []
    const blockers: string[] = []
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
  }, [state.preQualEnabled, state.incomeEnabled, state.incomeMultiplier, state.creditEnabled, state.creditMinScore])

  const syncToBackend = useCallback((s: PanelState) => {
    const activeMode = CONVERSATION_MODES.find((m) => m.id === s.conversationMode)
    fetch(`${CHATBOT_API}/sales-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode_id: s.conversationMode,
        mode_name: activeMode?.name ?? s.conversationMode,
        conversion_goal: activeMode?.conversionGoal ?? "schedule_tours",
        prequalification_enabled: s.preQualEnabled,
        conversation_start: s.preQualEnabled ? s.conversationStart : undefined,
        household_income: s.preQualEnabled ? s.affordableSettings.householdIncome : undefined,
        household_size: s.preQualEnabled ? s.affordableSettings.householdSize : undefined,
        vouchers_accepted: s.preQualEnabled ? s.affordableSettings.vouchersAccepted : undefined,
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
          ? s.preQualGoals.map((g) => ({ result: g.result, tour: g.tour, application: g.application, waitlist: g.waitlist, offer_market_rate: g.offerMarketRate }))
          : [],
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
            <h2 className="text-xl font-bold text-foreground">{agentDisplayLabel} Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure how {agentDisplayLabel} guides prospects at <strong>{propertyName}</strong>.
              Set the conversation mode and optional pre-qualification flow for this property.
            </p>
          </div>
          <Badge variant="gray" className="shrink-0">
            <Lock className="mr-1 h-3 w-3" />
            Property scope
          </Badge>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 pb-32 pt-6">
        <div className="mx-auto max-w-3xl space-y-8">
          <GroupHeading label="Leasing AI Settings" />
          <SectionConversationMode state={state} update={update} appModeEligible={appModeEligible} />
          <SectionPreQualification state={state} update={update} />
          <SectionAffordable state={state} update={update} setState={setState} />
        </div>
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

function SectionConversationMode({ state, update, appModeEligible }: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
  appModeEligible: boolean
}) {
  return (
    <SectionShell
      icon={MessageSquare}
      title="Conversation Mode"
      description="Choose how the agent prioritizes and converts prospects at this property."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
    </SectionShell>
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
  // ── Post-qualification goals helpers ──
  const goalFor = (result: PreQualResult): PreQualGoal =>
    state.preQualGoals.find((g) => g.result === result) ?? { result, tour: "none", application: "none", waitlist: "none", offerMarketRate: false }

  const setGoalField = (result: PreQualResult, patch: Partial<PreQualGoal>) => {
    const exists = state.preQualGoals.some((g) => g.result === result)
    const next = exists
      ? state.preQualGoals.map((g) => (g.result === result ? { ...g, ...patch } : g))
      : [...state.preQualGoals, { ...goalFor(result), ...patch }]
    update("preQualGoals", next)
  }

  // ── Affordable settings shorthand ──
  const aff = state.affordableSettings
  const setAff = (patch: Partial<AffordableSettings>) =>
    setState((s) => ({ ...s, affordableSettings: { ...s.affordableSettings, ...patch } }))

  return (
    <SectionShell
      icon={Home}
      title="Affordable qualification"
      description="Configure affordable-specific settings: income limits, household size, vouchers, conversation opener, and post-qualification actions."
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
            Affordable qualification is off. Toggle on to configure income limits, household size, vouchers,
            terminology, compliance messaging, and affordable post-qualification actions.
          </p>
        </div>
      ) : (
              <div className="space-y-5">
                {/* Eligibility settings */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Eligibility settings</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">Household income limit</label>
                      <Input value={aff.householdIncome} onChange={(e) => setAff({ householdIncome: e.target.value })} placeholder="e.g. $68,000 or 60% AMI" className="h-8 text-xs" />
                      <p className="text-[10px] text-muted-foreground">Max income by household size or AMI band.</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">Household size</label>
                      <Input value={aff.householdSize} onChange={(e) => setAff({ householdSize: e.target.value })} placeholder="e.g. Max 4 per unit" className="h-8 text-xs" />
                      <p className="text-[10px] text-muted-foreground">Occupancy limit or household size rule.</p>
                    </div>
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-white p-3 hover:border-zinc-400">
                      <Checkbox checked={aff.vouchersAccepted} onCheckedChange={(v) => setAff({ vouchersAccepted: v === true })} className="mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Vouchers accepted</p>
                        <p className="text-[10px] text-muted-foreground">Voucher holders may bypass income rejection.</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Adjustable income margin */}
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-xs font-medium text-foreground">Adjustable income margin</p>
                  <p className="text-[10px] text-muted-foreground">Apply a buffer around income thresholds. Borderline prospects are routed to review instead of a hard qualified/unqualified answer.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">Qualification margin</label>
                      <Input value={aff.incomeMargin} onChange={(e) => setAff({ incomeMargin: e.target.value })} placeholder="e.g. 5%" className="h-8 text-xs" />
                      <p className="text-[10px] text-muted-foreground">Prospects within this margin are treated as borderline.</p>
                    </div>
                  </div>
                </div>

                {/* Age requirement (optional) */}
                <div className="space-y-2 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">Age requirement</p>
                      <p className="text-[10px] text-muted-foreground">Enable for age-restricted communities (e.g. senior housing).</p>
                    </div>
                    <Checkbox checked={aff.ageRestricted} onCheckedChange={(v) => setAff({ ageRestricted: v === true })} />
                  </div>
                  {aff.ageRestricted && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Minimum age</label>
                        <Input value={aff.minimumAge} onChange={(e) => setAff({ minimumAge: e.target.value })} placeholder="e.g. 62" className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Question wording</label>
                        <Input value={aff.ageQuestionWording} onChange={(e) => setAff({ ageQuestionWording: e.target.value })} placeholder="e.g. Does at least one household member meet the 62+ age requirement?" className="h-8 text-xs" />
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
                      <Input value={aff.programDisplayName} onChange={(e) => setAff({ programDisplayName: e.target.value })} placeholder="e.g. Essential Housing" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">Avoid these terms</label>
                      <Input value={aff.avoidTerms} onChange={(e) => setAff({ avoidTerms: e.target.value })} placeholder="e.g. low-income, subsidized" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">Approved phrase</label>
                      <Input value={aff.approvedPhrase} onChange={(e) => setAff({ approvedPhrase: e.target.value })} placeholder="e.g. income-restricted apartment homes" className="h-8 text-xs" />
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
                          value={aff.outcomeMessages[outcome] ?? ""}
                          onChange={(e) => setAff({ outcomeMessages: { ...aff.outcomeMessages, [outcome]: e.target.value } })}
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
                    {aff.requiredDocuments.map((doc, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={doc}
                          onChange={(e) => {
                            const next = [...aff.requiredDocuments]
                            next[i] = e.target.value
                            setAff({ requiredDocuments: next })
                          }}
                          className="h-8 flex-1 text-xs"
                        />
                        <button
                          onClick={() => setAff({ requiredDocuments: aff.requiredDocuments.filter((_, idx) => idx !== i) })}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          aria-label={`Remove document ${i + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <Button size="sm" variant="ghost" className="h-7 text-[11px]"
                      onClick={() => setAff({ requiredDocuments: [...aff.requiredDocuments, ""] })}>
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
