"use client"
/**
 * OVERVIEW TAB — DEVELOPER NOTES
 *
 * Purpose: The overview is the user's prioritized to-do list for the full ELI+
 * implementation. Every required setting surfaces here as a card. Users should
 * never have to hunt across tabs to know what's left.
 *
 * Card ordering (top to bottom):
 *   1. Privacy Policy   — always pinned #1. Carrier compliance. Missing this
 *                          can delay go-live from 1 day to several weeks.
 *   2. Email Integration — pinned #2. Required before any AI service can send.
 *   3. Carrier compliance items (carrierCompliance: true in mock.ts) — any
 *                          additional settings that live in the Carrier
 *                          Compliance tab and are not yet resolved.
 *   4. Critical          — hard blockers. ELI cannot operate without these.
 *   5. Attention         — important but don't fully stop go-live.
 *   6. Default           — smart defaults were applied; user reviews and confirms.
 *   7. IVR Setup         — unlocks after carrier compliance is complete.
 *   Completed items sink to the bottom.
 *
 * Product filter tabs:
 *   "All Agents" shows every incomplete item regardless of product.
 *   Product-specific tabs (Leasing AI, Payments AI, etc.) show only the items
 *   tagged for that product, plus items tagged product: "all" (cross-agent settings).
 *
 * What NOT to include in card copy:
 *   - Internal API names or endpoint paths.
 *   - Technical implementation details.
 *   Focus on: what the setting does for the user, why it matters for go-live,
 *   and what the consequence of skipping it is.
 *
 * See DEVELOPER-NOTES.md in this prototype folder for full design rationale.
 */

import { useState, useEffect, useCallback } from "react"
import type { PageId } from "../index"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowRight, AlertTriangle, CheckCircle2, Users, CreditCard, Wrench, RefreshCw, Sparkles, Database, ChevronDown, Lock } from "lucide-react"
import { NEEDS_ATTENTION } from "../data/mock"
import type { ProductTag } from "../data/mock"
import { TaskSheet } from "../components/TaskSheet"
import { PrivacySheetContent } from "../components/PrivacySheetContent"
import { TenDlcSheetContent } from "../components/TenDlcSheetContent"
import { EmailSheetContent } from "../components/EmailSheetContent"
import { PaymentsSheetContent } from "../components/PaymentsSheetContent"
import { DateSettingSheetContent } from "../components/DateSettingSheetContent"
import { PaymentPlansSheetContent } from "../components/PaymentPlansSheetContent"
import { PaymentLinkSheetContent } from "../components/PaymentLinkSheetContent"
import { PolicySheetContent } from "../components/PolicySheetContent"
import { LateFeeSheetContent, type LateFeeState } from "../components/LateFeeSheetContent"
import { PaymentPlanPolicySheetContent, type PaymentPlanPolicyState } from "../components/PaymentPlanPolicySheetContent"
import { PaymentOptionsSheetContent } from "../components/PaymentOptionsSheetContent"
import { PhoneNumberSheetContent } from "../components/PhoneNumberSheetContent"
import { RenewalLeadTimeSheetContent } from "../components/RenewalLeadTimeSheetContent"
import { IvrSetupSheetContent } from "../components/IvrSetupSheetContent"
import { AgentGoalSheetContent } from "../components/AgentGoalSheetContent"
import { ModelUnitsSheetContent } from "../components/ModelUnitsSheetContent"
import { TourTypesSheetContent } from "../components/TourTypesSheetContent"
import type { TourPropertySettings } from "../components/TourTypesSheetContent"
import { TourPrioritySheetContent } from "../components/TourPrioritySheetContent"
import { LeasingPoliciesSheetContent, type LeasingPoliciesState } from "../components/LeasingPoliciesSheetContent"
import { ENTRATA_DURING_PHONES, ENTRATA_AFTER_PHONES, ENTRATA_DURING_PATH, ENTRATA_AFTER_PATH } from "../data/entrata-imports"
import { PROPERTIES } from "../data/properties"

type SheetId = PageId | "ten-dlc-privacy" | "email-integration" | "ivr-setup" | "rent-charge-date" | "rent-due-date" | "payment-plans" | "payment-block-date" | "payment-link" | "grace-period" | "outstanding-balance" | "late-fee-policy" | "payment-plan-policy" | "payment-options" | "maintenance-during-escalation" | "maintenance-after-escalation" | "renewal-lead-time" | "agent-goal" | "model-units" | "tour-types" | "tour-priority" | "leasing-policies"

const PRODUCT_FILTERS: { tag: ProductTag | "all"; label: string }[] = [
  { tag: "all",         label: "All Agents" },
  { tag: "leasing",     label: "Leasing AI" },
  { tag: "payments",    label: "Payments AI" },
  { tag: "maintenance", label: "Maintenance AI" },
  { tag: "renewals",    label: "Renewals AI" },
]

