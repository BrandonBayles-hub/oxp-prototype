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
import type { SimMode } from "./CompanyPage"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowRight, AlertTriangle, CheckCircle2, Users, CreditCard, Wrench, RefreshCw, Sparkles, Database, ChevronDown, Lock, MapPin } from "lucide-react"
import { NEEDS_ATTENTION } from "../data/mock"
import type { ProductTag } from "../data/mock"
import { TaskSheet } from "../components/TaskSheet"
import { PrivacySheetContent } from "../components/PrivacySheetContent"
import { TenDlcSheetContent } from "../components/TenDlcSheetContent"
import { EmailSheetContent } from "../components/EmailSheetContent"
import { PaymentsSheetContent } from "../components/PaymentsSheetContent"
import { DateSettingSheetContent } from "../components/DateSettingSheetContent"
import { PAYMENT_SETTING_IDS } from "./PaymentsSummaryPage"
import { PaymentPlansSheetContent } from "../components/PaymentPlansSheetContent"
import { PaymentLinkSheetContent } from "../components/PaymentLinkSheetContent"
import { PolicySheetContent } from "../components/PolicySheetContent"
import { LateFeeSheetContent, type LateFeeState } from "../components/LateFeeSheetContent"
import { PaymentPlanPolicySheetContent, type PaymentPlanPolicyState } from "../components/PaymentPlanPolicySheetContent"
import { PaymentOptionsSheetContent } from "../components/PaymentOptionsSheetContent"
import { AddressRecipientSheetContent } from "../components/AddressRecipientSheetContent"
import { PhoneNumberSheetContent } from "../components/PhoneNumberSheetContent"
import { RenewalLeadTimeSheetContent } from "../components/RenewalLeadTimeSheetContent"
import { IvrSetupSheetContent } from "../components/IvrSetupSheetContent"
import { CarrierComplianceSheetContent } from "../components/CarrierComplianceSheetContent"
import { AgentGoalSheetContent } from "../components/AgentGoalSheetContent"
import { ModelUnitsSheetContent } from "../components/ModelUnitsSheetContent"
import { TourTypesSheetContent } from "../components/TourTypesSheetContent"
import type { TourPropertySettings } from "../components/TourTypesSheetContent"
import { TourPrioritySheetContent } from "../components/TourPrioritySheetContent"
import { LeasingPoliciesSheetContent, type LeasingPoliciesState, LEASING_POLICIES } from "../components/LeasingPoliciesSheetContent"
import { ENTRATA_DURING_PHONES, ENTRATA_AFTER_PHONES, ENTRATA_DURING_PATH, ENTRATA_AFTER_PATH } from "../data/entrata-imports"
import { PropertyFilter, usePropertyFilter } from "../components/PropertyFilter"
import { PROPERTIES } from "../data/properties"

type SheetId = PageId | "ten-dlc-privacy" | "email-integration" | "communications" | "ivr-setup" | "rent-charge-date" | "rent-due-date" | "payment-plans" | "payment-block-date" | "payment-link" | "grace-period" | "balance-reminder" | "outstanding-balance" | "payment-options" | "payment-installments" | "payment-address-recipient" | "late-fee-policy" | "payment-plan-policy" | "maintenance-during-escalation" | "maintenance-after-escalation" | "renewal-lead-time" | "agent-goal" | "model-units" | "tour-types" | "tour-priority" | "leasing-policies" | "leasing-policies-review" | "campus-proximity" | "campus-study-spaces" | "campus-semester-leases" | "campus-immediate-movein" | "carrier-missing" | "carrier-rejected"

const PRODUCT_FILTERS: { tag: ProductTag | "all"; label: string }[] = [
  { tag: "all",         label: "All Agents" },
  { tag: "leasing",     label: "Leasing AI" },
  { tag: "payments",    label: "Payments AI" },
  { tag: "maintenance", label: "Maintenance AI" },
  { tag: "renewals",    label: "Renewals AI" },
]

