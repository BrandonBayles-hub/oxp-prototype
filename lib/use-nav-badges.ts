"use client";

import { useMemo } from "react";
import {
  useConversations,
  conversationHasCurrentUserPrivateNoteMention,
  isConversationUnattended,
} from "@/lib/conversations-context";
import { useEscalations } from "@/lib/escalations-context";
import { useVault } from "@/lib/vault-context";
import { useAgents } from "@/lib/agents-context";
import { useActivationProgress } from "@/lib/activation-steps";

export type NavBadge = {
  count: number;
  /** "action" = red (needs attention), "info" = gray (informative) */
  variant: "action" | "info";
};

export type NavBadges = Record<string, NavBadge | undefined>;

export type NavBadgeResult = {
  badges: NavBadges;
  activation: { completed: number; total: number; done: boolean };
};

export function useNavBadges(): NavBadgeResult {
  const { filteredItems: conversationsForNav } = useConversations();
  const { items: escalations } = useEscalations();
  const { documents } = useVault();
  const { agents } = useAgents();
  // Single source of truth for activation step counts. Defined in
  // lib/activation-steps.ts and shared with the Getting Started page so the
  // sidebar chip can't drift from what the page actually renders.
  const activation = useActivationProgress();

  return useMemo(() => {
    const badges: NavBadges = {};

    const openEscalations = escalations.filter(
      (e) => e.status !== "Done"
    ).length;
    if (openEscalations > 0) {
      badges["/escalations"] = { count: openEscalations, variant: "action" };
    }

    /** Distinct threads needing attention: unread, @mention in a private note, or unattended (same semantics as Communications sidebar). */
    const communicationsAttentionIds = new Set<string>();
    for (const c of conversationsForNav) {
      if (
        c.hasUnread ||
        conversationHasCurrentUserPrivateNoteMention(c) ||
        isConversationUnattended(c)
      ) {
        communicationsAttentionIds.add(c.id);
      }
    }
    const communicationsAttentionCount = communicationsAttentionIds.size;
    if (communicationsAttentionCount > 0) {
      badges["/conversations"] = {
        count: communicationsAttentionCount,
        variant: "action",
      };
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

    /* Setup Wizard — placeholder count of properties awaiting configuration.
       Real source will be the contract+property event stream. */
    badges["/setup-wizard"] = { count: 4, variant: "action" };

    return {
      badges,
      activation: {
        completed: activation.completedCount,
        total: activation.total,
        done: activation.done,
      },
    };
  }, [
    conversationsForNav,
    escalations,
    documents,
    agents,
    activation,
  ]);
}
