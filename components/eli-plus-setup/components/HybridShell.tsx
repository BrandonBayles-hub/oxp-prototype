"use client"

import type { PageId, BrandStatus } from "../index"
import type { SimMode } from "../pages/CompanyPage"
import {
  Building2,
  Mail,
  Phone,
  PhoneForwarded,
  Users,
  CreditCard,
  Wrench,
  RefreshCw,
  Rocket,
  CheckCircle2,
  AlertCircle,
  Info,
  ShieldCheck,
  Loader2,
  Lock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

const PAYMENT_TASK_IDS = [
  "rent-charge-date",
  "rent-due-date",
  "payment-plans",
  "payment-block-date",
  "payment-link",
  "grace-period",
  "outstanding-balance",
  "late-fee-policy",
  "payment-plan-policy",
  "payment-options",
]

const MAINTENANCE_TASK_IDS = [
  "maintenance-during-escalation",
  "maintenance-after-escalation",
]

const RENEWALS_TASK_IDS = [
  "renewal-lead-time",
]

const LEASING_TASK_IDS = [
  "agent-goal",
  "model-units",
  "tour-types",
  "tour-priority",
]

const SUB_ITEMS = [
  { id: "company"            as PageId, label: "Carrier Compliance",        icon: Building2,       taskIds: [] as string[], indent: false },
  { id: "privacy"            as PageId, label: "Privacy Policies",          icon: ShieldCheck,     taskIds: [] as string[], indent: false },
  { id: "email"              as PageId, label: "Email Integration",         icon: Mail,            taskIds: [] as string[], indent: false },
  { id: "ivr-setup"          as PageId, label: "IVR Setup",                 icon: PhoneForwarded,  taskIds: [] as string[], indent: false },
  { id: "communications"     as PageId, label: "Communications",            icon: Phone,           taskIds: [] as string[], indent: false },
  { id: "leasing"            as PageId, label: "Leasing AI",                icon: Users,           taskIds: [] as string[], indent: false },
  { id: "payments"           as PageId, label: "Payments AI",               icon: CreditCard,      taskIds: [] as string[], indent: false },
  { id: "maintenance"        as PageId, label: "Maintenance AI",            icon: Wrench,          taskIds: [] as string[], indent: false },
  { id: "renewals"           as PageId, label: "Renewals AI",               icon: RefreshCw,       taskIds: [] as string[], indent: false },
]

const STATUS: Partial<Record<PageId, "complete" | "warning" | "blocked">> = {
  payments: "warning",
}

function StatusIcon({ status }: { status?: "complete" | "warning" | "blocked" }) {
  if (status === "complete") return <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
  if (status === "blocked") return <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
  return null
}

interface HybridShellProps {
  page: PageId
  navigate: (to: PageId) => void
  completedTasks: Set<string>
  privacyPublished: boolean
  emailComplete: boolean
  commsComplete: boolean
  ivrComplete: boolean
  maintenancePending: number
  progressPct: number
  carrierSimMode: SimMode
  brandStatus: BrandStatus
  carrierActionCount: number
  privacyActionCount: number
  ivrActionCount: number
  children: React.ReactNode
}

export function HybridShell({ page, navigate, completedTasks, privacyPublished, emailComplete, commsComplete, ivrComplete, maintenancePending, progressPct, carrierSimMode, brandStatus, carrierActionCount, privacyActionCount, ivrActionCount, children }: HybridShellProps) {
  return (
    <div className="flex h-full bg-background">
      <aside
        className="w-[240px] shrink-0 border-r border-border bg-card flex flex-col"
        aria-label="ELI+ setup navigation"
      >
        {/* Logo + Progress — combined */}
        <div className="px-4 py-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
              <Rocket className="h-4 w-4 text-white" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">ELI+ Setup</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[11px] font-medium mb-1.5">
              <span className="flex items-center gap-1 text-muted-foreground uppercase tracking-wide">
                Overall Progress
                <span className="group relative inline-flex">
                  <Info className="h-3 w-3 text-muted-foreground/60 cursor-default" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 rounded-md bg-popover border border-border px-2.5 py-1.5 text-[11px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity normal-case tracking-normal font-normal leading-snug whitespace-normal z-50">
                    48/52 properties remaining
                  </span>
                </span>
              </span>
              <span className="text-emerald-700">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4" aria-label="Setup steps">

          {/* AI Settings group */}
          <div>
            <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              AI Settings
            </p>


            {/* Overview hidden for MVP — may return later */}

            {/* Sub-tabs with vertical line */}
            <div className="ml-[18px] border-l border-border pl-2 space-y-0.5">
              {SUB_ITEMS.map(({ id, label, icon: Icon, taskIds, indent }) => {
                const allDone = taskIds.length > 0 && taskIds.every((t) => completedTasks.has(t))
                const isTenDlc = id === "company"
                const isPrivacy = id === "privacy"
                const isEmail = id === "email"
                const isComms = id === "communications"
                const isIvr = id === "ivr-setup"
                // Carrier compliance has 3 states driven by brandStatus
                const isTenDlcApproved   = isTenDlc && brandStatus === "approved"
                const isTenDlcSubmitting = isTenDlc && brandStatus === "submitting"
                const isTenDlcRejected   = isTenDlc && brandStatus === "carrier-rejected"
                const isTenDlcIdle       = isTenDlc && brandStatus === "idle"
                // Communications is locked until CC is approved
                const isCommsLocked = isComms && brandStatus !== "approved"
                const isComplete =
                  isTenDlc ? isTenDlcApproved
                : isPrivacy ? privacyPublished
                : isEmail ? emailComplete
                : isComms ? commsComplete
                : isIvr ? ivrComplete
                : (STATUS[id] === "complete" || allDone)
                const needsAction = (isTenDlcIdle || isTenDlcRejected) || (isPrivacy && !privacyPublished) || (isEmail && !emailComplete) || (!isComplete && taskIds.length > 0)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => navigate(id)}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      indent && "ml-3 w-[calc(100%-12px)]",
                      isCommsLocked && "opacity-50",
                      page === id
                        ? "bg-accent text-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    {Icon && <Icon className={cn("h-3.5 w-3.5 shrink-0", isComplete ? "text-emerald-700" : isTenDlcSubmitting ? "text-blue-500" : undefined)} aria-hidden />}
                    <span className="flex-1 text-left text-xs">{label}</span>
                    {isComplete && <StatusIcon status="complete" />}
                    {isTenDlcSubmitting && <Loader2 className="h-3.5 w-3.5 text-blue-500 shrink-0 animate-spin" aria-label="Processing" />}
                    {/* Carrier Compliance: show numbered badge instead of plain dot */}
                    {isTenDlc && !isComplete && !isTenDlcSubmitting && carrierActionCount > 0 && (
                      <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-0.5 rounded-full bg-red-500 text-[10px] font-bold text-white leading-none shrink-0">
                        {carrierActionCount}
                      </span>
                    )}
                    {/* Privacy Policies: numbered badge */}
                    {isPrivacy && !isComplete && privacyActionCount > 0 && (
                      <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-0.5 rounded-full bg-red-500 text-[10px] font-bold text-white leading-none shrink-0">
                        {privacyActionCount}
                      </span>
                    )}
                    {/* IVR Setup: single-action numbered badge */}
                    {isIvr && !isComplete && ivrActionCount > 0 && (
                      <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-0.5 rounded-full bg-red-500 text-[10px] font-bold text-white leading-none shrink-0">
                        {ivrActionCount}
                      </span>
                    )}
                    {/* Email Integration: mocked numbered badge */}
                    {isEmail && !isComplete && (
                      <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-0.5 rounded-full bg-red-500 text-[10px] font-bold text-white leading-none shrink-0">
                        3
                      </span>
                    )}
                    {/* Communications: lock icon when CC not approved */}
                    {isCommsLocked && <Lock className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-label="Requires Carrier Compliance" />}
                    {!isTenDlc && !isPrivacy && !isIvr && !isEmail && !isCommsLocked && !isComplete && !isTenDlcSubmitting && needsAction && (
                      <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" aria-label="Action required" />
                    )}
                    {!isComplete && !isTenDlcSubmitting && !needsAction && <StatusIcon status={STATUS[id]} />}
                  </button>
                )
              })}
            </div>
          </div>

        </nav>

      </aside>

      <div id="main-content" className="flex-1 min-w-0 bg-background overflow-auto">
        {children}
      </div>
    </div>
  )
}
