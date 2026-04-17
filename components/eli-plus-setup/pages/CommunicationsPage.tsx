"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import type { PageId, BrandStatus, CampaignStatus } from "../index"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, Users, CreditCard, Wrench, RefreshCw,
  CheckCircle2, Phone, ChevronDown, ChevronUp, Check,
  Loader2, AlertTriangle, Zap, MessageSquare, Clock,
  Volume2, MessageCircle,
} from "lucide-react"
import { PROPERTIES } from "../data/properties"

interface Props {
  navigate: (to: PageId) => void
  privacyPublished: boolean
  brandStatus: BrandStatus
  campaignStatus: CampaignStatus
  onCampaignReady: () => void
}

// ── Campaign numbers (company-level, area code = Austin 512) ─────────────────
const CAMPAIGNS = [
  { id: "leasing",     label: "Leasing AI",     icon: Users,      number: "(512) 555-0200", color: "border-violet-200 bg-violet-50", iconColor: "text-violet-600", badgeColor: "border-violet-200 bg-violet-50 text-violet-700" },
  { id: "payments",    label: "Payments AI",    icon: CreditCard, number: "(512) 555-0201", color: "border-blue-200 bg-blue-50",     iconColor: "text-blue-600",   badgeColor: "border-blue-200 bg-blue-50 text-blue-700"     },
  { id: "maintenance", label: "Maintenance AI", icon: Wrench,     number: "(512) 555-0202", color: "border-amber-200 bg-amber-50",   iconColor: "text-amber-600",  badgeColor: "border-amber-200 bg-amber-50 text-amber-700"  },
  { id: "renewals",    label: "Renewals AI",    icon: RefreshCw,  number: "(512) 555-0203", color: "border-emerald-200 bg-emerald-50", iconColor: "text-emerald-600", badgeColor: "border-emerald-200 bg-emerald-50 text-emerald-700" },
] as const

type ProductId = typeof CAMPAIGNS[number]["id"]

const AREA_CODES: Record<string, string> = {
  "Austin": "512", "Dallas": "214", "Houston": "713",
  "Denver": "720", "Phoenix": "602", "Chicago": "312",
  "Minneapolis": "612", "Columbus": "614", "Detroit": "313",
  "Seattle": "206", "Portland": "503", "Salt Lake City": "801",
}

const EXCHANGES = ["423", "315", "891", "763", "542", "677", "483", "721", "856", "934", "612", "347"]

function buildPool(areaCode: string, propIndex: number): string[] {
  const exchange = EXCHANGES[propIndex % EXCHANGES.length]
  const base = 1100 + propIndex * 100
  return Array.from({ length: 5 }, (_, i) =>
    `(${areaCode}) ${exchange}-${String(base + i * 4).padStart(4, "0")}`
  )
}

function buildDefaults(): Record<string, Record<ProductId, string>> {
  const result: Record<string, Record<ProductId, string>> = {}
  PROPERTIES.forEach((prop, idx) => {
    const ac = AREA_CODES[prop.city] ?? "000"
    const pool = buildPool(ac, idx)
    result[prop.id] = { leasing: pool[0], payments: pool[1], maintenance: pool[2], renewals: pool[3] }
  })
  return result
}

function buildPools(): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  PROPERTIES.forEach((prop, idx) => {
    const ac = AREA_CODES[prop.city] ?? "000"
    result[prop.id] = buildPool(ac, idx)
  })
  return result
}

const DEFAULT_NUMBERS = buildDefaults()
const AVAILABLE_POOLS = buildPools()

// ── Leasing AI Voice + SMS numbers (separate pool, offset to avoid conflicts) ──

type LeasingExtraType = "voice" | "other"

function buildLeasingExtraPool(areaCode: string, propIndex: number): string[] {
  const exchange = EXCHANGES[(propIndex + 6) % EXCHANGES.length]
  const base = 2200 + propIndex * 100
  return Array.from({ length: 5 }, (_, i) =>
    `(${areaCode}) ${exchange}-${String(base + i * 4).padStart(4, "0")}`
  )
}

function buildLeasingExtrasDefaults(): Record<string, Record<LeasingExtraType, string>> {
  const result: Record<string, Record<LeasingExtraType, string>> = {}
  PROPERTIES.forEach((prop, idx) => {
    const ac = AREA_CODES[prop.city] ?? "000"
    const pool = buildLeasingExtraPool(ac, idx)
    result[prop.id] = { voice: pool[0], other: pool[1] }
  })
  return result
}

