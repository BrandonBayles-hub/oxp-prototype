"use client"

import { useState } from "react"
import { Database, Info, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { PROPERTIES } from "../data/properties"
import { PropertyFilter, usePropertyFilter } from "./PropertyFilter"
import {
  ENTRATA_TOUR_ENABLED,
  ENTRATA_TOUR_LENGTHS,
  ENTRATA_TOUR_INSTRUCTIONS,
  ENTRATA_TOUR_TYPES_PATH,
} from "../data/entrata-imports"

export interface TourPropertySettings {
  agentEnabled: boolean
  selfGuidedEnabled: boolean
  virtualEnabled: boolean
  agentLength: string
  agentInstructions: string
  selfGuidedLength: string
  selfGuidedInstructions: string
  selfGuidedLink: string
  virtualLink: string
  virtualExternal: boolean
}

const DEFAULT_AGENT_LENGTH = "60"
const DEFAULT_SELF_LENGTH = "30"
const DEFAULT_AGENT_INSTRUCTIONS = "Meet our leasing agent in the main lobby. Tours typically begin at the model unit and finish at the leasing office to answer any questions."
const DEFAULT_SELF_INSTRUCTIONS = "Check in at the leasing kiosk in the lobby. You will receive a code to access the tour unit and a map of the property."

export function makeDefaultTourSettings(): Record<string, TourPropertySettings> {
  return Object.fromEntries(
    PROPERTIES.map((p) => {
      const entrata = ENTRATA_TOUR_ENABLED[p.id]
      const lengths = ENTRATA_TOUR_LENGTHS[p.id] ?? {}
      const instructions = ENTRATA_TOUR_INSTRUCTIONS[p.id] ?? {}
      return [p.id, {
        agentEnabled:          entrata?.agent      ?? true,
        selfGuidedEnabled:     entrata?.selfGuided ?? false,
        virtualEnabled:        entrata?.virtual    ?? false,
        agentLength:           lengths.agent       ?? DEFAULT_AGENT_LENGTH,
        agentInstructions:     instructions.agent  ?? DEFAULT_AGENT_INSTRUCTIONS,
        selfGuidedLength:      lengths.selfGuided  ?? DEFAULT_SELF_LENGTH,
        selfGuidedInstructions: instructions.selfGuided ?? DEFAULT_SELF_INSTRUCTIONS,
        selfGuidedLink:        "",
        virtualLink:           "",
        virtualExternal:       false,
      }]
    })
  )
}

type TourTab = "agent" | "self-guided" | "virtual"

const LENGTH_OPTIONS = ["15", "20", "30", "45", "60", "75", "90", "120"]

function EntrataCountBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 whitespace-nowrap shrink-0">
      <Database className="h-2.5 w-2.5" aria-hidden />
      {count} pulled from Entrata
    </span>
  )
}

interface Props {
  settings: Record<string, TourPropertySettings>
  onChange: (id: string, field: keyof TourPropertySettings, val: string | boolean) => void
  onValidChange: (valid: boolean) => void
}

