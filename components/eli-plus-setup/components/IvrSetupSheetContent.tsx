import { useState, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { CheckCircle2, Phone, ChevronDown, ChevronUp, AlertTriangle, Search, X, CornerDownRight, ArrowRight } from "lucide-react"
import { PROPERTIES } from "../data/properties"

interface SubMenuOption {
  id: string
  press: number
  title: string
  action: string
}

interface IvrOption {
  id: string
  press: number
  title: string
  action: string
  subMenu?: SubMenuOption[]
}

const DEFAULT_IVR: IvrOption[] = [
  {
    id: "d1", press: 1, title: "Leasing", action: "Send to Secondary Menu",
    subMenu: [
      { id: "d1s1", press: 1, title: "Text Assistant", action: "Forward to Leasing AI" },
      { id: "d1s2", press: 2, title: "Voice Assistant", action: "Forward to Leasing AI" },
    ],
  },
  {
    id: "d2", press: 2, title: "Resident for Work Order", action: "Send to Secondary Menu",
    subMenu: [
      { id: "d2s1", press: 1, title: "Emergency Work Order", action: "Forward as Resident – Maintenance Emergency" },
      { id: "d2s2", press: 2, title: "Work Order", action: "Forward to Maintenance AI" },
    ],
  },
  { id: "d3", press: 3, title: "Resident Non Work Order", action: "Forward as Resident – Non-Maintenance" },
  { id: "d4", press: 4, title: "Other", action: "Forward as Resident – Non-Maintenance" },
  { id: "d5", press: 5, title: "Repeat", action: "Repeat Options" },
]

/* ── Preferred preview table ────────────────────────────────── */

function PreferredPreview({ options, expanded, onToggle }: { options: IvrOption[]; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span className="text-sm font-semibold text-foreground">Preferred Menu Preview</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-b border-border bg-zinc-50/50">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-16">Press</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Title</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {options.map((opt, optIdx) => (
              <>
                <tr
                  key={opt.id}
                  className={cn("border-b border-border bg-white", optIdx === options.length - 1 && !opt.subMenu && "border-0")}
                >
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-zinc-100 text-xs font-semibold text-foreground">{opt.press}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{opt.title}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{opt.action}</td>
                </tr>
                {opt.subMenu?.map((sub, subIdx) => (
                  <tr
                    key={sub.id}
                    className={cn("border-b border-border bg-zinc-50", optIdx === options.length - 1 && subIdx === (opt.subMenu?.length ?? 0) - 1 && "border-0")}
                  >
                    <td className="px-4 py-2.5 pl-8">
                      <div className="flex items-center gap-1.5">
                        <CornerDownRight className="h-3 w-3 text-zinc-400" aria-hidden />
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-zinc-200 text-[10px] font-semibold text-zinc-600">{sub.press}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-zinc-600">{sub.title}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{sub.action}</td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* ── Mode selector ───────────────────────────────────────────── */

function ModeSelector({ mode, setMode, preferredExpanded, onTogglePreferred, preferredExtra }: {
  mode: "preferred" | "custom" | "thirdparty"
  setMode: (m: "preferred" | "custom" | "thirdparty") => void
  preferredExpanded: boolean
  onTogglePreferred: () => void
  preferredExtra?: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        <button type="button" onClick={() => setMode("preferred")} className={cn("rounded-xl border p-4 text-left transition-all", mode === "preferred" ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900" : "border-border bg-white hover:border-zinc-400")}>
          <div className="flex items-start gap-3">
            <div className={cn("mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0", mode === "preferred" ? "border-zinc-900" : "border-zinc-300")}>
              {mode === "preferred" && <div className="h-2 w-2 rounded-full bg-zinc-900" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">Use Preferred Entrata IVR</p>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" aria-hidden />
                  Recommended
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Two-level menu optimized for leasing, maintenance, and resident calls. Routes directly to Leasing AI and Maintenance AI — no manual per-property setup needed.</p>
              {mode === "preferred" && (
                <div className="mt-3 space-y-4">
                  <PreferredPreview options={DEFAULT_IVR} expanded={preferredExpanded} onToggle={onTogglePreferred} />
                  {preferredExtra}
                </div>
              )}
            </div>
          </div>
        </button>

        <button type="button" onClick={() => setMode("custom")} className={cn("rounded-xl border p-4 text-left transition-all", mode === "custom" ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900" : "border-border bg-white hover:border-zinc-400")}>
          <div className="flex items-start gap-3">
            <div className={cn("mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0", mode === "custom" ? "border-zinc-900" : "border-zinc-300")}>
              {mode === "custom" && <div className="h-2 w-2 rounded-full bg-zinc-900" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">Use Existing Entrata IVR</p>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  Not Recommended
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Already have an IVR set up in Entrata? Use this option to update your existing IVR routing for your AI products.</p>
              {mode === "custom" && (
                <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Manual IVR Configuration Required</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">Each property has unique AI forwarding numbers. Navigate back to the Communications tab under ELI+ Setup to find the assigned numbers, then manually add them as forwarding destinations in your existing IVR.</p>
                  <div className="border-t border-zinc-100 pt-3 space-y-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); window.open("#", "_blank") }}
                      className={cn(buttonVariants({ variant: "eli", size: "sm" }), "w-full justify-center shadow-sm")}
                    >
                      Open Existing IVR Settings
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <p className="text-[10px] text-muted-foreground text-center">
                      Company › Communication › Call Handling › Call Menu
                    </p>
                  </div>
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      <strong>Heads up:</strong> This option requires you to manually update the IVR configuration for each property. This may prolong your implementation timeline.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </button>

        <button type="button" onClick={() => setMode("thirdparty")} className={cn("rounded-xl border p-4 text-left transition-all", mode === "thirdparty" ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900" : "border-border bg-white hover:border-zinc-400")}>
          <div className="flex items-start gap-3">
            <div className={cn("mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0", mode === "thirdparty" ? "border-zinc-900" : "border-zinc-300")}>
              {mode === "thirdparty" && <div className="h-2 w-2 rounded-full bg-zinc-900" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">Use 3rd Party IVR</p>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  Not Recommended
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">If you're not using an Entrata IVR and have an existing 3rd party IVR provider, select this option to configure integration with your external system.</p>
              {mode === "thirdparty" && (
                <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Manual 3rd Party IVR Configuration Required</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">Each property has unique AI forwarding numbers. Navigate back to the Communications tab under ELI+ Setup to find the assigned numbers, then manually add them as forwarding destinations in your 3rd party IVR.</p>
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      <strong>Heads up:</strong> This option requires you to manually update your 3rd party IVR configuration for each property. This may prolong your implementation timeline.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

/* ── Main export ─────────────────────────────────────────────── */

interface Props {
  onValidChange: (valid: boolean) => void
}

export function IvrSetupSheetContent({ onValidChange }: Props) {
  const [mode, setModeRaw] = useState<"preferred" | "custom" | "thirdparty">("preferred")
  const [preferredExpanded, setPreferredExpanded] = useState(false)

  const setMode = (m: "preferred" | "custom" | "thirdparty") => {
    if (m !== "preferred") setPreferredExpanded(false)
    setModeRaw(m)
  }

  // Property assignment (only relevant for preferred mode)
  const [assignmentMode, setAssignmentMode] = useState<"all" | "selected">("all")
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])
  const [propertySearch, setPropertySearch] = useState("")
  const [activeGroup, setActiveGroup] = useState("All")

  const propertyGroups = useMemo(() => ["All", ...new Set(PROPERTIES.map((p) => p.group))], [])

  const filteredProperties = useMemo(() => {
    const q = propertySearch.trim().toLowerCase()
    return PROPERTIES.filter((p) => {
      const matchGroup = activeGroup === "All" || p.group === activeGroup
      const matchQuery = q.length === 0 || p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q) || p.state.toLowerCase().includes(q) || p.group.toLowerCase().includes(q)
      return matchGroup && matchQuery
    })
  }, [activeGroup, propertySearch])

  const selectedProperties = useMemo(() => PROPERTIES.filter((p) => selectedPropertyIds.includes(p.id)), [selectedPropertyIds])

  useEffect(() => {
    if (mode === "custom" || mode === "thirdparty") {
      onValidChange(true)
      return
    }
    const assignValid = assignmentMode === "all" || selectedPropertyIds.length > 0
    onValidChange(assignValid)
  }, [mode, assignmentMode, selectedPropertyIds, onValidChange])

  function toggleProperty(id: string) {
    setSelectedPropertyIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Choose your go-live routing</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pick how calls should be handled when your AI products activate. You can change this later.
        </p>
      </div>

      <ModeSelector
        mode={mode}
        setMode={setMode}
        preferredExpanded={preferredExpanded}
        onTogglePreferred={() => setPreferredExpanded((v) => !v)}
        preferredExtra={
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Property Assignment</p>
              <p className="text-xs text-muted-foreground mt-0.5">Choose whether this IVR should apply to every property or only a selected set.</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button type="button" onClick={() => setAssignmentMode("all")} className={cn("rounded-xl border p-4 text-left transition-all", assignmentMode === "all" ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900" : "border-border bg-white hover:border-zinc-400")}>
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0", assignmentMode === "all" ? "border-zinc-900" : "border-zinc-300")}>
                    {assignmentMode === "all" && <div className="h-2 w-2 rounded-full bg-zinc-900" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Apply to All Properties</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Use one IVR configuration across your full portfolio.</p>
                  </div>
                </div>
              </button>

              <button type="button" onClick={() => setAssignmentMode("selected")} className={cn("rounded-xl border p-4 text-left transition-all", assignmentMode === "selected" ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900" : "border-border bg-white hover:border-zinc-400")}>
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0", assignmentMode === "selected" ? "border-zinc-900" : "border-zinc-300")}>
                    {assignmentMode === "selected" && <div className="h-2 w-2 rounded-full bg-zinc-900" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Assign to Selected Properties</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Pick the communities that should use this IVR.</p>
                  </div>
                </div>
              </button>
            </div>

            {assignmentMode === "selected" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Selected Properties</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{selectedProperties.length} selected</p>
                    </div>
                    {selectedProperties.length > 0 && (
                      <button type="button" onClick={() => setSelectedPropertyIds([])} className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors">Clear All</button>
                    )}
                  </div>

                  {selectedProperties.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedProperties.map((p) => (
                        <span key={p.id} className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-foreground">
                          {p.name}
                          <button type="button" onClick={() => toggleProperty(p.id)} className="rounded-full text-zinc-400 hover:text-zinc-900 transition-colors" aria-label={`Remove ${p.name}`}>
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-4 text-xs text-muted-foreground">No properties selected yet.</div>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-white p-4 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
                    <input type="text" value={propertySearch} onChange={(e) => setPropertySearch(e.target.value)} placeholder="Search by property, city, or state" className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20" />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {propertyGroups.map((g) => (
                      <button key={g} type="button" onClick={() => setActiveGroup(g)} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", activeGroup === g ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-900")}>
                        {g}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="max-h-72 overflow-y-auto">
                      {filteredProperties.length > 0 ? (
                        <ul className="divide-y divide-border">
                          {filteredProperties.map((p) => {
                            const sel = selectedPropertyIds.includes(p.id)
                            return (
                              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{p.city}</span>
                                    <span className="text-zinc-300">•</span>
                                    <span>{p.group}</span>
                                  </div>
                                </div>
                                <button type="button" onClick={() => toggleProperty(p.id)} className={cn("shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors", sel ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-900")}>
                                  {sel ? "Selected" : "Add"}
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      ) : (
                        <div className="px-4 py-8 text-center text-xs text-muted-foreground">No properties match your current search.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        }
      />
    </div>
  )
}
