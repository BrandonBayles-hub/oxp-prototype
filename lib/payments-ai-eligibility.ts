/** Mock resident eligibility scoring for Payments AI settings preview. */

export type EligibilityFactors = {
  latePayments: { enabled: boolean; weight: number };
  returnedPayments: { enabled: boolean; weight: number };
  chargebacks: { enabled: boolean; weight: number };
  violations: { enabled: boolean; weight: number };
  complaints: { enabled: boolean; weight: number };
};

export type ScoreBand = "good" | "moderate" | "poor";

export type PreviewProfileId = "good_payer" | "one_chargeback" | "six_chargebacks" | "poor_band";

export type PreviewProfile = {
  id: PreviewProfileId;
  label: string;
  description: string;
  signals: {
    latePayments12Mo: number;
    returnedPayments12Mo: number;
    chargebacksAllTime: number;
    leaseViolations12Mo: number;
    complaints12Mo: number;
  };
};

export const SCORING_PREVIEW_PROFILES: PreviewProfile[] = [
  {
    id: "good_payer",
    label: "Good payer",
    description: "On-time history, no chargebacks",
    signals: { latePayments12Mo: 0, returnedPayments12Mo: 0, chargebacksAllTime: 0, leaseViolations12Mo: 0, complaints12Mo: 0 },
  },
  {
    id: "one_chargeback",
    label: "1 chargeback",
    description: "Strong pay history with one chargeback on file",
    signals: { latePayments12Mo: 1, returnedPayments12Mo: 0, chargebacksAllTime: 1, leaseViolations12Mo: 0, complaints12Mo: 0 },
  },
  {
    id: "six_chargebacks",
    label: "6 chargebacks",
    description: "Multiple chargebacks — high risk band",
    signals: { latePayments12Mo: 3, returnedPayments12Mo: 2, chargebacksAllTime: 6, leaseViolations12Mo: 1, complaints12Mo: 2 },
  },
  {
    id: "poor_band",
    label: "Poor band",
    description: "Chronic delinquency and violations",
    signals: { latePayments12Mo: 8, returnedPayments12Mo: 4, chargebacksAllTime: 2, leaseViolations12Mo: 3, complaints12Mo: 4 },
  },
];

export const FACTOR_SCOPE_HINTS: Record<keyof EligibilityFactors, string> = {
  latePayments: "Last 12 months, weighted by severity and recency.",
  returnedPayments: "Last 12 months — NSF and returned ACH/card payments.",
  chargebacks: "All-time count; see preview below for 1 vs 6 chargebacks.",
  violations: "Last 12 months — lease violations logged on the resident account.",
  complaints: "Last 12 months — formal resident complaints tied to payment behavior.",
};

export function computeMockEligibilityScore(
  profile: PreviewProfile,
  factors: EligibilityFactors,
  thresholdModerate: number,
  thresholdPoor: number
): { score: number; band: ScoreBand } {
  let score = 0;
  if (factors.latePayments.enabled) score += profile.signals.latePayments12Mo * factors.latePayments.weight * 0.8;
  if (factors.returnedPayments.enabled) score += profile.signals.returnedPayments12Mo * factors.returnedPayments.weight;
  if (factors.chargebacks.enabled) score += profile.signals.chargebacksAllTime * factors.chargebacks.weight * 1.2;
  if (factors.violations.enabled) score += profile.signals.leaseViolations12Mo * factors.violations.weight;
  if (factors.complaints.enabled) score += profile.signals.complaints12Mo * factors.complaints.weight * 0.5;

  const rounded = Math.round(Math.min(100, score));
  let band: ScoreBand = "good";
  if (rounded >= thresholdPoor) band = "poor";
  else if (rounded >= thresholdModerate) band = "moderate";
  return { score: rounded, band };
}
