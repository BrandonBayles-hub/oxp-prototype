/**
 * Mock data representing values ELI pulled from existing Entrata configuration.
 * In production these would be fetched from Entrata's property settings API.
 *
 * Source path in Entrata:
 *   Property Settings › General Contact Methods › Maintenance Emergency
 *   Property Settings › General Contact Methods › Maintenance Emergency After Hours
 */

/** Phone numbers found in Entrata for during-escalation (Maintenance Emergency) */
export const ENTRATA_DURING_PHONES: Record<string, string> = {
  p1: "(512) 555-0182",  // Sunset Ridge — Austin, TX
  p4: "(214) 555-0347",  // The Edison — Dallas, TX
  p6: "(312) 555-0219",  // River North Plaza — Chicago, IL
  p10: "(206) 555-0491", // Summit Pointe — Seattle, WA
}

/** Phone numbers found in Entrata for after-escalation (Maintenance Emergency After Hours) */
export const ENTRATA_AFTER_PHONES: Record<string, string> = {
  p2: "(720) 555-0163",  // Harbor View — Denver, CO
  p6: "(312) 555-0291",  // River North Plaza — Chicago, IL
  p11: "(503) 555-0374", // Willow Creek — Portland, OR
}

export const ENTRATA_DURING_PATH = "Property Settings › General Contact Methods › Maintenance Emergency"
export const ENTRATA_AFTER_PATH = "Property Settings › General Contact Methods › Maintenance Emergency After Hours"

// ── Leasing AI ────────────────────────────────────────────────────────────────

/** Whether each property has model units configured in Entrata */
export const ENTRATA_MODEL_UNITS: Record<string, boolean> = {
  p1:  true,   // Sunset Ridge
  p3:  false,  // Maple Commons
  p6:  true,   // River North Plaza
  p10: true,   // Summit Pointe
}
export const ENTRATA_MODEL_UNITS_PATH = "Property Settings › Unit Management › Model Units"

/** Which tour types are enabled per property (from Entrata Showing Preferences) */
export const ENTRATA_TOUR_ENABLED: Record<string, { agent: boolean; selfGuided: boolean; virtual: boolean }> = {
  p1:  { agent: true,  selfGuided: true,  virtual: false },
  p2:  { agent: true,  selfGuided: false, virtual: true  },
  p4:  { agent: true,  selfGuided: true,  virtual: true  },
  p6:  { agent: true,  selfGuided: false, virtual: false },
}
export const ENTRATA_TOUR_TYPES_PATH = "Property Settings › Showing Preferences › Tour Types"

/** Tour lengths (minutes) found in Entrata per property/type */
export const ENTRATA_TOUR_LENGTHS: Record<string, { agent?: string; selfGuided?: string }> = {
  p1: { agent: "45", selfGuided: "20" },
  p4: { agent: "60" },
  p6: { agent: "30" },
}

/** Tour instructions found in Entrata per property/type */
export const ENTRATA_TOUR_INSTRUCTIONS: Record<string, { agent?: string; selfGuided?: string }> = {
  p2: { agent: "Meet in the main lobby. Ask for the leasing agent at the front desk." },
  p6: { agent: "Park in the visitor lot on Oak Street. The leasing office is on the second floor." },
}

// ── Leasing AI — Policies ──────────────────────────────────────────────────

/**
 * Portfolio-level policy text pulled from Entrata Account Settings.
 * Pet, Parking, and Smoking policies are typically filled in by clients
 * and can be imported directly.
 */
export const ENTRATA_POLICIES: Partial<Record<string, string>> = {
  pet: "Residents may keep up to two (2) pets with a combined weight not exceeding 75 lbs. A one-time non-refundable pet fee of $350 per pet and a monthly pet rent of $50 per pet apply. All pets must be registered, vaccinated, and approved by management prior to move-in. Aggressive breeds are restricted per community policy.",
  parking: "Each unit is assigned one covered parking space included in the monthly rent. Additional vehicle spaces may be reserved for $75/month, subject to availability. Motorcycles are welcome in designated areas. Unregistered or inoperable vehicles are subject to towing at the owner's expense with 24-hour notice.",
  smoking: "All communities are designated smoke-free environments. Smoking, vaping, and the use of tobacco or cannabis products are prohibited in all units, common areas, amenity spaces, and within 25 feet of any building entrance, operable window, or HVAC intake. Violations are subject to lease remedies.",
}
export const ENTRATA_POLICIES_PATH = "Account Settings › Community Policies"

// ── Payments AI — Late Fee Policy ─────────────────────────────────────────────

/**
 * Per-property late fee policy text pulled from Entrata Financial > Delinquency > Late Fee Policy.
 * Properties without an entry will receive the standard default text.
 */
export const ENTRATA_LATE_FEE_POLICIES: Record<string, string> = {
  p1:  "A late fee of $75 will be charged on the 4th of each month for any unpaid balance. Fees accrue daily until the balance is resolved. Waivers are available once per lease term with written approval from the property manager.",
  p4:  "Late fees of $60 are assessed on the 5th of the month on any outstanding balance. Repeated late payments may result in a lease compliance notice. Contact the office to discuss payment arrangements.",
  p6:  "A $50 late charge applies beginning the 4th of each month. Additional daily late fees of $5 may apply after the 10th. Residents may request a one-time waiver by contacting the leasing office within 48 hours of the charge.",
  p8:  "Late fees of $55 are applied on the 5th of the month. The late fee will not exceed 5% of the monthly rent. Please contact management immediately if you anticipate difficulty paying on time.",
}
export const ENTRATA_LATE_FEE_PATH = "Financial › Delinquency › Late Fee Policy"

export const DEFAULT_LATE_FEE_POLICY =
  "A late fee of $50 will be assessed beginning on the 5th of the month for any unpaid balance. Fees will continue to accrue until the balance is paid in full. To request a waiver, please contact the leasing office in writing."

// ── Payments AI — Payment Plan Policy ─────────────────────────────────────────

/**
 * Per-property payment plan policy text pulled from Entrata Financial > Payments > Repayment Agreements > Policy Notes.
 * Properties without an entry will receive the standard default text.
 */
export const ENTRATA_PAYMENT_PLAN_POLICIES: Record<string, string> = {
  p2:  "Residents with an outstanding balance may request a payment plan by contacting the leasing office. Plans require a signed repayment agreement, a minimum first payment of 25% of the total balance, and must be completed within 90 days. Missed payments void the agreement and the full balance becomes immediately due.",
  p5:  "Harbor Pointe residents may apply for a payment arrangement for balances over $200. Applications are reviewed within 2 business days. Approved plans require bi-weekly installments and a $25 administrative fee. Plans are limited to once per lease term.",
  p9:  "Residents facing financial hardship may request an installment plan for rent arrears. Plans are subject to management approval, require a written agreement, and must not extend beyond 60 days. A $15 processing fee applies.",
}
export const ENTRATA_PAYMENT_PLAN_PATH = "Financial › Payments › Repayment Agreements › Policy Notes"

export const DEFAULT_PAYMENT_PLAN_POLICY =
  "Residents with outstanding balances may request a payment plan by contacting the leasing office. Plans are subject to approval, require a signed payment agreement, and may include an administrative fee. Missed installments will void the plan and the full balance becomes immediately due."
