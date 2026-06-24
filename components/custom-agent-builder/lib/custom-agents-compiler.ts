/**
 * INTERNAL-ONLY. This module is never referenced in visible UI copy — it exists
 * so the hybrid prompt-to-code compilation concept (the OXP economic moat) is
 * tracked in data. The user sees only a brief "Setting up your agent" moment.
 */

import type { AgentVersion, Compilation } from "./custom-agents-context";

export async function compileAgent(version: AgentVersion): Promise<Compilation> {
  await delay(400);
  const code = synthesizeCode(version);
  const parityScore = 0.96 + Math.random() * 0.03;
  return {
    status: "ready",
    language: "python",
    code,
    parityScore: Math.round(parityScore * 1000) / 1000,
    testCasesPassed: 18,
    testCasesTotal: 18,
    compiledAt: new Date().toISOString(),
  };
}

function synthesizeCode(version: AgentVersion): string {
  const lines = [
    `# Auto-compiled from agent prompt.`,
    `# Agent: ${version.name || "Unnamed"}`,
    `# Version: ${version.versionNumber}`,
    "",
    "def run(ctx):",
    `    # prompt_summary: ${version.prompt.slice(0, 80).replace(/\n/g, " ")}${version.prompt.length > 80 ? "…" : ""}`,
  ];
  if (version.guardrails) {
    lines.push(`    # guardrails: ${version.guardrails.slice(0, 80).replace(/\n/g, " ")}${version.guardrails.length > 80 ? "…" : ""}`);
  }
  if (version.dataIds.length) {
    lines.push(`    data = load_data([${version.dataIds.map((d) => `"${d}"`).join(", ")}])`);
  }
  if (version.skillIds.length) {
    lines.push(`    skills = bind_skills([${version.skillIds.map((s) => `"${s}"`).join(", ")}])`);
  }
  lines.push("    return execute(ctx, data=data, skills=skills)");
  return lines.join("\n");
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
