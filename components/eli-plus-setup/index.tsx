"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Clock, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { HybridShell } from "./components/HybridShell"
import { GlobalToast } from "./components/GlobalToast"
import { OverviewPage } from "./pages/OverviewPage"
import { CompanyPage } from "./pages/CompanyPage"
import type { SimMode } from "./pages/CompanyPage"
import { PrivacyPage } from "./pages/PrivacyPage"
import { EmailPage } from "./pages/EmailPage"
import { PaymentsSummaryPage } from "./pages/PaymentsSummaryPage"
import { GoLivePage } from "./pages/GoLivePage"
import { MaintenancePage } from "./pages/MaintenancePage"
import { RenewalsPage } from "./pages/RenewalsPage"
import { LeasingPage } from "./pages/LeasingPage"
import { CommunicationsPage } from "./pages/CommunicationsPage"
import { IvrSetupPage, type IvrChoice } from "./pages/IvrSetupPage"
import { makeDefaultRenewalDays, isValidDays } from "./components/RenewalLeadTimeSheetContent"
import { makeDefaultAgentGoals } from "./components/AgentGoalSheetContent"
import { makeDefaultModelUnits } from "./components/ModelUnitsSheetContent"
import { makeDefaultTourSettings } from "./components/TourTypesSheetContent"
import type { TourPropertySettings } from "./components/TourTypesSheetContent"
import { DEFAULT_TOUR_PRIORITY } from "./components/TourPrioritySheetContent"
import { makeDefaultLeasingPolicies, type LeasingPoliciesState, LEASING_POLICIES } from "./components/LeasingPoliciesSheetContent"
import { makeDefaultLateFeePolicy, type LateFeeState } from "./components/LateFeeSheetContent"
import { makeDefaultPaymentPlanPolicy, type PaymentPlanPolicyState } from "./components/PaymentPlanPolicySheetContent"
import { PROPERTIES } from "./data/properties"
import { PAYMENT_SETTING_IDS } from "./pages/PaymentsSummaryPage"
import {
  ENTRATA_DURING_PHONES,
  ENTRATA_AFTER_PHONES,
} from "./data/entrata-imports"

export type PageId = "overview" | "company" | "privacy" | "email" | "communications" | "ivr-setup" | "leasing" | "payments" | "maintenance" | "renewals" | "renewals-channels" | "golive"
export type BrandStatus = "idle" | "submitting" | "carrier-rejected" | "approved"
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
  onActionCountChange?: (n: number) => void
}

const NON_OVERVIEW_PAGES: Partial<Record<PageId, React.ComponentType<BasePageProps>>> = {
  privacy: PrivacyPage,
  email: EmailPage,
  golive: GoLivePage,
}

