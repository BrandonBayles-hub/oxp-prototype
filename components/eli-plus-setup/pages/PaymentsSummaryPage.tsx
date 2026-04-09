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

      <AgentTabBar activeTab={topTab} onTabChange={setTopTab} />

      {topTab === "voices"      && <VoiceTab selectedVoice={selectedVoice} onSelect={setSelectedVoice} />}
      {topTab === "prompt"      && <PromptTab productId="payments" />}
      {topTab === "test"        && <TestAgentTab productLabel="Payments AI" voiceName={voiceName} scenarios={PAYMENTS_SCENARIOS} />}
      {topTab === "escalations" && <EscalationsTab productId="payments" />}
      {topTab === "reporting"   && <PaymentsReportingTab />}

      {topTab === "configure" && (
      <div className="max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Expand any section to review or update — changes apply immediately.
          </p>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {effectiveCount} / {SETTINGS.length} ready
          </span>
        </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-700 transition-all duration-500"
          style={{ width: `${(effectiveCount / SETTINGS.length) * 100}%` }}
        />
      </div>

      {/* Defaults banner */}
      {defaultCount > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5 space-y-2">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                We applied defaults to {defaultCount} settings
              </p>
              <p className="text-xs text-blue-800 mt-0.5 leading-relaxed">
                We inferred these values from your existing Entrata configuration. They won't block activation, but we recommend reviewing each one before going live to make sure they match your lease agreements and billing policies.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 pl-7">
            <Info className="h-3 w-3 text-blue-500 shrink-0" aria-hidden />
            <p className="text-[11px] text-blue-700">Settings marked <span className="font-semibold">Default Applied</span> were pre-filled — not entered by your team.</p>
          </div>
        </div>
      )}

      {/* Settings accordion */}
      <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
        {SETTINGS.map((setting) => {
          const explicitlyConfigured = completedTasks?.has(setting.id) ?? false
          const hasDefault = !!DEFAULT_SETTINGS[setting.id]
          const isConfigured = explicitlyConfigured || hasDefault
          const isOpen = openSection === setting.id
          const isValid = validMap[setting.id] ?? false

          return (
            <div key={setting.id}>
              {/* Row header — always clickable */}
              <button
                type="button"
                onClick={() => setOpenSection(isOpen ? null : setting.id)}
                className="w-full flex items-center gap-3 px-4 py-4 text-left bg-white hover:bg-zinc-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{setting.label}</p>
                    {/* Default Applied + Complete shown together for auto-inferred settings */}
                    {hasDefault && !explicitlyConfigured && (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                          <Sparkles className="h-3 w-3" aria-hidden />
                          Default Applied
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" aria-hidden />
                          Complete
                        </span>
                      </>
                    )}
                    {/* Explicitly configured by the user */}
                    {explicitlyConfigured && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" aria-hidden />
                        Complete
                      </span>
                    )}
                    {/* Not set — needs client input */}
                    {!isConfigured && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        <AlertTriangle className="h-3 w-3" aria-hidden />
                        Not Set
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
                </div>
                {isOpen
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />}
              </button>

              {/* Expanded form */}
              {isOpen && (
                <div className="border-t border-border bg-zinc-50/50">
                  {/* Default applied notice — always show when a default exists and user hasn't overridden */}
                  {hasDefault && !explicitlyConfigured && (
                    <div className="mx-4 mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-blue-600 shrink-0" aria-hidden />
                        <p className="text-xs font-semibold text-blue-900">Default applied — please review</p>
                      </div>
                      <p className="text-xs text-blue-800 pl-5">
                        <span className="font-medium">Applied value:</span> {DEFAULT_SETTINGS[setting.id].value}
                      </p>
                      <p className="text-xs text-blue-700 pl-5">
                        <span className="font-medium">Source:</span> {DEFAULT_SETTINGS[setting.id].source}
                      </p>
                      <p className="text-xs text-blue-700 pl-5 pt-0.5">
                        This setting is complete, but we recommend verifying it matches your lease agreements. Save below to confirm or override.
                      </p>
                    </div>
                  )}
                  {explicitlyConfigured && (
                    <div className="flex items-center gap-2 mx-4 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" aria-hidden />
                      <p className="text-xs text-emerald-800">
                        Previously configured. Update below and save to apply changes.
                      </p>
                    </div>
                  )}

                  {/* Render the matching form component */}
                  <div className="bg-white">
                    {setting.type === "date" && (
                      <DateSettingSheetContent
                        label={setting.label}
                        onValidChange={(v) => setValid(setting.id, v)}
                        defaultDay={DEFAULT_SETTINGS[setting.id]?.value.match(/^\d+/)?.[0]}
                      />
                    )}
                    {setting.type === "plans" && (
                      <PaymentPlansSheetContent
                        onValidChange={(v) => setValid(setting.id, v)}
                      />
                    )}
                    {setting.type === "link" && (
                      <PaymentLinkSheetContent
                        onValidChange={(v) => setValid(setting.id, v)}
                      />
                    )}
                    {setting.type === "late-fee" && (
                      <LateFeeSheetContent
                        policies={lateFeePolicy}
                        onChange={(propId, val) => setLateFeePolicy(p => ({ ...p, [propId]: val }))}
                        onValidChange={(v) => setValid(setting.id, v)}
                      />
                    )}
                    {setting.type === "payment-plan-policy" && (
                      <PaymentPlanPolicySheetContent
                        policies={paymentPlanPolicy}
                        onChange={(propId, val) => setPaymentPlanPolicy(p => ({ ...p, [propId]: val }))}
                        onValidChange={(v) => setValid(setting.id, v)}
                      />
                    )}
                    {setting.type === "options" && (
                      <PaymentOptionsSheetContent
                        onValidChange={(v) => setValid(setting.id, v)}
                      />
                    )}
                  </div>

                  <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-white">
                    <button
                      type="button"
                      onClick={() => setOpenSection(null)}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={(setting.type === "late-fee" || setting.type === "payment-plan-policy") ? false : !isValid}
                      onClick={() => handleSave(setting.id)}
                      className={cn(
                        buttonVariants({ variant: "eli", size: "sm" }),
                        (setting.type !== "late-fee" && setting.type !== "payment-plan-policy" && !isValid) && "opacity-40 cursor-not-allowed",
                      )}
                    >
                      {setting.saveLabel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      </div>
      )}
    </div>
  )
}
