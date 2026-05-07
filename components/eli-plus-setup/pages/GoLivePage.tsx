"use client"

import { useState, useMemo } from "react"
import type { PageId } from "../index"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight,
  Search, Rocket, ArrowRight, Users, CreditCard, Wrench, RefreshCw,
  CalendarClock, Info,
} from "lucide-react"
import { PROPERTIES, PROPERTY_GROUPS } from "../data/properties"
import type { Property, PropertyGroup } from "../data/properties"

// Payments AI can only be activated on the 2nd or 8th of each month.
// This restriction exists because ELI+'s notification logic can't yet
// determine which charges to send reminders for outside those windows.
const PAYMENTS_ACTIVATION_DAYS = [2, 8]

function getNextPaymentsWindow(): string {
  const today = new Date()
  const month = today.getMonth()
  const year  = today.getFullYear()
  for (const day of PAYMENTS_ACTIVATION_DAYS) {
    const candidate = new Date(year, month, day)
    if (candidate > today) {
      return candidate.toLocaleDateString("en-US", { month: "long", day: "numeric" })
    }
  }
  // Next month's 2nd
  const next = new Date(year, month + 1, PAYMENTS_ACTIVATION_DAYS[0])
  return next.toLocaleDateString("en-US", { month: "long", day: "numeric" })
}

// ── Product definitions ───────────────────────────────────────────────────────

type ProductKey = "leasing" | "payments" | "maintenance" | "renewals"

const PRODUCTS: Record<ProductKey, { label: string; icon: React.ElementType }> = {
  leasing:     { label: "Leasing AI",     icon: Users },
  payments:    { label: "Payments AI",    icon: CreditCard },
  maintenance: { label: "Maintenance AI", icon: Wrench },
  renewals:    { label: "Renewals AI",    icon: RefreshCw },
}

// ── Blocker definitions ───────────────────────────────────────────────────────

interface Blocker { id: string; label: string; detail: string; page: PageId }

const ALL_BLOCKERS: Record<string, Blocker> = {
  privacy: {
    id: "privacy", label: "Privacy policy not configured",
    detail: "Properties must have approved consent language before texts and calls can go live.",
    page: "privacy",
  },
  email: {
    id: "email", label: "Email integration not connected",
    detail: "Connect a custom email address so ELI can send and receive on behalf of this property.",
    page: "email",
  },
  payments: {
    id: "payments", label: "Payments AI settings incomplete",
    detail: "Payment portal link and required settings must be confirmed.",
    page: "payments",
  },
  maintenance: {
    id: "maintenance", label: "Escalation phone numbers required",
    detail: "Both during- and after-escalation phone numbers must be set for this property.",
    page: "maintenance",
  },
}

// ── Per-property: contracted products + per-product blockers ─────────────────
// Only products listed here are shown for that property.

interface PropertyConfig {
  products: ProductKey[]
  blockers: Partial<Record<ProductKey, string[]>>
}

const PROPERTY_CONFIG: Record<string, PropertyConfig> = {
  p1:  { products: ["leasing", "payments", "maintenance", "renewals"], blockers: {} },
  p2:  { products: ["leasing", "payments"],                            blockers: { leasing: ["email"] } },
  p3:  { products: ["payments", "maintenance"],                        blockers: { payments: ["payments"] } },
  p4:  { products: ["leasing", "payments", "maintenance", "renewals"], blockers: { leasing: ["privacy"], maintenance: ["maintenance"] } },
  p5:  { products: ["leasing", "payments"],                            blockers: {} },
  p6:  { products: ["maintenance", "renewals"],                        blockers: { maintenance: ["maintenance"] } },
  p7:  { products: ["payments"],                                       blockers: { payments: ["payments"] } },
  p8:  { products: ["leasing", "payments", "maintenance", "renewals"], blockers: {} },
  p9:  { products: ["leasing", "maintenance"],                         blockers: { leasing: ["privacy"] } },
  p10: { products: ["leasing", "payments"],                            blockers: { leasing: ["email"], payments: ["payments"] } },
  p11: { products: ["maintenance", "renewals"],                        blockers: { maintenance: ["maintenance"] } },
  p12: { products: ["leasing", "payments", "maintenance", "renewals"], blockers: { leasing: ["privacy"], maintenance: ["maintenance"] } },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GroupBadge({ group }: { group: Property["group"] }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
      {group}
    </span>
  )
}

