"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { CheckCircle2, ChevronDown } from "lucide-react"
import { PROPERTIES } from "../data/properties"
import { PropertyFilter, usePropertyFilter } from "./PropertyFilter"

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => String(i + 1))

function toOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

const DAY_DISPLAY = Object.fromEntries(DAY_OPTIONS.map((v) => [v, toOrdinal(Number(v))]))

interface Props {
  label: string
  onValidChange: (valid: boolean) => void
  /** Pre-fill all properties with this day value (e.g. "1", "6") when a default has been applied */
  defaultDay?: string
}

export function DateSettingSheetContent({ label, onValidChange, defaultDay }: Props) {
  const [bulkValue, setBulkValue] = useState(defaultDay ?? "")
  const [applied, setApplied] = useState(!!defaultDay)
  const [perProperty, setPerProperty] = useState<Record<string, string>>(
    Object.fromEntries(PROPERTIES.map((p) => [p.id, defaultDay ?? ""])),
  )
  const { search, setSearch, group, setGroup, filtered } = usePropertyFilter()

  useEffect(() => {
    const anySet = Object.values(perProperty).some((v) => v !== "")
    onValidChange(anySet)
  }, [perProperty, onValidChange])

  function applyBulk() {
    if (!bulkValue) return
    setPerProperty(Object.fromEntries(PROPERTIES.map((p) => [p.id, bulkValue])))
    setApplied(true)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Bulk apply */}
      <div className="rounded-xl border border-border bg-white p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Apply to All Properties</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Set one value and push it to every property in your portfolio.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <select
              value={bulkValue}
              onChange={(e) => { setBulkValue(e.target.value); setApplied(false) }}
              className="h-9 appearance-none rounded-lg border border-border bg-white pl-3 pr-9 text-sm text-foreground w-40 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
            >
              <option value="">Day of month</option>
              {DAY_OPTIONS.map((v) => (
                <option key={v} value={v}>{DAY_DISPLAY[v]}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          </div>
          <button
            type="button"
            disabled={!bulkValue}
            onClick={applyBulk}
            className="h-9 px-4 rounded-lg bg-zinc-900 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors"
          >
            Apply to All
          </button>
          {!bulkValue && (
            <span className="text-xs text-muted-foreground">Select a day above to apply to all properties.</span>
          )}
          {applied && (
            <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              {defaultDay && bulkValue === defaultDay ? `Default (${DAY_DISPLAY[defaultDay]}) applied to ${PROPERTIES.length} properties` : `${DAY_DISPLAY[bulkValue] ?? bulkValue} applied to ${PROPERTIES.length} properties`}
            </span>
          )}
        </div>
      </div>

      {/* Per-property overrides */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Per-Property Override</p>
        <p className="text-xs text-muted-foreground">Customize individual properties if needed.</p>

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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-zinc-50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Property</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Location</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{label}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((prop, idx) => (
                  <tr
                    key={prop.id}
                    className={cn(
                      "border-b border-border last:border-0",
                      idx % 2 === 0 ? "bg-white" : "bg-zinc-50/50",
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{prop.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{prop.city}, {prop.state}</td>
                    <td className="px-4 py-3">
                    <div className="relative">
                      <select
                        value={perProperty[prop.id]}
                        onChange={(e) =>
                          setPerProperty((prev) => ({ ...prev, [prop.id]: e.target.value }))
                        }
                        className="h-8 appearance-none rounded-lg border border-border bg-white pl-2 pr-8 text-sm text-foreground w-24 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                      >
                        <option value="">—</option>
                        {DAY_OPTIONS.map((v) => (
                          <option key={v} value={v}>{DAY_DISPLAY[v]}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" aria-hidden />
                    </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