/** IDs of all optional Leasing AI cards — used for the optional count badge */
const OPTIONAL_LEASING_IDS = [
  "leasing-policies-review",
  "campus-proximity",
  "campus-study-spaces",
  "campus-semester-leases",
  "campus-immediate-movein",
] as const;

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
  "balance-reminder":              "Balance Reminder Date",
  "payment-installments":          "Installment Payments",
  "payment-address-recipient":     "Money Order Recipient",
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
  "balance-reminder":              "The day of the month ELI begins proactively sending balance reminders to residents with outstanding amounts.",
  "payment-installments":          "Whether residents can split a single month's rent into multiple installment payments. ELI will communicate eligibility accordingly.",
  "payment-address-recipient":     "The name residents should make money orders payable to. ELI provides this whenever a resident asks how to submit a money order.",
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
      aria-atomic="true"
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-5 py-3.5 shadow-xl w-max max-w-sm transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none",
      )}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" aria-hidden />
      </span>
      <p className="text-sm font-medium text-foreground leading-snug">{message}</p>
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
  tourPriority: Record<string, string[]>
  onTourPriorityChange: (propId: string, priority: string[]) => void
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
  campusProximity: Record<string, string>
  onCampusProximityChange: (id: string, val: string) => void
  studySpaces: Record<string, string>
  onStudySpacesChange: (id: string, val: string) => void
  semesterLeases: Record<string, string>
  onSemesterLeasesChange: (id: string, val: string) => void
  immediateMovein: Record<string, string>
  onImmediateMoveinChange: (id: string, val: string) => void
  carrierSimMode: SimMode
  onNavigateToCompany: () => void
}

