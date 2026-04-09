"use client"

import { useState } from "react"
import { CheckCircle2, ExternalLink, Phone, PhoneCall, Sparkles, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { PROPERTIES } from "../data/properties"

const DEFAULT_SCRIPT = `Welcome to [Property Name].

  For leasing and availability, press 1.
  For maintenance requests, press 2.
  For payments and account questions, press 3.
  To speak with a team member, press 0.

We're glad you called. Your call may be recorded for quality assurance.`

const MENU_ITEMS = [
  { key: "1", label: "Leasing & Availability",     color: "text-violet-700",  bg: "bg-violet-50 border-violet-200" },
  { key: "2", label: "Maintenance Requests",        color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  { key: "3", label: "Payments & Account",          color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  { key: "0", label: "Speak to a Team Member",      color: "text-zinc-700",    bg: "bg-zinc-50 border-zinc-200" },
]

interface Props {
  onConfirm?: () => void
}

export function IvrSetupSheetContent({ onConfirm }: Props) {
  const [scriptExpanded, setScriptExpanded] = useState(false)
  const [customized, setCustomized] = useState<Set<string>>(new Set())

  function toggleCustomize(id: string) {
    setCustomized((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id); else s.add(id)
      return s
    })
  }

  return (
    <div className="space-y-6">
      {/* What we applied */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Default IVR applied to all {PROPERTIES.length} properties</p>
            <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
              We've configured a standard phone menu for every property using the compliance numbers we just set up.
              Callers hear a consistent greeting and are routed to leasing, maintenance, payments, or staff.
            </p>
          </div>
        </div>
      </div>

      {/* Menu structure */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2.5">Default menu structure</p>
        <div className="grid grid-cols-2 gap-2">
          {MENU_ITEMS.map(({ key, label, color, bg }) => (
            <div key={key} className={cn("flex items-center gap-2.5 rounded-lg border px-3 py-2.5", bg)}>
              <div className={cn("h-6 w-6 rounded-full border bg-white flex items-center justify-center text-xs font-bold shrink-0", color.replace("text-", "border-").replace("-700", "-300"))}>
                <span className={cn("text-xs font-bold", color)}>{key}</span>
              </div>
              <span className={cn("text-xs font-medium", color)}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Full script preview (collapsible) */}
      <div className="rounded-lg border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setScriptExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Preview full greeting script</span>
          </div>
          {scriptExpanded
            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
        {scriptExpanded && (
          <div className="px-4 py-3 bg-white border-t border-border">
            <pre className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap font-sans">
              {DEFAULT_SCRIPT}
            </pre>
            <p className="text-[11px] text-muted-foreground mt-3 italic">
              [Property Name] is replaced automatically with each property's name at call time.
            </p>
          </div>
        )}
      </div>

      {/* Per-property table */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Property status</p>
          <span className="text-xs text-muted-foreground">
            {customized.size > 0 ? `${customized.size} customized` : "All using default"}
          </span>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-zinc-50">
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Property</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">IVR Status</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PROPERTIES.map((p) => {
                const isCustomized = customized.has(p.id)
                return (
                  <tr key={p.id} className="bg-white hover:bg-zinc-50 transition-colors">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-muted-foreground text-[11px]">{p.city}, {p.state}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      {isCustomized ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border border-violet-200 bg-violet-50 text-violet-700">
                          <PhoneCall className="h-2.5 w-2.5" />
                          Custom
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border border-emerald-200 bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Default applied
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => toggleCustomize(p.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {isCustomized ? "Using custom" : "Customize in Entrata"}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          "Customize in Entrata" opens the IVR settings for that property in your Entrata portal where you can record a custom greeting, adjust menu options, or set business hours.
        </p>
      </div>
    </div>
  )
}
