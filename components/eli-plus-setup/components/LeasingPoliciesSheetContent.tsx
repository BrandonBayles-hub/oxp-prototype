"use client"

import { useState } from "react"
import { Database, Sparkles, ChevronDown, CheckCircle2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { PROPERTIES } from "../data/properties"
import { ENTRATA_POLICIES, ENTRATA_POLICIES_PATH } from "../data/entrata-imports"

export interface PolicyEntry {
  id: string
  label: string
  description: string
  fromEntrata: boolean
  defaultText: string
}

export const LEASING_POLICIES: PolicyEntry[] = [
  {
    id: "pet",
    label: "Pet Policy",
    description: "Rules around pet ownership, fees, weight limits, and approved breeds.",
    fromEntrata: true,
    defaultText: "Residents may keep up to two (2) pets per unit. A non-refundable pet fee and monthly pet rent apply. All pets must be registered and approved by management prior to move-in.",
  },
  {
    id: "parking",
    label: "Parking Policy",
    description: "Assigned spaces, guest parking, additional vehicle fees, and towing rules.",
    fromEntrata: true,
    defaultText: "Each unit includes one assigned parking space. Additional spaces may be available for a monthly fee. Unregistered vehicles may be towed at the owner's expense.",
  },
  {
    id: "smoking",
    label: "Smoking Policy",
    description: "Tobacco, vaping, and cannabis rules for units and common areas.",
    fromEntrata: true,
    defaultText: "This is a smoke-free community. Smoking and vaping are prohibited in all units, common areas, and within 25 feet of any building entrance.",
  },
  {
    id: "renters-insurance",
    label: "Renters Insurance",
    description: "Coverage requirements and documentation needed before move-in.",
    fromEntrata: false,
    defaultText: "All residents are required to maintain a renters insurance policy with a minimum personal liability of $100,000. Proof of coverage must be provided before or at move-in and kept active throughout the lease term.",
  },
  {
    id: "utility",
    label: "Utility Policy",
    description: "Which utilities are resident-responsibility vs. included in rent.",
    fromEntrata: false,
    defaultText: "Residents are responsible for electricity and internet services. Water, sewer, and trash collection are included in the monthly rent. Gas, where applicable, is billed separately.",
  },
  {
    id: "background-checks",
    label: "Background Checks",
    description: "Screening requirements and fair-housing-compliant review standards.",
    fromEntrata: false,
    defaultText: "A background screening is required for all applicants aged 18 and older. Results are reviewed on a case-by-case basis in full compliance with applicable fair housing laws.",
  },
  {
    id: "deposit",
    label: "Deposit Policy",
    description: "Security deposit amount, conditions of return, and deduction guidelines.",
    fromEntrata: false,
    defaultText: "A refundable security deposit equal to one month's rent is due at lease signing. Deposits are held per state law and returned within the legally required timeframe following move-out, less any documented damages.",
  },
  {
    id: "application",
    label: "Application Policy",
    description: "Application fees, who must apply, and the approval process.",
    fromEntrata: false,
    defaultText: "An application fee of $45 per applicant is required (non-refundable). All adults aged 18 or older who will occupy the unit must submit a completed application. Applications are processed within 1–2 business days.",
  },
  {
    id: "income",
    label: "Income Requirements",
    description: "Minimum income thresholds and acceptable documentation types.",
    fromEntrata: false,
    defaultText: "Applicants must provide verifiable monthly gross income of at least 3× the monthly rent. Acceptable documentation includes recent pay stubs, an offer letter, tax returns, or 3 months of bank statements.",
  },
  {
    id: "section8",
    label: "Section 8 / Housing Vouchers",
    description: "Acceptance of Housing Choice Vouchers and voucher-holder process.",
    fromEntrata: false,
    defaultText: "We welcome Housing Choice Voucher (Section 8) recipients. Voucher applicants are subject to the same qualification criteria as all other applicants and must meet all standard application requirements.",
  },
]

/** State shape: policyId → propertyId → text */
export type LeasingPoliciesState = Record<string, Record<string, string>>

export function makeDefaultLeasingPolicies(): LeasingPoliciesState {
  const state: LeasingPoliciesState = {}
  for (const policy of LEASING_POLICIES) {
    const baseText =
      (policy.fromEntrata ? ENTRATA_POLICIES[policy.id] : undefined) ??
      policy.defaultText
    state[policy.id] = {}
    for (const prop of PROPERTIES) {
      state[policy.id][prop.id] = baseText
    }
  }
  return state
}

/** Safely read a per-property text value, guarding against stale string format */
function getPolicyText(
  policies: LeasingPoliciesState,
  policyId: string,
  propertyId: string,
  fallback: string,
): string {
  const bucket = policies[policyId]
  if (!bucket || typeof bucket !== "object") return fallback
  return bucket[propertyId] ?? fallback
}

interface Props {
  policies: LeasingPoliciesState
  onChange: (policyId: string, propertyId: string, value: string) => void
  onValidChange: (valid: boolean) => void
}

export function LeasingPoliciesSheetContent({ policies, onChange, onValidChange }: Props) {
  onValidChange(true)

  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const entrataCount = LEASING_POLICIES.filter((p) => p.fromEntrata && ENTRATA_POLICIES[p.id]).length

  const filteredProps = PROPERTIES.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.city.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4 p-6">
      {/* Entrata import banner */}
      <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
        <Database className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" aria-hidden />
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-indigo-900">{entrataCount} policies imported from Entrata</p>
          <p className="text-xs text-indigo-700 leading-relaxed">
            Found in <span className="font-medium">{ENTRATA_POLICIES_PATH}</span>. Each policy is pre-filled per property — expand any policy to review or customize per community.
          </p>
        </div>
      </div>

      {LEASING_POLICIES.map((policy) => {
        const isExpanded = expandedPolicy === policy.id
        const isFromEntrata = policy.fromEntrata && !!ENTRATA_POLICIES[policy.id]
        const filledCount = PROPERTIES.filter(
          (p) => getPolicyText(policies, policy.id, p.id, "").trim() !== ""
        ).length

        return (
          <div key={policy.id} className="rounded-xl border border-border bg-white overflow-hidden">
            {/* Policy header — click to expand */}
            <button
              type="button"
              onClick={() => setExpandedPolicy(isExpanded ? null : policy.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">{policy.label}</p>
                  {isFromEntrata ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                      <Database className="h-2.5 w-2.5" aria-hidden />
                      From Entrata
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                      <Sparkles className="h-2.5 w-2.5" aria-hidden />
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{policy.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {filledCount}/{PROPERTIES.length} properties
                </span>
                {filledCount === PROPERTIES.length && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />
                )}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isExpanded && "rotate-180",
                  )}
                  aria-hidden
                />
              </div>
            </button>

            {/* Per-property textareas */}
            {isExpanded && (
              <div className="border-t border-border">
                {/* Property search */}
                <div className="px-4 pt-3 pb-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    <input
                      type="text"
                      placeholder="Search properties…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full h-8 rounded-lg border border-border bg-white pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                    />
                  </div>
                </div>

                <div className="space-y-0 divide-y divide-border">
                  {filteredProps.map((prop) => {
                    const text = getPolicyText(policies, policy.id, prop.id, policy.defaultText)
                    return (
                      <div key={prop.id} className="px-4 py-3 space-y-1.5 bg-white">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-foreground">{prop.name}</p>
                          <p className="text-xs text-muted-foreground">{prop.city}, {prop.state}</p>
                          {text.trim() && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 ml-auto shrink-0" aria-hidden />
                          )}
                        </div>
                        <textarea
                          value={text}
                          onChange={(e) => onChange(policy.id, prop.id, e.target.value)}
                          rows={3}
                          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-900/20 resize-none"
                        />
                      </div>
                    )
                  })}
                  {filteredProps.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">No properties match your search.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
