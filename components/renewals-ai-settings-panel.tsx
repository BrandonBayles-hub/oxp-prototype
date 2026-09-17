"use client"

import React, { useState } from "react"
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
  CalendarClock,
  CalendarOff,
  Building2,
  ExternalLink,
  Info,
  Plus,
  Trash2,
  Lock,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Clock,
  FileSignature,
  Mail,
  Check,
  DoorOpen,
  ClipboardCheck,
  Users,
  PawPrint,
  Package,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

/* ══════════════════════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════════════════════ */

type OfferFollowUpAnchor = "after_offer_sent" | "before_lease_end"
type LeaseFollowUpAnchor = "after_lease_generated" | "before_lease_end"
type LeaseFollowUpTarget = "all_residents" | "unsigned_only"

interface OfferFollowUpStep {
  id: string
  days: number
  anchor: OfferFollowUpAnchor
}

interface LeaseFollowUpStep {
  id: string
  days: number
  anchor: LeaseFollowUpAnchor
  target: LeaseFollowUpTarget
}

type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"

interface DailyCommunicationHours {
  startHour: string
  endHour: string
}

interface CommunicationWindow {
  sendHour: string
  days: DayOfWeek[]
  dailyHours: Record<DayOfWeek, DailyCommunicationHours>
}

interface BlackoutHoliday {
  key: string
  enabled: boolean
}

interface PropertyHolidayEntry {
  key: string
  enabled: boolean
}

interface CustomBlackoutDate {
  id: string
  date: string
  label: string
}

interface BlackoutDates {
  holidays: BlackoutHoliday[]
  propertyHolidays: PropertyHolidayEntry[]
  customDates: CustomBlackoutDate[]
}

export type NonLeaseEndMoveOutPolicy = "place_on_notice" | "escalate_to_staff"

export type PreAcceptanceConfirmCategory = "occupants" | "pets" | "addons"

export const DEFAULT_PRE_ACCEPTANCE_CATEGORIES: PreAcceptanceConfirmCategory[] = [
  "occupants",
  "pets",
  "addons",
]

export const PRE_ACCEPTANCE_CATEGORY_META: Record<
  PreAcceptanceConfirmCategory,
  { label: string; description: string }
> = {
  occupants: {
    label: "Occupants / leaseholders",
    description: "Confirm who lives on the lease and who is financially responsible.",
  },
  pets: {
    label: "Pets",
    description: "Confirm pets currently listed on the lease.",
  },
  addons: {
    label: "Add-ons",
    description: "Confirm reserved items such as parking, storage, or similar add-ons.",
  },
}

export interface RenewalsAISettingsState {
  communicationWindow: CommunicationWindow
  blackoutDates: BlackoutDates
  offerSteps: OfferFollowUpStep[]
  leaseSteps: LeaseFollowUpStep[]
  /** When enabled, Renewal AI may submit place on notice after collecting move-out intent, date, and reason. Off by default. */
  autoPlaceOnNoticeEnabled: boolean
  /**
   * When the resident's move-out date is not the lease end date (earlier or later),
   * either still place on notice or escalate to site staff only.
   */
  nonLeaseEndMoveOutPolicy: NonLeaseEndMoveOutPolicy
  /**
   * When enabled, after the resident chooses a renewal term the agent confirms
   * selected lease details before acceptance. Off by default. Skipped on move-out.
   */
  preAcceptanceConfirmationEnabled: boolean
  /** Which lease-detail groups to confirm. Ignored when the master setting is off. */
  preAcceptanceConfirmCategories: PreAcceptanceConfirmCategory[]
}

interface PropertyMoveOutReason {
  id: string
  label: string
}

/** Prototype mock — production reads the property's configured move-out reason list from Entrata. */
const PROPERTY_MOVE_OUT_REASONS: Record<string, PropertyMoveOutReason[]> = {
  "14th-north-pkwy": [
    { id: "101", label: "Job transfer" },
    { id: "102", label: "Buying a home" },
    { id: "103", label: "Rent increase" },
    { id: "104", label: "Dissatisfied with community" },
    { id: "105", label: "Other" },
  ],
  "aspen-heights": [
    { id: "201", label: "Relocating for work" },
    { id: "202", label: "Relocating — personal" },
    { id: "203", label: "Financial / affordability" },
    { id: "204", label: "Roommate change" },
    { id: "205", label: "Prefer not to say" },
  ],
  "summit-view": [
    { id: "301", label: "Graduation / school change" },
    { id: "302", label: "Employment relocation" },
    { id: "303", label: "Home purchase" },
    { id: "304", label: "Maintenance concerns" },
  ],
}

const DEFAULT_MOVE_OUT_REASONS: PropertyMoveOutReason[] = [
  { id: "1", label: "Relocation" },
  { id: "2", label: "Financial" },
  { id: "3", label: "Dissatisfied with property" },
  { id: "4", label: "Other" },
]

export function getPropertyMoveOutReasons(propertyId: string): PropertyMoveOutReason[] {
  return PROPERTY_MOVE_OUT_REASONS[propertyId] ?? DEFAULT_MOVE_OUT_REASONS
}

/* ══════════════════════════════════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════════════════════════════════ */

const OFFER_ANCHOR_LABELS: Record<OfferFollowUpAnchor, string> = {
  after_offer_sent: "after renewal offer sent",
  before_lease_end: "before lease end date",
}

const LEASE_ANCHOR_LABELS: Record<LeaseFollowUpAnchor, string> = {
  after_lease_generated: "after renewal lease generated",
  before_lease_end: "before lease end date",
}

const LEASE_TARGET_LABELS: Record<LeaseFollowUpTarget, string> = {
  all_residents: "All residents on lease",
  unsigned_only: "Only residents who haven't signed",
}

const DAY_LABELS: { id: DayOfWeek; short: string; label: string }[] = [
  { id: "mon", short: "M", label: "Monday" },
  { id: "tue", short: "T", label: "Tuesday" },
  { id: "wed", short: "W", label: "Wednesday" },
  { id: "thu", short: "T", label: "Thursday" },
  { id: "fri", short: "F", label: "Friday" },
  { id: "sat", short: "S", label: "Saturday" },
  { id: "sun", short: "S", label: "Sunday" },
]

type HolidayRule =
  | { type: "fixed"; month: number; day: number }
  | { type: "nthWeekday"; month: number; weekday: number; n: number }
  | { type: "lastWeekday"; month: number; weekday: number }