export default function EliOnboardingHybrid() {
  // Overview is hidden for MVP — default landing is Carrier Compliance (foundation step)
  const [page, setPage] = useState<PageId>("company")
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
  const [tourPriority, setTourPriority] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(PROPERTIES.map(p => [p.id, DEFAULT_TOUR_PRIORITY]))
  )
  const [leasingPolicies, setLeasingPolicies] = useState<LeasingPoliciesState>(() => makeDefaultLeasingPolicies())
  const [campusProximity, setCampusProximity] = useState<Record<string, string>>(
    () => Object.fromEntries(PROPERTIES.map((p) => [p.id, ""]))
  )
  const [studySpaces, setStudySpaces] = useState<Record<string, string>>(
    () => Object.fromEntries(PROPERTIES.map((p) => [p.id, ""]))
  )
  const [semesterLeases, setSemesterLeases] = useState<Record<string, string>>(
    () => Object.fromEntries(PROPERTIES.map((p) => [p.id, ""]))
  )
  const [immediateMovein, setImmediateMovein] = useState<Record<string, string>>(
    () => Object.fromEntries(PROPERTIES.map((p) => [p.id, ""]))
  )
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
  // IVR setup — the user's saved routing choice (null = not yet confirmed)
  const [ivrChoice, setIvrChoice] = useState<IvrChoice>(null)
  const ivrComplete = ivrChoice !== null
  const ivrActionCount = ivrComplete ? 0 : 1
  // Carrier compliance simulation mode — lifted from CompanyPage so Overview can react
  const [simMode, setSimMode] = useState<SimMode>("none")
  // Count of action items in Carrier Compliance tab (drives sidebar badge)
  const [carrierActionCount, setCarrierActionCount] = useState(1)
  const [privacyActionCount, setPrivacyActionCount] = useState(62) // 70 total - 8 initially covered

  // Timer ref so the submission can be cancelled before it resolves
  const brandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function startBrandSubmission() {
    setBrandStatus("submitting")
    if (brandTimerRef.current) clearTimeout(brandTimerRef.current)
    // 15s: simulate carrier rejecting the phone number
    brandTimerRef.current = setTimeout(() => {
      setBrandStatus("carrier-rejected")
    }, 15000)
  }

  function resubmitAfterRejection() {
    setBrandStatus("submitting")
    if (brandTimerRef.current) clearTimeout(brandTimerRef.current)
    // 10s second pass — carrier approves after fix
    brandTimerRef.current = setTimeout(() => {
      setBrandStatus("approved")
      setCampaignStatus("creating")
    }, 10000)
  }

  function cancelBrandSubmission() {
    if (brandTimerRef.current) {
      clearTimeout(brandTimerRef.current)
      brandTimerRef.current = null
    }
    setBrandStatus("idle")
  }

  // When privacy is published, auto-start brand registration
  useEffect(() => {
    if (!privacyPublished) return
    startBrandSubmission()
    return () => { if (brandTimerRef.current) clearTimeout(brandTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privacyPublished])

  function navigate(to: PageId) {
    setPage(to)
  }

  // Global toast — shared across all pages
  const [globalToast, setGlobalToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false })
  useEffect(() => {
    if (!globalToast.visible) return
    const t = setTimeout(() => setGlobalToast(prev => ({ ...prev, visible: false })), 4000)
    return () => clearTimeout(t)
  }, [globalToast.visible])
  const showToast = useCallback((message: string) => {
    setGlobalToast({ message, visible: true })
  }, [])

  function handleComplete(taskId: string) {
    setCompletedTasks((prev) => new Set([...prev, taskId]))
    if (taskId === "privacy") setPrivacyPublished(true)
  }

  function handleRenewalDayChange(id: string, val: string) {
    setRenewalDays((prev) => ({ ...prev, [id]: val }))
  }

  function validPhone(v: string) { return v.replace(/\D/g, "").length === 10 }
  const duringFilled = Object.values(duringPhones).filter(validPhone).length
  const afterFilled = Object.values(afterPhones).filter(validPhone).length
  const totalProps = PROPERTIES.length
  const maintenancePending = (duringFilled < totalProps ? 1 : 0) + (afterFilled < totalProps ? 1 : 0)

  const renewalFilled = Object.values(renewalDays).filter(isValidDays).length
  const renewalAllFilled = renewalFilled === PROPERTIES.length

  // Live progress — mirrors OverviewPage's doneCount / TOTAL_CONFIGS
  const leasingAgentGoalsDone    = Object.values(agentGoals).every(v => v && v.trim() !== "")
  const leasingModelUnitsDone    = Object.values(modelUnits).every(v => v && v.trim() !== "")
  const leasingTourPriorityDone  = Object.values(tourPriority).every(arr => Array.isArray(arr) && arr.length > 0)
  const leasingPoliciesCompleted = LEASING_POLICIES.filter(policy => {
    const bucket = leasingPolicies[policy.id] ?? {}
    return Object.values(bucket).every(t => t && t.trim() !== "")
  }).length
  const LEASING_TOTAL  = 4 + LEASING_POLICIES.length
  const TOTAL_CONFIGS  = 3 + LEASING_TOTAL + PAYMENT_SETTING_IDS.length + 2 + 1
  const doneCount =
    (privacyPublished ? 1 : 0) +
    (emailComplete    ? 1 : 0) +
    (ivrComplete      ? 1 : 0) +
    (completedTasks.has("tour-types") ? 1 : 0) +
    (leasingAgentGoalsDone   ? 1 : 0) +
    (leasingModelUnitsDone   ? 1 : 0) +
    (leasingTourPriorityDone ? 1 : 0) +
    leasingPoliciesCompleted +
    PAYMENT_SETTING_IDS.filter(id => completedTasks.has(id)).length +
    (duringFilled === totalProps ? 1 : 0) +
    (afterFilled  === totalProps ? 1 : 0) +
    (renewalAllFilled ? 1 : 0)
  const progressPct = Math.round((doneCount / TOTAL_CONFIGS) * 100)

  return (
    <>
      <GlobalToast message={globalToast.message} visible={globalToast.visible} />
      <HybridShell page={page} navigate={navigate} completedTasks={completedTasks} privacyPublished={privacyPublished} emailComplete={emailComplete} commsComplete={campaignStatus === "ready"} ivrComplete={ivrComplete} maintenancePending={maintenancePending} progressPct={progressPct} carrierSimMode={simMode} brandStatus={brandStatus} carrierActionCount={carrierActionCount} privacyActionCount={privacyActionCount} ivrActionCount={ivrActionCount}>
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
            onIvrComplete={() => setIvrChoice("preferred")}
            carrierSimMode={simMode}
            onNavigateToCompany={() => setPage("company")}
            agentGoals={agentGoals}
            onAgentGoalChange={(id, val) => setAgentGoals((p) => ({ ...p, [id]: val }))}
            modelUnits={modelUnits}
            onModelUnitChange={(id, val) => setModelUnits((p) => ({ ...p, [id]: val }))}
            tourSettings={tourSettings}
            onTourSettingChange={(id, field, val) => setTourSettings((p) => ({ ...p, [id]: { ...p[id], [field]: val } }))}
            tourPriority={tourPriority}
            onTourPriorityChange={(propId, order) => setTourPriority((p) => ({ ...p, [propId]: order }))}
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
            campusProximity={campusProximity}
            onCampusProximityChange={(id, val) => setCampusProximity((p) => ({ ...p, [id]: val }))}
            studySpaces={studySpaces}
            onStudySpacesChange={(id, val) => setStudySpaces((p) => ({ ...p, [id]: val }))}
            semesterLeases={semesterLeases}
            onSemesterLeasesChange={(id, val) => setSemesterLeases((p) => ({ ...p, [id]: val }))}
            immediateMovein={immediateMovein}
            onImmediateMoveinChange={(id, val) => setImmediateMovein((p) => ({ ...p, [id]: val }))}
          />
          ) : page === "leasing" ? (
          <LeasingPage
            navigate={navigate}
            showToast={showToast}
            agentGoals={agentGoals}
            onAgentGoalChange={(id, val) => setAgentGoals((p) => ({ ...p, [id]: val }))}
            modelUnits={modelUnits}
            onModelUnitChange={(id, val) => setModelUnits((p) => ({ ...p, [id]: val }))}
            tourSettings={tourSettings}
            onTourSettingChange={(id, field, val) => setTourSettings((p) => ({ ...p, [id]: { ...p[id], [field]: val } }))}
            tourPriority={tourPriority}
            onTourPriorityChange={(propId, order) => setTourPriority((p) => ({ ...p, [propId]: order }))}
            leasingPolicies={leasingPolicies}
            onLeasingPolicyChange={(policyId, propId, val) => setLeasingPolicies((p) => ({ ...p, [policyId]: { ...p[policyId], [propId]: val } }))}
            campusProximity={campusProximity}
            onCampusProximityChange={(id, val) => setCampusProximity((p) => ({ ...p, [id]: val }))}
            studySpaces={studySpaces}
            onStudySpacesChange={(id, val) => setStudySpaces((p) => ({ ...p, [id]: val }))}
            semesterLeases={semesterLeases}
            onSemesterLeasesChange={(id, val) => setSemesterLeases((p) => ({ ...p, [id]: val }))}
            immediateMovein={immediateMovein}
            onImmediateMoveinChange={(id, val) => setImmediateMovein((p) => ({ ...p, [id]: val }))}
          />
        ) : page === "maintenance" ? (
          <MaintenancePage
            navigate={navigate}
            showToast={showToast}
            duringPhones={duringPhones}
            onDuringPhoneChange={(id, val) => setDuringPhones((p) => ({ ...p, [id]: val }))}
            afterPhones={afterPhones}
            onAfterPhoneChange={(id, val) => setAfterPhones((p) => ({ ...p, [id]: val }))}
          />
        ) : page === "renewals" ? (
          <RenewalsPage navigate={navigate} showToast={showToast} days={renewalDays} onChange={handleRenewalDayChange} />
        ) : page === "renewals-channels" ? (
          <RenewalsChannelsPage navigate={navigate} />
        ) : page === "payments" ? (
          <PaymentsSummaryPage navigate={navigate} completedTasks={completedTasks} onComplete={handleComplete} showToast={showToast} />
        ) : page === "communications" ? (
          <CommunicationsPage
            navigate={navigate}
            privacyPublished={privacyPublished}
            brandStatus={brandStatus}
            campaignStatus={campaignStatus}
            onCampaignReady={() => setCampaignStatus("ready")}
            privacyActionCount={privacyActionCount}
            totalPropertyCount={PROPERTIES.length}
          />
        ) : page === "ivr-setup" ? (
          <IvrSetupPage
            navigate={navigate}
            ivrChoice={ivrChoice}
            onSave={setIvrChoice}
            showToast={showToast}
          />
        ) : page === "company" ? (
          <CompanyPage
            navigate={navigate}
            brandStatus={brandStatus}
            showToast={showToast}
            simMode={simMode}
            onSimModeChange={setSimMode}
            onSubmitToTwilio={startBrandSubmission}
            onCancelSubmission={cancelBrandSubmission}
            onResubmitToCarrier={resubmitAfterRejection}
            onActionCountChange={setCarrierActionCount}
          />
        ) : (
          (() => {
            const PageComponent = NON_OVERVIEW_PAGES[page as keyof typeof NON_OVERVIEW_PAGES]
            return PageComponent ? <PageComponent navigate={navigate} completedTasks={completedTasks} onComplete={handleComplete} onActionCountChange={page === "privacy" ? setPrivacyActionCount : undefined} /> : null
          })()
        )}
      </HybridShell>
    </>
  )
}
