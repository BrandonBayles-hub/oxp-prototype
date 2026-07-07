/**
 * Context-window-based thresholds for agent configuration.
 *
 * The earlier version of this file capped data sources and skills at hard
 * counts (6 / 6 / 10). That was a proxy for the real problem, which is:
 * how much of the model's context window does a single run consume?
 *
 * Empirically (lost-in-the-middle, MRCR, NoLiMa), mid-tier models with a
 * 128K-token window track instructions reliably up to ~25% utilization, show
 * measurable attention dilution between 25–50%, and start missing rules /
 * hallucinating past ~50%. So we track context ratio directly and surface
 * three zones:
 *
 *   green  (< 25%)  happy path — compiled, fast, flat-cheap
 *   amber  (25–50%) inline warning, prices start climbing
 *   red    (>= 50%) blocking confirmation before deploy
 *
 * A simultaneous benefit: the cost estimator can now scale continuously with
 * prompt length, data + skills, memory retention, and run frequency instead
 * of a step function at "6 items."
 */
import type { AgentVersion } from "./custom-agents-context";

/**
 * Token budget we plan against. Sized for gpt-4.1-mini-class models, which is
 * what most custom agents will run on. Larger-window models (e.g. Gemini 1.5,
 * Claude Sonnet) will behave similarly in terms of *ratio* — they just have
 * more absolute room before the ratio trips.
 */
export const CONTEXT_WINDOW_TOKENS = 128_000;

/** Start of the amber zone. Below this, we compile everything into fast code. */
export const WARN_RATIO = 0.25;
/** Start of the red zone. Past this, hallucination rate spikes. */
export const BLOCK_RATIO = 0.5;

/**
 * Per-item token assumptions when we have to ship the full surface to the LLM
 * (vs. fold it into compiled code). Based on what realistic Entrata schemas
 * and tool specs look like.
 */
export const TOKENS_PER_DATA_SOURCE = 3_000;
export const TOKENS_PER_SKILL = 400;
export const TOKENS_PER_MEMORY_ITEM = 1_500;
/** Average tokens per character of free-form text (prompt, guardrails). */
export const TOKENS_PER_CHAR = 1 / 4;

/** Minimal shape the usage calculator needs. AgentVersion satisfies this. */
export interface ContextInputs {
  prompt?: string;
  guardrails?: string;
  dataIds?: readonly string[];
  skillIds?: readonly string[];
  memory?: { enabled: boolean; lastN: number };
}

export type ContextZone = "green" | "amber" | "red";

export type ContextUsage = {
  /** Expected input tokens per run at this configuration. */
  inputTokens: number;
  /** Output token budget we reserve — grows with zone since bigger runs are more uncertain. */
  outputTokens: number;
  /** Fraction of the context window the run would occupy (0–1+). */
  ratio: number;
  /** Zone driven by `ratio`. */
  zone: ContextZone;
  /** Itemized token breakdown, for display. */
  breakdown: Array<{ label: string; tokens: number }>;
};

function charsToTokens(chars: number): number {
  return Math.ceil(chars * TOKENS_PER_CHAR);
}

export function evaluateContextUsage(v: ContextInputs): ContextUsage {
  const promptTokens = charsToTokens(
    (v.prompt ?? "").length + (v.guardrails ?? "").length
  );
  const dataTokens = (v.dataIds?.length ?? 0) * TOKENS_PER_DATA_SOURCE;
  const skillTokens = (v.skillIds?.length ?? 0) * TOKENS_PER_SKILL;
  const memoryTokens = v.memory?.enabled
    ? (v.memory.lastN ?? 3) * TOKENS_PER_MEMORY_ITEM
    : 0;
  // System framing, tool-call scaffolding, a few-shot example — roughly fixed.
  const overheadTokens = 1_200;

  const inputTokens =
    promptTokens + dataTokens + skillTokens + memoryTokens + overheadTokens;

  const ratio = inputTokens / CONTEXT_WINDOW_TOKENS;
  const zone: ContextZone =
    ratio >= BLOCK_RATIO ? "red" : ratio >= WARN_RATIO ? "amber" : "green";

  // Output budget scales with zone — the model needs more room to reason over
  // bigger contexts, and in the red zone we also assume some retries.
  const outputTokens = zone === "red" ? 1_600 : zone === "amber" ? 1_000 : 500;

  const breakdown: ContextUsage["breakdown"] = [
    { label: "Prompt + guardrails", tokens: promptTokens },
    { label: "Data sources", tokens: dataTokens },
    { label: "Skills", tokens: skillTokens },
  ];
  if (memoryTokens > 0) breakdown.push({ label: "Memory", tokens: memoryTokens });
  breakdown.push({ label: "System overhead", tokens: overheadTokens });

  return { inputTokens, outputTokens, ratio, zone, breakdown };
}

/**
 * Convenience for the common case where the caller already has a full
 * AgentVersion in hand.
 */
export function evaluateVersion(v: AgentVersion): ContextUsage {
  return evaluateContextUsage(v);
}

/** The top-line sentence we show inline / in the confirm dialog. */
export function zoneHeadline(u: ContextUsage): string {
  const pct = Math.round(u.ratio * 100);
  if (u.zone === "red") {
    return `This agent uses ~${pct}% of the model's context window on every run.`;
  }
  if (u.zone === "amber") {
    return `Heads up — this agent is using ~${pct}% of the model's context window.`;
  }
  return `This agent fits comfortably in the model's context window (~${pct}%).`;
}

/** Guidance body copy, zoned. */
export function zoneBody(u: ContextUsage): string {
  if (u.zone === "red") {
    return "Past ~50% utilization, the model starts missing rules, dropping instructions, and hallucinating — especially on long or multi-step runs. You'll also pay materially more per run. Consider splitting this into focused agents that delegate to each other, or trimming the data sources and skills to the ones the agent actually needs for its narrow job.";
  }
  if (u.zone === "amber") {
    return "You're still in a reliable range, but accuracy drops off quickly past ~50% of the context window. Every additional data source (~3K tokens) and skill (~400 tokens) brings you closer. If you're adding more, consider whether the agent really needs all of it on every run.";
  }
  return "";
}
