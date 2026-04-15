"use client"

import { useState } from "react"
import type { BasePageProps } from "../index"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowLeft, CheckCircle2, AlertTriangle, ChevronRight, ChevronDown, Sparkles, Info } from "lucide-react"
import { DateSettingSheetContent } from "../components/DateSettingSheetContent"
import { PaymentPlansSheetContent } from "../components/PaymentPlansSheetContent"
import { PaymentLinkSheetContent } from "../components/PaymentLinkSheetContent"
import { PolicySheetContent } from "../components/PolicySheetContent"
import { PaymentOptionsSheetContent } from "../components/PaymentOptionsSheetContent"
import { LateFeeSheetContent, makeDefaultLateFeePolicy, type LateFeeState } from "../components/LateFeeSheetContent"
import { PaymentPlanPolicySheetContent, makeDefaultPaymentPlanPolicy, type PaymentPlanPolicyState } from "../components/PaymentPlanPolicySheetContent"
import { AgentTabBar, VoiceTab, TestAgentTab, PromptTab, EscalationsTab, VOICES, type AgentTopTab, type ChatScenario } from "../components/AgentTabs"
import { PaymentsReportingTab } from "../components/PaymentsReportingTab"

const PAYMENTS_SCENARIOS: ChatScenario[] = [
  {
    label: "Late rent inquiry",
    messages: [
      { role: "eli",      text: "Hi! I'm ELI, your AI assistant for Sunset Property Group. How can I help you today?" },
      { role: "prospect", text: "I got a notice about a late fee. I thought I paid on time?" },
      { role: "eli",      text: "I'm sorry to hear that. Late fees are applied when payment is received after the grace period date — typically the 4th of the month. Can I pull up your account to check the payment date?" },
      { role: "prospect", text: "Yes please. I paid on the 5th." },
      { role: "eli",      text: "Payments received on the 5th would be past the grace period and subject to the late fee. However, first-time waivers may be available. I can connect you with your leasing office to request a review — would that help?" },
    ],
  },
  {
    label: "Payment plan request",
    messages: [
      { role: "eli",      text: "Hi! I'm ELI. I see you reached out about your account. What can I help you with?" },
      { role: "prospect", text: "I'm behind on rent and wondering if I can do a payment plan." },
      { role: "eli",      text: "Of course — I can help with that. Payment plans are available for residents with outstanding balances. They require a signed repayment agreement and a minimum first payment. Would you like me to connect you with your property manager to get one set up?" },
      { role: "prospect", text: "Yes, how long do I have to pay it off?" },
      { role: "eli",      text: "Plans are typically structured to be completed within 90 days, depending on your balance. Your property manager will walk you through the specific terms. I'll send you their contact info now." },
    ],
  },
  {
    label: "How to pay",
    messages: [
      { role: "eli",      text: "Hey there! I'm ELI. Happy to help with any payment questions." },
      { role: "prospect", text: "What are my options for paying rent?" },
      { role: "eli",      text: "You can pay online through the resident portal, by ACH bank transfer, by check, or with cash starting the 1st of each month. Credit card payments are not accepted. Would you like me to send you the link to your payment portal?" },
      { role: "prospect", text: "Yes, what's the link?" },
      { role: "eli",      text: "I'm sending the portal link to the email on file now. You can also access it anytime at sunsetpropertygroup.com/pay. Let me know if you have any trouble logging in!" },
    ],
  },
]

/** Settings auto-inferred from Entrata — not blockers, but should be reviewed. */
const DEFAULT_SETTINGS: Record<string, { value: string; source: string }> = {
  "rent-charge-date":   { value: "1st of month",                        source: "Entrata: Financial › Charges › Bill On" },
  "rent-due-date":      { value: "1st of month",                        source: "Entrata: Communication › Rent Reminders › Display Rent Due On Day" },
  "payment-plans":      { value: "Enabled (from repayment agreements)", source: "Entrata: Financial › Payments › Repayment Agreements" },
  "payment-block-date": { value: "6th of month",                        source: "Entrata: Resident Portal › Payment Block Days (first gap day)" },
  "grace-period":       { value: "4th of month",                        source: "Entrata: Financial › Delinquency › Default late fee formula (first day late − 1)" },
  "outstanding-balance":{ value: "$0.01 minimum",                       source: "Conservative default (late fee formula uses non-fixed threshold)" },
  "payment-options":    { value: "Online, ACH, Check, Cash from 1st",   source: "Standard defaults — Credit Card disabled" },
  "late-fee-policy":         { value: "Per property — 4 pulled from Entrata, 8 defaults applied", source: "Financial › Delinquency › Late Fee Policy" },
  "payment-plan-policy":     { value: "Per property — 3 pulled from Entrata, 9 defaults applied", source: "Financial › Payments › Repayment Agreements › Policy Notes" },
}

