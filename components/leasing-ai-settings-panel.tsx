"use client"

/**
 * Leasing AI — per-property settings panel.
 *
 * Renders inside the existing agent-roster slide-out, in the "Leasing AI Settings"
 * left-nav tab (replaces the "Coming Soon" placeholder).
 *
 * Source: leasing-ai-prd-2026-04-29.md §6.3 (settings), §6.6 (multilingual),
 * §6.7 (verification — read-only summary surfaced here), §6.8 (agent identity).
 *
 * Scope: this panel is per-property. The Custom Mode *editor* is company-level
 * and lives in an embedded dialog (kept small on purpose). No separate page.
 */

import React, { useMemo, useState } from "react"
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
  Bot,
  Globe,
  MessageSquare,
  Lightbulb,
  Clock,
  ShieldCheck,
  FlaskConical,
  Plus,
  X,
  Sparkles,
  Info,
  Check,
  Pencil,
  AlertTriangle,
  ExternalLink,
  Lock,
} from "lucide-react"

/* ══════════════════════════════════════════════════════════════════════════
   Types & seeded data
   ══════════════════════════════════════════════════════════════════════════ */

type ToneId = "friendly" | "professional" | "luxury" | "student-casual"
type Discovery = "minimal" | "standard" | "deep"
type Screening = "light" | "standard" | "strict"
type Customization = "default" | "value" | "lifestyle" | "luxury"
type ConversionGoal = "schedule_tours" | "drive_applications" | "answer_questions"

interface CustomMode {
  id: string
  name: string
  description: string
  isSeed: boolean
  discovery: Discovery
  screening: Screening
  customization: Customization
  conversionGoal: ConversionGoal
  assignedPropertyCount: number
}

const SEED_MODES: CustomMode[] = [
  {
    id: "sales",
    name: "Sales Mode",
    description: "Optimize for tour bookings — friendly, low-friction qualification.",
    isSeed: true,
    discovery: "standard",
    screening: "light",
    customization: "lifestyle",
    conversionGoal: "schedule_tours",
    assignedPropertyCount: 6,
  },
  {
    id: "screening",
    name: "Screening Mode",
    description: "High occupancy, stabilized — qualify harder before booking.",
    isSeed: true,
    discovery: "deep",
    screening: "strict",
    customization: "default",
    conversionGoal: "drive_applications",
    assignedPropertyCount: 1,
  },
  {
    id: "leaseup",
    name: "Lease-Up Mode",
    description: "New construction — answer questions, build interest, low friction.",
    isSeed: true,
    discovery: "minimal",
    screening: "light",
    customization: "value",
    conversionGoal: "answer_questions",
    assignedPropertyCount: 0,
  },
]

const TONE_OPTIONS: { value: ToneId; label: string; helper: string }[] = [
  { value: "friendly", label: "Friendly", helper: "Warm and conversational" },
  { value: "professional", label: "Professional", helper: "Polished and businesslike" },
  { value: "luxury", label: "Luxury", helper: "Formal, premium emphasis" },
  { value: "student-casual", label: "Student-casual", helper: "Approachable and on-trend" },
]

const DISCOVERY_OPTIONS: { value: Discovery; label: string; helper: string }[] = [
  { value: "minimal", label: "Minimal", helper: "Move-in date and bedrooms only" },
  { value: "standard", label: "Standard", helper: "Adds budget and pets" },
  { value: "deep", label: "Deep", helper: "Adds occupants, employer, prior address" },
]
const SCREENING_OPTIONS: { value: Screening; label: string; helper: string }[] = [
  { value: "light", label: "Light", helper: "Only screen on volunteered info" },
  { value: "standard", label: "Standard", helper: "Use volunteered info to pre-check fit" },
  { value: "strict", label: "Strict", helper: "Proactively confirm fit before tour booking" },
]
const CUSTOMIZATION_OPTIONS: { value: Customization; label: string; helper: string }[] = [
  { value: "default", label: "Default", helper: "Balanced selling-point emphasis" },
  { value: "value", label: "Value", helper: "Lead with price and specials" },
  { value: "lifestyle", label: "Lifestyle", helper: "Lead with amenities and neighborhood" },
  { value: "luxury", label: "Luxury", helper: "Formal, premium emphasis" },
]
const GOAL_OPTIONS: { value: ConversionGoal; label: string; helper: string }[] = [
  { value: "schedule_tours", label: "Schedule tours", helper: "Default conversion target" },
  { value: "drive_applications", label: "Drive applications", helper: "Skip tour where ready" },
  { value: "answer_questions", label: "Answer questions", helper: "Low-friction, info-first" },
]

const SUGGESTED_SELLING_POINTS = [
  "Resort-style pool with cabanas",
  "Pet-friendly with on-site dog park",
  "In-unit washer/dryer in every home",
  "Private rooftop with skyline views",
  "Reserved parking and EV chargers",
  "Walkable to grocery, parks, and transit",
  "Stainless appliances and quartz counters",
  "24/7 fitness center with Peloton bikes",
]

/* ══════════════════════════════════════════════════════════════════════════
   Property mock-data shim — the parent only passes a name; we infer the rest
   so the UI feels real. In production, this comes from Entrata core.
   ══════════════════════════════════════════════════════════════════════════ */

