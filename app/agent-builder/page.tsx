"use client";

import { Suspense } from "react";
import CustomAgentBuilder from "@/components/custom-agent-builder";

export default function AgentBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Loading agent builder…
        </div>
      }
    >
      <CustomAgentBuilder />
    </Suspense>
  );
}
