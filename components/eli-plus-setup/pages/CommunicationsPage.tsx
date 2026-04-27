"use client"

import { useState, useEffect, type ReactNode } from "react"
import type { PageId, BrandStatus, CampaignStatus } from "../index"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, Users, CreditCard, Wrench, RefreshCw,
  CheckCircle2,
  Loader2, AlertTriangle, Zap, ChevronRight,
} from "lucide-react"
import { PROPERTIES } from "../data/properties"

interface Props {
  navigate: (to: PageId) => void
  privacyPublished: boolean
  brandStatus: BrandStatus
  campaignStatus: CampaignStatus
  onCampaignReady: () => void
  privacyActionCount: number
  totalPropertyCount: number
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

const DEFAULT_NUMBERS = buildDefaults()

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

// ── Maintenance AI Voice numbers (separate pool, offset to avoid conflicts) ──

function buildMaintenanceVoicePool(areaCode: string, propIndex: number): string[] {
  const exchange = EXCHANGES[(propIndex + 9) % EXCHANGES.length]
  const base = 3300 + propIndex * 100
  return Array.from({ length: 5 }, (_, i) =>
    `(${areaCode}) ${exchange}-${String(base + i * 4).padStart(4, "0")}`
  )
}

function buildMaintenanceVoiceDefaults(): Record<string, string> {
  const result: Record<string, string> = {}
  PROPERTIES.forEach((prop, idx) => {
    const ac = AREA_CODES[prop.city] ?? "000"
    result[prop.id] = buildMaintenanceVoicePool(ac, idx)[0]
  })
  return result
}

function buildMaintenanceVoicePools(): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  PROPERTIES.forEach((prop, idx) => {
    const ac = AREA_CODES[prop.city] ?? "000"
    result[prop.id] = buildMaintenanceVoicePool(ac, idx)
  })
  return result
}

const DEFAULT_MAINTENANCE_VOICE = buildMaintenanceVoiceDefaults()
const MAINTENANCE_VOICE_POOLS = buildMaintenanceVoicePools()

// ── Per-property campaign status (demo seed) ──────────────────────────────────
// Matches the 8 "covered" properties in PrivacyPage (p1–p5, p7, p10, p12).
// 4 already have Twilio campaigns approved and numbers assigned; 4 are pending.
const INITIALLY_ACTIVE    = new Set(["p1", "p2", "p3", "p4"])
const INITIALLY_IN_REVIEW = new Set(["p5", "p7", "p10", "p12"])

const REVIEW_META: Record<string, string> = {
  p5:  "Submitted 2 days ago",
  p7:  "Submitted yesterday",
  p10: "Submitted 3 hours ago",
  p12: "Submitted 5 hours ago",
}



