"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useCustomAgents, type AgentClassification, type Trigger } from "../lib/custom-agents-context";
import { AgentBuilderWizard } from "../components/agent-builder/wizard";
import { deriveMcpServersFromToolIds } from "../lib/mcp-server-catalog";
import type { AgentSeedData } from "../index";

type AgentCreatedPayload = { name: string; description: string; status: string };

function inferTriggersFromDescriptions(descriptions: string[]): Trigger[] {
  return descriptions.map((desc) => {
    const lower = desc.toLowerCase();
    const id = `trg_${Math.random().toString(36).slice(2, 10)}`;

    if (lower.includes("inbound sms") || lower.includes("sms")) {
      return { id, kind: "inbound_message" as const, channel: "sms" as const };
    }
    if (lower.includes("inbound voice") || lower.includes("voice call") || lower.includes("inbound call")) {
      return { id, kind: "inbound_message" as const, channel: "voice" as const };
    }
    if (lower.includes("inbound chat") || lower.includes("inbound email") || lower.includes("email")) {
      return { id, kind: "inbound_message" as const, channel: "email" as const };
    }
    if (lower.includes("daily")) {
      const timeMatch = lower.match(/(\d{1,2}:\d{2})/);
      return { id, kind: "schedule" as const, frequency: "daily" as const, timeOfDay: timeMatch?.[1] ?? "09:00" };
    }
    if (lower.includes("weekly") || lower.includes("every monday") || lower.includes("every wednesday")) {
      return { id, kind: "schedule" as const, frequency: "weekly" as const, timeOfDay: "08:00", dayOfWeek: "mon" };
    }
    if (lower.includes("monthly")) {
      return { id, kind: "schedule" as const, frequency: "monthly" as const, timeOfDay: "05:00", dayOfMonth: 1 };
    }
    if (lower.includes("nightly")) {
      return { id, kind: "schedule" as const, frequency: "daily" as const, timeOfDay: "02:00" };
    }
    return { id, kind: "schedule" as const, frequency: "daily" as const, timeOfDay: "09:00" };
  });
}

function WizardRoute({ onClose, onAgentCreated, seedData, nameReadOnly }: { onClose?: () => void; onAgentCreated?: (p: AgentCreatedPayload) => void; seedData?: AgentSeedData; nameReadOnly?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const { agents, createDraft, createNewVersion, updateDraftVersion } = useCustomAgents();
  const [id, setId] = useState<string | null>(null);
  const [versionNumber, setVersionNumber] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const bootstrapped = useRef(false);
  const stagedEditFor = useRef<string | null>(null);
  const hydratedOnce = useRef(false);
  const seeded = useRef(false);

  const isModal = !!onClose;
  const urlId = isModal ? null : params.get("id");
  const urlV = isModal ? null : params.get("v");

  useEffect(() => {
    if (!hydratedOnce.current) {
      if (agents.length === 0) return;
      hydratedOnce.current = true;
    }

    if (urlId) {
      const agent = agents.find((a) => a.id === urlId);
      if (!agent) return;

      const requestedV = urlV ? Number(urlV) : null;
      const requestedVersion =
        requestedV && agent.versions.some((v) => v.versionNumber === requestedV)
          ? requestedV
          : null;

      if (requestedVersion !== null) {
        if (id !== urlId) setId(urlId);
        if (versionNumber !== requestedVersion) setVersionNumber(requestedVersion);
        if (!ready) setReady(true);
        return;
      }

      if (agent.lifecycle === "draft") {
        router.push(`/agent-builder?view=new&id=${urlId}&v=${agent.activeVersion}`);
        return;
      }

      if (stagedEditFor.current !== urlId) {
        stagedEditFor.current = urlId;
        const newV = createNewVersion(urlId);
        if (newV !== undefined) {
          router.push(`/agent-builder?view=new&id=${urlId}&v=${newV}`);
        }
      }
      return;
    }

    if (bootstrapped.current) return;
    bootstrapped.current = true;
    const draft = createDraft(seedData ? { name: seedData.name, description: seedData.description } : undefined);
    setId(draft.id);
    setVersionNumber(draft.activeVersion);
    setReady(true);

    if (seedData && !seeded.current) {
      seeded.current = true;
      const triggers = seedData.triggerDescriptions
        ? inferTriggersFromDescriptions(seedData.triggerDescriptions)
        : [];
      const seededSkills = seedData.skillIds ?? [];
      updateDraftVersion(draft.id, draft.activeVersion, {
        name: seedData.name ?? "",
        prompt: seedData.prompt ?? "",
        guardrails: seedData.guardrails ?? "",
        classification: (seedData.classification as AgentClassification) ?? undefined,
        skillIds: seededSkills,
        dataIds: seedData.dataIds ?? [],
        triggers,
        mcpServers: deriveMcpServersFromToolIds(seededSkills),
        structuredGuardrails: seedData.structuredGuardrails?.map((g, i) => ({
          id: `guard_seed_${i}`,
          label: g.label,
          description: "",
          enabled: g.enabled,
          locked: false,
          category: "compliance" as const,
          requiresAcknowledgment: false,
        })),
      });
    }

    if (!isModal) {
      router.push(`/agent-builder?view=new&id=${draft.id}&v=${draft.activeVersion}`);
    }
  }, [agents, urlId, urlV, id, versionNumber, ready, createDraft, createNewVersion, router, isModal, seedData, updateDraftVersion]);

  if (!ready || !id || versionNumber === null) {
    return (
      <div className="page-content">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return <AgentBuilderWizard agentId={id} versionNumber={versionNumber} onClose={onClose} onAgentCreated={onAgentCreated} nameReadOnly={nameReadOnly} seedData={seedData} />;
}

export default function Page({ onClose, onAgentCreated, seedData, nameReadOnly }: { onClose?: () => void; onAgentCreated?: (p: AgentCreatedPayload) => void; seedData?: AgentSeedData; nameReadOnly?: boolean } = {}) {
  return (
    <Suspense fallback={<div className="page-content"><p className="text-sm text-muted-foreground">Loading...</p></div>}>
      <WizardRoute onClose={onClose} onAgentCreated={onAgentCreated} seedData={seedData} nameReadOnly={nameReadOnly} />
    </Suspense>
  );
}