export function TourTypesSheetContent({ settings, onChange, onValidChange }: Props) {
  const [activeTab, setActiveTab] = useState<TourTab>("agent")
  const { search, setSearch, group, setGroup, filtered } = usePropertyFilter()

  const TABS: { id: TourTab; label: string; enabledKey: keyof TourPropertySettings }[] = [
    { id: "agent",       label: "Agent Tour",       enabledKey: "agentEnabled" },
    { id: "self-guided", label: "Self-Guided Tour",  enabledKey: "selfGuidedEnabled" },
    { id: "virtual",     label: "Virtual Tour",      enabledKey: "virtualEnabled" },
  ]

  // Always valid — tour types are pre-configured; user just reviews
  onValidChange(true)

  const entrataCount = Object.keys(ENTRATA_TOUR_ENABLED).length

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
        <Database className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" aria-hidden />
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-indigo-900">{entrataCount} properties' tour availability pulled from Entrata</p>
          <p className="text-xs text-indigo-700 leading-relaxed">
            Found in <span className="font-medium">{ENTRATA_TOUR_TYPES_PATH}</span>. Tour lengths and instructions show <span className="font-medium">From Entrata</span> or <span className="font-medium">Default</span> tags where applicable — override any value below.
          </p>
        </div>
      </div>

      {/* Tour type tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-white px-1.5 py-1.5 w-fit">
        {TABS.map((tab) => {
          const enabledCount = filtered.filter((p) => settings[p.id]?.[tab.enabledKey]).length
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-zinc-50",
              )}
            >
              {tab.label}
              <span className={cn(
                "inline-flex items-center justify-center h-4 min-w-[1rem] rounded-full text-[10px] font-bold leading-none px-0.5",
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500",
              )}>
                {enabledCount}
              </span>
            </button>
          )
        })}
      </div>

      <PropertyFilter
        search={search}
        onSearchChange={setSearch}
        group={group}
        onGroupChange={setGroup}
        resultCount={filtered.length}
        totalCount={PROPERTIES.length}
      />

      <div className="space-y-3">
        {filtered.map((prop) => {
          const s = settings[prop.id]
          if (!s) return null
          const entrataData = ENTRATA_TOUR_ENABLED[prop.id]
          const entrataLengths = ENTRATA_TOUR_LENGTHS[prop.id] ?? {}
          const entrataInstructions = ENTRATA_TOUR_INSTRUCTIONS[prop.id] ?? {}

          // Count how many sub-settings were pulled from Entrata for the active tab
          const agentEntrataCount =
            (entrataData ? 1 : 0) +
            (entrataLengths.agent ? 1 : 0) +
            (entrataInstructions.agent ? 1 : 0)
          const selfGuidedEntrataCount =
            (entrataData ? 1 : 0) +
            (entrataLengths.selfGuided ? 1 : 0) +
            (entrataInstructions.selfGuided ? 1 : 0)
          const virtualEntrataCount = entrataData ? 1 : 0

          if (activeTab === "agent") {
            return (
              <div key={prop.id} className="rounded-xl border border-border bg-white overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-zinc-50/60">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{prop.name}</p>
                    <p className="text-xs text-muted-foreground">{prop.city}, {prop.state}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <EntrataCountBadge count={agentEntrataCount} />
                    <button
                      type="button"
                      onClick={() => onChange(prop.id, "agentEnabled", !s.agentEnabled)}
                      className={cn(
                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
                        s.agentEnabled ? "bg-zinc-900" : "bg-zinc-200",
                      )}
                    >
                      <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", s.agentEnabled ? "translate-x-4" : "translate-x-0.5")} />
                    </button>
                    <span className="text-xs text-muted-foreground w-12">{s.agentEnabled ? "Enabled" : "Disabled"}</span>
                  </div>
                </div>
                {s.agentEnabled && (
                  <div className="px-4 py-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium text-muted-foreground w-28 shrink-0">Tour Length</label>
                      <div className="relative flex-1">
                        <select
                          value={s.agentLength}
                          onChange={(e) => onChange(prop.id, "agentLength", e.target.value)}
                          className="w-full h-8 appearance-none rounded-lg border border-border bg-white pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                        >
                          {LENGTH_OPTIONS.map((v) => <option key={v} value={v}>{v} min</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" aria-hidden />
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <label className="text-xs font-medium text-muted-foreground w-28 shrink-0 pt-2">Instructions</label>
                      <textarea
                        value={s.agentInstructions}
                        onChange={(e) => onChange(prop.id, "agentInstructions", e.target.value)}
                        rows={4}
                        className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          }

          if (activeTab === "self-guided") {
            return (
              <div key={prop.id} className="rounded-xl border border-border bg-white overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-zinc-50/60">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{prop.name}</p>
                    <p className="text-xs text-muted-foreground">{prop.city}, {prop.state}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selfGuidedEntrataCount > 0 && <EntrataCountBadge count={selfGuidedEntrataCount} />}
                    {!s.selfGuidedEnabled && (
                      <span className="text-[10px] text-muted-foreground/70 italic">Optional</span>
                    )}
                    <button
                      type="button"
                      onClick={() => onChange(prop.id, "selfGuidedEnabled", !s.selfGuidedEnabled)}
                      className={cn(
                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
                        s.selfGuidedEnabled ? "bg-zinc-900" : "bg-zinc-200",
                      )}
                    >
                      <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", s.selfGuidedEnabled ? "translate-x-4" : "translate-x-0.5")} />
                    </button>
                    <span className="text-xs text-muted-foreground w-12">{s.selfGuidedEnabled ? "Enabled" : "Disabled"}</span>
                  </div>
                </div>
                {s.selfGuidedEnabled && (
                  <div className="px-4 py-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium text-muted-foreground w-28 shrink-0">External Link</label>
                      <input
                        type="url"
                        placeholder="https://tour-provider.com/..."
                        value={s.selfGuidedLink}
                        onChange={(e) => onChange(prop.id, "selfGuidedLink", e.target.value)}
                        className="flex-1 h-8 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium text-muted-foreground w-28 shrink-0">Tour Length</label>
                      <div className="relative flex-1">
                        <select
                          value={s.selfGuidedLength}
                          onChange={(e) => onChange(prop.id, "selfGuidedLength", e.target.value)}
                          className="w-full h-8 appearance-none rounded-lg border border-border bg-white pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                        >
                          {LENGTH_OPTIONS.map((v) => <option key={v} value={v}>{v} min</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" aria-hidden />
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <label className="text-xs font-medium text-muted-foreground w-28 shrink-0 pt-2">Instructions</label>
                      <textarea
                        value={s.selfGuidedInstructions}
                        onChange={(e) => onChange(prop.id, "selfGuidedInstructions", e.target.value)}
                        rows={4}
                        className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          }

          // Virtual
          return (
            <div key={prop.id} className="rounded-xl border border-border bg-white overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-zinc-50/60">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{prop.name}</p>
                  <p className="text-xs text-muted-foreground">{prop.city}, {prop.state}</p>
                </div>
                <div className="flex items-center gap-2">
                  {virtualEntrataCount > 0 && <EntrataCountBadge count={virtualEntrataCount} />}
                  {!s.virtualEnabled && (
                    <span className="text-[10px] text-muted-foreground/70 italic">Optional</span>
                  )}
                  <button
                    type="button"
                    onClick={() => onChange(prop.id, "virtualEnabled", !s.virtualEnabled)}
                    className={cn(
                      "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
                      s.virtualEnabled ? "bg-zinc-900" : "bg-zinc-200",
                    )}
                  >
                    <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", s.virtualEnabled ? "translate-x-4" : "translate-x-0.5")} />
                  </button>
                  <span className="text-xs text-muted-foreground w-12">{s.virtualEnabled ? "Enabled" : "Disabled"}</span>
                </div>
              </div>
              {s.virtualEnabled && (
                <div className="px-4 py-3 space-y-3">
                  <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <Info className="h-3.5 w-3.5 text-zinc-500 shrink-0 mt-0.5" aria-hidden />
                    <p className="text-xs text-zinc-600">If Entrata handles virtual tours natively, no external link is needed. Only provide a link if a third-party vendor facilitates the experience.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-muted-foreground w-28 shrink-0">External Link</label>
                    <input
                      type="url"
                      placeholder="Optional — only if using external vendor"
                      value={s.virtualLink}
                      onChange={(e) => onChange(prop.id, "virtualLink", e.target.value)}
                      className="flex-1 h-8 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
