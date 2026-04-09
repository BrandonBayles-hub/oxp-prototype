"use client"

import { useState, useEffect } from "react"

const PLACEHOLDER: Record<string, string> = {
  "Late Fee": `Example: A late fee of $50 will be assessed beginning on the 5th day following the rent due date. Fees will continue to accrue until the balance is paid in full. Late fee waivers require written approval from property management and are granted at the property manager's discretion.`,
  "Payment Plan": `Example: Residents with outstanding balances may request a payment plan by contacting the leasing office. Plans are subject to approval, require a signed payment agreement, and may include an administrative fee. Missed installments will void the plan and the full balance becomes immediately due.`,
}

interface Props {
  /** "Late Fee" or "Payment Plan" — used for labeling and placeholder text */
  policyType: string
  onValidChange: (valid: boolean) => void
}

export function PolicySheetContent({ policyType, onValidChange }: Props) {
  const [text, setText] = useState("")

  useEffect(() => {
    onValidChange(text.trim().length >= 20)
  }, [text, onValidChange])

  const placeholder = PLACEHOLDER[policyType] ?? `Enter your ${policyType.toLowerCase()} policy text…`
  const charCount = text.length
  const isReady = text.trim().length >= 20

  return (
    <div className="space-y-6 p-6">
      {/* Policy text area */}
      <div className="rounded-xl border border-border bg-white p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{policyType} Policy Text</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            This language appears in ELI's automated messages to residents. Match your lease agreement wording.
          </p>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={7}
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between">
          <span className={`text-xs ${isReady ? "text-emerald-700" : "text-muted-foreground"}`}>
            {isReady ? "✓ Ready to save" : `Minimum 20 characters (${charCount} entered)`}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">{charCount} chars</span>
        </div>
      </div>

      {/* Scope note */}
      <div className="rounded-xl border border-border bg-zinc-50/60 px-4 py-3 space-y-1">
        <p className="text-xs font-semibold text-foreground">Applies to all 52 properties</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          One policy applies across your entire portfolio. Property-level overrides are available in Advanced Settings.
        </p>
      </div>
    </div>
  )
}
