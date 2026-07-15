"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SystemAgentDetail } from "../components/agent-builder/system-agent-detail";

function SystemDetailRoute() {
  const params = useSearchParams();
  const id = params.get("id");
  if (!id) {
    return (
      <div className="page-content">
        <p className="text-sm text-muted-foreground">No agent selected.</p>
      </div>
    );
  }
  return <SystemAgentDetail agentId={id} />;
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page-content">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <SystemDetailRoute />
    </Suspense>
  );
}
