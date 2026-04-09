"use client"

import { useEffect } from "react"
import { Target, Info, CheckCircle2, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { PROPERTIES } from "../data/properties"
import { PropertyFilter, usePropertyFilter } from "./PropertyFilter"

export const AGENT_GOAL_OPTIONS = [
  { value: "schedule-tour",    label: "Schedule Tour" },
  { value: "fill-application", label: "Fill Application" },
] as const

export type AgentGoalValue = typeof AGENT_GOAL_OPTIONS[number]["value"]

export function makeDefaultAgentGoals(): Record<string, AgentGoalValue> {
  return Object.fromEntries(PROPERTIES.map((p) => [p.id, "schedule-tour"]))
}

interface Props {
  goals: Record<string, string>
  onChange: (id: string, val: string) => void
  onValidChange: (valid: boolean) => void
}

export function AgentGoalSheetContent({ goals, onChange, onValidChange }: Props) {
  const { search, setSearch, group, setGroup, filtered } = usePropertyFilter()
  const filledCount = Object.values(goals).filter(Boolean).length

  useEffect(() => {
    onValidChange(filledCount === PROPERTIES.length)
  }, [filledCount, onValidChange])

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs text-blue-900 leading-relaxed">
          <strong>Default applied: Schedule Tour</strong> — ELI will push prospects toward scheduling a tour at every property.
          If a property is in a lease-up phase or has high demand, consider switching to <em>Fill Application</em> instead.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Per-Property Goal</p>
          <span className="text-xs tabular-nums text-muted-foreground">{filledCount} / {PROPERTIES.length} set</span>
        </div>

        <PropertyFilter
          search={search}
          onSearchChange={setSearch}
          group={group}
          onGroupChange={setGroup}
          resultCount={filtered.length}
          totalCount={PROPERTIES.length}
        />

        <div className="rounded-xl border border-border overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">No properties match your filter.</div>
          ) : (
            filtered.map((prop, idx) => {
              const val = goals[prop.id] ?? "schedule-tour"
              const label = AGENT_GOAL_OPTIONS.find((o) => o.value === val)?.label ?? val
              return (
                <div
                  key={prop.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 border-b border-border last:border-0",
                    idx % 2 === 0 ? "bg-white" : "bg-zinc-50/50",
                  )}
                >
                  <div className="w-36 shrink-0">
                    <p className="text-sm font-medium text-foreground truncate">{prop.name}</p>
                    <p className="text-xs text-muted-foreground">{prop.city}, {prop.state}</p>
                  </div>
                  <div className="relative flex-1">
                    <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden />
                    <select
                      value={val}
                      onChange={(e) => onChange(prop.id, e.target.value)}
                      className="w-full h-8 appearance-none rounded-lg border border-border bg-white pl-9 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                    >
                      {AGENT_GOAL_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  </div>
                  <div className="w-6 shrink-0 flex justify-center">
                    {val && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