function buildLeasingExtraPools(): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  PROPERTIES.forEach((prop, idx) => {
    const ac = AREA_CODES[prop.city] ?? "000"
    result[prop.id] = buildLeasingExtraPool(ac, idx)
  })
  return result
}

const DEFAULT_LEASING_EXTRAS = buildLeasingExtrasDefaults()
const LEASING_EXTRA_POOLS = buildLeasingExtraPools()

// ── Number picker cell ───────────────────────────────────────────────────────
function NumberPicker({ value, options, onChange }: {
  value: string; options: string[]; onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })

  const openDropdown = useCallback(() => {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 172) })
    setOpen(true)
  }, [])

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      const t = e.target as Node
      if (!btnRef.current?.contains(t) && !dropRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const allOptions = Array.from(new Set([value, ...options]))

  return (
    <>
      <button ref={btnRef} type="button" onClick={openDropdown}
        className="flex items-center justify-between gap-1.5 w-full min-w-[130px] h-8 rounded-md border border-border bg-white px-2.5 text-xs font-mono font-medium text-foreground hover:border-zinc-400 hover:bg-zinc-50 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
      >
        <span className="truncate">{value}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
      </button>

      {open && createPortal(
        <div ref={dropRef} style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: pos.width }}
          className="z-50 rounded-lg border border-border bg-white shadow-lg py-1 overflow-hidden"
        >
          <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/70 border-b border-border mb-1">
            Available numbers
          </p>
          {allOptions.map((opt) => (
            <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false) }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-mono text-left hover:bg-accent transition-colors",
                opt === value ? "text-foreground font-medium" : "text-muted-foreground",
              )}
            >
              <span className="w-3 shrink-0">{opt === value && <Check className="h-3 w-3 text-emerald-600" />}</span>
              {opt}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}


