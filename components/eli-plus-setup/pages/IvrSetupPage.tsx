"use client"

import { Fragment, useState, useEffect, useRef } from "react"
import type { PageId } from "../index"
import { cn } from "@/lib/utils"
import {
  Phone,
  CornerDownRight,
  TrendingDown,
  Users,
  PhoneOff,
  AlertTriangle,
  Voicemail,
  ArrowRight,
  Info,
  CheckCircle2,
  EyeOff,
  X,
  ExternalLink,
  Copy,
} from "lucide-react"

export type IvrChoice = null | "preferred" | "existing" | "thirdparty"

// ── Types & data ───────────────────────────────────────────────────────────────

type PropertyIvrMode = "entrata" | "custom" | "thirdparty"

interface IvrProperty {
  name:          string
  units:         number
  defaultMode:   PropertyIvrMode
  defaultReason: string
  hasCustom?:    boolean
  isLive?:       boolean
  // AI forwarding numbers from Communications tab — shown when 3rd Party IVR is selected
  leasingVoiceNumber?: string
  leasingSmsNumber?:   string
  maintenanceNumber?:  string
}

const IVR_PROPERTIES: IvrProperty[] = [
  { name: "Sunset Ridge Apartments",  units: 240, defaultMode: "entrata",    defaultReason: "No existing IVR detected on contract.",                                leasingVoiceNumber: "(801) 555-0101", leasingSmsNumber: "(801) 555-0102", maintenanceNumber: "(801) 555-0103" },
  { name: "The Reserve at Millcreek", units: 180, defaultMode: "entrata",    defaultReason: "No existing IVR detected on contract.",                                leasingVoiceNumber: "(801) 555-0104", leasingSmsNumber: "(801) 555-0105", maintenanceNumber: "(801) 555-0106" },
  { name: "Parkside Lofts",           units: 96,  defaultMode: "custom",     defaultReason: "An existing Entrata IVR customization was detected on this property.", leasingVoiceNumber: "(801) 555-0107", leasingSmsNumber: "(801) 555-0108", maintenanceNumber: "(801) 555-0109", hasCustom: true },
  { name: "University Commons",       units: 320, defaultMode: "entrata",    defaultReason: "No existing IVR detected on contract.",                                leasingVoiceNumber: "(801) 555-0110", leasingSmsNumber: "(801) 555-0111", maintenanceNumber: "(801) 555-0112" },
  { name: "Campus Edge",              units: 200, defaultMode: "thirdparty", defaultReason: "An external (non-Entrata) IVR system was detected on this property.",  leasingVoiceNumber: "(801) 555-0113", leasingSmsNumber: "(801) 555-0114", maintenanceNumber: "(801) 555-0115", hasCustom: true },
  { name: "Oakwood Terrace",          units: 150, defaultMode: "entrata",    defaultReason: "No existing IVR detected on contract.",                                leasingVoiceNumber: "(801) 555-0116", leasingSmsNumber: "(801) 555-0117", maintenanceNumber: "(801) 555-0118" },
  { name: "Heritage Place",           units: 88,  defaultMode: "entrata",    defaultReason: "No existing IVR detected on contract.",                                leasingVoiceNumber: "(801) 555-0119", leasingSmsNumber: "(801) 555-0120", maintenanceNumber: "(801) 555-0121" },
  { name: "Metro Business Center",    units: 45,  defaultMode: "custom",     defaultReason: "Existing 3rd-party phone system detected.",                            leasingVoiceNumber: "(801) 555-0122", leasingSmsNumber: "(801) 555-0123", maintenanceNumber: "(801) 555-0124", hasCustom: true, isLive: true },
]


// ── Copy-to-clipboard chip ─────────────────────────────────────────────────────

function useCopy(value: string) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return { copied, copy }
}

// Compact stacked chip (not currently used but kept for reference)
function CopyChip({ label, value }: { label: string; value: string }) {
  const { copied, copy } = useCopy(value)
  return (
    <button type="button" onClick={copy}
      className="flex flex-col items-start gap-0.5 rounded-lg border border-border bg-white px-3 py-2 hover:border-zinc-400 hover:bg-zinc-50 transition-colors group min-w-[160px]"
    >
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] font-semibold text-foreground tabular-nums">{value}</span>
        <span className={cn("text-[10px] font-medium transition-colors", copied ? "text-emerald-600" : "text-muted-foreground/40 group-hover:text-muted-foreground")}>
          {copied ? "Copied!" : "Copy"}
        </span>
      </div>
    </button>
  )
}

