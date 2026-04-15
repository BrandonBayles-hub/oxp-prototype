"use client"

import React, { useState, useEffect } from "react"
import { Clock, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { HybridShell } from "./components/HybridShell"
import { OverviewPage } from "./pages/OverviewPage"
import { CompanyPage } from "./pages/CompanyPage"
import { PrivacyPage } from "./pages/PrivacyPage"
import { EmailPage } from "./pages/EmailPage"
import { PaymentsSummaryPage } from "./pages/PaymentsSummaryPage"
import { PaymentsAdvancedPage } from "./pages/PaymentsAdvancedPage"
import { GoLivePage } from "./pages/GoLivePage"
import { MaintenancePage } from "./pages/MaintenancePage"
import { RenewalsPage } from "./pages/RenewalsPage"
import { LeasingPage } from "./pages/LeasingPage"
import { CommunicationsPage } from "./pages/CommunicationsPage"
import { makeDefaultRenewalDays, isValidDays } from "./components/RenewalLeadTimeSheetContent"
import { makeDefaultAgentGoals } from "./components/AgentGoalSheetContent"
import { makeDefaultModelUnits } from "./components/ModelUnitsSheetContent"
import { makeDefaultTourSettings } from "./components/TourTypesSheetContent"
import type { TourPropertySettings } from "./components/TourTypesSheetContent"
import { DEFAULT_TOUR_PRIORITY } from "./components/TourPrioritySheetContent"
import { makeDefaultLeasingPolicies, type LeasingPoliciesState } from "./components/LeasingPoliciesSheetContent"
import { makeDefaultLateFeePolicy, type LateFeeState } from "./components/LateFeeSheetContent"
import { makeDefaultPaymentPlanPolicy, type PaymentPlanPolicyState } from "./components/PaymentPlanPolicySheetContent"
import { PROPERTIES } from "./data/properties"
import {
  ENTRATA_DURING_PHONES,
  ENTRATA_AFTER_PHONES,
} from "./data/entrata-imports"

export type PageId = "overview" | "company" | "privacy" | "email" | "communications" | "leasing" | "payments" | "payments-advanced" | "maintenance" | "renewals" | "renewals-channels" | "golive"
export type BrandStatus = "idle" | "submitting" | "approved"
export type CampaignStatus = "idle" | "creating" | "ready"

function RenewalsChannelsPage({ navigate }: { navigate: (to: PageId) => void }) {
  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      <button
        type="button"
        onClick={() => navigate("renewals")}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1 -ml-2 text-muted-foreground")}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Renewals AI
      </button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Communication Channels</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define which channels ELI uses for renewal outreach per property.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="h-14 w-14 rounded-full bg-zinc-100 flex items-center justify-center">
          <Clock className="h-7 w-7 text-zinc-400" aria-hidden />
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-base font-semibold text-foreground">Coming Soon</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Communication channel configuration for Renewals AI is on the roadmap. This will let you control which channels — email, SMS, in-app — ELI uses when reaching out to residents about lease renewals.
          </p>
        </div>
      </div>
    </div>
  )
}

export type BasePageProps = {
  navigate: (to: PageId) => void
  completedTasks: Set<string>
  onComplete: (id: string) => void
}

const NON_OVERVIEW_PAGES: Partial<Record<PageId, React.ComponentType<BasePageProps>>> = {
  privacy: PrivacyPage,
  email: EmailPage,
  payments: PaymentsSummaryPage,
  "payments-advanced": PaymentsAdvancedPage,
  golive: GoLivePage,
}

