import type { RunRecord, AgentVersion } from "./custom-agents-context";

export type MemoryFrame = {
  at: string;
  triggerSummary: string;
  outcome: string;
};

export function buildMemoryContext(
  version: AgentVersion,
  runs: RunRecord[]
): MemoryFrame[] {
  if (!version.memory?.enabled) return [];
  const lastN = version.memory.lastN ?? 3;
  const sorted = [...runs].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
  return sorted.slice(0, lastN).map((r) => ({
    at: r.at,
    triggerSummary: r.triggerSummary ?? "Trigger fired",
    outcome: r.summary,
  }));
}
