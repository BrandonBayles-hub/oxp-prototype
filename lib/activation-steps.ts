"use client";

import { useMemo } from "react";
import { useAgents } from "@/lib/agents-context";
import { useWorkflows } from "@/lib/workflows-context";
import { useVoice } from "@/lib/voice-context";
import { useGovernance } from "@/lib/governance-context";
import { useSetup } from "@/lib/setup-context";
import { useR1Release } from "@/lib/r1-release-context";

/**
 * Canonical activation-step definitions for the AI & Agent Activation flow.
 *
 * Single source of truth for:
 *   - which steps exist
 *   - their titles and destination hrefs
 *   - whether each one is auto-detected from real platform state
 *
 * Both the Getting Started page (UI/accordion) and the sidebar badge
 * (X/Y completion chip) consume this module, so the two stay in sync.
 */

export interface ActivationStep {
  id: string;
  title: string;
  href: string | null;
}

export const ACTIVATION_STEPS: ReadonlyArray<ActivationStep> = [
  { id: "eli-essentials",  title: "Activate ELI Essentials",                          href: "/agent-roster" },
  { id: "ops-efficiency",  title: "Activate Operational & Efficiency Agents",         href: "/agent-roster" },
  { id: "train-workforce", title: "Train Your Workforce — Upload Documents & SOPs",   href: "/trainings-sop" },
  { id: "playbooks-tasks", title: "Create Playbooks & Tasks",                         href: "/escalations" },
  { id: "workforce",       title: "Configure Your Workforce",                         href: "/workforce" },
  { id: "workflows",       title: "Set up Agent Builder",                             href: "/workflows" },
  { id: "voice-brand",     title: "Configure Voice & Brand",                          href: "/voice" },
  { id: "governance",      title: "Set up Governance",                                href: "/governance" },
  { id: "brief-team",      title: "Brief Your Team",                                  href: null },
  { id: "review-golive",   title: "Review & Go Live",                                 href: null },
] as const;

// Steps removed from the R1 release; the activate-ai-agents combined step
// is prepended in their place.
export const R1_HIDDEN_STEPS = [
  "governance",
  "voice-brand",
  "eli-essentials",
  "ops-efficiency",
  "eli-plus",
];

export const R1_COMBINED_STEP: ActivationStep = {
  id: "activate-ai-agents",
  title: "Activate AI Agents",
  href: "/agent-roster",
};

/** Returns the steps that should render for the current release. */
export function useVisibleActivationSteps(): ActivationStep[] {
  const { isR1Release } = useR1Release();
  return useMemo(() => {
    if (!isR1Release) return ACTIVATION_STEPS.map((s) => ({ ...s }));
    const filtered = ACTIVATION_STEPS.filter((s) => !R1_HIDDEN_STEPS.includes(s.id)).map((s) =>
      s.id === "review-golive" ? { ...s, title: "Review Activation Steps" } : { ...s },
    );
    return [R1_COMBINED_STEP, ...filtered];
  }, [isR1Release]);
}

/**
 * Auto-detection map: a step is considered "done" when either the user has
 * explicitly checked it off (tracked in setup-context) or the platform state
 * indicates the work has been completed.
 *
 * Returns a record keyed by step id.
 */
export function useActivationAutoDetected(): Record<string, boolean> {
  const { agents } = useAgents();
  const { atLeastOneEnabled } = useWorkflows();
  const { configured: voiceConfigured } = useVoice();
  const { enabledGuardrailCount } = useGovernance();

  return useMemo(() => {
    const l1Agents = agents.filter((a) => a.type === "operations");
    const l2l3Agents = agents.filter((a) => a.type === "intelligence" || a.type === "efficiency");
    const l4Agents = agents.filter((a) => a.type === "autonomous");
    return {
      "eli-essentials":     l1Agents.some((a) => a.status === "Active"),
      "ops-efficiency":     l2l3Agents.some((a) => a.status === "Active"),
      "train-workforce":    false,
      "playbooks-tasks":    false,
      workforce:            false,
      "activate-ai-agents": l4Agents.some((a) => a.status === "Active"),
      workflows:            atLeastOneEnabled,
      "voice-brand":        voiceConfigured,
      governance:           enabledGuardrailCount > 0,
      "brief-team":         false,
      "review-golive":      false,
    };
  }, [agents, atLeastOneEnabled, voiceConfigured, enabledGuardrailCount]);
}

export interface ActivationProgress {
  visibleSteps: ActivationStep[];
  completedCount: number;
  total: number;
  done: boolean;
}

/**
 * Computed activation progress for the current release + platform state.
 * Used by both the Getting Started page (accordion + progress bar) and the
 * sidebar badge chip.
 */
export function useActivationProgress(): ActivationProgress {
  const visibleSteps = useVisibleActivationSteps();
  const autoDetected = useActivationAutoDetected();
  const { completedSteps, goLiveComplete } = useSetup();

  return useMemo(() => {
    const completedCount = visibleSteps.reduce(
      (n, step, i) => n + (completedSteps.includes(i) || autoDetected[step.id] ? 1 : 0),
      0,
    );
    return {
      visibleSteps,
      completedCount,
      total: visibleSteps.length,
      done: goLiveComplete,
    };
  }, [visibleSteps, autoDetected, completedSteps, goLiveComplete]);
}