const SEV_PILL: Record<string, string> = {
  critical:  "border border-red-300 bg-red-50 text-red-600",
  attention: "border border-amber-300 bg-amber-50 text-amber-700",
  waiting:   "border border-zinc-300 bg-white text-zinc-500",
  default:   "border border-blue-200 bg-blue-50 text-blue-700",
}

const SEV_LABEL: Record<string, string> = {
  critical:  "Action Required",
  attention: "Needs Review",
  waiting:   "Pending",
  default:   "Default Applied",
}

/** Default day values inferred from Entrata for date-type settings. */
const DEFAULT_DAY: Partial<Record<SheetId, string>> = {
  "rent-charge-date":   "1",
  "rent-due-date":      "1",
  "payment-block-date": "6",
  "grace-period":       "4",
}

const SHEET_TITLE: Partial<Record<SheetId, string>> = {
  privacy:                         "Privacy Policy Coverage",
  payments:                        "Verify Payments AI Defaults",
  "rent-charge-date":              "Rent Charge Date",
  "rent-due-date":                 "Rent Due Date",
  "payment-plans":                 "Payment Plans",
  "payment-block-date":            "Payment Block Date",
  "payment-link":                  "Payment Portal Links",
  "grace-period":                  "Grace Period Date",
  "outstanding-balance":           "Outstanding Balance Threshold",
  "late-fee-policy":               "Late Fee Policy",
  "payment-plan-policy":           "Payment Plan Policy",
  "payment-options":               "Payment Options & Availability",
  "maintenance-during-escalation": "During-Escalation Phone Number",
  "maintenance-after-escalation":  "After-Escalation Phone Number",
  "renewal-lead-time":             "Renewal Outreach Lead Time",
  "agent-goal":                    "Agent Goal Setting",
  "model-units":                   "Model Unit Availability",
  "tour-types":                    "Tour Types & Settings",
  "tour-priority":                 "Tour Priority Order",
  "leasing-policies":              "Leasing Policies",
}

const SHEET_DESCRIPTION: Partial<Record<SheetId, string>> = {
  privacy:                         "8 properties need their privacy policy updated with SMS consent language. Additionally, 3 properties using third-party websites must add an opt-in consent checkbox to their contact forms.",
  "rent-charge-date":              "The day of month rent is posted to resident ledgers. Set a bulk value or customize per property.",
  "rent-due-date":                 "The day rent is officially overdue. Must align with your lease agreements to avoid improper late fees.",
  "payment-plans":                 "Confirm which communities allow residents to split outstanding balances into installments.",
  "payment-block-date":            "The day online payments are blocked each month to allow for accounting close. Applies across all properties.",
  "payment-link":                  "The URL ELI includes in outbound messages to direct residents to your payment portal.",
  "grace-period":                  "How many days after the due date before late fees apply. Set per lease agreement terms.",
  "outstanding-balance":           "The minimum balance required before ELI sends a collection nudge to a resident.",
  "late-fee-policy":               "Policy language ELI uses in automated late fee notices. 4 properties pulled from Entrata, 8 have a standard default applied — review and adjust per property.",
  "payment-plan-policy":           "Policy language ELI uses when residents inquire about payment plans. 3 properties pulled from Entrata, 9 have a standard default applied — review and adjust per property.",
  "payment-options":               "Define which payment methods residents can use and the day of month each becomes available — in bulk or per property.",
  "maintenance-during-escalation": "The phone number ELI connects residents to while a maintenance escalation is actively in progress.",
  "maintenance-after-escalation":  "The phone number ELI uses for follow-up contacts after a maintenance escalation has been resolved.",
  "renewal-lead-time":             "How many days before lease expiration ELI begins renewal outreach — set per property. Default of 120 days has been applied.",
  "agent-goal":                    "The primary action ELI pushes prospects toward at each property. Defaults to Schedule Tour — switch to Fill Application for high-demand properties.",
  "model-units":                   "Whether each property has furnished model units available for touring. Pulled from Entrata where available.",
  "tour-types":                    "Which tour types are offered at each property and their sub-settings. Availability pulled from Entrata; lengths and instructions use defaults where not found.",
  "tour-priority":                 "When a prospect qualifies for multiple tour types, ELI recommends them in this order. Drag to reorder.",
  "leasing-policies":              "Policies ELI references when answering prospect questions. Pet, Parking, and Smoking policies were imported from Entrata — review the remaining defaults and update any that don't match your community rules.",
}

function BoldNumbers({ text }: { text: string }) {
  const parts = text.split(/(\d+(?:\s*\/\s*\d+)?)/g)
  return (
    <>
      {parts.map((part, i) =>
        /^\d/.test(part)
          ? <strong key={i} className="font-semibold text-foreground">{part}</strong>
          : <span key={i}>{part}</span>,
      )}
    </>
  )
}

