"use client"

/**
 * Maintenance AI — per-property settings panel.
 *
 * Renders inside the existing agent-roster slide-out, in the "Maintenance AI Settings"
 * left-nav tab (replaces the "Coming Soon" placeholder).
 *
 * Scope: per-property. Emergency contact routing is configured per channel
 * (SMS, Chat, Voice) and per maintenance-hours band (during / after) — six settings
 * total, shown as a table. Each channel's handling is explained in a tooltip on the
 * channel name.
 *
 * Numbers referenced in the dropdowns are configured under Property Settings in Entrata:
 *  - Maintenance Emergency / Maintenance Emergency (After Hours):
 *      Property > General > Contact Methods > Primary Phone Numbers
 *  - On Call Back Up (an unnamed list of phone numbers):
 *      Property > Resident > Maintenance > Notifications > On Call Back Up
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Lock, PhoneForwarded, Info, MessageSquare, MessageCircle, Phone } from "lucide-react"

type Channel = "sms" | "chat" | "voice"
type HourBand = "during" | "after"
type NumberSource = "emergency" | "oncall" | "custom" | "none"

type CellConfig = {
  source: NumberSource
  oncallNumber: string
  custom: string
}

// Sample numbers — in production these are read from Entrata Property Settings.
const MAINT_EMERGENCY_NUMBER: Record<HourBand, string> = {
  during: "(801) 555-0142",
  after: "(801) 555-0177",
}

// On Call Back Up is an unnamed list of phone numbers.
const ONCALL_NUMBERS: string[] = ["(801) 555-0210", "(801) 555-0211", "(801) 555-0212"]

const SHARED_TOOLTIP =
  "This number will be shared with the resident after completing an emergency work order. Note: The resident will not be automatically transferred to this number."

const VOICE_TOOLTIP =
  "After completing the emergency work order, the resident will be notified that the agent is reaching out to the emergency contact. Then the agent will contact this number to report the emergency. Note: The resident will not be given this number nor will they be forwarded to this number."

const CHANNELS: {
  value: Channel
  label: string
  icon: React.ComponentType<{ className?: string }>
  tooltip: string
}[] = [
  { value: "sms", label: "SMS", icon: MessageSquare, tooltip: SHARED_TOOLTIP },
  { value: "chat", label: "Chat", icon: MessageCircle, tooltip: SHARED_TOOLTIP },
  { value: "voice", label: "Voice", icon: Phone, tooltip: VOICE_TOOLTIP },
]

const BANDS: { value: HourBand; label: string }[] = [
  { value: "during", label: "During maintenance hours" },
  { value: "after", label: "After maintenance hours" },
]

function emergencyLabel(band: HourBand) {
  return band === "during" ? "Maintenance Emergency" : "Maintenance Emergency (After Hours)"
}

function defaultCell(band: HourBand): CellConfig {
  return {
    source: band === "during" ? "emergency" : "oncall",
    oncallNumber: ONCALL_NUMBERS[0],
    custom: "",
  }
}

function makeDefaults(): Record<string, CellConfig> {
  const out: Record<string, CellConfig> = {}
  for (const ch of CHANNELS) {
    for (const band of BANDS) {
      out[`${ch.value}-${band.value}`] = defaultCell(band.value)
    }
  }
  return out
}

export function MaintenanceAISettingsPanel({
  propertyName,
  agentDisplayLabel,
}: {
  propertyName: string
  agentDisplayLabel: string
}) {
  const [cells, setCells] = useState<Record<string, CellConfig>>(makeDefaults)

  const updateCell = (key: string, patch: Partial<CellConfig>) =>
    setCells((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))

  return (
    <TooltipProvider delayDuration={150}>
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
          <div className="mx-auto max-w-4xl space-y-8">
            <section className="rounded-xl border border-border bg-white">
              <div className="flex items-start gap-3 border-b border-border px-5 py-4">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                  <PhoneForwarded className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground">Emergency Contact Routing</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    When a resident reports an emergency work order, choose the contact number for each channel. Set
                    separate routing for during and after maintenance hours.
                  </p>
                </div>
              </div>

              <div className="px-5 py-5">
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-zinc-50">
                        <th
                          scope="col"
                          className="w-[20%] border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          Channel
                        </th>
                        {BANDS.map((band) => (
                          <th
                            key={band.value}
                            scope="col"
                            className="border-b border-l border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            {band.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {CHANNELS.map((ch) => {
                        const Icon = ch.icon
                        return (
                          <tr key={ch.value} className="align-top">
                            <th scope="row" className="border-b border-border px-4 py-4 text-left align-top">
                              <div className="flex items-center gap-1.5">
                                <Icon className="h-4 w-4 text-zinc-700" aria-hidden />
                                <span className="text-sm font-semibold text-foreground">{ch.label}</span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="text-muted-foreground transition-colors hover:text-foreground"
                                      aria-label={`How ${ch.label} emergencies are handled`}
                                    >
                                      <Info className="h-3.5 w-3.5" aria-hidden />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs text-[11px] leading-relaxed">
                                    {ch.tooltip}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </th>
                            {BANDS.map((band) => {
                              const key = `${ch.value}-${band.value}`
                              return (
                                <td
                                  key={band.value}
                                  className="border-b border-l border-border px-4 py-4 align-top"
                                >
                                  <RoutingCell
                                    channelLabel={ch.label}
                                    band={band.value}
                                    config={cells[key]}
                                    onChange={(patch) => updateCell(key, patch)}
                                  />
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2.5">
                  <p className="text-[11px] leading-relaxed text-zinc-700">
                    <strong>Maintenance Emergency</strong> numbers come from{" "}
                    <strong>Property &gt; General &gt; Contact Methods &gt; Primary Phone Numbers</strong>.
                  </p>
                  <p className="text-[11px] leading-relaxed text-zinc-700">
                    <strong>On Call Back Up</strong> numbers come from{" "}
                    <strong>Property &gt; Resident &gt; Maintenance &gt; Notifications &gt; On Call Back Up</strong>.
                  </p>
                  <p className="text-[11px] leading-relaxed text-zinc-700">
                    Changes made to these settings will automatically update the information in the dropdowns above.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

function RoutingCell({
  channelLabel,
  band,
  config,
  onChange,
}: {
  channelLabel: string
  band: HourBand
  config: CellConfig
  onChange: (patch: Partial<CellConfig>) => void
}) {
  const sourceOptions: { value: NumberSource; label: string }[] = [
    { value: "emergency", label: emergencyLabel(band) },
    { value: "oncall", label: "On Call Back Up Number" },
    { value: "custom", label: "Custom Number" },
    { value: "none", label: "No Emergency Contact" },
  ]

  const bandWord = band === "during" ? "during" : "after"

  return (
    <div className="space-y-2.5">
      <Select value={config.source} onValueChange={(v) => onChange({ source: v as NumberSource })}>
        <SelectTrigger aria-label={`${channelLabel} ${bandWord} hours contact rule`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sourceOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {config.source === "oncall" && (
        <Select value={config.oncallNumber} onValueChange={(v) => onChange({ oncallNumber: v })}>
          <SelectTrigger aria-label={`${channelLabel} ${bandWord} hours on call back up number`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ONCALL_NUMBERS.map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {config.source === "custom" && (
        <Input
          value={config.custom}
          onChange={(e) => onChange({ custom: e.target.value })}
          placeholder="(555) 123-4567"
          aria-label={`${channelLabel} ${bandWord} hours custom number`}
        />
      )}

      {config.source === "emergency" && (
        <p className="text-[11px] text-muted-foreground">
          Number: <span className="font-medium text-foreground">{MAINT_EMERGENCY_NUMBER[band]}</span>
        </p>
      )}
    </div>
  )
}
