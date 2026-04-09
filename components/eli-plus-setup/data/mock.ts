/** Prototype-only sample data — illustrates IA, not production contracts. */

export type BlockerSeverity = "critical" | "attention" | "waiting" | "default"

export type ProductTag = "all" | "leasing" | "payments" | "maintenance" | "renewals"

export interface NeedAttentionItem {
  id: string
  title: string
  why: string
  /** Human-friendly: confirmation types / properties, not raw setting counts */
  summary: string
  severity: BlockerSeverity
  to: string
  product: ProductTag
  progress?: { done: number; total: number; unit: string }
  /** Values that were found in existing Entrata settings and pre-populated */
  entrataImported?: { count: number; path: string }
  /** Sub-settings that were filled with a default value (not from Entrata) */
  defaultsApplied?: { count: number }
}

export const NEEDS_ATTENTION: NeedAttentionItem[] = [
  // ── Leasing AI ──────────────────────────────────────────────────────────────
  {
    id: "agent-goal",
    title: "Review Agent Goal Setting",
    why: "ELI needs to know what action to push prospects toward at each property. We defaulted to 'Schedule Tour' — verify this matches each property's leasing strategy.",
    summary: "Default applied: Schedule Tour",
    severity: "default",
    to: "agent-goal",
    product: "leasing",
    progress: { done: 12, total: 12, unit: "properties" },
  },
  {
    id: "model-units",
    title: "Review Model Unit Availability",
    why: "ELI uses model unit availability to guide prospect conversations. We pulled confirmed data for 4 properties from Entrata and inferred 'No model units' for the remaining 8 — review that everything looks accurate.",
    summary: "4 pulled from Entrata · 8 inferred as No",
    severity: "default",
    to: "model-units",
    product: "leasing",
    entrataImported: { count: 4, path: "Property Settings › Unit Management › Model Units" },
    progress: { done: 12, total: 12, unit: "properties" },
  },
  {
    id: "tour-types",
    title: "Review Tour Types & Settings",
    why: "We pulled tour availability from Entrata for 4 properties and applied defaults for the remaining 8. Agent Tour is enabled and pre-configured for all properties. Self-Guided and Virtual are optional — enable them per property if applicable.",
    summary: "4 pulled from Entrata · 8 defaults applied",
    severity: "default",
    to: "tour-types",
    product: "leasing",
    progress: { done: 12, total: 12, unit: "properties" },
    entrataImported: { count: 4, path: "Property Settings › Showing Preferences › Tour Types" },
    defaultsApplied: { count: 8 },
  },
  {
    id: "tour-priority",
    title: "Set Tour Priority Order",
    why: "When a prospect can choose between multiple tour types, ELI follows this priority order. We defaulted to Agent → Self-Guided → Virtual — drag to reorder if your strategy differs.",
    summary: "Default applied: Agent → Self-Guided → Virtual",
    severity: "default",
    to: "tour-priority",
    product: "leasing",
  },
  {
    id: "leasing-policies",
    title: "Review Leasing Policies",
    why: "ELI surfaces these policies to prospects during conversations. Pet, Parking, and Smoking policies were imported from your Entrata account settings. The remaining 7 have defaults applied — review and adjust any that don't match your community rules.",
    summary: "3 pulled from Entrata · 7 defaults applied",
    severity: "default",
    to: "leasing-policies",
    product: "leasing",
    progress: { done: 10, total: 10, unit: "policies" },
    entrataImported: { count: 3, path: "Account Settings › Community Policies" },
    defaultsApplied: { count: 7 },
  },
  // ── Global (affects all products) ──────────────────────────────────────────
  {
    id: "rent-charge-date",
    title: "Review Rent Charge Date",
    why: "We inferred this from your Entrata Financial > Charges > Bill On setting and defaulted to the 1st. This matches the most common configuration — confirm it matches your actual posting day before going live.",
    summary: "Default applied: 1st of month",
    severity: "default",
    to: "rent-charge-date",
    product: "payments",
    progress: { done: 52, total: 52, unit: "properties" },
  },
  {
    id: "rent-due-date",
    title: "Review Rent Due Date",
    why: "We set this to the 1st based on Entrata Communication > Rent Reminders > Display Rent Due On Day. Confirm this matches your lease agreements — an incorrect date can trigger premature late fees.",
    summary: "Default applied: 1st of month",
    severity: "default",
    to: "rent-due-date",
    product: "payments",
    progress: { done: 52, total: 52, unit: "properties" },
  },
  {
    id: "payment-plans",
    title: "Review Payment Plans",
    why: "We inferred payment plan eligibility from your Entrata Financial > Payments > Repayment Agreements setting. Properties with repayment agreements enabled were pre-set to allow payment plans. Review any exceptions.",
    summary: "Default applied from repayment agreements",
    severity: "default",
    to: "payment-plans",
    product: "payments",
    progress: { done: 52, total: 52, unit: "properties" },
  },
  {
    id: "payment-block-date",
    title: "Review Payment Block Date",
    why: "We derived this from your Entrata Resident Portal > Payment Block Days — finding the first day in the month that payments are not accepted. Defaulted to the 6th. Verify this matches your month-end close process.",
    summary: "Default applied: 6th of month",
    severity: "default",
    to: "payment-block-date",
    product: "payments",
    progress: { done: 52, total: 52, unit: "properties" },
  },
  {
    id: "payment-link",
    title: "Add Payment Portal Links",
    why: "ELI uses these links in outbound messages to direct residents to your payment portal. Missing links will prevent payment nudges from sending.",
    summary: "8 properties missing a link",
    severity: "default",
    to: "payment-link",
    product: "payments",
    progress: { done: 44, total: 52, unit: "properties" },
  },
  {
    id: "grace-period",
    title: "Review Grace Period Date",
    why: "We pulled your default late fee formula from Entrata Financial > Delinquency and set grace period to the day before the first late day (first day late = 5th → grace period = 4th). Confirm this matches your lease terms.",
    summary: "Default applied: 4th of month",
    severity: "default",
    to: "grace-period",
    product: "payments",
    progress: { done: 52, total: 52, unit: "properties" },
  },
  {
    id: "outstanding-balance",
    title: "Review Outstanding Balance Threshold",
    why: "We set this to $0.01 — meaning ELI will nudge any resident with any outstanding balance. We used this conservative default because your late fee formulas use non-fixed thresholds. Update to a fixed amount if preferred.",
    summary: "Default applied: $0.01 minimum",
    severity: "default",
    to: "outstanding-balance",
    product: "payments",
    progress: { done: 52, total: 52, unit: "properties" },
  },
  {
    id: "late-fee-policy",
    title: "Review Late Fee Policy",
    why: "ELI includes your late fee policy language in automated past-due notices. We pulled existing policy text from Entrata for 4 properties and applied a standard default to the remaining 8. Review and adjust any that don't match your lease agreements — this setting does not block go-live.",
    summary: "4 pulled from Entrata · 8 defaults applied",
    severity: "default",
    to: "late-fee-policy",
    product: "payments",
    progress: { done: 12, total: 12, unit: "properties" },
    entrataImported: { count: 4, path: "Financial › Delinquency › Late Fee Policy" },
    defaultsApplied: { count: 8 },
  },
  {
    id: "payment-plan-policy",
    title: "Review Payment Plan Policy",
    why: "When a resident asks about payment plans, ELI shares your official policy language. We pulled existing repayment agreement terms from Entrata for 3 properties and applied a standard default to the rest. Review and adjust to match your approved terms — this setting does not block go-live.",
    summary: "3 pulled from Entrata · 9 defaults applied",
    severity: "default",
    to: "payment-plan-policy",
    product: "payments",
    progress: { done: 12, total: 12, unit: "properties" },
    entrataImported: { count: 3, path: "Financial › Payments › Repayment Agreements › Policy Notes" },
    defaultsApplied: { count: 9 },
  },
  {
    id: "payment-options",
    title: "Review Payment Options & Availability",
    why: "We applied standard defaults: Online, ACH, Check, and Cash enabled from the 1st; Credit Card disabled. Adjust if your properties accept different methods or have different availability windows.",
    summary: "Default applied: Online, ACH, Check, Cash from 1st",
    severity: "default",
    to: "payment-options",
    product: "payments",
    progress: { done: 52, total: 52, unit: "properties" },
  },
  {
    id: "maintenance-during-escalation",
    title: "Set During-Escalation Phone Number",
    why: "ELI routes urgent maintenance requests to this number while an escalation is actively in progress. We pulled 4 numbers from your existing Entrata settings — verify they're correct and provide the remaining 8.",
    summary: "4 pulled from Entrata · 8 still needed",
    severity: "critical",
    to: "maintenance-during-escalation",
    product: "maintenance",
    entrataImported: { count: 4, path: "Property Settings › General Contact Methods › Maintenance Emergency" },
  },
  {
    id: "maintenance-after-escalation",
    title: "Set After-Escalation Phone Number",
    why: "After an escalation closes, ELI uses this number for follow-up contacts. We pulled 3 numbers from your Entrata after-hours settings — verify them and provide the remaining 9.",
    summary: "3 pulled from Entrata · 9 still needed",
    severity: "default",
    to: "maintenance-after-escalation",
    product: "maintenance",
    entrataImported: { count: 3, path: "Property Settings › General Contact Methods › Maintenance Emergency After Hours" },
  },
  {
    id: "renewal-lead-time",
    title: "Review Renewal Outreach Lead Time",
    why: "ELI uses this per-property lead time to know when to start renewal conversations with residents. We defaulted to 120 days — verify this matches your lease terms and outreach strategy for each property.",
    summary: "Default applied: 120 days before renewal",
    severity: "default",
    to: "renewal-lead-time",
    product: "renewals",
    progress: { done: 12, total: 12, unit: "properties" },
  },
]