interface HolidayDef {
  key: string
  name: string
  rule: HolidayRule
}

const BANK_HOLIDAYS: HolidayDef[] = [
  { key: "new_years", name: "New Year's Day", rule: { type: "fixed", month: 0, day: 1 } },
  { key: "mlk", name: "Martin Luther King Jr. Day", rule: { type: "nthWeekday", month: 0, weekday: 1, n: 3 } },
  { key: "presidents", name: "Presidents' Day", rule: { type: "nthWeekday", month: 1, weekday: 1, n: 3 } },
  { key: "memorial", name: "Memorial Day", rule: { type: "lastWeekday", month: 4, weekday: 1 } },
  { key: "juneteenth", name: "Juneteenth", rule: { type: "fixed", month: 5, day: 19 } },
  { key: "independence", name: "Independence Day", rule: { type: "fixed", month: 6, day: 4 } },
  { key: "labor", name: "Labor Day", rule: { type: "nthWeekday", month: 8, weekday: 1, n: 1 } },
  { key: "columbus", name: "Columbus Day", rule: { type: "nthWeekday", month: 9, weekday: 1, n: 2 } },
  { key: "veterans", name: "Veterans Day", rule: { type: "fixed", month: 10, day: 11 } },
  { key: "thanksgiving", name: "Thanksgiving Day", rule: { type: "nthWeekday", month: 10, weekday: 4, n: 4 } },
  { key: "christmas", name: "Christmas Day", rule: { type: "fixed", month: 11, day: 25 } },
]

function computeHolidayDate(rule: HolidayRule, year: number): Date {
  if (rule.type === "fixed") {
    return new Date(year, rule.month, rule.day)
  }
  if (rule.type === "nthWeekday") {
    const first = new Date(year, rule.month, 1)
    const firstWeekday = first.getDay()
    let day = 1 + ((rule.weekday - firstWeekday + 7) % 7)
    day += (rule.n - 1) * 7
    return new Date(year, rule.month, day)
  }
  const lastDay = new Date(year, rule.month + 1, 0)
  let d = lastDay.getDate()
  while (new Date(year, rule.month, d).getDay() !== rule.weekday) d--
  return new Date(year, rule.month, d)
}

function formatHolidayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getHolidaysForYear(year: number): { key: string; name: string; date: Date; formatted: string }[] {
  return BANK_HOLIDAYS.map((h) => {
    const date = computeHolidayDate(h.rule, year)
    return { key: h.key, name: h.name, date, formatted: formatHolidayDate(date) }
  })
}

const DEFAULT_BLACKOUT_HOLIDAYS: BlackoutHoliday[] = BANK_HOLIDAYS.map((h) => ({
  key: h.key,
  enabled: ["new_years", "memorial", "independence", "labor", "thanksgiving", "christmas"].includes(h.key),
}))

interface PropertyHolidayDef {
  key: string
  name: string
  date: string
  matchesBankHolidayKey?: string
}

const SAMPLE_PROPERTY_HOLIDAYS: Record<string, PropertyHolidayDef[]> = {
  "14th-north-pkwy": [
    { key: "ph-nye", name: "New Year's Eve (Office Closed)", date: "2026-12-31" },
    { key: "ph-xmas", name: "Christmas Day (Office Closed)", date: "2026-12-25", matchesBankHolidayKey: "christmas" },
    { key: "ph-xmas-eve", name: "Christmas Eve (Half Day)", date: "2026-12-24" },
    { key: "ph-thanksgiving", name: "Thanksgiving Break", date: "2026-11-26", matchesBankHolidayKey: "thanksgiving" },
    { key: "ph-day-after-thanksgiving", name: "Day After Thanksgiving", date: "2026-11-27" },
    { key: "ph-july4", name: "Independence Day", date: "2026-07-04", matchesBankHolidayKey: "independence" },
    { key: "ph-memorial", name: "Memorial Day", date: "2026-05-25", matchesBankHolidayKey: "memorial" },
    { key: "ph-labor", name: "Labor Day", date: "2026-09-07", matchesBankHolidayKey: "labor" },
    { key: "ph-annual-training", name: "Annual Staff Training", date: "2026-08-14" },
  ],
  "aspen-heights": [
    { key: "ph-xmas", name: "Christmas Day", date: "2026-12-25", matchesBankHolidayKey: "christmas" },
    { key: "ph-new-years", name: "New Year's Day", date: "2026-01-01", matchesBankHolidayKey: "new_years" },
    { key: "ph-thanksgiving", name: "Thanksgiving", date: "2026-11-26", matchesBankHolidayKey: "thanksgiving" },
    { key: "ph-spring-break", name: "Spring Break (Office Closed)", date: "2026-03-16" },
    { key: "ph-spring-break-2", name: "Spring Break (Office Closed)", date: "2026-03-17" },
    { key: "ph-spring-break-3", name: "Spring Break (Office Closed)", date: "2026-03-18" },
  ],
  "summit-view": [
    { key: "ph-xmas", name: "Christmas Break Start", date: "2026-12-23", matchesBankHolidayKey: "christmas" },
    { key: "ph-new-years", name: "New Year's Day", date: "2026-01-01", matchesBankHolidayKey: "new_years" },
    { key: "ph-move-in-week", name: "Move-In Week (No Outbound)", date: "2026-08-17" },
    { key: "ph-move-in-week-2", name: "Move-In Week (No Outbound)", date: "2026-08-18" },
    { key: "ph-move-in-week-3", name: "Move-In Week (No Outbound)", date: "2026-08-19" },
    { key: "ph-move-in-week-4", name: "Move-In Week (No Outbound)", date: "2026-08-20" },
    { key: "ph-move-in-week-5", name: "Move-In Week (No Outbound)", date: "2026-08-21" },
  ],
}

const DEFAULT_PROPERTY_HOLIDAYS_FOR = (propertyId: string): PropertyHolidayEntry[] => {
  const defs = SAMPLE_PROPERTY_HOLIDAYS[propertyId] ?? []
  return defs.map((d) => ({ key: d.key, enabled: true }))
}

function getPropertyHolidayDefs(propertyId: string): PropertyHolidayDef[] {
  return SAMPLE_PROPERTY_HOLIDAYS[propertyId] ?? []
}

