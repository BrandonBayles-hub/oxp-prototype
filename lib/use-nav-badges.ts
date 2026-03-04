"use client";

import { useMemo } from "react";
import { useEscalations } from "@/lib/escalations-context";
import { useVault } from "@/lib/vault-context";
import { useAgents } from "@/lib/agents-context";
import { useSetup } from "@/lib/setup-context";
import { useWorkflows } from "@/lib/workflows-context";
import { useVoice } from "@/lib/voice-context";
import { useTools } from "@/lib/tools-context";
import { useGovernance } from "@/lib/governance-context";

export type NavBadge = {
  count: number;
  /** "action" = red (needs attention), "info" = gray (informative) */
  variant: "action" | "info";
};

export type NavBadges = Record<string, NavBadge | undefined>;

const STEP_IDS = [
  "account", "entrata", "tools", "vault", "agents",
  "workflows", "voice", "governance", "golive",
] as const;

export type NavBadgeResult = {
  badges: NavBadges;
  activation: { completed: number; total: number; done: boolean };
};

export function useNavBadges(): NavBadgeResult {
  const { items: escalations } = useEscalations();
  const { documents, docCount } = useVault();
  const { agents, agentsEnabledCount } = useAgents();
  const { completedSteps, goLiveComplete } = useSetup();
  const { atLeastOneEnabled } = useWorkflows();
  const { configured: voiceConfigured } = useVoice();
  const { availableToolNames } = useTools();
  const { enabledGuardrailCount } = useGovernance();

  return useMemo(() => {
    const badges: NavBadges = {};

    const openEscalations = escalations.filter(
      (e) => e.status !== "Done"
    ).length;
    if (openEscalations > 0) {
      badges["/escalations"] = { count: openEscalations, variant: "action" };
    }

    const needsAttention = escalations.filter(
      (e) => e.status === "Open" || e.status === "Blocked" || e.priority === "urgent" || e.priority === "high"
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

    const autoDetected: Record<string, boolean> = {
      account: true,
      entrata: true,
      tools: availableToolNames.length > 0,
      vault: docCount > 0,
      agents: agentsEnabledCount > 0,
      workflows: atLeastOneEnabled,
      voice: voiceConfigured,
      governance: enabledGuardrailCount > 0,
      golive: false,
    };

    const activationCompleted = STEP_IDS.reduce(
      (n, id, i) => n + (completedSteps.includes(i) || autoDetected[id] ? 1 : 0),
      0
    );

    return {
      badges,
      activation: {
        completed: activationCompleted,
        total: STEP_IDS.length,
        done: goLiveComplete,
      },
    };
  }, [
    escalations, documents, agents, completedSteps, goLiveComplete,
    docCount, agentsEnabledCount, atLeastOneEnabled, voiceConfigured,
    availableToolNames, enabledGuardrailCount,
  ]);
}