interface ProductCardProps { label: string; icon: React.ElementType; done: number; total: number; unit?: string }
function ProductCard({ label, icon: Icon, done, total, unit = "properties" }: ProductCardProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-5 flex flex-col gap-3">
      {/* Label row: icon + name left, percentage right (small, like sidebar) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
          <p className="text-sm font-medium text-foreground">{label}</p>
        </div>
        <span className="text-sm font-semibold text-emerald-700 tabular-nums">{pct}%</span>
      </div>
      {/* Big number row */}
      <div className="flex items-baseline gap-1.5">
        <p className="text-3xl font-bold text-foreground tabular-nums">{done}</p>
        <p className="text-sm text-muted-foreground">/ {total} {unit}</p>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
        <div className="h-full rounded-full bg-emerald-700 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Simple toast notification */
interface ToastProps { message: string; visible: boolean }
function Toast({ message, visible }: ToastProps) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "absolute top-4 left-1/2 -translate-x-1/2 z-[60] flex items-start gap-3 rounded-xl border border-zinc-900 bg-white px-5 py-4 shadow-lg w-max max-w-sm transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none",
      )}
    >
      <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden />
      <p className="text-sm text-foreground leading-snug">{message}</p>
    </div>
  )
}

interface Props {
  navigate: (to: PageId) => void
  completedTasks: Set<string>
  onComplete: (id: string) => void
  privacyPublished: boolean
  onPrivacyPublish: () => void
  emailComplete: boolean
  onEmailComplete: () => void
  commsComplete: boolean
  ivrComplete: boolean
  onIvrComplete: () => void
  agentGoals: Record<string, string>
  onAgentGoalChange: (id: string, val: string) => void
  modelUnits: Record<string, string>
  onModelUnitChange: (id: string, val: string) => void
  tourSettings: Record<string, TourPropertySettings>
  onTourSettingChange: (id: string, field: keyof TourPropertySettings, val: string | boolean) => void
  tourPriority: string[]
  onTourPriorityChange: (priority: string[]) => void
  leasingPolicies: LeasingPoliciesState
  onLeasingPolicyChange: (policyId: string, propertyId: string, val: string) => void
  lateFeePolicy: LateFeeState
  onLateFeeChange: (propId: string, val: string) => void
  paymentPlanPolicy: PaymentPlanPolicyState
  onPaymentPlanPolicyChange: (propId: string, val: string) => void
  duringPhones: Record<string, string>
  onDuringPhoneChange: (id: string, val: string) => void
  duringFilled: number
  afterPhones: Record<string, string>
  onAfterPhoneChange: (id: string, val: string) => void
  afterFilled: number
  totalProps: number
  renewalDays: Record<string, string>
  onRenewalDayChange: (id: string, val: string) => void
  renewalFilled: number
  renewalAllFilled: boolean
}