interface DerivedPropertyData {
  vertical: "Conventional" | "Student" | "Affordable"
  jurisdictionState: string
  jurisdictionRule: string | null
  affordable: { lihtc: boolean; section8: boolean; mixedIncome: boolean }
}

const PROPERTY_PROFILES: Record<string, Partial<DerivedPropertyData>> = {
  "Aspen Heights":              { vertical: "Conventional", jurisdictionState: "Utah",     jurisdictionRule: null },
  "14th North Parkway":         { vertical: "Conventional", jurisdictionState: "California", jurisdictionRule: "AB 2216 — fee disclosure" },
  "The Rails on Main":          { vertical: "Conventional", jurisdictionState: "Colorado",   jurisdictionRule: "HB 23-1095 — fee disclosure" },
  "Summit View at Lakewood":    { vertical: "Student",      jurisdictionState: "Colorado",   jurisdictionRule: "HB 23-1095 — fee disclosure" },
  "Bellamy Place":              { vertical: "Conventional", jurisdictionState: "Texas",      jurisdictionRule: null },
  "Ivy Gate Residences":        { vertical: "Affordable",   jurisdictionState: "New York",   jurisdictionRule: "NYC all-in pricing",
                                  affordable: { lihtc: true, section8: true, mixedIncome: false } },
  "Copper Ridge":               { vertical: "Conventional", jurisdictionState: "Arizona",    jurisdictionRule: null },
  "Harborstone Landing":        { vertical: "Conventional", jurisdictionState: "Washington", jurisdictionRule: null },
}

