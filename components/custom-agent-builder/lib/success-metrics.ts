import type { RunRecord, SuccessMetric, SuccessMetricUnit } from "./custom-agents-context";

export function formatMetricValue(value: number, unit: SuccessMetricUnit): string {
  switch (unit) {
    case "percent":
      return `${Math.round(value)}%`;
    case "rate":
      return value.toFixed(2);
    case "minutes":
      if (value >= 60) {
        const hours = value / 60;
        return hours >= 100 ? `${Math.round(hours).toLocaleString()}h` : `${hours.toFixed(1)}h`;
      }
      return `${Math.round(value)}m`;
    case "dollars":
      if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
      return `$${Math.round(value)}`;
    case "count":
    default:
      return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString();
  }
}

export function computeTrend(m: SuccessMetric): {
  deltaPct: number | null;
  improving: boolean | null;
  label: string;
} {
  if (m.previousValue === undefined || m.previousValue === 0) {
    return { deltaPct: null, improving: null, label: "" };
  }
  const raw = ((m.currentValue - m.previousValue) / m.previousValue) * 100;
  const improving = m.direction === "up" ? raw >= 0 : raw <= 0;
  const abs = Math.abs(raw);
  const label = `${raw >= 0 ? "+" : "-"}${abs >= 100 ? Math.round(abs) : abs.toFixed(1)}%`;
  return { deltaPct: raw, improving, label };
}

export function primaryMetric(metrics: SuccessMetric[]): SuccessMetric | undefined {
  if (!metrics || metrics.length === 0) return undefined;
  return metrics.find((m) => m.primary) ?? metrics[0];
}

export type VersionPerformance = {
  totalRuns: number;
  liveRuns: number;
  dryRuns: number;
  successes: number;
  escalated: number;
  skipped: number;
  errors: number;
  successRate: number | null;
  totalCost: number;
  lastRunAt: string | null;
};

export function versionPerformance(
  runs: RunRecord[],
  versionNumber: number
): VersionPerformance {
  const forVersion = runs.filter((r) => r.versionNumber === versionNumber);
  const totalRuns = forVersion.length;
  const liveRuns = forVersion.filter((r) => r.mode === "live").length;
  const dryRuns = forVersion.filter((r) => r.mode === "dry_run").length;
  const successes = forVersion.filter((r) => r.status === "success").length;
  const escalated = forVersion.filter((r) => r.status === "escalated").length;
  const skipped = forVersion.filter((r) => r.status === "skipped").length;
  const errors = forVersion.filter((r) => r.status === "error").length;
  const successRate = totalRuns > 0 ? successes / totalRuns : null;
  const totalCost = forVersion.reduce((sum, r) => sum + (r.cost ?? 0), 0);
  const lastRunAt =
    forVersion
      .map((r) => r.at)
      .sort()
      .pop() ?? null;
  return {
    totalRuns,
    liveRuns,
    dryRuns,
    successes,
    escalated,
    skipped,
    errors,
    successRate,
    totalCost,
    lastRunAt,
  };
}
