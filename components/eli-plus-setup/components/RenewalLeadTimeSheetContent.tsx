"use client"

import { useEffect } from "react"
import { CalendarDays, Info, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { PROPERTIES } from "../data/properties"
import { PropertyFilter, usePropertyFilter } from "./PropertyFilter"

export const RENEWAL_DEFAULT_DAYS = "120"

export function isValidDays(v: string) {
  const n = parseInt(v, 10)
  return !isNaN(n) && n >= 1 && n <= 365
}

export function makeDefaultRenewalDays(): Record<string, string> {
  return Object.fromEntries(PROPERTIES.map((p) => [p.id, RENEWAL_DEFAULT_DAYS]))
}

interface Props {
  days: Record<string, string>
  onChange: (id: string, val: string) => void
  /** fires true when every property has a valid value */
  onValidChange: (valid: boolean) => void
}

export function RenewalLeadTimeSheetContent({ days, onChange, onValidChange }: Props) {
  const { search, setSearch, group, setGroup, filtered } = usePropertyFilter()

  const filledCount = Object.values(days).filter(isValidDays).length
  const allFilled = filledCount === PROPERTIES.length

  useEffect(() => {
    onValidChange(allFilled)
  }, [allFilled, onValidChange])

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs text-blue-900 leading-relaxed">
          This is the number of days before a lease expires that ELI begins renewal outreach for that property.
          We defaulted to <strong>120 days</strong> based on standard industry practice — adjust per property if your leases or strategy differ.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Per-Property Lead Time</p>
          <span className={cn(
            "text-xs tabular-nums font-medium",
            allFilled ? "text-emerald-700" : "text-muted-foreground",
          )}>
            {filledCount} / {PROPERTIES.length} set
          </span>
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
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No properties match your filter.
            </div>
          ) : (
            filtered.map((prop, idx) => {
              const val = days[prop.id] ?? ""
              const valid = isValidDays(val)
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
                  <div className="relative flex-1 flex items-center gap-2">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden />
                    <input
                      type="number"
                      min="1"
                      max="365"
                      placeholder="120"
                      value={val}
                      onChange={(e) => onChange(prop.id, e.target.value)}
                      className="w-full h-8 rounded-lg border border-border bg-white pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                    />
                    <span className="text-xs text-muted-foreground shrink-0">days</span>
                  </div>
                  <div className="w-6 shrink-0 flex justify-center">
                    {valid && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />}
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
