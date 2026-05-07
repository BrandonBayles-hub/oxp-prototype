import type { Agent } from "@/lib/agents-context";
import type { WorkforceMember, WorkforceTier } from "@/lib/workforce-context";

export type MemberMetric = { value: string; label: string; highlight?: boolean };

export const TIER_ORDER: Record<WorkforceTier, number> = {
  leadership: 0,
  management: 1,
  coordinator: 2,
  specialist: 3,
};

export function getMemberMetric(
  member: WorkforceMember,
  agents: Agent[],
  tasksByAssignee: Map<string, number>,
): MemberMetric {
  if (member.type === "agent") {
    const agent = agents.find((a) => a.name === member.name);
    if (agent) {
      if (agent.type === "autonomous") {
        if (agent.revenueImpact && agent.revenueImpact !== "—") {
          return { value: agent.revenueImpact, label: "wk", highlight: true };
        }
        return { value: `${agent.conversationCount}`, label: "chats", highlight: true };
      }
      if (agent.type === "intelligence") {
        return { value: `${agent.insightsGenerated ?? 0}`, label: "insights" };
      }
      if (agent.type === "operations") {
        return { value: `${agent.runsCompleted ?? 0}`, label: "runs" };
      }
    }
    return { value: "100%", label: "compliant", highlight: true };
  }

  const count = tasksByAssignee.get(member.name) ?? 0;
  return { value: String(count), label: "tasks" };
}

export function buildTasksByAssignee(
  escalations: { assignee?: string; status: string }[],
  conversations: { assignee?: string; status: string }[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of escalations) {
    if (e.assignee && e.status !== "Done" && e.status !== "Resolved") {
      map.set(e.assignee, (map.get(e.assignee) ?? 0) + 1);
    }
  }
  for (const c of conversations) {
    if (c.assignee && c.status === "open") {
      map.set(c.assignee, (map.get(c.assignee) ?? 0) + 1);
    }
  }
  return map;
}

export function buildLeaderIds(members: WorkforceMember[]): Set<string> {
  return new Set(members.filter((m) => m.tier === "leadership").map((m) => m.id));
}

export function buildWorkforceChildrenMap(
  membersForLinks: WorkforceMember[],
  leaderIds: Set<string>,
): Map<string, WorkforceMember[]> {
  const map = new Map<string, WorkforceMember[]>();
  for (const m of membersForLinks) {
    if (m.reportsTo && !leaderIds.has(m.id)) {
      const list = map.get(m.reportsTo) ?? [];
      list.push(m);
      map.set(m.reportsTo, list);
    }
  }
  for (const children of map.values()) {
    children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "agent" ? -1 : 1;
      const ta = TIER_ORDER[a.tier ?? "specialist"];
      const tb = TIER_ORDER[b.tier ?? "specialist"];
      if (ta !== tb) return ta - tb;
      return a.name.localeCompare(b.name);
    });
  }
  return map;
}
