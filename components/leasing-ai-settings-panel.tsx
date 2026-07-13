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
  Pencil,
  X,
  Lock,
  AlertTriangle,
  Info,
  Home,
  ShieldCheck,
} from "lucide-react"

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

type PreQualOperator =
  | "greater_than"
  | "less_than"
  | "at_least"
  | "at_most"
  | "equals"
  | "not_equals"
  | "less_than_multiplier"
  | "at_least_multiplier"
  | "yes"
  | "no"
  | "dont_know"

type PreQualResult =
  | "qualified"
  | "over_income"
  | "under_income"
  | "unit_ineligible"
  | "potentially_qualified"
  | "in_progress"

type PreQualConnector = "and" | "or"

type TourGoal = "offer" | "if_asked" | "none"
type ApplicationGoal = "offer" | "if_asked" | "none"

interface PreQualGoal {
  result: PreQualResult
  tour: TourGoal
  application: ApplicationGoal
  waitlist: TourGoal
  offerMarketRate: boolean
}

// Master list of screening criteria the user can choose from
const AVAILABLE_SCREENING_CRITERIA = [
  "Income-to-rent ratio",
  "Employment Status",
  "Move-in timeline",
  "Pet Policy Compliance",
  "Credit Score",
] as const

interface ScreeningCriterionConfig {
  id: string
  label: string
  value: string
}

const PREQUAL_OPERATOR_LABELS: Record<PreQualOperator, string> = {
  greater_than: "is greater than",
  less_than: "is less than",
  at_least: "is at least",
  at_most: "is at most",
  equals: "equals",
  not_equals: "does not equal",
  less_than_multiplier: "is less than (multiplier of rent)",
  at_least_multiplier: "is at least (multiplier of rent)",
  yes: "Yes",
  no: "No",
  dont_know: "Don't Know",
}

const YES_NO_INPUTS = new Set<string>([])

const INCOME_INPUTS = new Set([
  "Income-to-rent ratio",
])

// Criteria answered by picking from a fixed set of choices
const CHOICE_INPUTS: Record<string, string[]> = {
  "Income-to-rent ratio": ["1x", "1.5x", "2x", "2.5x", "3x"],
  "Employment Status": ["Unemployed", "Part-Time (Less than 40 hours)", "Full-time (40 hours or more)"],
  "Move-in timeline": ["Within 30 days", "30-60 days", "60+ days"],
  "Pet Policy Compliance": ["Yes, I have a pet", "No, I don't have a pet"],
  "Credit Score": ["500 minimum", "600 minimum", "700 minimum", "800 minimum"],
}

function operatorsForInput(input: string): PreQualOperator[] {
  if (YES_NO_INPUTS.has(input)) return ["yes", "no", "dont_know"]
  if (INCOME_INPUTS.has(input)) return ["less_than", "at_least", "equals", "not_equals"]
  if (CHOICE_INPUTS[input]) return ["equals", "not_equals"]
  return ["greater_than", "less_than", "at_least", "at_most", "equals", "not_equals"]
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

interface PreQualCondition {
  id: string
  input: string
  operator: PreQualOperator
  value: string
}

interface PreQualRule {
  id: string
  label: string
  connector: PreQualConnector
  conditions: PreQualCondition[]
  tour: TourGoal
  application: ApplicationGoal
  offerMarketRate: boolean
}

function makeCondition(defaultInput?: string): PreQualCondition {
  const input = defaultInput ?? AVAILABLE_SCREENING_CRITERIA[0]
  return {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    input,
    operator: operatorsForInput(input)[0],
    value: "",
  }
}

const DEFAULT_PREQUAL_RULES: PreQualRule[] = []

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
  screeningCriteria: ScreeningCriterionConfig[]
  affordableFlowEnabled: boolean
  conversationStart: ConversationStart
  affordableSettings: AffordableSettings
  preQualRules: PreQualRule[]
  preQualGoals: PreQualGoal[]
}

