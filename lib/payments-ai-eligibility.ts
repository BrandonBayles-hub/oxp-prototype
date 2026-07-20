/**
 * Resident payment risk / eligibility scoring.
 *
 * Property-level scoring uses three factors — Late payment history,
 * Returned payments & chargebacks, and Lease violations. Each raw signal
 * is mapped to a 0–100 severity sub-score via a piecewise-linear ramp
 * over four count breakpoints (1, 2, 3, 4+ events). The composite score
 * is a weight-normalized average over the factors the property has enabled.
 * Bands are assigned by threshold, and the per-scenario rule table decides
 * what the agent does.
 *
 *   subScore_i = ramp_i(signal_i)                       (0–100)
 *   composite  = Σ (weight_i × subScore_i) / Σ weight_i (enabled factors)
 *   band       = "poor"     if composite ≥ thresholdPoor
 *              | "moderate" if composite ≥ thresholdModerate
 *              | "good"     otherwise
 *   action     = eligibilityRules[scenario][band]
 *
 * Both the severity ramp values (per factor) and the factor weights are
 * property-configurable; the count breakpoints themselves are fixed.
 */

export type EligibilityFactorKey = "latePayments" | "paymentFailures" | "violations";

/**
 * Severity sub-scores at counts 1, 2, 3, 4+.
 * Position 3 is the saturation value used for any count ≥ 4.
 */
export type SeverityRamp = readonly [number, number, number, number];

/** Fixed count breakpoints paired with each `SeverityRamp` position. */
export const SEVERITY_COUNT_BREAKPOINTS = [1, 2, 3, 4] as const;

/** Labels for the four severity-ramp positions in the settings UI. */
export const SEVERITY_BREAKPOINT_LABELS: readonly string[] = ["1 event", "2 events", "3 events", "4+ events"];

export type EligibilityFactor = {
  enabled: boolean;
  weight: number;
  severity: SeverityRamp;
};

export type EligibilityFactors = Record<EligibilityFactorKey, EligibilityFactor>;

export type ScoreBand = "good" | "moderate" | "poor";

export type EligibilityAction = "continue" | "skip";

/**
 * Property-level signals fed into the algorithm.
 *
 * `paymentFailures12Mo` combines two signals from the resident ledger:
 *   • NSF / returned payments (last 12 months), each counted once
 *   • Chargebacks (all-time), each counted twice — chargebacks are rare
 *     and carry materially higher operational risk than a returned ACH.
 */
export type ResidentSignals = {
  latePayments12Mo: number;
  paymentFailures12Mo: number;
  leaseViolations12Mo: number;
};

export type PreviewProfileId =
  | "good_payer"
  | "one_failure"
  | "chronic_late"
  | "poor_band";

export type PreviewProfile = {
  id: PreviewProfileId;
  label: string;
  description: string;
  signals: ResidentSignals;
};

export const SCORING_PREVIEW_PROFILES: PreviewProfile[] = [
  {
    id: "good_payer",
    label: "Good payer",
    description: "On-time history, no failures or violations",
    signals: { latePayments12Mo: 0, paymentFailures12Mo: 0, leaseViolations12Mo: 0 },
  },
  {
    id: "one_failure",
    label: "1 payment failure",
    description: "Strong pay history with one returned payment or chargeback",
    signals: { latePayments12Mo: 1, paymentFailures12Mo: 1, leaseViolations12Mo: 0 },
  },
  {
    id: "chronic_late",
    label: "Chronic late",
    description: "Repeat late payer with prior returned payments",
    signals: { latePayments12Mo: 4, paymentFailures12Mo: 2, leaseViolations12Mo: 1 },
  },
  {
    id: "poor_band",
    label: "Poor band",
    description: "Chronic delinquency and multiple lease violations",
    signals: { latePayments12Mo: 8, paymentFailures12Mo: 4, leaseViolations12Mo: 3 },
  },
];

export const FACTOR_LABELS: Record<EligibilityFactorKey, string> = {
  latePayments: "Late payment history",
  paymentFailures: "Returned payments & chargebacks",
  violations: "Lease violations",
};

