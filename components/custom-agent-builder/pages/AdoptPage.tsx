"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useCustomAgents } from "../lib/custom-agents-context";

function AdoptRoute() {
  const params = useSearchParams();
  const router = useRouter();
  const { agents, createDraft } = useCustomAgents();
  const navigated = useRef(false);
  const hydrated = useRef(false);

  const rosterId = params.get("rosterId") ?? "";
  const name = params.get("name") ?? "";
  const description = params.get("description") ?? "";

  useEffect(() => {
    if (navigated.current) return;
    if (!rosterId) {
      navigated.current = true;
      router.replace("/agent-builder");
      return;
    }

    if (!hydrated.current) {
      hydrated.current = true;
    }

    const existing = agents.find((a) => a.adoptedFromRosterId === rosterId);
    if (existing) {
      navigated.current = true;
      if (existing.lifecycle === "draft") {
        router.replace(
          `/agent-builder?view=new&id=${existing.id}&v=${existing.activeVersion}`
        );
      } else {
        router.replace(`/agent-builder?view=detail&id=${existing.id}`);
      }
      return;
    }

    const draft = createDraft({
      name,
      description,
      adoptedFromRosterId: rosterId,
    });
    navigated.current = true;
    router.replace(`/agent-builder?view=new&id=${draft.id}&v=${draft.activeVersion}`);
  }, [agents, rosterId, name, description, router, createDraft]);

  return (
    <div className="page-content">
      <p className="text-sm text-muted-foreground">Opening agent builder…</p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page-content">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <AdoptRoute />
    </Suspense>
  );
}