// ── Page ─────────────────────────────────────────────────────────────────────
export function CommunicationsPage({ navigate, privacyPublished, brandStatus, campaignStatus, onCampaignReady }: Props) {
  const [numbers, setNumbers] = useState<Record<string, Record<ProductId, string>>>(buildDefaults)
  const [leasingExtras, setLeasingExtras] = useState<Record<string, Record<LeasingExtraType, string>>>(buildLeasingExtrasDefaults)
  const [saved, setSaved] = useState(false)
  const [campaignExpanded, setCampaignExpanded] = useState(true)
  const [leasingExtrasExpanded, setLeasingExtrasExpanded] = useState(true)

  function setNumber(propId: string, product: ProductId, val: string) {
    setNumbers((prev) => ({ ...prev, [propId]: { ...prev[propId], [product]: val } }))
    setSaved(false)
  }

  function setLeasingExtra(propId: string, type: LeasingExtraType, val: string) {
    setLeasingExtras((prev) => ({ ...prev, [propId]: { ...prev[propId], [type]: val } }))
    setSaved(false)
  }

  const customisedCount = PROPERTIES.reduce((acc, prop) => {
    const defaults = DEFAULT_NUMBERS[prop.id]
    const current = numbers[prop.id]
    return acc + ((["leasing", "payments", "maintenance", "renewals"] as const).some((p) => current[p] !== defaults[p]) ? 1 : 0)
  }, 0)

  const numbersReady = campaignStatus === "ready"
  const campaignsCreating = campaignStatus === "creating"
  const blocked = !privacyPublished

  return (
    <div className="p-6 md:p-8 flex gap-8 items-start">
    {/* ── Main content ──────────────────────────────────────────────────── */}
    <div className="flex-1 min-w-0 space-y-6">
      <button type="button" onClick={() => navigate("overview")}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1 -ml-2 text-muted-foreground")}
      >
        <ArrowLeft className="h-4 w-4" />Overview
      </button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Communications</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-6xl">
          One dedicated phone number is set up per AI product using your company's area code. Each property gets its own number — pre-assigned automatically.
        </p>
      </div>

      {/* ── Pipeline status banner ────────────────────────────────────────── */}
      {blocked && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Carrier Compliance required first</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Complete the{" "}
              <button type="button" onClick={() => navigate("company")} className="underline font-medium hover:text-amber-900">Carrier Compliance tab</button>
              {" "}and publish your privacy policy to begin phone number setup.
            </p>
          </div>
        </div>
      )}

      {brandStatus === "submitting" && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5">
          <Loader2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0 animate-spin" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Registering your business with our carrier…</p>
            <p className="text-xs text-blue-700 mt-0.5">This usually takes about 15 minutes. Your phone numbers will be set up automatically once registration is approved.</p>
          </div>
        </div>
      )}

      {campaignsCreating && (
        <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3.5">
          <Loader2 className="h-4 w-4 text-violet-600 mt-0.5 shrink-0 animate-spin" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-violet-900">Your phone numbers are being set up — hold tight</p>
            <p className="text-xs text-violet-700 mt-0.5">
              We're purchasing dedicated, compliant phone numbers for each of your {PROPERTIES.length} properties and registering them with our carrier. This typically takes 1–2 business days. We've expedited your request.
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <div className="flex items-center gap-1.5 text-xs text-violet-800 bg-white border border-violet-200 rounded-md px-2.5 py-1.5">
                <MessageSquare className="h-3 w-3" />
                Expedited request sent to carrier
              </div>
              {/* Demo shortcut */}
              <button type="button" onClick={onCampaignReady}
                className="flex items-center gap-1.5 text-xs font-medium text-violet-700 border border-dashed border-violet-300 rounded-md px-2.5 py-1.5 hover:bg-violet-100 transition-colors"
              >
                <Zap className="h-3 w-3" />
                Simulate approval →
              </button>
            </div>
          </div>
        </div>
      )}

      {numbersReady && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold text-emerald-900">All numbers active — {PROPERTIES.length * 4} numbers assigned across {PROPERTIES.length} properties</p>
        </div>
      )}

      {/* ── Property-specific numbers ─────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Property SMS Numbers</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {numbersReady
                ? "SMS numbers pre-assigned by area code — one per AI product per property. Click any number to choose a different one."
                : "Numbers will be assigned automatically once your carrier registration is approved."}
            </p>
          </div>
          {numbersReady && customisedCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {customisedCount} {customisedCount === 1 ? "property" : "properties"} customised
            </span>
          )}
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          {/* Pending overlay banner */}
          {!numbersReady && (
            <div className={cn(
              "flex items-start gap-3 px-4 py-3 border-b border-border",
              campaignsCreating ? "bg-violet-50" : "bg-zinc-50",
            )}>
              {campaignsCreating
                ? <Loader2 className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0 animate-spin" />
                : <Clock className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />}
              <p className={cn("text-xs", campaignsCreating ? "text-violet-800" : "text-muted-foreground")}>
                {campaignsCreating
                  ? "Numbers are being purchased and assigned — this table will populate once registration is confirmed."
                  : "Complete Carrier Compliance to begin number assignment."}
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[680px]">
              <thead>
                <tr className="border-b border-border bg-zinc-50">
                  <th className="text-left px-4 py-3 font-semibold text-foreground w-[200px]">Property</th>
                  {([
                    { product: "leasing",     label: "Leasing AI",     Icon: Users,      color: "text-violet-500" },
                    { product: "payments",    label: "Payments AI",    Icon: CreditCard, color: "text-blue-500" },
                    { product: "maintenance", label: "Maintenance AI", Icon: Wrench,     color: "text-amber-500" },
                    { product: "renewals",    label: "Renewals AI",    Icon: RefreshCw,  color: "text-emerald-500" },
                  ] as const).map(({ product, label, Icon, color }) => (
                    <th key={product} className="text-left px-3 py-3 font-semibold text-foreground">
                      <span className="flex items-center gap-1.5">
                        <Icon className={cn("h-3.5 w-3.5", color)} />{label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PROPERTIES.map((prop) => {
                  const pool = AVAILABLE_POOLS[prop.id] ?? []
                  const nums = numbers[prop.id]
                  const defaults = DEFAULT_NUMBERS[prop.id]
                  return (
                    <tr key={prop.id} className={cn("transition-colors", numbersReady ? "bg-white hover:bg-zinc-50" : "bg-zinc-50/50")}>
                      <td className="px-4 py-2.5">
                        <p className={cn("font-medium leading-tight", numbersReady ? "text-foreground" : "text-muted-foreground")}>{prop.name}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span>{prop.city}, {prop.state}</span>
                          <span className="rounded px-1 py-px text-[10px] font-medium bg-zinc-100 text-zinc-500">
                            {AREA_CODES[prop.city] ?? "—"}
                          </span>
                        </p>
                      </td>
                      {(["leasing", "payments", "maintenance", "renewals"] as const).map((product) => {
                        const isCustomised = nums[product] !== defaults[product]
                        return (
                          <td key={product} className="px-3 py-2.5">
                            {numbersReady ? (
                              <div className={cn("relative", isCustomised && "ring-1 ring-violet-300 rounded-md")}>
                                <NumberPicker value={nums[product]} options={pool} onChange={(v) => setNumber(prop.id, product, v)} />
                              </div>
                            ) : (
                              <div className={cn(
                                "h-8 rounded-md border px-2.5 flex items-center",
                                campaignsCreating
                                  ? "border-violet-100 bg-white text-violet-400"
                                  : "border-zinc-200 bg-zinc-100 text-zinc-400",
                              )}>
                                <span className="text-xs font-mono">{campaignsCreating ? "Pending…" : "—"}</span>
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Leasing AI — Voice & SMS numbers ────────────────────────────── */}
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <button type="button" onClick={() => setLeasingExtrasExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 border-b border-border hover:bg-zinc-50 transition-colors"
          >
            <div className="text-left">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-500 shrink-0" />
                <p className="text-sm font-semibold text-foreground">Leasing AI — Voice & Other Numbers</p>
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                  Leasing AI only
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                Dedicated voice and other numbers for Leasing AI per property · auto-assigned by area code
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {numbersReady ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />{PROPERTIES.length * 2} numbers active
                </span>
              ) : campaignsCreating ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                  <Loader2 className="h-3 w-3 animate-spin" />Creating…
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
                  <Clock className="h-3 w-3" />Pending
                </span>
              )}
              {leasingExtrasExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </button>

          {leasingExtrasExpanded && (
            <div className="overflow-x-auto">
              {!numbersReady && (
                <div className={cn(
                  "flex items-start gap-3 px-4 py-3 border-b border-border",
                  campaignsCreating ? "bg-violet-50" : "bg-zinc-50",
                )}>
                  {campaignsCreating
                    ? <Loader2 className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0 animate-spin" />
                    : <Clock className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />}
                  <p className={cn("text-xs", campaignsCreating ? "text-violet-800" : "text-muted-foreground")}>
                    {campaignsCreating
                      ? "Numbers are being purchased and assigned — this table will populate once registration is confirmed."
                      : "Complete Carrier Compliance to begin number assignment."}
                  </p>
                </div>
              )}
              <table className="w-full text-xs min-w-[560px]">
                <thead>
                  <tr className="border-b border-border bg-zinc-50">
                    <th className="text-left px-4 py-3 font-semibold text-foreground w-[240px]">Property</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">
                      <span className="flex items-center gap-1.5">
                        <Volume2 className="h-3.5 w-3.5 text-violet-500" />Voice
                      </span>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">
                      <span className="flex items-center gap-1.5">
                        <MessageCircle className="h-3.5 w-3.5 text-violet-500" />Other
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {PROPERTIES.map((prop) => {
                    const pool = LEASING_EXTRA_POOLS[prop.id] ?? []
                    const extras = leasingExtras[prop.id]
                    const defaults = DEFAULT_LEASING_EXTRAS[prop.id]
                        const voiceCustomised = extras.voice !== defaults.voice
                        const otherCustomised = extras.other !== defaults.other
                    return (
                      <tr key={prop.id} className={cn("transition-colors", numbersReady ? "bg-white hover:bg-zinc-50" : "bg-zinc-50/50")}>
                        <td className="px-4 py-2.5">
                          <p className={cn("font-medium leading-tight", numbersReady ? "text-foreground" : "text-muted-foreground")}>{prop.name}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span>{prop.city}, {prop.state}</span>
                            <span className="rounded px-1 py-px text-[10px] font-medium bg-zinc-100 text-zinc-500">
                              {AREA_CODES[prop.city] ?? "—"}
                            </span>
                          </p>
                        </td>
                        {(["voice", "other"] as const).map((type) => {
                          const isCustomised = type === "voice" ? voiceCustomised : otherCustomised
                          return (
                            <td key={type} className="px-4 py-2.5">
                              {numbersReady ? (
                                <div className={cn("relative", isCustomised && "ring-1 ring-violet-300 rounded-md")}>
                                  <NumberPicker
                                    value={extras[type]}
                                    options={pool}
                                    onChange={(v) => setLeasingExtra(prop.id, type, v)}
                                  />
                                </div>
                              ) : (
                                <div className={cn(
                                  "h-8 rounded-md border px-2.5 flex items-center",
                                  campaignsCreating
                                    ? "border-violet-100 bg-white text-violet-400"
                                    : "border-zinc-200 bg-zinc-100 text-zinc-400",
                                )}>
                                  <span className="text-xs font-mono">{campaignsCreating ? "Pending…" : "—"}</span>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Save (only when numbers are ready) */}
      {numbersReady && (
        <div className="flex items-center gap-3 pt-2">
          <button type="button" onClick={() => setSaved(true)}
            className="h-10 rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            Save changes
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
              <CheckCircle2 className="h-4 w-4" />Saved
            </span>
          )}
        </div>
      )}
    </div>

    </div>
  )
}
