/**
 * Per-run + monthly cost estimate for a custom agent.
 *
 * We no longer use a flat compiled-cost-vs-LLM-cliff. Instead cost scales
 * continuously with:
 *   • Trigger frequency (drives runs per month)
 *   • Prompt + guardrails length
 *   • Data source count (each schema costs tokens)
 *   • Skill count (each tool spec costs tokens)
 *   • Memory retention (each retained run costs tokens)
 *   • Context utilization zone (an amber/red surcharge covers degraded-
 *     accuracy retries and the higher output budget those runs need)
 */
import { EVENT_CATALOG, TIME_FREQUENCIES } from "./custom-agents-catalog";
import type { Trigger, AgentVersion } from "./custom-agents-context";
import { evaluateContextUsage, type ContextZone } from "./custom-agents-thresholds";

export type CostEstimate = {
  runsPerMonth: number;
  tokensPerRun: number;
  perRunCost: number;
  monthlyCost: number;
  breakdown: Array<{ label: string; runs: number }>;
  /** Zone at this configuration (green / amber / red). */
  zone: ContextZone;
  /** True when we've crossed the blocking threshold (red zone). Kept for callers that just want a bool. */
  overThreshold: boolean;
};

function runsForTrigger(t: Trigger): { runs: number; label: string } {
  if (t.kind === "schedule") {
    const f = TIME_FREQUENCIES.find((x) => x.value === t.frequency);
    return { runs: f?.runsPerMonth ?? 0, label: `Schedule: ${f?.label ?? t.frequency}` };
  }
  if (t.kind === "event") {
    const ev = EVENT_CATALOG.find((e) => e.id === t.eventId);
    return { runs: ev?.avgPerMonth ?? 0, label: `Event: ${ev?.label ?? t.eventId}` };
  }
  return { runs: 40, label: "Incoming message" };
}

// Pricing: gpt-4.1-mini-class per-token rates. Displayed to the PMC as a
// realistic upper bound — if we're able to compile more of the agent, the
// real bill will be lower, but we don't want to under-promise.
const INPUT_PRICE_PER_TOKEN = 0.15 / 1_000_000;
const OUTPUT_PRICE_PER_TOKEN = 0.60 / 1_000_000;

/**
 * Multiplier applied to per-run cost once we're past a threshold. In the
 * amber zone runs tend to consume more output tokens (already captured by
 * `outputTokens`), plus a modest fudge for retry-on-bad-output behavior.
 * In the red zone retries + human review drive the effective cost higher.
 */
function zoneCostMultiplier(zone: ContextZone): number {
  if (zone === "red") return 1.4;
  if (zone === "amber") return 1.1;
  return 1.0;
}

export function estimateCost(version: AgentVersion): CostEstimate {
  const triggers = version.triggers ?? [];
  const breakdown = triggers.map(runsForTrigger);
  const runsPerMonth = breakdown.reduce((sum, b) => sum + b.runs, 0);

  const usage = evaluateContextUsage(version);
  const tokensPerRun = usage.inputTokens + usage.outputTokens;

  const perRunCost =
    (usage.inputTokens * INPUT_PRICE_PER_TOKEN +
      usage.outputTokens * OUTPUT_PRICE_PER_TOKEN) *
    zoneCostMultiplier(usage.zone);

  const monthlyCost = perRunCost * runsPerMonth;

  return {
    runsPerMonth: Math.round(runsPerMonth * 10) / 10,
    tokensPerRun,
    perRunCost,
    monthlyCost,
    breakdown: breakdown.map((b) => ({ label: b.label, runs: Math.round(b.runs * 10) / 10 })),
    zone: usage.zone,
    overThreshold: usage.zone === "red",
  };
}

export function formatCurrency(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}
