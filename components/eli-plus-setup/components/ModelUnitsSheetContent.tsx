"use client"

import { useEffect } from "react"
import { Database, Info, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { PROPERTIES } from "../data/properties"
import { PropertyFilter, usePropertyFilter } from "./PropertyFilter"
import { ENTRATA_MODEL_UNITS, ENTRATA_MODEL_UNITS_PATH } from "../data/entrata-imports"

export function makeDefaultModelUnits(): Record<string, string> {
  // Any property with model units in Entrata → "yes", everything else → "no"
  // (no model units found = no model units at that property)
  return Object.fromEntries(
    PROPERTIES.map((p) => [
      p.id,
      ENTRATA_MODEL_UNITS[p.id] === true ? "yes" : "no",
    ])
  )
}

interface Props {
  units: Record<string, string>
  onChange: (id: string, val: string) => void
  onValidChange: (valid: boolean) => void
}

export function ModelUnitsSheetContent({ units, onChange, onValidChange }: Props) {
  const { search, setSearch, group, setGroup, filtered } = usePropertyFilter()
  const filledCount = Object.values(units).filter(Boolean).length
  const entrataCount = Object.keys(ENTRATA_MODEL_UNITS).length

  useEffect(() => {
    onValidChange(filledCount === PROPERTIES.length)
  }, [filledCount, onValidChange])

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
        <Database className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" aria-hidden />
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-indigo-900">{entrataCount} values pulled from your Entrata settings</p>
          <p className="text-xs text-indigo-700 leading-relaxed">
            Found in <span className="font-medium">{ENTRATA_MODEL_UNITS_PATH}</span>. Verify these are current and confirm the remaining properties.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
        <Info className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs text-zinc-700 leading-relaxed">
          ELI uses this to tell prospects whether they can tour a furnished model unit. Properties confirmed in Entrata show <strong>From Entrata</strong>. All others are inferred as <strong>No model units</strong> — override any that are incorrect.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Per-Property Model Units</p>
          <span className="text-xs tabular-nums text-emerald-700 font-medium">{filledCount} / {PROPERTIES.length} complete</span>
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
              const val = units[prop.id] ?? ""
              const fromEntrata = ENTRATA_MODEL_UNITS[prop.id] !== undefined
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
                    {fromEntrata && (
                      <span className="inline-flex items-center gap-1 mt-1 rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 whitespace-nowrap">
                        <Database className="h-2.5 w-2.5" aria-hidden />
                        From Entrata
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    {(["yes", "no"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => onChange(prop.id, opt)}
                        className={cn(
                          "h-8 px-4 rounded-lg border text-sm font-medium transition-colors",
                          val === opt
                            ? opt === "yes"
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-zinc-500 bg-zinc-100 text-zinc-700"
                            : "border-border bg-white text-muted-foreground hover:border-zinc-400",
                        )}
                      >
                        {opt === "yes" ? "Yes" : "No"}
                      </button>
                    ))}
                  </div>
                  <div className="w-8 shrink-0 flex justify-end">
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
