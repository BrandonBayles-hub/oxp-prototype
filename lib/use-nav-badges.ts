"use client";

import { useMemo } from "react";
import { useEscalations } from "@/lib/escalations-context";
import { useVault } from "@/lib/vault-context";
import { useAgents } from "@/lib/agents-context";
import { useSetup } from "@/lib/setup-context";

export type NavBadge = {
  count: number;
  /** "action" = red (needs attention), "info" = gray (informative) */
  variant: "action" | "info";
};

export type NavBadges = Record<string, NavBadge | undefined>;

const TOTAL_ACTIVATION_STEPS = 9;

export type NavBadgeResult = {
  badges: NavBadges;
  activation: { completed: number; total: number; done: boolean };
};

export function useNavBadges(): NavBadgeResult {
  const { items: escalations } = useEscalations();
  const { documents } = useVault();
  const { agents } = useAgents();
  const { completedSteps, goLiveComplete } = useSetup();

  return useMemo(() => {
    const badges: NavBadges = {};

    const openEscalations = escalations.filter(
      (e) => e.status !== "Done" && e.status !== "Resolved"
    ).length;
    if (openEscalations > 0) {
      badges["/escalations"] = { count: openEscalations, variant: "action" };
    }

    const needsAttention = escalations.filter(
      (e) => e.status === "Open" || e.priority === "urgent" || e.priority === "high"
    ).length;
    if (needsAttention > 0) {
      badges["/command-center"] = { count: needsAttention, variant: "action" };
    }

    const pendingReviewDocs = documents.filter(
      (d) =>
        d.type === "file" &&
        (d.approvalStatus === "needs_review" || d.approvalStatus === "review")
    ).length;
    if (pendingReviewDocs > 0) {
      badges["/trainings-sop"] = { count: pendingReviewDocs, variant: "action" };
    }

    const agentsTraining = agents.filter((a) => a.status === "Training").length;
    const agentsOff = agents.filter((a) => a.status === "Off").length;
    const agentBadgeCount = agentsTraining + agentsOff;
    if (agentBadgeCount > 0) {
      badges["/agent-roster"] = { count: agentBadgeCount, variant: "info" };
    }

    return {
      badges,
      activation: {
        completed: completedSteps.length,
        total: TOTAL_ACTIVATION_STEPS,
        done: goLiveComplete,
      },
    };
  }, [escalations, documents, agents, completedSteps, goLiveComplete]);
}
