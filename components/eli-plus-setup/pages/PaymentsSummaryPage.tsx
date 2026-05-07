"use client"

import type { BasePageProps } from "../index"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"

// Keep these exported constants so index.tsx can import them for progress tracking
export const PAYMENT_SETTING_IDS = [
  "payments-rent-charge-date",
  "payments-rent-due-date",
  "payments-payment-plans",
  "payments-block-day",
  "payments-payment-link",
  "payments-grace-period",
  "payments-balance-reminder",
  "payments-outstanding-balance",
  "payments-payment-options",
  "payments-installments",
  "payments-address-recipient",
] as const

export const PAYMENT_OPTIONAL_IDS = [
  "payments-late-fee-policy",
  "payments-payment-plan-policy",
] as const

export function PaymentsSummaryPage({ navigate }: BasePageProps & { showToast?: (msg: string) => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 md:px-8 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold tracking-tight">Payments AI</h1>
        <p className="text-sm text-muted-foreground mt-1">Per-property payment configuration and policy settings.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-8 py-10">
        <h2 className="text-xl font-semibold text-foreground">Coming Soon</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-prose">
          Hello! We are currently migrating your settings to OXP. In the meantime, you can still manage your updates{" "}
          <a
            href="https://entrata.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            here
          </a>
          .
        </p>
      </div>
    </div>
  )
}
