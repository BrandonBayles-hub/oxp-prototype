"use client";

import { useMemo } from "react";
import { type Agent } from "@/lib/agents-context";
import { type GovState } from "@/lib/governance-context";
import { type VaultItem } from "@/lib/vault-context";

export type ComplianceWarning = {
  agentId: string;
  level: "error" | "warning";
  message: string;
};

/**
 * Checks each agent against governance guardrails and vault state.
 * Returns a map of agentId -> warnings.
 */
export function useAgentCompliance(
  agents: Agent[],
  govState: GovState,
  documents: VaultItem[]
): Record<string, ComplianceWarning[]> {
  return useMemo(() => {
    const result: Record<string, ComplianceWarning[]> = {};

    const approvedDocNames = new Set(
      documents
        .filter((d) => d.type === "file" && d.approvalStatus === "approved")
        .map((d) => d.fileName.toLowerCase())
    );

    const missingRequiredDocs = govState.requiredDocs
      .filter((rd) => rd.required && !approvedDocNames.has(rd.document.toLowerCase()))
      .map((rd) => rd.document);

    for (const agent of agents) {
      const warnings: ComplianceWarning[] = [];

      if (agent.status === "Active" || agent.status === "Training") {
        if (
          govState.lifecycle.enforceShadowMode &&
          agent.status === "Active" &&
          agent.type === "autonomous" &&
          agent.deploymentMode !== "shadow"
        ) {
          // Shadow mode enforcement is informational — agents that skip shadow get a warning
        }

        if (govState.lifecycle.requireApprovalForActivation && agent.status === "Active" && agent.type === "autonomous") {
          // Informational: agent is active and approval is required
        }

        if (agent.type === "autonomous" && missingRequiredDocs.length > 0) {
          const agentGuardrails = agent.guardrails?.toLowerCase() ?? "";
          const agentVault = agent.vaultBinding?.toLowerCase() ?? "";
          const relevantMissing = missingRequiredDocs.filter(
            (doc) =>
              agentGuardrails.includes(doc.toLowerCase()) ||
              agentVault.includes(doc.toLowerCase().split(" ")[0])
          );
          if (relevantMissing.length > 0) {
            warnings.push({
              agentId: agent.id,
              level: "error",
              message: `Missing required docs: ${relevantMissing.join(", ")}`,
            });
          }
        }

        for (const [actId, guardrail] of Object.entries(govState.activities)) {
          if (!guardrail.enabled) continue;
          const inScope =
            guardrail.scope === "all" ||
            guardrail.scopedAgentIds.includes(agent.id);
          if (!inScope) continue;

          if (guardrail.approvalGate && agent.type === "autonomous") {
            const hasApprovalTool = agent.toolsRequireApproval?.length ?? 0;
            if (hasApprovalTool === 0 && agent.status === "Active") {
              warnings.push({
                agentId: agent.id,
                level: "warning",
                message: `Guardrail "${actId}" requires approval gate but agent has no approval-required tools configured`,
              });
            }
          }

          if (guardrail.requiredDocs.length > 0 && agent.type === "autonomous") {
            const missing = guardrail.requiredDocs.filter(
              (doc) => !approvedDocNames.has(doc.toLowerCase())
            );
            if (missing.length > 0) {
              warnings.push({
                agentId: agent.id,
                level: "error",
                message: `Activity "${actId}" requires: ${missing.join(", ")} — not approved in Vault`,
              });
            }
          }
        }

        if (
          govState.lifecycle.autoSuspendOnErrors &&
          agent.type === "operations" &&
          (agent.errorCount ?? 0) >= govState.lifecycle.errorThreshold
        ) {
          warnings.push({
            agentId: agent.id,
            level: "error",
            message: `Error count (${agent.errorCount}) exceeds threshold (${govState.lifecycle.errorThreshold}) — should be suspended per governance`,
          });
        }
      }

      // Deduplicate by message
      const seen = new Set<string>();
      const unique = warnings.filter((w) => {
        if (seen.has(w.message)) return false;
        seen.add(w.message);
        return true;
      });

      if (unique.length > 0) {
        result[agent.id] = unique;
      }
    }

    return result;
  }, [agents, govState, documents]);
}