export default function EliOnboardingHybrid() {
  const [page, setPage] = useState<PageId>("overview")
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set())

  // Phone states pre-seeded with values pulled from Entrata; remaining properties are empty
  const [duringPhones, setDuringPhones] = useState<Record<string, string>>(() => ({
    ...Object.fromEntries(PROPERTIES.map((p) => [p.id, ""])),
    ...ENTRATA_DURING_PHONES,
  }))
  const [afterPhones, setAfterPhones] = useState<Record<string, string>>(() => ({
    ...Object.fromEntries(PROPERTIES.map((p) => [p.id, ""])),
    ...ENTRATA_AFTER_PHONES,
  }))

  // Leasing AI state — shared between LeasingPage and OverviewPage sheets
  const [agentGoals, setAgentGoals]         = useState<Record<string, string>>(makeDefaultAgentGoals)
  const [modelUnits, setModelUnits]         = useState<Record<string, string>>(makeDefaultModelUnits)
  const [tourSettings, setTourSettings]     = useState<Record<string, TourPropertySettings>>(makeDefaultTourSettings)
  const [tourPriority, setTourPriority]     = useState<string[]>(DEFAULT_TOUR_PRIORITY)
  const [leasingPolicies, setLeasingPolicies] = useState<LeasingPoliciesState>(() => makeDefaultLeasingPolicies())
  const [lateFeePolicy, setLateFeePolicy] = useState<LateFeeState>(() => makeDefaultLateFeePolicy())
  const [paymentPlanPolicy, setPaymentPlanPolicy] = useState<PaymentPlanPolicyState>(() => makeDefaultPaymentPlanPolicy())

  // Renewal lead time state lifted here so it's shared between RenewalsPage and OverviewPage sheet
  const [renewalDays, setRenewalDays] = useState<Record<string, string>>(makeDefaultRenewalDays)

  // 10DLC compliance — privacy policy published state
  const [privacyPublished, setPrivacyPublished] = useState(false)
  // Twilio brand/profile + campaign pipeline state
  const [brandStatus, setBrandStatus] = useState<BrandStatus>("idle")
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>("idle")
  // Email integration confirmed state
  const [emailComplete, setEmailComplete] = useState(false)
  // IVR setup confirmed state
  const [ivrComplete, setIvrComplete] = useState(false)

  // When privacy is published, auto-simulate the Twilio brand/profile + campaign pipeline
  useEffect(() => {
    if (!privacyPublished) return
    setBrandStatus("submitting")
    const brandTimer = setTimeout(() => {
      setBrandStatus("approved")
      setCampaignStatus("creating")
    }, 3000)
    return () => clearTimeout(brandTimer)
  }, [privacyPublished])

  function navigate(to: PageId) {
    setPage(to)
  }

  function handleComplete(taskId: string) {
    setCompletedTasks((prev) => new Set([...prev, taskId]))
  }

  function handleRenewalDayChange(id: string, val: string) {
    setRenewalDays((prev) => ({ ...prev, [id]: val }))
  }

  function validPhone(v: string) { return v.replace(/\D/g, "").length === 10 }
  const duringFilled = Object.values(duringPhones).filter(validPhone).length
  const afterFilled = Object.values(afterPhones).filter(validPhone).length
  const totalProps = PROPERTIES.length

  const renewalFilled = Object.values(renewalDays).filter(isValidDays).length
  const renewalAllFilled = renewalFilled === PROPERTIES.length

  return (
      <HybridShell page={page} navigate={navigate} completedTasks={completedTasks} privacyPublished={privacyPublished} emailComplete={emailComplete} commsComplete={campaignStatus === "ready"} ivrComplete={ivrComplete}>
        {page === "overview" ? (
          <OverviewPage
            navigate={navigate}
            completedTasks={completedTasks}
            onComplete={handleComplete}
            privacyPublished={privacyPublished}
            onPrivacyPublish={() => setPrivacyPublished(true)}
            emailComplete={emailComplete}
            onEmailComplete={() => setEmailComplete(true)}
            commsComplete={campaignStatus === "ready"}
            ivrComplete={ivrComplete}
            onIvrComplete={() => setIvrComplete(true)}
            agentGoals={agentGoals}
            onAgentGoalChange={(id, val) => setAgentGoals((p) => ({ ...p, [id]: val }))}
            modelUnits={modelUnits}
            onModelUnitChange={(id, val) => setModelUnits((p) => ({ ...p, [id]: val }))}
            tourSettings={tourSettings}
            onTourSettingChange={(id, field, val) => setTourSettings((p) => ({ ...p, [id]: { ...p[id], [field]: val } }))}
            tourPriority={tourPriority}
            onTourPriorityChange={setTourPriority}
            leasingPolicies={leasingPolicies}
            onLeasingPolicyChange={(policyId, propId, val) => setLeasingPolicies((p) => ({ ...p, [policyId]: { ...p[policyId], [propId]: val } }))}
            lateFeePolicy={lateFeePolicy}
            onLateFeeChange={(propId, val) => setLateFeePolicy((p) => ({ ...p, [propId]: val }))}
            paymentPlanPolicy={paymentPlanPolicy}
            onPaymentPlanPolicyChange={(propId, val) => setPaymentPlanPolicy((p) => ({ ...p, [propId]: val }))}
            duringPhones={duringPhones}
            onDuringPhoneChange={(id, val) => setDuringPhones((p) => ({ ...p, [id]: val }))}
            duringFilled={duringFilled}
            afterPhones={afterPhones}
            onAfterPhoneChange={(id, val) => setAfterPhones((p) => ({ ...p, [id]: val }))}
            afterFilled={afterFilled}
            totalProps={totalProps}
            renewalDays={renewalDays}
            onRenewalDayChange={handleRenewalDayChange}
            renewalFilled={renewalFilled}
            renewalAllFilled={renewalAllFilled}
          />
        ) : page === "leasing" ? (
          <LeasingPage
            navigate={navigate}
            agentGoals={agentGoals}
            onAgentGoalChange={(id, val) => setAgentGoals((p) => ({ ...p, [id]: val }))}
            modelUnits={modelUnits}
            onModelUnitChange={(id, val) => setModelUnits((p) => ({ ...p, [id]: val }))}
            tourSettings={tourSettings}
            onTourSettingChange={(id, field, val) => setTourSettings((p) => ({ ...p, [id]: { ...p[id], [field]: val } }))}
            tourPriority={tourPriority}
            onTourPriorityChange={setTourPriority}
            leasingPolicies={leasingPolicies}
            onLeasingPolicyChange={(policyId, propId, val) => setLeasingPolicies((p) => ({ ...p, [policyId]: { ...p[policyId], [propId]: val } }))}
          />
        ) : page === "maintenance" ? (
          <MaintenancePage
            navigate={navigate}
            duringPhones={duringPhones}
            onDuringPhoneChange={(id, val) => setDuringPhones((p) => ({ ...p, [id]: val }))}
            afterPhones={afterPhones}
            onAfterPhoneChange={(id, val) => setAfterPhones((p) => ({ ...p, [id]: val }))}
          />
        ) : page === "renewals" ? (
          <RenewalsPage navigate={navigate} days={renewalDays} onChange={handleRenewalDayChange} />
        ) : page === "renewals-channels" ? (
          <RenewalsChannelsPage navigate={navigate} />
        ) : page === "communications" ? (
          <CommunicationsPage
            navigate={navigate}
            privacyPublished={privacyPublished}
            brandStatus={brandStatus}
            campaignStatus={campaignStatus}
            onCampaignReady={() => setCampaignStatus("ready")}
          />
        ) : page === "company" ? (
          <CompanyPage navigate={navigate} privacyPublished={privacyPublished} onPrivacyPublish={() => setPrivacyPublished(true)} brandStatus={brandStatus} />
        ) : (
          (() => {
            const PageComponent = NON_OVERVIEW_PAGES[page as keyof typeof NON_OVERVIEW_PAGES]
            return PageComponent ? <PageComponent navigate={navigate} completedTasks={completedTasks} onComplete={handleComplete} /> : null
          })()
        )}
      </HybridShell>
  )
}
