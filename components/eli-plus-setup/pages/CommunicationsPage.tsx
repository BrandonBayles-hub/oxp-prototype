"use client"

import type { PageId, BrandStatus, CampaignStatus } from "../index"
import { cn } from "@/lib/utils"
import {
  Users, CreditCard, Wrench, RefreshCw,
  AlertTriangle, Loader2,
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

// ── Number pools ──────────────────────────────────────────────────────────────

const AREA_CODES: Record<string, string> = {
  "Austin": "512", "Dallas": "214", "Houston": "713",
  "Denver": "720", "Phoenix": "602", "Chicago": "312",
  "Minneapolis": "612", "Columbus": "614", "Detroit": "313",
  "Seattle": "206", "Portland": "503", "Salt Lake City": "801",
}
const EXCHANGES = ["423", "315", "891", "763", "542", "677", "483", "721", "856", "934", "612", "347"]

type ProductId = "leasing" | "payments" | "maintenance" | "renewals"

function buildPool(areaCode: string, propIndex: number, offset = 0): string[] {
  const exchange = EXCHANGES[(propIndex + offset) % EXCHANGES.length]
  const base = 1100 + propIndex * 100 + offset * 1000
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

function buildLeasingExtrasDefaults(): Record<string, { voice: string; ivr: string }> {
  const result: Record<string, { voice: string; ivr: string }> = {}
  PROPERTIES.forEach((prop, idx) => {
    const ac = AREA_CODES[prop.city] ?? "000"
    const pool = buildPool(ac, idx, 6)
    result[prop.id] = { voice: pool[0], ivr: pool[1] }
  })
  return result
}

function buildMaintenanceVoiceDefaults(): Record<string, string> {
  const result: Record<string, string> = {}
  PROPERTIES.forEach((prop, idx) => {
    const ac = AREA_CODES[prop.city] ?? "000"
    result[prop.id] = buildPool(ac, idx, 9)[0]
  })
  return result
}

const DEFAULT_NUMBERS        = buildDefaults()
const DEFAULT_LEASING_EXTRAS = buildLeasingExtrasDefaults()
const DEFAULT_MAINTENANCE_VOICE = buildMaintenanceVoiceDefaults()

// Properties whose privacy policies are carrier-approved — numbers are assigned.
// Mirrors INITIALLY_COMPLETED in PrivacyPage.
const NUMBERS_ASSIGNED = new Set(["p1", "p2", "p3", "p4", "p5", "p7", "p10", "p12"])

// Products not contracted for specific properties — these cells show "Not contracted"
// instead of a phone number even when the property is otherwise approved.
const NOT_CONTRACTED: Record<string, Set<ProductId>> = {
  p3:  new Set<ProductId>(["payments"]),
  p10: new Set<ProductId>(["renewals"]),
  p5:  new Set<ProductId>(["maintenance"]),
}

// Approved properties first, then awaiting
const SORTED_PROPERTIES = [
  ...PROPERTIES.filter(p => NUMBERS_ASSIGNED.has(p.id)),
  ...PROPERTIES.filter(p => !NUMBERS_ASSIGNED.has(p.id)),
]

// ── Page ──────────────────────────────────────────────────────────────────────

export function CommunicationsPage({ navigate, brandStatus }: Props) {
  const blocked = brandStatus !== "approved"

  const assignedCount = PROPERTIES.filter(p => NUMBERS_ASSIGNED.has(p.id)).length

  return (
    <div className="p-6 md:p-8 space-y-6">

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Communications</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          One dedicated phone number per AI product, per property. Numbers are assigned automatically once a property's privacy policy is carrier-approved — no manual setup required.
        </p>
      </div>

      {/* Carrier compliance blocker */}
      {blocked && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Carrier Compliance must be completed first</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Brand and profile registration in Twilio must be approved before campaigns can be submitted and numbers assigned.{" "}
              <button type="button" onClick={() => navigate("company")}
                className="underline font-medium hover:text-amber-900">
                Go to Carrier Compliance →
              </button>
            </p>
          </div>
        </div>
      )}

      {brandStatus === "submitting" && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5">
          <Loader2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0 animate-spin" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Registering your business with our carrier…</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Usually takes about 15 minutes. Number assignment begins per-property as soon as each privacy policy is carrier-approved.
            </p>
          </div>
        </div>
      )}

      {/* Progress line */}
      {!blocked && (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{assignedCount}</span> of {PROPERTIES.length} properties have numbers assigned.
          {assignedCount < PROPERTIES.length && (
            <> Remaining properties will receive numbers once their privacy policy is approved in the{" "}
              <button type="button" onClick={() => navigate("privacy")}
                className="underline font-medium text-foreground hover:text-foreground/70">
                Privacy Policies tab
              </button>.
            </>
          )}
        </p>
      )}

      {/* Number table */}
      {!blocked && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1200px] border-separate border-spacing-0">
              <colgroup>
                <col style={{ width: "220px" }} />
                <col /><col /><col />
                <col />
                <col /><col />
                <col />
              </colgroup>
              <thead>
                {/* Product group header */}
                <tr className="bg-zinc-50">
                  <th className="sticky left-0 z-20 bg-zinc-50 px-4 py-2 border-b border-border" />
                  <th colSpan={3} className="px-3 py-2 text-left border-b border-l border-border">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                      <Users className="h-3.5 w-3.5 text-violet-500" />Leasing AI
                    </span>
                  </th>
                  <th className="px-3 py-2 text-left border-b border-l border-border">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                      <CreditCard className="h-3.5 w-3.5 text-blue-500" />Payments AI
                    </span>
                  </th>
                  <th colSpan={2} className="px-3 py-2 text-left border-b border-l border-border">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                      <Wrench className="h-3.5 w-3.5 text-amber-500" />Maintenance AI
                    </span>
                  </th>
                  <th className="px-3 py-2 text-left border-b border-l border-border">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                      <RefreshCw className="h-3.5 w-3.5 text-emerald-500" />Renewals AI
                    </span>
                  </th>
                </tr>
                {/* Channel sub-header */}
                <tr className="bg-zinc-50">
                  <th className="sticky left-0 z-20 bg-zinc-50 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Property</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border">SMS</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Voice</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">IVR</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border">SMS</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border">SMS</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Voice</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border">SMS</th>
                </tr>
              </thead>
              <tbody>
                {SORTED_PROPERTIES.map((prop) => {
                  const hasNumbers = NUMBERS_ASSIGNED.has(prop.id)
                  const notContracted = NOT_CONTRACTED[prop.id] ?? new Set<ProductId>()
                  const nums   = DEFAULT_NUMBERS[prop.id]
                  const extras = DEFAULT_LEASING_EXTRAS[prop.id]
                  const maint  = DEFAULT_MAINTENANCE_VOICE[prop.id]

                  const numCell = (value: string, product: ProductId) => {
                    if (!hasNumbers) return <span className="text-xs text-muted-foreground/40">—</span>
                    if (notContracted.has(product)) return (
                      <span className="text-xs italic text-muted-foreground/60">Not contracted</span>
                    )
                    return <span className="font-mono text-xs text-foreground">{value}</span>
                  }

                  return (
                    <tr key={prop.id} className={cn("transition-colors", hasNumbers ? "bg-white hover:bg-zinc-50" : "bg-zinc-50/50")}>
                      <td className={cn("sticky left-0 z-10 px-4 py-2.5 border-b border-border", hasNumbers ? "bg-white" : "bg-zinc-50/50")}>
                        <p className="font-medium leading-tight text-foreground truncate max-w-[200px]">{prop.name}</p>
                        <p className="text-[11px] mt-0.5">
                          {hasNumbers
                            ? <span className="text-muted-foreground">{prop.city}, {prop.state}</span>
                            : <span className="text-muted-foreground/60 italic">Awaiting policy approval</span>}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 border-b border-l border-border">{numCell(nums.leasing,   "leasing")}</td>
                      <td className="px-3 py-2.5 border-b border-border">{numCell(extras.voice,            "leasing")}</td>
                      <td className="px-3 py-2.5 border-b border-border">{numCell(extras.ivr,              "leasing")}</td>
                      <td className="px-3 py-2.5 border-b border-l border-border">{numCell(nums.payments,  "payments")}</td>
                      <td className="px-3 py-2.5 border-b border-l border-border">{numCell(nums.maintenance,"maintenance")}</td>
                      <td className="px-3 py-2.5 border-b border-border">{numCell(maint,                   "maintenance")}</td>
                      <td className="px-3 py-2.5 border-b border-l border-border">{numCell(nums.renewals,  "renewals")}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