// ── Page ─────────────────────────────────────────────────────────────────────
export function CommunicationsPage({ navigate, privacyPublished, brandStatus, campaignStatus, onCampaignReady, privacyActionCount, totalPropertyCount }: Props) {
  // Per-property campaign status — drives all number visibility
  const [activeIds,   setActiveIds]   = useState<Set<string>>(() => new Set(INITIALLY_ACTIVE))
  const [inReviewIds, setInReviewIds] = useState<Set<string>>(() => new Set(INITIALLY_IN_REVIEW))

  type StatusFilter = "all" | "active" | "review" | "awaiting"
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active")

  function simulateApproval() {
    setActiveIds(prev => {
      const next = new Set(prev)
      inReviewIds.forEach(id => next.add(id))
      return next
    })
    setInReviewIds(new Set())
  }

  // Trigger parent "complete" when every property has active numbers
  useEffect(() => {
    if (activeIds.size === PROPERTIES.length && campaignStatus !== "ready") {
      onCampaignReady()
    }
  }, [activeIds, campaignStatus, onCampaignReady])

  const blocked = brandStatus !== "approved"

  // Derived awaiting set — anything that isn't active or in review
  const awaitingIds = new Set(
    PROPERTIES.filter(p => !activeIds.has(p.id) && !inReviewIds.has(p.id)).map(p => p.id),
  )
  const numbersReady = activeIds.size === PROPERTIES.length

  type RowStatus = "active" | "review" | "awaiting"
  function statusOf(propId: string): RowStatus {
    if (activeIds.has(propId))   return "active"
    if (inReviewIds.has(propId)) return "review"
    return "awaiting"
  }

  const visibleProperties = PROPERTIES.filter(p => {
    if (statusFilter === "all") return true
    return statusOf(p.id) === statusFilter
  })

  return (
    <>
    <div className="p-6 md:p-8 flex gap-8 items-start">
    {/* ── Main content ──────────────────────────────────────────────────── */}
    <div className="flex-1 min-w-0 space-y-6">
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
            <p className="text-sm font-semibold text-amber-900">Carrier Compliance must be completed first</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Carrier Compliance builds the brand and profile in Twilio that campaigns are registered under. Complete it in the{" "}
              <button type="button" onClick={() => navigate("company")} className="underline font-medium hover:text-amber-900">Carrier Compliance tab</button>
              {" "}before phone number setup can begin.
            </p>
          </div>
        </div>
      )}

      {brandStatus === "submitting" && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5">
          <Loader2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0 animate-spin" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Registering your business with our carrier…</p>
            <p className="text-xs text-blue-700 mt-0.5">This usually takes about 15 minutes. Campaign registration can begin per-property once carrier registration is approved.</p>
          </div>
        </div>
      )}

      {/* ── Summary row ────────────────────────────────────────────────── */}
      {!blocked && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-500" aria-hidden />
            <span className="text-sm text-foreground">
              <span className="font-semibold">{activeIds.size}</span>
              <span className="text-muted-foreground"> Done</span>
            </span>
          </div>
          <span className="text-zinc-300">·</span>
          <div className="flex items-center gap-2">
            {inReviewIds.size > 0
              ? <Loader2 className="h-4 w-4 text-amber-500 animate-spin" aria-hidden />
              : <span className="inline-block h-4 w-4 rounded-full border-2 border-amber-400" aria-hidden />}
            <span className="text-sm text-foreground">
              <span className="font-semibold">{inReviewIds.size}</span>
              <span className="text-muted-foreground"> Pending</span>
            </span>
          </div>
          <span className="text-zinc-300">·</span>
          <div className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 rounded-full bg-zinc-200" aria-hidden />
            <span className="text-sm text-foreground">
              <span className="font-semibold">{awaitingIds.size}</span>
              <span className="text-muted-foreground"> Not started</span>
            </span>
          </div>
          {numbersReady && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
              <CheckCircle2 className="h-3 w-3" />All properties Done
            </span>
          )}
        </div>
      )}

      {/* ── Property Numbers — unified table ────────────────────────────── */}
      {!blocked && (
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Property Numbers</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              One row per property, grouped by AI product. Campaigns register per-property with the carrier — typically 1–2 business days once a privacy policy is live.
            </p>
          </div>

          {/* Toolbar: filter chips + action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-border bg-white p-0.5">
              {([
                { id: "active",   label: "Done",        count: activeIds.size },
                { id: "review",   label: "Pending",     count: inReviewIds.size },
                { id: "awaiting", label: "Not started", count: awaitingIds.size },
                { id: "all",      label: "All",         count: PROPERTIES.length },
              ] as const).map(chip => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setStatusFilter(chip.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    statusFilter === chip.id
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-zinc-50",
                  )}
                >
                  {chip.label}
                  <span className={cn(
                    "inline-flex items-center justify-center rounded px-1.5 py-0 text-[10px] font-semibold",
                    statusFilter === chip.id ? "bg-white/15 text-background" : "bg-zinc-100 text-zinc-600",
                  )}>
                    {chip.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-3">
              {inReviewIds.size > 0 && (
                <button
                  type="button"
                  onClick={simulateApproval}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 border border-dashed border-blue-300 rounded-md px-2.5 py-1.5 hover:bg-blue-50 transition-colors"
                >
                  <Zap className="h-3 w-3" />Simulate approval →
                </button>
              )}
            </div>
          </div>

          {/* Unified table */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[1220px] border-separate border-spacing-0">
                <colgroup>
                  <col style={{ width: "240px" }} />
                  <col /><col /><col />
                  <col />
                  <col /><col />
                  <col />
                </colgroup>
                <thead>
                  {/* Group header row: product names span their channel columns */}
                  <tr className="bg-zinc-50">
                    <th className="sticky left-0 z-20 bg-zinc-50 px-4 py-2 border-b border-border"> </th>
                    <th colSpan={3} className="bg-zinc-50 px-3 py-2 text-left border-b border-l border-border">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                        <Users className="h-3.5 w-3.5 text-violet-500" />Leasing AI
                      </span>
                    </th>
                    <th className="bg-zinc-50 px-3 py-2 text-left border-b border-l border-border">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                        <CreditCard className="h-3.5 w-3.5 text-blue-500" />Payments AI
                      </span>
                    </th>
                    <th colSpan={2} className="bg-zinc-50 px-3 py-2 text-left border-b border-l border-border">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                        <Wrench className="h-3.5 w-3.5 text-amber-500" />Maintenance AI
                      </span>
                    </th>
                    <th className="bg-zinc-50 px-3 py-2 text-left border-b border-l border-border">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                        <RefreshCw className="h-3.5 w-3.5 text-emerald-500" />Renewals AI
                      </span>
                    </th>
                  </tr>
                  {/* Sub-header row: channel labels */}
                  <tr className="bg-zinc-50">
                    <th className="sticky left-0 z-20 bg-zinc-50 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Property</th>
                    <th className="bg-zinc-50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border">SMS</th>
                    <th className="bg-zinc-50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Voice</th>
                    <th className="bg-zinc-50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">IVR text</th>
                    <th className="bg-zinc-50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border">SMS</th>
                    <th className="bg-zinc-50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border">SMS</th>
                    <th className="bg-zinc-50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Voice</th>
                    <th className="bg-zinc-50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border">SMS</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProperties.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">No properties in this state.</td>
                    </tr>
                  ) : (
                    visibleProperties.map((prop) => {
                      const status = statusOf(prop.id)
                      const rowBg =
                        status === "active"  ? "bg-white"
                      : status === "review"  ? "bg-amber-50/40"
                                             : "bg-zinc-50"
                      const stickyBg =
                        status === "active"  ? "bg-white"
                      : status === "review"  ? "bg-[#fffbeb]"
                                             : "bg-zinc-50"
                      const nums     = DEFAULT_NUMBERS[prop.id]
                      const extras   = DEFAULT_LEASING_EXTRAS[prop.id]
                      const maint    = DEFAULT_MAINTENANCE_VOICE[prop.id]

                      // Slim awaiting row: property cell + single colSpan cell
                      if (status === "awaiting") {
                        return (
                          <tr key={prop.id} className={rowBg}>
                            <td className={cn("sticky left-0 z-10 px-4 py-2.5 align-middle border-b border-border", stickyBg)}>
                              <p className="font-medium leading-tight text-foreground truncate max-w-[220px]">{prop.name}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{prop.city}, {prop.state}</p>
                            </td>
                            <td colSpan={7} className="px-4 py-2.5 align-middle border-b border-l border-border">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-600 shrink-0">
                                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-300" aria-hidden />
                                  Not started
                                </span>
                                <span className="text-[11px] text-muted-foreground truncate">
                                  Submit this property's privacy policy to start registering numbers.
                                </span>
                                <button
                                  type="button"
                                  onClick={() => navigate("privacy")}
                                  className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-foreground border border-border rounded-md px-2 py-1 hover:bg-white transition-colors shrink-0"
                                >
                                  Go to policy<ChevronRight className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      }

                      // Review row: inline status caption under property name + "Pending" cells
                      // Active row: no pill (numbers speak for themselves)
                      const renderCell = (content: ReactNode) => {
                        if (status === "active") return content
                        return (
                          <div className="h-8 rounded-md border border-amber-200 bg-white px-2.5 flex items-center">
                            <span className="text-xs font-mono text-amber-600">Pending</span>
                          </div>
                        )
                      }

                      return (
                        <tr key={prop.id} className={rowBg}>
                          <td className={cn("sticky left-0 z-10 px-4 py-2.5 align-top border-b border-border", stickyBg)}>
                            <p className="font-medium leading-tight text-foreground truncate max-w-[220px]">{prop.name}</p>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span>{prop.city}, {prop.state}</span>
                              <span className="rounded px-1 py-px text-[10px] font-medium bg-zinc-100 text-zinc-500">
                                {AREA_CODES[prop.city] ?? "—"}
                              </span>
                            </div>
                            {status === "review" && (
                              <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-700">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Pending · {REVIEW_META[prop.id] ?? "submitted recently"}</span>
                              </div>
                            )}
                          </td>

                          {/* Leasing AI: SMS · Voice · IVR text */}
                          <td className="px-3 py-2.5 align-top border-b border-l border-border">
                            {renderCell(<span className="font-mono text-xs text-foreground">{nums.leasing}</span>)}
                          </td>
                          <td className="px-3 py-2.5 align-top border-b border-border">
                            {renderCell(<span className="font-mono text-xs text-foreground">{extras.voice}</span>)}
                          </td>
                          <td className="px-3 py-2.5 align-top border-b border-border">
                            {renderCell(<span className="font-mono text-xs text-foreground">{extras.other}</span>)}
                          </td>

                          {/* Payments AI: SMS */}
                          <td className="px-3 py-2.5 align-top border-b border-l border-border">
                            {renderCell(<span className="font-mono text-xs text-foreground">{nums.payments}</span>)}
                          </td>

                          {/* Maintenance AI: SMS · Voice */}
                          <td className="px-3 py-2.5 align-top border-b border-l border-border">
                            {renderCell(<span className="font-mono text-xs text-foreground">{nums.maintenance}</span>)}
                          </td>
                          <td className="px-3 py-2.5 align-top border-b border-border">
                            {renderCell(<span className="font-mono text-xs text-foreground">{maint}</span>)}
                          </td>

                          {/* Renewals AI: SMS */}
                          <td className="px-3 py-2.5 align-top border-b border-l border-border">
                            {renderCell(<span className="font-mono text-xs text-foreground">{nums.renewals}</span>)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>

    </div>
    </>
  )
}
