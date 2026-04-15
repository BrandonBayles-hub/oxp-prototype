/**
 * Prototype-only sample data — illustrates information architecture and card ordering.
 * Not a production contract or implementation spec.
 *
 * CARD ORDERING PHILOSOPHY (Overview tab):
 * 1. Carrier compliance items (carrierCompliance: true) — surface first.
 *    Missing carrier compliance can extend implementation from 1 day to weeks.
 *    Privacy policy is always pinned #1 in the OverviewPage directly.
 * 2. Critical severity — hard blockers, ELI cannot function without these.
 * 3. Attention severity — need action but don't fully stop go-live.
 * 4. Default severity — smart defaults applied; user reviews and confirms.
 *
 * PRODUCT TAGS:
 * - "all"         → Surfaces under every product filter tab. Use for settings that
 *                   affect all ELI agents (e.g. something that gates every product).
 * - "leasing"     → Leasing AI–specific configuration.
 * - "payments"    → Payments AI–specific configuration.
 * - "maintenance" → Maintenance AI–specific configuration.
 * - "renewals"    → Renewals AI–specific configuration.
 *
 * Avoid referencing specific APIs or internal system paths in card copy.
 * Focus on what the user sees and what it means for their go-live timeline.
 */

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
  /**
   * True if this setting lives inside the Carrier Compliance tab.
   * Carrier compliance items sort above all other items on the Overview.
   * Missing carrier compliance is the single biggest implementation delay risk.
   */
  carrierCompliance?: boolean
  progress?: { done: number; total: number; unit: string }
  /** Values that were found in existing Entrata settings and pre-populated */
  entrataImported?: { count: number; path: string }
  /** Sub-settings that were filled with a default value (not from Entrata) */
  defaultsApplied?: { count: number }
}

export const NEEDS_ATTENTION: NeedAttentionItem[] = []

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
