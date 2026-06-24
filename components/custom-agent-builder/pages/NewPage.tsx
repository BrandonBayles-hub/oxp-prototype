"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useCustomAgents } from "../lib/custom-agents-context";
import { AgentBuilderWizard } from "../components/agent-builder/wizard";

function WizardRoute({ onClose }: { onClose?: () => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const { agents, createDraft, createNewVersion } = useCustomAgents();
  const [id, setId] = useState<string | null>(null);
  const [versionNumber, setVersionNumber] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const bootstrapped = useRef(false);
  const stagedEditFor = useRef<string | null>(null);
  const hydratedOnce = useRef(false);

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
    const draft = createDraft();
    setId(draft.id);
    setVersionNumber(draft.activeVersion);
    setReady(true);
    if (!isModal) {
      router.push(`/agent-builder?view=new&id=${draft.id}&v=${draft.activeVersion}`);
    }
  }, [agents, urlId, urlV, id, versionNumber, ready, createDraft, createNewVersion, router, isModal]);

  if (!ready || !id || versionNumber === null) {
    return (
      <div className="page-content">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return <AgentBuilderWizard agentId={id} versionNumber={versionNumber} onClose={onClose} />;
}

export default function Page({ onClose }: { onClose?: () => void } = {}) {
  return (
    <Suspense fallback={<div className="page-content"><p className="text-sm text-muted-foreground">Loading...</p></div>}>
      <WizardRoute onClose={onClose} />
    </Suspense>
  );
}