export function OverviewPage({ navigate, completedTasks, onComplete, privacyPublished, onPrivacyPublish, emailComplete, onEmailComplete, commsComplete, ivrComplete, onIvrComplete, agentGoals, onAgentGoalChange, modelUnits, onModelUnitChange, tourSettings, onTourSettingChange, tourPriority, onTourPriorityChange, leasingPolicies, onLeasingPolicyChange, lateFeePolicy, onLateFeeChange, paymentPlanPolicy, onPaymentPlanPolicyChange, duringPhones, onDuringPhoneChange, duringFilled, afterPhones, onAfterPhoneChange, afterFilled, totalProps, renewalDays, onRenewalDayChange, renewalFilled, renewalAllFilled, campusProximity, onCampusProximityChange, studySpaces, onStudySpacesChange, semesterLeases, onSemesterLeasesChange, immediateMovein, onImmediateMoveinChange, carrierSimMode, onNavigateToCompany }: Props) {
  const [activeSheet, setActiveSheet] = useState<SheetId | null>(null)
  const [privacySheetValid, setPrivacySheetValid] = useState(false)
  const [sheetValid, setSheetValid] = useState(false)
  const [productFilter, setProductFilter] = useState<ProductTag | "all">("all")
  const [showCompleted, setShowCompleted] = useState(false)
  const [skippedOptional, setSkippedOptional] = useState<Set<string>>(new Set())

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
    const t = setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 4000)
    return () => clearTimeout(t)
  }, [toast.visible])

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true })
  }, [])

  const ivrUnlocked = commsComplete

  // Leasing AI derived completions — all start satisfied because defaults are pre-filled from Entrata
  const leasingAgentGoalsDone  = Object.values(agentGoals).every(v => v && v.trim() !== "")
  const leasingModelUnitsDone  = Object.values(modelUnits).every(v => v && v.trim() !== "")
  const leasingTourPriorityDone = Object.values(tourPriority).every(arr => Array.isArray(arr) && arr.length > 0)
  // Count each policy individually — 10 policies, each can be independently complete
  const leasingPoliciesCompletedCount = LEASING_POLICIES.filter(policy => {
    const bucket = leasingPolicies[policy.id] ?? {}
    return Object.values(bucket).every(text => text && text.trim() !== "")
  }).length
  const leasingDoneCount =
    (completedTasks.has("tour-types") ? 1 : 0) +
    (leasingAgentGoalsDone  ? 1 : 0) +
    (leasingModelUnitsDone  ? 1 : 0) +
    (leasingTourPriorityDone ? 1 : 0) +
    leasingPoliciesCompletedCount
  // 4 non-policy settings (tour types, priority, goals, units) + one entry per policy
  const LEASING_TOTAL = 4 + LEASING_POLICIES.length

  // Progress counter — just the 3 communications setup items
  const TOTAL_CONFIGS = 3 + (carrierSimMode !== "none" ? 1 : 0)  // carrier compliance, email, IVR + active sim card

  const doneCount =
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
        showToast("During-escalation numbers set for all properties — escalation routing is ready.")
      } else {
        showToast(`Saved — ${duringFilled}/${totalProps} properties done. Finish the rest to mark complete.`)
      }
      setActiveSheet(null)
      return
    }
    if (activeSheet === "maintenance-after-escalation") {
      if (afterAllFilled) {
        onComplete("maintenance-after-escalation")
        showToast("After-escalation numbers set for all properties — residents will be directed correctly.")
      } else {
        showToast(`Saved — ${afterFilled}/${totalProps} properties done. Finish the rest to mark complete.`)
      }
      setActiveSheet(null)
      return
    }

    if (activeSheet === "renewal-lead-time") {
      if (renewalAllFilled) {
        onComplete("renewal-lead-time")
        showToast("Renewal lead times confirmed for all properties — ELI will start outreach on schedule.")
      } else {
        showToast(`Saved — ${renewalFilled}/${totalProps} properties configured. Finish the rest to mark complete.`)
      }
      setActiveSheet(null)
      return
    }

    if (activeSheet === "ivr-setup") {
      onIvrComplete()
      showToast("IVR routing is live — callers will be routed to the right property automatically.")
      setActiveSheet(null)
      return
    }

    if (activeSheet === "tour-types") {
      onComplete("tour-types")
      showToast("Tour types confirmed — ELI will start booking tours using these settings.")
      setActiveSheet(null)
      return
    }

    // Payment setting sheets: map short sheet id back to full PAYMENT_SETTING_ID
    const PAYMENT_SHEET_MAP: Partial<Record<SheetId, string>> = {
      "rent-charge-date":        "payments-rent-charge-date",
      "rent-due-date":           "payments-rent-due-date",
      "payment-plans":           "payments-payment-plans",
      "payment-block-date":      "payments-block-day",
      "payment-link":            "payments-payment-link",
      "grace-period":            "payments-grace-period",
      "balance-reminder":        "payments-balance-reminder",
      "outstanding-balance":     "payments-outstanding-balance",
      "payment-options":         "payments-payment-options",
      "payment-installments":    "payments-installments",
      "payment-address-recipient": "payments-address-recipient",
    }
    if (activeSheet && PAYMENT_SHEET_MAP[activeSheet]) {
      const settingId = PAYMENT_SHEET_MAP[activeSheet]!
      onComplete(settingId)
      const label = SHEET_TITLE[activeSheet] ?? "Setting"
      showToast(`${label} confirmed — ELI will apply this across all properties.`)
      setActiveSheet(null)
      return
    }

    const item = NEEDS_ATTENTION.find((i) => i.to === activeSheet)
    if (item) {
      onComplete(item.id)
      showToast(`${item.title ?? "Item"} marked complete.`)
    }
    setActiveSheet(null)
    setPrivacySheetValid(false)
    setSheetValid(false)
  }

  function handleCampusSave(id: string, title: string, allFilled: boolean) {
    setActiveSheet(null)
    if (allFilled) {
      setSkippedOptional(prev => new Set([...prev, id]))
      showToast(`${title} saved — view in Leasing AI → Campus Information`)
    } else {
      showToast(`Progress saved.`)
    }
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

        {/* Product progress cards — property readiness overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl">
          <ProductCard label="Leasing AI"      icon={Users}      done={12} total={15} unit="properties" />
          <ProductCard label="Payments AI"     icon={CreditCard} done={10} total={15} unit="properties" />
          <ProductCard label="Maintenance AI"  icon={Wrench}     done={14} total={15} unit="properties" />
          <ProductCard label="Renewals AI"     icon={RefreshCw}  done={9}  total={15} unit="properties" />
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

          {/* ── Required section ─────────────────────────────────────────── */}
          <div className="space-y-3">
            {(() => {
              const allRequiredDone =
                requiredItems.length === 0 &&
                privacyPublished &&
                emailComplete &&
                ivrComplete
              return (
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">Required</h3>
                  {allRequiredDone && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border border-emerald-600/40 bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" aria-hidden />
                      Complete
                    </span>
                  )}
                </div>
              )
            })()}

            {/* ── All complete banner ─────────────────────────────────────── */}
            {requiredItems.length === 0 && privacyPublished && emailComplete && ivrComplete && (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />
                <p className="text-sm font-medium text-emerald-800">
                  All required items are complete — you're ready to go live.
                </p>
              </div>
            )}

          <ul className="space-y-3">
            {/* ── Foundation section label ────────────────────────────────── */}
            {(!privacyPublished || carrierSimMode !== "none") && (
              <li className="flex items-center gap-2 pt-1 pb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Foundation — complete these first</span>
                <div className="flex-1 h-px bg-border" />
              </li>
            )}

            {/* ── 1. Privacy Policy / Carrier Compliance ─────────────────── */}
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

            {/* ── Carrier Compliance — Missing Fields sim card ────────────── */}
            {carrierSimMode === "missing" && (
              <li
                className="group rounded-xl border bg-card border-border hover:border-zinc-400 hover:shadow-md hover:-translate-y-px cursor-pointer transition-all duration-300"
                onClick={() => setActiveSheet("carrier-missing")}
              >
                <div className="p-6 flex flex-col gap-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      Carrier Registration — Missing Required Fields
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 mt-0.5 border border-red-300 bg-red-50 text-red-600">
                      <AlertTriangle className="h-3 w-3" aria-hidden />
                      Action Required
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed max-w-prose text-zinc-600">
                    Required fields for SMS carrier registration couldn't be found automatically. Fill them in to activate SMS across all properties.
                  </p>
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <p className="text-xs text-zinc-500">10 fields missing · Carrier Compliance tab</p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setActiveSheet("carrier-missing") }}
                      className={cn(buttonVariants({ variant: "eli", size: "sm" }), "whitespace-nowrap shrink-0 shadow-sm group-hover:shadow transition-shadow")}
                    >
                      Start
                      <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            )}

            {/* ── Carrier Compliance — Rejection sim card ─────────────────── */}
            {carrierSimMode === "rejected" && (
              <li
                className="group rounded-xl border bg-card border-border hover:border-zinc-400 hover:shadow-md hover:-translate-y-px cursor-pointer transition-all duration-300"
                onClick={() => setActiveSheet("carrier-rejected")}
              >
                <div className="p-6 flex flex-col gap-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      Carrier Registration — Review and Resubmit
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 mt-0.5 border border-red-300 bg-red-50 text-red-600">
                      <AlertTriangle className="h-3 w-3" aria-hidden />
                      Action Required
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed max-w-prose text-zinc-600">
                    Our carrier flagged issues with your registration. Update the highlighted fields and resubmit to activate SMS.
                  </p>
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <p className="text-xs text-zinc-500">7 fields flagged · Carrier Compliance tab</p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setActiveSheet("carrier-rejected") }}
                      className={cn(buttonVariants({ variant: "eli", size: "sm" }), "whitespace-nowrap shrink-0 shadow-sm group-hover:shadow transition-shadow")}
                    >
                      Start
                      <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            )}

            {/* ── 2. Email Integration ─────────────────────────────────────── */}
            {!emailComplete && (
              <>
                <li className="flex items-center gap-2 pt-1 pb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Also required</span>
                  <div className="flex-1 h-px bg-border" />
                </li>
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
              </>
            )}

            {/* ── 3. IVR Setup — always enabled ─────── */}
            {!ivrComplete && (
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
                    We\u2019ve applied a default phone menu to all {PROPERTIES.length} properties \u2014 callers can reach leasing, maintenance, payments, or staff. Review the default and customize any property that needs a different setup.
                  </p>
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <p className="text-xs text-zinc-500">Required for all agents \u00b7 {PROPERTIES.length} properties configured with default</p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setActiveSheet("ivr-setup") }}
                      className={cn(buttonVariants({ variant: "eli", size: "sm" }), "whitespace-nowrap shrink-0 shadow-sm group-hover:shadow transition-shadow")}
                    >
                      Review &amp; confirm
                      <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            )}

            {/* Dynamic items from NEEDS_ATTENTION — add new cards here in mock.ts */}
            {requiredItems.map((item) => {
              const done = completedTasks.has(item.id)
              return (
                <li
                  key={item.id}
                  className={cn(
                    "group rounded-xl border bg-card transition-all duration-300",
                    done
                      ? "border-emerald-300 bg-emerald-50/40 shadow-sm"
                      : "border-border hover:border-zinc-400 hover:shadow-md hover:-translate-y-px cursor-pointer",
                  )}
                  onClick={() => !done && item.severity !== "waiting" && setActiveSheet(item.to as SheetId)}
                >
                  <div className="p-6 flex flex-col gap-3">
                    <div className="flex items-start gap-2 flex-wrap">
                      <p className={cn("text-sm font-semibold leading-snug", done ? "text-emerald-800" : "text-foreground")}>
                        {item.title}
                      </p>
                      {done ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 mt-0.5 border border-emerald-600/40 bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" aria-hidden />
                          Complete
                        </span>
                      ) : (
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 mt-0.5", SEV_PILL[item.severity])}>
                          {(item.severity === "attention" || item.severity === "critical") && <AlertTriangle className="h-3 w-3" aria-hidden />}
                          {SEV_LABEL[item.severity]}
                        </span>
                      )}
                    </div>
                    <p className={cn("text-sm leading-relaxed max-w-prose", done ? "text-zinc-400" : "text-zinc-600")}>
                      {item.why}
                    </p>
                    <div className="flex items-center justify-between gap-4 pt-1">
                      <p className="text-xs text-zinc-500 truncate">
                        <BoldNumbers text={item.summary} />
                      </p>
                      {!done && item.severity !== "waiting" && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setActiveSheet(item.to as SheetId) }}
                          className={cn(buttonVariants({ variant: "eli", size: "sm" }), "whitespace-nowrap shrink-0 shadow-sm group-hover:shadow transition-shadow")}
                        >
                          Start
                          <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          </div>{/* end Required section */}

        </div>

        <Toast message={toast.message} visible={toast.visible} />
      </div>

      {/* Task sheets */}
      <TaskSheet
        open={activeSheet === "ten-dlc-privacy"}
        title="Carrier Compliance — Privacy Policy"
        description="A publicly accessible privacy policy is required to keep your texts and calls compliant. We scan your website automatically — or generate one below."
        onClose={() => setActiveSheet(null)}
        onSave={() => { onPrivacyPublish(); setActiveSheet(null); showToast("Privacy policy published — carrier compliance is complete.") }}
        saveLabel="Save & Mark Complete"
        saveDisabled={false}
      >
        <TenDlcSheetContent onPublish={() => { onPrivacyPublish(); setActiveSheet(null); showToast("Privacy policy published — carrier compliance is complete.") }} alreadyPublished={privacyPublished} />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "email-integration"}
        title="Email Integration"
        description="Connect email addresses for each property so ELI+ AI services send messages from your own domain."
        onClose={() => setActiveSheet(null)}
        onSave={() => { onEmailComplete(); setActiveSheet(null); showToast("Email integration confirmed — ELI will send follow-ups from your domain.") }}
        saveLabel="Save & Mark Complete"
      >
        <EmailSheetContent alreadyComplete={emailComplete} />
      </TaskSheet>

      {/* ── Carrier sim: missing fields ── */}
      <TaskSheet
        open={activeSheet === "carrier-missing"}
        title="Carrier Registration — Missing Required Fields"
        description="We couldn't find the following required information automatically. Fill these in to complete your registration and activate SMS."
        onClose={() => setActiveSheet(null)}
        onSave={() => {}}
        hideFooter
      >
        <CarrierComplianceSheetContent
          mode="missing"
          onComplete={() => { setActiveSheet(null); showToast("Registration submitted — carrier review typically takes 1–3 business days.") }}
        />
      </TaskSheet>

      {/* ── Carrier sim: rejection ── */}
      <TaskSheet
        open={activeSheet === "carrier-rejected"}
        title="Carrier Registration — Review and Resubmit"
        description="Our carrier flagged the fields below. Update each one and resubmit to restart the registration process."
        onClose={() => setActiveSheet(null)}
        onSave={() => {}}
        hideFooter
      >
        <CarrierComplianceSheetContent
          mode="rejected"
          onComplete={() => { setActiveSheet(null); showToast("Registration resubmitted — carrier review typically takes 1–3 business days.") }}
        />
      </TaskSheet>

      {/* ── Communications overview panel ── */}
      <TaskSheet
        open={activeSheet === "communications"}
        title="Assign Compliance Phone Numbers"
        description="Each property needs a dedicated compliance phone number for carrier compliance and IVR routing."
        onClose={() => setActiveSheet(null)}
        onSave={() => { navigate("communications"); setActiveSheet(null) }}
        saveLabel="Open Communications →"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden />
            <p className="text-sm text-amber-900 leading-relaxed">
              <strong>Required before IVR routing can be configured.</strong> Every property needs a dedicated number — carrier registration is underway and number assignment unblocks the next step.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">What you&apos;ll do</p>
            <ul className="space-y-2 text-sm text-zinc-600">
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400 shrink-0" />Review auto-assigned numbers (matched by area code to each property)</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400 shrink-0" />Swap any numbers that don&apos;t match your market</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400 shrink-0" />Confirm assignments — this unblocks IVR setup</li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">{PROPERTIES.length} properties · estimated 5–10 minutes</p>
        </div>
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
        <PaymentsSheetContent />
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
        open={activeSheet === "balance-reminder"}
        title={SHEET_TITLE["balance-reminder"] ?? ""}
        description={SHEET_DESCRIPTION["balance-reminder"]}
        onClose={() => { setActiveSheet(null); setSheetValid(false) }}
        onSave={handleSave}
        saveLabel="Confirm & Save"
        saveDisabled={false}
      >
        <DateSettingSheetContent
          label={SHEET_TITLE["balance-reminder"] ?? "Balance Reminder Date"}
          onValidChange={setSheetValid}
        />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "payment-installments"}
        title={SHEET_TITLE["payment-installments"] ?? ""}
        description={SHEET_DESCRIPTION["payment-installments"]}
        onClose={() => { setActiveSheet(null); setSheetValid(false) }}
        onSave={handleSave}
        saveLabel="Confirm & Save"
        saveDisabled={false}
      >
        <PaymentPlansSheetContent onValidChange={setSheetValid} />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "payment-address-recipient"}
        title={SHEET_TITLE["payment-address-recipient"] ?? ""}
        description={SHEET_DESCRIPTION["payment-address-recipient"]}
        onClose={() => { setActiveSheet(null); setSheetValid(false) }}
        onSave={handleSave}
        saveLabel="Save Recipient Names"
        saveDisabled={!sheetValid}
      >
        <AddressRecipientSheetContent onValidChange={setSheetValid} />
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

      {/* ── Campus Information optional sheets ───────────────────────────── */}
      <TaskSheet
        open={activeSheet === "leasing-policies-review"}
        title="Leasing Policies"
        description="Review and adjust the policy language ELI uses when answering prospect questions. Defaults and Entrata imports are pre-filled — update any that don't match your community rules."
        onClose={() => setActiveSheet(null)}
        onSave={() => handleCampusSave("leasing-policies-review", "Leasing Policies", true)}
        saveLabel="Confirm & Save"
        saveDisabled={false}
      >
        <LeasingPoliciesSheetContent
          policies={leasingPolicies}
          onChange={onLeasingPolicyChange}
          onValidChange={() => {}}
        />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "campus-proximity"}
        title="Proximity to Campus"
        description="Describe how close each property is to a nearby university or campus. ELI uses this to answer prospect questions about distance."
        onClose={() => setActiveSheet(null)}
        onSave={() => handleCampusSave("campus-proximity", "Proximity to Campus", Object.values(campusProximity).every(v => v.trim().length > 0))}
        saveLabel="Save"
        saveDisabled={false}
      >
        <CampusProximitySheetContent values={campusProximity} onChange={onCampusProximityChange} />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "campus-study-spaces"}
        title="Study Spaces"
        description="Indicate whether each property has dedicated study spaces or co-working areas available to residents."
        onClose={() => setActiveSheet(null)}
        onSave={() => handleCampusSave("campus-study-spaces", "Study Spaces", Object.values(studySpaces).every(v => v === "yes" || v === "no"))}
        saveLabel="Save"
        saveDisabled={false}
      >
        <CampusYesNoSheetContent values={studySpaces} onChange={onStudySpacesChange} />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "campus-semester-leases"}
        title="Semester Leases"
        description="Specify whether each property offers semester-length leases in addition to standard terms."
        onClose={() => setActiveSheet(null)}
        onSave={() => handleCampusSave("campus-semester-leases", "Semester Leases", Object.values(semesterLeases).every(v => v === "yes" || v === "no"))}
        saveLabel="Save"
        saveDisabled={false}
      >
        <CampusYesNoSheetContent values={semesterLeases} onChange={onSemesterLeasesChange} />
      </TaskSheet>

      <TaskSheet
        open={activeSheet === "campus-immediate-movein"}
        title="Offer Immediate Move-In"
        description="Mark which properties have units available for immediate move-in within 1–2 weeks."
        onClose={() => setActiveSheet(null)}
        onSave={() => handleCampusSave("campus-immediate-movein", "Offer Immediate Move-In", Object.values(immediateMovein).every(v => v === "yes" || v === "no"))}
        saveLabel="Save"
        saveDisabled={false}
      >
        <CampusYesNoSheetContent values={immediateMovein} onChange={onImmediateMoveinChange} />
      </TaskSheet>

    </>
  )
}