function makeDefaultState(): PanelState {
  return {
    conversationMode: DEFAULT_MODE,
    preQualEnabled: false,
    screeningCriteria: [],
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
    preQualRules: DEFAULT_PREQUAL_RULES,
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
        prequalification_rules?: {
          label?: string
          connector?: string
          conditions?: { input: string; operator: string; value: string }[]
          input?: string
          operator?: string
          value?: string
          tour?: string
          application?: string
          offer_market_rate?: boolean
          result?: string
        }[]
        prequalification_goals?: { result: string; tour: string; application: string; waitlist?: string; offer_market_rate: boolean }[]
        prequalification_actions?: { result: string; action: string }[]
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
        if (data.prequalification_rules && data.prequalification_rules.length > 0) {
          loaded.preQualRules = data.prequalification_rules.map((r, i) => {
            const conditions: PreQualCondition[] =
              r.conditions && r.conditions.length > 0
                ? r.conditions.map((c, j) => ({
                    id: `r-${i + 1}-c${j + 1}`,
                    input: c.input,
                    operator: c.operator as PreQualOperator,
                    value: c.value,
                  }))
                : [{
                    id: `r-${i + 1}-c1`,
                    input: r.input ?? AVAILABLE_SCREENING_CRITERIA[0],
                    operator: (r.operator as PreQualOperator) ?? "greater_than",
                    value: r.value ?? "",
                  }]
            return {
              id: `r-${i + 1}`,
              label: r.label ?? "",
              connector: (r.connector as PreQualConnector) ?? "and",
              conditions,
              tour: (r.tour as TourGoal) ?? "none",
              application: (r.application as ApplicationGoal) ?? "none",
              offerMarketRate: Boolean(r.offer_market_rate),
            }
          })
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
        prequalification_rules: s.preQualEnabled
          ? s.preQualRules
              .map((r) => ({
                label: r.label,
                connector: r.connector,
                conditions: r.conditions.filter((c) => c.value.trim()).map((c) => ({ input: c.input, operator: c.operator, value: c.value })),
                tour: r.tour,
                application: r.application,
                offer_market_rate: r.offerMarketRate,
              }))
              .filter((r) => r.conditions.length > 0)
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
          <SectionPreQualification state={state} update={update} setState={setState} />
        </div>
      </div>

      <FooterActionBar dirty={dirty} onSave={handleSave} onDiscard={handleDiscard} backendStatus={backendStatus} />
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

function SectionPreQualification({ state, update, setState }: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
  setState: React.Dispatch<React.SetStateAction<PanelState>>
}) {
  // ── Add-rule form state ──
  const [newConnector, setNewConnector] = useState<PreQualConnector>("and")
  const [newConditions, setNewConditions] = useState<PreQualCondition[]>(() => [makeCondition()])
  const [newTour, setNewTour] = useState<TourGoal>("none")
  const [newApp, setNewApp] = useState<ApplicationGoal>("none")
  const [newMarketRate, setNewMarketRate] = useState(false)

  const addDraftCondition = () => setNewConditions((cs) => [...cs, makeCondition()])
  const removeDraftCondition = (id: string) =>
    setNewConditions((cs) => (cs.length > 1 ? cs.filter((c) => c.id !== id) : cs))
  const patchDraftCondition = (id: string, patch: Partial<PreQualCondition>) =>
    setNewConditions((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  const draftValid = newConditions.some((c) => c.value.trim())

  const addRule = () => {
    if (!draftValid) return
    const filledConditions = newConditions.filter((c) => c.value.trim())
    const autoLabel = filledConditions[0]?.input || ""
    update("preQualRules", [
      ...state.preQualRules,
      { id: `r-${Date.now()}`, label: autoLabel, connector: newConnector, conditions: filledConditions, tour: newTour, application: newApp, offerMarketRate: newMarketRate },
    ])
    setNewConnector("and"); setNewConditions([makeCondition()]); setNewTour("none"); setNewApp("none"); setNewMarketRate(false)
  }

  const removeRule = (id: string) => update("preQualRules", state.preQualRules.filter((r) => r.id !== id))
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const patchRule = (id: string, patch: Partial<PreQualRule>) =>
    update("preQualRules", state.preQualRules.map((r) => (r.id === id ? { ...r, ...patch } : r)))

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
      icon={ListChecks}
      title="Pre-qualification"
      description="When enabled, the AI prequalifies leads against the building's units by asking for household size, income, and other configured qualifications before proceeding."
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
            without qualifying the prospect. Toggle on to configure qualification rules.
          </p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Screening setup ── */}
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Screening setup</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Select which criteria the AI will screen prospects on. Each selected item becomes available as an input when building rules below.
              </p>
            </div>

            {/* Picklist */}
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SCREENING_CRITERIA.map((label) => {
                const isSelected = state.screeningCriteria.some((sc) => sc.label === label)
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        update("screeningCriteria", state.screeningCriteria.filter((sc) => sc.label !== label))
                      } else {
                        update("screeningCriteria", [...state.screeningCriteria, { id: `sc-${Date.now()}`, label, value: "" }])
                      }
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      isSelected
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-border bg-white text-foreground hover:border-zinc-400",
                    )}
                  >
                    {isSelected && <span className="mr-1">✓</span>}
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Configuration for selected criteria */}
            {state.screeningCriteria.length > 0 && (
              <div className="space-y-2 rounded-lg border border-border bg-zinc-50/30 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Configure Screening Criteria</p>
                {state.screeningCriteria.map((sc) => (
                  <div key={sc.id} className="flex items-center gap-3">
                    <span className="w-56 shrink-0 text-xs font-medium text-foreground">{sc.label}</span>
                    {CHOICE_INPUTS[sc.label] ? (
                      <Select
                        value={sc.value || undefined}
                        onValueChange={(v) => {
                          update("screeningCriteria", state.screeningCriteria.map((s) =>
                            s.id === sc.id ? { ...s, value: v } : s
                          ))
                        }}
                      >
                        <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Select an option" /></SelectTrigger>
                        <SelectContent>
                          {CHOICE_INPUTS[sc.label].map((opt) => (
                            <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={sc.value}
                        onChange={(e) => {
                          update("screeningCriteria", state.screeningCriteria.map((s) =>
                            s.id === sc.id ? { ...s, value: e.target.value } : s
                          ))
                        }}
                        placeholder="e.g. threshold or requirement"
                        className="h-8 flex-1 text-xs"
                      />
                    )}
                    <button
                      onClick={() => update("screeningCriteria", state.screeningCriteria.filter((s) => s.id !== sc.id))}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Post-qualification actions ── */}
          <div className="space-y-3 border-t border-border pt-5">
            <div>
              <p className="text-xs font-semibold text-foreground">Post-qualification actions</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Evaluated top to bottom — the first matching rule determines what the agent may offer. The agent
                collects answers for each input; rules decide the next action deterministically.
              </p>
            </div>

            {state.preQualRules.length === 0 ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-zinc-50/40 py-8">
                <p className="text-sm text-muted-foreground">No rules yet — add one below.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-zinc-50/60">
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">#</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Conditions</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tour</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Application</th>
                      <th className="px-3 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {state.preQualRules.map((r, i) => {
                      const isEditing = editingRuleId === r.id
                      return (
                        <tr key={r.id} className={cn("border-b border-border/50 last:border-0 transition-colors", isEditing ? "bg-blue-50/40" : "hover:bg-zinc-50/40")}>
                          <td className="px-3 py-2 align-top text-muted-foreground text-xs tabular-nums">{i + 1}</td>
                          <td className="px-3 py-2 align-top text-muted-foreground">
                            <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                              {r.conditions.map((c, idx) => (
                                <React.Fragment key={c.id}>
                                  {idx > 0 && (
                                    <span className="rounded bg-zinc-200/70 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-600">
                                      {r.connector}
                                    </span>
                                  )}
                                  <span className="whitespace-nowrap">
                                    <span className="font-medium text-foreground">{c.input}</span>{" "}
                                    {YES_NO_INPUTS.has(c.input)
                                      ? <span className="text-foreground">= {PREQUAL_OPERATOR_LABELS[c.operator]}</span>
                                      : <>{PREQUAL_OPERATOR_LABELS[c.operator]} <span className="text-foreground">&quot;{c.value}&quot;</span></>}
                                  </span>
                                </React.Fragment>
                              ))}
                            </span>
                          </td>
                          <td className="px-3 py-2 align-top">
                            {isEditing ? (
                              <Select value={r.tour} onValueChange={(v) => patchRule(r.id, { tour: v as TourGoal })}>
                                <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {(Object.keys(TOUR_GOAL_LABELS) as TourGoal[]).map((t) => <SelectItem key={t} value={t} className="text-xs">{TOUR_GOAL_LABELS[t]}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs">{TOUR_GOAL_LABELS[r.tour]}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            {isEditing ? (
                              <Select value={r.application} onValueChange={(v) => patchRule(r.id, { application: v as ApplicationGoal })}>
                                <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {(Object.keys(APP_GOAL_LABELS) as ApplicationGoal[]).map((a) => <SelectItem key={a} value={a} className="text-xs">{APP_GOAL_LABELS[a]}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs">{APP_GOAL_LABELS[r.application]}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditingRuleId(isEditing ? null : r.id)}
                                className={cn("transition-colors", isEditing ? "text-blue-600 hover:text-blue-800" : "text-muted-foreground hover:text-foreground")}
                                aria-label={isEditing ? `Done editing rule ${i + 1}` : `Edit rule ${i + 1}`}
                              >
                                {isEditing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                              </button>
                              <button onClick={() => removeRule(r.id)} className="text-muted-foreground transition-colors hover:text-destructive" aria-label={`Remove rule ${i + 1}`}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add rule form */}
            <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add rule</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Conditions</label>
                  {newConditions.length > 1 && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">Match</span>
                      <div className="flex overflow-hidden rounded-md border border-border">
                        {(["and", "or"] as PreQualConnector[]).map((conn) => (
                          <button key={conn} type="button" onClick={() => setNewConnector(conn)}
                            className={cn("px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                              newConnector === conn ? "bg-zinc-900 text-white" : "bg-white text-muted-foreground hover:bg-zinc-50")}>
                            {conn === "and" ? "All (AND)" : "Any (OR)"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {newConditions.map((c, idx) => (
                  <div key={c.id} className="space-y-2">
                    {idx > 0 && (
                      <div className="flex items-center">
                        <span className="rounded bg-zinc-200/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-600">{newConnector}</span>
                      </div>
                    )}
                    <div className="flex items-end gap-2">
                      <div className="grid flex-1 gap-2 sm:grid-cols-3">
                        <div className="space-y-1">
                          {idx === 0 && <label className="text-[10px] font-medium text-muted-foreground">Input</label>}
                          <Select value={c.input} onValueChange={(v) => patchDraftCondition(c.id, { input: v, operator: operatorsForInput(v)[0], value: "" })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{state.screeningCriteria.map((sc) => <SelectItem key={sc.id} value={sc.label} className="text-xs">{sc.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        {YES_NO_INPUTS.has(c.input) ? (
                          <div className="space-y-1 sm:col-span-2">
                            {idx === 0 && <label className="text-[10px] font-medium text-muted-foreground">Answer</label>}
                            <Select value={c.operator} onValueChange={(v) => patchDraftCondition(c.id, { operator: v as PreQualOperator, value: v })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {operatorsForInput(c.input).map((op) => (
                                  <SelectItem key={op} value={op} className="text-xs">{PREQUAL_OPERATOR_LABELS[op]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-1">
                              {idx === 0 && <label className="text-[10px] font-medium text-muted-foreground">Operator</label>}
                              <Select value={c.operator} onValueChange={(v) => patchDraftCondition(c.id, { operator: v as PreQualOperator })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {operatorsForInput(c.input).map((op) => (
                                    <SelectItem key={op} value={op} className="text-xs">{PREQUAL_OPERATOR_LABELS[op]}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              {idx === 0 && <label className="text-[10px] font-medium text-muted-foreground">Value / source</label>}
                              {CHOICE_INPUTS[c.input] ? (
                                <Select value={c.value || undefined} onValueChange={(v) => patchDraftCondition(c.id, { value: v })}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select an option" /></SelectTrigger>
                                  <SelectContent>
                                    {CHOICE_INPUTS[c.input].map((opt) => (
                                      <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input placeholder="e.g. 3x or $4,500" className="h-8 text-xs" value={c.value} onChange={(e) => patchDraftCondition(c.id, { value: e.target.value })} />
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      <button type="button" onClick={() => removeDraftCondition(c.id)} disabled={newConditions.length === 1}
                        className="mb-1.5 text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30" aria-label="Remove condition">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={addDraftCondition}>
                  <Plus className="mr-1 h-3 w-3" />Add condition
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Tour</label>
                  <Select value={newTour} onValueChange={(v) => setNewTour(v as TourGoal)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TOUR_GOAL_LABELS) as TourGoal[]).map((t) => <SelectItem key={t} value={t} className="text-xs">{TOUR_GOAL_LABELS[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Application</label>
                  <Select value={newApp} onValueChange={(v) => setNewApp(v as ApplicationGoal)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(APP_GOAL_LABELS) as ApplicationGoal[]).map((a) => <SelectItem key={a} value={a} className="text-xs">{APP_GOAL_LABELS[a]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={addRule} disabled={!draftValid}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add rule
              </Button>
            </div>
          </div>

          {/* ── Affordable flow toggle ── */}
          <div className="space-y-3 border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Affordable qualification</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Enable to configure affordable-specific settings: income limits, household size, vouchers, conversation opener, and post-qualification actions.
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {state.affordableFlowEnabled ? "On" : "Off"}
                </span>
                <Checkbox
                  checked={state.affordableFlowEnabled}
                  onCheckedChange={(v) => update("affordableFlowEnabled", v === true)}
                />
              </label>
            </div>

            {state.affordableFlowEnabled && (
              <div className="space-y-5 rounded-lg border border-border bg-zinc-50/30 p-4">
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
                  <p className="text-[10px] text-muted-foreground">Control the language the AI uses when describing the affordable program. Sensitive branding and regulatory considerations apply.</p>
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
                  <p className="text-[10px] text-muted-foreground">Configure what the AI tells the prospect for each outcome. Avoids free-form language that may create compliance exposure.</p>
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
                  <p className="text-[10px] text-muted-foreground">Documents the prospect may need for the application or certification. The AI shares this checklist after qualification or when the prospect asks how to apply.</p>
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
                      Configure what the AI may offer for each affordable qualification outcome.
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
          </div>

        </div>
      )}
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Sticky footer
   ══════════════════════════════════════════════════════════════════════════ */

function FooterActionBar({ dirty, onSave, onDiscard, backendStatus = "idle" }: { dirty: boolean; onSave: () => void; onDiscard: () => void; backendStatus?: "idle" | "ok" | "error" }) {
  return (
    <footer className={cn("sticky bottom-0 inset-x-0 border-t bg-white px-8 py-3 transition-all",
      dirty ? "border-amber-200 bg-amber-50" : "border-border")}>
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          {dirty
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
          <Button size="sm" onClick={onSave} disabled={!dirty}>Save changes</Button>
        </div>
      </div>
    </footer>
  )
}
