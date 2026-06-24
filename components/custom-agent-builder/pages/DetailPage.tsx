"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CustomAgentDetail } from "../components/agent-builder/detail";

function DetailRoute() {
  const params = useSearchParams();
  const id = params.get("id");
  if (!id) {
    return (
      <div className="page-content">
        <p className="text-sm text-muted-foreground">No agent selected.</p>
      </div>
    );
  }
  return <CustomAgentDetail agentId={id} />;
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
      <DetailRoute />
    </Suspense>
  );
}
