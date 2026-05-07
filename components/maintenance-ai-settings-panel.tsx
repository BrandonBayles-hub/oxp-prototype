"use client"

/**
 * Maintenance AI — per-property settings panel.
 *
 * Renders inside the existing agent-roster slide-out, in the "Maintenance AI Settings"
 * left-nav tab (replaces the "Coming Soon" placeholder).
 *
 * Scope: per-property. Numbers referenced in the dropdowns (IVR emergency, on-call
 * back up) are configured under Property Settings; this panel just routes which one
 * is used during vs after maintenance hours.
 */

import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Lock, PhoneForwarded, Info } from "lucide-react"

type ForwardOption = "ivr" | "oncall" | "custom" | "none"

const FORWARD_OPTIONS: { value: ForwardOption; label: string; helper: string }[] = [
  {
    value: "ivr",
    label: "IVR Emergency Number",
    helper: "Use the number configured in Call Handling.",
  },
  {
    value: "oncall",
    label: "On Call Back Up Number",
    helper: "Use the number configured in On Call Emergency Back Up.",
  },
  {
    value: "custom",
    label: "Custom Number",
    helper: "Forward to a specific number not configured elsewhere.",
  },
  {
    value: "none",
    label: "Do Not Forward",
    helper:
      "Don't forward the resident — create the work order in emergency status and let the regular emergency workflow handle it.",
  },
]

export function MaintenanceAISettingsPanel({
  propertyName,
  agentDisplayLabel,
}: {
  propertyName: string
  agentDisplayLabel: string
}) {
  const [duringHoursOption, setDuringHoursOption] = useState<ForwardOption>("ivr")
  const [duringHoursCustom, setDuringHoursCustom] = useState("")
  const [afterHoursOption, setAfterHoursOption] = useState<ForwardOption>("oncall")
  const [afterHoursCustom, setAfterHoursCustom] = useState("")

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-white px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{agentDisplayLabel} Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure how {agentDisplayLabel} behaves at <strong>{propertyName}</strong>.
            </p>
          </div>
          <Badge variant="gray" className="shrink-0">
            <Lock className="mr-1 h-3 w-3" />
            Property scope
          </Badge>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 pb-12 pt-6">
        <div className="mx-auto max-w-3xl space-y-8">
          <section className="rounded-xl border border-border bg-white">
            <div className="flex items-start gap-3 border-b border-border px-5 py-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                <PhoneForwarded className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground">Emergency Call Forwarding</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  When a resident reports an emergency work order, select where to forward them. Set separate
                  routing for during and after maintenance hours.
                </p>
              </div>
            </div>
            <div className="space-y-6 px-5 py-5">
              <ForwardingRow
                heading="During maintenance hours"
                helper="Used when the resident reports an emergency inside the property's configured maintenance hours."
                option={duringHoursOption}
                onOption={setDuringHoursOption}
                customNumber={duringHoursCustom}
                onCustomNumber={setDuringHoursCustom}
              />
              <div className="border-t border-border pt-6">
                <ForwardingRow
                  heading="After maintenance hours"
                  helper="Used when the resident reports an emergency outside the property's configured maintenance hours."
                  option={afterHoursOption}
                  onOption={setAfterHoursOption}
                  customNumber={afterHoursCustom}
                  onCustomNumber={setAfterHoursCustom}
                />
              </div>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2.5">
                <p className="text-[11px] leading-relaxed text-zinc-700">
                  <Info className="mr-1 inline h-3 w-3" /> Maintenance hours, the IVR emergency number, and the
                  on-call back up number are configured under <strong>Property Settings → Maintenance Info</strong>.
                  Changes there flow into the dropdowns above.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function ForwardingRow({
  heading,
  helper,
  option,
  onOption,
  customNumber,
  onCustomNumber,
}: {
  heading: string
  helper: string
  option: ForwardOption
  onOption: (v: ForwardOption) => void
  customNumber: string
  onCustomNumber: (v: string) => void
}) {
  const selected = FORWARD_OPTIONS.find((o) => o.value === option)
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{heading}</h4>
      <p className="mt-1 text-[11px] text-muted-foreground">{helper}</p>
      <div className="mt-3 space-y-3">
        <div>
          <label className="text-xs font-medium text-foreground">Forwarding rule</label>
          <Select value={option} onValueChange={(v) => onOption(v as ForwardOption)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORWARD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected && <p className="mt-1.5 text-[11px] text-muted-foreground">{selected.helper}</p>}
        </div>
        {option === "custom" && (
          <div>
            <label className="text-xs font-medium text-foreground">Custom Number</label>
            <Input
              value={customNumber}
              onChange={(e) => onCustomNumber(e.target.value)}
              placeholder="(555) 123-4567"
              className="mt-1.5"
            />
          </div>
        )}
      </div>
    </div>
  )
}