export interface PropertySettingRow {
  id: string
  propertyName: string
  city: string
  setting: string
  status: "verified" | "needs_input" | "applied"
  value: string
  source: string
}

const PROPERTIES = [
  "Sunset Ridge", "Harbor View", "Maple Commons", "The Edison", "Parkside Lofts",
  "River North Plaza", "Cedar Glen", "Oakwood Terrace", "Lakeside Villas", "Metro 1200",
  "Summit Pointe", "Willow Creek", "Aspen Heights", "Stonegate", "The Reserve",
]

const SETTINGS = [
  "Rent charge date",
  "Rent due date",
  "Payment block day",
  "Grace period",
  "Late fee policy summary",
]

export function buildSettingRows(): PropertySettingRow[] {
  const rows: PropertySettingRow[] = []
  let n = 0
  for (const prop of PROPERTIES) {
    for (const setting of SETTINGS) {
      const needs = n % 7 === 0 || n % 11 === 0
      rows.push({
        id: `r-${n}`,
        propertyName: prop,
        city: ["Austin", "Denver", "Phoenix", "Dallas", "Houston"][n % 5],
        setting,
        status: needs ? "needs_input" : n % 5 === 0 ? "verified" : "applied",
        value: needs ? "—" : setting.includes("date") || setting.includes("day") ? `${(n % 28) + 1}${["st", "nd", "rd", "th"][Math.min(3, (n % 28) % 10)]}` : "From Entrata default",
        source: needs ? "—" : "Financial > Charges / Delinquency",
      })
      n += 1
    }
  }
  return rows
}