// Wide chip — label left, number + copy icon right, fills grid column
function CopyChipWide({ label, value, notContracted = false, onCopy }: {
  label: string; value: string; notContracted?: boolean; onCopy?: () => void
}) {
  const { copied, copy } = useCopy(value)
  const handleCopy = () => { copy(); onCopy?.() }
  return (
    <div className="flex items-center justify-between gap-3 w-full rounded-lg border border-border bg-white px-3 py-2.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {notContracted ? (
        <span className="text-[11px] text-muted-foreground/60 italic">Not contracted</span>
      ) : (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[13px] text-foreground tabular-nums">{value}</span>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "flex items-center justify-center h-5 w-5 rounded transition-colors",
              copied ? "text-emerald-600" : "text-muted-foreground/40 hover:text-muted-foreground",
            )}
            title={copied ? "Copied!" : "Copy"}
          >
            {copied
              ? <CheckCircle2 className="h-3.5 w-3.5" />
              : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
    </div>
  )
}

// ── IVR menu data ──────────────────────────────────────────────────────────────

interface SubMenuOption { id: string; press: number; title: string; action: string }
interface IvrOption { id: string; press: number; title: string; action: string; subMenu?: SubMenuOption[] }

const DEFAULT_IVR: IvrOption[] = [
  {
    id: "d1", press: 1, title: "Leasing", action: "Send to Secondary Menu",
    subMenu: [
      { id: "d1s1", press: 1, title: "Text Assistant",  action: "Forward to Leasing AI" },
      { id: "d1s2", press: 2, title: "Voice Assistant", action: "Forward to Leasing AI" },
    ],
  },
  { id: "d2", press: 2, title: "Resident for Work Order", action: "Forward to Maintenance AI" },
  { id: "d3", press: 3, title: "Resident Non Work Order", action: "Forward as Resident – Non-Maintenance" },
  { id: "d4", press: 4, title: "Other",                   action: "Forward as Resident – Non-Maintenance" },
  { id: "d5", press: 5, title: "Repeat",                  action: "Repeat Options" },
]

// ── Info popover (click-to-expand) ─────────────────────────────────────────────

function InfoPopover({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen]   = useState(false)
  const [pos, setPos]     = useState<{ top: number; left: number } | null>(null)
  const btnRef            = useRef<HTMLButtonElement>(null)
  const popRef            = useRef<HTMLDivElement>(null)

  const openPopover = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 8, left: r.left })
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => open ? setOpen(false) : openPopover()}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
          open
            ? "border-zinc-800 bg-zinc-900 text-white"
            : "border-border bg-white text-muted-foreground hover:border-zinc-400 hover:text-foreground",
        )}
        aria-expanded={open}
      >
        <Info className="h-3 w-3" />
        {label}
      </button>

      {open && pos && (
        <div
          ref={popRef}
          className="fixed z-[9999] w-[520px] rounded-xl border border-border bg-white shadow-2xl"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="text-xs font-semibold text-foreground">{label}</p>
            <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto px-4 py-3 text-xs text-muted-foreground leading-relaxed">
            {children}
          </div>
        </div>
      )}
    </>
  )
}

// ── Inline hover trigger — "Default IVR Menu ℹ" opens menu popover on hover ───