const SETTINGS = [
  {
    id: "rent-charge-date",
    label: "Rent Charge Date",
    description: "Day of month rent is posted to resident ledgers",
    saveLabel: "Save Rent Charge Dates",
    type: "date" as const,
  },
  {
    id: "rent-due-date",
    label: "Rent Due Date",
    description: "Day rent is officially overdue and late fees may apply",
    saveLabel: "Save Rent Due Dates",
    type: "date" as const,
  },
  {
    id: "payment-plans",
    label: "Payment Plans",
    description: "Whether each community allows residents to split balances into installments",
    saveLabel: "Save Payment Plan Settings",
    type: "plans" as const,
  },
  {
    id: "payment-block-date",
    label: "Payment Block Date",
    description: "Day online payments are blocked for month-end accounting close",
    saveLabel: "Save Payment Block Dates",
    type: "date" as const,
  },
  {
    id: "payment-link",
    label: "Payment Portal Link",
    description: "URL ELI uses in outbound messages to direct residents to your payment portal",
    saveLabel: "Save Payment Links",
    type: "link" as const,
  },
  {
    id: "grace-period",
    label: "Grace Period Date",
    description: "Days after due date before late fees apply",
    saveLabel: "Save Grace Period Dates",
    type: "date" as const,
  },
  {
    id: "outstanding-balance",
    label: "Outstanding Balance Threshold",
    description: "Minimum balance before ELI sends a collection nudge to a resident",
    saveLabel: "Save Balance Thresholds",
    type: "date" as const,
  },
  {
    id: "late-fee-policy",
    label: "Late Fee Policy",
    description: "Per-property policy language ELI uses in automated late fee notices — 4 from Entrata, 8 defaults applied",
    saveLabel: "Confirm & Save",
    type: "late-fee" as const,
  },
  {
    id: "payment-plan-policy",
    label: "Payment Plan Policy",
    description: "Per-property policy language ELI uses when residents ask about splitting their balance — 3 from Entrata, 9 defaults applied",
    saveLabel: "Confirm & Save",
    type: "payment-plan-policy" as const,
  },
  {
    id: "payment-options",
    label: "Payment Options & Availability",
    description: "Which payment methods are accepted and the day of month each becomes available",
    saveLabel: "Save Payment Options",
    type: "options" as const,
  },
]

export function PaymentsSummaryPage({ navigate, completedTasks, onComplete }: BasePageProps) {
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [validMap, setValidMap] = useState<Record<string, boolean>>({})
  const [lateFeePolicy, setLateFeePolicy] = useState<LateFeeState>(() => makeDefaultLateFeePolicy())
  const [paymentPlanPolicy, setPaymentPlanPolicy] = useState<PaymentPlanPolicyState>(() => makeDefaultPaymentPlanPolicy())
  const [topTab, setTopTab] = useState<AgentTopTab>("configure")
  const [selectedVoice, setSelectedVoice] = useState("jordan")
  const voiceName = VOICES.find(v => v.id === selectedVoice)?.name ?? "Jordan"

  function setValid(id: string, v: boolean) {
    setValidMap((prev) => ({ ...prev, [id]: v }))
  }

  function handleSave(id: string) {
    onComplete?.(id)
    setOpenSection(null)
  }

  const configuredCount = SETTINGS.filter((s) => completedTasks?.has(s.id)).length
  const defaultCount = SETTINGS.filter((s) => DEFAULT_SETTINGS[s.id] && !completedTasks?.has(s.id)).length
  const effectiveCount = SETTINGS.filter((s) => completedTasks?.has(s.id) || DEFAULT_SETTINGS[s.id]).length

  return (
    <div className="p-6 md:p-8 space-y-5">
      <div>
        <button
          type="button"
          onClick={() => navigate("overview")}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1 -ml-2 text-muted-foreground mb-3")}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Overview
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Payments AI</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure payment settings, select a voice, and test ELI's payment interactions.
        </p>
      </div>

      {/* Coming Soon Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
        <span className="text-amber-500 mt-0.5 shrink-0">🚧</span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-900">Coming soon — new updates to settings</p>
          <p className="text-sm text-amber-800">
            In the meantime, you can{" "}
            <a href="#" className="underline underline-offset-2 font-medium hover:text-amber-900">
              update your settings here
            </a>
            .
          </p>
        </div>
      </div>

      {/* Tab content — hidden while coming soon banner is active */}
    </div>
  )
}