export const FACTOR_SCOPE_HINTS: Record<EligibilityFactorKey, string> = {
  latePayments:
    "Late payments in the last 12 months. Each count level maps to a 0–100 severity — customize the ramp below.",
  paymentFailures:
    "NSF / returned payments (last 12 mo) plus chargebacks (all-time, counted 2×). Each count level maps to a 0–100 severity — customize the ramp below.",
  violations:
    "Lease violations logged on the resident account in the last 12 months. Each count level maps to a 0–100 severity — customize the ramp below.",
};

/**
 * Default severity ramps. Each factor's ramp gives the 0–100 severity at
 * counts 1, 2, 3, 4+. Properties can override these in settings.
 */
export const DEFAULT_SEVERITY_RAMPS: Record<EligibilityFactorKey, SeverityRamp> = {
  latePayments: [30, 55, 75, 100],
  paymentFailures: [40, 65, 85, 100],
  violations: [50, 80, 100, 100],
};

/**
 * Piecewise-linear severity: interpolates between the fixed count
 * breakpoints [0, 1, 2, 3, 4] with y-values [0, ramp[0], ramp[1], ramp[2], ramp[3]].
 * `count = 0` returns 0; `count ≥ 4` saturates at `ramp[3]`.
 */
function severityScore(count: number, ramp: SeverityRamp): number {
  if (count <= 0 || !ramp || ramp.length !== 4) return 0;
  if (count >= 4) return ramp[3];
  const ys = [0, ramp[0], ramp[1], ramp[2], ramp[3]];
  const lower = Math.floor(count);
  const upper = lower + 1;
  const frac = count - lower;
  return ys[lower] + frac * (ys[upper] - ys[lower]);
}

function signalForFactor(key: EligibilityFactorKey, signals: ResidentSignals): number {
  switch (key) {
    case "latePayments":
      return signals.latePayments12Mo;
    case "paymentFailures":
      return signals.paymentFailures12Mo;
    case "violations":
      return signals.leaseViolations12Mo;
  }
}

/** 0–100 severity sub-score for a single factor given its configured ramp. */
export function factorSubScore(
  key: EligibilityFactorKey,
  signals: ResidentSignals,
  ramp: SeverityRamp,
): number {
  return severityScore(signalForFactor(key, signals), ramp);
}

export type FactorContribution = {
  key: EligibilityFactorKey;
  enabled: boolean;
  weight: number;
  subScore: number;
  /** weight × subScore — the term this factor contributes before normalization. */
  weighted: number;
};

export type ScoringResult = {
  score: number;
  band: ScoreBand;
  contributions: FactorContribution[];
  totalWeight: number;
};

/**
 * Score a resident from their signals and the property's configured factors.
 * See the module doc comment for the full formula.
 */
export function computeEligibilityScore(
  signals: ResidentSignals,
  factors: EligibilityFactors,
  thresholdModerate: number,
  thresholdPoor: number,
): ScoringResult {
  const keys: EligibilityFactorKey[] = ["latePayments", "paymentFailures", "violations"];
  const contributions: FactorContribution[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const key of keys) {
    const f = factors[key];
    const enabled = !!f?.enabled;
    const weight = enabled ? Math.max(0, f.weight) : 0;
    const ramp = f?.severity ?? DEFAULT_SEVERITY_RAMPS[key];
    const subScore = Math.round(factorSubScore(key, signals, ramp));
    const weighted = weight * subScore;
    contributions.push({ key, enabled, weight, subScore, weighted });
    if (enabled) {
      weightedSum += weighted;
      totalWeight += weight;
    }
  }

  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const score = Math.round(Math.max(0, Math.min(100, rawScore)));

  let band: ScoreBand = "good";
  if (score >= thresholdPoor) band = "poor";
  else if (score >= thresholdModerate) band = "moderate";

  return { score, band, contributions, totalWeight };
}

/** Resolve the agent action for a resident's band under a scenario's rules. */
export function resolveEligibilityAction(
  band: ScoreBand,
  scenarioRules: Record<ScoreBand, EligibilityAction>,
): EligibilityAction {
  return scenarioRules[band];
}