function IvrMenuTrigger() {
  const [open, setOpen] = useState(false)
  const [pos, setPos]   = useState<{ top: number; left: number } | null>(null)
  const triggerRef      = useRef<HTMLSpanElement>(null)

  const openPopover = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, left: Math.max(8, r.left - 180) })
    }
    setOpen(true)
  }

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={openPopover}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center gap-0.5 cursor-default"
      >
        <strong className="font-semibold text-foreground">Default IVR Menu</strong>
        <Info className="inline h-3 w-3 text-muted-foreground" />
      </span>
      {open && pos && (
        <div
          className="fixed z-[9999] w-[480px] rounded-xl border border-border bg-white shadow-2xl pointer-events-none"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="border-b border-border px-4 py-2.5">
            <p className="text-xs font-semibold text-foreground">Default IVR Menu</p>
          </div>
          <div className="px-4 py-3 text-xs text-muted-foreground leading-relaxed">
            <p className="mb-3">
              When a property uses <strong className="text-foreground">Default IVR</strong>, callers hear a
              two-level menu optimized for leasing, maintenance, and resident calls — routing directly to
              Leasing AI and Maintenance AI.
            </p>
            <MenuPreviewTable />
          </div>
        </div>
      )}
    </>
  )
}

// ── IVR menu preview (used inside popover) ─────────────────────────────────────

