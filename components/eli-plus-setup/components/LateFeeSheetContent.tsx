"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Database, Sparkles, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { PROPERTIES } from "../data/properties"
import { PropertyFilter, usePropertyFilter } from "./PropertyFilter"
import {
  ENTRATA_LATE_FEE_POLICIES,
  ENTRATA_LATE_FEE_PATH,
  DEFAULT_LATE_FEE_POLICY,
} from "../data/entrata-imports"

export type LateFeeState = Record<string, string>

export function makeDefaultLateFeePolicy(): LateFeeState {
  const state: LateFeeState = {}
  for (const prop of PROPERTIES) {
    state[prop.id] = ENTRATA_LATE_FEE_POLICIES[prop.id] ?? DEFAULT_LATE_FEE_POLICY
  }
  return state
}

const entrataCount = Object.keys(ENTRATA_LATE_FEE_POLICIES).length
const defaultCount = PROPERTIES.length - entrataCount

interface Props {
  policies: LateFeeState
  onChange: (propId: string, val: string) => void
  onValidChange: (valid: boolean) => void
}

export function LateFeeSheetContent({ policies, onChange, onValidChange }: Props) {
  const { search, setSearch, group, setGroup, filtered } = usePropertyFilter()

  const filledCount = PROPERTIES.filter(p => (policies[p.id] ?? "").trim().length >= 10).length
  const allFilled = filledCount === PROPERTIES.length

  useEffect(() => {
    onValidChange(allFilled)
  }, [allFilled, onValidChange])

  return (
    <div className="space-y-4">
      {/* Source banner */}
      <div className="flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5">
        <Database className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs text-indigo-800 leading-relaxed">
          <strong>{entrataCount} properties</strong> have late fee policy language pulled from{" "}
          <span className="font-medium">{ENTRATA_LATE_FEE_PATH}</span>.{" "}
          The remaining <strong>{defaultCount} properties</strong> have a standard default applied.
          Review and adjust any that don't match your lease agreements.
        </p>
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
        {filtered.map(prop => {
          const text = policies[prop.id] ?? ""
          const fromEntrata = !!ENTRATA_LATE_FEE_POLICIES[prop.id]
          const filled = text.trim().length >= 10

          return (
            <div key={prop.id} className="rounded-xl border border-border bg-white overflow-hidden">
              {/* Property header */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60 bg-zinc-50/60">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{prop.name}</p>
                  <p className="text-xs text-muted-foreground">{prop.city}, {prop.state}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {fromEntrata ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border border-indigo-200 bg-indigo-50 text-indigo-700">
                      <Database className="h-2.5 w-2.5" aria-hidden />
                      From Entrata
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border border-blue-200 bg-blue-50 text-blue-700">
                      <Sparkles className="h-2.5 w-2.5" aria-hidden />
                      Default
                    </span>
                  )}
                  {filled && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />
                  )}
                </div>
              </div>

              {/* Policy textarea */}
              <div className="px-4 py-3">
                <textarea
                  value={text}
                  onChange={e => onChange(prop.id, e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-zinc-900/20 resize-none leading-relaxed"
                  placeholder="Enter late fee policy language for this property…"
                />
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm font-medium text-foreground">No properties match</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different search or group.</p>
          </div>
        )}
      </div>

      {/* Progress footer */}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all"
            style={{ width: `${(filledCount / PROPERTIES.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
          {filledCount}/{PROPERTIES.length} properties
        </span>
      </div>
    </div>
  )
}