// ── Campus sheet content components ───────────────────────────────────────────

function CampusProximitySheetContent({ values, onChange }: { values: Record<string, string>; onChange: (id: string, val: string) => void }) {
  const { search, setSearch, group, setGroup, filtered } = usePropertyFilter()
  const filledCount = Object.values(values).filter(v => v.trim().length > 0).length
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Per-Property Proximity</p>
        <span className="text-xs tabular-nums text-muted-foreground">{filledCount} / {PROPERTIES.length} filled</span>
      </div>
      <PropertyFilter search={search} onSearchChange={setSearch} group={group} onGroupChange={setGroup} resultCount={filtered.length} totalCount={PROPERTIES.length} />
      <div className="rounded-xl border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">No properties match.</div>
        ) : filtered.map((prop, idx) => (
          <div key={prop.id} className={cn("flex items-center gap-3 px-4 py-3 border-b border-border last:border-0", idx % 2 === 0 ? "bg-white" : "bg-zinc-50/50")}>
            <div className="w-36 shrink-0">
              <p className="text-sm font-medium text-foreground truncate">{prop.name}</p>
              <p className="text-xs text-muted-foreground">{prop.city}, {prop.state}</p>
            </div>
            <input
              type="text"
              placeholder="e.g. 0.3 miles from UCLA"
              value={values[prop.id] ?? ""}
              onChange={e => onChange(prop.id, e.target.value)}
              className="flex-1 h-8 rounded-lg border border-border bg-white px-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function CampusYesNoSheetContent({ values, onChange }: { values: Record<string, string>; onChange: (id: string, val: string) => void }) {
  const { search, setSearch, group, setGroup, filtered } = usePropertyFilter()
  const yesCount = Object.values(values).filter(v => v === "yes").length
  const noCount  = Object.values(values).filter(v => v === "no").length
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Per-Property Selection</p>
        <span className="text-xs tabular-nums text-muted-foreground">{yesCount} Yes · {noCount} No · {PROPERTIES.length - yesCount - noCount} not set</span>
      </div>
      <PropertyFilter search={search} onSearchChange={setSearch} group={group} onGroupChange={setGroup} resultCount={filtered.length} totalCount={PROPERTIES.length} />
      <div className="rounded-xl border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">No properties match.</div>
        ) : filtered.map((prop, idx) => {
          const val = values[prop.id] ?? ""
          return (
            <div key={prop.id} className={cn("flex items-center gap-3 px-4 py-3 border-b border-border last:border-0", idx % 2 === 0 ? "bg-white" : "bg-zinc-50/50")}>
              <div className="w-36 shrink-0">
                <p className="text-sm font-medium text-foreground truncate">{prop.name}</p>
                <p className="text-xs text-muted-foreground">{prop.city}, {prop.state}</p>
              </div>
              <div className="flex items-center gap-2">
                {(["yes", "no"] as const).map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onChange(prop.id, val === option ? "" : option)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                      val === option
                        ? option === "yes" ? "bg-emerald-600 border-emerald-600 text-white" : "bg-zinc-800 border-zinc-800 text-white"
                        : "bg-white border-border text-muted-foreground hover:border-zinc-400 hover:text-foreground",
                    )}
                  >
                    {option === "yes" ? "Yes" : "No"}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