function deriveProperty(name: string): DerivedPropertyData {
  const profile = PROPERTY_PROFILES[name] ?? {}
  return {
    vertical: profile.vertical ?? "Conventional",
    jurisdictionState: profile.jurisdictionState ?? "—",
    jurisdictionRule: profile.jurisdictionRule ?? null,
    affordable: profile.affordable ?? { lihtc: false, section8: false, mixedIncome: false },
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   Settings state
   ══════════════════════════════════════════════════════════════════════════ */

interface PanelState {
  agentDisplayName: string
  agentPersonaTone: ToneId
  customModeId: string
  // explicit per-property overrides on top of the assigned mode (rarely used; collapsed by default)
  modeOverrides: Partial<Pick<CustomMode, "discovery" | "screening" | "customization" | "conversionGoal">>
  spanishEnabled: boolean
  sellingPoints: string[]
  coldLeadFirstTouchMinutes: number
  followUpCadence: { firstHours: number; secondHours: number; thirdDays: number }
  jurisdictionOverride: string | null
  affordableOverride: Partial<{ lihtc: boolean; section8: boolean; mixedIncome: boolean }>
}

function makeDefaultState(derived: DerivedPropertyData): PanelState {
  return {
    agentDisplayName: "",
    agentPersonaTone: derived.vertical === "Student" ? "student-casual" : "friendly",
    customModeId: derived.vertical === "Student" ? "leaseup" : "sales",
    modeOverrides: {},
    spanishEnabled: false,
    sellingPoints: [],
    coldLeadFirstTouchMinutes: 5,
    followUpCadence: { firstHours: 24, secondHours: 72, thirdDays: 7 },
    jurisdictionOverride: null,
    affordableOverride: {},
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   Public component
   ══════════════════════════════════════════════════════════════════════════ */

interface Props {
  propertyName: string
  agentDisplayLabel?: string // e.g. "ELI+ Leasing AI" — used in the body copy
  /** Number of simulations the user has started in the Simulation tab for this property. */
  simulationCount?: number
  /** Switch the parent's left nav to the Simulation tab. */
  onOpenSimulation?: () => void
}

export function LeasingAISettingsPanel({
  propertyName,
  agentDisplayLabel = "Leasing AI",
  simulationCount = 0,
  onOpenSimulation,
}: Props) {
  const derived = useMemo(() => deriveProperty(propertyName), [propertyName])
  const [state, setState] = useState<PanelState>(() => makeDefaultState(derived))
  const [pristine, setPristine] = useState<PanelState>(() => makeDefaultState(derived))
  const [modes, setModes] = useState<CustomMode[]>(() => SEED_MODES)
  const [showAdvancedMode, setShowAdvancedMode] = useState(false)
  const [manageModesOpen, setManageModesOpen] = useState(false)

  const dirty = JSON.stringify(state) !== JSON.stringify(pristine)
  const assignedMode = modes.find((m) => m.id === state.customModeId) ?? modes[0]

  const update = <K extends keyof PanelState>(key: K, value: PanelState[K]) =>
    setState((s) => ({ ...s, [key]: value }))

  const handleSave = () => setPristine(state)
  const handleDiscard = () => setState(pristine)

  // Activation gate is driven by real Simulation runs in the next tab over.
  const requiredSimulations = state.spanishEnabled ? 2 : 1
  const activationGate = computeActivationGate({
    spanishEnabled: state.spanishEnabled,
    simulationCount,
    requiredSimulations,
  })

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="border-b border-border bg-white px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{agentDisplayLabel} Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure how {agentDisplayLabel} behaves at <strong>{propertyName}</strong>. Most fields auto-populate from
              Entrata — review and adjust only what's specific to this property.
            </p>
          </div>
          <Badge variant="gray" className="shrink-0">
            <Lock className="mr-1 h-3 w-3" />
            Property scope
          </Badge>
        </div>
      </header>

      {/* Activation status banner */}
      <ActivationGateBanner status={activationGate} propertyName={propertyName} />

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 pb-32 pt-6">
        <div className="mx-auto max-w-3xl space-y-8">
          <SectionAgentIdentity state={state} update={update} agentDisplayLabel={agentDisplayLabel} />

          <SectionConversationMode
            state={state}
            update={update}
            modes={modes}
            assignedMode={assignedMode}
            showAdvanced={showAdvancedMode}
            onToggleAdvanced={() => setShowAdvancedMode((v) => !v)}
            onOpenManageModes={() => setManageModesOpen(true)}
          />

          <SectionLanguages
            state={state}
            update={update}
            needsSpanishTest={simulationCount < requiredSimulations}
          />

          <SectionSellingPoints state={state} update={update} derived={derived} />

          <SectionOutreach state={state} update={update} />

          <SectionCompliance state={state} update={update} derived={derived} />

          <SectionTestBeforeLaunch
            spanishEnabled={state.spanishEnabled}
            simulationCount={simulationCount}
            requiredSimulations={requiredSimulations}
            onOpenSimulation={onOpenSimulation}
          />

          <p className="pt-4 text-center text-xs text-muted-foreground">
            Source of record:{" "}
            <span className="font-mono">leasing-ai-prd-2026-04-29.md §6.3, §6.6, §6.8</span>
          </p>
        </div>
      </div>

      {/* Sticky footer */}
      <FooterActionBar dirty={dirty} onSave={handleSave} onDiscard={handleDiscard} />

      {/* Manage Custom Modes dialog (company-level) */}
      <ManageCustomModesDialog
        open={manageModesOpen}
        onOpenChange={setManageModesOpen}
        modes={modes}
        onModesChange={setModes}
      />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Activation gate logic
   ══════════════════════════════════════════════════════════════════════════ */

type GateStatus =
  | { kind: "ready"; reasons: string[] }
  | { kind: "needs_test"; reasons: string[] }

function computeActivationGate(args: {
  spanishEnabled: boolean
  simulationCount: number
  requiredSimulations: number
}): GateStatus {
  const { spanishEnabled, simulationCount, requiredSimulations } = args
  if (simulationCount >= requiredSimulations) return { kind: "ready", reasons: [] }
  const remaining = requiredSimulations - simulationCount
  const reasons: string[] = []
  if (spanishEnabled) {
    reasons.push(
      `Run ${remaining} more test conversation${remaining === 1 ? "" : "s"} (one in English, one in Spanish)`,
    )
  } else {
    reasons.push("Run at least one test conversation in the Simulation tab")
  }
  return { kind: "needs_test", reasons }
}

function ActivationGateBanner({
  status,
  propertyName,
}: {
  status: GateStatus
  propertyName: string
}) {
  if (status.kind === "ready") {
    return (
      <div className="border-b border-emerald-200 bg-emerald-50 px-8 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Check className="h-4 w-4 text-emerald-700" />
          <p className="text-xs text-emerald-900">
            <strong>Ready to go live.</strong> All required test conversations completed for {propertyName}.
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-8 py-3">
      <div className="mx-auto flex max-w-3xl items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div className="text-xs text-amber-900">
          <strong>Activation blocked — {status.reasons.length} item{status.reasons.length === 1 ? "" : "s"} pending.</strong>{" "}
          Before {propertyName} can take real prospect traffic:
          <ul className="ml-4 mt-1 list-disc space-y-0.5">
            {status.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Section primitives
   ══════════════════════════════════════════════════════════════════════════ */

function SectionShell({
  icon: Icon,
  title,
  description,
  derivedPill,
  headerAction,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  title: string
  description: string
  derivedPill?: string
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
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {derivedPill && (
              <Badge variant="gray" className="text-[10px]">
                {derivedPill}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {headerAction && <div className="shrink-0 self-center">{headerAction}</div>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Section: Agent identity
   ══════════════════════════════════════════════════════════════════════════ */

function SectionAgentIdentity({
  state,
  update,
  agentDisplayLabel,
}: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
  agentDisplayLabel: string
}) {
  return (
    <SectionShell
      icon={Bot}
      title="Agent identity"
      description="Brand the agent and set its tone. The agent always acknowledges it's AI when asked."
    >
      <div className="space-y-5">
        <div>
          <label className="text-xs font-medium text-foreground">Display name</label>
          <Input
            value={state.agentDisplayName}
            onChange={(e) => update("agentDisplayName", e.target.value)}
            placeholder="your leasing assistant"
            maxLength={40}
            className="mt-1.5"
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            What the agent calls itself. Leave blank for the generic{" "}
            <em>your leasing assistant</em>. Companies in unified mode see this set at the company level.
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-foreground">Tone</label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {TONE_OPTIONS.map((t) => {
              const active = state.agentPersonaTone === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => update("agentPersonaTone", t.value)}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-left text-xs transition-all",
                    active
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                      : "border-border bg-white text-foreground hover:border-zinc-400",
                  )}
                >
                  <div className="font-semibold">{t.label}</div>
                  <div className={cn("mt-0.5 text-[11px] leading-snug", active ? "text-white/80" : "text-muted-foreground")}>
                    {t.helper}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2.5">
          <p className="text-[11px] leading-relaxed text-zinc-700">
            <Info className="mr-1 inline h-3 w-3" /> The agent's compliance, workflow, and Fair-Housing rules
            are locked. Tone affects phrasing, not behavior. Custom names never let the agent impersonate a human —
            asking <em>"are you a bot?"</em> always triggers an honest disclosure.
          </p>
        </div>
      </div>
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Section: Conversation mode (Custom Mode assignment + optional overrides)
   ══════════════════════════════════════════════════════════════════════════ */

function SectionConversationMode({
  state,
  update,
  modes,
  assignedMode,
  showAdvanced,
  onToggleAdvanced,
  onOpenManageModes,
}: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
  modes: CustomMode[]
  assignedMode: CustomMode
  showAdvanced: boolean
  onToggleAdvanced: () => void
  onOpenManageModes: () => void
}) {
  const overrides = state.modeOverrides
  const hasOverrides = Object.keys(overrides).length > 0

  const effective = {
    discovery: overrides.discovery ?? assignedMode.discovery,
    screening: overrides.screening ?? assignedMode.screening,
    customization: overrides.customization ?? assignedMode.customization,
    conversionGoal: overrides.conversionGoal ?? assignedMode.conversionGoal,
  }

  return (
    <SectionShell
      icon={MessageSquare}
      title="Conversation mode"
      description="Mode bundles four behaviors — discovery depth, screening rigor, tone emphasis, conversion goal."
      headerAction={
        <Button variant="outline" size="sm" onClick={onOpenManageModes}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Manage modes
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Mode picker */}
        <div>
          <label className="text-xs font-medium text-foreground">Assigned Custom Mode</label>
          <Select value={state.customModeId} onValueChange={(v) => update("customModeId", v)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modes.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <div className="flex items-center gap-2">
                    <span>{m.name}</span>
                    {m.isSeed && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Default</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-[11px] text-muted-foreground">{assignedMode.description}</p>
        </div>

        {/* Effective behavior summary */}
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-zinc-50/40 p-3 lg:grid-cols-4">
          <DimensionPill label="Discovery" value={labelFor(DISCOVERY_OPTIONS, effective.discovery)}
            overridden={overrides.discovery !== undefined} />
          <DimensionPill label="Screening" value={labelFor(SCREENING_OPTIONS, effective.screening)}
            overridden={overrides.screening !== undefined} />
          <DimensionPill label="Tone emphasis" value={labelFor(CUSTOMIZATION_OPTIONS, effective.customization)}
            overridden={overrides.customization !== undefined} />
          <DimensionPill label="Goal" value={labelFor(GOAL_OPTIONS, effective.conversionGoal)}
            overridden={overrides.conversionGoal !== undefined} />
        </div>

        {/* Override toggle */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-xs font-medium text-foreground">
              Property-level override
              {hasOverrides && (
                <Badge variant="yellow" className="ml-2 text-[10px]">
                  {Object.keys(overrides).length} active
                </Badge>
              )}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Rarely needed. Override one or more dimensions just for this property.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onToggleAdvanced}>
            {showAdvanced ? "Hide" : "Show"}
          </Button>
        </div>

        {showAdvanced && (
          <div className="grid gap-3 rounded-lg border border-dashed border-border bg-zinc-50/40 p-3 md:grid-cols-2">
            <OverrideSelect
              label="Discovery"
              options={DISCOVERY_OPTIONS}
              modeValue={assignedMode.discovery}
              overrideValue={overrides.discovery}
              onChange={(v) => update("modeOverrides", { ...overrides, discovery: v })}
              onClear={() => {
                const next = { ...overrides }
                delete next.discovery
                update("modeOverrides", next)
              }}
            />
            <OverrideSelect
              label="Screening"
              options={SCREENING_OPTIONS}
              modeValue={assignedMode.screening}
              overrideValue={overrides.screening}
              onChange={(v) => update("modeOverrides", { ...overrides, screening: v })}
              onClear={() => {
                const next = { ...overrides }
                delete next.screening
                update("modeOverrides", next)
              }}
            />
            <OverrideSelect
              label="Tone emphasis"
              options={CUSTOMIZATION_OPTIONS}
              modeValue={assignedMode.customization}
              overrideValue={overrides.customization}
              onChange={(v) => update("modeOverrides", { ...overrides, customization: v })}
              onClear={() => {
                const next = { ...overrides }
                delete next.customization
                update("modeOverrides", next)
              }}
            />
            <OverrideSelect
              label="Conversion goal"
              options={GOAL_OPTIONS}
              modeValue={assignedMode.conversionGoal}
              overrideValue={overrides.conversionGoal}
              onChange={(v) => update("modeOverrides", { ...overrides, conversionGoal: v })}
              onClear={() => {
                const next = { ...overrides }
                delete next.conversionGoal
                update("modeOverrides", next)
              }}
            />
          </div>
        )}
      </div>
    </SectionShell>
  )
}

function labelFor<T extends string>(opts: { value: T; label: string }[], v: T) {
  return opts.find((o) => o.value === v)?.label ?? v
}

function DimensionPill({
  label,
  value,
  overridden,
}: {
  label: string
  value: string
  overridden: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-white px-2.5 py-2",
        overridden ? "border-amber-300 bg-amber-50" : "border-border",
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs font-semibold text-foreground">
        {value}
        {overridden && <span className="ml-1 text-[10px] text-amber-700">(override)</span>}
      </div>
    </div>
  )
}

function OverrideSelect<T extends string>({
  label,
  options,
  modeValue,
  overrideValue,
  onChange,
  onClear,
}: {
  label: string
  options: { value: T; label: string; helper: string }[]
  modeValue: T
  overrideValue: T | undefined
  onChange: (v: T) => void
  onClear: () => void
}) {
  const value = overrideValue ?? modeValue
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground">{label}</label>
        {overrideValue !== undefined && (
          <button onClick={onClear} className="text-[10px] text-zinc-500 hover:text-zinc-900 underline">
            reset
          </button>
        )}
      </div>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger className="mt-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
              <span className="ml-2 text-[10px] text-muted-foreground">{o.helper}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Section: Languages
   ══════════════════════════════════════════════════════════════════════════ */

function SectionLanguages({
  state,
  update,
  needsSpanishTest,
}: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
  needsSpanishTest: boolean
}) {
  return (
    <SectionShell
      icon={Globe}
      title="Languages"
      description="Choose which languages the agent speaks. Each enabled language requires its own test conversation before going live."
    >
      <div className="space-y-3">
        <label className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50/40 p-3">
          <Checkbox checked disabled className="mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">English</p>
            <p className="text-[11px] text-muted-foreground">Default language — always enabled.</p>
          </div>
          <Lock className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-white p-3 hover:border-zinc-400">
          <Checkbox
            checked={state.spanishEnabled}
            onCheckedChange={(v) => update("spanishEnabled", v === true)}
            className="mt-0.5"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Español</p>
            <p className="text-[11px] text-muted-foreground">
              Bilingual replies, jurisdiction-mandated text authored in Spanish, Latin American TTS for voice.
            </p>
          </div>
        </label>

        {state.spanishEnabled && needsSpanishTest && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
            <p className="text-[11px] text-amber-900">
              Spanish enabled — you'll need to run a test conversation in Spanish before this property can go live.
            </p>
          </div>
        )}
      </div>
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Section: Selling points
   ══════════════════════════════════════════════════════════════════════════ */

function SectionSellingPoints({
  state,
  update,
  derived,
}: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
  derived: DerivedPropertyData
}) {
  const [draft, setDraft] = useState("")
  const max = 10
  const charLimit = 200
  const remaining = max - state.sellingPoints.length

  const addSellingPoint = (text: string) => {
    const trimmed = text.trim().slice(0, charLimit)
    if (!trimmed || state.sellingPoints.length >= max) return
    update("sellingPoints", [...state.sellingPoints, trimmed])
  }

  const removeAt = (i: number) => {
    update("sellingPoints", state.sellingPoints.filter((_, idx) => idx !== i))
  }

  const acceptSuggestion = (text: string) => {
    if (state.sellingPoints.includes(text) || state.sellingPoints.length >= max) return
    update("sellingPoints", [...state.sellingPoints, text])
  }

  return (
    <SectionShell
      icon={Lightbulb}
      title="Selling points"
      description="Up to 10 short selling points the agent weaves in naturally. Auto-suggested from your amenities — review and refine."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">{state.sellingPoints.length}</strong> of {max} added
            <span className="ml-2 text-[11px]">· {charLimit} char max each</span>
          </p>
          {derived.vertical !== "Affordable" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const slots = max - state.sellingPoints.length
                const next = SUGGESTED_SELLING_POINTS
                  .filter((s) => !state.sellingPoints.includes(s))
                  .slice(0, slots)
                update("sellingPoints", [...state.sellingPoints, ...next])
              }}
              disabled={state.sellingPoints.length >= max}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Auto-fill from amenities
            </Button>
          )}
        </div>

        {/* Existing points */}
        {state.sellingPoints.length > 0 && (
          <ul className="space-y-2">
            {state.sellingPoints.map((point, i) => (
              <li
                key={`${point}-${i}`}
                className="group flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2"
              >
                <span className="text-[10px] font-mono text-muted-foreground">{i + 1}</span>
                <Input
                  value={point}
                  maxLength={charLimit}
                  onChange={(e) => {
                    const next = [...state.sellingPoints]
                    next[i] = e.target.value
                    update("sellingPoints", next)
                  }}
                  className="flex-1 border-transparent bg-transparent shadow-none focus-visible:border-input focus-visible:bg-white"
                />
                <span className="hidden text-[10px] tabular-nums text-muted-foreground group-hover:inline">
                  {point.length}/{charLimit}
                </span>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-zinc-100 hover:text-foreground"
                  aria-label={`Remove selling point ${i + 1}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add new */}
        {remaining > 0 && (
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a selling point — what makes this property worth a tour?"
              maxLength={charLimit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addSellingPoint(draft)
                  setDraft("")
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={() => {
                addSellingPoint(draft)
                setDraft("")
              }}
              disabled={!draft.trim()}
              size="sm"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        )}

        {/* Inline suggestions */}
        {state.sellingPoints.length < max && (
          <div className="rounded-lg border border-dashed border-border bg-zinc-50/40 p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Suggested from your amenities
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_SELLING_POINTS.filter((s) => !state.sellingPoints.includes(s))
                .slice(0, 4)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => acceptSuggestion(s)}
                    className="rounded-md border border-border bg-white px-2 py-1 text-[11px] text-foreground transition-colors hover:border-zinc-400 hover:bg-zinc-50"
                  >
                    <Plus className="mr-1 inline h-3 w-3" />
                    {s}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Section: Outreach timing
   ══════════════════════════════════════════════════════════════════════════ */

function SectionOutreach({
  state,
  update,
}: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
}) {
  return (
    <SectionShell
      icon={Clock}
      title="Outreach timing"
      description="When the agent reaches out first, and how it follows up after a tour or abandoned application."
    >
      <div className="space-y-5">
        <div>
          <label className="text-xs font-medium text-foreground">Cold-lead first-touch</label>
          <p className="mb-2 text-[11px] text-muted-foreground">
            If no human or AI has contacted a new lead within this many minutes, the agent reaches out first.
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={120}
              value={state.coldLeadFirstTouchMinutes}
              onChange={(e) => update("coldLeadFirstTouchMinutes", Math.max(0, Number(e.target.value) || 0))}
              className="w-24"
            />
            <span className="text-xs text-muted-foreground">minutes after guest card creation</span>
            {state.coldLeadFirstTouchMinutes !== 5 && (
              <Badge variant="yellow" className="ml-auto text-[10px]">Override</Badge>
            )}
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <label className="text-xs font-medium text-foreground">Follow-up cadence overrides</label>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Default cadence after a tour or abandoned application. Most properties leave these alone.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <CadenceField
              label="First touch"
              value={state.followUpCadence.firstHours}
              unit="hours"
              defaultValue={24}
              onChange={(v) =>
                update("followUpCadence", { ...state.followUpCadence, firstHours: v })
              }
            />
            <CadenceField
              label="Second touch"
              value={state.followUpCadence.secondHours}
              unit="hours"
              defaultValue={72}
              onChange={(v) =>
                update("followUpCadence", { ...state.followUpCadence, secondHours: v })
              }
            />
            <CadenceField
              label="Third touch"
              value={state.followUpCadence.thirdDays}
              unit="days"
              defaultValue={7}
              onChange={(v) =>
                update("followUpCadence", { ...state.followUpCadence, thirdDays: v })
              }
            />
          </div>
        </div>
      </div>
    </SectionShell>
  )
}

function CadenceField({
  label,
  value,
  unit,
  defaultValue,
  onChange,
}: {
  label: string
  value: number
  unit: string
  defaultValue: number
  onChange: (v: number) => void
}) {
  const isOverride = value !== defaultValue
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-foreground">{label}</span>
        {isOverride && (
          <button onClick={() => onChange(defaultValue)} className="text-[10px] text-zinc-500 underline hover:text-zinc-900">
            reset
          </button>
        )}
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <Input
          type="number"
          min={1}
          value={value}
          onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
          className={cn("w-full", isOverride && "border-amber-300")}
        />
        <span className="text-[11px] text-muted-foreground">{unit}</span>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        default {defaultValue} {unit}
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Section: Compliance overlays
   ══════════════════════════════════════════════════════════════════════════ */

function SectionCompliance({
  state,
  update,
  derived,
}: {
  state: PanelState
  update: <K extends keyof PanelState>(key: K, value: PanelState[K]) => void
  derived: DerivedPropertyData
}) {
  const detectedJurisdiction = derived.jurisdictionState
  const detectedRule = derived.jurisdictionRule
  const effectiveJurisdiction = state.jurisdictionOverride ?? detectedJurisdiction

  const merged = {
    lihtc: state.affordableOverride.lihtc ?? derived.affordable.lihtc,
    section8: state.affordableOverride.section8 ?? derived.affordable.section8,
    mixedIncome: state.affordableOverride.mixedIncome ?? derived.affordable.mixedIncome,
  }

  return (
    <SectionShell
      icon={ShieldCheck}
      title="Compliance overlays"
      description="Auto-detected from Entrata core. Override only if our detection is wrong for this property."
      derivedPill="Auto-populated"
    >
      <div className="space-y-5">
        <div>
          <label className="text-xs font-medium text-foreground">Jurisdiction (fee disclosure overlay)</label>
          <div className="mt-1.5 flex items-center gap-2">
            <Select
              value={effectiveJurisdiction}
              onValueChange={(v) =>
                update("jurisdictionOverride", v === detectedJurisdiction ? null : v)
              }
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={detectedJurisdiction}>
                  {detectedJurisdiction} {detectedRule ? `· ${detectedRule}` : "· no special disclosure"}
                </SelectItem>
                <SelectItem value="California">California · AB 2216</SelectItem>
                <SelectItem value="Colorado">Colorado · HB 23-1095</SelectItem>
                <SelectItem value="New York">New York · NYC all-in pricing</SelectItem>
                <SelectItem value="None">None</SelectItem>
              </SelectContent>
            </Select>
            {state.jurisdictionOverride && (
              <Button variant="ghost" size="sm" onClick={() => update("jurisdictionOverride", null)}>
                Reset
              </Button>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Detected from address: <strong>{detectedJurisdiction}</strong>
            {detectedRule && (
              <>
                {" · "}
                {detectedRule}
              </>
            )}
            {state.jurisdictionOverride && (
              <Badge variant="yellow" className="ml-2 text-[10px]">
                Override
              </Badge>
            )}
          </p>
        </div>

        <div className="border-t border-border pt-5">
          <label className="text-xs font-medium text-foreground">Affordable program overlays</label>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Activates compliance behavior — voucher pre-checks, income-limit awareness, recertification escalation.
          </p>
          <div className="space-y-2">
            <AffordableFlag
              label="LIHTC"
              detail="Income limits enforced (max + min)"
              detected={derived.affordable.lihtc}
              effective={merged.lihtc}
              onChange={(v) =>
                update("affordableOverride", { ...state.affordableOverride, lihtc: v })
              }
            />
            <AffordableFlag
              label="Section 8 voucher acceptance"
              detail="Voucher questions trigger guided flow"
              detected={derived.affordable.section8}
              effective={merged.section8}
              onChange={(v) =>
                update("affordableOverride", { ...state.affordableOverride, section8: v })
              }
            />
            <AffordableFlag
              label="Mixed-income"
              detail="Property has both market-rate and affordable units"
              detected={derived.affordable.mixedIncome}
              effective={merged.mixedIncome}
              onChange={(v) =>
                update("affordableOverride", { ...state.affordableOverride, mixedIncome: v })
              }
            />
          </div>
        </div>
      </div>
    </SectionShell>
  )
}

function AffordableFlag({
  label,
  detail,
  detected,
  effective,
  onChange,
}: {
  label: string
  detail: string
  detected: boolean
  effective: boolean
  onChange: (v: boolean) => void
}) {
  const isOverride = detected !== effective
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-white px-3 py-2 hover:border-zinc-400">
      <Checkbox checked={effective} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <div className="flex-1">
        <p className="text-xs font-medium text-foreground">
          {label}
          {detected && (
            <Badge variant="gray" className="ml-2 text-[9px]">
              Detected
            </Badge>
          )}
          {isOverride && (
            <Badge variant="yellow" className="ml-2 text-[9px]">
              Override
            </Badge>
          )}
        </p>
        <p className="text-[11px] text-muted-foreground">{detail}</p>
      </div>
    </label>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Section: Test before going live
   ══════════════════════════════════════════════════════════════════════════ */

function SectionTestBeforeLaunch({
  spanishEnabled,
  simulationCount,
  requiredSimulations,
  onOpenSimulation,
}: {
  spanishEnabled: boolean
  simulationCount: number
  requiredSimulations: number
  onOpenSimulation?: () => void
}) {
  const ready = simulationCount >= requiredSimulations

  return (
    <SectionShell
      icon={FlaskConical}
      title="Test before going live"
      description="Run real conversations against this property's full configuration. The activation gate blocks until at least one passes."
    >
      <div className="rounded-lg border border-border bg-zinc-50/40 px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
            )}
          >
            {ready ? <Check className="h-4 w-4" /> : <FlaskConical className="h-4 w-4" />}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-foreground">
              {Math.min(simulationCount, requiredSimulations)} of {requiredSimulations} test conversation
              {requiredSimulations === 1 ? "" : "s"} completed
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {spanishEnabled
                ? "One required in English, one in Spanish — this property has Spanish enabled."
                : "One required in English."}{" "}
              Test conversations use real configuration but never send messages or create real records.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={onOpenSimulation}>
              {ready ? "Run another test" : "Open Simulation tab"}
              <ExternalLink className="ml-1.5 h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Sticky footer
   ══════════════════════════════════════════════════════════════════════════ */

function FooterActionBar({
  dirty,
  onSave,
  onDiscard,
}: {
  dirty: boolean
  onSave: () => void
  onDiscard: () => void
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
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> Unsaved changes — won't take effect until saved.
            </span>
          ) : (
            <span className="text-muted-foreground">No pending changes</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDiscard} disabled={!dirty}>
            Discard
          </Button>
          <Button size="sm" onClick={onSave} disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </div>
    </footer>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Manage Custom Modes — company-level dialog
   ══════════════════════════════════════════════════════════════════════════ */

function ManageCustomModesDialog({
  open,
  onOpenChange,
  modes,
  onModesChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  modes: CustomMode[]
  onModesChange: (m: CustomMode[]) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = editingId ? modes.find((m) => m.id === editingId) ?? null : null

  const handleClone = (m: CustomMode) => {
    const id = `${m.id}-copy-${Date.now()}`
    const clone: CustomMode = {
      ...m,
      id,
      name: `${m.name} (copy)`,
      isSeed: false,
      assignedPropertyCount: 0,
    }
    onModesChange([...modes, clone])
    setEditingId(id)
  }

  const handleCreate = () => {
    const id = `mode-${Date.now()}`
    const created: CustomMode = {
      id,
      name: "New Mode",
      description: "",
      isSeed: false,
      discovery: "standard",
      screening: "standard",
      customization: "default",
      conversionGoal: "schedule_tours",
      assignedPropertyCount: 0,
    }
    onModesChange([...modes, created])
    setEditingId(id)
  }

  const handleDelete = (id: string) => {
    onModesChange(modes.filter((m) => m.id !== id))
    if (editingId === id) setEditingId(null)
  }

  const handleEditField = <K extends keyof CustomMode>(id: string, key: K, value: CustomMode[K]) => {
    onModesChange(modes.map((m) => (m.id === id ? { ...m, [key]: value } : m)))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Custom Modes</DialogTitle>
          <DialogDescription>
            Modes are defined here at the company level and assigned to properties individually. The three default
            modes can be cloned and customized; they cannot be deleted.
          </DialogDescription>
        </DialogHeader>

        {editing ? (
          /* ─────────────── Edit one mode ─────────────── */
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingId(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ← Back to all modes
              </button>
              {editing.isSeed && (
                <Badge variant="gray" className="text-[10px]">
                  <Lock className="mr-1 h-3 w-3" />
                  Default — read-only
                </Badge>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-foreground">Mode name</label>
                <Input
                  value={editing.name}
                  onChange={(e) => handleEditField(editing.id, "name", e.target.value)}
                  disabled={editing.isSeed}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Description</label>
                <Input
                  value={editing.description}
                  onChange={(e) => handleEditField(editing.id, "description", e.target.value)}
                  disabled={editing.isSeed}
                  className="mt-1"
                  placeholder="When should this mode be used?"
                />
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border border-border bg-zinc-50/40 p-3 md:grid-cols-2">
              <DimensionEditor
                label="Discovery"
                helper="How many qualifying questions the agent asks"
                options={DISCOVERY_OPTIONS}
                value={editing.discovery}
                disabled={editing.isSeed}
                onChange={(v) => handleEditField(editing.id, "discovery", v)}
              />
              <DimensionEditor
                label="Screening"
                helper="How aggressively to enforce qualification"
                options={SCREENING_OPTIONS}
                value={editing.screening}
                disabled={editing.isSeed}
                onChange={(v) => handleEditField(editing.id, "screening", v)}
              />
              <DimensionEditor
                label="Tone emphasis"
                helper="Selling-point emphasis layered on top of agent persona"
                options={CUSTOMIZATION_OPTIONS}
                value={editing.customization}
                disabled={editing.isSeed}
                onChange={(v) => handleEditField(editing.id, "customization", v)}
              />
              <DimensionEditor
                label="Conversion goal"
                helper="What the agent optimizes for"
                options={GOAL_OPTIONS}
                value={editing.conversionGoal}
                disabled={editing.isSeed}
                onChange={(v) => handleEditField(editing.id, "conversionGoal", v)}
              />
            </div>

            <div className="text-[11px] text-muted-foreground">
              Assigned to <strong>{editing.assignedPropertyCount}</strong> propert
              {editing.assignedPropertyCount === 1 ? "y" : "ies"}.
              Mode changes take effect on next inbound message at each property.
            </div>

            <DialogFooter>
              {editing.isSeed ? (
                <>
                  <Button variant="ghost" onClick={() => setEditingId(null)}>
                    Close
                  </Button>
                  <Button onClick={() => handleClone(editing)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Clone & customize
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleDelete(editing.id)}
                    disabled={editing.assignedPropertyCount > 0}
                  >
                    Delete mode
                  </Button>
                  <Button onClick={() => setEditingId(null)}>Done</Button>
                </>
              )}
            </DialogFooter>
          </div>
        ) : (
          /* ─────────────── List all modes ─────────────── */
          <div className="space-y-3">
            {modes.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-border bg-white p-3 transition-colors hover:border-zinc-400"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">{m.name}</h4>
                      {m.isSeed && (
                        <Badge variant="gray" className="text-[10px]">
                          Default
                        </Badge>
                      )}
                    </div>
                    {m.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{m.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <ModePillSm label="Discovery" value={labelFor(DISCOVERY_OPTIONS, m.discovery)} />
                      <ModePillSm label="Screening" value={labelFor(SCREENING_OPTIONS, m.screening)} />
                      <ModePillSm label="Tone" value={labelFor(CUSTOMIZATION_OPTIONS, m.customization)} />
                      <ModePillSm label="Goal" value={labelFor(GOAL_OPTIONS, m.conversionGoal)} />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Assigned to <strong>{m.assignedPropertyCount}</strong> propert
                      {m.assignedPropertyCount === 1 ? "y" : "ies"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => setEditingId(m.id)}>
                      <Pencil className="mr-1 h-3 w-3" />
                      {m.isSeed ? "View" : "Edit"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleClone(m)}>
                      Clone
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={handleCreate} className="w-full">
              <Plus className="mr-1.5 h-4 w-4" />
              Create new mode
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DimensionEditor<T extends string>({
  label,
  helper,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string
  helper: string
  options: { value: T; label: string; helper: string }[]
  value: T
  disabled: boolean
  onChange: (v: T) => void
}) {
  return (
    <div>
      <label className="text-xs font-medium text-foreground">{label}</label>
      <p className="text-[10px] text-muted-foreground">{helper}</p>
      <Select value={value} onValueChange={(v) => onChange(v as T)} disabled={disabled}>
        <SelectTrigger className="mt-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
              <span className="ml-2 text-[10px] text-muted-foreground">{o.helper}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function ModePillSm({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px]">
      <span className="font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </span>
  )
}
