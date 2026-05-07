"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { CheckCircle2 } from "lucide-react"
import { PROPERTIES } from "../data/properties"
import { PropertyFilter, usePropertyFilter } from "./PropertyFilter"

interface Props {
  onValidChange: (valid: boolean) => void
}

export function AddressRecipientSheetContent({ onValidChange }: Props) {
  const [bulkValue, setBulkValue] = useState("")
  const [applied, setApplied] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(PROPERTIES.map((p) => [p.id, ""])),
  )
  const { search, setSearch, group, setGroup, filtered } = usePropertyFilter()

  useEffect(() => {
    onValidChange(Object.values(values).some((v) => v.trim() !== ""))
  }, [values, onValidChange])

  function applyBulk() {
    if (!bulkValue.trim()) return
    setValues(Object.fromEntries(PROPERTIES.map((p) => [p.id, bulkValue.trim()])))
    setApplied(true)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-xl border border-border bg-white p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Apply One Recipient to All Properties</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enter the entity name residents should make money orders payable to, or customize per property below.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="e.g. Acme Residential LLC"
            value={bulkValue}
            onChange={(e) => { setBulkValue(e.target.value); setApplied(false) }}
            className="flex-1 min-w-[200px] h-9 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          />
          <button
            type="button"
            disabled={!bulkValue.trim()}
            onClick={applyBulk}
            className="h-9 px-4 rounded-lg bg-zinc-900 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors whitespace-nowrap"
          >
            Apply to All
          </button>
          {!bulkValue.trim() && (
            <span className="text-xs text-muted-foreground">Enter a name above to apply to all properties.</span>
          )}
        </div>
        {applied && (
          <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Applied to {PROPERTIES.length} properties
          </span>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Per-Property Recipients</p>

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
            filtered.map((prop, idx) => (
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
                  <input
                    type="text"
                    placeholder="Payable to…"
                    value={values[prop.id]}
                    onChange={(e) => setValues((prev) => ({ ...prev, [prop.id]: e.target.value }))}
                    className="w-full h-8 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                  {values[prop.id] && (
                    <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-600" aria-hidden />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
