"use client"

import { useEffect } from "react"
import { Phone, Info, CheckCircle2, Database } from "lucide-react"
import { cn } from "@/lib/utils"
import { PROPERTIES } from "../data/properties"
import { PropertyFilter, usePropertyFilter } from "./PropertyFilter"

export function isValidPhone(v: string) { return v.replace(/\D/g, "").length === 10 }

export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10)
  if (digits.length < 4) return digits
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

export function makeEmptyPhones(): Record<string, string> {
  return Object.fromEntries(PROPERTIES.map((p) => [p.id, ""]))
}

interface Props {
  context: "during" | "after"
  phones: Record<string, string>
  onChange: (id: string, val: string) => void
  /** fires with true only when every property has a valid number */
  onValidChange: (valid: boolean) => void
  /** Values that were pre-populated from existing Entrata settings */
  entrataValues?: Record<string, string>
  /** Human-readable path in Entrata where these values were found */
  entrataPath?: string
}

export function PhoneNumberSheetContent({ context, phones, onChange, onValidChange, entrataValues, entrataPath }: Props) {
  const { search, setSearch, group, setGroup, filtered } = usePropertyFilter()

  const filledCount = Object.values(phones).filter(isValidPhone).length
  const allFilled = filledCount === PROPERTIES.length
  const entrataCount = entrataValues ? Object.keys(entrataValues).length : 0

  useEffect(() => {
    onValidChange(allFilled)
  }, [allFilled, onValidChange])

  const description = context === "during"
    ? "The phone number ELI connects residents to while a maintenance escalation is actively in progress. Each property must have its own dedicated emergency line."
    : "The phone number ELI uses for follow-up contacts after a maintenance escalation has been resolved. Typically each property's main office or maintenance line."

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
        <Info className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs text-zinc-700 leading-relaxed">{description}</p>
      </div>

      {entrataCount > 0 && entrataPath && (
        <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <Database className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" aria-hidden />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-indigo-900">
              {entrataCount} values pulled from your Entrata settings
            </p>
            <p className="text-xs text-indigo-700 leading-relaxed">
              Found in <span className="font-medium">{entrataPath}</span>. Review these are still current before saving.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Per-Property Phone Numbers</p>
          <span className={cn(
            "text-xs tabular-nums font-medium",
            allFilled ? "text-emerald-700" : "text-muted-foreground",
          )}>
            {filledCount} / {PROPERTIES.length} entered
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

        {!allFilled && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            All {PROPERTIES.length} properties need a number before this item can be marked complete. You can save progress and come back.
          </p>
        )}

        <div className="rounded-xl border border-border overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No properties match your filter.
            </div>
          ) : (
            filtered.map((prop, idx) => {
              const val = phones[prop.id] ?? ""
              const valid = isValidPhone(val)
              const fromEntrata = entrataValues?.[prop.id] !== undefined
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
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden />
                    <input
                      type="tel"
                      placeholder="(555) 000-0000"
                      value={val}
                      onChange={(e) => onChange(prop.id, formatPhone(e.target.value))}
                      className={cn(
                        "w-full h-8 rounded-lg border bg-white pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2",
                        fromEntrata && valid
                          ? "border-indigo-300 focus:ring-indigo-400/30"
                          : "border-border focus:ring-zinc-900/20",
                      )}
                    />
                  </div>
                  <div className="w-28 shrink-0 flex justify-end">
                    {fromEntrata && valid ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 whitespace-nowrap">
                        <Database className="h-2.5 w-2.5" aria-hidden />
                        From Entrata
                      </span>
                    ) : valid ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                    ) : null}
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