export function OverviewPage({ navigate, completedTasks, onComplete, privacyPublished, onPrivacyPublish, emailComplete, onEmailComplete, commsComplete, ivrComplete, onIvrComplete, agentGoals, onAgentGoalChange, modelUnits, onModelUnitChange, tourSettings, onTourSettingChange, tourPriority, onTourPriorityChange, leasingPolicies, onLeasingPolicyChange, lateFeePolicy, onLateFeeChange, paymentPlanPolicy, onPaymentPlanPolicyChange, duringPhones, onDuringPhoneChange, duringFilled, afterPhones, onAfterPhoneChange, afterFilled, totalProps, renewalDays, onRenewalDayChange, renewalFilled, renewalAllFilled }: Props) {
  const [activeSheet, setActiveSheet] = useState<SheetId | null>(null)
  const [privacySheetValid, setPrivacySheetValid] = useState(false)
  const [sheetValid, setSheetValid] = useState(false)
  const [productFilter, setProductFilter] = useState<ProductTag | "all">("all")
  const [showCompleted, setShowCompleted] = useState(false)

  const duringAllFilled = duringFilled === totalProps
  const afterAllFilled = afterFilled === totalProps
  // Items that have "settled" (been complete long enough to move to the bottom)
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set())
  // Toast
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false })

  // When a new task completes: show toast, then after 1.5s move it to the bottom
  useEffect(() => {
    completedTasks.forEach((id) => {
      if (!settledIds.has(id)) {
        const timer = setTimeout(() => {
          setSettledIds((prev) => new Set([...prev, id]))
        }, 2000)
        return () => clearTimeout(timer)
      }
    })
  }, [completedTasks]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss toast after 3s
  useEffect(() => {
    if (!toast.visible) return
    const t = setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000)
    return () => clearTimeout(t)
  }, [toast.visible])

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true })
  }, [])

  const ivrUnlocked = commsComplete

  // Progress counter — 103 represents the full implementation scope across all ELI+ products
  const TOTAL_CONFIGS = 103
  const doneCount =
    NEEDS_ATTENTION.filter((i) => completedTasks.has(i.id)).length +
    (privacyPublished ? 1 : 0) +
    (emailComplete ? 1 : 0) +
    (ivrComplete ? 1 : 0)

  // Completed pinned items (for the "Show completed" section)
  const completedPinnedItems: Array<{ id: string; title: string }> = [
    ...(privacyPublished ? [{ id: "ten-dlc-privacy", title: "Add a Privacy Policy for Carrier Compliance" }] : []),
    ...(emailComplete ? [{ id: "email-integration", title: "Set Up Email Integration" }] : []),
    ...(ivrComplete ? [{ id: "ivr-setup", title: "Property IVR Setup" }] : []),
  ]

  // Show all items on the overview, filtered by selected product tab.
  // product: "all" items appear under every tab (cross-agent settings).
  const filteredItems = NEEDS_ATTENTION.filter(
    (i) => productFilter === "all" || i.product === productFilter || i.product === "all",
  )

  // Sort order: carrier compliance → critical → attention → default → waiting → settled/complete
  const SEV_ORDER: Record<string, number> = { critical: 1, attention: 2, default: 3, waiting: 4 }

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (settledIds.has(a.id) && !settledIds.has(b.id)) return 1
    if (!settledIds.has(a.id) && settledIds.has(b.id)) return -1
    const aRank = a.carrierCompliance ? 0 : (SEV_ORDER[a.severity] ?? 4)
    const bRank = b.carrierCompliance ? 0 : (SEV_ORDER[b.severity] ?? 4)
    return aRank - bRank
  })

  // Split: active blockers vs settled/completed
  const requiredItems  = sortedItems.filter((i) => !settledIds.has(i.id))
  const completedItems = sortedItems.filter((i) =>  settledIds.has(i.id))

  function handleSave() {
    if (!activeSheet) return

    // Phone sheets: only complete when every property has a number
    if (activeSheet === "maintenance-during-escalation") {
      if (duringAllFilled) {
        onComplete("maintenance-during-escalation")
        showToast("During-escalation numbers saved for all properties!")
      } else {
        showToast(`Progress saved — ${duringFilled}/${totalProps} numbers entered. Finish the rest to complete this item.`)
      }
      setActiveSheet(null)
      return
    }
    if (activeSheet === "maintenance-after-escalation") {
      if (afterAllFilled) {
        onComplete("maintenance-after-escalation")
        showToast("After-escalation numbers saved for all properties!")
      } else {
        showToast(`Progress saved — ${afterFilled}/${totalProps} numbers entered. Finish the rest to complete this item.`)
      }
      setActiveSheet(null)
      return
    }

    if (activeSheet === "renewal-lead-time") {
      if (renewalAllFilled) {
        onComplete("renewal-lead-time")
        showToast("Renewal lead times saved for all properties!")
      } else {
        showToast(`Progress saved — ${renewalFilled}/${totalProps} properties configured. Finish the rest to complete this item.`)
      }
      setActiveSheet(null)
      return
    }

    if (activeSheet === "ivr-setup") {
      onIvrComplete()
      showToast("Property IVR configured for all properties!")
      setActiveSheet(null)
      return
    }

    const item = NEEDS_ATTENTION.find((i) => i.to === activeSheet)
    if (item) {
      onComplete(item.id)
      showToast(`Marked complete! Find it under "Show completed" below.`)
    }
    setActiveSheet(null)
    setPrivacySheetValid(false)
    setSheetValid(false)
  }

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 relative">
        <div className="max-w-5xl">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome, Sunset Property Group!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track setup progress, confirm required settings, and activate ELI+ across your portfolio.
          </p>
        </div>

        {/* Product progress cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl">
          <ProductCard label="Leasing AI"     icon={Users}      done={9}  total={52} />
          <ProductCard label="Payments AI"    icon={CreditCard} done={24} total={52} />
          <ProductCard label="Maintenance AI" icon={Wrench}     done={0}  total={52} />
          <ProductCard label="Renewals AI"    icon={RefreshCw}  done={0}  total={52} />
        </div>

        {/* Action items */}
        <div className="space-y-3 max-w-4xl">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Action Items</h2>
            <span className="text-xs text-muted-foreground tabular-nums">{doneCount} / {TOTAL_CONFIGS} complete</span>
          </div>

          <div className="h-1 w-full rounded-full bg-zinc-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-700 transition-all duration-500"
              style={{ width: `${Math.min(100, (doneCount / TOTAL_CONFIGS) * 100)}%` }}
            />
          </div>

          {/* ── Product filter tabs ───────────────────────────────────────── */}
          <div className="flex items-center gap-1 flex-wrap">
            {PRODUCT_FILTERS.map(({ tag, label }) => (
              <button
                key={tag}
                type="button"
                onClick={() => setProductFilter(tag)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors border",
                  productFilter === tag
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── All complete banner ───────────────────────────────────────── */}
          {requiredItems.length === 0 && privacyPublished && emailComplete && ivrComplete && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />
              <p className="text-sm font-medium text-emerald-800">
                All required items are complete
                {productFilter !== "all" ? ` for ${PRODUCT_FILTERS.find(f => f.tag === productFilter)?.label}` : ""} — you're ready to go live.
              </p>
            </div>
          )}

          <ul className="space-y-3">
            {/* ── 10DLC Privacy Policy card — hidden once complete ──────────── */}
            {!privacyPublished && (
              <li
                className="group rounded-xl border bg-card border-border hover:border-zinc-400 hover:shadow-md hover:-translate-y-px cursor-pointer transition-all duration-300"
                onClick={() => setActiveSheet("ten-dlc-privacy")}
              >
                <div className="p-6 flex flex-col gap-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      Add a Privacy Policy for Carrier Compliance
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 mt-0.5 border border-red-300 bg-red-50 text-red-600">
                      <AlertTriangle className="h-3 w-3" aria-hidden />
                      Action Required
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed max-w-prose text-zinc-600">
                    A publicly accessible privacy policy is required to keep your texts compliant. Without one, carriers can block your messages or your company could face fines.
                  </p>
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <p className="text-xs text-zinc-500">Required for SMS carrier registration</p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setActiveSheet("ten-dlc-privacy") }}
                      className={cn(buttonVariants({ variant: "eli", size: "sm" }), "whitespace-nowrap shrink-0 shadow-sm group-hover:shadow transition-shadow")}
                    >
                      Start
                      <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            )}

            {/* ── Email Integration card — hidden once complete ─────────────── */}
            {!emailComplete && (
              <li
                className="group rounded-xl border bg-card border-border hover:border-zinc-400 hover:shadow-md hover:-translate-y-px cursor-pointer transition-all duration-300"
                onClick={() => setActiveSheet("email-integration")}
              >
                <div className="p-6 flex flex-col gap-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      Set Up Email Integration
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 mt-0.5 border border-red-300 bg-red-50 text-red-600">
                      <AlertTriangle className="h-3 w-3" aria-hidden />
                      Action Required
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed max-w-prose text-zinc-600">
                    Connect email addresses for each property so ELI+ can send automated and staff-managed messages from your own domain. All contracted AI services must be configured before go-live.
                  </p>
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <p className="text-xs text-zinc-500">7 of 16 properties connected · 0 of 16 ELI+ complete</p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setActiveSheet("email-integration") }}
                      className={cn(buttonVariants({ variant: "eli", size: "sm" }), "whitespace-nowrap shrink-0 shadow-sm group-hover:shadow transition-shadow")}
                    >
                      Start
                      <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            )}

            {/* ── IVR Setup — locked until comms complete, hidden once complete ── */}
            {!ivrComplete && (
              commsComplete ? (
                <li
                  className="group rounded-xl border bg-card border-border hover:border-zinc-400 hover:shadow-md hover:-translate-y-px cursor-pointer transition-all duration-300"
                  onClick={() => setActiveSheet("ivr-setup")}
                >
                  <div className="p-6 flex flex-col gap-3">
                    <div className="flex items-start gap-2 flex-wrap">
                      <p className="text-sm font-semibold leading-snug text-foreground">
                        Property IVR Setup
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 mt-0.5 border border-red-300 bg-red-50 text-red-600">
                        <AlertTriangle className="h-3 w-3" aria-hidden />
                        Action Required
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed max-w-prose text-zinc-600">
                      We've applied a default phone menu to all {PROPERTIES.length} properties — callers can reach leasing, maintenance, payments, or staff. Review the default and customize any property that needs a different setup. Required before any AI agent can go live.
                    </p>
                    <div className="flex items-center justify-between gap-4 pt-1">
                      <p className="text-xs text-zinc-500">Required for all agents · {PROPERTIES.length} properties configured with default</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveSheet("ivr-setup") }}
                        className={cn(buttonVariants({ variant: "eli", size: "sm" }), "whitespace-nowrap shrink-0 shadow-sm group-hover:shadow transition-shadow")}
                      >
                        Review & confirm
                        <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              ) : (
                <li className="rounded-xl border border-border bg-zinc-50 opacity-60 cursor-not-allowed transition-all duration-300">
                  <div className="p-6 flex flex-col gap-3">
                    <div className="flex items-start gap-2 flex-wrap">
                      <p className="text-sm font-semibold leading-snug text-zinc-400">
                        Property IVR Setup
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 mt-0.5 border border-zinc-200 bg-white text-zinc-400">
                        <Lock className="h-3 w-3" aria-hidden />
                        Locked
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed max-w-prose text-zinc-400">
                      Complete the Communications tab first — each property needs a phone number assigned before IVR routing can be configured.
                    </p>
                    <div className="flex items-center justify-between gap-4 pt-1">
                      <p className="text-xs text-zinc-400">Unlocks after all properties have a compliance phone number</p>
                      <button
                        type="button"
                        disabled
                        onClick={(e) => { e.stopPropagation(); navigate("communications") }}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "whitespace-nowrap shrink-0 opacity-50 cursor-not-allowed")}
                      >
                        Go to Communications
                        <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              )
            )}

            {requiredItems.map((item) => {
              const done = completedTasks.has(item.id)

              // Dynamic progress for per-property settings
              const liveProgress: { done: number; total: number; unit: string } | undefined =
                item.id === "maintenance-during-escalation"
                  ? { done: duringFilled, total: totalProps, unit: "properties" }
                  : item.id === "maintenance-after-escalation"
                    ? { done: afterFilled, total: totalProps, unit: "properties" }
                    : item.id === "renewal-lead-time"
                      ? { done: renewalFilled, total: totalProps, unit: "properties" }
                      : item.progress

              return (
                <li
                  key={item.id}
                  className={cn(
                    "group rounded-xl border bg-card transition-all duration-300",
                    done
                      ? "border-border opacity-70"
                      : "border-border hover:border-zinc-400 hover:shadow-md hover:-translate-y-px cursor-pointer",
                  )}
                  onClick={() => !done && item.severity !== "waiting" && setActiveSheet(item.to as SheetId)}
                >
                  <div className="p-6 flex flex-col gap-3">

                    <div className="flex items-start gap-2 flex-wrap">
                      <p className={cn("text-sm font-semibold leading-snug", done ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-foreground")}>
                        {item.title}
                      </p>
                      {done ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 mt-0.5 border border-emerald-600/40 bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" aria-hidden />
                          Complete
                        </span>
                      ) : item.severity === "default" ? (
                        <>
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 mt-0.5 border border-blue-200 bg-blue-50 text-blue-700">
                            <Sparkles className="h-3 w-3" aria-hidden />
                            Default Applied
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 mt-0.5 border border-emerald-200 bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" aria-hidden />
                            Complete
                          </span>
                        </>
                      ) : (
                        <>
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 mt-0.5", SEV_PILL[item.severity])}>
                            {(item.severity === "attention" || item.severity === "critical") && <AlertTriangle className="h-3 w-3" aria-hidden />}
                            {SEV_LABEL[item.severity]}
                          </span>
                          {item.entrataImported && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 mt-0.5 border border-indigo-200 bg-indigo-50 text-indigo-700">
                              <Database className="h-3 w-3" aria-hidden />
                              {item.entrataImported.count} pulled from Entrata
                            </span>
                          )}
                          {item.defaultsApplied && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 mt-0.5 border border-blue-200 bg-blue-50 text-blue-700">
                              <Sparkles className="h-3 w-3" aria-hidden />
                              {item.defaultsApplied.count} defaults applied
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Body — always visible */}
                    <p className={cn("text-sm leading-relaxed max-w-prose", done ? "text-zinc-400" : "text-zinc-600")}>
                      {item.why}
                    </p>

                    <div className="flex items-center justify-between gap-4 pt-1">
                      <div className="flex items-center gap-3 min-w-0">
                        {liveProgress && (
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="h-1.5 w-20 rounded-full bg-zinc-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-700 transition-all duration-700"
                                style={{ width: done ? "100%" : (liveProgress.total > 0 ? `${(liveProgress.done / liveProgress.total) * 100}%` : "0%") }}
                              />
                            </div>
                            <span className="text-xs font-medium text-zinc-500 tabular-nums whitespace-nowrap">
                              {done
                                ? `${liveProgress.total}/${liveProgress.total} ${liveProgress.unit}`
                                : `${liveProgress.done}/${liveProgress.total} ${liveProgress.unit}`}
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-zinc-500 truncate">
                          <BoldNumbers text={item.summary} />
                        </p>
                      </div>

                      {!done && item.severity !== "waiting" && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setActiveSheet(item.to as SheetId) }}
                          className={cn(buttonVariants({ variant: "eli", size: "sm" }), "whitespace-nowrap shrink-0 shadow-sm group-hover:shadow transition-shadow")}
                        >
                          {item.severity === "default" ? "Review" : "Start"}
                          <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden />
                        </button>
                      )}
                    </div>

                  </div>
                </li>
              )
            })}
          </ul>


          {/* ── Show completed toggle ─────────────────────────────────────── */}
          {(completedPinnedItems.length > 0 || completedItems.length > 0) && (
            <div className="pt-1 border-t border-border">
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 transition-transform duration-200", showCompleted ? "rotate-0" : "-rotate-90")}
                  aria-hidden
                />
                {showCompleted ? "Hide" : "Show"} completed ({completedPinnedItems.length + completedItems.length})
              </button>

              {showCompleted && (
                <ul className="space-y-2 mt-2 opacity-60">
                  {completedPinnedItems.map((item) => (
                    <li key={item.id} className="rounded-xl border border-border bg-card px-5 py-3 flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />
                      <p className="text-sm font-medium text-muted-foreground line-through decoration-muted-foreground/40 flex-1">{item.title}</p>
                      <span className="text-xs text-muted-foreground">Complete</span>
                    </li>
                  ))}
                  {completedItems.map((item) => (
                    <li key={item.id} className="rounded-xl border border-border bg-card px-5 py-3 flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />
                      <p className="text-sm font-medium text-muted-foreground line-through decoration-muted-foreground/40 flex-1">{item.title}</p>
                      <span className="text-xs text-muted-foreground">Complete</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

        </div>

        <Toast message={toast.message} visible={toast.visible} />
      </div>

      {/* Task sheets */}
      <TaskSheet
        open={activeSheet === "ten-dlc-privacy"}
        title="Carrier Compliance — Privacy Policy"
        description="A publicly accessible privacy policy is required to keep your texts and calls compliant. We scan your website automatically — or generate one below."
        onClose={() => setActiveSheet(null)}
        onSave={() => { onPrivacyPublish(); setActiveSheet(null); showToast("Privacy policy published! Carrier compliance is complete.") }}
        saveLabel="Save & Mark Complete"
        saveDisabled={false}
      >
        <TenDlcSheetContent onPublish={() => { onPrivacyPublish(); setActiveSheet(null); showToast("Privacy policy published! Carrier compliance is complete.") }} alreadyPublished={privacyPublished} />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "email-integration"}
        title="Email Integration"
        description="Connect email addresses for each property so ELI+ AI services send messages from your own domain."
        onClose={() => setActiveSheet(null)}
        onSave={() => { onEmailComplete(); setActiveSheet(null); showToast("Email integration confirmed!") }}
        saveLabel="Save & Mark Complete"
      >
        <EmailSheetContent alreadyComplete={emailComplete} />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "ivr-setup"}
        title="Property IVR Setup"
        description="Select between the preferred Entrata IVR, an existing Entrata IVR, or a 3rd party IVR to route callers to leasing, maintenance, and other departments."
        onClose={() => setActiveSheet(null)}
        onSave={handleSave}
        saveLabel="Confirm & Complete"
      >
        <IvrSetupSheetContent onValidChange={setSheetValid} />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "privacy"}
        title={SHEET_TITLE["privacy"] ?? ""}
        description={SHEET_DESCRIPTION["privacy"]}
        onClose={() => { setActiveSheet(null); setPrivacySheetValid(false) }}
        onSave={handleSave}
        saveLabel="Publish to 8 Websites & Confirm All"
        saveDisabled={!privacySheetValid}
      >
        <PrivacySheetContent onValidChange={setPrivacySheetValid} />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "payments"}
        title={SHEET_TITLE["payments"] ?? ""}
        onClose={() => setActiveSheet(null)}
        onSave={handleSave}
        saveLabel="Confirm All Settings"
      >
        <PaymentsSheetContent navigate={navigate} onSheetClose={() => setActiveSheet(null)} />
      </TaskSheet>

      {(["rent-charge-date", "rent-due-date", "payment-block-date", "grace-period", "outstanding-balance"] as const).map((id) => (
        <TaskSheet
          key={id}
          open={activeSheet === id}
          title={SHEET_TITLE[id] ?? ""}
          description={SHEET_DESCRIPTION[id]}
          onClose={() => { setActiveSheet(null); setSheetValid(false) }}
          onSave={handleSave}
          saveLabel="Confirm & Save"
          saveDisabled={false}
        >
          <DateSettingSheetContent
            label={SHEET_TITLE[id] ?? id}
            onValidChange={setSheetValid}
            defaultDay={DEFAULT_DAY[id]}
          />
        </TaskSheet>
      ))}

      <TaskSheet
        open={activeSheet === "payment-plans"}
        title={SHEET_TITLE["payment-plans"] ?? ""}
        description={SHEET_DESCRIPTION["payment-plans"]}
        onClose={() => { setActiveSheet(null); setSheetValid(false) }}
        onSave={handleSave}
        saveLabel="Confirm & Save"
        saveDisabled={false}
      >
        <PaymentPlansSheetContent onValidChange={setSheetValid} />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "payment-link"}
        title={SHEET_TITLE["payment-link"] ?? ""}
        description={SHEET_DESCRIPTION["payment-link"]}
        onClose={() => { setActiveSheet(null); setSheetValid(false) }}
        onSave={handleSave}
        saveLabel="Save Payment Links"
        saveDisabled={!sheetValid}
      >
        <PaymentLinkSheetContent onValidChange={setSheetValid} />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "late-fee-policy"}
        title={SHEET_TITLE["late-fee-policy"] ?? ""}
        description={SHEET_DESCRIPTION["late-fee-policy"]}
        onClose={() => { setActiveSheet(null); setSheetValid(false) }}
        onSave={handleSave}
        saveLabel="Confirm & Save"
        saveDisabled={false}
      >
        <LateFeeSheetContent
          policies={lateFeePolicy}
          onChange={onLateFeeChange}
          onValidChange={setSheetValid}
        />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "payment-plan-policy"}
        title={SHEET_TITLE["payment-plan-policy"] ?? ""}
        description={SHEET_DESCRIPTION["payment-plan-policy"]}
        onClose={() => { setActiveSheet(null); setSheetValid(false) }}
        onSave={handleSave}
        saveLabel="Confirm & Save"
        saveDisabled={false}
      >
        <PaymentPlanPolicySheetContent
          policies={paymentPlanPolicy}
          onChange={onPaymentPlanPolicyChange}
          onValidChange={setSheetValid}
        />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "payment-options"}
        title={SHEET_TITLE["payment-options"] ?? ""}
        description={SHEET_DESCRIPTION["payment-options"]}
        onClose={() => { setActiveSheet(null); setSheetValid(false) }}
        onSave={handleSave}
        saveLabel="Confirm & Save"
        saveDisabled={false}
      >
        <PaymentOptionsSheetContent onValidChange={setSheetValid} />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "maintenance-during-escalation"}
        title={SHEET_TITLE["maintenance-during-escalation"] ?? ""}
        description={SHEET_DESCRIPTION["maintenance-during-escalation"]}
        onClose={() => setActiveSheet(null)}
        onSave={handleSave}
        saveLabel={duringAllFilled ? "Save & Mark Complete" : `Save Progress (${duringFilled}/${totalProps})`}
        saveDisabled={duringFilled === 0}
      >
        <PhoneNumberSheetContent
          context="during"
          phones={duringPhones}
          onChange={onDuringPhoneChange}
          onValidChange={() => {}}
          entrataValues={ENTRATA_DURING_PHONES}
          entrataPath={ENTRATA_DURING_PATH}
        />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "maintenance-after-escalation"}
        title={SHEET_TITLE["maintenance-after-escalation"] ?? ""}
        description={SHEET_DESCRIPTION["maintenance-after-escalation"]}
        onClose={() => setActiveSheet(null)}
        onSave={handleSave}
        saveLabel={afterAllFilled ? "Save & Mark Complete" : `Save Progress (${afterFilled}/${totalProps})`}
        saveDisabled={afterFilled === 0}
      >
        <PhoneNumberSheetContent
          context="after"
          phones={afterPhones}
          onChange={onAfterPhoneChange}
          onValidChange={() => {}}
          entrataValues={ENTRATA_AFTER_PHONES}
          entrataPath={ENTRATA_AFTER_PATH}
        />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "renewal-lead-time"}
        title={SHEET_TITLE["renewal-lead-time"] ?? ""}
        description={SHEET_DESCRIPTION["renewal-lead-time"]}
        onClose={() => setActiveSheet(null)}
        onSave={handleSave}
        saveLabel={renewalAllFilled ? "Confirm & Save" : `Save Progress (${renewalFilled}/${totalProps})`}
        saveDisabled={false}
      >
        <RenewalLeadTimeSheetContent
          days={renewalDays}
          onChange={onRenewalDayChange}
          onValidChange={() => {}}
        />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "agent-goal"}
        title={SHEET_TITLE["agent-goal"] ?? ""}
        description={SHEET_DESCRIPTION["agent-goal"]}
        onClose={() => setActiveSheet(null)}
        onSave={handleSave}
        saveLabel="Confirm & Save"
        saveDisabled={false}
      >
        <AgentGoalSheetContent
          goals={agentGoals}
          onChange={onAgentGoalChange}
          onValidChange={() => {}}
        />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "model-units"}
        title={SHEET_TITLE["model-units"] ?? ""}
        description={SHEET_DESCRIPTION["model-units"]}
        onClose={() => setActiveSheet(null)}
        onSave={handleSave}
        saveLabel="Confirm & Save"
        saveDisabled={false}
      >
        <ModelUnitsSheetContent
          units={modelUnits}
          onChange={onModelUnitChange}
          onValidChange={() => {}}
        />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "tour-types"}
        title={SHEET_TITLE["tour-types"] ?? ""}
        description={SHEET_DESCRIPTION["tour-types"]}
        onClose={() => setActiveSheet(null)}
        onSave={handleSave}
        saveLabel="Confirm & Save"
        saveDisabled={false}
      >
        <TourTypesSheetContent
          settings={tourSettings}
          onChange={onTourSettingChange}
          onValidChange={() => {}}
        />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "tour-priority"}
        title={SHEET_TITLE["tour-priority"] ?? ""}
        description={SHEET_DESCRIPTION["tour-priority"]}
        onClose={() => setActiveSheet(null)}
        onSave={handleSave}
        saveLabel="Confirm & Save"
        saveDisabled={false}
      >
        <TourPrioritySheetContent
          priority={tourPriority}
          onChange={onTourPriorityChange}
          onValidChange={() => {}}
        />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "leasing-policies"}
        title={SHEET_TITLE["leasing-policies"] ?? ""}
        description={SHEET_DESCRIPTION["leasing-policies"]}
        onClose={() => setActiveSheet(null)}
        onSave={handleSave}
        saveLabel="Confirm & Save"
        saveDisabled={false}
      >
        <LeasingPoliciesSheetContent
          policies={leasingPolicies}
          onChange={onLeasingPolicyChange}
          onValidChange={() => {}}
        />
      </TaskSheet>

    </>
  )
}
