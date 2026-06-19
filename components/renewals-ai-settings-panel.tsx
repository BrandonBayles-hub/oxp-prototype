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
} from "lucide-react"

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

interface CommunicationWindow {
  sendHour: string
  days: DayOfWeek[]
}

interface BlackoutHoliday {
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
  customDates: CustomBlackoutDate[]
}

interface PanelState {
  communicationWindow: CommunicationWindow
  blackoutDates: BlackoutDates
  offerSteps: OfferFollowUpStep[]
  leaseSteps: LeaseFollowUpStep[]
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

function makeDefaultState(): PanelState {
  return {
    communicationWindow: {
      sendHour: "09:00",
      days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    },
    blackoutDates: {
      holidays: DEFAULT_BLACKOUT_HOLIDAYS,
      customDates: [],
    },
    offerSteps: DEFAULT_OFFER_STEPS,
    leaseSteps: DEFAULT_LEASE_STEPS,
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   Public component
   ══════════════════════════════════════════════════════════════════════════ */

interface Props {
  propertyName: string
  agentDisplayLabel?: string
}

export function RenewalsAISettingsPanel({
  propertyName,
  agentDisplayLabel = "Renewal AI",
}: Props) {
  const [state, setState] = useState<PanelState>(() => makeDefaultState())
  const [pristine, setPristine] = useState<PanelState>(() => makeDefaultState())

  const dirty = JSON.stringify(state) !== JSON.stringify(pristine)

  const handleSave = () => setPristine(state)
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

  return (
    <SectionShell
      icon={Clock}
      title="Communication Windows"
      description={`Define when ${agentDisplayLabel} is allowed to send proactive outbound messages at this property. If a resident replies outside this window, the agent will respond promptly — but follow-ups, reminders, and notifications will be generated at the selected hour on the allowed days.`}
    >
      <div className="space-y-5">
        {/* Send hour */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">
            Follow-up send time
          </p>
          <p className="text-[11px] text-muted-foreground">
            Select the hour when {agentDisplayLabel} should generate and send
            proactive follow-up messages each day.
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
            <Badge variant="gray" className="text-[10px]">
              Property timezone
            </Badge>
          </div>
        </div>

        {/* Days of week */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">
            Allowed days
          </p>
          <div className="flex gap-1.5">
            {DAY_LABELS.map((d) => {
              const active = win.days.includes(d.id)
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDay(d.id)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-all",
                    active
                      ? "bg-zinc-900 text-white"
                      : "border border-border bg-white text-muted-foreground hover:border-zinc-400"
                  )}
                  title={d.label}
                >
                  {d.short}
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Proactive messages will only be sent on selected days at the hour
            above. Responses to resident-initiated conversations are not
            restricted.
          </p>
        </div>
      </div>
    </SectionShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Blackout Dates
   ══════════════════════════════════════════════════════════════════════════ */

function BlackoutDatesSection({
  blackout,
  onChange,
  agentDisplayLabel,
}: {
  blackout: BlackoutDates
  onChange: (b: BlackoutDates) => void
  agentDisplayLabel: string
}) {
  const currentYear = new Date().getFullYear()
  const nextYear = currentYear + 1
  const holidaysCurrent = getHolidaysForYear(currentYear)
  const holidaysNext = getHolidaysForYear(nextYear)

  const toggleHoliday = (key: string) => {
    onChange({
      ...blackout,
      holidays: blackout.holidays.map((h) =>
        h.key === key ? { ...h, enabled: !h.enabled } : h
      ),
    })
  }

  const enabledCount =
    blackout.holidays.filter((h) => h.enabled).length +
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
    })
  }

  const disableAll = () => {
    onChange({
      ...blackout,
      holidays: blackout.holidays.map((h) => ({ ...h, enabled: false })),
    })
  }

  const allEnabled = blackout.holidays.every((h) => h.enabled)
  const noneEnabled = blackout.holidays.every((h) => !h.enabled)

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
          {/* Bank Holidays */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Bank holidays
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Select the holidays on which {agentDisplayLabel} should
                  not send proactive messages.
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
              {blackout.holidays.map((h) => {
                const defCurrent = holidaysCurrent.find(
                  (hd) => hd.key === h.key
                )!
                const defNext = holidaysNext.find(
                  (hd) => hd.key === h.key
                )!
                return (
                  <button
                    key={h.key}
                    type="button"
                    onClick={() => toggleHoliday(h.key)}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
                  >
                    <div
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all",
                        h.enabled
                          ? "bg-zinc-900 border-zinc-900 text-white"
                          : "border-zinc-300 bg-white"
                      )}
                    >
                      {h.enabled && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {defCurrent.name}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-muted-foreground">
                        {defCurrent.formatted}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {defNext.formatted}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
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
