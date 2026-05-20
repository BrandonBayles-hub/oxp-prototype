"use client";
import * as React from "react";
import { LENS_BY_ID } from "@/lib/entrata-experts-v2/lenses";
import type { LensId } from "@/lib/entrata-experts-v2/types";

const STAGES = [
  "Reading rent roll…",
  "Joining ledger snapshot…",
  "Cross-checking policy…",
  "Composing answer…",
];

export function ThinkingBubble({ lens }: { lens: LensId }) {
  const [stage, setStage] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 380);
    return () => clearInterval(id);
  }, []);
  const lensDef = LENS_BY_ID[lens];
  const Icon = lensDef?.icon;
  return (
    <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" style={{ color: lensDef.hue }} />}
        <span className="font-medium text-foreground">{lensDef?.label ?? "Auto"}</span>
      </div>
      <span className="text-border">·</span>
      <span className="font-mono text-[12px]">{STAGES[stage]}</span>
      <span className="ml-1 inline-flex gap-1">
        <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
        <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
        <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
      </span>
    </div>
  );
}