function formatDateString(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function makeBlackoutId(): string {
  return `bd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function makeOfferId(): string {
  return `os-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function makeLeaseId(): string {
  return `ls-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

const DEFAULT_OFFER_STEPS: OfferFollowUpStep[] = [
  { id: "os-1", days: 3, anchor: "after_offer_sent" },
  { id: "os-2", days: 7, anchor: "after_offer_sent" },
  { id: "os-3", days: 14, anchor: "after_offer_sent" },
  { id: "os-4", days: 60, anchor: "before_lease_end" },
  { id: "os-5", days: 30, anchor: "before_lease_end" },
]

const DEFAULT_LEASE_STEPS: LeaseFollowUpStep[] = [
  { id: "ls-1", days: 2, anchor: "after_lease_generated", target: "unsigned_only" },
  { id: "ls-2", days: 5, anchor: "after_lease_generated", target: "unsigned_only" },
  { id: "ls-3", days: 14, anchor: "before_lease_end", target: "unsigned_only" },
  { id: "ls-4", days: 7, anchor: "before_lease_end", target: "all_residents" },
]

export function normalizeRenewalsAISettings(
  settings: RenewalsAISettingsState,
  propertyId = ""
): RenewalsAISettingsState {
  const defaults = makeDefaultRenewalsAISettings(propertyId)
  return {
    ...defaults,
    ...settings,
    preAcceptanceConfirmationEnabled: settings.preAcceptanceConfirmationEnabled ?? false,
    preAcceptanceConfirmCategories:
      settings.preAcceptanceConfirmCategories?.length
        ? [...settings.preAcceptanceConfirmCategories]
        : [...DEFAULT_PRE_ACCEPTANCE_CATEGORIES],
  }
}

/** Prototype seed: Aspen Heights has place-on-notice enabled for Clone Settings demos. */
export function buildRenewalsAISettingsSeedForPrototype(): Record<
  string,
  RenewalsAISettingsState
> {
  const aspen = makeDefaultRenewalsAISettings("aspen-heights")
  return {
    "aspen-heights": {
      ...aspen,
      autoPlaceOnNoticeEnabled: true,
      nonLeaseEndMoveOutPolicy: "place_on_notice",
    },
  }
}

export function makeDefaultRenewalsAISettings(
  propertyId: string
): RenewalsAISettingsState {
  return {
    communicationWindow: {
      sendHour: "09:00",
      days: ["mon", "tue", "wed", "thu", "fri", "sat"],
      dailyHours: {
        mon: { startHour: "09:00", endHour: "20:00" },
        tue: { startHour: "09:00", endHour: "20:00" },
        wed: { startHour: "09:00", endHour: "20:00" },
        thu: { startHour: "09:00", endHour: "20:00" },
        fri: { startHour: "09:00", endHour: "20:00" },
        sat: { startHour: "09:00", endHour: "20:00" },
        sun: { startHour: "09:00", endHour: "20:00" },
      },
    },
    blackoutDates: {
      holidays: DEFAULT_BLACKOUT_HOLIDAYS,
      propertyHolidays: DEFAULT_PROPERTY_HOLIDAYS_FOR(propertyId),
      customDates: [],
    },
    offerSteps: DEFAULT_OFFER_STEPS,
    leaseSteps: DEFAULT_LEASE_STEPS,
    autoPlaceOnNoticeEnabled: false,
    nonLeaseEndMoveOutPolicy: "escalate_to_staff",
    preAcceptanceConfirmationEnabled: false,
    preAcceptanceConfirmCategories: [...DEFAULT_PRE_ACCEPTANCE_CATEGORIES],
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   Public component
   ══════════════════════════════════════════════════════════════════════════ */

interface Props {
  propertyName: string
  propertyId?: string
  agentDisplayLabel?: string
  initialState?: RenewalsAISettingsState
  onSave?: (state: RenewalsAISettingsState) => void
}

export function RenewalsAISettingsPanel({
  propertyName,
  propertyId = "",
  agentDisplayLabel = "Renewal AI",
  initialState,
  onSave,
}: Props) {
  const [state, setState] = useState<RenewalsAISettingsState>(
    () =>
      normalizeRenewalsAISettings(
        initialState ?? makeDefaultRenewalsAISettings(propertyId),
        propertyId
      )
  )
  const [pristine, setPristine] = useState<RenewalsAISettingsState>(
    () =>
      normalizeRenewalsAISettings(
        initialState ?? makeDefaultRenewalsAISettings(propertyId),
        propertyId
      )
  )

  const dirty = JSON.stringify(state) !== JSON.stringify(pristine)

  const handleSave = () => {
    setPristine(state)
    onSave?.(state)
  }
  const handleDiscard = () => setState(pristine)

  return (
    <div className="flex h-full flex-col relative">
      <header className="border-b border-border bg-white px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {agentDisplayLabel} Settings
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure how {agentDisplayLabel} communicates and follows up on
              renewal offers at <strong>{propertyName}</strong>.
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
          {/* ── Section 1: Communication Windows ── */}
          <GroupHeading label="Communication" />
          <CommunicationWindowSection
            window={state.communicationWindow}
            onChange={(w) =>
              setState((s) => ({ ...s, communicationWindow: w }))
            }
            agentDisplayLabel={agentDisplayLabel}
          />

          {/* ── Section 2: Blackout Dates ── */}
          <BlackoutDatesSection
            blackout={state.blackoutDates}
            onChange={(b) =>
              setState((s) => ({ ...s, blackoutDates: b }))
            }
            propertyId={propertyId}
            propertyName={propertyName}
            agentDisplayLabel={agentDisplayLabel}
          />

          {/* ── Section 3: Renewal Offer Follow-Ups ── */}
          <GroupHeading label="Renewal Offer Follow-Ups" />
          <SectionShell
            icon={Mail}
            title="Renewal Offer Follow-Ups"
            description="Follow up with residents who have received a renewal offer but have not yet decided whether to renew. The goal is to learn their intent as early as possible — if they plan to renew, help them choose a lease term; if not, know early so the unit can be re-leased."
          >
            <OfferFollowUpList
              steps={state.offerSteps}
              onChange={(steps) =>
                setState((s) => ({ ...s, offerSteps: steps }))
              }
            />
          </SectionShell>

          {/* ── Section 4: Renewal Lease Follow-Ups ── */}
          <GroupHeading label="Renewal Lease Follow-Ups" />
          <SectionShell
            icon={FileSignature}
            title="Renewal Lease Follow-Ups"
            description="Follow up with residents who have accepted their renewal offer but have not yet signed the renewal lease agreement. The goal is to nudge all responsible parties to complete their signatures before the lease end date."
          >
            <LeaseFollowUpList
              steps={state.leaseSteps}
              onChange={(steps) =>
                setState((s) => ({ ...s, leaseSteps: steps }))
              }
            />
          </SectionShell>

          {/* ── Section 5: Move-out & notice ── */}
          <GroupHeading label="Place on notice" />
          <AutoPlaceOnNoticeSection
            propertyId={propertyId}
            enabled={state.autoPlaceOnNoticeEnabled}
            nonLeaseEndPolicy={state.nonLeaseEndMoveOutPolicy}
            onEnabledChange={(autoPlaceOnNoticeEnabled) =>
              setState((s) => ({ ...s, autoPlaceOnNoticeEnabled }))
            }
            onNonLeaseEndPolicyChange={(nonLeaseEndMoveOutPolicy) =>
              setState((s) => ({ ...s, nonLeaseEndMoveOutPolicy }))
            }
            agentDisplayLabel={agentDisplayLabel}
          />

          {/* ── Section 6: Pre-acceptance confirmation ── */}
          <GroupHeading label="Pre-acceptance confirmation" />
          <PreAcceptanceConfirmationSection
            enabled={state.preAcceptanceConfirmationEnabled}
            categories={state.preAcceptanceConfirmCategories}
            onEnabledChange={(preAcceptanceConfirmationEnabled) =>
              setState((s) => ({
                ...s,
                preAcceptanceConfirmationEnabled,
                preAcceptanceConfirmCategories:
                  preAcceptanceConfirmationEnabled &&
                  s.preAcceptanceConfirmCategories.length === 0
                    ? [...DEFAULT_PRE_ACCEPTANCE_CATEGORIES]
                    : s.preAcceptanceConfirmCategories,
              }))
            }
            onCategoriesChange={(preAcceptanceConfirmCategories) =>
              setState((s) => ({ ...s, preAcceptanceConfirmCategories }))
            }
            agentDisplayLabel={agentDisplayLabel}
          />
        </div>
      </div>

      <FooterActionBar
        dirty={dirty}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Place on notice
   ══════════════════════════════════════════════════════════════════════════ */

const MOVE_OUT_REASONS_SETUP_URL =
  "https://DOMAIN.entrata.com/?module=properties_setupxxx&load_large_dialog=%3Fmodule%3Dproperty_move_out_reasonsxxx%26property%5Bid%5D%3DPROPERTYID%26"

function AutoPlaceOnNoticeSection({
  propertyId,
  enabled,
  nonLeaseEndPolicy,
  onEnabledChange,
  onNonLeaseEndPolicyChange,
  agentDisplayLabel,
}: {
  propertyId: string
  enabled: boolean
  nonLeaseEndPolicy: NonLeaseEndMoveOutPolicy
  onEnabledChange: (enabled: boolean) => void
  onNonLeaseEndPolicyChange: (policy: NonLeaseEndMoveOutPolicy) => void
  agentDisplayLabel: string
}) {
  const moveOutReasons = getPropertyMoveOutReasons(propertyId)

  return (
    <SectionShell
      icon={DoorOpen}
      title="Place on notice"
      description={`Control whether ${agentDisplayLabel} can record a resident on notice when they decide not to renew, or whether your site team handles that step.`}
    >
      <div className="space-y-6">
        <div
          className={cn(
            "flex items-start justify-between gap-4 rounded-lg border px-4 py-4 transition-colors",
            enabled
              ? "border-emerald-200 bg-emerald-50/40"
              : "border-border bg-zinc-50/50"
          )}
        >
          <div className="space-y-1.5 min-w-0">
            <Label
              htmlFor="auto-place-on-notice"
              className="text-sm font-semibold text-foreground cursor-pointer"
            >
              Allow {agentDisplayLabel} to place residents on notice
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When this is off, the agent still learns that the resident is moving
              out and creates an escalation so your team can place them on notice.
              When this is on, the agent can place the resident on notice after
              confirming their move-out date and reason, which cancels their open
              renewal offer.
            </p>
          </div>
          <Switch
            id="auto-place-on-notice"
            checked={enabled}
            onCheckedChange={onEnabledChange}
            aria-label="Allow agent to place residents on notice"
          />
        </div>

        {enabled && (
          <div className="space-y-3 rounded-lg border border-border bg-white px-4 py-4">
            <div>
              <p className="text-xs font-semibold text-foreground">
                Move-out date is not the lease end date
              </p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                If the resident wants to move out before or after their lease end
                date, choose whether the agent should still place them on notice or
                escalate to your team to decide next steps (including whether the
                lease end date should change).
              </p>
            </div>
            <Select
              value={nonLeaseEndPolicy}
              onValueChange={(v) =>
                onNonLeaseEndPolicyChange(v as NonLeaseEndMoveOutPolicy)
              }
            >
              <SelectTrigger className="h-9 text-xs" aria-label="Policy when move-out date differs from lease end">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="place_on_notice" className="text-xs">
                  Place on notice, and escalate for staff review of the date
                </SelectItem>
                <SelectItem value="escalate_to_staff" className="text-xs">
                  Escalate to site team — do not place on notice automatically
                </SelectItem>
              </SelectContent>
            </Select>
            {nonLeaseEndPolicy === "place_on_notice" && (
              <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" aria-hidden />
                Staff receive a Nexus escalation so they can confirm whether any
                further action is needed for the requested move-out date.
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">
            Move-out reasons for this property
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            During conversations, the agent asks why the resident is not renewing
            and maps their answer to the closest reason below. An exact match is
            not required.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {moveOutReasons.map((r) => (
              <Badge key={r.id} variant="outline" className="text-[10px] font-normal">
                {r.label}
              </Badge>
            ))}
          </div>
          <a
            href={MOVE_OUT_REASONS_SETUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Manage move-out reasons in Entrata
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Pre-acceptance confirmation
   ══════════════════════════════════════════════════════════════════════════ */

const CATEGORY_ICONS: Record<
  PreAcceptanceConfirmCategory,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  occupants: Users,
  pets: PawPrint,
  addons: Package,
}

function PreAcceptanceConfirmationSection({
  enabled,
  categories,
  onEnabledChange,
  onCategoriesChange,
  agentDisplayLabel,
}: {
  enabled: boolean
  categories: PreAcceptanceConfirmCategory[]
  onEnabledChange: (enabled: boolean) => void
  onCategoriesChange: (categories: PreAcceptanceConfirmCategory[]) => void
  agentDisplayLabel: string
}) {
  const toggleCategory = (id: PreAcceptanceConfirmCategory, checked: boolean) => {
    if (checked) {
      onCategoriesChange([...new Set([...categories, id])])
      return
    }
    if (enabled && categories.length === 1 && categories[0] === id) {
      return
    }
    onCategoriesChange(categories.filter((item) => item !== id))
  }

  return (
    <SectionShell
      icon={ClipboardCheck}
      title="Confirm lease details before acceptance"
      description={`When a resident chooses a renewal term, ${agentDisplayLabel} can confirm selected lease details before they accept. This step is skipped when the resident is moving out.`}
    >
      <div className="space-y-6" data-testid="pre-acceptance-confirmation">
        <div
          className={cn(
            "flex items-start justify-between gap-4 rounded-lg border px-4 py-4 transition-colors",
            enabled
              ? "border-emerald-200 bg-emerald-50/40"
              : "border-border bg-zinc-50/50"
          )}
        >
          <div className="space-y-1.5 min-w-0">
            <Label
              htmlFor="pre-acceptance-confirmation"
              className="text-sm font-semibold text-foreground cursor-pointer"
            >
              Confirm lease details before the resident accepts a renewal
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When this is off, the resident can accept a chosen term without
              reviewing occupants, pets, or add-ons. When this is on, the agent
              confirms only the categories you select below. If the resident
              needs a change, the conversation escalates to Nexus so a teammate
              can update the lease.
            </p>
          </div>
          <Switch
            id="pre-acceptance-confirmation"
            checked={enabled}
            onCheckedChange={onEnabledChange}
            aria-label="Confirm lease details before the resident accepts a renewal"
          />
        </div>

        {enabled && (
          <div className="space-y-3 rounded-lg border border-border bg-white px-4 py-4">
            <div>
              <p className="text-xs font-semibold text-foreground">
                Details to confirm
              </p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Choose what the agent should read back after the resident picks
                a term. At least one category is required.
              </p>
            </div>
            <div className="space-y-2">
              {(
                Object.keys(PRE_ACCEPTANCE_CATEGORY_META) as PreAcceptanceConfirmCategory[]
              ).map((id) => {
                const meta = PRE_ACCEPTANCE_CATEGORY_META[id]
                const Icon = CATEGORY_ICONS[id]
                const checked = categories.includes(id)
                const lastSelected = enabled && checked && categories.length === 1
                return (
                  <label
                    key={id}
                    htmlFor={`pre-accept-${id}`}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border px-3 py-3 cursor-pointer transition-colors",
                      checked
                        ? "border-zinc-900 bg-zinc-50"
                        : "border-border bg-white hover:border-zinc-400"
                    )}
                  >
                    <Checkbox
                      id={`pre-accept-${id}`}
                      checked={checked}
                      disabled={lastSelected}
                      onCheckedChange={(value) =>
                        toggleCategory(id, value === true)
                      }
                      aria-label={meta.label}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-zinc-600" aria-hidden />
                        <p className="text-xs font-semibold text-foreground">
                          {meta.label}
                        </p>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                        {meta.description}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" aria-hidden />
              The agent does not change these details in this release. Any
              requested update creates a Nexus escalation for staff.
            </p>
          </div>
        )}
      </div>
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Communication Windows
   ══════════════════════════════════════════════════════════════════════════ */

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i
  const label =
    hour === 0
      ? "12:00 AM"
      : hour === 12
        ? "12:00 PM"
        : hour > 12
          ? `${hour - 12}:00 PM`
          : `${hour}:00 AM`
  const value = `${hour.toString().padStart(2, "0")}:00`
  return { label, value }
})

function CommunicationWindowSection({
  window: win,
  onChange,
  agentDisplayLabel,
}: {
  window: CommunicationWindow
  onChange: (w: CommunicationWindow) => void
  agentDisplayLabel: string
}) {
  const patch = (p: Partial<CommunicationWindow>) => onChange({ ...win, ...p })

  const toggleDay = (day: DayOfWeek) => {
    const next = win.days.includes(day)
      ? win.days.filter((d) => d !== day)
      : [...win.days, day]
    patch({ days: next })
  }

  const updateDailyHours = (
    day: DayOfWeek,
    hoursPatch: Partial<DailyCommunicationHours>
  ) => {
    const current = win.dailyHours[day]
    const next = { ...current, ...hoursPatch }

    if (next.startHour >= next.endHour) {
      const startIndex = HOUR_OPTIONS.findIndex(
        (option) => option.value === next.startHour
      )
      next.endHour = HOUR_OPTIONS[startIndex + 1].value
    }

    patch({
      dailyHours: {
        ...win.dailyHours,
        [day]: next,
      },
    })
  }

  return (
    <SectionShell
      icon={Clock}
      title="Communication Windows"
      description={`Control when ${agentDisplayLabel} may initiate proactive outbound messages at this property. Event-triggered messages send immediately inside the selected day's hours; messages triggered outside those hours wait until the next allowed window opens. Resident-initiated conversations are not restricted.`}
    >
      <div className="space-y-6">
        {/* Send hour */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">
            Follow-up send time
          </p>
          <p className="text-[11px] text-muted-foreground">
            Choose the preferred time for scheduled follow-ups. If that time
            falls outside an allowed day&apos;s hours, the message waits until
            that day&apos;s window opens.
          </p>
          <div className="flex items-center gap-3">
            <Select
              value={win.sendHour}
              onValueChange={(v) => patch({ sendHour: v })}
            >
              <SelectTrigger className="h-9 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOUR_OPTIONS.map((h) => (
                  <SelectItem key={h.value} value={h.value} className="text-xs">
                    {h.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Allowed days and event-triggered message hours */}
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-foreground">
                Allowed days and hours
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Set the daily window for proactive, event-triggered messages,
                including new renewal offer notifications.
              </p>
            </div>
            <Badge variant="gray" className="shrink-0 text-[10px]">
              Property timezone
            </Badge>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            {DAY_LABELS.map((d) => {
              const active = win.days.includes(d.id)
              const hours = win.dailyHours[d.id]
              const validEndHours = HOUR_OPTIONS.filter(
                (option) => option.value > hours.startHour
              )

              return (
                <div
                  key={d.id}
                  className={cn(
                    "flex min-h-14 items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0",
                    active ? "bg-white" : "bg-zinc-50/70"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleDay(d.id)}
                    className="flex w-32 shrink-0 items-center gap-2 text-left"
                    aria-pressed={active}
                    aria-label={`${active ? "Disable" : "Enable"} ${d.label}`}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border transition-colors",
                        active
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-300 bg-white text-transparent"
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        active ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {d.label}
                    </span>
                  </button>

                  <div className="flex flex-1 items-center gap-2">
                    <Select
                      value={hours.startHour}
                      onValueChange={(value) =>
                        updateDailyHours(d.id, { startHour: value })
                      }
                      disabled={!active}
                    >
                      <SelectTrigger
                        className="h-8 w-32 text-xs"
                        aria-label={`${d.label} start time`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOUR_OPTIONS.slice(0, -1).map((hour) => (
                          <SelectItem
                            key={hour.value}
                            value={hour.value}
                            className="text-xs"
                          >
                            {hour.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <span className="text-[11px] text-muted-foreground">to</span>

                    <Select
                      value={hours.endHour}
                      onValueChange={(value) =>
                        updateDailyHours(d.id, { endHour: value })
                      }
                      disabled={!active}
                    >
                      <SelectTrigger
                        className="h-8 w-32 text-xs"
                        aria-label={`${d.label} end time`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {validEndHours.map((hour) => (
                          <SelectItem
                            key={hour.value}
                            value={hour.value}
                            className="text-xs"
                          >
                            {hour.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {!active && (
                    <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                      No proactive messages
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-[10px] text-muted-foreground">
            Events outside these hours are queued for the next allowed
            communication window. Blackout dates below take precedence over
            this weekly schedule.
          </p>
        </div>
      </div>
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Blackout Dates
   ══════════════════════════════════════════════════════════════════════════ */

type FlatHolidayRow = {
  id: string
  sortDate: number
  name: string
  dateFormatted: string
  nextYearFormatted?: string
  enabled: boolean
  source: "federal" | "property" | "both"
  bankKey?: string
  propKey?: string
}

function buildFlatHolidays(
  bankHolidays: BlackoutHoliday[],
  propertyHolidays: PropertyHolidayEntry[],
  holidaysCurrent: { key: string; name: string; date: Date; formatted: string }[],
  holidaysNext: { key: string; name: string; date: Date; formatted: string }[],
  propertyHolidayDefs: PropertyHolidayDef[]
): FlatHolidayRow[] {
  const rows: FlatHolidayRow[] = []
  const propKeysMerged = new Set<string>()

  for (const bh of bankHolidays) {
    const cur = holidaysCurrent.find((h) => h.key === bh.key)!
    const nxt = holidaysNext.find((h) => h.key === bh.key)!
    const matchingProp = propertyHolidayDefs.find(
      (pd) => pd.matchesBankHolidayKey === bh.key
    )
    if (matchingProp) propKeysMerged.add(matchingProp.key)

    rows.push({
      id: `bank-${bh.key}`,
      sortDate: cur.date.getTime(),
      name: cur.name,
      dateFormatted: cur.formatted,
      nextYearFormatted: nxt.formatted,
      enabled: bh.enabled,
      source: matchingProp ? "both" : "federal",
      bankKey: bh.key,
      propKey: matchingProp?.key,
    })
  }

  for (const pd of propertyHolidayDefs) {
    if (propKeysMerged.has(pd.key)) continue
    const phState = propertyHolidays.find((ph) => ph.key === pd.key)
    const [y, m, d] = pd.date.split("-").map(Number)
    rows.push({
      id: `prop-${pd.key}`,
      sortDate: new Date(y, m - 1, d).getTime(),
      name: pd.name,
      dateFormatted: formatDateString(pd.date),
      enabled: phState?.enabled ?? false,
      source: "property",
      propKey: pd.key,
    })
  }

  rows.sort((a, b) => a.sortDate - b.sortDate)
  return rows
}

function BlackoutDatesSection({
  blackout,
  onChange,
  propertyId,
  propertyName,
  agentDisplayLabel,
}: {
  blackout: BlackoutDates
  onChange: (b: BlackoutDates) => void
  propertyId: string
  propertyName: string
  agentDisplayLabel: string
}) {
  const currentYear = new Date().getFullYear()
  const nextYear = currentYear + 1
  const holidaysCurrent = getHolidaysForYear(currentYear)
  const holidaysNext = getHolidaysForYear(nextYear)
  const propertyHolidayDefs = getPropertyHolidayDefs(propertyId)
  const hasPropertyHolidays = propertyHolidayDefs.length > 0

  const flatRows = buildFlatHolidays(
    blackout.holidays,
    blackout.propertyHolidays,
    holidaysCurrent,
    holidaysNext,
    propertyHolidayDefs
  )

  const toggleRow = (row: FlatHolidayRow) => {
    const next = { ...blackout }
    if (row.bankKey) {
      next.holidays = blackout.holidays.map((h) =>
        h.key === row.bankKey ? { ...h, enabled: !row.enabled } : h
      )
    }
    if (row.propKey) {
      next.propertyHolidays = blackout.propertyHolidays.map((h) =>
        h.key === row.propKey ? { ...h, enabled: !row.enabled } : h
      )
    }
    onChange(next)
  }

  const enabledCount =
    flatRows.filter((r) => r.enabled).length +
    blackout.customDates.length

  const addCustomDate = () => {
    onChange({
      ...blackout,
      customDates: [
        ...blackout.customDates,
        { id: makeBlackoutId(), date: "", label: "" },
      ],
    })
  }

  const removeCustomDate = (id: string) => {
    onChange({
      ...blackout,
      customDates: blackout.customDates.filter((d) => d.id !== id),
    })
  }

  const updateCustomDate = (
    id: string,
    patch: Partial<CustomBlackoutDate>
  ) => {
    onChange({
      ...blackout,
      customDates: blackout.customDates.map((d) =>
        d.id === id ? { ...d, ...patch } : d
      ),
    })
  }

  const enableAll = () => {
    onChange({
      ...blackout,
      holidays: blackout.holidays.map((h) => ({ ...h, enabled: true })),
      propertyHolidays: blackout.propertyHolidays.map((h) => ({
        ...h,
        enabled: true,
      })),
    })
  }

  const disableAll = () => {
    onChange({
      ...blackout,
      holidays: blackout.holidays.map((h) => ({ ...h, enabled: false })),
      propertyHolidays: blackout.propertyHolidays.map((h) => ({
        ...h,
        enabled: false,
      })),
    })
  }

  const allEnabled = flatRows.every((r) => r.enabled)
  const noneEnabled = flatRows.every((r) => !r.enabled)

  const hoursSettingsUrl =
    "https://DOMAIN.entrata.com/?module=properties_setupxxx&load_large_dialog=%3Fmodule%3Dproperty_details_general_hoursxxx%26property%5Bid%5D%3DPROPERTYID%26"

  return (
    <>
      <GroupHeading label="Blackout Dates" />
      <SectionShell
        icon={CalendarOff}
        title="Blackout Dates"
        description={`Define dates when ${agentDisplayLabel} should not send proactive outbound messages — such as holidays or periods when the office is unavailable for escalations. The agent will still respond to residents who message on these days.`}
        headerAction={
          <Badge variant="gray" className="text-[10px]">
            {enabledCount} date{enabledCount !== 1 ? "s" : ""}
          </Badge>
        }
      >
        <div className="space-y-6">
          {/* Holidays */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Holidays
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Select the holidays on which {agentDisplayLabel} should
                  not send proactive messages.
                  {hasPropertyHolidays && (
                    <>
                      {" "}Includes holidays from{" "}
                      <a
                        href={hoursSettingsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-foreground transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Property Hours &amp; Holidays
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                      .
                    </>
                  )}
                </p>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={enableAll}
                  disabled={allEnabled}
                  className="text-[10px] font-medium text-zinc-500 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Select all
                </button>
                <span className="text-zinc-300 text-[10px]">·</span>
                <button
                  type="button"
                  onClick={disableAll}
                  disabled={noneEnabled}
                  className="text-[10px] font-medium text-zinc-500 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Clear all
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border divide-y divide-border">
              {flatRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => toggleRow(row)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
                >
                  <div
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all",
                      row.enabled
                        ? "bg-zinc-900 border-zinc-900 text-white"
                        : "border-zinc-300 bg-white"
                    )}
                  >
                    {row.enabled && <Check className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-medium text-foreground">
                        {row.name}
                      </p>
                      {(row.source === "federal" || row.source === "both") && (
                        <Badge
                          variant="outline"
                          className="text-[9px] py-0 h-4 border-zinc-200 text-zinc-500"
                        >
                          Federal
                        </Badge>
                      )}
                      {(row.source === "property" || row.source === "both") && (
                        <Badge
                          variant="outline"
                          className="text-[9px] py-0 h-4 border-blue-200 text-blue-600"
                        >
                          <Building2 className="mr-0.5 h-2.5 w-2.5" />
                          Property
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] text-muted-foreground">
                      {row.dateFormatted}
                    </p>
                    {row.nextYearFormatted && (
                      <p className="text-[10px] text-zinc-400">
                        {row.nextYearFormatted}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {hasPropertyHolidays && (
              <p className="text-[10px] text-muted-foreground italic">
                <Building2 className="inline h-2.5 w-2.5 mr-0.5 -mt-px" />
                Property holidays are managed in{" "}
                <a
                  href={hoursSettingsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  Setup &gt; Property &gt; Hours &amp; Holidays
                </a>
                . Changes there will be reflected here automatically.
              </p>
            )}
          </div>

          {/* Custom Dates */}
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-foreground">
                Custom blackout dates
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Add specific dates when the agent should pause proactive
                outreach — busy seasons, office closures, company events,
                or any other dates unique to this property.
              </p>
            </div>

            {blackout.customDates.length > 0 && (
              <div className="space-y-2">
                {blackout.customDates.map((cd) => (
                  <div
                    key={cd.id}
                    className="group flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 hover:border-zinc-300 transition-all"
                  >
                    <Input
                      type="date"
                      value={cd.date}
                      onChange={(e) =>
                        updateCustomDate(cd.id, { date: e.target.value })
                      }
                      className="h-8 w-40 text-xs shrink-0"
                    />
                    <Input
                      type="text"
                      placeholder="Label (e.g. Office Closure)"
                      value={cd.label}
                      onChange={(e) =>
                        updateCustomDate(cd.id, { label: e.target.value })
                      }
                      className="h-8 text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomDate(cd.id)}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                      aria-label="Remove date"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={addCustomDate}
              className="w-full border-dashed"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add blackout date
            </Button>
          </div>
        </div>
      </SectionShell>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Offer Follow-Up List
   ══════════════════════════════════════════════════════════════════════════ */

function OfferFollowUpList({
  steps,
  onChange,
}: {
  steps: OfferFollowUpStep[]
  onChange: (steps: OfferFollowUpStep[]) => void
}) {
  const addStep = () =>
    onChange([
      ...steps,
      { id: makeOfferId(), days: 7, anchor: "after_offer_sent" },
    ])

  const removeStep = (id: string) =>
    onChange(steps.filter((s) => s.id !== id))

  const updateStep = (id: string, patch: Partial<OfferFollowUpStep>) =>
    onChange(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const moveStep = (index: number, direction: "up" | "down") => {
    const next = [...steps]
    const target = direction === "up" ? index - 1 : index + 1
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-foreground">
            Follow-up schedule
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Add as many follow-up touchpoints as needed. Each step defines when
            Renewal AI will reach out to the resident about their pending
            renewal offer.
          </p>
        </div>
        <Badge variant="gray" className="text-[10px]">
          {steps.length} step{steps.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {steps.length === 0 ? (
        <EmptyState label="No follow-up steps configured" />
      ) : (
        <div className="space-y-2">
          {steps.map((step, index) => (
            <StepRow
              key={step.id}
              index={index}
              total={steps.length}
              days={step.days}
              onDaysChange={(d) => updateStep(step.id, { days: d })}
              anchorValue={step.anchor}
              anchorOptions={OFFER_ANCHOR_LABELS}
              onAnchorChange={(a) =>
                updateStep(step.id, { anchor: a as OfferFollowUpAnchor })
              }
              onRemove={() => removeStep(step.id)}
              onMove={(dir) => moveStep(index, dir)}
            />
          ))}
        </div>
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={addStep}
        className="w-full border-dashed"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add follow-up step
      </Button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Lease Follow-Up List
   ══════════════════════════════════════════════════════════════════════════ */

function LeaseFollowUpList({
  steps,
  onChange,
}: {
  steps: LeaseFollowUpStep[]
  onChange: (steps: LeaseFollowUpStep[]) => void
}) {
  const addStep = () =>
    onChange([
      ...steps,
      {
        id: makeLeaseId(),
        days: 7,
        anchor: "after_lease_generated",
        target: "unsigned_only",
      },
    ])

  const removeStep = (id: string) =>
    onChange(steps.filter((s) => s.id !== id))

  const updateStep = (id: string, patch: Partial<LeaseFollowUpStep>) =>
    onChange(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const moveStep = (index: number, direction: "up" | "down") => {
    const next = [...steps]
    const target = direction === "up" ? index - 1 : index + 1
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-foreground">
            Follow-up schedule
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Add follow-up touchpoints for residents who have accepted their
            renewal offer but still need to sign the lease. Typically all
            responsible parties on the lease need to sign.
          </p>
        </div>
        <Badge variant="gray" className="text-[10px]">
          {steps.length} step{steps.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {steps.length === 0 ? (
        <EmptyState label="No follow-up steps configured" />
      ) : (
        <div className="space-y-2">
          {steps.map((step, index) => (
            <LeaseStepRow
              key={step.id}
              step={step}
              index={index}
              total={steps.length}
              onUpdate={(patch) => updateStep(step.id, patch)}
              onRemove={() => removeStep(step.id)}
              onMove={(dir) => moveStep(index, dir)}
            />
          ))}
        </div>
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={addStep}
        className="w-full border-dashed"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add follow-up step
      </Button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Generic Step Row (for offer follow-ups)
   ══════════════════════════════════════════════════════════════════════════ */

const MTM_WARNING = "Will not trigger for month-to-month leases (no lease end date)."

function StepRow<T extends string>({
  index,
  total,
  days,
  onDaysChange,
  anchorValue,
  anchorOptions,
  onAnchorChange,
  onRemove,
  onMove,
}: {
  index: number
  total: number
  days: number
  onDaysChange: (d: number) => void
  anchorValue: T
  anchorOptions: Record<T, string>
  onAnchorChange: (v: string) => void
  onRemove: () => void
  onMove: (direction: "up" | "down") => void
}) {
  const showMtmWarning = (anchorValue as string) === "before_lease_end"

  return (
    <div className="group rounded-lg border border-border bg-white transition-all hover:border-zinc-300">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onMove("up")}
            disabled={index === 0}
            className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            aria-label="Move up"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onMove("down")}
            disabled={index === total - 1}
            className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            aria-label="Move down"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
        </div>

        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600">
          {index + 1}
        </div>

        <div className="flex flex-1 items-center gap-2 min-w-0">
          <Input
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => onDaysChange(parseInt(e.target.value) || 1)}
            className="h-8 w-16 text-xs text-center shrink-0"
          />
          <span className="text-xs text-muted-foreground shrink-0">days</span>
          <Select
            value={anchorValue}
            onValueChange={onAnchorChange}
          >
            <SelectTrigger className="h-8 text-xs min-w-0 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(anchorOptions) as T[]).map((a) => (
                <SelectItem key={a} value={a} className="text-xs">
                  {anchorOptions[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
          aria-label={`Remove step ${index + 1}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {showMtmWarning && (
        <div className="flex items-center gap-1.5 px-3 pb-2.5 -mt-1 ml-[3.25rem]">
          <Info className="h-3 w-3 shrink-0 text-amber-500" />
          <p className="text-[10px] text-amber-700">{MTM_WARNING}</p>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Lease Step Row (includes target selector)
   ══════════════════════════════════════════════════════════════════════════ */

function LeaseStepRow({
  step,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  step: LeaseFollowUpStep
  index: number
  total: number
  onUpdate: (patch: Partial<LeaseFollowUpStep>) => void
  onRemove: () => void
  onMove: (direction: "up" | "down") => void
}) {
  const showMtmWarning = step.anchor === "before_lease_end"

  return (
    <div className="group rounded-lg border border-border bg-white transition-all hover:border-zinc-300">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onMove("up")}
            disabled={index === 0}
            className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            aria-label="Move up"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onMove("down")}
            disabled={index === total - 1}
            className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            aria-label="Move down"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
        </div>

        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600">
          {index + 1}
        </div>

        <div className="flex flex-1 items-center gap-2 min-w-0 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Input
              type="number"
              min={1}
              max={365}
              value={step.days}
              onChange={(e) =>
                onUpdate({ days: parseInt(e.target.value) || 1 })
              }
              className="h-8 w-16 text-xs text-center shrink-0"
            />
            <span className="text-xs text-muted-foreground shrink-0">
              days
            </span>
            <Select
              value={step.anchor}
              onValueChange={(v) =>
                onUpdate({ anchor: v as LeaseFollowUpAnchor })
              }
            >
              <SelectTrigger className="h-8 text-xs min-w-0 w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(LEASE_ANCHOR_LABELS) as LeaseFollowUpAnchor[]
                ).map((a) => (
                  <SelectItem key={a} value={a} className="text-xs">
                    {LEASE_ANCHOR_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select
            value={step.target}
            onValueChange={(v) =>
              onUpdate({ target: v as LeaseFollowUpTarget })
            }
          >
            <SelectTrigger className="h-8 text-xs min-w-0 w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.keys(LEASE_TARGET_LABELS) as LeaseFollowUpTarget[]
              ).map((t) => (
                <SelectItem key={t} value={t} className="text-xs">
                  {LEASE_TARGET_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
          aria-label={`Remove step ${index + 1}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {showMtmWarning && (
        <div className="flex items-center gap-1.5 px-3 pb-2.5 -mt-1 ml-[3.25rem]">
          <Info className="h-3 w-3 shrink-0 text-amber-500" />
          <p className="text-[10px] text-amber-700">{MTM_WARNING}</p>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Shared sub-components
   ══════════════════════════════════════════════════════════════════════════ */

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-zinc-50/40 py-10 gap-2">
      <CalendarClock className="h-8 w-8 text-zinc-300" />
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">
        Add your first step to start building the cadence
      </p>
    </div>
  )
}

function GroupHeading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex-1 border-t border-border" />
    </div>
  )
}

function SectionShell({
  icon: Icon,
  title,
  description,
  headerAction,
  children,
}: {
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
        {headerAction && (
          <div className="shrink-0 self-center">{headerAction}</div>
        )}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  )
}

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
        "sticky bottom-0 inset-x-0 border-t bg-white px-8 py-3 transition-all",
        dirty ? "border-amber-200 bg-amber-50" : "border-border"
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          {dirty ? (
            <span className="font-medium text-amber-900">
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> Unsaved
              changes — won&apos;t take effect until saved.
            </span>
          ) : (
            <span className="text-muted-foreground">No pending changes</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDiscard}
            disabled={!dirty}
          >
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