function MenuPreviewTable() {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border">
          <th className="text-left pb-2 text-xs font-semibold text-muted-foreground w-16">Press</th>
          <th className="text-left pb-2 text-xs font-semibold text-muted-foreground">Option</th>
          <th className="text-left pb-2 text-xs font-semibold text-muted-foreground">Routes to</th>
        </tr>
      </thead>
      <tbody>
        {DEFAULT_IVR.map((opt) => (
          <Fragment key={opt.id}>
            <tr className="border-b border-border/50">
              <td className="py-2.5">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-zinc-100 text-xs font-bold text-foreground">{opt.press}</span>
              </td>
              <td className="py-2.5 font-medium text-foreground pr-6">{opt.title}</td>
              <td className="py-2.5 text-muted-foreground">{opt.action}</td>
            </tr>
            {opt.subMenu?.map(sub => (
              <tr key={sub.id} className="border-b border-border/30 bg-zinc-50/60">
                <td className="py-2 pl-4">
                  <div className="flex items-center gap-1">
                    <CornerDownRight className="h-3 w-3 text-zinc-400" />
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-zinc-200 text-[10px] font-semibold text-zinc-600">{sub.press}</span>
                  </div>
                </td>
                <td className="py-2 text-zinc-600">{sub.title}</td>
                <td className="py-2 text-muted-foreground">{sub.action}</td>
              </tr>
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

interface Props {
  navigate: (to: PageId) => void
  ivrChoice: IvrChoice
  onSave: (choice: IvrChoice) => void
  showToast?: (msg: string) => void
  onActionCountChange?: (n: number) => void
}

export function IvrSetupPage({ onSave, showToast, onActionCountChange }: Props) {
  const [modes, setModes] = useState<Record<string, PropertyIvrMode>>(
    Object.fromEntries(IVR_PROPERTIES.map(p => [p.name, p.defaultMode]))
  )
  const [myIvrDone, setMyIvrDone]                           = useState<Record<string, boolean>>({})
  const [thirdPartyAcknowledged, setThirdPartyAcknowledged] = useState<Record<string, boolean>>({})
  const [hasCopied, setHasCopied]                           = useState<Record<string, boolean>>({})
  const [showLive, setShowLive]                             = useState(false)
  // Warning dialog — holds the pending mode change until the user confirms
  const [pendingChange, setPendingChange] = useState<{ propName: string; mode: PropertyIvrMode } | null>(null)

  // Mark complete on mount — defaults already applied
  useEffect(() => { onSave("preferred") }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const active      = IVR_PROPERTIES.filter(p => !p.isLive)
  const live        = IVR_PROPERTIES.filter(p => p.isLive)
  const visible     = showLive ? IVR_PROPERTIES : active
  // Warning shown when any active property uses Custom or 3rd Party IVR
  const customCount  = active.filter(p => modes[p.name] === "custom" || modes[p.name] === "thirdparty").length
  // Pending = custom not done OR 3rd party not acknowledged
  const pendingCount = active.filter(p =>
    (modes[p.name] === "custom" && !myIvrDone[p.name]) ||
    (modes[p.name] === "thirdparty" && !thirdPartyAcknowledged[p.name])
  ).length

  // Report pending count to parent → drives sidebar badge
  useEffect(() => { onActionCountChange?.(pendingCount) }, [pendingCount, onActionCountChange])

  const MODE_LABELS: Record<PropertyIvrMode, string> = {
    entrata: "Default IVR", custom: "Custom IVR", thirdparty: "3rd Party IVR",
  }

  // Apply the mode change (called after warning confirmation)
  const changeMode = (name: string, mode: PropertyIvrMode) => {
    setModes(prev => ({ ...prev, [name]: mode }))
    if (mode !== "custom")     setMyIvrDone(prev => ({ ...prev, [name]: false }))
    if (mode !== "thirdparty") setThirdPartyAcknowledged(prev => ({ ...prev, [name]: false }))
    showToast?.(`IVR routing updated to ${MODE_LABELS[mode]} for ${name}`)
  }

  // Request a mode change — shows warning dialog if the user is switching away from current mode
  const requestModeChange = (name: string, mode: PropertyIvrMode) => {
    if (mode === modes[name]) return // no-op if same
    setPendingChange({ propName: name, mode })
  }

  const confirmChange = () => {
    if (!pendingChange) return
    changeMode(pendingChange.propName, pendingChange.mode)
    setPendingChange(null)
  }

  const markMyIvrDone = (name: string) => {
    setMyIvrDone(prev => ({ ...prev, [name]: true }))
    showToast?.(`IVR Settings confirmed for ${name}`)
  }

  const acknowledgeThirdParty = (name: string) => {
    setThirdPartyAcknowledged(prev => ({ ...prev, [name]: true }))
    showToast?.(`3rd Party IVR confirmed for ${name}`)
  }

  // Row status: default = always done; custom/3rd party = done only when explicitly confirmed
  const isRowDone = (prop: IvrProperty) => {
    if (prop.isLive) return true
    const mode = modes[prop.name]
    if (mode === "entrata")    return true
    if (mode === "custom")     return !!myIvrDone[prop.name]
    if (mode === "thirdparty") return !!thirdPartyAcknowledged[prop.name]
    return false
  }

  return (
    <div className="flex flex-col min-h-full bg-stone-50">
      <div className="flex-1 w-full max-w-5xl p-6 md:p-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">IVR Setup</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Review how calls will be routed for each property at go-live.
                We've applied defaults based on your contract — change any property if needed.
              </p>
            </div>
            <button
              type="button"
              onClick={() => showToast?.("Opening IVR Settings…")}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
            >
              Open IVR Settings
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* Demo simulation controls */}
          <div className="shrink-0 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 text-[11px]">
            <p className="font-semibold text-muted-foreground mb-2 uppercase tracking-wide text-[10px]">Demo controls</p>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const customDone: Record<string, boolean> = {}
                  const tpDone: Record<string, boolean> = {}
                  IVR_PROPERTIES.filter(p => !p.isLive).forEach(p => {
                    if (modes[p.name] === "custom")     customDone[p.name] = true
                    if (modes[p.name] === "thirdparty") tpDone[p.name] = true
                  })
                  setMyIvrDone(prev => ({ ...prev, ...customDone }))
                  setThirdPartyAcknowledged(prev => ({ ...prev, ...tpDone }))
                  showToast?.("Simulated: user completed IVR setup across all properties")
                }}
                className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-zinc-50 transition-colors text-left"
              >
                ✓ Simulate IVR setup complete
              </button>
              <button
                type="button"
                onClick={() => {
                  setMyIvrDone({})
                  setThirdPartyAcknowledged({})
                  setHasCopied({})
                  showToast?.("Demo reset")
                }}
                className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-zinc-50 transition-colors text-left"
              >
                ↺ Reset demo
              </button>
            </div>
          </div>
        </div>

        {/* ── Warning — separate container, disappears when no custom IVR ── */}
        {customCount > 0 && (
          <div className="rounded-xl border-2 border-amber-300/60 bg-amber-50 px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-2.5 flex-1">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                    Heads up — Custom IVR detected on {customCount} {customCount === 1 ? "property" : "properties"}
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    Your existing IVR may interfere with AI call routing
                  </p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    You can keep your custom IVR; just know what to watch for.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {[
                    { icon: Phone,    title: "Calls don't reach Leasing AI", body: "Custom menus can skip the path that forwards leasing calls to AI." },
                    { icon: Voicemail, title: "Calls drop into voicemail",   body: "Overflow paths sometimes land in property voicemail instead of routing to the assistant." },
                    { icon: Phone,    title: "Vanity numbers break routing", body: "Custom forwarding numbers can collide with AI forwarding and create routing loops." },
                  ].map(({ icon: Icon, title, body }) => (
                    <div key={title} className="flex items-start gap-2 rounded-lg border border-amber-200/70 bg-white px-3 py-2.5">
                      <Icon className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-foreground leading-tight">{title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Routing table — separate container ── */}
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          {/* Table header */}
          <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border bg-zinc-50/60">
            <div>
                    <p className="text-sm font-semibold text-foreground">Call Routing by Property</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Routing mode is pre-selected based on your contract and any detected existing IVR. Review and adjust — changes require confirmation.
              </p>
            </div>
            {/* Info pills */}
            <div className="flex items-center gap-2 shrink-0">
              <InfoPopover label="Why this matters">
                <p className="mb-3 text-foreground font-medium">A convoluted IVR is the #1 reason AI deflection KPIs underperform post-launch.</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: PhoneOff,      value: "67%",   label: "of callers have hung up on an IVR out of frustration",     source: "WifiTalents, 2026",  cls: "text-red-500" },
                    { icon: TrendingDown,  value: "8–12%", label: "of callers drop off per extra menu level added",            source: "ViciStack, 2026",    cls: "text-amber-500" },
                    { icon: Users,         value: "52%",   label: "of users find typical IVR menus confusing",                 source: "WorldMetrics, 2026", cls: "text-zinc-500" },
                    { icon: AlertTriangle, value: "50%",   label: "will switch providers after one bad IVR experience",        source: "WifiTalents, 2026",  cls: "text-red-500" },
                  ].map(({ icon: Icon, value, label, source, cls }) => (
                    <div key={value + label} className="rounded-lg border border-border p-2.5">
                      <Icon className={cn("h-3.5 w-3.5 mb-1", cls)} />
                      <p className="text-base font-bold text-foreground leading-none">{value}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{label}</p>
                      <p className="text-[9px] text-muted-foreground/60 mt-1">{source}</p>
                    </div>
                  ))}
                </div>
              </InfoPopover>
            </div>
          </div>

          {/* Per-property table — uniform row heights, no layout shifting */}
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-border bg-zinc-50/40">
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground w-[35%]">Property</th>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground w-[30%]">Routing mode</th>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((prop) => {
                const current       = modes[prop.name]
                const isCustom     = current === "custom"    && !prop.isLive
                const isThirdParty = current === "thirdparty" && !prop.isLive
                const myIvrMarked  = myIvrDone[prop.name]
                const tpMarked     = thirdPartyAcknowledged[prop.name]
                const needsAction  = (isCustom && !myIvrMarked) || (isThirdParty && !tpMarked)

                // All action buttons: fixed width so they align perfectly in every row
                const btnW = "w-[220px]"
                const ghostBtn = `inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-zinc-50 hover:border-zinc-400 transition-colors ${btnW} justify-center`
                const primaryBtn = `inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-zinc-800 transition-colors ${btnW} justify-center`

                return (
                  <Fragment key={prop.name}>
                  <tr
                    className={cn(
                      "transition-colors border-t border-border",
                      prop.isLive && "opacity-60",
                      needsAction ? "bg-amber-50" : "bg-white",
                    )}
                  >
                    {/* Property — status icon left of name */}
                    <td className="px-5 py-3 align-middle">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 shrink-0">
                          {needsAction ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                        </div>
                        <div>
                    <p className={cn("text-sm font-medium", prop.isLive ? "text-muted-foreground" : "text-foreground")}>
                          {prop.name}
                          {prop.isLive && (
                            <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">Live</span>
                          )}
                        </p>
                        {/* Default IVR — inline paragraph, natural word-wrap */}
                        {current === "entrata" && !prop.isLive && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
                            Entrata manages call routing — no action needed. See{" "}
                            <IvrMenuTrigger />.
                          </p>
                        )}
                          {isCustom && !myIvrMarked && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
                              Open IVR Settings and add the AI routing destinations, then save.
                            </p>
                          )}
                          {isThirdParty && !tpMarked && (
                            <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                              Add these numbers to your 3rd-party IVR, then click the <strong className="font-semibold text-foreground">Numbers Added to 3rd Party</strong> button.
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Routing mode — 3-option segmented control */}
                    <td className="px-5 py-3 align-middle">
                      {prop.isLive ? (
                        <span className="inline-flex rounded-full border border-border bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
                          {MODE_LABELS[current as PropertyIvrMode]}
                        </span>
                      ) : (
                        <div className="inline-flex rounded-lg border border-border bg-zinc-100/80 p-0.5">
                          {(["entrata", "custom", "thirdparty"] as PropertyIvrMode[]).map((mode) => {
                            const isActive = current === mode
                            return (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => requestModeChange(prop.name, mode)}
                                className={cn(
                                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
                                  isActive
                                    ? "bg-white text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground",
                                )}
                              >
                                {MODE_LABELS[mode]}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </td>

                    {/* Action column — unique per mode */}
                    <td className="px-5 py-3 align-middle">
                      {prop.isLive ? (
                        <button type="button" onClick={() => showToast?.("Opening IVR Settings…")} className={ghostBtn}>
                          View Settings <ExternalLink className="h-3 w-3" />
                        </button>
                      ) : isCustom && !myIvrMarked ? (
                        <button type="button" onClick={() => markMyIvrDone(prop.name)} className={primaryBtn}>
                          Open IVR Settings <ExternalLink className="h-3 w-3" />
                        </button>
                      ) : isThirdParty && !tpMarked ? (
                        <button
                          type="button"
                          onClick={() => acknowledgeThirdParty(prop.name)}
                          disabled={!hasCopied[prop.name]}
                          className={cn(primaryBtn, !hasCopied[prop.name] && "opacity-40 cursor-not-allowed")}
                        >
                          Numbers Added to 3rd Party <CheckCircle2 className="h-3 w-3" />
                        </button>
                      ) : (
                        // Done / Default — secondary ghost action (same fixed width as primary buttons)
                        <button type="button" onClick={() => showToast?.("Opening IVR Settings…")} className={ghostBtn}>
                          View Settings <ExternalLink className="h-3 w-3" />
                        </button>

                      )}
                    </td>
                  </tr>
                  {isThirdParty && !tpMarked && (
                    <tr className="bg-amber-50" style={{ borderTop: "none" }}>
                      <td colSpan={3} className="px-5 pb-4 pt-0">
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { label: "Leasing AI Voice",     value: prop.leasingVoiceNumber,  notContracted: false },
                            { label: "Leasing AI IVR SMS",   value: prop.leasingSmsNumber,    notContracted: false },
                            { label: "Maintenance AI Voice", value: prop.maintenanceNumber,   notContracted: true  },
                          ].map(({ label, value, notContracted }) => (
                            <CopyChipWide
                              key={label}
                              label={label}
                              value={value ?? "—"}
                              notContracted={notContracted}
                              onCopy={() => setHasCopied(prev => ({ ...prev, [prop.name]: true }))}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>

          {/* Live properties toggle */}
          {live.length > 0 && (
            <div className="border-t border-border bg-zinc-50/60 px-5 py-2.5">
              <button
                type="button"
                onClick={() => setShowLive(v => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <EyeOff className="h-3.5 w-3.5" />
                {showLive
                  ? `Hide ${live.length} live ${live.length === 1 ? "property" : "properties"}`
                  : `Show ${live.length} live ${live.length === 1 ? "property" : "properties"}`}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ── Warning dialog — confirms routing mode changes ── */}
      {pendingChange && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white shadow-2xl">
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Update routing mode?</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Switching <strong className="font-medium text-foreground">{pendingChange.propName}</strong> to{" "}
                    <strong className="font-medium text-foreground">{MODE_LABELS[pendingChange.mode]}</strong> will update your existing call routing configuration and apply at go-live. Only change this if you're sure.
                  </p>
                </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => setPendingChange(null)}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmChange}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
              >
                Yes, update routing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