interface ProductRowProps {
  productKey: ProductKey
  blockers: Blocker[]
  activated: boolean
  paymentsWindowOpen: boolean
  onActivate: () => void
  onNavigate: (page: PageId) => void
}

function ProductRow({ productKey, blockers, activated, paymentsWindowOpen, onActivate, onNavigate }: ProductRowProps) {
  const [expanded, setExpanded] = useState(false)
  const { label, icon: Icon } = PRODUCTS[productKey]
  const isReady = blockers.length === 0

  // Payments AI has an additional date-based lock
  const paymentsLocked = productKey === "payments" && !activated && !paymentsWindowOpen
  const canActivate = isReady && !activated && !paymentsLocked

  return (
    <div className="border-t border-border/60 first:border-t-0">
      <div className="flex items-center gap-3 px-5 py-3">
        {/* Product icon + name */}
        <div className={cn(
          "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
          activated      ? "bg-emerald-100"
          : paymentsLocked ? "bg-amber-50"
          : isReady      ? "bg-zinc-100"
                         : "bg-red-50",
        )}>
          <Icon className={cn(
            "h-3.5 w-3.5",
            activated      ? "text-emerald-700"
            : paymentsLocked ? "text-amber-500"
            : isReady      ? "text-zinc-600"
                           : "text-red-400",
          )} aria-hidden />
        </div>
        <p className="text-sm font-medium text-foreground flex-1 min-w-0">{label}</p>

        {/* Status + action */}
        <div className="flex items-center gap-2 shrink-0">
          {activated && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              <Rocket className="h-3 w-3" aria-hidden />
              Live
            </span>
          )}
          {paymentsLocked && (
            <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              Window closed
            </span>
          )}
          {!activated && !paymentsLocked && !isReady && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-xs text-red-600 font-medium hover:text-red-700"
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              {blockers.length} blocker{blockers.length > 1 ? "s" : ""}
              {expanded
                ? <ChevronDown className="h-3 w-3" aria-hidden />
                : <ChevronRight className="h-3 w-3" aria-hidden />}
            </button>
          )}
          {!activated && !paymentsLocked && isReady && (
            <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Ready
            </span>
          )}
          <button
            type="button"
            disabled={!canActivate}
            onClick={onActivate}
            className={cn(
              "h-7 px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap",
              activated
                ? "bg-emerald-100 text-emerald-700 cursor-default"
                : canActivate
                  ? "bg-zinc-900 text-white hover:bg-zinc-800"
                  : "bg-zinc-100 text-zinc-400 cursor-not-allowed",
            )}
          >
            {activated ? "Activated" : "Activate"}
          </button>
        </div>
      </div>

      {/* Payments window-closed notice */}
      {paymentsLocked && (
        <div className="mx-5 mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <CalendarClock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-xs font-semibold text-amber-900">Activation window is currently closed</p>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              Payments AI can only go live on the <strong>2nd or 8th of each month</strong>. This ensures resident charge notifications align correctly with your billing cycle. Next available window: <strong>{getNextPaymentsWindow()}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Blocker drawer */}
      {expanded && !paymentsLocked && blockers.length > 0 && (
        <div className="mx-5 mb-3 rounded-lg border border-red-100 bg-red-50/60 px-4 py-3 space-y-2">
          <p className="text-[10px] font-semibold text-red-700 uppercase tracking-wide">
            Required before activation
          </p>
          <ul className="space-y-2">
            {blockers.map(blocker => (
              <li key={blocker.id} className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" aria-hidden />
                  <div>
                    <p className="text-xs font-medium text-foreground">{blocker.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{blocker.detail}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate(blocker.page)}
                  className="flex items-center gap-1 text-xs font-medium text-zinc-700 border border-zinc-300 bg-white hover:bg-zinc-50 rounded-md px-2.5 py-1 shrink-0 transition-colors whitespace-nowrap"
                >
                  Fix it <ArrowRight className="h-3 w-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

interface PropertyCardProps {
  property: Property
  config: PropertyConfig
  activated: Set<ProductKey>
  paymentsWindowOpen: boolean
  onActivate: (product: ProductKey) => void
  onNavigate: (page: PageId) => void
}

function PropertyCard({ property, config, activated, paymentsWindowOpen, onActivate, onNavigate }: PropertyCardProps) {
  const totalProducts = config.products.length
  const activatedCount = config.products.filter(p => activated.has(p)).length
  const allLive = activatedCount === totalProducts
  const anyLive = activatedCount > 0

  return (
    <div className={cn(
      "rounded-xl border bg-white overflow-hidden transition-all",
      allLive ? "border-emerald-200 bg-emerald-50/20" : anyLive ? "border-blue-200" : "border-border",
    )}>
      {/* Property header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-border/60">
        <div className="shrink-0">
          {allLive ? (
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <Rocket className="h-4 w-4 text-emerald-700" aria-hidden />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-full bg-zinc-100 border border-border flex items-center justify-center">
              <Rocket className="h-4 w-4 text-zinc-400" aria-hidden />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{property.name}</p>
            <GroupBadge group={property.group} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{property.city}, {property.state}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn(
            "text-xs font-semibold tabular-nums",
            allLive ? "text-emerald-700" : anyLive ? "text-blue-700" : "text-muted-foreground",
          )}>
            {activatedCount}/{totalProducts} live
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {totalProducts} product{totalProducts !== 1 ? "s" : ""} contracted
          </p>
        </div>
      </div>

      {/* Per-product rows */}
      <div>
        {config.products.map(productKey => {
          const blockerIds = config.blockers[productKey] ?? []
          const blockers = blockerIds.map(id => ALL_BLOCKERS[id]).filter(Boolean)
          return (
            <ProductRow
              key={productKey}
              productKey={productKey}
              blockers={blockers}
              activated={activated.has(productKey)}
              paymentsWindowOpen={paymentsWindowOpen}
              onActivate={() => onActivate(productKey)}
              onNavigate={onNavigate}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface Props { navigate: (to: PageId) => void }

export function GoLivePage({ navigate }: Props) {
  const [search, setSearch]   = useState("")
  const [group, setGroup]     = useState<PropertyGroup>("All")
  const [activated, setActivated] = useState<Record<string, Set<ProductKey>>>({})
  // Demo toggle: simulate being inside or outside the Payments AI activation window
  const [paymentsWindowOpen, setPaymentsWindowOpen] = useState(false)

  const filtered = useMemo(() => {
    let list = PROPERTIES
    if (group !== "All") list = list.filter(p => p.group === group)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q))
    }
    return list
  }, [search, group])

  // Summary stats across all properties × products
  const totalSlots    = PROPERTIES.reduce((n, p) => n + (PROPERTY_CONFIG[p.id]?.products.length ?? 0), 0)
  const activatedSlots = Object.values(activated).reduce((n, s) => n + s.size, 0)
  const readySlots    = PROPERTIES.reduce((n, prop) => {
    const config = PROPERTY_CONFIG[prop.id]
    if (!config) return n
    return n + config.products.filter(pk => {
      if ((activated[prop.id] ?? new Set()).has(pk)) return false
      return (config.blockers[pk] ?? []).length === 0
    }).length
  }, 0)
  const blockedSlots = totalSlots - activatedSlots - readySlots

  function handleActivate(propId: string, product: ProductKey) {
    setActivated(prev => {
      const existing = new Set(prev[propId] ?? [])
      existing.add(product)
      return { ...prev, [propId]: existing }
    })
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Go Live</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          Activate individual products per property. A property contracted for Maintenance AI can go live with Maintenance AI independently — no need to wait on other products.
        </p>
      </div>

      {/* Payments AI activation window notice */}
      <div className={cn(
        "rounded-xl border px-4 py-3 flex items-start gap-3",
        paymentsWindowOpen
          ? "border-emerald-200 bg-emerald-50"
          : "border-amber-200 bg-amber-50",
      )}>
        <CalendarClock className={cn("h-4 w-4 shrink-0 mt-0.5", paymentsWindowOpen ? "text-emerald-600" : "text-amber-600")} aria-hidden />
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold", paymentsWindowOpen ? "text-emerald-900" : "text-amber-900")}>
            {paymentsWindowOpen
              ? "Payments AI activation window is open"
              : "Payments AI activation window is currently closed"}
          </p>
          <p className={cn("text-xs mt-0.5 leading-relaxed", paymentsWindowOpen ? "text-emerald-800" : "text-amber-800")}>
            Payments AI can only go live on the <strong>2nd or 8th of each month</strong>. This ensures resident charge notifications align correctly with your billing cycle and avoids sending incorrect reminders mid-cycle.
            {!paymentsWindowOpen && <> Next available window: <strong>{getNextPaymentsWindow()}</strong>. All other products can be activated at any time.</>}
            {paymentsWindowOpen && <> Today is an activation date — Payments AI is available for all ready properties.</>}
          </p>
        </div>
        {/* Demo toggle */}
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Demo</span>
          <button
            type="button"
            onClick={() => setPaymentsWindowOpen(v => !v)}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
              paymentsWindowOpen ? "bg-emerald-500" : "bg-zinc-300",
            )}
            aria-label="Toggle payments activation window"
          >
            <span className={cn(
              "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
              paymentsWindowOpen ? "translate-x-4" : "translate-x-1",
            )} />
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Products Live",    value: activatedSlots, color: "text-emerald-700" },
          { label: "Ready to Activate", value: readySlots,     color: "text-foreground" },
          { label: "Needs Work",        value: blockedSlots,   color: "text-red-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-white px-4 py-3 text-center">
            <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden />
          <input
            type="text"
            placeholder="Search properties…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 rounded-lg border border-border bg-white pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          />
        </div>
        <div className="relative">
          <select
            value={group}
            onChange={e => setGroup(e.target.value as PropertyGroup)}
            className="h-9 appearance-none rounded-lg border border-border bg-white pl-3 pr-9 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          >
            {PROPERTY_GROUPS.map(g => (
              <option key={g} value={g}>{g === "All" ? "All Groups" : g}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        </div>
        {(search || group !== "All") && (
          <span className="text-xs text-muted-foreground">{filtered.length} of {PROPERTIES.length} shown</span>
        )}
      </div>

      {/* Property list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-10 w-10 text-muted-foreground/30 mb-3" aria-hidden />
          <p className="text-sm font-medium text-foreground">No properties match</p>
          <p className="text-xs text-muted-foreground mt-1">Try a different search or group filter.</p>
          <button
            type="button"
            onClick={() => { setSearch(""); setGroup("All") }}
            className="mt-3 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map(prop => {
            const config = PROPERTY_CONFIG[prop.id] ?? { products: [], blockers: {} }
            return (
              <li key={prop.id}>
                <PropertyCard
                  property={prop}
                  config={config}
                  activated={activated[prop.id] ?? new Set()}
                  paymentsWindowOpen={paymentsWindowOpen}
                  onActivate={product => handleActivate(prop.id, product)}
                  onNavigate={navigate}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
