/** Balance threshold: fixed dollar amount or percentage of rent. */

export type BalanceThreshold =
  | { mode: "fixed"; amount: number }
  | { mode: "percentOfRent"; percent: number };

export function fixedThreshold(amount: number): BalanceThreshold {
  return { mode: "fixed", amount };
}

export function percentThreshold(percent: number): BalanceThreshold {
  return { mode: "percentOfRent", percent };
}

export function formatBalanceThreshold(threshold: BalanceThreshold, avgRent?: number): string {
  if (threshold.mode === "fixed") {
    return `$${threshold.amount.toLocaleString()}`;
  }
  const base = `${threshold.percent}% of rent`;
  if (avgRent != null && avgRent > 0) {
    const resolved = (avgRent * threshold.percent) / 100;
    return `${base} (≈ $${resolved.toFixed(2)} at avg rent $${avgRent.toLocaleString()})`;
  }
  return base;
}

export function resolveThresholdAmount(threshold: BalanceThreshold, avgRent: number): number {
  if (threshold.mode === "fixed") return threshold.amount;
  return (avgRent * threshold.percent) / 100;
}

export function getThresholdNumericValue(threshold: BalanceThreshold): number {
  return threshold.mode === "fixed" ? threshold.amount : threshold.percent;
}

export function setThresholdNumericValue(threshold: BalanceThreshold, value: number): BalanceThreshold {
  if (threshold.mode === "fixed") return { mode: "fixed", amount: Math.max(0, value) };
  return { mode: "percentOfRent", percent: Math.max(0, Math.min(500, value)) };
}
